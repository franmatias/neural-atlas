import { z } from '@/shared/validation';
import { appVersion } from '@/shared/version';
import { configSchema, optionsSchema } from './experiment';
import { importDatasetJson, jsonLimit } from '@/application/data/json-files';
import { splitDataset } from '@/domain/data/split';
import { fitPipeline, transformRow } from '@/domain/data/pipeline';
import { trainingSource } from './source';
import { trainingBudget } from '@/domain/training/budget';
import { trainStudyRun } from './study-run';
import { describe } from './multiseed';
export const crossValidationOptions = z.strictObject({
  datasetJson: z.string().max(jsonLimit),
  config: configSchema,
  pipelineOptions: optionsSchema,
  count: z.number().int().min(2).max(10),
  seed: z.number().int().min(0).max(0xffffffff),
  strategy: z.enum(['random', 'stratified', 'grouped']),
  testPreviouslyConsulted: z.boolean(),
  hypothesis: z.string().max(2000),
});
export type CrossValidationOptions = z.infer<typeof crossValidationOptions>;
export function crossValidate(raw: CrossValidationOptions) {
  const options = crossValidationOptions.parse(raw);
  const { dataset, split: base } = importDatasetJson(options.datasetJson);
  if (!base || base.selection || base.fold || base.strategy === 'temporal')
    throw new RangeError('CV_BASE_SPLIT');
  if (options.config.earlyStopping) throw new RangeError('CV_EARLY_STOPPING');
  if (dataset.rows.length > 1000 || options.config.epochs > 120) throw new RangeError('CV_BUDGET');
  // Preflight every fold before training any model; no partial result can be mistaken for complete CV.
  const partitions = Array.from({ length: options.count }, (_, index) => {
    const split = splitDataset(dataset, {
      strategy: base.strategy,
      seed: base.seed,
      ratios: base.ratios,
      fold: {
        kind: 'k-fold-v1',
        count: options.count,
        index,
        seed: options.seed,
        strategy: options.strategy,
      },
    });
    const pipeline = fitPipeline(dataset, split, options.pipelineOptions);
    const source = trainingSource(
      dataset,
      split,
      { pipeline, matrix: dataset.rows.map((row) => transformRow(row, pipeline)) },
      options.config,
    );
    const budget = trainingBudget(source.input);
    if (budget.parameters > 5000) throw new RangeError('CV_BUDGET');
    return { split, budget };
  });
  const operations = partitions.reduce((s, p) => s + p.budget.upper, 0);
  const numericBytes = partitions.reduce((s, p) => s + p.budget.numericBytes, 0);
  if (operations > 2e8 || numericBytes > 32 * 1024 * 1024) throw new RangeError('CV_BUDGET');
  const folds = partitions.map(({ split, budget }, index) => {
    const run = trainStudyRun(
      dataset,
      split,
      options.config,
      `Fold ${index + 1}`,
      options.pipelineOptions,
      options.testPreviouslyConsulted,
    );
    const point = run.experiment.checkpoint.history.at(-1)!;
    return {
      index,
      trainIds: split.train,
      validationIds: split.validation,
      budget,
      run,
      validationLoss: point.validationLoss,
      validationScore: point.validationScore,
      trainLoss: point.trainLoss,
    };
  });
  const validationRows = folds.reduce((s, f) => s + f.validationIds.length, 0);
  return {
    options,
    provenance: { dataHash: base.dataHash, baseSplitHash: base.splitHash },
    task: dataset.task,
    testIds: [...base.test],
    folds,
    budget: {
      operations,
      numericBytes,
      updates: partitions.reduce((s, p) => s + p.budget.updates, 0),
    },
    summary: {
      loss: describe(folds.map((f) => f.validationLoss)),
      score: describe(folds.map((f) => f.validationScore)),
      pooledLoss: folds.reduce(
        (s, f) => s + (f.validationLoss * f.validationIds.length) / validationRows,
        0,
      ),
      pooledScore: folds.reduce(
        (s, f) => s + (f.validationScore * f.validationIds.length) / validationRows,
        0,
      ),
    },
    testEvaluatedInStudy: false as const,
  };
}
export type CrossValidationResult = ReturnType<typeof crossValidate>;
export function exportCrossValidation(result: CrossValidationResult) {
  return JSON.stringify(
    {
      format: 'neural-atlas.cross-validation-report',
      schemaVersion: 1,
      appVersion,
      options: { ...result.options, datasetJson: undefined },
      provenance: result.provenance,
      task: result.task,
      testIds: result.testIds,
      summary: result.summary,
      budget: result.budget,
      folds: result.folds.map((f) => ({
        index: f.index,
        config: f.run.experiment.config,
        trainIds: f.trainIds,
        validationIds: f.validationIds,
        trainLoss: f.trainLoss,
        validationLoss: f.validationLoss,
        validationScore: f.validationScore,
        parameters: f.budget.parameters,
        updates: f.budget.updates,
        pipelineHash: f.run.experiment.pipelineHash,
        configHash: f.run.experiment.checkpoint.configHash,
        initialHash: f.run.initialHash,
      })),
      testEvaluatedInStudy: false,
    },
    null,
    2,
  );
}

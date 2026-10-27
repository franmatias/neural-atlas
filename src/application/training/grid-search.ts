import { z } from '@/shared/validation';
import { importDatasetJson } from '@/application/data/json-files';
import { utf8Length, hashValue } from '@/domain/data/integrity';
import { splitDataset } from '@/domain/data/split';
import { fitPipeline, transformRow } from '@/domain/data/pipeline';
import { trainingSource } from './source';
import { trainingBudget } from '@/domain/training/budget';
import { defaultSpec } from '@/domain/network/model';
import { defaultOptimizer } from '@/domain/training/optimizer';
import { optionsSchema } from './pipeline-schema';
import { trainStudyRun } from './study-run';
import { exportInferenceModel, modelFromExperiment } from './inference-model';
import { appVersion } from '@/shared/version';
const seed = z.number().int().min(0).max(0xffffffff);
export const gridOptions = z.strictObject({
  datasetJson: z.string().max(4 * 1024 * 1024),
  pipeline: optionsSchema,
  widths: z.array(z.number().int().min(2).max(16)).min(1).max(3),
  rates: z.array(z.number().min(0.0001).max(0.3)).min(1).max(3),
  epochs: z.number().int().min(5).max(60),
  repetitions: z.union([z.literal(1), z.literal(3)]),
  folds: z.union([z.literal(1), z.literal(3)]),
  firstSeed: seed,
  foldSeed: seed,
  testPreviouslyConsulted: z.boolean(),
});
export type GridOptions = z.infer<typeof gridOptions>;
export const defaultGrid = {
  widths: [2, 4, 8],
  rates: [0.01, 0.05],
  epochs: 15,
  repetitions: 1 as const,
  folds: 1 as const,
  firstSeed: 42,
  foldSeed: 42,
};
function buildGrid(raw: GridOptions) {
  const options = gridOptions.parse(raw);
  if (utf8Length(options.datasetJson) > 4 * 1024 * 1024) throw Error('GRID_SIZE');
  if (
    new Set(options.widths).size !== options.widths.length ||
    new Set(options.rates).size !== options.rates.length
  )
    throw Error('GRID_DUPLICATES');
  const count = options.widths.length * options.rates.length;
  if (count * options.folds * options.repetitions > 27) throw Error('GRID_TRIALS');
  const { dataset, split: base } = importDatasetJson(options.datasetJson);
  if (
    !base ||
    base.selection ||
    base.fold ||
    base.strategy === 'temporal' ||
    !base.validation.length ||
    dataset.rows.length > 600 ||
    dataset.features.length > 8
  )
    throw Error('GRID_SOURCE');
  const strategy = dataset.rows.some((r) => r.groupId)
    ? 'grouped'
    : dataset.task === 'regression'
      ? 'random'
      : 'stratified';
  const partitions = Array.from({ length: options.folds }, (_, index) =>
    options.folds === 1
      ? base
      : splitDataset(dataset, {
          strategy: base.strategy,
          seed: base.seed,
          ratios: base.ratios,
          fold: { kind: 'k-fold-v1', count: 3, index, seed: options.foldSeed, strategy },
        }),
  );
  const prepared = partitions.map((split) => {
    const pipeline = fitPipeline(dataset, split, options.pipeline);
    if (pipeline.outputFeatureIds.length > 16) throw Error('GRID_FEATURES');
    return { split, pipeline, matrix: dataset.rows.map((r) => transformRow(r, pipeline)) };
  });
  const configurations = options.widths
    .flatMap((width) => options.rates.map((rate) => ({ id: 0, width, rate })))
    .map((c, id) => ({ ...c, id }));
  const trials = configurations
    .flatMap((c) =>
      prepared.flatMap((p, fold) =>
        Array.from({ length: options.repetitions }, (_, repeat) => {
          const config = {
            spec: {
              ...defaultSpec,
              hidden: [c.width],
              task: dataset.task,
              classes: Math.max(2, dataset.classOrder?.length ?? 2),
            },
            initialization: 'xavier' as const,
            seed: (options.firstSeed + repeat) >>> 0,
            optimizer: { ...defaultOptimizer, rate: c.rate },
            epochs: options.epochs,
            batchSize: 16,
            loss: 'mse' as const,
          };
          const source = trainingSource(dataset, p.split, p, config);
          const budget = trainingBudget(source.input);
          if (budget.parameters > 5000) throw Error('GRID_PARAMETERS');
          return {
            id: 0,
            configuration: c.id,
            fold,
            repeat,
            seed: config.seed,
            config: source.input.config,
            budget,
            trainIds: [...p.split.train],
            validationIds: [...p.split.validation],
            splitHash: p.split.splitHash,
            pipelineHash: source.input.pipelineHash,
          };
        }),
      ),
    )
    .map((t, id) => ({ ...t, id }));
  const budget = {
    operations: trials.reduce((s, t) => s + t.budget.upper, 0),
    numericBytes: trials.reduce((s, t) => s + t.budget.numericBytes, 0),
    updates: trials.reduce((s, t) => s + t.budget.updates, 0),
  };
  if (budget.operations > 2e8 || budget.numericBytes > 32 * 1024 * 1024) throw Error('GRID_BUDGET');
  const { datasetJson, ...settings } = options;
  void datasetJson;
  const payload = {
    appVersion,
    settings,
    task: dataset.task,
    configurations,
    trials,
    budget,
    provenance: {
      dataHash: base.dataHash,
      splitHash: base.splitHash,
      testPreviouslyConsulted: options.testPreviouslyConsulted,
    },
    testEvaluated: false as const,
  };
  return { options, dataset, prepared, plan: { ...payload, hash: hashValue(payload) } };
}
export function prepareGrid(raw: GridOptions) {
  return buildGrid(raw).plan;
}
export type GridPlan = ReturnType<typeof prepareGrid>;
export function runGridTrial(raw: GridOptions, planHash: string, id: number) {
  const { options, dataset, prepared, plan } = buildGrid(raw);
  if (planHash !== plan.hash || !Number.isInteger(id) || !plan.trials[id]) throw Error('GRID_PLAN');
  const trial = plan.trials[id]!,
    partition = prepared[trial.fold]!;
  const run = trainStudyRun(
    dataset,
    partition.split,
    trial.config,
    `Rejilla ${trial.configuration + 1} / fold ${trial.fold + 1} / semilla ${trial.seed}`,
    options.pipeline,
    options.testPreviouslyConsulted,
  );
  const point = run.experiment.checkpoint.history.at(-1)!;
  return {
    id,
    planHash,
    trainLoss: point.trainLoss,
    validationLoss: point.validationLoss,
    validationScore: point.validationScore,
    updates: run.experiment.checkpoint.updates,
    initialHash: run.initialHash,
    pipelineHash: run.experiment.pipelineHash,
    model: exportInferenceModel(modelFromExperiment(run.experiment)),
  };
}
export type GridMeasurement = ReturnType<typeof runGridTrial>;
export type GridStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'skipped';
export interface GridAttempt {
  id: number;
  status: GridStatus;
  measurement?: GridMeasurement;
  error?: string;
}
export function summarizeGrid(plan: GridPlan, attempts: GridAttempt[]) {
  if (
    new Set(attempts.map((a) => a.id)).size !== attempts.length ||
    attempts.some(
      (a) =>
        !plan.trials[a.id] ||
        (a.measurement &&
          (a.measurement.id !== a.id ||
            a.measurement.planHash !== plan.hash ||
            !Number.isFinite(a.measurement.validationLoss))),
    )
  )
    throw Error('GRID_EVIDENCE');
  const summaries = plan.configurations.map((c) => {
    const expected = plan.trials.filter((t) => t.configuration === c.id),
      complete = expected
        .map((t) => attempts.find((a) => a.id === t.id))
        .filter((a) => a?.status === 'completed' && a.measurement)
        .map((a) => a!.measurement!);
    const eligible = complete.length === expected.length,
      weight = complete.reduce((s, m) => s + plan.trials[m.id]!.validationIds.length, 0);
    const loss = complete.length
      ? complete.reduce(
          (s, m) => s + (m.validationLoss * plan.trials[m.id]!.validationIds.length) / weight,
          0,
        )
      : null;
    const mean = complete.reduce((s, m) => s + m.validationLoss / (complete.length || 1), 0);
    const deviation =
      complete.length > 1
        ? Math.sqrt(
            complete.reduce((s, m) => s + (m.validationLoss - mean) ** 2, 0) /
              (complete.length - 1),
          )
        : null;
    return {
      ...c,
      eligible,
      completed: complete.length,
      expected: expected.length,
      loss,
      deviation,
    };
  });
  const ranking = summaries
    .filter((c) => c.eligible)
    .sort((a, b) => a.loss! - b.loss! || a.id - b.id)
    .map((c) => c.id);
  let best = Infinity;
  const progression = summaries
    .filter((c) => c.eligible)
    .map((c) => {
      best = Math.min(best, c.loss!);
      return { configuration: c.id, loss: c.loss!, best };
    });
  return {
    configurations: summaries,
    ranking,
    progression,
    complete: plan.trials.every((t) =>
      attempts.some((a) => a.id === t.id && ['completed', 'failed'].includes(a.status)),
    ),
  };
}
export function exportGridReport(plan: GridPlan, attempts: GridAttempt[]) {
  const summary = summarizeGrid(plan, attempts);
  return JSON.stringify(
    {
      format: 'neural-atlas.grid-report',
      schemaVersion: 1,
      appVersion,
      plan,
      attempts: attempts.map(({ measurement, ...a }) => ({
        ...a,
        ...(measurement ? { measurement: { ...measurement, model: undefined } } : {}),
      })),
      summary,
      testEvaluated: false,
    },
    null,
    2,
  );
}

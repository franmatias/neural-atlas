import { z } from '@/shared/validation';
import { appVersion } from '@/shared/version';
import { configSchema, optionsSchema } from './experiment';
import { importDatasetJson, jsonLimit } from '@/application/data/json-files';
import { fitPipeline, transformRow } from '@/domain/data/pipeline';
import { trainingSource } from './source';
import { trainingBudget } from '@/domain/training/budget';
import { trainStudyRun } from './study-run';
import { modelFromExperiment, predictWithModel } from './inference-model';
export const pairedComparisonOptions = z.strictObject({
  datasetJson: z.string().max(jsonLimit),
  a: configSchema,
  b: configSchema,
  pipelineA: optionsSchema,
  pipelineB: optionsSchema,
  testPreviouslyConsulted: z.boolean(),
  hypothesis: z.string().max(2000),
  budget: z
    .discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('updates'), limit: z.number().int().min(1).max(10000) }),
      z.strictObject({ kind: z.literal('time'), limit: z.number().int().min(50).max(3000) }),
    ])
    .optional(),
});
export type PairedComparisonOptions = z.infer<typeof pairedComparisonOptions>;
export interface ConfigurationDifference {
  field: string;
  a: unknown;
  b: unknown;
}
export function configurationDifferences(
  a: unknown,
  b: unknown,
  path = '',
): ConfigurationDifference[] {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (
    a &&
    b &&
    typeof a === 'object' &&
    typeof b === 'object' &&
    !Array.isArray(a) &&
    !Array.isArray(b)
  ) {
    const left = a as Record<string, unknown>,
      right = b as Record<string, unknown>;
    return [...new Set([...Object.keys(left), ...Object.keys(right)])]
      .sort()
      .flatMap((key) =>
        configurationDifferences(left[key], right[key], path ? `${path}.${key}` : key),
      );
  }
  return [{ field: path, a: a ?? null, b: b ?? null }];
}
export function compareModels(raw: PairedComparisonOptions) {
  const options = pairedComparisonOptions.parse(raw);
  const { dataset, split } = importDatasetJson(options.datasetJson);
  if (!split) throw new RangeError('COMPARISON_SPLIT');
  if (dataset.rows.length > 1000 || options.a.epochs > 120 || options.b.epochs > 120)
    throw new RangeError('COMPARISON_BUDGET');
  const configs = [options.a, options.b],
    pipelines = [options.pipelineA, options.pipelineB];
  const prepared = configs.map((config, i) => {
    const pipeline = fitPipeline(dataset, split, pipelines[i]!);
    const source = trainingSource(
      dataset,
      split,
      { pipeline, matrix: dataset.rows.map((row) => transformRow(row, pipeline)) },
      config,
    );
    const budget = trainingBudget(source.input);
    if (budget.parameters > 5000) throw new RangeError('COMPARISON_BUDGET');
    return { source, budget };
  });
  if (prepared.reduce((s, p) => s + p.budget.upper, 0) > 2e8)
    throw new RangeError('COMPARISON_BUDGET');
  const runs = configs.map((config, i) =>
    trainStudyRun(
      dataset,
      split,
      config,
      i ? 'B · Intervención' : 'A · Referencia',
      pipelines[i],
      options.testPreviouslyConsulted,
      options.budget,
    ),
  );
  const a = runs[0]!.stop?.point ?? runs[0]!.experiment.checkpoint.history.at(-1)!;
  const b = runs[1]!.stop?.point ?? runs[1]!.experiment.checkpoint.history.at(-1)!;
  const comparableLoss = dataset.task !== 'regression' || configs[0]!.loss === configs[1]!.loss;
  const models = runs.map((run) => modelFromExperiment(run.experiment));
  const lookup = new Map(dataset.rows.map((row) => [row.id, row]));
  const probes = split.validation.slice(0, 8).map((id) => {
    const row = lookup.get(id)!;
    return {
      id,
      features: { ...row.features },
      target: row.target,
      predictions: models.map((model) =>
        predictWithModel(
          model,
          Object.fromEntries(model.features.map((f) => [f.id, row.features[f.id]!])),
        ),
      ),
    };
  });
  return {
    options,
    task: dataset.task,
    provenance: { dataHash: split.dataHash, splitHash: split.splitHash },
    runs,
    probes,
    budgets: prepared.map((p) => p.budget),
    differences: configurationDifferences(
      { config: prepared[0]!.source.input.config, pipeline: options.pipelineA },
      { config: prepared[1]!.source.input.config, pipeline: options.pipelineB },
    ).filter((d) => d.field !== 'config.spec.inputs'),
    delta: {
      validationLoss: comparableLoss ? b.validationLoss - a.validationLoss : null,
      trainLoss: comparableLoss ? b.trainLoss - a.trainLoss : null,
      validationScore: b.validationScore - a.validationScore,
    },
    testEvaluatedInStudy: false as const,
  };
}
export type PairedComparisonResult = ReturnType<typeof compareModels>;
export function exportPairedComparison(result: PairedComparisonResult) {
  return JSON.stringify(
    {
      format: 'neural-atlas.comparison-report',
      schemaVersion: 1,
      appVersion,
      options: { ...result.options, datasetJson: undefined },
      task: result.task,
      provenance: result.provenance,
      differences: result.differences,
      probes: result.probes,
      delta: result.delta,
      budgets: result.budgets,
      runs: result.runs.map((run) => ({
        label: run.label,
        config: run.experiment.config,
        initialHash: run.initialHash,
        pipelineHash: run.experiment.pipelineHash,
        point: run.stop?.point ?? run.experiment.checkpoint.history.at(-1),
        ...(run.stop ? { stop: run.stop } : {}),
        observedEpoch:
          run.experiment.checkpoint.earlyStopping?.stoppedAt ?? run.experiment.checkpoint.epoch,
        selectedEpoch: run.experiment.checkpoint.epoch,
        observedUpdates:
          run.experiment.checkpoint.earlyStopping?.observations.at(-1)?.update ??
          run.experiment.checkpoint.updates,
      })),
      testEvaluatedInStudy: false,
    },
    null,
    2,
  );
}

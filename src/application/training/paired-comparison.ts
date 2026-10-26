import { z } from '@/shared/validation';
import { appVersion } from '@/shared/version';
import { configSchema, optionsSchema } from './experiment';
import { importDatasetJson, jsonLimit } from '@/application/data/json-files';
import { fitPipeline, transformRow } from '@/domain/data/pipeline';
import { trainingSource } from './source';
import { trainingBudget } from '@/domain/training/budget';
import { trainStudyRun } from './study-run';
export const pairedComparisonOptions = z.strictObject({
  datasetJson: z.string().max(jsonLimit),
  a: configSchema,
  b: configSchema,
  pipelineA: optionsSchema,
  pipelineB: optionsSchema,
  testPreviouslyConsulted: z.boolean(),
  hypothesis: z.string().max(2000),
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
    ),
  );
  const a = runs[0]!.experiment.checkpoint.history.at(-1)!;
  const b = runs[1]!.experiment.checkpoint.history.at(-1)!;
  return {
    options,
    task: dataset.task,
    provenance: { dataHash: split.dataHash, splitHash: split.splitHash },
    runs,
    budgets: prepared.map((p) => p.budget),
    differences: configurationDifferences(
      { config: prepared[0]!.source.input.config, pipeline: options.pipelineA },
      { config: prepared[1]!.source.input.config, pipeline: options.pipelineB },
    ),
    delta: {
      validationLoss: b.validationLoss - a.validationLoss,
      trainLoss: b.trainLoss - a.trainLoss,
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
      delta: result.delta,
      budgets: result.budgets,
      runs: result.runs.map((run) => ({
        label: run.label,
        config: run.experiment.config,
        initialHash: run.initialHash,
        pipelineHash: run.experiment.pipelineHash,
        point: run.experiment.checkpoint.history.at(-1),
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

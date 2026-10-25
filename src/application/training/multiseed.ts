import { z } from '@/shared/validation';
import { appVersion } from '@/shared/version';
import {
  compareGeneralization,
  generalizationOptions,
  type GeneralizationResult,
} from './generalization';

const seedSchema = z.number().int().min(0).max(0xffffffff);
export const multiseedOptions = z.strictObject({
  comparison: generalizationOptions,
  firstSeed: seedSchema,
  count: z.union([z.literal(3), z.literal(5), z.literal(10)]),
});
export type MultiseedOptions = z.infer<typeof multiseedOptions>;
export interface Distribution {
  mean: number;
  sampleDeviation: number;
  minimum: number;
  maximum: number;
}
export interface SeedMeasurement {
  seed: number;
  referenceLoss: number;
  interventionLoss: number;
  lossDelta: number;
  referenceAccuracy: number;
  interventionAccuracy: number;
  accuracyDelta: number;
  referenceUpdates: number;
  interventionUpdates: number;
}
export interface MultiseedResult {
  options: MultiseedOptions;
  pairs: GeneralizationResult[];
  measurements: SeedMeasurement[];
  summary: {
    referenceLoss: Distribution;
    interventionLoss: Distribution;
    lossDelta: Distribution;
    accuracyDelta: Distribution;
    lowerLoss: number;
    equalLoss: number;
    higherLoss: number;
  };
}
/** Descriptive sample SD, not standard error or confidence interval. */
export function describe(values: number[]): Distribution {
  if (values.length < 2 || values.some((v) => !Number.isFinite(v)))
    throw new RangeError('STATISTICS');
  const mean = values.reduce((sum, v) => sum + v / values.length, 0);
  const sampleDeviation = Math.sqrt(
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1),
  );
  if (!Number.isFinite(sampleDeviation)) throw new RangeError('STATISTICS');
  return { mean, sampleDeviation, minimum: Math.min(...values), maximum: Math.max(...values) };
}
/** Fixed data/split/pipeline/augmentation; vary training seed (weights, order, dropout). */
export function compareMultiseed(raw: MultiseedOptions): MultiseedResult {
  const options = multiseedOptions.parse(raw);
  const pairs: GeneralizationResult[] = [];
  const measurements: SeedMeasurement[] = [];
  for (let i = 0; i < options.count; i++) {
    const seed = (options.firstSeed + i) >>> 0;
    const pair = compareGeneralization(options.comparison, seed);
    const [reference, intervention] = pair.runs;
    const a = reference!.experiment.checkpoint.history.at(-1)!;
    const b = intervention!.experiment.checkpoint.history.at(-1)!;
    pairs.push(pair);
    measurements.push({
      seed,
      referenceLoss: a.validationLoss,
      interventionLoss: b.validationLoss,
      lossDelta: b.validationLoss - a.validationLoss,
      referenceAccuracy: a.validationScore,
      interventionAccuracy: b.validationScore,
      accuracyDelta: b.validationScore - a.validationScore,
      referenceUpdates:
        reference!.experiment.checkpoint.earlyStopping?.observations.at(-1)?.update ??
        reference!.experiment.checkpoint.updates,
      interventionUpdates:
        intervention!.experiment.checkpoint.earlyStopping?.observations.at(-1)?.update ??
        intervention!.experiment.checkpoint.updates,
    });
  }
  return {
    options,
    pairs,
    measurements,
    summary: {
      referenceLoss: describe(measurements.map((m) => m.referenceLoss)),
      interventionLoss: describe(measurements.map((m) => m.interventionLoss)),
      lossDelta: describe(measurements.map((m) => m.lossDelta)),
      accuracyDelta: describe(measurements.map((m) => m.accuracyDelta)),
      lowerLoss: measurements.filter((m) => m.lossDelta < -1e-12).length,
      equalLoss: measurements.filter((m) => Math.abs(m.lossDelta) <= 1e-12).length,
      higherLoss: measurements.filter((m) => m.lossDelta > 1e-12).length,
    },
  };
}
/** Analysis report, not a new experiment/checkpoint format. Individual trials export separately. */
export function exportMultiseed(result: MultiseedResult): string {
  return JSON.stringify(
    {
      format: 'neural-atlas.multiseed-report',
      schemaVersion: 1,
      appVersion,
      scope: 'training-seed-fixed-data',
      options: result.options,
      measurements: result.measurements,
      summary: result.summary,
      testConsulted: false,
    },
    null,
    2,
  );
}

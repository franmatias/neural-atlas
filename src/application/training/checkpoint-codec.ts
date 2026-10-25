import { z } from '@/shared/validation';
import { networkWireSchema, networkWire, networkFromWire } from './network-schema';
import type { TrainingSnapshot, TrainingState } from '@/domain/training/session';
const finite = z.number().finite();
const vector = z.array(finite).max(25000);
export const baseCheckpointSchema = z.strictObject({
  version: z.literal(1),
  frozen: z.boolean(),
  configHash: z.string(),
  model: networkWireSchema,
  optimizer: z.strictObject({
    step: z.number(),
    first: z.array(vector).max(26),
    second: z.array(vector).max(26),
  }),
  epoch: z.number(),
  cursor: z.number(),
  batchIndex: z.number(),
  updates: z.number(),
  order: z.array(z.number()).max(10000),
  lastBatchIds: z.array(z.string()).max(10000),
  history: z
    .array(
      z.strictObject({
        epoch: z.number(),
        update: z.number(),
        trainLoss: finite,
        validationLoss: finite,
        trainScore: finite,
        validationScore: finite,
        gradientNorm: finite,
        regularizationPenalty: finite.min(0).optional(),
        trainObjective: finite.min(0).optional(),
      }),
    )
    .max(10001),
  gradientNorms: z.array(finite).max(7),
  baseline: finite,
  batchStatistics: z
    .strictObject({
      size: z.number().int().min(2).max(10000),
      means: z.array(z.array(finite).max(64)).max(6),
      variances: z.array(z.array(finite.min(0)).max(64)).max(6),
    })
    .optional(),
  dropout: z
    .strictObject({
      rng: z.strictObject({ state: z.number().int().min(0).max(4294967295), spare: z.null() }),
      seenSamples: z.number().int().min(0).max(100000000),
      lastSampleId: z.string().max(256).optional(),
      masks: z.array(z.array(z.union([z.literal(0), z.literal(1)])).max(64)).max(6),
    })
    .optional(),
  gradientControl: z
    .strictObject({
      rawNorm: finite.min(0),
      appliedNorm: finite.min(0),
      scale: finite.min(0).max(1),
      clippedUpdates: z.number().int().min(0),
      rawWeights: z.array(finite.min(0)).max(7),
      rawBiases: z.array(finite.min(0)).max(7),
      appliedWeights: z.array(finite.min(0)).max(7),
      appliedBiases: z.array(finite.min(0)).max(7),
      rawAffine: finite.min(0).optional(),
      appliedAffine: finite.min(0).optional(),
    })
    .optional(),
});

const point = baseCheckpointSchema.shape.history.element;
const report = z.strictObject({
  anchorEpoch: z.number().int().min(0).max(10000),
  stoppedAt: z.number().int().min(1).max(10000),
  restoredEpoch: z.number().int().min(1).max(10000),
  reason: z.enum(['patience', 'horizon']),
  observations: z.array(point).min(1).max(10000),
});
export const checkpointSchema = baseCheckpointSchema.extend({
  earlyStopping: z
    .strictObject({
      anchorEpoch: z.number().int().min(0).max(10000),
      badEpochs: z.number().int().min(0).max(100),
      bestLoss: finite.min(0).nullable(),
      best: baseCheckpointSchema.optional(),
      observations: z.array(point).max(10000),
      stoppedAt: z.number().int().min(1).max(10000).optional(),
      reason: z.enum(['patience', 'horizon']).optional(),
      lastReport: report.optional(),
    })
    .optional(),
});
export function snapshotWire(value: TrainingSnapshot) {
  const base = { ...value } as TrainingState;
  delete base.earlyStopping;
  return {
    ...base,
    model: networkWire(value.model),
    optimizer: {
      step: value.optimizer.step,
      first: value.optimizer.first.map((v) => Array.from(v)),
      second: value.optimizer.second.map((v) => Array.from(v)),
    },
  };
}
export function checkpointWire(value: TrainingState) {
  return {
    ...snapshotWire(value),
    ...(value.earlyStopping
      ? {
          earlyStopping: {
            ...value.earlyStopping,
            ...(value.earlyStopping.best ? { best: snapshotWire(value.earlyStopping.best) } : {}),
          },
        }
      : {}),
  };
}
function snapshotFromWire(value: z.infer<typeof baseCheckpointSchema>): TrainingSnapshot {
  const base = { ...value } as typeof value & { earlyStopping?: unknown };
  delete base.earlyStopping;
  return {
    ...base,
    model: networkFromWire(value.model),
    optimizer: {
      step: value.optimizer.step,
      first: value.optimizer.first.map((v) => new Float64Array(v)),
      second: value.optimizer.second.map((v) => new Float64Array(v)),
    },
  };
}
export function checkpointFromWire(value: z.infer<typeof checkpointSchema>): TrainingState {
  const monitor = value.earlyStopping;
  const { best, ...rest } = monitor ?? {};
  return {
    ...snapshotFromWire(value),
    ...(monitor
      ? {
          earlyStopping: {
            ...(rest as Omit<NonNullable<typeof monitor>, 'best'>),
            ...(best ? { best: snapshotFromWire(best) } : {}),
          },
        }
      : {}),
  };
}

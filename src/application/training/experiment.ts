import { segmentRecords } from '@/domain/training/segments';
import { optionsSchema } from './pipeline-schema';
export { optionsSchema } from './pipeline-schema';
import { z } from '@/shared/validation';
import { exportDatasetJson, importDatasetJson, guardJson } from '@/application/data/json-files';
import { hashValue, utf8Length } from '@/domain/data/integrity';
import { fitPipeline, transformRow } from '@/domain/data/pipeline';
import type { Dataset, DataSplit } from '@/domain/data/types';
import type { PipelineOptions } from '@/domain/data/pipeline';
import {
  validateCheckpoint,
  cloneState,
  type TrainingConfig,
  type TrainingState,
} from '@/domain/training/session';
import { trainingSource } from './source';
import { appVersion } from '@/shared/version';
import { networkSpecSchema as spec } from './network-schema';
import { checkpointSchema, checkpointWire, checkpointFromWire } from './checkpoint-codec';

export const experimentLimit = 64 * 1024 * 1024;
const finite = z.number().finite();
export const optimizerSchema = z.strictObject({
  kind: z.enum(['sgd', 'momentum', 'rmsprop', 'adam']),
  rate: finite,
  momentum: finite,
  rho: finite,
  beta1: finite,
  beta2: finite,
  epsilon: finite,
  scheduler: z.enum(['constant', 'step', 'cosine']),
  period: z.number(),
  minimum: finite,
});
export const configSchema = z.strictObject({
  spec,
  seed: z.number(),
  initialization: z.enum(['zero', 'xavier', 'he']),
  optimizer: optimizerSchema,
  segments: z
    .array(
      z.strictObject({
        id: z.string().regex(/^[a-z0-9-]{1,40}$/),
        atUpdate: z.number().int().min(0),
        optimizer: optimizerSchema,
        restart: z.boolean(),
      }),
    )
    .min(1)
    .max(16)
    .optional(),
  epochs: z.number(),
  batchSize: z.number(),
  loss: z.enum(['mse', 'mae']),
  dropout: z.strictObject({ rate: finite.min(0).max(0.8) }).optional(),
  augmentation: z
    .strictObject({
      policy: z.enum(['circles', 'xor']),
      sigma: finite.min(0).max(0.01),
      copies: z.number().int().min(1).max(3),
      seed: z.number().int().min(0).max(4294967295),
    })
    .optional(),
  earlyStopping: z
    .strictObject({ patience: z.number().int().min(5).max(100), minDelta: finite.min(0).max(0.01) })
    .optional(),
  regularization: z
    .strictObject({
      l1: finite.min(0).max(0.1),
      l2: finite.min(0).max(0.1),
      clipNorm: finite.refine((v) => v === 0 || (v >= 0.1 && v <= 100)),
    })
    .optional(),
});
const fileSchema = z.strictObject({
  format: z.literal('neural-atlas.experiment'),
  schemaVersion: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
    z.literal(7),
    z.literal(8),
    z.literal(9),
  ]),
  engineVersion: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
    z.literal(7),
    z.literal(8),
    z.literal(9),
  ]),
  appVersion: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/)
    .max(32),
  savedAt: z.iso.datetime(),
  dataset: z.unknown(),
  pipelineOptions: optionsSchema,
  pipelineHash: z.string(),
  config: configSchema,
  checkpoint: checkpointSchema,
  threshold: finite.min(0).max(1),
  positive: z.number().int().min(0).max(9),
  testConsulted: z.boolean(),
  timeline: z
    .array(
      z.strictObject({
        id: z.string(),
        atUpdate: z.number().int().min(0),
        optimizer: optimizerSchema,
        restart: z.boolean(),
        configHash: z.string().regex(/^[a-f0-9]{64}$/),
      }),
    )
    .min(2)
    .max(17)
    .optional(),
});
export interface Experiment {
  format: 'neural-atlas.experiment';
  schemaVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  engineVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  appVersion: string;
  savedAt: string;
  dataset: unknown;
  pipelineOptions: PipelineOptions;
  pipelineHash: string;
  config: TrainingConfig;
  checkpoint: TrainingState;
  threshold: number;
  positive: number;
  testConsulted: boolean;
  timeline?: ReturnType<typeof segmentRecords>;
}
/** Explicit tensor conversion: JSON never relies on typed-array enumerable properties. */
export function experimentWire(value: Experiment) {
  return { ...value, checkpoint: checkpointWire(value.checkpoint) };
}
export function prepareExperiment(value: Experiment) {
  const wire = fileSchema.parse(experimentWire(value));
  const version = experimentVersion(wire.config, wire.pipelineOptions);
  if (wire.schemaVersion !== version || wire.engineVersion !== version)
    throw new Error('EXPERIMENT_VERSION');
  const { dataset, split } = importDatasetJson(JSON.stringify(wire.dataset));
  if (!split) throw new Error('EXPERIMENT_SPLIT');
  const pipeline = fitPipeline(dataset, split, wire.pipelineOptions);
  if (hashValue(pipeline) !== wire.pipelineHash) throw new Error('EXPERIMENT_PIPELINE');
  const prepared = { pipeline, matrix: dataset.rows.map((row) => transformRow(row, pipeline)) };
  const source = trainingSource(dataset, split, prepared, wire.config);
  if (
    hashValue(source.input.config) !== hashValue(wire.config) ||
    wire.positive >= source.input.config.spec.classes ||
    (wire.config.spec.task === 'binary' && wire.positive > 1)
  )
    throw new Error('EXPERIMENT_CONFIG');
  if (
    wire.config.segments
      ? !wire.timeline || hashValue(wire.timeline) !== hashValue(segmentRecords(source.input))
      : !!wire.timeline
  )
    throw new Error('EXPERIMENT_SEGMENTS');
  validateCheckpoint(value.checkpoint, source.input);
  return { dataset, split, prepared, source };
}
export function captureExperiment(
  dataset: Dataset,
  split: DataSplit,
  pipelineOptions: PipelineOptions,
  pipelineHash: string,
  config: TrainingConfig,
  checkpoint: TrainingState,
  threshold: number,
  positive: number,
  testConsulted: boolean,
): Experiment {
  const result: Experiment = {
    format: 'neural-atlas.experiment',
    schemaVersion: experimentVersion(config, pipelineOptions),
    engineVersion: experimentVersion(config, pipelineOptions),
    appVersion,
    savedAt: new Date().toISOString(),
    dataset: JSON.parse(exportDatasetJson(dataset, split)) as unknown,
    pipelineOptions: structuredClone(pipelineOptions),
    pipelineHash,
    config: {
      ...config,
      spec: { ...config.spec, hidden: [...config.spec.hidden] },
      optimizer: { ...config.optimizer },
      ...(config.segments ? { segments: structuredClone(config.segments) } : {}),
      ...(config.regularization ? { regularization: { ...config.regularization } } : {}),
      ...(config.earlyStopping ? { earlyStopping: { ...config.earlyStopping } } : {}),
      ...(config.dropout ? { dropout: { ...config.dropout } } : {}),
      ...(config.augmentation ? { augmentation: { ...config.augmentation } } : {}),
    },
    checkpoint: cloneState(checkpoint),
    threshold,
    positive,
    testConsulted,
    ...(config.segments
      ? {
          timeline: segmentRecords({
            config,
            dataHash: split.dataHash,
            splitHash: split.splitHash,
            pipelineHash,
            classOrder: dataset.classOrder ?? [],
          }),
        }
      : {}),
  };
  prepareExperiment(result);
  return result;
}
export function exportExperiment(value: Experiment): string {
  prepareExperiment(value);
  const payload = experimentWire(value);
  const text = JSON.stringify({ ...payload, integrity: hashValue(payload) });
  if (utf8Length(text) > experimentLimit) throw new Error('EXPERIMENT_SIZE');
  return text;
}
export function importExperiment(text: string): Experiment {
  if (utf8Length(text) > experimentLimit) throw new Error('EXPERIMENT_SIZE');
  const raw: unknown = JSON.parse(text);
  guardJson(raw);
  const { integrity, ...wire } = fileSchema
    .extend({ integrity: z.string().regex(/^[a-f0-9]{64}$/) })
    .parse(raw);
  if (integrity !== hashValue(wire)) throw new Error('EXPERIMENT_INTEGRITY');
  const state = wire.checkpoint;
  const value: Experiment = {
    ...wire,
    checkpoint: checkpointFromWire(state),
  };
  prepareExperiment(value);
  return value;
}

function experimentVersion(
  config: TrainingConfig,
  options: PipelineOptions,
): Experiment['schemaVersion'] {
  if (config.segments) return 9;
  if (options.derived) return 8;
  if (options.scaling === 'robust') return 7;
  if (config.augmentation) return 6;
  if (config.spec.batchNormalization) return 5;
  if (config.dropout) return 4;
  if (config.earlyStopping) return 3;
  return config.regularization ? 2 : 1;
}

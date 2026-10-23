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
import {
  networkSpecSchema as spec,
  networkWireSchema,
  networkWire,
  networkFromWire,
} from './network-schema';

export const experimentLimit = 64 * 1024 * 1024;
const finite = z.number().finite();
const vector = z.array(finite).max(25000);
const configSchema = z.strictObject({
  spec,
  seed: z.number(),
  initialization: z.enum(['zero', 'xavier', 'he']),
  optimizer: z.strictObject({
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
  }),
  epochs: z.number(),
  batchSize: z.number(),
  loss: z.enum(['mse', 'mae']),
  regularization: z
    .strictObject({
      l1: finite.min(0).max(0.1),
      l2: finite.min(0).max(0.1),
      clipNorm: finite.refine((v) => v === 0 || (v >= 0.1 && v <= 100)),
    })
    .optional(),
});
const optionsSchema = z.strictObject({
  featureIds: z.array(z.string()).min(1).max(32),
  imputation: z.enum(['mean', 'median', 'mode']),
  scaling: z.enum(['none', 'minmax', 'standard']),
  missingIndicators: z.boolean(),
});
const checkpointSchema = z.strictObject({
  version: z.literal(1),
  frozen: z.boolean(),
  configHash: z.string(),
  model: networkWireSchema,
  optimizer: z.strictObject({
    step: z.number(),
    first: z.array(vector).max(14),
    second: z.array(vector).max(14),
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
    })
    .optional(),
});
const fileSchema = z.strictObject({
  format: z.literal('neural-atlas.experiment'),
  schemaVersion: z.union([z.literal(1), z.literal(2)]),
  engineVersion: z.union([z.literal(1), z.literal(2)]),
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
});
export interface Experiment {
  format: 'neural-atlas.experiment';
  schemaVersion: 1 | 2;
  engineVersion: 1 | 2;
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
}
/** Explicit tensor conversion: JSON never relies on typed-array enumerable properties. */
export function experimentWire(value: Experiment) {
  return {
    ...value,
    checkpoint: {
      ...value.checkpoint,
      model: networkWire(value.checkpoint.model),
      optimizer: {
        step: value.checkpoint.optimizer.step,
        first: value.checkpoint.optimizer.first.map((v) => Array.from(v)),
        second: value.checkpoint.optimizer.second.map((v) => Array.from(v)),
      },
    },
  };
}
export function prepareExperiment(value: Experiment) {
  const wire = fileSchema.parse(experimentWire(value));
  const version = wire.config.regularization ? 2 : 1;
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
    schemaVersion: config.regularization ? 2 : 1,
    engineVersion: config.regularization ? 2 : 1,
    appVersion,
    savedAt: new Date().toISOString(),
    dataset: JSON.parse(exportDatasetJson(dataset, split)) as unknown,
    pipelineOptions: { ...pipelineOptions, featureIds: [...pipelineOptions.featureIds] },
    pipelineHash,
    config: {
      ...config,
      spec: { ...config.spec, hidden: [...config.spec.hidden] },
      optimizer: { ...config.optimizer },
      ...(config.regularization ? { regularization: { ...config.regularization } } : {}),
    },
    checkpoint: cloneState(checkpoint),
    threshold,
    positive,
    testConsulted,
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
    checkpoint: {
      ...state,
      model: networkFromWire(state.model),
      optimizer: {
        step: state.optimizer.step,
        first: state.optimizer.first.map((v) => new Float64Array(v)),
        second: state.optimizer.second.map((v) => new Float64Array(v)),
      },
    },
  };
  prepareExperiment(value);
  return value;
}

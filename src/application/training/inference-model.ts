import { z } from '@/shared/validation';
import { appVersion } from '@/shared/version';
import { guardJson } from '@/application/data/json-files';
import { hashValue, utf8Length } from '@/domain/data/integrity';
import { safeId } from '@/domain/data/validation';
import { forward, cloneNetwork, validateNetwork, type Network } from '@/domain/network/model';
import { transformRow, type PipelineState } from '@/domain/data/pipeline';
import type { Cell, FeatureSpec, Task } from '@/domain/data/types';
import { prepareExperiment, type Experiment } from './experiment';
import { networkFromWire, networkWire, networkWireSchema } from './network-schema';

export const modelLimit = 8 * 1024 * 1024;
const text = z.string().max(4096),
  finite = z.number().finite();
const id = z.string().refine(safeId),
  hash = z.string().regex(/^[a-f0-9]{64}$/);
const pipelineSchema = z.strictObject({
  version: z.union([z.literal(1), z.literal(2)]),
  inputFeatureIds: z.array(id).min(1).max(32),
  outputFeatureIds: z.array(text).min(1).max(32),
  outputLabels: z.array(text).min(1).max(32),
  fittedOn: z.strictObject({ split: z.literal('train'), idsHash: hash }),
  dataHash: hash,
  splitHash: hash,
  options: z.strictObject({
    featureIds: z.array(id).min(1).max(32),
    imputation: z.enum(['mean', 'median', 'mode']),
    scaling: z.enum(['none', 'minmax', 'standard', 'robust']),
    missingIndicators: z.boolean(),
  }),
  columns: z
    .array(
      z.discriminatedUnion('kind', [
        z.strictObject({
          kind: z.literal('numeric'),
          id,
          fill: finite,
          mean: finite,
          std: finite.min(0),
          min: finite,
          max: finite,
          constant: z.boolean(),
          robust: z
            .strictObject({ median: finite, q1: finite, q3: finite, iqr: finite.min(0) })
            .optional(),
        }),
        z.strictObject({
          kind: z.literal('categorical'),
          id,
          fill: text,
          vocabulary: z.array(text).min(1).max(32),
        }),
      ]),
    )
    .min(1)
    .max(32),
});
const modelSchema = z.strictObject({
  format: z.literal('neural-atlas.model'),
  schemaVersion: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  engineVersion: z.union([z.literal(1), z.literal(2)]),
  appVersion: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/)
    .max(32),
  savedAt: z.iso.datetime(),
  network: networkWireSchema,
  pipeline: pipelineSchema,
  features: z
    .array(
      z.strictObject({
        id,
        name: text.refine((v) => Boolean(v.trim())),
        kind: z.enum(['numeric', 'categorical']),
        unit: text.optional(),
      }),
    )
    .min(1)
    .max(32),
  targetName: text.refine((v) => Boolean(v.trim())),
  task: z.enum(['binary', 'multiclass', 'regression']),
  classOrder: z.array(text.refine((value) => Boolean(value.trim()))).max(10),
  positiveClassId: z.number().int().min(0).max(1).nullable(),
  threshold: finite.min(0).max(1).nullable(),
  hashes: z.strictObject({
    dataHash: hash,
    splitHash: hash,
    pipelineHash: hash,
    networkHash: hash,
  }),
  training: z.strictObject({
    epoch: z.number().int().min(0).max(10000),
    updates: z.number().int().min(0).max(100000000),
    frozen: z.boolean(),
    testConsulted: z.boolean(),
  }),
});
export interface InferenceModel {
  format: 'neural-atlas.model';
  schemaVersion: 1 | 2 | 3;
  engineVersion: 1 | 2;
  appVersion: string;
  savedAt: string;
  network: Network;
  pipeline: PipelineState;
  features: FeatureSpec[];
  targetName: string;
  task: Task;
  classOrder: string[];
  positiveClassId: number | null;
  threshold: number | null;
  hashes: { dataHash: string; splitHash: string; pipelineHash: string; networkHash: string };
  training: { epoch: number; updates: number; frozen: boolean; testConsulted: boolean };
}
export function inferenceWire(model: InferenceModel) {
  return { ...model, network: networkWire(model.network) };
}
export function validateInferenceModel(model: InferenceModel): void {
  const wire = inferenceWire(model);
  guardJson(wire);
  modelSchema.parse(wire);
  validateNetwork(model.network);
  const version = model.network.spec.batchNormalization ? 2 : 1;
  if (
    model.schemaVersion !== (model.pipeline.options.scaling === 'robust' ? 3 : version) ||
    model.engineVersion !== version
  )
    throw new Error('MODEL_VERSION');
  const p = model.pipeline;
  if (p.version !== (p.options.scaling === 'robust' ? 2 : 1))
    throw new Error('MODEL_PIPELINE_VERSION');
  const featureIds = model.features.map((feature) => feature.id);
  if (
    new Set(featureIds).size !== featureIds.length ||
    hashValue(featureIds) !== hashValue(p.inputFeatureIds) ||
    hashValue(featureIds) !== hashValue(p.options.featureIds) ||
    hashValue(featureIds) !== hashValue(p.columns.map((column) => column.id))
  )
    throw new Error('MODEL_FEATURES');
  const outputs: string[] = [],
    labels: string[] = [];
  p.columns.forEach((column, index) => {
    const feature = model.features[index]!;
    if (column.kind !== feature.kind) throw new Error('MODEL_FEATURES');
    if (column.kind === 'numeric') {
      if (
        column.min > column.max ||
        column.constant !== (column.min === column.max) ||
        (column.constant && column.std !== 0) ||
        column.mean < column.min ||
        column.mean > column.max ||
        column.fill < column.min ||
        column.fill > column.max
      )
        throw new Error('MODEL_STATISTICS');
      const r = column.robust;
      if (
        p.options.scaling === 'robust'
          ? !r ||
            r.q1 < column.min ||
            r.q3 > column.max ||
            r.q1 > r.median ||
            r.median > r.q3 ||
            r.iqr !== r.q3 - r.q1
          : r !== undefined
      )
        throw new Error('MODEL_STATISTICS');
      outputs.push(`${column.id}:numeric`);
      labels.push(feature.name);
    } else {
      if (
        new Set(column.vocabulary).size !== column.vocabulary.length ||
        !column.vocabulary.includes(column.fill)
      )
        throw new Error('MODEL_VOCABULARY');
      outputs.push(
        ...column.vocabulary.map((_, i) => `${column.id}:category:${i}`),
        `${column.id}:unknown`,
      );
      labels.push(...column.vocabulary.map((v) => `${feature.name} = ${v}`), `${feature.name} = ?`);
    }
    if (p.options.missingIndicators) {
      outputs.push(`${column.id}:missing`);
      labels.push(`isMissing(${feature.name})`);
    }
  });
  if (
    hashValue(outputs) !== hashValue(p.outputFeatureIds) ||
    hashValue(labels) !== hashValue(p.outputLabels) ||
    outputs.length !== model.network.spec.inputs
  )
    throw new Error('MODEL_DIMENSIONS');
  const classes = model.classOrder;
  if (
    model.task !== model.network.spec.task ||
    new Set(classes).size !== classes.length ||
    classes.length !==
      (model.task === 'regression'
        ? 0
        : model.task === 'binary'
          ? 2
          : model.network.spec.classes) ||
    (model.task === 'binary'
      ? model.positiveClassId === null || model.threshold === null
      : model.positiveClassId !== null || model.threshold !== null)
  )
    throw new Error('MODEL_CLASSES');
  if (
    model.hashes.dataHash !== p.dataHash ||
    model.hashes.splitHash !== p.splitHash ||
    model.hashes.pipelineHash !== hashValue(p) ||
    model.hashes.networkHash !== hashValue(wire.network)
  )
    throw new Error('MODEL_INTEGRITY');
}
/** Only learned inference state is retained; no rows, partitions, optimizer or history escape. */
export function modelFromExperiment(experiment: Experiment): InferenceModel {
  const { dataset, prepared } = prepareExperiment(experiment);
  const network = cloneNetwork(experiment.checkpoint.model);
  const pipeline = structuredClone(prepared.pipeline);
  const model: InferenceModel = {
    format: 'neural-atlas.model',
    schemaVersion:
      pipeline.options.scaling === 'robust' ? 3 : network.spec.batchNormalization ? 2 : 1,
    engineVersion: network.spec.batchNormalization ? 2 : 1,
    appVersion,
    savedAt: new Date().toISOString(),
    network,
    pipeline,
    features: pipeline.inputFeatureIds.map((id) => ({
      ...dataset.features.find((feature) => feature.id === id)!,
    })),
    targetName: dataset.targetName,
    task: dataset.task,
    classOrder: [...(dataset.classOrder ?? [])],
    positiveClassId: dataset.task === 'binary' ? experiment.positive : null,
    threshold: dataset.task === 'binary' ? experiment.threshold : null,
    hashes: {
      dataHash: pipeline.dataHash,
      splitHash: pipeline.splitHash,
      pipelineHash: hashValue(pipeline),
      networkHash: hashValue(networkWire(network)),
    },
    training: {
      epoch: experiment.checkpoint.epoch,
      updates: experiment.checkpoint.updates,
      frozen: experiment.checkpoint.frozen,
      testConsulted: experiment.testConsulted,
    },
  };
  validateInferenceModel(model);
  return model;
}
export function exportInferenceModel(model: InferenceModel): string {
  validateInferenceModel(model);
  const wire = inferenceWire(model);
  const text = JSON.stringify({ ...wire, integrity: hashValue(wire) });
  if (utf8Length(text) > modelLimit) throw new Error('MODEL_SIZE');
  return text;
}
export function importInferenceModel(text: string): InferenceModel {
  if (utf8Length(text) > modelLimit) throw new Error('MODEL_SIZE');
  const raw: unknown = JSON.parse(text);
  guardJson(raw);
  const { integrity, ...wire } = modelSchema.extend({ integrity: hash }).parse(raw);
  if (integrity !== hashValue(wire)) throw new Error('MODEL_INTEGRITY');
  const model: InferenceModel = { ...wire, network: networkFromWire(wire.network) };
  validateInferenceModel(model);
  return model;
}
export function predictWithModel(model: InferenceModel, values: Record<string, Cell>) {
  validateInferenceModel(model);
  if (
    Object.keys(values).length !== model.features.length ||
    model.features.some(
      (feature) =>
        !Object.hasOwn(values, feature.id) ||
        (values[feature.id] !== null &&
          (feature.kind === 'numeric'
            ? typeof values[feature.id] !== 'number' || !Number.isFinite(values[feature.id])
            : typeof values[feature.id] !== 'string' ||
              (values[feature.id] as string).length > 4096)),
    )
  )
    throw new Error('MODEL_INPUT');
  const transformed = transformRow(
    { id: 'inference', origin: 'manual', features: values, target: null },
    model.pipeline,
  );
  const output = Array.from(forward(model.network, transformed).activations.at(-1)!);
  const probabilities =
    model.task === 'binary'
      ? [1 - output[0]!, output[0]!]
      : model.task === 'multiclass'
        ? output
        : [];
  const decision =
    model.task === 'regression'
      ? null
      : model.task === 'binary'
        ? probabilities[model.positiveClassId!]! >= model.threshold!
          ? model.positiveClassId!
          : 1 - model.positiveClassId!
        : probabilities.indexOf(Math.max(...probabilities));
  const warnings = model.pipeline.columns
    .filter(
      (column) =>
        values[column.id] !== null &&
        (column.kind === 'numeric'
          ? Number(values[column.id]) < column.min || Number(values[column.id]) > column.max
          : !column.vocabulary.includes(String(values[column.id]))),
    )
    .map((column) => column.id);
  return {
    transformed,
    output,
    probabilities,
    decision,
    label: decision === null ? null : model.classOrder[decision]!,
    warnings,
  };
}

import { createRandom } from '@/domain/random/seeded';
import { activate, activations, type Activation } from './neuron';
import {
  createNormalization,
  cloneNormalization,
  validateNormalization,
  normalizeInference,
  type BatchNormalization,
} from './normalization';
export type TrainActivation = Exclude<Activation, 'step'>;
export type NetworkTask = 'binary' | 'multiclass' | 'regression';
export type Initialization = 'zero' | 'xavier' | 'he';
export interface NetworkSpec {
  inputs: number;
  hidden: number[];
  activation: TrainActivation;
  task: NetworkTask;
  classes: number;
  alpha: number;
  batchNormalization?: true;
}
export interface DenseLayer {
  inputs: number;
  outputs: number;
  weights: Float64Array;
  biases: Float64Array;
  activation: TrainActivation | 'softmax';
  normalization?: BatchNormalization;
}
export interface Network {
  version: 1;
  spec: NetworkSpec;
  layers: DenseLayer[];
}
export interface Forward {
  activations: Float64Array[];
  logits: Float64Array[];
}
export const defaultSpec: NetworkSpec = {
  inputs: 2,
  hidden: [4],
  activation: 'tanh',
  task: 'binary',
  classes: 2,
  alpha: 0.01,
};
export function assertFinite(values: ArrayLike<number>): void {
  for (let i = 0; i < values.length; i++)
    if (!Number.isFinite(values[i])) throw new RangeError('NON_FINITE');
}
export function validateSpec(spec: NetworkSpec): void {
  if (
    !Number.isInteger(spec.inputs) ||
    spec.inputs < 1 ||
    spec.inputs > 32 ||
    spec.hidden.length > 6 ||
    spec.hidden.some((n) => !Number.isInteger(n) || n < 1 || n > 64) ||
    (spec.batchNormalization !== undefined &&
      (spec.batchNormalization !== true || !spec.hidden.length)) ||
    !activations.includes(spec.activation) ||
    (spec.activation as string) === 'step' ||
    !['binary', 'multiclass', 'regression'].includes(spec.task) ||
    !Number.isInteger(spec.classes) ||
    spec.classes < 2 ||
    spec.classes > 10 ||
    !Number.isFinite(spec.alpha) ||
    spec.alpha < 0.001 ||
    spec.alpha > 0.3
  )
    throw new RangeError('ARCHITECTURE');
}
export function dimensions(spec: NetworkSpec): number[] {
  validateSpec(spec);
  return [spec.inputs, ...spec.hidden, spec.task === 'multiclass' ? spec.classes : 1];
}
export function parameterCount(spec: NetworkSpec): number {
  const d = dimensions(spec);
  return (
    d.slice(1).reduce((sum, n, i) => sum + n * (d[i]! + 1), 0) +
    (spec.batchNormalization ? 2 * spec.hidden.reduce((s, n) => s + n, 0) : 0)
  );
}
export function createNetwork(
  spec: NetworkSpec,
  seed: number,
  initialization: Initialization = 'xavier',
): Network {
  const d = dimensions(spec);
  if (!['zero', 'xavier', 'he'].includes(initialization)) throw new RangeError('INITIALIZATION');
  const random = createRandom(seed, 'initialization');
  return {
    version: 1,
    spec: { ...spec, hidden: [...spec.hidden] },
    layers: d.slice(1).map((outputs, index) => {
      const inputs = d[index]!;
      const last = index === d.length - 2;
      return {
        inputs,
        outputs,
        weights: Float64Array.from({ length: inputs * outputs }, () =>
          initialization === 'zero'
            ? 0
            : initialization === 'he'
              ? random.normal() * Math.sqrt(2 / inputs)
              : (random.uniform() * 2 - 1) * Math.sqrt(6 / (inputs + outputs)),
        ),
        biases: new Float64Array(outputs),
        ...(spec.batchNormalization && !last
          ? { normalization: createNormalization(outputs) }
          : {}),
        activation: last
          ? spec.task === 'binary'
            ? 'sigmoid'
            : spec.task === 'multiclass'
              ? 'softmax'
              : 'linear'
          : spec.activation,
      };
    }),
  };
}
export function validateNetwork(model: Network): void {
  const d = dimensions(model.spec);
  if (model.version !== 1 || model.layers.length !== d.length - 1) throw new RangeError('SHAPE');
  model.layers.forEach((layer, i) => {
    const expected =
      i === d.length - 2
        ? model.spec.task === 'binary'
          ? 'sigmoid'
          : model.spec.task === 'multiclass'
            ? 'softmax'
            : 'linear'
        : model.spec.activation;
    if (
      layer.inputs !== d[i] ||
      layer.outputs !== d[i + 1] ||
      layer.weights.length !== layer.inputs * layer.outputs ||
      layer.biases.length !== layer.outputs ||
      layer.activation !== expected
    )
      throw new RangeError('SHAPE');
    assertFinite(layer.weights);
    assertFinite(layer.biases);
    if (!!layer.normalization !== (!!model.spec.batchNormalization && i < model.layers.length - 1))
      throw new RangeError('NORMALIZATION');
    if (layer.normalization) validateNormalization(layer.normalization, layer.outputs);
  });
}
export function softmax(logits: ArrayLike<number>): Float64Array {
  if (logits.length < 2 || logits.length > 10) throw new RangeError('SHAPE');
  assertFinite(logits);
  let max = -Infinity;
  for (let i = 0; i < logits.length; i++) max = Math.max(max, logits[i]!);
  const exp = Float64Array.from(logits, (z) => Math.exp(z - max));
  const sum = exp.reduce((a, b) => a + b, 0);
  return exp.map((e) => e / sum);
}
export function softmaxJacobian(logits: ArrayLike<number>): number[][] {
  const p = softmax(logits);
  return Array.from(p, (pi, i) => Array.from(p, (pj, j) => pi * ((i === j ? 1 : 0) - pj)));
}
export function forward(model: Network, input: ArrayLike<number>): Forward {
  validateNetwork(model);
  if (input.length !== model.spec.inputs) throw new RangeError('SHAPE');
  assertFinite(input);
  const cache: Forward = { activations: [Float64Array.from(input)], logits: [] };
  for (const layer of model.layers) {
    const previous = cache.activations[cache.activations.length - 1]!;
    let z = Float64Array.from(layer.biases, (b, i) => {
      let value = b;
      for (let j = 0; j < layer.inputs; j++)
        value += layer.weights[i * layer.inputs + j]! * previous[j]!;
      return value;
    });
    assertFinite(z);
    if (layer.normalization) z = normalizeInference(z, layer.normalization);
    assertFinite(z);
    cache.logits.push(z);
    cache.activations.push(
      layer.activation === 'softmax'
        ? softmax(z)
        : z.map((v) => activate(v, layer.activation as TrainActivation, model.spec.alpha)),
    );
  }
  return cache;
}
export function cloneNetwork(model: Network): Network {
  return {
    ...model,
    spec: { ...model.spec, hidden: [...model.spec.hidden] },
    layers: model.layers.map((l) => ({
      ...l,
      weights: l.weights.slice(),
      biases: l.biases.slice(),
      ...(l.normalization ? { normalization: cloneNormalization(l.normalization) } : {}),
    })),
  };
}
export function stableNorm(values: ArrayLike<number>): number {
  let scale = 0,
    sum = 1;
  for (let i = 0; i < values.length; i++) {
    const a = Math.abs(values[i]!);
    if (a) {
      if (scale < a) {
        sum = 1 + sum * (scale / a) ** 2;
        scale = a;
      } else sum += (a / scale) ** 2;
    }
  }
  return scale === 0 ? 0 : scale * Math.sqrt(sum);
}

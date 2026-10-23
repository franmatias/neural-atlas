import { assertFinite, cloneNetwork, type Network } from '@/domain/network/model';
export type OptimizerKind = 'sgd' | 'momentum' | 'rmsprop' | 'adam';
export interface OptimizerConfig {
  kind: OptimizerKind;
  rate: number;
  momentum: number;
  rho: number;
  beta1: number;
  beta2: number;
  epsilon: number;
  scheduler: 'constant' | 'step' | 'cosine';
  period: number;
  minimum: number;
}
export interface OptimizerState {
  step: number;
  first: Float64Array[];
  second: Float64Array[];
}
export const defaultOptimizer: OptimizerConfig = {
  kind: 'adam',
  rate: 0.01,
  momentum: 0.9,
  rho: 0.9,
  beta1: 0.9,
  beta2: 0.999,
  epsilon: 1e-8,
  scheduler: 'constant',
  period: 50,
  minimum: 1e-5,
};
export function validateOptimizer(c: OptimizerConfig) {
  if (
    !['sgd', 'momentum', 'rmsprop', 'adam'].includes(c.kind) ||
    !Number.isFinite(c.rate) ||
    c.rate < 1e-5 ||
    c.rate > 1 ||
    [c.momentum, c.rho, c.beta1, c.beta2].some((v) => !Number.isFinite(v) || v < 0 || v >= 1) ||
    !Number.isFinite(c.epsilon) ||
    c.epsilon <= 0 ||
    c.epsilon > 0.01 ||
    !['constant', 'step', 'cosine'].includes(c.scheduler) ||
    !Number.isInteger(c.period) ||
    c.period < 1 ||
    !Number.isFinite(c.minimum) ||
    c.minimum < 1e-5 ||
    c.minimum > c.rate
  )
    throw new RangeError('INVALID_CONFIG');
}
export function parameterVectors(model: Network) {
  return model.layers.flatMap((l) => [l.weights, l.biases]);
}
export function createOptimizer(model: Network): OptimizerState {
  return {
    step: 0,
    first: parameterVectors(model).map((v) => new Float64Array(v.length)),
    second: parameterVectors(model).map((v) => new Float64Array(v.length)),
  };
}
export function learningRate(c: OptimizerConfig, epoch: number, horizon: number) {
  return c.scheduler === 'constant'
    ? c.rate
    : c.scheduler === 'step'
      ? Math.max(c.minimum, c.rate * 0.5 ** Math.floor(epoch / c.period))
      : c.minimum +
        ((c.rate - c.minimum) * (1 + Math.cos((Math.PI * Math.min(epoch, horizon)) / horizon))) / 2;
}
export function* optimizerStep(
  model: Network,
  state: OptimizerState,
  gradient: Float64Array[],
  config: OptimizerConfig,
  rate: number,
) {
  const next = cloneNetwork(model),
    vectors = parameterVectors(next);
  if (
    gradient.length !== vectors.length ||
    state.first.length !== vectors.length ||
    state.second.length !== vectors.length
  )
    throw new RangeError('SHAPE');
  const first = state.first.map((v) => v.slice()),
    second = state.second.map((v) => v.slice());
  const step = state.step + 1;
  for (let i = 0; i < vectors.length; i++) {
    const vector = vectors[i]!,
      g = gradient[i]!,
      m = first[i]!,
      v = second[i]!;
    if (g.length !== vector.length || m.length !== g.length || v.length !== g.length)
      throw new RangeError('SHAPE');
    for (let start = 0; start < vector.length; start += 256) {
      for (let j = start; j < Math.min(start + 256, vector.length); j++) {
        const value = g[j]!;
        let update = value;
        if (config.kind === 'momentum') {
          m[j] = config.momentum * m[j]! + value;
          update = m[j]!;
        } else if (config.kind === 'rmsprop') {
          v[j] = config.rho * v[j]! + (1 - config.rho) * value ** 2;
          update = value / (Math.sqrt(v[j]!) + config.epsilon);
        } else if (config.kind === 'adam') {
          m[j] = config.beta1 * m[j]! + (1 - config.beta1) * value;
          v[j] = config.beta2 * v[j]! + (1 - config.beta2) * value ** 2;
          update =
            m[j]! /
            (1 - config.beta1 ** step) /
            (Math.sqrt(v[j]! / (1 - config.beta2 ** step)) + config.epsilon);
        }
        vector[j]! -= rate * update;
        if (
          !Number.isFinite(vector[j]) ||
          !Number.isFinite(m[j]) ||
          !Number.isFinite(v[j]) ||
          !Number.isFinite(value)
        )
          throw new RangeError('NON_FINITE');
      }
      yield;
    }
  }
  return { model: next, optimizer: { step, first, second } };
}
export function validateOptimizerState(model: Network, state: OptimizerState) {
  const vectors = parameterVectors(model);
  if (
    !Number.isInteger(state.step) ||
    state.step < 0 ||
    state.first.length !== vectors.length ||
    state.second.length !== vectors.length
  )
    throw new RangeError('CHECKPOINT');
  vectors.forEach((v, i) => {
    if (state.first[i]!.length !== v.length || state.second[i]!.length !== v.length)
      throw new RangeError('CHECKPOINT');
    assertFinite(state.first[i]!);
    assertFinite(state.second[i]!);
    if (state.second[i]!.some((v) => v < 0)) throw new RangeError('CHECKPOINT');
  });
}

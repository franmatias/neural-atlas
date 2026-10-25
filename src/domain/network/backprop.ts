import { activationDerivative } from './neuron';
import {
  assertFinite,
  cloneNetwork,
  forward,
  stableNorm,
  type Forward,
  type Network,
} from './model';
export type RegressionLoss = 'mse' | 'mae';
export interface LayerGradient {
  weights: Float64Array;
  biases: Float64Array;
  delta: Float64Array;
  weightNorm: number;
  biasNorm: number;
}
export interface Backward {
  loss: number;
  gradient: LayerGradient[];
  cache: Forward;
}
export function outputLoss(
  model: Network,
  cache: Forward,
  target: number,
  loss: RegressionLoss = 'mse',
) {
  if (!['mse', 'mae'].includes(loss) || !Number.isFinite(target)) throw new RangeError('TARGET');
  const logits = cache.logits[cache.logits.length - 1]!;
  const prediction = cache.activations[cache.activations.length - 1]!;
  let value: number;
  let delta: Float64Array;
  if (model.spec.task === 'binary') {
    if (target !== 0 && target !== 1) throw new RangeError('TARGET');
    const z = logits[0]!;
    value = Math.max(z, 0) - z * target + Math.log1p(Math.exp(-Math.abs(z)));
    delta = Float64Array.of(prediction[0]! - target);
  } else if (model.spec.task === 'multiclass') {
    if (!Number.isInteger(target) || target < 0 || target >= logits.length)
      throw new RangeError('TARGET');
    const max = Math.max(...logits);
    value = max - logits[target]! + Math.log(logits.reduce((s, z) => s + Math.exp(z - max), 0));
    delta = prediction.map((p, i) => p - Number(i === target));
  } else {
    const difference = prediction[0]! - target;
    value = loss === 'mse' ? difference ** 2 : Math.abs(difference);
    delta = Float64Array.of(loss === 'mse' ? 2 * difference : Math.sign(difference));
  }
  assertFinite([value, ...delta]);
  return { value, delta };
}
export function backward(
  model: Network,
  input: ArrayLike<number>,
  target: number,
  loss: RegressionLoss = 'mse',
): Backward {
  if (model.spec.batchNormalization) throw new RangeError('BATCH_REQUIRED');
  const cache = forward(model, input);
  const output = outputLoss(model, cache, target, loss);
  let delta = output.delta;
  const gradient: LayerGradient[] = new Array(model.layers.length);
  for (let i = model.layers.length - 1; i >= 0; i--) {
    const layer = model.layers[i]!;
    const previous = cache.activations[i]!;
    const weights = Float64Array.from(
      layer.weights,
      (_, index) => delta[Math.floor(index / layer.inputs)]! * previous[index % layer.inputs]!,
    );
    const biases = delta.slice();
    assertFinite(weights);
    gradient[i] = {
      weights,
      biases,
      delta: delta.slice(),
      weightNorm: stableNorm(weights),
      biasNorm: stableNorm(biases),
    };
    if (i > 0) {
      const hidden = model.layers[i - 1]!;
      const next = new Float64Array(layer.inputs);
      for (let j = 0; j < layer.inputs; j++) {
        let sum = 0;
        for (let k = 0; k < layer.outputs; k++)
          sum += layer.weights[k * layer.inputs + j]! * delta[k]!;
        next[j] =
          sum *
          activationDerivative(
            cache.logits[i - 1]![j]!,
            hidden.activation as Exclude<typeof hidden.activation, 'softmax'>,
            model.spec.alpha,
          )!;
      }
      assertFinite(next);
      delta = next;
    }
  }
  return { loss: output.value, gradient, cache };
}
export function batchGradient(
  model: Network,
  inputs: readonly number[][],
  targets: readonly number[],
  loss: RegressionLoss = 'mse',
) {
  if (inputs.length === 0 || inputs.length !== targets.length) throw new RangeError('SHAPE');
  const gradients = model.layers.map((l) => ({
    weights: new Float64Array(l.weights.length),
    biases: new Float64Array(l.biases.length),
  }));
  let value = 0;
  inputs.forEach((x, index) => {
    const result = backward(model, x, targets[index]!, loss);
    value += result.loss / inputs.length;
    result.gradient.forEach((g, i) => {
      g.weights.forEach((v, j) => (gradients[i]!.weights[j]! += v / inputs.length));
      g.biases.forEach((v, j) => (gradients[i]!.biases[j]! += v / inputs.length));
    });
  });
  assertFinite([value]);
  gradients.forEach((g) => {
    assertFinite(g.weights);
    assertFinite(g.biases);
  });
  return { loss: value, gradient: gradients };
}
export function applyGradient(
  model: Network,
  gradient: readonly { weights: ArrayLike<number>; biases: ArrayLike<number> }[],
  rate: number,
): Network {
  if (!Number.isFinite(rate) || rate <= 0 || rate > 1 || gradient.length !== model.layers.length)
    throw new RangeError('UPDATE');
  const next = cloneNetwork(model);
  next.layers.forEach((layer, i) => {
    const g = gradient[i]!;
    if (g.weights.length !== layer.weights.length || g.biases.length !== layer.biases.length)
      throw new RangeError('SHAPE');
    assertFinite(g.weights);
    assertFinite(g.biases);
    layer.weights = layer.weights.map((w, j) => w - rate * g.weights[j]!);
    layer.biases = layer.biases.map((b, j) => b - rate * g.biases[j]!);
    assertFinite(layer.weights);
    assertFinite(layer.biases);
  });
  return next;
}
export interface GradientCheck {
  layer: number;
  kind: 'weight' | 'bias';
  index: number;
  analytic: number;
  numeric: number;
  relativeError: number;
  atKink: boolean;
}
export function checkGradient(
  model: Network,
  input: number[],
  target: number,
  loss: RegressionLoss = 'mse',
  epsilon = 1e-5,
): GradientCheck[] {
  if (!Number.isFinite(epsilon) || epsilon <= 0 || epsilon > 0.01) throw new RangeError('EPSILON');
  if (model.layers.reduce((n, l) => n + l.weights.length + l.biases.length, 0) > 256)
    throw new RangeError('BUDGET');
  const original = backward(model, input, target, loss);
  const result: GradientCheck[] = [];
  model.layers.forEach((layer, i) => {
    for (const kind of ['weight', 'bias'] as const) {
      const key = kind === 'weight' ? 'weights' : 'biases';
      layer[key].forEach((_, index) => {
        const plus = cloneNetwork(model),
          minus = cloneNetwork(model);
        plus.layers[i]![key][index]! += epsilon;
        minus.layers[i]![key][index]! -= epsilon;
        const p = forward(plus, input),
          m = forward(minus, input);
        const numeric =
          (outputLoss(plus, p, target, loss).value - outputLoss(minus, m, target, loss).value) /
          (2 * epsilon);
        const analytic = original.gradient[i]![key][index]!;
        const atKink =
          original.cache.logits.some(
            (z, l) =>
              ['relu', 'leakyRelu'].includes(model.layers[l]!.activation) &&
              z.some(
                (_, j) =>
                  Math.min(p.logits[l]![j]!, m.logits[l]![j]!) <= 0 &&
                  Math.max(p.logits[l]![j]!, m.logits[l]![j]!) >= 0,
              ),
          ) ||
          (model.spec.task === 'regression' &&
            loss === 'mae' &&
            Math.min(p.activations.at(-1)![0]!, m.activations.at(-1)![0]!) <= target &&
            Math.max(p.activations.at(-1)![0]!, m.activations.at(-1)![0]!) >= target);
        result.push({
          layer: i,
          kind,
          index,
          analytic,
          numeric,
          relativeError:
            Math.abs(analytic - numeric) / Math.max(1, Math.abs(analytic), Math.abs(numeric)),
          atKink,
        });
      });
    }
  });
  return result;
}

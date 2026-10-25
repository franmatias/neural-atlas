import { activate, activationDerivative } from '@/domain/network/neuron';
import {
  assertFinite,
  softmax,
  type Network,
  type Forward,
  type TrainActivation,
} from '@/domain/network/model';
import { normalizationEpsilon } from '@/domain/network/normalization';
import { outputLoss, type RegressionLoss } from '@/domain/network/backprop';
import { dropoutMask, type DropoutContext } from './dropout';
export interface BatchStatistics {
  size: number;
  means: number[][];
  variances: number[][];
}
/** Gradients of a mean batch loss. BN uses population variance; EMA is committed separately. */
export function* normalizedBatch(
  model: Network,
  x: number[][],
  y: number[],
  loss: RegressionLoss,
  dropout?: DropoutContext,
) {
  const count = x.length;
  if (!model.spec.batchNormalization || count < 2 || count !== y.length)
    throw new RangeError('BATCH_REQUIRED');
  const caches: Forward[] = x.map((row) => ({ activations: [Float64Array.from(row)], logits: [] }));
  const masks: number[][][] = [];
  for (let s = 0; s < count; s++) {
    masks.push(
      model.spec.hidden.map((n) => (dropout ? dropoutMask(n, dropout) : Array(n).fill(1))),
    );
    yield;
  }
  if (dropout) dropout.masks = masks.at(-1)!;
  const statistics: BatchStatistics = { size: count, means: [], variances: [] };
  const normalized: { xhat: Float64Array[]; inverse: number[] }[] = [];
  for (let index = 0; index < model.layers.length; index++) {
    const layer = model.layers[index]!,
      z: Float64Array[] = [];
    for (let s = 0; s < count; s++) {
      const values = new Float64Array(layer.outputs),
        previous = caches[s]!.activations[index]!;
      if (previous.length !== layer.inputs) throw new RangeError('SHAPE');
      for (let row = 0; row < layer.outputs; row++) {
        let value = layer.biases[row]!;
        for (let j = 0; j < layer.inputs; j++)
          value += layer.weights[row * layer.inputs + j]! * previous[j]!;
        values[row] = value;
        yield;
      }
      assertFinite(values);
      z.push(values);
    }
    let u = z;
    if (layer.normalization) {
      const mean = Array<number>(layer.outputs).fill(0),
        variance = Array<number>(layer.outputs).fill(0);
      for (let j = 0; j < layer.outputs; j++) {
        for (let s = 0; s < count; s++) {
          mean[j]! += z[s]![j]! / count;
          if (s % 256 === 255) yield;
        }
        for (let s = 0; s < count; s++) {
          variance[j]! += (z[s]![j]! - mean[j]!) ** 2 / count;
          if (s % 256 === 255) yield;
        }
        yield;
      }
      assertFinite(mean);
      assertFinite(variance);
      const inverse = variance.map((v) => 1 / Math.sqrt(v + normalizationEpsilon)),
        xhat: Float64Array[] = [];
      u = [];
      for (let s = 0; s < count; s++) {
        const h = z[s]!.map((v, j) => (v - mean[j]!) * inverse[j]!);
        xhat.push(h);
        u.push(h.map((v, j) => layer.normalization!.gamma[j]! * v + layer.normalization!.beta[j]!));
        yield;
      }
      statistics.means.push(mean);
      statistics.variances.push(variance);
      normalized.push({ xhat, inverse });
    }
    for (let s = 0; s < count; s++) {
      assertFinite(u[s]!);
      caches[s]!.logits.push(u[s]!);
      const a =
        layer.activation === 'softmax'
          ? softmax(u[s]!)
          : u[s]!.map((v) =>
              activate(
                v,
                layer.activation as Exclude<typeof layer.activation, 'softmax'>,
                model.spec.alpha,
              ),
            );
      if (index < model.layers.length - 1 && dropout)
        for (let j = 0; j < a.length; j++)
          a[j] = (a[j]! * masks[s]![index]![j]!) / (1 - dropout.rate);
      assertFinite(a);
      caches[s]!.activations.push(a);
      yield;
    }
  }
  let value = 0;
  let delta: Float64Array[] = caches.map((cache, s) => {
    const o = outputLoss(model, cache, y[s]!, loss);
    value += o.value / count;
    return o.delta.map((v) => v / count);
  });
  const dense: Float64Array[][] = new Array(model.layers.length),
    affine: Float64Array[][] = new Array(model.spec.hidden.length);
  for (let index = model.layers.length - 1; index >= 0; index--) {
    const layer = model.layers[index]!;
    if (layer.normalization) {
      const { xhat, inverse } = normalized[index]!,
        gamma = new Float64Array(layer.outputs),
        beta = new Float64Array(layer.outputs);
      for (let j = 0; j < layer.outputs; j++) {
        for (let s = 0; s < count; s++) {
          beta[j]! += delta[s]![j]!;
          gamma[j]! += delta[s]![j]! * xhat[s]![j]!;
          if (s % 256 === 255) yield;
        }
        yield;
      }
      affine[index] = [gamma, beta];
      const before: Float64Array[] = [];
      for (let s = 0; s < count; s++) {
        before.push(
          delta[s]!.map(
            (d, j) =>
              ((layer.normalization!.gamma[j]! * inverse[j]!) / count) *
              (count * d - beta[j]! - xhat[s]![j]! * gamma[j]!),
          ),
        );
        yield;
      }
      delta = before;
    }
    const weights = new Float64Array(layer.weights.length),
      biases = new Float64Array(layer.outputs);
    for (let row = 0; row < layer.outputs; row++) {
      for (let s = 0; s < count; s++) {
        biases[row]! += delta[s]![row]!;
        for (let j = 0; j < layer.inputs; j++)
          weights[row * layer.inputs + j]! += delta[s]![row]! * caches[s]!.activations[index]![j]!;
        if (s % 64 === 63) yield;
      }
      yield;
    }
    dense[index] = [weights, biases];
    if (index > 0) {
      const previous: Float64Array[] = [];
      for (let s = 0; s < count; s++) {
        const d = new Float64Array(layer.inputs);
        for (let j = 0; j < layer.inputs; j++) {
          let sum = 0;
          for (let row = 0; row < layer.outputs; row++)
            sum += layer.weights[row * layer.inputs + j]! * delta[s]![row]!;
          d[j] =
            sum *
            activationDerivative(
              caches[s]!.logits[index - 1]![j]!,
              model.layers[index - 1]!.activation as TrainActivation,
              model.spec.alpha,
            )! *
            (dropout ? masks[s]![index - 1]![j]! / (1 - dropout.rate) : 1);
        }
        previous.push(d);
        yield;
      }
      delta = previous;
    }
  }
  const gradient = [...dense.flat(), ...affine.flat()];
  gradient.forEach(assertFinite);
  assertFinite([value]);
  return { gradient, statistics, loss: value };
}
export function commitStatistics(model: Network, stats: BatchStatistics) {
  model.layers.forEach((layer, i) => {
    const b = layer.normalization;
    if (!b) return;
    b.mean = stats.means[i]!.map((v, j) => (b.initialized ? 0.9 * b.mean[j]! + 0.1 * v : v));
    b.variance = stats.variances[i]!.map((v, j) =>
      b.initialized ? 0.9 * b.variance[j]! + 0.1 * v : v,
    );
    b.initialized = true;
    assertFinite(b.mean);
    assertFinite(b.variance);
  });
}

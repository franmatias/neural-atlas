import { activate, activationDerivative, type Activation } from './neuron';
import { forward, stableNorm, type Network } from './model';
import { backward } from './backprop';
export function activationChain(input: number, kind: Activation, length: number, alpha = 0.01) {
  if (!Number.isInteger(length) || length < 1 || length > 20) throw new RangeError('CHAIN');
  let value = input;
  let gradient: number | null = 1;
  let logGradient: number | null = 0;
  return Array.from({ length }, (_, i) => {
    const z = value;
    const derivative = activationDerivative(z, kind, alpha);
    value = activate(z, kind, alpha);
    gradient = derivative === null ? null : gradient === null ? null : gradient * derivative;
    logGradient =
      derivative === null
        ? null
        : logGradient === null
          ? null
          : logGradient + Math.log10(Math.abs(derivative));
    return { index: i + 1, z, value, derivative, gradient, logGradient };
  });
}
export function histogram(values: readonly number[], bins = 12) {
  if (
    !values.length ||
    !Number.isInteger(bins) ||
    bins < 1 ||
    bins > 100 ||
    values.some((v) => !Number.isFinite(v))
  )
    throw new RangeError('HISTOGRAM');
  let min = Infinity,
    max = -Infinity;
  for (const v of values) {
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  const counts = Array<number>(bins).fill(0);
  for (const value of values) {
    const index =
      min === max
        ? Math.floor(bins / 2)
        : Math.min(bins - 1, Math.floor(((value - min) / (max - min)) * bins));
    counts[index]!++;
  }
  return { min, max, counts };
}
export function inspectNetwork(
  model: Network,
  input: number[],
  target: number,
  layer: number,
  neuron: number,
  resolution = 20,
) {
  if (
    !Number.isInteger(layer) ||
    layer < 0 ||
    layer >= model.layers.length ||
    !Number.isInteger(neuron) ||
    neuron < 0 ||
    neuron >= model.layers[layer]!.outputs ||
    !Number.isInteger(resolution) ||
    resolution < 5 ||
    resolution > 25
  )
    throw new RangeError('SELECTION');
  const result = backward(model, input, target);
  const cells: { x: number; y: number; value: number; prediction: number }[] = [];
  for (let yi = 0; yi < resolution; yi++)
    for (let xi = 0; xi < resolution; xi++) {
      const x = -0.2 + (xi * 1.4) / (resolution - 1),
        y = -0.2 + (yi * 1.4) / (resolution - 1);
      const point = [...input];
      point[0] = x;
      if (point.length > 1) point[1] = y;
      const cache = forward(model, point);
      cells.push({
        x,
        y,
        value: cache.activations[layer + 1]![neuron]!,
        prediction: cache.activations.at(-1)![0]!,
      });
    }
  const layers = model.layers.map((l, i) => ({
    weights: histogram([...l.weights]),
    activations: histogram([...result.cache.activations[i + 1]!]),
    activationNorm: stableNorm(result.cache.activations[i + 1]!),
    weightGradientNorm: result.gradient[i]!.weightNorm,
    biasGradientNorm: result.gradient[i]!.biasNorm,
  }));
  return { cache: result.cache, loss: result.loss, layers, cells, resolution };
}

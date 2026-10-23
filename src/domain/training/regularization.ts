import { stableNorm, type Network } from '@/domain/network/model';
export interface Regularization {
  l1: number;
  l2: number;
  clipNorm: number;
}
export const defaultRegularization: Regularization = { l1: 0, l2: 0, clipNorm: 0 };
export interface GradientControl {
  rawNorm: number;
  appliedNorm: number;
  scale: number;
  clippedUpdates: number;
  rawWeights: number[];
  rawBiases: number[];
  appliedWeights: number[];
  appliedBiases: number[];
}
export function validateRegularization(value: Regularization) {
  if (
    ![value.l1, value.l2].every((v) => Number.isFinite(v) && v >= 0 && v <= 0.1) ||
    !Number.isFinite(value.clipNorm) ||
    (value.clipNorm !== 0 && (value.clipNorm < 0.1 || value.clipNorm > 100))
  )
    throw new RangeError('INVALID_CONFIG');
}
/** Coupled penalties, weight matrices only. No extra division by batch or dataset size. */
export function penalty(model: Network, config: Regularization) {
  let total = 0;
  for (const layer of model.layers)
    for (const weight of layer.weights)
      total += config.l1 * Math.abs(weight) + 0.5 * config.l2 * weight * weight;
  if (!Number.isFinite(total)) throw new RangeError('NON_FINITE');
  return total;
}
export function* controlGradient(
  model: Network,
  gradient: Float64Array[],
  config: Regularization,
  clippedUpdates: number,
) {
  validateRegularization(config);
  const applied = gradient.map((v) => v.slice());
  if (applied.length !== model.layers.length * 2) throw new RangeError('SHAPE');
  for (let layer = 0; layer < model.layers.length; layer++) {
    const weights = model.layers[layer]!.weights,
      g = applied[layer * 2]!;
    if (
      g.length !== weights.length ||
      applied[layer * 2 + 1]!.length !== model.layers[layer]!.biases.length
    )
      throw new RangeError('SHAPE');
    for (let j = 0; j < g.length; j++) {
      g[j]! += config.l1 * Math.sign(weights[j]!) + config.l2 * weights[j]!;
      if (j % 256 === 255) yield;
    }
  }
  if (applied.some((v) => v.some((x) => !Number.isFinite(x)))) throw new RangeError('NON_FINITE');
  const raw = applied.map(stableNorm),
    rawNorm = stableNorm(raw);
  if (!Number.isFinite(rawNorm)) throw new RangeError('NON_FINITE');
  const scale =
    config.clipNorm > 0 && rawNorm > config.clipNorm ? config.clipNorm / (rawNorm + 1e-12) : 1;
  for (const vector of applied) {
    for (let start = 0; start < vector.length; start += 256) {
      if (scale < 1)
        for (let j = start; j < Math.min(start + 256, vector.length); j++) vector[j]! *= scale;
      yield;
    }
  }
  const norms = applied.map(stableNorm);
  const select = (values: number[], parity: number) => values.filter((_, i) => i % 2 === parity);
  const telemetry: GradientControl = {
    rawNorm,
    appliedNorm: stableNorm(norms),
    scale,
    clippedUpdates: clippedUpdates + Number(scale < 1),
    rawWeights: select(raw, 0),
    rawBiases: select(raw, 1),
    appliedWeights: select(norms, 0),
    appliedBiases: select(norms, 1),
  };
  return { gradient: applied, telemetry };
}
export function validateGradientControl(
  value: GradientControl,
  layers: number,
  updates: number,
  config?: Regularization,
) {
  if (
    ![value.rawNorm, value.appliedNorm, value.scale].every((v) => Number.isFinite(v) && v >= 0) ||
    value.scale > 1 ||
    !Number.isInteger(value.clippedUpdates) ||
    value.clippedUpdates < 0 ||
    value.clippedUpdates > updates ||
    [value.rawWeights, value.rawBiases, value.appliedWeights, value.appliedBiases].some(
      (v) => v.length !== layers || v.some((x) => !Number.isFinite(x) || x < 0),
    ) ||
    value.rawWeights.some(
      (v, i) => Math.abs(value.appliedWeights[i]! - v * value.scale) > 1e-10 * Math.max(1, v),
    ) ||
    value.rawBiases.some(
      (v, i) => Math.abs(value.appliedBiases[i]! - v * value.scale) > 1e-10 * Math.max(1, v),
    ) ||
    (value.scale < 1 && value.clippedUpdates === 0) ||
    (config &&
      (Math.abs(
        value.scale -
          (config.clipNorm > 0 && value.rawNorm > config.clipNorm
            ? config.clipNorm / (value.rawNorm + 1e-12)
            : 1),
      ) > 1e-12 ||
        (config.clipNorm === 0 && value.clippedUpdates !== 0))) ||
    Math.abs(value.appliedNorm - value.rawNorm * value.scale) >
      1e-10 * Math.max(1, value.rawNorm) ||
    Math.abs(stableNorm([...value.rawWeights, ...value.rawBiases]) - value.rawNorm) >
      1e-10 * Math.max(1, value.rawNorm) ||
    Math.abs(stableNorm([...value.appliedWeights, ...value.appliedBiases]) - value.appliedNorm) >
      1e-10 * Math.max(1, value.appliedNorm)
  )
    throw new RangeError('CHECKPOINT');
}

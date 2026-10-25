export const normalizationEpsilon = 1e-5;
export interface BatchNormalization {
  gamma: Float64Array;
  beta: Float64Array;
  mean: number[];
  variance: number[];
  initialized: boolean;
}
export function createNormalization(width: number): BatchNormalization {
  return {
    gamma: new Float64Array(width).fill(1),
    beta: new Float64Array(width),
    mean: Array(width).fill(0),
    variance: Array(width).fill(1),
    initialized: false,
  };
}
export function cloneNormalization(b: BatchNormalization): BatchNormalization {
  return {
    ...b,
    gamma: b.gamma.slice(),
    beta: b.beta.slice(),
    mean: [...b.mean],
    variance: [...b.variance],
  };
}
export function validateNormalization(b: BatchNormalization, width: number) {
  if (
    [b.gamma, b.beta, b.mean, b.variance].some(
      (v) => v.length !== width || Array.from(v).some((n) => !Number.isFinite(n)),
    ) ||
    b.variance.some((v) => v < 0) ||
    typeof b.initialized !== 'boolean' ||
    (!b.initialized && (b.mean.some((v) => v !== 0) || b.variance.some((v) => v !== 1)))
  )
    throw new RangeError('NORMALIZATION');
}
export function normalizeInference(z: Float64Array, b: BatchNormalization) {
  return z.map(
    (v, j) =>
      (b.gamma[j]! * (v - b.mean[j]!)) / Math.sqrt(b.variance[j]! + normalizationEpsilon) +
      b.beta[j]!,
  );
}

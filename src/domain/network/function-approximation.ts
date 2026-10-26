import { forward, type Network } from './model';
export const functionKinds = ['sine', 'absolute', 'step'] as const;
export type FunctionKind = (typeof functionKinds)[number];
export function functionValue(kind: FunctionKind, x: number): number {
  if (!Number.isFinite(x) || x < -1 || x > 1) throw new RangeError('FUNCTION_DOMAIN');
  switch (kind) {
    case 'sine':
      return Math.sin(Math.PI * x);
    case 'absolute':
      return Math.abs(x);
    case 'step':
      return x >= 0 ? 1 : 0;
    default:
      throw new RangeError('FUNCTION_KIND');
  }
}
export function functionContributions(model: Network, x: number) {
  if (
    !Number.isFinite(x) ||
    x < -1 ||
    x > 1 ||
    model.spec.inputs !== 1 ||
    model.spec.task !== 'regression' ||
    model.spec.hidden.length !== 1 ||
    model.spec.batchNormalization ||
    model.layers[1]?.activation !== 'linear'
  )
    throw new RangeError('FUNCTION_MODEL');
  const cache = forward(model, [x]),
    output = model.layers[1]!;
  const terms = Array.from(cache.activations[1]!, (activation, j) => ({
    activation,
    weight: output.weights[j]!,
    contribution: activation * output.weights[j]!,
  }));
  const bias = output.biases[0]!,
    prediction = cache.activations[2]![0]!;
  const sum = terms.reduce((s, t) => s + t.contribution, bias);
  return { x, terms, bias, sum, prediction };
}

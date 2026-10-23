export const activations = ['sigmoid', 'tanh', 'relu', 'leakyRelu', 'linear', 'step'] as const;
export type Activation = (typeof activations)[number];
export interface NeuronConfig {
  x1: number;
  x2: number;
  w1: number;
  w2: number;
  b: number;
  activation: Activation;
}
export interface NeuronResult {
  products: readonly [number, number];
  z: number;
  a: number;
  derivative: number | null;
}
export const defaultNeuron: Readonly<NeuronConfig> = {
  x1: 0.8,
  x2: 0.2,
  w1: 0.5,
  w2: -0.3,
  b: 0.1,
  activation: 'sigmoid',
};

export function activate(z: number, kind: Activation, alpha = 0.01): number {
  if (!Number.isFinite(z)) throw new RangeError('Activation requires a finite scalar');
  if (!Number.isFinite(alpha) || alpha < 0.001 || alpha > 0.3)
    throw new RangeError('Invalid alpha');
  switch (kind) {
    case 'sigmoid': {
      const exp = Math.exp(-Math.abs(z));
      return z >= 0 ? 1 / (1 + exp) : exp / (1 + exp);
    }
    case 'tanh':
      return Math.tanh(z);
    case 'relu':
      return Math.max(0, z);
    case 'leakyRelu':
      return z > 0 ? z : alpha * z;
    case 'linear':
      return z;
    case 'step':
      return z >= 0 ? 1 : 0;
    default:
      throw new RangeError('Unknown activation');
  }
}
export function activationDerivative(z: number, kind: Activation, alpha = 0.01): number | null {
  const a = activate(z, kind, alpha);
  switch (kind) {
    case 'sigmoid':
      return a * (1 - a);
    case 'tanh':
      return 1 - a * a;
    case 'relu':
      return z > 0 ? 1 : 0;
    case 'leakyRelu':
      return z > 0 ? 1 : alpha;
    case 'linear':
      return 1;
    case 'step':
      return null;
  }
}
export function evaluateNeuron(config: NeuronConfig): NeuronResult {
  for (const key of ['x1', 'x2', 'w1', 'w2', 'b'] as const) {
    const limit = key === 'x1' || key === 'x2' ? 2 : 5;
    if (!Number.isFinite(config[key]) || Math.abs(config[key]) > limit)
      throw new RangeError(`Invalid ${key}`);
  }
  const products = [config.x1 * config.w1, config.x2 * config.w2] as const;
  const z = products[0] + products[1] + config.b;
  return {
    products,
    z,
    a: activate(z, config.activation),
    derivative: activationDerivative(z, config.activation),
  };
}

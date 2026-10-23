import { createNetwork, defaultSpec } from './model';
export function propagationPreset() {
  const model = createNetwork({ ...defaultSpec, hidden: [2] }, 42, 'zero');
  model.layers[0]!.weights.set([0.5, -0.3, -0.2, 0.4]);
  model.layers[0]!.biases.set([0.1, -0.1]);
  model.layers[1]!.weights.set([0.7, -0.5]);
  model.layers[1]!.biases[0] = 0.2;
  return model;
}

import { z } from '@/shared/validation';
import type { Network } from '@/domain/network/model';
export const networkSpecSchema = z.strictObject({
  inputs: z.number(),
  hidden: z.array(z.number()).max(6),
  activation: z.enum(['linear', 'sigmoid', 'tanh', 'relu', 'leakyRelu']),
  task: z.enum(['binary', 'multiclass', 'regression']),
  classes: z.number(),
  alpha: z.number().finite(),
});
export const networkWireSchema = z.strictObject({
  version: z.literal(1),
  spec: networkSpecSchema,
  layers: z
    .array(
      z.strictObject({
        inputs: z.number(),
        outputs: z.number(),
        activation: z.enum(['linear', 'sigmoid', 'tanh', 'relu', 'leakyRelu', 'softmax']),
        weights: z.array(z.number().finite()).max(25000),
        biases: z.array(z.number().finite()).max(64),
      }),
    )
    .min(1)
    .max(7),
});
export function networkWire(network: Network) {
  return {
    ...network,
    layers: network.layers.map((layer) => ({
      ...layer,
      weights: Array.from(layer.weights),
      biases: Array.from(layer.biases),
    })),
  };
}
export function networkFromWire(network: z.infer<typeof networkWireSchema>): Network {
  return {
    ...network,
    layers: network.layers.map((layer) => ({
      ...layer,
      weights: new Float64Array(layer.weights),
      biases: new Float64Array(layer.biases),
    })),
  };
}

import { z } from '@/shared/validation';
import type { Network } from '@/domain/network/model';
export const networkSpecSchema = z.strictObject({
  inputs: z.number(),
  hidden: z.array(z.number()).max(6),
  activation: z.enum(['linear', 'sigmoid', 'tanh', 'relu', 'leakyRelu']),
  task: z.enum(['binary', 'multiclass', 'regression']),
  classes: z.number(),
  alpha: z.number().finite(),
  batchNormalization: z.literal(true).optional(),
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
        normalization: z
          .strictObject({
            gamma: z.array(z.number().finite()).max(64),
            beta: z.array(z.number().finite()).max(64),
            mean: z.array(z.number().finite()).max(64),
            variance: z.array(z.number().finite().min(0)).max(64),
            initialized: z.boolean(),
          })
          .optional(),
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
      ...(layer.normalization
        ? {
            normalization: {
              ...layer.normalization,
              gamma: Array.from(layer.normalization.gamma),
              beta: Array.from(layer.normalization.beta),
            },
          }
        : {}),
    })),
  };
}
export function networkFromWire(network: z.infer<typeof networkWireSchema>): Network {
  return {
    ...network,
    layers: network.layers.map((layer) => {
      const { normalization, ...dense } = layer;
      return {
        ...dense,
        weights: new Float64Array(layer.weights),
        biases: new Float64Array(layer.biases),
        ...(normalization
          ? {
              normalization: {
                ...normalization,
                gamma: new Float64Array(normalization.gamma),
                beta: new Float64Array(normalization.beta),
              },
            }
          : {}),
      };
    }),
  };
}

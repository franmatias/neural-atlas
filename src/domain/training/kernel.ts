import { activate, activationDerivative } from '@/domain/network/neuron';
import { dropoutMask, type DropoutContext } from './dropout';
import {
  assertFinite,
  softmax,
  stableNorm,
  type Network,
  type Forward,
} from '@/domain/network/model';
import {
  outputLoss,
  type RegressionLoss,
  type Backward,
  type LayerGradient,
} from '@/domain/network/backprop';
/** A yield after each dense row and each gradient row bounds arithmetic per fragment. */
export function* forwardChunks(
  model: Network,
  input: number[],
  dropout?: DropoutContext,
): Generator<void, Forward> {
  if (input.length !== model.spec.inputs) throw new RangeError('SHAPE');
  assertFinite(input);
  const cache: Forward = { activations: [Float64Array.from(input)], logits: [] };
  for (const l of model.layers) {
    const previous = cache.activations.at(-1)!,
      z = new Float64Array(l.outputs);
    for (let i = 0; i < l.outputs; i++) {
      let sum = l.biases[i]!;
      for (let j = 0; j < l.inputs; j++) sum += l.weights[i * l.inputs + j]! * previous[j]!;
      if (!Number.isFinite(sum)) throw new RangeError('NON_FINITE');
      z[i] = sum;
      yield;
    }
    cache.logits.push(z);
    cache.activations.push(
      l.activation === 'softmax'
        ? softmax(z)
        : z.map((v) =>
            activate(v, l.activation as Exclude<typeof l.activation, 'softmax'>, model.spec.alpha),
          ),
    );
    if (dropout && cache.logits.length < model.layers.length) {
      const a = cache.activations.at(-1)!;
      const mask = dropoutMask(a.length, dropout);
      dropout.masks.push(mask);
      for (let j = 0; j < a.length; j++) a[j] = (a[j]! * mask[j]!) / (1 - dropout.rate);
    }
  }
  return cache;
}
export function* backwardChunks(
  model: Network,
  input: number[],
  target: number,
  loss: RegressionLoss,
  dropout?: DropoutContext,
): Generator<void, Backward> {
  const cache = yield* forwardChunks(model, input, dropout);
  const output = outputLoss(model, cache, target, loss);
  let delta = output.delta;
  const gradient: LayerGradient[] = new Array(model.layers.length);
  for (let i = model.layers.length - 1; i >= 0; i--) {
    const l = model.layers[i]!,
      previous = cache.activations[i]!,
      weights = new Float64Array(l.weights.length);
    for (let row = 0; row < l.outputs; row++) {
      for (let j = 0; j < l.inputs; j++) weights[row * l.inputs + j] = delta[row]! * previous[j]!;
      yield;
    }
    assertFinite(weights);
    gradient[i] = {
      weights,
      biases: delta.slice(),
      delta: delta.slice(),
      weightNorm: stableNorm(weights),
      biasNorm: stableNorm(delta),
    };
    if (i > 0) {
      const next = new Float64Array(l.inputs),
        hidden = model.layers[i - 1]!;
      for (let j = 0; j < l.inputs; j++) {
        let sum = 0;
        for (let row = 0; row < l.outputs; row++)
          sum += l.weights[row * l.inputs + j]! * delta[row]!;
        next[j] =
          sum *
          activationDerivative(
            cache.logits[i - 1]![j]!,
            hidden.activation as Exclude<typeof hidden.activation, 'softmax'>,
            model.spec.alpha,
          )! *
          (dropout ? dropout.masks[i - 1]![j]! / (1 - dropout.rate) : 1);
        yield;
      }
      assertFinite(next);
      delta = next;
    }
  }
  return { loss: output.value, gradient, cache };
}
export function exhaust<T>(generator: Generator<void, T>): T {
  let result = generator.next();
  while (!result.done) result = generator.next();
  return result.value;
}

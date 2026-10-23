import { shuffle } from '@/domain/random/seeded';
import { activate } from './neuron';
import { createNetwork, defaultSpec, forward } from './model';
import { applyGradient, batchGradient } from './backprop';
export const xorInputs = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];
export const xorTargets = [0, 1, 1, 0];
export interface PerceptronSnapshot {
  weights: number[];
  bias: number;
  correct: number;
}
export function perceptronScore(
  inputs: readonly number[][],
  targets: readonly number[],
  weights: readonly number[],
  bias: number,
): number {
  return inputs.reduce(
    (n, x, i) =>
      n +
      Number(
        activate(
          x.reduce((z, v, j) => z + v * weights[j]!, bias),
          'step',
        ) === targets[i],
      ),
    0,
  );
}
export function trainPerceptron(
  inputs: readonly number[][],
  targets: readonly number[],
  seed: number,
  rate = 0.1,
  epochs = 100,
) {
  if (
    !inputs.length ||
    inputs.length > 10000 ||
    inputs.length !== targets.length ||
    !inputs[0]!.length ||
    inputs[0]!.length > 32 ||
    inputs.some((x) => x.length !== inputs[0]!.length || x.some((v) => !Number.isFinite(v))) ||
    targets.some((y) => y !== 0 && y !== 1) ||
    !Number.isFinite(rate) ||
    rate < 0.001 ||
    rate > 1 ||
    !Number.isInteger(epochs) ||
    epochs < 1 ||
    epochs > 1000
  )
    throw new RangeError('PERCEPTRON');
  let weights = Array<number>(inputs[0]!.length).fill(0);
  let bias = 0;
  let best: PerceptronSnapshot = {
    weights: [...weights],
    bias,
    correct: perceptronScore(inputs, targets, weights, bias),
  };
  const history: {
    epoch: number;
    mistakes: number;
    correct: number;
    weights: number[];
    bias: number;
  }[] = [];
  let converged = false;
  for (let epoch = 0; epoch < epochs; epoch++) {
    let mistakes = 0;
    for (const i of shuffle(
      inputs.map((_, i) => i),
      seed,
      `perceptron-${epoch}`,
    )) {
      const x = inputs[i]!;
      const error =
        targets[i]! -
        activate(
          x.reduce((z, v, j) => z + v * weights[j]!, bias),
          'step',
        );
      if (error) {
        mistakes++;
        weights = weights.map((w, j) => w + rate * error * x[j]!);
        bias += rate * error;
      }
      if (!Number.isFinite(bias) || weights.some((v) => !Number.isFinite(v)))
        throw new RangeError('NON_FINITE');
    }
    const correct = perceptronScore(inputs, targets, weights, bias);
    if (correct > best.correct) best = { weights: [...weights], bias, correct };
    history.push({ epoch: epoch + 1, mistakes, correct, weights: [...weights], bias });
    if (mistakes === 0) {
      converged = true;
      break;
    }
  }
  return {
    best,
    history,
    converged,
    last: { weights, bias },
    epochs: history.length,
    targets: [...targets],
    seed,
    rate,
  };
}
export function solveXor(seed: number, epochs = 6000) {
  if (!Number.isInteger(epochs) || epochs < 1 || epochs > 10000) throw new RangeError('BUDGET');
  let model = createNetwork(defaultSpec, seed);
  let completed = 0;
  let correct = 0;
  const history: { epoch: number; loss: number }[] = [];
  for (let epoch = 0; epoch < epochs; epoch++) {
    const g = batchGradient(model, xorInputs, xorTargets);
    model = applyGradient(model, g.gradient, 0.5);
    completed = epoch + 1;
    const loss = g.loss;
    if (epoch % 100 === 0) history.push({ epoch: completed, loss });
    correct = xorInputs.reduce(
      (n, x, i) =>
        n + Number(Number(forward(model, x).activations.at(-1)![0]! >= 0.5) === xorTargets[i]),
      0,
    );
    if (correct === 4 && loss < 0.03) break;
  }
  return {
    model,
    epochs: completed,
    loss: batchGradient(model, xorInputs, xorTargets).loss,
    correct,
    history,
  };
}
export function xorDemonstration() {
  const model = createNetwork(
    { ...defaultSpec, hidden: [2], activation: 'relu', task: 'regression' },
    42,
    'zero',
  );
  model.layers[0]!.weights.set([1, -1, -1, 1]);
  model.layers[1]!.weights.set([1, 1]);
  return model;
}
export function makeBatches(ids: readonly string[], size: number, seed: number, epoch: number) {
  if (
    !ids.length ||
    ids.length > 10000 ||
    new Set(ids).size !== ids.length ||
    !Number.isInteger(size) ||
    size < 1 ||
    size > ids.length ||
    !Number.isInteger(epoch) ||
    epoch < 0
  )
    throw new RangeError('BATCH');
  const order = shuffle(ids, seed, `batches-${epoch}`);
  const result: string[][] = [];
  for (let i = 0; i < order.length; i += size) result.push(order.slice(i, i + size));
  return result;
}

import {
  createNetwork,
  validateNetwork,
  stableNorm,
  validateSpec,
  type Network,
  type NetworkSpec,
  type Initialization,
} from '@/domain/network/model';
import { outputLoss, type RegressionLoss } from '@/domain/network/backprop';
import { shuffle, validateSeed, createRandom } from '@/domain/random/seeded';
import {
  initialDropout,
  validateDropout,
  validateDropoutState,
  type DropoutConfig,
  type DropoutState,
  type DropoutContext,
} from './dropout';
import { hashValue } from '@/domain/data/integrity';
import {
  createOptimizer,
  validateOptimizer,
  validateOptimizerState,
  optimizerStep,
  learningRate,
  type OptimizerConfig,
  type OptimizerState,
} from './optimizer';
import { forwardChunks, backwardChunks } from './kernel';
import {
  cloneSnapshot,
  cloneEarly,
  newEarlyState,
  observeEarly,
  validateEarlyConfig,
  validateEarlyState,
  type EarlyStoppingConfig,
  type EarlyStoppingState,
} from './early-stopping';
import {
  controlGradient,
  penalty,
  validateRegularization,
  validateGradientControl,
  type Regularization,
  type GradientControl,
} from './regularization';
export interface Samples {
  ids: string[];
  x: number[][];
  y: number[];
}
export interface TrainingConfig {
  spec: NetworkSpec;
  seed: number;
  initialization: Initialization;
  optimizer: OptimizerConfig;
  epochs: number;
  batchSize: number;
  loss: RegressionLoss;
  regularization?: Regularization;
  earlyStopping?: EarlyStoppingConfig;
  dropout?: DropoutConfig;
}
export interface TrainingInput {
  train: Samples;
  validation: Samples;
  config: TrainingConfig;
  dataHash: string;
  splitHash: string;
  pipelineHash: string;
  classOrder: string[];
}
export interface EpochPoint {
  epoch: number;
  update: number;
  trainLoss: number;
  validationLoss: number;
  trainScore: number;
  validationScore: number;
  gradientNorm: number;
  regularizationPenalty?: number;
  trainObjective?: number;
}
export interface TrainingSnapshot {
  frozen: boolean;
  version: 1;
  configHash: string;
  model: Network;
  optimizer: OptimizerState;
  epoch: number;
  cursor: number;
  batchIndex: number;
  updates: number;
  order: number[];
  lastBatchIds: string[];
  history: EpochPoint[];
  gradientNorms: number[];
  baseline: number;
  gradientControl?: GradientControl;
  dropout?: DropoutState;
}
export interface TrainingState extends TrainingSnapshot {
  earlyStopping?: EarlyStoppingState;
}
export function configHash(input: TrainingInput) {
  return hashValue({
    config: input.config,
    dataHash: input.dataHash,
    splitHash: input.splitHash,
    pipelineHash: input.pipelineHash,
    classOrder: input.classOrder,
    engineVersion: input.config.dropout
      ? 4
      : input.config.earlyStopping
        ? 3
        : input.config.regularization
          ? 2
          : 1,
  });
}
export function validateSamples(samples: Samples, config: TrainingConfig) {
  if (
    !samples.ids.length ||
    samples.ids.length > 10000 ||
    samples.ids.length !== samples.x.length ||
    samples.x.length !== samples.y.length ||
    new Set(samples.ids).size !== samples.ids.length ||
    samples.ids.some((id) => typeof id !== 'string' || !id.length) ||
    samples.x.some((x) => x.length !== config.spec.inputs || x.some((v) => !Number.isFinite(v))) ||
    samples.y.some(
      (y) =>
        !Number.isFinite(y) ||
        (config.spec.task === 'binary'
          ? y !== 0 && y !== 1
          : config.spec.task === 'multiclass'
            ? !Number.isInteger(y) || y < 0 || y >= config.spec.classes
            : false),
    )
  )
    throw new RangeError('INVALID_DATA');
}
export function validateTraining(input: TrainingInput) {
  const c = input.config;
  validateSpec(c.spec);
  validateOptimizer(c.optimizer);
  validateSeed(c.seed);
  if (c.regularization) validateRegularization(c.regularization);
  if (c.earlyStopping) validateEarlyConfig(c.earlyStopping);
  if (c.dropout) validateDropout(c.dropout, c.spec.hidden);
  if (
    !Number.isInteger(c.epochs) ||
    c.epochs < 1 ||
    c.epochs > 10000 ||
    !Number.isInteger(c.batchSize) ||
    c.batchSize < 1 ||
    c.batchSize > input.train.ids.length ||
    (c.batchSize !== input.train.ids.length && c.batchSize > 512) ||
    !['mse', 'mae'].includes(c.loss) ||
    !['zero', 'xavier', 'he'].includes(c.initialization) ||
    input.train.ids.length + input.validation.ids.length > 10000 ||
    [input.dataHash, input.splitHash, input.pipelineHash].some((h) => !/^[a-f0-9]{64}$/.test(h))
  )
    throw new RangeError('INVALID_CONFIG');
  validateSamples(input.train, c);
  validateSamples(input.validation, c);
  const ids = new Set(input.train.ids);
  if (input.validation.ids.some((id) => ids.has(id))) throw new RangeError('LEAKAGE');
  if (c.spec.task !== 'regression') {
    const count = c.spec.task === 'binary' ? 2 : c.spec.classes;
    if (
      input.classOrder.length !== count ||
      new Set(input.classOrder).size !== count ||
      input.classOrder.some((v) => !v.length)
    )
      throw new RangeError('INVALID_DATA');
    for (let i = 0; i < count; i++)
      if (input.train.y.filter((y) => y === i).length < 2 || !input.validation.y.includes(i))
        throw new RangeError('SUPPORT');
  }
}
export function* evaluateChunks(model: Network, samples: Samples, loss: RegressionLoss) {
  let value = 0,
    score = 0;
  const predictions: number[][] = [];
  for (let i = 0; i < samples.x.length; i++) {
    const cache = yield* forwardChunks(model, samples.x[i]!);
    const p = [...cache.activations.at(-1)!];
    predictions.push(p);
    value += outputLoss(model, cache, samples.y[i]!, loss).value / samples.x.length;
    if (model.spec.task === 'regression') score += (p[0]! - samples.y[i]!) ** 2 / samples.x.length;
    else
      score +=
        Number(
          (model.spec.task === 'binary' ? Number(p[0]! >= 0.5) : p.indexOf(Math.max(...p))) ===
            samples.y[i],
        ) / samples.x.length;
    yield;
  }
  if (!Number.isFinite(value) || !Number.isFinite(score)) throw new RangeError('NON_FINITE');
  return { loss: value, score, predictions };
}
export function* initialSession(input: TrainingInput): Generator<void, TrainingState> {
  validateTraining(input);
  const model = createNetwork(input.config.spec, input.config.seed, input.config.initialization);
  const optimizer = createOptimizer(model);
  const train = yield* evaluateChunks(model, input.train, input.config.loss),
    validation = yield* evaluateChunks(model, input.validation, input.config.loss);
  const sorted = [...input.train.y].sort((a, b) => a - b);
  const baseline =
    input.config.loss === 'mae'
      ? sorted[Math.floor((sorted.length - 1) / 2)]! / 2 +
        sorted[Math.floor(sorted.length / 2)]! / 2
      : input.train.y.reduce((s, y) => s + y / input.train.y.length, 0);
  return {
    frozen: false,
    version: 1,
    configHash: configHash(input),
    model,
    optimizer,
    epoch: 0,
    cursor: 0,
    batchIndex: 0,
    updates: 0,
    order: shuffle(
      input.train.ids.map((_, i) => i),
      input.config.seed,
      'batches-0',
    ),
    lastBatchIds: [],
    history: [
      {
        epoch: 0,
        update: 0,
        trainLoss: train.loss,
        validationLoss: validation.loss,
        trainScore: train.score,
        validationScore: validation.score,
        gradientNorm: 0,
        ...(input.config.regularization
          ? {
              regularizationPenalty: penalty(model, input.config.regularization),
              trainObjective: train.loss + penalty(model, input.config.regularization),
            }
          : {}),
      },
    ],
    gradientNorms: model.layers.map(() => 0),
    baseline,
    ...(input.config.dropout ? { dropout: initialDropout(input.config.seed) } : {}),
    ...(input.config.earlyStopping ? { earlyStopping: newEarlyState(0) } : {}),
    ...(input.config.regularization
      ? {
          gradientControl: {
            rawNorm: 0,
            appliedNorm: 0,
            scale: 1,
            clippedUpdates: 0,
            rawWeights: model.layers.map(() => 0),
            rawBiases: model.layers.map(() => 0),
            appliedWeights: model.layers.map(() => 0),
            appliedBiases: model.layers.map(() => 0),
          },
        }
      : {}),
  };
}
export function* advanceBatch(
  state: TrainingState,
  input: TrainingInput,
): Generator<void, TrainingState> {
  if (state.frozen) throw new RangeError('FROZEN');
  if (state.earlyStopping?.reason) throw new RangeError('INVALID_STATE');
  if (state.epoch >= input.config.epochs) throw new RangeError('COMPLETED');
  const indices = state.order.slice(state.cursor, state.cursor + input.config.batchSize);
  const dropout: DropoutContext | undefined = input.config.dropout
    ? {
        rate: input.config.dropout.rate,
        random: createRandom(input.config.seed, 'dropout', state.dropout!.rng),
        masks: [],
      }
    : undefined;
  const gradient = state.model.layers.flatMap((l) => [
    new Float64Array(l.weights.length),
    new Float64Array(l.biases.length),
  ]);
  for (const index of indices) {
    if (dropout) dropout.masks = [];
    const sample = yield* backwardChunks(
      state.model,
      input.train.x[index]!,
      input.train.y[index]!,
      input.config.loss,
      dropout,
    );
    for (let l = 0; l < sample.gradient.length; l++) {
      const g = sample.gradient[l]!;
      for (let j = 0; j < g.weights.length; j++) {
        gradient[l * 2]![j]! += g.weights[j]! / indices.length;
        if (j % 256 === 255) yield;
      }
      for (let j = 0; j < g.biases.length; j++)
        gradient[l * 2 + 1]![j]! += g.biases[j]! / indices.length;
      yield;
    }
  }
  const controlled = input.config.regularization
    ? yield* controlGradient(
        state.model,
        gradient,
        input.config.regularization,
        state.gradientControl?.clippedUpdates ?? 0,
      )
    : undefined;
  const candidate = yield* optimizerStep(
    state.model,
    state.optimizer,
    controlled?.gradient ?? gradient,
    input.config.optimizer,
    learningRate(input.config.optimizer, state.epoch, input.config.epochs),
  );
  const gradientNorms =
    controlled?.telemetry.rawWeights ??
    state.model.layers.map((_, l) => stableNorm(gradient[l * 2]!));
  if (gradientNorms.some((n) => !Number.isFinite(n))) throw new RangeError('NON_FINITE');
  const next: TrainingState = {
    ...state,
    ...candidate,
    updates: state.updates + 1,
    cursor: state.cursor + indices.length,
    batchIndex: state.batchIndex + 1,
    lastBatchIds: indices.map((i) => input.train.ids[i]!),
    gradientNorms,
    ...(dropout
      ? {
          dropout: {
            rng: dropout.random.snapshot(),
            seenSamples: state.dropout!.seenSamples + indices.length,
            lastSampleId: input.train.ids[indices.at(-1)!]!,
            masks: dropout.masks,
          },
        }
      : {}),
    ...(controlled ? { gradientControl: controlled.telemetry } : {}),
  };
  if (next.cursor === state.order.length) {
    const train = yield* evaluateChunks(next.model, input.train, input.config.loss),
      validation = yield* evaluateChunks(next.model, input.validation, input.config.loss);
    next.epoch++;
    next.cursor = 0;
    next.batchIndex = 0;
    next.order = shuffle(
      state.order.map((_, i) => i),
      input.config.seed,
      `batches-${next.epoch}`,
    );
    next.history = [
      ...state.history,
      {
        epoch: next.epoch,
        update: next.updates,
        trainLoss: train.loss,
        validationLoss: validation.loss,
        trainScore: train.score,
        validationScore: validation.score,
        gradientNorm: Math.max(...gradientNorms),
        ...(input.config.regularization
          ? {
              regularizationPenalty: penalty(next.model, input.config.regularization),
              trainObjective: train.loss + penalty(next.model, input.config.regularization),
            }
          : {}),
      },
    ];
  }
  return input.config.earlyStopping && next.cursor === 0
    ? observeEarly(next, input.config.earlyStopping, input.config.epochs)
    : next;
}
export function cloneState(state: TrainingState): TrainingState {
  return {
    ...cloneSnapshot(state),
    ...(state.earlyStopping ? { earlyStopping: cloneEarly(state.earlyStopping) } : {}),
  };
}
export function validateCheckpoint(state: TrainingState, input: TrainingInput) {
  validateBaseCheckpoint(state, input);
  if (input.config.earlyStopping)
    validateEarlyState(
      state,
      input.config.earlyStopping,
      Math.ceil(input.train.ids.length / input.config.batchSize),
      input.config.epochs,
      (best) => validateBaseCheckpoint(best, input),
    );
  else if (state.earlyStopping) throw new RangeError('CHECKPOINT');
}
function validateBaseCheckpoint(state: TrainingSnapshot, input: TrainingInput) {
  validateTraining(input);
  validateNetwork(state.model);
  validateOptimizerState(state.model, state.optimizer);
  validateDropoutState(state, input.config, input.train.ids.length);
  if (input.config.regularization) {
    if (!state.gradientControl) throw new RangeError('CHECKPOINT');
    validateGradientControl(
      state.gradientControl,
      state.model.layers.length,
      state.updates,
      input.config.regularization,
    );
    for (const point of state.history)
      if (
        point.regularizationPenalty === undefined ||
        point.regularizationPenalty < 0 ||
        point.trainObjective === undefined ||
        Math.abs(point.trainObjective - point.trainLoss - point.regularizationPenalty) >
          1e-10 * Math.max(1, point.trainObjective)
      )
        throw new RangeError('CHECKPOINT');
    if (
      state.cursor === 0 &&
      Math.abs(
        state.history.at(-1)!.regularizationPenalty! -
          penalty(state.model, input.config.regularization),
      ) >
        1e-10 * Math.max(1, state.history.at(-1)!.regularizationPenalty!)
    )
      throw new RangeError('CHECKPOINT');
  } else if (
    state.gradientControl ||
    state.history.some(
      (point) => point.regularizationPenalty !== undefined || point.trainObjective !== undefined,
    )
  )
    throw new RangeError('CHECKPOINT');
  const batches = Math.ceil(input.train.ids.length / input.config.batchSize);
  const expectedOrder = shuffle(
    input.train.ids.map((_, index) => index),
    input.config.seed,
    `batches-${state.epoch}`,
  );
  const previousEpoch = state.cursor === 0 ? state.epoch - 1 : state.epoch;
  const previousOrder = shuffle(
    input.train.ids.map((_, index) => index),
    input.config.seed,
    `batches-${previousEpoch}`,
  );
  const expectedIds =
    state.updates === 0
      ? []
      : previousOrder
          .slice(
            state.cursor === 0
              ? (batches - 1) * input.config.batchSize
              : state.cursor - input.config.batchSize,
            state.cursor === 0 ? undefined : state.cursor,
          )
          .map((index) => input.train.ids[index]);
  if (
    state.version !== 1 ||
    typeof state.frozen !== 'boolean' ||
    state.configHash !== configHash(input) ||
    hashValue(state.model.spec) !== hashValue(input.config.spec) ||
    !Number.isInteger(state.epoch) ||
    state.epoch < 0 ||
    state.epoch > input.config.epochs ||
    !Number.isInteger(state.cursor) ||
    state.cursor < 0 ||
    state.cursor >= input.train.ids.length ||
    !Number.isInteger(state.updates) ||
    state.updates !== state.optimizer.step ||
    state.updates < 0 ||
    !Number.isInteger(state.batchIndex) ||
    state.batchIndex < 0 ||
    state.batchIndex >= batches ||
    state.cursor !== state.batchIndex * input.config.batchSize ||
    state.updates !== state.epoch * batches + state.batchIndex ||
    (state.epoch === input.config.epochs && state.cursor !== 0) ||
    state.order.some((index, position) => index !== expectedOrder[position]) ||
    hashValue(state.lastBatchIds) !== hashValue(expectedIds) ||
    state.order.length !== input.train.ids.length ||
    new Set(state.order).size !== state.order.length ||
    state.order.some((i) => !Number.isInteger(i) || i < 0 || i >= state.order.length) ||
    state.history.length !== state.epoch + 1 ||
    state.history.some(
      (point, index) =>
        point.epoch !== index ||
        point.update !== index * batches ||
        point.trainLoss < 0 ||
        point.validationLoss < 0 ||
        point.gradientNorm < 0 ||
        point.trainScore < 0 ||
        point.validationScore < 0 ||
        (input.config.spec.task !== 'regression' &&
          (point.trainScore > 1 + 1e-12 || point.validationScore > 1 + 1e-12)),
    ) ||
    state.history.length > input.config.epochs + 1 ||
    state.history.some((p) => Object.values(p).some((v) => !Number.isFinite(v))) ||
    !Number.isFinite(state.baseline) ||
    state.gradientNorms.length !== state.model.layers.length ||
    state.gradientNorms.some((v) => !Number.isFinite(v) || v < 0)
  )
    throw new RangeError('CHECKPOINT');
}
export function diagnostics(history: EpochPoint[], support: number) {
  if (support < 20 || history.length < 4) return [];
  const last = history.slice(-3);
  const result: string[] = [];
  if (
    last.every((p) => p.validationLoss > p.trainLoss * 1.5 && p.validationLoss - p.trainLoss > 0.1)
  )
    result.push('gap');
  if (last.every((p) => p.gradientNorm < 1e-8 && p.trainLoss > 0.1)) result.push('vanishing');
  if (last.every((p) => p.gradientNorm > 100)) result.push('exploding');
  if (
    history.length >= 6 &&
    Math.abs(history.at(-1)!.trainLoss - history.at(-6)!.trainLoss) < 1e-5 &&
    history.at(-1)!.trainLoss > 0.1
  )
    result.push('plateau');
  return result;
}

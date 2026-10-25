import { cloneNetwork } from '@/domain/network/model';
import { hashValue } from '@/domain/data/integrity';
import { cloneDropout } from './dropout';
import type { EpochPoint, TrainingSnapshot, TrainingState } from './session';
export interface EarlyStoppingConfig {
  patience: number;
  minDelta: number;
}
export interface StopReport {
  anchorEpoch: number;
  stoppedAt: number;
  restoredEpoch: number;
  reason: 'patience' | 'horizon';
  observations: EpochPoint[];
}
export interface EarlyStoppingState {
  anchorEpoch: number;
  badEpochs: number;
  bestLoss: number | null;
  best?: TrainingSnapshot;
  observations: EpochPoint[];
  stoppedAt?: number;
  reason?: 'patience' | 'horizon';
  lastReport?: StopReport;
}
function snapshotHash(state: TrainingSnapshot) {
  return hashValue({
    ...state,
    model: {
      ...state.model,
      layers: state.model.layers.map((layer) => ({
        ...layer,
        weights: Array.from(layer.weights),
        biases: Array.from(layer.biases),
      })),
    },
    optimizer: {
      step: state.optimizer.step,
      first: state.optimizer.first.map((v) => Array.from(v)),
      second: state.optimizer.second.map((v) => Array.from(v)),
    },
  });
}
export function validateEarlyConfig(config: EarlyStoppingConfig) {
  if (
    !Number.isInteger(config.patience) ||
    config.patience < 5 ||
    config.patience > 100 ||
    !Number.isFinite(config.minDelta) ||
    config.minDelta < 0 ||
    config.minDelta > 0.01
  )
    throw new RangeError('INVALID_CONFIG');
}
/** Finite, nonrecursive snapshot. No monitor or prior best is embedded. */
export function cloneSnapshot(state: TrainingSnapshot): TrainingSnapshot {
  const base = { ...state } as TrainingState;
  delete base.earlyStopping;
  return {
    ...base,
    model: cloneNetwork(state.model),
    ...(state.dropout ? { dropout: cloneDropout(state.dropout) } : {}),
    optimizer: {
      step: state.optimizer.step,
      first: state.optimizer.first.map((v) => v.slice()),
      second: state.optimizer.second.map((v) => v.slice()),
    },
    order: [...state.order],
    lastBatchIds: [...state.lastBatchIds],
    history: state.history.map((p) => ({ ...p })),
    gradientNorms: [...state.gradientNorms],
    ...(state.gradientControl
      ? {
          gradientControl: {
            ...state.gradientControl,
            rawWeights: [...state.gradientControl.rawWeights],
            rawBiases: [...state.gradientControl.rawBiases],
            appliedWeights: [...state.gradientControl.appliedWeights],
            appliedBiases: [...state.gradientControl.appliedBiases],
          },
        }
      : {}),
  };
}
export function newEarlyState(anchorEpoch: number): EarlyStoppingState {
  return { anchorEpoch, badEpochs: 0, bestLoss: null, observations: [] };
}
export function cloneEarly(state: EarlyStoppingState): EarlyStoppingState {
  return {
    ...state,
    observations: state.observations.map((p) => ({ ...p })),
    ...(state.best ? { best: cloneSnapshot(state.best) } : {}),
    ...(state.lastReport
      ? {
          lastReport: {
            ...state.lastReport,
            observations: state.lastReport.observations.map((p) => ({ ...p })),
          },
        }
      : {}),
  };
}
export function observeEarly(
  state: TrainingState,
  config: EarlyStoppingConfig,
  horizon: number,
): TrainingState {
  const previous = state.earlyStopping!;
  const point = state.history.at(-1)!;
  const improved =
    previous.bestLoss === null || previous.bestLoss - point.validationLoss > config.minDelta;
  const monitor: EarlyStoppingState = {
    ...previous,
    observations: [...previous.observations, { ...point }],
    badEpochs: improved ? 0 : previous.badEpochs + 1,
    bestLoss: improved ? point.validationLoss : previous.bestLoss,
    best: improved ? cloneSnapshot(state) : previous.best,
  };
  const reason =
    monitor.badEpochs >= config.patience
      ? 'patience'
      : state.epoch >= horizon
        ? 'horizon'
        : undefined;
  if (!reason) return { ...state, earlyStopping: monitor };
  return {
    ...cloneSnapshot(monitor.best!),
    earlyStopping: { ...monitor, stoppedAt: state.epoch, reason },
  };
}
export function continueBest(state: TrainingState, horizon: number): TrainingState {
  const monitor = state.earlyStopping;
  if (!monitor?.reason || !monitor.best || state.frozen || state.epoch >= horizon)
    throw new RangeError('INVALID_STATE');
  return {
    ...cloneSnapshot(state),
    earlyStopping: {
      ...newEarlyState(state.epoch),
      lastReport: {
        anchorEpoch: monitor.anchorEpoch,
        stoppedAt: monitor.stoppedAt!,
        restoredEpoch: state.epoch,
        reason: monitor.reason,
        observations: monitor.observations.map((p) => ({ ...p })),
      },
    },
  };
}
function replay(
  observations: EpochPoint[],
  anchor: number,
  config: EarlyStoppingConfig,
  batches: number,
  horizon: number,
) {
  let bestLoss: number | null = null,
    bestEpoch = anchor,
    badEpochs = 0;
  for (const [i, point] of observations.entries()) {
    if (
      point.epoch !== anchor + i + 1 ||
      point.update !== point.epoch * batches ||
      point.epoch > horizon ||
      Object.values(point).some((v) => !Number.isFinite(v)) ||
      point.trainLoss < 0 ||
      point.validationLoss < 0 ||
      point.gradientNorm < 0
    )
      throw new RangeError('CHECKPOINT');
    if (bestLoss === null || bestLoss - point.validationLoss > config.minDelta) {
      bestLoss = point.validationLoss;
      bestEpoch = point.epoch;
      badEpochs = 0;
    } else badEpochs++;
    if (i < observations.length - 1 && badEpochs >= config.patience)
      throw new RangeError('CHECKPOINT');
  }
  return { bestLoss, bestEpoch, badEpochs };
}
export function validateEarlyState(
  state: TrainingState,
  config: EarlyStoppingConfig,
  batches: number,
  horizon: number,
  validateBase: (best: TrainingSnapshot) => void,
) {
  const monitor = state.earlyStopping;
  if (
    !monitor ||
    !Number.isInteger(monitor.anchorEpoch) ||
    monitor.anchorEpoch < 0 ||
    monitor.anchorEpoch > state.epoch ||
    !Array.isArray(monitor.observations) ||
    monitor.observations.length > horizon
  )
    throw new RangeError('CHECKPOINT');
  const replayed = replay(monitor.observations, monitor.anchorEpoch, config, batches, horizon);
  if (
    monitor.bestLoss !== replayed.bestLoss ||
    monitor.badEpochs !== replayed.badEpochs ||
    !!monitor.best !== (replayed.bestLoss !== null)
  )
    throw new RangeError('CHECKPOINT');
  if (monitor.best) {
    if ('earlyStopping' in monitor.best || monitor.best.frozen) throw new RangeError('CHECKPOINT');
    validateBase(monitor.best);
    if (
      monitor.best.epoch !== replayed.bestEpoch ||
      monitor.best.cursor !== 0 ||
      monitor.best.history.at(-1)!.validationLoss !== monitor.bestLoss ||
      hashValue(monitor.best.history.at(-1)) !==
        hashValue(monitor.observations[monitor.best.epoch - monitor.anchorEpoch - 1])
    )
      throw new RangeError('CHECKPOINT');
  }
  if (monitor.reason) {
    if (
      !['patience', 'horizon'].includes(monitor.reason) ||
      monitor.stoppedAt !== monitor.anchorEpoch + monitor.observations.length ||
      !monitor.best ||
      (monitor.reason === 'patience'
        ? monitor.badEpochs < config.patience
        : monitor.stoppedAt !== horizon || monitor.badEpochs >= config.patience) ||
      snapshotHash({ ...cloneSnapshot(state), frozen: false }) !== snapshotHash(monitor.best)
    )
      throw new RangeError('CHECKPOINT');
  } else if (
    monitor.stoppedAt !== undefined ||
    monitor.observations.length !== state.epoch - monitor.anchorEpoch ||
    state.epoch >= horizon ||
    monitor.badEpochs >= config.patience
  )
    throw new RangeError('CHECKPOINT');
  for (const point of monitor.observations.filter((p) => p.epoch <= state.epoch))
    if (hashValue(point) !== hashValue(state.history[point.epoch]))
      throw new RangeError('CHECKPOINT');
  if (monitor.lastReport) {
    const r = monitor.lastReport;
    if (
      !Number.isInteger(r.anchorEpoch) ||
      r.anchorEpoch < 0 ||
      r.anchorEpoch >= r.stoppedAt ||
      r.restoredEpoch !== monitor.anchorEpoch ||
      r.stoppedAt !== r.anchorEpoch + r.observations.length
    )
      throw new RangeError('CHECKPOINT');
    const prior = replay(r.observations, r.anchorEpoch, config, batches, horizon);
    if (
      prior.bestEpoch !== r.restoredEpoch ||
      (r.reason === 'patience'
        ? prior.badEpochs < config.patience
        : r.reason !== 'horizon' || r.stoppedAt !== horizon || prior.badEpochs >= config.patience)
    )
      throw new RangeError('CHECKPOINT');
  }
}

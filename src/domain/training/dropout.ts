import { createRandom, deriveSeed, type RandomSnapshot } from '@/domain/random/seeded';
import type { TrainingConfig, TrainingSnapshot } from './session';
export interface DropoutConfig {
  rate: number;
}
export interface DropoutState {
  rng: RandomSnapshot;
  seenSamples: number;
  lastSampleId?: string;
  masks: number[][];
}
export interface DropoutContext {
  rate: number;
  random: ReturnType<typeof createRandom>;
  masks: number[][];
}
export function validateDropout(config: DropoutConfig, hidden: number[]) {
  if (!Number.isFinite(config.rate) || config.rate < 0 || config.rate > 0.8 || !hidden.length)
    throw new RangeError('INVALID_CONFIG');
}
export function initialDropout(seed: number): DropoutState {
  return { rng: createRandom(seed, 'dropout').snapshot(), seenSamples: 0, masks: [] };
}
export function cloneDropout(state: DropoutState): DropoutState {
  return { ...state, rng: { ...state.rng }, masks: state.masks.map((m) => [...m]) };
}
/** One uniform per hidden unit and sample, including rate zero. No output masking. */
export function dropoutMask(width: number, context: DropoutContext) {
  return Array.from({ length: width }, () => Number(context.random.uniform() >= context.rate));
}
export function validateDropoutState(
  state: TrainingSnapshot,
  config: TrainingConfig,
  trainSize: number,
) {
  const d = state.dropout;
  if (!config.dropout) {
    if (d) throw new RangeError('CHECKPOINT');
    return;
  }
  const width = config.spec.hidden.reduce((sum, n) => sum + n, 0);
  const seen = state.epoch * trainSize + state.cursor;
  const rngState = (draws: number) =>
    (deriveSeed(config.seed, 'dropout') + Math.imul(draws >>> 0, 0x6d2b79f5)) >>> 0;
  if (
    !d ||
    d.seenSamples !== seen ||
    d.rng.spare !== null ||
    d.rng.state !== rngState(seen * width) ||
    d.lastSampleId !== state.lastBatchIds.at(-1)
  )
    throw new RangeError('CHECKPOINT');
  if (!seen) {
    if (d.masks.length) throw new RangeError('CHECKPOINT');
    return;
  }
  const context: DropoutContext = {
    rate: config.dropout.rate,
    random: createRandom(config.seed, 'dropout', {
      state: rngState((seen - 1) * width),
      spare: null,
    }),
    masks: [],
  };
  const masks = config.spec.hidden.map((n) => dropoutMask(n, context));
  if (
    d.masks.length !== masks.length ||
    d.masks.some((m, i) => m.length !== masks[i]!.length || m.some((v, j) => v !== masks[i]![j]))
  )
    throw new RangeError('CHECKPOINT');
}

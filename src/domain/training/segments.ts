import { createNetwork } from '@/domain/network/model';
import { deriveSeed } from '@/domain/random/seeded';
import { createOptimizer, validateOptimizer, type OptimizerConfig } from './optimizer';
import type { TrainingConfig, TrainingState, TrainingInput } from './session';
import { hashValue } from '@/domain/data/integrity';
export interface TrainingSegment {
  id: string;
  atUpdate: number;
  optimizer: OptimizerConfig;
  restart: boolean;
}
const memoryKey = (o: OptimizerConfig) =>
  JSON.stringify([o.kind, o.momentum, o.rho, o.beta1, o.beta2, o.epsilon]);
export function validateSegments(segments: TrainingSegment[], totalUpdates: number) {
  if (
    !Array.isArray(segments) ||
    segments.length < 1 ||
    segments.length > 16 ||
    new Set(segments.map((s) => s.id)).size !== segments.length
  )
    throw new RangeError('SEGMENTS');
  let previous = -1;
  for (const s of segments) {
    if (
      !/^[a-z0-9-]{1,40}$/.test(s.id) ||
      !Number.isInteger(s.atUpdate) ||
      s.atUpdate <= previous ||
      s.atUpdate >= totalUpdates ||
      typeof s.restart !== 'boolean'
    )
      throw new RangeError('SEGMENTS');
    validateOptimizer(s.optimizer);
    previous = s.atUpdate;
  }
}
export function segmentContext(config: TrainingConfig, update: number) {
  let optimizer = config.optimizer,
    resetAt = 0,
    segment: TrainingSegment | undefined,
    reset = false;
  for (const s of config.segments ?? []) {
    if (s.atUpdate > update) break;
    const resets = s.restart || memoryKey(s.optimizer) !== memoryKey(optimizer);
    if (resets) resetAt = s.atUpdate;
    optimizer = s.optimizer;
    segment = s;
    reset = resets && s.atUpdate === update;
  }
  return { optimizer, resetAt, segment, reset };
}
/** Changes are applied transactionally inside the next batch, never to the caller's checkpoint. */
export function applySegment(state: TrainingState, config: TrainingConfig): TrainingState {
  const context = segmentContext(config, state.updates);
  if (!context.reset) return state;
  const model = context.segment!.restart
    ? createNetwork(
        config.spec,
        deriveSeed(config.seed, `restart-${context.segment!.id}`),
        config.initialization,
      )
    : state.model;
  return { ...state, model, optimizer: { ...createOptimizer(model), step: state.updates } };
}
/** Effective-configuration identities remain stable when a later segment is appended. */
export function segmentRecords(
  input: Pick<TrainingInput, 'config' | 'dataHash' | 'splitHash' | 'pipelineHash' | 'classOrder'>,
) {
  const { segments, ...base } = input.config;
  const entries: TrainingSegment[] = [
    { id: 'initial', atUpdate: 0, optimizer: base.optimizer, restart: false },
    ...(segments ?? []),
  ];
  return entries.map((entry) => ({
    ...entry,
    configHash: hashValue({
      config: { ...base, optimizer: entry.optimizer },
      dataHash: input.dataHash,
      splitHash: input.splitHash,
      pipelineHash: input.pipelineHash,
      classOrder: input.classOrder,
      event: { id: entry.id, atUpdate: entry.atUpdate, restart: entry.restart },
    }),
  }));
}

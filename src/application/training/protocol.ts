import type { TrainingInput, TrainingState, Samples } from '@/domain/training/session';
export interface Identity {
  protocolVersion: 1;
  sessionId: string;
  runId: string;
  revision: number;
}
export type TrainingCommand = Identity & { requestId: number } & (
    | { type: 'INIT'; payload: { input: TrainingInput; checkpoint?: TrainingState } }
    | { type: 'RUN' | 'STEP_BATCH' | 'STEP_EPOCH'; payload: { pace: number } }
    | {
        type: 'PAUSE' | 'CANCEL' | 'CHECKPOINT' | 'FREEZE' | 'PING' | 'DISPOSE' | 'CONTINUE_BEST';
        payload: Record<string, never>;
      }
    | { type: 'RECOVERY_ACK'; payload: { update: number } }
    | { type: 'ANALYZE'; payload: { samples: Samples; split: 'train' | 'validation' | 'test' } }
    | { type: 'PREDICT'; payload: { x: number[][]; purpose: 'sample' | 'surface' } }
  );
export type TrainingStatus =
  | 'initializing'
  | 'ready'
  | 'running'
  | 'paused'
  | 'cancelled'
  | 'completed'
  | 'frozen'
  | 'error'
  | 'stopped';
export interface AnalysisResult {
  split: 'train' | 'validation' | 'test';
  predictions: number[][];
  loss: number;
  score: number;
  update: number;
}
export interface TrainingEvent extends Identity {
  sequence: number;
  requestId: number;
  type:
    | 'ACK'
    | 'READY'
    | 'PROGRESS'
    | 'SNAPSHOT'
    | 'PAUSED'
    | 'CANCELLED'
    | 'COMPLETED'
    | 'FROZEN'
    | 'RECOVERY_CHECKPOINT'
    | 'CHECKPOINT_READY'
    | 'ANALYSIS_RESULT'
    | 'PREDICTION_RESULT'
    | 'ERROR';
  status: TrainingStatus;
  epoch: number;
  update: number;
  batchIndex: number;
  cursor: number;
  maxSliceMs: number;
  state?: TrainingState;
  analysis?: AnalysisResult;
  inference?: { predictions: number[][]; purpose: 'sample' | 'surface'; update: number };
  code?: string;
}
export function validIdentity(
  value: unknown,
): value is Identity & { requestId: number; type: string; payload: Record<string, unknown> } {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    v.protocolVersion === 1 &&
    typeof v.sessionId === 'string' &&
    /^[\w-]{1,64}$/.test(v.sessionId) &&
    typeof v.runId === 'string' &&
    /^[\w-]{1,64}$/.test(v.runId) &&
    Number.isSafeInteger(v.revision) &&
    Number(v.revision) > 0 &&
    Number.isSafeInteger(v.requestId) &&
    Number(v.requestId) > 0 &&
    typeof v.type === 'string' &&
    !!v.payload &&
    typeof v.payload === 'object'
  );
}
export function sameIdentity(a: Identity, b: Identity) {
  return (
    a.protocolVersion === b.protocolVersion &&
    a.sessionId === b.sessionId &&
    a.runId === b.runId &&
    a.revision === b.revision
  );
}

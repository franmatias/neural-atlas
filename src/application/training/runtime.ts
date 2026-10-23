import {
  initialSession,
  advanceBatch,
  cloneState,
  validateCheckpoint,
  validateTraining,
  validateSamples,
  evaluateChunks,
  type TrainingInput,
  type TrainingState,
} from '@/domain/training/session';
import {
  validIdentity,
  sameIdentity,
  type Identity,
  type TrainingCommand,
  type TrainingEvent,
  type TrainingStatus,
} from './protocol';
import { forwardChunks } from '@/domain/training/kernel';
import type { Network } from '@/domain/network/model';
export interface RuntimePort {
  now: () => number;
  schedule: (callback: () => void, delay: number) => void;
  send: (event: TrainingEvent) => void;
}
export class TrainingRuntime {
  private identity?: Identity;
  private input?: TrainingInput;
  private state?: TrainingState;
  private sequence = 0;
  private request = 0;
  private requestSeen = 0;
  private status: TrainingStatus = 'initializing';
  private task?: { iterator: Generator<void, unknown>; complete: (result: unknown) => void };
  private mode: 'run' | 'batch' | 'epoch' = 'run';
  private pace = 0;
  private nextUpdate = 0;
  private targetEpoch = 0;
  private awaitingAck = false;
  private checkpointUpdate = -1;
  private checkpointAt = 0;
  private progressAt = -Infinity;
  private maxSliceMs = 0;
  private scheduled = false;
  private disposed = false;
  constructor(private readonly port: RuntimePort) {}
  private emit(type: TrainingEvent['type'], extra: Partial<TrainingEvent> = {}) {
    if (!this.identity || this.disposed) return;
    this.port.send({
      ...this.identity,
      sequence: ++this.sequence,
      requestId: this.request,
      type,
      status: this.status,
      epoch: this.state?.epoch ?? 0,
      update: this.state?.updates ?? 0,
      batchIndex: this.state?.batchIndex ?? 0,
      cursor: this.state?.cursor ?? 0,
      maxSliceMs: this.maxSliceMs,
      ...extra,
    });
  }
  private checkpoint(type: 'RECOVERY_CHECKPOINT' | 'CHECKPOINT_READY' = 'RECOVERY_CHECKPOINT') {
    if (!this.state) return;
    this.checkpointAt = this.port.now();
    this.awaitingAck = true;
    this.checkpointUpdate = this.state.updates;
    this.emit(type, { state: cloneState(this.state) });
  }
  private schedule(delay = 0) {
    if (this.scheduled || this.disposed) return;
    this.scheduled = true;
    this.port.schedule(() => {
      this.scheduled = false;
      this.pump();
    }, delay);
  }
  private begin(iterator: Generator<void, unknown>, complete: (result: unknown) => void) {
    this.task = { iterator, complete };
    this.schedule();
  }
  private stable(type: 'PAUSED' | 'CANCELLED') {
    this.task = undefined;
    this.status = type === 'PAUSED' ? 'paused' : 'cancelled';
    this.emit(type, this.state ? { state: cloneState(this.state) } : {});
    this.checkpoint();
  }
  receive(raw: unknown) {
    if (!validIdentity(raw)) {
      if (this.identity) this.emit('ERROR', { code: 'PROTOCOL_MISMATCH' });
      return;
    }
    const command = raw as TrainingCommand;
    if (command.type === 'INIT') {
      if (this.identity) {
        this.emit('ERROR', { code: 'INVALID_CONFIG' });
        return;
      }
      this.identity = {
        protocolVersion: 1,
        sessionId: command.sessionId,
        runId: command.runId,
        revision: command.revision,
      };
      this.request = command.requestId;
      this.requestSeen = command.requestId;
      try {
        this.input = command.payload.input;
        validateTraining(this.input);
        this.emit('ACK');
        const resume = command.payload.checkpoint;
        if (resume) {
          validateCheckpoint(resume, this.input);
          this.state = cloneState(resume);
          this.checkpoint();
        } else
          this.begin(initialSession(this.input), (result) => {
            this.state = result as TrainingState;
            this.checkpoint();
          });
      } catch {
        this.status = 'error';
        this.emit('ERROR', { code: 'INVALID_DATA' });
      }
      return;
    }
    if (
      !this.identity ||
      !sameIdentity(this.identity, command) ||
      command.requestId <= this.requestSeen
    )
      return;
    this.request = command.requestId;
    this.requestSeen = command.requestId;
    this.emit('ACK');
    if (command.type === 'DISPOSE') {
      this.disposed = true;
      this.task = undefined;
      return;
    }
    if (command.type === 'PING') return;
    if (command.type === 'RECOVERY_ACK') {
      if (this.state && this.awaitingAck && command.payload.update === this.checkpointUpdate) {
        this.awaitingAck = false;
        if (this.status === 'initializing') {
          this.status = this.state.frozen ? 'frozen' : 'ready';
          this.emit('READY', { state: cloneState(this.state) });
        }
      }
      return;
    }
    if (command.type === 'PAUSE' || command.type === 'CANCEL') {
      if (this.state?.frozen) {
        this.emit('ERROR', { code: 'INVALID_STATE' });
        return;
      }
      this.stable(command.type === 'PAUSE' ? 'PAUSED' : 'CANCELLED');
      return;
    }
    if (!this.state || !this.input || this.status === 'initializing') {
      this.emit('ERROR', { code: 'NOT_READY' });
      return;
    }
    if (command.type === 'CHECKPOINT') {
      this.checkpoint('CHECKPOINT_READY');
      return;
    }
    if (command.type === 'FREEZE') {
      if (this.status === 'running' || this.task) {
        this.emit('ERROR', { code: 'BUSY' });
        return;
      }
      this.status = 'frozen';
      this.state = { ...this.state, frozen: true };
      this.emit('FROZEN', { state: cloneState(this.state) });
      this.checkpoint();
      return;
    }
    if (command.type === 'ANALYZE') {
      if (
        this.task ||
        this.status === 'running' ||
        !['train', 'validation', 'test'].includes(command.payload.split) ||
        (command.payload.split === 'test' && !this.state.frozen)
      ) {
        this.emit('ERROR', { code: 'TEST_LOCKED' });
        return;
      }
      try {
        validateSamples(command.payload.samples, this.input.config);
        const update = this.state.updates;
        this.begin(
          evaluateChunks(this.state.model, command.payload.samples, this.input.config.loss),
          (result) => {
            const r = result as { loss: number; score: number; predictions: number[][] };
            this.emit('ANALYSIS_RESULT', {
              analysis: { ...r, split: command.payload.split, update },
            });
          },
        );
      } catch {
        this.emit('ERROR', { code: 'INVALID_DATA' });
      }
      return;
    }
    if (command.type === 'PREDICT') {
      if (this.task || this.status === 'running') {
        this.emit('ERROR', { code: 'BUSY' });
        return;
      }
      const { x, purpose } = command.payload;
      if (
        !Array.isArray(x) ||
        !x.length ||
        x.length > 400 ||
        !['sample', 'surface'].includes(purpose) ||
        x.some(
          (row) =>
            !Array.isArray(row) ||
            row.length !== this.state!.model.spec.inputs ||
            row.some((value) => !Number.isFinite(value)),
        )
      ) {
        this.emit('ERROR', { code: 'INVALID_DATA' });
        return;
      }
      const update = this.state.updates;
      this.begin(inferChunks(this.state.model, x), (result) =>
        this.emit('PREDICTION_RESULT', {
          inference: { predictions: result as number[][], purpose, update },
        }),
      );
      return;
    }
    if (!['RUN', 'STEP_BATCH', 'STEP_EPOCH'].includes(command.type)) {
      this.emit('ERROR', { code: 'INVALID_CONFIG' });
      return;
    }
    if (
      this.status === 'running' ||
      this.task ||
      this.state.frozen ||
      this.state.epoch >= this.input.config.epochs
    ) {
      this.emit('ERROR', { code: 'INVALID_STATE' });
      return;
    }
    const pace = (command.payload as { pace: number }).pace;
    if (!Number.isInteger(pace) || pace < 0 || pace > 60) {
      this.emit('ERROR', { code: 'INVALID_CONFIG' });
      return;
    }
    this.pace = pace;
    this.mode = command.type === 'RUN' ? 'run' : command.type === 'STEP_BATCH' ? 'batch' : 'epoch';
    this.targetEpoch = this.state.epoch + 1;
    this.status = 'running';
    this.nextUpdate = this.port.now();
    this.startBatch();
  }
  private startBatch() {
    if (!this.state || !this.input) return;
    const previousEpoch = this.state.epoch;
    this.begin(advanceBatch(this.state, this.input), (result) => {
      this.state = result as TrainingState;
      const ended = this.state.epoch !== previousEpoch;
      if (ended) this.emit('SNAPSHOT', { state: cloneState(this.state) });
      if (!this.awaitingAck && (ended || this.port.now() - this.checkpointAt >= 2000))
        this.checkpoint();
      if (this.state.epoch >= this.input!.config.epochs) {
        this.status = 'completed';
        this.emit('COMPLETED', { state: cloneState(this.state) });
        this.checkpoint();
      } else if (
        this.mode === 'batch' ||
        (this.mode === 'epoch' && this.state.epoch >= this.targetEpoch)
      )
        this.stable('PAUSED');
      else {
        this.nextUpdate = this.port.now() + (this.pace ? 1000 / this.pace : 0);
        this.schedule(Math.max(0, this.nextUpdate - this.port.now()));
      }
    });
  }
  private pump() {
    if (this.disposed) return;
    if (!this.task) {
      if (this.status === 'running') {
        if (this.port.now() < this.nextUpdate) {
          this.schedule(this.nextUpdate - this.port.now());
          return;
        }
        this.startBatch();
      }
      return;
    }
    const started = this.port.now();
    try {
      let done = false;
      for (let i = 0; i < 2048 && this.port.now() - started < 8; i++) {
        const task = this.task;
        const result = task.iterator.next();
        if (result.done) {
          this.task = undefined;
          task.complete(result.value);
          done = true;
          break;
        }
      }
      this.maxSliceMs = Math.max(this.maxSliceMs, this.port.now() - started);
      if (this.status === 'running' && this.port.now() - this.progressAt >= 100) {
        this.progressAt = this.port.now();
        this.emit('PROGRESS');
      }
      if (!done && this.task) this.schedule();
    } catch (error) {
      this.task = undefined;
      this.status = this.state ? 'paused' : 'error';
      this.emit('ERROR', {
        code:
          error instanceof Error && error.message === 'NON_FINITE'
            ? 'NON_FINITE'
            : 'INTERNAL_ERROR',
        ...(this.state ? { state: cloneState(this.state) } : {}),
      });
      this.checkpoint();
    }
  }
}
function* inferChunks(model: Network, inputs: number[][]): Generator<void, number[][]> {
  const predictions: number[][] = [];
  for (const input of inputs) {
    const cache = yield* forwardChunks(model, input);
    predictions.push([...cache.activations.at(-1)!]);
    yield;
  }
  return predictions;
}

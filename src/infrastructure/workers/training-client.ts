import {
  cloneState,
  validateCheckpoint,
  validateTraining,
  type TrainingInput,
  type TrainingState,
} from '@/domain/training/session';
import {
  sameIdentity,
  type Identity,
  type TrainingCommand,
  type TrainingEvent,
} from '@/application/training/protocol';
export interface TrainingWorkerPort {
  postMessage: (command: TrainingCommand) => void;
  terminate: () => void;
  onmessage: ((event: MessageEvent<TrainingEvent>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}
type Action = TrainingCommand extends infer Command
  ? Command extends TrainingCommand
    ? Omit<Command, keyof Identity | 'requestId'>
    : never
  : never;
const eventTypes = [
  'ACK',
  'READY',
  'PROGRESS',
  'SNAPSHOT',
  'PAUSED',
  'CANCELLED',
  'COMPLETED',
  'FROZEN',
  'RECOVERY_CHECKPOINT',
  'CHECKPOINT_READY',
  'ANALYSIS_RESULT',
  'PREDICTION_RESULT',
  'ERROR',
];
/** Keeps two validated checkpoints in RAM; restoring never resumes training automatically. */
export class TrainingClient {
  private worker?: TrainingWorkerPort;
  private input?: TrainingInput;
  private identity: Identity = {
    protocolVersion: 1,
    sessionId: crypto.randomUUID(),
    runId: crypto.randomUUID(),
    revision: 0,
  };
  private request = 0;
  private sequence = 0;
  private heartbeat = 0;
  private updates = 0;
  private checkpoints: TrainingState[] = [];
  private timer?: ReturnType<typeof setInterval>;
  private recovering = false;
  private frozen = false;
  constructor(
    private readonly receive: (event: TrainingEvent) => void,
    private readonly fault: (code: string, lostUpdates: number) => void,
    private readonly factory: () => TrainingWorkerPort = () =>
      new Worker(new URL('./training.worker.ts', import.meta.url), { type: 'module' }),
  ) {}
  start(input: TrainingInput, checkpoint?: TrainingState) {
    validateTraining(input);
    if (checkpoint) validateCheckpoint(checkpoint, input);
    this.dispose();
    this.input = structuredClone(input);
    this.identity = { ...this.identity, runId: crypto.randomUUID() };
    this.checkpoints = checkpoint ? [cloneState(checkpoint)] : [];
    this.updates = checkpoint?.updates ?? 0;
    this.frozen = checkpoint?.frozen ?? false;
    this.boot(checkpoint);
    this.timer = setInterval(() => {
      if (document.hidden) {
        this.heartbeat = performance.now();
        return;
      }
      if (performance.now() - this.heartbeat > 2000) this.recover();
      else this.send({ type: 'PING', payload: {} });
    }, 500);
  }
  private boot(checkpoint?: TrainingState) {
    if (!this.input) return;
    this.worker?.terminate();
    this.identity = { ...this.identity, revision: this.identity.revision + 1 };
    this.sequence = 0;
    this.request = 0;
    this.heartbeat = performance.now();
    this.worker = this.factory();
    this.worker.onmessage = ({ data }) => this.accept(data);
    this.worker.onerror = () => this.recover();
    this.send({
      type: 'INIT',
      payload: { input: this.input, ...(checkpoint ? { checkpoint } : {}) },
    });
  }
  send(action: Action) {
    this.worker?.postMessage({
      ...this.identity,
      requestId: ++this.request,
      ...action,
    } as TrainingCommand);
  }
  private accept(event: TrainingEvent) {
    if (
      !this.worker ||
      !this.input ||
      !event ||
      !sameIdentity(this.identity, event) ||
      !Number.isSafeInteger(event.sequence) ||
      event.sequence <= this.sequence ||
      !eventTypes.includes(event.type)
    )
      return;
    this.sequence = event.sequence;
    this.heartbeat = performance.now();
    if (Number.isSafeInteger(event.update) && event.update >= 0)
      this.updates = event.state?.earlyStopping?.reason
        ? event.update
        : Math.max(this.updates, event.update);
    try {
      if (event.state) validateCheckpoint(event.state, this.input!);
      if (event.state?.frozen) this.frozen = true;
      if (event.type === 'RECOVERY_CHECKPOINT' || event.type === 'CHECKPOINT_READY') {
        if (!event.state) throw new Error('CHECKPOINT');
        this.checkpoints = [...this.checkpoints.slice(-1), cloneState(event.state)];
        this.send({ type: 'RECOVERY_ACK', payload: { update: event.state.updates } });
      }
      this.receive(event);
    } catch {
      this.fault('CHECKPOINT_REJECTED', 0);
    }
  }
  private recover() {
    if (this.recovering || !this.worker) return;
    this.recovering = true;
    this.worker.terminate();
    this.worker = undefined;
    const checkpoint = this.checkpoints.at(-1);
    const lost = this.updates - (checkpoint?.updates ?? 0);
    this.fault(checkpoint ? 'RECOVERED' : 'NO_CHECKPOINT', lost);
    if (checkpoint) {
      this.updates = checkpoint.updates;
      try {
        this.boot({ ...cloneState(checkpoint), frozen: this.frozen || checkpoint.frozen });
      } catch {
        if (this.timer) clearInterval(this.timer);
        this.fault('WORKER_UNAVAILABLE', lost);
      }
    } else if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.recovering = false;
  }
  dispose() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.worker?.terminate();
    this.worker = undefined;
    this.input = undefined;
    this.checkpoints = [];
  }
}

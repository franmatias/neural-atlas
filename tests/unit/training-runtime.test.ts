import { describe, expect, it, vi, afterEach } from 'vitest';
import { trainingFixture } from '../fixtures/training';
import { TrainingRuntime } from '@/application/training/runtime';
import {
  sameIdentity,
  validIdentity,
  type TrainingCommand,
  type TrainingEvent,
} from '@/application/training/protocol';
import { TrainingClient, type TrainingWorkerPort } from '@/infrastructure/workers/training-client';
import {
  cloneState,
  initialSession,
  validateCheckpoint,
  type TrainingInput,
} from '@/domain/training/session';
import { exhaust } from '@/domain/training/kernel';
import { trainingSource } from '@/application/training/source';
function harness(input = trainingFixture().input) {
  let time = 0,
    request = 0;
  const events: TrainingEvent[] = [],
    tasks: (() => void)[] = [];
  const identity = { protocolVersion: 1 as const, sessionId: 'session', runId: 'run', revision: 1 };
  const runtime = new TrainingRuntime({
    now: () => {
      time += 0.05;
      return time;
    },
    schedule: (callback, delay) =>
      tasks.push(() => {
        time += delay;
        callback();
      }),
    send: (event) => events.push(structuredClone(event)),
  });
  function send(action: Record<string, unknown>) {
    runtime.receive({ ...identity, requestId: ++request, ...action });
  }
  function drain(stop: () => boolean = () => false) {
    let iterations = 0;
    while (tasks.length && !stop()) {
      if (++iterations > 100000) throw Error('scheduler did not yield');
      tasks.shift()!();
    }
  }
  send({ type: 'INIT', payload: { input } });
  drain();
  const checkpoint = events.find((e) => e.type === 'RECOVERY_CHECKPOINT')?.state;
  return { runtime, events, tasks, send, drain, identity, checkpoint, input };
}
describe('protocolo y ejecución cooperativa', () => {
  it('requiere checkpoint cero confirmado, rechaza identidades y controla pasos', () => {
    const h = harness();
    expect(h.events.at(-1)?.type).toBe('RECOVERY_CHECKPOINT');
    h.send({ type: 'RUN', payload: { pace: 0 } });
    expect(h.events.at(-1)?.code).toBe('NOT_READY');
    h.send({ type: 'RECOVERY_ACK', payload: { update: -1 } });
    expect(h.events.some((e) => e.type === 'READY')).toBe(false);
    h.send({ type: 'RECOVERY_ACK', payload: { update: 0 } });
    expect(h.events.at(-1)?.type).toBe('READY');
    const length = h.events.length;
    h.runtime.receive({ ...h.identity, revision: 2, requestId: 999, type: 'CANCEL', payload: {} });
    expect(h.events).toHaveLength(length);
    h.runtime.receive({ ...h.identity, requestId: 1, type: 'CANCEL', payload: {} });
    expect(h.events).toHaveLength(length);
    h.runtime.receive({});
    expect(h.events.at(-1)?.code).toBe('PROTOCOL_MISMATCH');
    h.send({ type: 'STEP_BATCH', payload: { pace: 0 } });
    h.drain();
    const batch = h.events
      .slice()
      .reverse()
      .find((e) => e.type === 'PAUSED')!.state!;
    expect(batch.updates).toBe(1);
    expect(batch.cursor).toBe(8);
    validateCheckpoint(batch, h.input);
    h.send({ type: 'RECOVERY_ACK', payload: { update: 1 } });
    h.send({ type: 'STEP_EPOCH', payload: { pace: 0 } });
    h.drain();
    const epoch = h.events
      .slice()
      .reverse()
      .find((e) => e.type === 'PAUSED')!.state!;
    expect(epoch.epoch).toBe(1);
    expect(epoch.cursor).toBe(0);
    expect(h.events.every((e) => e.maxSliceMs < 8.2)).toBe(true);
    h.send({ type: 'CHECKPOINT', payload: {} });
    expect(h.events.at(-1)?.type).toBe('CHECKPOINT_READY');
    h.send({ type: 'CANCEL', payload: {} });
    expect(
      h.events
        .slice()
        .reverse()
        .find((e) => e.type === 'CANCELLED')?.state?.updates,
    ).toBe(epoch.updates);
    h.send({ type: 'DISPOSE', payload: {} });
    const disposed = h.events.length;
    h.send({ type: 'PING', payload: {} });
    h.drain();
    expect(h.events).toHaveLength(disposed);
  });
  it('termina todas las épocas y conserva test bloqueado hasta congelar, incluso al restaurar', () => {
    const h = harness();
    h.send({ type: 'RECOVERY_ACK', payload: { update: 0 } });
    h.send({ type: 'ANALYZE', payload: { samples: trainingFixture().test, split: 'test' } });
    expect(h.events.at(-1)?.code).toBe('TEST_LOCKED');
    h.send({ type: 'RUN', payload: { pace: 60 } });
    h.send({ type: 'FREEZE', payload: {} });
    expect(h.events.at(-1)?.code).toBe('BUSY');
    h.send({ type: 'RUN', payload: { pace: 0 } });
    expect(h.events.at(-1)?.code).toBe('INVALID_STATE');
    h.drain();
    expect(h.events.some((e) => e.type === 'COMPLETED')).toBe(true);
    h.send({ type: 'ANALYZE', payload: { samples: h.input.validation, split: 'validation' } });
    h.drain();
    expect(h.events.at(-1)?.analysis?.predictions).toHaveLength(h.input.validation.ids.length);
    h.send({ type: 'FREEZE', payload: {} });
    const frozen = h.events.at(-1)!.state!;
    expect(frozen.frozen).toBe(true);
    h.send({ type: 'CANCEL', payload: {} });
    expect(h.events.at(-1)?.code).toBe('INVALID_STATE');
    h.send({ type: 'RUN', payload: { pace: 0 } });
    expect(h.events.at(-1)?.code).toBe('INVALID_STATE');
    h.send({ type: 'ANALYZE', payload: { samples: trainingFixture().test, split: 'test' } });
    h.drain();
    expect(h.events.at(-1)?.analysis?.split).toBe('test');
    const events: TrainingEvent[] = [];
    const runtime = new TrainingRuntime({
      now: () => 0,
      schedule: () => {},
      send: (event) => events.push(event),
    });
    runtime.receive({
      ...h.identity,
      requestId: 1,
      type: 'INIT',
      payload: { input: h.input, checkpoint: frozen },
    });
    runtime.receive({
      ...h.identity,
      requestId: 2,
      type: 'RECOVERY_ACK',
      payload: { update: frozen.updates },
    });
    expect(events.at(-1)?.status).toBe('frozen');
  });
  it('predice sin target, pausa descarta el candidato e informa de peticiones inválidas', () => {
    const h = harness();
    h.send({ type: 'RECOVERY_ACK', payload: { update: 0 } });
    h.send({ type: 'PREDICT', payload: { x: [h.input.train.x[0]], purpose: 'sample' } });
    h.drain();
    expect(h.events.at(-1)?.inference?.predictions[0]).toHaveLength(1);
    h.send({ type: 'PREDICT', payload: { x: [[]], purpose: 'sample' } });
    expect(h.events.at(-1)?.code).toBe('INVALID_DATA');
    h.send({ type: 'ANALYZE', payload: { samples: {}, split: 'validation' } });
    expect(h.events.at(-1)?.code).toBe('INVALID_DATA');
    h.send({ type: 'RUN', payload: { pace: -1 } });
    expect(h.events.at(-1)?.code).toBe('INVALID_CONFIG');
    h.send({ type: 'UNKNOWN', payload: {} });
    expect(h.events.at(-1)?.code).toBe('INVALID_CONFIG');
    h.send({ type: 'RUN', payload: { pace: 0 } });
    h.tasks.shift()!();
    h.send({ type: 'PAUSE', payload: {} });
    h.drain();
    const paused = h.events
      .slice()
      .reverse()
      .find((e) => e.type === 'PAUSED')!.state!;
    validateCheckpoint(paused, h.input);
    expect(paused.optimizer.step).toBe(paused.updates);
    const updates = paused.updates;
    h.send({ type: 'RUN', payload: { pace: 1 } });
    h.send({ type: 'CANCEL', payload: {} });
    h.drain();
    expect(
      h.events
        .slice()
        .reverse()
        .find((e) => e.type === 'CANCELLED')!.state!.updates,
    ).toBe(updates);
  });
  it('validación del contrato y del puente no admite fuga o preprocesamiento ajeno', () => {
    expect(validIdentity(null)).toBe(false);
    expect(validIdentity({})).toBe(false);
    expect(
      sameIdentity(
        { protocolVersion: 1, sessionId: 'a', runId: 'b', revision: 1 },
        { protocolVersion: 1, sessionId: 'a', runId: 'c', revision: 1 },
      ),
    ).toBe(false);
    const fixture = trainingFixture();
    expect('test' in fixture.input).toBe(false);
    expect(
      fixture.test.ids.some(
        (id) => fixture.input.train.ids.includes(id) || fixture.input.validation.ids.includes(id),
      ),
    ).toBe(false);
    expect(() =>
      trainingSource(
        fixture.dataset,
        fixture.split,
        {
          ...fixture.prepared,
          pipeline: { ...fixture.prepared.pipeline, fittedOn: { split: 'train', idsHash: 'bad' } },
        },
        fixture.config,
      ),
    ).toThrow('PIPELINE');
    expect(() =>
      trainingSource(
        fixture.dataset,
        fixture.split,
        { ...fixture.prepared, matrix: [] },
        fixture.config,
      ),
    ).toThrow('PIPELINE');
    const m = structuredClone(fixture.prepared);
    m.matrix[0] = [];
    expect(() => trainingSource(fixture.dataset, fixture.split, m, fixture.config)).toThrow(
      'INVALID_DATA',
    );
    const events: TrainingEvent[] = [];
    const runtime = new TrainingRuntime({
      now: () => 0,
      schedule: () => {},
      send: (e) => events.push(e),
    });
    runtime.receive({
      protocolVersion: 1,
      sessionId: 'a',
      runId: 'b',
      revision: 1,
      requestId: 1,
      type: 'INIT',
      payload: {},
    });
    expect(events.at(-1)?.code).toBe('INVALID_DATA');
  });
});
class FakeWorker implements TrainingWorkerPort {
  onmessage: TrainingWorkerPort['onmessage'] = null;
  onerror: TrainingWorkerPort['onerror'] = null;
  sent: TrainingCommand[] = [];
  terminated = false;
  postMessage(command: TrainingCommand) {
    this.sent.push(command);
  }
  terminate() {
    this.terminated = true;
  }
  reply(extra: Partial<TrainingEvent>) {
    const identity = this.sent[0]!;
    this.onmessage?.({
      data: {
        protocolVersion: 1,
        sessionId: identity.sessionId,
        runId: identity.runId,
        revision: identity.revision,
        sequence: 1,
        requestId: 1,
        type: 'ACK',
        status: 'initializing',
        epoch: 0,
        update: 0,
        batchIndex: 0,
        cursor: 0,
        maxSliceMs: 0,
        ...extra,
      },
    } as MessageEvent<TrainingEvent>);
  }
}
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
describe('controlador de recuperación', () => {
  function clientFixture(input: TrainingInput = trainingFixture().input) {
    vi.useFakeTimers();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    const workers: FakeWorker[] = [],
      received: TrainingEvent[] = [],
      faults: { code: string; lost: number }[] = [];
    const client = new TrainingClient(
      (e) => received.push(e),
      (code, lost) => faults.push({ code, lost }),
      () => {
        const w = new FakeWorker();
        workers.push(w);
        return w;
      },
    );
    client.start(input);
    return { client, workers, received, faults, input, state: exhaust(initialSession(input)) };
  }
  it('confirma solo copias válidas y filtra mensajes viejos o repetidos', () => {
    const f = clientFixture();
    f.workers[0]!.reply({ type: 'RECOVERY_CHECKPOINT', state: f.state });
    expect(f.workers[0]!.sent.at(-1)?.type).toBe('RECOVERY_ACK');
    expect(f.received).toHaveLength(1);
    f.workers[0]!.reply({ type: 'READY', state: f.state });
    expect(f.received).toHaveLength(1);
    f.workers[0]!.reply({ sequence: 2, revision: 999 });
    expect(f.received).toHaveLength(1);
    f.workers[0]!.reply({
      sequence: 3,
      type: 'RECOVERY_CHECKPOINT',
      state: { ...f.state, cursor: 1 },
    });
    expect(f.faults.at(-1)?.code).toBe('CHECKPOINT_REJECTED');
    f.workers[0]!.reply({ sequence: 4, type: 'CHECKPOINT_READY' });
    expect(f.faults.at(-1)?.code).toBe('CHECKPOINT_REJECTED');
    f.client.dispose();
    f.workers[0]!.reply({ sequence: 5 });
    expect(f.received).toHaveLength(1);
  });
  it('watchdog restaura automáticamente sin volver a entrenar ni desbloquear test', async () => {
    const f = clientFixture();
    f.workers[0]!.reply({ type: 'RECOVERY_CHECKPOINT', state: f.state });
    f.workers[0]!.reply({
      sequence: 2,
      type: 'FROZEN',
      status: 'frozen',
      state: { ...cloneState(f.state), frozen: true },
    });
    f.workers[0]!.reply({ sequence: 3, type: 'PROGRESS', update: 3 });
    await vi.advanceTimersByTimeAsync(2500);
    expect(f.workers).toHaveLength(2);
    expect(f.workers[0]!.terminated).toBe(true);
    expect(f.faults).toContainEqual({ code: 'RECOVERED', lost: 3 });
    const init = f.workers[1]!.sent[0]!;
    expect(init.type).toBe('INIT');
    if (init.type === 'INIT') expect(init.payload.checkpoint?.frozen).toBe(true);
    expect(f.workers[1]!.sent.some((c) => c.type === 'RUN')).toBe(false);
    f.workers[0]!.reply({ sequence: 100, type: 'ERROR', code: 'old' });
    expect(f.received.some((e) => e.code === 'old')).toBe(false);
    f.client.dispose();
  });
  it('sin checkpoint termina limpiamente; ocultar la pestaña no simula una avería', async () => {
    const f = clientFixture();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    await vi.advanceTimersByTimeAsync(3000);
    expect(f.faults).toEqual([]);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    await vi.advanceTimersByTimeAsync(2500);
    expect(f.faults).toContainEqual({ code: 'NO_CHECKPOINT', lost: 0 });
    expect(f.workers[0]!.terminated).toBe(true);
    f.client.dispose();
  });
  it('un error del Worker utiliza la copia validada', () => {
    const f = clientFixture();
    f.workers[0]!.reply({ type: 'RECOVERY_CHECKPOINT', state: f.state });
    f.workers[0]!.onerror?.({} as ErrorEvent);
    expect(f.workers).toHaveLength(2);
    f.client.dispose();
  });
});

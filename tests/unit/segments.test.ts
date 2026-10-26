import { expect, it } from 'vitest';
import { trainingFixture } from '../fixtures/training';
import {
  initialSession,
  advanceBatch,
  validateCheckpoint,
  validateTraining,
} from '@/domain/training/session';
import { exhaust } from '@/domain/training/kernel';
import { createOptimizer, defaultOptimizer } from '@/domain/training/optimizer';
import { applySegment, segmentContext, segmentRecords } from '@/domain/training/segments';
import {
  captureExperiment,
  exportExperiment,
  importExperiment,
  prepareExperiment,
} from '@/application/training/experiment';
it.each(['moons', 'flowers', 'sine'] as const)(
  'segmentos %s: LR conserva momentos, cambio/reinicio los borra y roundtrip continúa exactamente',
  (recipe) => {
    const f = trainingFixture(recipe);
    f.input.config.segments = [
      { id: 'rate', atUpdate: 2, optimizer: { ...defaultOptimizer, rate: 0.02 }, restart: false },
      {
        id: 'kind',
        atUpdate: 5,
        optimizer: { ...defaultOptimizer, kind: 'momentum' },
        restart: false,
      },
      { id: 'restart', atUpdate: 8, optimizer: { ...defaultOptimizer }, restart: true },
    ];
    let state = exhaust(initialSession(f.input));
    while (state.updates < 2) state = exhaust(advanceBatch(state, f.input));
    expect(applySegment(state, f.input.config)).toBe(state);
    expect(segmentContext(f.input.config, 2).resetAt).toBe(0);
    while (state.updates < 5) state = exhaust(advanceBatch(state, f.input));
    const switched = applySegment(state, f.input.config);
    expect(switched.optimizer.first.every((v) => v.every((x) => x === 0))).toBe(true);
    expect(switched.optimizer.step).toBe(5);
    expect(switched.model).toBe(state.model);
    while (state.updates < 8) state = exhaust(advanceBatch(state, f.input));
    const restarted = applySegment(state, f.input.config);
    expect(restarted.model).not.toEqual(state.model);
    expect(restarted.optimizer.first).toEqual(createOptimizer(restarted.model).first);
    const file = captureExperiment(
      f.dataset,
      f.split,
      f.prepared.pipeline.options,
      f.input.pipelineHash,
      f.input.config,
      state,
      0.5,
      1,
      false,
    );
    expect(file.schemaVersion).toBe(9);
    const corrupted = structuredClone(file);
    corrupted.timeline![1]!.configHash = '0'.repeat(64);
    expect(() => prepareExperiment(corrupted)).toThrow('EXPERIMENT_SEGMENTS');
    const copy = importExperiment(exportExperiment(file)),
      restored = prepareExperiment(copy);
    const next = exhaust(advanceBatch(state, f.input)),
      recovered = exhaust(advanceBatch(copy.checkpoint, restored.source.input));
    expect(recovered).toEqual(next);
    const m = next.optimizer.first[0]![0]!,
      v = next.optimizer.second[0]![0]!;
    const expected =
      restarted.model.layers[0]!.weights[0]! -
      (defaultOptimizer.rate * (m / (1 - defaultOptimizer.beta1))) /
        (Math.sqrt(v / (1 - defaultOptimizer.beta2)) + defaultOptimizer.epsilon);
    expect(next.model.layers[0]!.weights[0]).toBeCloseTo(expected, 14);
    validateCheckpoint(next, f.input);
  },
);
it('segmentos con BN/dropout preservan cursor, RNG e invariantes después del reinicio', () => {
  const f = trainingFixture();
  f.input.config.spec.batchNormalization = true;
  f.input.config.dropout = { rate: 0.3 };
  f.input.config.segments = [
    { id: 'reset', atUpdate: 1, optimizer: { ...defaultOptimizer }, restart: true },
  ];
  let state = exhaust(initialSession(f.input));
  for (let i = 0; i < 8; i++) {
    state = exhaust(advanceBatch(state, f.input));
    validateCheckpoint(state, f.input);
  }
  expect(state.updates).toBe(8);
  expect(state.optimizer.step).toBe(8);
});
it('las identidades de los tramos anteriores no cambian al añadir uno posterior', () => {
  const f = trainingFixture();
  f.input.config.segments = [
    { id: 'first', atUpdate: 1, optimizer: { ...defaultOptimizer, rate: 0.02 }, restart: false },
  ];
  const before = segmentRecords(f.input);
  f.input.config.segments.push({
    id: 'later',
    atUpdate: 3,
    optimizer: { ...defaultOptimizer, kind: 'sgd' },
    restart: true,
  });
  expect(segmentRecords(f.input).slice(0, 2)).toEqual(before);
});
it('rechaza segmentos fuera del horizonte, desordenados, duplicados y parada temprana', () => {
  const f = trainingFixture(),
    s = { id: 's', atUpdate: 1, optimizer: { ...defaultOptimizer }, restart: false };
  for (const segments of [
    [],
    [s, s],
    [{ ...s, atUpdate: -1 }],
    [{ ...s, atUpdate: 1e8 }],
    [{ ...s, id: 'bad!' }],
    [{ ...s, id: 'initial' }],
  ]) {
    f.input.config.segments = segments;
    expect(() => validateTraining(f.input)).toThrow();
  }
  f.input.config.segments = [s];
  f.input.config.earlyStopping = { patience: 5, minDelta: 0 };
  expect(() => validateTraining(f.input)).toThrow('SEGMENTS_EARLY_STOPPING');
});

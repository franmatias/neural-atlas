import { describe, expect, it } from 'vitest';
import { trainingFixture } from '../fixtures/training';
import { exhaust } from '@/domain/training/kernel';
import {
  initialSession,
  advanceBatch,
  cloneState,
  validateCheckpoint,
  type TrainingState,
} from '@/domain/training/session';
import {
  newEarlyState,
  observeEarly,
  cloneSnapshot,
  continueBest,
  validateEarlyConfig,
} from '@/domain/training/early-stopping';
import {
  captureExperiment,
  exportExperiment,
  importExperiment,
  prepareExperiment,
  experimentWire,
} from '@/application/training/experiment';
import {
  ExperimentLibrary,
  experimentStorageBytes,
} from '@/infrastructure/storage/experiment-library';
import { TrainingRecovery } from '@/infrastructure/storage/training-recovery';
import { libraryPort } from '../fixtures/library-port';
import { trainingBudget } from '@/domain/training/budget';
function fixture(recipe: 'moons' | 'flowers' | 'sine' = 'moons') {
  const f = trainingFixture(recipe);
  f.input.config.epochs = 20;
  f.input.config.initialization = 'zero';
  f.input.config.optimizer.rate = 1e-5;
  f.input.config.optimizer.minimum = 1e-5;
  f.input.config.regularization = { l1: 0.002, l2: 0.01, clipNorm: 0.1 };
  f.input.config.earlyStopping = { patience: 5, minDelta: 0.01 };
  return f;
}
function stop(f = fixture()) {
  let s = exhaust(initialSession(f.input));
  while (!s.earlyStopping?.reason) {
    s = exhaust(advanceBatch(s, f.input));
    validateCheckpoint(s, f.input);
  }
  return s;
}
describe('selección por validación y restauración completa', () => {
  it('no considera época cero, usa mejora estricta y restaura sin conservar referencias mutables', () => {
    const f = fixture(),
      initial = exhaust(initialSession(f.input));
    expect(initial.earlyStopping?.bestLoss).toBeNull();
    const initialFile = captureExperiment(
      f.dataset,
      f.split,
      f.prepared.pipeline.options,
      f.input.pipelineHash,
      f.input.config,
      initial,
      0.5,
      1,
      false,
    );
    const roundtrip = exportExperiment(importExperiment(exportExperiment(initialFile)));
    expect(JSON.parse(roundtrip)).toEqual(JSON.parse(exportExperiment(initialFile)));
    let state = initial;
    const losses = [1, 1 - 0.0078125, 0.98, 0.98, 0.98, 0.98, 0.98, 0.98];
    for (let i = 0; i < losses.length; i++) {
      const next = {
        ...cloneState(state),
        epoch: i + 1,
        history: [
          ...state.history,
          { ...initial.history[0]!, epoch: i + 1, update: i + 1, validationLoss: losses[i]! },
        ],
      };
      state = observeEarly(next, { patience: 5, minDelta: 0.0078125 }, 20);
      if (i === 1) expect(state.earlyStopping?.best?.epoch).toBe(1);
    }
    expect(state.earlyStopping?.reason).toBe('patience');
    expect(state.earlyStopping?.stoppedAt).toBe(8);
    expect(state.epoch).toBe(3);
    const copy = cloneState(state);
    copy.earlyStopping!.best!.model.layers[0]!.weights[0] = 123;
    expect(state.earlyStopping!.best!.model.layers[0]!.weights[0]).not.toBe(123);
    for (const invalid of [
      { patience: 4, minDelta: 0 },
      { patience: 101, minDelta: 0 },
      { patience: 5, minDelta: NaN },
      { patience: 5, minDelta: 0.02 },
    ])
      expect(() => validateEarlyConfig(invalid)).toThrow('INVALID_CONFIG');
  });
  for (const recipe of ['moons', 'flowers', 'sine'] as const)
    for (const kind of ['sgd', 'momentum', 'rmsprop', 'adam'] as const)
      it(`${recipe}/${kind}: restaura la época 1, conserva optimizador y continúa igual tras JSON`, () => {
        const f = fixture(recipe);
        f.input.config.optimizer.kind = kind;
        const stopped = stop(f);
        expect(stopped.earlyStopping?.stoppedAt).toBe(6);
        expect(stopped.epoch).toBe(1);
        expect(stopped.earlyStopping?.observations).toHaveLength(6);
        expect(() => exhaust(advanceBatch(stopped, f.input))).toThrow('INVALID_STATE');
        const file = captureExperiment(
          f.dataset,
          f.split,
          f.prepared.pipeline.options,
          f.input.pipelineHash,
          f.input.config,
          stopped,
          0.5,
          1,
          false,
        );
        expect(file.schemaVersion).toBe(3);
        const imported = importExperiment(exportExperiment(file));
        expect(imported.checkpoint).toEqual(stopped);
        const ready = continueBest(imported.checkpoint, f.input.config.epochs);
        validateCheckpoint(ready, f.input);
        const resumed = exhaust(advanceBatch(ready, prepareExperiment(imported).source.input));
        validateCheckpoint(resumed, f.input);
        const plain = { ...f.input, config: { ...f.input.config } };
        delete plain.config.earlyStopping;
        let expected = exhaust(initialSession(plain));
        while (expected.updates < stopped.updates + 1)
          expected = exhaust(advanceBatch(expected, plain));
        expect(resumed.model).toEqual(expected.model);
        expect(resumed.optimizer).toEqual(expected.optimizer);
        expect(resumed.order).toEqual(expected.order);
        expect(resumed.cursor).toBe(expected.cursor);
        expect(resumed.earlyStopping?.lastReport?.stoppedAt).toBe(6);
        const again = cloneState(resumed);
        again.earlyStopping!.lastReport!.observations[0]!.validationLoss = 99;
        expect(resumed.earlyStopping?.lastReport?.observations[0]!.validationLoss).not.toBe(99);
        expect(() => continueBest({ ...stopped, frozen: true }, 20)).toThrow('INVALID_STATE');
      });
  it('al agotar horizonte también selecciona el mejor y no amplía las épocas configuradas', () => {
    const f = fixture();
    f.input.config.epochs = 3;
    f.input.config.earlyStopping!.patience = 100;
    const state = stop(f);
    expect(state.earlyStopping?.reason).toBe('horizon');
    expect(state.earlyStopping?.stoppedAt).toBe(3);
    expect(state.epoch).toBe(1);
    expect(() => continueBest(state, 1)).toThrow('INVALID_STATE');
    expect(() => continueBest({ ...state, earlyStopping: newEarlyState(1) }, 3)).toThrow(
      'INVALID_STATE',
    );
    const plain = { ...f.input, config: { ...f.input.config } };
    delete plain.config.earlyStopping;
    expect(trainingBudget(f.input).numericBytes).toBeGreaterThan(
      trainingBudget(plain).numericBytes,
    );
  });
  it('rechaza vigilancia, copias y trazas incoherentes en lugar de reanudar con información parcial', () => {
    const f = fixture(),
      state = stop(f);
    const corruptions: ((s: TrainingState) => void)[] = [
      (s) => {
        delete s.earlyStopping;
      },
      (s) => {
        s.earlyStopping!.badEpochs = 1;
      },
      (s) => {
        s.earlyStopping!.bestLoss = null;
      },
      (s) => {
        s.earlyStopping!.observations[1]!.epoch = 40;
      },
      (s) => {
        s.earlyStopping!.observations[1]!.validationLoss = NaN;
      },
      (s) => {
        s.earlyStopping!.reason = 'horizon';
      },
      (s) => {
        s.earlyStopping!.stoppedAt = 7;
      },
      (s) => {
        s.earlyStopping!.anchorEpoch = -1;
      },
      (s) => {
        s.earlyStopping!.best!.frozen = true;
      },
      (s) => {
        s.earlyStopping!.best!.model.layers[0]!.weights[0] = 42;
      },
      (s) => {
        s.earlyStopping!.best!.epoch = 2;
      },
      (s) => {
        s.earlyStopping!.best!.history[1]!.validationLoss = 99;
      },
      (s) => {
        s.earlyStopping!.observations.push({ ...s.earlyStopping!.observations[5]!, epoch: 7 });
      },
    ];
    for (const corrupt of corruptions) {
      const broken = cloneState(state);
      corrupt(broken);
      expect(() => validateCheckpoint(broken, f.input)).toThrow();
    }
    const nested = cloneState(state);
    Object.assign(nested.earlyStopping!.best!, { earlyStopping: newEarlyState(0) });
    expect(() => validateCheckpoint(nested, f.input)).toThrow('CHECKPOINT');
    const active = continueBest(state, 20);
    active.earlyStopping!.lastReport!.restoredEpoch = 2;
    expect(() => validateCheckpoint(active, f.input)).toThrow('CHECKPOINT');
    const plain = { ...f.input, config: { ...f.input.config } };
    delete plain.config.earlyStopping;
    const wrong = exhaust(initialSession(plain));
    wrong.earlyStopping = newEarlyState(0);
    expect(() => validateCheckpoint(wrong, plain)).toThrow('CHECKPOINT');
  });
  it('biblioteca y recuperación guardan las dos copias de parámetros, incluidos ceros y congelación', async () => {
    const f = fixture(),
      state = stop(f);
    state.frozen = true;
    const file = captureExperiment(
      f.dataset,
      f.split,
      f.prepared.pipeline.options,
      f.input.pipelineHash,
      f.input.config,
      state,
      0.5,
      1,
      true,
    );
    const port = libraryPort(),
      library = new ExperimentLibrary(() => port.factory),
      recovery = new TrainingRecovery(() => port.factory);
    const entry = await library.save(file, 'Mejor validación');
    expect(experimentWire(await library.read(entry.id)).checkpoint).toEqual(
      experimentWire(file).checkpoint,
    );
    expect(experimentStorageBytes(file, 0)).toBeGreaterThan(
      state.model.layers.reduce((sum, l) => sum + l.weights.byteLength + l.biases.byteLength, 0) *
        6,
    );
    await recovery.save(
      [
        f.dataset,
        f.split,
        f.prepared.pipeline.options,
        f.input.pipelineHash,
        f.input.config,
        state,
        0.5,
        1,
        true,
      ],
      'owner',
      0,
      false,
    );
    const recovered = await recovery.read();
    expect(experimentWire(recovered!.snapshot).checkpoint).toEqual(experimentWire(file).checkpoint);
    expect(recovered?.snapshot.testConsulted).toBe(true);
    expect(
      Array.isArray(experimentWire(file).checkpoint.earlyStopping?.best?.model.layers[0]!.weights),
    ).toBe(true);
    expect('earlyStopping' in cloneSnapshot(state)).toBe(false);
  });
});

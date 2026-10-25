import { describe, expect, it } from 'vitest';
import { trainingFixture } from '../fixtures/training';
import { createRandom } from '@/domain/random/seeded';
import { createNetwork, cloneNetwork, defaultSpec } from '@/domain/network/model';
import { forwardChunks, backwardChunks, exhaust } from '@/domain/training/kernel';
import {
  initialSession,
  advanceBatch,
  cloneState,
  validateCheckpoint,
  validateTraining,
  evaluateChunks,
} from '@/domain/training/session';
import { dropoutMask, type DropoutContext } from '@/domain/training/dropout';
import {
  captureExperiment,
  exportExperiment,
  importExperiment,
  prepareExperiment,
  experimentWire,
} from '@/application/training/experiment';
import { networkWire } from '@/application/training/network-schema';
import { continueBest } from '@/domain/training/early-stopping';
import {
  compareGeneralization,
  defaultGeneralization,
} from '@/application/training/generalization';
import { trainingBudget } from '@/domain/training/budget';
import {
  modelFromExperiment,
  predictWithModel,
  exportInferenceModel,
  importInferenceModel,
} from '@/application/training/inference-model';
function fixture(recipe: 'moons' | 'flowers' | 'sine' = 'moons') {
  const f = trainingFixture(recipe);
  f.input.config.dropout = { rate: 0.5 };
  f.input.config.spec.hidden = [4, 3];
  return f;
}
function archive(f: ReturnType<typeof fixture>, state: ReturnType<typeof cloneState>) {
  return captureExperiment(
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
}
function context(rate = 0.5): DropoutContext {
  return { rate, random: createRandom(42, 'dropout'), masks: [] };
}
describe('dropout invertido reproducible', () => {
  it('reproduce máscaras y expectativas, sin tocar entrada ni salida', () => {
    const c = context(),
      d = context();
    expect(dropoutMask(32, c)).toEqual(dropoutMask(32, d));
    const masks = dropoutMask(20000, c);
    expect(masks.reduce((s, n) => s + n, 0) / masks.length / 0.5).toBeCloseTo(1, 1);
    const model = createNetwork({ ...defaultSpec, hidden: [4, 3] }, 42, 'xavier');
    const train = context();
    const cache = exhaust(forwardChunks(model, [0.2, 0.3], train));
    expect(train.masks.map((m) => m.length)).toEqual([4, 3]);
    expect([...cache.activations[0]!]).toEqual([0.2, 0.3]);
    expect(cache.activations.at(-1)).toHaveLength(1);
    const before = train.random.snapshot();
    expect(exhaust(forwardChunks(model, [0.2, 0.3]))).toEqual(
      exhaust(forwardChunks(model, [0.2, 0.3])),
    );
    expect(train.random.snapshot()).toEqual(before);
  });
  it('verifica todos los gradientes con una máscara fija por diferencias centrales', () => {
    const model = createNetwork({ ...defaultSpec, hidden: [3, 2] }, 43, 'xavier'),
      x = [0.3, -0.7];
    const analytical = exhaust(backwardChunks(model, x, 1, 'mse', context()));
    const objective = (m: typeof model) => exhaust(backwardChunks(m, x, 1, 'mse', context())).loss;
    for (let l = 0; l < model.layers.length; l++)
      for (const kind of ['weights', 'biases'] as const)
        for (let j = 0; j < model.layers[l]![kind].length; j++) {
          const plus = cloneNetwork(model),
            minus = cloneNetwork(model),
            epsilon = 1e-5;
          plus.layers[l]![kind][j]! += epsilon;
          minus.layers[l]![kind][j]! -= epsilon;
          expect(analytical.gradient[l]![kind][j]).toBeCloseTo(
            (objective(plus) - objective(minus)) / (2 * epsilon),
            7,
          );
        }
  });
  it('tasa cero conserva exactamente modelo, optimizador y métricas de la ruta anterior', () => {
    const f = fixture();
    f.input.config.dropout!.rate = 0;
    const legacy = structuredClone(f.input);
    delete legacy.config.dropout;
    let a = exhaust(initialSession(f.input)),
      b = exhaust(initialSession(legacy));
    for (let i = 0; i < 9; i++) {
      a = exhaust(advanceBatch(a, f.input));
      b = exhaust(advanceBatch(b, legacy));
    }
    expect(a.model).toEqual(b.model);
    expect(a.optimizer).toEqual(b.optimizer);
    expect(a.history).toEqual(b.history);
    expect(a.dropout!.masks.flat().every((v) => v === 1)).toBe(true);
  });
  for (const recipe of ['moons', 'flowers', 'sine'] as const)
    for (const kind of ['sgd', 'momentum', 'rmsprop', 'adam'] as const)
      it(`${recipe}/${kind}: exportación, cambio de época y siguiente lote exactos`, () => {
        const f = fixture(recipe);
        f.input.config.optimizer.kind = kind;
        f.input.config.regularization = { l1: 0.001, l2: 0.002, clipNorm: 0.1 };
        let state = exhaust(initialSession(f.input));
        validateCheckpoint(state, f.input);
        const initial = importExperiment(exportExperiment(archive(f, state)));
        expect(initial.schemaVersion).toBe(4);
        for (let i = 0; i < 8; i++) {
          state = exhaust(advanceBatch(state, f.input));
          validateCheckpoint(state, f.input);
        }
        const file = archive(f, state),
          restored = importExperiment(exportExperiment(file));
        const source = prepareExperiment(restored).source.input;
        const next = exhaust(advanceBatch(restored.checkpoint, source)),
          expected = exhaust(advanceBatch(state, f.input));
        expect(next).toEqual(expected);
        validateCheckpoint(next, source);
        expect(restored.engineVersion).toBe(4);
        const model = modelFromExperiment(restored),
          imported = importInferenceModel(exportInferenceModel(model));
        expect(predictWithModel(imported, f.dataset.rows[0]!.features)).toEqual(
          predictWithModel(model, f.dataset.rows[0]!.features),
        );
        expect(exportInferenceModel(model)).not.toContain('dropout');
        const clone = cloneState(state);
        clone.dropout!.masks[0]![0] = 9;
        clone.dropout!.rng.state = 0;
        expect(state.dropout!.rng).not.toEqual(clone.dropout!.rng);
        expect(state.dropout!.masks[0]![0]).not.toBe(9);
        expect(
          exhaust(evaluateChunks(state.model, f.input.validation, f.input.config.loss)),
        ).toEqual(
          exhaust(evaluateChunks(restored.checkpoint.model, source.validation, source.config.loss)),
        );
      });
  it('cancelar un lote incompleto no consume el RNG del checkpoint confirmado', () => {
    const f = fixture(),
      state = exhaust(initialSession(f.input)),
      before = experimentWire(archive(f, state));
    const pending = advanceBatch(state, f.input);
    for (let i = 0; i < 12; i++) pending.next();
    pending.return(state);
    expect(experimentWire(archive(f, state)).checkpoint).toEqual(before.checkpoint);
    expect(exhaust(advanceBatch(state, f.input))).toEqual(
      exhaust(advanceBatch(cloneState(state), f.input)),
    );
  });
  it('restaura RNG y máscaras del mejor estado, y conserva congelación y continuación', () => {
    const f = fixture();
    f.input.config.initialization = 'zero';
    f.input.config.optimizer.rate = 1e-5;
    f.input.config.optimizer.minimum = 1e-5;
    f.input.config.epochs = 20;
    f.input.config.earlyStopping = { patience: 5, minDelta: 0.01 };
    let state = exhaust(initialSession(f.input));
    while (!state.earlyStopping?.reason) state = exhaust(advanceBatch(state, f.input));
    expect(state.earlyStopping!.stoppedAt).toBe(6);
    expect(state.epoch).toBe(1);
    validateCheckpoint(state, f.input);
    expect(state.dropout).toEqual(state.earlyStopping!.best!.dropout);
    const restored = importExperiment(exportExperiment(archive(f, state))).checkpoint;
    expect(exhaust(advanceBatch(continueBest(state, 20), f.input))).toEqual(
      exhaust(advanceBatch(continueBest(restored, 20), f.input)),
    );
    const frozen = { ...state, frozen: true };
    validateCheckpoint(frozen, f.input);
    expect(() => exhaust(advanceBatch(frozen, f.input))).toThrow('FROZEN');
  });
  it('rechaza configuraciones y estados RNG/máscaras incompatibles', () => {
    const f = fixture();
    for (const rate of [-1, 1, 0.81, NaN, Infinity]) {
      f.input.config.dropout!.rate = rate;
      expect(() => validateTraining(f.input)).toThrow();
    }
    f.input.config.dropout!.rate = 0.5;
    f.input.config.spec.hidden = [];
    expect(() => validateTraining(f.input)).toThrow();
    f.input.config.spec.hidden = [4, 3];
    const state = exhaust(advanceBatch(exhaust(initialSession(f.input)), f.input));
    const mutations = [
      (s: typeof state) => {
        delete s.dropout;
      },
      (s: typeof state) => {
        s.dropout!.seenSamples++;
      },
      (s: typeof state) => {
        s.dropout!.rng.state++;
      },
      (s: typeof state) => {
        s.dropout!.rng.spare = 1;
      },
      (s: typeof state) => {
        s.dropout!.masks[0]![0] = 7;
      },
      (s: typeof state) => {
        s.dropout!.masks = [];
      },
      (s: typeof state) => {
        s.dropout!.lastSampleId = 'unknown';
      },
    ];
    for (const mutate of mutations) {
      const bad = cloneState(state);
      mutate(bad);
      expect(() => validateCheckpoint(bad, f.input)).toThrow('CHECKPOINT');
    }
    const init = exhaust(initialSession(f.input));
    init.dropout!.masks = [[1]];
    expect(() => validateCheckpoint(init, f.input)).toThrow();
    delete f.input.config.dropout;
    expect(() => validateCheckpoint(state, f.input)).toThrow();
    for (const snapshot of [
      { state: -1, spare: null },
      { state: 1, spare: NaN },
      { state: 4294967296, spare: null },
    ])
      expect(() => createRandom(42, 'dropout', snapshot)).toThrow();
    const r = createRandom(42, 'test');
    r.normal();
    const copy = createRandom(42, 'test', r.snapshot());
    expect(copy.normal()).toBe(r.normal());
  });
  it('conserva versiones previas y declara el coste adicional', () => {
    const f = fixture(),
      cost = trainingBudget(f.input).numericBytes;
    delete f.input.config.dropout;
    expect(trainingBudget(f.input).numericBytes).toBeLessThan(cost);
    expect(archive(f, exhaust(initialSession(f.input))).schemaVersion).toBe(1);
    f.input.config.earlyStopping = { patience: 5, minDelta: 0.01 };
    expect(archive(f, exhaust(initialSession(f.input))).schemaVersion).toBe(3);
    f.input.config.dropout = { rate: 0.5 };
    expect(trainingBudget(f.input).numericBytes).toBeGreaterThan(cost);
    const file = archive(f, exhaust(initialSession(f.input)));
    file.schemaVersion = 3;
    expect(() => prepareExperiment(file)).toThrow('EXPERIMENT_VERSION');
  });
  it('empareja dropout con referencia sin consultar test ni cambiar inicialización', () => {
    const result = compareGeneralization({
      ...defaultGeneralization,
      intervention: 'dropout',
      dropoutRate: 0.5,
      epochs: 5,
    });
    expect(result.runs[0]!.initialHash).toBe(result.runs[1]!.initialHash);
    expect(result.runs[0]!.experiment.config.dropout).toBeUndefined();
    expect(result.runs[1]!.experiment.schemaVersion).toBe(4);
    expect(result.runs.every((r) => !r.experiment.testConsulted)).toBe(true);
    expect(networkWire(result.runs[0]!.experiment.checkpoint.model)).not.toEqual(
      networkWire(result.runs[1]!.experiment.checkpoint.model),
    );
  });
});

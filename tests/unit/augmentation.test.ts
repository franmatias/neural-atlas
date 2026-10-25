import { describe, expect, it, vi } from 'vitest';
import * as seeded from '@/domain/random/seeded';
import { generateDataset } from '@/domain/data/generate';
import { defaultGenerator } from '@/domain/data/types';
import { splitDataset } from '@/domain/data/split';
import { fitPipeline, transformRow } from '@/domain/data/pipeline';
import {
  augmentTraining,
  augmentationOracle,
  validateAugmentation,
  type AugmentationPolicy,
} from '@/domain/data/augmentation';
import { trainingFixture } from '../fixtures/training';
import { trainingSource } from '@/application/training/source';
import {
  initialSession,
  advanceBatch,
  cloneState,
  validateTraining,
  validateCheckpoint,
  evaluateChunks,
} from '@/domain/training/session';
import { exhaust } from '@/domain/training/kernel';
import {
  captureExperiment,
  exportExperiment,
  importExperiment,
  prepareExperiment,
} from '@/application/training/experiment';
import {
  modelFromExperiment,
  exportInferenceModel,
  importInferenceModel,
  predictWithModel,
} from '@/application/training/inference-model';
import { continueBest } from '@/domain/training/early-stopping';
import {
  compareGeneralization,
  defaultGeneralization,
} from '@/application/training/generalization';
import { trainingBudget } from '@/domain/training/budget';
function fixture(policy: AugmentationPolicy = 'circles') {
  const f = trainingFixture(policy);
  f.input.config.augmentation = { policy, sigma: 0.01, copies: 1, seed: 42 };
  const source = trainingSource(f.dataset, f.split, f.prepared, f.input.config);
  return { ...f, ...source };
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
describe('aumento conservador de train antes del pipeline', () => {
  for (const policy of ['circles', 'xor'] as const)
    it(`${policy}: geometría, oráculo, trazabilidad y ausencia de fuga`, () => {
      const dataset = generateDataset({
          ...defaultGenerator,
          recipe: policy,
          count: 100,
          noise: 0,
        }),
        split = splitDataset(dataset, {
          strategy: 'stratified',
          seed: 42,
          ratios: [0.7, 0.15, 0.15],
        });
      const before = structuredClone(dataset),
        config = { policy, sigma: 0.01, copies: 2, seed: 42 };
      const result = augmentTraining(dataset, split.train, split.validation.length, config);
      expect(result.report.accepted).toBe(140);
      expect(result.report.rejected).toBe(0);
      expect(result.report.preview).toHaveLength(20);
      expect(result).toEqual(
        augmentTraining(dataset, split.train, split.validation.length, config),
      );
      expect(dataset).toEqual(before);
      for (const copy of result.copies) {
        const parent = dataset.rows.find((r) => r.id === copy.annotation!.sourceId)!;
        const x = Number(copy.features.x1),
          y = Number(copy.features.x2);
        expect(
          Math.hypot(x - Number(parent.features.x1), y - Number(parent.features.x2)),
        ).toBeLessThanOrEqual(0.03);
        expect(augmentationOracle(policy, x, y).label).toBe(parent.target);
        expect(augmentationOracle(policy, x, y).margin).toBeGreaterThanOrEqual(0.03);
        expect(split.train).toContain(parent.id);
        expect([...split.validation, ...split.test]).not.toContain(copy.id);
      }
      const pipeline = fitPipeline(dataset, split, {
          featureIds: ['x1', 'x2'],
          imputation: 'mean',
          scaling: 'standard',
          missingIndicators: false,
        }),
        prepared = { pipeline, matrix: dataset.rows.map((r) => transformRow(r, pipeline)) };
      const f = trainingFixture(policy);
      const source = trainingSource(dataset, split, prepared, {
        ...f.input.config,
        augmentation: config,
      });
      expect(source.input.trainEvaluation!.ids).toEqual(split.train);
      expect(source.input.validation.ids).toEqual(split.validation);
      expect(source.test.ids).toEqual(split.test);
      expect(pipeline).toEqual(fitPipeline(dataset, split, pipeline.options));
      expect(source.input.train.x[70]).toEqual(transformRow(result.copies[0]!, pipeline));
    });
  it('rechaza padres sin etiqueta limpia, con faltantes, importados o cerca de frontera', () => {
    const dataset = generateDataset({ ...defaultGenerator, recipe: 'xor', noise: 0, count: 20 });
    dataset.rows[0]!.target = dataset.rows[0]!.target === '0' ? '1' : '0';
    dataset.rows[1]!.features.x1 = null;
    dataset.rows[2]!.origin = 'imported';
    dataset.rows[3]!.features.x1 = 0.001;
    const result = augmentTraining(
      dataset,
      dataset.rows.slice(0, 4).map((r) => r.id),
      0,
      { policy: 'xor', sigma: 0.01, copies: 1, seed: 42 },
    );
    expect(result.report.invalidSources).toBe(4);
    expect(result.report.attempts).toBe(0);
    expect(result.copies).toHaveLength(0);
  });
  it('limita diez intentos y registra rechazo sin crear una copia forzada', () => {
    const f = fixture('xor');
    const original = seeded.createRandom;
    const spy = vi.spyOn(seeded, 'createRandom').mockImplementation((seed, purpose, resume) => ({
      ...original(seed, purpose, resume),
      normal: () => 10,
    }));
    try {
      const r = augmentTraining(f.dataset, [f.split.train[0]!], 0, {
        policy: 'xor',
        sigma: 0.01,
        copies: 1,
        seed: 42,
      });
      expect(r.report.attempts).toBe(10);
      expect(r.report.exhausted).toBe(1);
      expect(r.copies).toHaveLength(0);
    } finally {
      spy.mockRestore();
    }
  });
  it('sigma cero produce copias exactas y otras semillas cambian solo las copias', () => {
    const f = fixture(),
      base = { policy: 'circles' as const, sigma: 0, copies: 1, seed: 42 };
    const r = augmentTraining(f.dataset, f.split.train, 12, base);
    for (const copy of r.copies)
      expect(copy.features).toEqual(
        f.dataset.rows.find((row) => row.id === copy.annotation!.sourceId)!.features,
      );
    const different = augmentTraining(f.dataset, f.split.train, 12, {
      ...base,
      sigma: 0.01,
      seed: 43,
    });
    expect(different.copies[0]!.features).not.toEqual(r.copies[0]!.features);
  });
  for (const policy of ['circles', 'xor'] as const)
    for (const kind of ['sgd', 'momentum', 'rmsprop', 'adam'] as const)
      it(`${policy}/${kind}: reanudación v6 con BN, dropout y mejor checkpoint`, () => {
        const f = fixture(policy);
        f.input.config.spec.batchNormalization = true;
        f.input.config.dropout = { rate: 0.25 };
        f.input.config.optimizer.kind = kind;
        f.input.config.regularization = { l1: 0.001, l2: 0.002, clipNorm: 0.1 };
        f.input.config.earlyStopping = { patience: 5, minDelta: 0 };
        let state = exhaust(initialSession(f.input));
        for (let i = 0; i < 15; i++) {
          state = exhaust(advanceBatch(state, f.input));
          validateCheckpoint(state, f.input);
        }
        const file = archive(f, state),
          restored = importExperiment(exportExperiment(file));
        expect(restored.schemaVersion).toBe(6);
        const source = prepareExperiment(restored).source;
        expect(source.augmentation).toEqual(f.augmentation);
        expect(source.input.train).toEqual(f.input.train);
        expect(source.input.trainEvaluation).toEqual(f.input.trainEvaluation);
        expect(exhaust(advanceBatch(restored.checkpoint, source.input))).toEqual(
          exhaust(advanceBatch(state, f.input)),
        );
        const model = modelFromExperiment(file),
          copy = importInferenceModel(exportInferenceModel(model));
        expect(copy.schemaVersion).toBe(2);
        expect(predictWithModel(copy, f.dataset.rows[0]!.features)).toEqual(
          predictWithModel(model, f.dataset.rows[0]!.features),
        );
      });
  it('curvas y baseline usan originales; restaurar el mejor regenera las mismas copias', () => {
    const f = fixture();
    f.input.config.epochs = 20;
    f.input.config.initialization = 'zero';
    f.input.config.optimizer.rate = 1e-5;
    f.input.config.optimizer.minimum = 1e-5;
    f.input.config.earlyStopping = { patience: 5, minDelta: 0.01 };
    let state = exhaust(initialSession(f.input));
    const originalInitialLoss = exhaust(
      evaluateChunks(state.model, f.input.trainEvaluation!, f.input.config.loss),
    ).loss;
    expect(state.history[0]!.trainLoss).toBe(originalInitialLoss);
    while (!state.earlyStopping?.reason) state = exhaust(advanceBatch(state, f.input));
    expect(state.epoch).toBe(1);
    expect(state.earlyStopping!.stoppedAt).toBe(6);
    expect(state.history.at(-1)!.trainLoss).toBe(
      exhaust(evaluateChunks(state.model, f.input.trainEvaluation!, f.input.config.loss)).loss,
    );
    expect(modelFromExperiment(archive(f, state)).schemaVersion).toBe(1);
    const restored = importExperiment(exportExperiment(archive(f, state)));
    expect(
      exhaust(
        advanceBatch(
          continueBest(restored.checkpoint, 20),
          prepareExperiment(restored).source.input,
        ),
      ),
    ).toEqual(exhaust(advanceBatch(continueBest(state, 20), f.input)));
  });
  it('rechaza configuraciones, políticas no admitidas y exceso del presupuesto', () => {
    const f = fixture(),
      base = f.input.config.augmentation!;
    for (const patch of [
      { sigma: -1 },
      { sigma: 0.02 },
      { sigma: NaN },
      { copies: 0 },
      { copies: 4 },
      { seed: -1 },
      { policy: 'moons' },
    ])
      expect(() => validateAugmentation({ ...base, ...patch } as typeof base)).toThrow();
    expect(() =>
      augmentTraining(f.dataset, Array(5000).fill(f.split.train[0]!), 100, { ...base, copies: 3 }),
    ).toThrow('AUGMENTATION_LIMIT');
    expect(() => augmentTraining(trainingFixture('moons').dataset, [], 0, base)).toThrow(
      'AUGMENTATION_POLICY',
    );
    expect(() => augmentTraining(f.dataset, ['missing'], 0, base)).toThrow('AUGMENTATION_POLICY');
    const wrong = { ...f.input.config, augmentation: { ...base, policy: 'xor' as const } };
    expect(() => trainingSource(f.dataset, f.split, f.prepared, wrong)).toThrow(
      'AUGMENTATION_POLICY',
    );
    const bad = structuredClone(f.input);
    delete bad.trainEvaluation;
    expect(() => validateTraining(bad)).toThrow('AUGMENTATION_CONFIG');
    const ids = structuredClone(f.input);
    ids.train.ids[ids.trainEvaluation!.ids.length] = 'aug-99999-1';
    expect(() => validateTraining(ids)).toThrow();
    const labels = structuredClone(f.input);
    labels.train.y[labels.trainEvaluation!.ids.length] =
      1 - labels.train.y[labels.trainEvaluation!.ids.length]!;
    expect(() => validateTraining(labels)).toThrow();
    const legacy = structuredClone(f.input);
    delete legacy.config.augmentation;
    expect(() => validateTraining(legacy)).toThrow('AUGMENTATION_CONFIG');
    const file = archive(f, exhaust(initialSession(f.input)));
    file.schemaVersion = 5;
    expect(() => prepareExperiment(file)).toThrow('EXPERIMENT_VERSION');
  });
  it('comparación emparejada declara filas y trabajo adicionales, sin consultar test', () => {
    const result = compareGeneralization({
      ...defaultGeneralization,
      intervention: 'augmentation',
      epochs: 5,
      noise: 0,
    });
    const [a, b] = result.runs;
    expect(a!.initialHash).toBe(b!.initialHash);
    expect(a!.trainingRows).toBe(72);
    expect(b!.trainingRows).toBe(144);
    expect(b!.augmentation!.accepted).toBe(72);
    expect(b!.experiment.testConsulted).toBe(false);
    const original = prepareExperiment(a!.experiment).source.input,
      augmented = prepareExperiment(b!.experiment).source.input;
    expect(augmented.validation).toEqual(original.validation);
    expect(augmented.trainEvaluation).toEqual(original.train);
    expect(trainingBudget(augmented).updates).toBeGreaterThan(trainingBudget(original).updates);
  });
});

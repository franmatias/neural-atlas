import { describe, expect, it } from 'vitest';
import { trainingFixture } from '../fixtures/training';
import {
  captureExperiment,
  exportExperiment,
  importExperiment,
  prepareExperiment,
  experimentWire,
} from '@/application/training/experiment';
import { initialSession, advanceBatch } from '@/domain/training/session';
import { exhaust } from '@/domain/training/kernel';
import { hashValue } from '@/domain/data/integrity';
function fixture(recipe: 'moons' | 'flowers' | 'sine' = 'moons') {
  const data = trainingFixture(recipe);
  const state = exhaust(advanceBatch(exhaust(initialSession(data.input)), data.input));
  return {
    data,
    snapshot: captureExperiment(
      data.dataset,
      data.split,
      data.prepared.pipeline.options,
      data.input.pipelineHash,
      data.input.config,
      state,
      0.4,
      1,
      false,
    ),
  };
}
describe('Experimentos portables', () => {
  it.each(['moons', 'flowers', 'sine'] as const)(
    'reanuda %s exactamente a mitad de época con momentos Adam',
    (recipe) => {
      const { data, snapshot } = fixture(recipe);
      const text = exportExperiment(snapshot);
      const copy = importExperiment(text);
      expect(copy.checkpoint.model.layers[0]!.weights).toBeInstanceOf(Float64Array);
      expect(copy.checkpoint).toEqual(snapshot.checkpoint);
      expect(prepareExperiment(copy).source.input).toEqual(data.input);
      expect(exhaust(advanceBatch(copy.checkpoint, data.input))).toEqual(
        exhaust(advanceBatch(snapshot.checkpoint, data.input)),
      );
      copy.checkpoint.model.layers[0]!.weights[0] = 99;
      expect(snapshot.checkpoint.model.layers[0]!.weights[0]).not.toBe(99);
    },
  );
  it('preserva congelación y la consulta anterior de test incluso en una nueva sesión entrenable', () => {
    const { snapshot, data } = fixture();
    snapshot.testConsulted = true;
    expect(importExperiment(exportExperiment(snapshot)).testConsulted).toBe(true);
    snapshot.checkpoint.frozen = true;
    const restored = importExperiment(exportExperiment(snapshot));
    expect(() => exhaust(advanceBatch(restored.checkpoint, data.input))).toThrow();
  });
  it('rechaza versiones, claves desconocidas, corrupción, tensores no finitos y contadores incoherentes', () => {
    const { snapshot } = fixture();
    const text = exportExperiment(snapshot);
    const rewrite = (edit: (wire: Record<string, unknown>) => void, rehash = true) => {
      const raw = JSON.parse(text) as Record<string, unknown>;
      delete raw.integrity;
      edit(raw);
      return JSON.stringify({ ...raw, integrity: rehash ? hashValue(raw) : '0'.repeat(64) });
    };
    expect(() => importExperiment('not JSON')).toThrow();
    expect(() =>
      importExperiment(
        rewrite((raw) => {
          raw.engineVersion = 2;
        }),
      ),
    ).toThrow();
    expect(() =>
      importExperiment(
        rewrite((raw) => {
          raw.extra = true;
        }),
      ),
    ).toThrow();
    expect(() =>
      importExperiment(
        rewrite((raw) => {
          raw.threshold = 0.3;
        }, false),
      ),
    ).toThrow('EXPERIMENT_INTEGRITY');
    expect(() =>
      importExperiment(
        rewrite((raw) => {
          (raw.checkpoint as { updates: number }).updates++;
        }),
      ),
    ).toThrow();
    snapshot.checkpoint.model.layers[0]!.weights[0] = Infinity;
    expect(() => exportExperiment(snapshot)).toThrow();
    expect(() => importExperiment('{"__proto__":{}}')).toThrow();
  });
  it('comprueba split, escalado ajustado en train y topología aunque se recalcule el hash externo', () => {
    const { snapshot } = fixture();
    snapshot.pipelineHash = '0'.repeat(64);
    expect(() => prepareExperiment(snapshot)).toThrow('EXPERIMENT_PIPELINE');
    const second = fixture().snapshot;
    second.config.spec.inputs = 3;
    expect(() => prepareExperiment(second)).toThrow('EXPERIMENT_CONFIG');
    const third = fixture().snapshot;
    delete (third.dataset as { split?: unknown }).split;
    expect(() => prepareExperiment(third)).toThrow('EXPERIMENT_SPLIT');
    const fourth = fixture().snapshot;
    fourth.positive = 4;
    expect(() => prepareExperiment(fourth)).toThrow('EXPERIMENT_CONFIG');
    expect(experimentWire(fixture().snapshot).checkpoint.optimizer.first[0]).toBeInstanceOf(Array);
  });
});

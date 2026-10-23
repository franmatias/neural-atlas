import { describe, expect, it } from 'vitest';
import { inferenceFixture } from '../fixtures/models';
import {
  exportInferenceModel,
  importInferenceModel,
  predictWithModel,
  inferenceWire,
  validateInferenceModel,
  modelLimit,
} from '@/application/training/inference-model';
import { forward } from '@/domain/network/model';
import { hashValue } from '@/domain/data/integrity';
import { handleDataJob, executeDataJob } from '@/application/data/jobs';
describe('Modelos de inferencia independientes', () => {
  it.each(['moons', 'flowers', 'sine'] as const)(
    'conserva exactamente predicción y clases en %s sin exportar filas',
    (recipe) => {
      const f = inferenceFixture(recipe);
      const wire = exportInferenceModel(f.model);
      const raw = JSON.parse(wire) as Record<string, unknown>;
      for (const forbidden of [
        'dataset',
        'rows',
        'rowIds',
        'optimizer',
        'checkpoint',
        'history',
        'train',
        'validation',
        'test',
      ])
        expect(Object.hasOwn(raw, forbidden)).toBe(false);
      const imported = importInferenceModel(wire);
      const prediction = predictWithModel(imported, f.dataset.rows[0]!.features);
      expect(prediction.output).toEqual(
        Array.from(
          forward(f.experiment.checkpoint.model, f.prepared.matrix[0]!).activations.at(-1)!,
        ),
      );
      expect(imported.classOrder).toEqual(f.model.classOrder);
      expect(ArrayBuffer.isView(imported.network.layers[0]!.weights)).toBe(true);
      expect(imported.threshold).toBe(recipe === 'moons' ? 0.7 : null);
      expect(imported.positiveClassId).toBe(recipe === 'moons' ? 0 : null);
      imported.network.layers[0]!.weights[0] = 200;
      expect(f.experiment.checkpoint.model.layers[0]!.weights[0]).not.toBe(200);
      expect(executeDataJob({ kind: 'exportModel', payload: { model: f.model } })).toBe(wire);
      expect(
        predictWithModel(
          executeDataJob({ kind: 'importModel', payload: { text: wire } }) as typeof imported,
          f.dataset.rows[0]!.features,
        ).output,
      ).toEqual(prediction.output);
    },
  );
  it.each(['none', 'minmax', 'standard'] as const)(
    'aplica %s, categorías desconocidas, constantes e indicadores de ausencia',
    (scaling) => {
      const f = inferenceFixture('moons', true, scaling),
        model = importInferenceModel(exportInferenceModel(f.model));
      const values = { ...f.dataset.rows[0]!.features, zone: 'nueva' };
      const out = predictWithModel(model, values);
      expect(out.warnings).toContain('zone');
      expect(out.transformed[model.pipeline.outputFeatureIds.indexOf('zone:unknown')]).toBe(1);
      const missing = predictWithModel(
        model,
        Object.fromEntries(model.features.map((feature) => [feature.id, null])),
      );
      expect(missing.warnings).toEqual([]);
      for (const feature of model.features)
        expect(
          missing.transformed[model.pipeline.outputFeatureIds.indexOf(`${feature.id}:missing`)],
        ).toBe(1);
      const known = predictWithModel(model, f.dataset.rows[0]!.features);
      expect(known.warnings).toEqual([]);
      const invalid = { ...values, [model.features[0]!.id]: 1e9 };
      expect(predictWithModel(model, invalid).warnings).toContain(model.features[0]!.id);
      expect(() => predictWithModel(model, {})).toThrow('MODEL_INPUT');
      expect(() => predictWithModel(model, { ...values, zone: 3 })).toThrow('MODEL_INPUT');
      expect(() =>
        predictWithModel(model, { ...values, [model.features[0]!.id]: Infinity }),
      ).toThrow('MODEL_INPUT');
    },
  );
  it('conserva umbral y clase positiva, incluidos empate y decisiones de ambas clases', () => {
    const { model, dataset } = inferenceFixture();
    for (const layer of model.network.layers) {
      layer.weights.fill(0);
      layer.biases.fill(0);
    }
    model.hashes.networkHash = hashValue(inferenceWire(model).network);
    model.threshold = 0.5;
    expect(predictWithModel(model, dataset.rows[0]!.features).decision).toBe(0);
    model.positiveClassId = 1;
    expect(predictWithModel(model, dataset.rows[0]!.features).decision).toBe(1);
    model.threshold = 0.8;
    expect(predictWithModel(model, dataset.rows[0]!.features).decision).toBe(0);
    model.positiveClassId = 0;
    expect(predictWithModel(model, dataset.rows[0]!.features).decision).toBe(1);
  });
  it('rechaza archivos alterados y contratos incompletos incluso recalculando el hash exterior', () => {
    const { model } = inferenceFixture('moons', true);
    const valid = exportInferenceModel(model);
    const edit = (mutation: (value: Record<string, unknown>) => void, rehash = true) => {
      const raw = JSON.parse(valid) as Record<string, unknown>;
      delete raw.integrity;
      mutation(raw);
      return JSON.stringify({ ...raw, integrity: rehash ? hashValue(raw) : '0'.repeat(64) });
    };
    expect(() => importInferenceModel('invalid')).toThrow();
    expect(() => importInferenceModel(' '.repeat(modelLimit + 1))).toThrow('MODEL_SIZE');
    expect(() => importInferenceModel('{"__proto__":{}}')).toThrow();
    expect(() =>
      importInferenceModel(
        edit((raw) => {
          raw.engineVersion = 2;
        }),
      ),
    ).toThrow();
    expect(() =>
      importInferenceModel(
        edit((raw) => {
          raw.dataset = {};
        }),
      ),
    ).toThrow();
    expect(() =>
      importInferenceModel(
        edit((raw) => {
          raw.threshold = 0.4;
        }, false),
      ),
    ).toThrow('MODEL_INTEGRITY');
    const broken = () => importInferenceModel(exportInferenceModel(model));
    let copy = broken();
    copy.features[0]!.id = 'other';
    expect(() => validateInferenceModel(copy)).toThrow('MODEL_FEATURES');
    copy = broken();
    copy.features[0]!.kind = 'categorical';
    expect(() => validateInferenceModel(copy)).toThrow('MODEL_FEATURES');
    copy = broken();
    const numeric = copy.pipeline.columns[0]!;
    if (numeric.kind === 'numeric') numeric.min = numeric.max + 1;
    expect(() => validateInferenceModel(copy)).toThrow('MODEL_STATISTICS');
    copy = broken();
    const category = copy.pipeline.columns.at(-1)!;
    if (category.kind === 'categorical') category.vocabulary.push(category.vocabulary[0]!);
    expect(() => validateInferenceModel(copy)).toThrow('MODEL_VOCABULARY');
    copy = broken();
    copy.pipeline.outputLabels[0] = 'other';
    expect(() => validateInferenceModel(copy)).toThrow('MODEL_DIMENSIONS');
    copy = broken();
    copy.classOrder.reverse();
    copy.classOrder[1] = copy.classOrder[0]!;
    expect(() => validateInferenceModel(copy)).toThrow('MODEL_CLASSES');
    copy = broken();
    copy.hashes.pipelineHash = '0'.repeat(64);
    expect(() => validateInferenceModel(copy)).toThrow('MODEL_INTEGRITY');
    copy = broken();
    copy.network.layers[0]!.weights[0] = NaN;
    expect(() => validateInferenceModel(copy)).toThrow();
    expect(handleDataJob(1, { kind: 'importModel', payload: { text: 'invalid' } })).toMatchObject({
      ok: false,
    });
    expect(
      executeDataJob({
        kind: 'predictModel',
        payload: { model, values: Object.fromEntries(model.features.map((f) => [f.id, null])) },
      }),
    ).toMatchObject({ warnings: [] });
  });
});

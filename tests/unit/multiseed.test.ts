import { expect, it } from 'vitest';
import {
  compareMultiseed,
  describe,
  exportMultiseed,
  multiseedOptions,
} from '@/application/training/multiseed';
import {
  compareGeneralization,
  defaultGeneralization,
} from '@/application/training/generalization';
import {
  exportExperiment,
  importExperiment,
  prepareExperiment,
} from '@/application/training/experiment';
import { handleDataJob } from '@/application/data/jobs';

const options = {
  comparison: { ...defaultGeneralization, epochs: 5 },
  firstSeed: 42,
  count: 3 as const,
};
it('calcula media, desviación muestral y extremos sin confundirlos con un intervalo', () => {
  expect(describe([1, 2, 3])).toEqual({ mean: 2, sampleDeviation: 1, minimum: 1, maximum: 3 });
  expect(describe([4, 4, 4]).sampleDeviation).toBe(0);
  for (const values of [[], [1], [1, NaN], [1, Infinity], [1e308, -1e308]])
    expect(() => describe(values)).toThrow('STATISTICS');
});
it('valida límites antes de ejecutar y enumera semillas con vuelta uint32 sin duplicados', () => {
  for (const patch of [
    { count: 2 },
    { count: 11 },
    { firstSeed: -1 },
    { firstSeed: 1.2 },
    { firstSeed: 4294967296 },
  ])
    expect(() => compareMultiseed({ ...options, ...patch } as typeof options)).toThrow();
  expect(multiseedOptions.parse({ ...options, count: 10 }).count).toBe(10);
  expect(multiseedOptions.parse({ ...options, count: 5 }).count).toBe(5);
  const result = compareMultiseed({ ...options, firstSeed: 4294967295 });
  expect(result.measurements.map((m) => m.seed)).toEqual([4294967295, 0, 1]);
});
it('fija datos, split y pipeline entre semillas, empareja pesos y calcula diferencias reales', () => {
  const result = compareMultiseed(options);
  expect(result.pairs).toHaveLength(3);
  expect(new Set(result.pairs.map((p) => p.runs[0]!.initialHash)).size).toBe(3);
  for (const [i, pair] of result.pairs.entries()) {
    const [a, b] = pair.runs;
    expect(a!.initialHash).toBe(b!.initialHash);
    expect(a!.experiment.dataset).toEqual(result.pairs[0]!.runs[0]!.experiment.dataset);
    expect(b!.experiment.dataset).toEqual(a!.experiment.dataset);
    expect(b!.experiment.pipelineHash).toBe(result.pairs[0]!.runs[0]!.experiment.pipelineHash);
    expect(a!.experiment.config.seed).toBe(42 + i);
    const measurement = result.measurements[i]!;
    expect(measurement.lossDelta).toBe(
      b!.experiment.checkpoint.history.at(-1)!.validationLoss -
        a!.experiment.checkpoint.history.at(-1)!.validationLoss,
    );
    expect(measurement.accuracyDelta).toBe(
      measurement.interventionAccuracy - measurement.referenceAccuracy,
    );
    expect(measurement.referenceUpdates).toBe(30);
    for (const run of pair.runs) {
      const restored = importExperiment(exportExperiment(run.experiment));
      expect(prepareExperiment(restored).source.input.config.seed).toBe(42 + i);
      expect(restored.testConsulted).toBe(false);
    }
  }
  expect(result.summary.lossDelta).toEqual(describe(result.measurements.map((m) => m.lossDelta)));
  expect(result.summary.lowerLoss + result.summary.equalLoss + result.summary.higherLoss).toBe(3);
  const report = JSON.parse(exportMultiseed(result));
  expect(report.format).toBe('neural-atlas.multiseed-report');
  expect(report.scope).toBe('training-seed-fixed-data');
  expect(report.measurements).toEqual(result.measurements);
  expect(report.testConsulted).toBe(false);
});
it('es reproducible, no muta opciones y λ cero produce diferencias exactamente nulas', () => {
  const raw = { ...options, comparison: { ...options.comparison, lambda: 0 } };
  const before = structuredClone(raw);
  const a = compareMultiseed(raw),
    b = compareMultiseed(raw);
  expect(raw).toEqual(before);
  expect(a.measurements).toEqual(b.measurements);
  expect(a.summary.equalLoss).toBe(3);
  expect(a.summary.lossDelta).toEqual(describe([0, 0, 0]));
  expect(a.summary.accuracyDelta.mean).toBe(0);
  expect(() => compareGeneralization(options.comparison, -1)).toThrow();
});
for (const intervention of ['dropout', 'bn', 'early', 'augmentation', 'l1', 'clip'] as const)
  it(`${intervention}: conserva contratos, selección real y semillas auxiliares fijas`, () => {
    const result = compareMultiseed({
      ...options,
      comparison: { ...options.comparison, intervention, noise: 0 },
    });
    for (const [i, pair] of result.pairs.entries()) {
      const run = pair.runs[1]!;
      const restored = importExperiment(exportExperiment(run.experiment));
      prepareExperiment(restored);
      expect(restored.testConsulted).toBe(false);
      if (intervention === 'augmentation') {
        expect(run.experiment.config.augmentation!.seed).toBe(42);
        expect(run.augmentation).toEqual(result.pairs[0]!.runs[1]!.augmentation);
        expect(result.measurements[i]!.interventionUpdates).toBeGreaterThan(30);
      }
      if (intervention === 'early') {
        expect(result.measurements[i]!.interventionUpdates).toBe(
          restored.checkpoint.earlyStopping!.observations.at(-1)!.update,
        );
        expect(result.measurements[i]!.interventionLoss).toBe(
          restored.checkpoint.history.at(-1)!.validationLoss,
        );
      }
    }
  });
it('el despachador del Worker valida y entrega resultados o un error cerrado', () => {
  const response = handleDataJob(5, { kind: 'multiseed', payload: options });
  expect(response.ok).toBe(true);
  expect(handleDataJob(6, { kind: 'multiseed', payload: { ...options, firstSeed: -1 } }).ok).toBe(
    false,
  );
});

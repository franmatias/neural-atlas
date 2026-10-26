import { expect, it } from 'vitest';
import { generateDataset } from '@/domain/data/generate';
import { defaultGenerator } from '@/domain/data/types';
import { splitDataset } from '@/domain/data/split';
import { defaultSpec } from '@/domain/network/model';
import { defaultOptimizer } from '@/domain/training/optimizer';
import { exportDatasetJson } from '@/application/data/json-files';
import {
  compareModels,
  configurationDifferences,
  exportPairedComparison,
} from '@/application/training/paired-comparison';
import { handleDataJob } from '@/application/data/jobs';
function fixture() {
  const dataset = generateDataset({ ...defaultGenerator, recipe: 'moons', count: 120 });
  const split = splitDataset(dataset, {
    strategy: 'stratified',
    ratios: [0.6, 0.2, 0.2],
    seed: 42,
  });
  const config = {
    spec: { ...defaultSpec },
    seed: 42,
    initialization: 'xavier' as const,
    optimizer: { ...defaultOptimizer },
    epochs: 5,
    batchSize: 12,
    loss: 'mse' as const,
  };
  const pipeline = {
    featureIds: ['x1', 'x2'],
    imputation: 'mean' as const,
    scaling: 'standard' as const,
    missingIndicators: false,
  };
  return {
    dataset,
    options: {
      datasetJson: exportDatasetJson(dataset, split),
      a: config,
      b: structuredClone(config),
      pipelineA: pipeline,
      pipelineB: structuredClone(pipeline),
      testPreviouslyConsulted: false,
      hypothesis: 'La tasa cambia la trayectoria.',
    },
  };
}
it('A/B sin cambios coincide exactamente y no muta la configuración original', () => {
  const { options } = fixture(),
    before = structuredClone(options);
  const result = compareModels(options);
  expect(result.runs[0]!.experiment.checkpoint).toEqual(result.runs[1]!.experiment.checkpoint);
  expect(result.differences).toEqual([]);
  expect(result.delta).toEqual({ validationLoss: 0, trainLoss: 0, validationScore: 0 });
  expect(options).toEqual(before);
});
it('una diferencia se identifica con precisión, mantiene datos comunes y exporta evidencia real', () => {
  const { options } = fixture();
  options.b.optimizer.rate = 0.02;
  const result = compareModels({ ...options, testPreviouslyConsulted: true });
  expect(result.differences).toEqual([{ field: 'config.optimizer.rate', a: 0.01, b: 0.02 }]);
  expect(result.runs[0]!.initialHash).toBe(result.runs[1]!.initialHash);
  expect(result.runs[0]!.experiment.dataset).toEqual(result.runs[1]!.experiment.dataset);
  const report = JSON.parse(exportPairedComparison(result));
  expect(report.format).toBe('neural-atlas.comparison-report');
  expect(report.options.hypothesis).toBe(options.hypothesis);
  expect(report.options.datasetJson).toBeUndefined();
  expect(report.delta.validationLoss).toBe(
    report.runs[1].point.validationLoss - report.runs[0].point.validationLoss,
  );
  expect(report.options.testPreviouslyConsulted).toBe(true);
  expect(result.runs.every((r) => r.experiment.testConsulted)).toBe(true);
});
it('diferencias estructurales, ausencias y pipelines se distinguen sin ocultar varios cambios', () => {
  expect(configurationDifferences({ a: 1 }, { b: 2 })).toEqual([
    { field: 'a', a: 1, b: null },
    { field: 'b', a: null, b: 2 },
  ]);
  const { options } = fixture();
  options.b.spec.hidden = [8, 8];
  options.pipelineB.scaling = 'none' as 'standard';
  const result = compareModels(options);
  expect(result.differences.map((d) => d.field)).toEqual([
    'config.spec.hidden',
    'pipeline.scaling',
  ]);
  expect(result.runs[0]!.initialHash).not.toBe(result.runs[1]!.initialHash);
});
it('preflight rechaza fuente sin split y presupuestos incompatibles antes de ejecutar', () => {
  const { options, dataset } = fixture();
  expect(() => compareModels({ ...options, datasetJson: exportDatasetJson(dataset) })).toThrow(
    'COMPARISON_SPLIT',
  );
  expect(() => compareModels({ ...options, b: { ...options.b, epochs: 121 } })).toThrow(
    'COMPARISON_BUDGET',
  );
  expect(() =>
    compareModels({
      ...options,
      b: { ...options.b, spec: { ...defaultSpec, hidden: [64, 64, 64] } },
    }),
  ).toThrow('COMPARISON_BUDGET');
  const large = generateDataset({ ...defaultGenerator, recipe: 'moons', count: 1002 });
  const split = splitDataset(large, { strategy: 'stratified', ratios: [0.6, 0.2, 0.2], seed: 42 });
  expect(() => compareModels({ ...options, datasetJson: exportDatasetJson(large, split) })).toThrow(
    'COMPARISON_BUDGET',
  );
  expect(handleDataJob(1, { kind: 'abComparison', payload: options }).ok).toBe(true);
});

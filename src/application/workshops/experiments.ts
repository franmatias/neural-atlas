import { generateDataset } from '@/domain/data/generate';
import { runAdvancedWorkshop } from './advanced-experiments';
import { defaultGenerator } from '@/domain/data/types';
import { splitDataset } from '@/domain/data/split';
import { fitPipeline, transformRow } from '@/domain/data/pipeline';
import { hashValue } from '@/domain/data/integrity';
import { forward, defaultSpec } from '@/domain/network/model';
import {
  xorInputs,
  xorTargets,
  trainPerceptron,
  perceptronScore,
  xorDemonstration,
} from '@/domain/network/learning';
import { propagationPreset } from '@/domain/network/presets';
import { backward, checkGradient, applyGradient } from '@/domain/network/backprop';
import { initialSession, advanceBatch } from '@/domain/training/session';
import { defaultOptimizer } from '@/domain/training/optimizer';
import { trainingBudget } from '@/domain/training/budget';
import { exhaust } from '@/domain/training/kernel';
import { trainingSource } from '@/application/training/source';
import {
  optionsSchema,
  evidenceSchema,
  type WorkshopOptions,
  type WorkshopEvidence,
} from './contracts';
export function runWorkshop(
  caseId: WorkshopEvidence['caseId'],
  raw: WorkshopOptions,
): WorkshopEvidence {
  const options = optionsSchema.parse(raw);
  const evidence: WorkshopEvidence = {
    id: crypto.randomUUID(),
    caseId,
    engineVersion: 1,
    capturedAt: new Date().toISOString(),
    options,
    configHash: hashValue({ caseId, options, engineVersion: 1 }),
    metrics: {},
    rows: [],
    columns: [],
    curves: [],
    plot: [],
  };
  if (caseId === 'T01') {
    const dataset = generateDataset({
      ...defaultGenerator,
      seed: options.seed,
      count: 160,
      missing: 0.08,
      outliers: 0.03,
      noise: 0.12,
    });
    dataset.rows.forEach((row) => {
      const id = dataset.features[0]!.id;
      if (row.features[id] !== null) row.features[id] = Number(row.features[id]) * 1000;
    });
    dataset.revision++;
    const split = splitDataset(dataset, {
      strategy: 'stratified',
      seed: options.seed,
      ratios: [0.7, 0.15, 0.15],
    });
    const pipeline = fitPipeline(dataset, split, {
      featureIds: dataset.features.map((f) => f.id),
      scaling: options.scaling,
      imputation: 'mean',
      missingIndicators: true,
    });
    const matrix = dataset.rows.map((row) => transformRow(row, pipeline));
    evidence.metrics = {
      splitDisjoint:
        new Set([...split.train, ...split.validation, ...split.test]).size === dataset.rows.length,
      fittedTrain:
        pipeline.fittedOn.split === 'train' && pipeline.fittedOn.idsHash === hashValue(split.train),
      nonFinite: matrix.flat().filter((v) => !Number.isFinite(v)).length,
    };
    evidence.columns = ['Partición', 'Filas'];
    evidence.rows = [
      { label: 'train', values: [split.train.length] },
      { label: 'validación', values: [split.validation.length] },
      { label: 'test', values: [split.test.length] },
    ];
  } else if (caseId === 'T02') {
    evidence.metrics = {
      biasBefore: 0,
      biasAfter: options.bias,
      sameWeights: true,
      distance: Math.abs(options.bias) / Math.hypot(1, 0.5),
    };
    evidence.columns = ['Frontera', 'w₁', 'w₂', 'b'];
    evidence.rows = [
      { label: 'Antes', values: [1, 0.5, 0] },
      { label: 'Después', values: [1, 0.5, options.bias] },
    ];
    const dataset = generateDataset({ ...defaultGenerator, count: 40, seed: options.seed });
    evidence.plot = dataset.rows.map((row) => ({
      x: Number(row.features[dataset.features[0]!.id]),
      y: Number(row.features[dataset.features[1]!.id]),
      label: Number(row.target) as 0 | 1,
    }));
  } else if (caseId === 'T03') {
    const perceptron = trainPerceptron(xorInputs, xorTargets, options.seed, 0.1, 100);
    const linear = perceptronScore(xorInputs, xorTargets, [1, 1], -0.5);
    const outputs = xorInputs.map((x) => forward(xorDemonstration(), x).activations.at(-1)![0]!);
    evidence.metrics = {
      linearCorrect: perceptron.best.correct,
      linearExample: linear,
      mlpCorrect: outputs.filter((v, i) => Math.abs(v - xorTargets[i]!) < 1e-12).length,
    };
    evidence.columns = ['Entrada', 'Objetivo XOR', 'Construcción ReLU'];
    evidence.rows = xorInputs.map((x, i) => ({
      label: x.join(', '),
      values: [xorTargets[i]!, outputs[i]!],
    }));
  } else if (caseId === 'T04') {
    const model = propagationPreset(),
      input = [0.8, 0.2],
      target = 1;
    const before = backward(model, input, target),
      check = checkGradient(model, input, target);
    const after = applyGradient(model, before.gradient, options.rate);
    evidence.metrics = {
      gradientError: Math.max(...check.map((row) => row.relativeError)),
      gradientPass: check.every((row) => !row.atKink && row.relativeError <= 1e-5),
      updateApplied: after.layers[0]!.weights[0] !== model.layers[0]!.weights[0],
      lossBefore: before.loss,
      lossAfter: backward(after, input, target).loss,
    };
    evidence.columns = ['Parámetro', 'Analítico', 'Diferencia central', 'Error relativo'];
    evidence.rows = check.map((row) => ({
      label: `Capa ${row.layer + 1} ${row.kind === 'weight' ? 'peso' : 'sesgo'} ${row.index + 1}`,
      values: [row.analytic, row.numeric, row.relativeError],
    }));
  } else if (caseId === 'T05') {
    if (!options.budgetAccepted) throw new Error('WORKSHOP_BUDGET');
    const dataset = generateDataset({
      ...defaultGenerator,
      recipe: 'moons',
      count: 160,
      seed: options.seed,
    });
    const split = splitDataset(dataset, {
      strategy: 'stratified',
      seed: options.seed,
      ratios: [0.7, 0.15, 0.15],
    });
    const pipeline = fitPipeline(dataset, split, {
      featureIds: dataset.features.map((f) => f.id),
      scaling: 'standard',
      imputation: 'mean',
      missingIndicators: false,
    });
    const prepared = { pipeline, matrix: dataset.rows.map((row) => transformRow(row, pipeline)) };
    evidence.columns = [
      'Ensayo',
      'Tasa',
      'Lote',
      'Pérdida train',
      'Pérdida validación',
      'Actualizaciones',
      'Resultado',
    ];
    for (const rate of options.rates)
      for (const batchSize of options.batches) {
        const { input } = trainingSource(dataset, split, prepared, {
          spec: { ...defaultSpec, hidden: [4] },
          seed: options.seed,
          initialization: 'xavier',
          epochs: options.epochs,
          batchSize,
          loss: 'mse',
          optimizer: { ...defaultOptimizer, kind: 'sgd', rate, minimum: 0.001 },
        });
        if (trainingBudget(input).extensive) throw new Error('WORKSHOP_BUDGET');
        let state = exhaust(initialSession(input));
        let outcome: 'finite' | 'divergent' = 'finite';
        try {
          while (state.epoch < input.config.epochs) state = exhaust(advanceBatch(state, input));
        } catch (error) {
          if (!(error instanceof RangeError) || error.message !== 'NON_FINITE') throw error;
          outcome = 'divergent';
        }
        const last = state.history.at(-1)!;
        evidence.curves.push({
          rate,
          batch: batchSize,
          outcome,
          updates: state.updates,
          history: state.history,
        });
        evidence.rows.push({
          label: `η=${rate} · B=${batchSize}`,
          values: [
            rate,
            batchSize,
            last.trainLoss,
            last.validationLoss,
            state.updates,
            outcome === 'finite' ? 'Finito' : 'Divergencia detectada',
          ],
        });
      }
    evidence.metrics = { runCount: 6, recordedRuns: evidence.curves.length, budgetAccepted: true };
  } else Object.assign(evidence, runAdvancedWorkshop(caseId, options));
  return evidenceSchema.parse(evidence);
}

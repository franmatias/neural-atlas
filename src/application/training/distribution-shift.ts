import { z } from '@/shared/validation';
import { appVersion } from '@/shared/version';
import { createRandom } from '@/domain/random/seeded';
import type { Dataset, Sample } from '@/domain/data/types';
import { splitDataset } from '@/domain/data/split';
import { exportDatasetJson } from '@/application/data/json-files';
import { defaultSpec } from '@/domain/network/model';
import { defaultOptimizer } from '@/domain/training/optimizer';
import { prepareBoundedStudy } from './study-budget';
import { trainStudyRun } from './study-run';
import { prepareExperiment } from './experiment';
import { evaluateChunks } from '@/domain/training/session';
import { exhaust } from '@/domain/training/kernel';
import { transformRow } from '@/domain/data/pipeline';
export const shiftOptions = z.strictObject({
  kind: z.enum(['covariate', 'concept', 'serving']),
  severity: z.number().finite().min(0).max(1),
  seed: z.number().int().min(0).max(0xffffffff),
  epochs: z.number().int().min(5).max(120),
  rate: z.number().finite().min(0.001).max(0.1),
  hypothesis: z.string().max(2000),
});
export type ShiftOptions = z.infer<typeof shiftOptions>;
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
export function shiftScenario(raw: ShiftOptions) {
  const options = shiftOptions.parse(raw),
    rng = createRandom(options.seed, 'distribution-shift-v1');
  const latent = Array.from({ length: 240 }, () => ({
    u: rng.uniform(),
    v: rng.uniform(),
    label: rng.uniform(),
  }));
  const dataset: Dataset = {
    id: `shift-v1-${options.seed}`,
    revision: 1,
    task: 'binary',
    classOrder: ['0', '1'],
    targetName: 'Clase',
    features: [
      { id: 'x1', name: 'x₁', kind: 'numeric' },
      { id: 'x2', name: 'x₂', kind: 'numeric' },
    ],
    rows: latent.map((l, i) => {
      const x1 = 2 * l.u - 1,
        x2 = 2 * l.v - 1;
      return {
        id: `s-${i + 1}`,
        features: { x1, x2 },
        target: String(Number(l.label < sigmoid(6 * x1))),
        origin: 'generated',
      };
    }),
  };
  const split = splitDataset(dataset, {
    strategy: 'random',
    seed: options.seed,
    ratios: [0.6, 0.2, 0.2],
  });
  const validation = new Set(split.validation);
  const pairs = dataset.rows.flatMap((row, i) => {
    if (!validation.has(row.id)) return [];
    const l = latent[i]!,
      originalX = Number(row.features.x1),
      x2 = Number(row.features.x2),
      s = options.severity;
    const x1 =
      options.kind === 'covariate'
        ? 2 * l.u ** (1 / (1 + 3 * s)) - 1
        : options.kind === 'serving'
          ? (1 + 4 * s) * originalX + 0.5 * s
          : originalX;
    const conditional =
      options.kind === 'concept'
        ? sigmoid(6 * (Math.cos(s * Math.PI) * originalX + Math.sin(s * Math.PI) * x2))
        : options.kind === 'covariate'
          ? sigmoid(6 * x1)
          : sigmoid(6 * originalX);
    const changed: Sample = {
      ...row,
      features: { x1, x2 },
      target: options.kind === 'serving' ? row.target : String(Number(l.label < conditional)),
    };
    return [
      {
        id: row.id,
        original: row,
        changed,
        conditionalBefore: sigmoid(6 * originalX),
        conditionalAfter: conditional,
      },
    ];
  });
  const lookup = new Map(pairs.map((p) => [p.id, p.changed]));
  const shifted: Dataset = {
    ...dataset,
    id: `shifted-${options.kind}-${options.seed}`,
    rows: dataset.rows.map((row) => lookup.get(row.id) ?? row),
  };
  return { options, dataset, split, shifted, pairs };
}
export function compareDistributionShift(raw: ShiftOptions) {
  const scenario = shiftScenario(raw),
    { options, dataset, split } = scenario;
  const config = {
    spec: { ...defaultSpec, hidden: [8, 8] },
    seed: options.seed,
    initialization: 'xavier' as const,
    optimizer: { ...defaultOptimizer, rate: options.rate },
    epochs: options.epochs,
    batchSize: 12,
    loss: 'mse' as const,
  };
  const pipelineOptions = {
    featureIds: ['x1', 'x2'],
    imputation: 'mean' as const,
    scaling: 'standard' as const,
    missingIndicators: false,
  };
  const bounded = prepareBoundedStudy(exportDatasetJson(dataset, split), config, pipelineOptions);
  const run = trainStudyRun(
    dataset,
    split,
    config,
    'Modelo antes de la deriva',
    pipelineOptions,
    false,
  );
  const prepared = prepareExperiment(run.experiment),
    model = run.experiment.checkpoint.model;
  function evaluate(rows: Sample[]) {
    return exhaust(
      evaluateChunks(
        model,
        {
          ids: rows.map((r) => r.id),
          x: rows.map((r) => transformRow(r, prepared.prepared.pipeline)),
          y: rows.map((r) => Number(r.target)),
        },
        config.loss,
      ),
    );
  }
  const baseline = evaluate(scenario.pairs.map((p) => p.original)),
    shifted = evaluate(scenario.pairs.map((p) => p.changed));
  return {
    ...scenario,
    run,
    pipeline: prepared.prepared.pipeline,
    baseline,
    changed: shifted,
    budget: bounded.budget,
    delta: { loss: shifted.loss - baseline.loss, accuracy: shifted.score - baseline.score },
    testEvaluatedInStudy: false as const,
  };
}
export type ShiftResult = ReturnType<typeof compareDistributionShift>;
export function exportDistributionShift(r: ShiftResult) {
  return JSON.stringify(
    {
      format: 'neural-atlas.distribution-shift-report',
      schemaVersion: 1,
      appVersion,
      options: r.options,
      rule: 'P(y=1|x)=sigmoid(6*x1)',
      changedRule:
        r.options.kind === 'concept'
          ? 'sigmoid(6*(cos(pi*s)*x1+sin(pi*s)*x2))'
          : r.options.kind === 'serving'
            ? 'served x1=(1+4*s)*physical x1+0.5*s; labels from physical x1'
            : 'x1=2*u^(1/(1+3*s))-1; same conditional rule',
      pipelineRefitted: false,
      provenance: {
        dataHash: r.split.dataHash,
        splitHash: r.split.splitHash,
        pipelineHash: r.run.experiment.pipelineHash,
      },
      pairs: r.pairs,
      baseline: r.baseline,
      changed: r.changed,
      delta: r.delta,
      budget: r.budget,
      testEvaluatedInStudy: false,
    },
    null,
    2,
  );
}

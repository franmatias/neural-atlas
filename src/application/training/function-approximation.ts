import { z } from '@/shared/validation';
import {
  functionKinds,
  functionValue,
  functionContributions,
  type FunctionKind,
} from '@/domain/network/function-approximation';
import { createRandom } from '@/domain/random/seeded';
import { type Dataset, type DataSplit } from '@/domain/data/types';
import { validateDataset } from '@/domain/data/validation';
import { splitDataset } from '@/domain/data/split';
import { fitPipeline, transformRow, type PipelineState } from '@/domain/data/pipeline';
import { defaultSpec, parameterCount } from '@/domain/network/model';
import { defaultOptimizer } from '@/domain/training/optimizer';
import {
  initialSession,
  advanceBatch,
  cloneState,
  type TrainingState,
  type TrainingConfig,
  type EpochPoint,
} from '@/domain/training/session';
import { exhaust } from '@/domain/training/kernel';
import { trainingBudget } from '@/domain/training/budget';
import { trainingSource } from './source';
import { captureExperiment, exportExperiment } from './experiment';
import { appVersion } from '@/shared/version';
import { hashValue } from '@/domain/data/integrity';
export const functionWidths = [1, 2, 8, 32] as const;
export const functionOptionsSchema = z.strictObject({
  kind: z.enum(functionKinds),
  width: z.union([z.literal(1), z.literal(2), z.literal(8), z.literal(32)]),
  compare: z.boolean(),
  activation: z.enum(['tanh', 'relu', 'sigmoid', 'linear']),
  seed: z.number().int().min(0).max(4294967295),
  noise: z.number().finite().min(0).max(0.3),
  epochs: z.number().int().min(5).max(120),
  rate: z.number().finite().min(0.001).max(0.1),
  hypothesis: z.string().max(2000),
});
export type FunctionOptions = z.infer<typeof functionOptionsSchema>;
export const defaultFunctionOptions: FunctionOptions = {
  kind: 'sine',
  width: 8,
  compare: false,
  activation: 'tanh',
  seed: 42,
  noise: 0,
  epochs: 60,
  rate: 0.02,
  hypothesis: '',
};
export function functionDataset(raw: FunctionOptions): { dataset: Dataset; split: DataSplit } {
  const options = functionOptionsSchema.parse(raw),
    positions = createRandom(options.seed, 'function-inputs'),
    noise = createRandom(options.seed, 'function-noise');
  const dataset: Dataset = {
    id: 'function-lab',
    revision: 1,
    task: 'regression',
    features: [{ id: 'x', name: 'x', kind: 'numeric' }],
    targetName: 'f(x) observado',
    rows: Array.from({ length: 240 }, (_, i) => {
      const x = 2 * positions.uniform() - 1,
        clean = functionValue(options.kind, x);
      return {
        id: `function-${i}`,
        features: { x },
        target: clean + options.noise * noise.normal(),
        origin: 'generated',
        annotation: { defects: options.noise ? ['noise'] : [], cleanTarget: clean },
      };
    }),
  };
  validateDataset(dataset);
  return {
    dataset,
    split: splitDataset(dataset, {
      strategy: 'random',
      seed: options.seed,
      ratios: [0.6, 0.2, 0.2],
    }),
  };
}
export interface FunctionCurvePoint {
  x: number;
  target: number;
  prediction: number;
  contributions: number[];
}
export interface FunctionSnapshot {
  checkpoint: TrainingState;
  point: EpochPoint;
  curve: FunctionCurvePoint[];
  gridMse: number;
  gridMax: number;
  nearZeroError: number;
  jumpLowerBound: number | null;
}
export interface FunctionRun {
  width: number;
  config: TrainingConfig;
  budget: ReturnType<typeof trainingBudget>;
  snapshots: FunctionSnapshot[];
}
export interface FunctionResult {
  options: FunctionOptions;
  recipeVersion: 1;
  dataset: Dataset;
  split: DataSplit;
  pipeline: PipelineState;
  runs: FunctionRun[];
  estimatedOperations: number;
  estimatedNumericBytes: number;
  testEvaluated: false;
}
function snapshot(state: TrainingState, kind: FunctionKind): FunctionSnapshot {
  const curve = Array.from({ length: 241 }, (_, i) => {
    const x = i / 120 - 1,
      parts = functionContributions(state.model, x);
    return {
      x,
      target: functionValue(kind, x),
      prediction: parts.prediction,
      contributions: parts.terms.map((t) => t.contribution),
    };
  });
  const zero = curve[120]!.prediction;
  return {
    checkpoint: cloneState(state),
    point: { ...state.history.at(-1)! },
    curve,
    gridMse: curve.reduce((s, p) => s + (p.prediction - p.target) ** 2 / curve.length, 0),
    gridMax: curve.reduce((m, p) => Math.max(m, Math.abs(p.prediction - p.target)), 0),
    nearZeroError: curve
      .filter((p) => Math.abs(p.x) <= 0.1 + Number.EPSILON)
      .reduce((m, p) => Math.max(m, Math.abs(p.prediction - p.target)), 0),
    jumpLowerBound: kind === 'step' ? Math.max(Math.abs(zero), Math.abs(zero - 1)) : null,
  };
}
export function approximateFunction(raw: FunctionOptions): FunctionResult {
  const options = functionOptionsSchema.parse(raw),
    { dataset, split } = functionDataset(options);
  const pipeline = fitPipeline(dataset, split, {
    featureIds: ['x'],
    imputation: 'mean',
    scaling: 'none',
    missingIndicators: false,
  });
  const prepared = { pipeline, matrix: dataset.rows.map((row) => transformRow(row, pipeline)) };
  const plans = (options.compare ? functionWidths : [options.width]).map((width) => {
    const config: TrainingConfig = {
      spec: {
        ...defaultSpec,
        inputs: 1,
        hidden: [width],
        task: 'regression',
        activation: options.activation,
      },
      seed: options.seed,
      initialization: options.activation === 'relu' ? 'he' : 'xavier',
      optimizer: { ...defaultOptimizer, kind: 'adam', rate: options.rate },
      epochs: options.epochs,
      batchSize: 16,
      loss: 'mse',
    };
    const source = trainingSource(dataset, split, prepared, config);
    return { width, config: source.input.config, source, budget: trainingBudget(source.input) };
  });
  const estimatedOperations = plans.reduce((s, p) => s + p.budget.upper, 0);
  const estimatedNumericBytes = plans.reduce(
    (s, p) => s + p.budget.numericBytes * 13 + (p.width + 3) * 241 * 13 * 8,
    0,
  );
  if (
    estimatedOperations > 2e8 ||
    estimatedNumericBytes > 32 * 1024 * 1024 ||
    plans.some((p) => parameterCount(p.config.spec) > 97)
  )
    throw new RangeError('STUDY_BUDGET');
  const runs = plans.map((plan) => {
    let state = exhaust(initialSession(plan.source.input));
    const snapshots = [snapshot(state, options.kind)],
      interval = Math.ceil(options.epochs / 12);
    while (state.epoch < options.epochs) {
      state = exhaust(advanceBatch(state, plan.source.input));
      if (state.cursor === 0 && (state.epoch % interval === 0 || state.epoch === options.epochs))
        snapshots.push(snapshot(state, options.kind));
    }
    return { width: plan.width, config: plan.config, budget: plan.budget, snapshots };
  });
  return {
    options,
    recipeVersion: 1,
    dataset,
    split,
    pipeline,
    runs,
    estimatedOperations,
    estimatedNumericBytes,
    testEvaluated: false,
  };
}
export function functionExperiment(
  result: FunctionResult,
  runIndex: number,
  snapshotIndex: number,
) {
  const run = result.runs[runIndex],
    snap = run?.snapshots[snapshotIndex];
  if (!run || !snap || !Number.isInteger(runIndex) || !Number.isInteger(snapshotIndex))
    throw new RangeError('FUNCTION_SELECTION');
  return captureExperiment(
    result.dataset,
    result.split,
    result.pipeline.options,
    hashValue(result.pipeline),
    run.config,
    snap.checkpoint,
    0.5,
    1,
    false,
  );
}
export function exportFunctionReport(
  result: FunctionResult,
  selection: { run: number; snapshot: number; x: number },
  reflection: string,
) {
  functionExperiment(result, selection.run, selection.snapshot);
  functionValue(result.options.kind, selection.x);
  return JSON.stringify(
    {
      format: 'neural-atlas.function-approximation-report',
      schemaVersion: 1,
      appVersion,
      options: result.options,
      recipeVersion: result.recipeVersion,
      selection,
      reflection: reflection.slice(0, 4000),
      dataHash: result.split.dataHash,
      split: result.split,
      pipelineHash: hashValue(result.pipeline),
      estimatedOperations: result.estimatedOperations,
      estimatedNumericBytes: result.estimatedNumericBytes,
      testEvaluated: false,
      grid: { count: 241, domain: [-1, 1], target: 'clean analytic function, not holdout test' },
      runs: result.runs.map((run, index) => ({
        width: run.width,
        config: run.config,
        budget: run.budget,
        snapshots: run.snapshots.map((s) => ({
          epoch: s.checkpoint.epoch,
          update: s.checkpoint.updates,
          point: s.point,
          curve: s.curve,
          gridMse: s.gridMse,
          gridMax: s.gridMax,
          nearZeroError: s.nearZeroError,
          jumpLowerBound: s.jumpLowerBound,
          model: {
            spec: s.checkpoint.model.spec,
            layers: s.checkpoint.model.layers.map((l) => ({
              inputs: l.inputs,
              outputs: l.outputs,
              activation: l.activation,
              weights: Array.from(l.weights),
              biases: Array.from(l.biases),
            })),
          },
        })),
        finalExperiment: JSON.parse(
          exportExperiment(functionExperiment(result, index, run.snapshots.length - 1)),
        ) as unknown,
      })),
    },
    null,
    2,
  );
}

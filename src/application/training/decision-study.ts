import { generateDataset } from '@/domain/data/generate';
import { defaultGenerator, type Dataset, type Sample } from '@/domain/data/types';
import { createRandom } from '@/domain/random/seeded';
import { splitDataset } from '@/domain/data/split';
import { fitPipeline, transformRow } from '@/domain/data/pipeline';
import { defaultSpec } from '@/domain/network/model';
import { defaultOptimizer } from '@/domain/training/optimizer';
import { trainingSource } from './source';
import type { TrainActivation } from '@/domain/network/model';
export type DecisionMode = 'binary' | 'multiclass';
export interface DecisionOptions {
  recipe: string;
  classes: number;
  noise: number;
  seed: number;
  hidden: number[];
  activation: TrainActivation;
  optimizer: 'sgd' | 'momentum' | 'rmsprop' | 'adam';
  rate: number;
  l2: number;
  batchSize: number;
  epochs: number;
}
export const binaryRecipes = ['clouds', 'moons', 'circles', 'xor', 'spirals'] as const;
export const multiRecipes = ['blobs', 'rings', 'sectors', 'spirals'] as const;
export const decisionRecipeNames: Record<string, string> = {
  clouds: 'Nubes separables',
  moons: 'Dos lunas',
  circles: 'Círculos concéntricos',
  xor: 'XOR',
  spirals: 'Espirales',
  blobs: 'Nubes por clase',
  rings: 'Anillos por clase',
  sectors: 'Sectores',
};
export function defaultDecisionOptions(mode: DecisionMode): DecisionOptions {
  return {
    recipe: mode === 'binary' ? 'moons' : 'blobs',
    classes: mode === 'binary' ? 2 : 4,
    noise: 0.08,
    seed: 42,
    hidden: [8, 8],
    activation: 'tanh',
    optimizer: 'adam',
    rate: 0.02,
    l2: 0,
    batchSize: 16,
    epochs: 400,
  };
}
export function decisionDataset(mode: DecisionMode, options: DecisionOptions): Dataset {
  if (
    !Number.isFinite(options.noise) ||
    options.noise < 0 ||
    options.noise > 0.4 ||
    !Number.isInteger(options.classes) ||
    (mode === 'binary' ? options.classes !== 2 : ![3, 4].includes(options.classes))
  )
    throw new RangeError('DECISION_OPTIONS');
  if (mode === 'binary') {
    if (!(binaryRecipes as readonly string[]).includes(options.recipe))
      throw new RangeError('DECISION_RECIPE');
    return generateDataset({
      ...defaultGenerator,
      recipe: options.recipe as (typeof binaryRecipes)[number],
      count: 240,
      seed: options.seed,
      noise: options.noise,
    });
  }
  if (!(multiRecipes as readonly string[]).includes(options.recipe))
    throw new RangeError('DECISION_RECIPE');
  const rng = createRandom(options.seed, 'decision-multiclass-v1');
  const rows: Sample[] = Array.from({ length: 240 }, (_, i) => {
    const c = i % options.classes,
      angle = (c * 2 * Math.PI) / options.classes;
    let x: number, y: number;
    if (options.recipe === 'blobs') {
      x = Math.cos(angle) * 0.85 + rng.normal() * (0.12 + options.noise);
      y = Math.sin(angle) * 0.85 + rng.normal() * (0.12 + options.noise);
    } else {
      const u = rng.uniform();
      const radius =
        options.recipe === 'rings' ? 0.2 + c * 0.3 + 0.06 * u : 0.15 + 1.1 * Math.sqrt(u);
      const a =
        options.recipe === 'sectors'
          ? angle + rng.uniform() * ((2 * Math.PI) / options.classes - 0.15)
          : options.recipe === 'spirals'
            ? angle + radius * 4.5
            : rng.uniform() * Math.PI * 2;
      x = radius * Math.cos(a) + rng.normal() * options.noise;
      y = radius * Math.sin(a) + rng.normal() * options.noise;
    }
    return { id: `v-${i + 1}`, features: { x1: x, x2: y }, target: String(c), origin: 'generated' };
  });
  return {
    id: `visual-${options.recipe}-v1-${options.seed}`,
    revision: 1,
    task: 'multiclass',
    classOrder: Array.from({ length: options.classes }, (_, i) => String(i)),
    targetName: 'Clase',
    features: [
      { id: 'x1', name: 'x₁', kind: 'numeric' },
      { id: 'x2', name: 'x₂', kind: 'numeric' },
    ],
    rows,
  };
}
export function prepareDecisionStudy(
  mode: DecisionMode,
  options: DecisionOptions,
  manual: Sample[] = [],
) {
  if (
    manual.length > 40 ||
    options.hidden.length > 3 ||
    options.hidden.some((n) => !Number.isInteger(n) || n < 1 || n > 16) ||
    options.epochs > 500
  )
    throw new RangeError('DECISION_BUDGET');
  const dataset = decisionDataset(mode, options);
  dataset.rows.push(...structuredClone(manual));
  const split = splitDataset(dataset, {
    strategy: 'stratified',
    seed: options.seed,
    ratios: [0.6, 0.2, 0.2],
  });
  const pipeline = fitPipeline(dataset, split, {
    featureIds: ['x1', 'x2'],
    imputation: 'mean',
    scaling: 'standard',
    missingIndicators: false,
  });
  const prepared = { pipeline, matrix: dataset.rows.map((row) => transformRow(row, pipeline)) };
  const source = trainingSource(dataset, split, prepared, {
    spec: {
      ...defaultSpec,
      task: mode,
      classes: options.classes,
      hidden: [...options.hidden],
      activation: options.activation,
    },
    seed: options.seed,
    initialization: 'xavier',
    optimizer: { ...defaultOptimizer, kind: options.optimizer, rate: options.rate },
    epochs: options.epochs,
    batchSize: options.batchSize,
    loss: 'mse',
    regularization: { l1: 0, l2: options.l2, clipNorm: 0 },
  });
  return { dataset, split, prepared, source };
}

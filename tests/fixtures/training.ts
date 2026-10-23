import { generateDataset } from '@/domain/data/generate';
import { defaultGenerator, type RecipeId } from '@/domain/data/types';
import { splitDataset } from '@/domain/data/split';
import { fitPipeline, transformRow } from '@/domain/data/pipeline';
import { defaultSpec } from '@/domain/network/model';
import { defaultOptimizer } from '@/domain/training/optimizer';
import { trainingSource } from '@/application/training/source';
export function trainingFixture(recipe: RecipeId = 'moons', count = 80) {
  const dataset = generateDataset({ ...defaultGenerator, recipe, count });
  const split = splitDataset(dataset, {
    strategy: dataset.task === 'regression' ? 'random' : 'stratified',
    seed: 42,
    ratios: [0.7, 0.15, 0.15],
  });
  const pipeline = fitPipeline(dataset, split, {
    featureIds: dataset.features.map((f) => f.id),
    scaling: 'standard',
    imputation: 'mean',
    missingIndicators: false,
  });
  const prepared = { pipeline, matrix: dataset.rows.map((row) => transformRow(row, pipeline)) };
  const config = {
    spec: { ...defaultSpec, hidden: [4] },
    seed: 42,
    initialization: 'xavier' as const,
    optimizer: { ...defaultOptimizer },
    epochs: 4,
    batchSize: 8,
    loss: 'mse' as const,
  };
  return { ...trainingSource(dataset, split, prepared, config), dataset, split, prepared, config };
}

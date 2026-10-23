import { trainingFixture } from './training';
import { splitDataset } from '@/domain/data/split';
import { fitPipeline, transformRow, type Scaling } from '@/domain/data/pipeline';
import { trainingSource } from '@/application/training/source';
import { initialSession, advanceBatch } from '@/domain/training/session';
import { exhaust } from '@/domain/training/kernel';
import { captureExperiment } from '@/application/training/experiment';
import { modelFromExperiment } from '@/application/training/inference-model';
export function inferenceFixture(
  recipe: 'moons' | 'flowers' | 'sine' = 'moons',
  categorical = false,
  scaling: Scaling = 'standard',
) {
  const f = trainingFixture(recipe),
    dataset = f.dataset;
  if (categorical) {
    dataset.features.push({ id: 'zone', name: 'Zona', kind: 'categorical' });
    dataset.rows.forEach((row, index) => {
      row.features.zone = index % 2 ? 'interior' : 'costa';
      row.features[dataset.features[0]!.id] = 7;
    });
  }
  const split = splitDataset(dataset, {
    strategy: dataset.task === 'regression' ? 'random' : 'stratified',
    ratios: [0.7, 0.15, 0.15],
    seed: 42,
  });
  const pipeline = fitPipeline(dataset, split, {
    featureIds: dataset.features.map((feature) => feature.id),
    scaling,
    imputation: 'mean',
    missingIndicators: categorical,
  });
  const prepared = { pipeline, matrix: dataset.rows.map((row) => transformRow(row, pipeline)) };
  const source = trainingSource(dataset, split, prepared, f.config);
  const state = exhaust(advanceBatch(exhaust(initialSession(source.input)), source.input));
  const experiment = captureExperiment(
    dataset,
    split,
    pipeline.options,
    source.input.pipelineHash,
    source.input.config,
    state,
    0.7,
    0,
    false,
  );
  return {
    dataset,
    split,
    prepared,
    input: source.input,
    experiment,
    model: modelFromExperiment(experiment),
  };
}

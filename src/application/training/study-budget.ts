import { importDatasetJson } from '@/application/data/json-files';
import { fitPipeline, transformRow, type PipelineOptions } from '@/domain/data/pipeline';
import type { TrainingConfig } from '@/domain/training/session';
import { trainingSource } from './source';
import { trainingBudget } from '@/domain/training/budget';
export function prepareBoundedStudy(
  datasetJson: string,
  config: TrainingConfig,
  options: PipelineOptions,
  runs = 1,
) {
  const { dataset, split } = importDatasetJson(datasetJson);
  if (
    !split ||
    dataset.rows.length > 1000 ||
    config.epochs > 120 ||
    !Number.isInteger(runs) ||
    runs < 1 ||
    runs > 10
  )
    throw new RangeError('STUDY_BUDGET');
  const pipeline = fitPipeline(dataset, split, options);
  const source = trainingSource(
    dataset,
    split,
    { pipeline, matrix: dataset.rows.map((row) => transformRow(row, pipeline)) },
    config,
  );
  const budget = trainingBudget(source.input);
  if (
    budget.parameters > 5000 ||
    budget.upper * runs > 2e8 ||
    budget.numericBytes * runs > 32 * 1024 * 1024
  )
    throw new RangeError('STUDY_BUDGET');
  return { dataset, split, pipeline, source, budget };
}

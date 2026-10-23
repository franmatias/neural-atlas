import { datasetHash, hashValue } from '@/domain/data/integrity';
import { validateSplit, splitWarnings } from '@/domain/data/split';
import { validateDataset } from '@/domain/data/validation';
import type { Dataset, DataSplit } from '@/domain/data/types';
import type { PipelineState } from '@/domain/data/pipeline';
import {
  validateTraining,
  type TrainingConfig,
  type TrainingInput,
  type Samples,
} from '@/domain/training/session';
/** The test rows stay with the controller and are never included in INIT. */
export function trainingSource(
  dataset: Dataset,
  split: DataSplit,
  prepared: { pipeline: PipelineState; matrix: number[][] },
  config: TrainingConfig,
) {
  validateDataset(dataset);
  validateSplit(dataset, split);
  if (splitWarnings(split).blocked) throw new RangeError('SUPPORT');
  const pipeline = prepared.pipeline;
  if (
    pipeline.dataHash !== datasetHash(dataset) ||
    pipeline.splitHash !== split.splitHash ||
    pipeline.fittedOn.split !== 'train' ||
    pipeline.fittedOn.idsHash !== hashValue(split.train) ||
    prepared.matrix.length !== dataset.rows.length
  )
    throw new RangeError('PIPELINE');
  const lookup = new Map(
    dataset.rows.map((row, index) => [row.id, { row, x: prepared.matrix[index]! }]),
  );
  const classOrder = dataset.task === 'regression' ? [] : dataset.classOrder!;
  function samples(ids: string[]): Samples {
    const rows = ids.map((id) => lookup.get(id)!);
    if (
      rows.some(
        ({ row, x }) =>
          row.target === null ||
          x.length !== pipeline.outputFeatureIds.length ||
          x.some((value) => !Number.isFinite(value)),
      )
    )
      throw new RangeError('INVALID_DATA');
    return {
      ids: [...ids],
      x: rows.map(({ x }) => [...x]),
      y: rows.map(({ row }) =>
        dataset.task === 'regression' ? Number(row.target) : classOrder.indexOf(String(row.target)),
      ),
    };
  }
  const input: TrainingInput = {
    train: samples(split.train),
    validation: samples(split.validation),
    config: {
      ...config,
      optimizer: { ...config.optimizer },
      spec: {
        ...config.spec,
        hidden: [...config.spec.hidden],
        inputs: pipeline.outputFeatureIds.length,
        task: dataset.task,
        classes: Math.max(2, classOrder.length),
      },
    },
    dataHash: split.dataHash,
    splitHash: split.splitHash,
    pipelineHash: hashValue(pipeline),
    classOrder: [...classOrder],
  };
  validateTraining(input);
  return {
    input,
    test: samples(split.test),
    labels: [...pipeline.outputLabels],
    unstable: splitWarnings(split).unstable,
  };
}

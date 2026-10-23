import { generateDataset } from '@/domain/data/generate';
import { inspectNetwork } from '@/domain/network/inspection';
import { trainPerceptron, solveXor } from '@/domain/network/learning';
import type { Network } from '@/domain/network/model';
import { splitDataset } from '@/domain/data/split';
import {
  fitPipeline,
  transformRow,
  type PipelineOptions,
  type PipelineState,
} from '@/domain/data/pipeline';
import {
  DataError,
  type Dataset,
  type DataSplit,
  type GeneratorOptions,
  type SplitOptions,
  type Task,
} from '@/domain/data/types';
import { exportDatasetJson, importDatasetJson } from './json-files';
import {
  exportDatasetCsv,
  mapCsv,
  previewCsv,
  type ColumnMapping,
  type CsvPreview,
} from './csv-files';
export interface JobPayloads {
  inspectNetwork: {
    model: Network;
    input: number[];
    target: number;
    layer: number;
    neuron: number;
  };
  perceptron: { inputs: number[][]; targets: number[]; seed: number; rate: number; epochs: number };
  solveXor: { seed: number; epochs: number };
  generate: GeneratorOptions;
  split: { dataset: Dataset; options: SplitOptions };
  fit: { dataset: Dataset; split: DataSplit; options: PipelineOptions };
  previewCsv: { text: string; delimiter: string };
  mapCsv: {
    preview: CsvPreview;
    mapping: ColumnMapping[];
    task: Task;
    decimal: '.' | ',';
    excludeInvalid: boolean;
  };
  importJson: { text: string };
  export: { dataset: Dataset; split?: DataSplit; format: 'csv' | 'json'; delimiter: string };
}
export interface JobResults {
  inspectNetwork: ReturnType<typeof inspectNetwork>;
  perceptron: ReturnType<typeof trainPerceptron>;
  solveXor: ReturnType<typeof solveXor>;
  generate: Dataset;
  split: DataSplit;
  fit: { pipeline: PipelineState; matrix: number[][] };
  previewCsv: CsvPreview;
  mapCsv: ReturnType<typeof mapCsv>;
  importJson: ReturnType<typeof importDatasetJson>;
  export: { text: string; protectedCount: number; format: 'csv' | 'json' };
}
export type DataJob = {
  [K in keyof JobPayloads]: { kind: K; payload: JobPayloads[K] };
}[keyof JobPayloads];
export type DataResponse =
  | { id: number; ok: true; result: JobResults[keyof JobResults] }
  | { id: number; ok: false; code: DataError['code']; detail: string };
export function executeDataJob(job: DataJob): JobResults[keyof JobResults] {
  switch (job.kind) {
    case 'inspectNetwork': {
      const p = job.payload;
      return inspectNetwork(p.model, p.input, p.target, p.layer, p.neuron);
    }
    case 'perceptron': {
      const p = job.payload;
      return trainPerceptron(p.inputs, p.targets, p.seed, p.rate, p.epochs);
    }
    case 'solveXor':
      return solveXor(job.payload.seed, job.payload.epochs);
    case 'generate':
      return generateDataset(job.payload);
    case 'split':
      return splitDataset(job.payload.dataset, job.payload.options);
    case 'fit': {
      const pipeline = fitPipeline(job.payload.dataset, job.payload.split, job.payload.options);
      return {
        pipeline,
        matrix: job.payload.dataset.rows.map((row) => transformRow(row, pipeline)),
      };
    }
    case 'previewCsv':
      return previewCsv(job.payload.text, job.payload.delimiter);
    case 'mapCsv': {
      const p = job.payload;
      return mapCsv(p.preview, p.mapping, p.task, p.decimal, p.excludeInvalid);
    }
    case 'importJson':
      return importDatasetJson(job.payload.text);
    case 'export':
      return {
        ...(job.payload.format === 'csv'
          ? exportDatasetCsv(job.payload.dataset, job.payload.delimiter)
          : { text: exportDatasetJson(job.payload.dataset, job.payload.split), protectedCount: 0 }),
        format: job.payload.format,
      };
    default:
      throw new DataError('OPTIONS');
  }
}
export function handleDataJob(id: number, job: DataJob): DataResponse {
  try {
    return { id, ok: true, result: executeDataJob(job) };
  } catch (error) {
    return {
      id,
      ok: false,
      code: error instanceof DataError ? error.code : 'INTERNAL',
      detail: error instanceof DataError ? error.detail : '',
    };
  }
}

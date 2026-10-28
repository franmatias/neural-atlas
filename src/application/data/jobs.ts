import {
  permutationStudy,
  type PermutationOptions,
  type PermutationResult,
} from '@/application/training/permutation';
import {
  prepareGrid,
  runGridTrial,
  type GridOptions,
  type GridPlan,
  type GridMeasurement,
} from '@/application/training/grid-search';
import {
  compareClassical,
  type ClassicalOptions,
  type ClassicalResult,
} from '@/application/training/classical-comparison';
import { importEstimator, predictEstimatorFile } from '@/application/training/classical-files';
import { previewTeachingPack } from '@/application/content/teaching-packs';
import { correlateImage, type VisionInput, type VisionResult } from '@/domain/network/vision';
import { previewConceptPack, type CatalogContext } from '@/application/content/concept-packs';
import {
  studyLandscape,
  type LandscapeRequest,
  type LandscapeResult,
} from '@/application/training/landscape';
import {
  predictionDispersion,
  type DispersionOptions,
  type DispersionResult,
} from '@/application/training/prediction-dispersion';
import {
  generateAuditCohort,
  type AuditCohort,
  type AuditScenarioOptions,
} from '@/application/training/group-audit';
import {
  approximateFunction,
  type FunctionOptions,
  type FunctionResult,
} from '@/application/training/function-approximation';
import {
  compareDistributionShift,
  type ShiftOptions,
  type ShiftResult,
} from '@/application/training/distribution-shift';
import { generateDataset } from '@/domain/data/generate';
import {
  compareModels,
  type PairedComparisonOptions,
  type PairedComparisonResult,
} from '@/application/training/paired-comparison';
import {
  crossValidate,
  type CrossValidationOptions,
  type CrossValidationResult,
} from '@/application/training/cross-validation';
import {
  compareCapacity,
  type CapacityOptions,
  type CapacityResult,
} from '@/application/training/capacity';
import {
  compareMultiseed,
  type MultiseedOptions,
  type MultiseedResult,
} from '@/application/training/multiseed';
import { inspectNetwork } from '@/domain/network/inspection';
import { trainPerceptron, solveXor } from '@/domain/network/learning';
import type { Network } from '@/domain/network/model';
import { runWorkshop } from '@/application/workshops/experiments';
import {
  compareGeneralization,
  type GeneralizationOptions,
  type GeneralizationResult,
} from '@/application/training/generalization';
import type { WorkshopEvidence, WorkshopOptions } from '@/application/workshops/contracts';
import {
  importInferenceModel,
  exportInferenceModel,
  predictWithModel,
  type InferenceModel,
} from '@/application/training/inference-model';
import type { Cell } from '@/domain/data/types';
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
  permutation: PermutationOptions;
  gridPlan: GridOptions;
  gridTrial: { options: GridOptions; planHash: string; id: number };
  classicalComparison: ClassicalOptions;
  classicalFile: { text: string };
  classicalFilePredict: { text: string; features: Record<string, Cell> };
  classicalProbe: { artifacts: ClassicalResult['artifacts']; features: Record<string, Cell> };

  teachingPack: { text: string };
  conceptPack: { text: string; context: CatalogContext };
  vision: VisionInput;
  landscape: LandscapeRequest;
  groupAudit: AuditScenarioOptions;
  functionApproximation: FunctionOptions;
  dispersion: DispersionOptions;
  shift: ShiftOptions;
  abComparison: PairedComparisonOptions;
  crossValidation: CrossValidationOptions;
  capacity: CapacityOptions;
  multiseed: MultiseedOptions;
  generalization: GeneralizationOptions;
  workshop: { caseId: WorkshopEvidence['caseId']; options: WorkshopOptions };
  importModel: { text: string };
  exportModel: { model: InferenceModel };
  predictModel: { model: InferenceModel; values: Record<string, Cell> };
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
  permutation: PermutationResult;
  gridPlan: GridPlan;
  gridTrial: GridMeasurement;
  classicalComparison: ClassicalResult;
  classicalFile: ReturnType<typeof inspectEstimator>;
  classicalFilePredict: ReturnType<typeof predictEstimatorFile>;
  classicalProbe: ReturnType<typeof probeEstimators>;

  teachingPack: ReturnType<typeof previewTeachingPack>;
  conceptPack: ReturnType<typeof previewConceptPack>;
  vision: VisionResult;
  landscape: LandscapeResult;
  groupAudit: AuditCohort;
  functionApproximation: FunctionResult;
  dispersion: DispersionResult;
  shift: ShiftResult;
  abComparison: PairedComparisonResult;
  crossValidation: CrossValidationResult;
  capacity: CapacityResult;
  multiseed: MultiseedResult;
  generalization: GeneralizationResult;
  workshop: WorkshopEvidence;
  importModel: InferenceModel;
  exportModel: string;
  predictModel: ReturnType<typeof predictWithModel>;
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
function inspectEstimator(text: string) {
  const fit = importEstimator(text);
  const features = fit.trainingDataset.rows[0]!.features;
  return {
    family: fit.model.family,
    task: fit.trainingDataset.task,
    classes: fit.trainingDataset.classOrder ?? [],
    features: fit.trainingDataset.features,
    firstFeatures: features,
    provenance: fit.provenance,
    prediction: predictEstimatorFile(text, features),
  };
}
function probeEstimators(p: JobPayloads['classicalProbe']) {
  const model = importInferenceModel(p.artifacts.mlp),
    features = Object.fromEntries(model.features.map((f) => [f.id, p.features[f.id]!]));
  return {
    knn: predictEstimatorFile(p.artifacts.knn, p.features),
    cart: predictEstimatorFile(p.artifacts.cart, p.features),
    mlp: predictWithModel(model, features),
    features: p.features,
  };
}
export function executeDataJob(job: DataJob): JobResults[keyof JobResults] {
  switch (job.kind) {
    case 'permutation':
      return permutationStudy(job.payload);
    case 'gridPlan':
      return prepareGrid(job.payload);
    case 'gridTrial':
      return runGridTrial(job.payload.options, job.payload.planHash, job.payload.id);
    case 'classicalComparison':
      return compareClassical(job.payload);
    case 'classicalFilePredict':
      return predictEstimatorFile(job.payload.text, job.payload.features);
    case 'classicalFile':
      return inspectEstimator(job.payload.text);
    case 'classicalProbe':
      return probeEstimators(job.payload);
    case 'teachingPack':
      try {
        return previewTeachingPack(job.payload.text);
      } catch (error) {
        throw new DataError(
          'SCHEMA',
          error instanceof Error ? error.message.slice(0, 1000) : 'TEACHING_PACK',
        );
      }
    case 'conceptPack':
      try {
        return previewConceptPack(job.payload.text, job.payload.context);
      } catch (error) {
        throw new DataError(
          'SCHEMA',
          error instanceof Error ? error.message.slice(0, 1000) : 'CONCEPT_PACK',
        );
      }
    case 'vision':
      return correlateImage(job.payload);
    case 'landscape':
      return studyLandscape(job.payload);
    case 'groupAudit':
      return generateAuditCohort(job.payload);
    case 'functionApproximation':
      return approximateFunction(job.payload);
    case 'dispersion':
      return predictionDispersion(job.payload);
    case 'shift':
      return compareDistributionShift(job.payload);
    case 'abComparison':
      return compareModels(job.payload);
    case 'crossValidation':
      return crossValidate(job.payload);
    case 'capacity':
      return compareCapacity(job.payload);
    case 'multiseed':
      return compareMultiseed(job.payload);
    case 'generalization':
      return compareGeneralization(job.payload);
    case 'workshop':
      return runWorkshop(job.payload.caseId, job.payload.options);
    case 'importModel':
      return importInferenceModel(job.payload.text);
    case 'exportModel':
      return exportInferenceModel(job.payload.model);
    case 'predictModel':
      return predictWithModel(job.payload.model, job.payload.values);
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

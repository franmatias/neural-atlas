import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { defineStore } from 'pinia';
import { DataClient } from '@/infrastructure/workers/data-client';
import { generateDataset } from '@/domain/data/generate';
import { defaultGenerator, type Dataset, type DataSplit } from '@/domain/data/types';
import { splitDataset } from '@/domain/data/split';
import { defaultSpec } from '@/domain/network/model';
import { defaultOptimizer } from '@/domain/training/optimizer';
import type { TrainingConfig } from '@/domain/training/session';
import type { PipelineOptions } from '@/domain/data/pipeline';
import { exportDatasetJson } from '@/application/data/json-files';
import {
  exportPairedComparison,
  type PairedComparisonResult,
} from '@/application/training/paired-comparison';
import {
  exportCrossValidation,
  type CrossValidationResult,
} from '@/application/training/cross-validation';
import { useDatasetsStore } from './datasets';
import { useTrainingStore } from './training';
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
function defaultConfig(): TrainingConfig {
  return {
    spec: { ...defaultSpec, hidden: [4] },
    seed: 42,
    initialization: 'xavier',
    optimizer: { ...defaultOptimizer },
    epochs: 40,
    batchSize: 12,
    loss: 'mse',
  };
}
export const useExperimentsStore = defineStore('experiments', () => {
  const source = shallowRef<{ dataset: Dataset; split: DataSplit }>();
  const a = ref(defaultConfig()),
    b = ref(defaultConfig());
  const pipelineA = ref<PipelineOptions>({
      featureIds: ['x1', 'x2'],
      imputation: 'mean',
      scaling: 'standard',
      missingIndicators: false,
    }),
    pipelineB = ref<PipelineOptions>(clone(pipelineA.value));
  const mode = ref<'ab' | 'cv'>('ab'),
    epochs = ref(40),
    batchSize = ref(12),
    sameSeed = ref(true);
  const hypothesis = ref(''),
    reflection = ref(''),
    previousTest = ref(false);
  const folds = ref(5),
    foldSeed = ref(42),
    foldStrategy = ref<'random' | 'stratified' | 'grouped'>('stratified');
  const abResult = shallowRef<PairedComparisonResult>(),
    cvResult = shallowRef<CrossValidationResult>();
  const selectedAB = ref(1),
    selectedFold = ref(0),
    busy = ref(false),
    error = ref(''),
    notice = ref('');
  const selected = computed(() =>
    mode.value === 'ab'
      ? abResult.value?.runs[selectedAB.value]?.experiment
      : cvResult.value?.folds[selectedFold.value]?.run.experiment,
  );
  const client = new DataClient();
  let sequence = 0;
  watch([sameSeed, () => a.value.seed], ([same, seed]) => {
    if (same) b.value.seed = seed;
  });
  function setSource(
    dataset: Dataset,
    split: DataSplit,
    config?: TrainingConfig,
    pipeline?: PipelineOptions,
    testConsulted = false,
  ) {
    source.value = { dataset: clone(dataset), split: clone(split) };
    a.value = clone(config ?? defaultConfig());
    a.value.spec.task = dataset.task;
    a.value.spec.classes = Math.max(2, dataset.classOrder?.length ?? 2);
    b.value = clone(a.value);
    if (!config) b.value.spec.hidden = [8, 8];
    const options: PipelineOptions = pipeline ?? {
      featureIds: dataset.features.map((f) => f.id),
      imputation: 'mean',
      scaling: 'standard',
      missingIndicators: false,
    };
    pipelineA.value = clone(options);
    pipelineB.value = clone(options);
    previousTest.value = testConsulted;
    foldStrategy.value = dataset.rows.some((r) => r.groupId)
      ? 'grouped'
      : dataset.task === 'regression'
        ? 'random'
        : 'stratified';
    notice.value = 'Datos copiados al estudio; la sesión activa se conserva.';
    error.value = '';
  }
  function preset(kind: string) {
    if (!['moons', 'flowers', 'sine', 'grouped'].includes(kind)) return;
    const dataset = generateDataset({
      ...defaultGenerator,
      recipe: kind === 'grouped' ? 'clouds' : (kind as 'moons' | 'flowers' | 'sine'),
      count: 120,
      duplicates: kind === 'grouped' ? 0.2 : 0,
    });
    setSource(
      dataset,
      splitDataset(dataset, {
        strategy: dataset.task === 'regression' ? 'random' : 'stratified',
        ratios: [0.6, 0.2, 0.2],
        seed: 42,
      }),
    );
  }
  function copyWorkspace() {
    const data = useDatasetsStore(),
      training = useTrainingStore();
    if (!data.split) {
      error.value = 'Primero crea una división válida en Datos.';
      return;
    }
    setSource(
      data.dataset,
      data.split,
      training.config,
      data.prepared?.pipeline.options,
      training.consulted,
    );
  }
  function cancel() {
    sequence++;
    client.cancel();
    busy.value = false;
    notice.value = 'Estudio cancelado; los resultados completos anteriores se conservan.';
  }
  async function run() {
    cancel();
    const id = sequence;
    if (!source.value) return;
    busy.value = true;
    error.value = notice.value = '';
    const currentMode = mode.value;
    try {
      const datasetJson = exportDatasetJson(source.value.dataset, source.value.split);
      const configA = clone({ ...a.value, epochs: epochs.value, batchSize: batchSize.value });
      const configB = clone({
        ...b.value,
        seed: sameSeed.value ? a.value.seed : b.value.seed,
        epochs: epochs.value,
        batchSize: batchSize.value,
      });
      if (currentMode === 'ab') {
        const next = await client.run('abComparison', {
          datasetJson,
          a: configA,
          b: configB,
          pipelineA: clone(pipelineA.value),
          pipelineB: clone(pipelineB.value),
          testPreviouslyConsulted: previousTest.value,
          hypothesis: hypothesis.value,
        });
        if (id === sequence) {
          abResult.value = next;
          selectedAB.value = 1;
        }
      } else {
        // The holdout fold must never drive model selection through early stopping.
        delete configA.earlyStopping;
        const next = await client.run('crossValidation', {
          datasetJson,
          config: configA,
          pipelineOptions: clone(pipelineA.value),
          count: folds.value,
          seed: foldSeed.value,
          strategy: foldStrategy.value,
          testPreviouslyConsulted: previousTest.value,
          hypothesis: hypothesis.value,
        });
        if (id === sequence) {
          cvResult.value = next;
          selectedFold.value = 0;
        }
      }
      if (id === sequence)
        notice.value = 'Estudio completo. No se ha evaluado test en esta ejecución.';
    } catch {
      if (id === sequence)
        error.value =
          'No se ha completado el estudio. Revisa soporte por clase/grupo, tamaño del lote y presupuesto. CV necesita una división base sin subconjunto, fold ni orden temporal.';
    } finally {
      if (id === sequence) busy.value = false;
    }
  }
  function exportReport() {
    const text =
      mode.value === 'ab' && abResult.value
        ? exportPairedComparison(abResult.value)
        : mode.value === 'cv' && cvResult.value
          ? exportCrossValidation(cvResult.value)
          : undefined;
    if (!text) throw new Error('NO_RESULT');
    return JSON.stringify(
      { ...JSON.parse(text), reflection: reflection.value.slice(0, 4000) },
      null,
      2,
    );
  }
  preset('moons');
  onScopeDispose(() => client.cancel());
  return {
    source,
    a,
    b,
    pipelineA,
    pipelineB,
    mode,
    epochs,
    batchSize,
    sameSeed,
    hypothesis,
    reflection,
    previousTest,
    folds,
    foldSeed,
    foldStrategy,
    abResult,
    cvResult,
    selectedAB,
    selectedFold,
    selected,
    busy,
    error,
    notice,
    preset,
    copyWorkspace,
    run,
    cancel,
    exportReport,
  };
});

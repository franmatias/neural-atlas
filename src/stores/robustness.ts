import { computed, onScopeDispose, ref, shallowRef } from 'vue';
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
  exportDispersion,
  type DispersionResult,
} from '@/application/training/prediction-dispersion';
import {
  exportDistributionShift,
  type ShiftOptions,
  type ShiftResult,
} from '@/application/training/distribution-shift';
import { useDatasetsStore } from './datasets';
import { useTrainingStore } from './training';
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
export const useRobustnessStore = defineStore('robustness', () => {
  const mode = ref<'dispersion' | 'shift'>('dispersion'),
    source = shallowRef<{ dataset: Dataset; split: DataSplit }>();
  const config = ref<TrainingConfig>({
    spec: { ...defaultSpec, hidden: [8, 8] },
    seed: 42,
    initialization: 'xavier',
    optimizer: { ...defaultOptimizer },
    epochs: 20,
    batchSize: 12,
    loss: 'mse',
  });
  const pipeline = ref<PipelineOptions>({
    featureIds: ['x1', 'x2'],
    imputation: 'mean',
    scaling: 'standard',
    missingIndicators: false,
  });
  const count = ref<3 | 5 | 10>(3),
    firstSeed = ref(42),
    hypothesis = ref(''),
    reflection = ref(''),
    previousTest = ref(false);
  const shift = ref<ShiftOptions>({
    kind: 'covariate',
    severity: 0.7,
    seed: 42,
    epochs: 20,
    rate: 0.02,
    hypothesis: '',
  });
  const dispersionResult = shallowRef<DispersionResult>(),
    shiftResult = shallowRef<ShiftResult>();
  const selectedSeed = ref(0),
    busy = ref(false),
    error = ref(''),
    notice = ref('');
  const selected = computed(() =>
    mode.value === 'dispersion'
      ? dispersionResult.value?.runs[selectedSeed.value]?.experiment
      : shiftResult.value?.run.experiment,
  );
  const client = new DataClient();
  let sequence = 0;
  function preset(recipe: 'moons' | 'flowers' | 'sine' | 'xor') {
    const dataset = generateDataset({ ...defaultGenerator, recipe, count: 120 });
    source.value = {
      dataset,
      split: splitDataset(dataset, {
        strategy: dataset.task === 'regression' ? 'random' : 'stratified',
        seed: 42,
        ratios: [0.6, 0.2, 0.2],
      }),
    };
    config.value = {
      ...config.value,
      spec: {
        ...defaultSpec,
        hidden: [8, 8],
        task: dataset.task,
        classes: Math.max(2, dataset.classOrder?.length ?? 2),
      },
    };
    delete config.value.segments;
    delete config.value.earlyStopping;
    delete config.value.augmentation;
    pipeline.value = {
      featureIds: dataset.features.map((f) => f.id),
      imputation: 'mean',
      scaling: 'standard',
      missingIndicators: false,
    };
    previousTest.value = false;
  }
  function copyWorkspace() {
    const data = useDatasetsStore(),
      training = useTrainingStore();
    if (!data.split) {
      error.value = 'Primero divide tus datos en L01.';
      return;
    }
    source.value = { dataset: clone(data.dataset), split: clone(data.split) };
    config.value = clone(training.config);
    config.value.epochs = Math.min(120, config.value.epochs);
    pipeline.value = clone(
      data.prepared?.pipeline.options ?? {
        featureIds: data.dataset.features.map((f) => f.id),
        imputation: 'mean',
        scaling: 'standard',
        missingIndicators: false,
      },
    );
    previousTest.value = training.consulted;
    notice.value = 'Datos y controles copiados. La sesión activa se conserva.';
  }
  function cancel() {
    sequence++;
    client.cancel();
    busy.value = false;
    notice.value = 'Cancelado. Se conserva el último resultado completo.';
  }
  async function run() {
    cancel();
    const id = sequence;
    busy.value = true;
    error.value = notice.value = '';
    try {
      if (mode.value === 'dispersion') {
        if (!source.value) throw new Error('SOURCE');
        const result = await client.run('dispersion', {
          datasetJson: exportDatasetJson(source.value.dataset, source.value.split),
          config: clone(config.value),
          pipelineOptions: clone(pipeline.value),
          count: count.value,
          firstSeed: firstSeed.value,
          testPreviouslyConsulted: previousTest.value,
          hypothesis: hypothesis.value,
        });
        if (id === sequence) {
          dispersionResult.value = result;
          selectedSeed.value = 0;
        }
      } else {
        const result = await client.run('shift', {
          ...clone(shift.value),
          hypothesis: hypothesis.value,
        });
        if (id === sequence) shiftResult.value = result;
      }
      if (id === sequence)
        notice.value =
          'Estudio completo. Test no evaluado. Las medidas corresponden a los controles registrados en el informe.';
    } catch {
      if (id === sequence)
        error.value =
          'No se completó el estudio. Revisa dominio de derivadas, soporte, configuración, segmentos y presupuesto (1000 filas, 120 épocas, 5000 parámetros y 200 millones de operaciones estimadas).';
    } finally {
      if (id === sequence) busy.value = false;
    }
  }
  function report() {
    const text =
      mode.value === 'dispersion' && dispersionResult.value
        ? exportDispersion(dispersionResult.value)
        : mode.value === 'shift' && shiftResult.value
          ? exportDistributionShift(shiftResult.value)
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
    mode,
    source,
    config,
    pipeline,
    count,
    firstSeed,
    hypothesis,
    reflection,
    previousTest,
    shift,
    dispersionResult,
    shiftResult,
    selectedSeed,
    busy,
    error,
    notice,
    selected,
    preset,
    copyWorkspace,
    cancel,
    run,
    report,
  };
});

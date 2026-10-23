import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { defineStore } from 'pinia';
import { TrainingClient } from '@/infrastructure/workers/training-client';
import { trainingSource } from '@/application/training/source';
import type {
  TrainingEvent,
  TrainingStatus,
  AnalysisResult,
} from '@/application/training/protocol';
import { defaultOptimizer } from '@/domain/training/optimizer';
import {
  diagnostics,
  type TrainingConfig,
  type TrainingInput,
  type TrainingState,
  type Samples,
} from '@/domain/training/session';
import { classificationMetrics, regressionMetrics } from '@/domain/training/metrics';
import { defaultSpec } from '@/domain/network/model';
import { defaultGenerator, type RecipeId } from '@/domain/data/types';
import { transformRow } from '@/domain/data/pipeline';
import type { Cell } from '@/domain/data/types';
import { useDatasetsStore } from './datasets';
import { trainingBudget } from '@/domain/training/budget';
export const useTrainingStore = defineStore('training', () => {
  const data = useDatasetsStore();
  const config = ref<TrainingConfig>({
    spec: { ...defaultSpec, hidden: [8, 8] },
    seed: 42,
    initialization: 'xavier',
    optimizer: { ...defaultOptimizer },
    epochs: 300,
    batchSize: 16,
    loss: 'mse',
  });
  const input = shallowRef<TrainingInput>();
  const test = shallowRef<Samples>();
  const state = shallowRef<TrainingState>();
  const analysis = shallowRef<AnalysisResult>();
  const evaluating = ref(false);
  const budgetAccepted = ref(false);
  const prediction = shallowRef<number[]>();
  const comparisons = ref<
    { label: string; update: number; loss: number; score: number; parameters: number }[]
  >([]);
  const status = ref<TrainingStatus | 'idle' | 'recovering'>('idle');
  const error = ref(''),
    notice = ref(''),
    busy = ref(false),
    unstableAccepted = ref(false);
  const threshold = ref(0.5),
    positive = ref(1),
    pace = ref(0),
    consulted = ref(false);
  const progress = ref({ epoch: 0, update: 0, batchIndex: 0, cursor: 0, maxSliceMs: 0 });
  let pendingTest = false;
  let consultedKey = '';
  const client = new TrainingClient(accept, (code, lost) => {
    pendingTest = false;
    evaluating.value = false;
    status.value = code === 'RECOVERED' ? 'recovering' : 'error';
    notice.value =
      code === 'RECOVERED'
        ? `Recuperado desde el último punto confirmado. Actualizaciones descartadas: ${lost}. Pulsa Entrenar para continuar.`
        : '';
    if (code !== 'RECOVERED') error.value = code;
  });
  function accept(event: TrainingEvent) {
    const recoveryCopy = event.type === 'RECOVERY_CHECKPOINT' || event.type === 'CHECKPOINT_READY';
    if (event.type !== 'ACK' && !recoveryCopy) {
      status.value = event.status;
      progress.value = {
        epoch: event.epoch,
        update: event.update,
        batchIndex: event.batchIndex,
        cursor: event.cursor,
        maxSliceMs: event.maxSliceMs,
      };
    }
    if (event.state && !recoveryCopy) state.value = event.state;
    if (event.type === 'ERROR') {
      error.value = event.code ?? 'INTERNAL_ERROR';
      pendingTest = false;
      evaluating.value = false;
    }
    if (event.analysis) {
      analysis.value = event.analysis;
      evaluating.value = false;
    }
    if (event.inference) {
      if (event.inference.purpose === 'sample') prediction.value = event.inference.predictions[0];
      evaluating.value = false;
    }
    if (event.type === 'CANCELLED' || event.type === 'PAUSED') evaluating.value = false;
    if (event.type === 'RECOVERY_CHECKPOINT' && event.state?.frozen && pendingTest) {
      pendingTest = false;
      analyze('test');
    }
  }
  const locked = computed(() => !!input.value);
  const running = computed(
    () =>
      status.value === 'running' ||
      status.value === 'initializing' ||
      status.value === 'recovering',
  );
  const hidden = () => {
    if (document.hidden && status.value === 'running') {
      command('PAUSE');
      notice.value = 'Entrenamiento pausado al ocultar la pestaña. Pulsa Entrenar para continuar.';
    }
  };
  document.addEventListener('visibilitychange', hidden);
  const sourceResult = computed(() => {
    if (!data.split || !data.prepared) return { value: undefined, error: 'PREPARE_DATA' };
    try {
      return {
        value: trainingSource(data.dataset, data.split, data.prepared, config.value),
        error: '',
      };
    } catch (caught) {
      return {
        value: undefined,
        error: caught instanceof Error ? caught.message : 'INVALID_CONFIG',
      };
    }
  });
  const source = computed(() => sourceResult.value.value);
  const budget = computed(() => (source.value ? trainingBudget(source.value.input) : undefined));
  watch(budget, () => (budgetAccepted.value = false));
  function reset() {
    client.dispose();
    input.value = undefined;
    test.value = undefined;
    state.value = undefined;
    analysis.value = undefined;
    prediction.value = undefined;
    status.value = 'idle';
    error.value = '';
    notice.value = '';
    evaluating.value = false;
    pendingTest = false;
    progress.value = { epoch: 0, update: 0, batchIndex: 0, cursor: 0, maxSliceMs: 0 };
  }
  watch(
    () => [data.dataset, data.split, data.prepared],
    () => {
      reset();
      unstableAccepted.value = false;
      comparisons.value = [];
      if (`${data.hash}:${data.split?.splitHash}` !== consultedKey) consulted.value = false;
    },
  );
  function initialize() {
    try {
      const next = source.value;
      if (!next) throw new Error(sourceResult.value.error);
      if (next.unstable && !unstableAccepted.value) throw new Error('LOW_SUPPORT');
      if (budget.value?.extensive && !budgetAccepted.value) throw new Error('BUDGET');
      reset();
      input.value = next.input;
      test.value = next.test;
      status.value = 'initializing';
      client.start(next.input);
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'INVALID_CONFIG';
      status.value = 'error';
    }
  }
  function command(type: 'RUN' | 'STEP_BATCH' | 'STEP_EPOCH' | 'PAUSE' | 'CANCEL') {
    error.value = '';
    analysis.value = undefined;
    prediction.value = undefined;
    if (type === 'RUN' || type === 'STEP_BATCH' || type === 'STEP_EPOCH')
      client.send({ type, payload: { pace: pace.value } });
    else client.send({ type, payload: {} });
  }
  function analyze(split: 'train' | 'validation' | 'test') {
    const samples = split === 'test' ? test.value : input.value?.[split];
    if (!samples || !state.value) return;
    if (split === 'test' && !state.value.frozen) {
      error.value = 'TEST_LOCKED';
      return;
    }
    if (split === 'test') {
      consulted.value = true;
      consultedKey = `${data.hash}:${data.split?.splitHash}`;
    }
    evaluating.value = true;
    client.send({ type: 'ANALYZE', payload: { samples, split } });
  }
  function freezeAndTest() {
    evaluating.value = true;
    pendingTest = true;
    client.send({ type: 'FREEZE', payload: {} });
  }
  function predict(features: Record<string, Cell>) {
    if (!data.prepared || !state.value) return;
    try {
      const x = transformRow(
        { id: 'prediction', features, target: null, origin: 'manual' },
        data.prepared.pipeline,
      );
      evaluating.value = true;
      client.send({ type: 'PREDICT', payload: { x: [x], purpose: 'sample' } });
    } catch {
      error.value = 'INVALID_DATA';
      evaluating.value = false;
    }
  }
  function remember() {
    if (analysis.value?.split !== 'validation' || !input.value || !state.value) return;
    const config = input.value.config;
    comparisons.value = [
      ...comparisons.value.slice(-5),
      {
        label: `${config.spec.hidden.length ? 'MLP ' + config.spec.hidden.join('→') : config.spec.task === 'regression' ? 'Regresión lineal' : 'Regresión logística'} · ${config.optimizer.kind} · semilla ${config.seed}`,
        update: state.value.updates,
        loss: analysis.value.loss,
        score: analysis.value.score,
        parameters: state.value.model.layers.reduce(
          (sum, layer) => sum + layer.weights.length + layer.biases.length,
          0,
        ),
      },
    ];
  }
  async function preset(recipe: RecipeId) {
    reset();
    busy.value = true;
    try {
      await data.generate({ ...defaultGenerator, recipe, count: 400 });
      if (data.error) throw data.error;
      await data.divide({
        strategy: data.dataset.task === 'regression' ? 'random' : 'stratified',
        ratios: [0.7, 0.15, 0.15],
        seed: 42,
      });
      if (data.error) throw data.error;
      await data.fit({
        featureIds: data.dataset.features.map((f) => f.id),
        imputation: 'mean',
        scaling: 'standard',
        missingIndicators: false,
      });
      if (data.error) throw data.error;
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'INVALID_DATA';
    } finally {
      busy.value = false;
    }
  }
  const hypotheses = computed(() =>
    state.value && input.value
      ? diagnostics(state.value.history, input.value.validation.ids.length)
      : [],
  );
  const evaluation = computed(() => {
    if (!analysis.value || !state.value || !input.value) return undefined;
    const samples =
      analysis.value.split === 'test' ? test.value! : input.value[analysis.value.split];
    return input.value.config.spec.task === 'regression'
      ? {
          kind: 'regression' as const,
          result: regressionMetrics(
            samples.y,
            analysis.value.predictions.map((p) => p[0]!),
            state.value.baseline,
          ),
        }
      : {
          kind: 'classification' as const,
          result: classificationMetrics(
            samples.y,
            analysis.value.predictions,
            input.value.classOrder.length,
            threshold.value,
            positive.value,
          ),
        };
  });
  onScopeDispose(() => {
    document.removeEventListener('visibilitychange', hidden);
    client.dispose();
  });
  return {
    config,
    input,
    test,
    state,
    analysis,
    status,
    error,
    notice,
    busy,
    unstableAccepted,
    threshold,
    positive,
    pace,
    consulted,
    progress,
    locked,
    running,
    source,
    hypotheses,
    evaluation,
    evaluating,
    budget,
    budgetAccepted,
    prediction,
    predict,
    comparisons,
    remember,
    reset,
    initialize,
    command,
    analyze,
    freezeAndTest,
    preset,
  };
});

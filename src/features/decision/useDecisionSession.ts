import { computed, onMounted, onScopeDispose, reactive, ref, shallowRef, toRaw } from 'vue';
import { TrainingClient } from '@/infrastructure/workers/training-client';
import {
  defaultDecisionOptions,
  prepareDecisionStudy,
  type DecisionMode,
} from '@/application/training/decision-study';
import type { TrainingEvent, TrainingStatus } from '@/application/training/protocol';
import type { TrainingState } from '@/domain/training/session';
import type { Sample } from '@/domain/data/types';
import { decisionAt, decisionSurface } from '@/domain/network/decision-surface';
import { captureExperiment, exportExperiment } from '@/application/training/experiment';
import { exportInferenceModel, modelFromExperiment } from '@/application/training/inference-model';
import { exportDatasetJson } from '@/application/data/json-files';
export function useDecisionSession(mode: DecisionMode) {
  const draft = ref(defaultDecisionOptions(mode));
  const study = shallowRef<ReturnType<typeof prepareDecisionStudy>>();
  const state = shallowRef<TrainingState>();
  const applied = ref('');
  const status = ref<TrainingStatus>('initializing'),
    error = ref(''),
    notice = ref('');
  const manual = ref<Sample[]>([]),
    pace = ref(20),
    x = ref(0),
    y = ref(0),
    label = ref(1);
  const running = computed(() => status.value === 'running' || status.value === 'initializing');
  const client = new TrainingClient(accept, (code) => {
    status.value = 'paused';
    notice.value =
      code === 'RECOVERED'
        ? 'Worker recuperado desde el último checkpoint confirmado. Continúa explícitamente.'
        : '';
    if (code !== 'RECOVERED')
      error.value = `No se ha podido continuar (${code}). Reinicia la simulación.`;
  });
  function accept(event: TrainingEvent) {
    if (
      event.type === 'ACK' ||
      event.type === 'RECOVERY_CHECKPOINT' ||
      event.type === 'CHECKPOINT_READY'
    )
      return;
    status.value = event.status;
    if (event.state) state.value = event.state;
    if (event.type === 'ERROR')
      error.value = `El motor ha detenido la operación (${event.code}). Revisa los controles y reinicia.`;
  }
  function reset(clearManual = false, points = manual.value) {
    try {
      const next = prepareDecisionStudy(
        mode,
        structuredClone(toRaw(draft.value)),
        clearManual ? [] : structuredClone(toRaw(points)),
      );
      client.start(next.source.input);
      study.value = next;
      label.value = Math.min(label.value, next.dataset.classOrder!.length - 1);
      applied.value = JSON.stringify(draft.value);
      state.value = undefined;
      manual.value = clearManual ? [] : points;
      status.value = 'initializing';
      error.value = '';
      notice.value = 'Nueva red y particiones reproducibles. El test permanece reservado.';
    } catch (caught) {
      error.value = `No se han aplicado los controles. Revisa valores y clases (${caught instanceof Error ? caught.message : 'configuración'}).`;
    }
  }
  function command(type: 'RUN' | 'STEP_BATCH' | 'STEP_EPOCH' | 'PAUSE') {
    if (!state.value || status.value === 'completed' || status.value === 'initializing') return;
    error.value = '';
    if (type === 'PAUSE') client.send({ type, payload: {} });
    else if (!running.value) {
      status.value = 'running';
      client.send({ type, payload: { pace: pace.value } });
    }
  }
  function addPoint() {
    if (
      running.value ||
      manual.value.length >= 40 ||
      !Number.isFinite(x.value) ||
      !Number.isFinite(y.value) ||
      Math.abs(x.value) > 1.8 ||
      Math.abs(y.value) > 1.8
    )
      return;
    const points = [
      ...structuredClone(toRaw(manual.value)),
      {
        id: `manual-${manual.value.length + 1}`,
        features: { x1: x.value, x2: y.value },
        target: String(label.value),
        origin: 'manual' as const,
      },
    ];
    reset(false, points);
    if (!error.value)
      notice.value =
        'Punto añadido al dataset y red reiniciada. Su partición se asigna con la semilla; consulta su símbolo en el mapa.';
  }
  const surface = computed(() =>
    state.value && study.value
      ? decisionSurface(state.value.model, study.value.prepared.pipeline)
      : undefined,
  );
  const prediction = computed(() =>
    state.value &&
    study.value &&
    [x.value, y.value].every(
      (v) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1.8,
    )
      ? decisionAt(state.value.model, study.value.prepared.pipeline, x.value, y.value)
      : undefined,
  );
  const dirty = computed(() => JSON.stringify(draft.value) !== applied.value);
  // Browser visibility is independent of decorative motion preferences.
  const hidden = () => {
    if (document.hidden && status.value === 'running') command('PAUSE');
  };
  onMounted(() => {
    document.addEventListener('visibilitychange', hidden);
    reset();
  });
  onScopeDispose(() => {
    document.removeEventListener('visibilitychange', hidden);
    client.dispose();
  });
  function snapshot() {
    if (!study.value || !state.value || running.value) throw new Error('Pausa antes de exportar.');
    const s = study.value;
    return captureExperiment(
      s.dataset,
      s.split,
      s.prepared.pipeline.options,
      s.source.input.pipelineHash,
      s.source.input.config,
      state.value,
      0.5,
      1,
      false,
    );
  }
  function exportFile(kind: 'dataset' | 'experiment' | 'model') {
    try {
      if (!study.value) return;
      const text =
        kind === 'dataset'
          ? exportDatasetJson(study.value.dataset, study.value.split)
          : kind === 'experiment'
            ? exportExperiment(snapshot())
            : exportInferenceModel(modelFromExperiment(snapshot()));
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `neural-atlas-${mode}-${kind}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'No se pudo exportar.';
    }
  }
  return reactive({
    draft,
    study,
    state,
    status,
    error,
    notice,
    manual,
    pace,
    x,
    y,
    label,
    running,
    surface,
    prediction,
    dirty,
    reset,
    command,
    addPoint,
    exportFile,
  });
}

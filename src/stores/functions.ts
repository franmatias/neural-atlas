import { computed, onScopeDispose, ref, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import { DataClient } from '@/infrastructure/workers/data-client';
import {
  defaultFunctionOptions,
  functionExperiment,
  exportFunctionReport,
  type FunctionOptions,
  type FunctionResult,
} from '@/application/training/function-approximation';
export const useFunctionsStore = defineStore('functions', () => {
  const options = ref<FunctionOptions>({ ...defaultFunctionOptions }),
    result = shallowRef<FunctionResult>();
  const busy = ref(false),
    error = ref(''),
    notice = ref(''),
    reflection = ref('');
  const runIndex = ref(0),
    snapshotIndex = ref(0),
    probe = ref(0),
    neuron = ref(0);
  const selected = computed(() => result.value?.runs[runIndex.value]);
  const snapshot = computed(() => selected.value?.snapshots[snapshotIndex.value]);
  const experiment = computed(() =>
    result.value && snapshot.value
      ? functionExperiment(result.value, runIndex.value, snapshotIndex.value)
      : undefined,
  );
  const bound = computed(() => {
    let max = 1;
    for (const run of result.value?.runs ?? [])
      for (const s of run.snapshots) {
        max = Math.max(max, Math.abs(s.checkpoint.model.layers[1]!.biases[0]!));
        for (const p of s.curve) {
          max = Math.max(max, Math.abs(p.target), Math.abs(p.prediction));
          for (const c of p.contributions) max = Math.max(max, Math.abs(c));
        }
      }
    return Math.ceil(max * 1.1 * 10) / 10;
  });
  const client = new DataClient();
  let sequence = 0;
  function cancel() {
    sequence++;
    client.cancel();
    busy.value = false;
    notice.value = 'Cálculo cancelado. Se conserva el último estudio completo, si existe.';
  }
  async function run() {
    if (busy.value) return;
    const id = ++sequence;
    busy.value = true;
    error.value = '';
    notice.value = '';
    try {
      const completed = await client.run('functionApproximation', { ...options.value });
      if (id !== sequence) return;
      result.value = completed;
      runIndex.value = Math.max(
        0,
        completed.runs.findIndex((r) => r.width === completed.options.width),
      );
      snapshotIndex.value = completed.runs[runIndex.value]!.snapshots.length - 1;
      neuron.value = 0;
      reflection.value = '';
      notice.value = 'Estudio completo. Reproduce las instantáneas reales; test no se ha evaluado.';
    } catch {
      if (id === sequence)
        error.value =
          'No se completó el estudio. Revisa semilla, anchura, ruido, tasa y épocas. Se conserva el último resultado completo.';
    } finally {
      if (id === sequence) busy.value = false;
    }
  }
  function selectRun(index: number) {
    if (!result.value?.runs[index] || !Number.isInteger(index)) return;
    runIndex.value = index;
    snapshotIndex.value = result.value.runs[index]!.snapshots.length - 1;
    neuron.value = 0;
  }
  function report() {
    if (!result.value) throw new Error('NO_RESULT');
    return exportFunctionReport(
      result.value,
      { run: runIndex.value, snapshot: snapshotIndex.value, x: probe.value },
      reflection.value,
    );
  }
  onScopeDispose(() => client.cancel());
  return {
    options,
    result,
    busy,
    error,
    notice,
    reflection,
    runIndex,
    snapshotIndex,
    probe,
    neuron,
    selected,
    snapshot,
    experiment,
    bound,
    run,
    cancel,
    selectRun,
    report,
  };
});

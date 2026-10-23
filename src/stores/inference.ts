import { defineStore } from 'pinia';
import { onScopeDispose, ref, shallowRef, watch } from 'vue';
import { DataClient } from '@/infrastructure/workers/data-client';
import {
  modelFromExperiment,
  type InferenceModel,
  type predictWithModel,
} from '@/application/training/inference-model';
import type { Experiment } from '@/application/training/experiment';
import type { Cell } from '@/domain/data/types';
export const useInferenceStore = defineStore('inference', () => {
  const client = new DataClient();
  const model = shallowRef<InferenceModel>();
  const result = shallowRef<ReturnType<typeof predictWithModel>>();
  const values = ref<Record<string, Cell>>({});
  const busy = ref(false),
    error = ref(''),
    notice = ref('');
  let sequence = 0;
  watch(
    values,
    () => {
      result.value = undefined;
    },
    { deep: true },
  );
  function cancel() {
    sequence++;
    client.cancel();
    busy.value = false;
  }
  async function perform<T>(action: () => Promise<T>): Promise<T | undefined> {
    const token = ++sequence;
    client.cancel();
    busy.value = true;
    error.value = '';
    notice.value = '';
    try {
      const value = await action();
      return token === sequence ? value : undefined;
    } catch {
      if (token === sequence)
        error.value =
          'No se ha completado la operación. Comprueba el formato neural-atlas.model, versión 1, su integridad y el límite de 8 MiB. Para predecir se necesita un navegador con Web Workers.';
    } finally {
      if (token === sequence) busy.value = false;
    }
  }
  function replace(next: InferenceModel) {
    model.value = next;
    result.value = undefined;
    values.value = Object.fromEntries(
      next.pipeline.columns.map((column) => [column.id, column.fill]),
    );
    notice.value = 'Modelo abierto para inferencia. La sesión de entrenamiento se conserva.';
  }
  async function importFile(text: string) {
    const next = await perform(() => client.run('importModel', { text }));
    if (next) replace(next);
  }
  async function useExperiment(experiment: Experiment) {
    const next = await perform(async () => modelFromExperiment(experiment));
    if (next) replace(next);
  }
  async function exportFile(): Promise<string | undefined> {
    if (!model.value) return undefined;
    return perform(() => client.run('exportModel', { model: model.value! }));
  }
  async function predict() {
    if (!model.value) return;
    result.value = undefined;
    const output = await perform(() =>
      client.run('predictModel', { model: model.value!, values: { ...values.value } }),
    );
    if (output) result.value = output;
  }
  function clear() {
    cancel();
    model.value = undefined;
    result.value = undefined;
    values.value = {};
    error.value = '';
    notice.value = '';
  }
  onScopeDispose(cancel);
  return {
    model,
    result,
    values,
    busy,
    error,
    notice,
    importFile,
    useExperiment,
    exportFile,
    predict,
    clear,
    cancel,
  };
});

import { defineStore } from 'pinia';
import { onScopeDispose, ref, shallowRef } from 'vue';
import { DataClient } from '@/infrastructure/workers/data-client';
import {
  defaultGeneralization,
  generalizationOptions,
  type GeneralizationResult,
} from '@/application/training/generalization';
import { exportExperiment } from '@/application/training/experiment';
export const useGeneralizationStore = defineStore('generalization', () => {
  const options = ref({ ...defaultGeneralization }),
    result = shallowRef<GeneralizationResult>();
  const busy = ref(false),
    error = ref(''),
    notice = ref('');
  const client = new DataClient();
  let sequence = 0;
  function cancel() {
    sequence++;
    client.cancel();
    busy.value = false;
    notice.value = 'Comparación cancelada; los últimos resultados completos se conservan.';
  }
  async function run() {
    cancel();
    const id = sequence;
    busy.value = true;
    error.value = '';
    notice.value = '';
    try {
      const next = await client.run('generalization', generalizationOptions.parse(options.value));
      if (id === sequence) {
        result.value = next;
        notice.value =
          'Dos ensayos completados con la misma inicialización. Test permanece reservado.';
      }
    } catch {
      if (id === sequence)
        error.value =
          'No se ha completado la comparación. Revisa los límites de los controles; los resultados anteriores se conservan.';
    } finally {
      if (id === sequence) busy.value = false;
    }
  }
  function exportRun(index: number) {
    const run = result.value?.runs[index];
    if (!run) throw new Error('NO_RESULT');
    return exportExperiment(run.experiment);
  }
  onScopeDispose(() => client.cancel());
  return { options, result, busy, error, notice, run, cancel, exportRun };
});

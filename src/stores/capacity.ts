import { defineStore } from 'pinia';
import { ref, shallowRef, onScopeDispose } from 'vue';
import { DataClient } from '@/infrastructure/workers/data-client';
import {
  defaultCapacity,
  capacityOptions,
  exportCapacity,
  type CapacityResult,
} from '@/application/training/capacity';
import { exportExperiment } from '@/application/training/experiment';
import { exportInferenceModel, modelFromExperiment } from '@/application/training/inference-model';
export const useCapacityStore = defineStore('capacity', () => {
  const options = ref({ ...defaultCapacity });
  const result = shallowRef<CapacityResult>();
  const selected = ref(0),
    busy = ref(false),
    error = ref(''),
    notice = ref('');
  const client = new DataClient();
  let sequence = 0;
  function cancel() {
    sequence++;
    client.cancel();
    busy.value = false;
    notice.value = 'Estudio cancelado; los últimos resultados completos se conservan.';
  }
  async function run() {
    cancel();
    const id = sequence;
    busy.value = true;
    error.value = notice.value = '';
    try {
      const next = await client.run('capacity', capacityOptions.parse(options.value));
      if (id === sequence) {
        result.value = next;
        selected.value = 0;
        notice.value = `${next.trials.length} ensayos completos. Test permanece reservado.`;
      }
    } catch {
      if (id === sequence)
        error.value =
          'No se ha completado el estudio. Revisa los límites; los resultados anteriores se conservan.';
    } finally {
      if (id === sequence) busy.value = false;
    }
  }
  function exportFile(kind: 'report' | 'experiment' | 'model') {
    if (!result.value) throw new Error('NO_STUDY');
    if (kind === 'report') return exportCapacity(result.value);
    const trial = result.value.trials[selected.value];
    if (!trial) throw new Error('NO_TRIAL');
    return kind === 'experiment'
      ? exportExperiment(trial.run.experiment)
      : exportInferenceModel(modelFromExperiment(trial.run.experiment));
  }
  onScopeDispose(() => client.cancel());
  return { options, result, selected, busy, error, notice, run, cancel, exportFile };
});

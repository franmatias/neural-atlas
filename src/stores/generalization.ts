import { defineStore } from 'pinia';
import { onScopeDispose, ref, shallowRef } from 'vue';
import { DataClient } from '@/infrastructure/workers/data-client';
import {
  defaultGeneralization,
  generalizationOptions,
  type GeneralizationResult,
} from '@/application/training/generalization';
import { exportExperiment } from '@/application/training/experiment';
import {
  exportMultiseed,
  multiseedOptions,
  type MultiseedResult,
} from '@/application/training/multiseed';
export const useGeneralizationStore = defineStore('generalization', () => {
  const options = ref({ ...defaultGeneralization }),
    result = shallowRef<GeneralizationResult>();
  const busy = ref(false),
    error = ref(''),
    notice = ref('');
  const repetitions = ref<3 | 5 | 10>(3),
    firstSeed = ref(42);
  const study = shallowRef<MultiseedResult>();
  const selectedPair = ref(0);
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
        study.value = undefined;
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
  async function runStudy() {
    cancel();
    const id = sequence;
    busy.value = true;
    error.value = '';
    notice.value = '';
    try {
      const next = await client.run(
        'multiseed',
        multiseedOptions.parse({
          comparison: options.value,
          firstSeed: firstSeed.value,
          count: repetitions.value,
        }),
      );
      if (id === sequence) {
        study.value = next;
        selectPair(0);
        notice.value = `${next.measurements.length} parejas completadas. Datos fijos; test permanece reservado.`;
      }
    } catch {
      if (id === sequence)
        error.value =
          'No se ha completado el estudio. Revisa las semillas y los límites; los resultados anteriores se conservan.';
    } finally {
      if (id === sequence) busy.value = false;
    }
  }
  function selectPair(index: number) {
    const pair = study.value?.pairs[index];
    if (!pair) throw new Error('NO_PAIR');
    selectedPair.value = index;
    result.value = pair;
  }
  function exportStudy() {
    if (!study.value) throw new Error('NO_STUDY');
    return exportMultiseed(study.value);
  }
  function exportRun(index: number) {
    const run = result.value?.runs[index];
    if (!run) throw new Error('NO_RESULT');
    return exportExperiment(run.experiment);
  }
  onScopeDispose(() => client.cancel());
  return {
    options,
    result,
    busy,
    error,
    notice,
    run,
    cancel,
    exportRun,
    repetitions,
    firstSeed,
    study,
    selectedPair,
    runStudy,
    selectPair,
    exportStudy,
  };
});

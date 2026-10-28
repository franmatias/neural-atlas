import { defineStore } from 'pinia';
import { ref, shallowRef, onScopeDispose } from 'vue';
import { DataClient } from '@/infrastructure/workers/data-client';
import {
  defaultPermutation,
  type PermutationOptions,
  type PermutationResult,
} from '@/application/training/permutation';
export const usePermutationStore = defineStore('permutation', () => {
  const options = ref<PermutationOptions>({ ...defaultPermutation }),
    result = shallowRef<PermutationResult>(),
    busy = ref(false),
    error = ref(''),
    notice = ref('');
  const client = new DataClient();
  let revision = 0;
  function cancel() {
    revision++;
    client.cancel();
    busy.value = false;
    notice.value = 'Análisis cancelado. Se conserva el último resultado completo.';
  }
  async function run(input: PermutationOptions = options.value) {
    if (busy.value) return;
    const id = ++revision;
    busy.value = true;
    error.value = '';
    notice.value = 'Calculando en una copia independiente…';
    try {
      const next = await client.run(
        'permutation',
        JSON.parse(JSON.stringify(input)) as PermutationOptions,
      );
      if (id === revision) {
        result.value = next;
        notice.value = 'Análisis completo. Red y pipeline congelados; test no evaluado.';
      }
    } catch {
      if (id === revision)
        error.value =
          'No se completó. Revisa el checkpoint detenido, la validación (al menos dos filas), dimensiones y presupuesto. Se conserva el resultado anterior.';
    } finally {
      if (id === revision) busy.value = false;
    }
  }
  onScopeDispose(() => client.cancel());
  return { options, result, busy, error, notice, run, cancel };
});

import { defineStore } from 'pinia';
import { ref, shallowRef, onScopeDispose } from 'vue';
import { DataClient } from '@/infrastructure/workers/data-client';
import type { JobResults } from '@/application/data/jobs';
import {
  defaultClassicalOptions,
  type ClassicalOptions,
  type ClassicalResult,
} from '@/application/training/classical-comparison';
import type { Cell } from '@/domain/data/types';
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
export const useClassicalStore = defineStore('classical', () => {
  const options = ref<ClassicalOptions>({ ...defaultClassicalOptions }),
    result = shallowRef<ClassicalResult>(),
    probe = shallowRef<JobResults['classicalProbe']>(),
    imported = shallowRef<JobResults['classicalFile']>(),
    importedText = ref('');
  const busy = ref(false),
    error = ref(''),
    notice = ref(''),
    client = new DataClient();
  let sequence = 0;
  function cancel() {
    sequence++;
    client.cancel();
    busy.value = false;
    notice.value = 'Cálculo cancelado. El último resultado completo se conserva.';
  }
  async function run() {
    if (busy.value) return;
    const id = ++sequence;
    busy.value = true;
    error.value = '';
    try {
      const next = await client.run('classicalComparison', copy(options.value));
      if (id === sequence) {
        result.value = next;
        probe.value = undefined;
        notice.value =
          'Comparación completa. Test no se ha evaluado; la sesión activa se conserva.';
      }
    } catch {
      if (id === sequence)
        error.value =
          'No se completó. Revisa división, k ≤ train, hasta 600 filas / 8 características / 16 columnas transformadas y presupuesto.';
    } finally {
      if (id === sequence) busy.value = false;
    }
  }
  async function query(features: Record<string, Cell>) {
    if (busy.value || !result.value) return;
    const id = ++sequence;
    busy.value = true;
    error.value = '';
    try {
      const next = await client.run('classicalProbe', {
        artifacts: copy(result.value.artifacts),
        features: copy(features),
      });
      if (id === sequence) probe.value = next;
    } catch {
      if (id === sequence) error.value = 'La sonda no es válida. Se conserva la última predicción.';
    } finally {
      if (id === sequence) busy.value = false;
    }
  }
  async function inspect(text: string) {
    if (busy.value) return;
    const id = ++sequence;
    busy.value = true;
    error.value = '';
    try {
      const next = await client.run('classicalFile', { text });
      if (id === sequence) {
        imported.value = next;
        importedText.value = text;
        notice.value =
          'Modelo clásico validado en memoria; no sustituye el estudio ni el laboratorio activo.';
      }
    } catch {
      if (id === sequence)
        error.value =
          'Archivo rechazado: formato, integridad, ajuste o límites inválidos. El modelo anterior se conserva.';
    } finally {
      if (id === sequence) busy.value = false;
    }
  }
  async function queryFile(features: Record<string, Cell>) {
    if (busy.value || !imported.value) return;
    const id = ++sequence;
    busy.value = true;
    error.value = '';
    try {
      const prediction = await client.run('classicalFilePredict', {
        text: importedText.value,
        features: copy(features),
      });
      if (id === sequence) imported.value = { ...imported.value, prediction };
    } catch {
      if (id === sequence)
        error.value = 'Sonda de archivo no válida; la predicción anterior se conserva.';
    } finally {
      if (id === sequence) busy.value = false;
    }
  }
  onScopeDispose(() => client.cancel());
  return {
    options,
    result,
    probe,
    imported,
    importedText,
    busy,
    error,
    notice,
    run,
    query,
    queryFile,
    inspect,
    cancel,
  };
});

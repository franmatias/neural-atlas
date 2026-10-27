import { computed, onScopeDispose, ref, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import { DataClient } from '@/infrastructure/workers/data-client';
import {
  defaultLandscapeOptions,
  exportLandscape,
  type FrozenCut,
  type LandscapeResult,
} from '@/application/training/landscape';
import { cloneNetwork, createNetwork, defaultSpec } from '@/domain/network/model';
import { parameterEntries } from '@/domain/training/landscape';
export const useLandscapeStore = defineStore('landscape', () => {
  const options = ref(structuredClone(defaultLandscapeOptions)),
    frozen = shallowRef<FrozenCut>(),
    result = shallowRef<LandscapeResult>();
  const busy = ref(false),
    error = ref(''),
    notice = ref(''),
    index = ref(0);
  const client = new DataClient();
  let sequence = 0;
  const entries = computed(() => (frozen.value ? parameterEntries(frozen.value.model) : []));
  const count = computed(() =>
    Math.max(0, ...(result.value?.paths.map((p) => p.points.length) ?? [])),
  );
  function capture(source: FrozenCut) {
    if (busy.value) return;
    frozen.value = {
      ...source,
      model: cloneNetwork(source.model),
      samples: structuredClone(source.samples),
    };
    options.value.mode = 'frozen';
    options.value.axes = [0, 1];
    center();
    notice.value = 'Copia congelada; solo datos de train, sin alterar la sesión.';
  }
  function example() {
    const model = createNetwork(
      { ...defaultSpec, inputs: 1, hidden: [], task: 'regression' },
      42,
      'zero',
    );
    capture({
      model,
      samples: { ids: ['example-0', 'example-1', 'example-2'], x: [[-1], [0], [1]], y: [-1, 1, 3] },
      loss: 'mse',
      source: 'Ejemplo fijo y=2x+1, modelo lineal inicialmente cero',
      update: 0,
    });
  }
  function center() {
    const a = entries.value[options.value.axes[0]],
      b = entries.value[options.value.axes[1]];
    if (a && b) options.value.start = [a.value, b.value];
  }
  function cancel() {
    sequence++;
    client.cancel();
    busy.value = false;
    notice.value = 'Cálculo cancelado; se conserva el último estudio completo.';
  }
  async function run() {
    if (busy.value) return;
    const id = ++sequence;
    busy.value = true;
    error.value = '';
    notice.value = '';
    try {
      const done = await client.run('landscape', {
        options: {
          ...options.value,
          start: [...options.value.start],
          axes: [...options.value.axes],
        },
        frozen: frozen.value,
      });
      if (id !== sequence) return;
      result.value = done;
      index.value = 0;
      notice.value = 'Estudio registrado. La reproducción inspecciona trayectorias ya calculadas.';
    } catch {
      if (id === sequence)
        error.value =
          'No se completó el estudio. Revisa ejes distintos, inicio dentro del dominio y presupuesto (512 parámetros, 64 filas, 20 M operaciones). Se conserva el anterior.';
    } finally {
      if (id === sequence) busy.value = false;
    }
  }
  function report() {
    if (!result.value) throw Error('NO_RESULT');
    return exportLandscape(result.value);
  }
  onScopeDispose(() => client.cancel());
  return {
    options,
    frozen,
    result,
    busy,
    error,
    notice,
    index,
    entries,
    count,
    capture,
    example,
    center,
    cancel,
    run,
    report,
  };
});

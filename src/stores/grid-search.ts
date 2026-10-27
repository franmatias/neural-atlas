import { defineStore } from 'pinia';
import { ref, shallowRef, computed, onScopeDispose } from 'vue';
import { DataClient } from '@/infrastructure/workers/data-client';
import {
  summarizeGrid,
  type GridOptions,
  type GridPlan,
  type GridAttempt,
} from '@/application/training/grid-search';
const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
export const useGridStore = defineStore('grid-search', () => {
  const plan = shallowRef<GridPlan>(),
    attempts = shallowRef<GridAttempt[]>([]),
    busy = ref(false),
    error = ref(''),
    notice = ref(''),
    phase = ref<'idle' | 'planning' | 'running'>('idle');
  const summary = computed(() =>
    plan.value ? summarizeGrid(plan.value, attempts.value) : undefined,
  );
  const client = new DataClient();
  let revision = 0,
    snapshot: GridOptions | undefined;
  function cancel() {
    const wasRunning = phase.value === 'running';
    revision++;
    client.cancel();
    busy.value = false;
    phase.value = 'idle';
    if (wasRunning)
      attempts.value = attempts.value.map((a) => ({
        ...a,
        status:
          a.status === 'running' ? 'cancelled' : a.status === 'pending' ? 'skipped' : a.status,
      }));
    notice.value =
      'Cálculo cancelado. Se conserva la evidencia terminada; el resto queda identificado.';
  }
  async function prepare(options: GridOptions) {
    if (busy.value) return;
    const id = ++revision,
      source = copy(options);
    busy.value = true;
    phase.value = 'planning';
    error.value = '';
    try {
      const next = await client.run('gridPlan', source);
      if (id === revision) {
        plan.value = next;
        attempts.value = next.trials.map((t) => ({ id: t.id, status: 'pending' }));
        snapshot = source;
        notice.value = 'Plan preparado. Revisa el presupuesto antes de ejecutar.';
      }
    } catch {
      if (id === revision)
        error.value =
          'Plan rechazado. Revisa valores únicos, división válida, hasta 9 configuraciones y 27 ejecuciones, datos y presupuesto. La evidencia anterior se conserva.';
    } finally {
      if (id === revision) {
        busy.value = false;
        phase.value = 'idle';
      }
    }
  }
  async function run() {
    if (
      busy.value ||
      !snapshot ||
      !plan.value ||
      attempts.value.some((a) => a.status !== 'pending')
    )
      return;
    const id = ++revision,
      p = plan.value,
      source = copy(snapshot);
    busy.value = true;
    phase.value = 'running';
    error.value = '';
    notice.value = 'Búsqueda en curso. Cada intento se registra antes de comenzar el siguiente.';
    for (const t of p.trials) {
      if (id !== revision) break;
      attempts.value = attempts.value.map((a) => (a.id === t.id ? { ...a, status: 'running' } : a));
      try {
        const measurement = await client.run('gridTrial', {
          options: source,
          planHash: p.hash,
          id: t.id,
        });
        if (id === revision)
          attempts.value = attempts.value.map((a) =>
            a.id === t.id ? { id: a.id, status: 'completed', measurement } : a,
          );
      } catch {
        if (id === revision)
          attempts.value = attempts.value.map((a) =>
            a.id === t.id
              ? { id: a.id, status: 'failed', error: 'No se obtuvo una medición finita válida.' }
              : a,
          );
      }
    }
    if (id === revision) {
      busy.value = false;
      phase.value = 'idle';
      notice.value =
        'Búsqueda finalizada. Solo se ordenan configuraciones con todas sus ejecuciones completas; test no evaluado.';
    }
  }
  onScopeDispose(() => client.cancel());
  return { plan, attempts, summary, busy, phase, error, notice, prepare, run, cancel };
});

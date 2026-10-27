import { it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia, disposePinia, type Pinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import GridSearchPage from '@/features/experiments/GridSearchPage.vue';
import { useGridStore } from '@/stores/grid-search';
import { useDatasetsStore } from '@/stores/datasets';
import { handleDataJob, type DataJob } from '@/application/data/jobs';
import { trainingFixture } from '../fixtures/training';
import { defaultGrid, type GridOptions } from '@/application/training/grid-search';
import { exportDatasetJson } from '@/application/data/json-files';
class WorkerDouble {
  static defer = false;
  static fail = -1;
  static late: (() => void)[] = [];
  static jobs: string[] = [];
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror = null;
  terminated = false;
  postMessage(v: { id: number; job: DataJob }) {
    const input = structuredClone(v);
    WorkerDouble.jobs.push(input.job.kind);
    const send = () =>
      this.onmessage?.({
        data:
          input.job.kind === 'gridTrial' && input.job.payload.id === WorkerDouble.fail
            ? { id: input.id, ok: false, code: 'INTERNAL' }
            : handleDataJob(input.id, input.job),
      } as MessageEvent);
    if (WorkerDouble.defer) {
      WorkerDouble.late.push(send);
      return;
    }
    queueMicrotask(() => {
      if (!this.terminated) send();
    });
  }
  terminate() {
    this.terminated = true;
  }
}
let pinia: Pinia;
beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  WorkerDouble.defer = false;
  WorkerDouble.fail = -1;
  WorkerDouble.late = [];
  WorkerDouble.jobs = [];
  vi.stubGlobal('Worker', WorkerDouble);
  vi.stubGlobal(
    'URL',
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:grid'), revokeObjectURL: vi.fn() }),
  );
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => {
  disposePinia(pinia);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function options(): GridOptions {
  const f = trainingFixture('moons', 40);
  return {
    ...defaultGrid,
    widths: [2, 4],
    rates: [0.01],
    epochs: 5,
    datasetJson: exportDatasetJson(f.dataset, f.split),
    pipeline: f.prepared.pipeline.options,
    testPreviouslyConsulted: false,
  };
}
async function render() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: GridSearchPage },
      { path: '/:pathMatch(.*)*', component: { template: '<p>Destino</p>' } },
    ],
  });
  await router.push('/');
  await router.isReady();
  const wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [pinia, router] } });
  await flushPromises();
  const button = (s: string) => wrapper.findAll('button').find((b) => b.text() === s)!;
  return { wrapper, router, button, store: useGridStore() };
}
it('plan revisado, cola real, visualizaciones e informes/modelos conservan sesión y configuración', async () => {
  const { wrapper, button, store } = await render(),
    data = useDatasetsStore(),
    before = structuredClone(data.dataset);
  const fields = wrapper.findAll('input');
  await fields[0]!.setValue('2');
  await fields[1]!.setValue('.01');
  await fields[2]!.setValue('5');
  await button('Preparar plan y presupuesto').trigger('click');
  await flushPromises();
  expect(store.plan?.trials).toHaveLength(1);
  expect(button('Ejecutar plan confirmado').attributes('disabled')).toBeDefined();
  await wrapper.get('input[type=checkbox]').setValue(true);
  await fields[0]!.setValue('4,8');
  await button('Ejecutar plan confirmado').trigger('click');
  await flushPromises();
  expect(store.summary?.complete).toBe(true);
  expect(store.plan?.settings.widths).toEqual([2]);
  expect(data.dataset).toEqual(before);
  expect(wrapper.findAll('svg')).toHaveLength(2);
  await button('Exportar informe de rejilla').trigger('click');
  await wrapper.get('[aria-label="Exportar modelo del intento 1"]').trigger('click');
  expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(2);
  expect(WorkerDouble.jobs).toEqual(['gridPlan', 'gridTrial']);
  await button('Ejecutar plan confirmado').trigger('click');
  expect(WorkerDouble.jobs).toHaveLength(2);
  wrapper.unmount();
});
it('un fallo queda registrado y no participa en la selección; plan inválido conserva evidencia', async () => {
  const { wrapper, store } = await render();
  await store.prepare(options());
  WorkerDouble.fail = 1;
  await store.run();
  await flushPromises();
  expect(store.attempts.map((a) => a.status)).toEqual(['completed', 'failed']);
  expect(store.summary?.ranking).toEqual([0]);
  expect(store.summary?.complete).toBe(true);
  expect(wrapper.text()).toContain('Fallido');
  const old = store.plan;
  await store.prepare({ ...options(), rates: [0.01, 0.01] });
  expect(store.plan).toBe(old);
  expect(store.error).toContain('Plan rechazado');
  expect(store.attempts[0]?.status).toBe('completed');
  wrapper.unmount();
});
it('cancelación y salida detienen la cola y descartan respuestas tardías', async () => {
  const { wrapper, store, router } = await render();
  await store.prepare(options());
  WorkerDouble.defer = true;
  const pending = store.run();
  await flushPromises();
  expect(store.attempts[0]?.status).toBe('running');
  await router.push('/elsewhere');
  await pending;
  expect(store.attempts.map((a) => a.status)).toEqual(['cancelled', 'skipped']);
  expect(store.busy).toBe(false);
  WorkerDouble.late.forEach((send) => send());
  await flushPromises();
  expect(store.attempts[0]?.measurement).toBeUndefined();
  expect(WorkerDouble.jobs.filter((k) => k === 'gridTrial')).toHaveLength(1);
  const old = store.plan;
  const preparing = store.prepare(options());
  await flushPromises();
  store.cancel();
  WorkerDouble.late.forEach((send) => send());
  await preparing;
  expect(store.plan).toBe(old);
  wrapper.unmount();
});
it('fuente del laboratorio con pipeline, regresión y falta de división', async () => {
  const { wrapper, button, store } = await render(),
    data = useDatasetsStore();
  await wrapper.findAll('select')[0]!.setValue('workspace');
  await button('Preparar plan y presupuesto').trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('No se preparó');
  const f = trainingFixture('sine', 40);
  data.replace(f.dataset, f.split);
  data.prepared = f.prepared;
  const fields = wrapper.findAll('input');
  await fields[0]!.setValue('2');
  await fields[1]!.setValue('.01');
  await fields[2]!.setValue('5');
  await button('Preparar plan y presupuesto').trigger('click');
  await flushPromises();
  await store.run();
  expect(store.plan?.task).toBe('regression');
  expect(store.plan?.settings.pipeline).toEqual(f.prepared.pipeline.options);
  expect(wrapper.text()).toContain('MSE en unidades²');
  wrapper.unmount();
});

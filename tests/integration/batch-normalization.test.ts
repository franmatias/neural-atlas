import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { TrainingRuntime } from '@/application/training/runtime';
import { handleDataJob, type DataJob } from '@/application/data/jobs';
import { useTrainingStore } from '@/stores/training';
import { useDatasetsStore } from '@/stores/datasets';
import TrainingPage from '@/features/training/TrainingPage.vue';
import { trainingFixture } from '../fixtures/training';
class WorkerDouble {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror = null;
  terminated = false;
  runtime = new TrainingRuntime({
    now: () => performance.now(),
    schedule: (callback) =>
      queueMicrotask(() => {
        if (!this.terminated) callback();
      }),
    send: (event) =>
      queueMicrotask(() => {
        if (!this.terminated) this.onmessage?.({ data: structuredClone(event) } as MessageEvent);
      }),
  });
  postMessage(raw: unknown) {
    const copy = structuredClone(raw) as { id: number; job?: DataJob };
    queueMicrotask(() => {
      if (this.terminated) return;
      if (copy.job) this.onmessage?.({ data: handleDataJob(copy.id, copy.job) } as MessageEvent);
      else this.runtime.receive(copy);
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
  vi.stubGlobal('Worker', WorkerDouble);
});
afterEach(() => {
  disposePinia(pinia);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
async function render() {
  const f = trainingFixture(),
    data = useDatasetsStore(),
    session = useTrainingStore();
  data.replace(f.dataset, f.split);
  data.prepared = f.prepared;
  await flushPromises();
  session.config = { ...f.input.config, batchSize: 11, dropout: { rate: 0.25 } };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/lab/entrenamiento', component: TrainingPage },
      { path: '/biblioteca', component: { template: '<h1>Biblioteca</h1>' } },
    ],
  });
  await router.push('/lab/entrenamiento');
  await router.isReady();
  const wrapper = mount({ template: '<RouterView/>' }, { global: { plugins: [pinia, router] } });
  await flushPromises();
  return { wrapper, session };
}
it('el control activa BN, explica la cola combinada y explorar no modifica el modelo', async () => {
  const { wrapper, session } = await render();
  const checkbox = wrapper
    .findAll('label')
    .find((l) => l.text().includes('Activar normalización por lotes (BN)'))!
    .get('input');
  await checkbox.setValue(true);
  session.initialize();
  await flushPromises();
  expect(wrapper.get('.normalization-panel').text()).toContain('Aún no se ha confirmado');
  session.command('STEP_EPOCH');
  await flushPromises();
  expect(session.state?.updates).toBe(5);
  expect(session.state?.lastBatchIds).toHaveLength(12);
  expect(wrapper.get('.bn-batch-size').text()).toContain('12 muestras');
  const before = JSON.stringify(session.state);
  await wrapper
    .findAll('button')
    .find((b) => b.text() === 'Usar memoria de inferencia')!
    .trigger('click');
  expect(wrapper.get('.bn-formula').text()).toContain('gamma');
  expect(JSON.stringify(session.state)).toBe(before);
  session.reset();
  await flushPromises();
  await checkbox.setValue(false);
  expect(session.config.spec.batchNormalization).toBeUndefined();
});
it('rechaza lote unitario y reanuda BN/dropout con todos sus momentos y estadísticas', async () => {
  const { session } = await render();
  session.config.spec.batchNormalization = true;
  session.config.batchSize = 1;
  session.initialize();
  await flushPromises();
  expect(session.error).toBeTruthy();
  session.config.batchSize = 11;
  session.initialize();
  await flushPromises();
  session.command('STEP_BATCH');
  await flushPromises();
  const file = session.capture();
  session.command('STEP_BATCH');
  await flushPromises();
  const expected = JSON.stringify(session.state);
  await session.restore(file);
  await flushPromises();
  expect(session.status).toBe('ready');
  session.command('STEP_BATCH');
  await flushPromises();
  expect(JSON.stringify(session.state)).toBe(expected);
});

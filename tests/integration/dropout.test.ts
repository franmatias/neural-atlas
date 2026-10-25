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
  session.config = { ...f.input.config };
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
  return { session, wrapper };
}
it('controles, máscara real e inferencia visual no alteran el checkpoint', async () => {
  const { session, wrapper } = await render();
  const checkbox = wrapper
    .findAll('label')
    .find((l) => l.text().includes('Activar dropout invertido'))!
    .get('input');
  await checkbox.setValue(true);
  expect(session.config.dropout).toEqual({ rate: 0.5 });
  session.initialize();
  await flushPromises();
  expect(wrapper.get('.dropout-panel').text()).toContain('Aún no hay máscara');
  session.command('STEP_BATCH');
  await flushPromises();
  expect(session.state?.dropout?.seenSamples).toBe(8);
  const snapshot = JSON.stringify(session.state);
  const button = wrapper.findAll('button').find((b) => b.text() === 'Ver inferencia sin máscara')!;
  await button.trigger('click');
  expect(wrapper.get('.dropout-mode').text()).toContain('factor 1');
  expect(wrapper.findAll('.dropout-unit.masked')).toHaveLength(0);
  expect(JSON.stringify(session.state)).toBe(snapshot);
  session.reset();
  await flushPromises();
  await checkbox.setValue(false);
  expect(session.config.dropout).toBeUndefined();
});
it('restaurar el experimento conserva RNG sin arrancar automáticamente', async () => {
  const { session } = await render();
  session.config.dropout = { rate: 0.8 };
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
  expect(session.state?.updates).toBe(1);
  expect(session.status).toBe('ready');
  session.command('STEP_BATCH');
  await flushPromises();
  expect(JSON.stringify(session.state)).toBe(expected);
});

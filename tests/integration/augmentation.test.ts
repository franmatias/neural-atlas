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
async function render(recipe: 'circles' | 'moons' = 'circles') {
  const f = trainingFixture(recipe),
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
  return { wrapper, session, f };
}
it('solo train aumenta; las métricas y la animación conservan originales y checkpoint', async () => {
  const { wrapper, session, f } = await render();
  const checkbox = wrapper
    .findAll('label')
    .find((l) => l.text().includes('Activar aumento conservador de train'))!
    .get('input');
  await checkbox.setValue(true);
  expect(session.source!.input.train.ids.length).toBeGreaterThan(f.split.train.length);
  expect(session.source!.input.trainEvaluation!.ids).toEqual(f.split.train);
  expect(wrapper.get('.augmentation-counts').text()).toContain('56 originales');
  session.initialize();
  await flushPromises();
  session.command('STEP_BATCH');
  await flushPromises();
  session.analyze('train');
  await flushPromises();
  expect(session.analysis!.predictions).toHaveLength(f.split.train.length);
  expect(session.evaluation!.kind).toBe('classification');
  const before = JSON.stringify(session.state);
  await wrapper
    .findAll('button')
    .find((b) => b.text() === 'Alternar posición original y copia')!
    .trigger('click');
  expect(JSON.stringify(session.state)).toBe(before);
  const file = session.capture();
  session.command('STEP_BATCH');
  await flushPromises();
  const expected = JSON.stringify(session.state);
  await session.restore(file);
  await flushPromises();
  session.command('STEP_BATCH');
  await flushPromises();
  expect(JSON.stringify(session.state)).toBe(expected);
});
it('la política desconocida no permite activación automática; se puede desactivar una configuración', async () => {
  const { wrapper, session } = await render('moons');
  const checkbox = wrapper
    .findAll('label')
    .find((l) => l.text().includes('Activar aumento conservador de train'))!
    .get('input');
  expect(checkbox.attributes('disabled')).toBeDefined();
  session.config.augmentation = { policy: 'circles', sigma: 0.01, copies: 1, seed: 42 };
  await flushPromises();
  session.initialize();
  await flushPromises();
  expect(session.error).toBe('AUGMENTATION_POLICY');
  await checkbox.setValue(false);
  expect(session.config.augmentation).toBeUndefined();
});

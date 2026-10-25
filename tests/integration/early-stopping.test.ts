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
async function render(epochs = 20) {
  const f = trainingFixture(),
    data = useDatasetsStore(),
    session = useTrainingStore();
  data.replace(f.dataset, f.split);
  data.prepared = f.prepared;
  await flushPromises();
  session.config = {
    ...f.input.config,
    epochs,
    initialization: 'zero',
    optimizer: { ...f.input.config.optimizer, rate: 1e-5, minimum: 1e-5 },
  };
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
  const checkbox = wrapper
    .findAll('input[type=checkbox]')
    .find((input) =>
      input.element.parentElement?.textContent?.includes('Activar parada temprana'),
    )!;
  await checkbox.setValue(true);
  const field = (label: string) =>
    wrapper
      .findAll('label')
      .find((item) => item.text().startsWith(label))!
      .get('input');
  await field('Paciencia en épocas').setValue('5');
  await field('Mejora mínima de validación').setValue('0.01');
  session.initialize();
  await flushPromises();
  return { wrapper, session, checkbox };
}
it('detiene, distingue época observada/restaurada y exige preparar continuación explícita', async () => {
  const { wrapper, session } = await render();
  session.command('RUN');
  await flushPromises();
  expect(session.status).toBe('stopped');
  expect(session.state?.epoch).toBe(1);
  expect(session.state?.earlyStopping?.stoppedAt).toBe(6);
  expect(wrapper.get('.early-result').text()).toContain('época 6');
  expect(wrapper.get('.early-result').text()).toContain('época 1');
  const find = (name: string) =>
    wrapper.findAll('button').find((button) => button.text() === name)!;
  expect(find('Entrenar').attributes('disabled')).toBeDefined();
  await find('Preparar continuación desde el mejor estado').trigger('click');
  expect(session.state?.earlyStopping?.reason).toBe('patience');
  await find('Confirmar continuación').trigger('click');
  await flushPromises();
  expect(session.status).toBe('paused');
  expect(session.state?.updates).toBe(7);
  session.command('STEP_BATCH');
  await flushPromises();
  expect(session.state?.updates).toBe(8);
  expect(session.state?.earlyStopping?.lastReport?.stoppedAt).toBe(6);
});
it('la congelación tras parar impide continuar y la restauración del archivo no arranca sola', async () => {
  const { wrapper, session } = await render();
  session.command('RUN');
  await flushPromises();
  const file = session.capture();
  await session.restore(file);
  await flushPromises();
  expect(session.status).toBe('stopped');
  expect(session.state?.epoch).toBe(1);
  session.freezeAndTest();
  await flushPromises();
  expect(session.consulted).toBe(true);
  expect(session.state?.frozen).toBe(true);
  const button = wrapper
    .findAll('button')
    .find((button) => button.text() === 'Preparar continuación desde el mejor estado')!;
  expect(button.attributes('disabled')).toBeDefined();
  session.continueFromBest();
  await flushPromises();
  expect(session.error).toBe('INVALID_STATE');
  expect(session.state?.frozen).toBe(true);
});
it('restaura al agotar horizonte y conserva desactivación compatible en sesión nueva', async () => {
  const { session, checkbox } = await render(3);
  session.command('RUN');
  await flushPromises();
  expect(session.status).toBe('completed');
  expect(session.state?.earlyStopping?.reason).toBe('horizon');
  session.reset();
  await flushPromises();
  await checkbox.setValue(false);
  expect(session.config.earlyStopping).toBeUndefined();
  session.initialize();
  await flushPromises();
  session.continueFromBest();
  await flushPromises();
  expect(session.error).toBe('INVALID_STATE');
});

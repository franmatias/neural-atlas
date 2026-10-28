import { it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia, disposePinia, type Pinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import PermutationPage from '@/features/experiments/PermutationPage.vue';
import { usePermutationStore } from '@/stores/permutation';
import { useDatasetsStore } from '@/stores/datasets';
import { usePreferencesStore } from '@/stores/preferences';
import { handleDataJob, type DataJob } from '@/application/data/jobs';
import { defaultPermutation } from '@/application/training/permutation';

class WorkerDouble {
  static defer = false;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror = null;
  terminated = false;
  postMessage(v: { id: number; job: DataJob }) {
    const copy = structuredClone(v);
    if (WorkerDouble.defer) return;
    queueMicrotask(() => {
      if (!this.terminated)
        this.onmessage?.({ data: handleDataJob(copy.id, copy.job) } as MessageEvent);
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
  vi.stubGlobal('Worker', WorkerDouble);
  vi.stubGlobal(
    'URL',
    Object.assign(URL, {
      createObjectURL: vi.fn(() => 'blob:classical'),
      revokeObjectURL: vi.fn(),
    }),
  );
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => {
  disposePinia(pinia);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
async function render() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: PermutationPage },
      { path: '/:pathMatch(.*)*', component: { template: '<p>Destino</p>' } },
    ],
  });
  await router.push('/');
  await router.isReady();
  const store = usePermutationStore();
  store.options = { ...defaultPermutation, epochs: 5 };
  const wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [pinia, router] } });
  await flushPromises();
  const button = (t: string) => wrapper.findAll('button').find((b) => b.text() === t)!;
  return { wrapper, router, store, button };
}

it('análisis, reproducción, informe y modelo, sin modificar el laboratorio', async () => {
  const { wrapper, store, button } = await render();
  const before = JSON.stringify(useDatasetsStore().dataset);
  await button('Calcular importancia').trigger('click');
  await flushPromises();
  expect(store.result?.results).toHaveLength(2);
  expect(wrapper.find('svg').exists()).toBe(true);
  expect(JSON.stringify(useDatasetsStore().dataset)).toBe(before);
  await button('Paso siguiente').trigger('click');
  expect(wrapper.text()).toContain('Paso 2 / 12');
  await button('Paso anterior').trigger('click');
  vi.useFakeTimers();
  await button('Reproducir recorrido').trigger('click');
  await vi.advanceTimersByTimeAsync(800);
  await button('Pausar recorrido').trigger('click');
  vi.useRealTimers();
  await button('Exportar informe de importancia').trigger('click');
  await button('Exportar red congelada').trigger('click');
  expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(2);
  await wrapper.findAll('select').at(-2)!.setValue(1);
  await wrapper.findAll('select').at(-1)!.setValue(1);
  const prefs = usePreferencesStore();
  prefs.value.motion = 'reduced';
  await flushPromises();
  expect(button('Reproducir recorrido').attributes('disabled')).toBeDefined();
  wrapper.unmount();
});
it('cancelación, error y salida conservan resultados completos', async () => {
  const { wrapper, store, router } = await render();
  await store.run();
  const old = store.result;
  store.options.repetitions = 99;
  await store.run();
  expect(store.error).toContain('No se completó');
  expect(store.result).toBe(old);
  store.options.repetitions = 5;
  WorkerDouble.defer = true;
  const pending = store.run();
  await router.push('/elsewhere');
  await pending;
  expect(store.busy).toBe(false);
  expect(store.result).toBe(old);
  wrapper.unmount();
});
it('checkpoint ausente se explica y el caso correlacionado identifica tres entradas', async () => {
  const { wrapper, button, store } = await render();
  await wrapper.findAll('select')[0]!.setValue('checkpoint');
  await button('Calcular importancia').trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('Detén e inicializa');
  await wrapper.findAll('select')[0]!.setValue('synthetic');
  store.options.recipe = 'correlated';
  await button('Calcular importancia').trigger('click');
  await flushPromises();
  expect(store.result?.results).toHaveLength(3);
  wrapper.unmount();
});

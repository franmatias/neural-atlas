import { it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia, disposePinia, type Pinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import ClassicalPage from '@/features/classical/ClassicalPage.vue';
import { useClassicalStore } from '@/stores/classical';
import { useDatasetsStore } from '@/stores/datasets';
import { usePreferencesStore } from '@/stores/preferences';
import { handleDataJob, type DataJob } from '@/application/data/jobs';
import { defaultClassicalOptions } from '@/application/training/classical-comparison';
import { trainingFixture } from '../fixtures/training';
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
      { path: '/', component: ClassicalPage },
      { path: '/:pathMatch(.*)*', component: { template: '<p>Destino</p>' } },
    ],
  });
  await router.push('/');
  await router.isReady();
  const store = useClassicalStore();
  store.options = { ...defaultClassicalOptions, epochs: 5 };
  const wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [pinia, router] } });
  await flushPromises();
  const button = (t: string) => wrapper.findAll('button').find((b) => b.text() === t)!;
  return { wrapper, router, store, button };
}
it('compara, explica, anima, exporta y prueba el archivo sin sustituir datos', async () => {
  const { wrapper, store, button } = await render(),
    data = useDatasetsStore(),
    before = structuredClone(data.dataset);
  await button('Comparar tres modelos').trigger('click');
  await flushPromises();
  expect(store.result?.runs).toHaveLength(3);
  expect(wrapper.findAll('svg')).toHaveLength(3);
  expect(data.dataset).toEqual(before);
  await button('Predecir con los tres modelos').trigger('click');
  await flushPromises();
  expect(store.probe?.knn.neighbors).toHaveLength(5);
  const input = wrapper.findAll('fieldset').at(-1)!.find('input');
  await input.setValue('');
  await button('Predecir con los tres modelos').trigger('click');
  await flushPromises();
  expect(store.probe).toBeDefined();
  await button('Paso siguiente').trigger('click');
  await button('Paso anterior').trigger('click');
  vi.useFakeTimers();
  await button('Reproducir recorrido').trigger('click');
  await vi.advanceTimersByTimeAsync(800);
  await button('Pausar recorrido').trigger('click');
  vi.useRealTimers();
  await wrapper
    .findAll('select')
    .find((s) => s.text().includes('Ruta del árbol'))!
    .setValue('cart');
  expect(wrapper.find('[aria-label="Árbol de decisiones y ruta de la sonda"]').exists()).toBe(true);
  await button('Paso siguiente').trigger('click');
  await button('Exportar informe de métricas').trigger('click');
  await wrapper.get('input[type=checkbox]').setValue(true);
  await button('Exportar modelo KNN').trigger('click');
  await button('Exportar modelo CART').trigger('click');
  await button('Exportar modelo MLP').trigger('click');
  expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(4);
  const file = wrapper.get('input[type=file]');
  Object.defineProperty(file.element, 'files', {
    configurable: true,
    value: [
      {
        size: 100,
        arrayBuffer: async () => new TextEncoder().encode(store.result!.artifacts.cart).buffer,
      },
    ],
  });
  await file.trigger('change');
  await flushPromises();
  expect(wrapper.text()).toContain('Archivo válido · CART');
  const queryInput = wrapper.findAll('fieldset').at(-1)!.get('input');
  await queryInput.setValue('0.25');
  await button('Predecir con el archivo').trigger('click');
  await flushPromises();
  expect(store.imported?.prediction.path.length).toBeGreaterThan(0);
  expect((queryInput.element as HTMLInputElement).value).toBe('0.25');
  expect(store.imported?.provenance.testPreviouslyConsulted).toBe(false);
  wrapper.unmount();
});
it('copia el laboratorio con su pipeline, admite regresión y no deja actuar a una respuesta cancelada', async () => {
  const { wrapper, store, button, router } = await render(),
    data = useDatasetsStore();
  const f = trainingFixture('sine', 40);
  data.replace(f.dataset, f.split);
  data.prepared = f.prepared;
  await wrapper.findAll('select')[0]!.setValue('workspace');
  await button('Comparar tres modelos').trigger('click');
  await flushPromises();
  expect(store.result?.task).toBe('regression');
  expect(wrapper.text()).toContain('MSE · unidades²');
  expect(store.result?.pipeline).toEqual(f.prepared.pipeline);
  const previous = store.result;
  WorkerDouble.defer = true;
  const pending = store.run();
  store.cancel();
  await pending;
  expect(store.result).toBe(previous);
  expect(store.busy).toBe(false);
  WorkerDouble.defer = false;
  await router.push('/elsewhere');
  wrapper.unmount();
});
it('errores de estudio/archivo/sonda conservan lo confirmado y lectura tardía se descarta al salir', async () => {
  const { wrapper, store, router } = await render();
  await store.run();
  const before = store.result;
  store.options.k = 100;
  await store.run();
  expect(store.error).toContain('No se completó');
  expect(store.result).toBe(before);
  await store.inspect(before!.artifacts.knn);
  const imported = store.imported;
  await store.inspect('{}');
  expect(store.imported).toBe(imported);
  await store.query({});
  expect(store.error).toContain('sonda');
  await store.queryFile({});
  expect(store.error).toContain('Sonda');
  const input = wrapper.get('input[type=file]');
  Object.defineProperty(input.element, 'files', {
    configurable: true,
    value: [{ size: 9 * 1024 * 1024 }],
  });
  await input.trigger('change');
  await flushPromises();
  expect(wrapper.text()).toContain('Archivo ilegible');
  let complete!: (v: ArrayBuffer) => void;
  Object.defineProperty(input.element, 'files', {
    configurable: true,
    value: [
      {
        size: 100,
        arrayBuffer: () =>
          new Promise<ArrayBuffer>((resolve) => {
            complete = resolve;
          }),
      },
    ],
  });
  await input.trigger('change');
  await router.push('/away');
  complete(new TextEncoder().encode(before!.artifacts.cart).buffer);
  await flushPromises();
  expect(store.imported).toBe(imported);
  wrapper.unmount();
});
it('sin división explica el requisito; movimiento reducido permite pasos manuales y el mapa admite sonda', async () => {
  const { wrapper, store, button } = await render();
  await wrapper.findAll('select')[0]!.setValue('workspace');
  await button('Comparar tres modelos').trigger('click');
  expect(wrapper.text()).toContain('Divide los datos');
  await wrapper.findAll('select')[0]!.setValue('preset');
  await button('Comparar tres modelos').trigger('click');
  await flushPromises();
  usePreferencesStore().update({ motion: 'reduced' });
  await flushPromises();
  expect(button('Reproducir recorrido').attributes('disabled')).toBeDefined();
  const svg = wrapper.findAll('svg')[0]!;
  vi.spyOn(svg.element, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: 420,
    height: 320,
    right: 420,
    bottom: 320,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  await svg.trigger('click', { clientX: 200, clientY: 150 });
  await flushPromises();
  expect(store.probe?.features.x1).toBeTypeOf('number');
  wrapper.unmount();
});

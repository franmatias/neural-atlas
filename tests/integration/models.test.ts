import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import ModelsPage from '@/features/models/ModelsPage.vue';
import { useInferenceStore } from '@/stores/inference';
import { useTrainingStore } from '@/stores/training';
import { useDatasetsStore } from '@/stores/datasets';
import { handleDataJob, type DataJob } from '@/application/data/jobs';
import { exportInferenceModel } from '@/application/training/inference-model';
import { inferenceFixture } from '../fixtures/models';
class WorkerDouble {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror = null;
  terminated = false;
  postMessage(message: { id: number; job: DataJob }) {
    const copy = structuredClone(message);
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
  vi.stubGlobal('Worker', WorkerDouble);
});
afterEach(() => {
  disposePinia(pinia);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
async function render(recipe: 'moons' | 'flowers' | 'sine' = 'moons', categorical = false) {
  const data = useDatasetsStore(),
    session = useTrainingStore(),
    inference = useInferenceStore(),
    f = inferenceFixture(recipe, categorical);
  data.replace(f.dataset, f.split);
  data.prepared = f.prepared;
  await flushPromises();
  session.input = f.input;
  session.state = f.experiment.checkpoint;
  session.status = 'paused';
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/modelos', component: ModelsPage },
      { path: '/biblioteca', component: { template: '<h1>Biblioteca</h1>' } },
      { path: '/lab/entrenamiento', component: { template: '<h1>Entrenamiento</h1>' } },
    ],
  });
  await router.push('/modelos');
  await router.isReady();
  const wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [pinia, router] } });
  await flushPromises();
  const button = (text: string) => wrapper.findAll('button').find((b) => b.text() === text)!;
  return { wrapper, button, router, session, data, inference, f };
}
describe('Archivos de modelo e inferencia en la interfaz', () => {
  it('no abre un archivo cuya lectura termina después de abandonar la pantalla', async () => {
    const { wrapper, router, inference, f } = await render();
    let finish!: (value: ArrayBuffer) => void;
    const pending = new Promise<ArrayBuffer>((resolve) => {
      finish = resolve;
    });
    const input = wrapper.get('input[type=file]');
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [{ size: 1, arrayBuffer: () => pending }],
    });
    await input.trigger('change');
    await router.push('/biblioteca');
    finish(new TextEncoder().encode(exportInferenceModel(f.model)).buffer);
    await flushPromises();
    expect(inference.model).toBeUndefined();
    expect(inference.busy).toBe(false);
  });
  it.each(['moons', 'flowers', 'sine'] as const)(
    'copia y predice %s sin modificar el laboratorio, preserva al navegar y permite cerrar',
    async (recipe) => {
      const { wrapper, button, router, session, inference } = await render(
        recipe,
        recipe === 'moons',
      );
      expect(wrapper.text()).toContain('No hay un modelo');
      await inference.predict();
      expect(await inference.exportFile()).toBeUndefined();
      const original = session.state;
      await button('Copiar modelo de la sesión').trigger('click');
      await flushPromises();
      expect(wrapper.text()).toContain('Modelo listo');
      await wrapper.get('form').trigger('submit');
      await flushPromises();
      expect(wrapper.get('.prediction-result').text()).toContain(
        recipe === 'sine' ? 'Predicción numérica' : 'Decisión:',
      );
      expect(session.state).toBe(original);
      if (recipe === 'moons') {
        const checks = wrapper.findAll('input[type=checkbox]');
        await checks[0]!.setValue(true);
        await flushPromises();
        expect(inference.result).toBeUndefined();
        await wrapper.get('form').trigger('submit');
        await flushPromises();
        expect(inference.result?.transformed[1]).toBe(1);
        await checks[0]!.setValue(false);
        await wrapper.get('input[type=text]').setValue('desconocida');
        await wrapper.get('form').trigger('submit');
        await flushPromises();
        expect(wrapper.text()).toContain('categorías desconocidas');
      }
      await router.push('/biblioteca');
      await router.push('/modelos');
      await flushPromises();
      expect(wrapper.text()).toContain('Modelo listo');
      await button('Cerrar copia de inferencia').trigger('click');
      await button('Mantener copia').trigger('click');
      expect(inference.model).toBeDefined();
      await button('Cerrar copia de inferencia').trigger('click');
      await button('Confirmar cierre').trigger('click');
      expect(inference.model).toBeUndefined();
      expect(session.state).toBe(original);
    },
  );
  it('valida antes de reemplazar, descarga con limpieza y conserva copia ante falta de Worker', async () => {
    const { wrapper, button, inference, f } = await render();
    const input = wrapper.get('input[type=file]');
    async function file(content: string, size = content.length) {
      Object.defineProperty(input.element, 'files', {
        configurable: true,
        value: [{ size, arrayBuffer: async () => new TextEncoder().encode(content).buffer }],
      });
      await input.trigger('change');
      await flushPromises();
    }
    await input.trigger('change');
    await file(exportInferenceModel(f.model));
    const previous = inference.model;
    expect(previous).toBeDefined();
    await file('invalid');
    expect(inference.model).toBe(previous);
    expect(wrapper.text()).toContain('integridad');
    await file('', 9 * 1024 * 1024);
    expect(wrapper.text()).toContain('No se ha leído');
    const create = vi.fn(() => 'blob:model'),
      revoke = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: create });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.useFakeTimers();
    await button('Exportar modelo sin dataset').trigger('click');
    await flushPromises();
    expect(create).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(1000);
    expect(revoke).toHaveBeenCalledOnce();
    vi.useRealTimers();
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          throw new Error('Denied');
        }
      },
    );
    await file(exportInferenceModel(f.model));
    expect(inference.model).toBe(previous);
    expect(wrapper.text()).toContain('Web Workers');
  });
  it('descarta trabajo cancelado y controla captura inválida o lectura fallida', async () => {
    const { wrapper, button, session, inference, f } = await render();
    const pending = inference.importFile(exportInferenceModel(f.model));
    inference.cancel();
    await pending;
    expect(inference.model).toBeUndefined();
    expect(inference.error).toBe('');
    const bad = structuredClone(f.experiment);
    bad.pipelineHash = '0'.repeat(64);
    await inference.useExperiment(bad);
    expect(inference.error).toContain('integridad');
    vi.spyOn(session, 'capture').mockImplementationOnce(() => {
      throw new Error('Busy');
    });
    await button('Copiar modelo de la sesión').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Pausa el entrenamiento');
    const input = wrapper.get('input[type=file]');
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [{ size: 1, arrayBuffer: async () => new Uint8Array([255]).buffer }],
    });
    await input.trigger('change');
    await flushPromises();
    expect(wrapper.text()).toContain('No se ha leído');
  });
});

import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPinia, setActivePinia, disposePinia, type Pinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { useTeachingStore } from '@/stores/teaching';
import TeachingPage from '@/features/teaching/TeachingPage.vue';
import { handleDataJob, type DataJob } from '@/application/data/jobs';
import { LearningLibrary } from '@/infrastructure/storage/learning-library';
import { libraryPort } from '../fixtures/library-port';
import { teachingExample } from '../fixtures/teaching';
import { useDatasetsStore } from '@/stores/datasets';
import { useTrainingStore } from '@/stores/training';
import { trainingFixture } from '../fixtures/training';
import { initialSession } from '@/domain/training/session';
import { exhaust } from '@/domain/training/kernel';
class WorkerDouble {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror = null;
  terminated = false;
  postMessage(v: { id: number; job: DataJob }) {
    queueMicrotask(() => {
      if (!this.terminated)
        this.onmessage?.({ data: handleDataJob(v.id, structuredClone(v.job)) } as MessageEvent);
    });
  }
  terminate() {
    this.terminated = true;
  }
}
let pinia: Pinia, port: ReturnType<typeof libraryPort>;
beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  port = libraryPort();
  vi.stubGlobal('indexedDB', port.factory);
  vi.stubGlobal('Worker', WorkerDouble);
});
afterEach(() => {
  disposePinia(pinia);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it('instala y restaura solo al completar, versiones, cuota, conflicto, cancelación y retirada', async () => {
  const store = useTeachingStore(),
    p = teachingExample();
  await store.load();
  await store.load();
  await store.inspect('bad');
  expect(store.error).toContain('rechazado');
  const pending = store.inspect(JSON.stringify(p));
  store.cancel();
  await pending;
  expect(store.preview).toBeUndefined();
  await store.inspect(JSON.stringify(p));
  port.failWrite(new DOMException('full', 'QuotaExceededError'));
  await store.install();
  expect(store.records).toHaveLength(0);
  expect(store.preview).toBeDefined();
  await store.install();
  expect(store.records).toHaveLength(1);
  await store.refresh();
  expect(store.records[0]!.value.title).toBe(p.title);
  await store.inspect(JSON.stringify(p));
  await store.install();
  expect(store.notice).toContain('ya está');
  p.title = 'Otra';
  await store.inspect(JSON.stringify(p));
  await store.install();
  expect(store.error).toContain('versión');
  p.version = '1.1.0';
  await store.inspect(JSON.stringify(p));
  await store.install();
  expect(store.records[0]!.revision).toBe(2);
  port.failWrite(new DOMException('full', 'QuotaExceededError'));
  await store.remove(p.packId);
  expect(store.error).toContain('retiró');
  expect(store.records).toHaveLength(1);
  await store.remove('missing');
  await store.remove(p.packId);
  expect(store.records).toHaveLength(0);
  await new LearningLibrary().save('teachingPacks', p.packId, p, 0);
  await store.inspect(JSON.stringify(p));
  await store.install();
  expect(store.error).toContain('conflicto');
  await store.refresh();
  (port.tables.teachingPacks!.get(p.packId) as { integrity: string }).integrity = 'bad';
  await store.refresh();
  expect(store.error).toContain('leer');
  expect(port.tables.teachingPacks!.size).toBe(1);
});
async function render() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/docencia', component: TeachingPage },
      { path: '/:pathMatch(.*)*', component: { template: '<p>Destino</p>' } },
    ],
  });
  await router.push('/docencia');
  await router.isReady();
  const wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [pinia, router] } });
  await flushPromises();
  const button = (t: string) => wrapper.findAll('button').find((b) => b.text() === t)!;
  return { wrapper, button, router };
}
it('preparación, guía y apertura revisable conservan datos antes de confirmar', async () => {
  const { wrapper, button, router } = await render();
  const data = useDatasetsStore(),
    original = data.hash;
  await button('Preparar previsualización').trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('Mi unidad de aprendizaje · 1.0.0');
  expect(wrapper.text()).toContain('Aún no está instalado');
  const store = useTeachingStore();
  expect(store.preview?.pack.workshops).toHaveLength(2);
  expect(JSON.stringify(store.preview)).not.toContain('"solution"');
  await button('Aplicar dataset…').trigger('click');
  expect(data.hash).toBe(original);
  await button('Conservar sesión').trigger('click');
  expect(data.hash).toBe(original);
  await button('Aplicar dataset…').trigger('click');
  await button('Confirmar apertura del recurso').trigger('click');
  await flushPromises();
  expect(store.notice).toContain('petición explícita');
  await button('Confirmar instalación').trigger('click');
  await flushPromises();
  expect(store.records).toHaveLength(1);
  await wrapper.findAll('select')[0]!.setValue('mi-unidad');
  await button('Retirar paquete…').trigger('click');
  await button('Conservar').trigger('click');
  await button('Retirar paquete…').trigger('click');
  await button('Confirmar retirada').trigger('click');
  await flushPromises();
  expect(store.records).toHaveLength(0);
  await button('Preparar previsualización').trigger('click');
  await flushPromises();
  await wrapper
    .findAll('button')
    .find((b) => b.text() === 'Abrir taller…')!
    .trigger('click');
  await button('Confirmar apertura del recurso').trigger('click');
  await flushPromises();
  expect(router.currentRoute.value.path).toBe('/taller');
  wrapper.unmount();
});
it('errores de preparación se explican sin modificar el registro', async () => {
  const { wrapper, button } = await render();
  await wrapper.findAll('input')[0]!.setValue('bad/id');
  await button('Preparar previsualización').trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('No se creó');
  expect(useTeachingStore().preview).toBeUndefined();
  wrapper.unmount();
});
it('prepara y exporta un preset común, lo restaura explícitamente y rechaza archivos ilegibles', async () => {
  vi.stubGlobal(
    'URL',
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:teaching'), revokeObjectURL: vi.fn() }),
  );
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const data = useDatasetsStore(),
    training = useTrainingStore(),
    f = trainingFixture();
  data.replace(f.dataset, f.split);
  data.prepared = f.prepared;
  await flushPromises();
  training.input = f.input;
  training.state = exhaust(initialSession(f.input));
  training.status = 'ready';
  const { wrapper, button } = await render();
  await wrapper
    .findAll('input[type=checkbox]')
    .find((c) => c.element.parentElement?.textContent?.includes('Incluir experimento'))!
    .setValue(true);
  await wrapper
    .findAll('input[type=checkbox]')
    .find((c) => c.element.parentElement?.textContent?.includes('Incluir soluciones'))!
    .setValue(true);
  await button('Preparar previsualización').trigger('click');
  await flushPromises();
  expect(useTeachingStore().preview?.pack.presets).toHaveLength(1);
  await button('Exportar paquete con soluciones').trigger('click');
  expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  await button('Restaurar experimento…').trigger('click');
  await button('Exportar sesión actual').trigger('click');
  await button('Exportar datos actuales').trigger('click');
  const restore = vi.spyOn(training, 'restore').mockResolvedValue();
  await button('Confirmar apertura del recurso').trigger('click');
  await flushPromises();
  expect(restore).toHaveBeenCalled();
  const input = wrapper.get('input[type=file]');
  Object.defineProperty(input.element, 'files', {
    configurable: true,
    value: [
      {
        size: 2,
        arrayBuffer: async () => new TextEncoder().encode(JSON.stringify(teachingExample())).buffer,
      },
    ],
  });
  await input.trigger('change');
  await flushPromises();
  expect(useTeachingStore().preview?.pack.title).toBe('Unidad test');
  Object.defineProperty(input.element, 'files', {
    configurable: true,
    value: [{ size: 65 * 1024 * 1024 }],
  });
  await input.trigger('change');
  await flushPromises();
  expect(wrapper.text()).toContain('Archivo ilegible');
  wrapper.unmount();
});
it('retirar conserva el paquete visible y el archivo bloqueado hasta confirmar la transacción', async () => {
  const store = useTeachingStore();
  await store.load();
  await store.inspect(JSON.stringify(teachingExample()));
  await store.install();
  const { wrapper, button } = await render();
  await wrapper.get('select').setValue('unidad-test');
  await button('Retirar paquete…').trigger('click');
  let complete!: () => void;
  const remove = vi.spyOn(LearningLibrary.prototype, 'remove').mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
  );
  await button('Confirmar retirada').trigger('click');
  expect(remove).toHaveBeenCalled();
  expect(wrapper.findAll('h2').some((h) => h.text() === 'Unidad test · 1.0.0')).toBe(true);
  expect(wrapper.get('input[type=file]').attributes('disabled')).toBeDefined();
  expect(store.records).toHaveLength(1);
  complete();
  await flushPromises();
  expect(wrapper.findAll('h2').some((h) => h.text() === 'Unidad test · 1.0.0')).toBe(false);
  expect(wrapper.get('input[type=file]').attributes('disabled')).toBeUndefined();
  expect(store.records).toHaveLength(0);
  wrapper.unmount();
});
it('lectura pendiente se cancela y una respuesta tardía no instala ni sustituye la previsualización', async () => {
  const { wrapper, button, router } = await render();
  const input = wrapper.get('input[type=file]');
  let complete!: (bytes: ArrayBuffer) => void;
  Object.defineProperty(input.element, 'files', {
    configurable: true,
    value: [
      {
        size: 10,
        arrayBuffer: () =>
          new Promise<ArrayBuffer>((resolve) => {
            complete = resolve;
          }),
      },
    ],
  });
  await input.trigger('change');
  expect(button('Preparar previsualización').attributes('disabled')).toBeDefined();
  await button('Cancelar validación').trigger('click');
  complete(new TextEncoder().encode(JSON.stringify(teachingExample())).buffer);
  await flushPromises();
  expect(useTeachingStore().preview).toBeUndefined();
  await input.trigger('change');
  await router.push('/taller');
  complete(new TextEncoder().encode(JSON.stringify(teachingExample())).buffer);
  await flushPromises();
  expect(useTeachingStore().preview).toBeUndefined();
  wrapper.unmount();
});

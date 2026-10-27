import { it, expect, vi, afterEach, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia, disposePinia, type Pinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import OfflinePage from '@/features/offline/OfflinePage.vue';
import { OfflineClient } from '@/infrastructure/pwa/offline';
import { useTrainingStore } from '@/stores/training';
import { libraryPort } from '../fixtures/library-port';
vi.mock('@/infrastructure/workers/recovery-client', () => ({
  requestRecovery: vi.fn(async () => undefined),
}));
let pinia: Pinia;
beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  vi.stubGlobal('indexedDB', libraryPort().factory);
  vi.stubGlobal(
    'URL',
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:offline'), revokeObjectURL: vi.fn() }),
  );
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => {
  disposePinia(pinia);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function render() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: OfflinePage },
      { path: '/:pathMatch(.*)*', component: { template: '<div>Destino</div>' } },
    ],
  });
  await router.push('/');
  await router.isReady();
  const wrapper = mount(OfflinePage, { global: { plugins: [pinia, router] } });
  await flushPromises();
  const button = (text: string) => wrapper.findAll('button').find((b) => b.text() === text)!;
  return { wrapper, button };
}
it('muestra disponibilidad real, prepara, exporta y bloquea actualizar durante entrenamiento o sin confirmar', async () => {
  const reg = {
    active: {},
    waiting: {},
    update: vi.fn(async () => {}),
  } as unknown as ServiceWorkerRegistration;
  vi.spyOn(OfflineClient.prototype, 'registration').mockResolvedValue(reg);
  vi.spyOn(OfflineClient.prototype, 'status').mockResolvedValue({
    version: '1.1.0',
    ready: true,
    count: 120,
  });
  const activate = vi
    .spyOn(OfflineClient.prototype, 'activate')
    .mockRejectedValue(Error('OTHER_TABS'));
  const { wrapper, button } = await render();
  expect(wrapper.text()).toContain('Disponible sin conexión');
  expect(button('Activar nueva versión y recargar').attributes('disabled')).toBeDefined();
  await button('Preparar o comprobar actualización').trigger('click');
  await flushPromises();
  expect(reg.update).toHaveBeenCalled();
  await button('Exportar datos actuales').trigger('click');
  await button('Exportar cuaderno actual').trigger('click');
  expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(2);
  await wrapper.get('input[type=checkbox]').setValue(true);
  const training = useTrainingStore();
  training.status = 'running';
  await flushPromises();
  expect(button('Activar nueva versión y recargar').attributes('disabled')).toBeDefined();
  const pause = vi.spyOn(training, 'command').mockImplementation(() => {});
  await button('Pausar entrenamiento').trigger('click');
  expect(pause).toHaveBeenCalledWith('PAUSE');
  training.status = 'ready';
  await flushPromises();
  await button('Activar nueva versión y recargar').trigger('click');
  await flushPromises();
  expect(activate).toHaveBeenCalled();
  expect(wrapper.text()).toContain('otras pestañas');
  window.dispatchEvent(new Event('offline'));
  window.dispatchEvent(new Event('online'));
  await button('Comprobar estado').trigger('click');
  await flushPromises();
  wrapper.unmount();
});
it('estado incompleto se repara y un fallo de red no se presenta como listo', async () => {
  const reg = {
    active: {},
    waiting: null,
    update: vi.fn(async () => {}),
  } as unknown as ServiceWorkerRegistration;
  const register = vi.spyOn(OfflineClient.prototype, 'registration').mockResolvedValue(reg);
  vi.spyOn(OfflineClient.prototype, 'status').mockResolvedValue({
    version: '1.1.0',
    ready: false,
    count: 120,
  });
  const repair = vi.spyOn(OfflineClient.prototype, 'repair').mockResolvedValue();
  const { wrapper, button } = await render();
  await button('Preparar o comprobar actualización').trigger('click');
  await flushPromises();
  expect(repair).toHaveBeenCalled();
  expect(wrapper.text()).toContain('incompleto');
  register.mockRejectedValue(Error('OFFLINE'));
  await button('Preparar o comprobar actualización').trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('no permite comprobar');
  wrapper.unmount();
});

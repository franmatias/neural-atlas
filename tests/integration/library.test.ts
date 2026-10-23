import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import LibraryPage from '@/features/library/LibraryPage.vue';
import { useTrainingStore } from '@/stores/training';
import { useDatasetsStore } from '@/stores/datasets';
import { initialSession } from '@/domain/training/session';
import { exhaust } from '@/domain/training/kernel';
import { exportExperiment } from '@/application/training/experiment';
import { ExperimentLibrary, LibraryError } from '@/infrastructure/storage/experiment-library';
import { libraryPort } from '../fixtures/library-port';
import { trainingFixture } from '../fixtures/training';
let pinia: Pinia;
beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  vi.stubGlobal('indexedDB', libraryPort().factory);
});
afterEach(() => {
  disposePinia(pinia);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
async function render(withSession = true) {
  const data = useDatasetsStore(),
    session = useTrainingStore();
  if (withSession) {
    const f = trainingFixture();
    data.replace(f.dataset, f.split);
    data.prepared = f.prepared;
    await flushPromises();
    session.input = f.input;
    session.state = exhaust(initialSession(f.input));
    session.status = 'ready';
  }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: LibraryPage },
      { path: '/lab/entrenamiento', component: { template: '<p>Entrenar</p>' } },
    ],
  });
  await router.push('/');
  await router.isReady();
  const wrapper = mount(LibraryPage, { global: { plugins: [pinia, router] } });
  await flushPromises();
  const button = (name: string) => wrapper.findAll('button').find((b) => b.text() === name)!;
  return { wrapper, session, button };
}
describe('Biblioteca en la interfaz', () => {
  it('guarda, confirma sustituciones y borrados, abre y exporta con limpieza del recurso', async () => {
    const { wrapper, session, button } = await render();
    const restore = vi.spyOn(session, 'restore').mockResolvedValue();
    const create = vi.fn(() => 'blob:experiment'),
      revoke = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }));
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await wrapper.get('input[maxlength]').setValue('Lunas');
    await button('Guardar como nuevo').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Experimento guardado');
    expect(wrapper.findAll('.library-list li')).toHaveLength(1);
    await button('Actualizar Lunas con sesión actual').trigger('click');
    await button('Cancelar cambio').trigger('click');
    expect(wrapper.find('[aria-label="Confirmar cambio en biblioteca"]').exists()).toBe(false);
    await button('Actualizar Lunas con sesión actual').trigger('click');
    await button('Confirmar cambio').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Revisión 2');
    await button('Abrir Lunas').trigger('click');
    await button('Confirmar cambio').trigger('click');
    await flushPromises();
    expect(restore).toHaveBeenCalledOnce();
    vi.useFakeTimers();
    await button('Exportar sesión JSON').trigger('click');
    await flushPromises();
    await button('Exportar Lunas').trigger('click');
    await flushPromises();
    expect(create).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(1000);
    expect(revoke).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
    await button('Eliminar Lunas').trigger('click');
    await button('Confirmar cambio').trigger('click');
    await flushPromises();
    expect(wrapper.findAll('.library-list li')).toHaveLength(0);
  });
  it('previsualiza archivos, rechaza errores y permite abrir o descartar sin guardado implícito', async () => {
    const { wrapper, session, button } = await render();
    const restore = vi.spyOn(session, 'restore').mockResolvedValue();
    const text = exportExperiment(session.capture());
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
    await file(text);
    expect(wrapper.text()).toContain('Archivo validado');
    await button('Descartar archivo').trigger('click');
    await file(text);
    await button('Abrir archivo y sustituir sesión').trigger('click');
    await flushPromises();
    expect(restore).toHaveBeenCalledOnce();
    expect(wrapper.findAll('.library-list li')).toHaveLength(0);
    await file('invalid');
    expect(wrapper.find('[role=alert]').exists()).toBe(true);
    await file('', 65 * 1024 * 1024);
    expect(wrapper.find('[role=alert]').exists()).toBe(true);
  });
  it('explica memoria y acceso denegado, refresca tras conflictos y muestra registros congelados', async () => {
    vi.spyOn(ExperimentLibrary.prototype, 'list').mockRejectedValueOnce(
      new LibraryError('UNAVAILABLE'),
    );
    const { wrapper, session, button } = await render(false);
    expect(wrapper.text()).toContain('El navegador no permite guardar');
    expect(wrapper.text()).toContain('Inicializa un modelo');
    await button('Actualizar biblioteca').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Almacenamiento local disponible');
    vi.spyOn(ExperimentLibrary.prototype, 'list').mockRejectedValueOnce(
      new LibraryError('BLOCKED'),
    );
    await button('Actualizar biblioteca').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Otra pestaña bloquea');
    await button('Actualizar biblioteca').trigger('click');
    await flushPromises();
    const f = trainingFixture(),
      data = useDatasetsStore();
    data.replace(f.dataset, f.split);
    data.prepared = f.prepared;
    await flushPromises();
    session.input = f.input;
    session.state = { ...exhaust(initialSession(f.input)), frozen: true };
    session.status = 'frozen';
    await button('Guardar como nuevo').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Modelo congelado');
    vi.spyOn(ExperimentLibrary.prototype, 'save').mockRejectedValueOnce(
      new LibraryError('CONFLICT'),
    );
    await button('Guardar como nuevo').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Otra pestaña modificó');
    vi.spyOn(ExperimentLibrary.prototype, 'list').mockRejectedValueOnce(
      new LibraryError('UNAVAILABLE'),
    );
    vi.spyOn(ExperimentLibrary.prototype, 'save').mockRejectedValueOnce(
      new LibraryError('MISSING'),
    );
    await button('Guardar como nuevo').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('ya no existe');
  });
});

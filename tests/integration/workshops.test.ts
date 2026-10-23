import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia, disposePinia, type Pinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import WorkshopsPage from '@/features/workshops/WorkshopsPage.vue';
import { useWorkshopsStore } from '@/stores/workshops';
import { useDatasetsStore } from '@/stores/datasets';
import { useTrainingStore } from '@/stores/training';
import { workshops } from '@/content/workshops';
import { handleDataJob, type DataJob } from '@/application/data/jobs';
import { WorkshopLibrary } from '@/infrastructure/storage/workshop-library';
import { LibraryError } from '@/infrastructure/storage/database';
import { exportWorkshop, definitionHash } from '@/application/workshops/contracts';
import { libraryPort } from '../fixtures/library-port';
class WorkerDouble {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror = null;
  terminated = false;
  postMessage(value: { id: number; job: DataJob }) {
    const copy = structuredClone(value);
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
  vi.stubGlobal('indexedDB', libraryPort().factory);
});
afterEach(() => {
  disposePinia(pinia);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
async function render(index = 0) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/taller', component: WorkshopsPage },
      { path: '/lab/:slug', component: { template: '<h1>Laboratorio</h1>' } },
    ],
  });
  await router.push('/taller');
  await router.isReady();
  const wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [pinia, router] } });
  await flushPromises();
  const session = useWorkshopsStore();
  await session.open(workshops[index]!);
  await flushPromises();
  const button = (text: string) =>
    wrapper.findAll('button').find((button) => button.text() === text)!;
  async function answer(
    text = 'Mi hipótesis se contrasta con las medidas del motor, sus límites y una alternativa.',
  ) {
    await wrapper.get('textarea').setValue(text);
  }
  async function next() {
    await button('Validar paso y continuar').trigger('click');
    await flushPromises();
  }
  return { wrapper, router, session, button, answer, next };
}
describe('Taller POE completo', () => {
  it.each([0, 1, 2, 3, 4])(
    'registra cinco fases y medidas del caso %i sin modificar los laboratorios',
    async (index) => {
      const { wrapper, session, button, answer, next } = await render(index);
      const data = useDatasetsStore(),
        training = useTrainingStore(),
        originalHash = data.hash;
      expect(wrapper.find('.workshop-evidence').exists()).toBe(false);
      await next();
      expect(session.progress.step).toBe(0);
      expect(wrapper.text()).toContain('no evalúa la calidad');
      await answer();
      await button('Mostrar pista sin penalización').trigger('click');
      await flushPromises();
      await next();
      expect(session.progress.step).toBe(1);
      await answer();
      if (index === 4) session.progress.options.budgetAccepted = true;
      await next();
      expect(session.progress.step).toBe(2);
      await button('Ejecutar caso con el motor').trigger('click');
      await flushPromises();
      expect(wrapper.find('.workshop-evidence').exists()).toBe(true);
      expect(session.progress.evidence?.caseId).toBe(workshops[index]!.caseId);
      await next();
      await answer();
      await next();
      await answer();
      await button('Consultar explicación orientativa').trigger('click');
      await flushPromises();
      expect(session.progress.solutions).toContain('explicacion');
      session.progress.selfScore = 2;
      await button('Registrar reflexión y completar recorrido').trigger('click');
      await flushPromises();
      expect(wrapper.text()).toContain('Recorrido registrado');
      expect(session.progress.step).toBe(5);
      expect(session.storage).toContain('guardados');
      expect(data.hash).toBe(originalHash);
      expect(training.state).toBeUndefined();
      expect(JSON.parse(session.portfolio())).toMatchObject({
        format: 'neural-atlas.learning-evidence',
        progress: { step: 5, selfScore: 2 },
      });
      await button('Reintentar conservando este intento').trigger('click');
      await button('Mantener intento actual').trigger('click');
      expect(session.progress.step).toBe(5);
      await button('Reintentar conservando este intento').trigger('click');
      await button('Archivar y comenzar intento').trigger('click');
      await flushPromises();
      expect(session.progress.attempts).toHaveLength(1);
      expect(session.progress.step).toBe(0);
    },
  );
  it('cancela ejecuciones antiguas, conserva memoria entre talleres y controla conflictos', async () => {
    const { session, answer, next, router } = await render(1);
    await answer();
    await next();
    await answer();
    await next();
    const pending = session.execute();
    session.cancel();
    await pending;
    expect(session.progress.evidence).toBeUndefined();
    await session.execute();
    expect(session.progress.evidence).toBeDefined();
    const old = session.progress.evidence!.id;
    await session.open(workshops[0]!);
    await session.open(workshops[1]!);
    expect(session.progress.evidence?.id).toBe(old);
    vi.spyOn(WorkshopLibrary.prototype, 'save').mockRejectedValueOnce(new LibraryError('CONFLICT'));
    await session.persist();
    expect(session.error).toContain('Otra pestaña');
    await router.push('/lab/neurona');
    await flushPromises();
    expect(session.busy).toBe(false);
    await router.push('/taller');
    await flushPromises();
    expect(session.progress.evidence?.id).toBe(old);
  });
  it('importa/exporta actividad y cuaderno, maneja archivos y conserva modo memoria', async () => {
    const { wrapper, session, button } = await render();
    const create = vi.fn(() => 'blob:workshop'),
      revoke = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: create });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.useFakeTimers();
    await button('Exportar actividad JSON').trigger('click');
    await button('Exportar cuaderno de evidencias').trigger('click');
    await flushPromises();
    vi.advanceTimersByTime(1000);
    expect(revoke).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
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
    await file('invalid');
    expect(wrapper.text()).toContain('No se ha abierto');
    await file('', 2 * 1024 * 1024);
    expect(wrapper.text()).toContain('No se ha abierto');
    const imported = structuredClone(workshops[1]!);
    imported.id = 'mi-actividad';
    imported.title.es = 'Mi frontera';
    await file(exportWorkshop(imported, false));
    expect(session.definition.id).toBe('mi-actividad');
    expect(wrapper.text()).toContain('Actividad importada');
    expect(definitionHash(session.definition)).toBe(definitionHash(imported));
    vi.spyOn(WorkshopLibrary.prototype, 'list').mockRejectedValueOnce(
      new LibraryError('UNAVAILABLE'),
    );
    await session.load();
    expect(session.storage).toContain('Modo memoria');
    vi.spyOn(WorkshopLibrary.prototype, 'save').mockRejectedValueOnce(new LibraryError('QUOTA'));
    await session.persist();
    expect(session.error).toContain('versión anterior');
    expect(session.portfolio()).toContain('Mi frontera');
    await button('Eliminar cuaderno guardado').trigger('click');
    await button('Conservar cuaderno').trigger('click');
    expect(session.canDelete).toBe(true);
    await button('Eliminar cuaderno guardado').trigger('click');
    await button('Confirmar eliminación del cuaderno').trigger('click');
    await flushPromises();
    expect(session.canDelete).toBe(false);
    expect(session.progress.step).toBe(0);
  });
});

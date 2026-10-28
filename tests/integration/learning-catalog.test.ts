import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPinia, setActivePinia, disposePinia, type Pinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { useCatalogStore } from '@/stores/catalog';
import { useReviewStore } from '@/stores/review';
import { coreRecords } from '@/content/core-records';
import { buildCatalog, emptyCatalogState } from '@/application/content/catalog';
import { validateCatalogState } from '@/application/content/catalog';
import { previewConceptPack } from '@/application/content/concept-packs';
import { handleDataJob, type DataJob } from '@/application/data/jobs';
import { LearningLibrary } from '@/infrastructure/storage/learning-library';
import { libraryPort } from '../fixtures/library-port';
import ConceptPage from '@/features/glossary/ConceptPage.vue';
import ReviewPage from '@/features/glossary/ReviewPage.vue';
import ConceptMapPage from '@/features/glossary/ConceptMapPage.vue';
import CatalogPage from '@/features/glossary/CatalogPage.vue';
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
function pack() {
  return {
    format: 'neural-atlas.concept-pack' as const,
    schemaVersion: 1 as const,
    packId: 'test-local',
    version: '1.0.0',
    title: 'Ejemplo local',
    categories: [{ id: 'local', title: 'Tema local' }],
    concepts: [
      {
        ...structuredClone(coreRecords[20]!),
        id: 'C653',
        slug: 'neurona-local',
        category: 'local',
        prerequisiteIds: ['C021'],
        relatedIds: ['C001'],
      },
    ],
  };
}
it('confirma tras transacción, restaura, actualiza, retira y no cambia IDs históricos', async () => {
  const store = useCatalogStore();
  await Promise.all([store.load(), store.load()]);
  expect(store.registry.records.size).toBe(152);
  const p = pack();
  await store.inspect(JSON.stringify(p));
  expect(store.preview?.changes).toHaveLength(1);
  await store.confirm();
  expect(store.revision).toBe(1);
  expect(store.registry.summaries).toHaveLength(753);
  expect(store.registry.order.indexOf('C021')).toBeLessThan(store.registry.order.indexOf('C653'));
  await store.inspect(JSON.stringify(p));
  expect(store.preview?.unchanged).toBe(true);
  await store.confirm();
  expect(store.revision).toBe(1);
  p.version = '1.1.0';
  p.concepts[0]!.contentVersion = 2;
  await store.inspect(JSON.stringify(p));
  await store.confirm();
  expect(store.revision).toBe(2);
  await store.refresh();
  expect(store.registry.records.get('C653')?.contentVersion).toBe(2);
  await store.remove(p.packId);
  expect(store.registry.records.has('C653')).toBe(false);
  expect(store.state.identityHistory[0]?.id).toBe('C653');
  await store.inspect(JSON.stringify(p));
  await store.confirm();
  expect(store.registry.records.has('C653')).toBe(true);
  expect(buildCatalog(emptyCatalogState()).summaries).toHaveLength(752);
});
it('una actualización incluida conserva exportable el paquete local anterior y su propiedad', () => {
  const c = structuredClone(coreRecords.find((c) => c.id === 'C143')!);
  c.contentVersion = 1;
  c.activity = 'Actividad local anterior.';
  const local = { ...pack(), concepts: [c] },
    state = { ...emptyCatalogState(), packs: [local] };
  expect(validateCatalogState(state).packs[0]!.concepts[0]!.activity).toBe(
    'Actividad local anterior.',
  );
  const registry = buildCatalog(state);
  expect(registry.records.get('C143')!.contentVersion).toBe(2);
  expect(registry.nodes.find((n) => n.id === 'C143')!.owner).toBeUndefined();
  const candidate = {
    ...local,
    packId: 'otro',
    version: '2.0.0',
    concepts: [{ ...c, contentVersion: 3 }],
  };
  expect(() => previewConceptPack(JSON.stringify(candidate), registry.context)).toThrow(
    'CONCEPT_IDENTITY',
  );
  candidate.packId = local.packId;
  expect(previewConceptPack(JSON.stringify(candidate), registry.context).changes[0]!.to).toBe(3);
});
it('rechazo, cancelación, cuota, conflicto y aplicación explícita en memoria conservan lo confirmado', async () => {
  const store = useCatalogStore();
  await store.load();
  await store.inspect('{bad');
  expect(store.error).toContain('rechazado');
  const p = pack();
  const pending = store.inspect(JSON.stringify(p));
  store.cancel();
  await pending;
  expect(store.preview).toBeUndefined();
  await store.inspect(JSON.stringify(p));
  port.failWrite(new DOMException('full', 'QuotaExceededError'));
  await store.confirm();
  expect(store.preview).toBeDefined();
  expect(store.registry.records.has('C653')).toBe(false);
  store.useMemory();
  expect(store.memory).toBe(true);
  expect(store.registry.records.has('C653')).toBe(true);
  await store.refresh();
  expect(store.registry.records.has('C653')).toBe(false);
  await store.inspect(JSON.stringify(p));
  await new LearningLibrary().save('contentCatalog', 'active', emptyCatalogState(), 0);
  await store.confirm();
  expect(store.error).toContain('conflicto');
  await store.refresh();
  await store.inspect(JSON.stringify(p));
  await store.confirm();
  expect(store.registry.records.has('C653')).toBe(true);
  await store.inspect(
    JSON.stringify({
      ...p,
      version: '2.0.0',
      concepts: [{ ...p.concepts[0]!, contentVersion: 3 }],
    }),
  );
  store.state = { ...store.state, identityHistory: [] };
  await store.confirm();
  expect(store.error).toContain('previsualización');
});
it('una dependencia externa impide retirar y corrupción no borra la copia guardada', async () => {
  const store = useCatalogStore();
  await store.load();
  const p = pack();
  await store.inspect(JSON.stringify(p));
  await store.confirm();
  const q = {
    ...p,
    packId: 'dependent',
    concepts: [
      { ...p.concepts[0]!, id: 'C654', slug: 'neurona-dependiente', prerequisiteIds: ['C653'] },
    ],
  };
  await store.inspect(JSON.stringify(q));
  await store.confirm();
  await store.remove(p.packId);
  expect(store.error).toContain('retirar');
  expect(store.state.packs).toHaveLength(2);
  (port.tables.contentCatalog!.get('active') as { integrity: string }).integrity = 'bad';
  await store.refresh();
  expect(store.error).toContain('leer');
  expect(port.tables.contentCatalog!.size).toBe(1);
});
it('repaso persistente por versión, conflicto, marcas, reinicio y lectura dañada', async () => {
  const store = useReviewStore(),
    c = coreRecords[20]!;
  await store.load();
  await store.mark(c, 'visited');
  await store.mark(c, 'explained');
  await store.grade(c, true);
  expect(store.current(c).box).toBe(1);
  expect(store.current(c).explained).toBe(true);
  expect(store.current({ ...c, contentVersion: 2 }).box).toBe(0);
  await store.refresh();
  expect(store.current(c).reviewed).toBe(true);
  port.failWrite(new DOMException('full', 'QuotaExceededError'));
  await store.grade(c, true);
  expect(store.error).toContain('No se guardó');
  expect(store.current(c).box).toBe(1);
  await store.reset(c);
  expect(store.current(c).responses).toHaveLength(0);
  expect(store.current(c).visited).toBe(false);
  (port.tables.learningReview!.get(c.id) as { integrity: string }).integrity = 'bad';
  await store.refresh();
  expect(store.error).toContain('leer');
});
async function render(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/conceptos/paquetes', component: CatalogPage },
      { path: '/conceptos/mapa', component: ConceptMapPage },
      { path: '/conceptos/:id', component: ConceptPage },
      { path: '/repaso', component: ReviewPage },
      { path: '/:pathMatch(.*)*', component: { template: '<div>Destino</div>' } },
    ],
  });
  await router.push(path);
  await router.isReady();
  const wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [pinia, router] } });
  await flushPromises();
  return { wrapper, router };
}
it('ficha, referencia, estado previsto y mapa accesible conservan navegación por ID', async () => {
  const { wrapper, router } = await render('/conceptos/C021');
  expect(wrapper.text()).toContain('Ejemplo numérico estático');
  expect(wrapper.text()).toContain('0.44');
  await wrapper
    .findAll('button')
    .find((b) => b.text().includes('He explicado'))!
    .trigger('click');
  await flushPromises();
  expect(useReviewStore().current(coreRecords[20]!).explained).toBe(true);
  await router.push('/conceptos/C146');
  await flushPromises();
  expect(wrapper.find('a[href*="importancia"]').exists()).toBe(true);
  await router.push('/conceptos/C652');
  await flushPromises();
  expect(wrapper.text()).toContain('Término de consulta');
  await router.push('/conceptos/C9999');
  await flushPromises();
  expect(wrapper.text()).toContain('no encontrado');
  await router.push('/conceptos/mapa');
  await flushPromises();
  expect(wrapper.find('svg').exists()).toBe(true);
  expect(wrapper.findAll('ol li')).toHaveLength(30);
  await wrapper.get('input[type=search]').setValue('C652');
  expect(wrapper.findAll('ol li')).toHaveLength(1);
  expect(wrapper.findAll('ol li')[0]!.text()).toContain('Paridad');
  wrapper.unmount();
});
it('pregunta interactiva muestra explicación, guarda sin certificar dominio y reinicia con confirmación', async () => {
  const { wrapper } = await render('/repaso?id=C021');
  await wrapper.get('input[value=correct]').setValue(true);
  await wrapper
    .findAll('button')
    .find((b) => b.text() === 'Comprobar respuesta')!
    .trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('Respuesta correcta');
  expect(useReviewStore().current(coreRecords[20]!).box).toBe(1);
  await wrapper
    .findAll('button')
    .find((b) => b.text().startsWith('Reiniciar esta'))!
    .trigger('click');
  await wrapper
    .findAll('button')
    .find((b) => b.text() === 'Confirmar reinicio')!
    .trigger('click');
  await flushPromises();
  expect(useReviewStore().current(coreRecords[20]!).box).toBe(0);
  wrapper.unmount();
});
it('gestión visible de paquetes: archivo, descarga, memoria, confirmación y retirada', async () => {
  vi.stubGlobal(
    'URL',
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:catalog'), revokeObjectURL: vi.fn() }),
  );
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const { wrapper } = await render('/conceptos/paquetes');
  const button = (text: string) => wrapper.findAll('button').find((b) => b.text() === text)!;
  await button('Descargar ejemplo editable').trigger('click');
  expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  const input = wrapper.get('input[type=file]');
  Object.defineProperty(input.element, 'files', {
    configurable: true,
    value: [
      {
        size: 10,
        arrayBuffer: async () => new TextEncoder().encode(JSON.stringify(pack())).buffer,
      },
    ],
  });
  await input.trigger('change');
  await flushPromises();
  expect(wrapper.text()).toContain('Ejemplo local');
  await button('Exportar previsualización').trigger('click');
  await button('Usar solo en memoria').trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('sesión en memoria');
  await button('Exportar paquete').trigger('click');
  await button('Retirar…').trigger('click');
  await button('Conservar').trigger('click');
  await button('Retirar…').trigger('click');
  await button('Confirmar retirada').trigger('click');
  await flushPromises();
  expect(useCatalogStore().registry.records.has('C653')).toBe(false);
  await input.trigger('change');
  await flushPromises();
  await button('Confirmar y guardar').trigger('click');
  await flushPromises();
  await button('Recargar catálogo guardado').trigger('click');
  await flushPromises();
  expect(useCatalogStore().registry.records.has('C653')).toBe(true);
  Object.defineProperty(input.element, 'files', {
    configurable: true,
    value: [{ size: 5 * 1024 * 1024 }],
  });
  await input.trigger('change');
  await flushPromises();
  expect(wrapper.text()).toContain('supera');
  wrapper.unmount();
});
it('mapa y repaso cambian selección, filtran pendientes y permiten exportar sin alterar evidencias', async () => {
  vi.stubGlobal(
    'URL',
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:review'), revokeObjectURL: vi.fn() }),
  );
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const { wrapper, router } = await render('/conceptos/mapa');
  await wrapper.get('select').setValue('C028');
  expect(wrapper.get('svg').attributes('aria-label')).toContain('Sesgo');
  await wrapper
    .findAll('button')
    .find((b) => b.text() === 'Última')!
    .trigger('click');
  expect(wrapper.findAll('ol li').length).toBeLessThan(30);
  await router.push('/repaso?id=C021');
  await flushPromises();
  const button = (text: string) => wrapper.findAll('button').find((b) => b.text() === text)!;
  await wrapper.findAll('select')[0]!.setValue('due');
  await wrapper.findAll('select')[1]!.setValue('C028');
  await wrapper.get('input[value=misconception]').setValue(true);
  await button('Comprobar respuesta').trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('Revisa tu razonamiento');
  await button('Siguiente pregunta').trigger('click');
  await flushPromises();
  await button('Exportar repaso guardado').trigger('click');
  await button('Recargar guardado').trigger('click');
  await flushPromises();
  expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  await button('Reiniciar esta ficha…').trigger('click');
  await button('Conservar').trigger('click');
  wrapper.unmount();
});

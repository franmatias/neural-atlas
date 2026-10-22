import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia';
import { nextTick } from 'vue';
import DatasetsPage from '@/features/datasets/DatasetsPage.vue';
import DatasetFiles from '@/features/datasets/DatasetFiles.vue';
import { useDatasetsStore } from '@/stores/datasets';
import { usePreferencesStore } from '@/stores/preferences';
import { handleDataJob, type DataJob, type DataResponse } from '@/application/data/jobs';
import { generateDataset } from '@/domain/data/generate';
import { defaultGenerator, DataError } from '@/domain/data/types';
import { exportDatasetJson } from '@/application/data/json-files';
import { DataClient } from '@/infrastructure/workers/data-client';
class FakeWorker {
  onmessage: ((event: MessageEvent<DataResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;
  postMessage(message: { id: number; job: DataJob }) {
    const copy = structuredClone(message);
    void Promise.resolve().then(() => {
      if (!this.terminated)
        this.onmessage?.({ data: handleDataJob(copy.id, copy.job) } as MessageEvent<DataResponse>);
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
  vi.stubGlobal('Worker', FakeWorker);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
});
afterEach(() => {
  disposePinia(pinia);
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.innerHTML = '';
});
function render() {
  return mount(DatasetsPage, { attachTo: document.body, global: { plugins: [pinia] } });
}
async function selectTab(wrapper: ReturnType<typeof render>, name: string) {
  await wrapper
    .get(
      `.data-view-switch button:nth-child(${['explore', 'divide', 'prepare', 'files'].indexOf(name) + 1})`,
    )
    .trigger('click');
  await flushPromises();
}
function fileInput(wrapper: ReturnType<typeof mount>, text: string, name: string) {
  Object.defineProperty(wrapper.get('input[type=file]').element, 'files', {
    configurable: true,
    value: [
      {
        name,
        size: Buffer.byteLength(text),
        arrayBuffer: async () => Uint8Array.from(Buffer.from(text)).buffer,
      },
    ],
  });
}
describe('experiencia completa del laboratorio L01', () => {
  it('genera recetas y escenarios solo al confirmar y conserva la semilla', async () => {
    const wrapper = render();
    const data = useDatasetsStore();
    const original = data.hash;
    await wrapper.get('#data-scenario').setValue('imbalance');
    expect(data.hash).toBe(original);
    await wrapper.get('.data-generator').trigger('submit');
    await flushPromises();
    expect(data.dataset.rows).toHaveLength(1000);
    expect(data.dataset.recipe?.options.minority).toBe(0.05);
    await wrapper.get('#data-recipe').setValue('energy');
    await wrapper.get('.data-generator').trigger('submit');
    await flushPromises();
    expect(data.dataset.task).toBe('regression');
    expect(wrapper.findAll('.rate-field[disabled]').length).toBe(2);
    await wrapper.get('.data-generator button[type=button]').trigger('click');
    await wrapper.get('.data-generator').trigger('submit');
    await flushPromises();
    expect(data.hash).toBe(original);
    await wrapper.get('#data-count').setValue(19);
    await wrapper.get('.data-generator').trigger('submit');
    await flushPromises();
    expect(data.error?.code).toBe('OPTIONS');
    expect(data.hash).toBe(original);
  });
  it('edita la tabla sin coerciones, elimina y añade muestras, e invalida resultados', async () => {
    const wrapper = render();
    const data = useDatasetsStore();
    await data.divide({ strategy: 'stratified', seed: 42, ratios: [0.7, 0.15, 0.15] });
    expect(data.split).toBeDefined();
    await wrapper.get('.dataset-table tbody tr:nth-child(2) button').trigger('click');
    expect(data.selectedId).toBe('r-2');
    await wrapper.get('#edit-x1').setValue('0,75');
    await wrapper.get('#edit-x2').setValue('');
    await wrapper.get('#edit-target').setValue('');
    await wrapper.get('.dataset-inspector form').trigger('submit');
    await flushPromises();
    expect(data.selected?.features).toEqual({ x1: 0.75, x2: null });
    expect(data.selected?.target).toBeNull();
    expect(data.split).toBeUndefined();
    expect(data.dataset.revision).toBe(2);
    await wrapper.get('#edit-x1').setValue('bad');
    await wrapper.get('.dataset-inspector form').trigger('submit');
    expect(wrapper.get('.dataset-inspector [role=alert]').text()).toContain('número válido');
    expect(data.selected?.features.x1).toBe(0.75);
    await wrapper.get('.dataset-inspector button.danger').trigger('click');
    expect(data.dataset.rows).toHaveLength(299);
    await wrapper.get('.map-options button').trigger('click');
    expect(data.dataset.rows).toHaveLength(300);
    expect(data.selected?.origin).toBe('manual');
    await wrapper.get('.data-pagination button:last-child').trigger('click');
    expect(wrapper.get('.data-pagination span').text()).toContain('Página 2');
    await wrapper.get('.data-pagination button:first-child').trigger('click');
  });
  it('divide, ajusta solo train y enlaza valores preparados con mapa y tabla', async () => {
    const wrapper = render();
    const data = useDatasetsStore();
    await selectTab(wrapper, 'prepare');
    expect(wrapper.get('.data-status').text()).toContain('partición');
    await selectTab(wrapper, 'divide');
    await wrapper.get('.data-options').trigger('submit');
    await flushPromises();
    expect(data.split?.train).toHaveLength(210);
    expect(wrapper.find('.split-bar').exists()).toBe(true);
    await wrapper.get('details summary').trigger('click');
    expect(wrapper.find('.split-ids').exists()).toBe(true);
    await selectTab(wrapper, 'prepare');
    await wrapper.get('#pipeline-imputation').setValue('median');
    await wrapper.get('#pipeline-scaling').setValue('standard');
    await wrapper.get('.check-row input').setValue(true);
    await wrapper.get('.data-options').trigger('submit');
    await flushPromises();
    expect(data.prepared?.pipeline.outputFeatureIds).toHaveLength(4);
    expect(wrapper.find('.pipeline-result').exists()).toBe(true);
    expect(wrapper.find('.sample-transform').exists()).toBe(true);
    await selectTab(wrapper, 'explore');
    await wrapper.get('#map-view').setValue('prepared');
    await wrapper.get('#map-filter').setValue('validation');
    expect(wrapper.find('.dataset-scatter').text()).toContain('Datos preparados');
    await wrapper.get('#map-x').setValue('x2:numeric');
    await wrapper.get('#map-y').setValue('x1:numeric');
    expect(wrapper.find('.data-point rect').exists()).toBe(true);
    await selectTab(wrapper, 'divide');
    await wrapper.get('#split-strategy').setValue('temporal');
    await wrapper.get('.data-options').trigger('submit');
    await flushPromises();
    expect(data.error?.code).toBe('TIMESTAMP');
    expect(data.split).toBeDefined();
    await wrapper.get('#split-strategy').setValue('random');
    await wrapper.get('#split-train').setValue(80);
    await wrapper.get('#split-validation').setValue(30);
    await wrapper.get('.data-options').trigger('submit');
    await flushPromises();
    expect(data.error?.code).toBe('RATIO');
  });
  it('inspecciona categóricas, constantes y errores de columnas sin valores en train', async () => {
    const wrapper = render();
    const data = useDatasetsStore();
    const flower = generateDataset({ ...defaultGenerator, recipe: 'flowers', count: 30 });
    flower.rows.forEach((r) => (r.features.x1 = 2));
    data.replace(flower);
    await flushPromises();
    await data.divide({ strategy: 'stratified', seed: 1, ratios: [0.7, 0.15, 0.15] });
    await selectTab(wrapper, 'prepare');
    await wrapper.get('#pipeline-imputation').setValue('mode');
    await wrapper.get('.data-options').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('Constante');
    expect(wrapper.text()).toContain('Vocabulario de train');
    await wrapper.findAll('.feature-checkboxes input')[0]!.setValue(false);
    await wrapper.get('#pipeline-scaling').setValue('none');
    await wrapper.get('.data-options').trigger('submit');
    await flushPromises();
    expect(data.prepared?.pipeline.inputFeatureIds).not.toContain('x1');
    await selectTab(wrapper, 'explore');
    await wrapper.get('#edit-zone').setValue('otra zona');
    await wrapper.get('.dataset-inspector form').trigger('submit');
    await flushPromises();
    expect(data.selected?.features.zone).toBe('otra zona');
    expect(data.prepared).toBeUndefined();
    data.replace(generateDataset({ ...defaultGenerator, recipe: 'energy', count: 20 }));
    await nextTick();
    await wrapper.get('#edit-target').setValue('bad');
    await wrapper.get('.dataset-inspector form').trigger('submit');
    expect(wrapper.find('.field-error').exists()).toBe(true);
    await wrapper.get('#edit-target').setValue('0');
    await wrapper.get('.dataset-inspector form').trigger('submit');
    expect(data.selected?.target).toBe(0);
  });
  it('enlaza el mapa accesible, selección, inserción y movimiento', async () => {
    const wrapper = render();
    const data = useDatasetsStore();
    const map = wrapper.get('.data-map');
    await map.trigger('keydown', { key: 'ArrowRight' });
    expect(data.selectedId).toBe('r-2');
    await map.trigger('keydown', { key: 'ArrowLeft' });
    await map.trigger('keydown', { key: 'ArrowUp' });
    await map.trigger('keydown', { key: 'Enter' });
    await map.trigger('keydown', { key: 'a' });
    vi.spyOn(map.element, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 700,
      height: 390,
    } as DOMRect);
    await wrapper.get('#map-mode').setValue('add');
    await map.trigger('click', { clientX: 350, clientY: 160 });
    expect(data.dataset.rows).toHaveLength(301);
    const id = data.selectedId;
    await wrapper.get('#map-mode').setValue('move');
    await map.trigger('click', { clientX: 450, clientY: 240 });
    expect(data.selectedId).toBe(id);
    expect(data.dataset.rows).toHaveLength(301);
    await map.trigger('click', { clientX: 2, clientY: 2 });
    expect(data.dataset.rows).toHaveLength(301);
    await wrapper.get('#map-mode').setValue('inspect');
    const point = wrapper.get('.data-point');
    const coords = /translate\(([^,]+),([^)]+)\)/.exec(point.attributes('transform') ?? '')!;
    await map.trigger('click', { clientX: Number(coords[1]), clientY: Number(coords[2]) });
    expect(data.selectedId).toBe(data.dataset.rows[0]!.id);
  });
  it('mantiene accesibles muestras que no se dibujan y estados vacíos', async () => {
    const wrapper = render();
    const data = useDatasetsStore();
    data.replace(generateDataset({ ...defaultGenerator, count: 1600 }));
    data.selectedId = 'r-1600';
    await nextTick();
    expect(wrapper.findAll('.data-point')).toHaveLength(1501);
    expect(wrapper.text()).toContain('1600 puntos');
    data.replace({ ...data.dataset, rows: [] });
    await nextTick();
    expect(wrapper.text()).toContain('No hay muestras');
    expect(wrapper.text()).toContain('Selecciona una muestra');
    await wrapper.get('.data-map').trigger('keydown', { key: 'ArrowRight' });
    data.replace(generateDataset({ ...defaultGenerator, count: 20, missing: 0.3 }));
    await nextTick();
    expect(wrapper.text()).toContain('no tienen dos valores');
  });
});
describe('intercambio con vista previa y confirmación', () => {
  it('mapea CSV, localiza errores, exige exclusión explícita y confirma por separado', async () => {
    const wrapper = render();
    const data = useDatasetsStore();
    const old = data.hash;
    await selectTab(wrapper, 'files');
    fileInput(wrapper, 'valor;zona;clase\n0;rojo;0\n1;azul;1\nbad;rojo;0', 'datos.csv');
    await wrapper.get('#dataset-file').trigger('change');
    await flushPromises();
    expect(wrapper.find('.mapping-grid').exists()).toBe(true);
    expect(data.hash).toBe(old);
    await wrapper.get('#column-role-1').setValue('categorical');
    await wrapper.get('.data-options .button.primary').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('errores localizados');
    expect(wrapper.text()).toContain('Registro 4');
    expect(data.hash).toBe(old);
    await wrapper.get('.check-row input').setValue(true);
    await wrapper.get('.data-options .button.primary').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Dataset válido: 2');
    const confirm = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Confirmar importación y sustituir dataset')!;
    await confirm.trigger('click');
    await flushPromises();
    expect(data.dataset.rows).toHaveLength(2);
    expect(data.dataset.rows[0]!.features['f-1']).toBe(0);
    expect(wrapper.find('.dataset-scatter').exists()).toBe(true);
  });
  it('previsualiza JSON sin sobrescribir, exporta ambos formatos y descarta', async () => {
    const wrapper = render();
    const data = useDatasetsStore();
    const original = data.hash;
    await selectTab(wrapper, 'files');
    const json = exportDatasetJson(
      generateDataset({ ...defaultGenerator, recipe: 'energy', count: 20 }),
    );
    fileInput(wrapper, json, 'datos.json');
    await wrapper.get('#dataset-file').trigger('change');
    await flushPromises();
    expect(wrapper.text()).toContain('Dataset válido: 20');
    expect(data.hash).toBe(original);
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Descartar vista previa')!
      .trigger('click');
    expect(wrapper.text()).not.toContain('Dataset válido');
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:data'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    for (const text of ['Descargar JSON completo', 'Descargar CSV']) {
      await wrapper
        .findAll('button')
        .find((b) => b.text() === text)!
        .trigger('click');
      await flushPromises();
    }
    expect(wrapper.text()).toContain('cadenas protegidas');
    expect(data.hash).toBe(original);
    fileInput(wrapper, '{}', 'bad.exe');
    await wrapper.get('#dataset-file').trigger('change');
    await flushPromises();
    expect(data.error?.code).toBe('SCHEMA');
  });
  it('vuelve a analizar el dialecto y cancela lecturas tardías al desmontar', async () => {
    const wrapper = mount(DatasetFiles, { global: { plugins: [pinia] } });
    fileInput(wrapper, 'a,b,y\n0,a,0\n1,b,1', 'data.csv');
    await wrapper.get('#dataset-file').trigger('change');
    await flushPromises();
    await wrapper.get('#csv-delimiter').setValue(',');
    await flushPromises();
    expect(wrapper.findAll('.mapping-grid>div')).toHaveLength(3);
    await wrapper.get('#csv-decimal').setValue(',');
    await wrapper.get('#csv-task').setValue('regression');
    await wrapper.get('#column-name-0').setValue('otra');
    await wrapper.get('#column-role-1').setValue('ignore');
    let resolve!: (value: ArrayBuffer) => void;
    Object.defineProperty(wrapper.get('#dataset-file').element, 'files', {
      configurable: true,
      value: [
        {
          name: 'late.json',
          size: 2,
          arrayBuffer: () => new Promise<ArrayBuffer>((done) => (resolve = done)),
        },
      ],
    });
    await wrapper.get('#dataset-file').trigger('change');
    wrapper.unmount();
    resolve(Uint8Array.from([123, 125]).buffer);
    await flushPromises();
    expect(useDatasetsStore().dataset.rows).toHaveLength(300);
  });
});
describe('sesión, cancelación y reloj exclusivamente visual', () => {
  it('conserva datos ante error o cancelación y bloquea fit sin split', async () => {
    const data = useDatasetsStore();
    const hash = data.hash;
    await data.fit({
      featureIds: ['x1'],
      imputation: 'mean',
      scaling: 'none',
      missingIndicators: false,
    });
    expect(data.error?.code).toBe('PIPELINE');
    const pending = data.generate({ ...defaultGenerator, count: 1000 });
    data.cancel();
    await pending;
    expect(data.hash).toBe(hash);
    expect(data.busy).toBe(false);
    vi.spyOn(DataClient.prototype, 'run').mockRejectedValueOnce(Error('transport'));
    await data.generate({ ...defaultGenerator });
    expect(data.error).toBeInstanceOf(DataError);
    expect(data.error?.code).toBe('INTERNAL');
    data.edit({ type: 'remove', id: 'unknown' });
    expect(data.error?.code).toBe('SCHEMA');
  });
  it('anima etapas sin regenerar ni reajustar y respeta reduced motion/visibilidad', async () => {
    const wrapper = render();
    const data = useDatasetsStore();
    const prefs = usePreferencesStore();
    const hash = data.hash;
    vi.useFakeTimers();
    await wrapper.get('button[aria-label="Animar el recorrido de datos"]').trigger('click');
    await vi.advanceTimersByTimeAsync(1100);
    expect(wrapper.findAll('.data-trace-stages button')[1]!.attributes('aria-pressed')).toBe(
      'true',
    );
    prefs.update({ speed: 4 });
    await nextTick();
    await vi.advanceTimersByTimeAsync(1000);
    expect(wrapper.findAll('.data-trace-stages button')[4]!.attributes('aria-pressed')).toBe(
      'true',
    );
    expect(data.hash).toBe(hash);
    expect(data.split).toBeUndefined();
    await wrapper.get('button[aria-label="Animar el recorrido de datos"]').trigger('click');
    await wrapper.get('button[aria-label="Pausar el recorrido de datos"]').trigger('click');
    await wrapper.get('button[aria-label="Siguiente etapa de datos"]').trigger('click');
    await wrapper.get('button[aria-label="Reiniciar recorrido de datos"]').trigger('click');
    prefs.update({ motion: 'reduced' });
    await nextTick();
    expect(
      wrapper.get('button[aria-label="Animar el recorrido de datos"]').attributes('disabled'),
    ).toBeDefined();
    prefs.update({ motion: 'system' });
    await nextTick();
    await wrapper.get('button[aria-label="Animar el recorrido de datos"]').trigger('click');
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    await nextTick();
    expect(wrapper.find('button[aria-label="Animar el recorrido de datos"]').exists()).toBe(true);
  });
});

import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { createPinia, setActivePinia, disposePinia, type Pinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { RuntimeWorkerDouble } from '../fixtures/runtime-worker';
import { trainingFixture } from '../fixtures/training';
import { useTrainingStore } from '@/stores/training';
import { useDatasetsStore } from '@/stores/datasets';
import { useConfigurationHistory } from '@/stores/configuration-history';
import SonificationPanel from '@/shared/ui/SonificationPanel.vue';
import LabGuide from '@/shared/ui/LabGuide.vue';
import RealDatasets from '@/features/datasets/RealDatasets.vue';
import { realDataset } from '@/application/data/real-datasets';
let pinia: Pinia;
beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  vi.stubGlobal('Worker', RuntimeWorkerDouble);
  RuntimeWorkerDouble.deferData = false;
});
afterEach(() => {
  disposePinia(pinia);
  vi.unstubAllGlobals();
});
it('historial inmutable de 50 estados, borradores inválidos y rama nueva sin rehacer', async () => {
  const session = useTrainingStore(),
    history = useConfigurationHistory();
  const original = session.config.seed;
  session.config.seed = 7;
  expect(history.canUndo).toBe(true);
  history.undo();
  expect(session.config.seed).toBe(original);
  expect(history.canRedo).toBe(true);
  history.redo();
  expect(session.config.seed).toBe(7);
  session.config.seed = NaN;
  expect(history.canUndo).toBe(true);
  history.undo();
  expect(session.config.seed).toBe(7);
  history.undo();
  session.config.seed = 8;
  expect(history.canRedo).toBe(false);
  for (let i = 100; i < 165; i++) session.config.seed = i;
  expect(history.entries).toHaveLength(50);
  expect(Object.isFrozen(history.entries)).toBe(true);
  expect(Object.isFrozen(history.entries[0]!.config.spec.hidden)).toBe(true);
  expect(history.entries[0]!.config.seed).toBe(115);
  expect(history.restore(-1)).toBe(false);
  await flushPromises();
});
it('deshacer descarta el Worker y los pesos pero mantiene la consulta de test; bloquea otro contexto', async () => {
  const f = trainingFixture(),
    data = useDatasetsStore(),
    session = useTrainingStore();
  data.replace(f.dataset, f.split);
  data.prepared = f.prepared;
  session.config = structuredClone(f.config);
  await flushPromises();
  const history = useConfigurationHistory();
  session.config.epochs = 5;
  session.initialize();
  await flushPromises();
  session.consulted = true;
  session.command('RUN');
  expect(history.undo()).toBe(true);
  await flushPromises();
  expect(session.state).toBeUndefined();
  expect(session.input).toBeUndefined();
  expect(session.consulted).toBe(true);
  expect(session.config.epochs).toBe(4);
  expect(history.notice).toContain('inicializa');
  const saved = history.cursor;
  data.importData(realDataset('iris'));
  await flushPromises();
  expect(history.available(saved)).toBe(false);
  expect(history.restore(saved)).toBe(false);
  expect(history.notice).toContain('dataset');
  session.busy = true;
  expect(history.canUndo).toBe(false);
  expect(history.redo()).toBe(false);
});
it('datasets reales se cargan solo bajo petición y sin división ni escalado implícitos', async () => {
  const data = useDatasetsStore(),
    previous = data.hash;
  const w = mount(RealDatasets, { global: { plugins: [pinia] } });
  expect(data.hash).toBe(previous);
  await w
    .findAll('button')
    .find((b) => b.text().includes('Cargar Iris'))!
    .trigger('click');
  expect(data.dataset.rows).toHaveLength(150);
  expect(data.split).toBeUndefined();
  expect(data.prepared).toBeUndefined();
  await w
    .findAll('button')
    .find((b) => b.text().includes('Cargar Wine'))!
    .trigger('click');
  expect(data.dataset.features).toHaveLength(13);
  expect(w.text()).toContain('CC BY 4.0');
});
it('guías contextualizadas no modifican la simulación y el audio nunca se inicia al montar', async () => {
  const guide = mount(LabGuide, { props: { path: '/lab/optimizacion' } });
  expect(guide.find('summary').text()).toContain('Guía del laboratorio');
  expect(guide.find('details').attributes('open')).toBeUndefined();
  await guide.setProps({ path: '/glosario' });
  expect(guide.find('details').exists()).toBe(false);
  const create = vi.fn(() => {
    throw Error('unsupported');
  });
  vi.stubGlobal('AudioContext', create);
  const panel = mount(SonificationPanel, {
    props: { value: 0.5, kind: 'output', label: 'salida' },
  });
  expect(create).not.toHaveBeenCalled();
  await panel.find('button').trigger('click');
  await flushPromises();
  expect(panel.get('[role=alert]').text()).toContain('Audio no disponible');
  expect(panel.text()).toContain('Sonido desactivado');
  panel.unmount();
});
it('audio activo responde al dato, se apaga al ocultar y no vuelve solo', async () => {
  const param = {
    setValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  };
  const close = vi.fn(async () => {}),
    start = vi.fn();
  vi.stubGlobal('AudioContext', function () {
    return {
      currentTime: 0,
      destination: {},
      resume: async () => {},
      close,
      createOscillator: () => ({ frequency: param, connect: vi.fn(), start, stop: vi.fn() }),
      createGain: () => ({ gain: param, connect: vi.fn() }),
    };
  });
  const panel = mount(SonificationPanel, {
    props: { value: 0.5, kind: 'output', label: 'salida' },
  });
  await panel.find('button').trigger('click');
  await flushPromises();
  expect(panel.text()).toContain('Sonido activo');
  await panel.setProps({ value: 0.8 });
  expect(param.setTargetAtTime).toHaveBeenCalledWith(748, 0, 0.015);
  await panel.get('select').setValue('grave');
  expect(param.setTargetAtTime).toHaveBeenCalledWith(374, 0, 0.015);
  expect(panel.text()).toContain('374.0');
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  document.dispatchEvent(new Event('visibilitychange'));
  await flushPromises();
  expect(panel.text()).toContain('Sonido desactivado');
  expect(close).toHaveBeenCalledOnce();
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  document.dispatchEvent(new Event('visibilitychange'));
  await panel.setProps({ value: 0.9 });
  expect(start).toHaveBeenCalledOnce();
  await panel.find('button').trigger('click');
  await flushPromises();
  await panel.setProps({ value: undefined });
  expect(panel.text()).toContain('Sonido desactivado');
  await panel.setProps({ value: 1 });
  await panel.find('button').trigger('click');
  await flushPromises();
  await panel.findAll('button')[1]!.trigger('click');
  expect(panel.text()).toContain('Sonido desactivado');
  panel.unmount();
});
it('descartar el resultado mientras se activa el audio cancela también la promesa pendiente', async () => {
  let resume!: () => void;
  const close = vi.fn(async () => {}),
    start = vi.fn();
  const param = {
    setValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  };
  vi.stubGlobal('AudioContext', function () {
    return {
      currentTime: 0,
      destination: {},
      close,
      resume: () =>
        new Promise<void>((resolve) => {
          resume = resolve;
        }),
      createOscillator: () => ({ frequency: param, start, stop: vi.fn(), connect: vi.fn() }),
      createGain: () => ({ gain: param, connect: vi.fn() }),
    };
  });
  for (const invalid of [undefined, NaN]) {
    const panel = mount(SonificationPanel, {
      props: { value: 0.5, kind: 'output', label: 'salida' },
    });
    await panel.find('button').trigger('click');
    expect(panel.text()).toContain('Activando sonido');
    await panel.setProps({ value: invalid });
    resume();
    await flushPromises();
    expect(panel.text()).toContain('Sonido desactivado');
    expect(start).not.toHaveBeenCalled();
    panel.unmount();
  }
  expect(close).toHaveBeenCalledTimes(2);
});

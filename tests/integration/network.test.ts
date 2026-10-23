import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia';
import { nextTick } from 'vue';
import ArchitecturePage from '@/features/network/ArchitecturePage.vue';
import ActivationsPage from '@/features/network/ActivationsPage.vue';
import PropagationPage from '@/features/network/PropagationPage.vue';
import BatchesPanel from '@/features/network/BatchesPanel.vue';
import { useArchitectureStore } from '@/stores/architecture';
import { usePropagationStore } from '@/stores/propagation';
import { usePreferencesStore } from '@/stores/preferences';
import {
  handleDataJob,
  type DataJob,
  type DataResponse,
  type JobResults,
} from '@/application/data/jobs';
import { defaultSpec, cloneNetwork } from '@/domain/network/model';
import { inspectNetwork } from '@/domain/network/inspection';
import { DataClient } from '@/infrastructure/workers/data-client';
class TestWorker {
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
  vi.stubGlobal('Worker', TestWorker);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
});
afterEach(() => {
  disposePinia(pinia);
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.innerHTML = '';
});
const render = (
  component:
    typeof ArchitecturePage | typeof ActivationsPage | typeof PropagationPage | typeof BatchesPanel,
) => mount(component, { attachTo: document.body, global: { plugins: [pinia] } });
async function commit(wrapper: ReturnType<typeof render>, id: string, value: string) {
  await wrapper.get(`#${id}`).setValue(value);
  await wrapper.get(`#${id}`).trigger('blur');
}
describe('arquitectura, Worker y regiones calculadas', () => {
  it('contrasta AND y XOR, la solución construida y la aprendida', async () => {
    const wrapper = render(ArchitecturePage);
    const state = useArchitectureStore();
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(state.perceptron?.converged).toBe(false);
    expect(wrapper.text()).toContain('Presupuesto agotado');
    await wrapper.get('#perceptron-problem').setValue('and');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(state.perceptron?.converged).toBe(true);
    expect(wrapper.get('[data-testid=perceptron-score]').text()).toContain('4 / 4');
    await wrapper.get('#perceptron-frame').setValue('0');
    expect(wrapper.get('.perceptron-plane').text()).toContain('1');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.get<HTMLInputElement>('#perceptron-frame').element.value).toBe('-1');
    await wrapper.get('.data-view-switch button:nth-child(2)').trigger('click');
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Mostrar solución construida')!
      .trigger('click');
    expect(state.model.spec.task).toBe('regression');
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Aprender XOR con MLP')!
      .trigger('click');
    await flushPromises();
    expect(state.solution?.correct).toBe(4);
    expect(wrapper.get('[data-testid=xor-score]').text()).toBe('4 / 4');
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Calcular mapa y estadísticas')!
      .trigger('click');
    await flushPromises();
    expect(wrapper.findAll('.heat-cell')).toHaveLength(400);
    await wrapper.get('#net-layer').setValue('1');
    await nextTick();
    expect(state.inspection).toBeUndefined();
    await state.inspect();
    await nextTick();
    expect(wrapper.text()).toContain('Histograma de pesos');
    await commit(wrapper, 'net-x-0', '0,3');
    expect(state.inspection).toBeUndefined();
  });
  it('construye tareas compatibles, agrupa redes grandes e inspecciona matrices completas', async () => {
    const wrapper = render(ArchitecturePage);
    const state = useArchitectureStore();
    await wrapper.get('.data-view-switch button:nth-child(3)').trigger('click');
    await wrapper.get('#net-task').setValue('multiclass');
    await wrapper.get('#net-classes').setValue('3');
    await wrapper.get('#net-width-0').setValue('16');
    await wrapper.get('form').trigger('submit');
    await nextTick();
    expect(state.model.layers.at(-1)?.outputs).toBe(3);
    expect(wrapper.findAll('.network-node')).toHaveLength(17);
    const pages = wrapper.findAll('.network-section').at(-1)!;
    await pages.findAll('button').at(-1)!.trigger('click');
    expect(pages.text()).toContain('2 / 2');
    await pages.findAll('button')[0]!.trigger('click');
    await wrapper.get('#net-neuron').setValue('15');
    await state.inspect();
    await nextTick();
    expect(state.inspection?.layers).toHaveLength(2);
    await wrapper.get('#net-inputs').setValue('');
    expect(wrapper.get('[data-testid=draft-parameters]').text()).toBe('—');
    await wrapper.get('#net-inputs').setValue('1');
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Añadir capa')!
      .trigger('click');
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Eliminar última capa')!
      .trigger('click');
    await wrapper.get('#net-task').setValue('regression');
    await wrapper.get('#net-init').setValue('he');
    await wrapper.get('#net-activation').setValue('relu');
    await wrapper.get('form').trigger('submit');
    await nextTick();
    expect(state.input).toHaveLength(1);
    expect(state.model.layers.at(-1)?.activation).toBe('linear');
    await wrapper.get('#net-layer').setValue('1');
    await state.inspect();
    await nextTick();
    expect(state.inspection?.cells).toHaveLength(400);
  });
  it('cancela sin aplicar respuestas tardías y conserva modelo ante fallos', async () => {
    const wrapper = render(ArchitecturePage);
    const state = useArchitectureStore();
    const old = state.model;
    state.initialize({ ...defaultSpec, inputs: 0 }, 1, 'xavier');
    expect(state.error).toBe(true);
    expect(state.model).toBe(old);
    vi.spyOn(DataClient.prototype, 'run').mockRejectedValueOnce(Error('worker'));
    await state.inspect();
    expect(state.error).toBe(true);
    await nextTick();
    expect(wrapper.get('[role=alert]').text()).toContain('No se pudo');
    let complete: (value: JobResults[keyof JobResults]) => void = () => {};
    vi.spyOn(DataClient.prototype, 'run').mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const pending = state.inspect();
    await nextTick();
    expect(wrapper.find('[role=status]').exists()).toBe(true);
    state.cancel();
    complete(inspectNetwork(old, [0, 0], 0, 0, 0));
    await pending;
    expect(state.inspection).toBeUndefined();
    expect(state.busy).toBe(false);
  });
});
describe('activaciones escalares, vectoriales e inicialización', () => {
  it('cambia todas las funciones y sus derivadas, pendiente y zoom', async () => {
    const wrapper = render(ActivationsPage);
    for (const a of ['step', 'tanh', 'relu', 'leakyRelu', 'linear', 'sigmoid']) {
      await wrapper.get('#activation-main').setValue(a);
      expect(wrapper.findAll('.network-function')).toHaveLength(4);
    }
    await wrapper.get('#activation-compare').setValue('step');
    expect(wrapper.text()).toContain('regla distinta');
    await wrapper.get('#activation-compare').setValue('tanh');
    await commit(wrapper, 'activation-z', '10');
    expect(wrapper.text()).toContain('Derivada muy pequeña');
    await wrapper.get('#activation-main').setValue('leakyRelu');
    await commit(wrapper, 'activation-alpha', '0,2');
    await commit(wrapper, 'activation-z', '-2');
    expect(wrapper.get('[data-testid=activation-value]').text()).toBe('-0,4');
    await wrapper.get('#activation-zoom').setValue('2');
    await wrapper.get('#activation-main').setValue('step');
    await wrapper.get('.chain-stages button:nth-child(2)').trigger('click');
    expect(wrapper.get('[data-testid=chain-gradient]').text()).toContain('No disponible');
    await wrapper.get('#activation-main').setValue('relu');
    await wrapper.get('.chain-stages button:nth-child(2)').trigger('click');
    expect(wrapper.get('[data-testid=chain-gradient]').text()).toContain('Cero exacto');
    await wrapper.get('#activation-main').setValue('sigmoid');
    await wrapper.get('#chain-depth').setValue('20');
    await wrapper.get('input[type=checkbox]').setValue(true);
    await wrapper.get('.chain-stages button:last-child').trigger('click');
    expect(wrapper.get('[data-testid=chain-gradient]').text()).toContain('-');
  });
  it('softmax conserva suma, muestra Jacobiano e inicialización por capa', async () => {
    const wrapper = render(ActivationsPage);
    await wrapper.get('#softmax-size').setValue('5');
    await commit(wrapper, 'logit-0', '1000');
    expect(wrapper.get('[data-testid=softmax-sum]').text()).toBe('Σp = 1');
    expect(wrapper.findAll('.probability-list>div')).toHaveLength(5);
    await wrapper.get('#softmax-size').setValue('2');
    expect(wrapper.findAll('.probability-list>div')).toHaveLength(2);
    await wrapper.get('#init-layer').setValue('2');
    await wrapper.get('#init-activation').setValue('relu');
    await commit(wrapper, 'init-seed', '7');
    expect(wrapper.findAll('.network-initial-card')).toHaveLength(3);
    expect(wrapper.findAll('.network-histogram')).toHaveLength(6);
  });
  it('el reproductor pausa, cambia velocidad, reinicia, respeta visibilidad y desmontaje', async () => {
    vi.useFakeTimers();
    const wrapper = render(ActivationsPage);
    const prefs = usePreferencesStore();
    const play = () =>
      wrapper
        .findAll('button')
        .find((b) => ['Reproducir fases', 'Pausar fases'].includes(b.text()))!;
    await play().trigger('click');
    await vi.advanceTimersByTimeAsync(1101);
    expect(wrapper.get('.chain-stages button:nth-child(2)').attributes('aria-pressed')).toBe(
      'true',
    );
    prefs.update({ speed: 4 });
    await nextTick();
    await vi.advanceTimersByTimeAsync(276);
    expect(wrapper.get('.chain-stages button:nth-child(3)').attributes('aria-pressed')).toBe(
      'true',
    );
    await play().trigger('click');
    expect(play().text()).toBe('Reproducir fases');
    await wrapper.get('#chain-depth').setValue('2');
    await play().trigger('click');
    await vi.advanceTimersByTimeAsync(276);
    expect(play().text()).toBe('Reproducir fases');
    await play().trigger('click');
    expect(wrapper.get('.chain-stages button:first-child').attributes('aria-pressed')).toBe('true');
    prefs.update({ motion: 'reduced' });
    await nextTick();
    expect(play().attributes('disabled')).toBeDefined();
    prefs.update({ motion: 'system' });
    await nextTick();
    await play().trigger('click');
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    await nextTick();
    expect(play().text()).toBe('Reproducir fases');
    wrapper.unmount();
    expect(vi.getTimerCount()).toBeLessThanOrEqual(1);
  });
});
describe('une forward, backward y aplicación exactamente una vez', () => {
  it('inspecciona las ocho fases, edita un peso y compara los nueve gradientes', async () => {
    const wrapper = render(PropagationPage);
    const state = usePropagationStore();
    const before = cloneNetwork(state.model);
    expect(state.apply()).toBe(true);
    const once = cloneNetwork(state.model);
    expect(state.apply()).toBe(false);
    expect(state.model).toEqual(once);
    state.reset();
    await nextTick();
    for (let i = 1; i <= 8; i++) {
      await wrapper.get(`.chain-stages button:nth-child(${i})`).trigger('click');
      expect(wrapper.get(`.chain-stages button:nth-child(${i})`).attributes('aria-pressed')).toBe(
        'true',
      );
    }
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Aplicar una actualización')!
      .trigger('click');
    expect(state.applied).toBe(true);
    expect(wrapper.get('#prop-rate').attributes('disabled')).toBeDefined();
    expect(state.after).toBeLessThan(state.trace.result.loss);
    expect(state.model).not.toEqual(before);
    await wrapper.get('.chain-stages button:first-child').trigger('click');
    await wrapper.get('.chain-stages button:last-child').trigger('click');
    expect(
      wrapper
        .findAll('button')
        .find((b) => b.text() === 'Aplicar una actualización')!
        .attributes('disabled'),
    ).toBeDefined();
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Calcular otra pasada')!
      .trigger('click');
    expect(state.applied).toBe(false);
    expect(wrapper.get('.chain-stages button:first-child').attributes('aria-pressed')).toBe('true');
    await wrapper.get('#prop-weight').setValue('1:1');
    await commit(wrapper, 'prop-weight-value', '0,25');
    expect(state.model.layers[1]!.weights[1]).toBe(0.25);
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Comprobar todos los gradientes')!
      .trigger('click');
    expect(wrapper.findAll('.gradient-check tbody tr')).toHaveLength(9);
    expect(state.report?.every((r) => r.relativeError < 1e-5)).toBe(true);
    await wrapper.get('#prop-rate').setValue('-2');
    expect(state.rate).toBe(0.01);
    await wrapper.get('#prop-target').setValue('0');
    await commit(wrapper, 'prop-x1', '1');
    expect(state.report).toBeUndefined();
    usePreferencesStore().update({ level: 'formal' });
    await nextTick();
    expect(wrapper.text()).toContain('BCE estable');
    usePreferencesStore().update({ level: 'steps' });
    await nextTick();
    expect(wrapper.text()).toContain('δ');
    state.rate = NaN;
    expect(state.apply()).toBe(false);
    expect(state.error).toBe(true);
    state.reset();
  });
  it('la reproducción no actualiza parámetros y el muestreo no pierde la cola', async () => {
    vi.useFakeTimers();
    const wrapper = render(PropagationPage);
    const state = usePropagationStore();
    const old = cloneNetwork(state.model);
    const play = wrapper.findAll('button').find((b) => b.text() === 'Reproducir fases')!;
    await play.trigger('click');
    await vi.advanceTimersByTimeAsync(8000);
    expect(state.model).toEqual(old);
    expect(state.applied).toBe(false);
    await wrapper.get('#batch-size').setValue('6');
    expect(wrapper.get('[data-testid=batch-count]').text()).toContain('4');
    expect(wrapper.findAll('.batch-list button')).toHaveLength(4);
    expect(wrapper.get('.batch-list button:last-child').text()).toContain('2');
    await wrapper.get('.batch-list button:last-child').trigger('click');
    await commit(wrapper, 'batch-epoch', '1');
    await commit(wrapper, 'batch-seed', '7');
    await wrapper.get('#batch-size').setValue('20');
    expect(wrapper.findAll('.batch-list button')).toHaveLength(1);
  });
});

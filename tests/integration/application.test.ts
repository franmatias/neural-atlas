import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { nextTick } from 'vue';
import App from '@/app/App.vue';
import { routes } from '@/app/router';
import { useNeuronStore } from '@/stores/neuron';
import { usePreferencesStore } from '@/stores/preferences';
import { activations } from '@/domain/network/neuron';
import ParameterField from '@/shared/ui/ParameterField.vue';
import AppIcon from '@/shared/ui/AppIcon.vue';
let pinia: Pinia;
beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
});
afterEach(() => {
  disposePinia(pinia);
  vi.useRealTimers();
  document.body.innerHTML = '';
});
async function render(path = '/') {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(App, { attachTo: document.body, global: { plugins: [pinia, router] } });
  await flushPromises();
  return { wrapper, router };
}
describe('navegación y contenido disponible', () => {
  it('abre inicio, catálogo, pendientes y errores sin perder la sesión', async () => {
    const { wrapper, router } = await render();
    expect(wrapper.get('h1').text()).toContain('dentro de una red');
    await router.push('/laboratorios');
    await flushPromises();
    expect(wrapper.findAll('.lab-card')).toHaveLength(14);
    expect(wrapper.findAll('.lab-card.live')).toHaveLength(12);
    expect(wrapper.get('.topbar .status-pill').text()).toBe('12 laboratorios disponibles');
    expect(wrapper.get('.lab-card[href="/lab/arquitectura/frontera"]').text()).toContain(
      'Sandbox de dos clases',
    );
    expect(wrapper.get('.lab-card[href="/lab/clasificacion/visual"]').text()).toContain(
      'Clasificador visual multiclase',
    );
    for (const [path, text] of [
      ['/lab/datos', 'Todo empieza en los datos.'],
      ['/taller', 'Investiga antes de concluir.'],
      ['/biblioteca', 'Guarda lo que descubres.'],
      ['/lab/desconocido', 'Este lugar'],
      ['/inexistente', 'Este lugar'],
    ]) {
      await router.push(path!);
      await flushPromises();
      expect(wrapper.get('h1').text()).toContain(text);
    }
    await router.push('/lab/neurona');
    await flushPromises();
    useNeuronStore().update({ x1: 1.5 });
    await router.push('/');
    await router.push('/lab/neurona');
    await flushPromises();
    expect(wrapper.get<HTMLInputElement>('#x1').element.value).toBe('1,5');
    expect(wrapper.get<HTMLSelectElement>('#preset').element.value).toBe('custom');
    expect(document.activeElement?.id).toBe('main-content');
    const url = window.location.hash;
    await wrapper.get('.skip-link').trigger('click');
    expect(window.location.hash).toBe(url);
  });
  it('busca por inglés, muestra los tres niveles y un estado vacío honesto', async () => {
    const { wrapper } = await render('/glosario');
    expect(wrapper.findAll('.concept-card')).toHaveLength(24);
    await wrapper.get('input[type=search]').setValue('C028');
    expect(wrapper.findAll('.concept-card')).toHaveLength(1);
    expect(wrapper.get('.concept-card h2').text()).toBe('Sesgo');
    usePreferencesStore().update({ level: 'steps' });
    await nextTick();
    expect(wrapper.find('.concept-question').exists()).toBe(true);
    usePreferencesStore().update({ level: 'formal' });
    await nextTick();
    expect(wrapper.find('code').exists()).toBe(true);
    await wrapper.get('input[type=search]').setValue('clasificación inexistente');
    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.get('.catalog-note').text()).toContain('652');
  });
});
describe('ajustes compartidos y persistencia', () => {
  it('aplica controles, guarda con debounce y restaura valores iniciales', async () => {
    const { wrapper } = await render('/ajustes');
    const prefs = usePreferencesStore();
    vi.useFakeTimers();
    await wrapper.get('#theme').setValue('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    await wrapper.get('#level').setValue('formal');
    await wrapper.get('#speed').setValue('2');
    const checks = wrapper.findAll('input[type=checkbox]');
    await checks[0]!.setValue(true);
    await checks[1]!.setValue(true);
    expect(document.documentElement.dataset.presentation).toBe('true');
    expect(prefs.reducedMotion).toBe(true);
    expect(localStorage.length).toBe(0);
    await vi.advanceTimersByTimeAsync(500);
    expect(JSON.parse(localStorage.getItem('neural-atlas:v1:preferences')!).payload.speed).toBe(2);
    window.dispatchEvent(new Event('pagehide'));
    expect(prefs.persisted).toBe(true);
    await wrapper.get('.settings-form .button').trigger('click');
    expect(prefs.value.theme).toBe('system');
    expect(prefs.value.presentation).toBe(false);
    expect(prefs.value.speed).toBe(1);
  });
  it('abre los paneles y permite navegar con el menú', async () => {
    const { wrapper, router } = await render();
    await wrapper.get('button[aria-label="Ajustes"]').trigger('click');
    expect(wrapper.get('.settings-dialog').attributes('open')).toBeDefined();
    await wrapper.get('button[aria-label="Cerrar ajustes"]').trigger('click');
    expect(wrapper.get('.settings-dialog').attributes('open')).toBeUndefined();
    await wrapper.get('button[aria-label="Oscuro"]').trigger('click');
    expect(usePreferencesStore().resolvedTheme).toBe('dark');
    await wrapper.get('button[aria-label="Claro"]').trigger('click');
    expect(usePreferencesStore().resolvedTheme).toBe('light');
    await wrapper.get('button[aria-label="Abrir navegación"]').trigger('click');
    expect(wrapper.get('.menu-dialog').attributes('open')).toBeDefined();
    await wrapper.get('button[aria-label="Cerrar navegación"]').trigger('click');
    await router.push('/ajustes');
    await flushPromises();
    expect(wrapper.findAll('.settings-form')).toHaveLength(1);
  });
  it('respeta cambios del sistema y tolera almacenamiento denegado', async () => {
    const handlers: Record<string, (event: { matches: boolean }) => void> = {};
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) =>
        ({
          matches: false,
          addEventListener: (_: string, callback: EventListener) => {
            handlers[query] = callback as unknown as (event: { matches: boolean }) => void;
          },
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList,
    );
    const { wrapper } = await render('/ajustes');
    handlers['(prefers-color-scheme: dark)']!({ matches: true });
    handlers['(prefers-reduced-motion: reduce)']!({ matches: true });
    await nextTick();
    expect(usePreferencesStore().resolvedTheme).toBe('dark');
    expect(usePreferencesStore().reducedMotion).toBe(true);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw Error('denied');
    });
    usePreferencesStore().flush();
    await nextTick();
    expect(wrapper.get('.storage-note').text()).toContain('durante esta sesión');
  });
});
describe('campos numéricos sin corrupción del estado', () => {
  it('acepta coma al confirmar, conserva transitorios y muestra errores', async () => {
    const wrapper = mount(ParameterField, {
      props: { id: 'test', label: 'Peso', modelValue: 0.5, min: -5, max: 5 },
    });
    const input = wrapper.get('input[type=text]');
    await input.setValue('-');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    await input.trigger('blur');
    expect(wrapper.get('[role=alert]').text()).toContain('número válido');
    await input.setValue('6');
    await input.trigger('keydown', { key: 'Enter' });
    expect(wrapper.get('[role=alert]').text()).toContain('entre');
    await input.setValue('0,75');
    await input.trigger('blur');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([0.75]);
    await wrapper.setProps({ modelValue: 0.75 });
    expect(input.element.getAttribute('aria-invalid')).toBeNull();
    await wrapper.get('input[type=range]').setValue('-1');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([-1]);
    expect(
      mount(AppIcon, { props: { name: 'unknown' } })
        .find('path')
        .exists(),
    ).toBe(true);
  });
});
describe('laboratorio de neurona conectado', () => {
  it('sincroniza controles, tablas, activaciones, presets y restauración', async () => {
    const { wrapper } = await render('/lab/neurona');
    const neuron = useNeuronStore();
    expect(wrapper.get('[data-testid=output]').text()).toBe('0,6083');
    await wrapper.get('#x1').setValue('1');
    await wrapper.get('#x1').trigger('blur');
    expect(neuron.result.z).toBeCloseTo(0.54);
    await wrapper.get('#preset').setValue('constant');
    expect(wrapper.get('.chart-status').text()).toContain('Pesos cero');
    await wrapper.get('#preset').setValue('bias');
    expect(neuron.config.b).toBe(1);
    await wrapper.get('#preset').setValue('inverse');
    expect(neuron.config.w1).toBe(-1);
    await wrapper.get('#preset').setValue('relu');
    expect(neuron.result.a).toBe(0);
    await wrapper.get('button[aria-label="Restaurar ejemplo"]').trigger('click');
    expect(neuron.config.x1).toBe(0.8);
    await wrapper.get('.level-switch button:nth-child(2)').trigger('click');
    expect(wrapper.find('table').exists()).toBe(true);
    await wrapper.get('.level-switch button:nth-child(3)').trigger('click');
    expect(wrapper.find('.derivative').exists()).toBe(true);
    for (const activation of activations) {
      await wrapper.get('#activation').setValue(activation);
      expect(wrapper.get('.activation-path').attributes('d')).not.toContain('NaN');
    }
    expect(wrapper.text()).toContain('discontinuo');
    expect(wrapper.text()).toContain('No disponible para backprop');
    neuron.update({ activation: 'relu' });
    await nextTick();
    expect(wrapper.text()).toContain('convención');
    neuron.update({ w1: 5, w2: 5, x1: 2, x2: 2, b: 5 });
    await nextTick();
    expect(wrapper.get('.activation-path').attributes('d')).not.toContain('NaN');
    neuron.update({ w1: 0.1, w2: 0.1 });
    await nextTick();
    expect(wrapper.text()).toContain('fuera');
    neuron.update({ w1: 1, w2: 1, b: 4 });
    await nextTick();
    expect(wrapper.find('.boundary-point').exists()).toBe(true);
    expect(wrapper.text()).toContain('esquina');
    neuron.update({ w1: 0, w2: 0, b: 0 });
    await nextTick();
    expect(wrapper.find('rect[fill="url(#negative-hatch)"]').exists()).toBe(false);
    expect(() => neuron.update({ w1: NaN })).toThrow(RangeError);
    expect(neuron.config.w1).toBe(0);
  });
  it('mueve la entrada con teclado y ratón, con límites y sin redefinir el modelo', async () => {
    const { wrapper } = await render('/lab/neurona');
    const plane = wrapper.get('.input-plane');
    const neuron = useNeuronStore();
    await plane.trigger('keydown', { key: 'ArrowRight' });
    expect(neuron.config.x1).toBe(0.85);
    await plane.trigger('keydown', { key: 'ArrowLeft' });
    await plane.trigger('keydown', { key: 'ArrowUp' });
    await plane.trigger('keydown', { key: 'ArrowDown' });
    await plane.trigger('keydown', { key: 'a' });
    expect(neuron.config.x2).toBe(0.2);
    neuron.update({ x1: 2 });
    await plane.trigger('keydown', { key: 'ArrowRight' });
    expect(neuron.config.x1).toBe(2);
    vi.spyOn(plane.element, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 320,
      height: 270,
    } as DOMRect);
    await plane.trigger('click', { clientX: 159, clientY: 128 });
    expect(neuron.config.x1).toBe(0);
    expect(neuron.config.x2).toBe(0);
    await plane.trigger('click', { clientX: 2, clientY: 2 });
    expect(neuron.config.x1).toBe(0);
    expect(neuron.config.w1).toBe(0.5);
  });
  it('recorre fases manualmente y ofrece navegación de pestañas con teclado', async () => {
    const { wrapper } = await render('/lab/neurona');
    await wrapper.get('button[aria-label="Fase siguiente"]').trigger('click');
    expect(wrapper.get('.playback-status').text()).toContain('Fase 2');
    await wrapper.get('button[aria-label="Fase anterior"]').trigger('click');
    expect(wrapper.get('.playback-status').text()).toContain('Fase 1');
    await wrapper.get('.phase-list button:last-child').trigger('click');
    expect(wrapper.get('.playback-status').text()).toContain('Fase 5');
    await wrapper.get('button[aria-label="Reiniciar recorrido"]').trigger('click');
    await wrapper.get('#tab-explore').trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.get('#tab-controls').attributes('aria-selected')).toBe('true');
    await wrapper.get('#tab-controls').trigger('keydown', { key: 'End' });
    expect(wrapper.get('#tab-explain').attributes('aria-selected')).toBe('true');
    await wrapper.get('#tab-explain').trigger('keydown', { key: 'ArrowLeft' });
    await wrapper.get('#tab-controls').trigger('keydown', { key: 'Home' });
    await wrapper.get('#tab-explore').trigger('keydown', { key: 'x' });
    await wrapper.get('#tab-explain').trigger('click');
    expect(wrapper.get('.neuron-workspace').attributes('data-tab')).toBe('explain');
  });
});

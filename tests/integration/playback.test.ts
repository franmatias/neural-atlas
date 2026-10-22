import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia';
import { defineComponent, nextTick } from 'vue';
import { usePlayback } from '@/features/neuron/usePlayback';
import { useNeuronStore } from '@/stores/neuron';
import { usePreferencesStore } from '@/stores/preferences';
let pinia: Pinia;
let callback: FrameRequestCallback;
let counter = 0;
const cancelled = vi.fn();
beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    callback = cb;
    return ++counter;
  });
  vi.stubGlobal('cancelAnimationFrame', cancelled);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
});
afterEach(() => {
  disposePinia(pinia);
  vi.unstubAllGlobals();
});
function render() {
  let playback!: ReturnType<typeof usePlayback>;
  const wrapper = mount(
    defineComponent({
      setup() {
        playback = usePlayback();
        return () => 'playback';
      },
    }),
  );
  return { wrapper, playback };
}
describe('reproductor en el ciclo de vida Vue', () => {
  it('reproduce, pausa y termina sin cambiar cálculos', () => {
    const { wrapper, playback } = render();
    const value = useNeuronStore().result.a;
    playback.play();
    expect(playback.state.value.playing).toBe(true);
    callback(0);
    callback(1100);
    expect(playback.state.value.index).toBe(1);
    playback.play();
    expect(playback.state.value.playing).toBe(false);
    callback(1200);
    expect(playback.state.value.index).toBe(1);
    playback.play();
    callback(2000);
    callback(9000);
    expect(playback.state.value).toEqual({ index: 4, elapsed: 0, playing: false });
    expect(useNeuronStore().result.a).toBe(value);
    playback.move(-1);
    expect(playback.state.value.index).toBe(3);
    playback.reset();
    expect(playback.state.value.index).toBe(0);
    playback.play();
    playback.pause();
    wrapper.unmount();
    expect(cancelled).toHaveBeenCalled();
  });
  it('cancela al cambiar parámetros, reducir movimiento, ocultar o desmontar', async () => {
    const { wrapper, playback } = render();
    playback.play();
    useNeuronStore().update({ b: 1 });
    await nextTick();
    expect(playback.state.value.playing).toBe(false);
    playback.play();
    usePreferencesStore().update({ motion: 'reduced' });
    await nextTick();
    expect(playback.state.value.playing).toBe(false);
    playback.play();
    expect(playback.state.value.playing).toBe(false);
    usePreferencesStore().update({ motion: 'system' });
    await nextTick();
    playback.play();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(playback.state.value.playing).toBe(true);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(playback.state.value.playing).toBe(false);
    playback.play();
    expect(playback.state.value.playing).toBe(false);
    wrapper.unmount();
  });
});

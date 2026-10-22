import { onMounted, onScopeDispose, ref, watch } from 'vue';
import { usePreferencesStore } from '@/stores/preferences';
import { useNeuronStore } from '@/stores/neuron';
import {
  advanceTimeline,
  initialTimeline,
  movePhase,
  togglePlayback,
} from '@/application/playback/timeline';
export function usePlayback() {
  const prefs = usePreferencesStore();
  const neuron = useNeuronStore();
  const state = ref(initialTimeline());
  let frame = 0;
  let previous: number | undefined;
  function stop() {
    cancelAnimationFrame(frame);
    previous = undefined;
  }
  function pause() {
    state.value = { ...state.value, playing: false };
    stop();
  }
  function tick(now: number) {
    if (!state.value.playing) return;
    if (previous !== undefined)
      state.value = advanceTimeline(state.value, now - previous, prefs.value.speed);
    previous = now;
    if (state.value.playing) frame = requestAnimationFrame(tick);
    else stop();
  }
  function play() {
    if (prefs.reducedMotion || document.hidden) return;
    state.value = togglePlayback(state.value);
    stop();
    if (state.value.playing) frame = requestAnimationFrame(tick);
  }
  function move(direction: number) {
    stop();
    state.value = movePhase(state.value, direction);
  }
  function reset() {
    stop();
    state.value = initialTimeline();
  }
  const visibility = () => {
    if (document.hidden) pause();
  };
  watch(() => neuron.config, reset);
  watch(
    () => prefs.reducedMotion,
    (reduced) => {
      if (reduced) pause();
    },
  );
  onMounted(() => document.addEventListener('visibilitychange', visibility));
  onScopeDispose(() => {
    stop();
    document.removeEventListener('visibilitychange', visibility);
  });
  return { state, play, pause, move, reset };
}

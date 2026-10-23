import { onScopeDispose, ref, watch, toValue, type MaybeRefOrGetter, type WatchSource } from 'vue';
import { usePreferencesStore } from '@/stores/preferences';
export function usePhasePlayer(count: MaybeRefOrGetter<number>, source: WatchSource<unknown>) {
  const prefs = usePreferencesStore();
  const index = ref(0),
    playing = ref(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  function pause() {
    playing.value = false;
    clearTimeout(timer);
  }
  function move(next: number) {
    pause();
    index.value = Math.max(0, Math.min(toValue(count) - 1, next));
  }
  function schedule() {
    clearTimeout(timer);
    if (!playing.value) return;
    timer = setTimeout(() => {
      index.value++;
      if (index.value >= toValue(count) - 1) pause();
      else schedule();
    }, 1100 / prefs.value.speed);
  }
  function play() {
    if (playing.value) {
      pause();
      return;
    }
    if (prefs.reducedMotion || document.hidden) return;
    if (index.value === toValue(count) - 1) index.value = 0;
    playing.value = true;
    schedule();
  }
  const visibility = () => {
    if (document.hidden) pause();
  };
  document.addEventListener('visibilitychange', visibility);
  watch(source, () => move(0));
  watch(() => prefs.value.speed, schedule);
  watch(
    () => prefs.reducedMotion,
    (v) => {
      if (v) pause();
    },
  );
  onScopeDispose(() => {
    pause();
    document.removeEventListener('visibilitychange', visibility);
  });
  return { index, playing, move, play, pause };
}

import { ref, watch, onScopeDispose, type Ref } from 'vue';
import { usePreferencesStore } from '@/stores/preferences';
export function useSnapshotPlayback(index: Ref<number>, count: Ref<number>) {
  const prefs = usePreferencesStore(),
    playing = ref(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  function stop() {
    clearTimeout(timer);
    playing.value = false;
  }
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!playing.value) return;
      index.value = Math.min(count.value - 1, index.value + 1);
      if (index.value === count.value - 1) stop();
      else schedule();
    }, 900 / prefs.value.speed);
  }
  function toggle() {
    if (playing.value) {
      stop();
      return;
    }
    if (prefs.reducedMotion || document.hidden || count.value < 2) return;
    if (index.value >= count.value - 1) index.value = 0;
    playing.value = true;
    schedule();
  }
  watch(
    () => prefs.reducedMotion,
    (value) => {
      if (value) stop();
    },
  );
  watch(
    () => prefs.value.speed,
    () => {
      if (playing.value) schedule();
    },
  );
  watch(count, stop);
  const hidden = () => {
    if (document.hidden) stop();
  };
  document.addEventListener('visibilitychange', hidden);
  onScopeDispose(() => {
    stop();
    document.removeEventListener('visibilitychange', hidden);
  });
  return { playing, toggle, stop };
}

import { computed, onScopeDispose, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { defaults, getBrowserStorage, readPreferences, validatePreferences, writePreferences, type Preferences } from '@/infrastructure/persistence/preferences';

export const usePreferencesStore = defineStore('preferences', () => {
  const storage = getBrowserStorage();
  const value = ref(readPreferences(storage));
  const persisted = ref(Boolean(storage));
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const systemDark = ref(darkQuery.matches);
  const systemReduced = ref(motionQuery.matches);
  const updateDark = (e: MediaQueryListEvent) => { systemDark.value = e.matches; };
  const updateMotion = (e: MediaQueryListEvent) => { systemReduced.value = e.matches; };
  darkQuery.addEventListener('change', updateDark);
  motionQuery.addEventListener('change', updateMotion);
  const resolvedTheme = computed(() => value.value.theme === 'system' ? (systemDark.value ? 'dark' : 'light') : value.value.theme);
  const reducedMotion = computed(() => value.value.motion === 'reduced' || systemReduced.value);
  watch([resolvedTheme, () => value.value.presentation, reducedMotion], ([theme, presentation, reduced]) => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.presentation = String(presentation);
    document.documentElement.dataset.reducedMotion = String(reduced);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#101820' : '#F6F5F0');
  }, { immediate: true });
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  function flush() { persisted.value = writePreferences(storage, value.value); }
  watch(value, () => { clearTimeout(saveTimer); saveTimer = setTimeout(flush, 500); }, { deep: true });
  const beforeUnload = () => { clearTimeout(saveTimer); flush(); };
  window.addEventListener('pagehide', beforeUnload);
  onScopeDispose(() => {
    clearTimeout(saveTimer);
    darkQuery.removeEventListener('change', updateDark);
    motionQuery.removeEventListener('change', updateMotion);
    window.removeEventListener('pagehide', beforeUnload);
  });
  function update(patch: Partial<Preferences>) { value.value = validatePreferences({ ...value.value, ...patch }); }
  function reset() { value.value = { ...defaults }; }
  return { value, persisted, resolvedTheme, reducedMotion, update, reset, flush };
});

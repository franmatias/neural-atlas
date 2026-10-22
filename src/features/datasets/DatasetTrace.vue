<script setup lang="ts">
import { onMounted, onScopeDispose, ref, watch } from 'vue';
import { useDatasetsStore } from '@/stores/datasets';
import { usePreferencesStore } from '@/stores/preferences';
import { useI18n } from '@/app/i18n';
import AppIcon from '@/shared/ui/AppIcon.vue';
const data = useDatasetsStore();
const prefs = usePreferencesStore();
const { t } = useI18n();
const steps = ['raw', 'split', 'fit', 'transform', 'ready'] as const;
const phase = ref(0);
const playing = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;
function pause() {
  clearTimeout(timer);
  playing.value = false;
}
function schedule() {
  clearTimeout(timer);
  if (!playing.value) return;
  timer = setTimeout(() => {
    phase.value++;
    if (phase.value >= 4) pause();
    else schedule();
  }, 1100 / prefs.value.speed);
}
function play() {
  if (playing.value) {
    pause();
    return;
  }
  if (prefs.reducedMotion || document.hidden) return;
  if (phase.value === 4) phase.value = 0;
  playing.value = true;
  schedule();
}
function move(index: number) {
  pause();
  phase.value = Math.max(0, Math.min(4, index));
}
const visibility = () => {
  if (document.hidden) pause();
};
watch(
  () => prefs.reducedMotion,
  (reduced) => {
    if (reduced) pause();
  },
);
watch(() => prefs.value.speed, schedule);
watch([() => data.hash, () => data.split, () => data.prepared], () => move(0));
onMounted(() => document.addEventListener('visibilitychange', visibility));
onScopeDispose(() => {
  pause();
  document.removeEventListener('visibilitychange', visibility);
});
</script>
<template>
  <section class="panel data-trace">
    <div
      class="data-trace-stages"
      role="group"
      :aria-label="t('data.flow.label')"
      :style="{ '--trace-duration': `${0.3 / prefs.value.speed}s` }"
    >
      <button
        v-for="(step, index) in steps"
        :key="step"
        :aria-pressed="phase === index"
        :class="{
          'trace-active': phase === index,
          'trace-waiting': index === 1 ? !data.split : index > 1 ? !data.prepared : false,
        }"
        @click="move(index)"
      >
        <span>{{ index + 1 }}</span
        ><strong>{{ t(`data.flow.${step}`) }}</strong
        ><small v-if="index === 1 ? !data.split : index > 1 ? !data.prepared : false">{{
          t('data.flow.waiting')
        }}</small>
      </button>
    </div>
    <div class="data-trace-controls">
      <button class="icon-button" :aria-label="t('data.flow.reset')" @click="move(0)">
        <AppIcon name="reset" :size="18" /></button
      ><button
        class="play-button"
        :disabled="prefs.reducedMotion"
        :aria-label="t(playing ? 'data.flow.pause' : 'data.flow.play')"
        @click="play"
      >
        <AppIcon :name="playing ? 'pause' : 'play'" :size="18" /></button
      ><button
        class="icon-button"
        :disabled="phase === 4"
        :aria-label="t('data.flow.next')"
        @click="move(phase + 1)"
      >
        <AppIcon name="next" :size="18" />
      </button>
      <p>{{ t('data.flow.note') }}</p>
      <span>{{ prefs.value.speed }}×</span>
    </div>
  </section>
</template>

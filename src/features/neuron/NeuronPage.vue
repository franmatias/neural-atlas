<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from '@/app/i18n';
import { usePreferencesStore } from '@/stores/preferences';
import { phases } from '@/application/playback/timeline';
import { usePlayback } from './usePlayback';
import NeuronControls from './NeuronControls.vue';
import SignalDiagram from './SignalDiagram.vue';
import InputPlane from './InputPlane.vue';
import ActivationCurve from './ActivationCurve.vue';
import NeuronInspector from './NeuronInspector.vue';
import AppIcon from '@/shared/ui/AppIcon.vue';
const { t } = useI18n();
const prefs = usePreferencesStore();
const { state, play, move, reset } = usePlayback();
const tab = ref('explore');
const tabs = ['explore', 'controls', 'explain'] as const;
function changeTab(event: KeyboardEvent, index: number) {
  if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? 2
        : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
  tab.value = tabs[next]!;
  (event.currentTarget as HTMLElement).parentElement?.querySelectorAll('button')[next]?.focus();
}
</script>
<template>
  <div class="page neuron-page">
    <div class="lab-heading">
      <div>
        <p class="eyebrow">{{ t('neuron.eyebrow') }}</p>
        <h1>{{ t('neuron.title') }}</h1>
        <p>{{ t('neuron.question') }}</p>
      </div>
      <span class="live-label"><span class="local-dot" />{{ t('neuron.live') }}</span>
    </div>
    <div class="mobile-tabs" role="tablist" :aria-label="t('neuron.title')">
      <button
        v-for="(item, index) in tabs"
        :id="`tab-${item}`"
        :key="item"
        role="tab"
        :aria-selected="tab === item"
        :aria-controls="`panel-${item}`"
        :tabindex="tab === item ? 0 : -1"
        @click="tab = item"
        @keydown="changeTab($event, index)"
      >
        {{ t(`neuron.${item}`) }}
      </button>
    </div>
    <div class="neuron-workspace" :data-tab="tab">
      <div id="panel-controls" class="controls-slot"><NeuronControls /></div>
      <div id="panel-explore" class="visual-slot">
        <section class="panel signal-panel">
          <div class="panel-heading">
            <h2>{{ t('neuron.signal') }}</h2>
            <span class="visual-badge">{{ t('neuron.visual') }}</span>
          </div>
          <p class="chart-hint">{{ t('neuron.signalHint') }}</p>
          <SignalDiagram :phase="state.index" />
          <div class="phase-list" role="group" :aria-label="t('neuron.trace')">
            <button
              v-for="(phase, index) in phases"
              :key="phase"
              :aria-pressed="state.index === index"
              @click="move(index - state.index)"
            >
              <span>{{ index + 1 }}</span
              >{{ t(`phase.${phase}`) }}
            </button>
          </div>
        </section>
        <div class="charts-row panel"><InputPlane /><ActivationCurve /></div>
        <p class="projection-note">{{ t('neuron.projection') }}</p>
      </div>
      <div id="panel-explain" class="inspector-slot"><NeuronInspector /></div>
    </div>
    <div class="playback">
      <button class="icon-button" :aria-label="t('neuron.restart')" @click="reset">
        <AppIcon name="reset" :size="18" /></button
      ><button
        class="icon-button"
        :aria-label="t('neuron.previous')"
        :disabled="state.index === 0"
        @click="move(-1)"
      >
        <AppIcon name="previous" :size="18" /></button
      ><button
        class="play-button"
        :aria-label="t(state.playing ? 'neuron.pause' : 'neuron.play')"
        :disabled="prefs.reducedMotion"
        @click="play"
      >
        <AppIcon :name="state.playing ? 'pause' : 'play'" :size="19" /></button
      ><button
        class="icon-button"
        :aria-label="t('neuron.next')"
        :disabled="state.index === 4"
        @click="move(1)"
      >
        <AppIcon name="next" :size="18" />
      </button>
      <div class="playback-status" role="status">
        <strong>{{ t(`phase.${phases[state.index]!}`) }}</strong
        ><span>{{ t('neuron.phase', { current: state.index + 1, total: phases.length }) }}</span>
      </div>
      <span class="playback-speed">{{ prefs.value.speed }}×</span>
    </div>
    <p v-if="prefs.reducedMotion" class="motion-notice">{{ t('neuron.motionNotice') }}</p>
  </div>
</template>

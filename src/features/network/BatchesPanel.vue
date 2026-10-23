<script setup lang="ts">
import { computed, ref } from 'vue';
import { makeBatches } from '@/domain/network/learning';
import { useI18n } from '@/app/i18n';
import { usePreferencesStore } from '@/stores/preferences';
import ParameterField from '@/shared/ui/ParameterField.vue';
import { usePhasePlayer } from './usePhasePlayer';
const { t } = useI18n();
const prefs = usePreferencesStore();
const size = ref(6),
  seed = ref(42),
  epoch = ref(0);
const batches = computed(() =>
  makeBatches(
    Array.from({ length: 20 }, (_, i) => `r-${i + 1}`),
    size.value,
    seed.value,
    epoch.value,
  ),
);
const player = usePhasePlayer(() => batches.value.length, batches);
</script>
<template>
  <section class="panel network-section">
    <h2>{{ t('net.batches') }}</h2>
    <p>{{ t('net.batchNote') }}</p>
    <div class="network-controls">
      <label for="batch-size"
        >{{ t('net.batchSize') }} · {{ size
        }}<input
          id="batch-size"
          v-model.number="size"
          type="range"
          min="1"
          max="20"
          step="1" /></label
      ><ParameterField
        id="batch-seed"
        v-model="seed"
        :label="t('net.seed')"
        :min="0"
        :max="4294967295"
        :step="1"
      /><ParameterField
        id="batch-epoch"
        v-model="epoch"
        :label="t('net.epoch')"
        :min="0"
        :max="100"
        :step="1"
      />
    </div>
    <p data-testid="batch-count">
      {{ t('net.updates') }}: {{ batches.length }} · N=20 · B={{ size }}
    </p>
    <div class="batch-list">
      <button
        v-for="(batch, i) in batches"
        :key="i"
        :aria-pressed="player.index.value === i"
        @click="player.move(i)"
      >
        <strong>{{ t('net.batch', { index: i + 1 }) }} · {{ batch.length }}</strong
        ><span>{{ batch.join(' · ') }}</span>
      </button>
    </div>
    <div class="network-actions">
      <button
        class="button secondary"
        :disabled="player.index.value === 0"
        @click="player.move(player.index.value - 1)"
      >
        {{ t('net.previous') }}</button
      ><button
        class="button primary"
        :disabled="prefs.reducedMotion || batches.length === 1"
        @click="player.play"
      >
        {{ t(player.playing.value ? 'net.pause' : 'net.play') }}</button
      ><button
        class="button secondary"
        :disabled="player.index.value === batches.length - 1"
        @click="player.move(player.index.value + 1)"
      >
        {{ t('net.next') }}
      </button>
    </div>
  </section>
</template>

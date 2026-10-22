<script setup lang="ts">
import { usePreferencesStore } from '@/stores/preferences';
import { useI18n } from '@/app/i18n';
import type { ExplanationLevel, Theme } from '@/infrastructure/persistence/preferences';
withDefaults(defineProps<{ prefix?: string }>(), { prefix: '' });
const prefs = usePreferencesStore();
const { t } = useI18n();
const themes: Theme[] = ['system', 'light', 'dark'];
const levels: ExplanationLevel[] = ['intuition', 'steps', 'formal'];
</script>
<template>
  <div class="settings-form space-y-4">
    <fieldset>
      <legend>{{ t('settings.appearance') }}</legend>
      <label :for="`${prefix}theme`">{{ t('settings.theme') }}</label>
      <select
        :id="`${prefix}theme`"
        :value="prefs.value.theme"
        @change="prefs.update({ theme: ($event.target as HTMLSelectElement).value as Theme })"
      >
        <option v-for="theme in themes" :key="theme" :value="theme">
          {{ t(`settings.${theme}`) }}
        </option>
      </select>
      <label class="check-row"
        ><input
          type="checkbox"
          :checked="prefs.value.presentation"
          @change="prefs.update({ presentation: ($event.target as HTMLInputElement).checked })"
        />{{ t('settings.presentation') }}</label
      >
      <p class="muted small">{{ t('settings.presentationHelp') }}</p>
    </fieldset>
    <fieldset>
      <legend>{{ t('settings.learning') }}</legend>
      <label :for="`${prefix}level`">{{ t('settings.level') }}</label>
      <select
        :id="`${prefix}level`"
        :value="prefs.value.level"
        @change="
          prefs.update({ level: ($event.target as HTMLSelectElement).value as ExplanationLevel })
        "
      >
        <option v-for="level in levels" :key="level" :value="level">
          {{ t(`level.${level}`) }}
        </option>
      </select>
    </fieldset>
    <fieldset>
      <legend>{{ t('settings.animation') }}</legend>
      <label :for="`${prefix}speed`"
        >{{ t('settings.speed') }} <output>{{ prefs.value.speed }}×</output></label
      >
      <input
        :id="`${prefix}speed`"
        type="range"
        min="0.25"
        max="4"
        step="0.25"
        :value="prefs.value.speed"
        @input="prefs.update({ speed: Number(($event.target as HTMLInputElement).value) })"
      />
      <p class="muted small">{{ t('settings.speedHelp') }}</p>
      <label class="check-row"
        ><input
          type="checkbox"
          :checked="prefs.value.motion === 'reduced'"
          @change="
            prefs.update({
              motion: ($event.target as HTMLInputElement).checked ? 'reduced' : 'system',
            })
          "
        />{{ t('settings.reducedMotion') }}</label
      >
      <p class="muted small">{{ t('settings.motionHelp') }}</p>
    </fieldset>
    <div class="storage-note" role="status">
      {{ t(prefs.persisted ? 'settings.saved' : 'settings.memory') }}
    </div>
    <p class="muted small">{{ t('settings.language') }}</p>
    <button class="button secondary" @click="prefs.reset()">{{ t('settings.reset') }}</button>
  </div>
</template>

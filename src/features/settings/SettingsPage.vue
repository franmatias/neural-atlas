<script setup lang="ts">
import { useI18n } from '@/app/i18n';
import SettingsForm from '@/shared/ui/SettingsForm.vue';
const { t } = useI18n();
</script>
<template>
  <div class="page settings-page">
    <p class="eyebrow">{{ t('nav.settings') }}</p>
    <h1>{{ t('settings.title') }}</h1>
    <p class="page-intro">{{ t('settings.description') }}</p>
    <SettingsForm />
  </div>
</template>

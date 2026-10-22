<script setup lang="ts">
import { useI18n } from '@/app/i18n';
const { t } = useI18n();
</script>
<template><div class="page"><p class="eyebrow">{{ t('neuron.eyebrow') }}</p><h1>{{ t('neuron.title') }}</h1><p class="page-intro">{{ t('neuron.question') }}</p></div></template>

<script setup lang="ts">
import { useI18n } from '@/app/i18n';
const { t } = useI18n();
</script>
<template><div class="page planned-page"><p class="eyebrow">404</p><h1>{{ t('notfound.title') }}</h1><p class="page-intro">{{ t('notfound.text') }}</p><RouterLink to="/" class="button primary">{{ t('notfound.back') }}</RouterLink></div></template>

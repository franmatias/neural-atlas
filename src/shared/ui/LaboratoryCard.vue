<script setup lang="ts">
import type { Laboratory } from '@/content/laboratories';
import { useI18n } from '@/app/i18n';
import AppIcon from './AppIcon.vue';
defineProps<{ lab: Laboratory }>();
const { t } = useI18n();
</script>
<template>
  <RouterLink :to="`/lab/${lab.slug}`" class="lab-card" :class="{ 'live': lab.available }">
    <div class="lab-card-top"><span class="mono">{{ lab.id }}</span><span class="status-pill" :class="{ 'status-live': lab.available }">{{ lab.available ? t('labs.available') : `${t('labs.planned')} · ${lab.phase}` }}</span></div>
    <h3>{{ lab.title }}</h3><p>{{ lab.question }}</p><span class="card-arrow"><AppIcon name="arrow" :size="20" /></span>
  </RouterLink>
</template>


<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from '@/app/i18n';
import { findLaboratory } from '@/content/laboratories';
import AppIcon from '@/shared/ui/AppIcon.vue';
const { t } = useI18n();
const route = useRoute();
const lab = computed(() => findLaboratory(String(route.params.slug ?? '')));
const title = computed(() => route.path === '/taller' ? t('planned.workshopTitle') : route.path === '/biblioteca' ? t('planned.libraryTitle') : lab.value?.title ?? t('notfound.title'));
const text = computed(() => route.path === '/taller' ? t('planned.workshopText') : route.path === '/biblioteca' ? t('planned.libraryText') : lab.value ? t('planned.description') : t('notfound.text'));
</script>
<template><div class="page planned-page"><div class="planned-symbol"><AppIcon name="labs" :size="48" /></div><p class="eyebrow">{{ t('planned.eyebrow') }} <span v-if="lab">/ {{ lab.id }} · {{ lab.phase }}</span></p><h1>{{ title }}</h1><p v-if="lab" class="page-intro">{{ lab.question }}</p><p class="muted">{{ text }}</p><RouterLink to="/lab/neurona" class="button primary">{{ t('planned.back') }}<AppIcon name="arrow" /></RouterLink></div></template>

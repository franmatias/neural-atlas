<script setup lang="ts">
import { useI18n } from '@/app/i18n';
import { laboratories } from '@/content/laboratories';
import LaboratoryCard from '@/shared/ui/LaboratoryCard.vue';
const { t } = useI18n();
const groups = ['foundations', 'learning', 'practice'] as const;
const titles = { foundations: 'labs.groupFoundations', learning: 'labs.groupLearning', practice: 'labs.groupPractice' } as const;
</script>
<template><div class="page"><p class="eyebrow">{{ t('nav.labs') }}</p><h1>{{ t('labs.title') }}</h1><p class="page-intro">{{ t('labs.description') }}</p><section v-for="group in groups" :key="group" class="route-section"><h2>{{ t(titles[group]) }}</h2><div class="lab-grid"><LaboratoryCard v-for="lab in laboratories.filter(l => l.group === group)" :key="lab.id" :lab="lab" /></div></section></div></template>

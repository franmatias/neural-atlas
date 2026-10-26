<script setup lang="ts">
import { useI18n } from '@/app/i18n';
import { laboratories } from '@/content/laboratories';
import LaboratoryCard from '@/shared/ui/LaboratoryCard.vue';
const { t } = useI18n();
const groups = ['foundations', 'learning', 'practice'] as const;
const titles = {
  foundations: 'labs.groupFoundations',
  learning: 'labs.groupLearning',
  practice: 'labs.groupPractice',
} as const;
</script>
<template>
  <div class="page">
    <p class="eyebrow">{{ t('nav.labs') }}</p>
    <h1>{{ t('labs.title') }}</h1>
    <p class="page-intro">{{ t('labs.description') }}</p>
    <section class="panel visual-lab-shortcuts">
      <h2>Ve cómo se clasifican los datos</h2>
      <p>
        Dos espacios interactivos: entrena, observa la frontera y prueba entradas nuevas con la
        misma red.
      </p>
      <div class="decision-links">
        <RouterLink class="button primary" to="/lab/arquitectura/frontera"
          >Sandbox de dos clases</RouterLink
        ><RouterLink class="button secondary" to="/lab/clasificacion/visual"
          >Clasificador visual multiclase</RouterLink
        >
      </div>
    </section>
    <section v-for="group in groups" :key="group" class="route-section">
      <h2>{{ t(titles[group]) }}</h2>
      <div class="lab-grid">
        <LaboratoryCard
          v-for="lab in laboratories.filter((l) => l.group === group)"
          :key="lab.id"
          :lab="lab"
        />
      </div>
    </section>
  </div>
</template>
<style scoped>
.visual-lab-shortcuts {
  padding: 24px;
  margin: 24px 0;
}
.visual-lab-shortcuts > div {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.visual-lab-shortcuts a {
  white-space: normal;
}
</style>

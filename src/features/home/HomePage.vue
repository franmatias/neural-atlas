<script setup lang="ts">
import { useI18n } from '@/app/i18n';
import AppIcon from '@/shared/ui/AppIcon.vue';
import LaboratoryCard from '@/shared/ui/LaboratoryCard.vue';
import { laboratories } from '@/content/laboratories';
const { t } = useI18n();
</script>
<template>
  <div class="page home-page">
    <section class="hero">
      <div class="hero-copy"><p class="eyebrow">{{ t('home.eyebrow') }}</p><h1>{{ t('home.title') }}<br /><em>{{ t('home.titleAccent') }}</em></h1><p class="hero-description">{{ t('home.description') }}</p><RouterLink to="/lab/neurona" class="button primary">{{ t('home.start') }}<AppIcon name="arrow" /></RouterLink><p class="hero-caption">{{ t('home.guide') }} <span>01 → 02 → 03</span></p></div>
      <div class="hero-art" aria-hidden="true"><div class="art-grid" /><svg viewBox="0 0 500 370"><g class="art-links"><path d="M75 115L240 80L420 185M75 115L240 185L420 185M75 115L240 290L420 185M75 255L240 80M75 255L240 185M75 255L240 290" /></g><g class="art-nodes"><circle cx="75" cy="115" r="25" /><circle cx="75" cy="255" r="25" /><circle cx="240" cy="80" r="25" /><circle cx="240" cy="185" r="35" /><circle cx="240" cy="290" r="25" /><circle cx="420" cy="185" r="36" /></g><g class="art-labels"><text x="75" y="122">x₁</text><text x="75" y="262">x₂</text><text x="240" y="193">Σ</text><text x="420" y="193">a</text></g><g class="art-annotation"><text x="120" y="40">ENTRADA</text><text x="320" y="340">COMPRENSIÓN</text></g></svg><div class="art-equation">a = σ(w · x + b)<span>{{ t('common.experimental') }}</span></div></div>
    </section>
    <RouterLink to="/lab/neurona" class="featured-lab"><div class="feature-mark"><AppIcon name="network" :size="42" /></div><div><p class="eyebrow">{{ t('home.startHere') }}</p><h2>{{ t('home.featureTitle') }}</h2><p>{{ t('home.featureDescription') }}</p><small>{{ t('home.featureMeta') }}</small></div><AppIcon name="arrow" :size="28" /></RouterLink>
    <section class="route-section"><div class="section-heading"><div><p class="eyebrow">{{ t('app.explore') }}</p><h2>{{ t('home.routeTitle') }}</h2></div><RouterLink to="/laboratorios" class="text-link">{{ t('home.viewAll') }} <AppIcon name="arrow" /></RouterLink></div><p class="muted section-intro">{{ t('home.routeDescription') }}</p><div class="lab-grid"><LaboratoryCard v-for="lab in laboratories.slice(0, 4)" :key="lab.id" :lab="lab" /></div></section>
    <section class="learning-note"><article><span class="note-number">01</span><div><h3>{{ t('home.first') }}</h3><p>{{ t('home.firstText') }}</p></div></article><article><span class="note-number">02</span><div><h3>{{ t('home.then') }}</h3><p>{{ t('home.thenText') }}</p></div></article></section>
  </div>
</template>

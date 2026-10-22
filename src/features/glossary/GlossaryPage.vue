<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@/app/i18n';
import { searchConcepts } from '@/content/concepts';
import { usePreferencesStore } from '@/stores/preferences';
import AppIcon from '@/shared/ui/AppIcon.vue';
const { t } = useI18n();
const prefs = usePreferencesStore();
const query = ref('');
const results = computed(() => searchConcepts(query.value));
</script>
<template>
  <div class="page">
    <p class="eyebrow">{{ t('glossary.eyebrow') }}</p>
    <h1>{{ t('glossary.title') }}</h1>
    <p class="page-intro">{{ t('glossary.description') }}</p>
    <label class="search-field"
      ><AppIcon name="search" /><span class="sr-only">{{ t('glossary.search') }}</span
      ><input v-model="query" type="search" :placeholder="t('glossary.placeholder')"
    /></label>
    <p class="muted small" role="status">{{ t('glossary.count', { count: results.length }) }}</p>
    <div class="concept-grid">
      <article v-for="concept in results" :key="concept.id" class="concept-card">
        <span class="eyebrow">{{ concept.id }} · {{ concept.english }}</span>
        <h2>{{ concept.title }}</h2>
        <p>{{ concept.definition }}</p>
        <template v-if="prefs.value.level !== 'intuition'"
          ><p class="concept-question">{{ concept.question }}</p>
          <p>{{ concept.answer }}</p></template
        ><code v-if="prefs.value.level === 'formal'">{{ concept.formula }}</code
        ><RouterLink to="/lab/neurona" class="text-link"
          >{{ t('glossary.try') }}<AppIcon name="arrow" :size="16"
        /></RouterLink>
      </article>
    </div>
    <p v-if="!results.length" class="empty-state">{{ t('glossary.empty') }}</p>
    <p class="catalog-note">{{ t('glossary.catalogNote') }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from '@/app/i18n';
import { concepts, searchConcepts } from '@/content/concepts';
import { referenceTopics, catalogPlannedCount } from '@/content/reference-concepts';
import { usePreferencesStore } from '@/stores/preferences';
import AppIcon from '@/shared/ui/AppIcon.vue';
const { t } = useI18n();
const prefs = usePreferencesStore(),
  route = useRoute();
const query = ref(typeof route.query.q === 'string' ? route.query.q : ''),
  topic = ref('all'),
  kind = ref('all'),
  page = ref(0);
const grid = ref<HTMLElement>();
const pageSize = 24;
watch(
  () => route.query.q,
  (q) => {
    query.value = typeof q === 'string' ? q : '';
  },
);
watch([query, topic, kind], () => (page.value = 0));
const results = computed(() =>
  searchConcepts(query.value).filter(
    (c) =>
      (topic.value === 'all' || (c.topic ?? 'laboratories') === topic.value) &&
      (kind.value === 'all' || (kind.value === 'reference' ? c.reference : !c.reference)),
  ),
);
const pageCount = computed(() => Math.max(1, Math.ceil(results.value.length / pageSize)));
const visible = computed(() =>
  results.value.slice(page.value * pageSize, (page.value + 1) * pageSize),
);
const topics = [
  {
    id: 'laboratories',
    title: t('glossary.labTopics'),
    count: concepts.length - referenceTopics.reduce((n, g) => n + g.count, 0),
  },
  ...referenceTopics,
];
function movePage(delta: number) {
  page.value = Math.max(0, Math.min(pageCount.value - 1, page.value + delta));
  void nextTick(() => grid.value?.focus());
}
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
    <div class="glossary-filters">
      <label for="concept-topic"
        >{{ t('glossary.topic')
        }}<select id="concept-topic" v-model="topic">
          <option value="all">{{ t('glossary.allTopics') }}</option>
          <option v-for="group in topics" :key="group.id" :value="group.id">
            {{ group.title }} · {{ group.count }}
          </option>
        </select></label
      ><label for="concept-kind"
        >{{ t('glossary.kind')
        }}<select id="concept-kind" v-model="kind">
          <option value="all">{{ t('glossary.allKinds') }}</option>
          <option value="interactive">{{ t('glossary.interactive') }}</option>
          <option value="reference">{{ t('glossary.reference') }}</option>
        </select></label
      >
    </div>
    <p class="muted small" role="status">
      {{ t('glossary.count', { count: results.length }) }} ·
      {{ t('glossary.page', { page: page + 1, total: pageCount }) }}
    </p>
    <div
      ref="grid"
      class="concept-grid"
      tabindex="-1"
      role="region"
      :aria-label="t('glossary.results')"
    >
      <article v-for="concept in visible" :key="concept.id" class="concept-card">
        <span class="eyebrow">{{ concept.id }} · {{ concept.english }}</span>
        <h2>{{ concept.title }}</h2>
        <p>{{ concept.definition }}</p>
        <template v-if="prefs.value.level !== 'intuition' && concept.question && concept.answer"
          ><p class="concept-question">{{ concept.question }}</p>
          <p>{{ concept.answer }}</p></template
        ><code v-if="prefs.value.level === 'formal' && concept.formula">{{ concept.formula }}</code>
        <p v-if="concept.reference" class="reference-note">
          {{
            t(prefs.value.level === 'intuition' ? 'glossary.reference' : 'glossary.referenceDetail')
          }}
        </p>
        <RouterLink v-else :to="`/lab/${concept.lab ?? 'neurona'}`" class="text-link"
          >{{ t('glossary.try') }}<AppIcon name="arrow" :size="16" /></RouterLink
        ><RouterLink
          :to="{ path: '/glosario', query: { q: concept.id } }"
          class="text-link concept-permalink"
          :aria-label="t('glossary.permalink', { id: concept.id })"
          >{{ concept.id }} ↗</RouterLink
        >
      </article>
    </div>
    <p v-if="!results.length" class="empty-state">{{ t('glossary.empty') }}</p>
    <nav class="glossary-pagination" :aria-label="t('glossary.pagination')">
      <button class="button secondary" :disabled="page === 0" @click="movePage(-1)">
        {{ t('glossary.previous') }}</button
      ><span>{{ t('glossary.page', { page: page + 1, total: pageCount }) }}</span
      ><button class="button secondary" :disabled="page >= pageCount - 1" @click="movePage(1)">
        {{ t('glossary.next') }}
      </button>
    </nav>
    <p class="catalog-note">
      {{ t('glossary.catalogNote', { count: catalogPlannedCount, published: concepts.length }) }}
    </p>
  </div>
</template>

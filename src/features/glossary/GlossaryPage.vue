<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from '@/app/i18n';
import { searchConcepts } from '@/content/concepts';
import { usePreferencesStore } from '@/stores/preferences';
import AppIcon from '@/shared/ui/AppIcon.vue';
import AppPagination from '@/shared/ui/AppPagination.vue';
import { useCatalogStore } from '@/stores/catalog';
const catalog = useCatalogStore();
const concepts = computed(() => catalog.registry.summaries);
onMounted(() => catalog.load());
const { t } = useI18n();
const prefs = usePreferencesStore(),
  route = useRoute();
const query = ref(typeof route.query.q === 'string' ? route.query.q : ''),
  topic = ref('all'),
  kind = ref('all'),
  page = ref(0);
const grid = ref<HTMLElement>();
const pageSize = ref(24);
watch(
  () => route.query.q,
  (q) => {
    query.value = typeof q === 'string' ? q : '';
  },
);
watch([query, topic, kind, pageSize], () => (page.value = 0));
const results = computed(() =>
  searchConcepts(query.value, concepts.value).filter(
    (c) =>
      (topic.value === 'all' || (c.topic ?? 'laboratories') === topic.value) &&
      (kind.value === 'all' || (kind.value === 'reference' ? c.reference : !c.reference)),
  ),
);
const pageCount = computed(() => Math.max(1, Math.ceil(results.value.length / pageSize.value)));
const visible = computed(() =>
  results.value.slice(page.value * pageSize.value, (page.value + 1) * pageSize.value),
);
const topics = computed(() =>
  catalog.registry.categories
    .map((g) => ({ ...g, count: concepts.value.filter((c) => c.topic === g.id).length }))
    .filter((g) => g.count > 0),
);
watch(results, () => (page.value = Math.min(page.value, pageCount.value - 1)));
function goToPage(number: number) {
  page.value = Math.max(0, Math.min(pageCount.value - 1, number - 1));
  void nextTick(() => grid.value?.focus());
}
</script>
<template>
  <div class="page">
    <p class="eyebrow">{{ t('glossary.eyebrow') }}</p>
    <h1>{{ t('glossary.title') }}</h1>
    <p class="page-intro">{{ t('glossary.description') }}</p>
    <nav aria-label="Aprendizaje">
      <RouterLink to="/conceptos/mapa">Mapa de conceptos</RouterLink> ·
      <RouterLink to="/repaso">Repaso espaciado</RouterLink> ·
      <RouterLink to="/conceptos/paquetes">Ampliar catálogo</RouterLink>
    </nav>
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
    <label class="glossary-page-size" for="concept-page-size"
      >{{ t('glossary.pageSize') }}
      <select id="concept-page-size" v-model.number="pageSize">
        <option v-for="size in [12, 24, 48, 96]" :key="size" :value="size">{{ size }}</option>
      </select>
    </label>
    <p class="muted small" role="status">
      {{ t('glossary.count', { count: results.length }) }} ·
      {{ t('glossary.page', { page: page + 1, total: pageCount }) }}
      ·
      {{
        t('glossary.range', {
          first: results.length ? page * pageSize + 1 : 0,
          last: Math.min((page + 1) * pageSize, results.length),
          total: results.length,
        })
      }}
    </p>
    <AppPagination
      :page="page + 1"
      :pages="pageCount"
      :label="t('glossary.paginationTop')"
      @change="goToPage"
    />
    <div
      ref="grid"
      class="concept-grid"
      tabindex="-1"
      role="region"
      :aria-label="t('glossary.results')"
    >
      <article v-for="concept in visible" :key="concept.id" class="concept-card">
        <span class="eyebrow">{{ concept.id }} · {{ concept.english }}</span>
        <h2>
          <RouterLink :to="'/conceptos/' + concept.id">{{ concept.title }}</RouterLink>
        </h2>
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
    <AppPagination
      :page="page + 1"
      :pages="pageCount"
      :label="t('glossary.paginationBottom')"
      @change="goToPage"
    />
    <p class="catalog-note">
      Catálogo abierto: {{ concepts.length }} conceptos publicados. Las fichas de consulta y las
      actividades previstas se identifican por su estado. Puedes añadir paquetes sin un máximo
      global fijo.
    </p>
  </div>
</template>

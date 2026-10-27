<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useCatalogStore } from '@/stores/catalog';
import { useReviewStore } from '@/stores/review';
import AppPagination from '@/shared/ui/AppPagination.vue';
const catalog = useCatalogStore(),
  review = useReviewStore(),
  selected = ref('C021'),
  query = ref(''),
  page = ref(1);
onMounted(() => Promise.all([catalog.load(), review.load()]));
watch(query, () => (page.value = 1));
const summaries = computed(() => new Map(catalog.registry.summaries.map((c) => [c.id, c])));
const ordered = computed(() =>
  catalog.registry.order.filter((id) =>
    (id + ' ' + summaries.value.get(id)?.title)
      .toLocaleLowerCase('es')
      .includes(query.value.toLocaleLowerCase('es')),
  ),
);
const pages = computed(() => Math.max(1, Math.ceil(ordered.value.length / 30))),
  visible = computed(() => ordered.value.slice((page.value - 1) * 30, page.value * 30));
const neighborhood = computed(() => {
  const node = catalog.registry.nodes.find((n) => n.id === selected.value);
  if (!node) return [];
  const before = node.prerequisiteIds,
    after = catalog.registry.nodes
      .filter((n) => n.prerequisiteIds.includes(node.id))
      .map((n) => n.id),
    related = node.relatedIds.filter((id) => !before.includes(id) && !after.includes(id));
  return [...new Set([...before, node.id, ...after, ...related])].slice(0, 60).map((id) => {
    const column = id === node.id ? 1 : before.includes(id) ? 0 : after.includes(id) ? 2 : 3;
    return {
      id,
      column,
      x: 80 + column * 230,
      y: 45 + [before, [node.id], after, related][column]!.indexOf(id) * 52,
    };
  });
});
const graphHeight = computed(() => Math.max(180, ...neighborhood.value.map((n) => n.y + 45)));
function title(id: string) {
  return summaries.value.get(id)?.title ?? id;
}
</script>
<template>
  <div class="page learning-page">
    <p class="eyebrow">RELACIONES / PRERREQUISITOS</p>
    <h1>Construye tu mapa.</h1>
    <p class="page-intro">
      El grafo muestra un entorno de hasta 60 conceptos. La lista completa sigue un orden válido de
      prerrequisitos e incluye todas las fichas y términos de consulta.
    </p>
    <RouterLink to="/glosario">Glosario</RouterLink> · <RouterLink to="/repaso">Repaso</RouterLink>
    <section class="panel">
      <label
        >Concepto central
        <select v-model="selected">
          <option v-for="c in catalog.registry.summaries" :key="c.id" :value="c.id">
            {{ c.id }} · {{ c.title }}
          </option>
        </select></label
      >
      <p>
        Columnas: prerrequisitos → concepto → conceptos que lo necesitan. Última columna:
        relacionados. Línea continua: prerrequisito; discontinua: relación.
      </p>
      <div
        class="concept-map-scroll"
        tabindex="0"
        role="region"
        aria-label="Desplazar mapa de conceptos"
      >
        <svg
          :style="{ height: graphHeight + 'px' }"
          :viewBox="`0 0 900 ${graphHeight}`"
          role="img"
          :aria-label="'Relaciones de ' + title(selected)"
        >
          <title>
            Entorno de {{ title(selected) }}. Los mismos enlaces están disponibles debajo.
          </title>
          <template
            v-for="n in neighborhood.filter((n) => n.id !== selected)"
            :key="'edge-' + n.id"
          >
            <line
              :x1="neighborhood.find((n) => n.id === selected)?.x"
              :y1="neighborhood.find((n) => n.id === selected)?.y"
              :x2="n.x"
              :y2="n.y"
              stroke="currentColor"
              :stroke-dasharray="n.column === 3 ? '4 4' : undefined"
              opacity="0.4"
            />
          </template>
          <g v-for="n in neighborhood" :key="n.id">
            <circle
              :cx="n.x"
              :cy="n.y"
              r="17"
              fill="var(--surface, #17223b)"
              stroke="currentColor"
            />
            <text :x="n.x" :y="n.y + 4" text-anchor="middle" fill="currentColor" font-size="11">
              {{ n.id }}
            </text>
            <text :x="n.x + 23" :y="n.y + 4" fill="currentColor" font-size="11">
              {{ title(n.id).slice(0, 24) }}
            </text>
          </g>
        </svg>
      </div>
      <ul>
        <li v-for="n in neighborhood" :key="n.id">
          <RouterLink :to="'/conceptos/' + n.id">{{ n.id }} · {{ title(n.id) }}</RouterLink> ·
          {{ ['prerrequisito', 'central', 'requiere al central', 'relacionado'][n.column] }}
        </li>
      </ul>
    </section>
    <section class="panel">
      <h2>Todos los conceptos en orden de prerrequisitos</h2>
      <label>Filtrar la lista <input v-model="query" type="search" /></label>
      <p>
        {{ ordered.length }} conceptos · página {{ page }} / {{ pages }}. Marcas locales de
        actividad; no acreditan dominio.
      </p>
      <ol :start="(page - 1) * 30 + 1">
        <li v-for="id in visible" :key="id">
          <RouterLink :to="'/conceptos/' + id">{{ id }} · {{ title(id) }}</RouterLink
          ><span v-if="review.records[id]">
            · visitado {{ review.records[id]?.visited ? 'sí' : 'no' }} · explicado
            {{ review.records[id]?.explained ? 'sí' : 'no' }} · repasado
            {{ review.records[id]?.reviewed ? 'sí' : 'no' }}</span
          >
        </li>
      </ol>
      <AppPagination :page="page" :pages="pages" label="Mapa completo" @change="page = $event" />
    </section>
  </div>
</template>
<style scoped>
.concept-map-scroll {
  overflow-x: auto;
}
.concept-map-scroll svg {
  min-width: 850px;
  width: 100%;
  max-height: 1200px;
}
</style>

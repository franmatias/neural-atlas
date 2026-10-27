<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useCatalogStore } from '@/stores/catalog';
import { useReviewStore } from '@/stores/review';
import { assessAnswer } from '@/domain/content/concept';
import { localDay } from '@/infrastructure/storage/local-day';
import { downloadLearning } from '@/infrastructure/files/learning';
const catalog = useCatalogStore(),
  review = useReviewStore(),
  route = useRoute(),
  selected = ref<string[]>([]),
  result = ref<boolean>(),
  reset = ref(false),
  filter = ref('all');
const available = computed(() =>
  [...catalog.registry.records.values()].filter(
    (c) =>
      c.status !== 'deprecated' && (filter.value === 'all' || review.current(c).due <= localDay()),
  ),
);
const chosen = ref(typeof route.query.id === 'string' ? route.query.id : 'C001');
const concept = computed(() => catalog.registry.records.get(chosen.value));
watch(chosen, () => {
  selected.value = [];
  result.value = undefined;
  reset.value = false;
});
onMounted(() => Promise.all([catalog.load(), review.load()]));
async function grade() {
  if (!concept.value || !selected.value.length || review.saving) return;
  result.value = assessAnswer(concept.value.selfAssessment, selected.value);
  await review.grade(concept.value, result.value);
}
function next() {
  const i = available.value.findIndex((c) => c.id === chosen.value);
  chosen.value = available.value[(i + 1) % available.value.length]?.id ?? chosen.value;
  selected.value = [];
  result.value = undefined;
}
</script>
<template>
  <div class="page learning-page">
    <p class="eyebrow">PRACTICAR / RECORDAR / EXPLICAR</p>
    <h1>Repasa a tu ritmo.</h1>
    <p class="page-intro">
      Una respuesta razonada vale más que una racha. Las cajas Leitner programan el próximo repaso;
      no miden tu competencia profesional.
    </p>
    <RouterLink to="/glosario">Glosario</RouterLink> ·
    <RouterLink to="/conceptos/mapa">Mapa</RouterLink>
    <section class="panel">
      <label
        >Cola
        <select v-model="filter">
          <option value="all">Práctica libre</option>
          <option value="due">Pendientes hoy</option>
        </select></label
      ><label
        >Concepto
        <select v-model="chosen">
          <option v-for="c in available" :key="c.id" :value="c.id">
            {{ c.id }} · {{ c.title.es }}
          </option>
        </select></label
      >
      <p>
        {{ available.length }} fichas disponibles. Hoy: {{ localDay() }} (fecha de tu dispositivo).
      </p>
      <button
        class="button secondary"
        @click="
          downloadLearning(
            {
              format: 'neural-atlas.review',
              schemaVersion: 1,
              exportedDay: localDay(),
              records: review.records,
              ...(review.pending ? { unsavedResponse: review.pending } : {}),
            },
            'mi-repaso.json',
          )
        "
      >
        Exportar repaso guardado</button
      ><button class="button secondary" :disabled="review.saving" @click="review.refresh">
        Recargar guardado
      </button>
      <p role="alert">{{ review.error }}</p>
    </section>
    <section v-if="concept" class="panel">
      <h2>{{ concept.title.es }}</h2>
      <RouterLink :to="'/conceptos/' + concept.id">Consultar la ficha</RouterLink>
      <fieldset :disabled="review.saving || result !== undefined || !review.loaded">
        <legend>{{ concept.selfAssessment.prompt }}</legend>
        <p>Selecciona todas las respuestas correctas.</p>
        <label
          v-for="option in concept.selfAssessment.options"
          :key="option.id"
          class="review-option"
          ><input v-model="selected" type="checkbox" :value="option.id" />{{ option.text }}</label
        >
      </fieldset>
      <button
        class="button primary"
        :disabled="!selected.length || review.saving || result !== undefined || !review.loaded"
        @click="grade"
      >
        Comprobar respuesta
      </button>
      <div v-if="result !== undefined" role="status">
        <h3>{{ result ? 'Respuesta correcta' : 'Revisa tu razonamiento' }}</h3>
        <p>{{ concept.selfAssessment.answer }}</p>
        <p>{{ concept.selfAssessment.explanation }}</p>
        <p>
          Si no pudo guardarse, la respuesta sigue visible aquí pero la caja permanece sin cambios.
        </p>
        <button class="button secondary" @click="next">Siguiente pregunta</button>
      </div>
      <p>
        Caja {{ review.current(concept).box }} / 5 · próximo repaso
        {{ review.current(concept).due }} · últimas
        {{ review.current(concept).responses.length }} respuestas.
      </p>
      <p>
        Acierto: cajas 1–5 con 1, 3, 7, 14 y 30 días. Error: caja 0 y repaso mañana. Una nueva
        versión de la ficha inicia su propia práctica.
      </p>
      <button class="button secondary" @click="reset = true">Reiniciar esta ficha…</button>
      <div v-if="reset">
        <p>
          Se borrarán las últimas respuestas y marcas de {{ concept.id }}. Puedes exportarlas antes.
        </p>
        <button
          class="button primary"
          :disabled="review.saving"
          @click="
            review.reset(concept);
            reset = false;
            result = undefined;
            selected = [];
          "
        >
          Confirmar reinicio</button
        ><button class="button secondary" @click="reset = false">Conservar</button>
      </div>
    </section>
  </div>
</template>

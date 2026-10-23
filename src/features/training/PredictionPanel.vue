<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useTrainingStore } from '@/stores/training';
import { useDatasetsStore } from '@/stores/datasets';
import type { Cell } from '@/domain/data/types';
import { formatData } from '@/shared/utils/data-format';
const session = useTrainingStore(),
  data = useDatasetsStore();
const values = ref<Record<string, Cell>>({});
watch(
  () => data.prepared?.pipeline,
  (pipeline) => {
    values.value = Object.fromEntries(
      (pipeline?.columns ?? []).map((column) => [column.id, column.fill]),
    );
  },
  { immediate: true },
);
const warnings = computed(() =>
  (data.prepared?.pipeline.columns ?? []).filter((column) =>
    column.kind === 'numeric'
      ? Number(values.value[column.id]) < column.min || Number(values.value[column.id]) > column.max
      : !column.vocabulary.includes(String(values.value[column.id])),
  ),
);
const probabilities = computed(() =>
  session.prediction?.length === 1 && session.input?.config.spec.task === 'binary'
    ? [1 - session.prediction[0]!, session.prediction[0]!]
    : (session.prediction ?? []),
);
const decision = computed(() =>
  session.input?.config.spec.task === 'binary'
    ? probabilities.value[session.positive]! >= session.threshold
      ? session.positive
      : 1 - session.positive
    : probabilities.value.indexOf(Math.max(...probabilities.value)),
);
</script>
<template>
  <section v-if="session.state && data.prepared" class="training-panel">
    <h2>Predecir una muestra nueva</h2>
    <p>
      Introduce valores originales. Se aplica el mismo pipeline ajustado con train. Predecir no
      actualiza pesos ni usa una etiqueta objetivo.
    </p>
    <form @submit.prevent="session.predict(values)">
      <div class="training-fields">
        <label v-for="column in data.prepared.pipeline.columns" :key="column.id"
          >{{ data.dataset.features.find((feature) => feature.id === column.id)?.name ?? column.id
          }}<input
            v-if="column.kind === 'numeric'"
            v-model.number="values[column.id]"
            type="number"
            step="any"
            required
            :disabled="session.running || session.evaluating" /><input
            v-else
            v-model="values[column.id]"
            type="text"
            :disabled="session.running || session.evaluating"
        /></label>
      </div>
      <p v-if="warnings.length" class="training-alert">
        Hay valores fuera del rango observado en train o categorías desconocidas. La predicción
        puede extrapolar y no garantiza fiabilidad.
      </p>
      <button class="button secondary" :disabled="session.running || session.evaluating">
        Predecir muestra
      </button>
    </form>
    <div v-if="session.prediction" class="prediction-result" role="status">
      <p v-if="session.input?.config.spec.task === 'regression'">
        Predicción numérica: <strong>{{ formatData(session.prediction[0]!) }}</strong>
      </p>
      <template v-else>
        <p>
          Decisión: <strong>clase {{ session.input?.classOrder[decision] }}</strong
          >{{
            session.input?.config.spec.task === 'binary'
              ? ` · umbral ${formatData(session.threshold)}`
              : ''
          }}
        </p>
        <p v-for="(probability, index) in probabilities" :key="index">
          Clase {{ session.input?.classOrder[index] }}:
          <strong>{{ formatData(probability) }}</strong>
        </p>
        <p class="small muted">
          Salidas probabilísticas sin calibración demostrada. La mayor confianza no garantiza
          acierto.
        </p></template
      >
    </div>
  </section>
</template>

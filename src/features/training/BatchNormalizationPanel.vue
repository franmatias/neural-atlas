<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Network } from '@/domain/network/model';
import type { BatchStatistics } from '@/domain/training/normalized-batch';
import { normalizationEpsilon } from '@/domain/network/normalization';
import { formatData } from '@/shared/utils/data-format';
const props = defineProps<{
  model: Network;
  statistics?: BatchStatistics;
  configuredSize: number;
}>();
const layer = ref(0),
  unit = ref(0),
  mode = ref<'batch' | 'running'>('batch'),
  z = ref(1);
const layers = computed(() => props.model.layers.filter((l) => l.normalization));
const current = computed(() => layers.value[layer.value]!.normalization!);
watch(
  () => layers.value.length,
  (size) => {
    if (layer.value >= size) layer.value = 0;
  },
);
watch(
  () => current.value.gamma.length,
  (size) => {
    if (unit.value >= size) unit.value = 0;
  },
);
const mean = computed(() =>
  mode.value === 'running'
    ? current.value.mean[unit.value]
    : props.statistics?.means[layer.value]?.[unit.value],
);
const variance = computed(() =>
  mode.value === 'running'
    ? current.value.variance[unit.value]
    : props.statistics?.variances[layer.value]?.[unit.value],
);
const normalized = computed(() =>
  mean.value !== undefined && variance.value !== undefined && Number.isFinite(z.value)
    ? (z.value - mean.value) / Math.sqrt(variance.value + normalizationEpsilon)
    : undefined,
);
const transformed = computed(() =>
  normalized.value === undefined
    ? undefined
    : current.value.gamma[unit.value]! * normalized.value + current.value.beta[unit.value]!,
);
</script>
<template>
  <section class="training-panel normalization-panel">
    <h2>BN: aprender con el lote, predecir con la memoria</h2>
    <p>
      Normaliza cada característica oculta antes de la activación. Media y varianza se calculan con
      todo el lote; gamma y beta permiten aprender una escala y un desplazamiento.
    </p>
    <p v-if="statistics" class="bn-batch-size">
      Último lote efectivo: {{ statistics.size }} muestras (tamaño configurado
      {{ configuredSize }}).
      {{
        statistics.size > configuredSize
          ? 'Se combinó la cola de una muestra con el lote anterior.'
          : 'Sin combinación de cola.'
      }}
    </p>
    <p v-else>
      Aún no se ha confirmado un lote. Para evaluar se usan media inicial 0 y varianza inicial 1.
    </p>
    <label
      >Capa de normalización<select v-model.number="layer">
        <option v-for="(_, i) in layers" :key="i" :value="i">Capa {{ i + 1 }}</option>
      </select></label
    >
    <div
      class="data-table-scroll"
      tabindex="0"
      role="region"
      aria-label="Estadísticas de normalización desplazables"
    >
      <table class="dataset-table" aria-label="Estadísticas y parámetros de normalización">
        <thead>
          <tr>
            <th scope="col">Unidad</th>
            <th scope="col">Media del lote</th>
            <th scope="col">Varianza del lote</th>
            <th scope="col">Media móvil</th>
            <th scope="col">Varianza móvil</th>
            <th scope="col">Gamma</th>
            <th scope="col">Beta</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(gamma, j) in current.gamma" :key="j">
            <th scope="row">h{{ j + 1 }}</th>
            <td>{{ statistics ? formatData(statistics.means[layer]![j]!) : '—' }}</td>
            <td>{{ statistics ? formatData(statistics.variances[layer]![j]!) : '—' }}</td>
            <td>{{ formatData(current.mean[j]!) }}</td>
            <td>{{ formatData(current.variance[j]!) }}</td>
            <td>{{ formatData(gamma) }}</td>
            <td>{{ formatData(current.beta[j]!) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="small muted">
      Las estadísticas del último lote se calcularon antes de su actualización de pesos. La primera
      estadística reemplaza el valor inicial; después se usa 0,9 × memoria + 0,1 × lote. La varianza
      es poblacional. Evaluar no actualiza estas estadísticas.
    </p>
    <h3>Explora una transformación</h3>
    <div class="training-fields">
      <label
        >Unidad BN para explorar<select v-model.number="unit">
          <option v-for="(_, i) in current.gamma" :key="i" :value="i">h{{ i + 1 }}</option>
        </select></label
      ><label
        >Valor previo z para explorar<input v-model.number="z" type="number" step="0.1"
      /></label>
    </div>
    <div class="training-toolbar">
      <button
        class="button secondary"
        :disabled="!statistics"
        :aria-pressed="mode === 'batch'"
        @click="mode = 'batch'"
      >
        Usar estadísticas del lote</button
      ><button
        class="button secondary"
        :aria-pressed="mode === 'running'"
        @click="mode = 'running'"
      >
        Usar memoria de inferencia
      </button>
    </div>
    <p>
      Modo de la explicación:
      {{ mode === 'batch' ? 'entrenamiento con el último lote' : 'inferencia con medias móviles' }}.
      Esta exploración no modifica el modelo.
    </p>
    <output v-if="transformed !== undefined" class="bn-formula" aria-label="Transformación BN"
      >z = {{ formatData(z) }} → (z − {{ formatData(mean!) }}) / √({{ formatData(variance!) }} +
      0,00001) = {{ formatData(normalized!) }} → gamma × valor + beta =
      {{ formatData(transformed) }}</output
    >
    <p v-else>Completa un lote o elige memoria de inferencia, e introduce un valor finito.</p>
    <p>
      BN no es el escalado del dataset: actúa dentro de la red. Cambia la dependencia entre muestras
      durante train y no garantiza una mejora de generalización. La red de salida no usa BN.
    </p>
  </section>
</template>
<style scoped>
input {
  width: 100%;
  padding: 12px;
  border: 1px solid currentColor;
  border-radius: 10px;
}
.bn-formula {
  display: block;
  overflow-wrap: anywhere;
  padding: 16px;
  border: 1px solid currentColor;
  border-radius: 12px;
  margin-block: 12px;
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { scaleLinear } from 'd3-scale';
import type { MultiseedResult } from '@/application/training/multiseed';
import { formatData } from '@/shared/utils/data-format';
const props = defineProps<{ study: MultiseedResult; disabled: boolean; selected: number }>();
const emit = defineEmits<{ inspect: [index: number]; download: [] }>();
const extent = computed(
  () => Math.max(0.001, ...props.study.measurements.map((m) => Math.abs(m.lossDelta))) * 1.15,
);
const x = computed(() => scaleLinear().domain([-extent.value, extent.value]).range([110, 510]));
const height = computed(() => 90 + props.study.measurements.length * 34);
const rows = computed(() => [
  { label: 'Pérdida validación · referencia', value: props.study.summary.referenceLoss },
  { label: 'Pérdida validación · intervención', value: props.study.summary.interventionLoss },
  { label: 'Δ pérdida emparejada', value: props.study.summary.lossDelta },
  { label: 'Δ accuracy emparejada', value: props.study.summary.accuracyDelta },
]);
</script>
<template>
  <section class="training-panel multiseed-panel">
    <p class="eyebrow">REPETIR · COMPARAR · EXPLICAR</p>
    <h2>Una semilla no cuenta toda la historia.</h2>
    <p>
      {{ study.measurements.length }} parejas ·
      {{ study.options.comparison.intervention.toUpperCase() }} · datos y división con semilla
      {{ study.options.comparison.seed }} · máximo {{ study.options.comparison.epochs }} épocas por
      ensayo. Las medidas corresponden a esta ejecución, aunque edites los controles. En cada pareja
      coinciden pesos iniciales y semilla de entrenamiento.
    </p>
    <p>
      Δ = intervención − referencia. En pérdida, un valor negativo favorece la intervención; en
      accuracy, uno positivo. Accuracy es la fracción de aciertos, no precision. Media ± desviación
      estándar muestral (divisor n − 1) describe estas semillas; no es un intervalo de confianza, un
      error estándar ni una prueba de significación.
    </p>
    <div
      class="data-table-scroll"
      tabindex="0"
      role="region"
      aria-label="Desplazamiento del resumen multisemilla"
    >
      <table class="dataset-table" aria-label="Resumen multisemilla">
        <thead>
          <tr>
            <th scope="col">Medida</th>
            <th scope="col">Media</th>
            <th scope="col">Desviación muestral</th>
            <th scope="col">Mínimo</th>
            <th scope="col">Máximo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.label">
            <th scope="row">{{ row.label }}</th>
            <td>{{ formatData(row.value.mean) }}</td>
            <td>{{ formatData(row.value.sampleDeviation) }}</td>
            <td>{{ formatData(row.value.minimum) }}</td>
            <td>{{ formatData(row.value.maximum) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p>
      Pérdida menor en {{ study.summary.lowerLoss }} parejas, equivalente en
      {{ study.summary.equalLoss }} y mayor en {{ study.summary.higherLoss }} (tolerancia absoluta
      10⁻¹²). Este recuento es descriptivo y no elige un ganador automáticamente.
    </p>
    <div
      class="data-table-scroll"
      tabindex="0"
      role="region"
      aria-label="Desplazamiento del gráfico de diferencias"
    >
      <svg
        class="seed-plot"
        :viewBox="`0 0 600 ${height}`"
        role="img"
        aria-label="Diferencia de pérdida de validación por semilla"
      >
        <title>Diferencias emparejadas; los valores exactos están en la tabla siguiente</title>
        <line :x1="x(0)" :x2="x(0)" y1="22" :y2="height - 45" class="zero-line" />
        <g v-for="(m, index) in study.measurements" :key="m.seed">
          <text x="12" :y="44 + index * 34">{{ m.seed }}</text>
          <line
            :x1="x(0)"
            :x2="x(m.lossDelta)"
            :y1="40 + index * 34"
            :y2="40 + index * 34"
            class="delta-line"
          />
          <circle :cx="x(m.lossDelta)" :cy="40 + index * 34" r="5" />
        </g>
        <text x="12" y="16">Semilla</text>
        <text
          v-for="tick in [-extent, 0, extent]"
          :key="tick"
          :x="x(tick)"
          :y="height - 22"
          text-anchor="middle"
        >
          {{ formatData(tick) }}
        </text>
        <text x="310" :y="height - 4" text-anchor="middle">
          Δ pérdida · intervención − referencia
        </text>
      </svg>
    </div>
    <div
      class="data-table-scroll"
      tabindex="0"
      role="region"
      aria-label="Desplazamiento de las parejas multisemilla"
    >
      <table class="dataset-table" aria-label="Resultados por semilla">
        <thead>
          <tr>
            <th scope="col">Semilla</th>
            <th scope="col">Pérdida referencia</th>
            <th scope="col">Pérdida intervención</th>
            <th scope="col">Δ pérdida</th>
            <th scope="col">Δ accuracy</th>
            <th scope="col">Actualizaciones realizadas referencia / intervención</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in study.measurements" :key="m.seed">
            <th scope="row">{{ m.seed }}</th>
            <td>{{ formatData(m.referenceLoss) }}</td>
            <td>{{ formatData(m.interventionLoss) }}</td>
            <td>{{ formatData(m.lossDelta) }}</td>
            <td>{{ formatData(m.accuracyDelta) }}</td>
            <td>{{ m.referenceUpdates }} / {{ m.interventionUpdates }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p>
      Solo cambia la semilla de entrenamiento: inicialización, orden de lotes y máscaras de dropout.
      Datos, split, pipeline y copias de aumento permanecen fijos. Early stopping utiliza el estado
      seleccionado con validación; las actualizaciones realizadas incluyen las épocas observadas
      antes de restaurarlo. Aumento y parada temprana pueden cambiar el trabajo realizado.
    </p>
    <p>
      No se evalúa test ni se estima variación entre datasets, validación cruzada o una
      descomposición de sesgo y varianza. Reutilizar esta validación para muchas decisiones también
      puede sobreajustarla. No selecciones únicamente la semilla con mejor resultado.
    </p>
    <label class="seed-inspection"
      >Pareja para inspeccionar
      <select
        :value="selected"
        :disabled="disabled"
        @change="emit('inspect', Number(($event.target as HTMLSelectElement).value))"
      >
        <option v-for="(m, index) in study.measurements" :key="m.seed" :value="index">
          Semilla {{ m.seed }}
        </option>
      </select>
    </label>
    <p>
      Las curvas y los controles de inspección inferiores muestran la pareja seleccionada. Cada
      ensayo se puede exportar y abrir en entrenamiento. El estudio vive en RAM.
    </p>
    <button class="button secondary" :disabled="disabled" @click="emit('download')">
      Exportar informe multisemilla
    </button>
    <p class="small muted">
      El informe JSON contiene opciones y estadísticas; no se importa como experimento. Exporta cada
      ensayo para conservar sus datos, pesos y optimizador.
    </p>
  </section>
</template>
<style scoped>
.seed-plot {
  display: block;
  min-width: 560px;
  width: 100%;
  color: var(--ink);
}
.seed-plot text {
  fill: currentColor;
  font-size: 13px;
}
.seed-plot circle {
  fill: var(--ink);
}
.zero-line {
  stroke: var(--ink);
  stroke-dasharray: 4 4;
  opacity: 0.6;
}
.delta-line {
  stroke: var(--ink);
  stroke-width: 2;
}
.dataset-table td,
.dataset-table th {
  white-space: nowrap;
}
.seed-inspection {
  display: grid;
  gap: 8px;
  max-width: 400px;
}
.seed-inspection select {
  min-height: 44px;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink);
}
</style>

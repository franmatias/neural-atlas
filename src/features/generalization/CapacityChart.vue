<script setup lang="ts">
import { computed } from 'vue';
import { scaleLinear } from 'd3-scale';
import type { CapacitySummary, CapacityId } from '@/application/training/capacity';
import { formatData } from '@/shared/utils/data-format';
const props = defineProps<{ summary: CapacitySummary[]; capacity: CapacityId }>();
const points = computed(() => props.summary.filter((p) => p.capacity === props.capacity));
const x = scaleLinear().domain([24, 72]).range([80, 540]);
const y = computed(() =>
  scaleLinear()
    .domain([
      0,
      Math.max(
        0.01,
        ...points.value.flatMap((p) => [
          p.train.mean + p.train.sampleDeviation,
          p.validation.mean + p.validation.sampleDeviation,
        ]),
      ) * 1.15,
    ])
    .range([280, 30]),
);
</script>
<template>
  <div
    class="data-table-scroll curve-scroll"
    tabindex="0"
    role="region"
    aria-label="Desplazamiento de la curva por tamaño"
  >
    <svg
      class="capacity-chart"
      viewBox="0 0 600 340"
      role="img"
      aria-label="Pérdida train y validación según el tamaño de train"
    >
      <title>Media y desviación muestral entre semillas; valores en la tabla de resultados</title>
      <line x1="80" x2="540" y1="280" y2="280" class="axis" />
      <g v-for="tick in y.ticks(4)" :key="tick">
        <line x1="80" x2="540" :y1="y(tick)" :y2="y(tick)" class="grid" />
        <text x="70" :y="y(tick) + 4" text-anchor="end">{{ formatData(tick) }}</text>
      </g>
      <g v-for="(metric, i) in ['train', 'validation'] as const" :key="metric" :class="metric">
        <polyline
          :points="points.map((p) => `${x(p.size)},${y(p[metric].mean)}`).join(' ')"
          fill="none"
          :stroke-dasharray="i ? '6 5' : undefined"
        />
        <g v-for="p in points" :key="p.size">
          <line
            :x1="x(p.size)"
            :x2="x(p.size)"
            :y1="y(Math.max(0, p[metric].mean - p[metric].sampleDeviation))"
            :y2="y(p[metric].mean + p[metric].sampleDeviation)"
            class="deviation"
          />
          <circle v-if="!i" :cx="x(p.size)" :cy="y(p[metric].mean)" r="5" />
          <rect v-else :x="x(p.size) - 5" :y="y(p[metric].mean) - 5" width="10" height="10" />
        </g>
      </g>
      <text v-for="p in points" :key="p.size" :x="x(p.size)" y="304" text-anchor="middle">
        {{ p.size }}
      </text>
      <text x="80" y="18">Entropía cruzada binaria (BCE)</text>
      <text x="310" y="330" text-anchor="middle">Filas originales de entrenamiento</text>
    </svg>
  </div>
  <p class="small">
    ● Train: línea continua · ■ Validación: línea discontinua. Barras: media ± desviación muestral
    entre semillas, truncadas en cero; no son intervalos de confianza. Las líneas unen tamaños
    observados, sin estimar valores intermedios.
  </p>
</template>
<style scoped>
.curve-scroll {
  max-height: none;
}
.capacity-chart {
  width: 100%;
  max-width: 900px;
  min-width: 560px;
  margin: auto;
  display: block;
}
text {
  fill: var(--ink);
  font-size: 13px;
}
.axis {
  stroke: var(--ink);
}
.grid {
  stroke: var(--line);
}
.train {
  color: var(--ink);
}
.validation {
  color: var(--accent);
}
polyline,
.deviation {
  stroke: currentColor;
  stroke-width: 2;
}
circle,
rect {
  fill: currentColor;
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import type { EpochPoint } from '@/domain/training/session';
import { formatData } from '@/shared/utils/data-format';
const props = defineProps<{ history: EpochPoint[] }>();
const maximum = computed(() =>
  Math.max(0.001, ...props.history.flatMap((point) => [point.trainLoss, point.validationLoss])),
);
const paths = computed(() => {
  const x = scaleLinear()
    .domain([0, Math.max(1, props.history.at(-1)?.epoch ?? 0)])
    .range([50, 660]);
  const y = scaleLinear().domain([0, maximum.value]).range([245, 20]);
  return ['trainLoss', 'validationLoss'].map(
    (key) =>
      line<EpochPoint>()
        .x((p) => x(p.epoch))
        .y((p) => y(p[key as 'trainLoss' | 'validationLoss']))(props.history) ?? '',
  );
});
</script>
<template>
  <figure class="loss-chart">
    <figcaption>La pérdida a lo largo de las épocas</figcaption>
    <svg
      viewBox="0 0 700 280"
      role="img"
      :aria-label="`Pérdidas de entrenamiento y validación. ${history.length} registros, desde la época cero. Máximo del eje: ${formatData(maximum)}.`"
    >
      <path d="M50 20V245H660" class="chart-axis" />
      <path
        v-for="(path, index) in paths"
        :key="index"
        :d="path"
        :class="index === 0 ? 'loss-train' : 'loss-validation'"
      />
      <text x="5" y="25">{{ formatData(maximum) }}</text>
      <text x="25" y="245">0</text>
      <text x="50" y="270">0</text>
      <text x="590" y="270">Época {{ history.at(-1)?.epoch ?? 0 }}</text>
    </svg>
    <p class="small muted">
      ━ Entrenamiento · ┄ Validación. La validación mide sin modificar pesos. Una curva descendente
      no demuestra que el modelo vaya a generalizar.
    </p>
  </figure>
</template>

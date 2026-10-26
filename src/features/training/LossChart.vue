<script setup lang="ts">
import { computed } from 'vue';
import { scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import type { EpochPoint } from '@/domain/training/session';
import type { TrainingSegment } from '@/domain/training/segments';
import { formatData } from '@/shared/utils/data-format';
const props = defineProps<{
  history: EpochPoint[];
  segments?: TrainingSegment[];
  ceiling?: number;
  horizon?: number;
}>();
const maximum = computed(() =>
  Math.max(
    0.001,
    props.ceiling ?? 0,
    ...props.history.flatMap((point) => [point.trainLoss, point.validationLoss]),
  ),
);
const maxEpoch = computed(() => Math.max(1, props.horizon ?? 0, props.history.at(-1)?.epoch ?? 0));
const markerX = (update: number) =>
  50 +
  (((610 * update) / Math.max(1, props.history.at(-1)?.update ?? 0)) *
    (props.history.at(-1)?.epoch ?? 0)) /
    maxEpoch.value;
const paths = computed(() => {
  const x = scaleLinear().domain([0, maxEpoch.value]).range([50, 660]);
  const y = scaleLinear().domain([0, maximum.value]).range([245, 20]);
  const groups: EpochPoint[][] = [];
  let previous = -1;
  for (const point of props.history) {
    const group = (props.segments ?? []).filter((s) => point.update > s.atUpdate).length;
    if (group !== previous) {
      groups.push([]);
      previous = group;
    }
    groups.at(-1)!.push(point);
  }
  return groups.flatMap((group) =>
    ['trainLoss', 'validationLoss'].map(
      (key) =>
        line<EpochPoint>()
          .x((p) => x(p.epoch))
          .y((p) => y(p[key as 'trainLoss' | 'validationLoss']))(group) ?? '',
    ),
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
        :class="index % 2 === 0 ? 'loss-train' : 'loss-validation'"
      />
      <g
        v-for="(s, i) in segments?.filter((s) => s.atUpdate <= (history.at(-1)?.update ?? 0))"
        :key="s.id"
      >
        <line
          :x1="markerX(s.atUpdate)"
          y1="20"
          :x2="50 + (610 * s.atUpdate) / Math.max(1, history.at(-1)?.update ?? 0)"
          y2="245"
          stroke="currentColor"
          stroke-dasharray="3 4"
        />
        <text :x="50 + (610 * s.atUpdate) / Math.max(1, history.at(-1)?.update ?? 0)" y="15">
          S{{ i + 1 }}
          <title>
            {{ s.id }} · update {{ s.atUpdate }} · {{ s.optimizer.kind }} · tasa
            {{ s.optimizer.rate }} · reinicio {{ s.restart }}
          </title>
        </text>
      </g>
      <g v-if="segments">
        <g v-for="p in history" :key="p.epoch">
          <circle
            :cx="50 + (610 * p.epoch) / maxEpoch"
            :cy="245 - (225 * p.trainLoss) / maximum"
            r="2"
            class="loss-train"
          />
          <circle
            :cx="50 + (610 * p.epoch) / Math.max(1, history.at(-1)?.epoch ?? 0)"
            :cy="245 - (225 * p.validationLoss) / maximum"
            r="2"
            class="loss-validation"
          />
        </g>
      </g>
      <text x="5" y="25">{{ formatData(maximum) }}</text>
      <text x="25" y="245">0</text>
      <text x="50" y="270">0</text>
      <text x="590" y="270">Época {{ horizon ?? history.at(-1)?.epoch ?? 0 }}</text>
    </svg>
    <p class="small muted">
      ━ Entrenamiento · ┄ Validación. La validación mide sin modificar pesos. Una curva descendente
      no demuestra que el modelo vaya a generalizar. Las líneas se interrumpen entre segmentos con
      configuraciones distintas; S marca sus fronteras en la historia evaluada.
    </p>
  </figure>
</template>

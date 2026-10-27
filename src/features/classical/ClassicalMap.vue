<script setup lang="ts">
import { computed } from 'vue';
import type { ClassicalResult } from '@/application/training/classical-comparison';
const props = defineProps<{
    result: ClassicalResult;
    family: number;
    probeFeatures?: ClassicalResult['baseFeatures'];
    neighbors?: string[];
  }>(),
  emit = defineEmits<{ probe: [features: ClassicalResult['baseFeatures']] }>();
const colors = [
  '#2578c9',
  '#c24a57',
  '#00856d',
  '#b77a00',
  '#8058bf',
  '#237b85',
  '#a95118',
  '#74670a',
  '#a1408b',
  '#477329',
];
const axis = computed(() => props.result.axes),
  minY = computed(
    () =>
      axis.value[1]?.min ??
      Math.min(
        ...[
          ...props.result.grid.flatMap((p) => p.predictions),
          ...props.result.points.map((p) =>
            props.result.task === 'regression'
              ? Number(p.target)
              : props.result.classes.indexOf(String(p.target)),
          ),
        ],
      ) - 1,
  ),
  maxY = computed(
    () =>
      axis.value[1]?.max ??
      Math.max(
        ...[
          ...props.result.grid.flatMap((p) => p.predictions),
          ...props.result.points.map((p) =>
            props.result.task === 'regression'
              ? Number(p.target)
              : props.result.classes.indexOf(String(p.target)),
          ),
        ],
      ) + 1,
  );
function x(value: number) {
  return 35 + (350 * (value - axis.value[0]!.min)) / (axis.value[0]!.max - axis.value[0]!.min);
}
function y(value: number) {
  return 275 - (250 * (value - minY.value)) / (maxY.value - minY.value);
}
const points = computed(() =>
  props.result.points.filter((p) =>
    props.result.axes.every((a) => typeof p.features[a.id] === 'number'),
  ),
);
const curve = computed(() =>
  props.result.grid
    .map((p) => `${x(Number(p.features[axis.value[0]!.id]))},${y(p.predictions[props.family]!)}`)
    .join(' '),
);
const valueExtent = computed(() => {
  const all = [
    ...props.result.grid.flatMap((p) => p.predictions),
    ...props.result.points.map((p) =>
      props.result.task === 'regression'
        ? Number(p.target)
        : props.result.classes.indexOf(String(p.target)),
    ),
  ];
  return { lo: Math.min(...all), hi: Math.max(...all) };
});
function color(v: number) {
  if (props.result.task !== 'regression') return colors[v % colors.length];
  const { lo, hi } = valueExtent.value;
  return `hsl(${230 - (230 * (v - lo)) / (hi - lo || 1)} 60% 48%)`;
}
function click(event: MouseEvent) {
  const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect(),
    px = ((event.clientX - rect.left) * 420) / rect.width,
    py = ((event.clientY - rect.top) * 320) / rect.height;
  if (px < 35 || px > 385 || py < 25 || py > 275) return;
  const f = { ...props.result.baseFeatures };
  f[axis.value[0]!.id] =
    axis.value[0]!.min + ((px - 35) / 350) * (axis.value[0]!.max - axis.value[0]!.min);
  if (axis.value[1])
    f[axis.value[1].id] = minY.value + ((275 - py) / 250) * (maxY.value - minY.value);
  emit('probe', f);
}
</script>
<template>
  <figure v-if="axis.length" class="classical-map">
    <svg
      viewBox="0 0 420 320"
      role="img"
      :aria-label="'Corte de predicción de ' + ['kNN', 'CART', 'MLP'][family]"
      @click="click"
    >
      <title>Predicciones del modelo. Entradas alternativas por formulario y tabla debajo.</title>
      <rect x="35" y="25" width="350" height="250" fill="var(--subtle)" stroke="currentColor" />
      <template v-if="axis.length === 2">
        <rect
          v-for="(p, i) in result.grid"
          :key="i"
          :x="35 + (i % 25) * 14"
          :y="25 + (24 - Math.floor(i / 25)) * 10"
          width="14"
          height="10"
          :fill="color(p.predictions[family]!)"
          opacity=".24"
        />
      </template>
      <polyline v-else :points="curve" fill="none" stroke="var(--accent)" stroke-width="2" />
      <g v-for="p in points" :key="p.id">
        <circle
          v-if="p.partition === 'train'"
          :cx="x(Number(p.features[axis[0]!.id]))"
          :cy="
            y(
              axis[1]
                ? Number(p.features[axis[1].id])
                : result.task === 'regression'
                  ? Number(p.target)
                  : result.classes.indexOf(String(p.target)),
            )
          "
          r="2.4"
          :fill="
            result.task === 'regression'
              ? 'var(--ink)'
              : colors[result.classes.indexOf(String(p.target))]
          "
        />
        <rect
          v-else
          :x="x(Number(p.features[axis[0]!.id])) - 2"
          :y="
            y(
              axis[1]
                ? Number(p.features[axis[1].id])
                : result.task === 'regression'
                  ? Number(p.target)
                  : result.classes.indexOf(String(p.target)),
            ) - 2
          "
          width="4"
          height="4"
          fill="var(--surface)"
          stroke="var(--ink)"
        />
      </g>
      <g
        v-if="
          probeFeatures &&
          axis.length === 2 &&
          axis.every((a) => typeof probeFeatures![a.id] === 'number')
        "
      >
        <line
          v-for="p in points.filter((p) => neighbors?.includes(p.id))"
          :key="'line-' + p.id"
          :x1="x(Number(probeFeatures[axis[0]!.id]))"
          :y1="y(Number(probeFeatures[axis[1]!.id]))"
          :x2="x(Number(p.features[axis[0]!.id]))"
          :y2="y(Number(p.features[axis[1]!.id]))"
          stroke="var(--ink)"
          stroke-width="1.5"
          stroke-dasharray="3 3"
        />
        <circle
          :cx="x(Number(probeFeatures[axis[0]!.id]))"
          :cy="y(Number(probeFeatures[axis[1]!.id]))"
          r="6"
          fill="var(--surface)"
          stroke="var(--ink)"
          stroke-width="2"
        />
      </g>
      <text x="35" y="295" fill="currentColor" font-size="11">{{ axis[0]?.min.toFixed(2) }}</text>
      <text x="350" y="295" fill="currentColor" font-size="11">{{ axis[0]?.max.toFixed(2) }}</text>
      <text x="180" y="313" text-anchor="middle" fill="currentColor" font-size="12">
        {{ axis[0]?.label }}
      </text>
      <text x="37" y="16" fill="currentColor" font-size="11">
        {{ axis[1]?.label ?? 'Objetivo / predicción' }}
      </text>
    </svg>
    <ul v-if="result.task !== 'regression'" class="class-legend">
      <li v-for="(label, i) in result.classes" :key="i">
        <span :style="{ background: colors[i] }" aria-hidden="true" />{{ i }}: {{ label }}
      </li>
    </ul>
    <figcaption>
      Círculos: train · cuadrados: validación.
      {{
        axis.length === 2
          ? 'Corte condicionado a las demás entradas fijas.'
          : 'Curva sobre una característica.'
      }}
      <span v-if="result.task === 'regression' && axis.length === 2"
        >Color de predicción común a los tres mapas: {{ valueExtent.lo.toFixed(3) }} (azul) a
        {{ valueExtent.hi.toFixed(3) }} (rojo).</span
      >
      Pulsa el mapa o usa la sonda.
    </figcaption>
  </figure>
</template>
<style scoped>
.classical-map {
  margin: 0;
}
.classical-map svg {
  width: 100%;
  height: auto;
  cursor: crosshair;
}
.class-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  list-style: none;
  padding: 0;
  font-size: 0.8rem;
}
.class-legend li {
  display: flex;
  gap: 0.3rem;
  align-items: center;
}
.class-legend span {
  width: 0.7rem;
  height: 0.7rem;
  display: inline-block;
}
.classical-map figcaption {
  font-size: 0.8rem;
}
</style>

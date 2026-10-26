<script setup lang="ts">
import { computed } from 'vue';
import { line } from 'd3-shape';
import type { FunctionCurvePoint } from '@/application/training/function-approximation';
import type { FunctionKind } from '@/domain/network/function-approximation';
import { formatData } from '@/shared/utils/data-format';
const props = defineProps<{
  curve: FunctionCurvePoint[];
  kind: FunctionKind;
  bound: number;
  neuron: number;
  bias: number;
  probe: number;
  all: boolean;
}>();
const emit = defineEmits<{ probe: [x: number] }>();
const x = (v: number) => 96 + (v + 1) * 284,
  y = (v: number) => 170 - (135 * v) / props.bound;
const path = (points: FunctionCurvePoint[], value: (p: FunctionCurvePoint) => number) =>
  line<FunctionCurvePoint>()
    .x((p) => x(p.x))
    .y((p) => y(value(p)))(points) ?? '';
const prediction = computed(() => path(props.curve, (p) => p.prediction));
const target = computed(() =>
  props.kind === 'step'
    ? `M${x(-1)},${y(0)}H${x(0)} M${x(0)},${y(1)}H${x(1)}`
    : path(props.curve, (p) => p.target),
);
const components = computed(() =>
  Array.from({ length: props.curve[0]?.contributions.length ?? 0 }, (_, j) =>
    path(props.curve, (p) => p.contributions[j]!),
  ),
);
function choose(event: PointerEvent) {
  const box = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
  if (!box.width) return;
  emit(
    'probe',
    Number(
      Math.max(
        -1,
        Math.min(1, (((event.clientX - box.left) * 720) / box.width - 96) / 284 - 1),
      ).toFixed(6),
    ),
  );
}
function key(event: KeyboardEvent) {
  const value =
    event.key === 'Home'
      ? -1
      : event.key === 'End'
        ? 1
        : event.key === 'ArrowLeft'
          ? props.probe - 0.01
          : event.key === 'ArrowRight'
            ? props.probe + 0.01
            : null;
  if (value === null) return;
  event.preventDefault();
  emit('probe', Number(Math.max(-1, Math.min(1, value)).toFixed(6)));
}
</script>
<template>
  <figure class="function-plot">
    <figcaption>Objetivo, predicción y contribuciones · x ∈ [−1, 1]</figcaption>
    <p class="small muted">Eje vertical: salida y términos. Escala fija entre anchuras y épocas.</p>
    <svg
      viewBox="0 0 720 360"
      role="group"
      tabindex="0"
      aria-label="Plano de aproximación. Pulsa para elegir x; flechas izquierda y derecha cambian 0,01; Inicio y Fin eligen los extremos."
      @pointerup="choose"
      @keydown="key"
    >
      <path :d="`M96 35V305H664 M96 ${y(0)}H664`" class="axes" />
      <g v-for="tick in [-1, 0, 1]" :key="tick">
        <text :x="x(tick)" y="344" text-anchor="middle">{{ tick }}</text>
        <text x="88" :y="y(tick * bound) + 4" text-anchor="end">
          {{ formatData(tick * bound) }}
        </text>
      </g>
      <text x="695" y="344">x</text>
      <g v-if="all">
        <path v-for="(p, j) in components" :key="j" :d="p" class="other-term">
          <title>Contribución de neurona {{ j + 1 }}</title>
        </path>
      </g>
      <path :d="`M96 ${y(bias)}H664`" class="bias-line" />
      <path :d="target" class="target-line" />
      <path :d="prediction" class="prediction-line" />
      <path :d="components[neuron]" class="selected-term" />
      <g v-if="kind === 'step'">
        <circle :cx="x(0)" :cy="y(0)" r="4" class="open-limit" />
        <circle :cx="x(0)" :cy="y(1)" r="4" class="closed-limit" />
      </g>
      <path :d="`M${x(probe)} 35V305`" class="probe-line" />
    </svg>
    <p class="small muted">
      ┄ Objetivo · ━ Predicción · ⋯ Contribución seleccionada · ┄ Sesgo horizontal. Los demás
      términos se muestran como contexto. El inspector numérico permite distinguirlos sin depender
      del color. El rango vertical es ±{{ formatData(bound) }}, común a todas las curvas del
      estudio.
    </p>
  </figure>
</template>
<style scoped>
.function-plot {
  margin: 0;
}
figcaption {
  font-weight: 700;
  margin-bottom: 12px;
}
svg {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);
  cursor: crosshair;
  touch-action: pan-y;
}
text {
  fill: var(--ink);
  font-size: 12px;
}
path {
  fill: none;
}
.axes {
  stroke: var(--muted);
  stroke-width: 1;
}
.target-line {
  stroke: var(--ink);
  stroke-dasharray: 8 5;
  stroke-width: 2.5;
}
.prediction-line {
  stroke: var(--accent);
  stroke-width: 3;
}
.selected-term {
  stroke: var(--orange);
  stroke-dasharray: 2 3;
  stroke-width: 2.5;
}
.other-term {
  stroke: var(--muted);
  opacity: 0.28;
  stroke-width: 1;
}
.bias-line {
  stroke: var(--muted);
  stroke-dasharray: 10 4;
  stroke-width: 1.5;
}
.probe-line {
  stroke: var(--ink);
  stroke-dasharray: 3 5;
}
.open-limit {
  fill: var(--surface);
  stroke: var(--ink);
  stroke-width: 2;
}
.closed-limit {
  fill: var(--ink);
}
@media (max-width: 700px) {
  text {
    font-size: 32px;
  }
}
</style>

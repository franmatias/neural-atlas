<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{
  title: string;
  xLabel: string;
  yLabel: string;
  points: { x: number; y: number; count?: number }[];
  diagonal?: boolean;
  baseline?: number;
  scatter?: boolean;
  step?: boolean;
  selected?: number;
}>();
const x = (v: number) => 48 + 300 * v,
  y = (v: number) => 250 - 210 * v;
const path = computed(() =>
  props.points
    .map(
      (p, i) =>
        `${i ? (props.step ? `L${x(props.points[i - 1]!.x)},${y(p.y)} L` : 'L') : 'M'}${x(p.x)},${y(p.y)}`,
    )
    .join(' '),
);
</script>
<template>
  <figure class="probability-chart">
    <figcaption>{{ title }}</figcaption>
    <svg
      viewBox="0 0 390 300"
      role="img"
      :aria-label="`${title}. Eje horizontal: ${xLabel}; vertical: ${yLabel}. Datos numéricos debajo.`"
    >
      <path d="M48 40V250H348" class="axis" />
      <g v-for="tick in [0, 0.5, 1]" :key="tick">
        <text :x="x(tick)" y="269" text-anchor="middle">{{ tick }}</text>
        <text x="38" :y="y(tick) + 4" text-anchor="end">{{ tick }}</text>
      </g>
      <path v-if="diagonal" d="M48 250L348 40" class="reference" />
      <path v-if="baseline !== undefined" :d="`M48 ${y(baseline)}H348`" class="reference" />
      <path v-if="!scatter" :d="path" class="curve" />
      <circle
        v-for="(p, i) in points"
        :key="i"
        :cx="x(p.x)"
        :cy="y(p.y)"
        :r="scatter ? Math.min(10, 3 + Math.sqrt(p.count ?? 1)) : i === selected ? 6 : 2.5"
        :class="{ selected: i === selected }"
      >
        <title>
          {{ `${xLabel}: ${p.x}; ${yLabel}: ${p.y}${p.count ? `; n=${p.count}` : ''}` }}
        </title>
      </circle>
      <text x="198" y="292" text-anchor="middle">{{ xLabel }}</text>
      <text x="48" y="24">{{ yLabel }}</text>
    </svg>
  </figure>
</template>
<style scoped>
.probability-chart {
  margin: 0;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 16px;
}
figcaption {
  font-weight: 700;
}
svg {
  display: block;
  width: 100%;
  height: auto;
}
text {
  fill: var(--ink);
  font-size: 12px;
}
.axis {
  stroke: var(--ink);
  fill: none;
}
.reference {
  stroke: var(--ink);
  stroke-dasharray: 6 5;
  fill: none;
  opacity: 0.6;
}
.curve {
  stroke: var(--accent);
  stroke-width: 2.5;
  fill: none;
}
circle {
  fill: var(--accent);
  stroke: var(--surface);
  stroke-width: 1;
}
circle.selected {
  fill: var(--ink);
  stroke-width: 2;
}
</style>

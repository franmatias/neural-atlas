<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{
  values: number[];
  size: number;
  label: string;
  selected?: number;
  highlight?: number[];
  editable?: boolean;
  padding?: boolean[];
}>();
const emit = defineEmits<{ select: [index: number] }>();
const scale = computed(() => Math.max(1e-12, ...props.values.map(Math.abs)));
function pick(event: PointerEvent) {
  if (event.type === 'pointermove' && (!props.editable || event.buttons !== 1)) return;
  const svg = event.currentTarget as SVGSVGElement,
    box = svg.getBoundingClientRect(),
    row = Math.floor(((event.clientY - box.top) / box.height) * props.size),
    column = Math.floor(((event.clientX - box.left) / box.width) * props.size);
  if (row >= 0 && row < props.size && column >= 0 && column < props.size) {
    if (event.type === 'pointerdown' && props.editable) svg.setPointerCapture(event.pointerId);
    emit('select', row * props.size + column);
  }
}
</script>
<template>
  <figure>
    <svg
      :viewBox="`0 0 ${size * 24} ${size * 24}`"
      role="img"
      :aria-label="label"
      :class="{ editable }"
      @pointerdown="pick"
      @pointermove="pick"
    >
      <g v-for="(value, i) in values" :key="i">
        <rect
          :x="(i % size) * 24 + 1"
          :y="Math.floor(i / size) * 24 + 1"
          width="22"
          height="22"
          :fill="value < 0 ? 'var(--orange)' : 'var(--accent)'"
          :fill-opacity="0.12 + (0.88 * Math.abs(value)) / scale"
          :stroke="i === selected || highlight?.includes(i) ? 'var(--ink)' : 'var(--line)'"
          :stroke-width="i === selected || highlight?.includes(i) ? 3 : 1"
          :stroke-dasharray="padding?.[i] ? '3 2' : undefined"
        >
          <title>
            Fila {{ Math.floor(i / size) }}, columna {{ i % size }}: {{ value
            }}{{ padding?.[i] ? ' · padding cero' : '' }}
          </title>
        </rect>
        <text
          v-if="size <= 12"
          :x="(i % size) * 24 + 12"
          :y="Math.floor(i / size) * 24 + 15"
          text-anchor="middle"
          font-size="7"
          fill="var(--ink)"
          stroke="var(--surface)"
          stroke-width="2"
          paint-order="stroke"
        >
          {{ Number(value.toFixed(1)) }}
        </text>
      </g>
    </svg>
    <figcaption>
      {{ label }} · {{ size }}×{{ size }}. Escala de intensidad: |valor| de 0 a
      {{ scale.toPrecision(4) }}. Naranja: negativo; verde: positivo; valores numéricos en el
      inspector/informe.
    </figcaption>
  </figure>
</template>
<style scoped>
figure {
  margin: 0;
  min-width: 0;
}
svg {
  display: block;
  width: 100%;
  max-width: 420px;
  aspect-ratio: 1;
  cursor: crosshair;
}
.editable {
  touch-action: none;
}
figcaption {
  font-size: 0.8rem;
  color: var(--muted);
  margin-top: 0.5rem;
}
</style>

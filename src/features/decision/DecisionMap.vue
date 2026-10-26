<script setup lang="ts">
import { computed, ref } from 'vue';
import type { decisionSurface, SurfacePoint } from '@/domain/network/decision-surface';
import type { Dataset, DataSplit } from '@/domain/data/types';
const props = defineProps<{
  surface: ReturnType<typeof decisionSurface>;
  dataset: Dataset;
  split: DataSplit;
  probe: SurfacePoint;
  boundary: boolean;
  subset: 'train' | 'validation';
  adding: boolean;
}>();
const emit = defineEmits<{ select: [x: number, y: number] }>();
const svg = ref<SVGSVGElement>();
const palette = ['#d75679', '#2686cd', '#32845b', '#a77916'];
const marks = ['●', '◆', '▲', '■'];
const rows = computed(() =>
  props.dataset.rows.filter((row) => props.split[props.subset].includes(row.id)),
);
const sx = (x: number) => 40 + ((x + props.surface.extent) / (2 * props.surface.extent)) * 440;
const sy = (y: number) => 460 - ((y + props.surface.extent) / (2 * props.surface.extent)) * 440;
const inside = (x: number, y: number) =>
  Math.abs(x) <= props.surface.extent && Math.abs(y) <= props.surface.extent;
const clipped = computed(
  () => rows.value.filter((r) => !inside(Number(r.features.x1), Number(r.features.x2))).length,
);
function select(event: MouseEvent) {
  if (!svg.value) return;
  const matrix = svg.value.getScreenCTM();
  if (!matrix) return;
  const p = new window.DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  if (p.x < 40 || p.x > 480 || p.y < 20 || p.y > 460) return;
  emit(
    'select',
    ((p.x - 40) / 440) * 2 * props.surface.extent - props.surface.extent,
    ((460 - p.y) / 440) * 2 * props.surface.extent - props.surface.extent,
  );
}
function key(event: KeyboardEvent) {
  const delta: Record<string, number[]> = {
    ArrowRight: [0.05, 0],
    ArrowLeft: [-0.05, 0],
    ArrowUp: [0, 0.05],
    ArrowDown: [0, -0.05],
  };
  const d = delta[event.key];
  if (!d) return;
  event.preventDefault();
  const bound = (v: number) =>
    Math.max(-props.surface.extent, Math.min(props.surface.extent, Number(v.toFixed(3))));
  emit('select', bound(props.probe.x + d[0]!), bound(props.probe.y + d[1]!));
}
</script>
<template>
  <figure class="decision-map">
    <figcaption>
      <strong>Espacio de decisión · x₁ / x₂</strong
      ><span>{{
        adding ? 'Pulsa para colocar la entrada que añadirás' : 'Pulsa para probar una entrada'
      }}</span>
    </figcaption>
    <svg
      ref="svg"
      viewBox="0 0 510 505"
      tabindex="0"
      role="group"
      aria-label="Mapa de decisión interactivo. Usa las flechas para mover la entrada de prueba."
      @click="select"
      @keydown="key"
    >
      <rect x="40" y="20" width="440" height="440" class="decision-background" />
      <rect
        v-for="(cell, i) in surface.cells"
        :key="i"
        :x="sx(cell.x - surface.step / 2)"
        :y="sy(cell.y + surface.step / 2)"
        :width="440 / surface.resolution + 0.3"
        :height="440 / surface.resolution + 0.3"
        :fill="palette[cell.predicted]"
        :opacity="0.2 + 0.65 * Math.max(...cell.probabilities)"
      />
      <g class="decision-grid"><path d="M40 240H480M260 20V460" /></g>
      <g v-if="boundary" class="decision-boundary">
        <line
          v-for="(e, i) in surface.edges"
          :key="i"
          :x1="sx(e.x1)"
          :y1="sy(e.y1)"
          :x2="sx(e.x2)"
          :y2="sy(e.y2)"
        />
      </g>
      <g v-for="row in rows" :key="row.id">
        <text
          v-if="inside(Number(row.features.x1), Number(row.features.x2))"
          :x="sx(Number(row.features.x1))"
          :y="sy(Number(row.features.x2)) + 4"
          text-anchor="middle"
          :style="{ fill: palette[Number(row.target)] }"
          :class="['decision-dot', { validation: subset === 'validation' }]"
        >
          {{ marks[Number(row.target)] }}
          <title>{{ row.id }} · clase {{ row.target }} · {{ subset }}</title>
        </text>
      </g>
      <path
        :d="`M${sx(probe.x) - 9} ${sy(probe.y)}h18M${sx(probe.x)} ${sy(probe.y) - 9}v18`"
        class="decision-probe"
      />
      <text x="40" y="484">−{{ surface.extent }}</text>
      <text x="250" y="484">0</text>
      <text x="450" y="484">{{ surface.extent }}</text>
      <text x="480" y="502">x₁</text>
      <text x="4" y="28">{{ surface.extent }}</text>
      <text x="13" y="244">0</text>
      <text x="2" y="460">−{{ surface.extent }}</text>
      <text x="10" y="12">x₂</text>
    </svg>
    <div class="decision-legend">
      <span v-for="(c, i) in dataset.classOrder" :key="c"
        ><b :style="{ color: palette[i] }">{{ marks[i] }}</b> Clase {{ c }}</span
      >
    </div>
    <p class="small muted">
      {{ rows.length }} puntos de {{ subset === 'train' ? 'train' : 'validación' }}. Cruz: entrada
      de prueba. Fondo: clase predicha; intensidad: probabilidad máxima sin calibrar.
      {{ clipped ? `${clipped} puntos quedan fuera del encuadre fijo.` : '' }}
    </p>
    <p class="small muted">
      Rejilla {{ surface.resolution }} × {{ surface.resolution }}. Línea: cambios de clase
      aproximados entre celdas; no representa una frontera analítica exacta.
    </p>
  </figure>
</template>
<style scoped>
.decision-map {
  margin: 0;
  min-width: 0;
}
figcaption {
  display: grid;
  gap: 5px;
  margin-bottom: 12px;
}
figcaption span {
  font-size: 0.85rem;
}
svg {
  display: block;
  width: 100%;
  max-height: 600px;
  cursor: crosshair;
  touch-action: manipulation;
}
svg text {
  fill: var(--ink);
  font-size: 12px;
}
.decision-background {
  fill: var(--surface);
  stroke: var(--line);
}
.decision-grid {
  stroke: var(--ink);
  opacity: 0.15;
  stroke-dasharray: 3 5;
}
.decision-boundary {
  stroke: var(--ink);
  stroke-width: 1.6;
  opacity: 0.8;
}
svg .decision-dot {
  font-size: 12px;
  paint-order: stroke;
  stroke: var(--surface);
  stroke-width: 2px;
}
svg .decision-dot.validation {
  stroke-dasharray: 1 1;
  stroke-width: 3px;
}
.decision-probe {
  stroke: var(--ink);
  stroke-width: 3;
  fill: none;
}
.decision-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.decision-legend b {
  font-size: 1.3rem;
}
</style>

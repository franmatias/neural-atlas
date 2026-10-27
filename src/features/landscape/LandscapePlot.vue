<script setup lang="ts">
import { computed } from 'vue';
import { contours } from 'd3-contour';
import type { LandscapeResult } from '@/application/training/landscape';
const props = defineProps<{ result: LandscapeResult; index: number }>();
const emit = defineEmits<{ start: [x: number, y: number] }>();
const colors = ['#007969', '#b23d08', '#375ac9', '#9b3c92'];
const grid = computed(() => props.result.grid);
const lines = computed(() =>
  contours()
    .size([grid.value.resolution, grid.value.resolution])
    .thresholds(12)(grid.value.values)
    .map((c) => ({
      value: c.value,
      path: c.coordinates
        .flatMap((p) =>
          p.map(
            (r) =>
              r
                .map(
                  ([x, y], i) =>
                    `${i ? 'L' : 'M'} ${50 + ((x! - 0.5) / (grid.value.resolution - 1)) * 500} ${550 - ((y! - 0.5) / (grid.value.resolution - 1)) * 500}`,
                )
                .join(' ') + ' Z',
          ),
        )
        .join(' '),
    })),
);
function x(v: number) {
  return 50 + ((v - grid.value.bounds[0]) / (grid.value.bounds[1] - grid.value.bounds[0])) * 500;
}
function y(v: number) {
  return 550 - ((v - grid.value.bounds[2]) / (grid.value.bounds[3] - grid.value.bounds[2])) * 500;
}
function pick(event: MouseEvent) {
  const s = event.currentTarget as SVGSVGElement,
    p = s.createSVGPoint();
  p.x = event.clientX;
  p.y = event.clientY;
  const q = p.matrixTransform(s.getScreenCTM()!.inverse());
  if (q.x < 50 || q.x > 550 || q.y < 50 || q.y > 550) return;
  emit(
    'start',
    grid.value.bounds[0] + ((q.x - 50) / 500) * (grid.value.bounds[1] - grid.value.bounds[0]),
    grid.value.bounds[2] + ((550 - q.y) / 500) * (grid.value.bounds[3] - grid.value.bounds[2]),
  );
}
</script>
<template>
  <figure class="landscape-plot">
    <svg
      viewBox="0 0 620 610"
      role="img"
      aria-label="Contornos de pérdida y trayectorias de cuatro optimizadores"
      @click="pick"
    >
      <defs>
        <clipPath id="landscape-domain"><rect x="50" y="50" width="500" height="500" /></clipPath>
      </defs>
      <rect x="50" y="50" width="500" height="500" fill="var(--surface)" stroke="var(--ink)" />
      <g clip-path="url(#landscape-domain)">
        <path
          v-for="c in lines"
          :key="c.value"
          :d="c.path"
          fill="none"
          stroke="var(--muted)"
          stroke-width="1"
        >
          <title>Pérdida {{ c.value.toPrecision(5) }}</title>
        </path>
        <g v-for="(p, i) in result.paths" :key="p.kind">
          <polyline
            :points="
              p.points
                .slice(0, index + 1)
                .map((v) => `${x(v.x)},${y(v.y)}`)
                .join(' ')
            "
            fill="none"
            :stroke="colors[i]"
            stroke-width="3"
            :stroke-dasharray="[undefined, '10 4', '3 3', '12 3 3 3'][i]"
          />
          <circle
            v-if="p.points.length"
            :cx="x(p.points[Math.min(index, p.points.length - 1)]!.x)"
            :cy="y(p.points[Math.min(index, p.points.length - 1)]!.y)"
            r="6"
            :fill="colors[i]"
            stroke="var(--ink)"
          />
        </g>
      </g>
      <g fill="var(--ink)" font-size="17">
        <text x="50" y="580">{{ grid.bounds[0].toFixed(2) }}</text>
        <text x="500" y="580">{{ grid.bounds[1].toFixed(2) }}</text>
        <text x="5" y="60">{{ grid.bounds[3].toFixed(1) }}</text>
        <text x="5" y="545">{{ grid.bounds[2].toFixed(1) }}</text>
        <text x="240" y="605">Coordenada x</text>
        <text x="55" y="25">Coordenada y · contornos de igual pérdida</text>
      </g>
    </svg>
    <figcaption>
      Pérdida muestreada: {{ grid.min.toPrecision(5) }} a {{ grid.max.toPrecision(5) }}. Pulsa el
      dominio para preparar otro inicio; después calcula un nuevo estudio. También puedes editar x e
      y con teclado. Los números y estilos de la tabla identifican cada trayectoria.
    </figcaption>
  </figure>
</template>
<style scoped>
.landscape-plot {
  margin: 0;
}
svg {
  width: 100%;
  max-height: 650px;
  cursor: crosshair;
}
figcaption {
  color: var(--muted);
  font-size: 0.85rem;
}
</style>

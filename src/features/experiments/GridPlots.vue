<script setup lang="ts">
import { computed } from 'vue';
import type { GridPlan, summarizeGrid } from '@/application/training/grid-search';
const props = defineProps<{ plan: GridPlan; summary: ReturnType<typeof summarizeGrid> }>();
const eligible = computed(() => props.summary.configurations.filter((c) => c.eligible));
const extent = computed(() => {
  const a = eligible.value.map((c) => c.loss!);
  return { lo: a.length ? Math.min(...a) : 0, hi: a.length ? Math.max(...a) : 1 };
});
function color(value: number | null) {
  return value === null
    ? 'var(--subtle)'
    : `hsl(${190 - (150 * (value - extent.value.lo)) / (extent.value.hi - extent.value.lo || 1)} 35% 70%)`;
}
const curve = computed(() =>
  props.summary.progression
    .map(
      (p, i) =>
        `${40 + (320 * i) / Math.max(1, props.summary.progression.length - 1)},${160 - (120 * (p.best - extent.value.lo)) / (extent.value.hi - extent.value.lo || 1)}`,
    )
    .join(' '),
);
</script>
<template>
  <div class="grid-figures">
    <figure>
      <svg viewBox="0 0 420 250" role="img" aria-label="Matriz de pérdida por anchura y tasa">
        <title>
          Solo las configuraciones completas tienen pérdida comparable. La tabla contiene todos los
          valores.
        </title>
        <text x="10" y="18" fill="var(--ink)">Filas: anchura · columnas: tasa Adam</text>
        <g v-for="c in summary.configurations" :key="c.id">
          <rect
            :x="80 + plan.settings.rates.indexOf(c.rate) * 100"
            :y="45 + plan.settings.widths.indexOf(c.width) * 60"
            width="94"
            height="52"
            :fill="color(c.eligible ? c.loss : null)"
            stroke="var(--ink)"
          />
          <text
            :x="127 + plan.settings.rates.indexOf(c.rate) * 100"
            :y="76 + plan.settings.widths.indexOf(c.width) * 60"
            :fill="c.eligible ? '#132b32' : 'var(--ink)'"
            text-anchor="middle"
          >
            {{ c.eligible ? c.loss?.toFixed(4) : 'Pendiente' }}
          </text>
        </g>
        <text
          v-for="(r, i) in plan.settings.rates"
          :key="r"
          :x="127 + i * 100"
          y="35"
          fill="var(--ink)"
          text-anchor="middle"
        >
          {{ r }}
        </text>
        <text
          v-for="(w, i) in plan.settings.widths"
          :key="w"
          x="45"
          :y="76 + i * 60"
          fill="var(--ink)"
        >
          {{ w }}
        </text>
      </svg>
      <figcaption>
        Menor pérdida de validación es mejor; pendiente incluye configuraciones incompletas o
        fallidas.
      </figcaption>
    </figure>
    <figure>
      <svg
        viewBox="0 0 420 250"
        role="img"
        aria-label="Mejor pérdida observada al ampliar la selección"
      >
        <title>
          Mejor pérdida entre configuraciones completas en su orden declarado, sin evaluación de
          test.
        </title>
        <path d="M40 35 V180 H380" fill="none" stroke="var(--ink)" />
        <polyline :points="curve" fill="none" stroke="var(--accent)" stroke-width="3" />
        <circle
          v-for="(p, i) in summary.progression"
          :key="p.configuration"
          :cx="40 + (320 * i) / Math.max(1, summary.progression.length - 1)"
          :cy="160 - (120 * (p.best - extent.lo)) / (extent.hi - extent.lo || 1)"
          r="4"
          fill="var(--accent)"
        />
        <text x="40" y="207" fill="var(--ink)">
          Configuraciones completas: {{ summary.progression.length }}
        </text>
        <text x="40" y="230" fill="var(--ink)">
          Rango: {{ extent.lo.toFixed(4) }} – {{ extent.hi.toFixed(4) }}
        </text>
      </svg>
      <figcaption>
        El mínimo observado no aumenta al añadir opciones. Esto describe selección sobre validación;
        no prueba mejor generalización.
      </figcaption>
    </figure>
  </div>
</template>
<style scoped>
.grid-figures {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}
figure {
  margin: 0;
  min-width: 0;
}
svg {
  width: 100%;
  height: auto;
}
text {
  font-size: 16px;
}
figcaption {
  font-size: 0.85rem;
}
@media (max-width: 850px) {
  .grid-figures {
    grid-template-columns: 1fr;
  }
}
</style>

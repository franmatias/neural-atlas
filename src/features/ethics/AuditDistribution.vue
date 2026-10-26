<script setup lang="ts">
import type { AuditGroup } from '@/domain/training/group-audit';
import { formatData } from '@/shared/utils/data-format';
defineProps<{
  group: AuditGroup;
  bins: { lower: number; upper: number; zero: number; one: number }[];
  maximum: number;
  reference: number;
  alternative: number;
  count: number;
}>();
const x = (v: number) => 56 + 384 * v;
const height = (v: number, max: number) => (174 * v) / Math.max(1, max);
</script>
<template>
  <figure class="audit-distribution">
    <figcaption>
      {{ group === 'G1' ? 'Canal 1' : 'Canal 2' }} · {{ count }} observaciones
    </figcaption>
    <p v-if="!count" role="status">
      Sin representación: no hay rendimiento observado de este canal.
    </p>
    <svg
      viewBox="0 0 480 280"
      role="img"
      :aria-label="`Distribución de puntuaciones de ${group}, ${count} observaciones. Umbral de referencia ${reference}, alternativa ${alternative}. Recuentos tabulados debajo.`"
    >
      <defs>
        <pattern :id="`audit-hatch-${group}`" width="7" height="7" patternUnits="userSpaceOnUse">
          <rect width="7" height="7" fill="var(--subtle)" />
          <path d="M-1 1L1 -1M0 7L7 0M6 8L8 6" stroke="var(--muted)" stroke-width="1.3" />
        </pattern>
      </defs>
      <path d="M56 46V220H440" class="axis" />
      <text x="56" y="24">Recuentos</text>
      <text x="48" y="224" text-anchor="end">0</text>
      <text x="48" y="50" text-anchor="end">{{ maximum }}</text>
      <g v-for="(b, i) in bins" :key="i">
        <rect
          :x="x(b.lower) + 3"
          :y="220 - height(b.zero, maximum)"
          width="32.4"
          :height="height(b.zero, maximum)"
          :fill="`url(#audit-hatch-${group})`"
        >
          <title>
            Etiqueta 0: {{ b.zero }} en [{{ b.lower }}, {{ b.upper }}{{ i === 9 ? ']' : ')' }}
          </title>
        </rect>
        <rect
          :x="x(b.lower) + 3"
          :y="220 - height(b.zero + b.one, maximum)"
          width="32.4"
          :height="height(b.one, maximum)"
          class="positive"
        >
          <title>
            Etiqueta 1: {{ b.one }} en [{{ b.lower }}, {{ b.upper }}{{ i === 9 ? ']' : ')' }}
          </title>
        </rect>
      </g>
      <path :d="`M${x(reference)} 46V220`" class="reference" />
      <path :d="`M${x(alternative)} 46V220`" class="alternative" />
      <text v-for="tick in [0, 0.5, 1]" :key="tick" :x="x(tick)" y="246" text-anchor="middle">
        {{ formatData(tick) }}
      </text>
      <text x="450" y="246">s</text>
    </svg>
    <p class="small muted">
      ▧ Etiqueta 0 · ■ Etiqueta 1. Línea discontinua: referencia {{ formatData(reference) }};
      continua: alternativa {{ formatData(alternative) }}. Eje horizontal: puntuación s, no
      probabilidad calibrada. Mismo eje de recuentos en ambos canales.
    </p>
    <details>
      <summary>Recuentos por intervalo · {{ group === 'G1' ? 'Canal 1' : 'Canal 2' }}</summary>
      <div class="training-table-wrap">
        <table>
          <caption>
            Distribución tabulada de
            {{
              group
            }}
          </caption>
          <thead>
            <tr>
              <th>Intervalo</th>
              <th>Etiqueta 0</th>
              <th>Etiqueta 1</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(b, i) in bins" :key="i">
              <th>
                [{{ formatData(b.lower) }}, {{ formatData(b.upper) }}{{ i === 9 ? ']' : ')' }}
              </th>
              <td>{{ b.zero }}</td>
              <td>{{ b.one }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </figure>
</template>
<style scoped>
.audit-distribution {
  min-width: 0;
  margin: 0;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);
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
  font-size: 13px;
}
.axis {
  fill: none;
  stroke: var(--muted);
}
.positive {
  fill: var(--accent);
}
.reference {
  fill: none;
  stroke: var(--ink);
  stroke-width: 2;
  stroke-dasharray: 7 4;
}
.alternative {
  fill: none;
  stroke: var(--orange);
  stroke-width: 2.5;
}
@media (max-width: 700px) {
  text {
    font-size: 22px;
  }
}
</style>

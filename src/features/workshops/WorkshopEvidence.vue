<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { WorkshopEvidence } from '@/application/workshops/contracts';
import { formatData } from '@/shared/utils/data-format';
import { usePreferencesStore } from '@/stores/preferences';
import LossChart from '@/features/training/LossChart.vue';
const props = defineProps<{ evidence: WorkshopEvidence }>();
const prefs = usePreferencesStore(),
  curve = ref(0);
watch(
  () => props.evidence.id,
  () => {
    curve.value = 0;
  },
);
const number = (value: number) =>
  value !== 0 && Math.abs(value) < 0.0001 ? value.toExponential(3) : formatData(value);
const labels: Record<string, string> = {
  splitDisjoint: 'Particiones disjuntas',
  fittedTrain: 'Pipeline ajustado solo con train',
  nonFinite: 'Valores no finitos',
  biasBefore: 'Sesgo inicial',
  biasAfter: 'Sesgo final',
  sameWeights: 'Pesos conservados',
  distance: 'Distancia perpendicular |Δb| / ||w||',
  linearCorrect: 'Mejor perceptrón aprendido / 4',
  linearExample: 'Ejemplo lineal / 4',
  mlpCorrect: 'Construcción multicapa / 4',
  gradientError: 'Máximo error relativo de gradiente',
  gradientPass: 'Gradientes dentro de tolerancia 10⁻⁵',
  updateApplied: 'Una actualización aplicada',
  lossBefore: 'Pérdida antes',
  lossAfter: 'Pérdida después',
  runCount: 'Ensayos previstos',
  recordedRuns: 'Ensayos registrados',
  budgetAccepted: 'Presupuesto reconocido',
};
const x = (value: number) => 40 + ((value + 3) / 6) * 440;
const y = (value: number) => 260 - ((value + 2) / 4) * 220;
const boundary = (bias: number) => `M${x(-3)},${y(6 - 2 * bias)} L${x(3)},${y(-6 - 2 * bias)}`;
const duration = computed(() => (prefs.reducedMotion ? '0ms' : `${700 / prefs.value.speed}ms`));
</script>
<template>
  <section
    class="training-panel workshop-evidence"
    aria-labelledby="workshop-evidence-title"
    :style="{ '--workshop-duration': duration }"
  >
    <h2 id="workshop-evidence-title">Evidencia del motor</h2>
    <p>
      Capturada
      <time :datetime="evidence.capturedAt">{{
        new Date(evidence.capturedAt).toLocaleString('es-ES')
      }}</time>
      · semilla {{ evidence.options.seed }} · motor {{ evidence.engineVersion }}. Las medidas
      describen esta ejecución.
    </p>
    <dl class="workshop-metrics">
      <div v-for="(value, key) in evidence.metrics" :key="key">
        <dt>{{ labels[key] }}</dt>
        <dd>{{ typeof value === 'boolean' ? (value ? 'Sí' : 'No') : number(value!) }}</dd>
      </div>
    </dl>
    <figure v-if="evidence.caseId === 'T02'">
      <svg
        viewBox="0 0 520 300"
        role="img"
        aria-label="Frontera antes y después de cambiar solo el sesgo"
      >
        <defs>
          <clipPath :id="`plot-${evidence.id}`">
            <rect x="40" y="40" width="440" height="220" />
          </clipPath>
        </defs>
        <rect x="40" y="40" width="440" height="220" fill="var(--subtle)" stroke="var(--line)" />
        <g :clip-path="`url(#plot-${evidence.id})`">
          <circle
            v-for="(point, index) in evidence.plot"
            :key="index"
            :cx="x(point.x)"
            :cy="y(point.y)"
            r="4"
            :fill="point.label ? 'var(--accent)' : 'var(--orange)'"
          />
          <path
            :d="boundary(0)"
            fill="none"
            stroke="var(--ink)"
            stroke-width="2"
            stroke-dasharray="6 5"
          />
          <path
            :d="boundary(evidence.options.bias)"
            fill="none"
            stroke="var(--accent)"
            stroke-width="4"
          />
        </g>
        <text x="260" y="290" text-anchor="middle" fill="var(--ink)">x₁ · −3 a 3</text>
        <text x="12" y="150" fill="var(--ink)">x₂</text>
      </svg>
      <figcaption>
        Discontinua: b = 0. Continua: b = {{ number(evidence.options.bias) }}. Dos nubes sintéticas
        sirven como referencia espacial; este caso no mide su accuracy. Las rectas son paralelas
        porque w = (1; 0,5) no cambia.
      </figcaption>
    </figure>
    <div class="workshop-table">
      <table>
        <caption>
          Medidas registradas del taller
          {{
            evidence.caseId
          }}
        </caption>
        <thead>
          <tr>
            <th v-for="column in evidence.columns" :key="column" scope="col">{{ column }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in evidence.rows" :key="row.label">
            <th scope="row">{{ row.label }}</th>
            <td v-for="(value, index) in row.values" :key="index">
              {{ typeof value === 'number' ? number(value) : value }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <template v-if="evidence.curves.length">
      <label
        >Ensayo para inspeccionar<select v-model.number="curve">
          <option v-for="(run, index) in evidence.curves" :key="index" :value="index">
            Tasa {{ run.rate }} · lote {{ run.batch }}
          </option>
        </select></label
      >
      <LossChart :history="evidence.curves[curve]!.history" />
      <p>
        Se comparan épocas, no tiempos de reloj. Un lote diferente cambia cuántas actualizaciones
        hay por época. Si se detecta divergencia se conserva el último estado finito, sin inventar
        un valor infinito para la curva.
      </p>
    </template>
  </section>
</template>
<style scoped>
.workshop-evidence {
  animation: workshop-reveal var(--workshop-duration) ease both;
}
.workshop-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
  gap: 16px;
  margin: 20px 0;
}
.workshop-metrics dt {
  font-weight: 650;
}
.workshop-metrics dd {
  margin: 6px 0 0;
  font-variant-numeric: tabular-nums;
}
.workshop-table {
  overflow-x: auto;
  margin: 20px 0;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  text-align: left;
  padding: 10px;
  border-bottom: 1px solid var(--line);
}
caption {
  text-align: left;
  font-weight: 700;
  padding: 10px 0;
}
figure {
  margin: 20px 0;
}
svg {
  width: 100%;
  max-height: 360px;
}
figcaption {
  font-size: 0.875rem;
}
@keyframes workshop-reveal {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .workshop-evidence {
    animation: none;
  }
}
</style>

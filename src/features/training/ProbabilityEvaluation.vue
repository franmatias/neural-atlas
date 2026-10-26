<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  probabilityMetrics,
  bestCostThreshold,
  decisionCost,
} from '@/domain/training/probability-metrics';
import { classificationMetrics } from '@/domain/training/metrics';
import { formatData } from '@/shared/utils/data-format';
import { appVersion } from '@/shared/version';
import { parseDecimal } from '@/shared/utils/decimal';
import ProbabilityChart from './ProbabilityChart.vue';
const props = defineProps<{
  actual: number[];
  predictions: number[][];
  classOrder: string[];
  positive: number;
  threshold: number;
  split: 'train' | 'validation' | 'test';
  update: number;
  currentUpdate: number;
  frozen: boolean;
  busy: boolean;
  consulted: boolean;
  source: { dataHash: string; splitHash: string; pipelineHash: string; configHash: string };
}>();
const emit = defineEmits<{ threshold: [value: number] }>();
const bins = ref(10),
  focusClass = ref(props.positive),
  cursor = ref(0),
  costError = ref(''),
  exportError = ref('');
const costs = ref<number[][]>([]),
  reflection = ref('');
function resetCosts() {
  costs.value = props.classOrder.map((_, i) => props.classOrder.map((_, j) => Number(i !== j)));
}
watch(
  () => props.classOrder.join('\u0000'),
  () => {
    resetCosts();
    focusClass.value = Math.min(props.positive, props.classOrder.length - 1);
    reflection.value = '';
  },
  { immediate: true },
);
const binary = computed(() => props.predictions[0]?.length === 1);
watch(
  () => props.positive,
  (value) => {
    if (binary.value) focusClass.value = value;
  },
);
const metrics = computed(() =>
  probabilityMetrics(props.actual, props.predictions, props.classOrder.length, bins.value),
);
const selectedClass = computed(() => (binary.value ? props.positive : focusClass.value));
const selected = computed(() => metrics.value.perClass[selectedClass.value]!);
watch(selected, () => {
  cursor.value = 0;
});
const inspected = computed(() => selected.value.points[cursor.value] ?? selected.value.points[0]!);
const roc = computed(() =>
  selected.value.points
    .filter((p) => p.fpr !== null && p.tpr !== null)
    .map((p) => ({ x: p.fpr!, y: p.tpr! })),
);
const pr = computed(() =>
  selected.value.points
    .filter((p) => p.recall !== null)
    .map((p) => ({ x: p.recall!, y: p.precision })),
);
const reliability = computed(() =>
  selected.value.bins
    .filter((b) => b.count)
    .map((b) => ({ x: b.mean!, y: b.frequency!, count: b.count })),
);
const matrix = computed(
  () =>
    classificationMetrics(
      props.actual,
      props.predictions,
      props.classOrder.length,
      props.threshold,
      props.positive,
    ).matrix,
);
const eligible = computed(
  () =>
    binary.value &&
    props.split === 'validation' &&
    !props.frozen &&
    !props.busy &&
    props.update === props.currentUpdate &&
    !props.consulted,
);
const cost = computed(() => {
  try {
    return {
      mean: decisionCost(matrix.value, costs.value),
      best: eligible.value
        ? bestCostThreshold(props.actual, props.predictions, props.positive, costs.value)
        : null,
    };
  } catch {
    return null;
  }
});
const canSelect = computed(() => eligible.value && !!cost.value?.best);
function apply() {
  if (!canSelect.value || !cost.value?.best) return;
  emit('threshold', cost.value.best.threshold);
}
function editCost(i: number, j: number, event: Event) {
  const field = event.target as HTMLInputElement,
    parsed = parseDecimal(field.value, 0, 1e6);
  if (!parsed.ok) {
    costError.value = 'Introduce un coste entre 0 y 1.000.000. Se conserva el valor anterior.';
    field.value = String(costs.value[i]![j]);
    return;
  }
  costs.value[i]![j] = parsed.value;
  field.value = String(parsed.value);
  costError.value = '';
}
function download() {
  exportError.value = '';
  try {
    const report = {
      format: 'neural-atlas.probability-evaluation-report',
      schemaVersion: 1,
      appVersion,
      source: props.source,
      split: props.split,
      update: props.update,
      currentUpdate: props.currentUpdate,
      testPreviouslyConsulted: props.consulted,
      classOrder: props.classOrder,
      positive: props.positive,
      inspectedClass: selectedClass.value,
      threshold: props.threshold,
      bins: bins.value,
      metrics: metrics.value,
      costs: costs.value,
      meanCost: cost.value?.mean ?? null,
      validationCandidate: canSelect.value ? cost.value?.best : null,
      actual: props.actual,
      predictions: props.predictions,
      reflection: reflection.value,
      notes:
        'Informe descriptivo, no modelo importable. threshold=null en ranking significa no predecir positivos. Costes en memoria; exportar para conservarlos. Brier no mide solo calibración.',
    };
    const url = globalThis.URL.createObjectURL(
      new globalThis.Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'neural-atlas-probability-evaluation.report.json';
    a.click();
    setTimeout(() => globalThis.URL.revokeObjectURL(url), 1000);
  } catch {
    exportError.value = 'No se pudo exportar el informe. Los resultados siguen disponibles.';
  }
}
const f = (v: number | null) => (v === null ? 'No definida' : formatData(v));
</script>
<template>
  <section class="probability-evaluation training-panel" aria-labelledby="probability-heading">
    <p class="eyebrow">D8 · PROBABILIDAD, ORDEN Y DECISIÓN</p>
    <h2 id="probability-heading">¿Acertar significa saber cuánta confianza tener?</h2>
    <p>
      Estas gráficas usan las {{ actual.length }} muestras de
      {{ split === 'validation' ? 'validación' : split === 'train' ? 'entrenamiento' : 'test' }},
      actualización {{ update }}. Cambiar el umbral cambia decisiones; no modifica las
      probabilidades ni entrena el modelo.
    </p>
    <p v-if="update !== currentUpdate" class="training-alert" role="status">
      Instantánea anterior al modelo actual. Vuelve a evaluar antes de elegir un umbral.
    </p>
    <div class="training-metrics">
      <article>
        <span>Brier {{ binary ? 'binario · [0, 1]' : 'multiclase · [0, 2]' }}</span
        ><strong data-testid="probability-brier">{{ f(metrics.brier) }}</strong>
      </article>
      <article>
        <span>ROC-AUC · clase frente al resto</span
        ><strong data-testid="probability-auc">{{ f(selected.auc) }}</strong>
      </article>
      <article>
        <span>Average precision · AP</span
        ><strong data-testid="probability-ap">{{ f(selected.ap) }}</strong>
      </article>
      <article>
        <span>Prevalencia positiva</span
        ><strong
          >{{ f(selected.prevalence) }} · {{ selected.positives }}/{{ actual.length }}</strong
        >
      </article>
    </div>
    <p>
      Brier es el error cuadrático de las probabilidades: menor es mejor.
      {{
        binary
          ? 'Se usa p(clase positiva), no la suma de ambas salidas.'
          : 'Se suman los errores de todas las clases por muestra, sin dividir entre K.'
      }}
      No separa por sí solo calibración y capacidad de distinguir clases. Accuracy alta y Softmax no
      garantizan calibración.
    </p>
    <div class="probability-controls">
      <label v-if="!binary"
        >Clase frente al resto
        <select v-model.number="focusClass" aria-label="Clase para curvas one-vs-rest">
          <option v-for="(label, i) in classOrder" :key="i" :value="i">{{ label }}</option>
        </select></label
      >
      <p v-else>
        Clase positiva: <strong>{{ classOrder[positive] }}</strong
        >. El selector de decisión operativa controla también estas curvas.
      </p>
      <label
        >Intervalos de fiabilidad: {{ bins }}
        <input
          v-model.number="bins"
          aria-label="Intervalos de fiabilidad"
          type="range"
          min="5"
          max="20"
          step="1"
      /></label>
    </div>
    <div class="probability-charts">
      <ProbabilityChart
        title="Fiabilidad: confianza frente a frecuencia"
        x-label="Probabilidad media"
        y-label="Frecuencia positiva"
        :points="reliability"
        scatter
        diagonal
      />
      <ProbabilityChart
        title="ROC: sensibilidad frente a falsas alarmas"
        x-label="FPR"
        y-label="TPR / Recall"
        :points="roc"
        diagonal
        :selected="cursor"
      />
      <ProbabilityChart
        title="Precision-recall: efecto del desbalance"
        x-label="Recall"
        y-label="Precision"
        :points="pr"
        step
        :baseline="selected.prevalence"
        :selected="cursor"
      />
    </div>
    <p>
      La diagonal de fiabilidad representa coincidencia ideal. El tamaño del punto indica soporte;
      los intervalos vacíos no se dibujan. Pocas muestras no demuestran calibración. En ROC, la
      diagonal es la referencia de orden aleatorio; en PR, la línea horizontal marca prevalencia.
      Los empates se procesan juntos; AP suma incrementos de recall por precision, sin trapecios.
    </p>
    <p v-if="selected.auc === null || selected.ap === null" role="status">
      Sin positivos, ROC-AUC y AP no están definidas. Sin negativos, ROC-AUC no está definida; AP
      puede valer 1 sin demostrar discriminación entre clases.
    </p>
    <details>
      <summary>Datos de fiabilidad y resultados por clase</summary>
      <div class="training-table-wrap">
        <table>
          <caption>
            Intervalos de fiabilidad de
            {{
              classOrder[selectedClass]
            }}; límite derecho exclusivo salvo el último
          </caption>
          <thead>
            <tr>
              <th>Intervalo</th>
              <th>n</th>
              <th>Probabilidad media</th>
              <th>Frecuencia positiva</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(b, i) in selected.bins" :key="i">
              <th>[{{ f(b.lower) }}, {{ f(b.upper) }}{{ i === bins - 1 ? ']' : ')' }}</th>
              <td>{{ b.count }}</td>
              <td>{{ f(b.mean) }}</td>
              <td>{{ f(b.frequency) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="training-table-wrap">
        <table>
          <caption>
            Ranking one-vs-rest por clase
          </caption>
          <thead>
            <tr>
              <th>Clase</th>
              <th>Positivos</th>
              <th>Negativos</th>
              <th>ROC-AUC</th>
              <th>AP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in metrics.perClass" :key="i">
              <th>{{ classOrder[i] }}</th>
              <td>{{ row.positives }}</td>
              <td>{{ row.negatives }}</td>
              <td>{{ f(row.auc) }}</td>
              <td>{{ f(row.ap) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Media macro ROC-AUC {{ f(metrics.macroAuc.value) }} · {{ metrics.macroAuc.defined }} clases
        definidas, {{ metrics.macroAuc.excluded }} excluidas. Media macro AP
        {{ f(metrics.macroAp.value) }} · {{ metrics.macroAp.defined }} definidas,
        {{ metrics.macroAp.excluded }} excluidas. No es una métrica micro ni ponderada.
      </p>
    </details>
    <label class="threshold-inspector"
      >Recorrer umbrales de ranking
      <input
        v-model.number="cursor"
        aria-label="Recorrer umbrales de ranking"
        type="range"
        min="0"
        :max="selected.points.length - 1"
        step="1"
    /></label>
    <p class="ranking-inspector" aria-live="polite">
      Umbral:
      {{
        inspected.threshold === null
          ? 'por encima del máximo (nadie positivo)'
          : f(inspected.threshold)
      }}
      · TP {{ inspected.tp }} · FP {{ inspected.fp }} · TN {{ inspected.tn }} · FN
      {{ inspected.fn }} · TPR {{ f(inspected.tpr) }} · FPR {{ f(inspected.fpr) }} · Precision
      {{ f(inspected.precision) }} · Recall {{ f(inspected.recall) }}. El primer punto usa Precision
      = 1 por convención, sin predichos positivos. Este recorrido no cambia el umbral operativo.
    </p>
    <h3>¿Cuánto cuesta equivocarse?</h3>
    <p>
      Coste medio = suma de coste(real, predicha) × recuento / n. Valores ilustrativos, sin unidad
      monetaria implícita. Cambia un supuesto y contrasta qué errores estás priorizando. La matriz
      inicial asigna 0 al acierto y 1 al error; los costes se conservan en esta vista y en el
      informe exportado.
    </p>
    <div class="training-table-wrap">
      <table>
        <caption>
          Matriz de costes: filas reales, columnas predichas
        </caption>
        <thead>
          <tr>
            <th>Real / predicha</th>
            <th v-for="label in classOrder" :key="label">{{ label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in costs" :key="i">
            <th>{{ classOrder[i] }}</th>
            <td v-for="(value, j) in row" :key="j">
              <input
                class="cost-input"
                type="text"
                inputmode="decimal"
                :value="value"
                :aria-label="`Coste real ${classOrder[i]}, predicha ${classOrder[j]}`"
                @change="editCost(i, j, $event)"
                @keydown.enter.prevent="editCost(i, j, $event)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="costError" role="alert">{{ costError }}</p>
    <p data-testid="decision-cost">
      Coste medio actual: <strong>{{ f(cost?.mean ?? null) }}</strong>
    </p>
    <template v-if="binary"
      ><p v-if="canSelect && cost?.best">
        Candidato de validación: umbral {{ f(cost.best.threshold) }}, coste {{ f(cost.best.cost) }}.
        Se comparan puntuaciones únicas y extremos 0/1; en empate se elige el umbral mayor. Si p =
        1, umbral 1 sigue prediciendo positivo.
      </p>
      <button class="button secondary" :disabled="!canSelect" @click="apply">
        Aplicar umbral de menor coste en validación
      </button>
      <p class="small muted">
        Solo se permite con validación actual, modelo pausado y test aún sin consultar. Test
        confirma el umbral fijado; nunca se busca el mejor umbral usando test ni entrenamiento. La
        selección en validación puede sobreajustar.
      </p></template
    >
    <p v-else>
      La clasificación multiclase mantiene argmax. El coste evalúa esa política; no transforma
      argmax en una decisión de mínimo coste ni aplica un umbral global a Softmax.
    </p>
    <label class="threshold-inspector"
      >Tu interpretación
      <textarea
        v-model="reflection"
        maxlength="4000"
        aria-label="Interpretación de probabilidades y costes"
        placeholder="¿Qué cambia en accuracy, calibración y coste? ¿Qué dato te falta para tomar una decisión?"
        rows="3"
      />
    </label>
    <button class="button secondary" @click="download">
      Exportar informe de probabilidades y costes
    </button>
    <p v-if="exportError" role="alert">{{ exportError }}</p>
  </section>
</template>
<style scoped>
.probability-evaluation {
  overflow-wrap: anywhere;
}
.probability-controls {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  align-items: center;
  margin: 24px 0;
}
.probability-controls label,
.threshold-inspector {
  display: grid;
  gap: 8px;
  margin: 20px 0;
}
.probability-charts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.cost-input {
  width: 110px;
  min-width: 80px;
}
.probability-evaluation select,
.probability-evaluation input[type='text'],
.probability-evaluation textarea {
  min-height: 44px;
  padding: 10px;
  border: 1px solid var(--muted);
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
}
textarea {
  width: 100%;
  resize: vertical;
}
details {
  margin: 24px 0;
}
@media (max-width: 1100px) {
  .probability-charts {
    grid-template-columns: 1fr;
  }
}
</style>

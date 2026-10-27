<script setup lang="ts">
import { ref, computed } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useGridStore } from '@/stores/grid-search';
import { useDatasetsStore } from '@/stores/datasets';
import { useTrainingStore } from '@/stores/training';
import {
  defaultGrid,
  exportGridReport,
  type GridOptions,
  type GridStatus,
} from '@/application/training/grid-search';
import { generateDataset } from '@/domain/data/generate';
import { defaultGenerator } from '@/domain/data/types';
import { splitDataset } from '@/domain/data/split';
import { exportDatasetJson } from '@/application/data/json-files';
import { downloadLearning } from '@/infrastructure/files/learning';
import GridPlots from './GridPlots.vue';
const study = useGridStore(),
  data = useDatasetsStore(),
  training = useTrainingStore();
const source = ref('preset'),
  recipe = ref<'moons' | 'flowers' | 'sine'>('moons'),
  widths = ref(defaultGrid.widths.join(', ')),
  rates = ref(defaultGrid.rates.join(', ')),
  epochs = ref(defaultGrid.epochs),
  repetitions = ref<1 | 3>(1),
  folds = ref<1 | 3>(1),
  firstSeed = ref(42),
  foldSeed = ref(42),
  reviewed = ref(false),
  error = ref('');
const labels: Record<GridStatus, string> = {
  pending: 'Pendiente',
  running: 'En ejecución',
  completed: 'Completo',
  failed: 'Fallido',
  cancelled: 'Cancelado',
  skipped: 'No intentado',
};
const canRun = computed(
  () =>
    study.plan &&
    reviewed.value &&
    !study.busy &&
    study.attempts.every((a) => a.status === 'pending'),
);
async function prepare() {
  error.value = '';
  reviewed.value = false;
  try {
    const dataset =
      source.value === 'workspace'
        ? data.dataset
        : generateDataset({ ...defaultGenerator, recipe: recipe.value, count: 120, seed: 42 });
    const split =
      source.value === 'workspace'
        ? data.split
        : splitDataset(dataset, {
            strategy: dataset.task === 'regression' ? 'random' : 'stratified',
            ratios: [0.6, 0.2, 0.2],
            seed: 42,
          });
    if (!split) throw Error('SPLIT');
    const parse = (text: string) => text.split(',').map((v) => (v.trim() === '' ? NaN : Number(v)));
    const pipeline =
      source.value === 'workspace' && data.prepared
        ? JSON.parse(JSON.stringify(data.prepared.pipeline.options))
        : {
            featureIds: dataset.features.map((f) => f.id),
            imputation: 'mean',
            scaling: 'standard',
            missingIndicators: false,
          };
    const options: GridOptions = {
      datasetJson: exportDatasetJson(dataset, split),
      pipeline,
      widths: parse(widths.value),
      rates: parse(rates.value),
      epochs: epochs.value,
      repetitions: repetitions.value,
      folds: folds.value,
      firstSeed: firstSeed.value,
      foldSeed: foldSeed.value,
      testPreviouslyConsulted: source.value === 'workspace' && training.consulted,
    };
    await study.prepare(options);
  } catch {
    error.value =
      'No se preparó el plan. Divide los datos y revisa los campos. Se conserva la evidencia anterior.';
  }
}
function report() {
  if (study.plan)
    downloadLearning(
      JSON.parse(exportGridReport(study.plan, study.attempts)) as unknown,
      'neural-atlas-grid.report.json',
    );
}
function model(id: number) {
  const measurement = study.attempts.find(
    (a) => a.id === id && a.status === 'completed',
  )?.measurement;
  if (measurement)
    downloadLearning(
      JSON.parse(measurement.model) as unknown,
      `neural-atlas-grid-trial-${id + 1}.model.json`,
    );
}
onBeforeRouteLeave(() => {
  if (study.busy) study.cancel();
});
</script>
<template>
  <div class="page learning-page grid-search-page">
    <p class="eyebrow">L12 / REJILLA · X1.2</p>
    <h1>¿Cuánto cuesta elegir la mejor configuración?</h1>
    <p class="page-intro">
      Cruza anchuras y tasas de aprendizaje, declara semillas y particiones, y observa cómo la
      selección se adapta a validación. El test permanece reservado.
    </p>
    <RouterLink to="/lab/experimentos">Comparación A/B y validación cruzada</RouterLink>
    <section class="panel">
      <h2>Define el espacio de búsqueda</h2>
      <fieldset :disabled="study.busy">
        <legend>Borrador del próximo plan</legend>
        <div class="grid-controls">
          <label
            >Origen de la rejilla<select v-model="source">
              <option value="preset">Ejemplo aislado</option>
              <option value="workspace">Copia del laboratorio</option>
            </select></label
          >
          <label v-if="source === 'preset'"
            >Ejemplo de rejilla<select v-model="recipe">
              <option value="moons">Dos lunas</option>
              <option value="flowers">Flores multiclase</option>
              <option value="sine">Regresión seno</option>
            </select></label
          >
          <label>Anchuras separadas por comas<input v-model="widths" type="text" /></label>
          <label>Tasas separadas por comas<input v-model="rates" type="text" /></label>
          <label
            >Épocas comunes de rejilla<input v-model.number="epochs" type="number" min="5" max="60"
          /></label>
          <label
            >Semillas por configuración<select v-model.number="repetitions">
              <option :value="1">1 semilla</option>
              <option :value="3">3 semillas</option>
            </select></label
          >
          <label
            >Particiones de validación<select v-model.number="folds">
              <option :value="1">Validación fija</option>
              <option :value="3">3 folds de desarrollo</option>
            </select></label
          >
          <label
            >Primera semilla de entrenamiento<input
              v-model.number="firstSeed"
              type="number"
              min="0"
              max="4294967295"
          /></label>
          <label
            >Semilla de los folds<input
              v-model.number="foldSeed"
              type="number"
              min="0"
              max="4294967295"
          /></label>
        </div>
      </fieldset>
      <p>
        Entre uno y tres valores únicos por eje: anchuras 2–16, tasas 0,0001–0,3 (usa punto
        decimal). Hasta 9 configuraciones y 27 ejecuciones contando folds × semillas. MLP tanh,
        Xavier, Adam, lote 16. El ejemplo tiene 120 filas y semilla de datos 42.
      </p>
      <p>
        Máximo 600 filas, 8 características y 16 columnas transformadas. Se reutiliza el pipeline
        elegido del laboratorio, si existe; en otro caso, media y escalado estándar. Se reajusta
        solo con train de cada fold. Las divisiones temporales, selecciones parciales o folds de
        origen requieren otro protocolo y se rechazan.
      </p>
      <button class="button primary" :disabled="study.busy" @click="prepare">
        Preparar plan y presupuesto
      </button>
      <button v-if="study.busy" class="button secondary" @click="study.cancel">
        Cancelar rejilla
      </button>
      <p role="alert">{{ error || study.error }}</p>
      <p role="status">{{ study.notice }}</p>
    </section>
    <template v-if="study.plan && study.summary"
      ><section class="panel">
        <h2>Plan confirmado</h2>
        <p>
          {{ study.plan.configurations.length }} configuraciones ×
          {{ study.plan.settings.folds }} particiones ×
          {{ study.plan.settings.repetitions }} semillas =
          {{ study.plan.trials.length }} ejecuciones. {{ study.plan.settings.epochs }} épocas por
          ejecución.
        </p>
        <p>
          {{ study.plan.budget.operations.toLocaleString('es') }} operaciones superiores estimadas ·
          {{ study.plan.budget.numericBytes.toLocaleString('es') }} bytes numéricos sumados ·
          {{ study.plan.budget.updates }} actualizaciones previstas. No son segundos ni memoria
          total de JavaScript. Límites: 200 millones de operaciones y 32 MiB numéricos.
        </p>
        <p>
          La estimación corresponde al entrenamiento numérico. Preparar pipelines, validar archivos
          y representar resultados añade trabajo que no se incluye en ese contador.
        </p>
        <p>
          Este plan es una instantánea: cambiar el borrador no lo cambia. Prepara de nuevo para
          aplicar cambios. No sustituye la sesión activa. Cada configuración usa las mismas
          particiones y semillas; los folds redistribuyen solo train+validación.
        </p>
        <p v-if="study.plan.provenance.testPreviouslyConsulted">
          El test ya había sido consultado en el origen. Esta búsqueda no restaura una evaluación
          final independiente.
        </p>
        <label class="review-option"
          ><input v-model="reviewed" type="checkbox" :disabled="study.busy" />He revisado el
          presupuesto y usaré validación para seleccionar.</label
        >
        <button class="button primary" :disabled="!canRun" @click="study.run">
          Ejecutar plan confirmado
        </button>
        <p
          role="progressbar"
          aria-label="Ejecuciones resueltas"
          :aria-valuenow="
            study.attempts.filter((a) => ['completed', 'failed'].includes(a.status)).length
          "
          :aria-valuemax="study.plan.trials.length"
          aria-valuemin="0"
        >
          {{ study.attempts.filter((a) => ['completed', 'failed'].includes(a.status)).length }} /
          {{ study.plan.trials.length }} ejecuciones resueltas.
        </p>
      </section>
      <section class="panel">
        <h2>Selección sobre validación</h2>
        <p>
          {{ study.summary.complete ? 'Búsqueda finalizada.' : 'Plan parcial o aún sin ejecutar.' }}
          Test no evaluado. Pérdida:
          {{
            study.plan.task === 'regression'
              ? 'MSE en unidades²'
              : study.plan.task === 'binary'
                ? 'entropía cruzada binaria'
                : 'entropía cruzada categórica'
          }}. Menor es mejor.
        </p>
        <p>
          Solo son elegibles las configuraciones con todas sus ejecuciones completas. La pérdida
          pondera el soporte de los folds y promedia semillas. La desviación es descriptiva entre
          ejecuciones; no es un intervalo de confianza.
        </p>
        <p v-if="study.summary.ranking.length">
          Mejor entre configuraciones completas: #{{ study.summary.ranking[0]! + 1
          }}{{ study.summary.complete ? '' : ' · selección provisional' }}. Elegir entre muchos
          intentos puede sobreajustar validación. No se evalúa ni se reentrena automáticamente el
          ganador.
        </p>
        <GridPlots :plan="study.plan" :summary="study.summary" />
        <div
          class="table-scroll"
          tabindex="0"
          role="region"
          aria-label="Clasificación de configuraciones"
        >
          <table>
            <caption>
              Elegibles ordenadas por pérdida; incompletas al final
            </caption>
            <thead>
              <tr>
                <th>Configuración</th>
                <th>Anchura</th>
                <th>Tasa</th>
                <th>Completas</th>
                <th>Pérdida ponderada</th>
                <th>Desviación</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="c in [...study.summary.configurations].sort(
                  (a, b) =>
                    Number(b.eligible) - Number(a.eligible) ||
                    (a.eligible && b.eligible ? a.loss! - b.loss! : a.id - b.id),
                )"
                :key="c.id"
              >
                <th scope="row">#{{ c.id + 1 }} · {{ c.eligible ? 'Elegible' : 'Incompleta' }}</th>
                <td>{{ c.width }}</td>
                <td>{{ c.rate }}</td>
                <td>{{ c.completed }} / {{ c.expected }}</td>
                <td>
                  {{ c.loss?.toFixed(5) ?? 'Sin medición'
                  }}{{ !c.eligible && c.loss !== null ? ' · parcial' : '' }}
                </td>
                <td>{{ c.deviation?.toFixed(5) ?? 'No definida' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <button class="button secondary" @click="report">Exportar informe de rejilla</button>
      </section>
      <section class="panel">
        <h2>Registro de todos los intentos</h2>
        <p>
          Los modelos exportados corresponden a un fold y una semilla concretos. No se promedian
          pesos ni se aplica el modelo al laboratorio activo.
        </p>
        <div class="table-scroll" tabindex="0" role="region" aria-label="Intentos de la rejilla">
          <table>
            <caption>
              Orden declarado: configuración, fold y semilla
            </caption>
            <thead>
              <tr>
                <th>Intento</th>
                <th>Configuración / fold / semilla</th>
                <th>Train / val</th>
                <th>Estado</th>
                <th>Pérdida val</th>
                <th>Modelo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in study.attempts" :key="a.id">
                <th scope="row">{{ a.id + 1 }}</th>
                <td>
                  #{{ study.plan.trials[a.id]!.configuration + 1 }} /
                  {{ study.plan.trials[a.id]!.fold + 1 }} / {{ study.plan.trials[a.id]!.seed }}
                </td>
                <td>
                  {{ study.plan.trials[a.id]!.trainIds.length }} /
                  {{ study.plan.trials[a.id]!.validationIds.length }}
                </td>
                <td>{{ labels[a.status] }}{{ a.error ? ' · ' + a.error : '' }}</td>
                <td>{{ a.measurement?.validationLoss.toFixed(5) ?? 'Sin medición' }}</td>
                <td>
                  <button
                    class="button secondary"
                    :disabled="a.status !== 'completed'"
                    :aria-label="'Exportar modelo del intento ' + (a.id + 1)"
                    @click="model(a.id)"
                  >
                    Exportar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section></template
    >
  </div>
</template>
<style scoped>
.grid-controls {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}
.table-scroll {
  overflow: auto;
}
table {
  min-width: 650px;
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  padding: 0.5rem;
  text-align: left;
  border-bottom: 1px solid var(--line);
}
@media (max-width: 850px) {
  .grid-controls {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 540px) {
  .grid-controls {
    grid-template-columns: 1fr;
  }
}
</style>

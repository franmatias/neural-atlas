<script setup lang="ts">
import { ref, computed, watch, onScopeDispose } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { usePermutationStore } from '@/stores/permutation';
import { useTrainingStore } from '@/stores/training';
import { usePreferencesStore } from '@/stores/preferences';
import { exportExperiment } from '@/application/training/experiment';
import { exportPermutationReport } from '@/application/training/permutation';
import { downloadLearning } from '@/infrastructure/files/learning';
const study = usePermutationStore(),
  training = useTrainingStore(),
  prefs = usePreferencesStore();
const source = ref('synthetic'),
  feature = ref(0),
  repeat = ref(0),
  step = ref(0),
  playing = ref(false),
  error = ref('');
let timer: ReturnType<typeof setTimeout> | undefined;
const selected = computed(() => study.result?.results[feature.value]),
  trial = computed(() => selected.value?.trials[repeat.value]);
const extent = computed(() =>
  Math.max(0.001, ...(study.result?.results.map((r) => Math.abs(r.mean) + r.deviation) ?? [])),
);
function stop() {
  playing.value = false;
  clearTimeout(timer);
}
function tick() {
  if (!playing.value || prefs.reducedMotion) return;
  if (step.value >= Math.min(12, study.result?.rows.length ?? 0) - 1) {
    stop();
    return;
  }
  timer = setTimeout(() => {
    step.value++;
    tick();
  }, 700 / prefs.value.speed);
}
function play() {
  stop();
  if (prefs.reducedMotion) return;
  step.value = 0;
  playing.value = true;
  tick();
}
watch([() => study.result, feature, repeat], () => {
  stop();
  step.value = 0;
});
watch(
  () => study.result,
  () => {
    feature.value = 0;
    repeat.value = 0;
  },
);
watch(
  () => prefs.reducedMotion,
  () => {
    if (prefs.reducedMotion) stop();
  },
);
async function run() {
  stop();
  error.value = '';
  try {
    await study.run({
      ...study.options,
      ...(source.value === 'checkpoint'
        ? { experimentJson: exportExperiment(training.capture()) }
        : {}),
    });
  } catch {
    error.value = 'Detén e inicializa el modelo del laboratorio antes de copiar su checkpoint.';
  }
}
function report() {
  if (study.result)
    downloadLearning(
      JSON.parse(exportPermutationReport(study.result)) as unknown,
      'neural-atlas-permutation.report.json',
    );
}
function model() {
  if (study.result)
    downloadLearning(
      JSON.parse(study.result.model) as unknown,
      'neural-atlas-permutation.model.json',
    );
}
onBeforeRouteLeave(() => {
  stop();
  if (study.busy) study.cancel();
});
onScopeDispose(stop);
</script>
<template>
  <div class="page learning-page permutation-page">
    <p class="eyebrow">L12 / IMPORTANCIA · X1.3</p>
    <h1>¿Qué cambia al desordenar una característica?</h1>
    <p class="page-intro">
      Congela una red y su preprocesado. Baraja una columna cruda de validación y mide cuánto cambia
      su pérdida.
    </p>
    <RouterLink to="/lab/experimentos">Volver a experimentos</RouterLink>
    <section class="panel">
      <h2>Prepara el análisis</h2>
      <fieldset :disabled="study.busy">
        <legend>Fuente y repeticiones</legend>
        <div class="permutation-controls">
          <label
            >Fuente del análisis<select v-model="source">
              <option value="synthetic">Ejemplo sintético independiente</option>
              <option value="checkpoint">Checkpoint detenido del laboratorio</option>
            </select></label
          >
          <label v-if="source === 'synthetic'"
            >Ejemplo de importancia<select v-model="study.options.recipe">
              <option value="sine">Seno · regresión</option>
              <option value="moons">Dos lunas</option>
              <option value="flowers">Flores sintéticas multiclase</option>
              <option value="correlated">Variables correlacionadas y ruido</option>
            </select></label
          >
          <label
            >Semilla de permutación<input
              v-model.number="study.options.seed"
              type="number"
              min="0"
              max="4294967295"
          /></label>
          <label
            >Repeticiones por característica<input
              v-model.number="study.options.repetitions"
              type="number"
              min="2"
              max="10"
          /></label>
          <label v-if="source === 'synthetic'"
            >Épocas de la red independiente<input
              v-model.number="study.options.epochs"
              type="number"
              min="5"
              max="60"
          /></label>
        </div>
      </fieldset>
      <p>
        El ejemplo entrena una sola red 8/tanh/Adam con 160 filas y semilla 42; después la congela.
        Un checkpoint usa exactamente la red y división guardadas, sin continuar el entrenamiento.
        La sesión activa se conserva.
      </p>
      <p>
        Hasta 600 filas, 8 características, 16 columnas transformadas y 5000 parámetros. Se analiza
        solo validación (mínimo dos filas), con un presupuesto de 20 millones de productos
        parámetro×muestra. No estima segundos ni memoria total.
      </p>
      <button class="button primary" :disabled="study.busy" @click="run">
        Calcular importancia</button
      ><button v-if="study.busy" class="button secondary" @click="study.cancel">
        Cancelar análisis
      </button>
      <p role="alert">{{ error || study.error }}</p>
      <p role="status">{{ study.notice }}</p>
    </section>
    <template v-if="study.result"
      ><section class="panel">
        <h2>Dependencia predictiva, no causalidad</h2>
        <p>
          Fuente registrada:
          {{ study.result.source === 'checkpoint' ? 'checkpoint detenido' : study.result.recipe }}.
          {{ study.result.validationIds.length }} filas de validación ·
          {{ study.result.settings.repetitions }} repeticiones · semilla
          {{ study.result.settings.seed }} · test no evaluado.
        </p>
        <p v-if="study.result.provenance.testPreviouslyConsulted">
          El test ya había sido consultado en el origen; este análisis no restaura una evaluación
          independiente.
        </p>
        <p>
          Pérdida original {{ study.result.metric }}: {{ study.result.baseline.loss.toFixed(6) }}.
          Importancia = pérdida permutada − original. Positiva: empeora; negativa: mejora en esta
          muestra. La desviación muestral describe las repeticiones, no un intervalo de confianza.
        </p>
        <p>
          Una red que predice mal puede dar importancias poco útiles. Las variables correlacionadas
          pueden ocultar o repartir importancia; barajarlas puede crear entradas poco realistas. No
          se eliminan variables ni se ajusta el modelo automáticamente.
        </p>
        <svg
          :viewBox="'0 0 620 ' + (80 + study.result.results.length * 55)"
          role="img"
          aria-label="Importancia media por característica con desviación"
        >
          <title>
            Eje cero central; barras de media y segmentos de desviación muestral. Valores completos
            en la tabla.
          </title>
          <line
            x1="380"
            y1="20"
            x2="380"
            :y2="35 + study.result.results.length * 55"
            stroke="var(--ink)"
          />
          <g v-for="(r, i) in study.result.results" :key="r.id">
            <text x="10" :y="48 + i * 55" fill="var(--ink)">{{ r.name }}</text>
            <rect
              :x="Math.min(380, 380 + (170 * r.mean) / extent)"
              :y="32 + i * 55"
              :width="Math.max(1, (170 * Math.abs(r.mean)) / extent)"
              height="22"
              fill="var(--accent)"
            />
            <line
              :x1="380 + (170 * (r.mean - r.deviation)) / extent"
              :x2="380 + (170 * (r.mean + r.deviation)) / extent"
              :y1="43 + i * 55"
              :y2="43 + i * 55"
              stroke="var(--ink)"
              stroke-width="3"
            />
          </g>
          <text x="210" :y="65 + study.result.results.length * 55" fill="var(--ink)">
            {{ (-extent).toFixed(3) }}
          </text>
          <text x="380" :y="65 + study.result.results.length * 55" fill="var(--ink)">0</text>
          <text x="550" :y="65 + study.result.results.length * 55" fill="var(--ink)">
            {{ extent.toFixed(3) }}
          </text>
        </svg>
        <div class="table-scroll" tabindex="0" role="region" aria-label="Resultados de importancia">
          <table>
            <caption>
              Se conservan el signo y todas las repeticiones
            </caption>
            <thead>
              <tr>
                <th>Característica</th>
                <th>Media del cambio</th>
                <th>Desviación</th>
                <th>Cambios por repetición</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in study.result.results" :key="r.id">
                <th scope="row">{{ r.name }}</th>
                <td>{{ r.mean.toFixed(6) }}</td>
                <td>{{ r.deviation.toFixed(6) }}</td>
                <td>{{ r.trials.map((t) => t.delta.toFixed(5)).join(' · ') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <button class="button secondary" @click="report">Exportar informe de importancia</button
        ><button class="button secondary" @click="model">Exportar red congelada</button>
      </section>
      <section class="panel">
        <h2>Sigue una permutación real</h2>
        <div class="permutation-controls">
          <label
            >Característica inspeccionada<select v-model.number="feature">
              <option v-for="(r, i) in study.result.results" :key="r.id" :value="i">
                {{ r.name }}
              </option>
            </select></label
          ><label
            >Repetición inspeccionada<select v-model.number="repeat">
              <option v-for="t in selected?.trials" :key="t.repeat" :value="t.repeat">
                {{ t.repeat + 1 }}
              </option>
            </select></label
          >
        </div>
        <p>
          Solo se mueve la columna cruda elegida. Objetivos y otras entradas permanecen.
          Indicadores, categorías y derivadas se recalculan sin volver a ajustar estadísticas. La
          misma permutación de índices se usa entre características para cada repetición; puede
          dejar puntos fijos.
        </p>
        <button
          class="button secondary"
          :disabled="step === 0"
          @click="
            stop();
            step--;
          "
        >
          Paso anterior</button
        ><button
          class="button secondary"
          :disabled="step >= Math.min(12, study.result.rows.length) - 1"
          @click="
            stop();
            step++;
          "
        >
          Paso siguiente</button
        ><button
          class="button secondary"
          :disabled="prefs.reducedMotion"
          @click="playing ? stop() : play()"
        >
          {{ playing ? 'Pausar recorrido' : 'Reproducir recorrido' }}
        </button>
        <p>
          Paso {{ step + 1 }} / {{ Math.min(12, study.result.rows.length) }}. Inspector de las
          primeras 12 filas; las métricas usan toda validación.
        </p>
        <div
          v-if="trial && selected"
          class="table-scroll"
          tabindex="0"
          role="region"
          aria-label="Movimiento de valores crudos"
        >
          <table>
            <caption>
              Origen, destino y pérdida de cada muestra
            </caption>
            <thead>
              <tr>
                <th>Destino</th>
                <th>Valor original</th>
                <th>Origen del valor</th>
                <th>Valor permutado</th>
                <th>Objetivo</th>
                <th>Pérdida original → permutada</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, i) in study.result.rows.slice(0, 12)"
                :key="row.id"
                :class="{ selected: i === step }"
              >
                <th scope="row">{{ row.id }}{{ i === step ? ' · paso actual' : '' }}</th>
                <td>{{ row.features[selected.id] ?? 'nulo' }}</td>
                <td>{{ study.result.rows[trial.order[i]!]!.id }}</td>
                <td>{{ study.result.rows[trial.order[i]!]!.features[selected.id] ?? 'nulo' }}</td>
                <td>{{ row.target }}</td>
                <td>
                  {{ study.result.baseline.losses[i]?.toFixed(5) }} →
                  {{ trial.losses[i]?.toFixed(5) }}
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
.permutation-controls {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}
svg {
  width: 100%;
  max-width: 850px;
  height: auto;
}
text {
  font-size: 16px;
}
.table-scroll {
  overflow: auto;
}
table {
  min-width: 600px;
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  padding: 0.5rem;
  text-align: left;
  border-bottom: 1px solid var(--line);
}
.selected {
  background: var(--wash);
}
@media (max-width: 900px) {
  .permutation-controls {
    grid-template-columns: 1fr;
  }
}
</style>

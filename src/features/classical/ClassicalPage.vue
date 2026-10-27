<script setup lang="ts">
import { computed, ref, watch, onScopeDispose } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useClassicalStore } from '@/stores/classical';
import { useTrainingStore } from '@/stores/training';
import { useDatasetsStore } from '@/stores/datasets';
import { usePreferencesStore } from '@/stores/preferences';
import { exportDatasetJson } from '@/application/data/json-files';
import { downloadLearning, readLearning } from '@/infrastructure/files/learning';
import type { Cell } from '@/domain/data/types';
import ClassicalMap from './ClassicalMap.vue';
import TreeInspector from './TreeInspector.vue';
import FeatureForm from './FeatureForm.vue';
const study = useClassicalStore(),
  data = useDatasetsStore(),
  training = useTrainingStore(),
  prefs = usePreferencesStore(),
  source = ref('preset'),
  features = ref<Record<string, Cell>>({}),
  fileFeatures = ref<Record<string, Cell>>({}),
  disclose = ref(false),
  fileError = ref(''),
  reading = ref(false),
  trace = ref<'knn' | 'cart'>('knn'),
  step = ref(0),
  playing = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined,
  readRevision = 0;
const busy = computed(() => reading.value || study.busy),
  knn = computed(() => study.probe?.knn ?? study.result?.probe.knn),
  cart = computed(() => study.probe?.cart ?? study.result?.probe.cart),
  length = computed(() =>
    trace.value === 'knn' ? (knn.value?.neighbors.length ?? 0) : (cart.value?.path.length ?? 0),
  );
function stop() {
  playing.value = false;
  clearTimeout(timer);
}
function tick() {
  if (!playing.value || prefs.reducedMotion) return;
  if (step.value >= length.value - 1) {
    stop();
    return;
  }
  timer = setTimeout(() => {
    step.value++;
    tick();
  }, 700 / prefs.value.speed);
}
function play() {
  if (prefs.reducedMotion || !length.value) return;
  stop();
  step.value = 0;
  playing.value = true;
  tick();
}
watch([() => study.result, () => study.probe, trace], () => {
  stop();
  step.value = 0;
});
watch(
  () => prefs.reducedMotion,
  () => {
    if (prefs.reducedMotion) stop();
  },
);
watch(
  () => study.result,
  (r) => {
    if (r) {
      features.value = { ...r.probe.features };
      disclose.value = false;
    }
  },
);
watch(
  () => study.importedText,
  () => {
    if (study.imported) fileFeatures.value = { ...study.imported.firstFeatures };
  },
);
async function run() {
  stop();
  if (source.value === 'workspace') {
    if (!data.split) {
      fileError.value = 'Divide los datos del laboratorio antes de compararlos.';
      return;
    }
    study.options = {
      ...study.options,
      datasetJson: exportDatasetJson(data.dataset, data.split),
      ...(data.prepared
        ? { pipeline: globalThis.structuredClone(data.prepared.pipeline.options) }
        : {}),
    };
  } else {
    const { datasetJson, pipeline, ...options } = study.options;
    void datasetJson;
    void pipeline;
    study.options = options;
  }
  fileError.value = '';
  study.options.testPreviouslyConsulted = source.value === 'workspace' && training.consulted;
  await study.run();
}
async function query(f = features.value) {
  stop();
  features.value = { ...f };
  await study.query(f);
}
async function file(event: Event) {
  const input = event.target as HTMLInputElement,
    f = input.files?.[0];
  if (!f || busy.value) return;
  const id = ++readRevision;
  reading.value = true;
  fileError.value = '';
  try {
    const text = await readLearning(f, 8);
    if (id === readRevision) await study.inspect(text);
  } catch {
    if (id === readRevision) fileError.value = 'Archivo ilegible o mayor de 8 MiB.';
  } finally {
    input.value = '';
    if (id === readRevision) reading.value = false;
  }
}
function cancel() {
  readRevision++;
  reading.value = false;
  stop();
  study.cancel();
}
function download(family: 'knn' | 'cart' | 'mlp') {
  if (!study.result || (family !== 'mlp' && !disclose.value)) return;
  downloadLearning(
    JSON.parse(study.result.artifacts[family]) as unknown,
    'neural-atlas-' + family + '.' + (family === 'mlp' ? 'model' : 'estimator') + '.json',
  );
}
function report() {
  if (!study.result) return;
  const {
    configuration,
    task,
    classes,
    provenance,
    operations,
    testEvaluated,
    testPreviouslyConsulted,
    trainIds,
    validationIds,
    runs,
  } = study.result;
  downloadLearning(
    {
      format: 'neural-atlas.classical-report',
      schemaVersion: 1,
      configuration,
      task,
      classes,
      provenance,
      operations,
      testEvaluated,
      testPreviouslyConsulted,
      trainIds,
      validationIds,
      runs,
    },
    'comparacion-clasica.json',
  );
}
const fmt = (v: number | null) => (v === null ? 'No definida' : v.toFixed(4));
onBeforeRouteLeave(cancel);
onScopeDispose(() => {
  stop();
  readRevision++;
});
</script>
<template>
  <div class="page learning-page classical-page">
    <p class="eyebrow">L12 / COMPARADORES · X1.1</p>
    <h1>¿Memorizar, dividir o aprender pesos?</h1>
    <p class="page-intro">
      Compara kNN, un árbol CART pequeño y un MLP con las mismas filas y el mismo preprocesado.
      Comprueba qué cambia al variar k, profundidad o escalado.
    </p>
    <RouterLink to="/lab/experimentos">Comparación A/B y validación cruzada</RouterLink>
    <section class="panel">
      <h2>Diseña la comparación</h2>
      <fieldset :disabled="busy">
        <legend>Datos y capacidad</legend>
        <div class="classical-controls">
          <label
            >Origen de datos<select v-model="source">
              <option value="preset">Ejemplo aislado</option>
              <option value="workspace">Copia de los datos y división del laboratorio</option>
            </select></label
          ><label v-if="source === 'preset'"
            >Ejemplo<select v-model="study.options.recipe">
              <option value="moons">Dos lunas</option>
              <option value="xor">XOR</option>
              <option value="circles">Círculos</option>
              <option value="flowers">Flores sintéticas multiclase</option>
              <option value="sine">Regresión seno</option>
            </select></label
          ><label
            >Semilla<input
              v-model.number="study.options.seed"
              type="number"
              min="0"
              max="4294967295" /></label
          ><label v-if="source === 'preset'"
            >Ruido<input
              v-model.number="study.options.noise"
              type="number"
              min="0"
              max=".4"
              step=".01" /></label
          ><label
            >Vecinos k<input
              v-model.number="study.options.k"
              type="number"
              min="1"
              max="15" /></label
          ><label
            >Profundidad máxima CART<input
              v-model.number="study.options.depth"
              type="number"
              min="1"
              max="4" /></label
          ><label
            >Neuronas ocultas MLP<input
              v-model.number="study.options.width"
              type="number"
              min="2"
              max="16" /></label
          ><label
            >Épocas MLP<input
              v-model.number="study.options.epochs"
              type="number"
              min="5"
              max="60" /></label
          ><label
            >Escalado<select v-model="study.options.scaling">
              <option value="none">Sin escalado</option>
              <option value="standard">Estándar</option>
              <option value="minmax">Min-Max</option>
              <option value="robust">Robusto</option>
            </select></label
          >
        </div>
      </fieldset>
      <p>
        Máximo 600 filas / 8 características / 16 columnas transformadas. Con datos del laboratorio
        se reutiliza su pipeline preparado, si existe; en otro caso se usa el escalado elegido. Todo
        se reajusta solo con train. La sesión activa se conserva.
      </p>
      <button class="button primary" :disabled="busy" @click="run">Comparar tres modelos</button
      ><button v-if="busy" class="button secondary" @click="cancel">Cancelar cálculo</button>
      <p role="alert">{{ fileError || study.error }}</p>
      <p role="status">{{ study.notice }}</p>
    </section>
    <template v-if="study.result"
      ><section class="panel">
        <h2>Resultados de validación</h2>
        <p v-if="study.result.testPreviouslyConsulted">
          Este test ya se había consultado en la sesión de origen. Esta comparación usa validación,
          pero no recupera una evaluación final independiente.
        </p>
        <p>
          {{ study.result.trainIds.length }} train ·
          {{ study.result.validationIds.length }} validación · test no evaluado.
          {{ study.result.operations.toLocaleString('es') }} operaciones orientativas
          presupuestadas; no son segundos ni una predicción de memoria real.
        </p>
        <p>
          Configuración registrada: k={{ study.result.configuration.k }} · profundidad
          {{ study.result.configuration.depth }} · anchura {{ study.result.configuration.width }} ·
          {{ study.result.configuration.epochs }} épocas ·
          {{ study.result.configuration.pipelineOptions.scaling }}. Cambiar el formulario no cambia
          este resultado hasta volver a calcular.
        </p>
        <div class="table-scroll" tabindex="0" role="region" aria-label="Métricas comparadas">
          <table>
            <caption>
              Mismos datos y pipeline; ajustes de distinta naturaleza
            </caption>
            <thead>
              <tr>
                <th>Modelo</th>
                <th>{{ study.result.task === 'regression' ? 'MSE · unidades²' : 'Exactitud' }}</th>
                <th>{{ study.result.task === 'regression' ? 'MAE · unidades' : 'F1 macro' }}</th>
                <th>Coste observado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in study.result.runs" :key="r.family">
                <th scope="row">
                  {{ r.family === 'mlp' ? 'MLP · Adam/tanh' : r.family.toUpperCase() }}
                </th>
                <td>
                  {{ fmt(r.metrics.kind === 'regression' ? r.metrics.mse : r.metrics.accuracy) }}
                </td>
                <td>
                  {{ fmt(r.metrics.kind === 'regression' ? r.metrics.mae : r.metrics.macroF1) }}
                </td>
                <td>{{ r.cost.label }}: {{ r.cost.value }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="study.result.task === 'regression'">
          R²:
          {{
            study.result.runs
              .map((r) => (r.metrics.kind === 'regression' ? fmt(r.metrics.r2) : ''))
              .join(' · ')
          }}. Puede ser negativo o no definido.
        </p>
        <p>
          kNN almacena ejemplos; CART busca reglas; solo MLP hace descenso del gradiente. Una
          frecuencia de votos/hoja o una salida softmax no garantiza calibración.
        </p>
        <button class="button secondary" @click="report">Exportar informe de métricas</button>
      </section>
      <section class="panel">
        <h2>Una frontera por familia</h2>
        <p>
          Los cortes fijan otras entradas a la fila train {{ study.result.trainIds[0] }}:
          {{ study.result.baseFeatures }}. Las coordenadas y los rangos proceden de train. No se
          dibujan filas sin coordenadas numéricas; sí se imputan para ajustar y evaluar.
        </p>
        <div class="classical-plots">
          <article v-for="(r, i) in study.result.runs" :key="r.family">
            <h3>{{ r.family.toUpperCase() }}</h3>
            <ClassicalMap
              :result="study.result"
              :family="i"
              :probe-features="study.probe?.features ?? study.result.probe.features"
              :neighbors="
                i === 0 && trace === 'knn'
                  ? (knn?.neighbors.slice(0, step + 1).map((n) => n.id) ?? [])
                  : []
              "
              @probe="query"
            />
          </article>
        </div>
        <p v-if="!study.result.axes.length">
          No hay ejes numéricos: usa la sonda y la tabla de predicciones.
        </p>
      </section>
      <section class="panel">
        <h2>Sigue una decisión</h2>
        <FeatureForm
          v-model="features"
          :features="study.result.inputFeatures"
          label="Sonda"
          :disabled="busy"
        /><button class="button primary" :disabled="busy" @click="query()">
          Predecir con los tres modelos
        </button>
        <p>
          kNN: {{ knn?.predicted }} · CART: {{ cart?.predicted }} · MLP:
          {{
            study.probe?.mlp.label ??
            study.probe?.mlp.output[0] ??
            study.result.probe.mlp.predicted
          }}. Clases en orden: {{ study.result.classes.join(' · ') || 'objetivo numérico' }}.
        </p>
        <p>
          La sonda inicial pertenece a validación; moverla no entrena ni modifica los modelos. Los
          empates de kNN/CART favorecen la primera clase; el MLP binario usa umbral 0,5 sobre la
          clase 1.
        </p>
        <label
          >Recorrido<select v-model="trace">
            <option value="knn">Vecinos más próximos</option>
            <option value="cart">Ruta del árbol</option>
          </select></label
        ><button
          class="button secondary"
          :disabled="prefs.reducedMotion || playing || !length"
          @click="play"
        >
          Reproducir recorrido</button
        ><button class="button secondary" :disabled="!playing" @click="stop">
          Pausar recorrido</button
        ><button
          class="button secondary"
          :disabled="step <= 0"
          @click="
            stop();
            step--;
          "
        >
          Paso anterior</button
        ><button
          class="button secondary"
          :disabled="step >= length - 1"
          @click="
            stop();
            step++;
          "
        >
          Paso siguiente
        </button>
        <p aria-live="polite">
          Paso {{ Math.min(step + 1, length) }} / {{ length }} · velocidad visual
          {{ prefs.value.speed }}×.
          {{ prefs.reducedMotion ? 'Movimiento reducido: avanza manualmente.' : '' }}
        </p>
        <div
          v-if="trace === 'knn'"
          class="table-scroll"
          tabindex="0"
          role="region"
          aria-label="Vecinos de la sonda"
        >
          <table>
            <caption>
              Vecinos ordenados por distancia y después por ID; voto uniforme
            </caption>
            <thead>
              <tr>
                <th>ID train</th>
                <th>Distancia transformada</th>
                <th>Etiqueta / valor</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(n, i) in knn?.neighbors" :key="n.id" :class="{ selected: i <= step }">
                <th scope="row">{{ n.id }}</th>
                <td>{{ n.distance.toFixed(6) }}</td>
                <td>
                  {{
                    study.result.task === 'regression' ? n.target : study.result.classes[n.target]
                  }}
                </td>
              </tr>
            </tbody>
          </table>
          <p>
            Salida: {{ knn?.values.map((v) => v.toFixed(5)).join(' · ') }} ·
            {{ knn?.distanceCount }} distancias evaluadas para esta sonda.
          </p>
        </div>
        <TreeInspector
          v-else
          :root="study.result.tree"
          :features="study.result.pipeline.outputLabels"
          :highlight="cart?.path.slice(0, step + 1).map((n) => n.id) ?? []"
        />
        <p>
          CART: minLeaf=5; hasta 32 umbrales por característica, búsqueda aproximada. Gini para
          clases, MSE para regresión. Una hoja muestra frecuencias o la media de sus filas.
        </p>
      </section>
      <section class="panel">
        <h2>Comprueba muestras y conserva modelos</h2>
        <div
          class="table-scroll"
          tabindex="0"
          role="region"
          aria-label="Predicciones de validación"
        >
          <table>
            <caption>
              Primeras 30 muestras de validación
            </caption>
            <thead>
              <tr>
                <th>ID</th>
                <th>Objetivo</th>
                <th>kNN</th>
                <th>CART</th>
                <th>MLP</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(p, i) in study.result.points
                  .filter((p) => p.partition === 'validation')
                  .slice(0, 30)"
                :key="p.id"
              >
                <th scope="row">{{ p.id }}</th>
                <td>{{ p.target }}</td>
                <td v-for="r in study.result.runs" :key="r.family">
                  {{
                    study.result.task === 'regression'
                      ? r.predictions[i]?.toFixed(4)
                      : study.result.classes[r.predictions[i]!]
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Los archivos kNN/CART incluyen las filas train para reconstruir el ajuste y el
          preprocesado. No incluyen validación ni test. No son checkpoints reanudables de redes. El
          modelo MLP usa el formato de inferencia existente.
        </p>
        <label class="review-option"
          ><input v-model="disclose" type="checkbox" />Entiendo que exportar kNN/CART copia mis
          ejemplos de entrenamiento al archivo.</label
        ><button
          v-for="family in ['knn', 'cart', 'mlp'] as const"
          :key="family"
          class="button secondary"
          :disabled="family !== 'mlp' && !disclose"
          @click="download(family)"
        >
          Exportar modelo {{ family.toUpperCase() }}
        </button>
      </section></template
    >
    <section class="panel">
      <h2>Probar un modelo clásico exportado</h2>
      <label
        >Archivo de estimador kNN/CART<input
          type="file"
          accept=".json"
          :disabled="busy"
          @change="file"
      /></label>
      <p>
        Hasta 8 MiB UTF-8. Se verifican integridad, pipeline y ajuste reproducible antes de
        aceptarlo. Se conserva en memoria; no sustituye el estudio.
      </p>
      <template v-if="study.imported"
        ><h3>Archivo válido · {{ study.imported.family.toUpperCase() }}</h3>
        <p v-if="study.imported.provenance.testPreviouslyConsulted">
          En el origen de este archivo ya se había consultado el test. Importarlo no recupera una
          evaluación final independiente.
        </p>
        <FeatureForm
          v-model="fileFeatures"
          :features="study.imported.features"
          label="Entrada del archivo"
          :disabled="busy"
        /><button class="button secondary" :disabled="busy" @click="study.queryFile(fileFeatures)">
          Predecir con el archivo
        </button>
        <p>
          Predicción del archivo:
          {{
            study.imported.task === 'regression'
              ? study.imported.prediction.predicted
              : study.imported.classes[study.imported.prediction.predicted]
          }}
          · salida {{ study.imported.prediction.values.map((v) => v.toFixed(5)).join(' · ') }}
        </p></template
      >
    </section>
  </div>
</template>
<style scoped>
.classical-controls,
.classical-plots {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}
.table-scroll {
  overflow: auto;
}
table {
  min-width: 550px;
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  text-align: left;
  padding: 0.5rem;
  border-bottom: 1px solid var(--line);
}
.selected {
  background: var(--wash);
}
@media (max-width: 1100px) {
  .classical-plots {
    grid-template-columns: 1fr;
  }
  .classical-controls {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 600px) {
  .classical-controls {
    grid-template-columns: 1fr;
  }
}
</style>

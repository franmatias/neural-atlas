<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useExperimentsStore } from '@/stores/experiments';
import { formatData } from '@/shared/utils/data-format';
import ExperimentConfiguration from './ExperimentConfiguration.vue';
import ProjectionComparison from './ProjectionComparison.vue';
import StudyInspector from './StudyInspector.vue';
import FoldDiagram from './FoldDiagram.vue';
const study = useExperimentsStore();
const sourcePreset = ref('moons'),
  probeIndex = ref(0),
  fileError = ref('');
const projecting = ref(false),
  projection = ref<HTMLElement>();
async function toggleProjection() {
  projecting.value = !projecting.value;
  if (projecting.value) {
    await nextTick();
    projection.value?.focus();
  }
}
watch(
  () => study.mode,
  () => (projecting.value = false),
);
const differenceNames: Record<string, string> = {
  'config.spec.hidden': 'Capas ocultas',
  'config.spec.activation': 'Activación',
  'config.seed': 'Semilla de entrenamiento',
  'config.optimizer.kind': 'Optimizador',
  'config.optimizer.rate': 'Tasa de aprendizaje',
  'config.loss': 'Pérdida de regresión',
  'pipeline.scaling': 'Escalado',
  'pipeline.derived': 'Características derivadas',
  'pipeline.imputation': 'Imputación',
  'pipeline.featureIds': 'Características incluidas',
};
const probe = computed(() => study.abResult?.probes[probeIndex.value]);
watch(
  () => study.abResult,
  () => {
    probeIndex.value = 0;
  },
);
const lossLabel = computed(() =>
  (study.mode === 'ab' ? study.abResult?.task : study.cvResult?.task) === 'regression'
    ? 'Pérdida de regresión'
    : (study.mode === 'ab' ? study.abResult?.task : study.cvResult?.task) === 'multiclass'
      ? 'Entropía cruzada categórica'
      : 'Entropía cruzada binaria',
);
function download() {
  fileError.value = '';
  try {
    const text = study.exportReport(),
      url = globalThis.URL.createObjectURL(
        new globalThis.Blob([text], { type: 'application/json' }),
      );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'neural-atlas-study.report.json';
    link.click();
    setTimeout(() => globalThis.URL.revokeObjectURL(url), 1000);
  } catch {
    fileError.value = 'No se ha exportado el informe. Los resultados se conservan.';
  }
}
onBeforeRouteLeave(() => {
  if (study.busy) study.cancel();
});
</script>
<template>
  <div class="page training-page experiments-page">
    <p class="eyebrow">L12 / EXPERIMENTOS</p>
    <h1>Compara con una pregunta.</h1>
    <p><RouterLink to="/lab/experimentos/clasicos">Comparar kNN, árbol CART y MLP</RouterLink></p>
    <p class="page-intro">
      Define qué cambia, conserva una base común y contrasta resultados reales. Puedes comparar A/B
      o validar una configuración en distintos folds, sin puntuar el test final.
    </p>
    <p>
      <RouterLink to="/lab/experimentos/robustez"
        >Dispersión de predicciones y cambios de distribución</RouterLink
      >
    </p>
    <section class="training-panel">
      <h2>Datos del estudio</h2>
      <p>
        Los estudios usan una copia. Cargar un ejemplo o copiar el espacio de trabajo conserva la
        sesión activa. Para usar tus propios datos, impórtalos y divídelos primero en
        <RouterLink to="/lab/datos">Datos</RouterLink>.
      </p>
      <p class="small">
        Se copia la configuración de entrenamiento y el pipeline disponible. La evaluación binaria
        de estos estudios usa umbral 0,5; los informes indican la consulta previa de test.
      </p>
      <fieldset :disabled="study.busy || projecting">
        <legend>Selecciona una fuente</legend>
        <div class="training-fields">
          <label
            >Ejemplo para experimentos<select v-model="sourcePreset">
              <option value="moons">Medias lunas · binaria</option>
              <option value="flowers">Flores · multiclase</option>
              <option value="sine">Seno · regresión</option>
              <option value="grouped">Copias agrupadas</option>
            </select></label
          >
        </div>
        <div class="training-toolbar">
          <button class="button secondary" @click="study.preset(sourcePreset)">
            Cargar ejemplo en el estudio</button
          ><button class="button secondary" @click="study.copyWorkspace()">
            Copiar datos y configuración actuales
          </button>
        </div>
      </fieldset>
      <p v-if="study.source">
        {{ study.source.dataset.rows.length }} filas ·
        {{ study.source.dataset.features.length }} características · tarea
        {{ study.source.dataset.task }} · train {{ study.source.split.train.length }}, validación
        {{ study.source.split.validation.length }} y test {{ study.source.split.test.length }}.
        Semilla base {{ study.source.split.seed }}. Consulta previa de test:
        {{ study.previousTest ? 'sí; no se oculta este antecedente' : 'no' }}.
      </p>
    </section>
    <section class="training-panel">
      <h2>Hipótesis y configuración</h2>
      <fieldset :disabled="study.busy || projecting">
        <legend>Configura el estudio</legend>
        <div class="training-fields">
          <label
            >Tipo de estudio<select v-model="study.mode">
              <option value="ab">Comparación A/B</option>
              <option value="cv">Validación cruzada</option>
            </select></label
          >
          <label
            >Épocas comunes<input
              v-model.number="study.epochs"
              type="number"
              min="1"
              max="120"
              step="1"
          /></label>
          <label
            >Tamaño de lote común<input
              v-model.number="study.batchSize"
              type="number"
              min="1"
              max="512"
              step="1"
          /></label>
          <template v-if="study.mode === 'ab'"
            ><label
              >Presupuesto A/B<select v-model="study.budgetKind">
                <option value="epochs">Épocas comunes</option>
                <option value="updates">Actualizaciones comunes</option>
                <option value="time">Tiempo de entrenamiento por ensayo</option>
              </select></label
            ><label v-if="study.budgetKind !== 'epochs'"
              >Límite del presupuesto<input
                v-model.number="study.budgetLimit"
                type="number"
                :min="study.budgetKind === 'time' ? 50 : 1"
                :max="study.budgetKind === 'time' ? 3000 : 10000"
                step="1"
              />{{ study.budgetKind === 'time' ? 'milisegundos' : 'actualizaciones' }}</label
            ></template
          >
          <template v-if="study.mode === 'cv'"
            ><label
              >Número de folds K<input
                v-model.number="study.folds"
                type="number"
                min="2"
                max="10"
                step="1" /></label
            ><label
              >Estrategia de folds<select v-model="study.foldStrategy">
                <option value="random">Aleatoria</option>
                <option value="stratified">Estratificada</option>
                <option value="grouped">Por grupos</option>
              </select></label
            ><label
              >Semilla de folds<input
                v-model.number="study.foldSeed"
                type="number"
                min="0"
                max="4294967295"
                step="1" /></label
          ></template>
        </div>
        <label class="study-text"
          >Predicción antes de ejecutar<textarea
            v-model="study.hypothesis"
            maxlength="2000"
            rows="3"
            placeholder="Espero observar… porque…"
          />
        </label>
        <label v-if="study.mode === 'ab'" class="training-check"
          ><input v-model="study.sameSeed" type="checkbox" />Sincronizar la semilla de B con
          A</label
        >
        <div
          v-if="study.source"
          class="configuration-grid"
          :class="{ single: study.mode === 'cv' }"
        >
          <ExperimentConfiguration
            v-model:config="study.a"
            v-model:pipeline="study.pipelineA"
            label="A"
            :features="study.source.dataset.features"
          />
          <ExperimentConfiguration
            v-if="study.mode === 'ab'"
            v-model:config="study.b"
            v-model:pipeline="study.pipelineB"
            label="B"
            :features="study.source.dataset.features"
            :seed-disabled="study.sameSeed"
          />
        </div>
      </fieldset>
      <p v-if="study.mode === 'cv'">
        CV usa la configuración A, con parada temprana desactivada explícitamente. El desarrollo
        reúne train + validación de la división base; en cada fold se ajustan desde cero pipeline,
        modelo y optimizador. Test queda fuera. Usa «Por grupos» si hay copias/entidades
        relacionadas; no se admiten aquí divisiones temporales ni subconjuntos de otros estudios.
      </p>
      <p v-else>
        A y B comparten dataset y división. Épocas y tamaño de lote están sincronizados; el
        presupuesto iguala épocas, no operaciones ni siempre actualizaciones. Si cambias varias
        variables o la semilla, la diferencia observada no identifica una sola causa. Puedes
        modificar cada pipeline; siempre se ajusta solo con su train.
      </p>
      <p v-if="study.mode === 'ab'" class="small">
        Una semilla común reproduce los pesos iniciales solo si coinciden arquitectura e
        inicialización. Cambiar el pipeline también cambia la función sobre las entradas originales.
      </p>
      <div class="training-toolbar">
        <button class="button primary" :disabled="study.busy" @click="study.run()">
          Ejecutar estudio</button
        ><button v-if="study.busy" class="button secondary" @click="study.cancel()">
          Cancelar experimento
        </button>
      </div>
      <p role="status">
        {{
          study.busy
            ? 'Calculando secuencialmente en un Web Worker; puedes cancelar…'
            : study.notice
        }}
      </p>
      <p v-if="study.error || fileError" role="alert">{{ study.error || fileError }}</p>
      <p class="small muted">
        Presupuesto: 2 ensayos A/B o K=2–10 en CV, hasta 120 épocas y 1.000 filas, máximo 5.000
        parámetros por red y límite conjunto de trabajo numérico. Puede ser menor si falta soporte,
        el lote supera train o el pipeline produce más de 32 entradas. No se publican resultados
        parciales como completos. El tiempo depende del equipo y la configuración.
      </p>
    </section>
    <button
      v-if="study.mode === 'ab' && study.abResult"
      class="button secondary"
      :aria-pressed="projecting"
      @click="toggleProjection"
    >
      {{ projecting ? 'Salir de la vista de proyección' : 'Activar vista de proyección A/B' }}
    </button>
    <div v-if="projecting && study.abResult" ref="projection" tabindex="-1">
      <ProjectionComparison v-model="probeIndex" :result="study.abResult" />
    </div>
    <section v-if="study.mode === 'ab' && study.abResult" class="training-panel ab-results">
      <h2>Resultados A/B</h2>
      <p>
        Hipótesis registrada:
        {{ study.abResult.options.hypothesis || 'Sin predicción registrada; modo libre.' }} ·
        {{ lossLabel }}. Estos resultados conservan la configuración ejecutada, aunque edites los
        controles.
      </p>
      <p>
        {{ study.abResult.differences.length }} diferencias de configuración.
        {{
          study.abResult.differences.length === 1
            ? 'Una variable de configuración distinta; revisa también el presupuesto.'
            : study.abResult.differences.length === 0
              ? 'Referencia de equivalencia: configuraciones idénticas.'
              : 'Hay varias variables; no atribuyas el efecto a una sola.'
        }}
      </p>
      <ul>
        <li v-for="d in study.abResult.differences" :key="d.field">
          <strong>{{ differenceNames[d.field] ?? d.field }}</strong
          >: {{ JSON.stringify(d.a) }} → {{ JSON.stringify(d.b) }}
        </li>
      </ul>
      <div
        class="data-table-scroll"
        tabindex="0"
        role="region"
        aria-label="Desplazamiento de la comparación A/B"
      >
        <table class="dataset-table" aria-label="Resultados de experimentos A/B">
          <thead>
            <tr>
              <th scope="col">Ensayo</th>
              <th scope="col">Función de pérdida</th>
              <th scope="col">Pérdida train</th>
              <th scope="col">Pérdida validación</th>
              <th scope="col">Parámetros</th>
              <th scope="col">Época seleccionada / observada</th>
              <th scope="col">Actualizaciones realizadas</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(run, i) in study.abResult.runs" :key="run.label">
              <th scope="row">{{ run.label }}</th>
              <td>
                {{
                  study.abResult.task === 'regression'
                    ? run.experiment.config.loss.toUpperCase()
                    : study.abResult.task === 'binary'
                      ? 'BCE'
                      : 'Entropía cruzada categórica'
                }}
              </td>
              <td>
                {{
                  formatData(
                    (run.stop?.point ?? run.experiment.checkpoint.history.at(-1)!).trainLoss,
                  )
                }}
              </td>
              <td>
                {{
                  formatData(
                    (run.stop?.point ?? run.experiment.checkpoint.history.at(-1)!).validationLoss,
                  )
                }}
              </td>
              <td>{{ study.abResult.budgets[i]!.parameters }}</td>
              <td>
                {{ run.experiment.checkpoint.epoch }} /
                {{
                  run.experiment.checkpoint.earlyStopping?.stoppedAt ??
                  run.experiment.checkpoint.epoch
                }}
              </td>
              <td>
                {{
                  run.experiment.checkpoint.earlyStopping?.observations.at(-1)?.update ??
                  run.experiment.checkpoint.updates
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="study.abResult.delta.validationLoss !== null">
        Δ pérdida de validación B − A = {{ formatData(study.abResult.delta.validationLoss) }};
        negativo favorece B. Una pareja no estima dispersión entre semillas. Si cambias MSE por MAE,
        o las funciones de pérdida entre regresores, no compares sus valores como si midieran lo
        mismo. Los objetivos penalizados tampoco equivalen a la pérdida de datos.
      </p>
      <p v-else>
        Las funciones de pérdida de A y B son distintas: no se calcula Δ de pérdida porque los
        valores no son comparables. Contrasta las predicciones y evalúa con una métrica común antes
        de concluir.
      </p>
      <p v-if="study.abResult.options.budget" class="small">
        Métricas recalculadas en el checkpoint final, aunque la última época esté incompleta. La
        curva conserva solo épocas completas. El tope de épocas sigue vigente; el informe declara si
        se alcanzó antes del presupuesto. No se combina presupuesto fijo con parada temprana. Tiempo
        medido entre lotes, sin garantía de tiempo real ni reproducibilidad.
      </p>
      <label class="inspection-select"
        >Sonda compartida de validación<select v-model.number="probeIndex">
          <option v-for="(p, i) in study.abResult.probes" :key="p.id" :value="i">{{ p.id }}</option>
        </select></label
      >
      <div v-if="probe" class="probe-result">
        <p>
          Muestra {{ probe.id }} · objetivo real {{ probe.target }} · coordenadas originales
          {{ JSON.stringify(probe.features) }}.
        </p>
        <p v-for="(prediction, i) in probe.predictions" :key="i">
          {{ i ? 'B' : 'A' }}: salida {{ prediction.output.map(formatData).join(', ') }} ·
          {{ prediction.label === null ? 'regresión' : 'clase ' + prediction.label }}.
          {{
            prediction.warnings.length
              ? 'Entrada fuera de rango o categoría desconocida en su pipeline.'
              : ''
          }}
        </p>
      </div>
      <p class="small">
        Hasta ocho sondas de validación, nunca de test. Son ejemplos individuales; no sustituyen las
        métricas ni demuestran calibración.
      </p>
      <label class="inspection-select"
        >Ensayo A/B para inspeccionar<select
          v-model.number="study.selectedAB"
          :disabled="study.busy"
        >
          <option :value="0">A · Referencia</option>
          <option :value="1">B · Intervención</option>
        </select></label
      >
    </section>
    <section v-if="study.mode === 'cv' && study.cvResult" class="training-panel cv-results">
      <h2>Validación cruzada sin fuga</h2>
      <p>
        Resultado de la última ejecución completa. Editar la fuente o los controles no recalcula
        estas medidas.
      </p>
      <p>
        Hipótesis registrada:
        {{ study.cvResult.options.hypothesis || 'Sin predicción registrada; modo libre.' }} · K={{
          study.cvResult.options.count
        }}
        · estrategia {{ study.cvResult.options.strategy }} · semilla de folds
        {{ study.cvResult.options.seed }} · semilla de entrenamiento
        {{ study.cvResult.options.config.seed }} · {{ lossLabel }}.
      </p>
      <FoldDiagram :result="study.cvResult" />
      <p>
        Pérdida entre folds: media {{ formatData(study.cvResult.summary.loss.mean) }} ± desviación
        muestral {{ formatData(study.cvResult.summary.loss.sampleDeviation) }}. Pérdida agregada
        ponderando cada muestra de desarrollo una vez:
        {{ formatData(study.cvResult.summary.pooledLoss) }}.
      </p>
      <p>
        {{ study.cvResult.task === 'regression' ? 'MSE' : 'Accuracy (fracción de aciertos)' }}
        agregada: {{ formatData(study.cvResult.summary.pooledScore) }}. En regresión esta métrica es
        MSE aunque la pérdida optimizada sea MAE; no es R².
      </p>
      <div
        class="data-table-scroll"
        tabindex="0"
        role="region"
        aria-label="Desplazamiento de resultados por fold"
      >
        <table class="dataset-table" aria-label="Resultados de validación cruzada">
          <thead>
            <tr>
              <th scope="col">Fold</th>
              <th scope="col">Train / validación / test</th>
              <th scope="col">Pérdida train</th>
              <th scope="col">Pérdida validación</th>
              <th scope="col">Parámetros</th>
              <th scope="col">Actualizaciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in study.cvResult.folds" :key="f.index">
              <th scope="row">{{ f.index + 1 }}</th>
              <td>
                {{ f.trainIds.length }} / {{ f.validationIds.length }} /
                {{ study.cvResult.testIds.length }}
              </td>
              <td>{{ formatData(f.trainLoss) }}</td>
              <td>{{ formatData(f.validationLoss) }}</td>
              <td>{{ f.budget.parameters }}</td>
              <td>{{ f.run.experiment.checkpoint.updates }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        La desviación usa n−1 y describe folds correlacionados; no es un intervalo de confianza ni
        un error estándar. El resultado no es un único modelo entrenado con todo desarrollo y no se
        escoge el fold con mejor puntuación para declarar rendimiento final. Usar estos resultados
        para elegir hiperparámetros puede introducir sesgo de selección; test sigue reservado para
        una decisión final.
      </p>
      <p>
        Presupuesto ejecutado: {{ study.cvResult.budget.updates }} actualizaciones. Referencia
        numérica superior: {{ formatData(study.cvResult.budget.operations) }} operaciones de la
        fórmula de presupuesto; no son FLOPs medidos ni una duración. Memoria numérica de referencia
        {{ formatData(study.cvResult.budget.numericBytes / 1024 / 1024) }} MiB, sin representar todo
        el heap.
      </p>
      <label class="inspection-select"
        >Fold para inspeccionar<select v-model.number="study.selectedFold" :disabled="study.busy">
          <option v-for="f in study.cvResult.folds" :key="f.index" :value="f.index">
            Fold {{ f.index + 1 }}
          </option>
        </select></label
      >
      <details>
        <summary>IDs de la partición seleccionada</summary>
        <p class="partition-ids">
          Train: {{ study.cvResult.folds[study.selectedFold]!.trainIds.join(', ') }}
        </p>
        <p class="partition-ids">
          Validación: {{ study.cvResult.folds[study.selectedFold]!.validationIds.join(', ') }}
        </p>
        <p class="partition-ids">Test reservado: {{ study.cvResult.testIds.join(', ') }}</p>
      </details>
    </section>
    <StudyInspector v-if="study.selected" :experiment="study.selected" :disabled="study.busy" />
    <section v-if="study.selected" class="training-panel">
      <h2>Explica la evidencia</h2>
      <p>
        Contrasta tu predicción, declara qué cambió y qué permaneció fijo, y distingue observaciones
        de explicaciones. El informe conserva la hipótesis de ejecución; esta reflexión es editable
        y no recibe una calificación automática.
      </p>
      <label class="study-text"
        >Reflexión del estudio<textarea v-model="study.reflection" maxlength="4000" rows="4" />
      </label>
      <button class="button secondary" :disabled="study.busy" @click="download">
        Exportar informe del estudio
      </button>
      <p class="small">
        Estudios e hipótesis viven en RAM. El informe JSON es de análisis, no se importa como
        experimento. Exporta también el ensayo completo para conservar dataset, partición, pipeline,
        pesos y optimizador. Las derivadas y el escalado robusto se configuran arriba; la dispersión
        y los escenarios de deriva están en Robustez, y los segmentos en Entrenamiento.
      </p>
    </section>
  </div>
</template>
<style scoped>
.experiments-page fieldset {
  min-width: 0;
}
.experiments-page p,
.experiments-page li {
  overflow-wrap: anywhere;
}
.experiments-page :deep(label) {
  overflow-wrap: anywhere;
  min-width: 0;
}
.experiments-page :deep(.button) {
  max-width: 100%;
  white-space: normal;
  overflow-wrap: anywhere;
}
.configuration-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}
.configuration-grid.single {
  grid-template-columns: 1fr;
}
.dataset-table th,
.dataset-table td {
  white-space: nowrap;
}
.study-text {
  display: grid;
  gap: 8px;
  margin: 16px 0;
}
.study-text textarea {
  width: 100%;
  min-height: 88px;
  padding: 12px;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
}
.inspection-select {
  display: grid;
  gap: 8px;
  max-width: 560px;
  min-width: 0;
  width: 100%;
}
.inspection-select select {
  min-width: 0;
  width: 100%;
  min-height: 44px;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--ink);
  background: var(--surface);
}
.partition-ids {
  font-family: var(--font-mono);
  font-size: 0.8rem;
}
@media (max-width: 900px) {
  .configuration-grid {
    grid-template-columns: 1fr;
  }
}
</style>

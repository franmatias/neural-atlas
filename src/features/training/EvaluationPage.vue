<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useTrainingStore } from '@/stores/training';
import { formatData } from '@/shared/utils/data-format';
import { trainingError } from './messages';
import PredictionPanel from './PredictionPanel.vue';
import ProbabilityEvaluation from './ProbabilityEvaluation.vue';
const props = defineProps<{ mode: 'classification' | 'regression' }>();
const session = useTrainingStore(),
  consent = ref(false),
  cell = ref('all');
const compatible = computed(
  () =>
    session.input &&
    (props.mode === 'regression'
      ? session.input.config.spec.task === 'regression'
      : session.input.config.spec.task !== 'regression'),
);
const selected = computed(() =>
  session.analysis?.split === 'test'
    ? session.test
    : session.analysis?.split === 'train'
      ? (session.input?.trainEvaluation ?? session.input?.train)
      : session.input?.validation,
);
const rows = computed(
  () =>
    selected.value?.ids.map((id, index) => ({
      id,
      index,
      target: selected.value!.y[index]!,
      prediction: session.analysis?.predictions[index],
    })) ?? [],
);
const filtered = computed(() =>
  rows.value.filter(
    (row) =>
      cell.value === 'all' ||
      (session.evaluation?.kind === 'classification' &&
        cell.value === `${row.target}:${session.evaluation.result.predicted[row.index]}`),
  ),
);
const majority = computed(() => {
  if (!session.input) return 0;
  const counts = session.input.classOrder.map(
    (_, i) =>
      (session.input!.trainEvaluation ?? session.input!.train).y.filter((y) => y === i).length,
  );
  return counts.indexOf(Math.max(...counts));
});
const baselineAccuracy = computed(() =>
  selected.value
    ? selected.value.y.filter((y) => y === majority.value).length / selected.value.y.length
    : 0,
);
watch(
  () => session.analysis,
  () => (cell.value = 'all'),
);
const metric = (value: number | null) => (value === null ? 'No definida' : formatData(value));
</script>
<template>
  <div class="page training-page">
    <p class="eyebrow">{{ mode === 'regression' ? 'L10 / REGRESIÓN' : 'L09 / CLASIFICACIÓN' }}</p>
    <h1>{{ mode === 'regression' ? 'Del número al error.' : 'Más allá de los aciertos.' }}</h1>
    <p v-if="mode === 'classification'">
      <RouterLink class="button primary" to="/lab/clasificacion/visual"
        >Abrir clasificador visual multiclase</RouterLink
      >
    </p>
    <p class="page-intro">
      {{
        mode === 'regression'
          ? 'Compara predicciones, residuos y referencias simples. Las unidades del error importan.'
          : 'Relaciona decisiones, probabilidades y errores. Una exactitud alta puede ocultar fallos en clases pequeñas.'
      }}
    </p>
    <section v-if="!compatible || !session.state" class="training-panel">
      <h2>Entrena un modelo para esta tarea</h2>
      <p>
        Carga {{ mode === 'regression' ? 'seno o energía' : 'dos lunas, nubes o flores' }} en
        Entrenamiento. Puedes usar una MLP o dejar las capas ocultas vacías para un comparador
        lineal.
      </p>
      <RouterLink to="/lab/entrenamiento" class="button primary">Ir a entrenamiento</RouterLink>
    </section>
    <template v-else
      ><p>
        Modelo de
        {{
          session.input!.config.spec.hidden.length
            ? 'red multicapa'
            : mode === 'regression'
              ? 'regresión lineal'
              : 'regresión logística'
        }}
        · actualización {{ session.state.updates }}.
        {{
          session.state.frozen
            ? 'Modelo congelado: no admite más aprendizaje.'
            : 'Pausa para evaluar una instantánea consistente.'
        }}
      </p>
      <div class="training-toolbar">
        <button
          class="button primary"
          :disabled="session.running || session.evaluating"
          @click="session.analyze('validation')"
        >
          Evaluar validación</button
        ><button
          class="button secondary"
          :disabled="session.running || session.evaluating"
          @click="session.analyze('train')"
        >
          Evaluar entrenamiento</button
        ><RouterLink to="/lab/entrenamiento" class="text-link">Volver a entrenar →</RouterLink>
      </div>
      <p v-if="session.error" class="training-alert" role="alert">
        {{ trainingError(session.error) }}
      </p>
      <fieldset
        v-if="mode === 'classification' && session.input!.config.spec.task === 'binary'"
        class="training-controls"
        :disabled="session.running || session.evaluating || session.state.frozen"
      >
        <legend>Decisión operativa</legend>
        <label for="positive-class">Clase positiva</label
        ><select id="positive-class" v-model.number="session.positive">
          <option v-for="(label, index) in session.input!.classOrder" :key="index" :value="index">
            {{ label }}
          </option></select
        ><label for="decision-threshold"
          >Umbral de decisión {{ formatData(session.threshold) }}</label
        ><input
          id="decision-threshold"
          v-model.number="session.threshold"
          type="range"
          min="0"
          max="1"
          step="any"
        />
        <p class="small muted">
          Se decide positivo si su probabilidad alcanza el umbral. El cambio de umbral modifica
          decisiones, no probabilidades. Elige con validación antes de congelar.
        </p>
      </fieldset>
      <section class="training-panel">
        <h2>Test es una consulta final</h2>
        <p>
          Validación orienta las decisiones. Test estima el resultado final tras fijar modelo y
          umbral. Consultarlo repetidamente para elegir modelos contamina esa estimación.
        </p>
        <label class="training-check"
          ><input v-model="consent" type="checkbox" />Entiendo que congelar impide seguir entrenando
          esta sesión y fija el umbral y la clase positiva.</label
        ><button
          class="button secondary"
          :disabled="!consent || session.running || session.evaluating"
          @click="session.state.frozen ? session.analyze('test') : session.freezeAndTest()"
        >
          {{
            session.state.frozen
              ? 'Evaluar test con modelo congelado'
              : 'Congelar modelo y evaluar test'
          }}
        </button>
        <p v-if="session.consulted" class="training-alert">
          Test ya ha sido consultado en esta sesión. Mantén este dato al interpretar los resultados.
        </p>
      </section>
      <section v-if="session.analysis && session.evaluation" class="training-panel">
        <h2>
          Resultados:
          {{
            session.analysis.split === 'validation'
              ? 'validación'
              : session.analysis.split === 'train'
                ? 'entrenamiento'
                : 'test'
          }}
        </h2>
        <p>
          {{ selected?.ids.length }} muestras · actualización evaluada
          {{ session.analysis.update }} · pérdida {{ formatData(session.analysis.loss) }}. Cada
          métrica se calcula solo en este conjunto.
        </p>
        <template v-if="session.evaluation.kind === 'classification'"
          ><div class="training-metrics">
            <article>
              <span>Exactitud / accuracy</span
              ><strong>{{ formatData(session.evaluation.result.accuracy) }}</strong>
            </article>
            <article>
              <span>F1 macro</span
              ><strong>{{ formatData(session.evaluation.result.macroF1) }}</strong>
            </article>
            <article>
              <span>F1 ponderada</span
              ><strong>{{ formatData(session.evaluation.result.weightedF1) }}</strong>
            </article>
            <article>
              <span>Baseline mayoritario</span><strong>{{ formatData(baselineAccuracy) }}</strong>
            </article>
          </div>
          <p class="small muted">
            El baseline predice siempre la clase mayoritaria de train. Las medias de F1 asignan cero
            a términos indefinidos; las métricas individuales se conservan como «No definida».
          </p>
          <p v-if="session.evaluation.result.undefinedMetrics" class="training-alert">
            Alguna métrica carece de denominador. Comprueba soporte y clases predichas antes de
            interpretar las medias.
          </p>
          <div class="training-table-wrap">
            <table class="confusion-table">
              <caption>
                Matriz de confusión: filas reales, columnas predichas. Pulsa una celda para
                inspeccionar sus muestras.
              </caption>
              <thead>
                <tr>
                  <th>Real / predicha</th>
                  <th v-for="label in session.input!.classOrder" :key="label">{{ label }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, actual) in session.evaluation.result.matrix" :key="actual">
                  <th>{{ session.input!.classOrder[actual] }}</th>
                  <td v-for="(count, predicted) in row" :key="predicted">
                    <button
                      class="button secondary"
                      :aria-label="`Real ${session.input!.classOrder[actual]}, predicha ${session.input!.classOrder[predicted]}: ${count} muestras`"
                      :aria-pressed="cell === `${actual}:${predicted}`"
                      @click="cell = `${actual}:${predicted}`"
                    >
                      {{ count }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <table>
              <caption>
                Métricas por clase, frente al resto
              </caption>
              <thead>
                <tr>
                  <th>Clase</th>
                  <th>Soporte</th>
                  <th>TP</th>
                  <th>FP</th>
                  <th>TN</th>
                  <th>FN</th>
                  <th>Precision</th>
                  <th>Recall</th>
                  <th>F1</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in session.evaluation.result.perClass" :key="index">
                  <th>{{ session.input!.classOrder[index] }}</th>
                  <td>{{ row.support }}</td>
                  <td>{{ row.tp }}</td>
                  <td>{{ row.fp }}</td>
                  <td>{{ row.tn }}</td>
                  <td>{{ row.fn }}</td>
                  <td>{{ metric(row.precision) }}</td>
                  <td>{{ metric(row.recall) }}</td>
                  <td>{{ metric(row.f1) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="small muted">
            Con softmax se elige argmax; en empates gana la primera clase del orden declarado. Ni
            sigmoide ni softmax garantizan probabilidades calibradas.
          </p></template
        >
        <template v-else
          ><div class="training-metrics">
            <article>
              <span>MSE · unidades²</span
              ><strong>{{ formatData(session.evaluation.result.mse) }}</strong>
            </article>
            <article>
              <span>MAE · unidades del objetivo</span
              ><strong>{{ formatData(session.evaluation.result.mae) }}</strong>
            </article>
            <article>
              <span>RMSE · unidades del objetivo</span
              ><strong>{{ formatData(session.evaluation.result.rmse) }}</strong>
            </article>
            <article>
              <span>R²</span><strong>{{ metric(session.evaluation.result.r2) }}</strong>
            </article>
          </div>
          <p>
            Baseline constante de train = {{ formatData(session.state.baseline) }} ({{
              session.input!.config.loss === 'mae' ? 'mediana' : 'media'
            }}): MSE {{ formatData(session.evaluation.result.baselineMse) }} y MAE
            {{ formatData(session.evaluation.result.baselineMae) }}.
          </p>
          <p class="small muted">
            Residuo = real − predicción. R² compara con la media del conjunto evaluado, puede ser
            negativo y es indefinido si el objetivo es constante o la resolución numérica resulta
            insuficiente. El baseline anterior se ajusta exclusivamente con train.
          </p></template
        >
        <button v-if="cell !== 'all'" class="button secondary" @click="cell = 'all'">
          Mostrar todas las muestras
        </button>
        <p class="small muted">
          Mostrando las primeras {{ Math.min(filtered.length, 20) }} de
          {{ filtered.length }} muestras seleccionadas.
        </p>
        <div class="training-table-wrap">
          <table>
            <caption>
              Predicciones de la instantánea evaluada
            </caption>
            <thead>
              <tr>
                <th>ID</th>
                <th>Objetivo real</th>
                <th>Predicción</th>
                <th>
                  {{
                    mode === 'regression'
                      ? 'Residuo'
                      : session.input!.config.spec.task === 'binary'
                        ? `p(clase ${session.input!.classOrder[1]})`
                        : `Probabilidades (${session.input!.classOrder.join(' / ')})`
                  }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in filtered.slice(0, 20)" :key="row.id">
                <th>{{ row.id }}</th>
                <td>
                  {{
                    mode === 'regression'
                      ? formatData(row.target)
                      : session.input!.classOrder[row.target]
                  }}
                </td>
                <td>
                  {{
                    session.evaluation.kind === 'regression'
                      ? formatData(row.prediction![0]!)
                      : session.input!.classOrder[session.evaluation.result.predicted[row.index]!]
                  }}
                </td>
                <td>
                  {{
                    session.evaluation.kind === 'regression'
                      ? formatData(session.evaluation.result.residuals[row.index]!)
                      : row.prediction?.map(formatData).join(' · ')
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <button
          v-if="session.analysis.split === 'validation'"
          class="button secondary"
          @click="session.remember"
        >
          Añadir a comparación de validación
        </button>
      </section>
      <ProbabilityEvaluation
        v-if="session.analysis && session.evaluation?.kind === 'classification' && selected"
        :actual="selected.y"
        :predictions="session.analysis.predictions"
        :class-order="session.input!.classOrder"
        :positive="session.positive"
        :threshold="session.threshold"
        :split="session.analysis.split"
        :update="session.analysis.update"
        :current-update="session.state.updates"
        :frozen="session.state.frozen"
        :busy="session.running || session.evaluating"
        :consulted="session.consulted"
        :source="{
          dataHash: session.input!.dataHash,
          splitHash: session.input!.splitHash,
          pipelineHash: session.input!.pipelineHash,
          configHash: session.state.configHash,
        }"
        @threshold="session.threshold = $event"
      />
      <section v-if="session.comparisons.length" class="training-panel">
        <h2>Comparación con los mismos datos</h2>
        <p>
          Se conservan hasta seis mediciones de validación mientras no cambien datos, partición o
          pipeline. Inicia otra sesión con capas ocultas vacías para comparar el modelo lineal o
          logístico con la MLP. Compara presupuestos, semillas y pérdidas compatibles; el score usa
          MSE o exactitud a umbral 0,5, no el umbral operativo ajustable.
        </p>
        <div class="training-table-wrap">
          <table>
            <caption>
              Mediciones guardadas en memoria
            </caption>
            <thead>
              <tr>
                <th>Modelo</th>
                <th>Parámetros</th>
                <th>Actualizaciones</th>
                <th>Pérdida</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(run, index) in session.comparisons" :key="index">
                <th>{{ run.label }}</th>
                <td>{{ run.parameters }}</td>
                <td>{{ run.update }}</td>
                <td>{{ formatData(run.loss) }}</td>
                <td>{{ formatData(run.score) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <PredictionPanel />
    </template>
  </div>
</template>

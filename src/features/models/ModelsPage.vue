<script setup lang="ts">
import { computed, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useTrainingStore } from '@/stores/training';
import { useInferenceStore } from '@/stores/inference';
import { readModelFile, downloadModel } from '@/infrastructure/files/models';
import { formatData } from '@/shared/utils/data-format';
const session = useTrainingStore(),
  inference = useInferenceStore();
const fileBusy = ref(false),
  fileError = ref('');
const confirmReplace = ref(false);
let fileRevision = 0;
const busy = computed(() => inference.busy || fileBusy.value);
const canCapture = computed(() => !!session.state && !session.running && !session.evaluating);
async function selectFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const revision = ++fileRevision;
  confirmReplace.value = false;
  fileBusy.value = true;
  fileError.value = '';
  try {
    const text = await readModelFile(file);
    if (revision === fileRevision) await inference.importFile(text);
  } catch {
    if (revision === fileRevision)
      fileError.value = 'No se ha leído el archivo. Usa JSON UTF-8 de hasta 8 MiB.';
  } finally {
    input.value = '';
    if (revision === fileRevision) fileBusy.value = false;
  }
}
async function capture() {
  confirmReplace.value = false;
  fileError.value = '';
  try {
    await inference.useExperiment(session.capture());
  } catch {
    fileError.value =
      'Pausa el entrenamiento e inicializa un modelo válido antes de abrir una copia.';
  }
}
async function download() {
  const text = await inference.exportFile();
  if (text) {
    try {
      downloadModel(text);
    } catch {
      fileError.value = 'El navegador no ha permitido descargar la copia. El modelo sigue abierto.';
    }
  }
}
onBeforeRouteLeave(() => {
  fileRevision++;
  fileBusy.value = false;
  inference.cancel();
});
</script>
<template>
  <div class="page training-page models-page">
    <p class="eyebrow">BIBLIOTECA / INFERENCIA</p>
    <h1>Un modelo, nuevas muestras.</h1>
    <p class="page-intro">
      Exporta lo aprendido y prueba datos nuevos sin transportar las filas del entrenamiento. El
      archivo conserva la preparación original y el orden de las clases.
    </p>
    <RouterLink class="button secondary" to="/biblioteca">Volver a la biblioteca</RouterLink>
    <p v-if="fileError || inference.error" role="alert">{{ fileError || inference.error }}</p>
    <p v-if="inference.notice" role="status">{{ inference.notice }}</p>
    <section class="training-panel">
      <h2>Abrir un modelo</h2>
      <p>
        Crea una copia independiente del modelo de tu sesión o importa un archivo de inferencia.
        Cambiar esta copia no sustituye el laboratorio ni sus datos.
      </p>
      <div class="training-toolbar">
        <button class="button primary" :disabled="busy || !canCapture" @click="capture">
          Copiar modelo de la sesión
        </button>
        <RouterLink class="button secondary" to="/lab/entrenamiento"
          >Ir al entrenamiento</RouterLink
        >
      </div>
      <label
        >Importar modelo JSON (hasta 8 MiB)<input
          type="file"
          accept=".json,application/json"
          :disabled="busy"
          @change="selectFile"
      /></label>
      <p>
        Importar reemplaza únicamente el modelo de este espacio. Si el archivo no valida, se
        conserva la copia anterior. La copia abierta vive en memoria al navegar; exporta un archivo
        para conservarla tras recargar.
      </p>
    </section>
    <template v-if="inference.model">
      <section class="training-panel">
        <h2>Modelo listo para inferencia</h2>
        <dl class="model-summary">
          <div>
            <dt>Tarea</dt>
            <dd>
              {{
                inference.model.task === 'regression'
                  ? 'Regresión'
                  : inference.model.task === 'binary'
                    ? 'Clasificación binaria'
                    : 'Clasificación multiclase'
              }}
            </dd>
          </div>
          <div>
            <dt>Objetivo</dt>
            <dd>{{ inference.model.targetName }}</dd>
          </div>
          <div>
            <dt>Arquitectura</dt>
            <dd>
              {{
                [
                  inference.model.network.spec.inputs,
                  ...inference.model.network.spec.hidden,
                  inference.model.network.layers.at(-1)!.outputs,
                ].join(' → ')
              }}
            </dd>
          </div>
          <div>
            <dt>Entrenamiento declarado</dt>
            <dd>
              Época {{ inference.model.training.epoch }} ·
              {{ inference.model.training.updates }} actualizaciones
            </dd>
          </div>
          <div v-if="inference.model.classOrder.length">
            <dt>Orden de clases</dt>
            <dd>{{ inference.model.classOrder.join(' · ') }}</dd>
          </div>
        </dl>
        <p v-if="inference.model.task === 'binary'">
          Clase positiva: {{ inference.model.classOrder[inference.model.positiveClassId!] }} ·
          umbral {{ formatData(inference.model.threshold!) }}. Se conserva la regla de decisión
          exportada.
        </p>
        <p>
          Solo inferencia: no incluye momentos del optimizador ni permite reanudar entrenamiento.
          Para ello usa un archivo de experimento completo.
        </p>
        <p>
          Sin filas no se puede verificar de nuevo cómo se ajustó el pipeline. Las estadísticas y
          categorías aprendidas sí se incluyen; revisa su contenido antes de compartirlo.
        </p>
        <details class="model-preparation">
          <summary>Preparación aprendida que viaja en el archivo</summary>
          <p>
            Escalado:
            {{
              inference.model.pipeline.options.scaling === 'standard'
                ? 'estandarización'
                : inference.model.pipeline.options.scaling === 'minmax'
                  ? 'Min-Max'
                  : inference.model.pipeline.options.scaling === 'robust'
                    ? 'robusto (mediana / IQR)'
                    : 'sin escalado'
            }}. Los parámetros se conservan al predecir; no se ajustan a la muestra nueva.
          </p>
          <ul>
            <li v-for="column in inference.model.pipeline.columns" :key="column.id">
              <strong>{{
                inference.model.features.find((feature) => feature.id === column.id)!.name
              }}</strong>
              <span v-if="column.kind === 'numeric'"
                >: imputación {{ formatData(column.fill) }} · media {{ formatData(column.mean) }} ·
                desviación {{ formatData(column.std) }} · rango [{{ formatData(column.min) }},
                {{ formatData(column.max) }}].</span
              >
              <span v-if="column.kind === 'numeric' && column.robust">
                Mediana {{ formatData(column.robust.median) }} · IQR
                {{ formatData(column.robust.iqr) }} (escala
                {{ formatData(column.robust.iqr || 1) }}).
              </span>
              <span v-if="column.kind === 'categorical'"
                >: vocabulario {{ column.vocabulary.join(' · ') }} · imputación {{ column.fill }}.
                Una categoría nueva activa la columna desconocida.</span
              >
            </li>
          </ul>
          <p v-if="inference.model.pipeline.derived">
            Derivadas sobre orígenes imputados:
            {{
              inference.model.pipeline.outputLabels
                .slice(-inference.model.pipeline.derived.length)
                .join(' · ')
            }}. Se escalan con sus propias estadísticas de train, conservadas en el archivo.
          </p>
        </details>
        <button class="button primary" :disabled="busy" @click="download">
          Exportar modelo sin dataset
        </button>
        <button class="button secondary" :disabled="busy" @click="confirmReplace = true">
          Cerrar copia de inferencia
        </button>
        <div
          v-if="confirmReplace"
          class="training-alert"
          role="group"
          aria-label="Confirmar cierre del modelo"
        >
          <p>Se cerrará la copia de inferencia en memoria. Exporta antes si quieres conservarla.</p>
          <button
            class="button secondary"
            @click="
              inference.clear();
              confirmReplace = false;
            "
          >
            Confirmar cierre
          </button>
          <button class="button secondary" @click="confirmReplace = false">Mantener copia</button>
        </div>
      </section>
      <section class="training-panel">
        <h2>Predecir una muestra independiente</h2>
        <p>
          Introduce valores originales. Dejar una característica como ausente aplica la imputación
          aprendida y su indicador si está configurado. No se pide una etiqueta objetivo ni se
          actualizan pesos.
        </p>
        <form @submit.prevent="inference.predict">
          <div class="training-fields">
            <div
              v-for="(feature, index) in inference.model.features"
              :key="feature.id"
              class="model-field"
            >
              <label :for="`model-value-${index}`"
                >{{ feature.name }}{{ feature.unit ? ` (${feature.unit})` : '' }}</label
              >
              <input
                v-if="feature.kind === 'numeric'"
                :id="`model-value-${index}`"
                v-model.number="inference.values[feature.id]"
                type="number"
                step="any"
                required
                :disabled="busy || inference.values[feature.id] === null"
              />
              <input
                v-else
                :id="`model-value-${index}`"
                v-model="inference.values[feature.id]"
                type="text"
                maxlength="4096"
                :disabled="busy || inference.values[feature.id] === null"
              />
              <label class="model-missing"
                ><input
                  type="checkbox"
                  :checked="inference.values[feature.id] === null"
                  :disabled="busy"
                  @change="
                    inference.values[feature.id] =
                      inference.values[feature.id] === null
                        ? inference.model!.pipeline.columns[index]!.fill
                        : null
                  "
                />{{ feature.name }} ausente</label
              >
            </div>
          </div>
          <button class="button primary" :disabled="busy">Predecir con este modelo</button>
        </form>
        <div v-if="inference.result" class="prediction-result" role="status">
          <p v-if="inference.result.warnings.length" class="training-alert">
            Hay valores fuera del rango de train o categorías desconocidas:
            {{ inference.result.warnings.join(', ') }}. La predicción puede extrapolar y no
            garantiza fiabilidad.
          </p>
          <p v-if="inference.model.task === 'regression'">
            Predicción numérica: <strong>{{ formatData(inference.result.output[0]!) }}</strong>
          </p>
          <template v-else>
            <p>
              Decisión: <strong>clase {{ inference.result.label }}</strong>
            </p>
            <p v-for="(probability, index) in inference.result.probabilities" :key="index">
              Clase {{ inference.model.classOrder[index] }}:
              <strong>{{ formatData(probability) }}</strong>
            </p>
            <p>Estas salidas probabilísticas no demuestran calibración ni garantizan acierto.</p>
          </template>
          <details>
            <summary>Vector transformado enviado a la red</summary>
            <ol>
              <li v-for="(value, index) in inference.result.transformed" :key="index">
                {{ inference.model.pipeline.outputLabels[index] }}: {{ formatData(value) }}
              </li>
            </ol>
          </details>
        </div>
      </section>
    </template>
    <p v-else>No hay un modelo de inferencia abierto.</p>
  </div>
</template>
<style scoped>
input[type='file'] {
  display: block;
  max-width: 100%;
  margin-top: 12px;
}
.model-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: 16px;
}
.model-summary dt {
  font-weight: 700;
}
.model-summary dd {
  margin: 4px 0 0;
}
.models-page p,
.models-page dd,
.models-page label,
.models-page li {
  overflow-wrap: anywhere;
}
.model-field {
  display: grid;
  gap: 8px;
  min-width: 0;
}
.model-field > input {
  min-height: 44px;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--subtle);
  color: var(--ink);
  min-width: 0;
  width: 100%;
}
.model-missing {
  display: flex;
  gap: 8px;
  align-items: center;
}
.model-missing input {
  width: 20px;
  height: 20px;
}
.model-preparation {
  margin: 20px 0;
}
</style>

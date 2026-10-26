<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import { useGeneralizationStore } from '@/stores/generalization';
import { useTrainingStore } from '@/stores/training';
import { usePreferencesStore } from '@/stores/preferences';
import { formatData } from '@/shared/utils/data-format';
import LossChart from '@/features/training/LossChart.vue';
import GradientControlPanel from '@/features/training/GradientControlPanel.vue';
import EarlyStoppingPanel from '@/features/training/EarlyStoppingPanel.vue';
import DropoutPanel from '@/features/training/DropoutPanel.vue';
import BatchNormalizationPanel from '@/features/training/BatchNormalizationPanel.vue';
import AugmentationPanel from '@/features/training/AugmentationPanel.vue';
import NetworkDiagram from '@/features/network/NetworkDiagram.vue';
import MultiseedPanel from './MultiseedPanel.vue';
const questions = {
  l1: 'Predice qué ocurrirá al aumentar λ de L1.',
  l2: 'Predice qué ocurrirá al aumentar λ de L2.',
  clip: 'Predice qué ocurrirá al reducir el umbral de recorte y contrasta las normas original y aplicada.',
  early:
    'Predice cómo la paciencia y la mejora mínima cambian la época observada y la seleccionada.',
  dropout:
    'Predice cómo cambiar p afecta al entrenamiento y explica por qué inferencia no usa máscara.',
  bn: 'Contrasta las estadísticas del lote con las medias móviles y explica qué valores usa inferencia.',
  augmentation:
    'Predice cómo σ y el número de copias afectan a aceptaciones, rechazos y trabajo adicional.',
};
const session = useGeneralizationStore(),
  training = useTrainingStore(),
  prefs = usePreferencesStore(),
  router = useRouter();
const selected = ref(1),
  confirm = ref(false),
  opening = ref(false),
  animate = ref(false),
  fileError = ref('');
const confirmation = ref<HTMLElement>();
let previousFocus: HTMLElement | null = null;
watch(selected, () => {
  confirm.value = false;
});
watch(
  () => session.result,
  () => {
    confirm.value = false;
  },
);
watch(confirm, async (value) => {
  if (value) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    await nextTick();
    confirmation.value?.focus();
  } else if (previousFocus?.isConnected) previousFocus.focus();
});
function start() {
  confirm.value = false;
  void session.run();
}
async function open() {
  const run = session.result?.runs[selected.value];
  if (!run) return;
  opening.value = true;
  fileError.value = '';
  try {
    await training.restore(run.experiment);
    confirm.value = false;
    await router.push('/lab/entrenamiento');
  } catch {
    fileError.value = 'No se ha abierto el ensayo. Los resultados se conservan.';
  } finally {
    opening.value = false;
  }
}
function download(study = false) {
  fileError.value = '';
  try {
    const text = study ? session.exportStudy() : session.exportRun(selected.value),
      blob = new globalThis.Blob([text], { type: 'application/json' }),
      url = globalThis.URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = url;
    link.download = study
      ? 'neural-atlas-multiseed.report.json'
      : 'neural-atlas-generalization.experiment.json';
    link.click();
    setTimeout(() => globalThis.URL.revokeObjectURL(url), 1000);
  } catch {
    fileError.value = 'No se ha exportado. Los resultados siguen disponibles.';
  }
}
onBeforeRouteLeave(() => {
  if (session.busy) session.cancel();
});
</script>
<template>
  <div class="page training-page generalization-page">
    <p class="eyebrow">L08 / GENERALIZACIÓN · D6 EN DESARROLLO</p>
    <h1>Aprender sin memorizar.</h1>
    <RouterLink class="button secondary" to="/lab/generalizacion/capacidad"
      >Explorar capacidad y tamaño de datos</RouterLink
    >
    <p class="page-intro">
      Cambia una intervención, conserva el resto y compara con validación. Una penalización menor o
      pesos pequeños no garantizan mejores predicciones.
    </p>
    <section class="training-panel">
      <h2>Dos ensayos, una diferencia</h2>
      <p>
        120 muestras sintéticas de
        {{
          session.options.intervention === 'augmentation'
            ? session.options.augmentationPolicy === 'circles'
              ? 'círculos'
              : 'XOR'
            : 'medias lunas'
        }}; train original 72, validación 24 y test 24 reservado. Misma semilla, división, pipeline
        ajustado con train, red 2→8→8→1, Xavier, tanh, Adam (0,01) y lotes de 12. Test no se evalúa.
        La comprobación de inicialización compara los pesos y sesgos densos; BN añade gamma inicial
        1, beta inicial 0 y estadísticas propias.
      </p>
      <fieldset :disabled="session.busy || opening">
        <legend>Configura la comparación</legend>
        <div class="training-fields">
          <label
            >Intervención<select v-model="session.options.intervention">
              <option value="l1">L1 · magnitudes absolutas</option>
              <option value="l2">L2 · magnitudes cuadráticas</option>
              <option value="clip">Recorte por norma global</option>
              <option value="early">Parada temprana con validación</option>
              <option value="dropout">Dropout invertido</option>
              <option value="bn">Normalización por lotes</option>
              <option value="augmentation">Aumento conservador de train</option>
            </select></label
          >
          <label
            v-if="session.options.intervention === 'l1' || session.options.intervention === 'l2'"
            >Intensidad λ<input
              v-model.number="session.options.lambda"
              type="number"
              min="0"
              max="0.1"
              step="0.001"
          /></label>
          <label v-else-if="session.options.intervention === 'clip'"
            >Umbral de recorte<input
              v-model.number="session.options.clipNorm"
              type="number"
              min="0.1"
              max="100"
              step="0.1"
          /></label>
          <label v-if="session.options.intervention === 'early'"
            >Paciencia de la comparación<input
              v-model.number="session.options.patience"
              type="number"
              min="5"
              max="100"
              step="1"
          /></label>
          <label v-if="session.options.intervention === 'dropout'"
            >Probabilidad de abandono de la comparación<input
              v-model.number="session.options.dropoutRate"
              type="number"
              min="0"
              max="0.8"
              step="0.05"
          /></label>
          <label v-if="session.options.intervention === 'early'"
            >Mejora mínima de la comparación<input
              v-model.number="session.options.minDelta"
              type="number"
              min="0"
              max="0.01"
              step="0.0001"
          /></label>
          <template v-if="session.options.intervention === 'augmentation'">
            <label
              >Receta para aumento<select v-model="session.options.augmentationPolicy">
                <option value="circles">Círculos</option>
                <option value="xor">XOR</option>
              </select></label
            >
            <label
              >Desviación del aumento de la comparación<input
                v-model.number="session.options.augmentationSigma"
                type="number"
                min="0"
                max="0.01"
                step="0.001"
            /></label>
            <label
              >Copias por original de la comparación<input
                v-model.number="session.options.augmentationCopies"
                type="number"
                min="1"
                max="3"
                step="1"
            /></label>
          </template>
          <label
            >Épocas por ensayo<input
              v-model.number="session.options.epochs"
              type="number"
              min="5"
              max="120"
              step="1"
          /></label>
          <label
            >Ruido de las muestras<input
              v-model.number="session.options.noise"
              type="number"
              min="0"
              max="0.4"
              step="0.01"
          /></label>
          <label
            >Semilla compartida<input
              v-model.number="session.options.seed"
              type="number"
              min="0"
              max="4294967295"
              step="1"
          /></label>
          <label
            >Repeticiones emparejadas<select v-model.number="session.repetitions">
              <option :value="3">3 semillas · 6 ensayos</option>
              <option :value="5">5 semillas · 10 ensayos</option>
              <option :value="10">10 semillas · 20 ensayos</option>
            </select></label
          >
          <label
            >Primera semilla de entrenamiento<input
              v-model.number="session.firstSeed"
              type="number"
              min="0"
              max="4294967295"
              step="1"
          /></label>
        </div>
      </fieldset>
      <div class="training-toolbar">
        <button class="button primary" :disabled="session.busy || opening" @click="start">
          Comparar con referencia</button
        ><button
          class="button secondary"
          :disabled="session.busy || opening"
          @click="
            confirm = false;
            session.runStudy();
          "
        >
          Comparar múltiples semillas</button
        ><button v-if="session.busy" class="button secondary" @click="session.cancel()">
          Cancelar comparación
        </button>
      </div>
      <p role="status">
        {{ session.busy ? 'Calculando en un Web Worker; puedes cancelar…' : session.notice }}
      </p>
      <p v-if="session.error || fileError" role="alert">{{ session.error || fileError }}</p>
      <p class="small muted">
        Presupuesto: 2 ensayos para una pareja, o 6–20 para múltiples semillas; secuenciales, hasta
        120 épocas cada uno. En multisemilla, «Semilla compartida» fija los datos y la división; la
        primera semilla enumera entrenamientos consecutivos (tras 4294967295 vuelve a 0). Este
        espacio conserva el laboratorio activo; solo se sustituye si confirmas abrir un ensayo.
      </p>
    </section>
    <MultiseedPanel
      v-if="session.study"
      :study="session.study"
      :selected="session.selectedPair"
      :disabled="session.busy || opening"
      @inspect="session.selectPair"
      @download="download(true)"
    />
    <template v-if="session.result">
      <section class="training-panel">
        <h2>Resultados de la comparación</h2>
        <p>
          Medidos con la configuración de la última ejecución:
          {{ session.result.options.intervention.toUpperCase() }} · semilla datos
          {{ session.result.options.seed }} · entrenamiento
          {{ session.result.runs[0]!.experiment.config.seed }} ·
          {{ session.result.options.epochs }} épocas · ruido
          {{ formatData(session.result.options.noise) }} ·
          {{
            session.result.options.intervention === 'clip'
              ? 'c = ' + formatData(session.result.options.clipNorm)
              : session.result.options.intervention === 'augmentation'
                ? 'receta = ' +
                  session.result.options.augmentationPolicy +
                  ', σ = ' +
                  formatData(session.result.options.augmentationSigma) +
                  ', copias = ' +
                  session.result.options.augmentationCopies
                : session.result.options.intervention === 'bn'
                  ? 'ε = 0,00001; memoria = 0,9'
                  : session.result.options.intervention === 'dropout'
                    ? 'p = ' + formatData(session.result.options.dropoutRate)
                    : session.result.options.intervention === 'early'
                      ? 'paciencia = ' +
                        session.result.options.patience +
                        ', mejora mínima = ' +
                        formatData(session.result.options.minDelta)
                      : 'λ = ' + formatData(session.result.options.lambda)
          }}.
        </p>
        <p>
          Misma inicialización:
          {{
            session.result.runs[0]!.initialHash === session.result.runs[1]!.initialHash
              ? 'sí'
              : 'no'
          }}. Test reservado: {{ session.result.counts.test }} muestras.
        </p>
        <p v-if="session.result.options.intervention === 'augmentation'">
          El aumento conserva el máximo de épocas y el tamaño de lote, pero añade filas y puede
          aumentar las actualizaciones y el coste. La tabla declara ambos; no es una comparación con
          presupuesto de actualizaciones igualado. Las pérdidas de train se miden en los mismos
          originales.
        </p>
        <div
          class="data-table-scroll"
          tabindex="0"
          role="region"
          aria-label="Desplazamiento de la tabla comparativa"
        >
          <table class="dataset-table" aria-label="Comparación de generalización">
            <thead>
              <tr>
                <th scope="col">Ensayo</th>
                <th scope="col">Épocas observadas / estado seleccionado</th>
                <th scope="col">Filas train / actualizaciones</th>
                <th scope="col">Pérdida train</th>
                <th scope="col">Pérdida validación</th>
                <th scope="col">Penalización</th>
                <th scope="col">
                  {{
                    session.result.options.intervention === 'augmentation'
                      ? 'Originales + penalización'
                      : 'Objetivo train'
                  }}
                </th>
                <th scope="col">‖W‖₂</th>
                <th scope="col">|w| &lt; 0,01</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="run in session.result.runs" :key="run.label">
                <th scope="row">{{ run.label }}</th>
                <td>
                  {{
                    run.experiment.checkpoint.earlyStopping?.stoppedAt ??
                    run.experiment.checkpoint.epoch
                  }}
                  / {{ run.experiment.checkpoint.epoch }}
                </td>
                <td>{{ run.trainingRows }} / {{ run.experiment.checkpoint.updates }}</td>
                <td>{{ formatData(run.experiment.checkpoint.history.at(-1)!.trainLoss) }}</td>
                <td>{{ formatData(run.experiment.checkpoint.history.at(-1)!.validationLoss) }}</td>
                <td>
                  {{ formatData(run.experiment.checkpoint.history.at(-1)!.regularizationPenalty!) }}
                </td>
                <td>{{ formatData(run.experiment.checkpoint.history.at(-1)!.trainObjective!) }}</td>
                <td>{{ formatData(run.weightNorm) }}</td>
                <td>{{ run.smallWeights }} / {{ run.weights }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Las pérdidas de datos son comparables entre ensayos. Con aumento, el objetivo mostrado
          evalúa originales y penalización; el gradiente usa el lote efectivo con copias. El
          objetivo suma la penalización y cambia al cambiar λ. L1 aquí usa subgradiente (signo cero
          en w = 0), no un operador proximal: no promete pesos exactamente nulos. L2 es acoplada al
          gradiente, también con Adam.
        </p>
      </section>
      <div class="comparison-curves">
        <section v-for="run in session.result.runs" :key="run.label" class="training-panel">
          <h2>{{ run.label }}</h2>
          <LossChart :history="run.experiment.checkpoint.history" />
        </section>
      </div>
      <section class="training-panel">
        <h2>Inspecciona un ensayo</h2>
        <label class="inspection-select"
          >Ensayo para inspeccionar<select
            v-model.number="selected"
            :disabled="opening || session.busy"
          >
            <option :value="0">Referencia</option>
            <option :value="1">Intervención</option>
          </select></label
        >
        <label class="training-check"
          ><input v-model="animate" type="checkbox" :disabled="prefs.reducedMotion" />Animar el
          esquema de conexiones (velocidad en Ajustes)</label
        >
        <p class="small muted">
          El movimiento es una guía visual; no representa pasos adicionales de entrenamiento. Los
          pesos y medidas pertenecen al ensayo seleccionado.
        </p>
        <NetworkDiagram
          tabindex="0"
          role="region"
          aria-label="Esquema de pesos del ensayo; desplazamiento horizontal con teclado"
          :model="session.result.runs[selected]!.experiment.checkpoint.model"
          :layer="0"
          :neuron="0"
          :phase="1"
          :playing="animate && !prefs.reducedMotion"
          :speed="prefs.value.speed"
        />
        <div class="training-toolbar">
          <button
            class="button secondary"
            :disabled="opening || session.busy"
            @click="download(false)"
          >
            Exportar ensayo JSON</button
          ><button
            class="button primary"
            :disabled="opening || session.busy || training.running || training.evaluating"
            @click="confirm = true"
          >
            Abrir ensayo en entrenamiento
          </button>
        </div>
        <div
          v-if="confirm"
          ref="confirmation"
          tabindex="-1"
          role="group"
          aria-label="Confirmar apertura del ensayo"
        >
          <p>
            Se sustituirá el espacio de trabajo por este ensayo completo. Se abrirá detenido al
            terminar sus épocas. Podrás evaluar validación y exportar el modelo; para otro horizonte
            de entrenamiento crea un experimento nuevo.
          </p>
          <button class="button" :disabled="opening" @click="open">Confirmar apertura</button
          ><button class="button secondary" :disabled="opening" @click="confirm = false">
            Volver sin cambiar
          </button>
        </div>
      </section>
      <GradientControlPanel
        :control="session.result.runs[selected]!.experiment.checkpoint.gradientControl!"
        :updates="session.result.runs[selected]!.experiment.checkpoint.updates"
      />
      <EarlyStoppingPanel
        v-if="session.result.runs[selected]!.experiment.checkpoint.earlyStopping"
        :state="session.result.runs[selected]!.experiment.checkpoint"
        :config="session.result.runs[selected]!.experiment.config.earlyStopping!"
      />
      <BatchNormalizationPanel
        v-if="session.result.runs[selected]!.experiment.config.spec.batchNormalization"
        :model="session.result.runs[selected]!.experiment.checkpoint.model"
        :statistics="session.result.runs[selected]!.experiment.checkpoint.batchStatistics"
        :configured-size="session.result.runs[selected]!.experiment.config.batchSize"
      />
      <AugmentationPanel
        v-if="session.result.runs[selected]!.augmentation"
        :report="session.result.runs[selected]!.augmentation!"
      />
      <DropoutPanel
        v-if="session.result.runs[selected]!.experiment.checkpoint.dropout"
        :state="session.result.runs[selected]!.experiment.checkpoint.dropout!"
        :config="session.result.runs[selected]!.experiment.config.dropout!"
      />
    </template>
    <section class="training-panel">
      <h2>Explica lo que observas</h2>
      <p>
        {{ questions[(session.result?.options ?? session.options).intervention] }} Compara la
        pérdida de validación, la magnitud de los pesos y la brecha con train. Repite con otras
        semillas antes de sacar conclusiones; dos curvas de una semilla no descomponen sesgo y
        varianza.
      </p>
      <p>
        L1/L2 buscan modificar el objetivo de aprendizaje. El recorte controla la magnitud del
        gradiente; no es una prueba de menor sobreajuste ni limita directamente el paso de Adam.
      </p>
      <p class="small muted">
        El estudio multisemilla describe variación del entrenamiento con datos fijos. Con parada
        temprana, las curvas superiores muestran el modelo seleccionado; el panel específico
        conserva además las épocas observadas antes de restaurar.
      </p>
    </section>
  </div>
</template>
<style scoped>
.comparison-curves {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.generalization-page fieldset {
  min-width: 0;
}
.generalization-page input,
.generalization-page select {
  max-width: 100%;
}
.generalization-page p {
  overflow-wrap: anywhere;
}
.generalization-page .dataset-table {
  font-size: 0.875rem;
}
.inspection-select {
  display: grid;
  gap: 8px;
  max-width: 400px;
}
.inspection-select select {
  min-height: 44px;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink);
}
@media (max-width: 900px) {
  .comparison-curves {
    grid-template-columns: 1fr;
  }
}
</style>

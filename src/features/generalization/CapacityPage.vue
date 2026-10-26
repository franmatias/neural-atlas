<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import { capacities, type CapacityId } from '@/application/training/capacity';
import { useCapacityStore } from '@/stores/capacity';
import { useTrainingStore } from '@/stores/training';
import { usePreferencesStore } from '@/stores/preferences';
import { formatData } from '@/shared/utils/data-format';
import CapacityChart from './CapacityChart.vue';
import LossChart from '@/features/training/LossChart.vue';
import NetworkDiagram from '@/features/network/NetworkDiagram.vue';
const study = useCapacityStore(),
  training = useTrainingStore(),
  prefs = usePreferencesStore(),
  router = useRouter();
const chartCapacity = ref<CapacityId>('large'),
  animate = ref(false),
  confirm = ref(false),
  opening = ref(false),
  fileError = ref('');
const confirmation = ref<HTMLElement>();
let previousFocus: HTMLElement | null = null;
const selected = computed(() => study.result?.trials[study.selected]);
watch([() => study.selected, () => study.result], () => {
  confirm.value = false;
});
watch(confirm, async (value) => {
  if (value) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    await nextTick();
    confirmation.value?.focus();
  } else if (previousFocus?.isConnected) previousFocus.focus();
});
function start() {
  confirm.value = false;
  void study.run();
}
function download(kind: 'report' | 'experiment' | 'model') {
  fileError.value = '';
  try {
    const text = study.exportFile(kind),
      url = globalThis.URL.createObjectURL(
        new globalThis.Blob([text], { type: 'application/json' }),
      );
    const link = document.createElement('a');
    link.href = url;
    link.download = `neural-atlas-capacity.${kind}.json`;
    link.click();
    setTimeout(() => globalThis.URL.revokeObjectURL(url), 1000);
  } catch {
    fileError.value = 'No se ha exportado. Los resultados se conservan.';
  }
}
async function open() {
  if (!selected.value) return;
  opening.value = true;
  fileError.value = '';
  try {
    await training.restore(selected.value.run.experiment);
    confirm.value = false;
    await router.push('/lab/entrenamiento');
  } catch {
    fileError.value = 'No se ha abierto el ensayo. Los resultados se conservan.';
  } finally {
    opening.value = false;
  }
}
onBeforeRouteLeave(() => {
  if (study.busy) study.cancel();
});
</script>
<template>
  <div class="page training-page capacity-page">
    <p class="eyebrow">L08 / CAPACIDAD Y TAMAÑO DE DATOS</p>
    <h1>Más datos, otra capacidad.</h1>
    <p class="page-intro">
      Compara redes y tamaños sin cambiar validación. Una brecha entre curvas es una observación que
      debes explicar; no demuestra por sí sola sobreajuste ni descompone sesgo y varianza.
    </p>
    <RouterLink class="text-link" to="/lab/generalizacion"
      >Volver a regularización y semillas</RouterLink
    >
    <section class="training-panel">
      <h2>Un pool, tres tamaños y tres arquitecturas</h2>
      <p>
        120 muestras sintéticas: pool train de 72, validación fija de 24 y test de 24 reservado.
        Subconjuntos anidados y balanceados de 24, 48 y 72 filas. Cada tamaño vuelve a ajustar su
        pipeline solo con esas filas. Las filas omitidas no se usan para entrenar, escalar ni
        evaluar.
      </p>
      <p>
        Red logística 2→1, MLP pequeña 2→2→1 y amplia 2→16→16→1: 3, 9 y 337 parámetros entrenables.
        Tanh en capas ocultas, salida sigmoide, Xavier, entropía cruzada binaria (BCE), Adam (0,01)
        y lote 12. La red sin capas ocultas tiene logit lineal y frontera recta; su salida sigmoide
        no es una regresión numérica lineal.
      </p>
      <fieldset :disabled="study.busy || opening">
        <legend>Configura el estudio de capacidad</legend>
        <div class="training-fields">
          <label
            >Receta del estudio<select v-model="study.options.recipe">
              <option value="moons">Medias lunas</option>
              <option value="circles">Círculos</option>
              <option value="xor">XOR</option>
            </select></label
          >
          <label
            >Ruido del estudio<input
              v-model.number="study.options.noise"
              type="number"
              min="0"
              max="0.4"
              step="0.01"
          /></label>
          <label
            >Semilla de datos y subconjuntos<input
              v-model.number="study.options.dataSeed"
              type="number"
              min="0"
              max="4294967295"
              step="1"
          /></label>
          <label
            >Primera semilla de entrenamiento<input
              v-model.number="study.options.firstSeed"
              type="number"
              min="0"
              max="4294967295"
              step="1"
          /></label>
          <label
            >Semillas por combinación<select v-model.number="study.options.repetitions">
              <option :value="3">3 · 27 ensayos</option>
              <option :value="5">5 · 45 ensayos</option>
            </select></label
          >
          <label
            >Épocas del estudio<input
              v-model.number="study.options.epochs"
              type="number"
              min="5"
              max="120"
              step="1"
          /></label>
        </div>
      </fieldset>
      <div class="training-toolbar">
        <button class="button primary" :disabled="study.busy || opening" @click="start">
          Comparar capacidad y datos</button
        ><button v-if="study.busy" class="button secondary" @click="study.cancel()">
          Cancelar estudio
        </button>
      </div>
      <p role="status">
        {{ study.busy ? 'Calculando el estudio en un Web Worker; puedes cancelar…' : study.notice }}
      </p>
      <p v-if="study.error || fileError" role="alert">{{ study.error || fileError }}</p>
      <p class="small muted">
        Presupuesto cerrado: 27 o 45 ensayos secuenciales, máximo 120 épocas cada uno. Sin parada
        temprana, dropout, BN ni aumento en este estudio. Más filas implican más actualizaciones por
        época; no es un presupuesto de actualizaciones igualado. Los resultados completos viven en
        RAM y no sustituyen el laboratorio activo.
      </p>
    </section>
    <template v-if="study.result">
      <section class="training-panel capacity-results">
        <h2>Curvas por tamaño de train</h2>
        <p>
          Última ejecución: {{ study.result.options.recipe }} · semilla de datos
          {{ study.result.options.dataSeed }} · {{ study.result.options.repetitions }} semillas
          desde {{ study.result.options.firstSeed }} (vuelta uint32) ·
          {{ study.result.options.epochs }} épocas · ruido
          {{ formatData(study.result.options.noise) }}. Editar controles no modifica estas medidas.
        </p>
        <label class="inspection-select"
          >Arquitectura en la curva<select v-model="chartCapacity">
            <option v-for="c in capacities" :key="c.id" :value="c.id">{{ c.label }}</option>
          </select></label
        >
        <CapacityChart :summary="study.result.summary" :capacity="chartCapacity" />
        <div
          class="data-table-scroll"
          tabindex="0"
          role="region"
          aria-label="Desplazamiento de la tabla de capacidad"
        >
          <table class="dataset-table" aria-label="Resumen de capacidad y tamaño">
            <thead>
              <tr>
                <th scope="col">Arquitectura</th>
                <th scope="col">Train / sin usar</th>
                <th scope="col">Parámetros</th>
                <th scope="col">Train media ± s</th>
                <th scope="col">Validación media ± s</th>
                <th scope="col">Brecha val − train media ± s</th>
                <th scope="col">Actualizaciones por ensayo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in study.result.summary" :key="`${p.capacity}-${p.size}`">
                <th scope="row">{{ capacities.find((c) => c.id === p.capacity)!.label }}</th>
                <td>{{ p.size }} / {{ 72 - p.size }}</td>
                <td>{{ p.parameters }}</td>
                <td>{{ formatData(p.train.mean) }} ± {{ formatData(p.train.sampleDeviation) }}</td>
                <td>
                  {{ formatData(p.validation.mean) }} ±
                  {{ formatData(p.validation.sampleDeviation) }}
                </td>
                <td>{{ formatData(p.gap.mean) }} ± {{ formatData(p.gap.sampleDeviation) }}</td>
                <td>{{ (p.size / 12) * study.result.options.epochs }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          La desviación muestral usa n − 1. La brecha se calcula por ensayo antes de agregar; train
          no contiene las mismas filas en todos los tamaños. Para una arquitectura y semilla, los
          pesos iniciales coinciden entre tamaños. Entre arquitecturas cambian dimensiones y pesos:
          una misma semilla no significa el mismo modelo.
        </p>
        <p>
          Más capacidad no garantiza memorizar y más datos no garantizan menor pérdida en cada
          ejecución. Horizonte, optimizador, ruido y muestra de validación afectan al resultado.
          Estas curvas describen los datos observados; no estiman error irreducible ni incertidumbre
          sobre datasets nuevos. Test no se consulta ni se elige un ganador automático.
        </p>
        <button
          class="button secondary"
          :disabled="study.busy || opening"
          @click="download('report')"
        >
          Exportar informe de capacidad
        </button>
        <p class="small muted">
          El informe es JSON de análisis, no un experimento importable. Los botones de cada ensayo
          conservan su modelo o su estado completo.
        </p>
      </section>
      <section v-if="selected" class="training-panel capacity-inspection">
        <h2>Inspecciona un ensayo de capacidad</h2>
        <label class="inspection-select"
          >Ensayo de capacidad<select
            v-model.number="study.selected"
            :disabled="study.busy || opening"
          >
            <option v-for="(t, index) in study.result.trials" :key="index" :value="index">
              {{ t.run.label }} · train {{ t.size }} · semilla {{ t.seed }}
            </option>
          </select></label
        >
        <p>
          {{ selected.parameters }} parámetros · {{ selected.size }} filas train ·
          {{ selected.run.experiment.checkpoint.updates }} actualizaciones · test reservado: 24
          filas. El checkpoint conserva las filas omitidas como datos sin usar y el pipeline de su
          subconjunto.
        </p>
        <LossChart :history="selected.run.experiment.checkpoint.history" />
        <label class="training-check"
          ><input v-model="animate" type="checkbox" :disabled="prefs.reducedMotion" />Animar
          conexiones del ensayo (velocidad en Ajustes)</label
        >
        <p class="small muted">
          El movimiento es una guía visual; no añade entrenamiento. La gráfica superior usa tamaños
          de datos; estas curvas inferiores recorren épocas del ensayo seleccionado.
        </p>
        <NetworkDiagram
          tabindex="0"
          role="region"
          aria-label="Pesos del ensayo de capacidad; desplazamiento horizontal con teclado"
          :model="selected.run.experiment.checkpoint.model"
          :layer="0"
          :neuron="0"
          :phase="1"
          :playing="animate && !prefs.reducedMotion"
          :speed="prefs.value.speed"
        />
        <div class="training-toolbar">
          <button
            class="button secondary"
            :disabled="study.busy || opening"
            @click="download('experiment')"
          >
            Exportar ensayo de capacidad</button
          ><button
            class="button secondary"
            :disabled="study.busy || opening"
            @click="download('model')"
          >
            Exportar modelo de capacidad</button
          ><button
            class="button primary"
            :disabled="study.busy || opening || training.running || training.evaluating"
            @click="confirm = true"
          >
            Abrir ensayo de capacidad
          </button>
        </div>
        <div
          v-if="confirm"
          ref="confirmation"
          tabindex="-1"
          role="group"
          aria-label="Confirmar apertura del ensayo de capacidad"
        >
          <p>
            Se sustituirá el laboratorio por este ensayo completo, detenido al terminar sus épocas.
            Conserva dataset, selección de train, pipeline, pesos y optimizador. Para otro
            horizonte, crea una sesión nueva.
          </p>
          <button class="button" :disabled="opening" @click="open">
            Confirmar apertura de capacidad</button
          ><button class="button secondary" :disabled="opening" @click="confirm = false">
            Volver sin cambiar
          </button>
        </div>
      </section>
    </template>
    <section class="training-panel">
      <h2>Predice, observa y explica</h2>
      <p>
        Antes de ejecutar: ¿qué esperas al aumentar filas con la misma red? ¿Y al ampliar la red con
        los mismos datos? Contrasta las pérdidas, dispersión y número de actualizaciones. Explica
        qué puedes concluir y qué necesitarías comprobar con otro dataset o presupuesto.
      </p>
    </section>
  </div>
</template>
<style scoped>
.capacity-page fieldset {
  min-width: 0;
}
.capacity-page input,
.capacity-page select {
  max-width: 100%;
}
.capacity-page p {
  overflow-wrap: anywhere;
}
.dataset-table td,
.dataset-table th {
  white-space: nowrap;
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
  background: var(--surface);
  color: var(--ink);
}
</style>

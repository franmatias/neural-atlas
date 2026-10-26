<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import type { Experiment } from '@/application/training/experiment';
import { exportExperiment } from '@/application/training/experiment';
import { modelFromExperiment, exportInferenceModel } from '@/application/training/inference-model';
import { useTrainingStore } from '@/stores/training';
import { usePreferencesStore } from '@/stores/preferences';
import LossChart from '@/features/training/LossChart.vue';
import NetworkDiagram from '@/features/network/NetworkDiagram.vue';
const props = defineProps<{ experiment: Experiment; disabled: boolean }>();
const training = useTrainingStore(),
  prefs = usePreferencesStore(),
  router = useRouter();
const confirm = ref(false),
  opening = ref(false),
  animate = ref(false),
  error = ref(''),
  confirmation = ref<HTMLElement>();
let previousFocus: HTMLElement | null = null;
watch(
  () => props.experiment,
  () => {
    confirm.value = false;
  },
);
watch(
  () => props.disabled,
  (value) => {
    if (value) confirm.value = false;
  },
);
watch(confirm, async (value) => {
  if (value) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    await nextTick();
    confirmation.value?.focus();
  } else if (previousFocus?.isConnected) previousFocus.focus();
});
function download(model: boolean) {
  error.value = '';
  try {
    const text = model
      ? exportInferenceModel(modelFromExperiment(props.experiment))
      : exportExperiment(props.experiment);
    const url = globalThis.URL.createObjectURL(
      new globalThis.Blob([text], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = model ? 'neural-atlas-study.model.json' : 'neural-atlas-study.experiment.json';
    link.click();
    setTimeout(() => globalThis.URL.revokeObjectURL(url), 1000);
  } catch {
    error.value = 'No se ha exportado. El ensayo se conserva.';
  }
}
async function open() {
  opening.value = true;
  error.value = '';
  try {
    await training.restore(props.experiment);
    confirm.value = false;
    await router.push('/lab/entrenamiento');
  } catch {
    error.value = 'No se ha abierto el ensayo. Los resultados se conservan.';
  } finally {
    opening.value = false;
  }
}
</script>
<template>
  <section class="training-panel study-inspector">
    <h2>Inspección del ensayo seleccionado</h2>
    <p>
      Semilla {{ experiment.config.seed }} · época seleccionada {{ experiment.checkpoint.epoch }} ·
      actualizaciones en el checkpoint {{ experiment.checkpoint.updates }} · consulta previa de
      test: {{ experiment.testConsulted ? 'sí' : 'no' }}.
    </p>
    <LossChart :history="experiment.checkpoint.history" />
    <label class="training-check"
      ><input v-model="animate" type="checkbox" :disabled="prefs.reducedMotion" />Animar conexiones
      de la inspección (velocidad en Ajustes)</label
    >
    <p class="small">
      El movimiento es una guía visual y no realiza actualizaciones. Con parada temprana, estas
      curvas llegan al estado seleccionado; el archivo conserva también las épocas observadas.
    </p>
    <NetworkDiagram
      tabindex="0"
      role="region"
      aria-label="Red del ensayo seleccionado; desplazamiento horizontal con teclado"
      :model="experiment.checkpoint.model"
      :layer="0"
      :neuron="0"
      :phase="1"
      :playing="animate && !prefs.reducedMotion"
      :speed="prefs.value.speed"
    />
    <div class="training-toolbar">
      <button class="button secondary" :disabled="disabled || opening" @click="download(false)">
        Exportar experimento seleccionado</button
      ><button class="button secondary" :disabled="disabled || opening" @click="download(true)">
        Exportar modelo seleccionado</button
      ><button
        class="button primary"
        :disabled="disabled || opening || training.running || training.evaluating"
        @click="confirm = true"
      >
        Abrir ensayo seleccionado
      </button>
    </div>
    <div
      v-if="confirm"
      ref="confirmation"
      tabindex="-1"
      role="group"
      aria-label="Confirmar apertura del estudio"
    >
      <p>
        Se sustituirá el laboratorio por este ensayo completo. Se conserva su pipeline, partición,
        pesos y optimizador. Abrirlo no entrena ni evalúa test.
      </p>
      <button class="button" :disabled="opening" @click="open">
        Confirmar apertura del estudio</button
      ><button class="button secondary" :disabled="opening" @click="confirm = false">
        Volver sin cambiar
      </button>
    </div>
    <p v-if="error" role="alert">{{ error }}</p>
  </section>
</template>

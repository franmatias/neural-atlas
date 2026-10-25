<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import type { TrainingState } from '@/domain/training/session';
import type { EarlyStoppingConfig } from '@/domain/training/early-stopping';
import { useTrainingStore } from '@/stores/training';
import { formatData } from '@/shared/utils/data-format';
import LossChart from './LossChart.vue';
const props = defineProps<{
    state: TrainingState;
    config: EarlyStoppingConfig;
    canContinue?: boolean;
  }>(),
  session = useTrainingStore();
const monitor = computed(() => props.state.earlyStopping);
const history = computed(() =>
  monitor.value
    ? [
        ...props.state.history.slice(0, monitor.value.anchorEpoch + 1),
        ...monitor.value.observations,
      ]
    : [],
);
const confirm = ref(false),
  group = ref<HTMLElement>(),
  heading = ref<HTMLElement>();
async function ask() {
  confirm.value = true;
  await nextTick();
  group.value?.focus();
}
async function resume() {
  session.continueFromBest();
  confirm.value = false;
  await nextTick();
  heading.value?.focus();
}
</script>
<template>
  <section v-if="monitor" class="training-panel early-stopping-panel">
    <h2 ref="heading" tabindex="-1">Validación decide cuándo parar</h2>
    <p>
      La primera época completada fija la referencia. Una mejora debe superar estrictamente
      {{ formatData(config.minDelta) }}. Paciencia: {{ config.patience }} épocas sin mejora
      suficiente.
    </p>
    <p v-if="monitor.best">
      Mejor época seleccionada: <strong>{{ monitor.best.epoch }}</strong> · pérdida de datos en
      validación: {{ formatData(monitor.bestLoss!) }} · épocas sin mejora suficiente:
      {{ monitor.badEpochs }}.
    </p>
    <p v-else>
      Aún no se ha completado la primera época; la época cero no participa en la selección.
    </p>
    <p v-if="monitor.reason" role="status" class="early-result">
      {{ monitor.reason === 'patience' ? 'Paciencia agotada' : 'Presupuesto de épocas agotado' }} en
      la época {{ monitor.stoppedAt }}. Estado restaurado de la época {{ state.epoch }},
      actualización {{ state.updates }}. Pesos, momentos del optimizador, calendario, orden y cursor
      corresponden a esa copia.
    </p>
    <p v-if="monitor.lastReport" class="small muted">
      Última continuación: se había detenido en {{ monitor.lastReport.stoppedAt }} y restaurado
      {{ monitor.lastReport.restoredEpoch }}. La vigilancia actual comienza después de la época
      {{ monitor.anchorEpoch }}.
    </p>
    <h3>Trayectoria observada {{ monitor.reason ? 'antes de restaurar' : 'hasta ahora' }}</h3>
    <LossChart :history="history" />
    <p class="small muted">
      Esta curva conserva también las épocas descartadas al restaurar. Las curvas y métricas
      principales del modelo corresponden al estado restaurado. Validación se consulta repetidamente
      para seleccionar; no sustituye una evaluación final con test reservado.
    </p>
    <details>
      <summary>Medidas de validación por época observada</summary>
      <div
        class="data-table-scroll"
        tabindex="0"
        role="region"
        aria-label="Historial de parada temprana"
      >
        <table class="dataset-table">
          <thead>
            <tr>
              <th scope="col">Época</th>
              <th scope="col">Pérdida validación</th>
              <th scope="col">Seleccionada</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="point in monitor.observations" :key="point.epoch">
              <th scope="row">{{ point.epoch }}</th>
              <td>{{ formatData(point.validationLoss) }}</td>
              <td>{{ point.epoch === monitor.best?.epoch ? 'Mejor estado' : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
    <button
      v-if="monitor.reason && canContinue"
      class="button secondary"
      :disabled="
        session.running ||
        session.evaluating ||
        state.frozen ||
        state.epoch >= (session.input?.config.epochs ?? 0)
      "
      @click="ask"
    >
      Preparar continuación desde el mejor estado
    </button>
    <div
      v-if="confirm"
      ref="group"
      tabindex="-1"
      role="group"
      aria-label="Confirmar continuación del mejor estado"
    >
      <p>
        Se reinicia la vigilancia de validación, conservando el estado restaurado y el horizonte
        original. El entrenamiento seguirá detenido hasta pulsar Entrenar o avanzar un lote. Puede
        volver a detenerse por paciencia.
      </p>
      <button class="button" @click="resume">Confirmar continuación</button
      ><button class="button secondary" @click="confirm = false">Volver sin cambiar</button>
    </div>
  </section>
</template>

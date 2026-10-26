<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useTrainingStore } from '@/stores/training';
import { segmentContext } from '@/domain/training/segments';
import { segmentRecords } from '@/domain/training/segments';
import type { OptimizerKind } from '@/domain/training/optimizer';
const session = useTrainingStore(),
  kind = ref<OptimizerKind>('adam'),
  rate = ref(0.01),
  restart = ref(false);
watch(
  () => session.state?.configHash,
  () => {
    const input = session.input;
    if (input) {
      const o = segmentContext(input.config, session.state?.updates ?? 0).optimizer;
      kind.value = o.kind;
      rate.value = o.rate;
    }
  },
  { immediate: true },
);
const locked = computed(
  () =>
    !session.state ||
    session.running ||
    session.evaluating ||
    session.consulted ||
    session.state.frozen ||
    !!session.input?.config.earlyStopping ||
    session.state.epoch >= (session.input?.config.epochs ?? 0),
);
</script>
<template>
  <section v-if="session.input && session.state" class="training-panel segment-panel">
    <h2>Segmentos del experimento</h2>
    <p>
      Cambia la tasa o el optimizador con la sesión pausada, conservando datos y arquitectura. Cada
      cambio queda registrado por actualización. Cambiar el tipo reinicia sus acumuladores;
      reiniciar pesos empieza otro tramo y rompe la continuidad de la curva.
    </p>
    <fieldset :disabled="locked">
      <legend>Nuevo tramo</legend>
      <div class="training-fields">
        <label
          >Optimizador del segmento<select v-model="kind">
            <option value="sgd">SGD</option>
            <option value="momentum">Momentum</option>
            <option value="rmsprop">RMSprop</option>
            <option value="adam">Adam</option>
          </select></label
        ><label
          >Tasa del segmento<input
            v-model.number="rate"
            type="number"
            min="0.00001"
            max="1"
            step="0.001"
        /></label>
      </div>
      <label class="check-row"
        ><input v-model="restart" type="checkbox" />Reiniciar también los pesos en el siguiente
        lote</label
      ><button class="button secondary" @click="session.appendSegment(kind, rate, restart)">
        Registrar segmento
      </button>
    </fieldset>
    <p class="small muted">
      Máximo 16 segmentos. Tras registrar uno, avanza al menos un lote antes del siguiente. No se
      permite con parada temprana, test consultado o sesión congelada. El calendario usa la época
      global; el reinicio de pesos es reproducible y no rebobina el orden de muestras.
    </p>
    <div class="data-table-scroll" tabindex="0" role="region" aria-label="Historial de segmentos">
      <table class="dataset-table" aria-label="Segmentos registrados">
        <thead>
          <tr>
            <th>Tramo</th>
            <th>Desde update</th>
            <th>Optimizador</th>
            <th>Tasa</th>
            <th>Reinicio de pesos</th>
            <th>Hash de configuración del tramo</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Inicial</th>
            <td>0</td>
            <td>{{ session.input.config.optimizer.kind }}</td>
            <td>{{ session.input.config.optimizer.rate }}</td>
            <td>No</td>
            <td>
              <code>{{ segmentRecords(session.input)[0]!.configHash.slice(0, 12) }}</code>
            </td>
          </tr>
          <tr v-for="(s, i) in session.input.config.segments" :key="s.id">
            <th>{{ s.id }}</th>
            <td>{{ s.atUpdate }}</td>
            <td>{{ s.optimizer.kind }}</td>
            <td>{{ s.optimizer.rate }}</td>
            <td>{{ s.restart ? 'Sí' : 'No' }}</td>
            <td>
              <code>{{ segmentRecords(session.input)[i + 1]!.configHash.slice(0, 12) }}</code>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

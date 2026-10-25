<script setup lang="ts">
import { computed } from 'vue';
import { useTrainingStore } from '@/stores/training';
const session = useTrainingStore();
const enabled = computed({
  get: () => !!session.config.earlyStopping,
  set: (value: boolean) => {
    if (value) session.config.earlyStopping = { patience: 10, minDelta: 0.001 };
    else delete session.config.earlyStopping;
  },
});
const patience = computed({
  get: () => session.config.earlyStopping?.patience ?? 10,
  set: (value: number) => {
    if (session.config.earlyStopping) session.config.earlyStopping.patience = value;
  },
});
const minDelta = computed({
  get: () => session.config.earlyStopping?.minDelta ?? 0.001,
  set: (value: number) => {
    if (session.config.earlyStopping) session.config.earlyStopping.minDelta = value;
  },
});
</script>
<template>
  <section>
    <label class="training-check"
      ><input v-model="enabled" type="checkbox" />Activar parada temprana con validación</label
    >
    <div v-if="enabled" class="training-fields">
      <label
        >Paciencia en épocas<input
          v-model.number="patience"
          type="number"
          min="5"
          max="100"
          step="1"
      /></label>
      <label
        >Mejora mínima de validación<input
          v-model.number="minDelta"
          type="number"
          min="0"
          max="0.01"
          step="0.0001"
      /></label>
    </div>
    <p v-if="enabled" class="small muted">
      La primera época completada fija el mejor valor. Mejora cuando mejor − actual &gt; mejora
      mínima. Al agotar paciencia o épocas se restaura el mejor estado completo, incluido el
      optimizador. No usa test ni la penalización L1/L2 para decidir.
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTrainingStore } from '@/stores/training';
const session = useTrainingStore();
const enabled = computed({
  get: () => !!session.config.dropout,
  set: (value: boolean) => {
    if (value) session.config.dropout = { rate: 0.5 };
    else delete session.config.dropout;
  },
});
const rate = computed({
  get: () => session.config.dropout?.rate ?? 0.5,
  set: (value: number) => {
    if (session.config.dropout) session.config.dropout.rate = value;
  },
});
</script>
<template>
  <section>
    <label class="training-check"
      ><input v-model="enabled" type="checkbox" />Activar dropout invertido</label
    >
    <label v-if="enabled"
      >Probabilidad de abandono p<input
        v-model.number="rate"
        type="number"
        min="0"
        max="0.8"
        step="0.05"
    /></label>
    <p v-if="enabled" class="small muted">
      Requiere al menos una capa oculta. Cada muestra usa una máscara nueva. En entrenamiento, las
      unidades conservadas se multiplican por 1/(1−p); validación y predicción usan todas las
      unidades sin reescalar. Los pesos siguen existiendo. p = 0 desactiva el efecto.
    </p>
  </section>
</template>

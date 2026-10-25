<script setup lang="ts">
import { computed } from 'vue';
import { useTrainingStore } from '@/stores/training';
const session = useTrainingStore();
const enabled = computed({
  get: () => !!session.config.spec.batchNormalization,
  set: (value: boolean) => {
    if (value) session.config.spec.batchNormalization = true;
    else delete session.config.spec.batchNormalization;
  },
});
</script>
<template>
  <section>
    <label class="training-check"
      ><input v-model="enabled" type="checkbox" />Activar normalización por lotes (BN)</label
    >
    <p v-if="enabled" class="small muted">
      Dense → BN → activación → dropout opcional. Requiere alguna capa oculta y lote de al menos 2.
      Una cola de una muestra se combina con el lote anterior. Gamma y beta se aprenden; las medias
      móviles se usan en evaluación. ε = 0,00001; memoria de la media móvil = 0,9.
    </p>
  </section>
</template>

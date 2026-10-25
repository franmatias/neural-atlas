<script setup lang="ts">
import { computed } from 'vue';
import { useTrainingStore } from '@/stores/training';
import { useDatasetsStore } from '@/stores/datasets';
import { supportedAugmentation } from '@/domain/data/augmentation';
const session = useTrainingStore(),
  data = useDatasetsStore(),
  policy = computed(() => supportedAugmentation(data.dataset));
const enabled = computed({
  get: () => !!session.config.augmentation,
  set: (value: boolean) => {
    if (value && policy.value)
      session.config.augmentation = { policy: policy.value, sigma: 0.01, copies: 1, seed: 42 };
    else delete session.config.augmentation;
  },
});
const sigma = computed({
  get: () => session.config.augmentation?.sigma ?? 0.01,
  set: (value: number) => {
    if (session.config.augmentation) session.config.augmentation.sigma = value;
  },
});
const copies = computed({
  get: () => session.config.augmentation?.copies ?? 1,
  set: (value: number) => {
    if (session.config.augmentation) session.config.augmentation.copies = value;
  },
});
const seed = computed({
  get: () => session.config.augmentation?.seed ?? 42,
  set: (value: number) => {
    if (session.config.augmentation) session.config.augmentation.seed = value;
  },
});
</script>
<template>
  <section>
    <label class="training-check"
      ><input v-model="enabled" type="checkbox" :disabled="!policy && !enabled" />Activar aumento
      conservador de train</label
    >
    <p v-if="!policy" class="small muted">
      Disponible para círculos y XOR sintéticos con receta. Lunas, otras recetas y datos sin
      política conocida no reciben transformaciones automáticas.
    </p>
    <div v-if="enabled" class="training-fields">
      <label
        >Desviación del aumento σ<input
          v-model.number="sigma"
          type="number"
          min="0"
          max="0.01"
          step="0.001" /></label
      ><label
        >Copias solicitadas por original<input
          v-model.number="copies"
          type="number"
          min="1"
          max="3"
          step="1" /></label
      ><label
        >Semilla del aumento<input
          v-model.number="seed"
          type="number"
          min="0"
          max="4294967295"
          step="1"
      /></label>
    </div>
    <p v-if="enabled" class="small muted">
      Copias fijas por experimento, solo de train y antes del escalado ya ajustado. Radio máximo
      0,03, margen mínimo 0,03 y hasta 10 intentos. Se rechazan etiquetas alteradas y fuentes no
      válidas. σ = 0 genera duplicados exactos. Las curvas y métricas de train usan solo originales.
    </p>
  </section>
</template>

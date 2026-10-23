<script setup lang="ts">
import { computed } from 'vue';
import { useTrainingStore } from '@/stores/training';
import { defaultRegularization, type Regularization } from '@/domain/training/regularization';
const session = useTrainingStore();
function field(key: keyof Regularization) {
  return computed({
    get: () => session.config.regularization?.[key] ?? 0,
    set: (value: number) => {
      session.config.regularization = {
        ...defaultRegularization,
        ...session.config.regularization,
        [key]: value,
      };
    },
  });
}
const l1 = field('l1'),
  l2 = field('l2'),
  clip = field('clipNorm');
</script>
<template>
  <details>
    <summary>Regularización y control del gradiente</summary>
    <div class="training-fields">
      <label
        >Coeficiente L1<input v-model.number="l1" type="number" min="0" max="0.1" step="0.001"
      /></label>
      <label
        >Coeficiente L2<input v-model.number="l2" type="number" min="0" max="0.1" step="0.001"
      /></label>
      <label
        >Norma máxima del gradiente<input
          v-model.number="clip"
          type="number"
          min="0"
          max="100"
          step="0.1"
        /><span class="small muted">0 desactiva el recorte. Activado: 0,1–100.</span></label
      >
    </div>
    <p class="small muted">
      L1 y L2 penalizan pesos, sin sesgos: λ₁Σ|w| + ½λ₂Σw². Se añaden al gradiente medio del lote
      antes del recorte global de pesos y sesgos. Con Adam es L2 acoplada; no es AdamW. Las curvas
      muestran pérdida de datos, sin penalización.
    </p>
    <RouterLink to="/lab/generalizacion" class="text-link"
      >Comparar una intervención con la referencia →</RouterLink
    >
  </details>
</template>

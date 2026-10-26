<script setup lang="ts">
import type { DecisionOptions, DecisionMode } from '@/application/training/decision-study';
import {
  binaryRecipes,
  multiRecipes,
  decisionRecipeNames,
} from '@/application/training/decision-study';
defineProps<{ mode: DecisionMode; disabled: boolean }>();
const options = defineModel<DecisionOptions>({ required: true });
const emit = defineEmits<{ reset: [clear: boolean] }>();
function layers(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  options.value.hidden = value ? value.split(',').map(Number) : [];
}
</script>
<template>
  <fieldset class="decision-controls" :disabled="disabled">
    <legend>Configura el experimento</legend>
    <label
      >Conjunto de datos<select v-model="options.recipe">
        <option v-for="r in mode === 'binary' ? binaryRecipes : multiRecipes" :key="r" :value="r">
          {{ decisionRecipeNames[r] }}
        </option>
      </select></label
    >
    <label v-if="mode === 'multiclass'"
      >Número de clases<select v-model.number="options.classes">
        <option :value="3">3 clases</option>
        <option :value="4">4 clases</option>
      </select></label
    >
    <label
      >Ruido de entrada · {{ options.noise.toFixed(2)
      }}<input v-model.number="options.noise" type="range" min="0" max="0.4" step="0.01"
    /></label>
    <label
      >Semilla reproducible<input
        v-model.number="options.seed"
        type="number"
        min="0"
        max="4294967295"
        step="1"
    /></label>
    <label
      >Arquitectura oculta<select :value="options.hidden.join(',')" @change="layers">
        <option value="">Sin ocultas · lineal</option>
        <option value="4">Una capa · 4</option>
        <option value="8">Una capa · 8</option>
        <option value="8,8">Dos capas · 8 → 8</option>
        <option value="16,16">Dos capas · 16 → 16</option>
      </select></label
    >
    <label
      >Activación oculta<select v-model="options.activation">
        <option value="tanh">Tanh</option>
        <option value="relu">ReLU</option>
        <option value="leakyRelu">Leaky ReLU</option>
        <option value="sigmoid">Sigmoide</option>
        <option value="linear">Lineal</option>
      </select></label
    >
    <label
      >Optimizador<select v-model="options.optimizer">
        <option value="adam">Adam</option>
        <option value="sgd">SGD</option>
        <option value="momentum">Momentum</option>
        <option value="rmsprop">RMSprop</option>
      </select></label
    >
    <label
      >Tasa de aprendizaje<input
        v-model.number="options.rate"
        type="number"
        min="0.0001"
        max="1"
        step="0.005"
    /></label>
    <label
      >Regularización L2<input
        v-model.number="options.l2"
        type="number"
        min="0"
        max="0.1"
        step="0.001"
    /></label>
    <label
      >Tamaño de lote<select v-model.number="options.batchSize">
        <option :value="1">1 · SGD por muestra</option>
        <option :value="16">16 · Mini-batch</option>
        <option :value="32">32 · Mini-batch</option>
        <option :value="512">Completo · Batch</option>
      </select></label
    >
    <label
      >Épocas máximas<input
        v-model.number="options.epochs"
        type="number"
        min="1"
        max="500"
        step="1"
    /></label>
    <p class="small muted">
      El lote determina cuántas muestras se usan por actualización; el optimizador determina cómo se
      actualizan los parámetros. Los controles se aplican al reiniciar.
    </p>
    <button class="button primary" type="button" @click="emit('reset', false)">
      Aplicar y reiniciar red
    </button>
    <button class="button secondary" type="button" @click="emit('reset', true)">
      Regenerar sin puntos añadidos
    </button>
  </fieldset>
</template>
<style scoped>
.decision-controls {
  display: grid;
  gap: 14px;
  border: 0;
  padding: 0;
  min-width: 0;
}
legend {
  font-weight: 700;
  margin-bottom: 16px;
}
label {
  display: grid;
  gap: 6px;
  font-size: 0.9rem;
  min-width: 0;
}
select,
input[type='number'] {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  border: 1px solid var(--line);
  border-radius: 9px;
  padding: 8px;
  background: var(--surface);
  color: var(--ink);
}
button {
  width: 100%;
  white-space: normal;
}
</style>

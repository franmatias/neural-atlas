<script setup lang="ts">
import { computed } from 'vue';
import { useTrainingStore } from '@/stores/training';
import RegularizationControls from './RegularizationControls.vue';
import EarlyStoppingControls from './EarlyStoppingControls.vue';
import DropoutControls from './DropoutControls.vue';
import BatchNormalizationControls from './BatchNormalizationControls.vue';
import AugmentationControls from './AugmentationControls.vue';
const session = useTrainingStore();
const hidden = computed({
  get: () => session.config.spec.hidden.join(', '),
  set: (value: string) => {
    session.config.spec.hidden = value.trim() ? value.split(',').map(Number) : [];
  },
});
</script>
<template>
  <fieldset class="training-controls" :disabled="session.locked || session.busy">
    <legend>Configura tu experimento</legend>
    <div class="training-fields">
      <label
        >Capas ocultas<input v-model="hidden" placeholder="8, 8" /><span class="small muted"
          >Deja vacío para una regresión lineal o logística. Hasta 6 capas de 64 neuronas.</span
        ></label
      >
      <label
        >Activación oculta<select v-model="session.config.spec.activation">
          <option value="tanh">Tanh</option>
          <option value="relu">ReLU</option>
          <option value="sigmoid">Sigmoide</option>
          <option value="leakyRelu">Leaky ReLU</option>
          <option value="linear">Lineal</option>
        </select></label
      >
      <label
        >Inicialización<select v-model="session.config.initialization">
          <option value="xavier">Xavier / Glorot</option>
          <option value="he">He</option>
          <option value="zero">Cero (experimento de simetría)</option>
        </select></label
      >
      <label
        >Semilla del modelo<input
          v-model.number="session.config.seed"
          type="number"
          min="0"
          max="4294967295"
          step="1"
      /></label>
      <label
        >Optimizador<select v-model="session.config.optimizer.kind">
          <option value="sgd">SGD</option>
          <option value="momentum">Momentum</option>
          <option value="rmsprop">RMSprop</option>
          <option value="adam">Adam</option>
        </select></label
      >
      <label
        >Tasa de aprendizaje<input
          v-model.number="session.config.optimizer.rate"
          type="number"
          min="0.00001"
          max="1"
          step="0.001"
      /></label>
      <label
        >Épocas máximas<input
          v-model.number="session.config.epochs"
          type="number"
          min="1"
          max="10000"
          step="1"
      /></label>
      <label
        >Tamaño de lote<input
          v-model.number="session.config.batchSize"
          type="number"
          min="1"
          max="10000"
          step="1"
        /><span class="small muted"
          >1: estocástico; menos que train: mini-batch; igual a train: lote completo.</span
        ></label
      >
      <label
        >Calendario de tasa<select v-model="session.config.optimizer.scheduler">
          <option value="constant">Constante</option>
          <option value="step">Escalones: mitad por periodo</option>
          <option value="cosine">Coseno hasta el mínimo</option>
        </select></label
      >
      <label
        >Periodo del calendario<input
          v-model.number="session.config.optimizer.period"
          type="number"
          min="1"
          step="1"
      /></label>
      <label
        >Tasa mínima<input
          v-model.number="session.config.optimizer.minimum"
          type="number"
          min="0.00001"
          :max="session.config.optimizer.rate"
          step="0.00001"
      /></label>
      <label
        >Pérdida de regresión<select v-model="session.config.loss">
          <option value="mse">MSE</option>
          <option value="mae">MAE</option></select
        ><span class="small muted"
          >Clasificación usa BCE con sigmoide o entropía cruzada con softmax.</span
        ></label
      >
    </div>
    <RegularizationControls />
    <EarlyStoppingControls />
    <DropoutControls />
    <BatchNormalizationControls />
    <AugmentationControls />
    <details>
      <summary>Parámetros del optimizador</summary>
      <div class="training-fields">
        <label
          >Momento<input
            v-model.number="session.config.optimizer.momentum"
            type="number"
            min="0"
            max="0.9999"
            step="0.01" /></label
        ><label
          >Rho (RMSprop)<input
            v-model.number="session.config.optimizer.rho"
            type="number"
            min="0"
            max="0.9999"
            step="0.01" /></label
        ><label
          >Beta 1 (Adam)<input
            v-model.number="session.config.optimizer.beta1"
            type="number"
            min="0"
            max="0.9999"
            step="0.01" /></label
        ><label
          >Beta 2 (Adam)<input
            v-model.number="session.config.optimizer.beta2"
            type="number"
            min="0"
            max="0.99999"
            step="0.001" /></label
        ><label
          >Épsilon<input
            v-model.number="session.config.optimizer.epsilon"
            type="number"
            min="0.000000000001"
            max="0.01"
            step="0.00000001"
        /></label>
      </div>
    </details>
  </fieldset>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { TrainingConfig } from '@/domain/training/session';
import type { PipelineOptions } from '@/domain/data/pipeline';
import type { FeatureSpec } from '@/domain/data/types';
const props = defineProps<{ label: string; features: FeatureSpec[]; seedDisabled?: boolean }>();
const config = defineModel<TrainingConfig>('config', { required: true });
const pipeline = defineModel<PipelineOptions>('pipeline', { required: true });
const layers = ref(config.value.spec.hidden.join(', '));
watch(
  () => config.value,
  (value) => {
    layers.value = value.spec.hidden.join(', ');
  },
);
function updateLayers() {
  config.value.spec.hidden = layers.value.trim()
    ? layers.value.split(',').map((n) => (n.trim() ? Number(n) : NaN))
    : [];
}
function resetAdvanced() {
  const copy = { ...config.value, spec: { ...config.value.spec } };
  delete copy.regularization;
  delete copy.dropout;
  delete copy.earlyStopping;
  delete copy.augmentation;
  delete copy.spec.batchNormalization;
  config.value = copy;
}
</script>
<template>
  <fieldset class="experiment-config">
    <legend>{{ label }} · configuración</legend>
    <div class="training-fields">
      <label
        >Capas ocultas {{ label
        }}<input v-model="layers" type="text" placeholder="8, 8" @input="updateLayers"
      /></label>
      <label
        >Activación oculta {{ label
        }}<select v-model="config.spec.activation">
          <option value="tanh">Tanh</option>
          <option value="relu">ReLU</option>
          <option value="leakyRelu">Leaky ReLU</option>
          <option value="sigmoid">Sigmoide</option>
          <option value="linear">Lineal</option>
        </select></label
      >
      <label
        >Optimizador {{ label
        }}<select v-model="config.optimizer.kind">
          <option value="sgd">SGD</option>
          <option value="momentum">Momentum</option>
          <option value="rmsprop">RMSprop</option>
          <option value="adam">Adam</option>
        </select></label
      >
      <label
        >Tasa de aprendizaje {{ label
        }}<input
          v-model.number="config.optimizer.rate"
          type="number"
          min="0.00001"
          max="1"
          step="0.001"
      /></label>
      <label
        >Semilla de entrenamiento {{ label
        }}<input
          v-model.number="config.seed"
          type="number"
          min="0"
          max="4294967295"
          step="1"
          :disabled="props.seedDisabled"
      /></label>
      <label
        >Escalado {{ label
        }}<select v-model="pipeline.scaling">
          <option value="standard">Estándar</option>
          <option value="robust">Robusto · mediana / IQR</option>
          <option value="minmax">Min-Max</option>
          <option value="none">Sin escalado</option>
        </select></label
      >
      <label
        >Imputación {{ label
        }}<select v-model="pipeline.imputation">
          <option value="mean">Media</option>
          <option value="median">Mediana</option>
          <option value="mode">Moda</option>
        </select></label
      >
      <label
        >Pérdida de regresión {{ label
        }}<select v-model="config.loss">
          <option value="mse">MSE</option>
          <option value="mae">MAE</option>
        </select></label
      >
    </div>
    <p class="small">
      El escalado robusto usa (x − mediana) / IQR, ajustado solo con train después de imputar. Si
      IQR es cero usa escala 1; las columnas constantes se transforman en cero. Reduce la influencia
      de extremos al estimar el centro y la escala; no elimina los outliers.
    </p>
    <p class="small">
      Capas: hasta seis enteros 1–64 separados por comas; vacío significa sin ocultas. Clasificación
      usa BCE o entropía cruzada categórica, con independencia del selector de regresión.
    </p>
    <fieldset class="feature-selection">
      <legend>Características {{ label }}</legend>
      <label v-for="f in features" :key="f.id" class="training-check"
        ><input v-model="pipeline.featureIds" :value="f.id" type="checkbox" />{{ f.name }}</label
      >
    </fieldset>
    <p class="small">
      La copia del laboratorio conserva sus ajustes avanzados: BN
      {{ config.spec.batchNormalization ? 'activo' : 'inactivo' }}, dropout
      {{ config.dropout ? config.dropout.rate : 'inactivo' }}, parada temprana
      {{ config.earlyStopping ? 'activa' : 'inactiva' }}, aumento
      {{ config.augmentation ? 'activo' : 'inactivo' }}, L1 {{ config.regularization?.l1 ?? 0 }}, L2
      {{ config.regularization?.l2 ?? 0 }}. Cambiar capas puede requerir desactivarlos.
    </p>
    <button class="button secondary" type="button" @click="resetAdvanced">
      Desactivar ajustes avanzados {{ label }}
    </button>
  </fieldset>
</template>
<style scoped>
.experiment-config {
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 18px;
}
.feature-selection {
  min-width: 0;
  border: 0;
  padding: 0;
}
input[type='text'] {
  min-height: 44px;
  padding: 10px;
  width: 100%;
  min-width: 0;
}
</style>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { DropoutConfig, DropoutState } from '@/domain/training/dropout';
import { usePreferencesStore } from '@/stores/preferences';
import { formatData } from '@/shared/utils/data-format';
const props = defineProps<{ state: DropoutState; config: DropoutConfig }>();
const prefs = usePreferencesStore(),
  layer = ref(0),
  evaluation = ref(false);
const mask = computed(() => props.state.masks[layer.value] ?? []);
const kept = computed(() => mask.value.filter(Boolean).length);
watch(
  () => props.state.masks.length,
  (size) => {
    if (layer.value >= size) layer.value = 0;
  },
);
</script>
<template>
  <section class="training-panel dropout-panel">
    <h2>Dropout: una máscara por muestra</h2>
    <p>
      p = {{ formatData(config.rate) }} · factor de las unidades conservadas en train:
      {{ formatData(1 / (1 - config.rate)) }}. Solo se enmascaran capas ocultas; entrada y salida se
      conservan.
    </p>
    <p v-if="!state.seenSamples" role="status">
      Aún no hay máscara confirmada. Avanza un lote para observar una muestra real.
    </p>
    <template v-else>
      <p class="dropout-sample">
        Última muestra del último lote confirmado: <strong>{{ state.lastSampleId }}</strong
        >. Muestras entrenadas: {{ state.seenSamples }}. Esta máscara no representa a todo el lote.
      </p>
      <label
        >Capa oculta de la máscara<select v-model.number="layer">
          <option v-for="(_, i) in state.masks" :key="i" :value="i">Capa {{ i + 1 }}</option>
        </select></label
      >
      <div class="actions">
        <button class="button secondary" :aria-pressed="!evaluation" @click="evaluation = false">
          Ver máscara de entrenamiento
        </button>
        <button class="button secondary" :aria-pressed="evaluation" @click="evaluation = true">
          Ver inferencia sin máscara
        </button>
      </div>
      <p role="status" class="dropout-mode">
        {{
          evaluation
            ? 'Inferencia: todas las unidades disponibles, factor 1.'
            : `Entrenamiento: ${kept} conservadas y ${mask.length - kept} enmascaradas en esta muestra.`
        }}
      </p>
      <ul
        class="dropout-units"
        aria-label="Estado de las neuronas ocultas"
        :style="{ '--dropout-time': (prefs.reducedMotion ? 0 : 350 / prefs.value.speed) + 'ms' }"
      >
        <li
          v-for="(bit, i) in mask"
          :key="i"
          class="dropout-unit"
          :class="{ masked: !evaluation && !bit }"
        >
          <span>h{{ i + 1 }}</span
          ><strong>{{ evaluation || bit ? 'Activa' : 'Máscara 0' }}</strong
          ><span>× {{ evaluation ? '1' : bit ? formatData(1 / (1 - config.rate)) : '0' }}</span>
        </li>
      </ul>
      <p class="small muted">
        La vista de inferencia es una explicación visual; no vuelve a entrenar ni modifica el
        checkpoint. «Activa» significa disponible: la función de activación todavía puede producir
        cero. El generador aleatorio guardado conserva la secuencia al reanudar.
      </p>
    </template>
    <p>
      Dropout introduce ruido durante train, no elimina parámetros ni garantiza menor sobreajuste.
      Las curvas de train y validación se miden con dropout desactivado para poder compararlas.
    </p>
  </section>
</template>
<style scoped>
.dropout-units {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(85px, 1fr));
  gap: 12px;
  list-style: none;
  padding: 0;
  margin-block: 16px;
}
.dropout-unit {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  border: 2px solid currentColor;
  border-radius: 20px;
  padding: 12px 4px;
  transition:
    transform var(--dropout-time),
    border-radius var(--dropout-time);
}
.dropout-unit.masked {
  border-style: dashed;
  border-radius: 4px;
  transform: scale(0.97);
}
.dropout-unit strong {
  font-size: 0.8rem;
}
</style>

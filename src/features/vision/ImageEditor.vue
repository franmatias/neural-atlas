<script setup lang="ts">
import { ref } from 'vue';
import { useVisionStore } from '@/stores/vision';
import ParameterField from '@/shared/ui/ParameterField.vue';
import MatrixMap from './MatrixMap.vue';
const study = useVisionStore(),
  row = ref(0),
  column = ref(0),
  brush = ref(1);
function paint(index: number) {
  study.paint(Math.floor(index / study.options.size), index % study.options.size, brush.value);
}
</script>
<template>
  <div class="editor">
    <MatrixMap
      :values="study.options.pixels"
      :size="study.options.size"
      label="Imagen en preparación"
      editable
      @select="paint"
    />
    <div>
      <p>
        Dibuja arrastrando o usa coordenadas (desde 0) y «Pintar píxel». La imagen en preparación se
        registra al aplicar el filtro.
      </p>
      <ParameterField
        id="vision-brush"
        v-model="brush"
        label="Intensidad del pincel"
        :min="0"
        :max="1"
        :step="0.1"
      /><ParameterField
        id="vision-row"
        v-model="row"
        label="Fila del píxel"
        :min="0"
        :max="study.options.size - 1"
        :step="1"
      /><ParameterField
        id="vision-col"
        v-model="column"
        label="Columna del píxel"
        :min="0"
        :max="study.options.size - 1"
        :step="1"
      /><button
        class="button secondary"
        :disabled="study.busy"
        @click="study.paint(row, column, brush)"
      >
        Pintar píxel
      </button>
    </div>
  </div>
</template>
<style scoped>
.editor {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  align-items: start;
}
@media (max-width: 700px) {
  .editor {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup lang="ts">
import { ref } from 'vue';
import {
  realDataset,
  realDatasetCards,
  realDatasetProvenance,
  type RealDatasetId,
} from '@/application/data/real-datasets';
import { useDatasetsStore } from '@/stores/datasets';
const data = useDatasetsStore(),
  notice = ref(''),
  error = ref('');
function load(id: RealDatasetId) {
  error.value = '';
  try {
    data.importData(realDataset(id));
    notice.value = `${id === 'iris' ? 'Iris' : 'Wine'} cargado sin división ni escalado. Prepara train/validación/test antes de entrenar.`;
  } catch {
    error.value = 'No se cargó: fuente o integridad no válidas. Se conservan los datos anteriores.';
  }
}
</script>
<template>
  <details class="real-datasets">
    <summary>Datasets reales opcionales · Iris y Wine</summary>
    <p>
      Copias locales de UCI bajo
      <a :href="realDatasetProvenance.licenseUrl" target="_blank" rel="noreferrer">CC BY 4.0</a>.
      Cargar sustituye el dataset activo y reinicia su sesión de entrenamiento. No se descargan
      datos ni se aplican transformaciones al cargar.
    </p>
    <article v-for="card in realDatasetCards" :key="card.id">
      <h3>{{ card.title }}</h3>
      <p>{{ card.note }}</p>
      <p>
        {{ card.rows }} muestras · {{ card.features }} características · {{ card.creator }}.
        <a :href="card.source" target="_blank" rel="noreferrer">Ficha UCI de {{ card.id }}</a> ·
        <a :href="card.doi" target="_blank" rel="noreferrer">Cita y DOI</a>.
      </p>
      <details>
        <summary>Archivo e integridad de {{ card.id }}</summary>
        <p>
          {{ card.file }} · SHA-256 <code>{{ realDatasetProvenance.hashes[card.file] }}</code
          >. Copia consultada {{ realDatasetProvenance.retrieved }}. Sin ediciones de valores;
          nombres traducidos e IDs secuenciales.
        </p>
      </details>
      <button class="button secondary" :disabled="data.busy" @click="load(card.id)">
        Cargar {{ card.id === 'iris' ? 'Iris' : 'Wine' }} y sustituir datos
      </button>
    </article>
    <p>
      La procedencia y las escalas importan. Ajusta el escalado solo con train. Estos conjuntos
      pequeños no representan todos los casos reales. Wine mantiene trece variables; los estudios X1
      acotados a ocho columnas crudas conservan su límite.
    </p>
    <p role="status">{{ notice }}</p>
    <p role="alert">{{ error }}</p>
  </details>
</template>
<style scoped>
.real-datasets {
  border: 1px solid var(--line);
  border-radius: 1rem;
  padding: 1rem;
  margin: 1rem 0;
}
summary {
  cursor: pointer;
  font-weight: 700;
}
article {
  border-top: 1px solid var(--line);
  padding: 1rem 0;
}
code {
  overflow-wrap: anywhere;
}
p {
  margin: 0.5rem 0;
}
</style>

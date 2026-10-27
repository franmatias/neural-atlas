<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useCatalogStore } from '@/stores/catalog';
import { coreRecords } from '@/content/core-records';
import { readLearning, downloadLearning } from '@/infrastructure/files/learning';
const catalog = useCatalogStore(),
  fileError = ref(''),
  remove = ref('');
onMounted(() => catalog.load());
async function select(event: Event) {
  const input = event.target as HTMLInputElement,
    file = input.files?.[0];
  if (!file) return;
  fileError.value = '';
  try {
    await catalog.inspect(await readLearning(file, 4));
  } catch (e) {
    fileError.value = e instanceof Error ? e.message : 'Archivo ilegible.';
  } finally {
    input.value = '';
  }
}
function example() {
  const concept = globalThis.structuredClone(coreRecords.find((c) => c.id === 'C021')!);
  concept.id = 'C653';
  concept.slug = 'neurona-ejemplo-local';
  concept.title.es = 'Neurona: ejemplo local';
  concept.prerequisiteIds = ['C021'];
  concept.relatedIds = [];
  downloadLearning(
    {
      format: 'neural-atlas.concept-pack',
      schemaVersion: 1,
      packId: 'ejemplo-local',
      version: '1.0.0',
      title: 'Ejemplo editable',
      categories: [],
      concepts: [concept],
    },
    'conceptos-ejemplo.json',
  );
}
</script>
<template>
  <div class="page learning-page">
    <p class="eyebrow">CATÁLOGO ABIERTO</p>
    <h1>Amplía los conceptos.</h1>
    <p class="page-intro">
      152 fichas fundamentales y 500 términos de consulta. Importa nuevas fichas con IDs estables,
      preguntas y relaciones comprobadas.
    </p>
    <RouterLink to="/glosario">Volver al glosario</RouterLink>
    <section class="panel">
      <h2>Importar un paquete</h2>
      <p>
        JSON UTF-8 · hasta 4 MiB y 500 fichas por archivo. Nunca se ejecuta contenido del archivo.
        Los paquetes locales se muestran como no revisados editorialmente.
      </p>
      <label
        >Archivo de conceptos
        <input
          type="file"
          accept=".json,application/json"
          :disabled="catalog.busy || catalog.saving || !catalog.loaded"
          @change="select"
      /></label>
      <button class="button secondary" @click="example">Descargar ejemplo editable</button>
      <button v-if="catalog.busy" class="button secondary" @click="catalog.cancel">
        Cancelar validación
      </button>
      <p role="alert">{{ fileError || catalog.error }}</p>
      <p role="status">{{ catalog.notice }}</p>
      <div v-if="catalog.preview">
        <h3>{{ catalog.preview.pack.title }} · {{ catalog.preview.pack.version }}</h3>
        <p>
          Procedencia: archivo local, sin revisión editorial.
          {{ catalog.preview.changes.length }} cambios. Confirma para modificar el catálogo de este
          navegador.
        </p>
        <details>
          <summary>Inspeccionar fichas y cambios</summary>
          <ul>
            <li v-for="c in catalog.preview.pack.concepts" :key="c.id">
              {{ c.id }} · {{ c.title.es }} · v{{ c.contentVersion }} · {{ c.status }}
            </li>
          </ul>
          <pre>{{ catalog.preview.changes }}</pre>
        </details>
        <button
          class="button primary"
          :disabled="catalog.saving || catalog.preview.unchanged"
          @click="catalog.confirm"
        >
          Confirmar y guardar
        </button>
        <button
          class="button secondary"
          :disabled="catalog.saving || catalog.preview.unchanged"
          @click="catalog.useMemory"
        >
          Usar solo en memoria
        </button>
        <button
          class="button secondary"
          @click="downloadLearning(catalog.preview.pack, 'conceptos-previsualizados.json')"
        >
          Exportar previsualización
        </button>
      </div>
    </section>
    <section class="panel">
      <h2>Paquetes instalados {{ catalog.memory ? '· sesión en memoria' : '' }}</h2>
      <p>
        Presupuesto compartido con docencia: 16 MiB. Retirar un paquete conserva el historial de
        identidad de sus IDs.
      </p>
      <article v-for="p in catalog.state.packs" :key="p.packId">
        <h3>{{ p.title }} · {{ p.version }}</h3>
        <p>{{ p.packId }} · {{ p.concepts.length }} fichas · local / no revisado</p>
        <button class="button secondary" @click="downloadLearning(p, p.packId + '.json')">
          Exportar paquete</button
        ><button class="button secondary" @click="remove = p.packId">Retirar…</button>
        <div v-if="remove === p.packId">
          <p>
            Se retirarán estas fichas locales. Las relaciones de otros paquetes deben seguir siendo
            válidas.
          </p>
          <button
            class="button primary"
            :disabled="catalog.saving"
            @click="
              catalog.remove(p.packId);
              remove = '';
            "
          >
            Confirmar retirada</button
          ><button class="button secondary" @click="remove = ''">Conservar</button>
        </div>
      </article>
      <button
        class="button secondary"
        :disabled="catalog.busy || catalog.saving"
        @click="catalog.refresh"
      >
        Recargar catálogo guardado
      </button>
    </section>
  </div>
</template>

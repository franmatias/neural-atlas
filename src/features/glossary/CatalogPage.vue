<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useCatalogStore } from '@/stores/catalog';
import { coreRecords } from '@/content/core-records';
import { referenceConcepts } from '@/content/reference-concepts';
import { readLearning, downloadLearning } from '@/infrastructure/files/learning';
const catalog = useCatalogStore(),
  reading = ref(false),
  fileError = ref(''),
  remove = ref('');
const busy = computed(() => reading.value || catalog.busy || catalog.saving);
let readRevision = 0;
function cancelRead() {
  readRevision++;
  reading.value = false;
  catalog.cancel();
}
onBeforeRouteLeave(cancelRead);
onMounted(() => catalog.load());
async function select(event: Event) {
  const input = event.target as HTMLInputElement,
    file = input.files?.[0];
  if (!file || busy.value) return;
  const token = ++readRevision;
  reading.value = true;
  fileError.value = '';
  try {
    const text = await readLearning(file, 4);
    if (token === readRevision) await catalog.inspect(text);
  } catch (e) {
    if (token === readRevision)
      fileError.value = e instanceof Error ? e.message : 'Archivo ilegible.';
  } finally {
    input.value = '';
    if (token === readRevision) reading.value = false;
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
      {{ coreRecords.length }} fichas fundamentales y {{ referenceConcepts.length }} términos de
      consulta. Importa nuevas fichas con IDs estables, preguntas y relaciones comprobadas.
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
          :disabled="busy || !catalog.loaded"
          @change="select"
      /></label>
      <button class="button secondary" @click="example">Descargar ejemplo editable</button>
      <button v-if="catalog.busy || reading" class="button secondary" @click="cancelRead">
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
          :disabled="busy || catalog.preview.unchanged"
          @click="catalog.confirm"
        >
          Confirmar y guardar
        </button>
        <button
          class="button secondary"
          :disabled="busy || catalog.preview.unchanged"
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
        <p
          v-if="
            p.concepts.some(
              (c) => catalog.registry.nodes.find((n) => n.id === c.id)?.owner !== p.packId,
            )
          "
        >
          Algunas fichas tienen contenido incluido igual o más reciente y están inactivas. El
          paquete completo sigue disponible para exportar; publica una versión de contenido superior
          si deseas volver a activarlas.
        </p>
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
            :disabled="busy"
            @click="
              catalog.remove(p.packId);
              remove = '';
            "
          >
            Confirmar retirada</button
          ><button class="button secondary" @click="remove = ''">Conservar</button>
        </div>
      </article>
      <button class="button secondary" :disabled="busy" @click="catalog.refresh">
        Recargar catálogo guardado
      </button>
    </section>
  </div>
</template>

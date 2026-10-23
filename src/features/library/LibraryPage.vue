<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue';
import { useTrainingStore } from '@/stores/training';
import {
  ExperimentLibrary,
  LibraryError,
  type LibraryEntry,
} from '@/infrastructure/storage/experiment-library';
import type { Experiment } from '@/application/training/experiment';
import {
  readExperimentFile,
  downloadExperiment as download,
} from '@/infrastructure/files/experiments';
const session = useTrainingStore();
const library = new ExperimentLibrary();
const entries = shallowRef<LibraryEntry[]>([]);
const name = ref('Mi experimento');
const busy = ref(false),
  available = ref(false),
  message = ref(''),
  error = ref('');
const imported = shallowRef<Experiment>();
const confirmation = shallowRef<{ action: 'open' | 'remove' | 'replace'; entry: LibraryEntry }>();
const confirmationPanel = ref<HTMLElement>(),
  entriesHeading = ref<HTMLElement>();
watch(confirmation, async (value) => {
  await nextTick();
  (value ? confirmationPanel.value : entriesHeading.value)?.focus();
});
const canCapture = computed(() => !!session.state && !session.running && !session.evaluating);
const total = computed(() => entries.value.reduce((sum, entry) => sum + entry.bytes, 0));
const mib = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);
const errors: Record<string, string> = {
  UNAVAILABLE:
    'El navegador no permite guardar aquí. La sesión sigue en memoria: puedes exportarla.',
  BLOCKED: 'Otra pestaña bloquea la biblioteca. Ciérrala y vuelve a comprobar el almacenamiento.',
  CONFLICT:
    'Otra pestaña modificó este experimento. Se conserva su versión; revisa la lista actualizada antes de repetir.',
  LIMIT:
    'Límite de biblioteca: 5 experimentos, 40 MiB por experimento y nombres de 1 a 120 caracteres. Exporta una copia antes de eliminar lo que elijas.',
  QUOTA:
    'No hay espacio disponible. La versión anterior se conserva. Exporta una copia o elimina una entrada que elijas.',
  CORRUPT: 'Este registro no supera la comprobación de integridad. No se ha cargado ni eliminado.',
  MISSING: 'El experimento ya no existe. Comprueba la lista actualizada.',
};
async function refresh() {
  entries.value = await library.list();
  available.value = true;
}
async function perform(action: () => Promise<void> | void) {
  busy.value = true;
  error.value = '';
  message.value = '';
  try {
    await action();
  } catch (caught) {
    error.value =
      caught instanceof LibraryError
        ? errors[caught.code]!
        : 'No se ha completado la operación. Comprueba que el archivo sea un experimento válido de Neural Atlas, versión 1, de hasta 64 MiB.';
    if (caught instanceof LibraryError && ['UNAVAILABLE', 'BLOCKED'].includes(caught.code))
      available.value = false;
    if (caught instanceof LibraryError && ['CONFLICT', 'MISSING'].includes(caught.code)) {
      try {
        await refresh();
      } catch {
        available.value = false;
      }
    }
  } finally {
    busy.value = false;
  }
}
function save() {
  return perform(async () => {
    await library.save(session.capture(), name.value);
    await refresh();
    message.value = 'Experimento guardado. Puedes recuperarlo después de recargar.';
  });
}
async function selectFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  imported.value = undefined;
  await perform(async () => {
    imported.value = await readExperimentFile(file);
    message.value = 'Archivo validado. Revisa el resumen antes de abrirlo.';
  });
  input.value = '';
}
function confirm() {
  const choice = confirmation.value;
  if (!choice) return;
  confirmation.value = undefined;
  return perform(async () => {
    if (choice.action === 'open') {
      await session.restore(await library.read(choice.entry.id));
      message.value = 'Experimento abierto en una sesión nueva. El entrenamiento espera tu acción.';
    } else if (choice.action === 'remove') {
      await library.remove(choice.entry.id, choice.entry.revision);
      await refresh();
      message.value = 'Experimento eliminado de esta biblioteca.';
    } else {
      await library.save(
        session.capture(),
        choice.entry.name,
        choice.entry.id,
        choice.entry.revision,
      );
      await refresh();
      message.value = 'Versión guardada.';
    }
  });
}
onMounted(() => perform(refresh));
</script>
<template>
  <div class="page training-page">
    <p class="eyebrow">BIBLIOTECA / EXPERIMENTOS</p>
    <h1>Guarda lo que descubres.</h1>
    <RouterLink class="button secondary" to="/modelos">Modelos para predecir sin dataset</RouterLink>
    <p class="page-intro">
      Conserva los datos, el escalado aprendido solo con train, los pesos, los momentos del
      optimizador y el historial. Recupera tu trabajo desde la última actualización guardada.
    </p>
    <p role="status">
      {{
        available
          ? 'Almacenamiento local disponible'
          : 'Sesión en memoria · almacenamiento pendiente o no disponible'
      }}
      · {{ entries.length }} / 5 experimentos · {{ mib(total) }} / 200 MiB de presupuesto de
      biblioteca.
    </p>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="message" role="status">{{ message }}</p>
    <section class="training-panel">
      <h2>Tu sesión actual</h2>
      <p v-if="session.state">
        Época {{ session.state.epoch }} · actualizaciones {{ session.state.updates }} ·
        {{ session.state.frozen ? 'Modelo congelado' : 'Modelo entrenable' }}.
      </p>
      <p v-else>
        Inicializa un modelo en el laboratorio de entrenamiento para guardar tu primer experimento.
      </p>
      <p>
        El guardado es manual. Pausa el entrenamiento y guarda de nuevo tras cada cambio que quieras
        conservar.
      </p>
      <div class="training-toolbar">
        <label class="library-name"
          >Nombre del experimento <input v-model="name" maxlength="120" :disabled="busy"
        /></label>
        <button
          class="button primary"
          :disabled="busy || !available || !canCapture || !name.trim()"
          @click="save"
        >
          Guardar como nuevo
        </button>
        <button
          class="button secondary"
          :disabled="busy || !canCapture"
          @click="perform(() => download(session.capture()))"
        >
          Exportar sesión JSON
        </button>
        <RouterLink class="button secondary" to="/lab/entrenamiento"
          >Ir al entrenamiento</RouterLink
        >
      </div>
      <p>
        El archivo contiene el dataset completo: revisa qué datos compartes. Conserva una copia
        exportada; borrar los datos del navegador elimina la biblioteca.
      </p>
    </section>
    <section class="training-panel">
      <h2>Abrir un archivo de experimento</h2>
      <label
        >Importar experimento JSON (hasta 64 MiB)
        <input type="file" accept=".json,application/json" :disabled="busy" @change="selectFile"
      /></label>
      <div v-if="imported">
        <p>
          Archivo validado · época {{ imported.checkpoint.epoch }} ·
          {{ imported.checkpoint.updates }} actualizaciones ·
          {{ imported.checkpoint.frozen ? 'congelado' : 'entrenable' }}. Incluye datos y preparación
          reproducibles.
        </p>
        <p>
          Abrir sustituye la sesión del laboratorio. Guarda o exporta antes cualquier cambio
          pendiente.
        </p>
        <button
          class="button primary"
          :disabled="busy || session.running || session.evaluating"
          @click="
            perform(async () => {
              await session.restore(imported!);
              imported = undefined;
              message =
                'Archivo abierto. Puedes guardarlo en la biblioteca o continuar en el laboratorio.';
            })
          "
        >
          Abrir archivo y sustituir sesión
        </button>
        <button class="button secondary" :disabled="busy" @click="imported = undefined">
          Descartar archivo
        </button>
      </div>
    </section>
    <section class="training-panel">
      <h2 ref="entriesHeading" tabindex="-1">Experimentos guardados</h2>
      <button class="button secondary" :disabled="busy" @click="perform(refresh)">
        Actualizar biblioteca
      </button>
      <p v-if="!entries.length">Todavía no hay experimentos guardados en este navegador.</p>
      <ul class="library-list">
        <li v-for="entry in entries" :key="entry.id" class="training-panel">
          <h3>{{ entry.name }}</h3>
          <p>
            Revisión {{ entry.revision }} · época {{ entry.epoch }} ·
            {{ entry.updates }} actualizaciones · {{ mib(entry.bytes) }} MiB ·
            {{ entry.frozen ? 'Congelado' : 'Entrenable' }}
          </p>
          <p>
            Guardado:
            <time :datetime="entry.updatedAt">{{
              new Date(entry.updatedAt).toLocaleString('es-ES')
            }}</time>
          </p>
          <div class="training-toolbar">
            <button
              class="button primary"
              :disabled="busy || session.running || session.evaluating"
              @click="confirmation = { action: 'open', entry }"
            >
              Abrir {{ entry.name }}
            </button>
            <button
              class="button secondary"
              :disabled="busy"
              @click="perform(async () => download(await library.read(entry.id)))"
            >
              Exportar {{ entry.name }}
            </button>
            <button
              class="button secondary"
              :disabled="busy || !canCapture"
              @click="confirmation = { action: 'replace', entry }"
            >
              Actualizar {{ entry.name }} con sesión actual
            </button>
            <button
              class="button secondary"
              :disabled="busy"
              @click="confirmation = { action: 'remove', entry }"
            >
              Eliminar {{ entry.name }}
            </button>
          </div>
        </li>
      </ul>
      <div
        v-if="confirmation"
        ref="confirmationPanel"
        class="training-panel"
        role="group"
        aria-label="Confirmar cambio en biblioteca"
        tabindex="-1"
      >
        <p v-if="confirmation.action === 'open'">
          Abrir «{{ confirmation.entry.name }}» sustituirá la sesión del laboratorio. Guarda o
          exporta los cambios pendientes antes de continuar.
        </p>
        <p v-else-if="confirmation.action === 'remove'">
          Se eliminará «{{ confirmation.entry.name }}» de este navegador. Exporta una copia antes si
          quieres conservarlo.
        </p>
        <p v-else>
          Se sustituirá la versión guardada de «{{ confirmation.entry.name }}» por la sesión actual.
        </p>
        <button class="button primary" :disabled="busy" @click="confirm">Confirmar cambio</button>
        <button class="button secondary" :disabled="busy" @click="confirmation = undefined">
          Cancelar cambio
        </button>
      </div>
    </section>
  </div>
</template>
<style scoped>
.library-list {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 1rem;
  overflow-wrap: anywhere;
}
.training-panel p {
  overflow-wrap: anywhere;
}
.library-list .button {
  min-width: 0;
  max-width: 100%;
}
input[type='file'] {
  max-width: 100%;
}
.library-name {
  display: grid;
  gap: 8px;
  flex: 1 1 240px;
  max-width: 28rem;
}
.library-name input {
  min-height: 44px;
  width: 100%;
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--subtle);
  color: var(--ink);
  padding: 10px 12px;
}
</style>

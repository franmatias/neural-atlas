<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import { useTeachingStore } from '@/stores/teaching';
import { useDatasetsStore } from '@/stores/datasets';
import { useTrainingStore } from '@/stores/training';
import { useWorkshopsStore } from '@/stores/workshops';
import { workshops } from '@/content/workshops';
import { readLearning, downloadLearning } from '@/infrastructure/files/learning';
import {
  exportTeachingPack,
  previewTeachingPack,
  type TeachingPack,
} from '@/application/content/teaching-packs';
import { exportDatasetJson, importDatasetJson } from '@/application/data/json-files';
import { importExperiment, exportExperiment } from '@/application/training/experiment';
import { exportWorkshop } from '@/application/workshops/contracts';
const library = useTeachingStore(),
  data = useDatasetsStore(),
  training = useTrainingStore(),
  workshop = useWorkshopsStore(),
  router = useRouter();
const selected = ref(''),
  solutions = ref(false),
  includeModel = ref(false),
  title = ref('Mi unidad de aprendizaje'),
  packId = ref('mi-unidad'),
  objectives = ref('Comparar una predicción con evidencia del motor.'),
  steps = ref(
    'Formular una hipótesis.\nConfigurar y ejecutar un taller.\nContrastar y explicar los resultados.',
  ),
  attribution = ref('Adaptación docente de Neural Atlas. Datos sintéticos.'),
  selectedWorkshops = ref(['T01', 'T12']),
  error = ref(''),
  reading = ref(false),
  remove = ref('');
const confirmation = ref<{ kind: 'dataset' | 'preset' | 'workshop'; id: string }>();
const pack = computed(() =>
  selected.value === 'preview'
    ? library.preview?.pack
    : library.records.find((r) => r.id === selected.value)?.value,
);
const busy = computed(
  () =>
    reading.value ||
    library.busy ||
    library.saving ||
    data.busy ||
    training.running ||
    training.evaluating ||
    training.busy ||
    workshop.busy ||
    workshop.saving,
);
onMounted(async () => {
  await library.load();
});
let readRevision = 0;
function cancelRead() {
  readRevision++;
  reading.value = false;
  library.cancel();
}
onBeforeRouteLeave(cancelRead);
async function select(event: Event) {
  const input = event.target as HTMLInputElement,
    file = input.files?.[0];
  if (!file || busy.value) return;
  const token = ++readRevision;
  reading.value = true;
  error.value = '';
  try {
    const text = await readLearning(file, 64);
    if (token !== readRevision) return;
    await library.inspect(text);
    if (token === readRevision) {
      selected.value = 'preview';
      confirmation.value = undefined;
    }
  } catch {
    if (token === readRevision) error.value = 'Archivo ilegible o mayor de 64 MiB.';
  } finally {
    input.value = '';
    if (token === readRevision) reading.value = false;
  }
}
async function retire() {
  if (busy.value) return;
  const id = remove.value;
  await library.remove(id);
  if (!library.records.some((r) => r.id === id)) {
    remove.value = '';
    selected.value = '';
    confirmation.value = undefined;
  }
}
async function build() {
  error.value = '';
  try {
    const definitions = workshops.filter((w) => selectedWorkshops.value.includes(w.caseId));
    const next: TeachingPack = {
      format: 'neural-atlas.teaching-pack',
      schemaVersion: 1,
      packId: packId.value,
      version: '1.0.0',
      title: title.value,
      guide: {
        objectives: objectives.value.split('\n').filter(Boolean),
        prerequisites: ['Lectura de gráficas y operaciones básicas.'],
        minutes: 60,
        steps: steps.value.split('\n').filter(Boolean),
        errors: ['Confundir entrenamiento con evaluación independiente.'],
        debate: ['¿Qué evidencia podría refutar nuestra hipótesis?'],
        accessibility:
          'Todos los gráficos disponen de medidas o listas. Ajustar movimiento y tamaño en Ajustes.',
        attribution: attribution.value,
      },
      workshops: definitions,
      datasets: [
        {
          id: 'datos-unidad',
          file: JSON.parse(exportDatasetJson(data.dataset, data.split)) as unknown,
        },
      ],
      presets: includeModel.value
        ? [
            {
              id: 'experimento-unidad',
              experiment: JSON.parse(exportExperiment(training.capture())) as unknown,
            },
          ]
        : [],
      links: definitions.map((w) => ({
        workshopId: w.id,
        datasetId: 'datos-unidad',
        ...(includeModel.value ? { presetId: 'experimento-unidad' } : {}),
      })),
    };
    await library.inspect(exportTeachingPack(next, solutions.value));
    selected.value = 'preview';
  } catch {
    error.value =
      'No se creó: revisa IDs, guía y talleres seleccionados. Para incluir un modelo debe haber una sesión capturable y detenida.';
  }
}
function download() {
  if (!pack.value) return;
  try {
    const text = exportTeachingPack(pack.value, solutions.value);
    downloadLearning(JSON.parse(text) as unknown, pack.value.packId + '.teaching.json');
  } catch {
    error.value = 'No se exportó: el paquete no supera el contrato común.';
  }
}
async function apply() {
  if (!pack.value || !confirmation.value || busy.value) return;
  error.value = '';
  try {
    const p = previewTeachingPack(JSON.stringify(pack.value)).pack,
      c = confirmation.value;
    if (c.kind === 'dataset') {
      const raw = p.datasets.find((d) => d.id === c.id);
      if (!raw) throw Error('MISSING');
      const parsed = importDatasetJson(JSON.stringify(raw.file));
      training.reset();
      data.replace(parsed.dataset, parsed.split);
    } else if (c.kind === 'preset') {
      const raw = p.presets.find((d) => d.id === c.id);
      if (!raw) throw Error('MISSING');
      await training.restore(importExperiment(JSON.stringify(raw.experiment)));
    } else {
      const raw = p.workshops.find((d) => d.id === c.id);
      if (!raw) throw Error('MISSING');
      await workshop.load();
      await workshop.importDefinition(exportWorkshop(raw, true));
      await router.push('/taller');
    }
    confirmation.value = undefined;
    library.notice =
      'Recurso abierto por petición explícita. No se ha iniciado entrenamiento automáticamente.';
  } catch {
    error.value =
      'No se pudo aplicar el recurso. Revisa su integridad y la disponibilidad de la sesión.';
  }
}
</script>
<template>
  <div class="page learning-page">
    <p class="eyebrow">DOCENCIA / PREPARAR · COMPARTIR · REUTILIZAR</p>
    <h1>Una unidad lista para investigar.</h1>
    <p class="page-intro">
      Agrupa talleres, datos, un experimento y una guía. Los archivos permanecen en tu dispositivo;
      instalar un paquete no modifica el laboratorio activo.
    </p>
    <RouterLink to="/taller">Talleres</RouterLink> ·
    <RouterLink to="/conceptos/paquetes">Paquetes de conceptos</RouterLink>
    <section class="panel">
      <h2>Preparar un paquete</h2>
      <label>ID del paquete <input v-model="packId" maxlength="80" /></label
      ><label>Título <input v-model="title" maxlength="150" /></label
      ><label>Objetivos (uno por línea)<textarea v-model="objectives" maxlength="12000" /></label
      ><label>Secuencia (un paso por línea)<textarea v-model="steps" maxlength="12000" /></label
      ><label>Atribuciones <textarea v-model="attribution" maxlength="4000" /></label>
      <fieldset :disabled="busy">
        <legend>Talleres incluidos</legend>
        <label v-for="w in workshops" :key="w.id" class="review-option"
          ><input v-model="selectedWorkshops" type="checkbox" :value="w.caseId" />{{ w.caseId }} ·
          {{ w.title.es }}</label
        >
      </fieldset>
      <p>
        Se incluirá el dataset actual con su división, si existe. Los presets reutilizan el formato
        de experimento común y su validación.
      </p>
      <label class="review-option"
        ><input v-model="includeModel" type="checkbox" :disabled="busy || !training.state" />Incluir
        experimento detenido actual</label
      ><label class="review-option"
        ><input v-model="solutions" type="checkbox" />Incluir soluciones al preparar o
        exportar</label
      ><button class="button primary" :disabled="busy || !selectedWorkshops.length" @click="build">
        Preparar previsualización
      </button>
    </section>
    <section class="panel">
      <h2>Importar e instalar</h2>
      <p>
        JSON UTF-8 · máximo 64 MiB, 12 talleres y 100 presets. Los paquetes y conceptos instalados
        comparten 16 MiB. Un archivo válido mayor puede usarse en memoria y exportarse sin
        instalarse.
      </p>
      <label
        >Archivo docente
        <input
          type="file"
          accept=".json"
          :disabled="busy || !library.loaded"
          @change="select" /></label
      ><button v-if="library.busy || reading" class="button secondary" @click="cancelRead">
        Cancelar validación</button
      ><label
        >Paquete a inspeccionar
        <select v-model="selected" @change="confirmation = undefined">
          <option value="">Seleccionar…</option>
          <option v-if="library.preview" value="preview">
            Previsualización sin instalar · {{ library.preview.pack.title }}
          </option>
          <option v-for="r in library.records" :key="r.id" :value="r.id">
            {{ r.value.title }} · {{ r.value.version }}
          </option>
        </select></label
      >
      <p role="alert">{{ error || library.error }}</p>
      <p role="status">{{ library.notice }}</p>
      <button class="button secondary" :disabled="busy" @click="library.refresh">
        Recargar paquetes guardados
      </button>
    </section>
    <section v-if="pack" class="panel">
      <h2>{{ pack.title }} · {{ pack.version }}</h2>
      <p>
        Procedencia local, sin revisión editorial.
        {{ selected === 'preview' ? 'Aún no está instalado.' : 'Instalado en este navegador.' }}
      </p>
      <p>
        {{ pack.workshops.length }} talleres · {{ pack.datasets.length }} datasets ·
        {{ pack.presets.length }} presets.
      </p>
      <h3>Guía docente · {{ pack.guide.minutes }} minutos orientativos</h3>
      <h4>Objetivos</h4>
      <ul>
        <li v-for="(t, i) in pack.guide.objectives" :key="i">{{ t }}</li>
      </ul>
      <p>Prerrequisitos: {{ pack.guide.prerequisites.join(' · ') }}</p>
      <ol>
        <li v-for="(t, i) in pack.guide.steps" :key="i">{{ t }}</li>
      </ol>
      <p>Errores: {{ pack.guide.errors.join(' · ') }}</p>
      <p>Debate: {{ pack.guide.debate.join(' · ') }}</p>
      <p>Accesibilidad: {{ pack.guide.accessibility }}</p>
      <p>{{ pack.guide.attribution }}</p>
      <button class="button secondary" @click="download">
        Exportar paquete {{ solutions ? 'con' : 'sin' }} soluciones</button
      ><button
        v-if="selected === 'preview'"
        class="button primary"
        :disabled="busy"
        @click="library.install"
      >
        Confirmar instalación</button
      ><button v-else class="button secondary" :disabled="busy" @click="remove = pack.packId">
        Retirar paquete…
      </button>
      <div v-if="remove === pack.packId">
        <p>Se retirará este paquete, conservando experimentos y cuadernos independientes.</p>
        <button class="button primary" :disabled="busy" @click="retire">Confirmar retirada</button
        ><button class="button secondary" @click="remove = ''">Conservar</button>
      </div>
      <h3>Abrir recursos</h3>
      <ul>
        <li v-for="d in pack.datasets" :key="d.id">
          {{ d.id }}
          <button
            class="button secondary"
            :disabled="busy"
            @click="confirmation = { kind: 'dataset', id: d.id }"
          >
            Aplicar dataset…
          </button>
        </li>
        <li v-for="p in pack.presets" :key="p.id">
          {{ p.id }}
          <button
            class="button secondary"
            :disabled="busy"
            @click="confirmation = { kind: 'preset', id: p.id }"
          >
            Restaurar experimento…
          </button>
        </li>
        <li v-for="w in pack.workshops" :key="w.id">
          {{ w.title.es }}
          <button
            class="button secondary"
            :disabled="busy"
            @click="confirmation = { kind: 'workshop', id: w.id }"
          >
            Abrir taller…
          </button>
        </li>
      </ul>
      <details>
        <summary>Relaciones internas y soluciones incluidas</summary>
        <pre>{{ pack.links }}</pre>
        <div v-for="w in pack.workshops" :key="w.id">
          <h4>{{ w.title.es }}</h4>
          <p v-for="s in w.steps.filter((s) => s.solution)" :key="s.id">{{ s.solution }}</p>
        </div>
      </details>
      <div v-if="confirmation">
        <h3>Confirmar {{ confirmation.kind }} · {{ confirmation.id }}</h3>
        <p v-if="confirmation.kind !== 'workshop'">
          Esta acción sustituirá datos y sesión activa. Exporta primero el trabajo que quieras
          conservar. El paquete no ejecutará entrenamiento automáticamente.
        </p>
        <p v-else>
          Se abrirá esta actividad conservando el cuaderno anterior mediante el mecanismo de
          talleres. El motor de estos talleres usa sus casos didácticos registrados; los datos y
          presets enlazados se exploran por separado en los laboratorios.
        </p>
        <button
          v-if="training.state && !training.running"
          class="button secondary"
          @click="
            downloadLearning(
              JSON.parse(exportExperiment(training.capture())),
              'sesion-antes-de-paquete.json',
            )
          "
        >
          Exportar sesión actual</button
        ><button
          class="button secondary"
          @click="
            downloadLearning(
              JSON.parse(exportDatasetJson(data.dataset, data.split)),
              'datos-antes-de-paquete.json',
            )
          "
        >
          Exportar datos actuales</button
        ><button class="button primary" :disabled="busy" @click="apply">
          Confirmar apertura del recurso</button
        ><button class="button secondary" @click="confirmation = undefined">
          Conservar sesión
        </button>
      </div>
    </section>
  </div>
</template>

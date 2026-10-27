<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, shallowRef } from 'vue';
import {
  OfflineClient,
  type OfflineRegistration,
  type OfflineStatus,
} from '@/infrastructure/pwa/offline';
import { useTrainingStore } from '@/stores/training';
import { useDatasetsStore } from '@/stores/datasets';
import { useWorkshopsStore } from '@/stores/workshops';
import { useRecoveryStore } from '@/stores/recovery';
import { useCatalogStore } from '@/stores/catalog';
import { useReviewStore } from '@/stores/review';
import { useTeachingStore } from '@/stores/teaching';
import { downloadLearning } from '@/infrastructure/files/learning';
import { exportDatasetJson } from '@/application/data/json-files';
import { exportExperiment } from '@/application/training/experiment';
import { activeDataJobs } from '@/infrastructure/workers/data-client';
import { appVersion } from '@/shared/version';
const client = new OfflineClient(),
  training = useTrainingStore(),
  data = useDatasetsStore(),
  workshop = useWorkshopsStore(),
  recovery = useRecoveryStore(),
  catalog = useCatalogStore(),
  review = useReviewStore(),
  teaching = useTeachingStore();
const registration = shallowRef<OfflineRegistration>(),
  active = shallowRef<OfflineStatus>(),
  waiting = shallowRef<OfflineStatus>(),
  busy = ref(false),
  error = ref(''),
  notice = ref(''),
  acknowledged = ref(false),
  online = ref(navigator.onLine),
  jobs = ref(0);
let reload = false;
const working = computed(
  () =>
    jobs.value > 0 ||
    training.running ||
    training.evaluating ||
    training.busy ||
    data.busy ||
    workshop.busy ||
    workshop.saving ||
    recovery.saving ||
    recovery.loading ||
    catalog.busy ||
    catalog.saving ||
    review.saving ||
    teaching.busy ||
    teaching.saving,
);
async function refresh() {
  if (busy.value) return;
  try {
    registration.value = await client.registration();
    const r = registration.value;
    active.value = r?.active ? await client.status(r.active) : undefined;
    waiting.value = r?.waiting ? await client.status(r.waiting) : undefined;
  } catch {
    error.value =
      'El navegador no permite comprobar el uso sin conexión. La aplicación y los archivos locales siguen disponibles.';
  }
}
async function prepare() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    registration.value = await client.registration(true);
    if (registration.value?.active && !(await client.status(registration.value.active)).ready)
      await client.repair(registration.value.active);
    await registration.value?.update();
    notice.value =
      'Descarga iniciada. Espera a la confirmación de todos los recursos; una conexión interrumpida no se considera lista.';
  } catch {
    error.value =
      'No se completó la preparación. Conecta el dispositivo y vuelve a intentarlo; la versión anterior se conserva.';
  } finally {
    busy.value = false;
    await refresh();
  }
}
async function update() {
  if (
    !registration.value ||
    activeDataJobs() > 0 ||
    working.value ||
    !acknowledged.value ||
    busy.value
  )
    return;
  busy.value = true;
  error.value = '';
  try {
    reload = true;
    await client.activate(registration.value);
  } catch {
    reload = false;
    error.value =
      'No se activó. Cierra las otras pestañas de Neural Atlas y comprueba que la nueva versión esté lista.';
    busy.value = false;
  }
}
function exportCurrent(kind: 'dataset' | 'experiment' | 'workshop') {
  error.value = '';
  try {
    const text =
      kind === 'dataset'
        ? exportDatasetJson(data.dataset, data.split)
        : kind === 'experiment'
          ? exportExperiment(training.capture())
          : workshop.portfolio();
    downloadLearning(JSON.parse(text) as unknown, 'neural-atlas-' + kind + '.json');
  } catch {
    error.value = 'No se pudo exportar. Detén el trabajo y revisa el recurso antes de actualizar.';
  }
}
const stop = client.onChange(() => {
  if (reload) window.location.reload();
  else void refresh();
});
const connectivity = () => {
  online.value = navigator.onLine;
};
onMounted(() => {
  void refresh();
  window.addEventListener('online', connectivity);
  window.addEventListener('offline', connectivity);
});
const timer = globalThis.setInterval(() => {
  jobs.value = activeDataJobs();
  void refresh();
}, 3000);
onScopeDispose(() => {
  globalThis.clearInterval(timer);
  stop();
  window.removeEventListener('online', connectivity);
  window.removeEventListener('offline', connectivity);
});
</script>
<template>
  <div class="page learning-page">
    <p class="eyebrow">DISPONIBILIDAD LOCAL / ACTUALIZACIONES</p>
    <h1>Lleva el laboratorio contigo.</h1>
    <p class="page-intro">
      Prepara este dispositivo con conexión y vuelve a abrir Neural Atlas cuando no tengas red.
      Incluye laboratorios, catálogo, fuentes locales y motores de cálculo.
    </p>
    <section class="panel">
      <h2>Estado de este dispositivo</h2>
      <p>
        Interfaz abierta: {{ appVersion }} · conexión del dispositivo:
        {{ online ? 'disponible' : 'sin red' }}.
      </p>
      <p role="status">
        {{
          active?.ready
            ? 'Disponible sin conexión · versión ' +
              active.version +
              ' · ' +
              active.count +
              ' recursos comprobados.'
            : registration?.installing
              ? 'Preparando recursos; todavía no se confirma disponibilidad sin conexión.'
              : 'Uso sin conexión sin preparar o incompleto.'
        }}
      </p>
      <p>{{ notice }}</p>
      <p role="alert">{{ error }}</p>
      <button class="button primary" :disabled="busy" @click="prepare">
        Preparar o comprobar actualización</button
      ><button class="button secondary" :disabled="busy" @click="refresh">Comprobar estado</button>
      <p>
        La primera visita necesita conexión. Los enlaces a fuentes externas requieren red. La
        instalación como aplicación depende del navegador: usa su menú «Instalar» o «Añadir a
        pantalla de inicio» si lo ofrece.
      </p>
    </section>
    <section class="panel">
      <h2>Actualizar cuando termines de trabajar</h2>
      <p v-if="waiting?.ready">
        Nueva versión lista: {{ waiting.version }}. La versión activa se conserva hasta que lo
        decidas o cierres todas sus pestañas.
      </p>
      <p v-else>No hay una versión nueva completamente preparada esperando activación.</p>
      <p>
        La actualización recarga la página. Exporta los datos, el experimento y el cuaderno que
        quieras conservar. Los experimentos, paquetes y repasos ya guardados permanecen en el
        navegador. Los cambios que existan solo en memoria necesitan una copia antes de recargar.
      </p>
      <p v-if="working">
        Hay trabajo o guardado en curso. Espera o detén el entrenamiento para poder actualizar.
      </p>
      <button v-if="training.running" class="button secondary" @click="training.command('PAUSE')">
        Pausar entrenamiento
      </button>
      <button class="button secondary" :disabled="working" @click="exportCurrent('dataset')">
        Exportar datos actuales</button
      ><button
        class="button secondary"
        :disabled="working || !training.state"
        @click="exportCurrent('experiment')"
      >
        Exportar experimento actual</button
      ><button class="button secondary" :disabled="working" @click="exportCurrent('workshop')">
        Exportar cuaderno actual
      </button>
      <p>Recuperación: {{ recovery.message }}</p>
      <RouterLink to="/biblioteca">Revisar experimentos guardados</RouterLink> ·
      <RouterLink to="/conceptos/paquetes">Exportar conceptos en memoria</RouterLink> ·
      <RouterLink to="/docencia">Exportar paquetes docentes</RouterLink>
      <label class="review-option"
        ><input v-model="acknowledged" type="checkbox" />He guardado o exportado el trabajo que
        quiero conservar y he cerrado las otras pestañas de Neural Atlas.</label
      ><button
        class="button primary"
        :disabled="!waiting?.ready || !acknowledged || working || busy"
        @click="update"
      >
        Activar nueva versión y recargar
      </button>
      <p>
        Si la descarga falla, vuelve a preparar con conexión. Nunca se borran los experimentos para
        liberar espacio automáticamente.
      </p>
    </section>
  </div>
</template>

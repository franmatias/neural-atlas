<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useWorkshopsStore } from '@/stores/workshops';
import { workshopLabs, workshops } from '@/content/workshops';
import { definitionHash } from '@/application/workshops/contracts';
import { readWorkshopFile, downloadWorkshopText } from '@/infrastructure/files/workshops';
import WorkshopControls from './WorkshopControls.vue';
import WorkshopEvidencePanel from './WorkshopEvidence.vue';
const session = useWorkshopsStore();
const includeSolutions = ref(false),
  confirmRetry = ref(false),
  confirmDelete = ref(false),
  fileBusy = ref(false),
  fileError = ref('');
const initializing = ref(true);
const heading = ref<HTMLElement>();
const busy = computed(() => session.busy || session.saving || fileBusy.value || initializing.value);
const phaseLabels = ['Predecir', 'Configurar', 'Ejecutar', 'Observar', 'Explicar'];
const minimumLength = computed(() =>
  Math.max(
    0,
    ...(session.step?.rules ?? []).map((rule) => ('minLength' in rule ? rule.minLength : 0)),
  ),
);
const imported = computed(
  () => !workshops.some((def) => definitionHash(def) === definitionHash(session.definition)),
);
let readRevision = 0;
async function advance() {
  await session.advance();
  await nextTick();
  heading.value?.focus();
}
async function selectFile(event: Event) {
  const input = event.target as HTMLInputElement,
    file = input.files?.[0];
  if (!file) return;
  const revision = ++readRevision;
  fileBusy.value = true;
  fileError.value = '';
  try {
    const text = await readWorkshopFile(file);
    if (revision === readRevision) await session.importDefinition(text);
  } catch {
    if (revision === readRevision)
      fileError.value =
        'No se ha abierto el taller. Usa un archivo neural-atlas.workshop UTF-8 de hasta 1 MiB, cinco fases ordenadas y reglas permitidas.';
  } finally {
    input.value = '';
    if (revision === readRevision) fileBusy.value = false;
  }
}
function download(kind: 'workshop' | 'learning-evidence') {
  fileError.value = '';
  try {
    downloadWorkshopText(
      kind === 'workshop' ? session.exportDefinition(includeSolutions.value) : session.portfolio(),
      kind,
    );
  } catch {
    fileError.value =
      'No se ha exportado. Revisa los controles del taller y vuelve a intentarlo; el trabajo sigue en memoria.';
  }
}
onMounted(async () => {
  await session.load();
  initializing.value = false;
});
onBeforeRouteLeave(() => {
  readRevision++;
  session.draft();
  session.cancel();
});
</script>
<template>
  <div class="page training-page workshops-page">
    <p class="eyebrow">TALLER / PREDECIR · OBSERVAR · EXPLICAR</p>
    <h1>Investiga antes de concluir.</h1>
    <p class="page-intro">
      Escribe tu hipótesis, ejecuta un caso y contrástala con medidas del motor. No necesitas
      acertar tu predicción para aprender: importa cómo la explicas con evidencia.
    </p>
    <p>
      Los talleres usan un espacio aislado y conservan la sesión de los laboratorios. Los datos son
      sintéticos. Completar pasos registra actividad; la calidad de la explicación requiere revisión
      humana.
    </p>
    <nav class="workshop-catalog" aria-label="Talleres disponibles">
      <button
        v-for="definition in session.catalog"
        :key="definitionHash(definition)"
        class="button secondary"
        :aria-current="
          definitionHash(definition) === definitionHash(session.definition) ? 'true' : undefined
        "
        :disabled="busy"
        @click="
          session.open(definition);
          confirmRetry = false;
          confirmDelete = false;
        "
      >
        {{ definition.id }} · {{ definition.title.es
        }}<span v-if="definition.contentVersion !== '1.0.0'">
          · {{ definition.contentVersion }}</span
        >
      </button>
    </nav>
    <p role="status">{{ session.storage }}</p>
    <p v-if="session.notice" role="status">{{ session.notice }}</p>
    <p v-if="session.error || fileError" role="alert">{{ fileError || session.error }}</p>
    <section class="training-panel">
      <h2 ref="heading" tabindex="-1">
        {{ session.definition.id }} · {{ session.definition.title.es }}
      </h2>
      <p>
        {{ session.definition.audience }} · {{ session.definition.estimatedMinutes }} min
        orientativos · versión {{ session.definition.contentVersion }}.
      </p>
      <p v-if="imported" class="training-alert">
        Actividad importada o versión distinta del catálogo. Su texto procede del archivo; las
        reglas solo pueden consultar los casos y métricas permitidos.
      </p>
      <ol class="workshop-phases">
        <li
          v-for="(phase, index) in phaseLabels"
          :key="phase"
          :aria-current="index === session.progress.step ? 'step' : undefined"
        >
          {{ index < session.progress.step ? '✓ ' : '' }}{{ phase }}
        </li>
      </ol>
      <template v-if="session.step">
        <p class="eyebrow">
          PASO {{ session.progress.step + 1 }} DE 5 · {{ phaseLabels[session.progress.step] }}
        </p>
        <h3>{{ session.step.instruction }}</h3>
        <WorkshopControls
          v-if="session.progress.step >= 1"
          v-model="session.progress.options"
          :case-id="session.definition.caseId"
          :disabled="busy || session.step.type !== 'configure'"
        />
        <label v-if="session.step.type !== 'execute'" for="workshop-answer">{{
          session.step.type === 'predict'
            ? 'Tu hipótesis antes de observar'
            : session.step.type === 'inspect'
              ? 'Tu observación contrastada'
              : session.step.type === 'explain'
                ? 'Tu explicación y sus límites'
                : 'Qué varías y qué mantienes constante'
        }}</label>
        <textarea
          v-if="session.step.type !== 'execute'"
          id="workshop-answer"
          :value="session.progress.answers[session.step.id] ?? ''"
          rows="5"
          maxlength="2000"
          :disabled="busy"
          @input="session.answer(($event.target as HTMLTextAreaElement).value)"
        />
        <p v-if="session.step.type !== 'execute'" class="small muted">
          Mínimo {{ minimumLength }} caracteres. La longitud mínima evita respuestas vacías; no
          evalúa si tu razonamiento es correcto. Máximo 2000 caracteres.
        </p>
        <button
          v-if="session.step.type === 'execute'"
          class="button primary"
          :disabled="busy || !!session.progress.evidence"
          @click="session.execute"
        >
          Ejecutar caso con el motor
        </button>
        <p v-if="session.busy" role="status">
          Calculando en un Web Worker. Al salir del taller se cancela el trabajo pendiente.
        </p>
        <div class="training-toolbar">
          <button class="button secondary" :disabled="busy" @click="session.hint">
            Mostrar pista sin penalización
          </button>
          <button
            v-if="session.step.type === 'explain' && session.step.solution"
            class="button secondary"
            :disabled="busy"
            @click="session.solution"
          >
            Consultar explicación orientativa
          </button>
        </div>
        <div v-if="session.progress.hints.includes(`${session.step.id}:0`)" class="training-alert">
          <p v-for="hint in session.step.hints" :key="hint">{{ hint }}</p>
        </div>
        <p v-if="session.progress.solutions.includes(session.step.id)" class="training-alert">
          {{ session.step.solution }}
        </p>
        <label v-if="session.step.type === 'explain'"
          >Autoevaluación orientativa<select
            v-model.number="session.progress.selfScore"
            :disabled="busy"
          >
            <option
              v-for="(rubric, index) in session.definition.rubric"
              :key="index"
              :value="index"
            >
              {{ rubric }}
            </option>
          </select></label
        >
        <div class="training-toolbar">
          <button class="button primary" :disabled="busy" @click="advance">
            {{
              session.step.type === 'explain'
                ? 'Registrar reflexión y completar recorrido'
                : 'Validar paso y continuar'
            }}</button
          ><button class="button secondary" :disabled="busy" @click="session.persist">
            Guardar cuaderno
          </button>
        </div>
      </template>
      <template v-else
        ><h3>Recorrido registrado</h3>
        <p>
          Has conservado hipótesis, medidas y reflexión. La marca de recorrido completo no certifica
          comprensión ni sustituye una revisión docente.
        </p></template
      >
      <details>
        <summary>Releer mis respuestas y consultar intentos anteriores</summary>
        <dl>
          <template v-for="(answer, id) in session.progress.answers" :key="id"
            ><dt>{{ id }}</dt>
            <dd>{{ answer }}</dd></template
          >
        </dl>
        <article v-for="(attempt, index) in session.progress.attempts" :key="index">
          <h3>Intento anterior {{ index + 1 }}</h3>
          <p v-for="(answer, id) in attempt.answers" :key="id">{{ id }}: {{ answer }}</p>
          <p>
            Evidencia: {{ attempt.evidence?.id ?? 'No ejecutado' }} · autoevaluación
            {{ attempt.selfScore }}.
          </p>
        </article>
      </details>
      <div class="training-toolbar">
        <button class="button secondary" :disabled="busy" @click="confirmRetry = true">
          Reintentar conservando este intento</button
        ><RouterLink class="button secondary" :to="workshopLabs[session.definition.caseId]!"
          >Explorar el laboratorio relacionado</RouterLink
        >
      </div>
      <div
        v-if="confirmRetry"
        class="training-alert"
        role="group"
        aria-label="Confirmar nuevo intento"
      >
        <p>
          Se archivarán las respuestas, las pistas y las medidas actuales. El nuevo intento comienza
          por una hipótesis nueva.
        </p>
        <button
          class="button primary"
          :disabled="busy"
          @click="
            session.retry();
            confirmRetry = false;
          "
        >
          Archivar y comenzar intento</button
        ><button class="button secondary" @click="confirmRetry = false">
          Mantener intento actual
        </button>
      </div>
    </section>
    <WorkshopEvidencePanel v-if="session.progress.evidence" :evidence="session.progress.evidence" />
    <section class="training-panel">
      <h2>Compartir actividad y conservar evidencias</h2>
      <label class="training-check"
        ><input v-model="includeSolutions" type="checkbox" :disabled="busy" />Incluir soluciones
        orientativas en el archivo del taller</label
      >
      <p>
        Las soluciones empaquetadas no están protegidas por contraseña. Un archivo sin soluciones
        permite compartir las instrucciones y reglas; no envía respuestas ni resultados a ninguna
        persona.
      </p>
      <div class="training-toolbar">
        <button class="button secondary" :disabled="busy" @click="download('workshop')">
          Exportar actividad JSON</button
        ><button class="button primary" :disabled="busy" @click="download('learning-evidence')">
          Exportar cuaderno de evidencias
        </button>
      </div>
      <label
        >Importar actividad JSON (hasta 1 MiB)<input
          type="file"
          accept=".json,application/json"
          :disabled="busy"
          @change="selectFile"
      /></label>
      <button
        v-if="session.canDelete"
        class="button secondary"
        :disabled="busy"
        @click="confirmDelete = true"
      >
        Eliminar cuaderno guardado
      </button>
      <div
        v-if="confirmDelete"
        class="training-alert"
        role="group"
        aria-label="Confirmar eliminación del cuaderno"
      >
        <p>
          Se eliminarán las respuestas, intentos y evidencias guardados de esta actividad. Exporta
          antes una copia para conservarlos.
        </p>
        <button
          class="button primary"
          :disabled="busy"
          @click="
            session.removeCurrent();
            confirmDelete = false;
          "
        >
          Confirmar eliminación del cuaderno
        </button>
        <button class="button secondary" @click="confirmDelete = false">Conservar cuaderno</button>
      </div>
      <details>
        <summary>Guía docente y límites de evaluación</summary>
        <p>{{ session.definition.teacherGuide }}</p>
        <ul>
          <li v-for="rubric in session.definition.rubric" :key="rubric">{{ rubric }}</li>
        </ul>
        <p>
          No se solicita identidad. El archivo de evidencias contiene tus textos; revísalos antes de
          compartirlo. Los hashes detectan alteración accidental, no prueban autoría. La base local
          tiene un presupuesto de 8 MiB para cuadernos; no se eliminan automáticamente.
        </p>
      </details>
    </section>
  </div>
</template>
<style scoped>
.workshop-catalog {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 20px 0;
}
.workshop-catalog [aria-current='true'] {
  border-color: var(--accent);
  background: var(--wash);
}
.workshop-catalog .button {
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
}
.workshops-page h2 {
  overflow-wrap: anywhere;
}
.workshop-phases {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 28px;
  margin: 20px 0;
  padding-left: 22px;
}
.workshop-phases [aria-current='step'] {
  color: var(--accent);
  font-weight: 750;
}
.workshops-page textarea {
  display: block;
  width: 100%;
  resize: vertical;
  min-height: 130px;
  padding: 14px;
  margin: 10px 0;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--subtle);
  color: var(--ink);
}
.workshops-page p,
.workshops-page dd,
.workshops-page h3 {
  overflow-wrap: anywhere;
}
.workshops-page dd {
  margin: 6px 0 20px;
  white-space: pre-wrap;
}
input[type='file'] {
  display: block;
  max-width: 100%;
  margin: 12px 0;
}
details {
  margin: 20px 0;
}
select {
  max-width: 100%;
}
h3 {
  margin: 12px 0;
}
</style>

<script setup lang="ts">
import { nextTick, reactive, ref } from 'vue';
import { introductionSteps } from '@/content/workshop-introduction';
import { useWorkshopIntroduction } from './useWorkshopIntroduction';
import WorkshopEvidencePanel from './WorkshopEvidence.vue';
import { downloadLearning } from '@/infrastructure/files/learning';
const tour = reactive(useWorkshopIntroduction());
const heading = ref<HTMLElement>(),
  solvedHeading = ref<HTMLElement>(),
  downloadError = ref('');
const number = (v: number) => v.toLocaleString('es', { maximumSignificantDigits: 6 });
async function change(action: () => unknown) {
  downloadError.value = '';
  action();
  await nextTick();
  heading.value?.focus();
}
async function showSolved() {
  downloadError.value = '';
  await tour.showSolved();
  await nextTick();
  solvedHeading.value?.focus();
}
async function showGuided() {
  downloadError.value = '';
  tour.showGuided();
  await nextTick();
  heading.value?.focus();
}
function download() {
  downloadError.value = '';
  try {
    downloadLearning(tour.report(), 'neural-atlas-ejemplo-taller.json');
  } catch {
    downloadError.value =
      'No se pudo descargar el cuaderno de ejemplo. El recorrido sigue en memoria.';
  }
}
</script>
<template>
  <div class="page training-page introduction-page">
    <p class="eyebrow">APRENDE A USAR LOS TALLERES · EJEMPLO T02</p>
    <h1>Tu primer taller, acompañado.</h1>
    <p class="page-intro">
      Primero mira cómo se resuelve un caso; después recórrelo con pequeñas decisiones. Aquí
      aprenderás qué hacer en cada fase y cómo escribir una conclusión con evidencia.
    </p>
    <p>
      Práctica independiente en memoria: no cambia tu progreso de T01–T12 ni la sesión de los
      laboratorios. Recargar empieza otro recorrido; exporta para conservar tus notas.
    </p>
    <div class="intro-mode" role="group" aria-label="Modo de introducción">
      <button
        class="button secondary"
        :aria-pressed="tour.mode === 'guided'"
        :disabled="tour.busy"
        @click="showGuided"
      >
        Recorrido semiguiado
      </button>
      <button
        class="button secondary"
        :aria-pressed="tour.mode === 'solved'"
        :disabled="tour.busy"
        @click="showSolved"
      >
        Ver ejemplo completo resuelto
      </button>
    </div>
    <p v-if="tour.notice" role="status">{{ tour.notice }}</p>
    <p v-if="tour.error || downloadError" role="alert">{{ downloadError || tour.error }}</p>

    <template v-if="tour.mode === 'solved'">
      <section class="training-panel">
        <h2 ref="solvedHeading" tabindex="-1">Un taller resuelto de principio a fin</h2>
        <p>
          Respuesta proporcionada para enseñar el método. Caso: mover una frontera con w=(1;0,5),
          manteniendo b inicial=0 y b final=0,5. Estas respuestas no se copian a tus notas.
        </p>
        <ol class="worked-list">
          <li v-for="(phase, i) in introductionSteps" :key="phase.title">
            <h3>{{ i + 1 }}. {{ phase.title }}</h3>
            <p>{{ phase.worked }}</p>
          </li>
        </ol>
        <button
          v-if="!tour.reference"
          class="button primary"
          :disabled="tour.busy"
          @click="tour.run('solved')"
        >
          Calcular evidencia del ejemplo resuelto
        </button>
        <p v-if="tour.busy" role="status">Calculando el ejemplo de referencia…</p>
        <button class="button secondary" :disabled="tour.busy" @click="showGuided">
          Probarlo con ayuda paso a paso
        </button>
      </section>
      <WorkshopEvidencePanel v-if="tour.reference" :evidence="tour.reference" />
    </template>

    <template v-else>
      <nav v-if="!tour.completed" aria-label="Fases del ejemplo">
        <ol class="intro-progress">
          <li v-for="(phase, i) in introductionSteps" :key="phase.title">
            <button
              class="button secondary"
              :aria-current="tour.step === i ? 'step' : undefined"
              :disabled="tour.busy || i > tour.unlocked"
              @click="change(() => tour.go(i))"
            >
              {{ i + 1 }}. {{ phase.title }}
            </button>
          </li>
        </ol>
      </nav>
      <section v-if="tour.completed" class="training-panel">
        <h2 ref="heading" tabindex="-1">Recorrido de ejemplo terminado</h2>
        <p>
          Has recorrido el método. Esto no completa el taller T02 ni califica tu explicación. Ahora
          abre el catálogo, elige T02 u otro caso y escribe tus propias respuestas.
        </p>
        <RouterLink class="button primary" to="/taller">Abrir catálogo de talleres</RouterLink>
        <button class="button secondary" @click="change(tour.restart)">
          Volver al primer paso y conservar mis notas
        </button>
      </section>
      <section v-else class="training-panel intro-phase" aria-label="Fase actual del ejemplo">
        <p class="eyebrow">PASO {{ tour.step + 1 }} DE 5</p>
        <h2 ref="heading" tabindex="-1">
          {{ introductionSteps[tour.step]!.title }}: {{ introductionSteps[tour.step]!.question }}
        </h2>
        <aside class="intro-coach" aria-label="Ayuda de esta fase">
          <h3>Así se usa en los demás talleres</h3>
          <p>{{ introductionSteps[tour.step]!.coach }}</p>
        </aside>
        <template v-if="tour.step === 0">
          <p>
            Mantendremos los pesos w₁=1 y w₂=0,5. El sesgo inicial es 0; el ejemplo propone
            cambiarlo a 0,5.
          </p>
          <fieldset>
            <legend>Mi predicción</legend>
            <label class="intro-choice"
              ><input
                v-model="tour.prediction"
                name="intro-prediction"
                type="radio"
                value="shift"
              />La recta se desplazará sin girar</label
            >
            <label class="intro-choice"
              ><input
                v-model="tour.prediction"
                name="intro-prediction"
                type="radio"
                value="rotate"
              />La recta girará</label
            >
            <label class="intro-choice"
              ><input
                v-model="tour.prediction"
                name="intro-prediction"
                type="radio"
                value="same"
              />La frontera no cambiará</label
            >
          </fieldset>
          <p>Elige una opción para continuar. No se exige acertar.</p>
          <label for="intro-hypothesis">Mi hipótesis, con mis palabras (opcional)</label
          ><textarea id="intro-hypothesis" v-model="tour.hypothesis" maxlength="2000" rows="3" />
        </template>
        <template v-if="tour.step === 1">
          <p>
            Solo cambia b. Los pesos permanecen en (1;0,5), la referencia usa b=0 y la semilla de
            las nubes es 42.
          </p>
          <label for="intro-bias">Sesgo del experimento</label
          ><input
            id="intro-bias"
            v-model.number="tour.bias"
            type="range"
            min="-1"
            max="1"
            step="0.1"
          />
          <p>Valor elegido: b={{ number(tour.bias) }}.</p>
          <p>
            Con b=0 no cambia la frontera; en el taller T02 real se pide un sesgo distinto de cero.
            Cambiar el ajuste elimina el resultado propio anterior y exige ejecutarlo de nuevo.
          </p>
        </template>
        <template v-if="tour.step === 2">
          <p>
            Se calculará T02 con pesos (1;0,5), sesgo inicial 0 y final {{ number(tour.bias) }}. No
            se entrenará una red.
          </p>
          <button class="button primary" :disabled="tour.busy" @click="tour.run('guided')">
            Ejecutar mi ejemplo con el motor
          </button>
          <p v-if="tour.busy" role="status">Calculando evidencia…</p>
          <p v-if="tour.evidence">
            Resultado disponible. Continúa a Observar para leer el gráfico y la tabla. Su captura
            fue {{ new Date(tour.evidence.capturedAt).toLocaleString('es-ES') }}.
          </p>
        </template>
        <template v-if="tour.step === 3 && tour.evidence">
          <p>{{ tour.feedback }}</p>
          <p>
            Discontinua: b=0. Continua: b={{ number(tour.evidence.options.bias) }}. Distancia
            medida: {{ number(Number(tour.evidence.metrics.distance)) }}. Las dos rectas conservan
            su orientación.
          </p>
          <p>
            En x₁=0, x₂ pasa de 0 a {{ number(-2 * tour.evidence.options.bias) }}. El desplazamiento
            perpendicular es |Δb|/√(1²+0,5²). No es una medida de aciertos de clasificación.
          </p>
        </template>
        <template v-if="tour.step === 4">
          <p>
            Relaciona lo observado con tu predicción: ¿qué cambió, por qué y qué no puedes concluir?
          </p>
          <label for="intro-reflection">Mi conclusión (opcional, sin calificación automática)</label
          ><textarea id="intro-reflection" v-model="tour.reflection" maxlength="2000" rows="4" />
        </template>
        <WorkshopEvidencePanel v-if="tour.evidence && tour.step >= 3" :evidence="tour.evidence" />
        <details>
          <summary>Ver una respuesta resuelta de esta fase</summary>
          <p>
            <strong>Ejemplo del docente con b=0,5:</strong>
            {{ introductionSteps[tour.step]!.worked }}
          </p>
          <p>Si elegiste otro sesgo, utiliza tus medidas reales al redactar la conclusión.</p>
        </details>
        <div class="intro-actions">
          <button
            class="button secondary"
            :disabled="tour.busy || tour.step === 0"
            @click="change(() => tour.go(tour.step - 1))"
          >
            Paso anterior del ejemplo
          </button>
          <button
            v-if="tour.step < 4"
            class="button primary"
            :disabled="!tour.canNext"
            @click="change(tour.next)"
          >
            Continuar ejemplo
          </button>
          <button
            v-else
            class="button primary"
            :disabled="tour.busy || !tour.evidence"
            @click="change(tour.finish)"
          >
            Terminar recorrido de ejemplo
          </button>
        </div>
      </section>
    </template>
    <button v-if="tour.busy" class="button secondary" @click="tour.cancel">
      Cancelar cálculo del ejemplo
    </button>
    <section class="training-panel">
      <h2>Conservar y continuar</h2>
      <p>
        En T01–T12 puedes usar «Guardar cuaderno» y revisar el aviso de almacenamiento. «Exportar
        cuaderno de evidencias» conserva una copia de tu trabajo. Esta introducción tiene una
        descarga independiente.
      </p>
      <p>
        El cuaderno de ejemplo incluye respuestas proporcionadas, tus notas y la evidencia calculada
        del modo visible. Es un JSON de demostración, no un archivo para importar progreso T02. Los
        talleres reales tienen su propio guardado y cuaderno.
      </p>
      <button class="button secondary" :disabled="tour.busy || !tour.displayed" @click="download">
        Descargar cuaderno del ejemplo
      </button>
      <RouterLink class="button secondary" to="/taller">Volver al catálogo de talleres</RouterLink>
    </section>
  </div>
</template>
<style scoped>
.introduction-page {
  overflow-wrap: anywhere;
}
.intro-mode,
.intro-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin: 1rem 0;
}
.intro-progress {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.6rem;
  list-style: none;
  padding: 0;
  margin: 1.2rem 0;
}
.intro-progress button {
  width: 100%;
  white-space: normal;
}
.intro-progress [aria-current='step'] {
  border: 2px solid var(--accent);
}
.intro-coach {
  background: var(--wash);
  padding: 1rem;
  border-left: 4px solid var(--accent);
  border-radius: 0.5rem;
  margin: 1rem 0;
}
.intro-choice {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  margin: 0.7rem 0;
}
.intro-choice input {
  width: auto;
  flex: none;
  margin-top: 0.3rem;
}
fieldset {
  border: 1px solid var(--line);
  padding: 1rem;
  border-radius: 0.8rem;
}
textarea {
  border: 1px solid var(--line);
  border-radius: 0.6rem;
  padding: 0.75rem;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  line-height: 1.5;
  display: block;
  width: 100%;
  max-width: 100%;
  margin: 0.6rem 0 1rem;
  resize: vertical;
}
input[type='range'] {
  display: block;
  width: 100%;
  max-width: 550px;
  margin: 1rem 0;
}
details {
  margin: 1rem 0;
  padding: 1rem;
  border: 1px solid var(--line);
  border-radius: 0.8rem;
}
summary {
  font-weight: 700;
  cursor: pointer;
}
.worked-list {
  padding-left: 1.5rem;
}
.worked-list li {
  margin: 1rem 0;
}
.training-panel p {
  margin: 0.7rem 0;
}
.training-panel .button {
  margin: 0.4rem 0.4rem 0.4rem 0;
  white-space: normal;
}
</style>

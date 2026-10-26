<script setup lang="ts">
import { computed, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useEthicsStore } from '@/stores/ethics';
import { auditPresetNames } from '@/application/training/group-audit';
import { auditGroups } from '@/domain/training/group-audit';
import { formatData } from '@/shared/utils/data-format';
import ParameterField from '@/shared/ui/ParameterField.vue';
import AuditDistribution from './AuditDistribution.vue';
import AuditMetricsTable from './AuditMetricsTable.vue';
const study = useEthicsStore(),
  filter = ref('all'),
  group = ref('all'),
  downloadError = ref('');
const maximum = computed(() =>
  Math.max(
    1,
    ...Object.values(study.histograms ?? {}).flatMap((bins) => bins.map((b) => b.zero + b.one)),
  ),
);
const selectedRows = computed(
  () =>
    study.analysis?.changes.filter(
      (r) =>
        (group.value === 'all' || r.group === group.value) &&
        (filter.value === 'all' ||
          (filter.value === 'changed' && r.reference !== r.alternative) ||
          (filter.value === 'fp' && r.actual === 0 && r.alternative === 1) ||
          (filter.value === 'fn' && r.actual === 1 && r.alternative === 0)),
    ) ?? [],
);
const percent = (v: number | null) => (v === null ? 'No definida' : `${formatData(v * 100)} %`);
const gap = (v: number | null) =>
  v === null ? 'No definida' : `${v > 0 ? '+' : ''}${formatData(v * 100)} pp`;
function download() {
  downloadError.value = '';
  try {
    const url = globalThis.URL.createObjectURL(
      new globalThis.Blob([study.report()], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'neural-atlas-group-audit.report.json';
    a.click();
    setTimeout(() => globalThis.URL.revokeObjectURL(url), 1000);
  } catch {
    downloadError.value =
      'No se pudo exportar el informe. La cohorte y la reflexión siguen disponibles.';
  }
}
onBeforeRouteLeave(() => {
  if (study.busy) study.cancel();
});
</script>
<template>
  <div class="page training-page ethics-page">
    <p class="eyebrow">L09 / ÉTICA Y MÉTRICAS POR GRUPOS · D8.3</p>
    <h1>¿A quién oculta el promedio?</h1>
    <p class="page-intro">
      Compara dos políticas sobre los mismos casos. Observa quién cambia de decisión, qué errores se
      concentran y qué información te falta antes de interpretar las métricas.
    </p>
    <RouterLink class="text-link" to="/lab/clasificacion"
      >Volver a clasificación y evaluación →</RouterLink
    >
    <section class="training-panel">
      <h2>El caso: revisar solicitudes de un recurso formativo ficticio</h2>
      <p>
        Dos canales de entrada, sin identidades ni características personales reales. La etiqueta 1
        significa «marcada para revisión por la receta»; no representa necesidad real ni mérito. Un
        falso positivo deriva a revisión una etiqueta 0; un falso negativo deja sin revisar una
        etiqueta 1.
      </p>
      <p>
        La puntuación es <strong>sigmoide(medición)</strong>: una regla de juguete fija, sin
        entrenamiento. No es una probabilidad calibrada. El canal no entra en esa regla, pero las
        mediciones y prevalencias pueden ser distintas.
      </p>
      <fieldset :disabled="study.busy" class="audit-options">
        <legend>Preparar una cohorte sintética independiente</legend>
        <label
          >Caso precargado
          <select
            :value="study.presetId"
            aria-label="Caso de ética"
            @change="study.preset(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="(name, id) in auditPresetNames" :key="id" :value="id">{{ name }}</option>
          </select></label
        >
        <label
          >Semilla
          <input
            v-model.number="study.options.seed"
            type="number"
            min="0"
            max="4294967295"
            step="1"
            aria-label="Semilla de auditoría"
        /></label>
        <label class="hypothesis"
          >Predice antes de observar
          <textarea
            v-model="study.hypothesis"
            maxlength="2000"
            rows="3"
            aria-label="Hipótesis de ética"
            placeholder="¿Puede la exactitud global ocultar errores de un canal pequeño? ¿Qué compararías además?"
          />
        </label>
        <details class="mechanism">
          <summary>Ajustar el mecanismo y el soporte</summary>
          <div class="mechanism-grid">
            <label
              >Filas del canal 1
              <input
                v-model.number="study.options.count1"
                type="number"
                min="0"
                max="400"
                step="1"
                aria-label="Filas del canal 1" /></label
            ><label
              >Filas del canal 2
              <input
                v-model.number="study.options.count2"
                type="number"
                min="0"
                max="400"
                step="1"
                aria-label="Filas del canal 2"
            /></label>
            <ParameterField
              id="audit-prev-1"
              v-model="study.options.prevalence1"
              label="Prevalencia de la receta · canal 1"
              :min="0"
              :max="1"
              :step="0.01"
            /><ParameterField
              id="audit-prev-2"
              v-model="study.options.prevalence2"
              label="Prevalencia de la receta · canal 2"
              :min="0"
              :max="1"
              :step="0.01"
            />
            <ParameterField
              id="audit-noise-1"
              v-model="study.options.noise1"
              label="Ruido de medición σ · canal 1"
              :min="0"
              :max="2.5"
              :step="0.1"
            /><ParameterField
              id="audit-noise-2"
              v-model="study.options.noise2"
              label="Ruido de medición σ · canal 2"
              :min="0"
              :max="2.5"
              :step="0.1"
            />
            <ParameterField
              id="audit-offset-1"
              v-model="study.options.offset1"
              label="Desplazamiento de medición · canal 1"
              :min="-2"
              :max="2"
              :step="0.1"
            /><ParameterField
              id="audit-offset-2"
              v-model="study.options.offset2"
              label="Desplazamiento de medición · canal 2"
              :min="-2"
              :max="2"
              :step="0.1"
            />
          </div>
          <p class="small muted">
            Etiqueta Bernoulli según la prevalencia; medición = 1,8 × (2y − 1) + desplazamiento +
            ruido gaussiano. Son mecanismos conocidos de la simulación, no explicaciones causales de
            datos reales. Se requieren al menos 20 filas en total.
          </p>
        </details>
      </fieldset>
      <div class="training-toolbar">
        <button class="button primary" :disabled="study.busy" @click="study.generate">
          Generar cohorte de auditoría</button
        ><button class="button secondary" :disabled="!study.busy" @click="study.cancel">
          Cancelar generación de auditoría
        </button>
      </div>
      <p v-if="study.busy" role="status">
        Generando en Worker. Se conserva la última cohorte completa.
      </p>
      <p v-if="study.notice" role="status">{{ study.notice }}</p>
      <p v-if="study.error" role="alert">{{ study.error }}</p>
    </section>
    <template v-if="study.cohort && study.analysis && study.histograms">
      <section class="training-panel">
        <p class="eyebrow">COHORTE REGISTRADA · SEMILLA {{ study.cohort.options.seed }}</p>
        <h2>Mismas filas, dos políticas explícitas</h2>
        <p data-testid="audit-support">
          {{ study.cohort.options.count1 }} filas del canal 1 y
          {{ study.cohort.options.count2 }} del canal 2. Los parámetros de arriba preparan otra
          generación; estos resultados usan la cohorte registrada. No hay train/validación/test: se
          audita una regla fija en datos sintéticos.
        </p>
        <p>Hipótesis registrada: {{ study.recordedHypothesis || 'Sin hipótesis escrita.' }}</p>
        <details>
          <summary>Parámetros efectivos de esta cohorte</summary>
          <div class="training-table-wrap">
            <table>
              <caption>
                Mecanismo registrado, no borrador de la siguiente generación
              </caption>
              <thead>
                <tr>
                  <th>Canal</th>
                  <th>Filas</th>
                  <th>Prevalencia de receta</th>
                  <th>σ de medición</th>
                  <th>Desplazamiento</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>1</th>
                  <td>{{ study.cohort.options.count1 }}</td>
                  <td>{{ formatData(study.cohort.options.prevalence1) }}</td>
                  <td>{{ formatData(study.cohort.options.noise1) }}</td>
                  <td>{{ formatData(study.cohort.options.offset1) }}</td>
                </tr>
                <tr>
                  <th>2</th>
                  <td>{{ study.cohort.options.count2 }}</td>
                  <td>{{ formatData(study.cohort.options.prevalence2) }}</td>
                  <td>{{ formatData(study.cohort.options.noise2) }}</td>
                  <td>{{ formatData(study.cohort.options.offset2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
        <fieldset :disabled="study.busy" class="policies">
          <legend>Comparar decisiones, sin cambiar puntuaciones ni etiquetas</legend>
          <ParameterField
            id="audit-reference"
            v-model="study.settings.reference"
            label="Umbral común de referencia"
            :min="0"
            :max="1"
            :step="0.01"
          />
          <ParameterField
            v-if="!study.settings.separated"
            id="audit-alternative"
            v-model="study.settings.alternative"
            label="Umbral común alternativo"
            :min="0"
            :max="1"
            :step="0.01"
          />
          <label class="training-check separate"
            ><input
              :checked="study.settings.separated"
              type="checkbox"
              @change="study.separate(($event.target as HTMLInputElement).checked)"
            />Usar umbrales por canal en la alternativa</label
          >
          <template v-if="study.settings.separated"
            ><ParameterField
              id="audit-group-1"
              v-model="study.settings.group1"
              label="Umbral alternativo · canal 1"
              :min="0"
              :max="1"
              :step="0.01" /><ParameterField
              id="audit-group-2"
              v-model="study.settings.group2"
              label="Umbral alternativo · canal 2"
              :min="0"
              :max="1"
              :step="0.01"
          /></template>
        </fieldset>
        <p>
          Se deriva a revisión si puntuación ≥ umbral. Usar umbrales distintos por canal es una
          elección que requiere justificación y participación en contexto; estas métricas no la
          autorizan ni recomiendan.
        </p>
        <div class="audit-charts">
          <AuditDistribution
            v-for="g in auditGroups"
            :key="g"
            :group="g"
            :bins="study.histograms[g]"
            :maximum="maximum"
            :count="g === 'G1' ? study.cohort.options.count1 : study.cohort.options.count2"
            :reference="study.analysis.thresholds.reference[g]"
            :alternative="study.analysis.thresholds.alternative[g]"
          />
        </div>
        <div class="training-metrics">
          <article>
            <span>Exactitud global · referencia</span
            ><strong data-testid="audit-reference-accuracy">{{
              percent(study.analysis.reference.overall.accuracy)
            }}</strong>
          </article>
          <article>
            <span>Exactitud global · alternativa</span
            ><strong>{{ percent(study.analysis.alternative.overall.accuracy) }}</strong>
          </article>
          <article>
            <span>Pasan a revisión</span
            ><strong data-testid="audit-to-positive">{{
              study.analysis.transitions.overall.toPositive
            }}</strong>
          </article>
          <article>
            <span>Dejan de revisarse</span
            ><strong>{{ study.analysis.transitions.overall.toNegative }}</strong>
          </article>
        </div>
        <p class="audit-warning">
          La exactitud global no demuestra justicia. Los histogramas comparten escala de recuentos:
          los canales pequeños tienen barras más bajas. Compara también tasas, denominadores y
          consecuencias.
        </p>
      </section>
      <section class="training-panel">
        <h2>Costes: supuestos que hay que discutir</h2>
        <p>
          Coste de aciertos = 0; errores FP y FN tienen costes editables por canal. Son unidades
          ilustrativas del ejercicio, no valoración de personas ni precios universales. Coste bajo
          tampoco certifica justicia.
        </p>
        <fieldset :disabled="study.busy" class="cost-grid">
          <legend>Costes por error, entre 0 y 20</legend>
          <template v-for="g in auditGroups" :key="g"
            ><ParameterField
              :id="`audit-fp-${g}`"
              v-model="study.settings.costs[g].fp"
              :label="`Coste FP · canal ${g === 'G1' ? '1' : '2'}`"
              :min="0"
              :max="20"
              :step="0.5" /><ParameterField
              :id="`audit-fn-${g}`"
              v-model="study.settings.costs[g].fn"
              :label="`Coste FN · canal ${g === 'G1' ? '1' : '2'}`"
              :min="0"
              :max="20"
              :step="0.5"
          /></template>
        </fieldset>
        <AuditMetricsTable
          title="Política de referencia"
          :summary="study.analysis.reference"
        /><AuditMetricsTable title="Política alternativa" :summary="study.analysis.alternative" />
        <p class="small muted">
          Positivos/negativos se refieren a la etiqueta sintética. Precision usa TP/(TP+FP);
          recall/TPR usa TP/positivos; FPR usa FP/negativos; FNR usa FN/positivos. Los denominadores
          nulos se conservan como «No definida». El agregado suma recuentos y costes, no promedia
          porcentajes de canales.
        </p>
        <div class="training-table-wrap">
          <table>
            <caption>
              Diferencias observadas: canal 2 menos canal 1, en puntos porcentuales
            </caption>
            <thead>
              <tr>
                <th>Política</th>
                <th>Selección</th>
                <th>Recall / TPR</th>
                <th>FPR</th>
                <th>Precision</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(summary, key) in {
                  Referencia: study.analysis.reference,
                  Alternativa: study.analysis.alternative,
                }"
                :key="key"
              >
                <th>{{ key }}</th>
                <td>{{ gap(summary.gaps.selection) }}</td>
                <td>{{ gap(summary.gaps.recall) }}</td>
                <td>{{ gap(summary.gaps.fpr) }}</td>
                <td>{{ gap(summary.gaps.precision) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Son diferencias descriptivas, sin prueba de significación ni inferencia causal. Un grupo
          ausente no tiene rendimiento observado; pocas observaciones o pocos positivos/negativos
          pueden producir tasas inestables. Cambia la semilla o el soporte para explorar la
          variación.
        </p>
      </section>
      <section class="training-panel">
        <h2>¿Qué casos cambian de decisión?</h2>
        <p>
          Errores corregidos:
          <strong>{{ study.analysis.transitions.overall.errorsFixed }}</strong> · errores
          introducidos: <strong>{{ study.analysis.transitions.overall.errorsIntroduced }}</strong
          >. Los cambios describen la comparación, no qué política debería elegirse.
        </p>
        <div class="row-filters">
          <label
            >Canal de las filas
            <select v-model="group" aria-label="Canal de las filas auditadas">
              <option value="all">Ambos canales</option>
              <option value="G1">Canal 1</option>
              <option value="G2">Canal 2</option>
            </select></label
          ><label
            >Casos mostrados
            <select v-model="filter" aria-label="Filtrar decisiones de auditoría">
              <option value="all">Todos</option>
              <option value="changed">Cambiaron de decisión</option>
              <option value="fp">Falsos positivos de la alternativa</option>
              <option value="fn">Falsos negativos de la alternativa</option>
            </select></label
          >
        </div>
        <p>
          Primeras {{ Math.min(20, selectedRows.length) }} de {{ selectedRows.length }} filas
          seleccionadas. El informe conserva todas.
        </p>
        <div class="training-table-wrap">
          <table>
            <caption>
              Decisiones sobre las mismas filas de auditoría
            </caption>
            <thead>
              <tr>
                <th>ID</th>
                <th>Canal</th>
                <th>Etiqueta</th>
                <th>Puntuación</th>
                <th>Referencia</th>
                <th>Alternativa</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in selectedRows.slice(0, 20)" :key="r.id">
                <th>{{ r.id }}</th>
                <td>{{ r.group === 'G1' ? '1' : '2' }}</td>
                <td>{{ r.actual }}</td>
                <td>{{ formatData(r.score) }}</td>
                <td>{{ r.reference ? 'Revisar' : 'No derivar' }}</td>
                <td>{{ r.alternative ? 'Revisar' : 'No derivar' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="training-panel">
        <h2>Del número a una reflexión contextual</h2>
        <p>
          No se asigna una nota moral. Las métricas no certifican justicia, privacidad, causalidad
          ni idoneidad. Tampoco describen a personas que no están representadas ni efectos dentro de
          subgrupos o sobre individuos.
        </p>
        <label class="reflection"
          >1. Evidencia: ¿qué cambia y con qué soporte?
          <textarea
            v-model="study.reflection.evidence"
            maxlength="2000"
            rows="3"
            aria-label="Reflexión sobre evidencia"
            placeholder="Cita recuentos, denominadores y cambios; distingue agregado y canales."
          />
        </label>
        <label class="reflection"
          >2. Contexto: ¿qué información falta y quién puede verse afectado?
          <textarea
            v-model="study.reflection.context"
            maxlength="2000"
            rows="3"
            aria-label="Reflexión sobre contexto"
            placeholder="Origen y validez de las etiquetas, medición, exclusiones, subgrupos, privacidad y consecuencias."
          />
        </label>
        <label class="reflection"
          >3. Propuesta: ¿quién define los costes y cómo revisarías los efectos?
          <textarea
            v-model="study.reflection.action"
            maxlength="2000"
            rows="3"
            aria-label="Reflexión sobre propuesta"
            placeholder="Explica alternativas, participación, revisión humana y seguimiento; reconoce lo que aún no sabes."
          />
        </label>
        <p class="small muted">
          La reflexión se guarda en el informe exportado. No es un modelo ni un experimento
          importable. Los resultados y textos de esta vista permanecen en memoria hasta que los
          exportes.
        </p>
        <button class="button secondary" :disabled="study.busy" @click="download">
          Exportar informe de ética y grupos
        </button>
        <p v-if="downloadError" role="alert">{{ downloadError }}</p>
        <p class="small muted">
          <a
            href="https://fairlearn.org/v0.13/user_guide/assessment/perform_fairness_assessment.html"
            target="_blank"
            rel="noopener noreferrer"
            >Lectura: Fairlearn, evaluación y soporte</a
          >
          ·
          <a
            href="https://www.nist.gov/itl/ai-risk-management-framework/ai-risk-management-framework-faqs"
            target="_blank"
            rel="noopener noreferrer"
            >Marco NIST AI RMF</a
          >.
        </p>
      </section>
    </template>
  </div>
</template>
<style scoped>
.ethics-page {
  overflow-wrap: anywhere;
}
.audit-options,
.policies,
.cost-grid,
.mechanism-grid {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.audit-options,
.policies,
.cost-grid {
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 12px;
  margin: 20px 0;
}
.audit-options label,
.row-filters label,
.reflection {
  min-width: 0;
  display: grid;
  gap: 8px;
}
.hypothesis,
.mechanism,
.separate {
  grid-column: 1 / -1;
}
.mechanism-grid {
  margin-top: 20px;
}
.audit-charts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin: 24px 0;
}
.row-filters {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}
.reflection {
  margin: 24px 0;
}
select,
input[type='number'],
textarea {
  min-height: 44px;
  padding: 10px;
  border: 1px solid var(--muted);
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  max-width: 100%;
}
textarea {
  width: 100%;
  resize: vertical;
}
select {
  width: 100%;
  min-width: 0;
}
.audit-warning {
  padding: 16px;
  border-left: 4px solid var(--orange);
  background: var(--subtle);
}
@media (max-width: 900px) {
  .audit-charts {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 700px) {
  .audit-options,
  .policies,
  .cost-grid,
  .mechanism-grid {
    grid-template-columns: minmax(0, 1fr);
    padding: 12px;
  }
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useTrainingStore } from '@/stores/training';
import { useDatasetsStore } from '@/stores/datasets';
import { usePreferencesStore } from '@/stores/preferences';
import { learningRate } from '@/domain/training/optimizer';
import { parameterCount } from '@/domain/network/model';
import type { RecipeId } from '@/domain/data/types';
import { formatData } from '@/shared/utils/data-format';
import TrainingControls from './TrainingControls.vue';
import RecoveryPanel from './RecoveryPanel.vue';
import GradientControlPanel from './GradientControlPanel.vue';
import EarlyStoppingPanel from './EarlyStoppingPanel.vue';
import LossChart from './LossChart.vue';
import NetworkDiagram from '@/features/network/NetworkDiagram.vue';
import { trainingStatuses, trainingError } from './messages';
const session = useTrainingStore(),
  data = useDatasetsStore(),
  prefs = usePreferencesStore();
const recipe = ref<RecipeId>('moons');
const recoverySection = ref<HTMLElement>();
function showRecovery() {
  recoverySection.value?.scrollIntoView({ behavior: 'instant', block: 'start' });
  recoverySection.value?.focus();
}
onBeforeRouteLeave(() => {
  if (session.status === 'running') {
    session.command('PAUSE');
    session.notice = 'Entrenamiento pausado al cambiar de laboratorio.';
  }
});
const canAdvance = computed(
  () =>
    !!session.state &&
    !session.running &&
    !session.evaluating &&
    !session.state.frozen &&
    !session.state.earlyStopping?.reason &&
    session.state.epoch < (session.input?.config.epochs ?? 0),
);
const alerts: Record<string, string> = {
  gap: 'Brecha persistente: en las tres últimas épocas validación supera 1,5×train y la diferencia supera 0,1. Hipótesis: sobreajuste o diferencia de distribuciones. Contrasta más datos o una red menor.',
  vanishing:
    'Gradiente pequeño: ||dW|| < 10⁻⁸ en tres épocas y pérdida train > 0,1. Comprueba saturación, inicialización y escala; no prueba una causa por sí solo.',
  exploding:
    'Gradiente grande: ||dW|| > 100 en las tres últimas épocas. Compara escalado y una tasa menor antes de atribuir la causa.',
  plateau:
    'Meseta: cambio de pérdida train < 10⁻⁵ en cinco intervalos, con pérdida > 0,1. Compara tasa, capacidad y tarea.',
};
</script>
<template>
  <div class="page training-page">
    <p class="eyebrow">L06 / APRENDIZAJE</p>
    <h1>Entrenar con criterio.</h1>
    <RouterLink class="button secondary" to="/biblioteca"
      >Guardar o recuperar experimento</RouterLink
    >
    <button class="button secondary" @click="showRecovery">Ver recuperación automática</button>
    <p class="page-intro">
      Observa cómo cada lote cambia los pesos. Compara entrenamiento y validación, controla el ritmo
      y reserva test para una evaluación final.
    </p>
    <section class="training-panel">
      <h2>Elige los datos</h2>
      <div class="training-toolbar">
        <label for="training-recipe">Ejemplo de entrenamiento</label
        ><select id="training-recipe" v-model="recipe" :disabled="session.busy">
          <option value="moons">Dos lunas · no lineal</option>
          <option value="clouds">Dos nubes · clasificación</option>
          <option value="xor">XOR · interacciones</option>
          <option value="flowers">Flores sintéticas · tres clases</option>
          <option value="sine">Onda seno · regresión</option>
          <option value="energy">Energía sintética · regresión</option></select
        ><button class="button secondary" :disabled="session.busy" @click="session.preset(recipe)">
          Cargar ejemplo y sustituir datos</button
        ><RouterLink to="/lab/datos" class="text-link">Preparar mis propios datos →</RouterLink>
      </div>
      <p class="small muted">
        El ejemplo crea 400 muestras con semilla 42, divide 70/15/15 y ajusta el escalado solo con
        train. Sustituye el dataset activo y reinicia la sesión.
      </p>
      <p>
        Dataset: {{ data.dataset.rows.length }} muestras ·
        {{
          {
            binary: 'clasificación binaria',
            multiclass: 'clasificación multiclase',
            regression: 'regresión',
          }[data.dataset.task]
        }}
        · train {{ data.split?.train.length ?? 0 }} / validación
        {{ data.split?.validation.length ?? 0 }} / test {{ data.split?.test.length ?? 0 }}.
      </p>
      <label v-if="session.source?.unstable" class="training-check"
        ><input
          v-model="session.unstableAccepted"
          type="checkbox"
          :disabled="session.locked"
        />Acepto que el escaso soporte hace inestables las métricas de algunas clases.</label
      >
    </section>
    <TrainingControls />
    <section v-if="session.budget" class="training-panel">
      <h2>Presupuesto del experimento</h2>
      <p>
        {{ session.budget.parameters }} parámetros · {{ session.budget.updates }} actualizaciones
        previstas.
      </p>
      <p class="small muted">
        Coste orientativo: {{ formatData(session.budget.lower) }}–{{
          formatData(session.budget.upper)
        }}
        operaciones proporcionales a conexiones. Memoria numérica mínima en el proceso de
        entrenamiento: {{ formatData(session.budget.numericBytes / 1048576) }} MiB. Son
        estimaciones: no incluyen objetos, copias de recuperación, gráficos ni toda la memoria del
        navegador, y no predicen segundos de ejecución.
      </p>
      <label v-if="session.budget.extensive && !session.locked" class="training-check"
        ><input v-model="session.budgetAccepted" type="checkbox" />He revisado este presupuesto
        amplio y quiero iniciar el experimento.</label
      >
    </section>
    <p v-if="session.consulted" class="training-alert">
      Test ya se consultó con estos datos y partición. Crear otra sesión no lo convierte en una
      evaluación independiente; toma decisiones con validación.
    </p>
    <div class="training-toolbar">
      <button
        v-if="!session.locked"
        class="button primary"
        :disabled="session.busy"
        @click="session.initialize"
      >
        Inicializar modelo</button
      ><button v-else class="button secondary" @click="session.reset">
        Nueva sesión / cambiar configuración</button
      ><button class="button primary" :disabled="!canAdvance" @click="session.command('RUN')">
        Entrenar</button
      ><button
        class="button secondary"
        :disabled="session.status !== 'running'"
        @click="session.command('PAUSE')"
      >
        Pausar</button
      ><button
        class="button secondary"
        :disabled="!canAdvance"
        @click="session.command('STEP_BATCH')"
      >
        Un lote</button
      ><button
        class="button secondary"
        :disabled="!canAdvance"
        @click="session.command('STEP_EPOCH')"
      >
        Una época</button
      ><button
        class="button secondary"
        :disabled="!session.state || session.state.frozen"
        @click="session.command('CANCEL')"
      >
        Cancelar entrenamiento
      </button>
    </div>
    <label class="training-pace" for="training-pace"
      >Ritmo de entrenamiento<select
        id="training-pace"
        v-model.number="session.pace"
        :disabled="session.running"
      >
        <option :value="0">Máximo disponible</option>
        <option :value="1">1 actualización/s</option>
        <option :value="10">10 actualizaciones/s</option>
        <option :value="30">30 actualizaciones/s</option>
        <option :value="60">60 actualizaciones/s</option>
      </select></label
    >
    <p class="small muted">
      El ritmo limita actualizaciones reales. La velocidad visual de Ajustes regula la animación de
      conexiones. Pausar o cancelar descarta únicamente el lote incompleto.
    </p>
    <p role="status" class="training-status">
      {{ trainingStatuses[session.status] }} · Época {{ session.progress.epoch }} · Actualizaciones
      {{ session.progress.update }} · Lote {{ session.progress.batchIndex }} · Muestras recorridas
      {{ session.progress.cursor }}
    </p>
    <p v-if="session.error" role="alert" class="training-alert">
      {{ trainingError(session.error) }}
    </p>
    <p v-if="session.notice" class="training-alert">{{ session.notice }}</p>
    <template v-if="session.state && session.input"
      ><div class="training-metrics">
        <article>
          <span>Parámetros entrenables</span
          ><strong>{{ parameterCount(session.state.model.spec) }}</strong>
        </article>
        <article>
          <span>{{ session.state.updates ? 'Última tasa aplicada' : 'Tasa inicial' }}</span
          ><strong>{{
            formatData(
              learningRate(
                session.input.config.optimizer,
                Math.max(
                  0,
                  session.state.epoch -
                    Number(session.state.cursor === 0 && session.state.updates > 0),
                ),
                session.input.config.epochs,
              ),
            )
          }}</strong>
        </article>
        <article>
          <span>Última pérdida train</span
          ><strong>{{ formatData(session.state.history.at(-1)!.trainLoss) }}</strong>
        </article>
        <article>
          <span>Última pérdida validación</span
          ><strong>{{ formatData(session.state.history.at(-1)!.validationLoss) }}</strong>
        </article>
      </div>
      <p class="small muted">
        La época cero es el modelo inicial. Las pérdidas se registran al completar épocas; los
        contadores también reflejan lotes parciales de la época.
        {{
          session.input.config.spec.task === 'regression'
            ? 'El score es MSE, no R².'
            : 'La exactitud de seguimiento usa umbral 0,5 o argmax; no es una medida de calibración.'
        }}
      </p>
      <LossChart :history="session.state.history" /><NetworkDiagram
        tabindex="0"
        role="region"
        aria-label="Esquema del modelo activo; desplazamiento horizontal con teclado"
        :model="session.state.model"
        :layer="0"
        :neuron="0"
        :phase="session.running ? 1 : 0"
        :playing="session.running && !prefs.reducedMotion"
        :speed="prefs.value.speed"
      />
      <EarlyStoppingPanel
        v-if="session.state.earlyStopping"
        :state="session.state"
        :config="session.input.config.earlyStopping!"
        :can-continue="true"
      />
      <GradientControlPanel
        v-if="session.state.gradientControl"
        :control="session.state.gradientControl"
        :updates="session.state.updates"
      />
      <details>
        <summary>Registro por época y último lote</summary>
        <p>
          IDs del último lote confirmado:
          {{ session.state.lastBatchIds.join(', ') || 'Todavía no hay actualizaciones.' }}
        </p>
        <div class="training-table-wrap">
          <table>
            <caption>
              Últimas diez épocas; métricas evaluadas sin actualizar pesos
            </caption>
            <thead>
              <tr>
                <th>Época</th>
                <th>Actualización</th>
                <th>Train</th>
                <th>Validación</th>
                <th>Máximo ||dW||</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="point in session.state.history.slice(-10)" :key="point.epoch">
                <th>{{ point.epoch }}</th>
                <td>{{ point.update }}</td>
                <td>{{ formatData(point.trainLoss) }}</td>
                <td>{{ formatData(point.validationLoss) }}</td>
                <td>{{ formatData(point.gradientNorm) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Normas ||dW|| por capa del último lote, tras regularización y antes del recorte:
          {{ session.state.gradientNorms.map(formatData).join(' · ') }}. Estas normas no incluyen
          los sesgos. El panel de recorte muestra también ||db|| y las normas aplicadas.
        </p>
      </details>
      <section class="training-panel">
        <h2>Hipótesis, no diagnósticos automáticos</h2>
        <p v-if="!session.hypotheses.length">
          Aún no se cumplen los umbrales de una alerta, o no hay suficiente evidencia. Esto no
          certifica que el entrenamiento sea correcto.
        </p>
        <p v-for="alert in session.hypotheses" :key="alert" class="training-alert">
          {{ alerts[alert] }}
        </p>
        <p class="small muted">
          Se requieren al menos 20 muestras de validación y cuatro registros. Los umbrales son
          heurísticas didácticas, dependen de la escala y no se usan con test.
        </p>
      </section>
      <div class="training-toolbar">
        <RouterLink
          :to="
            session.input.config.spec.task === 'regression'
              ? '/lab/regresion'
              : '/lab/clasificacion'
          "
          class="button primary"
          >Evaluar este modelo →</RouterLink
        ><RouterLink to="/lab/arquitectura" class="text-link"
          >Revisar arquitectura y XOR</RouterLink
        >
      </div>
      <p class="small muted">
        La sesión activa vive en memoria. Los puntos de recuperación confirmados en disco permiten
        abrir una copia tras recargar; se recupera detenida para que decidas continuar.
      </p></template
    >
    <div ref="recoverySection" tabindex="-1"><RecoveryPanel /></div>
  </div>
</template>

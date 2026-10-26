<script setup lang="ts">
import { computed } from 'vue';
import type { PairedComparisonResult } from '@/application/training/paired-comparison';
import { forward } from '@/domain/network/model';
import NetworkDiagram from '@/features/network/NetworkDiagram.vue';
import LossChart from '@/features/training/LossChart.vue';
import { formatData } from '@/shared/utils/data-format';
const props = defineProps<{ result: PairedComparisonResult }>();
const probe = defineModel<number>({ required: true });
const lossCeiling = computed(() =>
  props.result.delta.validationLoss === null
    ? undefined
    : Math.max(
        0.001,
        ...props.result.runs.flatMap((r) =>
          r.experiment.checkpoint.history.flatMap((p) => [p.trainLoss, p.validationLoss]),
        ),
      ),
);
const lossHorizon = computed(() =>
  Math.max(1, ...props.result.runs.map((r) => r.experiment.checkpoint.history.at(-1)?.epoch ?? 0)),
);
const point = computed(() => props.result.probes[probe.value] ?? props.result.probes[0]!);
</script>
<template>
  <section class="projection-comparison" aria-label="Comparador A/B para proyección">
    <h2>Una base común. Dos resultados.</h2>
    <p>
      Controles bloqueados durante la proyección. Ambos ensayos usan los mismos datos y split. Los
      valores son de la ejecución registrada; el fondo de trabajo no se sustituye.
    </p>
    <p>
      Presupuesto común:
      {{
        result.options.budget
          ? `${result.options.budget.limit} ${result.options.budget.kind === 'time' ? 'ms de entrenamiento' : 'actualizaciones'}`
          : `${result.options.a.epochs} épocas`
      }}. Semillas A/B: {{ result.runs[0]!.experiment.config.seed }} /
      {{ result.runs[1]!.experiment.config.seed }}. Lotes A/B:
      {{ result.runs[0]!.experiment.config.batchSize }} /
      {{ result.runs[1]!.experiment.config.batchSize }}.
    </p>
    <p>
      {{ result.differences.length }} diferencia(s) de configuración:
      {{ result.differences.map((d) => d.field).join(', ') || 'ninguna' }}. Igualar tiempo, épocas o
      actualizaciones no iguala necesariamente operaciones. El tiempo depende del equipo y no es
      reproducible.
    </p>
    <p v-if="result.delta.validationLoss === null">
      Las funciones de pérdida son distintas: sus valores no se comparan y los ejes verticales se
      ajustan por separado.
    </p>
    <p v-else>Ambas curvas usan la misma escala vertical y el mismo horizonte horizontal.</p>
    <label
      >Sonda sincronizada del proyector<select v-model.number="probe">
        <option v-for="(p, i) in result.probes" :key="p.id" :value="i">
          {{ p.id }} · objetivo {{ p.target }}
        </option>
      </select></label
    >
    <p>Hipótesis registrada: {{ result.options.hypothesis || 'no escrita' }}.</p>
    <ul>
      <li v-for="d in result.differences" :key="d.field">
        <strong>{{ d.field }}</strong
        >: {{ JSON.stringify(d.a) }} → {{ JSON.stringify(d.b) }}
      </li>
    </ul>
    <div class="projection-grid">
      <article v-for="(run, i) in result.runs" :key="run.label">
        <h3>{{ run.label }}</h3>
        <p>
          Entrada común {{ point.id }} · salida
          {{ point.predictions[i]!.output.map(formatData).join(', ') }} · clase
          {{ point.predictions[i]!.label ?? 'regresión' }}
        </p>
        <NetworkDiagram
          tabindex="0"
          role="region"
          :aria-label="`Red ${i ? 'B' : 'A'} del proyector; desplazamiento horizontal con teclado`"
          :model="run.experiment.checkpoint.model"
          :cache="forward(run.experiment.checkpoint.model, point.predictions[i]!.transformed)"
          :layer="0"
          :neuron="0"
        />
        <p>
          <strong
            >Validación
            {{
              formatData(
                (run.stop?.point ?? run.experiment.checkpoint.history.at(-1)!).validationLoss,
              )
            }}</strong
          >
          · train
          {{ formatData((run.stop?.point ?? run.experiment.checkpoint.history.at(-1)!).trainLoss) }}
          · {{ run.experiment.checkpoint.updates }} updates ·
          {{ result.budgets[i]!.parameters }} parámetros.
        </p>
        <p v-if="run.stop">
          Parada: {{ run.stop.reason }} · {{ run.stop.elapsedMs.toFixed(1) }} ms medidos · métricas
          recalculadas en update {{ run.stop.point.update }}. El límite temporal se comprueba entre
          lotes y puede excederse por un lote.
        </p>
        <LossChart
          :ceiling="lossCeiling"
          :horizon="lossHorizon"
          :history="run.experiment.checkpoint.history"
          :segments="run.experiment.config.segments"
        />
        <p class="small">
          Curva: épocas completas; una parada a mitad de época tiene métricas actuales arriba.
          Presupuesto máximo estimado
          {{ result.budgets[i]!.upper.toLocaleString('es-ES') }} operaciones.
        </p>
      </article>
    </div>
  </section>
</template>
<style scoped>
.projection-comparison {
  overflow-wrap: anywhere;
  padding: 24px;
  border: 2px solid var(--accent);
  border-radius: 16px;
  margin: 24px 0;
  background: var(--surface);
  font-size: 1.1rem;
}
.projection-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  margin-top: 20px;
}
.projection-grid article {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
}
select {
  min-width: 0;
  width: 100%;
  min-height: 44px;
  background: var(--surface);
  color: var(--ink);
  border: 1px solid var(--line);
  padding: 10px;
  border-radius: 8px;
}
@media (max-width: 1000px) {
  .projection-grid {
    grid-template-columns: 1fr;
  }
  .projection-comparison {
    padding: 16px;
  }
}
</style>

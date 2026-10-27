<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useCatalogStore } from '@/stores/catalog';
import { useReviewStore } from '@/stores/review';
import { useNeuronStore } from '@/stores/neuron';
import { conceptControls } from '@/content/concept-controls';
import { failureCases } from '@/content/failure-cases';
const route = useRoute(),
  catalog = useCatalogStore(),
  review = useReviewStore(),
  neuron = useNeuronStore();
const id = computed(() => String(route.params.id)),
  record = computed(() => catalog.registry.records.get(id.value)),
  summary = computed(() => catalog.registry.summaries.find((c) => c.id === id.value));
const node = computed(() => catalog.registry.nodes.find((c) => c.id === id.value));
async function visit() {
  if (record.value && review.loaded && !review.saving) await review.mark(record.value, 'visited');
}
onMounted(async () => {
  await Promise.all([catalog.load(), review.load()]);
  await visit();
});
watch(id, () => void visit());
function label(id: string) {
  return catalog.registry.summaries.find((c) => c.id === id)?.title ?? id;
}
</script>
<template>
  <div class="page learning-page">
    <nav aria-label="Catálogo">
      <RouterLink to="/glosario">Glosario</RouterLink> ·
      <RouterLink to="/conceptos/mapa">Mapa de conceptos</RouterLink> ·
      <RouterLink to="/repaso">Repaso</RouterLink>
    </nav>
    <template v-if="summary"
      ><p class="eyebrow">{{ id }} · {{ summary.english }}</p>
      <h1>{{ summary.title }}</h1>
      <p v-if="node?.owner" class="panel">
        Paquete local {{ node.owner }} · contenido no revisado editorialmente, independientemente
        del estado declarado.
      </p>
      <template v-if="record"
        ><p class="muted">
          Versión {{ record.contentVersion }} ·
          {{
            { introductory: 'Inicial', intermediate: 'Intermedio', advanced: 'Avanzado' }[
              record.level
            ]
          }}
          · estado declarado:
          {{
            {
              proposed: 'Propuesto',
              specified: 'Previsto',
              implemented: 'Implementado',
              reviewed: 'Revisado',
              deprecated: 'Retirado',
            }[record.status]
          }}
          · objetivo {{ record.targetRelease }}
        </p>
        <p v-if="record.status === 'specified'">
          Actividad interactiva prevista fuera de v1.1. La ficha y el ejemplo estático ya pueden
          consultarse.
        </p>
        <p v-if="record.redirect">
          Ficha retirada.
          <RouterLink :to="'/conceptos/' + record.redirect"
            >Continuar en {{ record.redirect }}</RouterLink
          >
        </p>
        <section class="panel">
          <h2>Qué significa</h2>
          <p>{{ record.definition.es }}</p>
          <h3>Intuición</h3>
          <p>{{ record.intuition.es }}</p>
          <p class="muted">Límite de la analogía: {{ record.intuition.analogyLimit }}</p>
          <h3>Formulación</h3>
          <code>{{ record.formal.notation }}</code>
          <p>{{ record.formal.dimensions }}</p>
        </section>
        <section class="panel">
          <h2>Ejemplo numérico estático</h2>
          <p>Estas cifras pertenecen a la ficha; no representan la sesión actual.</p>
          <p v-if="record.numericExample.inputs">
            Entradas: {{ record.numericExample.inputs }} · pesos:
            {{ record.numericExample.weights }} · sesgo: {{ record.numericExample.bias }}
          </p>
          <p>{{ record.numericExample.calculation }}</p>
          <p>{{ record.numericExample.result }}</p>
          <p v-if="record.numericExample.z !== undefined">
            z = {{ record.numericExample.z }} · salida = {{ record.numericExample.output }}
          </p>
          <p v-for="(v, k) in record.numericExample.values" :key="k">{{ k }}: {{ v }}</p>
          <p>Unidades: {{ record.numericExample.units }}</p>
          <div v-if="record.numericExample.snapshotBindings.length">
            <h3>Lectura de la neurona de esta sesión</h3>
            <p>
              Separada del ejemplo estático: z = {{ neuron.result.z.toFixed(6) }} · activación =
              {{ neuron.result.a.toFixed(6) }}
            </p>
            <RouterLink to="/lab/neurona">Modificar la neurona</RouterLink>
          </div>
        </section>
        <section class="panel">
          <h2>Error frecuente</h2>
          <p>{{ record.frequentMistake.es }}</p>
          <p>{{ record.frequentMistake.correction }}</p>
          <ul>
            <li v-for="preset in record.misconceptionPresetIds" :key="preset">
              <RouterLink :to="{ path: '/taller', query: { failure: preset } }"
                >Investigar:
                {{ failureCases.find((c) => c.presetId === preset)?.title ?? preset }}</RouterLink
              >
            </li>
          </ul>
          <h3>Actividad</h3>
          <p>{{ record.activity }}</p>
          <p>Evidencia esperada: {{ record.evidence }}</p>
          <ul>
            <li v-for="c in record.relatedControls" :key="c.labId + c.controlId">
              <RouterLink
                :to="
                  conceptControls.find((r) => r.labId === c.labId && r.controlId === c.controlId)
                    ?.path ?? '/laboratorios'
                "
                >{{ c.labId }} ·
                {{
                  conceptControls.find((r) => r.labId === c.labId && r.controlId === c.controlId)
                    ?.label
                }}</RouterLink
              >
            </li>
          </ul>
        </section>
        <section class="panel">
          <h2>Antes y después</h2>
          <p>Prerrequisitos:</p>
          <ul>
            <li v-for="r in record.prerequisiteIds" :key="r">
              <RouterLink :to="'/conceptos/' + r">{{ r }} · {{ label(r) }}</RouterLink>
            </li>
          </ul>
          <p>Relacionados:</p>
          <ul>
            <li v-for="r in record.relatedIds" :key="r">
              <RouterLink :to="'/conceptos/' + r">{{ r }} · {{ label(r) }}</RouterLink>
            </li>
          </ul>
          <h3>Fuentes</h3>
          <ul>
            <li v-for="(source, i) in record.sources" :key="i">
              <a
                v-if="'url' in source"
                :href="source.url"
                target="_blank"
                rel="noopener noreferrer"
                >{{ source.title }}</a
              ><span v-else
                >{{ source.title }} · documentación del proyecto: {{ source.path }}</span
              >
            </li>
          </ul>
          <p>Comprobaciones: {{ record.validationRefs.join(', ') }}</p>
        </section>
        <section class="panel">
          <h2>Mi actividad</h2>
          <p>
            Visitado: {{ review.current(record).visited ? 'sí' : 'no' }} · explicado:
            {{ review.current(record).explained ? 'sí' : 'no' }} · repasado:
            {{ review.current(record).reviewed ? 'sí' : 'no' }}. Estos indicadores no certifican
            dominio.
          </p>
          <button
            class="button secondary"
            :disabled="review.saving || !review.loaded"
            @click="review.mark(record, 'explained')"
          >
            He explicado el concepto con mis palabras</button
          ><RouterLink class="button primary" :to="{ path: '/repaso', query: { id: record.id } }"
            >Practicar la pregunta</RouterLink
          >
          <p role="alert">{{ review.error }}</p>
        </section> </template
      ><template v-else
        ><p>{{ summary.definition }}</p>
        <code>{{ summary.formula }}</code>
        <p>
          Término de consulta. Aún no dispone de una ficha desarrollada ni de autoevaluación.
        </p></template
      ></template
    >
    <h1 v-else>Concepto no encontrado</h1>
  </div>
</template>

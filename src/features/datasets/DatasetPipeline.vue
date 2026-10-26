<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from '@/app/i18n';
import { useDatasetsStore } from '@/stores/datasets';
import { formatData } from '@/shared/utils/data-format';
import type { Imputation, Scaling } from '@/domain/data/pipeline';
import DatasetTable from './DatasetTable.vue';
const data = useDatasetsStore();
const { t } = useI18n();
const featureIds = ref<string[]>([]);
const imputation = ref<Imputation>('mean');
const scaling = ref<Scaling>('minmax');
const indicators = ref(false);
watch(
  () => data.dataset.features,
  (features) => (featureIds.value = features.map((f) => f.id)),
  { immediate: true },
);
const sample = computed(
  () => data.prepared?.matrix[data.dataset.rows.findIndex((r) => r.id === data.selectedId)],
);
function fit() {
  void data.fit({
    featureIds: featureIds.value,
    imputation: imputation.value,
    scaling: scaling.value,
    missingIndicators: indicators.value,
  });
}
</script>
<template>
  <section class="data-stage">
    <h2>{{ t('data.pipelineTitle') }}</h2>
    <p class="muted">{{ t('data.pipelineDescription') }}</p>
    <p v-if="!data.split" class="data-status">{{ t('data.splitRequired') }}</p>
    <form class="panel data-options" @submit.prevent="fit">
      <fieldset>
        <legend>{{ t('data.chooseFeatures') }}</legend>
        <div class="feature-checkboxes">
          <label v-for="feature in data.dataset.features" :key="feature.id"
            ><input v-model="featureIds" type="checkbox" :value="feature.id" />{{ feature.name }}
            <small>{{ feature.kind === 'numeric' ? '#' : 'Aa' }}</small></label
          >
        </div>
      </fieldset>
      <div class="data-field-pair">
        <label for="pipeline-imputation"
          >{{ t('data.imputation')
          }}<select id="pipeline-imputation" v-model="imputation">
            <option v-for="item in ['mean', 'median', 'mode'] as const" :key="item" :value="item">
              {{ t(`data.imputation.${item}`) }}
            </option>
          </select></label
        ><label for="pipeline-scaling"
          >{{ t('data.scaling')
          }}<select id="pipeline-scaling" v-model="scaling">
            <option
              v-for="item in ['none', 'minmax', 'standard', 'robust'] as const"
              :key="item"
              :value="item"
            >
              {{ t(`data.scaling.${item}`) }}
            </option>
          </select></label
        >
      </div>
      <label class="check-row"
        ><input v-model="indicators" type="checkbox" />{{ t('data.indicators') }}</label
      ><button class="button primary" :disabled="!data.split || data.busy">
        {{ t('data.fit') }}
      </button>
      <p class="small muted">{{ t('data.fitHint') }}</p>
      <p v-if="scaling === 'robust'" class="small muted">
        (x − mediana) / IQR. Cuartiles por interpolación lineal tipo 7 sobre train tras imputar. IQR
        = Q3 − Q1; si es cero, la escala es 1. No elimina ni recorta outliers.
      </p>
    </form>
    <template v-if="data.prepared"
      ><div class="panel pipeline-result">
        <h3>{{ t('data.fitted') }}</h3>
        <p class="dimension-flow">
          <span
            >{{ data.prepared.pipeline.inputFeatureIds.length }}
            {{ t('data.inputDimension') }}</span
          >
          →
          <strong
            >{{ data.prepared.pipeline.outputFeatureIds.length }}
            {{ t('data.outputDimension') }}</strong
          >
        </p>
        <div class="pipeline-columns">
          <article v-for="column in data.prepared.pipeline.columns" :key="column.id">
            <h4>{{ data.dataset.features.find((f) => f.id === column.id)?.name }}</h4>
            <dl>
              <dt>{{ t('data.fill') }}</dt>
              <dd>{{ formatData(column.fill) }}</dd>
              <template v-if="column.kind === 'numeric'"
                ><dt>{{ t('data.mean') }}</dt>
                <dd>{{ formatData(column.mean) }}</dd>
                <dt>{{ t('data.std') }}</dt>
                <dd>{{ formatData(column.std) }}</dd>
                <dt>{{ t('data.min') }}</dt>
                <dd>{{ formatData(column.min) }}</dd>
                <dt>{{ t('data.max') }}</dt>
                <dd>{{ formatData(column.max) }}</dd></template
              >
              <template v-if="column.kind === 'numeric' && column.robust">
                <dt>Mediana</dt>
                <dd>{{ formatData(column.robust.median) }}</dd>
                <dt>Q1 / Q3</dt>
                <dd>{{ formatData(column.robust.q1) }} / {{ formatData(column.robust.q3) }}</dd>
                <dt>IQR</dt>
                <dd>{{ formatData(column.robust.iqr) }}</dd>
              </template>
            </dl>
            <p v-if="column.kind === 'numeric' && column.constant" class="small muted">
              {{ t('data.constant') }}
            </p>
            <p
              v-if="column.kind === 'numeric' && column.robust?.iqr === 0 && !column.constant"
              class="small muted"
            >
              IQR cero con valores distintos: se centra en la mediana y se usa escala 1.
            </p>
            <template v-if="column.kind === 'categorical'"
              ><p class="small">{{ t('data.vocabulary') }}: {{ column.vocabulary.join(', ') }}</p>
              <p class="small muted">{{ t('data.unknown') }}</p></template
            >
          </article>
        </div>
        <div v-if="sample" class="sample-transform">
          <h4>{{ t('data.transformation') }} · {{ data.selectedId }}</h4>
          <dl>
            <template v-for="(label, index) in data.prepared.pipeline.outputLabels" :key="index"
              ><dt>{{ label }}</dt>
              <dd>{{ formatData(sample[index]!) }}</dd></template
            >
          </dl>
        </div>
      </div>
      <DatasetTable prepared
    /></template>
  </section>
</template>

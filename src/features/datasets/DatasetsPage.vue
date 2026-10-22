<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { useI18n } from '@/app/i18n';
import { useDatasetsStore } from '@/stores/datasets';
import { usePreferencesStore } from '@/stores/preferences';
import type { SplitName } from '@/domain/data/types';
import DatasetGenerator from './DatasetGenerator.vue';
import DatasetScatter from './DatasetScatter.vue';
import DatasetTable from './DatasetTable.vue';
import DatasetInspector from './DatasetInspector.vue';
import DatasetSplit from './DatasetSplit.vue';
import DatasetPipeline from './DatasetPipeline.vue';
import DatasetFiles from './DatasetFiles.vue';
import DatasetTrace from './DatasetTrace.vue';
const { t } = useI18n();
const data = useDatasetsStore();
const prefs = usePreferencesStore();
const tab = ref('explore');
const tabs = ['explore', 'divide', 'prepare', 'files'] as const;
const prepared = ref(false);
const filter = ref<SplitName | 'all'>('all');
const xId = ref('x1');
const yId = ref('x2');
const mode = ref<'inspect' | 'add' | 'move'>('inspect');
const axes = computed(() =>
  prepared.value && data.prepared
    ? data.prepared.pipeline.outputFeatureIds.map((id, i) => ({
        id,
        name: data.prepared!.pipeline.outputLabels[i]!,
      }))
    : data.dataset.features
        .filter((f) => f.kind === 'numeric')
        .map((f) => ({ id: f.id, name: f.name })),
);
watch(
  axes,
  (values) => {
    if (!values.some((f) => f.id === xId.value)) xId.value = values[0]?.id ?? '';
    if (!values.some((f) => f.id === yId.value)) yId.value = values[1]?.id ?? values[0]?.id ?? '';
  },
  { immediate: true },
);
watch(
  () => data.prepared,
  (value) => {
    if (!value) prepared.value = false;
  },
);
watch(
  () => data.split,
  (value) => {
    if (!value) filter.value = 'all';
  },
);
function add(x = 0, y = 0) {
  const features = Object.fromEntries(
    data.dataset.features.map((f) => [f.id, f.kind === 'numeric' ? 0 : null]),
  );
  if (xId.value) features[xId.value] = x;
  if (yId.value) features[yId.value] = y;
  data.edit({
    type: 'add',
    row: {
      id: `manual-${data.dataset.revision}-${data.dataset.rows.length + 1}`,
      features,
      target: data.dataset.task === 'regression' ? 0 : data.dataset.classOrder![0]!,
      origin: 'manual',
    },
  });
}
function point(x: number, y: number) {
  if (mode.value === 'add') add(x, y);
  else if (mode.value === 'move' && data.selected)
    data.edit({
      type: 'replace',
      row: {
        ...data.selected,
        features: { ...data.selected.features, [xId.value]: x, [yId.value]: y },
        origin: 'manual',
      },
    });
}
const tags = {
  noise: 'data.noise',
  outlier: 'data.outliers',
  label: 'data.labelNoise',
  missing: 'data.missing',
  duplicate: 'data.duplicates',
} as const;
onScopeDispose(data.cancel);
</script>
<template>
  <div class="page datasets-page">
    <header class="lab-heading">
      <div>
        <p class="eyebrow">{{ t('data.eyebrow') }}</p>
        <h1>{{ t('data.title') }}</h1>
        <p>{{ t('data.description') }}</p>
      </div>
      <span class="live-label">{{ t(`data.${data.dataset.task}`) }}</span>
    </header>
    <div class="dataset-summary">
      <div>
        <strong>{{ data.dataset.rows.length }}</strong
        ><span>{{ t('data.rows') }}</span>
      </div>
      <div>
        <strong>{{ data.dataset.features.length }}</strong
        ><span>{{ t('data.features') }}</span>
      </div>
      <div>
        <strong>{{
          data.dataset.task === 'regression' ? 'ℝ' : data.dataset.classOrder?.length
        }}</strong
        ><span>{{ t(data.dataset.task === 'regression' ? 'data.target' : 'data.classes') }}</span>
      </div>
      <div>
        <strong>{{ data.profile.unlabelled }}</strong
        ><span>{{ t('data.unlabelled') }}</span>
      </div>
      <div>
        <strong>{{ data.dataset.revision }}</strong
        ><span>{{ t('data.revision') }}</span>
      </div>
    </div>
    <div class="data-view-switch" role="group" :aria-label="t('data.title')">
      <button v-for="item in tabs" :key="item" :aria-pressed="tab === item" @click="tab = item">
        {{ t(`data.${item}`) }}
      </button>
    </div>
    <div v-if="data.busy" class="data-status operation-status" role="status">
      <span>{{ t('data.worker') }}</span
      ><button class="button secondary" @click="data.cancel()">{{ t('data.cancel') }}</button>
    </div>
    <p v-if="data.error" role="alert" class="data-status warning">
      {{ t(`data.error.${data.error.code}`) }}
      <span v-if="data.error.detail">({{ data.error.detail }})</span>
    </p>
    <p class="data-notice" role="status">{{ t(`data.notice.${data.notice}`) }}</p>
    <template v-if="tab === 'explore'"
      ><div class="dataset-workspace">
        <DatasetGenerator />
        <div class="dataset-visual">
          <div class="panel map-options">
            <label for="map-view"
              >{{ t('data.view')
              }}<select
                id="map-view"
                :value="prepared ? 'prepared' : 'raw'"
                @change="prepared = ($event.target as HTMLSelectElement).value === 'prepared'"
              >
                <option value="raw">{{ t('data.raw') }}</option>
                <option value="prepared" :disabled="!data.prepared">
                  {{ t('data.transformed') }}
                </option>
              </select></label
            ><label for="map-x"
              >{{ t('data.xaxis')
              }}<select id="map-x" v-model="xId">
                <option v-for="f in axes" :key="f.id" :value="f.id">{{ f.name }}</option>
              </select></label
            ><label for="map-y"
              >{{ t('data.yaxis')
              }}<select id="map-y" v-model="yId">
                <option v-for="f in axes" :key="f.id" :value="f.id">{{ f.name }}</option>
              </select></label
            ><label for="map-filter"
              >{{ t('data.filter')
              }}<select id="map-filter" v-model="filter">
                <option value="all">{{ t('data.all') }}</option>
                <option
                  v-for="name in ['train', 'validation', 'test'] as const"
                  :key="name"
                  :value="name"
                  :disabled="!data.split"
                >
                  {{ t(`data.${name}`) }}
                </option>
              </select></label
            ><label for="map-mode"
              >{{ t('data.mode')
              }}<select id="map-mode" v-model="mode" :disabled="prepared">
                <option value="inspect">{{ t('data.inspectPoint') }}</option>
                <option value="add">{{ t('data.addPoint') }}</option>
                <option value="move">{{ t('data.movePoint') }}</option>
              </select></label
            ><button class="button secondary" :disabled="data.busy" @click="add()">
              {{ t('data.addRow') }}
            </button>
          </div>
          <DatasetScatter
            :x-id="xId"
            :y-id="yId"
            :prepared="prepared"
            :filter="filter"
            :mode="mode"
            @point="point"
          />
          <p class="small muted">{{ t('data.coordinateHelp') }}</p>
          <DatasetTable :prepared="prepared" :filter="filter" />
        </div>
        <DatasetInspector />
      </div>
      <section class="panel dataset-profile">
        <h2>{{ t('data.profile') }}</h2>
        <div class="profile-columns">
          <div>
            <h3>{{ t('data.support') }}</h3>
            <dl>
              <template v-for="(count, label) in data.profile.support" :key="label"
                ><dt>{{ label }}</dt>
                <dd>{{ count }}</dd></template
              >
            </dl>
            <p v-if="data.dataset.task === 'regression'" class="small muted">
              {{ t('data.regression') }}
            </p>
          </div>
          <div>
            <h3>{{ t('data.provenance') }}</h3>
            <dl>
              <template v-for="(count, tag) in data.profile.defects" :key="tag"
                ><dt>{{ t(tags[tag]) }}</dt>
                <dd>{{ count }}</dd></template
              >
            </dl>
          </div>
        </div>
        <p class="small muted">{{ t('data.defectNote') }}</p>
      </section></template
    ><DatasetSplit v-else-if="tab === 'divide'" /><DatasetPipeline
      v-else-if="tab === 'prepare'"
    /><DatasetFiles v-else @imported="tab = 'explore'" /><DatasetTrace />
    <p class="data-explanation">{{ t(`data.${prefs.value.level}`) }}</p>
    <details class="data-hash">
      <summary>{{ t('data.hash') }}</summary>
      <code>{{ data.hash }}</code>
      <p>{{ t('data.hashHelp') }}</p>
    </details>
    <p class="small muted">{{ t('data.memory') }}</p>
  </div>
</template>

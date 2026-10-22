<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from '@/app/i18n';
import { useDatasetsStore } from '@/stores/datasets';
import { formatData } from '@/shared/utils/data-format';
import type { SplitName } from '@/domain/data/types';
const props = defineProps<{ prepared?: boolean; filter?: SplitName | 'all' }>();
const data = useDatasetsStore();
const { t } = useI18n();
const page = ref(0);
const rows = computed(() => {
  const ids =
    props.filter && props.filter !== 'all' ? new Set(data.split?.[props.filter] ?? []) : undefined;
  return data.dataset.rows
    .map((row, index) => ({ row, index }))
    .filter((item) => !ids || ids.has(item.row.id));
});
const pages = computed(() => Math.max(1, Math.ceil(rows.value.length / 20)));
const visible = computed(() => rows.value.slice(page.value * 20, page.value * 20 + 20));
const columns = computed(() =>
  props.prepared && data.prepared
    ? data.prepared.pipeline.outputLabels
    : data.dataset.features.map((f) => f.name),
);
watch([() => data.dataset, () => props.filter, () => props.prepared], () => (page.value = 0));
</script>
<template>
  <section class="panel dataset-table-panel">
    <div class="panel-heading">
      <h2>{{ t(prepared ? 'data.preparedTable' : 'data.table') }}</h2>
      <span class="small muted">{{ rows.length }} {{ t('data.rows') }}</span>
    </div>
    <div
      class="data-table-scroll"
      tabindex="0"
      :aria-label="t(prepared ? 'data.preparedTable' : 'data.table')"
    >
      <table class="dataset-table">
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th v-for="(column, index) in columns" :key="index" scope="col">{{ column }}</th>
            <th scope="col">{{ data.dataset.targetName }} · y</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in visible"
            :key="item.row.id"
            :class="{ 'selected-row': data.selectedId === item.row.id }"
          >
            <th scope="row">
              <button
                :aria-label="t('data.rowSelect', { id: item.row.id })"
                :aria-pressed="data.selectedId === item.row.id"
                @click="data.selectedId = item.row.id"
              >
                {{ item.row.id }}
              </button>
            </th>
            <td
              v-for="(value, index) in prepared && data.prepared
                ? data.prepared.matrix[item.index]
                : data.dataset.features.map((f) => item.row.features[f.id]!)"
              :key="index"
              :title="String(value)"
            >
              {{ formatData(value!) }}
            </td>
            <td>{{ formatData(item.row.target) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="!rows.length" class="empty-state">{{ t('data.noRows') }}</p>
    <div class="data-pagination">
      <button
        class="button secondary"
        :disabled="page === 0"
        :aria-label="t('data.previous')"
        @click="page--"
      >
        ←</button
      ><span>{{ t('data.page', { current: page + 1, total: pages }) }}</span
      ><button
        class="button secondary"
        :disabled="page >= pages - 1"
        :aria-label="t('data.next')"
        @click="page++"
      >
        →
      </button>
    </div>
  </section>
</template>

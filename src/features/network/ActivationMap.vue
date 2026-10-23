<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@/app/i18n';
import { formatData } from '@/shared/utils/data-format';
const props = defineProps<{
  cells: { x: number; y: number; value: number }[];
  resolution: number;
}>();
const { t } = useI18n();
const range = computed(() => {
  const v = props.cells.map((c) => c.value);
  return { min: Math.min(...v), max: Math.max(...v), scale: Math.max(1e-12, ...v.map(Math.abs)) };
});
</script>
<template>
  <section class="panel network-map">
    <h2>{{ t('net.map') }}</h2>
    <p class="small muted">{{ t('net.mapNote') }}</p>
    <svg viewBox="0 0 400 350" role="img" :aria-label="t('net.map')">
      <rect
        v-for="(cell, i) in cells"
        :key="i"
        :x="38 + ((i % resolution) * 320) / resolution"
        :y="10 + ((resolution - 1 - Math.floor(i / resolution)) * 300) / resolution"
        :width="320 / resolution + 0.2"
        :height="300 / resolution + 0.2"
        :class="['heat-cell', { negative: cell.value < 0 }]"
        :opacity="0.12 + (0.88 * Math.abs(cell.value)) / range.scale"
      >
        <title>
          {{ `x₁=${formatData(cell.x)}, x₂=${formatData(cell.y)}, a=${formatData(cell.value)}` }}
        </title>
      </rect>
      <text x="38" y="334">−0,2</text>
      <text x="330" y="334">1,2 · x₁</text>
      <text x="5" y="20">x₂</text>
    </svg>
    <p>min {{ formatData(range.min) }} · max {{ formatData(range.max) }}</p>
    <details>
      <summary>{{ t('net.value') }} · {{ cells.length }} {{ t('net.samples') }}</summary>
      <div class="data-table-scroll">
        <table class="dataset-table">
          <thead>
            <tr>
              <th>x₁</th>
              <th>x₂</th>
              <th>a</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(c, i) in cells" :key="i">
              <td>{{ formatData(c.x) }}</td>
              <td>{{ formatData(c.y) }}</td>
              <td>{{ formatData(c.value) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </section>
</template>

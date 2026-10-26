<script setup lang="ts">
import { computed } from 'vue';
import type { compareGroupPolicies } from '@/domain/training/group-audit';
import { formatData } from '@/shared/utils/data-format';
const props = defineProps<{
  title: string;
  summary: ReturnType<typeof compareGroupPolicies>['reference'];
}>();
const rows = computed(() => [
  { name: 'Canal 1', m: props.summary.groups.G1 },
  { name: 'Canal 2', m: props.summary.groups.G2 },
  { name: 'Total', m: props.summary.overall },
]);
const rate = (value: number | null) =>
  value === null ? 'No definida' : `${formatData(value * 100)} %`;
const ratio = (value: number | null, n: number, d: number) => `${rate(value)} (${n}/${d})`;
</script>
<template>
  <section class="audit-table">
    <h3>{{ title }}</h3>
    <div class="training-table-wrap">
      <table>
        <caption>
          {{
            title
          }}: errores y soporte
        </caption>
        <thead>
          <tr>
            <th>Canal</th>
            <th>N</th>
            <th>Positivos</th>
            <th>Negativos</th>
            <th>TP</th>
            <th>FP</th>
            <th>TN</th>
            <th>FN</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.name">
            <th scope="row">{{ r.name }}</th>
            <td>{{ r.m.n }}</td>
            <td>{{ r.m.positives }}</td>
            <td>{{ r.m.negatives }}</td>
            <td>{{ r.m.tp }}</td>
            <td>{{ r.m.fp }}</td>
            <td>{{ r.m.tn }}</td>
            <td>{{ r.m.fn }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="training-table-wrap">
      <table>
        <caption>
          {{
            title
          }}: tasas con denominadores y coste
        </caption>
        <thead>
          <tr>
            <th>Canal</th>
            <th>Exactitud</th>
            <th>Prevalencia</th>
            <th>Selección</th>
            <th>Precision</th>
            <th>Recall / TPR</th>
            <th>FPR</th>
            <th>FNR</th>
            <th>Coste total</th>
            <th>Coste medio</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.name">
            <th scope="row">{{ r.name }}</th>
            <td>{{ ratio(r.m.accuracy, r.m.tp + r.m.tn, r.m.n) }}</td>
            <td>{{ ratio(r.m.prevalence, r.m.positives, r.m.n) }}</td>
            <td>{{ ratio(r.m.selection, r.m.tp + r.m.fp, r.m.n) }}</td>
            <td>{{ ratio(r.m.precision, r.m.tp, r.m.tp + r.m.fp) }}</td>
            <td>{{ ratio(r.m.recall, r.m.tp, r.m.positives) }}</td>
            <td>{{ ratio(r.m.fpr, r.m.fp, r.m.negatives) }}</td>
            <td>{{ ratio(r.m.fnr, r.m.fn, r.m.positives) }}</td>
            <td>{{ formatData(r.m.totalCost) }}</td>
            <td>{{ r.m.meanCost === null ? 'No definido' : formatData(r.m.meanCost) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

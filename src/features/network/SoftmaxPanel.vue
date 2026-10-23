<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { softmax, softmaxJacobian } from '@/domain/network/model';
import { useI18n } from '@/app/i18n';
import { formatData } from '@/shared/utils/data-format';
import ParameterField from '@/shared/ui/ParameterField.vue';
const { t } = useI18n();
const size = ref(3),
  values = ref([2, 1, 0]);
watch(size, (n) => {
  values.value = Array.from({ length: n }, (_, i) => values.value[i] ?? 0);
});
const probabilities = computed(() => softmax(values.value));
const jacobian = computed(() => softmaxJacobian(values.value));
</script>
<template>
  <section class="panel network-section">
    <h2>{{ t('net.softmax') }}</h2>
    <p>{{ t('net.softmaxNote') }}</p>
    <label for="softmax-size"
      >{{ t('net.logits')
      }}<select id="softmax-size" v-model.number="size">
        <option v-for="n in 9" :key="n" :value="n + 1">{{ n + 1 }}</option>
      </select></label
    >
    <div class="network-controls">
      <ParameterField
        v-for="(_, i) in values"
        :id="`logit-${i}`"
        :key="i"
        v-model="values[i]!"
        :label="t('net.logit', { index: i + 1 })"
        :min="-1000"
        :max="1000"
        :step="0.1"
      />
    </div>
    <h3>{{ t('net.probabilities') }}</h3>
    <div class="probability-list">
      <div v-for="(p, i) in probabilities" :key="i">
        <span>p{{ i + 1 }} = {{ formatData(p) }}</span
        ><span class="probability-track"><span :style="{ width: `${p * 100}%` }" /></span>
      </div>
    </div>
    <p data-testid="softmax-sum">Σp = {{ formatData(probabilities.reduce((a, b) => a + b, 0)) }}</p>
    <details>
      <summary>{{ t('net.jacobian') }}</summary>
      <div class="data-table-scroll">
        <table class="dataset-table">
          <thead>
            <tr>
              <th>i / j</th>
              <th v-for="n in size" :key="n">z{{ n }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in jacobian" :key="i">
              <th scope="row">p{{ i + 1 }}</th>
              <td v-for="(v, j) in row" :key="j">{{ formatData(v) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </section>
</template>

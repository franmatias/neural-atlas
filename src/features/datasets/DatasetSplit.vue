<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from '@/app/i18n';
import { useDatasetsStore } from '@/stores/datasets';
import { splitNames, type SplitStrategy } from '@/domain/data/types';
import { splitWarnings } from '@/domain/data/split';
import { formatData } from '@/shared/utils/data-format';
const data = useDatasetsStore();
const { t } = useI18n();
const strategy = ref<SplitStrategy>('stratified');
const train = ref(70);
const validation = ref(15);
const seed = ref(42);
const strategies: SplitStrategy[] = [
  'random',
  'stratified',
  'grouped',
  'stratified-grouped',
  'temporal',
];
const warnings = computed(() => (data.split ? splitWarnings(data.split) : undefined));
watch(
  () => data.dataset.task,
  (task) => {
    strategy.value = task === 'regression' ? 'random' : 'stratified';
  },
  { immediate: true },
);
function divide() {
  void data.divide({
    strategy: strategy.value,
    seed: seed.value,
    ratios: [
      train.value / 100,
      validation.value / 100,
      (100 - train.value - validation.value) / 100,
    ],
  });
}
</script>
<template>
  <section class="data-stage">
    <h2>{{ t('data.splitTitle') }}</h2>
    <p class="muted">{{ t('data.splitDescription') }}</p>
    <form class="panel data-options" @submit.prevent="divide">
      <label for="split-strategy"
        >{{ t('data.strategy')
        }}<select id="split-strategy" v-model="strategy">
          <option
            v-for="item in strategies"
            :key="item"
            :value="item"
            :disabled="data.dataset.task === 'regression' && item.includes('stratified')"
          >
            {{ t(`data.strategy.${item}`) }}
          </option>
        </select></label
      >
      <div class="split-proportions">
        <label for="split-train"
          >{{ t('data.trainPercent')
          }}<input
            id="split-train"
            v-model.number="train"
            type="number"
            min="10"
            max="80"
            step="1"
            required /></label
        ><label for="split-validation"
          >{{ t('data.validationPercent')
          }}<input
            id="split-validation"
            v-model.number="validation"
            type="number"
            min="10"
            max="80"
            step="1"
            required
        /></label>
        <div>
          <span>{{ t('data.testPercent') }}</span
          ><output>{{ 100 - train - validation }}%</output>
        </div>
        <label for="split-seed"
          >{{ t('data.splitSeed')
          }}<input
            id="split-seed"
            v-model.number="seed"
            type="number"
            min="0"
            max="4294967295"
            step="1"
            required
        /></label>
      </div>
      <p class="small muted">
        {{ t(strategy === 'temporal' ? 'data.temporalHelp' : 'data.groupAuto') }}
      </p>
      <button class="button primary" :disabled="data.busy">{{ t('data.applySplit') }}</button>
    </form>
    <div v-if="data.split" class="panel split-result">
      <h3>{{ t('data.actualSplit') }} · {{ t(`data.strategy.${data.split.strategy}`) }}</h3>
      <div class="split-bar" :aria-label="t('data.actualSplit')">
        <div
          v-for="name in splitNames"
          :key="name"
          :class="`split-${name}`"
          :style="{ flex: data.split[name].length }"
        >
          <span>{{ t(`data.${name}`) }} {{ data.split[name].length }}</span>
        </div>
      </div>
      <div class="data-metrics">
        <div v-for="name in splitNames" :key="name">
          <span>{{ t(`data.${name}`) }}</span
          ><strong>{{ data.split[name].length }}</strong
          ><small
            >{{
              formatData(
                (100 * data.split[name].length) /
                  Math.max(1, data.dataset.rows.length - data.profile.unlabelled),
              )
            }}%</small
          >
        </div>
      </div>
      <p
        class="data-status"
        :class="{ warning: warnings?.blocked || warnings?.unstable }"
        role="status"
      >
        {{
          t(
            warnings?.blocked
              ? 'data.splitBlocked'
              : warnings?.unstable
                ? 'data.splitUnstable'
                : 'data.splitReady',
          )
        }}
      </p>
      <div v-if="data.dataset.classOrder" class="data-table-scroll">
        <table class="dataset-table">
          <caption>
            {{
              t('data.support')
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ t('data.target') }}</th>
              <th v-for="name in splitNames" :key="name" scope="col">{{ t(`data.${name}`) }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in data.dataset.classOrder" :key="c">
              <th scope="row">{{ c }}</th>
              <td v-for="name in splitNames" :key="name">
                {{ data.split.supportByClass[c]?.[name] }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <details>
        <summary>{{ t('data.splitIds') }}</summary>
        <div v-for="name in splitNames" :key="name" class="split-ids">
          <strong>{{ t(`data.${name}`) }}</strong
          ><code>{{ data.split[name].join(', ') }}</code>
        </div>
      </details>
    </div>
  </section>
</template>

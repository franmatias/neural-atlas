<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@/app/i18n';
import { defaultGenerator, type GeneratorOptions } from '@/domain/data/types';
import { datasetRecipes, datasetScenarios } from '@/content/dataset-recipes';
import { useDatasetsStore } from '@/stores/datasets';
import ParameterField from '@/shared/ui/ParameterField.vue';
const { t } = useI18n();
const data = useDatasetsStore();
const draft = ref<GeneratorOptions>({ ...defaultGenerator });
const recipe = computed(() => datasetRecipes.find((r) => r.id === draft.value.recipe)!);
const regression = computed(() => ['energy', 'sine'].includes(draft.value.recipe));
const rates = ['outliers', 'labelNoise', 'missing', 'duplicates'] as const;
const currentScenario = computed(
  () =>
    datasetScenarios.find((item) =>
      Object.entries(item.options).every(
        ([key, value]) => draft.value[key as keyof GeneratorOptions] === value,
      ),
    )?.id ?? 'custom',
);
function scenario(event: Event) {
  const selected = datasetScenarios.find((s) => s.id === (event.target as HTMLSelectElement).value);
  if (!selected) return;
  draft.value = { ...draft.value, ...selected.options };
}
function generate() {
  void data.generate({ ...draft.value, labelNoise: regression.value ? 0 : draft.value.labelNoise });
}
</script>
<template>
  <form class="panel data-generator" @submit.prevent="generate">
    <h2>{{ t('data.generateTitle') }}</h2>
    <label for="data-scenario">{{ t('neuron.preset') }}</label
    ><select id="data-scenario" :value="currentScenario" @change="scenario">
      <option value="custom" disabled>{{ t('neuron.custom') }}</option>
      <option v-for="item in datasetScenarios" :key="item.id" :value="item.id">
        {{ item.title }}
      </option></select
    ><label for="data-recipe">{{ t('data.recipe') }}</label
    ><select id="data-recipe" v-model="draft.recipe">
      <option v-for="item in datasetRecipes" :key="item.id" :value="item.id">
        {{ item.title }}
      </option>
    </select>
    <p class="small muted">{{ recipe.description }}</p>
    <div class="data-field-pair">
      <label for="data-count"
        >{{ t('data.count')
        }}<input
          id="data-count"
          v-model.number="draft.count"
          type="number"
          min="20"
          max="10000"
          step="1"
          required /></label
      ><label for="data-seed"
        >{{ t('data.seed')
        }}<input
          id="data-seed"
          v-model.number="draft.seed"
          type="number"
          min="0"
          max="4294967295"
          step="1"
          required
      /></label>
    </div>
    <ParameterField
      id="data-noise"
      :label="t('data.noise')"
      :model-value="draft.noise"
      :min="0"
      :max="1"
      :step="0.01"
      @update:model-value="draft.noise = $event"
    />
    <fieldset>
      <legend>{{ t('data.defects') }}</legend>
      <fieldset
        v-for="key in rates"
        :key="key"
        class="rate-field"
        :disabled="key === 'labelNoise' && regression"
      >
        <ParameterField
          :id="`data-${key}`"
          :label="`${t(`data.${key}`)} (%)`"
          :model-value="Math.round(draft[key] * 100)"
          :min="0"
          :max="key === 'labelNoise' || key === 'missing' ? 30 : 20"
          :step="1"
          @update:model-value="draft[key] = $event / 100"
        />
      </fieldset>
      <fieldset class="rate-field" :disabled="regression || draft.recipe === 'flowers'">
        <ParameterField
          id="data-minority"
          :label="`${t('data.minority')} (%)`"
          :model-value="Math.round(draft.minority * 100)"
          :min="5"
          :max="50"
          :step="1"
          @update:model-value="draft.minority = $event / 100"
        />
      </fieldset>
    </fieldset>
    <button class="button primary" type="submit" :disabled="data.busy">
      {{ t('data.generate') }}</button
    ><button class="text-link" type="button" @click="draft = { ...defaultGenerator }">
      {{ t('data.restore') }}
    </button>
    <p class="small muted">{{ t('data.draft') }}</p>
    <p class="small muted">{{ t('data.seedHelp') }}</p>
  </form>
</template>

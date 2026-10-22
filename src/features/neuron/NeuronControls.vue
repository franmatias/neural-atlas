<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@/app/i18n';
import { useNeuronStore } from '@/stores/neuron';
import { activations } from '@/domain/network/neuron';
import { neuronPresets } from '@/content/neuron-presets';
import ParameterField from '@/shared/ui/ParameterField.vue';
import AppIcon from '@/shared/ui/AppIcon.vue';
const { t } = useI18n();
const neuron = useNeuronStore();
const preset = computed(
  () =>
    neuronPresets.find((p) =>
      (['x1', 'x2', 'w1', 'w2', 'b', 'activation'] as const).every(
        (key) => p.config[key] === neuron.config[key],
      ),
    )?.id ?? 'custom',
);
function loadPreset(id: string) {
  const selected = neuronPresets.find((p) => p.id === id);
  if (selected) neuron.update(selected.config);
}
</script>
<template>
  <section class="panel controls-panel" aria-labelledby="controls-title">
    <div class="panel-heading">
      <h2 id="controls-title">{{ t('neuron.controls') }}</h2>
      <button class="icon-button" :aria-label="t('neuron.restore')" @click="neuron.restore()">
        <AppIcon name="reset" :size="17" />
      </button>
    </div>
    <label class="control-label" for="preset">{{ t('neuron.preset') }}</label
    ><select
      id="preset"
      :value="preset"
      @change="loadPreset(($event.target as HTMLSelectElement).value)"
    >
      <option v-if="preset === 'custom'" value="custom" disabled>{{ t('neuron.custom') }}</option>
      <option v-for="example in neuronPresets" :key="example.id" :value="example.id">
        {{ example.title }}
      </option>
    </select>
    <fieldset>
      <legend>{{ t('neuron.inputs') }}</legend>
      <ParameterField
        v-for="key in ['x1', 'x2'] as const"
        :id="key"
        :key="key"
        :label="t(`neuron.${key}`)"
        :model-value="neuron.config[key]"
        :min="-2"
        :max="2"
        @update:model-value="neuron.update({ [key]: $event })"
      />
    </fieldset>
    <fieldset>
      <legend>{{ t('neuron.weights') }}</legend>
      <ParameterField
        v-for="key in ['w1', 'w2', 'b'] as const"
        :id="key"
        :key="key"
        :label="t(key === 'b' ? 'neuron.bias' : `neuron.${key}`)"
        :model-value="neuron.config[key]"
        :min="-5"
        :max="5"
        @update:model-value="neuron.update({ [key]: $event })"
      />
    </fieldset>
    <label class="control-label" for="activation">{{ t('neuron.activation') }}</label
    ><select
      id="activation"
      :value="neuron.config.activation"
      @change="
        neuron.update({
          activation: ($event.target as HTMLSelectElement).value as typeof neuron.config.activation,
        })
      "
    >
      <option v-for="kind in activations" :key="kind" :value="kind">
        {{ t(`activation.${kind}`) }}
      </option>
    </select>
    <p class="control-footnote">{{ t('neuron.manual') }}</p>
  </section>
</template>

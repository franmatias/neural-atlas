<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from '@/app/i18n';
import { useNeuronStore } from '@/stores/neuron';
import { activations } from '@/domain/network/neuron';
import { neuronPresets } from '@/content/neuron-presets';
import ParameterField from '@/shared/ui/ParameterField.vue';
import AppIcon from '@/shared/ui/AppIcon.vue';
const { t } = useI18n();
const neuron = useNeuronStore();
const preset = ref('first');
function loadPreset() {
  const selected = neuronPresets.find((p) => p.id === preset.value)!;
  neuron.update(selected.config);
}
</script>
<template>
  <section class="panel controls-panel" aria-labelledby="controls-title">
    <div class="panel-heading">
      <h2 id="controls-title">{{ t('neuron.controls') }}</h2>
      <button
        class="icon-button"
        :aria-label="t('neuron.restore')"
        @click="
          neuron.restore();
          preset = 'first';
        "
      >
        <AppIcon name="reset" :size="17" />
      </button>
    </div>
    <label class="control-label" for="preset">{{ t('neuron.preset') }}</label
    ><select id="preset" v-model="preset" @change="loadPreset">
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

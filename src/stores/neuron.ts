import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { defaultNeuron, evaluateNeuron, type NeuronConfig } from '@/domain/network/neuron';
export const useNeuronStore = defineStore('neuron', () => {
  const config = ref<NeuronConfig>({ ...defaultNeuron });
  const result = computed(() => evaluateNeuron(config.value));
  function update(patch: Partial<NeuronConfig>) {
    const next = { ...config.value, ...patch };
    evaluateNeuron(next);
    config.value = next;
  }
  function restore() {
    config.value = { ...defaultNeuron };
  }
  return { config, result, update, restore };
});

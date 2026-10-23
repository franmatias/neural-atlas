import { computed, ref, shallowRef, watch } from 'vue';
import { defineStore } from 'pinia';
import { cloneNetwork } from '@/domain/network/model';
import { propagationPreset } from '@/domain/network/presets';
export { propagationPreset } from '@/domain/network/presets';
import {
  applyGradient,
  backward,
  checkGradient,
  type GradientCheck,
} from '@/domain/network/backprop';
export const usePropagationStore = defineStore('propagation', () => {
  const model = shallowRef(propagationPreset());
  const input = ref([0.8, 0.2]),
    target = ref(1),
    rate = ref(0.1),
    applied = ref(false),
    error = ref(false);
  const report = shallowRef<GradientCheck[]>();
  const trace = shallowRef({
    model: cloneNetwork(model.value),
    input: [...input.value],
    target: target.value,
    result: backward(model.value, input.value, target.value),
  });
  function refresh() {
    trace.value = {
      model: cloneNetwork(model.value),
      input: [...input.value],
      target: target.value,
      result: backward(model.value, input.value, target.value),
    };
    applied.value = false;
    report.value = undefined;
    error.value = false;
  }
  function apply() {
    if (applied.value) return false;
    try {
      model.value = applyGradient(trace.value.model, trace.value.result.gradient, rate.value);
      applied.value = true;
      error.value = false;
      return true;
    } catch {
      error.value = true;
      return false;
    }
  }
  function editWeight(layer: number, index: number, value: number) {
    const next = cloneNetwork(model.value);
    next.layers[layer]!.weights[index] = value;
    model.value = next;
    refresh();
  }
  function check() {
    report.value = checkGradient(trace.value.model, trace.value.input, trace.value.target);
  }
  function reset() {
    model.value = propagationPreset();
    input.value = [0.8, 0.2];
    target.value = 1;
    rate.value = 0.1;
    refresh();
  }
  watch([input, target], refresh, { deep: true });
  const after = computed(() =>
    applied.value ? backward(model.value, trace.value.input, trace.value.target).loss : undefined,
  );
  return {
    model,
    input,
    target,
    rate,
    applied,
    error,
    report,
    trace,
    after,
    refresh,
    apply,
    editWeight,
    check,
    reset,
  };
});

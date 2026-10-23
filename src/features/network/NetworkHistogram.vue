<script setup lang="ts">
import { computed } from 'vue';
import { formatData } from '@/shared/utils/data-format';
const props = defineProps<{
  data: { min: number; max: number; counts: number[] };
  label: string;
}>();
const max = computed(() => Math.max(1, ...props.data.counts));
</script>
<template>
  <figure class="network-histogram">
    <figcaption>{{ label }}</figcaption>
    <div
      class="histogram-bars"
      role="img"
      :aria-label="`${label}: ${data.counts.join(', ')}; min ${data.min}, max ${data.max}`"
    >
      <span v-for="(n, i) in data.counts" :key="i" :style="{ height: `${(100 * n) / max}%` }"
        ><span class="sr-only">{{ n }}</span></span
      >
    </div>
    <p class="small muted">
      {{ formatData(data.min) }} … {{ formatData(data.max) }} · n={{
        data.counts.reduce((a, b) => a + b, 0)
      }}
    </p>
  </figure>
</template>

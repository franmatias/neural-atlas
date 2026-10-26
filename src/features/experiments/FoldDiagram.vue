<script setup lang="ts">
import type { CrossValidationResult } from '@/application/training/cross-validation';
defineProps<{ result: CrossValidationResult }>();
</script>
<template>
  <div
    class="data-table-scroll fold-scroll"
    tabindex="0"
    role="region"
    aria-label="Desplazamiento del esquema de folds"
  >
    <svg
      class="fold-diagram"
      :viewBox="`0 0 600 ${result.folds.length * 42 + 60}`"
      role="img"
      aria-label="Distribución de train, validación y test en cada fold"
    >
      <title>
        Cada fila representa un modelo nuevo; el test final se mantiene fuera de todos los folds
      </title>
      <g
        v-for="(fold, i) in result.folds"
        :key="fold.index"
        :transform="`translate(0 ${i * 42 + 26})`"
      >
        <text x="6" y="20">Fold {{ fold.index + 1 }}</text>
        <svg
          x="80"
          y="0"
          width="500"
          height="30"
          :viewBox="`0 0 ${fold.trainIds.length + fold.validationIds.length + result.testIds.length} 30`"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <rect x="0" :width="fold.trainIds.length" height="30" class="train" />
          <rect
            :x="fold.trainIds.length"
            :width="fold.validationIds.length"
            height="30"
            class="validation"
          />
          <rect
            :x="fold.trainIds.length + fold.validationIds.length"
            :width="result.testIds.length"
            height="30"
            class="test"
          />
        </svg>
        <text x="95" y="20">Train {{ fold.trainIds.length }}</text>
        <text
          :x="
            80 +
            (500 * (fold.trainIds.length + fold.validationIds.length / 2)) /
              (fold.trainIds.length + fold.validationIds.length + result.testIds.length)
          "
          y="20"
          text-anchor="middle"
          class="val-label"
        >
          V {{ fold.validationIds.length }}
        </text>
        <text x="575" y="20" text-anchor="end">Test {{ result.testIds.length }}</text>
      </g>
    </svg>
  </div>
  <p class="small">
    Las barras muestran cantidades, no el orden de las muestras. V corresponde al holdout de ese
    fold. Los IDs completos se pueden inspeccionar debajo de la tabla.
  </p>
</template>
<style scoped>
.fold-scroll {
  max-height: none;
}
.fold-diagram {
  width: 100%;
  min-width: 560px;
  max-width: 900px;
  display: block;
  margin: auto;
}
text {
  fill: var(--ink);
  font-size: 13px;
}
.train {
  fill: var(--wash);
}
.validation {
  fill: var(--accent);
}
.test {
  fill: var(--subtle);
}
.val-label {
  fill: var(--accent-ink);
}
</style>

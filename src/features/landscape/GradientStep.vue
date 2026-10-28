<script setup lang="ts">
import { computed } from 'vue';
import type { LandscapeResult } from '@/application/training/landscape';
const props = defineProps<{ result: LandscapeResult; index: number }>();
const path = computed(() => props.result.paths.find((p) => p.kind === 'sgd'));
const point = computed(
  () => path.value?.points[Math.min(props.index, path.value.points.length - 1)],
);
const next = computed(() => (point.value ? path.value?.points[point.value.step + 1] : undefined));
const proposed = computed(() =>
  point.value
    ? [
        point.value.x - props.result.options.rate * point.value.applied[0],
        point.value.y - props.result.options.rate * point.value.applied[1],
      ]
    : [],
);
const n = (v: number) =>
  Number(v.toPrecision(6)).toLocaleString('es', { maximumSignificantDigits: 6 });
</script>
<template>
  <section v-if="point" class="gradient-step" aria-label="Cálculo del paso SGD">
    <h3>Del gradiente al siguiente punto · SGD</h3>
    <p>
      Índice compartido {{ index }} · paso disponible {{ point.step }}. x e y son coordenadas del
      paisaje (dos parámetros en el corte de una red), no dos filas del dataset.
    </p>
    <p>
      θ = ({{ n(point.x) }}, {{ n(point.y) }}), L = {{ n(point.loss) }}. ∇L = ({{
        point.gradient.map(n).join('; ')
      }}). Tras clipping: g = ({{ point.applied.map(n).join('; ') }}).
    </p>
    <p>
      <strong>θ propuesto = θ − ηg</strong> = ({{ n(point.x) }} − {{ n(result.options.rate) }} ×
      {{ n(point.applied[0]) }}; {{ n(point.y) }} − {{ n(result.options.rate) }} ×
      {{ n(point.applied[1]) }}) = ({{ proposed.map(n).join('; ') }}).
    </p>
    <p v-if="next" data-testid="gradient-next">
      Siguiente punto registrado: ({{ n(next.x) }}; {{ n(next.y) }}), pérdida {{ n(next.loss) }}.
      Cambio de pérdida: {{ n(next.loss - point.loss) }}.
    </p>
    <p v-else>
      No hay otra actualización registrada de SGD:
      {{
        path?.status === 'outside'
          ? 'la propuesta sale del dominio'
          : path?.status === 'stationary'
            ? 'se alcanzó el criterio de gradiente pequeño'
            : path?.status === 'nonfinite'
              ? 'se detuvo por un cálculo no finito'
              : 'se alcanzó el presupuesto'
      }}. La propuesta aritmética anterior no se presenta como un paso ejecutado.
    </p>
    <p>
      La flecha de los contornos muestra −∇L con longitud normalizada, no el desplazamiento. Con SGD
      y sin clipping, el paso usa exactamente −η∇L. Los demás optimizadores añaden sus propias
      reglas; la tabla conserva sus resultados.
    </p>
  </section>
</template>
<style scoped>
.gradient-step {
  padding: 1rem;
  border: 1px solid var(--line);
  border-radius: 1rem;
  background: var(--wash);
  margin: 1rem 0;
  overflow-wrap: anywhere;
}
h3 {
  margin-bottom: 0.5rem;
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { guideForPath } from '@/content/lab-guides';
const props = defineProps<{ path: string }>();
const guide = computed(() => guideForPath(props.path));
</script>
<template>
  <details v-if="guide" :key="guide.path" class="lab-guide">
    <summary>Guía del laboratorio · {{ guide.title }}</summary>
    <h2>Qué vas a comprender</h2>
    <p>{{ guide.goal }}</p>
    <h3>Cómo leer lo que ves</h3>
    <p>{{ guide.read }}</p>
    <h3>Ejemplo trabajado de la guía</h3>
    <p>{{ guide.example }}</p>
    <p class="formula">{{ guide.formula }}</p>
    <h3>Una confusión que conviene evitar</h3>
    <p>{{ guide.mistake }}</p>
    <h3>Predicción y contraste guiados</h3>
    <p>{{ guide.challenge }}</p>
    <details>
      <summary>Consultar la explicación del contraste</summary>
      <p>{{ guide.answer }}</p>
    </details>
  </details>
</template>
<style scoped>
.lab-guide {
  margin: 1.2rem 40px;
  padding: 1rem 1.3rem;
  border: 1px solid var(--line);
  border-radius: 1rem;
  background: var(--surface);
  overflow-wrap: anywhere;
}
.lab-guide summary {
  cursor: pointer;
  font-weight: 700;
  color: var(--accent);
}
h2,
h3 {
  margin: 1rem 0 0.4rem;
}
p {
  line-height: 1.65;
}
.formula {
  padding: 0.7rem;
  background: var(--wash);
  border-radius: 0.5rem;
}
@media (max-width: 700px) {
  .lab-guide {
    margin: 1rem 20px;
  }
}
</style>

<script setup lang="ts">
import { computed, ref, watch, onScopeDispose } from 'vue';
import {
  Sonification,
  toneFor,
  type ToneKind,
  type ToneRegister,
} from '@/infrastructure/audio/sonification';
const props = defineProps<{ value?: number; kind: ToneKind; label: string }>();
const engine = new Sonification(),
  enabled = ref(false),
  starting = ref(false),
  volume = ref(0.1),
  register = ref<ToneRegister>('normal'),
  error = ref('');
let revision = 0;
const tone = computed(() =>
  props.value === undefined ? undefined : toneFor(props.value, props.kind, register.value),
);
async function start() {
  if (props.value === undefined) return;
  const id = ++revision;
  starting.value = true;
  error.value = '';
  const done = await engine.start(props.value, props.kind, volume.value, register.value);
  if (id !== revision) return;
  starting.value = false;
  if (done && props.value !== undefined && tone.value) {
    engine.update(props.value, props.kind, volume.value, register.value);
    enabled.value = engine.active;
  } else {
    engine.stop();
    enabled.value = false;
  }
  if (!done)
    error.value =
      'Audio no disponible o pestaña no visible. La simulación y sus datos siguen disponibles.';
}
function stop() {
  revision++;
  engine.stop();
  enabled.value = false;
  starting.value = false;
}
watch([() => props.value, volume, register], () => {
  if (starting.value && (props.value === undefined || !tone.value)) stop();
  if (enabled.value) {
    if (props.value === undefined || !tone.value) stop();
    else engine.update(props.value, props.kind, volume.value, register.value);
  }
});
const hidden = () => {
  if (document.hidden) stop();
};
document.addEventListener('visibilitychange', hidden);
onScopeDispose(() => {
  stop();
  document.removeEventListener('visibilitychange', hidden);
});
</script>
<template>
  <details class="sonification">
    <summary>Sonificación opcional · {{ label }}</summary>
    <p>
      Desactivada al abrir. Un tono sinusoidal representa {{ label }}; no sustituye gráficos ni
      tablas.
      {{
        kind === 'output'
          ? 'Escala fija de salida [0,1]'
          : 'Escala logarítmica de pérdida [0,0001;10]'
      }}
      → [220;880] Hz en registro normal. Grave divide la frecuencia por dos; agudo la duplica. Los
      valores fuera del rango saturan el tono y conservan su valor real.
    </p>
    <p>
      Valor: {{ value === undefined ? 'aún no disponible' : value.toPrecision(6) }} · frecuencia
      propuesta {{ tone?.frequency.toFixed(1) ?? 'no disponible' }} Hz{{
        tone?.clamped ? ' · rango sonoro saturado' : ''
      }}.
    </p>
    <label
      >Registro del tono<select v-model="register" aria-label="Registro del tono">
        <option value="grave">Grave · 110–440 Hz</option>
        <option value="normal">Normal · 220–880 Hz</option>
        <option value="agudo">Agudo · 440–1760 Hz</option>
      </select></label
    >
    <label
      >Volumen de sonificación (máximo 20 %)<input
        v-model.number="volume"
        type="range"
        min="0"
        max=".2"
        step=".01"
    /></label>
    <button class="button secondary" :disabled="!tone || starting || enabled" @click="start">
      Activar sonido de este proceso</button
    ><button class="button secondary" :disabled="!enabled && !starting" @click="stop">
      Silenciar inmediatamente
    </button>
    <p aria-live="polite">
      {{ enabled ? 'Sonido activo' : starting ? 'Activando sonido…' : 'Sonido desactivado' }}. Se
      silencia al ocultar la pestaña o cambiar de laboratorio; solo otro gesto puede activarlo.
    </p>
    <p v-if="error" role="alert">{{ error }}</p>
  </details>
</template>
<style scoped>
.sonification {
  padding: 1rem;
  border: 1px solid var(--line);
  border-radius: 1rem;
  margin: 1rem 0;
  overflow-wrap: anywhere;
}
summary {
  font-weight: 700;
  cursor: pointer;
}
label {
  display: grid;
  gap: 0.5rem;
  max-width: 450px;
}
input {
  width: 100%;
}
p {
  margin: 0.6rem 0;
}
</style>

<script setup lang="ts">
import { useConfigurationHistory } from '@/stores/configuration-history';
const history = useConfigurationHistory();
</script>
<template>
  <section class="training-panel" aria-label="Historial de configuración">
    <h2>Deshacer y rehacer configuración</h2>
    <p>
      Estado {{ history.cursor + 1 }} de {{ history.entries.length }} · revisión
      {{ history.revision }}. Hasta 50 estados en esta sesión de navegador. Cambiar parámetros no
      guarda los pesos.
    </p>
    <button class="button secondary" :disabled="!history.canUndo" @click="history.undo">
      Deshacer configuración</button
    ><button class="button secondary" :disabled="!history.canRedo" @click="history.redo">
      Rehacer configuración
    </button>
    <p>
      Restaurar termina el cálculo activo y descarta su red. Se recuperan ajustes, no pesos,
      momentos ni eventos de entrenamiento. Inicializa de nuevo o usa un checkpoint de la
      biblioteca. No se borra la consulta previa de test.
    </p>
    <p>
      Si cambian los datos, la división o el pipeline, los estados de otro contexto quedan
      indisponibles. Recargar termina este historial de RAM.
    </p>
    <p aria-live="polite">{{ history.notice }}</p>
    <details>
      <summary>Ver estados de configuración</summary>
      <ol>
        <li v-for="(entry, i) in history.entries" :key="entry.revision">
          {{ i + 1 }}.
          {{
            entry.config.spec.hidden.length
              ? entry.config.spec.hidden.join(' → ')
              : 'Sin capas ocultas'
          }}
          · {{ entry.config.optimizer.kind }} · tasa {{ entry.config.optimizer.rate }} · semilla
          {{ entry.config.seed }} ·
          {{ history.available(i) ? 'contexto disponible' : 'contexto diferente'
          }}{{ i === history.cursor ? ' · seleccionado' : '' }}
        </li>
      </ol>
    </details>
  </section>
</template>

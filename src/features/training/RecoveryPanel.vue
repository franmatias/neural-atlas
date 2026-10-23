<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { useRecoveryStore } from '@/stores/recovery';
import { useTrainingStore } from '@/stores/training';
const recovery = useRecoveryStore(),
  session = useTrainingStore();
const confirm = ref<'restore' | 'replace' | 'delete'>();
const confirmation = ref<HTMLElement>();
let previousFocus: HTMLElement | null = null;
watch(confirm, async (value) => {
  if (value) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    await nextTick();
    confirmation.value?.focus();
  } else if (previousFocus?.isConnected) previousFocus.focus();
});
async function apply() {
  const action = confirm.value;
  confirm.value = undefined;
  if (action === 'restore') {
    const snapshot = await recovery.recover();
    if (snapshot) await session.restore(snapshot);
  } else if (action === 'replace') {
    recovery.takeOver();
    session.saveRecovery(undefined, true);
  } else if (action === 'delete') await recovery.remove();
}
</script>
<template>
  <section class="training-panel recovery-panel" aria-labelledby="recovery-title">
    <h2 id="recovery-title">Recuperación automática</h2>
    <p>
      Dos copias locales, cada 30 segundos o cinco épocas y al pausar o finalizar. Al cerrar puedes
      perder los cambios posteriores al último guardado confirmado.
    </p>
    <label class="training-check"
      ><input v-model="recovery.enabled" type="checkbox" />Guardar puntos de recuperación en este
      navegador</label
    >
    <p role="status">{{ recovery.message }}<span v-if="recovery.saving"> Guardando…</span></p>
    <ul v-if="recovery.available">
      <li v-for="(slot, index) in recovery.available.slots" :key="index">
        {{ index === 0 ? 'Última copia' : 'Copia anterior' }} · época {{ slot.epoch }} ·
        actualización {{ slot.updates }} · {{ new Date(slot.savedAt).toLocaleString('es-ES')
        }}{{ slot.frozen ? ' · modelo congelado' : '' }}
      </li>
    </ul>
    <div class="training-toolbar">
      <button
        class="button secondary"
        :disabled="recovery.loading || recovery.saving"
        @click="recovery.load()"
      >
        Revisar puntos guardados
      </button>
      <button
        v-if="recovery.available"
        class="button"
        :disabled="recovery.loading || recovery.saving || session.running || session.evaluating"
        @click="confirm = 'restore'"
      >
        Recuperar sesión guardada
      </button>
      <button
        v-if="session.state"
        class="button secondary"
        :disabled="recovery.loading || recovery.saving || session.running || session.evaluating"
        @click="confirm = 'replace'"
      >
        Usar esta sesión para recuperación
      </button>
      <button
        v-if="recovery.available"
        class="button secondary"
        :disabled="recovery.loading || recovery.saving"
        @click="confirm = 'delete'"
      >
        Eliminar puntos de recuperación
      </button>
    </div>
    <div
      v-if="confirm"
      ref="confirmation"
      tabindex="-1"
      class="training-alert"
      role="group"
      aria-label="Confirmación de recuperación"
    >
      <p>
        {{
          confirm === 'restore'
            ? 'Se sustituirá el espacio de trabajo actual por la copia validada. No se entrenará automáticamente.'
            : confirm === 'replace'
              ? 'Esta sesión podrá sustituir la recuperación disponible, incluida la de otra pestaña. Los experimentos de Biblioteca se conservan.'
              : 'Se eliminarán las dos copias temporales. Los experimentos de Biblioteca se conservan.'
        }}
      </p>
      <button class="button" @click="apply">Confirmar recuperación</button>
      <button class="button secondary" @click="confirm = undefined">Volver sin cambiar</button>
    </div>
    <p class="small muted">
      Máximo 10 MiB por copia, incluidos datos y estado del optimizador. Si no cabe o el navegador
      deniega el almacenamiento, usa la Biblioteca para exportar. No se garantiza completar un
      guardado al cerrar la pestaña.
    </p>
  </section>
</template>

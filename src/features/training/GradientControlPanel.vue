<script setup lang="ts">
import type { GradientControl } from '@/domain/training/regularization';
import { formatData } from '@/shared/utils/data-format';
defineProps<{ control: GradientControl; updates: number }>();
</script>
<template>
  <section class="training-panel gradient-control-panel">
    <h2>Antes y después del recorte</h2>
    <p>
      Último lote confirmado. La norma global incluye todos los pesos y sesgos, después de añadir
      L1/L2 y antes de aplicar el optimizador.
    </p>
    <p v-if="control.rawAffine !== undefined">
      BN: la norma global incluye también gamma y beta, sin penalización L1/L2. Su norma conjunta
      pasa de {{ formatData(control.rawAffine) }} a {{ formatData(control.appliedAffine!) }}.
    </p>
    <dl class="training-metrics">
      <div>
        <dt>Norma original</dt>
        <dd>{{ formatData(control.rawNorm) }}</dd>
      </div>
      <div>
        <dt>Norma aplicada</dt>
        <dd>{{ formatData(control.appliedNorm) }}</dd>
      </div>
      <div>
        <dt>Factor común</dt>
        <dd>{{ formatData(control.scale) }}</dd>
      </div>
      <div>
        <dt>Lotes recortados</dt>
        <dd>
          {{ control.clippedUpdates }} / {{ updates }} ·
          {{ formatData(updates ? (100 * control.clippedUpdates) / updates : 0) }} %
        </dd>
      </div>
    </dl>
    <div
      class="data-table-scroll"
      tabindex="0"
      role="region"
      aria-label="Desplazamiento de normas por capa"
    >
      <table class="dataset-table" aria-label="Normas por capa antes y después del recorte">
        <thead>
          <tr>
            <th scope="col">Capa</th>
            <th scope="col">‖dW‖ antes</th>
            <th scope="col">‖dW‖ después</th>
            <th scope="col">‖db‖ antes</th>
            <th scope="col">‖db‖ después</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(value, i) in control.rawWeights" :key="i">
            <th scope="row">{{ i + 1 }}</th>
            <td>{{ formatData(value) }}</td>
            <td>{{ formatData(control.appliedWeights[i]!) }}</td>
            <td>{{ formatData(control.rawBiases[i]!) }}</td>
            <td>{{ formatData(control.appliedBiases[i]!) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="small muted">
      Recortar conserva la dirección del gradiente y limita su norma, no la norma del paso final de
      Adam o Momentum. No garantiza generalización.
    </p>
  </section>
</template>
<style scoped>
.dataset-table {
  font-size: 0.875rem;
}
</style>

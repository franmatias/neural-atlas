<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@/app/i18n';
import { usePreferencesStore } from '@/stores/preferences';
import { activations, type Activation } from '@/domain/network/neuron';
import { activationChain } from '@/domain/network/inspection';
import { formatData } from '@/shared/utils/data-format';
import ParameterField from '@/shared/ui/ParameterField.vue';
import ActivationComparison from './ActivationComparison.vue';
import SoftmaxPanel from './SoftmaxPanel.vue';
import InitializationPanel from './InitializationPanel.vue';
import { usePhasePlayer } from './usePhasePlayer';
const { t } = useI18n();
const prefs = usePreferencesStore();
const kind = ref<Activation>('sigmoid'),
  compare = ref<Activation>('relu'),
  z = ref(0),
  alpha = ref(0.01),
  limit = ref(6),
  depth = ref(10),
  log = ref(false);
const chain = computed(() => activationChain(z.value, kind.value, depth.value, alpha.value));
const player = usePhasePlayer(() => depth.value, chain);
const selected = computed(() => chain.value[player.index.value]!);
</script>
<template>
  <div class="page network-page">
    <p class="eyebrow">L04 / f(z) · f′(z)</p>
    <h1>{{ t('net.activationTitle') }}</h1>
    <p class="muted">{{ t('net.activationIntro') }}</p>
    <section class="panel network-section">
      <div class="network-controls">
        <label for="activation-main"
          >{{ t('net.function')
          }}<select id="activation-main" v-model="kind">
            <option v-for="a in activations" :key="a" :value="a">{{ t(`activation.${a}`) }}</option>
          </select></label
        ><label for="activation-compare"
          >{{ t('net.compare')
          }}<select id="activation-compare" v-model="compare">
            <option v-for="a in activations" :key="a" :value="a">{{ t(`activation.${a}`) }}</option>
          </select></label
        ><ParameterField
          id="activation-z"
          v-model="z"
          :label="t('net.z')"
          :min="-10"
          :max="10"
          :step="0.1"
        /><ParameterField
          id="activation-alpha"
          v-model="alpha"
          :label="t('net.alpha')"
          :min="0.001"
          :max="0.3"
          :step="0.001"
        /><label for="activation-zoom"
          >{{ t('net.zoom')
          }}<select id="activation-zoom" v-model.number="limit">
            <option v-for="n in [1, 2, 6, 10]" :key="n" :value="n">±{{ n }}</option>
          </select></label
        >
      </div>
    </section>
    <ActivationComparison :kind="kind" :compare="compare" :z="z" :alpha="alpha" :limit="limit" />
    <section class="panel network-section">
      <h2>{{ t('net.chain') }}</h2>
      <p>{{ t('net.chainNote') }}</p>
      <label for="chain-depth"
        >{{ t('net.depth') }} · {{ depth
        }}<input
          id="chain-depth"
          v-model.number="depth"
          type="range"
          min="1"
          max="20"
          step="1" /></label
      ><label class="check-row"><input v-model="log" type="checkbox" />{{ t('net.log') }}</label>
      <div class="chain-stages" role="group" :aria-label="t('net.chain')">
        <button
          v-for="(step, i) in chain"
          :key="i"
          :aria-pressed="player.index.value === i"
          @click="player.move(i)"
        >
          <span>{{ step.index }}</span
          ><strong>{{ formatData(step.value) }}</strong>
        </button>
      </div>
      <div class="network-actions">
        <button
          class="button secondary"
          :disabled="player.index.value === 0"
          @click="player.move(player.index.value - 1)"
        >
          {{ t('net.previous') }}</button
        ><button class="button primary" :disabled="prefs.reducedMotion" @click="player.play">
          {{ t(player.playing.value ? 'net.pause' : 'net.play') }}</button
        ><button
          class="button secondary"
          :disabled="player.index.value === depth - 1"
          @click="player.move(player.index.value + 1)"
        >
          {{ t('net.next') }}</button
        ><span>{{ prefs.value.speed }}×</span>
      </div>
      <p data-testid="chain-gradient">
        {{ t('net.gradient') }}:
        <strong>{{
          selected.gradient === null
            ? t('net.notDerivative')
            : selected.gradient === 0
              ? t('net.zeroGradient')
              : formatData(log ? selected.logGradient! : selected.gradient)
        }}</strong>
      </p>
      <p class="small muted">
        z={{ formatData(selected.z) }} → a={{ formatData(selected.value) }} · f′={{
          selected.derivative === null ? '∅' : formatData(selected.derivative)
        }}
      </p>
    </section>
    <SoftmaxPanel /><InitializationPanel />
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n, type MessageKey } from '@/app/i18n';
import { usePreferencesStore } from '@/stores/preferences';
import { laboratories } from '@/content/laboratories';
import AppIcon from '@/shared/ui/AppIcon.vue';
import SettingsForm from '@/shared/ui/SettingsForm.vue';
import { trapDialogFocus } from '@/shared/ui/dialog-focus';
const { t } = useI18n();
const prefs = usePreferencesStore();
const route = useRoute();
const base = import.meta.env.BASE_URL;
const settings = ref<HTMLDialogElement>();
const settingsOpen = ref(false);
const settingsTrigger = ref<HTMLElement>();
const menu = ref<HTMLDialogElement>();
const main = ref<HTMLElement>();
const links: { to: string; label: MessageKey; icon: string }[] = [
  { to: '/', label: 'nav.home', icon: 'home' },
  { to: '/laboratorios', label: 'nav.labs', icon: 'labs' },
  { to: '/taller', label: 'nav.workshops', icon: 'workshop' },
  { to: '/biblioteca', label: 'nav.library', icon: 'library' },
  { to: '/glosario', label: 'nav.glossary', icon: 'book' },
];
function focusMain() {
  main.value?.focus();
}
async function openSettings() {
  settingsOpen.value = true;
  await nextTick();
  settings.value?.showModal();
}
function closeSettings() {
  settingsOpen.value = false;
  settingsTrigger.value?.focus();
}
watch(
  () => route.fullPath,
  async () => {
    menu.value?.close();
    await nextTick();
    focusMain();
  },
);
</script>
<template>
  <button class="skip-link" @click="focusMain">{{ t('app.skip') }}</button>
  <aside class="sidebar">
    <RouterLink to="/" class="brand" aria-label="Neural Atlas"
      ><img :src="`${base}atlas.svg`" alt="" width="36" height="36" /><span
        >neural<span class="brand-light"> atlas</span></span
      ></RouterLink
    >
    <nav :aria-label="t('nav.label')">
      <RouterLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        :exact-active-class="'active'"
        :class="{ active: link.to === '/laboratorios' && route.path.startsWith('/lab/') }"
        ><AppIcon :name="link.icon" /><span>{{ t(link.label) }}</span></RouterLink
      >
    </nav>
    <div class="sidebar-bottom">
      <span class="local-dot" /> <span>{{ t('app.local') }}</span
      ><small>{{ t('app.delivery') }}</small>
    </div>
  </aside>
  <div class="workspace min-h-screen">
    <header class="topbar">
      <button
        class="icon-button mobile-menu"
        :aria-label="t('nav.open')"
        @click="menu?.showModal()"
      >
        <AppIcon name="menu" />
      </button>
      <span class="topbar-title">{{ t('app.title') }}</span>
      <span class="status-pill">{{
        t('app.available', { count: laboratories.filter((lab) => lab.available).length })
      }}</span>
      <button
        class="icon-button"
        :aria-label="t(prefs.resolvedTheme === 'dark' ? 'settings.light' : 'settings.dark')"
        @click="prefs.update({ theme: prefs.resolvedTheme === 'dark' ? 'light' : 'dark' })"
      >
        <AppIcon :name="prefs.resolvedTheme === 'dark' ? 'sun' : 'moon'" />
      </button>
      <button
        ref="settingsTrigger"
        class="icon-button"
        :aria-label="t('nav.settings')"
        @click="openSettings"
      >
        <AppIcon name="settings" />
      </button>
    </header>
    <main id="main-content" ref="main" tabindex="-1"><RouterView /></main>
    <footer class="footer">
      <span>NEURAL ATLAS</span><span>{{ t('brand.tagline') }}</span
      ><RouterLink to="/ajustes">{{ t('nav.settings') }}</RouterLink>
    </footer>
  </div>
  <dialog
    ref="settings"
    class="settings-dialog"
    aria-labelledby="settings-title"
    @keydown="trapDialogFocus"
    @close="closeSettings"
  >
    <div class="dialog-heading">
      <h2 id="settings-title">{{ t('settings.dialog') }}</h2>
      <button class="icon-button" :aria-label="t('settings.close')" @click="settings?.close()">
        <AppIcon name="close" />
      </button>
    </div>
    <SettingsForm v-if="settingsOpen" prefix="dialog-" />
  </dialog>
  <dialog ref="menu" class="menu-dialog" :aria-label="t('nav.label')" @keydown="trapDialogFocus">
    <button class="icon-button menu-close" :aria-label="t('nav.close')" @click="menu?.close()">
      <AppIcon name="close" />
    </button>
    <nav>
      <RouterLink v-for="link in links" :key="link.to" :to="link.to"
        ><AppIcon :name="link.icon" />{{ t(link.label) }}</RouterLink
      >
    </nav>
  </dialog>
</template>

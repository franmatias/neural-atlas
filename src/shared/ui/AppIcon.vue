<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 20 });
const paths: Record<string, string> = {
  home: 'm3 10 9-7 9 7v10H3Z M9 20v-7h6v7',
  labs: 'M9 3h6 M10 3v6l-6 10a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L14 9V3 M7 15h10',
  workshop: 'M4 4h16v12H4Z M12 16v5 M7 21l5-5 5 5 M8 8h8 M8 12h5',
  library: 'M4 3v18 M8 3v18 M12 3v18 M16 4l5 16',
  book: 'M12 5C8 2 4 3 3 4v15c3-2 6-1 9 1 3-2 6-3 9-1V4c-4-2-6-1-9 1Z M12 5v15',
  settings: 'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6',
  arrow: 'M4 12h16 M14 6l6 6-6 6',
  back: 'M20 12H4 M10 6l-6 6 6 6',
  close: 'm6 6 12 12 M6 18 18 6',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  sun: 'M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  moon: 'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11',
  play: 'm8 5 11 7-11 7Z', pause: 'M8 5v14 M16 5v14',
  previous: 'M5 5v14 M18 5 8 12l10 7Z', next: 'M19 5v14 M6 5l10 7-10 7Z',
  reset: 'M3 10a9 9 0 1 1 2 8 M3 3v7h7',
  search: 'M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12 M15 15l6 6',
  network: 'M5 5h1 M5 19h1 M19 12h1 M7 5l10 7 M7 19l10-7 M7 5v14',
  chevron: 'm9 5 7 7-7 7', check: 'm5 12 4 4L19 6',
};
</script>
<template><svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name] ?? paths.network" /></svg></template>

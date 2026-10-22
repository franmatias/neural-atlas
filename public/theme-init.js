// Runs before styles and Vue. No inline script exception is needed in the CSP.
(() => {
  let theme = 'system';
  let presentation = false;
  try {
    const saved = JSON.parse(localStorage.getItem('neural-atlas:v1:preferences') || 'null');
    if (saved?.schemaVersion === 1 && saved.payload) {
      if (['system', 'light', 'dark'].includes(saved.payload.theme)) theme = saved.payload.theme;
      presentation = saved.payload.presentation === true;
    }
  } catch {
    /* A blocked store must not prevent opening the laboratory. */
  }
  document.documentElement.dataset.theme =
    theme === 'system'
      ? matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;
  document.documentElement.dataset.presentation = String(presentation);
})();

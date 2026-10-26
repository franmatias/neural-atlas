import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1800, height: 1600 }, reducedMotion: 'reduce' });
  for (const [mode, route, epochs] of [['binary', 'arquitectura/frontera', 100], ['multiclass', 'clasificacion/visual', 30]]) {
    await page.goto(`http://127.0.0.1:4173/neural-atlas/#/lab/${route}`);
    await expect(page.getByTestId('visual-epoch')).toHaveText('0');
    await page.getByLabel('Épocas máximas', { exact: true }).fill(String(epochs));
    await page.getByRole('button', { name: 'Aplicar y reiniciar red', exact: true }).click();
    await expect(page.getByTestId('visual-epoch')).toHaveText('0');
    await page.getByRole('slider', { name: /^Ritmo/ }).fill('0');
    await page.getByRole('button', { name: 'Entrenar simulación', exact: true }).click();
    await expect(page.getByTestId('visual-epoch')).toHaveText(String(epochs), { timeout: 60000 });
    await page.locator('.decision-stage').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.locator('.decision-stage').screenshot({ path: `docs/implementation/visual-${mode}.png` });
    if (mode === 'multiclass') {
      await page.setViewportSize({ width: 390, height: 900 });
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      await page.locator('.decision-map').evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 88, behavior: 'instant' }));
      await page.screenshot({ path: 'docs/implementation/visual-multiclass-mobile.png' });
    }
  }
} finally { await browser.close(); }

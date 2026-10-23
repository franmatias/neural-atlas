import { chromium } from '@playwright/test';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:4173/neural-atlas/#/lab/entrenamiento');
  await page.getByRole('button', { name: 'Cargar ejemplo y sustituir datos' }).click();
  await page.getByText('train 280 / validación 60 / test 60.', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Inicializar modelo', exact: true }).click();
  await page.getByRole('button', { name: 'Una época', exact: true }).click();
  await page.locator('.training-status').filter({ hasText: 'Época 1' }).waitFor();
  await page.goto('http://127.0.0.1:4173/neural-atlas/#/modelos');
  await page.getByRole('button', { name: 'Copiar modelo de la sesión' }).click();
  await page.getByRole('button', { name: 'Predecir con este modelo' }).click();
  await page.locator('.prediction-result').waitFor();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: 'docs/implementation/d5-models.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: 'docs/implementation/d5-models-mobile.png', fullPage: true });
} finally { await browser.close(); }

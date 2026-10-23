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
  await page.getByRole('link', { name: 'Guardar o recuperar experimento' }).click();
  await page.getByLabel('Nombre del experimento', { exact: true }).fill('Dos lunas · primera hipótesis');
  await page.getByRole('button', { name: 'Guardar como nuevo' }).click();
  await page.getByText('Experimento guardado.', { exact: false }).waitFor();
  await page.screenshot({ path: 'docs/implementation/d5-library.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.screenshot({ path: 'docs/implementation/d5-library-mobile.png', fullPage: true });
} finally { await browser.close(); }

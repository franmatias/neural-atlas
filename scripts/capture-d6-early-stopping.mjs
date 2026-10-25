import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:4173/neural-atlas/#/lab/entrenamiento');
  await page.getByRole('button', { name: 'Cargar ejemplo y sustituir datos', exact: true }).click();
  await expect(page.getByText('train 280 / validación 60 / test 60.', { exact: false })).toBeVisible();
  await page.getByLabel('Capas ocultas', { exact: false }).fill('2');
  await page.getByRole('combobox', { name: /^Inicialización/ }).selectOption('zero');
  await page.getByLabel('Tasa de aprendizaje', { exact: true }).fill('0.00001');
  await page.getByLabel('Tamaño de lote', { exact: false }).fill('280');
  await page.getByLabel('Épocas máximas', { exact: true }).fill('20');
  await page.getByLabel('Activar parada temprana con validación', { exact: true }).check();
  await page.getByLabel('Paciencia en épocas', { exact: true }).fill('5');
  await page.getByLabel('Mejora mínima de validación', { exact: true }).fill('0.01');
  await page.getByRole('button', { name: 'Inicializar modelo', exact: true }).click();
  await page.getByRole('button', { name: 'Entrenar', exact: true }).click();
  await expect(page.locator('.early-result')).toContainText('en la época 6');
  await page.locator('.early-stopping-panel').screenshot({ path: 'docs/implementation/d6-early-stopping.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.locator('.early-stopping-panel h2').evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 88, behavior: 'instant' }));
  await page.screenshot({ path: 'docs/implementation/d6-early-stopping-mobile.png' });
} finally { await browser.close(); }

import { chromium } from '@playwright/test';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('http://127.0.0.1:4173/neural-atlas/#/lab/entrenamiento');
  await page.getByRole('button', { name: 'Cargar ejemplo y sustituir datos' }).click();
  await page.getByText('train 280 / validación 60 / test 60.', { exact: false }).waitFor();
  await page.getByLabel('Épocas máximas', { exact: true }).fill('25');
  await page.getByRole('button', { name: 'Inicializar modelo', exact: true }).click();
  await page.getByRole('button', { name: 'Entrenar', exact: true }).click();
  await page.locator('.training-status').filter({ hasText: 'Épocas completadas' }).waitFor();
  await page.locator('.loss-chart').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'docs/implementation/d4-training.png', animations: 'disabled' });
  await page.goto('http://127.0.0.1:4173/neural-atlas/#/lab/clasificacion');
  await page.getByRole('button', { name: 'Evaluar validación', exact: true }).click();
  await page.getByRole('heading', { name: 'Resultados: validación' }).waitFor();
  await page.locator('.confusion-table').scrollIntoViewIfNeeded();
  await page.screenshot({
    path: 'docs/implementation/d4-classification.png',
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 360, height: 900 });
  await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
  await page.getByLabel('Tema', { exact: true }).selectOption('dark');
  await page.getByRole('button', { name: 'Cerrar ajustes' }).click();
  await page.locator('h1').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'docs/implementation/d4-mobile.png', animations: 'disabled' });
  console.log('Tres capturas D4 guardadas.');
} finally {
  await browser.close();
}

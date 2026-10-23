import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const base = 'http://127.0.0.1:4173/neural-atlas/';
  await mkdir('docs/implementation', { recursive: true });
  await page.goto(`${base}#/lab/arquitectura`);
  await page.locator('#perceptron-problem').selectOption('and');
  await page.getByRole('button', { name: 'Entrenar perceptrón', exact: true }).click();
  await page.getByTestId('perceptron-score').waitFor();
  await page.getByRole('heading', { level: 1 }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: 'docs/implementation/d3-perceptron.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: '2 · Combinar regiones', exact: true }).click();
  await page.getByRole('button', { name: 'Aprender XOR con MLP' }).click();
  await page.getByTestId('xor-score').waitFor();
  await page.locator('#net-layer').selectOption('1');
  await page.getByRole('button', { name: 'Calcular mapa y estadísticas' }).click();
  await page.locator('.heat-cell').first().waitFor();
  await page.getByRole('heading', { level: 1 }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: 'docs/implementation/d3-architecture.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.goto(`${base}#/lab/activaciones`);
  await page.getByRole('heading', { level: 1 }).waitFor();
  await page.locator('.chain-stages button').last().click();
  await page.getByText('Avanzado · inicialización, activaciones y normas', { exact: true }).click();
  await page.getByRole('heading', { level: 1 }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: 'docs/implementation/d3-activations.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Oscuro', exact: true }).click();
  await page.goto(`${base}#/lab/propagacion`);
  await page.getByRole('heading', { level: 1 }).waitFor();
  await page.locator('.chain-stages').first().getByRole('button').last().click();
  await page.getByRole('button', { name: 'Comprobar todos los gradientes' }).click();
  await page.getByRole('heading', { level: 1 }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: 'docs/implementation/d3-propagation.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('heading', { level: 1 }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: 'docs/implementation/d3-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  if (errors.length) throw Error(errors.join('\n'));
  console.log('Cinco capturas D3 verificadas sin errores de ejecución.');
} finally {
  await browser.close();
}

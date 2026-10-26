import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const base = process.env.NEURAL_ATLAS_URL ?? 'http://127.0.0.1:4173/neural-atlas/';
await mkdir(new URL('../docs/implementation/', import.meta.url), { recursive: true });
const browser = await chromium.launch();
const output = name => fileURLToPath(new URL(`../docs/implementation/${name}`, import.meta.url));
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  for (const [kind, width, activation] of [['sine', 8, 'tanh'], ['absolute', 8, 'relu'], ['step', 32, 'tanh']]) {
    await page.goto(new URL('#/lab/regresion/funciones', base).href);
    await page.getByRole('combobox', { name: 'Función objetivo', exact: true }).selectOption(kind);
    await page.getByRole('combobox', { name: 'Neuronas ocultas', exact: true }).selectOption(String(width));
    await page.getByRole('combobox', { name: 'Activación de aproximación', exact: true }).selectOption(activation);
    await page.getByLabel('Épocas de aproximación', { exact: true }).fill('60');
    await page.getByRole('button', { name: 'Entrenar aproximación', exact: true }).click();
    await expect(page.getByTestId('function-grid-mse')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrenar aproximación', exact: true })).toBeEnabled();
    await expect(page.getByTestId('function-snapshot')).toContainText('Época 60');
    await expect(page.locator('.training-panel').nth(1).locator('.eyebrow')).toContainText({ sine: 'sin(πx)', absolute: '|x|', step: 'Escalón' }[kind]);
    await page.locator('.training-panel').nth(1).screenshot({ path: output(`d8-function-${kind}.png`) });
    console.log(`${kind}: MSE limpio ${await page.getByTestId('function-grid-mse').textContent()}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('function-jump-bound')).toBeVisible();
  await page.locator('.function-plot').screenshot({ path: output('d8-function-mobile.png') });
} finally { await browser.close(); }

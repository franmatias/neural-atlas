import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const base = process.env.NEURAL_ATLAS_URL ?? 'http://127.0.0.1:4173/neural-atlas/';
await mkdir(new URL('../docs/implementation/', import.meta.url), { recursive: true });
const output = name => fileURLToPath(new URL(`../docs/implementation/${name}`, import.meta.url));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(new URL('#/lab/clasificacion/etica', base).href);
  await page.getByRole('button', { name: 'Generar cohorte de auditoría', exact: true }).click();
  await expect(page.getByTestId('audit-reference-accuracy')).toBeVisible();
  await page.getByLabel('Umbral común alternativo', { exact: true }).fill('0.3');
  await page.getByLabel('Umbral común alternativo', { exact: true }).press('Enter');
  await page.locator('.training-panel').nth(1).screenshot({ path: output('d8-ethics-cohort.png') });
  await page.locator('.training-panel').nth(2).screenshot({ path: output('d8-ethics-metrics.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.audit-charts').screenshot({ path: output('d8-ethics-mobile.png') });
} finally { await browser.close(); }

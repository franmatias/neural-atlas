import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:4173/neural-atlas/#/lab/datos');
  await page.getByRole('button', { name: 'Dividir', exact: true }).click();
  await page.getByRole('button', { name: 'Crear partición' }).click();
  await page.getByRole('button', { name: 'Preparar', exact: true }).click();
  await page.locator('#pipeline-scaling').selectOption('robust');
  await page.getByRole('button', { name: 'Ajustar con train y transformar' }).click();
  await expect(page.locator('.pipeline-result')).toBeVisible();
  await page.locator('.pipeline-result').screenshot({ path: 'docs/implementation/d7-robust.png' });
  await page.setViewportSize({ width: 360, height: 900 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.locator('.pipeline-result').evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 88, behavior: 'instant' }));
  await page.screenshot({ path: 'docs/implementation/d7-robust-mobile.png' });
} finally { await browser.close(); }

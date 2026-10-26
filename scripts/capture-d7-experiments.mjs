import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:4173/neural-atlas/#/lab/experimentos');
  await page.getByLabel('Épocas comunes', { exact: true }).fill('10');
  await page.getByRole('button', { name: 'Ejecutar estudio', exact: true }).click();
  await expect(page.locator('.ab-results')).toBeVisible();
  await page.locator('.ab-results').screenshot({ path: 'docs/implementation/d7-comparison.png' });
  await page.getByRole('combobox', { name: 'Ejemplo para experimentos', exact: true }).selectOption('grouped');
  await page.getByRole('button', { name: 'Cargar ejemplo en el estudio', exact: true }).click();
  await page.getByRole('combobox', { name: 'Tipo de estudio', exact: true }).selectOption('cv');
  await page.getByRole('button', { name: 'Ejecutar estudio', exact: true }).click();
  await expect(page.locator('.cv-results')).toBeVisible();
  await page.locator('.cv-results').screenshot({ path: 'docs/implementation/d7-cross-validation.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.locator('.cv-results').evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 88, behavior: 'instant' }));
  await page.screenshot({ path: 'docs/implementation/d7-cross-validation-mobile.png' });
} finally { await browser.close(); }

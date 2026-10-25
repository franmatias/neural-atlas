import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:4173/neural-atlas/#/lab/generalizacion');
  await page.getByLabel('Épocas por ensayo', { exact: true }).fill('10');
  await page.getByRole('combobox', { name: 'Repeticiones emparejadas', exact: true }).selectOption('5');
  await page.getByRole('button', { name: 'Comparar múltiples semillas', exact: true }).click();
  await expect(page.locator('.multiseed-panel')).toBeVisible();
  await page.locator('.multiseed-panel').screenshot({ path: 'docs/implementation/d6-multiseed.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.locator('.multiseed-panel').evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 88, behavior: 'instant' }));
  await page.screenshot({ path: 'docs/implementation/d6-multiseed-mobile.png' });
} finally {
  await browser.close();
}

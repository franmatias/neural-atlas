import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:4173/neural-atlas/#/lab/generalizacion/capacidad');
  await page.getByLabel('Épocas del estudio', { exact: true }).fill('10');
  await page.getByRole('button', { name: 'Comparar capacidad y datos', exact: true }).click();
  await expect(page.locator('.capacity-results')).toBeVisible();
  await page.locator('.capacity-results').screenshot({ path: 'docs/implementation/d6-capacity.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.locator('.capacity-results').evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 88, behavior: 'instant' }));
  await page.screenshot({ path: 'docs/implementation/d6-capacity-mobile.png' });
} finally { await browser.close(); }

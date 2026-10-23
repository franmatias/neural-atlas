import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:4173/neural-atlas/#/lab/generalizacion');
  await page.getByRole('button', { name: 'Comparar con referencia', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Comparación de generalización', exact: true }).locator('tbody tr')).toHaveCount(2);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: 'docs/implementation/d6-generalization.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.getByRole('heading', { name: 'Resultados de la comparación', exact: true }).evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 88, behavior: 'instant' }));
  await page.screenshot({ path: 'docs/implementation/d6-generalization-mobile.png' });
} finally { await browser.close(); }

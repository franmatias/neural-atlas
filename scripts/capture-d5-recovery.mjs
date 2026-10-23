import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:4173/neural-atlas/#/lab/entrenamiento');
  await page.getByRole('button', { name: 'Cargar ejemplo y sustituir datos', exact: true }).click();
  await page.getByRole('button', { name: 'Inicializar modelo', exact: true }).click();
  await page.getByRole('button', { name: 'Una época', exact: true }).click();
  await expect(page.locator('.recovery-panel')).toContainText('Recuperación guardada · época 1');
  await expect(page.getByRole('button', { name: 'Revisar puntos guardados', exact: true })).toBeEnabled();
  await page.locator('.recovery-panel').screenshot({ path: 'docs/implementation/d5-recovery.png' });
} finally { await browser.close(); }

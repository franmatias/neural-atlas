import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  for (const id of ['T02', 'T05']) {
    await page.goto('http://127.0.0.1:4173/neural-atlas/#/taller');
    await page.getByRole('button', { name: new RegExp(`^${id} ·`) }).click();
    await page.locator('textarea').fill('Predigo que los factores controlados permitirán explicar las diferencias que observe en las medidas.');
    await page.getByRole('button', { name: 'Validar paso y continuar', exact: true }).click();
    if (id === 'T05') await page.getByLabel('He revisado el presupuesto de seis ensayos.', { exact: true }).check();
    await page.locator('textarea').fill('Mantengo la semilla y comparo únicamente los factores indicados en el caso.');
    await page.getByRole('button', { name: 'Validar paso y continuar', exact: true }).click();
    await page.getByRole('button', { name: 'Ejecutar caso con el motor' }).click();
    await page.getByRole('heading', { name: 'Evidencia del motor', exact: true }).waitFor();
    await expect(page.getByRole('button', { name: 'Validar paso y continuar', exact: true })).toBeEnabled();
    await page.getByText('Progreso y evidencias guardados en este navegador', { exact: true }).waitFor();
    if (id === 'T05') {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: `docs/implementation/${id === 'T02' ? 'd5-workshop-boundary' : 'd5-workshop-mobile'}.png`, fullPage: true });
  }
} finally { await browser.close(); }

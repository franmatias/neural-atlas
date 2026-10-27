import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
test('paquete docente completo: soluciones omitidas, instalación, recarga, apertura revisable y retirada', async ({
  page,
}) => {
  await page.goto('#/docencia');
  await page.getByLabel('Título', { exact: true }).fill('Unidad XOR y diagnóstico');
  await page.getByRole('button', { name: 'Preparar previsualización' }).click();
  await expect(
    page.getByRole('heading', { name: 'Unidad XOR y diagnóstico · 1.0.0' }),
  ).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar paquete sin soluciones' }).click();
  const file = await download;
  const p = JSON.parse(await readFile((await file.path())!, 'utf8'));
  expect(p.format).toBe('neural-atlas.teaching-pack');
  expect(p.workshops).toHaveLength(2);
  expect(p.datasets[0].file.format).toBe('neural-atlas.dataset');
  expect(
    p.workshops
      .flatMap((w: { steps: unknown[] }) => w.steps)
      .every((s: { solution?: string }) => !s.solution),
  ).toBe(true);
  await page.getByRole('button', { name: 'Confirmar instalación' }).click();
  await expect(page.getByRole('status')).toContainText('instalado');
  await page.reload();
  await page.getByLabel('Paquete a inspeccionar').selectOption('mi-unidad');
  await expect(page.getByText('Instalado en este navegador.')).toBeVisible();
  await page.getByRole('button', { name: 'Aplicar dataset…' }).click();
  await expect(page.getByRole('button', { name: 'Confirmar apertura del recurso' })).toBeVisible();
  await page.getByRole('button', { name: 'Conservar sesión' }).click();
  await expect(page.getByRole('button', { name: 'Confirmar apertura del recurso' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Aplicar dataset…' }).click();
  await page.getByRole('button', { name: 'Confirmar apertura del recurso' }).click();
  await expect(page.getByRole('status')).toContainText('petición explícita');
  await page.getByRole('button', { name: 'Retirar paquete…' }).click();
  await page.getByRole('button', { name: 'Confirmar retirada' }).click();
  await expect(page.getByRole('heading', { name: 'Unidad XOR y diagnóstico · 1.0.0' })).toHaveCount(
    0,
  );
  await page.getByLabel('Archivo docente').setInputFiles((await file.path())!);
  await expect(
    page.getByRole('heading', { name: 'Unidad XOR y diagnóstico · 1.0.0' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Abrir taller…' }).first().click();
  await page.getByRole('button', { name: 'Confirmar apertura del recurso' }).click();
  await expect(page).toHaveURL(/#\/taller$/);
});
test('docencia y disponibilidad local: teclado, temas y 360 px', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of ['/docencia', '/sin-conexion']) {
    await page.goto('#' + route);
    await expect(page.locator('h1')).toBeVisible();
    for (const theme of ['light', 'dark']) {
      await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
      await page.getByLabel('Tema', { exact: true }).selectOption(theme);
      await page.getByRole('button', { name: 'Cerrar ajustes' }).click();
      await page.setViewportSize({ width: 360, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
  }
});

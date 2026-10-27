import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('fichas, mapa y repaso conservan progreso tras recargar y requieren confirmar reinicio', async ({
  page,
}) => {
  await page.goto('#/conceptos/C021');
  await expect(page.getByRole('heading', { name: 'Ejemplo numérico estático' })).toBeVisible();
  await expect(page.getByText('z = 0.44 · salida')).toBeVisible();
  await page.getByRole('button', { name: 'He explicado el concepto con mis palabras' }).click();
  await expect(page.getByText('Visitado: sí · explicado: sí')).toBeVisible();
  await page.getByRole('link', { name: 'Practicar la pregunta' }).click();
  await page.locator('input[value=correct]').check();
  await page.getByRole('button', { name: 'Comprobar respuesta' }).click();
  await expect(page.getByRole('heading', { name: 'Respuesta correcta' })).toBeVisible();
  await expect(page.getByText('Caja 1 / 5')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Caja 1 / 5')).toBeVisible();
  await page.getByRole('button', { name: 'Reiniciar esta ficha…' }).click();
  await expect(page.getByText('Caja 1 / 5')).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar reinicio' }).click();
  await expect(page.getByText('Caja 0 / 5')).toBeVisible();
  await page.getByRole('link', { name: 'Mapa', exact: true }).click();
  await expect(page.getByRole('img', { name: /Relaciones de/ })).toBeVisible();
  await page.getByRole('searchbox').fill('C652');
  await expect(page.locator('ol li')).toHaveCount(1);
  await page.locator('ol').getByRole('link').click();
  await expect(page.getByText('Término de consulta.')).toBeVisible();
});
test('paquete local: ejemplo, previsualización, rechazo seguro, confirmación y restauración', async ({
  page,
}) => {
  await page.goto('#/conceptos/paquetes');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar ejemplo editable' }).click();
  const file = await download;
  const path = await file.path();
  expect(path).toBeTruthy();
  await page.getByLabel('Archivo de conceptos').setInputFiles(path!);
  await expect(page.getByRole('heading', { name: 'Ejemplo editable · 1.0.0' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Paquetes instalados/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ejemplo editable · 1.0.0' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Confirmar y guardar' }).click();
  await expect(page.getByRole('status')).toContainText('guardado');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Ejemplo editable · 1.0.0' })).toBeVisible();
  await page.getByLabel('Archivo de conceptos').setInputFiles({
    name: 'invalido.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"__proto__":{"polluted":true}}'),
  });
  await expect(page.getByRole('alert')).toContainText('rechazado');
  await page.goto('#/glosario?q=C653');
  await expect(page.locator('.concept-card h2')).toHaveText('Neurona: ejemplo local');
  await page.locator('.concept-card h2 a').click();
  await expect(page.getByText('Paquete local ejemplo-local')).toBeVisible();
  await page.goto('#/conceptos/paquetes');
  await page.getByRole('button', { name: 'Retirar…' }).click();
  await page.getByRole('button', { name: 'Confirmar retirada' }).click();
  await page.goto('#/glosario?q=C653');
  await expect(page.locator('.concept-card')).toHaveCount(0);
});
test('nuevas páginas adaptables y accesibles en ambos temas', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of ['/conceptos/C021', '/conceptos/mapa', '/repaso', '/conceptos/paquetes']) {
    await page.goto('#' + route);
    await expect(page.locator('h1')).toBeVisible();
    for (const theme of ['light', 'dark']) {
      await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
      await page.getByLabel('Tema', { exact: true }).selectOption(theme);
      await page.getByRole('button', { name: 'Cerrar ajustes' }).click();
      await page.setViewportSize({ width: 360, height: 1000 });
      const layout = await page.evaluate(() => ({
        route: location.hash,
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
        files: [...document.querySelectorAll('input[type=file]')].map((e) => ({
          width: e.getBoundingClientRect().width,
          right: e.getBoundingClientRect().right,
        })),
      }));
      expect(layout.scroll, JSON.stringify(layout)).toBeLessThanOrEqual(layout.width);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
  }
});
test('error frecuente prepara un nuevo intento T12 tras confirmación explícita', async ({
  page,
}) => {
  await page.goto('#/taller?failure=failure-bn');
  await expect(
    page.getByRole('heading', { name: 'Preparar: Batch normalization con lote uno' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Archivar intento anterior y preparar este caso' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Preparar: Batch normalization con lote uno' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'T12 · Reparación que otra persona puede repetir' }),
  ).toBeVisible();
});

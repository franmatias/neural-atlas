import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('datos con duplicados: Worker, partición de grupos y pipeline trazable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('#/lab/datos');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Todo empieza en los datos.');
  await page.getByLabel('Ejemplo práctico', { exact: true }).selectOption('copies');
  await page.getByRole('button', { name: 'Generar y sustituir datos' }).click();
  await expect(page.getByText('Dataset generado.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Dividir', exact: true }).click();
  await page.getByRole('button', { name: 'Crear partición' }).click();
  await expect(page.getByRole('heading', { name: /Proporciones logradas/ })).toContainText(
    'Estratificada por grupos',
  );
  await page.getByRole('button', { name: 'Preparar', exact: true }).click();
  await page.getByLabel('Añadir indicadores de faltantes').check();
  await page.getByRole('button', { name: 'Ajustar con train y transformar' }).click();
  await expect(
    page.getByRole('heading', { name: 'Estado aprendido exclusivamente con train' }),
  ).toBeVisible();
  await expect(page.locator('.dimension-flow')).toContainText('4 Dimensión resultante');
  await page.getByRole('button', { name: 'Explorar', exact: true }).click();
  await page.getByLabel('Vista del mapa').selectOption('prepared');
  await page.getByLabel('Conjunto visible').selectOption('test');
  await expect(page.locator('.data-point path').first()).toBeVisible();
  await page.getByLabel('Vista del mapa').selectOption('raw');
  await page.getByLabel('Conjunto visible').selectOption('all');
  await page.getByLabel('x₁', { exact: true }).fill('0,75');
  await page.getByRole('button', { name: 'Aplicar cambios de la muestra' }).click();
  await expect(page.getByText('Datos modificados:', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Preparar', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Ajustar con train y transformar' }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});
test('CSV con errores requiere asignación, exclusión y confirmación', async ({ page }) => {
  await page.goto('#/lab/datos');
  await page.getByRole('button', { name: 'Intercambiar', exact: true }).click();
  await page
    .getByLabel('Archivo CSV o JSON')
    .setInputFiles({
      name: 'datos.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('valor;zona;clase\n0;rojo;0\n1;azul;1\nbad;rojo;0'),
    });
  await page
    .getByRole('combobox', { name: 'Uso de la columna 2', exact: true })
    .selectOption('categorical');
  await page.getByRole('button', { name: 'Validar asignación' }).click();
  await expect(page.getByText('Registro 4', { exact: false })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Confirmar importación y sustituir dataset' }),
  ).toHaveCount(0);
  await page.getByLabel('Excluir explícitamente las filas inválidas').check();
  await page.getByRole('button', { name: 'Validar asignación' }).click();
  await expect(page.getByText('Dataset válido: 2 muestras.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar importación y sustituir dataset' }).click();
  await expect(page.locator('.dataset-summary>div').first()).toContainText('2');
  await expect(page.locator('.dataset-table tbody tr')).toHaveCount(2);
});
test('JSON descargado conserva hash y filas al volver a importar', async ({ page }, testInfo) => {
  await page.goto('#/lab/datos');
  await page.locator('.data-hash summary').click();
  const hash = await page.locator('.data-hash code').textContent();
  await page.getByRole('button', { name: 'Intercambiar', exact: true }).click();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar JSON completo' }).click();
  const download = await downloadEvent;
  const path = await download.path();
  expect(path).not.toBeNull();
  const importPath = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(importPath);
  await page.getByLabel('Archivo CSV o JSON').setInputFiles(importPath);
  await expect(page.getByText('Dataset válido: 300 muestras.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar importación y sustituir dataset' }).click();
  await expect(page.locator('.data-hash code')).toHaveText(hash!);
  await page.getByRole('group', { name: /Mapa de datos/ }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.data-selected-id strong')).toHaveText('r-2');
});
test('datos: accesibilidad en ambos temas y responsive sin desbordamiento global', async ({
  page,
}, testInfo) => {
  await page.goto('#/lab/datos');
  for (const theme of ['light', 'dark'] as const) {
    await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Tema', { exact: true }).selectOption(theme);
    await page.getByRole('button', { name: 'Cerrar ajustes' }).click();
    for (const tab of ['Explorar', 'Dividir', 'Preparar', 'Intercambiar']) {
      await page.getByRole('button', { name: tab, exact: true }).click();
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
          .violations,
      ).toEqual([]);
    }
    await page.getByRole('button', { name: 'Explorar', exact: true }).click();
    await testInfo.attach(`datos-${theme}`, {
      body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
      contentType: 'image/png',
    });
  }
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const tab of ['Explorar', 'Dividir', 'Preparar', 'Intercambiar']) {
      await page.getByRole('button', { name: tab, exact: true }).click();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
    }
  }
});

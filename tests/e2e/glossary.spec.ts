import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('500 fichas de consulta: filtros, páginas, foco, búsqueda y enlaces estables', async ({
  page,
}) => {
  await page.goto('#/glosario');
  await expect(page.getByRole('status')).toContainText('652 conceptos');
  await expect(page.locator('.concept-card')).toHaveCount(24);
  const pagination = page.getByRole('navigation', { name: 'Paginación superior del glosario' });
  await pagination.getByRole('button', { name: 'Última', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('649–652 de 652');
  await expect(page.locator('.concept-card')).toHaveCount(4);
  await pagination.getByRole('button', { name: 'Primera', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.concept-grid')).toBeFocused();
  await expect(page.locator('.concept-card')).toHaveCount(24);
  await page.getByLabel('Tipo de ficha').selectOption('reference');
  await expect(page.getByRole('status')).toContainText('501 conceptos');
  await page.getByRole('combobox', { name: 'Tema', exact: true }).selectOption('attention');
  await expect(page.getByRole('status')).toContainText('25 conceptos');
  await page.getByRole('button', { name: 'Página siguiente', exact: true }).first().click();
  await expect(page.locator('.concept-card')).toHaveCount(1);
  await expect(page.locator('.concept-grid')).toBeFocused();
  await page.getByRole('searchbox').fill('key-value cache');
  await expect(page.getByRole('status')).toContainText('Página 1 de 1');
  await expect(page.locator('.concept-card h2')).toHaveText('Caché de claves y valores');
  await page.getByRole('combobox', { name: 'Tema', exact: true }).selectOption('all');
  await page.getByRole('searchbox').fill('C652');
  await page.getByRole('link', { name: 'Enlace al concepto C652' }).click();
  await page.reload();
  await expect(page).toHaveURL(/q=C652/);
  await expect(page.locator('.concept-card h2')).toHaveText('Paridad demográfica');
  await expect(page.locator('.concept-card a[href*="/lab/"]')).toHaveCount(0);
  await page.getByRole('searchbox').fill('PCA');
  await expect(page.locator('.concept-card h2').first()).toHaveText(
    'Análisis de componentes principales',
  );
  await page.getByRole('searchbox').fill('');
  await page.getByLabel('Tipo de ficha').selectOption('interactive');
  await expect(page.getByRole('status')).toContainText('151 conceptos');
});

test('glosario adaptable y accesible en ambos temas', async ({ page }) => {
  await page.goto('#/glosario?q=C512');
  for (const theme of ['light', 'dark']) {
    await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
    await page.getByLabel('Tema', { exact: true }).selectOption(theme);
    await page.getByRole('button', { name: 'Cerrar ajustes' }).click();
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(page.locator('.concept-card h2')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});

import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
async function run(page: Page) {
  await page.getByRole('button', { name: 'Aplicar filtro y registrar mapas', exact: true }).click();
  await expect(page.getByTestId('vision-result')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Aplicar filtro y registrar mapas', exact: true }),
  ).toBeEnabled();
}
async function report(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar informe de visión', exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}
async function field(page: Page, name: string, value: string) {
  await page.getByLabel(name, { exact: true }).fill(value);
  await page.getByLabel(name, { exact: true }).press('Enter');
}
test('pintura por coordenadas y ratón, identidad real e informe con hipótesis registrada', async ({
  page,
}) => {
  await page.goto('#/lab/vision');
  await page.getByRole('button', { name: 'Borrar imagen', exact: true }).click();
  await page.getByRole('button', { name: 'Filtro identidad', exact: true }).click();
  await page
    .getByLabel('Hipótesis de visión', { exact: true })
    .fill('El filtro identidad conserva el píxel.');
  await page.getByRole('button', { name: 'Pintar píxel', exact: true }).click();
  await run(page);
  let r = await report(page);
  expect(r.result.raw[0]).toBe(1);
  expect(r.inspector.sum).toBe(1);
  expect(r.inspector.products.filter((p: { padding: boolean }) => p.padding)).toHaveLength(5);
  expect(r.pooling.winner).toBe(0);
  const image = page.getByRole('img', { name: 'Imagen en preparación', exact: true });
  await image.scrollIntoViewIfNeeded();
  const box = (await image.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.15, box.y + box.height * 0.15);
  await page.getByLabel('Hipótesis de visión', { exact: true }).fill('Borrador nuevo');
  const old = await report(page);
  expect(old.dataHash).toBe(r.dataHash);
  expect(old.hypothesis).toContain('identidad');
  await run(page);
  r = await report(page);
  expect(r.result.input.pixels[11]).toBe(1);
  expect(r.result.raw[11]).toBe(1);
  expect(r.hypothesis).toBe('Borrador nuevo');
});
test('kernel 5, stride, ceros asimétricos, ReLU, dimensión impar y sumas independientes', async ({
  page,
}) => {
  await page.goto('#/lab/vision');
  await page.getByRole('combobox', { name: 'Tamaño de kernel', exact: true }).selectOption('5');
  await page.getByRole('button', { name: 'Filtro identidad', exact: true }).click();
  await page.getByLabel('Peso del kernel 2,2', { exact: true }).fill('-1');
  await page.getByLabel('Peso del kernel 2,2', { exact: true }).press('Tab');
  await page.getByLabel('Aplicar ReLU', { exact: true }).uncheck();
  await field(page, 'Desplazamiento (stride)', '3');
  await run(page);
  let r = await report(page);
  expect(r.result.shape).toEqual({ output: 4, before: 2, after: 2, pooled: 2 });
  const p = r.result.input;
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 4; col++) {
      let sum = 0;
      for (let kr = 0; kr < 5; kr++)
        for (let kc = 0; kc < 5; kc++) {
          const rr = row * 3 - 2 + kr,
            cc = col * 3 - 2 + kc;
          sum +=
            (rr < 0 || cc < 0 || rr >= 10 || cc >= 10 ? 0 : p.pixels[rr * 10 + cc]) *
            p.kernel[kr * 5 + kc];
        }
      expect(r.result.raw[row * 4 + col]).toBe(sum);
      expect(r.result.activation[row * 4 + col]).toBe(sum);
    }
  await page.getByRole('combobox', { name: 'Padding', exact: true }).selectOption('valid');
  await field(page, 'Desplazamiento (stride)', '2');
  await page.getByLabel('Aplicar ReLU', { exact: true }).check();
  await run(page);
  r = await report(page);
  expect(r.result.shape.output).toBe(3);
  expect(r.result.pool.discardedEdge).toBe(true);
  expect(r.result.activation.every((v: number) => v >= 0)).toBe(true);
  await expect(
    page.getByText('La dimensión de activación es impar:', { exact: false }),
  ).toBeVisible();
});
test('reproducción accesible, temas y matriz máxima responsive', async ({ page }) => {
  await page.goto('#/lab/vision');
  await run(page);
  await page.getByRole('button', { name: 'Ventana siguiente', exact: true }).click();
  await expect(page.getByLabel('Índice de salida inspeccionada', { exact: true })).toHaveValue('1');
  await page.getByRole('button', { name: 'Animar ventanas', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar ventanas', exact: true })).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('button', { name: 'Animar ventanas', exact: true })).toBeDisabled();
  await page.getByRole('combobox', { name: 'Tamaño de imagen', exact: true }).selectOption('28');
  await run(page);
  const r = await report(page);
  expect(r.result.input.pixels).toHaveLength(784);
  expect(r.result.raw).toHaveLength(784);
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme);
    for (const width of [360, 390, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});

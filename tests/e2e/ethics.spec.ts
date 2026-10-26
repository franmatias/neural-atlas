import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
async function report(page: Page) {
  const pending = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Exportar informe de ética y grupos', exact: true })
    .click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}
async function open(page: Page) {
  await page.goto('#/lab/clasificacion');
  await page.getByRole('link', { name: 'Ética y métricas por grupos', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('¿A quién oculta el promedio?');
}
async function generate(page: Page) {
  await page.getByRole('button', { name: 'Generar cohorte de auditoría', exact: true }).click();
  await expect(page.getByTestId('audit-reference-accuracy')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Generar cohorte de auditoría', exact: true }),
  ).toBeEnabled();
}
test('cohorte real de Worker, agregado engañoso, costes y cambios con datos inmutables', async ({
  page,
}) => {
  await open(page);
  await page
    .getByLabel('Hipótesis de ética', { exact: true })
    .fill('Un promedio alto puede ocultar errores del canal pequeño.');
  await generate(page);
  const initial = await report(page);
  expect(initial.analysis.reference.overall.accuracy).toBeGreaterThan(0.9);
  expect(initial.analysis.reference.groups.G2.recall).toBeLessThan(0.8);
  await page.getByLabel('Umbral común alternativo', { exact: true }).fill('0');
  await page.getByLabel('Umbral común alternativo', { exact: true }).press('Enter');
  await page.getByLabel('Coste FP · canal 1', { exact: true }).fill('1,5');
  await page.getByLabel('Coste FP · canal 1', { exact: true }).press('Enter');
  await page
    .getByLabel('Reflexión sobre evidencia', { exact: true })
    .fill('Los FN bajan y los FP aumentan; revisaré sus denominadores.');
  await page
    .getByLabel('Reflexión sobre contexto', { exact: true })
    .fill('Faltan validez de etiquetas, subgrupos y consecuencias.');
  await page
    .getByLabel('Reflexión sobre propuesta', { exact: true })
    .fill('Debatir los costes con las personas afectadas y revisar el uso.');
  await page.getByLabel('Semilla de auditoría', { exact: true }).fill('99');
  const after = await report(page);
  expect(after.dataHash).toBe(initial.dataHash);
  expect(after.rows).toEqual(initial.rows);
  expect(after.options.seed).toBe(42);
  expect(after.analysis.alternative.overall.selection).toBe(1);
  expect(after.analysis.alternative.overall.fn).toBe(0);
  const fp1 = after.rows.filter(
    (r: { group: string; actual: number }) => r.group === 'G1' && r.actual === 0,
  ).length;
  const fp2 = after.rows.filter(
    (r: { group: string; actual: number }) => r.group === 'G2' && r.actual === 0,
  ).length;
  expect(after.analysis.alternative.overall.totalCost).toBe(fp1 * 1.5 + fp2 * 2);
  expect(after.analysis.alternative.overall.meanCost).toBe(
    (fp1 * 1.5 + fp2 * 2) / after.rows.length,
  );
  expect(after.analysis.transitions.overall.errorsFixed).toBe(
    initial.analysis.reference.overall.fn,
  );
  expect(after.reflection.context).toContain('subgrupos');
  expect(after.hypothesis).toBe(initial.hypothesis);
  expect(after.scoreRule).toContain('not a trained network');
});
test('ausencia, denominadores nulos, umbrales por canal y error de generación explícito', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('combobox', { name: 'Caso de ética', exact: true }).selectOption('absent');
  await generate(page);
  await expect(
    page.getByText('Sin representación: no hay rendimiento observado de este canal.', {
      exact: true,
    }),
  ).toBeVisible();
  let r = await report(page);
  expect(r.analysis.reference.groups.G2.n).toBe(0);
  expect(r.analysis.reference.groups.G2.accuracy).toBe(null);
  expect(r.analysis.reference.gaps.recall).toBe(null);
  await page
    .getByRole('combobox', { name: 'Caso de ética', exact: true })
    .selectOption('noPositives');
  await generate(page);
  r = await report(page);
  expect(r.analysis.reference.groups.G2.recall).toBe(null);
  expect(r.analysis.reference.groups.G2.fnr).toBe(null);
  await page
    .getByRole('combobox', { name: 'Caso de ética', exact: true })
    .selectOption('noNegatives');
  await generate(page);
  await page.getByLabel('Usar umbrales por canal en la alternativa', { exact: true }).check();
  await page.getByLabel('Umbral alternativo · canal 1', { exact: true }).fill('1');
  await page.getByLabel('Umbral alternativo · canal 1', { exact: true }).press('Enter');
  await page.getByLabel('Umbral alternativo · canal 2', { exact: true }).fill('0');
  await page.getByLabel('Umbral alternativo · canal 2', { exact: true }).press('Enter');
  r = await report(page);
  expect(r.analysis.reference.groups.G2.fpr).toBe(null);
  expect(r.analysis.thresholds.alternative).toEqual({ G1: 1, G2: 0 });
  expect(r.analysis.alternative.groups.G1.selection).toBe(0);
  expect(r.analysis.alternative.groups.G2.selection).toBe(1);
  await page.getByText('Ajustar el mecanismo y el soporte', { exact: true }).click();
  await page.getByLabel('Filas del canal 1', { exact: true }).fill('0');
  await page.getByLabel('Filas del canal 2', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Generar cohorte de auditoría', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('al menos 20');
  expect((await report(page)).dataHash).toBe(r.dataHash);
});
test('cancelación controlada, navegación, filtros, accesibilidad, temas y móvil', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    const original = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (
      message: unknown,
      transfer?: Transferable[] | StructuredSerializeOptions,
    ) {
      if (
        (window as Window & { holdAuditJobs?: boolean }).holdAuditJobs &&
        (message as { job?: { kind?: string } })?.job?.kind === 'groupAudit'
      )
        return;
      original.call(this, message, transfer as StructuredSerializeOptions);
    };
  });
  await open(page);
  await generate(page);
  const initial = await report(page);
  await page.evaluate(() => {
    (window as Window & { holdAuditJobs?: boolean }).holdAuditJobs = true;
  });
  await page.getByRole('button', { name: 'Generar cohorte de auditoría', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar generación de auditoría', exact: true }).click();
  expect((await report(page)).dataHash).toBe(initial.dataHash);
  await page.getByRole('button', { name: 'Generar cohorte de auditoría', exact: true }).click();
  await page.getByRole('link', { name: /^Volver a clasificación y evaluación/ }).click();
  await expect(page).toHaveURL(/#\/lab\/clasificacion$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Más allá de los aciertos.');
  await page.getByRole('link', { name: 'Ética y métricas por grupos', exact: true }).click();
  await expect(page.getByTestId('audit-support')).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Canal de las filas auditadas', exact: true })
    .selectOption('G2');
  await page
    .getByRole('combobox', { name: 'Filtrar decisiones de auditoría', exact: true })
    .selectOption('fn');
  const table = page.getByRole('table', {
    name: 'Decisiones sobre las mismas filas de auditoría',
    exact: true,
  });
  await expect(table.locator('tbody tr')).toHaveCount(
    Math.min(20, initial.analysis.reference.groups.G2.fn),
  );
  const slider = page.getByRole('slider', {
    name: 'Umbral común alternativo · deslizador',
    exact: true,
  });
  await slider.focus();
  await slider.press('ArrowLeft');
  expect((await report(page)).analysis.thresholds.alternative.G2).toBeLessThan(0.5);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const theme of ['light', 'dark']) {
    await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
    await page.getByLabel('Tema', { exact: true }).selectOption(theme);
    await page.getByRole('button', { name: 'Cerrar ajustes', exact: true }).click();
    for (const width of [360, 390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
  }
  await page
    .locator('.audit-charts')
    .screenshot({ path: testInfo.outputPath('ethics-distributions.png') });
});

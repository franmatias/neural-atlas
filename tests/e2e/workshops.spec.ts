import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
async function open(page: Page, id: string) {
  await page.goto('#/taller');
  const activity = page.getByRole('button', { name: new RegExp(`^${id} ·`) });
  await expect(activity).toBeEnabled();
  await activity.click();
}
async function answerAndNext(page: Page) {
  await page
    .locator('textarea')
    .fill(
      'Mi hipótesis se contrasta con las medidas obtenidas; explico el concepto y reconozco sus límites.',
    );
  await page.getByRole('button', { name: 'Validar paso y continuar', exact: true }).click();
}
for (const id of [
  'T01',
  'T02',
  'T03',
  'T04',
  'T05',
  'T06',
  'T07',
  'T08',
  'T09',
  'T10',
  'T11',
  'T12',
]) {
  test(`${id}: POE, evidencia nativa, reflexión y recuperación tras recargar`, async ({ page }) => {
    await open(page, id);
    await expect(page.locator('.workshop-evidence')).toHaveCount(0);
    await answerAndNext(page);
    if (id === 'T05')
      await page.getByLabel('He revisado el presupuesto de seis ensayos.', { exact: true }).check();
    if (['T06', 'T08', 'T09', 'T12'].includes(id))
      await page.getByLabel('He revisado el presupuesto del taller.', { exact: true }).check();
    await answerAndNext(page);
    await page.getByRole('button', { name: 'Ejecutar caso con el motor' }).click();
    await expect(
      page.getByRole('heading', { name: 'Evidencia del motor', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Progreso y evidencias guardados en este navegador', { exact: true }),
    ).toBeVisible();
    if (id === 'T08' || id === 'T12') {
      const pending = page.waitForEvent('download');
      await page
        .getByRole('button', { name: 'Descargar experimento reproducible del taller', exact: true })
        .click();
      const experiment = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
      expect(experiment.format).toBe('neural-atlas.experiment');
      expect(experiment.testConsulted).toBe(false);
      expect(experiment.checkpoint.epoch).toBeLessThan(experiment.config.epochs);
      expect(experiment.integrity).toHaveLength(64);
    }
    if (id === 'T02')
      await expect(
        page.getByRole('img', { name: 'Frontera antes y después de cambiar solo el sesgo' }),
      ).toBeVisible();
    if (id === 'T05') {
      await expect(
        page.getByRole('table', { name: 'Medidas registradas del taller T05' }).locator('tbody tr'),
      ).toHaveCount(6);
      await page
        .getByRole('combobox', { name: 'Ensayo para inspeccionar', exact: true })
        .selectOption('5');
    }
    await page.getByRole('button', { name: 'Validar paso y continuar', exact: true }).click();
    await answerAndNext(page);
    await page
      .locator('textarea')
      .fill(
        'Explico las medidas con el concepto, mantengo los factores constantes y propongo repetir con otras semillas.',
      );
    await page
      .getByRole('combobox', { name: 'Autoevaluación orientativa', exact: true })
      .selectOption('2');
    await page.getByRole('button', { name: 'Registrar reflexión y completar recorrido' }).click();
    await expect(
      page.getByRole('heading', { name: 'Recorrido registrado', exact: true }),
    ).toBeVisible();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar cuaderno de evidencias' }).click();
    const text = await readFile((await (await pending).path())!, 'utf8');
    const evidence = JSON.parse(text) as {
      format: string;
      progress: { step: number; evidence: { caseId: string } };
    };
    expect(evidence.format).toBe('neural-atlas.learning-evidence');
    expect(evidence.progress.step).toBe(5);
    expect(evidence.progress.evidence.caseId).toBe(id);
    await page.reload();
    await page.getByRole('button', { name: new RegExp(`^${id} ·`) }).click();
    await expect(
      page.getByRole('heading', { name: 'Recorrido registrado', exact: true }),
    ).toBeVisible();
  });
}
for (const fault of ['leak', 'output', 'bn', 'labels', 'relu', 'rate', 'units']) {
  test(`T12 ${fault}: diagnóstico nativo, modo seguro y evidencia exportable`, async ({ page }) => {
    await open(page, 'T12');
    await answerAndNext(page);
    await page.getByRole('combobox', { name: 'Fallo plantado', exact: true }).selectOption(fault);
    await page.getByLabel('Épocas del proyecto', { exact: true }).fill('5');
    await page.getByLabel('Épocas del proyecto', { exact: true }).press('Enter');
    await page.getByLabel('He revisado el presupuesto del taller.', { exact: true }).check();
    await answerAndNext(page);
    await page.getByRole('button', { name: 'Ejecutar caso con el motor', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Evidencia del motor', exact: true }),
    ).toBeVisible();
    const pending = page.waitForEvent('download');
    await page
      .getByRole('button', { name: 'Exportar cuaderno de evidencias', exact: true })
      .click();
    const book = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
    const r = book.progress.evidence;
    expect(r.options.advanced.fault).toBe(fault);
    expect(r.metrics.testConsulted).toBe(false);
    expect(r.metrics.repairPreservesSplit).toBe(true);
    expect(JSON.parse(r.experiment).testConsulted).toBe(false);
    if (fault === 'output' || fault === 'bn') expect(r.metrics.validationRejected).toBe(true);
    if (fault === 'leak') {
      expect(r.metrics.illustrativeHoldoutConsulted).toBe(true);
      expect(r.rows[1].values[1]).toBe(0.02);
    }
    if (fault === 'labels') expect(r.rows[1].values[1]).toBe(15);
    if (fault === 'relu') expect(r.rows[1].values).toEqual([576, 576]);
    if (fault === 'rate') expect(r.curves.map((c: { rate: number }) => c.rate)).toEqual([1, 0.01]);
    if (fault === 'units') expect(r.rows).toHaveLength(2);
  });
}

test('T12: controles y evidencia accesibles en móvil y ambos temas', async ({ page }) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await open(page, 'T12');
  await answerAndNext(page);
  await page.getByRole('combobox', { name: 'Fallo plantado', exact: true }).selectOption('bn');
  await page.getByLabel('He revisado el presupuesto del taller.', { exact: true }).check();
  await answerAndNext(page);
  await page.getByRole('button', { name: 'Ejecutar caso con el motor', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Evidencia del motor', exact: true }),
  ).toBeVisible();
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

test('migración nativa v1→v4 conserva experimentos y sus tensores', async ({ page }) => {
  await page.goto('#/');
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('neural-atlas', 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('experiments', { keyPath: 'id' });
        request.result
          .createObjectStore('libraryIndex', { keyPath: 'id' })
          .createIndex('updatedAt', 'updatedAt');
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('experiments', 'readwrite');
        tx.objectStore('experiments').put({
          id: 'v1-preserved',
          weights: new Float64Array([0.25, -0.5]),
        });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
  });
  await open(page, 'T02');
  await answerAndNext(page);
  const result = await page.evaluate(
    async () =>
      new Promise<{ version: number; weights: number[] }>((resolve, reject) => {
        const request = indexedDB.open('neural-atlas', 4);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('experiments');
          const get = tx.objectStore('experiments').get('v1-preserved');
          get.onsuccess = () => {
            resolve({
              version: db.version,
              weights: Array.from((get.result as { weights: Float64Array }).weights),
            });
            db.close();
          };
        };
      }),
  );
  expect(result).toEqual({ version: 4, weights: [0.25, -0.5] });
});
test('actividad compartida sin soluciones, archivo inválido y vista accesible', async ({
  page,
}) => {
  await open(page, 'T02');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar actividad JSON' }).click();
  const text = await readFile((await (await downloaded).path())!, 'utf8');
  const activity = JSON.parse(text) as {
    id: string;
    title: { es: string };
    steps: { solution?: string }[];
  };
  expect(activity.steps.every((step) => step.solution === undefined)).toBe(true);
  activity.id = 'Taller-compartido';
  activity.title.es = 'Mi frontera compartida';
  await page.getByLabel('Importar actividad JSON', { exact: false }).setInputFiles({
    name: 'workshop.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(activity)),
  });
  await expect(
    page.getByRole('heading', { name: 'Taller-compartido · Mi frontera compartida', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Importar actividad JSON', { exact: false }).setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"format":"neural-atlas.workshop","code":"eval()"}'),
  });
  await expect(page.getByRole('alert')).toContainText('No se ha abierto');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute('data-theme', value),
      theme,
    );
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
test('IndexedDB denegado conserva respuestas y permite exportar evidencias en memoria', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'indexedDB', {
      get() {
        throw new DOMException('Denied', 'SecurityError');
      },
    }),
  );
  await open(page, 'T02');
  await answerAndNext(page);
  await answerAndNext(page);
  await page.getByRole('button', { name: 'Ejecutar caso con el motor' }).click();
  await expect(
    page.getByRole('heading', { name: 'Evidencia del motor', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('No se ha guardado');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar cuaderno de evidencias' }).click();
  await downloaded;
  await page.reload();
  await page.getByRole('button', { name: /^T02 ·/ }).click();
  await expect(page.locator('textarea')).not.toBeEmpty();
  await expect(page.locator('.workshop-evidence')).toHaveCount(0);
});
test('dos pestañas conservan la primera revisión y permiten exportar la segunda sin sobrescribir', async ({
  page,
  context,
}) => {
  await open(page, 'T02');
  const other = await context.newPage();
  await open(other, 'T02');
  await answerAndNext(page);
  await other
    .locator('textarea')
    .fill('Esta segunda hipótesis se conservará en memoria ante el conflicto de revisión.');
  await other.getByRole('button', { name: 'Validar paso y continuar', exact: true }).click();
  await expect(other.getByRole('alert')).toContainText('Otra pestaña');
  const download = other.waitForEvent('download');
  await other.getByRole('button', { name: 'Exportar cuaderno de evidencias' }).click();
  await download;
});

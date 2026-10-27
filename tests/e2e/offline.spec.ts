import { test, expect } from '@playwright/test';
import { offlineServer } from '../fixtures/offline-server';
test('precaché completa, rutas y Workers offline, actualización en espera y otras pestañas protegidas', async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  const server = await offlineServer();
  try {
    await page.goto(server.url + '#/sin-conexion');
    await page.getByRole('button', { name: 'Preparar o comprobar actualización' }).click();
    await expect(page.getByRole('status')).toContainText('Disponible sin conexión', {
      timeout: 30000,
    });
    const before = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL);
    expect(before).toContain('/neural-atlas/sw.js');
    await page.evaluate(async () => {
      await caches.open('another-project-cache');
      const name = (await caches.keys()).find((n) => n.startsWith('neural-atlas-static-'))!;
      await (await caches.open(name)).delete('/neural-atlas/icon-192.png');
    });
    await page.getByRole('button', { name: 'Comprobar estado', exact: true }).click();
    await expect(page.getByRole('status')).not.toContainText('Disponible sin conexión');
    await page.getByRole('button', { name: 'Preparar o comprobar actualización' }).click();
    await expect(page.getByRole('status')).toContainText('Disponible sin conexión', {
      timeout: 30000,
    });
    await context.setOffline(true);
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Lleva el laboratorio contigo.' }),
    ).toBeVisible();
    await page.goto(server.url + '#/conceptos/C152');
    await expect(page.locator('h1')).toHaveText('Diagnóstico por evidencia');
    await page.goto(server.url + '#/lab/vision');
    await expect(page.locator('h1')).toBeVisible();
    // Use an actual data Worker while the HTTP origin is unreachable.
    await page.goto(server.url + '#/conceptos/paquetes');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar ejemplo editable' }).click();
    await page.getByLabel('Archivo de conceptos').setInputFiles((await (await download).path())!);
    await expect(page.getByRole('button', { name: 'Confirmar y guardar' })).toBeEnabled();
    await context.setOffline(false);
    await page.goto(server.url + '#/sin-conexion');
    server.state.revision = 'next';
    await page.getByRole('button', { name: 'Preparar o comprobar actualización' }).click();
    await expect(page.getByText('Nueva versión lista:')).toBeVisible({ timeout: 30000 });
    const other = await context.newPage();
    await other.goto(server.url + '#/');
    await page.getByLabel('He guardado o exportado').check();
    await page.getByRole('button', { name: 'Activar nueva versión y recargar' }).click();
    await expect(page.getByRole('alert')).toContainText('otras pestañas');
    await other.close();
    await page.getByRole('button', { name: 'Activar nueva versión y recargar' }).click();
    await expect(page.getByRole('status')).toContainText('-next', { timeout: 30000 });
    const keys = await page.evaluate(() => caches.keys());
    expect(keys.filter((k) => k.startsWith('neural-atlas-static-'))).toHaveLength(1);
    expect(keys).toContain('another-project-cache');
  } finally {
    await context.setOffline(false).catch(() => {});
    await server.close();
  }
});
test('entrena y exporta offline, pausa al salir y conserva la versión previa si falla una actualización', async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  const server = await offlineServer();
  try {
    await page.goto(server.url + '#/sin-conexion');
    await page.getByRole('button', { name: 'Preparar o comprobar actualización' }).click();
    await expect(page.getByRole('status')).toContainText('Disponible sin conexión', {
      timeout: 30000,
    });
    await context.setOffline(true);
    await page.goto(server.url + '#/lab/entrenamiento');
    await page.getByRole('button', { name: 'Cargar ejemplo y sustituir datos' }).click();
    await page.getByLabel('Épocas máximas', { exact: true }).fill('30');
    await page.getByRole('button', { name: 'Inicializar modelo', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Un lote', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Un lote', exact: true }).click();
    await expect(page.locator('.training-status')).toContainText('Actualizaciones 1');
    await page
      .getByRole('combobox', { name: 'Ritmo de entrenamiento', exact: true })
      .selectOption('1');
    await page.getByRole('button', { name: 'Entrenar', exact: true }).click();
    await expect(page.locator('.training-status')).toContainText('Entrenando');
    await page.goto(server.url + '#/sin-conexion');
    await expect(page.getByRole('button', { name: 'Pausar entrenamiento' })).toHaveCount(0);
    await page.getByLabel('He guardado o exportado').check();
    await expect(
      page.getByRole('button', { name: 'Activar nueva versión y recargar' }),
    ).toBeDisabled();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar experimento actual' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('neural-atlas-experiment.json');
    await context.setOffline(false);
    server.state.revision = 'broken';
    server.state.failAsset = true;
    await page.getByRole('button', { name: 'Preparar o comprobar actualización' }).click();
    await expect
      .poll(() =>
        page.evaluate(async () => !(await navigator.serviceWorker.getRegistration())?.installing),
      )
      .toBe(true);
    await page.getByRole('button', { name: 'Comprobar estado', exact: true }).click();
    await expect(page.getByText('Nueva versión lista:')).toHaveCount(0);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('status')).toContainText('Disponible sin conexión');
  } finally {
    await context.setOffline(false).catch(() => {});
    await server.close();
  }
});
test('instalación interrumpida no se anuncia lista y puede reintentarse; primera visita offline falla', async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(120000);
  const server = await offlineServer();
  try {
    server.state.failAsset = true;
    await page.goto(server.url + '#/sin-conexion');
    await page.getByRole('button', { name: 'Preparar o comprobar actualización' }).click();
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const reg = await navigator.serviceWorker.getRegistration();
          return !reg?.installing;
        }),
      )
      .toBe(true);
    await page.getByRole('button', { name: 'Comprobar estado', exact: true }).click();
    await expect(page.getByRole('status')).not.toContainText('Disponible sin conexión');
    server.state.failAsset = false;
    await page.getByRole('button', { name: 'Preparar o comprobar actualización' }).click();
    await expect(page.getByRole('status')).toContainText('Disponible sin conexión', {
      timeout: 30000,
    });
    const empty = await browser.newContext({ offline: true });
    try {
      const fresh = await empty.newPage();
      await expect(fresh.goto(server.url)).rejects.toThrow();
    } finally {
      await empty.close();
    }
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('h1')).toBeVisible();
  } finally {
    await context.setOffline(false).catch(() => {});
    await server.close();
  }
});

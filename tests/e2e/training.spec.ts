import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function prepare(page: Page, recipe = 'moons', epochs = '8') {
  await page.goto('#/lab/entrenamiento');
  await page.getByLabel('Ejemplo de entrenamiento', { exact: true }).selectOption(recipe);
  await page.getByRole('button', { name: 'Cargar ejemplo y sustituir datos' }).click();
  await expect(
    page.getByText('train 280 / validación 60 / test 60.', { exact: false }),
  ).toBeVisible();
  await page.getByLabel('Épocas máximas', { exact: true }).fill(epochs);
  await page.getByRole('button', { name: 'Inicializar modelo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Un lote', exact: true })).toBeEnabled();
}
test('Worker real: lote, época, pausa, reanudación y modelo congelado', async ({ page }) => {
  await prepare(page);
  await page.getByRole('button', { name: 'Un lote', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Actualizaciones 1');
  await expect(page.locator('.training-status')).toContainText('En pausa');
  await page.getByRole('button', { name: 'Una época', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Época 1');
  await page
    .getByRole('combobox', { name: 'Ritmo de entrenamiento', exact: true })
    .selectOption('1');
  await page.getByRole('button', { name: 'Entrenar', exact: true }).click();
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('En pausa');
  await page
    .getByRole('combobox', { name: 'Ritmo de entrenamiento', exact: true })
    .selectOption('0');
  await page.getByRole('button', { name: 'Entrenar', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Épocas completadas');
  await page.getByRole('link', { name: 'Evaluar este modelo' }).click();
  await page.getByRole('button', { name: 'Evaluar validación', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Resultados: validación' })).toBeVisible();
  await expect(
    page.getByRole('table', { name: 'Métricas por clase, frente al resto' }).locator('tbody tr'),
  ).toHaveCount(2);
  await page.getByRole('button', { name: 'Añadir a comparación de validación' }).click();
  await expect(
    page.getByRole('table', { name: 'Mediciones guardadas en memoria' }).locator('tbody tr'),
  ).toHaveCount(1);
  await page.getByLabel('Entiendo que congelar', { exact: false }).check();
  await page.getByRole('button', { name: 'Congelar modelo y evaluar test' }).click();
  await expect(page.getByRole('heading', { name: 'Resultados: test' })).toBeVisible();
  await expect(page.getByText('Test ya ha sido consultado', { exact: false })).toBeVisible();
  await expect(page.getByLabel('Clase positiva', { exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Predecir muestra', exact: true }).click();
  await expect(page.locator('.prediction-result')).toContainText('Clase');
  await page.getByRole('link', { name: 'Volver a entrenar' }).click();
  await expect(page.getByRole('button', { name: 'Entrenar', exact: true })).toBeDisabled();
  await expect(page.locator('.training-status')).toContainText('Modelo congelado');
});
test('multiclase y regresión: métricas y predicciones corresponden a la tarea', async ({
  page,
}) => {
  await prepare(page, 'flowers', '5');
  await page.getByRole('button', { name: 'Entrenar', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Épocas completadas');
  await page.goto('#/lab/clasificacion');
  await page.getByRole('button', { name: 'Evaluar validación', exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Métricas por clase, frente al resto' }).locator('tbody tr'),
  ).toHaveCount(3);
  await prepare(page, 'sine', '5');
  await page.getByRole('button', { name: 'Entrenar', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Épocas completadas');
  await page.goto('#/lab/regresion');
  await page.getByRole('button', { name: 'Evaluar validación', exact: true }).click();
  await expect(page.getByText('MSE · unidades²', { exact: true })).toBeVisible();
  await expect(page.getByText('Baseline constante de train', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Predecir muestra', exact: true }).click();
  await expect(page.locator('.prediction-result')).toContainText('Predicción numérica');
});
test('D4: accesibilidad, movimiento reducido y adaptación', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepare(page, 'moons', '2');
  for (const theme of ['light', 'dark']) {
    await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
    await page.getByLabel('Tema', { exact: true }).selectOption(theme);
    await page.getByRole('button', { name: 'Cerrar ajustes' }).click();
    for (const width of [360, 768, 1440]) {
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
  await page.getByRole('button', { name: 'Entrenar', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Épocas completadas');
  await page.goto('#/lab/clasificacion');
  await page.getByRole('button', { name: 'Evaluar validación', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Resultados: validación' })).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
});

test('recuperación automática después de perder el Worker, también con test congelado', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    const tracked = window as unknown as Window & { trainingWorkers: Worker[]; trainingCheckpoints: number };
    tracked.trainingWorkers = [];
    tracked.trainingCheckpoints = 0;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        if (String(url).includes('training.worker')) {
          tracked.trainingWorkers.push(this);
          this.addEventListener('message', (event) => {
            if (event.data.type === 'RECOVERY_CHECKPOINT') tracked.trainingCheckpoints++;
          });
        }
      }
    };
  });
  await prepare(page, 'moons', '3');
  await page.getByRole('button', { name: 'Una época', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Época 1');
  await page.waitForFunction(
    () => (window as unknown as Window & { trainingCheckpoints: number }).trainingCheckpoints >= 2,
  );
  await page.evaluate(() =>
    (window as unknown as Window & { trainingWorkers: Worker[] }).trainingWorkers.at(-1)!.terminate(),
  );
  await expect(
    page.getByText('Recuperado desde el último punto confirmado.', { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entrenar', exact: true })).toBeEnabled();
  await expect(page.locator('.training-status')).toContainText('Época 1');
  await page.getByRole('button', { name: 'Entrenar', exact: true }).click();
  await expect(page.locator('.training-status')).toContainText('Épocas completadas');
  await page.goto('#/lab/clasificacion');
  await page.getByLabel('Entiendo que congelar', { exact: false }).check();
  await page.getByRole('button', { name: 'Congelar modelo y evaluar test' }).click();
  await expect(page.getByRole('heading', { name: 'Resultados: test' })).toBeVisible();
  await page.evaluate(() =>
    (window as unknown as Window & { trainingWorkers: Worker[] }).trainingWorkers.at(-1)!.terminate(),
  );
  await page.waitForFunction(() => (window as unknown as Window & { trainingWorkers: Worker[] }).trainingWorkers.length >= 3);
  await expect(
    page.getByText('Modelo congelado: no admite más aprendizaje.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Volver a entrenar' }).click();
  await expect(page.getByRole('button', { name: 'Entrenar', exact: true })).toBeDisabled();
});

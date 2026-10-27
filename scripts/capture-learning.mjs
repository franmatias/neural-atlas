import {chromium,expect} from '@playwright/test';
import {fileURLToPath} from 'node:url';
const base=process.env.NEURAL_ATLAS_URL??'http://127.0.0.1:4173/neural-atlas/';
const output=name=>fileURLToPath(new URL('../docs/implementation/'+name,import.meta.url));
const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await page.goto(new URL('#/conceptos/C021',base).href);await expect(page.getByRole('heading',{name:'Ejemplo numérico estático'})).toBeVisible();await page.screenshot({path:output('d10-concept.png')});
 await page.goto(new URL('#/conceptos/mapa',base).href);await page.getByLabel('Concepto central').selectOption('C058');await page.screenshot({path:output('d10-map.png')});
 await page.goto(new URL('#/repaso?id=C021',base).href);await page.locator('input[value=correct]').check();await page.getByRole('button',{name:'Comprobar respuesta'}).click();await expect(page.getByText('Caja 1 / 5')).toBeVisible();await page.screenshot({path:output('d10-review.png')});
 await page.goto(new URL('#/docencia',base).href);await page.getByRole('button',{name:'Preparar previsualización'}).click();await expect(page.getByRole('heading',{name:'Mi unidad de aprendizaje · 1.0.0'})).toBeVisible();await page.locator('.panel').last().screenshot({path:output('d10-teaching.png')});
 await page.goto(new URL('#/sin-conexion',base).href);await page.getByRole('button',{name:'Preparar o comprobar actualización'}).click();await expect(page.getByRole('status')).toContainText('Disponible sin conexión',{timeout:30000});await page.screenshot({path:output('d10-offline.png')});
 await page.getByRole('button',{name:'Ajustes',exact:true}).click();await page.getByLabel('Tema',{exact:true}).selectOption('dark');await page.getByRole('button',{name:'Cerrar ajustes'}).click();await page.setViewportSize({width:390,height:844});await page.screenshot({path:output('d10-mobile.png')});
}finally{await browser.close();}

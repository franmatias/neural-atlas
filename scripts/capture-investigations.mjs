import {chromium,expect} from '@playwright/test';
import {fileURLToPath} from 'node:url';
const base=process.env.NEURAL_ATLAS_URL??'http://127.0.0.1:4173/neural-atlas/';
const output=name=>fileURLToPath(new URL(`../docs/implementation/${name}`,import.meta.url));
const browser=await chromium.launch();
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto(new URL('#/taller',base).href);
  for(const id of ['T06','T08','T12']){
    await page.getByRole('button',{name:new RegExp('^'+id+' ·')}).click();
    await page.locator('textarea').fill('Mi hipótesis es contrastable; registraré las medidas y sus límites.');
    await page.getByRole('button',{name:'Validar paso y continuar',exact:true}).click();
    await page.getByLabel('Épocas del proyecto',{exact:true}).fill('5');await page.getByLabel('Épocas del proyecto',{exact:true}).press('Enter');
    await page.getByLabel('He revisado el presupuesto del taller.',{exact:true}).check();
    if(id==='T12')await page.getByRole('combobox',{name:'Fallo plantado',exact:true}).selectOption('bn');
    await page.locator('textarea').fill('Conservo datos y split, y cambio el factor señalado por el taller.');
    await page.getByRole('button',{name:'Validar paso y continuar',exact:true}).click();
    await page.getByRole('button',{name:'Ejecutar caso con el motor',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Evidencia del motor',exact:true})).toBeVisible();
    if(id==='T06')await page.getByRole('combobox',{name:'Ensayo para inspeccionar',exact:true}).selectOption('1');
    await page.locator('.workshop-evidence').screenshot({path:output(`d9-workshop-${id.toLowerCase()}.png`)});
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('.workshop-evidence').screenshot({path:output('d9-workshop-mobile.png')});
}finally{await browser.close();}

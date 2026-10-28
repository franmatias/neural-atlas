import { chromium } from '@playwright/test';
const browser = await chromium.launch({headless:true});
try {
  const page=await browser.newPage({viewport:{width:1600,height:1100}});
  const base='http://127.0.0.1:4173/neural-atlas/';
  await page.goto(base+'#/lab/optimizacion');
  await page.getByRole('combobox',{name:'Ejemplo guiado de descenso',exact:true}).selectOption('first-step');
  await page.getByRole('button',{name:'Preparar ejemplo guiado',exact:true}).click();
  await page.getByRole('button',{name:'Calcular paisaje y trayectorias',exact:true}).click();
  const result=page.getByTestId('landscape-result');await result.waitFor();
  await page.locator('.gpu-surface canvas').waitFor();
  await page.getByRole('button',{name:'Paso siguiente',exact:true}).click();
  await result.screenshot({path:'docs/implementation/v14-gradient-dual.png'});
  await page.getByText('Guía del laboratorio ·',{exact:false}).click();
  await page.setViewportSize({width:390,height:1000});
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:'docs/implementation/v14-guide-mobile.png'});
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(base+'#/lab/datos');
  await page.getByText('Datasets reales opcionales · Iris y Wine',{exact:true}).click();
  await page.locator('.real-datasets').screenshot({path:'docs/implementation/v14-real-datasets.png'});
}finally{await browser.close();}

import {chromium} from '@playwright/test';
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto('http://127.0.0.1:4173/neural-atlas/#/taller/ejemplo');
 await page.getByRole('button',{name:'Ver ejemplo completo resuelto',exact:true}).click();
 await page.locator('.workshop-evidence').waitFor();
 await page.locator('.introduction-page').screenshot({path:'docs/implementation/v15-workshop-solved.png'});
 await page.getByRole('button',{name:'Probarlo con ayuda paso a paso',exact:true}).click();
 await page.setViewportSize({width:390,height:950});
 await page.getByRole('radio',{name:'La recta se desplazará sin girar',exact:true}).focus();
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({fullPage:true,path:'docs/implementation/v15-workshop-first-step.png'});
 await page.getByRole('radio',{name:'La recta girará',exact:true}).check();
 await page.getByRole('button',{name:'Continuar ejemplo',exact:true}).click();
 await page.getByRole('button',{name:'Continuar ejemplo',exact:true}).click();
 await page.getByRole('button',{name:'Ejecutar mi ejemplo con el motor',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Caso ejecutado'}).waitFor();
 await page.getByRole('button',{name:'Continuar ejemplo',exact:true}).click();
 await page.locator('.intro-phase').screenshot({path:'docs/implementation/v15-workshop-observation.png'});
}finally{await browser.close();}

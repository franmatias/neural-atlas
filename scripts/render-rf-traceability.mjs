import { readFile,writeFile } from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const read=name=>readFile(new URL(name,root),'utf8');
const modules=JSON.parse(await read('docs/fixtures/rf-modules.json'));
const stories=(await read('docs/14-historias-y-plan-git.md')).split('\n').filter(l=>/^\| US-\d+ \|/.test(l)).map(l=>{
  const c=l.split('|').map(s=>s.trim());return {id:c[1],rf:c[3].match(/RF-\d{3}/g)??[],tests:c[4],phase:c[5]};
});
const ids=[...(await read('docs/03-requisitos-funcionales.md')).matchAll(/^\| (RF-\d{3}) \|/gm)].map(m=>m[1]);
let text='# Trazabilidad RF → módulo → historia → prueba\n\nGenerado desde requisitos, historias y [asignación de módulos](fixtures/rf-modules.json); ejecutar `npm run docs:trace`. APP: shell/navegación/PWA; CAT: catálogo/glosario/repaso; BIB: biblioteca/archivos; AJUSTES: preferencias; POE y DIAG: mecanismos compartidos; TRANS: sesión transversal; TALLER: actividades; L01–L12: laboratorios.\n\nUna fase en esta tabla es la entrega de aceptación de la historia. Un RF compartido, como RF-053, solo se considera completo cuando cierran todas sus historias, aunque el MVP ofrezca un subconjunto explícito. X1/X2 son propuestas posteriores, no aceptación del MVP.\n\n| RF | Módulos | Historias | Pruebas | Fases |\n|---|---|---|---|---|\n';
for(const id of ids){
  const matches=stories.filter(s=>s.rf.includes(id));
  if(!modules[id]?.length||!matches.length)throw new Error(`RF sin módulo/historia: ${id}`);
  const tests=[...new Set(matches.flatMap(s=>s.tests.split(',')))].join(',');
  const phases=[...new Set(matches.map(s=>s.phase))].join(',');
  text+=`| ${id} | ${modules[id].join(',')} | ${matches.map(s=>s.id).join(',')} | ${tests} | ${phases} |\n`;
}
const target=new URL('docs/21-trazabilidad-rf.md',root);
if(process.argv.includes('--check')){
  if(await readFile(target,'utf8')!==text)throw new Error('Matriz RF desactualizada');
  console.log(`${ids.length} RF con módulo, historia, prueba y fase sincronizados.`);
}else{await writeFile(target,text);console.log('Matriz RF generada.');}

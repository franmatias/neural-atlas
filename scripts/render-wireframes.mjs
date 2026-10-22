import { mkdir, writeFile } from 'node:fs/promises';

const out = new URL('../docs/design/', import.meta.url);
await mkdir(out, { recursive: true });
const palettes = {
  light: { bg:'#F6F5F0', panel:'#FFFFFF', muted:'#ECEFEA', text:'#152A30', sub:'#4E6267', accent:'#006B58', on:'#FFFFFF', border:'#718681' },
  dark: { bg:'#101820', panel:'#182530', muted:'#213440', text:'#E9F1F3', sub:'#AFBEC4', accent:'#64E5C2', on:'#102720', border:'#799099' },
};
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function canvas(width, height, p, title) {
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">${esc(title)}</title><desc id="desc">Wireframe estático de diseño. No es una aplicación implementada.</desc><style>text{font-family:Segoe UI,Arial,sans-serif} .num{font-family:Consolas,monospace}</style><rect width="100%" height="100%" fill="${p.bg}"/>`];
  const rect = (x,y,w,h,fill=p.panel,r=12,stroke='none') => parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`);
  const text = (x,y,t,size=16,fill=p.text,weight=400) => parts.push(`<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(t)}</text>`);
  const line = (x1,y1,x2,y2,color=p.border) => parts.push(`<path d="M${x1},${y1}L${x2},${y2}" fill="none" stroke="${color}"/>`);
  return {parts,rect,text,line,done:()=>parts.join('')+'</svg>'};
}
for (const [theme,p] of Object.entries(palettes)) {
  const c = canvas(1440,960,p,`Neural Atlas · propuesta de escritorio · tema ${theme}`);
  const {rect,text,line,parts}=c;
  const classA=theme==='dark'?'#65BDF3':'#0072B2',classB=theme==='dark'?'#FFAD75':'#D55E00';
  rect(0,0,192,960,p.panel,0); text(22,42,'NEURAL',20,p.accent,700); text(22,68,'ATLAS',24,p.text,700);
  ['Inicio','Laboratorios','Taller','Biblioteca','Glosario'].forEach((s,i)=>{if(i===1)rect(12,139+i*48,168,40,p.muted,8);text(24,165+i*48,s,16,i===1?p.accent:p.sub,i===1?600:400)});
  text(24,595,'TU RECORRIDO',12,p.sub,600);text(24,627,'4 de 8 actividades',14);rect(24,643,144,6,p.muted,3);rect(24,643,72,6,p.accent,3);
  text(24,888,theme==='light'?'Tema claro':'Tema oscuro',14,p.sub);text(24,923,'Ajustes',16);
  text(216,38,'Laboratorios / Entrenamiento',14,p.sub);text(1110,38,'Local · sin cuenta',14,p.sub);text(1306,38,'Ajustes',14,p.accent,600);line(216,62,1416,62);
  text(216,103,'06 / ENTRENAMIENTO',12,p.accent,700);text(216,144,'Entrenar con criterio',30,p.text,700);
  text(216,177,'¿Qué cambia cuando reduzco el tamaño del lote?',16,p.sub);
  rect(1048,102,368,44,p.panel,10);text(1064,130,'Intuición',14,p.accent,700);text(1174,130,'Paso a paso',14,p.sub);text(1300,130,'Formal',14,p.sub);
  rect(216,204,260,642);text(236,238,'Tu experimento',18,p.text,600);
  text(236,279,'Datos',14,p.accent,700);rect(236,293,220,42,p.muted,8);text(249,319,'Dos lunas · 400 muestras',14);
  text(236,368,'Arquitectura',14,p.accent,700);text(236,398,'2 → 8 → 8 → 1',18);text(236,427,'105 parámetros · tanh',14,p.sub);
  text(236,477,'Entrenamiento',14,p.accent,700);
  const fields=[['Optimizador','Adam'],['Tasa de aprendizaje','0,01'],['Tamaño del lote','16'],['Semilla','42']];
  fields.forEach(([label,value],i)=>{text(236,510+i*65,label,13,p.sub);rect(236,519+i*65,220,34,p.muted,6);text(249,542+i*65,value,15)});
  text(236,814,'Pausar para editar',14,p.sub);
  rect(492,204,608,642);text(512,238,'Datos y frontera de decisión',18,p.text,600);text(512,264,'Vista 2D · datos ilustrativos del diseño',13,p.sub);rect(512,282,568,318,p.muted,10);
  for(let i=0;i<6;i++){line(548+i*96,304,548+i*96,574,p.border);line(536,314+i*48,1060,314+i*48,p.border)}
  parts.push(`<path d="M538,556C620,302 729,578 810,386S1005,352 1055,312" fill="none" stroke="${p.accent}" stroke-width="3"/>`);
  for(let i=0;i<40;i++){const x=548+(i*89%498),y=322+(i*61%244);parts.push(i%2?`<path d="M${x},${y-6}l6,6l-6,6l-6,-6z" fill="${classB}" stroke="${p.panel}"/>`:`<circle cx="${x}" cy="${y}" r="5" fill="${classA}" stroke="${p.panel}" stroke-width="1"/>`)}
  text(518,306,'x₂',12,p.sub);text(1050,592,'x₁',12,p.sub);text(518,627,'● Clase A',13,p.sub);text(620,627,'◆ Clase B',13,p.sub);text(724,627,'Línea: p = 0,5',13,p.sub);
  text(512,669,'Pérdida por época',16,p.text,600);parts.push(`<path d="M525,695L525,794L1065,794" fill="none" stroke="${p.border}"/><path d="M527,708C600,756 665,758 730,773S920,780 1060,784" fill="none" stroke="${p.accent}" stroke-width="3"/><path d="M527,704C600,736 680,759 760,762S950,763 1060,768" fill="none" stroke="#D55E00" stroke-width="3" stroke-dasharray="6 4"/>`);text(700,824,'Train 0,18   ·   Validación 0,23',14,p.sub);
  rect(1116,204,300,642);text(1136,238,'Inspector',18,p.text,600);text(1136,275,'Muestra #42',16,p.accent,600);
  [['Entrada','[0,72; −0,18]'],['Objetivo','Clase A'],['Probabilidad','0,83'],['Predicción','Clase A']].forEach(([a,b],i)=>{text(1136,315+i*55,a,13,p.sub);text(1136,337+i*55,b,16)});
  line(1136,516,1396,516);text(1136,553,'Qué estás observando',16,p.text,600);
  ['La frontera cambia al ajustar','los pesos. Los puntos de','validación permiten comprobar','si la mejora se mantiene en','datos no usados para aprender.'].forEach((s,i)=>text(1136,586+i*24,s,14,p.sub));
  rect(1136,739,260,42,p.muted,8);text(1150,766,'Ver cálculo paso a paso',14,p.accent,600);text(1136,817,'Consultar concepto →',14,p.accent);
  rect(216,866,1200,70,p.panel,14);rect(232,879,112,44,p.accent,8);text(255,907,'Pausa',16,p.on,600);text(367,907,'+ Lote',15);text(462,907,'+ Época',15);text(580,907,'Visual 1×',14,p.sub);text(740,907,'Época 24 · Actualización 432 · lr 0,01',14,p.sub);text(1190,907,'Guardar',15,p.accent,600);
  await writeFile(new URL(`desktop-${theme}.svg`,out),c.done());
}
{
  const p=palettes.light,c=canvas(390,844,p,'Neural Atlas · propuesta móvil');const {rect,text,line,parts}=c;
  rect(0,0,390,56,p.panel,0);text(16,35,'☰',20);text(54,35,'NEURAL ATLAS',17,p.accent,700);text(320,35,'Ajustes',13,p.accent);
  text(16,89,'06 / ENTRENAMIENTO',12,p.accent,700);text(16,123,'Entrenar con criterio',25,p.text,700);text(16,154,'¿Qué cambia al reducir el lote?',14,p.sub);
  rect(16,175,358,44,p.panel,8);text(32,203,'Explorar',14,p.accent,700);text(146,203,'Controles',14,p.sub);text(265,203,'Explicar',14,p.sub);
  rect(16,235,358,322);text(32,265,'Datos y frontera',17,p.text,600);rect(32,282,326,224,p.muted,8);
  for(let i=0;i<5;i++){line(48+i*72,298,48+i*72,486);line(48,300+i*44,342,300+i*44)}
  parts.push(`<path d="M48,465C105,300 155,468 206,361S305,343 342,307" fill="none" stroke="${p.accent}" stroke-width="3"/>`);
  for(let i=0;i<22;i++){const x=48+(i*47%286),y=304+(i*37%180);parts.push(i%2?`<path d="M${x},${y-5}l5,5l-5,5l-5,-5z" fill="#D55E00"/>`:`<circle cx="${x}" cy="${y}" r="4" fill="#0072B2"/>`)}
  text(32,538,'● A',13,p.sub);text(85,538,'◆ B',13,p.sub);text(144,538,'p = 0,5',13,p.sub);text(248,538,'Ver tabla',13,p.accent);
  rect(16,573,172,80);rect(202,573,172,80);text(32,600,'ÉPOCA',12,p.sub);text(32,633,'24',25,p.text,600);text(218,600,'PÉRDIDA · TRAIN',12,p.sub);text(218,633,'0,18',25,p.text,600);
  rect(16,669,358,92);text(32,700,'Validación: 0,23',16,p.text,600);text(32,727,'Selecciona un punto o abre su tabla.',13,p.sub);text(32,748,'Estado ilustrativo del diseño.',12,p.sub);
  rect(0,780,390,64,p.panel,0);line(0,780,390,780);rect(12,790,82,44,p.accent,8);text(29,818,'Pausa',15,p.on,600);text(116,818,'+ Lote',14);text(204,818,'+ Época',14);text(313,818,'1×',14,p.sub);
  await writeFile(new URL('mobile.svg',out),c.done());
}
console.log('3 wireframes SVG generados. Valores ilustrativos, no resultados de ejecución.');

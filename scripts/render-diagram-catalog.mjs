import { readdir, readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const descriptions = {
  '01': ['Contexto del sistema', 'Contexto, en flowchart: personas, aplicación y almacenamiento. No representa un backend.'],
  '02': ['Componentes y ejecución', 'Vista de componentes expresada mediante flowchart; explicita la frontera entre hilo principal y Worker.'],
  '03': ['Clases de dominio', 'UML de clases: composición del experimento, dataset, partición, pipeline, red y checkpoints.'],
  '04': ['Dependencias entre paquetes', 'Vista de paquetes aproximada en flowchart; las flechas indican importaciones permitidas.'],
  '05': ['Secuencia de entrenamiento', 'UML de secuencia: INIT, RUN, snapshots y finalización. Los mensajes están versionados.'],
  '06': ['Secuencia de importación', 'UML de secuencia: comprobar tamaño, mapear columnas y confirmar una sesión válida.'],
  '07': ['Estados de sesión', 'UML de estados: ejecución, pausa, cancelación y recuperación. Cerrar mientras se ejecuta exige cancelar primero.'],
  '08': ['Actividad del pipeline', 'Actividad representada en flowchart: ajustar solo con train y reservar test hasta congelar selección.'],
  '09': ['Secuencia de guardado', 'UML de secuencia: checkpoint estable, presupuesto y escritura de biblioteca con recuperación.'],
  '10': ['Estados de una actividad', 'UML de estados: hipótesis, experimento, observación y reflexión, con reintentos.'],
  '11': ['Despliegue estático', 'Vista de despliegue aproximada mediante flowchart. CI y Pages son futuros, no un remoto ya creado.'],
  '12': ['Flujo Git de desarrollo', 'gitGraph ilustrativo del proceso acordado, no una copia del historial real ni trabajo funcional ya realizado.'],
  '13': ['Clases de optimizadores', 'UML de clases: implementaciones de un contrato pequeño y scheduler independiente.'],
  '14': ['Cancelación y revisión', 'UML de secuencia: descartar cálculo parcial, nueva revisión y watchdog ante fallo.'],
  '15': ['Recorrido de aprendizaje', 'Mapa didáctico en flowchart: dependencias recomendadas, sin bloquear exploración libre.'],
  '16': ['Catálogo abierto', 'UML de clases: conceptos y paquetes versionados; sin máximo global ni enum cerrado de IDs.'],
  '17': ['Secuencia de validación cruzada', 'UML de secuencia: reconstruir pipeline/modelo por fold y conservar test fuera de selección.'],
  '18': ['Estados offline y actualización', 'UML de estados: descarga completa comprobada y activación después de guardar/detener sesión.'],
  '19': ['Clases del taller', 'UML de clases: definición declarativa, pasos, reglas y progreso local compatible.'],
  '20': ['Actividad de retropropagación', 'Actividad en flowchart: acumular gradientes antes de mutar parámetros y confirmar solo valores finitos.'],
};
const files = (await readdir(new URL('docs/diagrams/',root))).filter(f=>f.endsWith('.mmd')).sort();
let output = '# Diagramas de diseño\n\nDocumento generado desde los archivos `.mmd`. Editar las fuentes y ejecutar `npm run docs:diagrams`. Mermaid admite clases, secuencias y estados UML; para componentes, paquetes, actividades y despliegue se emplea flowchart como aproximación explícita, no notación UML estricta. Las fuentes son editables y no dependen de un servicio remoto.\n\n';
for(const file of files){
  const [title,description]=descriptions[file.slice(0,2)] ?? [file,'Diagrama de diseño.'];
  const source=(await readFile(new URL(`docs/diagrams/${file}`,root),'utf8')).trimEnd();
  output += `## ${file.slice(0,2)} · ${title}\n\n${description}\n\n[Fuente Mermaid](diagrams/${file})\n\n\`\`\`mermaid\n${source}\n\`\`\`\n\n`;
}
const target=new URL('docs/15-diagramas.md',root);
if(process.argv.includes('--check')){
  const current=await readFile(target,'utf8');
  if(current!==output) throw new Error('Catálogo de diagramas desactualizado; ejecutar docs:diagrams');
  console.log(`${files.length} diagramas sincronizados.`);
} else {
  await writeFile(target,output);
  console.log(`${files.length} diagramas incorporados al catálogo Markdown.`);
}

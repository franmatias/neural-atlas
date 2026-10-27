import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const catalog = JSON.parse(
  await readFile(new URL('src/content/catalog/extension-500.json', root), 'utf8'),
);
assert.equal(catalog.format, 'neural-atlas.reference-catalog');
assert.equal(catalog.schemaVersion, 1);
const entries = catalog.groups.flatMap((group) => group.entries);
assert.equal(
  entries.length,
  500,
  'Esta entrega contiene exactamente 500 fichas; las futuras pueden usar otro paquete.',
);
assert.equal(new Set(entries.map((entry) => entry.id)).size, entries.length);
assert.equal(new Set(catalog.groups.map((group) => group.id)).size, catalog.groups.length);
for (let number = 153; number <= 652; number++)
  assert(entries.some((entry) => entry.id === `C${number}`));
const cell = (value) => value.replaceAll('|', '\\|').replaceAll('\n', ' ');
let markdown = `# Ampliación del catálogo · 500 conceptos nuevos

Registro histórico de la entrega 0.5.1. Se añaden **C153–C652**, organizados en **20 temas**. El catálogo abierto pasa de 152 a **652 conceptos previstos**. En aquella entrega el glosario publicaba **569 fichas**: las 69 desarrolladas en D1–D3 y estas 500 fichas de consulta. Los 83 conceptos originales restantes conservan sus IDs y su planificación; no se consideraban publicados entonces. **D10 publica ahora las 152 fichas originales más las 500 de consulta**; en v1.1 cinco comparadores de X1 mantenían su actividad prevista. [X1.1 · v1.2.0](53-comparadores-clasicos-x1.md) implementa C143/C144; C145/C146/C151 siguen previstos. Véase [cierre técnico v1.1](52-cierre-tecnico-v11.md).

Cada ficha nueva contiene un identificador estable, título en español e inglés, definición propia y alias de búsqueda cuando proceda. Son referencias introductorias: no incluyen todavía la actividad, ejemplo numérico, evaluación ni simulación exigidos para considerar un concepto interactivo completo. El nivel formal no inventa fórmulas para estas fichas. El entrenamiento general D4 conserva su entrega independiente.

## Uso y mantenimiento

El glosario permite buscar por español, inglés, alias e ID, filtrar por tema y tipo, recorrer páginas de 24 fichas y compartir enlaces como [C652](https://franmatias.github.io/neural-atlas/#/glosario?q=C652). Las coincidencias exactas de título e ID preceden a menciones dentro de definiciones. Cambiar filtros vuelve a la primera página; avanzar o retroceder coloca el foco en los resultados.

La fuente canónica es [extension-500.json](../src/content/catalog/extension-500.json), adaptada por [reference-concepts.ts](../src/content/reference-concepts.ts). No hay un máximo global. Próximo ID libre: **C653**. Nunca renumerar fichas al reordenarlas; para ampliar, añadir registros o importar un nuevo paquete en el adaptador, mantener IDs únicos y regenerar esta documentación con \`node scripts/render-reference-catalog.mjs\`. El control de 500 registros pertenece a la evidencia histórica de este paquete, no a una restricción del catálogo. El contrato completo de las actividades sigue en [la matriz original](06-matriz-conceptos.md).

Este documento se genera desde el JSON. \`npm run docs:check\` detecta desincronizaciones. Las pruebas verifican IDs, títulos y definiciones únicos, contenido no vacío, búsquedas, conservación de las 69 fichas anteriores, filtros, paginación, enlaces, teclado, accesibilidad y adaptación a 360/768/1440 px. La cobertura de código excluye el contenido declarativo, que tiene validaciones propias.

## Evidencia de la entrega

Validación local: 189 pruebas unitarias/integración; cobertura de líneas del 98,75 %. Los 40 recorridos E2E pasan en Chromium y WebKit (20 por motor), incluidos búsqueda, filtros, enlaces compartidos y accesibilidad del glosario en ambos temas. La adaptación se comprueba a 360, 768 y 1440 px. Firefox sigue siendo obligatorio en CI sobre Linux; la incidencia del motor local en Windows permanece documentada en D1/D2. El despliegue requiere además que CI supere sus 60 recorridos en los tres motores y la comprobación de la aplicación pública.

El contenido del glosario se descarga con su ruta: su paquete ocupa aproximadamente 40,4 KiB gzip; la transferencia inicial sigue en 57,9 KiB de JS y 11,4 KiB de CSS gzip, dentro del presupuesto. Se corrige también el espacio visible del logotipo para que coincida con su nombre accesible.

[Captura de escritorio claro](implementation/catalog-500-desktop.png) · [Captura de móvil oscuro](implementation/catalog-500-mobile.png). Capturas reales de esta entrega, revisadas visualmente.

## Referencias para profundizar

Las definiciones son síntesis originales. Estas fuentes primarias amplían los temas; no implican que todas sus técnicas estén implementadas:

- [Mathematics for Machine Learning](https://mml-book.github.io/): álgebra, cálculo, probabilidad y bases estadísticas.
- [Documentación de scikit-learn](https://scikit-learn.org/stable/user_guide.html): preprocesamiento, modelos clásicos, agrupación, reducción dimensional y evaluación.
- [Optimizadores de PyTorch](https://docs.pytorch.org/docs/stable/optim.html): algoritmos de actualización y regularización.
- [Attention Is All You Need](https://arxiv.org/abs/1706.03762): arquitectura Transformer y atención.
- [Denoising Diffusion Probabilistic Models](https://arxiv.org/abs/2006.11239): modelos de difusión.
- [VICReg](https://arxiv.org/abs/2105.04906): aprendizaje de representaciones sin contraste negativo explícito.
- [Reinforcement Learning: An Introduction](http://incompleteideas.net/book/the-book-2nd.html): decisiones secuenciales y aprendizaje por refuerzo.
- [Equality of Opportunity in Supervised Learning](https://arxiv.org/abs/1610.02413): distinción entre criterios de equidad y sus límites.

## Índice temático

| Tema | Identificadores | Fichas |
|---|---|---|
`;
for (const group of catalog.groups) {
  markdown += `| ${cell(group.title)} | ${group.entries[0].id}–${group.entries.at(-1).id} | ${group.entries.length} |\n`;
}
for (const group of catalog.groups) {
  markdown += `\n## ${group.title}\n\n| ID | Concepto | Inglés | Definición |\n|---|---|---|---|\n`;
  for (const entry of group.entries)
    markdown += `| ${[entry.id, entry.title, entry.english, entry.definition].map(cell).join(' | ')} |\n`;
}
const target = new URL('docs/27-ampliacion-conceptos.md', root);
if (process.argv.includes('--check'))
  assert.equal(
    await readFile(target, 'utf8'),
    markdown,
    'Regenerar la documentación del catálogo.',
  );
else await writeFile(target, markdown);
console.log(`${entries.length} fichas de referencia y documentación sincronizadas.`);

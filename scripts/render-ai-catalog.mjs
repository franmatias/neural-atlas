import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const catalog = JSON.parse(
  await readFile(new URL('src/content/catalog/extension-ai-100.json', root), 'utf8'),
);
const old = JSON.parse(
  await readFile(new URL('src/content/catalog/extension-500.json', root), 'utf8'),
);
const entries = catalog.groups.flatMap((g) => g.entries),
  normalize = (s) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
assert.equal(entries.length, 100);
assert.equal(catalog.groups.length, 10);
assert.equal(new Set(entries.map((e) => e.id)).size, 100);
for (let i = 1001; i <= 1100; i++) assert(entries.some((e) => e.id === 'C' + i));
const known = new Map();
for (const e of old.groups.flatMap((g) => g.entries))
  for (const t of [e.title, e.english, ...e.aliases]) known.set(normalize(t), e.id);
for (const e of entries) {
  assert(e.definition.length > 100);
  for (const t of [e.title, e.english, ...e.aliases])
    assert(!known.has(normalize(t)), `Duplicado ${e.id}: ${t}`);
  for (const t of [e.title, e.english, ...e.aliases]) known.set(normalize(t), e.id);
}
const cell = (s) => s.replaceAll('|', '\\|');
let text = `# Cien conceptos adicionales de IA · C1001–C1100

Entrega 1.3.0, 28/10/2026, posterior a [importancia por permutación](55-importancia-permutacion-x1.md). El catálogo pasa de 652 a **752 fichas**: 152 con actividad implementada y **600 referencias de consulta**. El paquete anterior C153–C652 se conserva íntegro; se añaden diez temas, para treinta temas de referencia.

La fuente es [extension-ai-100.json](../src/content/catalog/extension-ai-100.json). Título español, inglés, definición original y alias explícitos. Estas fichas no se presentan como simulaciones implementadas. Están disponibles en búsqueda, filtros, paginación y enlaces estables, por ejemplo [C1001](https://franmatias.github.io/neural-atlas/#/glosario?q=C1001).

## Identidad y revisión de duplicados

Se usa un bloque nuevo C1001–C1100 para evitar el rango habitual de ejemplos locales C653 en adelante. No se renumera ningún registro anterior ni se exige continuidad numérica global. C653 sigue siendo el primer ID libre en una instalación limpia; los IDs ocupados se consultan en el catálogo antes de crear un paquete.

Se comprueban títulos españoles, ingleses y alias contra las 652 fichas anteriores, normalizando acentos, espacios y puntuación. La revisión semántica distingue: colapso neuronal de colapso de representaciones; caché de prefijos compartidos de caché KV de una secuencia; estado de creencia de estado observado; muestreo por rechazo de selección best-of-N; invocación de herramientas de una acción abstracta de refuerzo; y cálculo de intervenciones de criterios concretos de identificación causal. No son cien variantes de nombres ya existentes.

Un concepto personalizado previamente guardado conserva su identidad si una referencia incluida nueva ocupa su ID: el registro local con historial confirmado prevalece y la referencia queda oculta mientras ese paquete esté activo. Retirar el paquete vuelve a mostrar la referencia incluida. Esta recuperación no permite que una importación nueva sustituya otra identidad: se mantienen las comprobaciones de propietario y slug. Nunca se descarta toda la biblioteca por esa colisión. C653 y los paquetes de ejemplo anteriores permanecen intactos.

El script genera este documento y verifica el paquete de cien. Las pruebas de catálogo comprueban además los conceptos fundamentales, todas las traducciones, búsquedas exactas, alias y la recuperación de identidades locales. No hay máximo global fijo.

## Fuentes primarias para ampliar

Definiciones redactadas para este catálogo, sin copiar explicaciones ni afirmar que estas técnicas estén implementadas. Las fuentes permiten profundizar y contrastar los supuestos de cada familia:

- [Poole y Mackworth, Artificial Intelligence 3e](https://artint.info/3e/html/ArtInt3e.html): representación, razonamiento, planificación y agentes.
- [CMU, unificación y programación lógica](https://www.cs.cmu.edu/~fp/courses/lp/lectures/lp-all.pdf).
- [Brady Neal, curso de inferencia causal](https://www.bradyneal.com/causal-inference-course).
- [Neural Tangent Kernel](https://arxiv.org/abs/1806.07572), [Neural Collapse](https://arxiv.org/abs/2008.08186), [Grokking](https://arxiv.org/abs/2201.02177), [Edge of Stability](https://arxiv.org/abs/2103.00065) y [Gradient Noise Scale](https://arxiv.org/abs/1812.06162).
- [PagedAttention](https://arxiv.org/abs/2309.06180) y [TensorRT-LLM: decodificación especulativa](https://nvidia.github.io/TensorRT-LLM/1.4.0rc1/features/speculative-decoding.html).
- [DPO](https://arxiv.org/abs/2305.18290) y [Understanding Learning from Human Preferences](https://deepmind.google/research/publications/54918/).

- [RAG](https://arxiv.org/abs/2005.11401) y [ColBERT](https://arxiv.org/abs/2004.12832): recuperación, generación e interacción tardía.
- [FlashAttention](https://arxiv.org/abs/2205.14135), [AI safety via debate](https://arxiv.org/abs/1805.00899) y [ARC: Eliciting Latent Knowledge](https://www.alignment.org/blog/arcs-first-technical-report-eliciting-latent-knowledge/).

[Captura de escritorio](implementation/catalog-ai-100.png) · [Captura móvil](implementation/catalog-ai-100-mobile.png). Búsquedas bilingües y por siglas, treinta temas, paginación y enlaces de cuatro cifras se comprueban con Playwright. La revisión lexical normalizada se ejecuta de nuevo en cada CI.

## Catálogo
`;
for (const g of catalog.groups) {
  text += `\n## ${g.title}\n\n| ID | Español | Inglés | Definición |\n|---|---|---|---|\n`;
  for (const e of g.entries)
    text += `| ${e.id} | ${cell(e.title)} | ${cell(e.english)} | ${cell(e.definition)} |\n`;
}
const dest = new URL('docs/56-cien-conceptos-ia.md', root);
if (process.argv.includes('--check'))
  assert.equal(await readFile(dest, 'utf8'), text, 'Regenerar catálogo IA');
else await writeFile(dest, text);
console.log('100 conceptos adicionales verificados; documentación sincronizada.');

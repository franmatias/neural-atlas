# Despliegue continuo en GitHub Pages

Destino autorizado: [Neural Atlas](https://franmatias.github.io/neural-atlas/). Repositorio: [franmatias/neural-atlas](https://github.com/franmatias/neural-atlas). Esta publicación adelanta el hosting estático previsto; la PWA/offline conserva su fase D10. Solo se publican entregas integradas y verificadas en `main`.

## Cadena de publicación

Un único workflow, [quality.yml](../.github/workflows/quality.yml), valida y publica el mismo commit:

1. `verify`: instalación por lockfile con Node 24.19.0; tipos, lint, cobertura, build, presupuesto y documentación; Playwright en Chromium, Firefox y WebKit sobre producción. Usa la imagen oficial `playwright:v1.64.1-noble` fijada por digest, con los navegadores y dependencias ya instalados, evitando instalaciones del sistema que pueden bloquearse por repositorios externos. El contenedor usa UID 1001, como el runner, para que Firefox pueda acceder a su directorio de usuario.
2. Solo cuando lo anterior termina correctamente en `main`, empaqueta **el mismo `dist/` probado** como artefacto de Pages. Los pull requests validan el producto y no publican.
3. `deploy`, dependiente de `verify`, usa el entorno `github-pages` y el artefacto anterior. Solo este job recibe `pages: write` e `id-token: write`.
4. `smoke`, dependiente de `deploy`, abre la dirección HTTPS pública con Chrome instalado en el runner y comprueba HTTP 200, carga sin errores, resultado `0,6083`, cambio de tema y búsqueda del glosario. Desde D2 añade generación real en Worker, partición por grupos y pipeline. Reintenta brevemente para contemplar la propagación inicial de Pages. La matriz previa sigue usando los tres navegadores fijados de Playwright; este control posterior evita otra instalación de paquetes del sistema.

Las acciones oficiales están fijadas por SHA. Las ejecuciones de `main` se serializan para no interrumpir una publicación en curso. Las ejecuciones de PR sí cancelan una comprobación anterior de su misma referencia. También se permite iniciar el workflow manualmente en Actions; solo `main` puede llegar a despliegue.

GitHub Pages utiliza origen **GitHub Actions** (`build_type: workflow`). Vite conserva `/neural-atlas/`; el router hash resuelve páginas como `/#/lab/neurona` dentro de esa subruta. La publicación incluye únicamente `dist`, no documentación, tests, archivos locales ni dependencias de desarrollo.

## Operación y recuperación

- Consulta [Actions](https://github.com/franmatias/neural-atlas/actions) y el entorno `github-pages` para asociar URL, commit y ejecución.
- Una comprobación fallida impide el job de despliegue; conserva la versión pública anterior. Si falla la comprobación HTTPS posterior, el workflow lo informa como fallo aunque la plataforma ya haya publicado el artefacto: revisar propagación o errores y, si procede, revertir el commit en una rama y volver a integrar.
- Para una nueva versión, integra una rama verificada en `main`; no copies archivos compilados a una rama `gh-pages`.
- Para repetir, usa «Run workflow» sobre `main`; no omitas los controles. Para restaurar una versión, revierte mediante un nuevo commit: no hagas force-push ni elimines historial.
- Esta versión requiere conexión. No hay Service Worker todavía. La publicación HTTPS no implica funcionamiento offline.

El código y las preferencias siguen siendo locales al navegador. No se envían datasets ni respuestas del alumnado a un servidor de aplicación. GitHub sirve los recursos estáticos con sus condiciones de alojamiento. Los proyectos bajo `franmatias.github.io` comparten origen, como detalla [persistencia y seguridad](12-persistencia-offline-y-seguridad.md).

## Evidencia

La habilitación, ejecución y URL pública se verifican durante el despliegue. Un workflow escrito o un push aceptado no se consideran por sí solos una publicación terminada. El resultado final se comunica tras comprobar el estado de Pages y la aplicación pública.

Primera cadena completa aprobada: [ejecución 39861303688](https://github.com/franmatias/neural-atlas/actions/runs/39861303688), commit `ff9f158988e997534add87b8a3512c75138374e8`. Los tres jobs (`verify`, `deploy`, `smoke`) terminaron correctamente: 61 pruebas unitarias/integración de D1, 30 recorridos Playwright en los tres motores y comprobación HTTPS pública. Las ampliaciones posteriores vuelven a recorrer la misma puerta; no heredan automáticamente esta evidencia.

Referencias de plataforma: [workflows personalizados de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) y [CI con el contenedor oficial de Playwright](https://playwright.dev/docs/ci).

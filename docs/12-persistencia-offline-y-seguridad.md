# Persistencia, offline y despliegue

## LocalStorage

Solo el hilo principal accede a LocalStorage, mediante un repositorio; Worker y Service Worker no lo usan. Tres documentos JSON independientes:

| Clave | Contenido | Política |
|---|---|---|
| `neural-atlas:v1:preferences` | Tema, nivel, accesibilidad y visualización | Autosave 500 ms, pequeño; aplicar tema antes de montar UI |
| `neural-atlas:v1:progress` | Talleres y respuestas/evidencias resumidas | Al completar paso, límite 256 KiB |
| `neural-atlas:v1:library` | Índice y hasta 10 experimentos compactos completos | Guardado explícito, ≤512 KiB por entrada y presupuesto total compartido 3 MiB |

Cada documento contiene schemaVersion, savedAt, appVersion y payload. La biblioteca se guarda en un único `setItem` después de validar, serializar y comprobar tamaño; si falla, el valor previo permanece. No simular una transacción con múltiples claves de experimentos. No existe transacción entre preferencias y progreso, que son independientes. Presupuesto aproximado `2*longitudString` para UTF-16; capturar QuotaExceededError y SecurityError incluso si la estimación dice que cabe.

Al superar límites, ofrecer exportar archivo o retirar entradas elegidas por el usuario; nunca expulsar guardados automáticamente. No guardar dataset de 10.000 filas por defecto. Un compacto puede almacenar receta exacta+semilla si reproduce todas las ediciones; para importados/manuales se conservan filas si caben. Si no caben, se guarda solo configuración marcada «requiere archivo de datos» o se exporta todo, según elección explícita. El progreso no incluye decenas de snapshots ni capturas raster.

Migración: leer a memoria → validar versión antigua → transformar en copia → validar nueva → escribir → conservar original si cualquier paso falla. JSON corrupto no bloquea arranque; ofrecer descargarlo para recuperar y resetear solo esa clave. Escuchar evento storage de otras pestañas y evitar sobrescribir biblioteca más reciente mediante número de revisión y aviso de conflicto. No prometer exclusión mutua fuerte de LocalStorage: dos guardados simultáneos se resuelven mediante exportación de la copia conflictiva, y la UI recomienda una sola pestaña editora.

## Service Worker y caché

HTTPS en producción o localhost en desarrollo. Workbox genera precaché con revisiones de build: app shell, Worker, chunks de todos los laboratorios, contenido, iconos y presets pequeños. Los assets de cada build tienen hash; no usar CDN. Caché para recursos estáticos; no se usa Cache API como repositorio de experimentos.

Primer arranque necesita conexión para descargar la aplicación. «Disponible sin conexión» solo después de comprobar el manifiesto completo; descarga incompleta enumera recursos pendientes y permite reintentar. Presupuesto precaché objetivo ≤8 MiB comprimidos transferidos, revisable con informe; no cachear bundles de pruebas o documentación de desarrollo.

Nueva versión: instalar en espera → aviso → usuario guarda/exporta sesión → cancelar/terminar Worker → activar y recargar → comprobar versión de protocolo. No ejecutar skipWaiting automáticamente mientras se entrena. Limpiar únicamente cachés antiguas de Neural Atlas después de activar; no borrar otros datos del origen. Añadir scope que corresponda a la subruta publicada para no controlar otros proyectos.

## GitHub Pages

Preparar futuro workflow con instalación por lockfile, tipos/lint/tests/coverage/E2E/build y despliegue del directorio dist solo desde main o acción manual. `base` de Vite configurable según nombre real de repositorio; hash router para rutas. URLs del Worker y recursos relativas a `import.meta.url`/base gestionada por Vite; registro SW y manifest con scope/start_url correspondientes. Probar preview de producción bajo `/simulator-neural-networks/`, no solo `/`.

No hay remoto creado ni publicación en esta entrega. No asumir que el repositorio futuro usa el mismo propietario o configuración que el simulador anterior. El nombre final del remoto determina base. El historial Git local ya contiene ramas e integraciones documentales, sin requerir GitHub.

## Seguridad y datos del usuario

- Archivos elegidos por el usuario se procesan localmente. No hay transmisión de datos, analytics, píxeles externos o carga de scripts desde archivos importados.
- Validar tamaño antes de parsear; JSON con claves `__proto__`, `constructor`, `prototype` no se mezcla en objetos de configuración. Usar esquemas estrictos y mapas seguros.
- Texto importado se representa por interpolación escapada; no usar v-html ni eval. KaTeX recibe fórmulas editoriales empaquetadas y configuración sin trust.
- Exportaciones descargan Blob, con nombre sanitizado y URL temporal revocada. Confirmar sustitución o borrado de guardados, no cada operación reversible de edición.
- Política de contenido objetivo: recursos propios, Worker propio, sin scripts remotos; probar CSP compatible con bundler/estilos. GitHub Pages no permite configurar todas las cabeceras: usar meta CSP cuando proceda y documentar limitaciones, sin prometer aislamiento COOP/COEP o SharedArrayBuffer.
- Sin claves secretas ni credenciales en bundle. Los hashes de integridad no convierten modelos importados en contenido confiable.

## Recuperación y observabilidad local

Estado visible: versión, engineVersion, sessionId abreviado, último guardado y modo offline/memoria. El informe de diagnóstico optativo incluye configuración y códigos de error, omite filas y respuestas libres por defecto; descargar no envía nada. Error de WebGL conserva sesión y ofrece 2D. Error numérico conserva último checkpoint finito. Al borrar datos se selecciona qué categoría borrar y se avisa de irreversibilidad; el SW se gestiona por separado.

Pruebas obligatorias: cuota agotada, almacenamiento denegado, JSON corrupto, conflicto entre pestañas, primera visita sin red, arranque offline con precaché, update con sesión activa y Worker de versión antigua. Véanse [pruebas](13-pruebas-y-aceptacion.md) y [secuencia de guardado](diagrams/09-secuencia-guardado.mmd).

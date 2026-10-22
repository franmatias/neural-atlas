# Persistencia, offline y despliegue

## Responsabilidades de almacenamiento · ADR-004 revisado

Se adopta **IndexedDB para biblioteca, datasets y checkpoints** tras revisar los tamaños reales. LocalStorage conserva solo preferencias y progreso. Esta decisión revisa la propuesta inicial, antes de implementar o generar datos de usuario. Todo almacenamiento es local al navegador; no se añade backend.

| Clave | Contenido | Política |
|---|---|---|
| `neural-atlas:v1:preferences` | Tema, nivel, accesibilidad y visualización | Autosave 500 ms, ≤64 KiB UTF-16 estimados |
| `neural-atlas:v1:progress` | Talleres y respuestas/evidencias resumidas | Al completar paso, ≤448 KiB UTF-16 estimados |

Cada documento pequeño contiene schemaVersion, savedAt, appVersion y payload. Solo el hilo principal accede a LocalStorage mediante adaptador, con captura de QuotaExceededError/SecurityError y modo memoria. Se estima `2*longitudString` para estos JSON; no se guardan tensores ahí ni se vuelve a serializar la biblioteca en cada operación.

IndexedDB `neural-atlas`, databaseVersion 1, stores: `experiments` por id con revision/manifiesto; `datasets` por dataHash columnar; `models` y `checkpoints` por id con ArrayBuffer Float64; `contentPacks` por packId/version; `learningEvidence` y `reviews` por id; `recovery` con dos slots globales de sesión activa. Índices por updatedAt y experimentId. El adaptador principal es el único escritor para coordinar conflictos; el Worker entrega copias/buffers transferibles sin segunda conexión escritora.

Guardar: preparar/validar/copiar fuera de transacción → transacción readwrite sobre los stores necesarios → comprobar revision esperada dentro de transacción → escribir registros y referencias → esperar `complete` antes de anunciar éxito. Error/abort conserva versión anterior; no incluir awaits ajenos a IDB en la transacción. No actualizar índices antes de confirmar datos. Dataset compartido se elimina solo cuando ninguna referencia viva lo requiere. Dos pestañas con la misma revisión: primera confirma, segunda recibe conflicto sin sobrescritura; BroadcastChannel/invalidation notifica cambios, pero la exclusión depende de la transacción.

Presupuesto objetivo IDB **256 MiB**: hasta **5 experimentos, ≤40 MiB por experimento**, incluyendo todos sus datos/evidencia referenciados imputados sin descuento por deduplicación; recuperación global ≤20 MiB, paquetes ≤16 MiB, repaso/evidencia global no imputada a experimentos ≤8 MiB y metadatos/margen ≤12 MiB. 5×40+20+16+8+12=256 MiB. Uso por ArrayBuffer.byteLength, Blob.size y UTF-8 estimado de metadatos; no es cuota garantizada. La topología máxima BN+Adam ocupa 24.330×8×3=583.920 bytes principales, más BN/RNG/cursor: cabe en un checkpoint ≤10 MiB. No guardar cachés de forward/backward.

Recuperación: dos checkpoints RAM del controlador y dos slots IDB globales (≤10 MiB cada uno) de sesión activa, no dos por cada sesión histórica. Copia RAM antes de READY, cada época y cada 2 s de cálculo activo en frontera confirmada; IDB cada 30 s o 5 épocas, lo que ocurra antes, si hay espacio. Antes de persistir, garantizar dataset/receta, split y config en la misma transacción o confirmados. Al cambiar sesión se reemplazan slots temporales después de confirmar el nuevo, sin tocar guardados de biblioteca. RAM recupera fallo del Worker; IDB recupera recarga con copia posiblemente más antigua. Informar época/update/antigüedad.

Al superar presupuesto o fallar cuota real, ofrecer exportar archivo o retirar entradas elegidas; nunca expulsar biblioteca automáticamente. El slot automático antiguo se sustituye solo tras confirmar el nuevo; si no cabe, mantener el anterior y advertir del recovery desactualizado. Si IDB está denegado, la sesión continúa en RAM con exportación, sin caer a serializar modelos en LocalStorage.

Migraciones: schemaVersion por registro y versionchange para stores; bloquear escrituras, validar una copia y conservar original ante fallo. Otra pestaña recibe petición de cierre de conexión, con aviso; `blocked` tiene salida recuperable. Registro corrupto se puede exportar como diagnóstico y excluir, sin resetear toda la base. La especificación 0.1 no llegó a producir una biblioteca de aplicación: no se inventa una migración de datos que nunca existieron.

## Service Worker y caché

HTTPS en producción o localhost en desarrollo. Workbox genera precaché con revisiones de build: app shell, Worker, chunks de todos los laboratorios, contenido, iconos y presets pequeños. Los assets de cada build tienen hash; no usar CDN. Caché para recursos estáticos; no se usa Cache API como repositorio de experimentos.

Primer arranque necesita conexión para descargar la aplicación. Si nunca se descargó y no hay red, la aplicación no puede mostrar su propia pantalla: el navegador informa del fallo y esta limitación se documenta en la guía. «Disponible sin conexión» solo después de comprobar el manifiesto completo; descarga incompleta enumera recursos pendientes y permite reintentar. Presupuesto precaché objetivo ≤8 MiB comprimidos transferidos, revisable con informe; no cachear bundles de pruebas o documentación de desarrollo.

Nueva versión: instalar en espera → aviso → usuario guarda/exporta sesión → cancelar/terminar Worker → activar y recargar → comprobar versión de protocolo. No ejecutar skipWaiting automáticamente mientras se entrena. Limpiar únicamente cachés antiguas de Neural Atlas después de activar; no borrar otros datos del origen. Añadir scope que corresponda a la subruta publicada para no controlar otros proyectos.

## GitHub Pages

El [workflow de publicación](24-despliegue-pages.md) incorpora instalación por lockfile, tipos/lint/tests/coverage/E2E/build y despliegue del `dist` probado desde main o acción manual. Vite usa base `/neural-atlas/` y hash router. Worker y recursos usan URLs relativas a import.meta.url/base; SW y manifest futuros conservarán scope/start_url de esa subruta. La vista previa y la comprobación pública se ejecutan bajo `/neural-atlas/`, no solo `/`.

Destino indicado expresamente por el usuario: `https://github.com/franmatias/neural-atlas.git`. D0 publicó documentación y D1 incorporó la primera aplicación. Por petición expresa posterior, se habilita Pages con controles de despliegue sobre D1; la PWA/offline sigue prevista para D10. La publicación conserva main y ramas con su historial. El [registro documental histórico](19-verificacion.md) y el [despliegue actual](24-despliegue-pages.md) distinguen ambos momentos.

Todos los proyectos en `usuario.github.io` comparten origen, cuota y acceso potencial a almacenamiento. Namespace y nombre de base evitan colisiones accidentales, no crean aislamiento de seguridad ni cuota exclusiva. `navigator.storage.estimate()` orienta sobre el origen completo, no sobre nuestra base. Comprobar cuota en cada escritura; documentar riesgo de compartir origen con aplicaciones no confiables y permitir exportación de respaldo.

## Seguridad y datos del usuario

- Archivos elegidos por el usuario se procesan localmente. No hay transmisión de datos, analytics, píxeles externos o carga de scripts desde archivos importados.
- Validar tamaño antes de parsear; JSON con claves `__proto__`, `constructor`, `prototype` no se mezcla en objetos de configuración. Usar esquemas estrictos y mapas seguros.
- Texto importado se representa por interpolación escapada; no usar v-html ni eval. KaTeX recibe fórmulas editoriales empaquetadas y configuración sin trust.
- Exportaciones descargan Blob, con nombre sanitizado y URL temporal revocada. Confirmar sustitución o borrado de guardados, no cada operación reversible de edición.
- CSP se prueba ya en D1: `script-src 'self'`, `worker-src 'self'`, `connect-src 'self'`, `object-src 'none'`, `base-uri 'self'`; estilos `style-src 'self' 'unsafe-inline'` inicialmente por bindings Vue/KaTeX/Three.js, con motivo documentado. Bootstrap de tema en archivo propio antes de montar UI, o inline autorizado por hash exacto de build; no abrir scripts con unsafe-inline/unsafe-eval. GitHub Pages usa meta CSP compatible y no permite todas las cabeceras; no prometer COOP/COEP ni SharedArrayBuffer. La política final se valida con el build real y fuentes locales, no se presenta como probada ahora.
- Sin claves secretas ni credenciales en bundle. Los hashes de integridad no convierten modelos importados en contenido confiable.

## Recuperación y observabilidad local

Estado visible: versión, engineVersion, sessionId abreviado, último guardado y modo offline/memoria. El informe de diagnóstico optativo incluye configuración y códigos de error, omite filas y respuestas libres por defecto; descargar no envía nada. Error de WebGL conserva sesión y ofrece 2D. Error numérico conserva último checkpoint finito. Al borrar datos se selecciona qué categoría borrar y se avisa de irreversibilidad; el SW se gestiona por separado.

Pruebas obligatorias: transacción abortada, cuota agotada, IDB/LocalStorage denegados por separado, registro corrupto, conflicto/versionchange entre pestañas, documentación de primera visita sin red, arranque offline con precaché, update con sesión activa y Worker de versión antigua. Véanse [pruebas](13-pruebas-y-aceptacion.md) y [secuencia de guardado](diagrams/09-secuencia-guardado.mmd).

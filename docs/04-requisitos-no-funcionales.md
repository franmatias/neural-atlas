# Requisitos no funcionales

Los valores son objetivos de aceptación, **no mediciones del producto todavía inexistente**. Referencia de rendimiento: portátil con CPU de 4 núcleos, 8 GB RAM y GPU integrada, navegador Chromium estable, viewport 1366×768; perfil móvil 390×844 con CPU ralentizada 4×. Registrar hardware, navegador y build de cada medición. Fixture P: 2.000 filas, 2 features, red 2→16→16→1, frontera 80×80.

| ID | Dimensión | Criterio verificable |
|---|---|---|
| RNF-001 | Corrección matemática | Gradientes suaves con error relativo ≤1e-5; puntos no diferenciables verificados por convención explícita |
| RNF-002 | Reproducibilidad | Mismo motor JS y versión, engineVersion, receta, seed y configuración: mismo orden y valores dentro de 1e-10 absoluto + 1e-8 relativo; entre motores se verifican fixtures y tolerancias de métricas, no pesos idénticos |
| RNF-003 | Respuesta de controles | En P, p95 desde interacción hasta cambio visible ≤100 ms en escritorio y ≤200 ms en móvil |
| RNF-004 | Fluidez visual | En P, p95 de frame ≤33 ms; perfil reducido limita densidad y resolución sin alterar cálculo |
| RNF-005 | Cancelación | Worker reconoce cancelación/pausa en ≤250 ms p95; unidad interna de trabajo objetivo ≤8 ms; watchdog 2 s |
| RNF-006 | Presupuesto inicial | JS inicial ≤250 KiB gzip y CSS ≤60 KiB gzip; 3D/código avanzado solo por carga diferida |
| RNF-007 | Memoria | En P, heap de JS objetivo ≤180 MiB y sin crecimiento >10 MiB tras 20 cambios de ruta con recolección controlada |
| RNF-008 | Accesibilidad | Objetivo WCAG 2.2 AA, teclado completo, foco visible, equivalentes DOM de gráficos y ausencia de errores axe serios/críticos |
| RNF-009 | Responsive | 360, 390, 768, 1024 y 1440 px sin desbordamiento global; zoom de texto 200 % sin pérdida de acciones |
| RNF-010 | Contraste/movimiento | Texto normal ≥4,5:1; controles y gráficos relevantes ≥3:1; respetar reduced-motion desde primer render; sin destellos |
| RNF-011 | Navegadores | Últimas dos versiones estables al validar de Chrome, Edge, Firefox y Safari; WebGL opcional con 2D equivalente |
| RNF-012 | Privacidad | Sin cuentas, telemetría, subida de datasets ni servicios externos en ejecución; fuentes e iconos locales |
| RNF-013 | Importación segura | Tamaño, profundidad y dimensiones limitados; sin eval/v-html de contenido externo; CSV protegido al exportar a hoja de cálculo |
| RNF-014 | Persistencia robusta | Registros versionados; transacción IndexedDB para biblioteca/checkpoints; errores conservan último guardado; modo memoria/exportación si el backend correspondiente no está disponible |
| RNF-015 | Almacenamiento acotado | IndexedDB: 256 MiB objetivo, 5 experimentos de hasta 40 MiB imputados cada uno y reserva de 20 MiB para recuperación; LocalStorage ≤512 KiB solo ajustes/progreso; cuota real compartida puede ser menor |
| RNF-016 | Mantenibilidad | Dominio sin imports Vue/DOM/Worker/storage; fronteras verificadas por lint; ningún componente concentra motor e IO |
| RNF-017 | Calidad automatizada | Umbrales de cobertura por carpeta y flujos E2E obligatorios definidos en el plan; build, lint y tipos sin errores |
| RNF-018 | Documentación | Todo RF trazado a historia, módulo y prueba; UML fuente versionado; cambios de contrato requieren ADR y prueba |
| RNF-019 | Offline | Carga offline tras precaché completo; documentar que primera visita sin red depende del error del navegador; Worker y chunks usan la misma versión de build |
| RNF-020 | Despliegue | GitHub Pages bajo subruta; hash routing y assets/Worker/SW con base correcta; recarga de rutas sin 404 |
| RNF-021 | Internacionalización | Español inicial completo; claves/locales es/en/ca/gl/eu y fallback explícito, términos ingleses buscables; parser coma/punto en UI, punto y UTF-8 en archivos; traducciones no publicadas se identifican |
| RNF-022 | Errores numéricos | Detener actualización antes de propagar NaN/Infinity; conservar último checkpoint finito y explicar causa posible |
| RNF-023 | Licencias | Inventario de dependencias y datasets, atribuciones y decisión de licencia antes de publicar; sin reutilizar datasets sin licencia |
| RNF-024 | Integridad de comparación | Cada resultado lleva configHash, dataHash, engineVersion y semilla; UI no mezcla revisiones ni cohortes |

## Límites y degradación

Los presupuestos no garantizan cuota real; puede ser menor o estar bloqueada. LocalStorage conserva únicamente preferencias (≤64 KiB) y progreso (≤448 KiB), con autosave debounce de 500 ms. Biblioteca, datasets y checkpoints usan IndexedDB con ArrayBuffer y transacciones asíncronas; no se serializa toda la biblioteca en el hilo principal. 5×40+20=220 MiB, dentro del presupuesto 256 MiB; los 36 MiB restantes absorben metadatos y margen estimado. No se promete persistencia indefinida ni que la cuota del origen permita agotar el presupuesto.

Al ocultar la pestaña se pausa por defecto entrenamiento y animación, y se anuncia el motivo al volver. Al cambiar de laboratorio se pausa y conserva sesión en memoria. Existe una sola sesión de entrenamiento activa global; comparación A/B se ejecuta secuencialmente para limitar CPU y mantener equidad.

Fallos WebGL → vista 2D; fallo Worker → sesión pausada y opción de reinicializar, sin entrenar silenciosamente en el hilo principal. Recursos offline incompletos → enumeración de módulos disponibles. Ninguna degradación cambia la definición de pérdida, batch o métrica.

## Política de dependencias

Objetivo de plataforma: **Node 24 LTS**, verificado nuevamente al iniciar D1. El Node 20 observado durante la auditoría no se usa como plataforma admitida. Las versiones concretas se fijan por lockfile; esta revisión documental se valida con el Node 24 disponible sin cambiar la instalación global. Ver [fuentes](18-fuentes.md).

## Perfiles de rendimiento ampliados

P sigue siendo la referencia ligera de interacción (337 parámetros). P-Max usa 10.000 filas, 32 features, 10 clases y topología máxima; P-Map usa dos entradas y seis capas de 64 con frontera 80×80. P-CV multiplica P por K=5 y cinco semillas como tareas secuenciales. No se prometen tiempos de época a los límites. Se exige estimación visible con rango antes de iniciar, latencia de cancelación RNF-005 y degradación adaptativa del mapa; medir tiempos, throughput y memoria por perfil en P-P06. El usuario confirma presupuestos extensos, no una duración inventada.

Entre motores JS: datos/orden basados en enteros deben coincidir exactamente; fixtures de un paso admiten tolerancia 1e-10 absoluta + 1e-8 relativa. En fixtures de convergencia de 200 épocas, exigir diferencias ≤0,01 en pérdida de datos y ≤0,02 en accuracy, con objetivo común alcanzado; si divergen, informar incompatibilidad y no relajar silenciosamente. Trayectorias largas o caóticas no tienen garantía de igualdad entre navegadores.

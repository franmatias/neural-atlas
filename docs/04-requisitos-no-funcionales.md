# Requisitos no funcionales

Los valores son objetivos de aceptación, **no mediciones del producto todavía inexistente**. Referencia de rendimiento: portátil con CPU de 4 núcleos, 8 GB RAM y GPU integrada, navegador Chromium estable, viewport 1366×768; perfil móvil 390×844 con CPU ralentizada 4×. Registrar hardware, navegador y build de cada medición. Fixture P: 2.000 filas, 2 features, red 2→16→16→1, frontera 80×80.

| ID | Dimensión | Criterio verificable |
|---|---|---|
| RNF-001 | Corrección matemática | Gradientes suaves con error relativo ≤1e-5; puntos no diferenciables verificados por convención explícita |
| RNF-002 | Reproducibilidad | Mismo engineVersion, receta, seed y configuración: mismo orden y valores dentro de 1e-10 absoluto + 1e-8 relativo en CPU JS |
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
| RNF-014 | Persistencia robusta | JSON con schemaVersion; errores no destruyen último guardado; modo memoria cuando LocalStorage no está disponible |
| RNF-015 | Almacenamiento acotado | Presupuesto de aplicación 3 MiB de datos serializados UTF-16 estimados; biblioteca máx. 10 entradas; límite por guardado 512 KiB |
| RNF-016 | Mantenibilidad | Dominio sin imports Vue/DOM/Worker/storage; fronteras verificadas por lint; ningún componente concentra motor e IO |
| RNF-017 | Calidad automatizada | Umbrales de cobertura por carpeta y flujos E2E obligatorios definidos en el plan; build, lint y tipos sin errores |
| RNF-018 | Documentación | Todo RF trazado a historia, módulo y prueba; UML fuente versionado; cambios de contrato requieren ADR y prueba |
| RNF-019 | Offline | Carga offline tras precaché completo; primera visita sin red muestra error honesto; Worker y chunks usan la misma versión de build |
| RNF-020 | Despliegue | GitHub Pages bajo subruta; hash routing y assets/Worker/SW con base correcta; recarga de rutas sin 404 |
| RNF-021 | Internacionalización | Español consistente y términos ingleses localizables; coma decimal en UI, punto y UTF-8 en intercambios |
| RNF-022 | Errores numéricos | Detener actualización antes de propagar NaN/Infinity; conservar último checkpoint finito y explicar causa posible |
| RNF-023 | Licencias | Inventario de dependencias y datasets, atribuciones y decisión de licencia antes de publicar; sin reutilizar datasets sin licencia |
| RNF-024 | Integridad de comparación | Cada resultado lleva configHash, dataHash, engineVersion y semilla; UI no mezcla revisiones ni cohortes |

## Límites y degradación

El presupuesto de LocalStorage no garantiza cuota real; puede ser menor o estar bloqueado. No se presume persistencia indefinida. Guardar es una operación explícita con captura de excepción; el autosave de preferencias usa debounce de 500 ms. Pesos de gran tamaño, datasets grandes e historiales completos se exportan a archivo, no se fuerza su almacenamiento local.

Al ocultar la pestaña se pausa por defecto entrenamiento y animación, y se anuncia el motivo al volver. Al cambiar de laboratorio se pausa y conserva sesión en memoria. Existe una sola sesión de entrenamiento activa global; comparación A/B se ejecuta secuencialmente para limitar CPU y mantener equidad.

Fallos WebGL → vista 2D; fallo Worker → sesión pausada y opción de reinicializar, sin entrenar silenciosamente en el hilo principal. Recursos offline incompletos → enumeración de módulos disponibles. Ninguna degradación cambia la definición de pérdida, batch o métrica.

## Política de dependencias

Las versiones concretas se fijarán en un lockfile al iniciar D1 después de revisar compatibilidad y avisos oficiales. Las herramientas de documentación de esta fase tienen su propio lockfile. El entorno Node observado (20.18.0) no se declara suficiente para el futuro Vite: se usará una versión LTS compatible, mínimo técnico 22.12 según la documentación consultada, verificándolo de nuevo en D1. Ver [fuentes](18-fuentes.md).

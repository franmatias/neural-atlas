# Diseño preciso de interfaz — Neural Atlas

Identidad provisional nueva: **Neural Atlas**, un atlas de experimentos donde cada concepto conduce a una observación. El nombre se puede cambiar sin afectar rutas ni formatos. Estética: superficies de tinta o papel cálido, acento verde mineral, énfasis coral y diagramas limpios. La decoración no compite con los datos. Los archivos [claro](design/desktop-light.svg), [oscuro](design/desktop-dark.svg) y [móvil](design/mobile.svg) son wireframes vectoriales de referencia, no capturas de una aplicación construida.

## Tokens

| Token semántico | Claro | Oscuro | Uso |
|---|---|---|---|
| `background` | #F6F5F0 | #101820 | Fondo de aplicación |
| `surface` | #FFFFFF | #182530 | Paneles y tarjetas |
| `surface-muted` | #ECEFEA | #213440 | Controles secundarios |
| `text` | #152A30 | #E9F1F3 | Texto principal |
| `text-muted` | #4E6267 | #AFBEC4 | Ayudas y ejes |
| `accent` | #006B58 | #64E5C2 | Acción principal, selección |
| `on-accent` | #FFFFFF | #102720 | Texto sobre botón principal |
| `danger` | #A3293D | #FF9BAA | Error, no finitos |
| `warning` | #805100 | #FFD27A | Advertencias |
| `border-strong` | #718681 | #799099 | Contorno de control interactivo |

Bordes decorativos pueden ser más suaves; límites interactivos y foco se miden con contraste. La paleta de clases empieza con azul #0072B2, naranja #D55E00 y verde #009E73, y añade forma/etiqueta; en oscuro usa variantes luminosas como #65BDF3 y #FFAD75 para las dos primeras clases. Gradientes de pesos divergentes se centran en cero con leyenda numérica. No usar verde/rojo como única codificación de acierto/error. Imprimir exportaciones con fondo blanco y patrones distinguibles.

Tipografía del sistema: `ui-sans-serif, system-ui, Segoe UI, sans-serif`; código y números `ui-monospace, Consolas, monospace`. Tamaños: título página 28/34 px, título panel 18/26, cuerpo 16/24, ayuda 14/21, etiqueta de gráfico mínima 12/18. Modo presentación multiplica texto por 1,25 sin escalar indiscriminadamente lienzos. Cifras tabulares para métricas; mostrar 4 decimales por defecto y precisión extendida en inspector. Nunca redondear internamente antes de calcular.

Espaciado base 4 px: 4/8/12/16/24/32/48. Radios: controles 8, tarjetas 16, panel principal 20. Sombras discretas solo para capas flotantes; borde y encabezado bastan para agrupar. Botones mínimo 44×44 px para interacción táctil; iconos 18–20 px con nombre accesible. Foco exterior 3 px, offset 2, sin recortar. Selección persistente con borde y texto, no solo fondo.

## Composición y puntos de ruptura

| Ancho CSS | Distribución |
|---|---|
| ≥1440 | Rail 192 px, cabecera 64; área con controles 260 px, visual ≥480 px e inspector 300 px, gaps 16 y padding 24 |
| 1024–1439 | Rail 72 px con etiquetas accesibles; controles 252 px y visual flexible; inspector como pestaña inferior, nunca encima de datos activos |
| 768–1023 | Menú lateral en drawer; controles colapsables sobre visual, inspector debajo; gráficas en dos columnas si caben ≥320 px |
| 360–767 | Cabecera 56 px; una columna, tabs «Explorar / Controles / Explicar» con estado compartido; reproductor sticky inferior 64 px con safe-area |

Cada contenedor flexible usa `min-width: 0`. Solo las matrices/tablas admiten scroll horizontal local con encabezados fijados y alternativa por fila. Página y paneles no usan alturas rígidas que corten texto al ampliar. En móvil, controles de reproducción no tapan la última fila: padding inferior equivalente a su altura. Scroll de página único salvo drawers y tablas.

Wireframe de escritorio:

```text
┌─────────────┬───────────────────────────────────────────────────────────────┐
│ Neural Atlas│ Datos > Entrenamiento         Guardado local     Ajustes      │
│             ├───────────────────────────────────────────────────────────────┤
│ Inicio      │ 06 · Entrenar con criterio        Intuición | Pasos | Formal │
│ Laboratorios│ Pregunta: ¿qué cambia cuando reduzco el lote?                │
│ Taller      ├──────────────┬───────────────────────────┬────────────────────┤
│ Biblioteca  │ Datos        │ Datos y frontera          │ Inspector          │
│ Glosario    │ Arquitectura │ [vista 2D / red]          │ Muestra #42        │
│             │ Entrenamiento│ [leyenda y ejes]          │ z, a, y, pérdida   │
│ Progreso    │ Validaciones │                           │ Explicación actual │
│             ├──────────────┴───────────────────────────┴────────────────────┤
│ Tema        │ Pausa · Lote · Época     época 24 | update 456 | lr 0,01     │
└─────────────┴───────────────────────────────────────────────────────────────┘
```

Wireframe móvil:

```text
┌──────────────────────────────┐
│ Menú  Neural Atlas   Ajustes │
│ 06 · Entrenamiento           │
│ Explorar  Controles Explicar │
│ Datos y frontera             │
│ [gráfico con ejes y leyenda] │
│ Época 24 · Train 0,18        │
│ [curvas train / validación]  │
│ Selección y resumen textual  │
│ Pausa  +Lote  +Época  1×     │
└──────────────────────────────┘
```

## Rutas y contenido de pantalla

| Pantalla | Contenido y acción principal |
|---|---|
| `/` | Retomar actividad, recorrido recomendado y 12 laboratorios por grupos; sin hero que desplace las acciones |
| `/lab/:slug` | Pregunta, preset, configuración, visualizaciones sincronizadas, inspector, explicación y evidencia |
| `/taller` | Ocho talleres con nivel/duración/objetivo/progreso; botón continuar |
| `/taller/:id/:step` | Instrucción de un paso y laboratorio incrustado, pista/revelación y evidencia |
| `/biblioteca` | Experimentos guardados, modelos y talleres; metadatos, cuota, duplicar/exportar/eliminar |
| `/glosario` | Buscar término, definición, fórmula, ejemplo y experiencias relacionadas |
| `/ajustes` | Las mismas secciones del drawer, accesibles por URL y teclado |
| Ruta inexistente | Explicación breve y volver a inicio, sin reiniciar sesión |

Los títulos identifican objetivo observable, por ejemplo «Una tasa alta puede impedir la convergencia». La pregunta precede al control; las ayudas de impacto acompañan al parámetro: «Cambiar arquitectura reinicia pesos». Los botones expresan acción: «Entrenar», «Avanzar un lote», «Guardar experimento».

## Componentes y contratos visuales

- `AppShell`: navegación, landmarks, skip link, tema y región de avisos. Sin conocimiento de tensores.
- `ExperimentToolbar`: nombre, estado, revisión y acciones de guardar/duplicar/exportar.
- `ParameterField`: etiqueta, unidad, input numérico + slider, rango y error; teclado y puntero equivalentes.
- `VisualizationFrame`: título, leyenda, selector 2D/3D, reset/cámara, exportación y tabla alternativa.
- `TrainingPlayer`: estado explícito, play/pause, lote, época, cancelación y velocidad visual separada.
- `MetricCard`/`LearningCurve`: valor, split, unidad, tooltip y fuente del snapshot; actualizar anuncios accesibles como máximo una vez cada 2 s.
- `InspectorPanel`: selección por ID, pestañas «Qué ocurre / Cálculo / Por qué» y acceso al glosario.
- `ImportWizard`: selección, preview, mapeo, validación y resumen de reemplazo; volver conserva trabajo.
- `SettingsPanel`: drawer 420 px máximo, 100 % en móvil, foco atrapado y devolución al disparador.
- `EmptyState`/`ErrorState`: causa concreta, acción recuperable y posibilidad de conservar datos.

## Ajustes detallados

| Sección | Opciones / valores iniciales |
|---|---|
| Apariencia | Tema sistema; densidad cómoda; tamaño de texto normal/presentación |
| Aprendizaje | Intuición por defecto; ayudas visibles; términos ingleses secundarios |
| Animación | 1×; movimiento según sistema; trazas/pulsos activados salvo reduced-motion |
| Visualización | Calidad automática; 2D inicial; antialias 3D según perfil; DPR máximo 2 |
| Cálculo | Presupuesto de CPU equilibrado; notificar divergencia; pausar pestaña oculta activado |
| Datos locales | Presupuesto, lista de guardados, exportar todo, borrar selectivamente, reset ajustes |
| Accesibilidad | Patrones de clases, tablas equivalentes y formato numérico; controles básicos no dependen de activar esta sección |

Movimiento reducido no impide aprendizaje: sustituye pulsos/cámara automática por resaltado estático y avance manual. Cambiar calidad solo afecta resolución gráfica, densidad de aristas y frecuencia de snapshots; no modifica datos, precisión numérica o entrenamiento.

## Estados y microinteracciones

Cada vista admite `empty`, `loading`, `ready`, `running`, `paused`, `completed`, `invalid` y `error` según contexto. Skeleton solo al cargar código, nunca sustituye a un gráfico con datos anteriores válidos. Durante entrenamiento se bloquean cambios incompatibles y se ofrece «Pausar para editar». Un resultado obsoleto queda visible con banda «Corresponde a la revisión anterior» hasta sustituirlo, sin mezclarse con métricas actuales.

Transiciones UI 120–180 ms; foco inmediato; entrada de panel máximo 200 ms. El timeline pedagógico usa tiempo real, no número de frames, y tiene marcador de fase. Cámara 3D no gira automáticamente; órbita con ratón/tacto y botones alternativos. Teclas: espacio solo cuando el foco está en reproductor; Escape cierra drawer; flechas operan slider enfocado. No capturar atajos globales mientras se escribe.

## Accesibilidad y revisión

Orden DOM: cabecera, título/pregunta, configuración, visual, inspector, acciones. En móvil las tabs gestionan foco y estado sin duplicar controles activos. Tooltips al foco y hover, con descripción persistente equivalente; errores enlazados por `aria-describedby`. Los gráficos tienen resumen, ejes y tabla accesible; selección se puede hacer desde la tabla. Validar contrastes de tokens y de estados hover/disabled/selected en ambos temas; las paletas indicadas son base de diseño, no certificación WCAG del producto.

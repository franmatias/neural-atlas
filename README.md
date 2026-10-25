# Neural Atlas

Laboratorio visual de aprendizaje automático para FP de especialización y universidad. Vue 3 Composition API, TypeScript, Tailwind, Pinia, Vue Router y D3.

**Versión 0.7.2 · nueve laboratorios, cinco talleres POE y recuperación automática.** Experimenta con datos, una neurona, arquitectura/XOR, activaciones y propagación. Constructor MLP, perceptrón en Worker, mapas reales, softmax/Jacobiano y una actualización de pesos comprobable numéricamente. Entrenamiento en Worker con SGD/Momentum/RMSprop/Adam, calendarios, pasos por lote/época, pausa/cancelación y recuperación automática en RAM; evaluación de clasificación/regresión y predicción de nuevas muestras. Guarda manualmente experimentos completos en IndexedDB, recupera el siguiente lote después de recargar e importa/exporta JSON con datos y optimizador. Exporta también modelos sin filas y predice en un espacio independiente conservando su pipeline. Generadores, fallos, split/pipeline sin fuga e intercambio CSV/JSON de datasets. Temas claro/oscuro, responsive, ajustes y animaciones regulables.

![Entrenamiento y curvas reales](docs/implementation/d4-training.png)

## Arrancar

Node **24.19.0**; versión indicada también en `.nvmrc`.

```powershell
npm ci --ignore-scripts
npm run dev
```

Abre [Neural Atlas local](http://127.0.0.1:5173/neural-atlas/). Para producción: `npm run build` y `npm run preview` (puerto 4173).

## Verificar

```powershell
npm run check
npx playwright install chromium firefox webkit
npm run test:e2e
```

Tipos, lint, unidades/integración, cobertura con umbrales, build, presupuesto y documentación. Playwright comprueba recorridos, accesibilidad automática, teclado, persistencia, temas, responsive y CSP sobre producción. Informes: `coverage/` y `playwright-report/`.

La [entrega D4](docs/29-implementacion-d4.md) describe entrenamiento, evaluación, recuperación, presupuesto y límites. D4 incorporó 25 recorridos por motor, incluidos Workers nativos, pérdida de conexión y P-Max.

El [primer incremento D5](docs/30-biblioteca-d5.md) incorporó biblioteca transaccional, revisiones entre pestañas, archivos reproducibles y seis recorridos adicionales por motor. Su evidencia histórica de 0.6.1 recoge 236 pruebas unitarias/integración, 93 recorridos en CI y cobertura de líneas del 97,32%.

El [segundo incremento D5](docs/31-modelos-inferencia-d5.md) añade archivos `neural-atlas.model` de hasta 8 MiB e inferencia en Worker sin las filas ni el optimizador. Importar un modelo conserva el laboratorio. Incluye clasificación binaria/multiclase, regresión, imputación, categorías desconocidas, vector transformado y copia en memoria entre rutas. **250 pruebas unitarias/integración, 97,42% de cobertura de líneas y 35 recorridos por motor (105 en CI)**. Guardado manual de experimentos; D5 y la puerta MVP siguen abiertos.

El [tercer incremento D5](docs/32-taller-poe-d5.md) incorpora cinco talleres con medidas reales, actividades compartibles y evidencias exportables. **267 pruebas unitarias/integración y 44 recorridos por motor (132 en CI)**. La migración de IndexedDB conserva los experimentos anteriores; se comprueban recarga, almacenamiento denegado y conflictos entre pestañas. La rúbrica requiere valoración humana.

El [cuarto incremento D5](docs/33-recuperacion-disco-d5.md) conserva dos puntos de recuperación en disco, cada 30 segundos o cinco épocas y en fronteras estables. Un Worker dedicado valida y guarda la sesión completa; la recuperación es explícita y conserva Adam, cursor y bloqueo de test. **275 pruebas unitarias/integración y 48 recorridos por motor (144 en CI)**. La copia automática está limitada a 10 MiB por slot, sin desalojar Biblioteca.

El [primer incremento D6](docs/34-generalizacion-d6.md) incorpora L08: comparación emparejada de L1, L2 y recorte global con curvas reales y test reservado. Los controles también están disponibles en L06, con normas antes/después, objetivo separado de pérdida de datos, exportación v2 y reanudación exacta. **295 pruebas unitarias/integración y 53 recorridos por motor (159 en CI)**. Ese incremento incorporó lectura de experimentos v1 y v2.

El [segundo incremento D6](docs/35-parada-temprana-d6.md) añade parada temprana con restauración completa del mejor estado, trayectoria observada, continuación explícita y comparación L08. Lee experimentos v1/v2/v3. **314 pruebas unitarias/integración y 57 recorridos por motor (171 en CI)**. D6 sigue abierto para dropout, BN, aumento de datos y comparación multisemilla.

El [tercer incremento D6](docs/36-dropout-d6.md) incorpora dropout invertido por muestra, visualización de máscaras reales, comparación con la red completa y estado aleatorio reproducible al recuperar o restaurar el mejor modelo. Lee experimentos v1–v4 y conserva el formato de inferencia v1. **336 pruebas unitarias/integración y 60 recorridos por motor (180 en CI)**. BN, aumento de datos y comparación multisemilla siguen pendientes.

La [entrega D3](docs/26-implementacion-d3.md) documenta uso, arquitectura, contratos y límites: 184 pruebas unitarias/integración y 98,74% de cobertura de líneas. En D3 se verificaron 18 recorridos por motor; CI exige Chromium, Firefox y WebKit en Linux. [D1](docs/23-implementacion-d1.md) y [D2](docs/25-implementacion-d2.md) conservan su evidencia histórica, incluida la incidencia local de Firefox en Windows.

## Alcance y continuidad

Los datos, modelos y trazas son locales. La sesión activa vive en memoria; los experimentos guardados manualmente sobreviven a la recarga en IndexedDB y LocalStorage conserva preferencias. El entrenamiento general CPU, su evaluación básica, la biblioteca y los archivos de modelo independientes están disponibles. Los cinco talleres T01–T05 incorporan hipótesis, ejecución en Worker, contraste, explicación, rúbrica manual y cuadernos locales. La recuperación automática en disco está disponible para el motor CPU actual. Los siguientes talleres, regularización avanzada y 3D mantienen sus fases. El [diseño completo](docs/README.md) conserva **88 requisitos funcionales, 24 no funcionales, 65 historias, 12 laboratorios, 12 talleres y 652 conceptos ampliables**. Hay **569 fichas publicadas: 69 desarrolladas y 500 nuevas de consulta**, con búsqueda bilingüe, filtros por 20 temas nuevos, [paginación numerada y tamaños ajustables](docs/28-paginador-glosario.md), y enlaces estables. Los 83 conceptos originales pendientes conservan sus IDs. La [ampliación editorial](docs/27-ampliacion-conceptos.md) documenta cada ficha y cómo seguir ampliando el catálogo. Hay 30 diagramas Mermaid en el catálogo y trece adicionales en los documentos de D5/D6.

El proyecto original permanece en la carpeta hermana `simulador-redes-neuronales`. Repositorio independiente, commits por incremento y fusiones explícitas. [Código en GitHub](https://github.com/franmatias/neural-atlas) · [Aplicación en GitHub Pages](https://franmatias.github.io/neural-atlas/).

El [plan de despliegue continuo](docs/24-despliegue-pages.md) publica `main` después de superar todos los controles de CI y verifica la aplicación HTTPS. Los cambios en desarrollo permanecen en sus ramas hasta estar listos.

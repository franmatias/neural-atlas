# Visión y alcance

## Acuerdos

- Público mixto, con prioridad para FP de especialización; matemáticas explicadas progresivamente.
- Agrupar los 100 conceptos originales y ampliar el catálogo: **152 iniciales, lista abierta**, con estado/entrega explícitos por experiencia.
- Importar y exportar datasets, modelos y experimentos; generar datos con defectos controlados.
- Taller con actividades guiadas, pistas, soluciones y seguimiento local.
- Identidad visual nueva, temas claro/oscuro, diseño adaptable y ajustes de animación.
- Entrenar en un Web Worker; usar 2D y 3D cuando contribuyan a comprender.
- Proyecto independiente, Git desde el inicio, ramas por incrementos e integraciones registradas.
- Preparar despliegue estático en GitHub Pages y uso sin conexión tras descargar los recursos.
- **La entrega actual es la especificación para revisión**, antes de construir la aplicación.

## Resultado educativo

El estudiante podrá formular una hipótesis, configurar un experimento reproducible, seguir un cálculo real y explicar el resultado usando datos que no se hayan empleado para ajustar el modelo. Cada experiencia contiene: pregunta inicial, controles, visualización, explicación, evidencia y reto.

Tres niveles simultáneos: **Intuición** (analogía con sus límites), **Paso a paso** (números del estado actual) y **Formal** (fórmulas, dimensiones, supuestos y derivadas). Cambiar nivel no modifica el modelo ni elimina progreso. El vocabulario principal es español; el término inglés aparece como ayuda y en el glosario.

## Personas y recorridos

| Persona | Necesidad | Recorrido de referencia |
|---|---|---|
| Estudiante FP | Comprender lo que cambia al mover un control | Taller de 15–35 min: datos → neurona → entrenamiento → evidencia |
| Estudiante universitario | Contrastar derivaciones | Inspector formal → gradientes analíticos/numéricos → comparación |
| Docente | Proyectar, recuperar un caso y plantear un reto | Abrir preset → modo presentación → pausa → revelar explicación |
| Explorador autónomo | Probar hipótesis y guardar resultados | Laboratorio libre → comparar A/B → exportar experimento |

## Alcance completo y límites

12 laboratorios, taller, biblioteca de experimentos, glosario, ajustes, importación/exportación y PWA. Un MLP entrenable para clasificación binaria, multiclase y regresión tabular. Convolución y pooling didácticos se incluyen como operador inspeccionable; no se promete entrenar una CNN completa.

Límites iniciales, medibles y revisables: 10.000 filas, 32 características numéricas después de codificar, 10 clases; MLP de 0–6 capas ocultas y 1–64 neuronas/capa. La arquitectura máxima 32→64→64→64→64→64→64→10 suma **23.562 parámetros densos y 24.330 con BN**. Se elimina el techo independiente de 30.000: el validador deriva dimensiones y presupuesto de la topología. Hasta 12 neuronas por capa se muestran individualmente por defecto; redes mayores se agrupan con inspector. Límites de dimensiones y bytes son simultáneos y se comprueban antes de reservar buffers grandes. El perfil 3D es opcional y siempre tiene alternativa 2D.

Fuera de esta versión: backend, cuentas, nube, colaboración multiusuario, inferencia de LLM, GPU para entrenamiento, CNN/RNN/transformers entrenables, importación de código arbitrario, compatibilidad universal ONNX/Keras/PyTorch, calificación oficial o certificación del alumno. Los modelos se intercambian en el formato nativo documentado.

## Entregas y puertas de revisión

**D0, revisión 0.2:** contratos corregidos, historias operativas y nuevas experiencias educativas; aplicación pendiente. Se propone un MVP para no convertir toda la lista en condición del primer hito.

**MVP 1.0 (D1–D5):** L01–L06, evaluación básica L09/L10 y T01–T05, motor MLP/perceptrón, Worker recuperable, IDB e intercambio. Prioridades nuevas: POE, diagnóstico por métricas y mapas de activación; puente lineal/logístico e infraestructura de idiomas. No incluye 3D, CNN, BN/dropout, CV, calibración o PWA.

**v1.1 (D6–D10):** completa alcance original, 12 laboratorios/12 talleres, regularización, comparación/CV, 3D, visión, catálogo abierto, paquete docente y PWA. Los 140 conceptos previos se cierran en esta etapa según evidencia real; el catálogo añadido puede referenciar extensiones posteriores marcadas.

**v1.2 propuesta (X1–X2):** kNN/árbol, grid, importancia por permutación, audio opcional, deshacer y datos reales opcionales. Estas seis extensiones se documentan y trazan, pero requieren revisión posterior de alcance; no se promete incorporarlas al MVP ni se elimina el alcance original.

Cada fase incorpora sus pruebas y accesibilidad; no se acumula calidad al final. [Plan](14-historias-y-plan-git.md): D1 shell; D2 datos; D3 motor; D4 entrenamiento/evaluación; D5 biblioteca/taller; D6 generalización; D7 comparación/CV; D8 métricas/funciones; D9 3D/visión/investigación; D10 catálogo/PWA. Estimación orientativa: MVP 29–48 jornadas, v1.1 adicional 34–59, no compromiso de calendario. Un módulo parcial se identifica como tal; no se simulan métricas.

## Éxito y riesgos

Éxito: completar un reto sin consultar documentación externa; repetir un experimento con mismos resultados dentro de tolerancia; distinguir entrenamiento, validación y prueba; relacionar un cambio de parámetros con predicción y pérdida. Se comprobará con actividades de taller y una sesión piloto de 5–8 alumnos, además de pruebas automáticas.

Riesgos: exceso de conceptos por pantalla (revelado progresivo); error numérico o pedagógico (fixtures y revisión de contenido); saturación de UI (Worker y límites); cuota local (presupuesto y exportación); variación de GPU (2D equivalente); falta de datos con licencia (datos sintéticos originales por defecto); soporte desigual offline (estado de descarga verificable). Ninguna publicación externa forma parte de la fase documental.

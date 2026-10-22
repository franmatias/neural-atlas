# Visión y alcance

## Acuerdos

- Público mixto, con prioridad para FP de especialización; matemáticas explicadas progresivamente.
- Agrupar los 100 conceptos originales y ampliar el catálogo con otros pertinentes: **140 iniciales, lista abierta**, distribuidos en laboratorios coherentes.
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

1. **D0, esta entrega:** auditoría, requisitos, diseño, UML, contratos, historias, trazabilidad y plan de validación. Estado: propuesta, pendiente de revisión del usuario.
2. **D1:** estructura Vue, diseño base, accesibilidad, ajustes y primer laboratorio con motor probado.
3. **D2:** pipeline de datos y MLP completo en Worker; clasificación, regresión y evaluación.
4. **D3:** optimización, regularización, 3D, CNN, taller y cobertura de los 140 conceptos iniciales y su mecanismo de ampliación.
5. **D4:** endurecimiento de importadores, PWA, rendimiento, pruebas completas y documentación de publicación.

Las fases ordenan la construcción; los requisitos obligatorios se evalúan al finalizar D4. Un módulo parcial se identifica como tal. No se simulan métricas ni se presentan funciones pendientes como terminadas.

## Éxito y riesgos

Éxito: completar un reto sin consultar documentación externa; repetir un experimento con mismos resultados dentro de tolerancia; distinguir entrenamiento, validación y prueba; relacionar un cambio de parámetros con predicción y pérdida. Se comprobará con actividades de taller y una sesión piloto de 5–8 alumnos, además de pruebas automáticas.

Riesgos: exceso de conceptos por pantalla (revelado progresivo); error numérico o pedagógico (fixtures y revisión de contenido); saturación de UI (Worker y límites); cuota local (presupuesto y exportación); variación de GPU (2D equivalente); falta de datos con licencia (datos sintéticos originales por defecto); soporte desigual offline (estado de descarga verificable). Ninguna publicación externa forma parte de la fase documental.

# Respuesta a las revisiones · especificación 0.2

Fecha: 22/10/2026. Se incorporan ambos textos del usuario y el destino GitHub posterior. «Corregido» significa corregido **en diseño/documentación**, salvo los oráculos y controles documentales expresamente ejecutados. No se presenta una aplicación implementada ni una revisión humana ya realizada.

## Correcciones técnicas

| Observación | Decisión / cambio | Evidencia de diseño o comprobación |
|---|---|---|
| ROC/AP incorrecto | Etiquetas 0,0,1,1 para AUC=0,75/AP=5/6; caso original da 1/1 | [Fixtures](fixtures/review-math.json), comprobador por pares/grupos |
| Adam ambiguo y notación 1.000 | η=0,1 explícito; números JSON 1000 | [Pruebas](13-pruebas-y-aceptacion.md) y oráculo ejecutable |
| Techo 30.000 redundante | Eliminar techo separado; máximo derivado 23.562 densos/24.330 BN | [Alcance](02-vision-y-alcance.md), conteo ejecutable |
| Biblioteca no cabe en LocalStorage | IndexedDB transaccional con buffers; LocalStorage solo preferencias/progreso | [Persistencia](12-persistencia-offline-y-seguridad.md), ADR-004 revisado |
| Presupuestos incompatibles | IDB 256 MiB objetivo: 5×40+20+16+8+12; cuota real prevalece | RNF-015 y oráculo de presupuesto |
| JSON repetitivo y límite insuficiente | Columnar; dataset 32 MiB/experimento 64 MiB; validar bytes y dimensiones | [Contratos](11-datos-y-protocolo-worker.md) |
| 0/1–6 capas, lote completo y tiempos | 0–6, mini-lote ≤512/completo Ntrain, «medibles», talleres 15–35 min | [Laboratorios](05-laboratorios.md) |
| Perceptrón sin aprendizaje/óptimo XOR | Rosenblatt con parada; contradicción matemática y testigo 3/4 | [Motor](10-motor-matematico.md) |
| Dos usos de SGD | Muestreo «Lote de 1», optimizador «Descenso de gradiente simple», id sgd | RF-029/031 y motor |
| Verde y chequeo incompleto | Verde #007F5F; chequear paleta/foco/bordes sobre fondos reales | [Diseño](07-diseno-de-interfaz.md), checker no textual |
| Recovery inexistente si no hay guardado | Checkpoint inicial antes de READY, automático RAM en fronteras; IDB más espaciado | RF-052, protocolo y diagramas 05/21/25 |
| BN incompatible con troceo ingenuo | Barreras dense/estadísticas/normalización/backward, reducciones de lote completo | [Worker](11-datos-y-protocolo-worker.md), diagrama 21 |
| Frecuencia de mapas inviable | Separar progreso barato/mapas; 10 % de cómputo, resolución/frecuencia adaptativa | Worker y P-P06 con P-Max/P-Map/P-CV |
| Reproducibilidad excesiva | Estricta mismo motor JS/versión; entre motores tolerancias de métricas/fixtures | RNF-002; no fdlibm en alcance |
| Hash de dominio dependía de plataforma | SHA-256 puro específico, UTF-8 puro; no crypto.subtle en dominio | Contratos y ADR de pureza |
| Early stopping contamina fold | Desactivarlo en CV con presupuesto fijo y advertencia explícita | RF-062, motor, P-I11, diagrama 17 |
| Clase positiva indefinida | classOrder[1] por defecto, positiveClassId visible/editable sin mutar pesos | RF-043 y motor |
| Grupos + estratificación | Estrategia stratified-grouped, asignación determinista, mejoras acotadas y rechazo/aviso si inviable | Contratos de DataSplit |
| Soporte minoritario | Mínimos y advertencia explícitos, n junto a métricas; preset 95/5 usa 1.000 filas | Contratos y L09 |
| Target escalado ambiguo | Pérdida en espacio transformado, métricas con inversa en unidades originales | Motor |
| RNG incompleto | FNV-1a32 ASCII + Mulberry32-v1 exacto; Box–Muller u1=1−u | [Vectores](fixtures/rng-v1.json), contraste Python/JS |
| Augmentation genérica | Jitter acotado con oráculo/margen en círculos/XOR; no lunas arbitrariamente | L08, RF-041 y P-L08 |
| Velocidad visual sin significado | Traza congelada 0,25×–4×, ritmo independiente actualizaciones/s | RF-008 y protocolo |
| XOR dependía de seed no probada | Candidato 2→4→1 y tres seeds de aceptación; prueba manual separada | L03; validación de entrenamiento pendiente de D3 |
| Primera visita sin red imposible | Documentar error del navegador; app offline solo tras precaché | RNF-019 y persistencia |

## Coherencia editorial y planificación

| Observación | Resolución |
|---|---|
| Registro no cumple plantilla | title.en, ejemplo numérico, control, error frecuente, pregunta/respuesta/explicación y targetRelease; [ejemplo completo](fixtures/concept-example.json) |
| Límite 500 registros no implica que quepan | 4 MiB y 500 simultáneos; 32 KiB/registro, sin promesa de capacidad total |
| Normas por capa, C089 y Fisher–Yates sin vista | L04/L06/L08 muestran normas/diagnóstico; C089 remite a L08; L06 inspecciona permutación congelada |
| C037 sin demo y L03 sobrecargado | Inicialización avanzada a L04; aproximación 1/2/8/32 a L10; L03 básico XOR/topología/mapas |
| Nombres de curvas ambiguos | Pérdida por época, aprendizaje por tamaño train y validación frente a hiperparámetro se distinguen |
| Fases desequilibradas/dependencias futuras | D1–D10 por incrementos; recorridos 03a/b,04a/b,11a/b,12a/b,14a/b; checkpoint completo después de BN |
| Ramas mezclan fases | Ramas con prefijo de fase, cerrables sin esperar historias posteriores |
| Sin MVP/esfuerzo | MVP D1–D5 (29–48 jornadas orientativas), v1.1 D6–D10 (+34–59); extras fuera de puerta inicial |
| Falta RF→módulo | [Matriz RF completa](21-trazabilidad-rf.md), generada y validada junto a historias/pruebas/fases |
| Accesibilidad/CSP/decimales | Botón saltar sin cambiar hash, tema con script propio/hash CSP, parser decimal texto; prueba temprana D1 |
| Cobertura Three/snapshots excesivos | Three 65 %/50 % e incluido en total más E2E; tres anchos/estados estables para snapshots, cinco anchos DOM |
| Bundle, cuota compartida y Node | Importadores/KaTeX/3D lazy, cuota por origen Pages documentada; Node 24 LTS |
| Fuentes y verificación | WCAG/Workbox/KaTeX/Zod/Papa/Glorot/He/dropout/IDB; revisión visual **del agente, pendiente de revisión humana** |

## Segunda revisión: decisiones de producto

Las tres prioridades —POE, diagnóstico y mapas— entran en MVP mediante RF-069/071/072. No se afirma que cada región profunda sea un semiplano, que una alerta pruebe causa o que una probabilidad esté calibrada. Las demás propuestas tienen RF-070 y RF-073–088, historias US-047/050–065 y pruebas P-Q01–20, con distribución en [plan](14-historias-y-plan-git.md) y [diseño transversal](22-experiencias-educativas.md).

Se aceptan para v1.1 guía docente, T09–T12, aproximación de funciones, grafo/repaso, A/B de proyector, vínculo error→preset, segmentos y ética. Estructura de internacionalización y comparadores lineal/logístico se adelantan al MVP. kNN/árbol, grid, permutación, audio, undo y datos reales quedan como seis extensiones propuestas: no se eliminan ni se cuelan como condición del MVP. Continúan fuera cuentas/ranking, IA externa, entrenamiento CNN/RNN/transformers y WebGPU.

## Publicación y siguientes pasos

El usuario indicó [franmatias/neural-atlas](https://github.com/franmatias/neural-atlas) para publicar el proyecto. La consulta inicial del remoto no devolvió refs; se conserva el historial local y se publica sin force-push. Los diagramas se aportan como `.mmd`, Markdown renderizable y SVG exportados, sin requerir subirlos a otro servicio. La [verificación](19-verificacion.md) distingue publicación de documentos, render y pruebas de producto aún pendientes. La implementación D1 sigue esperando la revisión de la especificación, como se acordó.

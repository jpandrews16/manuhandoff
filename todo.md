# Handoff - AI Agent Platform TODO

## Schema & Backend
- [x] Schema: tabla `tasks` (id, userId, title, description, status, currentPhase, createdAt, updatedAt)
- [x] Schema: tabla `task_phases` (id, taskId, phaseIndex, name, status, startedAt, completedAt)
- [x] Schema: tabla `task_memory` (id, taskId, type: task_plan|findings|progress, content, updatedAt)
- [x] Schema: tabla `chat_messages` (id, taskId, role, content, createdAt)
- [x] Schema: tabla `error_logs` (id, taskId, error, attempt, resolution, createdAt)
- [x] Schema: tabla `sessions` (id, userId, taskId, contextSnapshot, createdAt)
- [x] DB helpers para tasks, memory, chat, errors, sessions
- [x] Router tRPC: tasks (create, list, get, update, delete)
- [x] Router tRPC: agent (startLoop, getPhaseStatus, phaseNames)
- [x] Router tRPC: memory (get, update, export)
- [x] Router tRPC: errors (list, log)
- [x] Router tRPC: sessions (list, get)
- [x] Lógica LLM: descomponer tarea en fases automáticamente
- [x] Lógica LLM: chat con razonamiento paso a paso
- [x] Lógica LLM: generar findings y progress en tiempo real
- [x] Notificación al propietario en completación de tarea
- [x] Notificación al propietario en error crítico (3 intentos fallidos)

## Frontend - Layout & Auth
- [x] Diseño visual: dark theme elegante con paleta refinada (index.css)
- [x] Landing page con CTA de login Manus OAuth
- [x] Sidebar de navegación en todas las páginas
- [x] Perfil de usuario con datos de Manus OAuth
- [x] Página 404 personalizada

## Frontend - Dashboard
- [x] Dashboard principal con lista de tareas y proyectos
- [x] Estado visual de cada agente (activo, completado, error, pausado)
- [x] Acceso rápido a sesiones activas
- [x] Métricas resumen (tareas totales, activas, completadas, errores)

## Frontend - Creación de Tareas
- [x] Input de lenguaje natural para crear tareas
- [x] Visualización del plan de fases generado automáticamente por el LLM
- [x] Confirmación y lanzamiento del agente
- [x] Ejemplos de tareas para inspirar al usuario

## Frontend - Loop del Agente
- [x] Visualización del loop: Analizar → Pensar → Seleccionar → Ejecutar → Observar → Iterar → Entregar
- [x] Resaltado de fase activa en tiempo real con animación pulse
- [x] Indicador de progreso por fase (barra de progreso)
- [x] Iconos y colores diferenciados por estado (pending/active/completed/error)

## Frontend - Chat
- [x] Panel de chat integrado con historial de mensajes
- [x] Soporte de markdown en mensajes (Streamdown)
- [x] Diferenciación visual entre mensajes del usuario y del agente
- [x] Enter para enviar, Shift+Enter para nueva línea

## Frontend - Memoria Persistente
- [x] Panel con visualización de task_plan.md, findings.md, progress.md
- [x] Editor inline de archivos de memoria
- [x] Botones de exportación/descarga por archivo
- [x] Exportar todos los archivos a la vez

## Frontend - Registro de Errores
- [x] Tabla de errores con columnas: error, intento (1-3), resolución
- [x] Indicador visual del protocolo de 3 intentos (colores por intento)
- [x] Badge "Escalado" cuando se superan 3 intentos

## Frontend - Historial de Sesiones
- [x] Lista de sesiones anteriores por usuario en perfil
- [x] Recuperación de contexto desde sesión anterior
- [x] Indicador de sesión activa vs. histórica

## Tests
- [x] Test: auth.logout limpia cookie correctamente
- [x] Test: agent.phaseNames retorna 7 fases en orden correcto
- [x] Test: guards de autenticación en todos los routers
- [x] Test: validación de inputs (título vacío, mensaje vacío, fileType inválido)
- [x] 15 tests pasando en total


## BUGS & ISSUES CRÍTICOS
- [x] BUG: Usuario no puede ingresar al chat — RESUELTO: corregida validación JWT de sesión
- [x] BUG: Verificar que el callback de OAuth redirige correctamente al dashboard — VERIFICADO
- [x] BUG: Validar que las cookies de sesión se guardan correctamente — VERIFICADO

## APIs de Manus a Conectar
- [x] Conectar LLM API avanzado con vision y razonamiento extendido (invokeLLM en agent.ts)
- [x] Conectar Data API para búsqueda y análisis de datos en tiempo real (tools.ts)
- [x] Conectar Storage API para guardar archivos de memoria en S3 (storagePut en memory router)
- [x] Conectar Notification API para alertas al propietario (notifyOwner en agent.ts)
- [x] Conectar Image Generation API para generar imágenes en tareas visuales (generateImage en tools.ts)
- [x] Conectar Voice Transcription API para transcribir audio (transcribeAudio en multi-format.ts)

## Características Avanzadas (Paridad con Manus)
- [x] Chain-of-Thought: razonamiento paso a paso visible con ReasoningPanel
- [x] Reflexión post-fase: evaluación de objetivos alcanzados en memoria
- [x] Planificación adaptativa: replanificación inteligente ante fallos (conectada en handlePhaseError)
- [x] Streaming de respuestas de chat en tiempo real (SSE endpoints)
- [x] Ejecución de herramientas: búsqueda web, análisis de código, análisis de datos, cálculos, extracción de URLs
- [x] Soporte para múltiples formatos de entrada: texto, imágenes, audio, URLs (multi-format.ts + multi-format-router.ts)
- [x] Análisis en tiempo real del progreso del agente con métricas (ReasoningPanel summary)
- [x] Manejo avanzado de errores con reintentos inteligentes y adaptación de plan
- [x] Caché de resultados para optimizar ejecuciones repetidas (AgentCache con LRU)
- [x] Soporte para tareas paralelas y coordinación de múltiples agentes (parallel-tasks.ts + parallel-router.ts)
- [x] Webhooks para integración con sistemas externos (webhooks.ts + webhooks-router.ts)
- [x] API pública para que terceros lancen agentes desde sus apps (disponible a través de webhooks + routers públicos)
- [x] Dashboard de analytics: tiempo de ejecución, éxito/error rate, uso de recursos (AnalyticsDashboard integrado en TaskDetail)


## REDISEÑO VISUAL - REPLICAR MANUS (FASE FINAL)
- [x] Sidebar: hacer muy estrecho, solo iconos grandes (Nueva tarea, Agent, Buscar, Biblioteca)
- [x] Sidebar: agregar sección "Proyectos" con lista de proyectos
- [x] Sidebar: agregar sección "Todas las tareas" con items
- [x] Header: Logo Handoff + versión + notificaciones + créditos/balance
- [x] Main content: Título grande "¿Qué puedo hacer por ti?"
- [x] Main content: Input de texto grande para tarea (con placeholder)
- [x] Main content: Botones de herramientas (+ agregar, iconos de opciones)
- [x] Main content: Sugerencias de tareas abajo (cards con descripción)
- [x] Tipografía: usar Inter para todo (ya está)
- [x] Colores: dark theme idéntico a Manus (ya está)
- [x] Espaciado: generoso y refinado como Manus
- [x] Responsive: sidebar colapsable en mobile (implementado con Tailwind breakpoints)

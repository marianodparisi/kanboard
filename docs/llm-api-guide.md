# Kansito API Guide for LLMs

Esta guía está pensada para agentes, asistentes y LLMs que necesiten leer o actualizar el tablero de Kansito desde código o por HTTP.

## Base URLs

- Producción: `https://kansito.mparisi.dev`
- Local: `http://localhost:3000`

## Flujo recomendado

1. Hacer login con email y password.
2. Reutilizar la cookie de sesión para `GET /api/auth/session`, `GET /api/board` y `PATCH /api/projects/[id]`.
3. Usar `POST /api/agent-updates` cuando el agente quiera crear o actualizar una tarjeta completa sin pasar por UI.
4. Usar `PATCH /api/projects/[id]` para acciones puntuales sobre una tarjeta existente.

## Regla operativa para agentes

Kansito debe usarse como tablero central para seguir trabajo hecho por agentes, incluso cuando el código se modifica en otros repositorios.

- Si un agente empieza trabajo relevante en otro repo, debería crear o actualizar una tarjeta en Kansito.
- Si un agente termina una tarea, debería reflejar el resultado en Kansito con `status`, `summary`, `tags`, `details` o `tasks`.
- Si el trabajo ya tiene tarjeta, hay que reutilizar el mismo `projectId`.
- Si el objetivo es registrar progreso general de un repo, conviene usar `POST /api/agent-updates`.
- Si el objetivo es tocar una tarjeta existente de forma puntual, conviene usar `PATCH /api/projects/[id]`.

## Auth

### `POST /api/auth/login`

Hace login y devuelve una cookie de sesión HTTP-only.

Body:

```json
{
  "email": "tu-email",
  "password": "tu-password"
}
```

Respuesta esperada:

```json
{
  "ok": true,
  "user": {
    "id": 1,
    "email": "marianoparisi59gmail.com",
    "fullName": "Mariano Parisi",
    "role": "owner"
  }
}
```

### `GET /api/auth/session`

Valida si la cookie actual sigue autenticada.

### `POST /api/auth/logout`

Cierra la sesión actual.

## Leer tablero

### `GET /api/board`

Devuelve:

```json
{
  "board": {
    "workspace": {},
    "projects": [],
    "activity": []
  }
}
```

Notas:

- Requiere cookie de sesión válida.
- En producción conviene usar un query param tipo `?t=timestamp` si querés evitar lecturas cacheadas.

## Crear o actualizar tarjetas desde un agente

### `POST /api/agent-updates`

Pensado para integraciones externas, CLI o agentes.

Headers:

```http
Authorization: Bearer TU_AGENT_SHARED_TOKEN
Content-Type: application/json
```

Si `AGENT_SHARED_TOKEN` no está configurado, el endpoint acepta requests sin bearer token.

Body mínimo:

```json
{
  "title": "Kansito Control Center",
  "repository": "maria/kanban-github-agent",
  "status": "in_progress",
  "summary": "Se actualizaron vistas y acciones de tareas."
}
```

Body recomendado:

```json
{
  "projectId": "kansito-control-center",
  "title": "Kansito Control Center",
  "repository": "maria/kanban-github-agent",
  "owner": "Mariano",
  "status": "in_progress",
  "tags": ["nextjs", "kanban", "agent"],
  "summary": "Se actualizaron vistas y acciones de tareas.",
  "details": [
    "Se agrego edicion inline en la pestaña Tareas",
    "Se agrego reorder y borrado de tareas"
  ],
  "filesChanged": [
    "src/components/board-app.tsx",
    "src/app/api/projects/[id]/route.ts"
  ],
  "tasks": [
    { "label": "Validar UI local", "done": true },
    { "label": "Verificar deploy", "done": false }
  ],
  "author": "Codex",
  "source": "api",
  "priority": "high"
}
```

Comportamiento:

- Si `projectId` ya existe, hace upsert.
- Si no existe, crea una tarjeta nueva.
- También agrega una entrada en `activity`.

## Acciones puntuales sobre una tarjeta

### `PATCH /api/projects/[id]`

Requiere cookie de sesión válida.

### Mover tarjeta

```json
{
  "action": "move",
  "status": "review"
}
```

Estados válidos:

- `backlog`
- `in_progress`
- `on_hold`
- `review`
- `done`

### Actualizar campos generales

```json
{
  "title": "Nuevo título",
  "summary": "Nuevo resumen",
  "priority": "medium",
  "tags": ["frontend", "release"]
}
```

### Marcar o desmarcar una tarea

```json
{
  "action": "toggle_task",
  "taskIndex": 0
}
```

### Agregar tarea

```json
{
  "action": "add_task",
  "label": "Preparar changelog"
}
```

### Editar tarea

```json
{
  "action": "edit_task",
  "taskIndex": 1,
  "label": "Preparar changelog final"
}
```

### Borrar tarea

```json
{
  "action": "delete_task",
  "taskIndex": 1
}
```

### Reordenar tarea

```json
{
  "action": "move_task",
  "fromIndex": 3,
  "toIndex": 1
}
```

## Ejemplo PowerShell

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$base = "https://kansito.mparisi.dev"

$loginBody = @{
  email = "TU_EMAIL"
  password = "TU_PASSWORD"
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri "$base/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body $loginBody `
  -WebSession $session `
  -UseBasicParsing

Invoke-WebRequest `
  -Uri "$base/api/board?t=$(Get-Date -UFormat %s)" `
  -WebSession $session `
  -UseBasicParsing

$taskBody = @{
  action = "add_task"
  label = "Verificar release"
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri "$base/api/projects/api-smoke-test" `
  -Method PATCH `
  -ContentType "application/json" `
  -Body $taskBody `
  -WebSession $session `
  -UseBasicParsing
```

## Reglas útiles para LLMs

- No inventar estados fuera de `backlog`, `in_progress`, `on_hold`, `review`, `done`.
- Si vas a modificar una tarjeta existente, primero leer `GET /api/board` para ubicar `projectId`.
- Si el objetivo es actualizar muchas propiedades juntas, preferir `POST /api/agent-updates`.
- Si el objetivo es tocar una tarjeta ya existente de forma fina, preferir `PATCH /api/projects/[id]`.
- Si una lectura parece vieja en producción, repetir `GET /api/board?t=timestamp`.
- Evitar escribir secretos reales en prompts o commits.

## Archivo fuente recomendado para agentes

Si un LLM necesita contexto del producto y de la API, los puntos de entrada más útiles del repo son:

- `README.md`
- `docs/llm-api-guide.md`
- `src/app/api/agent-updates/route.ts`
- `src/app/api/projects/[id]/route.ts`
- `src/lib/board-store.ts`
- `src/lib/auth.ts`

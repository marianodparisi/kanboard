# Kanboard

Kanboard es una app de Kanban construida con Next.js para seguir proyectos de GitHub con una interfaz tipo Bento, foco editorial y una base lista para automatizaciones de agente.

Hoy ya incluye una experiencia usable en local:

- tablero con columnas `Backlog`, `In Progress`, `On Hold` y `Done`
- vista `Projects`, `Tasks` y `Calendar`
- paneles de `Notifications`, `Settings` y `Profile`
- creacion de tarjetas desde la UI
- persistencia local en `data/board.json`
- endpoint para recibir updates externos desde agentes o scripts

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- App Router

## Experiencia actual

La app no es solo una maqueta. La home ya permite:

1. navegar entre tabs reales
2. filtrar tarjetas con buscador
3. abrir el detalle de una tarjeta
4. crear una tarjeta nueva con el boton `+`
5. guardar esa tarjeta via `POST /api/agent-updates`

## Estructura

```text
src/
  app/
    api/
      agent-updates/
      board/
    page.tsx
  components/
    board-app.tsx
  lib/
    board-store.ts
    types.ts
data/
  board.json
docs/
  design-memory.md
```

## Correr en local

En PowerShell conviene usar `npm.cmd`:

```bash
npm.cmd install
npm.cmd run dev
```

Abrí:

- `http://localhost:3000`

## Variables de entorno

Creá `.env.local` a partir de `.env.example`.

```bash
AGENT_SHARED_TOKEN=define-un-token-compartido
GITHUB_TOKEN=ghp_coloca_aqui_tu_token
```

- `AGENT_SHARED_TOKEN` protege la escritura del endpoint
- `GITHUB_TOKEN` queda listo para la futura integracion real con GitHub

## API

### `GET /api/board`

Devuelve el tablero completo y algunos contadores base.

### `POST /api/agent-updates`

Crea o actualiza una tarjeta desde una herramienta externa.

Ejemplo:

```bash
curl -X POST http://localhost:3000/api/agent-updates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "title": "Nuevo modulo de reportes",
    "repository": "maria/reporting-app",
    "status": "in_progress",
    "tags": ["reportes", "dashboard"],
    "summary": "Se comenzo el armado del modulo y quedo conectado al tablero.",
    "source": "codex",
    "author": "Codex"
  }'
```

## Roadmap

- drag and drop entre columnas
- edicion de tarjetas existentes
- autenticacion real
- sincronizacion con issues, PRs y commits de GitHub
- persistencia en SQLite o Postgres
- CLI dedicada para publicar updates del agente

## Diseño

La base visual del proyecto está documentada en:

- `docs/design-memory.md`

Ese archivo fija la direccion visual del producto y sirve como memoria persistente del sistema de diseño.

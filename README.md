# Kansito

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

Kansito es una app Kanban construida con Next.js para administrar proyectos, seguir estados, registrar actividad y operar un tablero con login real sobre MySQL.

![Kansito screenshot](./docs/screenshots/kanboard-home.png)

## Estado actual

- tablero con columnas `Pendiente`, `En curso`, `En pausa`, `Revisión` y `Hecho`
- vistas `Proyectos`, `Tareas` y `Calendario`
- login con usuario y password validados contra MySQL
- sesiones por cookie HTTP-only
- creación, edición y movimiento persistente de tarjetas
- marcado de tareas desde la UI
- endpoint para actualizaciones externas del tablero
- persistencia principal en MySQL con backup local en `data/board.json`

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- MySQL
- App Router

## Rutas API

- `GET /api/board`
- `POST /api/agent-updates`
- `PATCH /api/projects/[id]`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`

## Correr en local

```bash
npm.cmd install
npm.cmd run dev
```

App local:

- `http://localhost:3000`

## Variables de entorno

Creá `.env.local` a partir de `.env.example`.

```bash
AGENT_SHARED_TOKEN=define-un-token-compartido
GITHUB_TOKEN=ghp_coloca_aqui_tu_token
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=kanboard
MYSQL_USER=root
MYSQL_PASSWORD=coloca_aqui_la_password
APP_LOGIN_EMAIL=tu-email@ejemplo.com
APP_LOGIN_PASSWORD=coloca_aqui_la_password_de_acceso
APP_LOGIN_NAME=Tu Nombre
```

## Deploy

### Opción 1: Vercel

1. Importá el repo en Vercel.
2. Configurá todas las variables de entorno.
3. Verificá que la base MySQL acepte conexiones desde el runtime de Vercel.
4. Deploy automático sobre `main`.

### Opción 2: Node tradicional

```bash
npm.cmd install
npm.cmd run build
npm.cmd run start
```

## Estructura

```text
src/
  app/
    api/
      agent-updates/
      auth/
      board/
      projects/[id]/
    page.tsx
  components/
    board-app.tsx
  lib/
    auth.ts
    board-store.ts
    mysql.ts
    types.ts
data/
  board.json
docs/
  design-memory.md
  screenshots/
```

## Diseño

La memoria visual del proyecto está en:

- `docs/design-memory.md`
- `.interface-design/system.md`

## Próximos pasos

- probar end-to-end las APIs en entorno desplegado
- terminar la limpieza total de copy/encoding en archivos auxiliares
- agregar roles y permisos reales
- conectar eventos de GitHub a tarjetas del tablero

## Contribuir

Si querés colaborar, mirá [CONTRIBUTING.md](./CONTRIBUTING.md).

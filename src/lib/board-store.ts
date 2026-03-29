import { promises as fs } from "node:fs";
import path from "node:path";

import {
  type ActivityItem,
  type AgentUpdatePayload,
  type BoardData,
  type KanbanProject,
  statuses,
} from "@/lib/types";

const dataDirectory = path.join(process.cwd(), "data");
const boardFile = path.join(dataDirectory, "board.json");

const defaultBoard: BoardData = {
  workspace: {
    name: "Kanban GitHub Agent",
    description:
      "Centro operativo para seguir proyectos, cambios aplicados por agente y estado de entrega.",
    agentChannel: "POST /api/agent-updates",
    lastSyncedAt: "2026-03-29T18:30:00.000Z",
  },
  projects: [
    {
      id: "kanban-control-center",
      title: "Kanban Control Center",
      repository: "maria/kanban-github-agent",
      owner: "Maria",
      status: "in_progress",
      tags: ["nextjs", "kanban", "github", "agent"],
      summary:
        "Base inicial del tablero para centralizar proyectos, estados y actualizaciones ejecutadas desde Codex.",
      lastUpdate: "2026-03-29T18:30:00.000Z",
      priority: "high",
      details: [
        "Scaffold en Next.js 16 con App Router y TypeScript.",
        "Modelo de tablero preparado para recibir cambios desde API o CLI.",
        "Vista inicial enfocada en proyectos activos, tags y actividad reciente.",
      ],
      filesChanged: ["src/app/page.tsx", "src/app/api/agent-updates/route.ts"],
      tasks: [
        { label: "Definir estructura de proyectos y estados", done: true },
        { label: "Exponer endpoint para actualizaciones del agente", done: true },
        { label: "Conectar con OAuth/App de GitHub", done: false },
      ],
    },
    {
      id: "github-sync-layer",
      title: "GitHub Sync Layer",
      repository: "maria/github-sync-layer",
      owner: "Maria",
      status: "on_hold",
      tags: ["github-api", "webhooks", "automation"],
      summary:
        "Siguiente etapa para traer eventos reales de repositorios y mantener el tablero alineado con PRs, issues y commits.",
      lastUpdate: "2026-03-28T15:00:00.000Z",
      priority: "medium",
      details: [
        "Agregar GitHub App o token personal para leer repositorios y proyectos.",
        "Mapear issues y PRs a tarjetas del tablero.",
        "Resolver deduplicacion cuando el mismo proyecto se actualiza por CLI y por webhook.",
      ],
      filesChanged: ["README.md"],
      tasks: [
        { label: "Diseñar credenciales para GitHub", done: false },
        { label: "Crear endpoint de sincronizacion", done: false },
        { label: "Agregar filtros por repositorio", done: false },
      ],
    },
  ],
  activity: [
    {
      id: "activity-bootstrap",
      projectId: "kanban-control-center",
      projectTitle: "Kanban Control Center",
      createdAt: "2026-03-29T18:30:00.000Z",
      source: "codex",
      author: "Codex",
      summary:
        "Se genero la base del tablero y quedo lista la primera interfaz para registrar avances tecnicos.",
    },
    {
      id: "activity-roadmap",
      projectId: "github-sync-layer",
      projectTitle: "GitHub Sync Layer",
      createdAt: "2026-03-28T15:00:00.000Z",
      source: "api",
      author: "Sistema",
      summary:
        "Se propuso una capa de sincronizacion para vincular repositorios y automatizar cambios de estado.",
    },
  ],
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeProject(payload: AgentUpdatePayload): KanbanProject {
  const now = new Date().toISOString();
  const normalizedStatus = statuses.includes(payload.status)
    ? payload.status
    : "backlog";

  return {
    id: payload.projectId ?? slugify(`${payload.repository}-${payload.title}`),
    title: payload.title,
    repository: payload.repository,
    owner: payload.owner ?? payload.repository.split("/")[0] ?? "sin-owner",
    status: normalizedStatus,
    tags: payload.tags ?? [],
    summary: payload.summary,
    lastUpdate: now,
    priority: payload.priority ?? "medium",
    details: payload.details ?? [],
    filesChanged: payload.filesChanged ?? [],
    tasks: payload.tasks ?? [],
  };
}

async function ensureBoardFile() {
  await fs.mkdir(dataDirectory, { recursive: true });

  try {
    await fs.access(boardFile);
  } catch {
    await fs.writeFile(boardFile, JSON.stringify(defaultBoard, null, 2), "utf8");
  }
}

export async function readBoardData() {
  await ensureBoardFile();
  const content = await fs.readFile(boardFile, "utf8");
  return JSON.parse(content) as BoardData;
}

export async function writeBoardData(board: BoardData) {
  await ensureBoardFile();
  await fs.writeFile(boardFile, JSON.stringify(board, null, 2), "utf8");
}

export async function upsertProjectFromAgent(payload: AgentUpdatePayload) {
  const board = await readBoardData();
  const nextProject = normalizeProject(payload);
  const existingIndex = board.projects.findIndex(
    (project) => project.id === nextProject.id,
  );

  if (existingIndex >= 0) {
    board.projects[existingIndex] = {
      ...board.projects[existingIndex],
      ...nextProject,
      tags: nextProject.tags.length
        ? nextProject.tags
        : board.projects[existingIndex].tags,
      details: nextProject.details.length
        ? nextProject.details
        : board.projects[existingIndex].details,
      filesChanged: nextProject.filesChanged.length
        ? nextProject.filesChanged
        : board.projects[existingIndex].filesChanged,
      tasks: nextProject.tasks.length
        ? nextProject.tasks
        : board.projects[existingIndex].tasks,
    };
  } else {
    board.projects.unshift(nextProject);
  }

  const activityEntry: ActivityItem = {
    id: `${nextProject.id}-${Date.now()}`,
    projectId: nextProject.id,
    projectTitle: nextProject.title,
    createdAt: new Date().toISOString(),
    source: payload.source ?? "api",
    author: payload.author ?? "Agente",
    summary: payload.summary,
  };

  board.activity.unshift(activityEntry);
  board.activity = board.activity.slice(0, 12);
  board.workspace.lastSyncedAt = activityEntry.createdAt;

  await writeBoardData(board);

  return {
    project: board.projects.find((project) => project.id === nextProject.id)!,
    activity: activityEntry,
  };
}

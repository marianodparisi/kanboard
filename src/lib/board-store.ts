import { promises as fs } from "node:fs";
import path from "node:path";

import {
  type ActivityItem,
  type AgentUpdatePayload,
  type BoardData,
  type KanbanProject,
  type ProjectTask,
  type ProjectUpdatePayload,
  statuses,
} from "@/lib/types";
import { ensureDatabaseReady, getPool } from "@/lib/mysql";

const dataDirectory = path.join(process.cwd(), "data");
const boardFile = path.join(dataDirectory, "board.json");

const defaultBoard: BoardData = {
  workspace: {
    name: "Kansito",
    description:
      "Centro operativo para seguir proyectos, cambios aplicados por agente y estado de entrega.",
    agentChannel: "POST /api/agent-updates",
    lastSyncedAt: "2026-03-29T18:30:00.000Z",
  },
  projects: [
    {
      id: "kansito-control-center",
      title: "Kansito Control Center",
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
        { label: "Crear endpoint de sincronización", done: false },
        { label: "Agregar filtros por repositorio", done: false },
      ],
    },
  ],
  activity: [
    {
      id: "activity-bootstrap",
      projectId: "kansito-control-center",
      projectTitle: "Kansito Control Center",
      createdAt: "2026-03-29T18:30:00.000Z",
      source: "codex",
      author: "Codex",
      summary:
        "Se generó la base del tablero y quedó lista la primera interfaz para registrar avances técnicos.",
    },
    {
      id: "activity-roadmap",
      projectId: "github-sync-layer",
      projectTitle: "GitHub Sync Layer",
      createdAt: "2026-03-28T15:00:00.000Z",
      source: "api",
      author: "Sistema",
      summary:
        "Se propuso una capa de sincronización para vincular repositorios y automatizar cambios de estado.",
    },
  ],
};

let hydrationPromise: Promise<void> | null = null;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isoToMysql(value: string) {
  const date = new Date(value);
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  const hours = `${date.getUTCHours()}`.padStart(2, "0");
  const minutes = `${date.getUTCMinutes()}`.padStart(2, "0");
  const seconds = `${date.getUTCSeconds()}`.padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function mysqlToIso(value: string) {
  return new Date(String(value).replace(" ", "T") + "Z").toISOString();
}

function parseJsonArray<T>(value: unknown, fallback: T[]): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
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

async function readBoardBackup() {
  await ensureBoardFile();

  try {
    const content = await fs.readFile(boardFile, "utf8");
    return JSON.parse(content) as BoardData;
  } catch {
    return defaultBoard;
  }
}

async function writeBoardBackup(board: BoardData) {
  await ensureBoardFile();
  await fs.writeFile(boardFile, JSON.stringify(board, null, 2), "utf8");
}

async function hydrateDatabaseIfNeeded() {
  if (!hydrationPromise) {
    hydrationPromise = (async () => {
      await ensureDatabaseReady();
      const pool = getPool();
      const [rows] = await pool.query("SELECT COUNT(*) AS count FROM projects");
      const countRows = rows as Array<{ count: number }>;

      if (Number(countRows[0]?.count ?? 0) > 0) {
        return;
      }

      const seed = await readBoardBackup();
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        await connection.query(
          `INSERT INTO workspace_profiles (id, name, description, agent_channel, last_synced_at)
           VALUES (1, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             description = VALUES(description),
             agent_channel = VALUES(agent_channel),
             last_synced_at = VALUES(last_synced_at)`,
          [
            seed.workspace.name,
            seed.workspace.description,
            seed.workspace.agentChannel,
            isoToMysql(seed.workspace.lastSyncedAt),
          ],
        );

        for (const project of seed.projects) {
          await connection.query(
            `INSERT INTO projects (
              id, title, repository, owner, status, tags_json, summary,
              last_update, priority, details_json, files_changed_json, tasks_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              project.id,
              project.title,
              project.repository,
              project.owner,
              project.status,
              JSON.stringify(project.tags),
              project.summary,
              isoToMysql(project.lastUpdate),
              project.priority,
              JSON.stringify(project.details),
              JSON.stringify(project.filesChanged),
              JSON.stringify(project.tasks),
            ],
          );
        }

        for (const activity of seed.activity) {
          await connection.query(
            `INSERT INTO activity_items (
              id, project_id, project_title, created_at, source, author, summary
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              activity.id,
              activity.projectId,
              activity.projectTitle,
              isoToMysql(activity.createdAt),
              activity.source,
              activity.author,
              activity.summary,
            ],
          );
        }

        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    })();
  }

  await hydrationPromise;
}

function mapProjectRow(row: {
  id: string;
  title: string;
  repository: string;
  owner: string;
  status: KanbanProject["status"];
  tags_json: string;
  summary: string;
  last_update: string;
  priority: KanbanProject["priority"];
  details_json: string;
  files_changed_json: string;
  tasks_json: string;
}): KanbanProject {
  return {
    id: row.id,
    title: row.title,
    repository: row.repository,
    owner: row.owner,
    status: row.status,
    tags: parseJsonArray<string>(row.tags_json, []),
    summary: row.summary,
    lastUpdate: mysqlToIso(row.last_update),
    priority: row.priority,
    details: parseJsonArray<string>(row.details_json, []),
    filesChanged: parseJsonArray<string>(row.files_changed_json, []),
    tasks: parseJsonArray<ProjectTask>(row.tasks_json, []),
  };
}

function mapActivityRow(row: {
  id: string;
  project_id: string | null;
  project_title: string;
  created_at: string;
  source: ActivityItem["source"];
  author: string;
  summary: string;
}): ActivityItem {
  return {
    id: row.id,
    projectId: row.project_id ?? "",
    projectTitle: row.project_title,
    createdAt: mysqlToIso(row.created_at),
    source: row.source,
    author: row.author,
    summary: row.summary,
  };
}

async function readBoardFromDatabase() {
  await hydrateDatabaseIfNeeded();
  const pool = getPool();

  const [workspaceRows] = await pool.query(
    `SELECT name, description, agent_channel, last_synced_at
     FROM workspace_profiles
     WHERE id = 1
     LIMIT 1`,
  );
  const typedWorkspaceRows = workspaceRows as Array<{
    name: string;
    description: string;
    agent_channel: string;
    last_synced_at: string;
  }>;

  const [projectRows] = await pool.query(
    `SELECT
       id, title, repository, owner, status, tags_json, summary,
       last_update, priority, details_json, files_changed_json, tasks_json
     FROM projects
     ORDER BY last_update DESC, title ASC`,
  );
  const typedProjectRows = projectRows as Array<{
    id: string;
    title: string;
    repository: string;
    owner: string;
    status: KanbanProject["status"];
    tags_json: string;
    summary: string;
    last_update: string;
    priority: KanbanProject["priority"];
    details_json: string;
    files_changed_json: string;
    tasks_json: string;
  }>;

  const [activityRows] = await pool.query(
    `SELECT id, project_id, project_title, created_at, source, author, summary
     FROM activity_items
     ORDER BY created_at DESC
     LIMIT 12`,
  );
  const typedActivityRows = activityRows as Array<{
    id: string;
    project_id: string | null;
    project_title: string;
    created_at: string;
    source: ActivityItem["source"];
    author: string;
    summary: string;
  }>;

  const workspace = typedWorkspaceRows[0];

  return {
    workspace: workspace
      ? {
          name: workspace.name,
          description: workspace.description,
          agentChannel: workspace.agent_channel,
          lastSyncedAt: mysqlToIso(workspace.last_synced_at),
        }
      : defaultBoard.workspace,
    projects: typedProjectRows.map(mapProjectRow),
    activity: typedActivityRows.map(mapActivityRow),
  } satisfies BoardData;
}

async function syncBoardBackup() {
  const board = await readBoardFromDatabase();
  await writeBoardBackup(board);
  return board;
}

async function upsertProjectInDatabase(project: KanbanProject) {
  await hydrateDatabaseIfNeeded();
  const pool = getPool();

  await pool.query(
    `INSERT INTO projects (
      id, title, repository, owner, status, tags_json, summary,
      last_update, priority, details_json, files_changed_json, tasks_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      repository = VALUES(repository),
      owner = VALUES(owner),
      status = VALUES(status),
      tags_json = VALUES(tags_json),
      summary = VALUES(summary),
      last_update = VALUES(last_update),
      priority = VALUES(priority),
      details_json = VALUES(details_json),
      files_changed_json = VALUES(files_changed_json),
      tasks_json = VALUES(tasks_json)`,
    [
      project.id,
      project.title,
      project.repository,
      project.owner,
      project.status,
      JSON.stringify(project.tags),
      project.summary,
      isoToMysql(project.lastUpdate),
      project.priority,
      JSON.stringify(project.details),
      JSON.stringify(project.filesChanged),
      JSON.stringify(project.tasks),
    ],
  );
}

async function insertActivity(activity: ActivityItem) {
  const pool = getPool();
  await pool.query(
    `INSERT INTO activity_items (
      id, project_id, project_title, created_at, source, author, summary
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      activity.id,
      activity.projectId || null,
      activity.projectTitle,
      isoToMysql(activity.createdAt),
      activity.source,
      activity.author,
      activity.summary,
    ],
  );

  await pool.query(
    `DELETE FROM activity_items
     WHERE id NOT IN (
       SELECT id FROM (
         SELECT id FROM activity_items ORDER BY created_at DESC LIMIT 12
       ) latest
     )`,
  );
}

async function updateWorkspaceSync(isoDate: string) {
  const pool = getPool();
  await pool.query(
    `INSERT INTO workspace_profiles (id, name, description, agent_channel, last_synced_at)
     VALUES (1, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE last_synced_at = VALUES(last_synced_at)`,
    [
      defaultBoard.workspace.name,
      defaultBoard.workspace.description,
      defaultBoard.workspace.agentChannel,
      isoToMysql(isoDate),
    ],
  );
}

async function findProjectById(projectId: string) {
  await hydrateDatabaseIfNeeded();
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT
       id, title, repository, owner, status, tags_json, summary,
       last_update, priority, details_json, files_changed_json, tasks_json
     FROM projects
     WHERE id = ?
     LIMIT 1`,
    [projectId],
  );
  const projectRows = rows as Array<{
    id: string;
    title: string;
    repository: string;
    owner: string;
    status: KanbanProject["status"];
    tags_json: string;
    summary: string;
    last_update: string;
    priority: KanbanProject["priority"];
    details_json: string;
    files_changed_json: string;
    tasks_json: string;
  }>;

  return projectRows[0] ? mapProjectRow(projectRows[0]) : null;
}

export async function readBoardData() {
  return readBoardFromDatabase();
}

export async function writeBoardData(board: BoardData) {
  await ensureDatabaseReady();
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query("DELETE FROM activity_items");
    await connection.query("DELETE FROM projects");
    await connection.query("DELETE FROM workspace_profiles");

    await connection.query(
      `INSERT INTO workspace_profiles (id, name, description, agent_channel, last_synced_at)
       VALUES (1, ?, ?, ?, ?)`,
      [
        board.workspace.name,
        board.workspace.description,
        board.workspace.agentChannel,
        isoToMysql(board.workspace.lastSyncedAt),
      ],
    );

    for (const project of board.projects) {
      await connection.query(
        `INSERT INTO projects (
          id, title, repository, owner, status, tags_json, summary,
          last_update, priority, details_json, files_changed_json, tasks_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          project.id,
          project.title,
          project.repository,
          project.owner,
          project.status,
          JSON.stringify(project.tags),
          project.summary,
          isoToMysql(project.lastUpdate),
          project.priority,
          JSON.stringify(project.details),
          JSON.stringify(project.filesChanged),
          JSON.stringify(project.tasks),
        ],
      );
    }

    for (const activity of board.activity) {
      await connection.query(
        `INSERT INTO activity_items (
          id, project_id, project_title, created_at, source, author, summary
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          activity.id,
          activity.projectId || null,
          activity.projectTitle,
          isoToMysql(activity.createdAt),
          activity.source,
          activity.author,
          activity.summary,
        ],
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await writeBoardBackup(board);
}

export async function upsertProjectFromAgent(payload: AgentUpdatePayload) {
  await hydrateDatabaseIfNeeded();
  const current = normalizeProject(payload);
  const existing = await findProjectById(current.id);

  const nextProject: KanbanProject = existing
    ? {
        ...existing,
        ...current,
        tags: current.tags.length ? current.tags : existing.tags,
        details: current.details.length ? current.details : existing.details,
        filesChanged: current.filesChanged.length
          ? current.filesChanged
          : existing.filesChanged,
        tasks: current.tasks.length ? current.tasks : existing.tasks,
      }
    : current;

  await upsertProjectInDatabase(nextProject);

  const activityEntry: ActivityItem = {
    id: `${nextProject.id}-${Date.now()}`,
    projectId: nextProject.id,
    projectTitle: nextProject.title,
    createdAt: new Date().toISOString(),
    source: payload.source ?? "api",
    author: payload.author ?? "Agente",
    summary: payload.summary,
  };

  await insertActivity(activityEntry);
  await updateWorkspaceSync(activityEntry.createdAt);
  await syncBoardBackup();

  return {
    project: nextProject,
    activity: activityEntry,
  };
}

export async function updateProject(
  projectId: string,
  updates: ProjectUpdatePayload,
  actorName = "Mariano",
) {
  const current = await findProjectById(projectId);

  if (!current) {
    throw new Error("Proyecto no encontrado.");
  }

  const nextStatus =
    updates.status && statuses.includes(updates.status) ? updates.status : current.status;
  const nextProject: KanbanProject = {
    ...current,
    ...updates,
    status: nextStatus,
    tags: updates.tags ?? current.tags,
    details: updates.details ?? current.details,
    filesChanged: updates.filesChanged ?? current.filesChanged,
    tasks: updates.tasks ?? current.tasks,
    lastUpdate: new Date().toISOString(),
  };

  await upsertProjectInDatabase(nextProject);

  await insertActivity({
    id: `${projectId}-${Date.now()}`,
    projectId,
    projectTitle: nextProject.title,
    createdAt: nextProject.lastUpdate,
    source: "cli",
    author: actorName,
    summary: `Se actualizó la tarjeta "${nextProject.title}".`,
  });

  await updateWorkspaceSync(nextProject.lastUpdate);
  await syncBoardBackup();

  return nextProject;
}

export async function moveProject(
  projectId: string,
  status: KanbanProject["status"],
  actorName?: string,
) {
  return updateProject(projectId, { status }, actorName);
}

export async function toggleProjectTask(
  projectId: string,
  taskIndex: number,
  actorName?: string,
) {
  const current = await findProjectById(projectId);

  if (!current) {
    throw new Error("Proyecto no encontrado.");
  }

  if (taskIndex < 0 || taskIndex >= current.tasks.length) {
    throw new Error("Tarea no encontrada.");
  }

  const nextTasks: ProjectTask[] = current.tasks.map((task, index) =>
    index === taskIndex ? { ...task, done: !task.done } : task,
  );

  return updateProject(projectId, { tasks: nextTasks }, actorName);
}

export async function addProjectTask(
  projectId: string,
  label: string,
  actorName?: string,
) {
  const current = await findProjectById(projectId);

  if (!current) {
    throw new Error("Proyecto no encontrado.");
  }

  const normalizedLabel = label.trim();

  if (!normalizedLabel) {
    throw new Error("La tarea no puede estar vacia.");
  }

  const nextTasks: ProjectTask[] = [
    ...current.tasks,
    { label: normalizedLabel, done: false },
  ];

  return updateProject(projectId, { tasks: nextTasks }, actorName);
}

export async function updateProjectTaskLabel(
  projectId: string,
  taskIndex: number,
  label: string,
  actorName?: string,
) {
  const current = await findProjectById(projectId);

  if (!current) {
    throw new Error("Proyecto no encontrado.");
  }

  if (taskIndex < 0 || taskIndex >= current.tasks.length) {
    throw new Error("Tarea no encontrada.");
  }

  const normalizedLabel = label.trim();

  if (!normalizedLabel) {
    throw new Error("La tarea no puede estar vacia.");
  }

  const nextTasks: ProjectTask[] = current.tasks.map((task, index) =>
    index === taskIndex ? { ...task, label: normalizedLabel } : task,
  );

  return updateProject(projectId, { tasks: nextTasks }, actorName);
}

export async function deleteProjectTask(
  projectId: string,
  taskIndex: number,
  actorName?: string,
) {
  const current = await findProjectById(projectId);

  if (!current) {
    throw new Error("Proyecto no encontrado.");
  }

  if (taskIndex < 0 || taskIndex >= current.tasks.length) {
    throw new Error("Tarea no encontrada.");
  }

  const nextTasks = current.tasks.filter((_, index) => index !== taskIndex);
  return updateProject(projectId, { tasks: nextTasks }, actorName);
}

export async function reorderProjectTask(
  projectId: string,
  fromIndex: number,
  toIndex: number,
  actorName?: string,
) {
  const current = await findProjectById(projectId);

  if (!current) {
    throw new Error("Proyecto no encontrado.");
  }

  if (
    fromIndex < 0 ||
    fromIndex >= current.tasks.length ||
    toIndex < 0 ||
    toIndex >= current.tasks.length
  ) {
    throw new Error("Movimiento de tarea invalido.");
  }

  if (fromIndex === toIndex) {
    return current;
  }

  const nextTasks = [...current.tasks];
  const [task] = nextTasks.splice(fromIndex, 1);
  nextTasks.splice(toIndex, 0, task);

  return updateProject(projectId, { tasks: nextTasks }, actorName);
}

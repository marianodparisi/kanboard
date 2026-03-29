export const statuses = [
  "backlog",
  "in_progress",
  "on_hold",
  "review",
  "done",
] as const;

export type ProjectStatus = (typeof statuses)[number];

export type ProjectTask = {
  label: string;
  done: boolean;
};

export type KanbanProject = {
  id: string;
  title: string;
  repository: string;
  owner: string;
  status: ProjectStatus;
  tags: string[];
  summary: string;
  lastUpdate: string;
  priority: "low" | "medium" | "high";
  details: string[];
  filesChanged: string[];
  tasks: ProjectTask[];
};

export type ActivityItem = {
  id: string;
  projectId: string;
  projectTitle: string;
  createdAt: string;
  source: "codex" | "cli" | "api";
  author: string;
  summary: string;
};

export type WorkspaceProfile = {
  name: string;
  description: string;
  agentChannel: string;
  lastSyncedAt: string;
};

export type BoardData = {
  workspace: WorkspaceProfile;
  projects: KanbanProject[];
  activity: ActivityItem[];
};

export type AgentUpdatePayload = {
  projectId?: string;
  title: string;
  repository: string;
  owner?: string;
  status: ProjectStatus;
  tags?: string[];
  summary: string;
  details?: string[];
  filesChanged?: string[];
  tasks?: ProjectTask[];
  author?: string;
  source?: ActivityItem["source"];
  priority?: KanbanProject["priority"];
};

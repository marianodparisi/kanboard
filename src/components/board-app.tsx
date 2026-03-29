"use client";

import Image from "next/image";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  AgentUpdatePayload,
  BoardData,
  KanbanProject,
  ProjectStatus,
} from "@/lib/types";

const visibleColumns: {
  id: ProjectStatus;
  label: string;
  tone: string;
  surface: string;
}[] = [
  {
    id: "backlog",
    label: "Backlog",
    tone: "bg-[var(--primary)] shadow-[0_0_12px_rgba(0,64,223,0.35)]",
    surface: "bg-[#eef2f4]",
  },
  {
    id: "in_progress",
    label: "In Progress",
    tone: "bg-[var(--secondary-deep)] shadow-[0_0_12px_rgba(160,65,0,0.22)]",
    surface: "bg-[var(--surface-container)]",
  },
  {
    id: "on_hold",
    label: "On Hold",
    tone: "bg-[var(--hold)] shadow-[0_0_12px_rgba(116,81,184,0.22)]",
    surface: "bg-[#ece9f3]",
  },
  {
    id: "done",
    label: "Done",
    tone: "bg-[var(--tertiary)] shadow-[0_0_12px_rgba(34,96,63,0.22)]",
    surface: "bg-[var(--surface-high)]",
  },
];

const tagStyles: Record<ProjectStatus, string> = {
  backlog: "bg-[var(--chip-blue)] text-white",
  in_progress: "bg-[var(--chip-orange)] text-white",
  on_hold: "bg-[var(--chip-violet)] text-white",
  review: "bg-[var(--chip-orange)] text-white",
  done: "bg-[var(--chip-green)] text-white",
};

const barStyles: Record<ProjectStatus, string> = {
  backlog: "bg-[var(--primary)]",
  in_progress: "bg-[var(--secondary)]",
  on_hold: "bg-[var(--hold)]",
  review: "bg-[var(--secondary)]",
  done: "bg-[var(--tertiary-soft)]",
};

type AppTab = "projects" | "tasks" | "calendar";
type OverlayState =
  | "notifications"
  | "settings"
  | "profile"
  | "card"
  | "add"
  | "login"
  | null;

type CreateCardForm = {
  owner: string;
  repository: string;
  title: string;
  status: ProjectStatus;
  priority: "low" | "medium" | "high";
  summary: string;
  tags: string;
};

const initialForm: CreateCardForm = {
  owner: "Maria",
  repository: "maria/new-project",
  title: "",
  status: "backlog",
  priority: "medium",
  summary: "",
  tags: "",
};

const HARDCODED_EMAIL = "marianoparisi59gmail.com";
const HARDCODED_PASSWORD = "kanboard123";

function columnProjects(projects: KanbanProject[], column: ProjectStatus) {
  if (column === "in_progress") {
    return projects.filter(
      (project) => project.status === "in_progress" || project.status === "review",
    );
  }

  return projects.filter((project) => project.status === column);
}

function cardLabel(project: KanbanProject) {
  return project.tags[0] ?? project.repository.split("/")[1] ?? "project";
}

function cardMeta(project: KanbanProject) {
  if (project.status === "done") return "Completed";
  if (project.status === "on_hold") return "Paused";
  if (project.priority === "high") return "Urgent";
  return project.status === "review" ? "Review" : "Active";
}

function avatarSeed(project: KanbanProject) {
  return encodeURIComponent(`${project.title} ${project.repository}`);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function filterProjects(projects: KanbanProject[], query: string) {
  if (!query) return projects;
  const normalized = query.toLowerCase();

  return projects.filter((project) =>
    [
      project.title,
      project.repository,
      project.summary,
      project.owner,
      project.priority,
      ...project.tags,
      ...project.details,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
}

function IconSearch() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function IconBell() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M14.5 18a2.5 2.5 0 01-5 0m8-2H6.5c.7-.74 1.24-1.62 1.24-3.23V10a4.26 4.26 0 118.52 0v2.77c0 1.61.54 2.49 1.24 3.23z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function IconGear() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M12 15.25A3.25 3.25 0 1012 8.75a3.25 3.25 0 000 6.5z" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M19.4 15a1 1 0 00.2 1.1l.04.04a2 2 0 01-2.83 2.83l-.04-.04a1 1 0 00-1.1-.2 1 1 0 00-.6.92V20a2 2 0 11-4 0v-.06a1 1 0 00-.67-.94 1 1 0 00-1.1.2l-.04.04a2 2 0 01-2.83-2.83l.04-.04a1 1 0 00.2-1.1 1 1 0 00-.92-.6H4a2 2 0 110-4h.06a1 1 0 00.94-.67 1 1 0 00-.2-1.1l-.04-.04a2 2 0 012.83-2.83l.04.04a1 1 0 001.1.2H8.8a1 1 0 00.6-.92V4a2 2 0 114 0v.06a1 1 0 00.67.94 1 1 0 001.1-.2l.04-.04a2 2 0 012.83 2.83l-.04.04a1 1 0 00-.2 1.1v.08a1 1 0 00.92.6H20a2 2 0 110 4h-.06a1 1 0 00-.94.67V15z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function IconMeta({ done, urgent }: { done?: boolean; urgent?: boolean }) {
  if (done) {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path
          d="M9.25 12.5l1.75 1.75 3.75-4"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (urgent) {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path
          d="M12 7v6m0 3h.01"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 6v6l4 2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M9 7v10m6-10v10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function Overlay({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(24,28,30,0.16)] backdrop-blur-[2px]">
      <button aria-label="Cerrar" className="flex-1" onClick={onClose} type="button" />
      <aside className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-[-20px_0_50px_rgba(24,28,30,0.12)]">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="headline-font text-2xl font-bold text-[var(--foreground)]">{title}</h2>
            {subtitle ? <p className="nav-font mt-2 text-sm text-[var(--muted)]">{subtitle}</p> : null}
          </div>
          <button
            className="nav-font rounded-full bg-[#f4f6f9] px-3 py-1.5 text-sm text-[var(--foreground)]"
            onClick={onClose}
            type="button"
          >
            Cerrar
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

function BoardColumn({
  column,
  projects,
  onOpenCard,
  compactCards,
  showHints,
  highlightUrgent,
  isDropTarget,
  onDropProject,
  onDragProject,
}: {
  column: (typeof visibleColumns)[number];
  projects: KanbanProject[];
  onOpenCard: (project: KanbanProject) => void;
  compactCards: boolean;
  showHints: boolean;
  highlightUrgent: boolean;
  isDropTarget: boolean;
  onDropProject: (status: ProjectStatus) => void;
  onDragProject: (projectId: string | null) => void;
}) {
  return (
    <div
      className={`kanban-column ${column.surface} flex min-h-[68vh] flex-col gap-5 p-5 transition sm:min-h-[71vh] sm:gap-6 sm:p-6 ${
        isDropTarget ? "ring-2 ring-[var(--primary)]/30" : ""
      }`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onDropProject(column.id)}
    >
      <div className="flex items-center justify-between px-3">
        <div className="flex items-center gap-4">
          <span className={`h-3 w-3 rounded-full ${column.tone}`} />
          <h2 className="headline-font text-[1.08rem] font-bold text-[var(--foreground)] sm:text-[1.2rem]">
            {column.label}
          </h2>
        </div>
      </div>

      <div className="space-y-5">
        {projects.length ? (
          projects.map((project) => {
            const done = project.status === "done";
            const urgent = !done && project.priority === "high";
            const onHold = project.status === "on_hold";

            return (
              <button
                key={project.id}
                className={`kanban-card relative block w-full overflow-hidden text-left transition-transform duration-200 hover:-translate-y-1 ${
                  compactCards ? "p-4 sm:p-5" : "p-5 sm:p-6"
                } ${
                  done ? "opacity-85 grayscale-[0.2]" : ""
                }`}
                draggable
                onDragEnd={() => onDragProject(null)}
                onDragStart={() => onDragProject(project.id)}
                onClick={() => onOpenCard(project)}
                type="button"
              >
                <div className={`absolute bottom-0 left-0 top-0 w-1.5 ${barStyles[project.status]}`} />
                <div
                  className={`flex flex-col pl-2 ${
                    compactCards
                      ? "min-h-[138px] gap-3 sm:min-h-[150px]"
                      : "min-h-[158px] gap-4 sm:min-h-[174px] sm:gap-5"
                  }`}
                >
                  <span className={`nav-font self-start rounded-full px-3 py-1 text-[0.74rem] font-extrabold uppercase tracking-[0.16em] ${tagStyles[project.status]}`}>
                    {cardLabel(project)}
                  </span>
                  <h3
                    className={`headline-font max-w-[14ch] text-[1rem] font-bold leading-[1.28] text-[var(--foreground)] sm:text-[1.15rem] ${
                      done ? "line-through decoration-[rgba(60,121,86,0.35)]" : ""
                    }`}
                  >
                    {project.title}
                  </h3>
                  {showHints ? (
                    <p className="nav-font text-xs leading-5 text-[var(--muted-soft)]">
                      {project.repository}
                    </p>
                  ) : null}
                  <div
                    className={`nav-font mt-auto flex items-center justify-between text-[0.92rem] sm:text-[0.98rem] ${
                      done
                        ? "text-[var(--tertiary)]"
                        : onHold
                          ? "text-[var(--hold)]"
                          : urgent && highlightUrgent
                            ? "text-[#ba1a1a]"
                            : "text-[var(--muted-soft)]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {onHold ? <IconPause /> : <IconMeta done={done} urgent={urgent} />}
                      <span>{cardMeta(project)}</span>
                    </div>
                    <Image
                      alt={project.owner}
                      className="h-10 w-10 rounded-full object-cover sm:h-11 sm:w-11"
                      height={44}
                      src={`https://api.dicebear.com/9.x/glass/svg?seed=${avatarSeed(project)}`}
                      unoptimized
                      width={44}
                    />
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="nav-font rounded-[1.5rem] bg-white/70 px-4 py-5 text-sm text-[var(--muted)]">
            No hay tarjetas en esta columna para la vista actual.
          </div>
        )}
      </div>
    </div>
  );
}

export function BoardApp({ initialBoard }: { initialBoard: BoardData }) {
  const [board, setBoard] = useState(initialBoard);
  const [activeTab, setActiveTab] = useState<AppTab>("projects");
  const [overlay, setOverlay] = useState<OverlayState>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState(HARDCODED_EMAIL);
  const [loginPassword, setLoginPassword] = useState(HARDCODED_PASSWORD);
  const [loginError, setLoginError] = useState("");
  const [selectedCard, setSelectedCard] = useState<KanbanProject | null>(null);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<CreateCardForm>(initialForm);
  const [createError, setCreateError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    compactCards: true,
    showHints: true,
    highlightUrgent: true,
  });

  const deferredQuery = useDeferredValue(query.trim());

  const filteredProjects = useMemo(
    () => filterProjects(board.projects, deferredQuery),
    [board.projects, deferredQuery],
  );

  const tasksView = useMemo(() => {
    return filteredProjects.flatMap((project) =>
      project.tasks.map((task, index) => ({
        id: `${project.id}-${index}`,
        projectId: project.id,
        taskIndex: index,
        projectTitle: project.title,
        status: project.status,
        label: task.label,
        done: task.done,
      })),
    );
  }, [filteredProjects]);

  const calendarView = useMemo(() => {
    return [...filteredProjects].sort(
      (a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime(),
    );
  }, [filteredProjects]);

  useEffect(() => {
    if (overlay !== "card") {
      setSelectedCard(null);
    }
  }, [overlay]);

  useEffect(() => {
    if (overlay !== "profile") {
      setIsUserMenuOpen(false);
    }
  }, [overlay]);

  useEffect(() => {
    const saved = window.localStorage.getItem("kanboard-settings");
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch {}
    }

    const savedAuth = window.localStorage.getItem("kanboard-auth-email");
    if (savedAuth) {
      setIsAuthenticated(true);
      setAuthEmail(savedAuth);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("kanboard-settings", JSON.stringify(settings));
  }, [settings]);

  function initialsFromEmail(email: string) {
    const [left = "M", right = "M"] = email
      .replace(/[^a-zA-Z0-9]/g, " ")
      .split(" ")
      .filter(Boolean);

    return `${left[0] ?? "M"}${right[0] ?? left[1] ?? "M"}`.toUpperCase();
  }

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loginEmail === HARDCODED_EMAIL && loginPassword === HARDCODED_PASSWORD) {
      setIsAuthenticated(true);
      setAuthEmail(loginEmail);
      setLoginError("");
      window.localStorage.setItem("kanboard-auth-email", loginEmail);
      setOverlay(null);
      return;
    }

    setLoginError("Credenciales invalidas.");
  }

  function handleLogout() {
    setIsAuthenticated(false);
    setAuthEmail("");
    setIsUserMenuOpen(false);
    setOverlay(null);
    window.localStorage.removeItem("kanboard-auth-email");
  }

  function openCard(project: KanbanProject) {
    setSelectedCard(project);
    setOverlay("card");
  }

  async function patchProject(
    projectId: string,
    body: Record<string, unknown>,
    options?: { refreshSelected?: boolean },
  ) {
    const response = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = (await response.json()) as {
      error?: string;
      project?: KanbanProject;
    };

    if (!response.ok || !json.project) {
      throw new Error(json.error ?? "No se pudo actualizar la tarjeta.");
    }

    startTransition(() => {
      setBoard((current) => ({
        ...current,
        projects: current.projects.map((project) =>
          project.id === json.project!.id ? json.project! : project,
        ),
      }));
    });

    if (options?.refreshSelected !== false) {
      setSelectedCard(json.project);
    }

    return json.project;
  }

  async function handleToggleTask(projectId: string, taskIndex: number) {
    const updated = await patchProject(
      projectId,
      { action: "toggle_task", taskIndex },
      { refreshSelected: true },
    );

    if (selectedCard?.id === updated.id) {
      setSelectedCard(updated);
    }
  }

  async function handleMoveProject(projectId: string, status: ProjectStatus) {
    await patchProject(projectId, { action: "move", status });
  }

  async function handleDropProject(status: ProjectStatus) {
    if (!draggedProjectId) return;
    await handleMoveProject(draggedProjectId, status);
    setDraggedProjectId(null);
  }

  async function handleSaveCard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCard) return;

    const formData = new FormData(event.currentTarget);
    const tags = String(formData.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    await patchProject(selectedCard.id, {
      title: String(formData.get("title") ?? ""),
      repository: String(formData.get("repository") ?? ""),
      summary: String(formData.get("summary") ?? ""),
      status: String(formData.get("status") ?? selectedCard.status),
      priority: String(formData.get("priority") ?? selectedCard.priority),
      tags,
    });
  }

  async function handleCreateCard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError("");
    setIsSaving(true);

    try {
      const payload: AgentUpdatePayload = {
        owner: form.owner,
        repository: form.repository,
        title: form.title,
        status: form.status,
        priority: form.priority,
        summary: form.summary,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        source: "cli",
        author: "Maria",
      };

      const response = await fetch("/api/agent-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await response.json()) as {
        error?: string;
        result?: { project: KanbanProject };
      };

      if (!response.ok || !json.result) {
        throw new Error(json.error ?? "No se pudo crear la tarjeta.");
      }

      startTransition(() => {
        setBoard((current) => {
          const withoutDuplicate = current.projects.filter(
            (project) => project.id !== json.result!.project.id,
          );

          return {
            ...current,
            projects: [json.result!.project, ...withoutDuplicate],
            activity: [
              {
                id: `${json.result!.project.id}-manual`,
                projectId: json.result!.project.id,
                projectTitle: json.result!.project.title,
                createdAt: new Date().toISOString(),
                source: "cli" as const,
                author: "Maria",
                summary: json.result!.project.summary,
              },
              ...current.activity,
            ].slice(0, 12),
          };
        });
      });

      setForm(initialForm);
      setOverlay(null);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Error inesperado.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="kanban-shell flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-[var(--shell-line)] bg-[var(--surface)]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-7">
          <div className="flex items-center gap-4 sm:gap-6">
            <span className="headline-font text-[1.35rem] font-extrabold text-[var(--foreground)] sm:text-[1.6rem]">
              BentoBoard
            </span>
            <nav className="hidden items-center gap-6 lg:flex">
              {(["projects", "tasks", "calendar"] as AppTab[]).map((tab) => (
                <button
                  key={tab}
                  className={`nav-font text-[1rem] ${
                    activeTab === tab
                      ? "font-semibold text-[var(--primary-strong)]"
                      : "font-medium text-[var(--muted)]"
                  }`}
                  onClick={() => setActiveTab(tab)}
                  type="button"
                >
                  {tab === "projects"
                    ? "Projects"
                    : tab === "tasks"
                      ? "Tasks"
                      : "Calendar"}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <label className="hidden items-center gap-3 rounded-full bg-[#d7dce1] px-4 py-2.5 text-[var(--muted)] md:flex">
              <span className="text-[var(--muted-soft)]">
                <IconSearch />
              </span>
              <input
                className="nav-font w-40 border-none bg-transparent p-0 text-[0.95rem] text-[var(--foreground)] placeholder:text-[var(--muted-soft)] focus:ring-0 xl:w-56"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  activeTab === "projects"
                    ? "Search projects..."
                    : activeTab === "tasks"
                      ? "Search tasks..."
                      : "Search calendar..."
                }
                type="text"
                value={query}
              />
            </label>
            <div className="relative">
              <button
                aria-expanded={isAuthenticated ? isUserMenuOpen : overlay === "login"}
                className="flex items-center gap-3 rounded-full bg-white px-2 py-1.5 shadow-[0_8px_20px_rgba(24,28,30,0.06)]"
                onClick={() => {
                  if (isAuthenticated) {
                    setIsUserMenuOpen((current) => !current);
                  } else {
                    setOverlay("login");
                  }
                }}
                type="button"
              >
                <div className="headline-font flex h-10 w-10 items-center justify-center rounded-full bg-[#eef2ff] text-sm font-bold text-[var(--primary)]">
                  {isAuthenticated ? initialsFromEmail(authEmail) : "IN"}
                </div>
                <div className="hidden sm:block">
                  {isAuthenticated ? (
                    <span className="nav-font text-sm font-medium text-[var(--foreground)]">
                      {authEmail}
                    </span>
                  ) : (
                    <span className="nav-font text-sm font-medium text-[var(--primary)]">
                      Login
                    </span>
                  )}
                </div>
                {isAuthenticated ? (
                  <span className="hidden text-[var(--muted)] sm:block">
                    <IconChevronDown />
                  </span>
                ) : null}
              </button>
              {isAuthenticated && isUserMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-44 rounded-[1.5rem] bg-white p-2 shadow-[0_18px_40px_rgba(24,28,30,0.12)]">
                  <button
                    className="nav-font flex w-full items-center gap-3 rounded-[1rem] px-3 py-2.5 text-left text-[0.95rem] text-[var(--foreground)] transition hover:bg-[#f4f6f9]"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setOverlay("notifications");
                    }}
                    type="button"
                  >
                    <span className="text-[var(--muted)]">
                      <IconBell />
                    </span>
                    Notifications
                  </button>
                  <button
                    className="nav-font flex w-full items-center gap-3 rounded-[1rem] px-3 py-2.5 text-left text-[0.95rem] text-[var(--foreground)] transition hover:bg-[#f4f6f9]"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setOverlay("settings");
                    }}
                    type="button"
                  >
                    <span className="text-[var(--muted)]">
                      <IconGear />
                    </span>
                    Settings
                  </button>
                  <button
                    className="nav-font flex w-full items-center gap-3 rounded-[1rem] px-3 py-2.5 text-left text-[0.95rem] text-[var(--foreground)] transition hover:bg-[#f4f6f9]"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setOverlay("profile");
                    }}
                    type="button"
                  >
                    <div className="headline-font flex h-7 w-7 items-center justify-center rounded-full bg-[#eef2ff] text-[0.72rem] font-bold text-[var(--primary)]">
                      {initialsFromEmail(authEmail)}
                    </div>
                    Profile
                  </button>
                  <button
                    className="nav-font flex w-full items-center gap-3 rounded-[1rem] px-3 py-2.5 text-left text-[0.95rem] text-[#ba1a1a] transition hover:bg-[#fdf1f1]"
                    onClick={handleLogout}
                    type="button"
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 py-8 sm:px-6 md:px-8 md:py-10">
        <div className="mb-8 sm:mb-10">
          <nav className="nav-font mb-3 flex flex-wrap items-center gap-2 text-[0.82rem] text-[var(--muted)] sm:text-[0.95rem]">
            <span>Workspace</span>
            <span>/</span>
            <span>{board.workspace.name}</span>
            <span>/</span>
            <span className="font-semibold text-[var(--primary)]">Kanban</span>
          </nav>
          <h1 className="headline-font text-[2.25rem] font-extrabold leading-none text-[var(--foreground)] sm:text-[2.8rem] md:text-[3.3rem]">
            {activeTab === "projects"
              ? "Project Board"
              : activeTab === "tasks"
                ? "Task Center"
                : "Calendar View"}
          </h1>
        </div>

        {activeTab === "projects" ? (
          <section className="no-scrollbar -mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8">
            <div className="flex min-w-max gap-5 sm:gap-6">
              {visibleColumns.map((column) => (
                <BoardColumn
                  key={column.id}
                  column={column}
                  compactCards={settings.compactCards}
                  highlightUrgent={settings.highlightUrgent}
                  isDropTarget={draggedProjectId !== null}
                  onOpenCard={openCard}
                  onDragProject={setDraggedProjectId}
                  onDropProject={handleDropProject}
                  projects={columnProjects(filteredProjects, column.id)}
                  showHints={settings.showHints}
                />
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "tasks" ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tasksView.length ? (
              tasksView.map((task) => (
                <button
                  key={task.id}
                  className="rounded-[1.5rem] bg-white p-5 text-left shadow-[0_8px_20px_rgba(24,28,30,0.05)]"
                  onClick={() => handleToggleTask(task.projectId, task.taskIndex)}
                  type="button"
                >
                  <p className="nav-font text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                    {task.projectTitle}
                  </p>
                  <h3 className="headline-font mt-3 text-lg font-bold text-[var(--foreground)]">
                    {task.label}
                  </h3>
                  <p className="nav-font mt-3 text-sm text-[var(--muted-soft)]">
                    {task.done ? "Completada" : "Pendiente"} · {task.status.replaceAll("_", " ")}
                  </p>
                </button>
              ))
            ) : (
              <div className="nav-font rounded-[1.5rem] bg-white p-6 text-[var(--muted)] shadow-[0_8px_20px_rgba(24,28,30,0.05)]">
                No hay tareas para la busqueda actual.
              </div>
            )}
          </section>
        ) : null}

        {activeTab === "calendar" ? (
          <section className="grid gap-4 lg:grid-cols-2">
            {calendarView.length ? (
              calendarView.map((project) => (
                <button
                  key={project.id}
                  className="rounded-[1.75rem] bg-white p-6 text-left shadow-[0_8px_20px_rgba(24,28,30,0.05)]"
                  onClick={() => openCard(project)}
                  type="button"
                >
                  <p className="nav-font text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                    {formatDate(project.lastUpdate)}
                  </p>
                  <h3 className="headline-font mt-3 text-xl font-bold text-[var(--foreground)]">
                    {project.title}
                  </h3>
                  <p className="nav-font mt-3 text-sm leading-6 text-[var(--muted-soft)]">
                    {project.summary}
                  </p>
                </button>
              ))
            ) : (
              <div className="nav-font rounded-[1.5rem] bg-white p-6 text-[var(--muted)] shadow-[0_8px_20px_rgba(24,28,30,0.05)]">
                No hay proyectos para el calendario actual.
              </div>
            )}
          </section>
        ) : null}
      </main>

      <button
        aria-label="Agregar tarjeta"
        className="fixed bottom-6 right-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-[0_24px_50px_rgba(0,64,223,0.3)] transition hover:scale-105 sm:bottom-8 sm:right-8 sm:h-20 sm:w-20"
        onClick={() => setOverlay("add")}
        type="button"
      >
        <span className="text-4xl font-light leading-none sm:text-5xl">+</span>
      </button>

      {overlay === "notifications" ? (
        <Overlay
          onClose={() => setOverlay(null)}
          subtitle="Actividad reciente del tablero y avisos de cambios."
          title="Notifications"
        >
          <div className="space-y-3">
            {board.activity.map((entry) => (
              <div key={entry.id} className="rounded-[1.25rem] bg-[#f7f9fb] p-4">
                <p className="headline-font text-sm font-bold text-[var(--foreground)]">{entry.projectTitle}</p>
                <p className="nav-font mt-2 text-sm leading-6 text-[var(--muted)]">{entry.summary}</p>
                <p className="nav-font mt-3 text-xs uppercase tracking-[0.16em] text-[var(--muted-soft)]">
                  {entry.author} · {formatDate(entry.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </Overlay>
      ) : null}

      {overlay === "settings" ? (
        <Overlay
          onClose={() => setOverlay(null)}
          subtitle="Preferencias visuales de esta sesion."
          title="Settings"
        >
          <div className="space-y-3">
            {[
              ["compactCards", "Compact cards"],
              ["showHints", "Show board hints"],
              ["highlightUrgent", "Highlight urgent items"],
            ].map(([key, label]) => (
              <button
                key={key}
                className="flex w-full items-center justify-between rounded-[1.25rem] bg-[#f7f9fb] px-4 py-4 text-left"
                onClick={() =>
                  setSettings((current) => ({
                    ...current,
                    [key]: !current[key as keyof typeof current],
                  }))
                }
                type="button"
              >
                <span className="nav-font text-[var(--foreground)]">{label}</span>
                <span
                  className={`nav-font rounded-full px-3 py-1 text-xs font-semibold ${
                    settings[key as keyof typeof settings]
                      ? "bg-[#e8f0ff] text-[var(--primary)]"
                      : "bg-[#eceff3] text-[var(--muted)]"
                  }`}
                >
                  {settings[key as keyof typeof settings] ? "ON" : "OFF"}
                </span>
              </button>
            ))}
          </div>
        </Overlay>
      ) : null}

      {overlay === "profile" && !selectedCard ? (
        <Overlay
          onClose={() => setOverlay(null)}
          subtitle="Sesion activa en este tablero."
          title="Profile"
        >
          <div className="rounded-[1.75rem] bg-[#f7f9fb] p-6">
            <div className="headline-font flex h-16 w-16 items-center justify-center rounded-full bg-[#eef2ff] text-xl font-bold text-[var(--primary)]">
              {initialsFromEmail(authEmail || HARDCODED_EMAIL)}
            </div>
            <h3 className="headline-font mt-4 text-xl font-bold text-[var(--foreground)]">Maria</h3>
            <p className="nav-font mt-2 text-sm text-[var(--muted-soft)]">
              {authEmail || HARDCODED_EMAIL}
            </p>
            <p className="nav-font mt-2 text-sm text-[var(--muted)]">Owner · Workspace principal</p>
            <p className="nav-font mt-5 text-sm leading-6 text-[var(--muted-soft)]">
              Sesion simulada como usuaria logueada. Desde aca podemos luego conectar autenticacion real.
            </p>
          </div>
        </Overlay>
      ) : null}

      {overlay === "login" ? (
        <Overlay
          onClose={() => setOverlay(null)}
          subtitle="Acceso temporal hardcodeado para avanzar rapido."
          title="Login"
        >
          <form className="space-y-4" onSubmit={handleLogin}>
            <label className="nav-font block text-sm text-[var(--foreground)]">
              Email
              <input
                className="mt-2 w-full rounded-[1rem] border-none bg-[#f4f6f9] px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--primary)]/30"
                onChange={(event) => setLoginEmail(event.target.value)}
                type="text"
                value={loginEmail}
              />
            </label>
            <label className="nav-font block text-sm text-[var(--foreground)]">
              Password
              <input
                className="mt-2 w-full rounded-[1rem] border-none bg-[#f4f6f9] px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--primary)]/30"
                onChange={(event) => setLoginPassword(event.target.value)}
                type="password"
                value={loginPassword}
              />
            </label>
            {loginError ? <p className="nav-font text-sm text-[#ba1a1a]">{loginError}</p> : null}
            <button
              className="nav-font w-full rounded-full bg-[linear-gradient(135deg,var(--primary),var(--primary-strong))] px-4 py-3 text-sm font-semibold text-white"
              type="submit"
            >
              Entrar
            </button>
          </form>
        </Overlay>
      ) : null}

      {overlay === "card" && selectedCard ? (
        <Overlay
          onClose={() => setOverlay(null)}
          subtitle={selectedCard.repository}
          title={selectedCard.title}
        >
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {visibleColumns.map((column) => (
                <button
                  key={column.id}
                  className={`nav-font rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                    selectedCard.status === column.id
                      ? "bg-[#eef2ff] text-[var(--primary)]"
                      : "bg-[#eceff3] text-[var(--muted)]"
                  }`}
                  onClick={() => handleMoveProject(selectedCard.id, column.id)}
                  type="button"
                >
                  {column.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedCard.tags.map((tag) => (
                <span
                  key={tag}
                  className="nav-font rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]"
                >
                  {tag}
                </span>
              ))}
            </div>
            <p className="nav-font text-sm leading-6 text-[var(--muted)]">{selectedCard.summary}</p>
            <div className="rounded-[1.25rem] bg-[#f7f9fb] p-4">
              <p className="nav-font text-xs uppercase tracking-[0.16em] text-[var(--muted-soft)]">
                Details
              </p>
              <ul className="nav-font mt-3 space-y-2 text-sm text-[var(--foreground)]">
                {selectedCard.details.length ? (
                  selectedCard.details.map((detail) => <li key={detail}>• {detail}</li>)
                ) : (
                  <li>Sin detalles adicionales por ahora.</li>
                )}
              </ul>
            </div>
            <div className="rounded-[1.25rem] bg-[#f7f9fb] p-4">
              <p className="nav-font text-xs uppercase tracking-[0.16em] text-[var(--muted-soft)]">
                Tasks
              </p>
              <ul className="nav-font mt-3 space-y-2 text-sm text-[var(--foreground)]">
                {selectedCard.tasks.length ? (
                  selectedCard.tasks.map((task) => (
                    <li key={task.label}>{task.done ? "✓" : "○"} {task.label}</li>
                  ))
                ) : (
                  <li>Sin checklist todavia.</li>
                )}
              </ul>
            </div>
            <form className="space-y-3 rounded-[1.25rem] bg-[#f7f9fb] p-4" onSubmit={handleSaveCard}>
              <p className="nav-font text-xs uppercase tracking-[0.16em] text-[var(--muted-soft)]">
                Edit card
              </p>
              <input
                className="w-full rounded-[1rem] border-none bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--primary)]/30"
                defaultValue={selectedCard.title}
                name="title"
                type="text"
              />
              <input
                className="w-full rounded-[1rem] border-none bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--primary)]/30"
                defaultValue={selectedCard.repository}
                name="repository"
                type="text"
              />
              <textarea
                className="min-h-24 w-full rounded-[1rem] border-none bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--primary)]/30"
                defaultValue={selectedCard.summary}
                name="summary"
              />
              <input
                className="w-full rounded-[1rem] border-none bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--primary)]/30"
                defaultValue={selectedCard.tags.join(", ")}
                name="tags"
                type="text"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  className="rounded-[1rem] border-none bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--primary)]/30"
                  defaultValue={selectedCard.status}
                  name="status"
                >
                  <option value="backlog">Backlog</option>
                  <option value="in_progress">In Progress</option>
                  <option value="on_hold">On Hold</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
                <select
                  className="rounded-[1rem] border-none bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--primary)]/30"
                  defaultValue={selectedCard.priority}
                  name="priority"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <button
                className="nav-font w-full rounded-full bg-[linear-gradient(135deg,var(--primary),var(--primary-strong))] px-4 py-3 text-sm font-semibold text-white"
                type="submit"
              >
                Guardar cambios
              </button>
            </form>
          </div>
        </Overlay>
      ) : null}

      {overlay === "add" ? (
        <Overlay
          onClose={() => setOverlay(null)}
          subtitle="Crea una tarjeta nueva y guardala en el tablero."
          title="New Card"
        >
          <form className="space-y-4" onSubmit={handleCreateCard}>
            <label className="nav-font block text-sm text-[var(--foreground)]">
              Titulo
              <input
                className="mt-2 w-full rounded-[1rem] border-none bg-[#f4f6f9] px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--primary)]/30"
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
                type="text"
                value={form.title}
              />
            </label>
            <label className="nav-font block text-sm text-[var(--foreground)]">
              Repository
              <input
                className="mt-2 w-full rounded-[1rem] border-none bg-[#f4f6f9] px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--primary)]/30"
                onChange={(event) => setForm((current) => ({ ...current, repository: event.target.value }))}
                required
                type="text"
                value={form.repository}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="nav-font block text-sm text-[var(--foreground)]">
                Status
                <select
                  className="mt-2 w-full rounded-[1rem] border-none bg-[#f4f6f9] px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--primary)]/30"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as ProjectStatus,
                    }))
                  }
                  value={form.status}
                >
                  <option value="backlog">Backlog</option>
                  <option value="in_progress">In Progress</option>
                  <option value="on_hold">On Hold</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </label>
              <label className="nav-font block text-sm text-[var(--foreground)]">
                Priority
                <select
                  className="mt-2 w-full rounded-[1rem] border-none bg-[#f4f6f9] px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--primary)]/30"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      priority: event.target.value as "low" | "medium" | "high",
                    }))
                  }
                  value={form.priority}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>
            <label className="nav-font block text-sm text-[var(--foreground)]">
              Tags
              <input
                className="mt-2 w-full rounded-[1rem] border-none bg-[#f4f6f9] px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--primary)]/30"
                onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                placeholder="frontend, kanban, github"
                type="text"
                value={form.tags}
              />
            </label>
            <label className="nav-font block text-sm text-[var(--foreground)]">
              Summary
              <textarea
                className="mt-2 min-h-28 w-full rounded-[1rem] border-none bg-[#f4f6f9] px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--primary)]/30"
                onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                required
                value={form.summary}
              />
            </label>
            {createError ? <p className="nav-font text-sm text-[#ba1a1a]">{createError}</p> : null}
            <button
              className="nav-font w-full rounded-full bg-[linear-gradient(135deg,var(--primary),var(--primary-strong))] px-4 py-3 text-sm font-semibold text-white"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Guardando..." : "Crear tarjeta"}
            </button>
          </form>
        </Overlay>
      ) : null}
    </div>
  );
}

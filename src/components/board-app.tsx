"use client";

import Image from "next/image";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  AgentUpdatePayload,
  BoardData,
  KanbanProject,
  ProjectStatus,
  SessionUser,
} from "@/lib/types";

const visibleColumns: {
  id: ProjectStatus;
  label: string;
  tone: string;
  surface: string;
}[] = [
  {
    id: "backlog",
    label: "Pendiente",
    tone: "bg-[var(--primary)] shadow-[0_0_12px_rgba(0,64,223,0.35)]",
    surface: "bg-[#eef2f4]",
  },
  {
    id: "in_progress",
    label: "En curso",
    tone: "bg-[var(--secondary-deep)] shadow-[0_0_12px_rgba(160,65,0,0.22)]",
    surface: "bg-[var(--surface-container)]",
  },
  {
    id: "on_hold",
    label: "En pausa",
    tone: "bg-[var(--hold)] shadow-[0_0_12px_rgba(116,81,184,0.22)]",
    surface: "bg-[#ece9f3]",
  },
  {
    id: "review",
    label: "Revisión",
    tone: "bg-[#d97706] shadow-[0_0_12px_rgba(217,119,6,0.22)]",
    surface: "bg-[#f6eee3]",
  },
  {
    id: "done",
    label: "Hecho",
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

const DEFAULT_LOGIN_EMAIL = "marianoparisi59gmail.com";
const emptyBoard: BoardData = {
  workspace: {
    name: "Kansito",
    description: "",
    agentChannel: "POST /api/agent-updates",
    lastSyncedAt: new Date(0).toISOString(),
  },
  projects: [],
  activity: [],
};

function columnProjects(projects: KanbanProject[], column: ProjectStatus) {
  return projects.filter((project) => project.status === column);
}

function cardLabel(project: KanbanProject) {
  return project.tags[0] ?? project.repository.split("/")[1] ?? "project";
}

function cardMeta(project: KanbanProject) {
  if (project.status === "done") return "Completado";
  if (project.status === "on_hold") return "En pausa";
  if (project.priority === "high") return "Urgente";
  return project.status === "review" ? "En revisión" : "Activo";
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
  const [closing, setClosing] = useState(false);

  function handleClose() {
    setClosing(true);
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end ${closing ? "animate-modal-backdrop-out" : "animate-modal-backdrop-in"} bg-[rgba(24,28,30,0.16)] backdrop-blur-[2px]`}
    >
      <button aria-label="Cerrar" className="flex-1" onClick={handleClose} type="button" />
      <aside
        className={`h-full w-full max-w-md overflow-y-auto bg-[rgba(247,250,252,0.92)] backdrop-blur-[28px] p-8 shadow-[-24px_0_60px_rgba(24,28,30,0.10)] ${closing ? "animate-modal-dialog-out" : "animate-drawer-slide-in"}`}
        onAnimationEnd={() => { if (closing) onClose(); }}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="headline-font text-2xl font-bold text-[var(--foreground)]">{title}</h2>
            {subtitle ? <p className="nav-font mt-2 text-sm text-[var(--muted)]">{subtitle}</p> : null}
          </div>
          <button
            className="nav-font rounded-full bg-[var(--surface-container)] px-4 py-1.5 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-variant)] active:scale-[0.97]"
            onClick={handleClose}
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

function CenteredPanel({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [closing, setClosing] = useState(false);

  function handleClose() {
    setClosing(true);
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[rgba(24,28,30,0.28)] backdrop-blur-[4px] ${closing ? "animate-modal-backdrop-out" : "animate-modal-backdrop-in"}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={`w-full max-w-md overflow-hidden rounded-[2rem] bg-[rgba(247,250,252,0.97)] backdrop-blur-[32px] shadow-[0_32px_80px_rgba(24,28,30,0.18),0_8px_32px_rgba(24,28,30,0.08)] ${closing ? "animate-modal-dialog-out" : "animate-modal-dialog-in"}`}
        onAnimationEnd={() => { if (closing) onClose(); }}
      >
        <div className="flex items-start justify-between gap-4 px-7 pt-7 pb-5">
          <div>
            <h2 className="headline-font text-xl font-extrabold text-[var(--foreground)]">{title}</h2>
            {subtitle ? <p className="nav-font mt-1 text-sm text-[var(--muted-soft)]">{subtitle}</p> : null}
          </div>
          <button
            aria-label="Cerrar"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--surface-container)] text-[var(--muted)] transition hover:bg-[var(--surface-variant)] hover:text-[var(--foreground)] active:scale-[0.93]"
            onClick={handleClose}
            type="button"
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
            </svg>
          </button>
        </div>
        <div className="px-7 pb-7">{children}</div>
      </div>
    </div>
  );
}

function LoginGate({
  loginEmail,
  loginPassword,
  loginError,
  authLoading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: {
  loginEmail: string;
  loginPassword: string;
  loginError: string;
  authLoading: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,#eef2ff_0%,#f7fafc_38%,#eef2f4_100%)] px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-16 h-56 w-56 rounded-full bg-[rgba(45,91,255,0.10)] blur-3xl" />
        <div className="absolute -right-12 bottom-12 h-72 w-72 rounded-full bg-[rgba(254,107,0,0.08)] blur-3xl" />
      </div>

      <div className="relative grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <p className="section-title mb-4">Kansito workspace</p>
            <h1 className="headline-font text-5xl font-extrabold leading-[0.95] text-[var(--foreground)]">
              Entrá primero.
              <br />
              El tablero viene después.
            </h1>
            <p className="nav-font mt-6 max-w-lg text-base leading-7 text-[var(--muted)]">
              Acceso simple y directo para entrar a tu espacio de proyectos. Una vez adentro, ves
              el kanban, movés tarjetas y seguís el estado real del trabajo.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ["Proyectos", "Vista principal para seguir tarjetas y estados."],
                ["Tareas", "Tareas accionables por proyecto con marcado rápido."],
                ["Calendario", "Línea temporal de actividad y cambios recientes."],
              ].map(([title, copy]) => (
                <div
                  key={title}
                  className="rounded-[1.75rem] bg-white/70 p-5 shadow-[0_12px_36px_rgba(24,28,30,0.05)] backdrop-blur-[10px]"
                >
                  <p className="headline-font text-lg font-bold text-[var(--foreground)]">{title}</p>
                  <p className="nav-font mt-2 text-sm leading-6 text-[var(--muted-soft)]">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] bg-[rgba(247,250,252,0.92)] p-6 shadow-[0_32px_80px_rgba(24,28,30,0.14),0_8px_32px_rgba(24,28,30,0.06)] backdrop-blur-[28px] sm:p-8">
          <div className="mb-8 flex items-center gap-4">
            <div className="headline-font flex h-14 w-14 items-center justify-center rounded-[1.35rem] bg-[linear-gradient(135deg,var(--primary),var(--primary-strong))] text-lg font-bold text-white shadow-[0_18px_32px_rgba(0,64,223,0.25)]">
              KS
            </div>
            <div>
              <p className="headline-font text-2xl font-extrabold text-[var(--foreground)]">Kansito</p>
              <p className="nav-font mt-1 text-sm text-[var(--muted-soft)]">Acceso seguro para entrar al tablero</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="nav-font block text-sm font-medium text-[var(--foreground)]">
              Email
              <input
                className="mt-2 w-full rounded-[1rem] border-none bg-white px-4 py-3 text-sm text-[var(--foreground)] shadow-[inset_0_0_0_1px_rgba(224,227,229,0.55)] focus:ring-2 focus:ring-[var(--primary)]/30 focus:outline-none"
                onChange={(event) => onEmailChange(event.target.value)}
                type="text"
                value={loginEmail}
              />
            </label>

            <label className="nav-font block text-sm font-medium text-[var(--foreground)]">
              Password
              <input
                className="mt-2 w-full rounded-[1rem] border-none bg-white px-4 py-3 text-sm text-[var(--foreground)] shadow-[inset_0_0_0_1px_rgba(224,227,229,0.55)] focus:ring-2 focus:ring-[var(--primary)]/30 focus:outline-none"
                onChange={(event) => onPasswordChange(event.target.value)}
                type="password"
                value={loginPassword}
              />
            </label>

            {loginError ? <p className="nav-font text-sm text-[#ba1a1a]">{loginError}</p> : null}

            <button
              disabled={authLoading}
              className="nav-font mt-2 w-full rounded-full bg-[linear-gradient(135deg,var(--primary),var(--primary-strong))] px-4 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
              type="submit"
            >
              {authLoading ? "Entrando..." : "Entrar a Kansito"}
            </button>
          </form>

          <div className="mt-6 rounded-[1.5rem] bg-white/70 p-4">
            <p className="nav-font text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Acceso principal
            </p>
            <p className="nav-font mt-2 text-sm leading-6 text-[var(--muted-soft)]">
              El acceso valida usuario y password contra la base MySQL configurada para el
              proyecto.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function IconEdit() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function Dropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string; cls: string }>;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <div ref={ref} className="relative">
      <button
        className={`flex items-center gap-1.5 rounded-full border-none px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] transition hover:opacity-80 ${current.cls}`}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {current.label}
        <svg aria-hidden="true" className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
        </svg>
      </button>
      {open && (
        <div className="animate-dropdown-reveal absolute left-0 top-full z-20 mt-1.5 min-w-[160px] overflow-hidden rounded-[1.25rem] bg-[rgba(247,250,252,0.98)] shadow-[0_16px_48px_rgba(24,28,30,0.14),0_4px_12px_rgba(24,28,30,0.06)] backdrop-blur-[24px]">
          {options.map((opt) => (
            <button
              key={opt.value}
              className={`block w-full px-4 py-2.5 text-left text-xs font-extrabold uppercase tracking-[0.13em] transition hover:bg-[var(--surface-low)] ${
                opt.value === value ? "opacity-100" : "opacity-55 hover:opacity-80"
              } ${opt.cls.replace(/bg-\[[^\]]+\]/, "bg-transparent")}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              type="button"
            >
              {opt.value === value && (
                <span className="mr-1.5 opacity-70">✓</span>
              )}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CardModal({
  project,
  onClose,
  onMove,
  onPatch,
}: {
  project: KanbanProject;
  onClose: () => void;
  onMove: (projectId: string, status: ProjectStatus) => void;
  onPatch: (fields: Record<string, unknown>) => Promise<void>;
}) {
  const [editStatus, setEditStatus] = useState<ProjectStatus>(project.status);
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high">(project.priority);
  const [editing, setEditing] = useState<null | "title" | "summary" | "tags">(null);
  const [editTitle, setEditTitle] = useState(project.title);
  const [editRepo, setEditRepo] = useState(project.repository);
  const [editSummary, setEditSummary] = useState(project.summary);
  const [editTags, setEditTags] = useState(project.tags.join(", "));
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [closing, setClosing] = useState(false);

  function handleClose() {
    setClosing(true);
  }

  useEffect(() => {
    setEditStatus(project.status);
    setEditPriority(project.priority);
    setEditTitle(project.title);
    setEditRepo(project.repository);
    setEditSummary(project.summary);
    setEditTags(project.tags.join(", "));
  }, [project]);

  const statusOptions: Array<{ value: ProjectStatus; label: string; cls: string }> = [
    { value: "backlog", label: "Pendiente", cls: "bg-[#eef2ff] text-[var(--chip-blue)]" },
    { value: "in_progress", label: "En curso", cls: "bg-[#fff3eb] text-[var(--chip-orange)]" },
    { value: "on_hold", label: "En pausa", cls: "bg-[#f3eeff] text-[var(--chip-violet)]" },
    { value: "review", label: "Revisión", cls: "bg-[#fff3eb] text-[var(--chip-orange)]" },
    { value: "done", label: "Hecho", cls: "bg-[#eaf5ef] text-[var(--chip-green)]" },
  ];

  const priorityOptions: Array<{ value: string; label: string; cls: string }> = [
    { value: "low", label: "Prioridad baja", cls: "bg-[#f0faf4] text-[var(--tertiary)]" },
    { value: "medium", label: "Prioridad media", cls: "bg-[#fff8ec] text-[var(--secondary-deep)]" },
    { value: "high", label: "Prioridad alta", cls: "bg-[#fff1f1] text-[#ba1a1a]" },
  ];

  async function handleStatusChange(status: ProjectStatus) {
    setEditStatus(status);
    await onMove(project.id, status);
  }

  async function handlePriorityChange(priority: "low" | "medium" | "high") {
    setEditPriority(priority);
    await onPatch({ priority });
  }

  async function saveNewTask() {
    if (!newTaskLabel.trim()) return;
    await onPatch({ tasks: [...project.tasks, { label: newTaskLabel.trim(), done: false }] });
    setNewTaskLabel("");
    setAddingTask(false);
  }

  async function saveEditing() {
    if (editing === "title") {
      await onPatch({ title: editTitle, repository: editRepo });
    } else if (editing === "summary") {
      await onPatch({ summary: editSummary });
    } else if (editing === "tags") {
      const tags = editTags.split(",").map((t) => t.trim()).filter(Boolean);
      await onPatch({ tags });
    }
    setEditing(null);
  }

  const editBtn = (field: "title" | "summary" | "tags") => (
    <button
      className="flex-shrink-0 flex items-center gap-1.5 rounded-full bg-[var(--surface-container)] px-3 py-1.5 text-[0.72rem] font-medium text-[var(--muted)] transition hover:bg-[var(--surface-variant)] hover:text-[var(--foreground)] active:scale-[0.96]"
      onClick={() => setEditing(field)}
      type="button"
    >
      <IconEdit />
      Editar
    </button>
  );

  const saveRow = (
    <div className="flex gap-2 pt-1">
      <button
        className="nav-font rounded-full bg-[linear-gradient(135deg,var(--primary),var(--primary-strong))] px-4 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
        onClick={saveEditing}
        type="button"
      >
        Guardar
      </button>
      <button
        className="nav-font rounded-full bg-[var(--surface-container)] px-4 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:bg-[var(--surface-variant)]"
        onClick={() => setEditing(null)}
        type="button"
      >
        Cancelar
      </button>
    </div>
  );

  const inputCls = "w-full rounded-[0.75rem] border-none bg-[var(--surface-card)] px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--primary)]/30 focus:outline-none";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[rgba(24,28,30,0.30)] backdrop-blur-[4px] ${closing ? "animate-modal-backdrop-out" : "animate-modal-backdrop-in"}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[2rem] bg-[rgba(247,250,252,0.97)] backdrop-blur-[32px] shadow-[0_32px_80px_rgba(24,28,30,0.18),0_8px_32px_rgba(24,28,30,0.08)] overflow-hidden ${closing ? "animate-modal-dialog-out" : "animate-modal-dialog-in"}`}
        onAnimationEnd={() => { if (closing) onClose(); }}
      >
        {/* Status accent bar — reacts to editStatus */}
        <div className={`h-1.5 w-full flex-shrink-0 transition-colors duration-300 ${barStyles[editStatus]}`} />

        {/* Header: dropdowns + close */}
        <div className="px-7 pt-5 pb-4 flex items-center gap-3 flex-shrink-0 flex-wrap">
          <Dropdown
            options={statusOptions}
            value={editStatus}
            onChange={(v) => handleStatusChange(v as ProjectStatus)}
          />
          <Dropdown
            options={priorityOptions}
            value={editPriority}
            onChange={(v) => handlePriorityChange(v as "low" | "medium" | "high")}
          />
          <button
            aria-label="Cerrar"
            className="ml-auto flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--surface-container)] text-[var(--muted)] transition hover:bg-[var(--surface-variant)] hover:text-[var(--foreground)] active:scale-[0.93]"
            onClick={handleClose}
            type="button"
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto no-scrollbar px-7 pb-7 space-y-5">

          {/* Title + Repo — inline edit */}
          {editing === "title" ? (
            <div className="rounded-[1.5rem] bg-[var(--surface-low)] p-4 space-y-2">
              <p className="section-title mb-2">Título y repositorio</p>
              <input
                autoFocus
                className={`${inputCls} text-[1.1rem] font-bold`}
                onChange={(e) => setEditTitle(e.target.value)}
                value={editTitle}
              />
              <input
                className={inputCls}
                onChange={(e) => setEditRepo(e.target.value)}
                placeholder="owner/repo"
                value={editRepo}
              />
              {saveRow}
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="headline-font text-[1.65rem] font-extrabold leading-[1.15] text-[var(--foreground)]">
                  {project.title}
                </h2>
                <p className="nav-font mt-1.5 text-sm text-[var(--muted-soft)]">{project.repository}</p>
              </div>
              {editBtn("title")}
            </div>
          )}

          {/* Tags — inline edit */}
          {editing === "tags" ? (
            <div className="rounded-[1.5rem] bg-[var(--surface-low)] p-4 space-y-2">
              <p className="section-title mb-2">Tags · separados por coma</p>
              <input
                autoFocus
                className={inputCls}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="frontend, api, bug"
                value={editTags}
              />
              {saveRow}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="nav-font rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]"
                >
                  {tag}
                </span>
              ))}
              {editBtn("tags")}
            </div>
          )}

          {/* Summary — inline edit */}
          {editing === "summary" ? (
            <div className="rounded-[1.5rem] bg-[var(--surface-low)] p-4 space-y-2">
              <p className="section-title mb-2">Descripción</p>
              <textarea
                autoFocus
                className={`${inputCls} min-h-24 resize-none leading-[1.7]`}
                onChange={(e) => setEditSummary(e.target.value)}
                value={editSummary}
              />
              {saveRow}
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <p className="nav-font text-[0.95rem] leading-[1.72] text-[var(--muted)]">{project.summary}</p>
              {editBtn("summary")}
            </div>
          )}

          {/* Details + Tasks 2-col */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.5rem] bg-[var(--surface-low)] p-5">
              <p className="section-title mb-3">Details</p>
              <ul className="nav-font space-y-2 text-sm text-[var(--foreground)]">
                {project.details.length ? (
                  project.details.map((detail) => (
                    <li key={detail} className="flex gap-2">
                      <span className="text-[var(--muted-soft)] flex-shrink-0">·</span>
                      {detail}
                    </li>
                  ))
                ) : (
                  <li className="text-[var(--muted-soft)]">Sin detalles adicionales.</li>
                )}
              </ul>
            </div>
            <div className="rounded-[1.5rem] bg-[var(--surface-low)] p-5">
              <p className="section-title mb-3">Tareas</p>
              <ul className="nav-font space-y-1 text-sm text-[var(--foreground)]">
                {project.tasks.length ? (
                  project.tasks.map((task, i) => (
                    <li key={i}>
                      <button
                        className="flex w-full items-start gap-2.5 rounded-[0.75rem] px-1 py-1.5 text-left transition hover:bg-[var(--surface-container)]"
                        onClick={() => onPatch({ action: "toggle_task", taskIndex: i })}
                        type="button"
                      >
                        <span className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border transition ${
                          task.done
                            ? "border-[var(--tertiary)] bg-[var(--tertiary)] text-white"
                            : "border-[var(--muted-soft)] text-transparent"
                        }`}>
                          {task.done && (
                            <svg aria-hidden="true" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24">
                              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                            </svg>
                          )}
                        </span>
                        <span className={`leading-[1.5] ${task.done ? "line-through opacity-40" : ""}`}>{task.label}</span>
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="py-1 text-[var(--muted-soft)]">Sin checklist todavía.</li>
                )}
              </ul>
              {addingTask ? (
                <div className="mt-3 flex gap-2">
                  <input
                    autoFocus
                    className="flex-1 rounded-[0.75rem] border-none bg-[var(--surface-card)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                    onChange={(e) => setNewTaskLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveNewTask();
                      if (e.key === "Escape") { setAddingTask(false); setNewTaskLabel(""); }
                    }}
                    placeholder="Nueva tarea…"
                    value={newTaskLabel}
                  />
                  <button
                    className="nav-font rounded-full bg-[linear-gradient(135deg,var(--primary),var(--primary-strong))] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                    onClick={saveNewTask}
                    type="button"
                  >
                    Agregar
                  </button>
                </div>
              ) : (
                <button
                  className="nav-font mt-3 flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-[var(--muted-soft)] transition hover:text-[var(--primary)]"
                  onClick={() => setAddingTask(true)}
                  type="button"
                >
                  <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                  </svg>
                  Agregar tarea
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
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
      className={`kanban-column ${column.surface} flex min-h-[66vh] flex-col gap-4 p-4 transition sm:min-h-[69vh] sm:gap-5 sm:p-5 ${
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
          projects.map((project, index) => {
            const done = project.status === "done";
            const urgent = !done && project.priority === "high";
            const onHold = project.status === "on_hold";

            return (
              <button
                key={project.id}
                className={`kanban-card kanban-card-animated relative block w-full overflow-hidden text-left transition-transform duration-200 hover:-translate-y-1 ${
                  compactCards ? "p-3.5 sm:p-4" : "p-4 sm:p-5"
                } ${
                  done ? "opacity-85 grayscale-[0.2]" : ""
                }`}
                style={{ "--card-delay": `${index * 55}ms` } as React.CSSProperties}
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
                      ? "min-h-[122px] gap-2.5 sm:min-h-[132px]"
                      : "min-h-[144px] gap-3 sm:min-h-[156px] sm:gap-4"
                  }`}
                >
                  <span className={`nav-font self-start rounded-full px-2.5 py-0.5 text-[0.68rem] font-extrabold uppercase tracking-[0.15em] ${tagStyles[project.status]}`}>
                    {cardLabel(project)}
                  </span>
                  <h3
                    className={`headline-font max-w-[14ch] text-[0.92rem] font-bold leading-[1.22] text-[var(--foreground)] sm:text-[1.04rem] ${
                      done ? "line-through decoration-[rgba(60,121,86,0.35)]" : ""
                    }`}
                  >
                    {project.title}
                  </h3>
                  {showHints ? (
                    <p className="nav-font text-[0.72rem] leading-4 text-[var(--muted-soft)]">
                      {project.repository}
                    </p>
                  ) : null}
                  <div
                    className={`nav-font mt-auto flex items-center justify-between text-[0.8rem] sm:text-[0.86rem] ${
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

export function BoardApp({
  initialBoard,
  initialAuthEmail,
  initialUserName,
}: {
  initialBoard: BoardData | null;
  initialAuthEmail: string | null;
  initialUserName: string | null;
}) {
  const [board, setBoard] = useState<BoardData | null>(initialBoard);
  const [activeTab, setActiveTab] = useState<AppTab>("projects");
  const [overlay, setOverlay] = useState<OverlayState>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(initialAuthEmail));
  const [authEmail, setAuthEmail] = useState(initialAuthEmail ?? "");
  const [userName, setUserName] = useState(initialUserName ?? "Mariano Parisi");
  const [loginEmail, setLoginEmail] = useState(initialAuthEmail ?? DEFAULT_LOGIN_EMAIL);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
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

  const userMenuRef = useRef<HTMLDivElement>(null);
  const boardData = board ?? emptyBoard;

  useEffect(() => {
    if (!isUserMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isUserMenuOpen]);

  const deferredQuery = useDeferredValue(query.trim());

  const filteredProjects = useMemo(
    () => filterProjects(boardData.projects, deferredQuery),
    [boardData.projects, deferredQuery],
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

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setLoginError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
        }),
      });

      const json = (await response.json()) as {
        error?: string;
        user?: SessionUser;
      };

      if (!response.ok || !json.user) {
        throw new Error(json.error ?? "No se pudo iniciar sesión.");
      }

      setIsAuthenticated(true);
      setAuthEmail(json.user.email);
      setUserName(json.user.fullName);
      window.location.reload();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    setAuthLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setIsAuthenticated(false);
      setAuthEmail("");
      setUserName("Mariano Parisi");
      setBoard(null);
      setIsUserMenuOpen(false);
      setOverlay(null);
      window.location.reload();
    }
  }

  if (!isAuthenticated) {
    return (
      <LoginGate
        authLoading={authLoading}
        loginEmail={loginEmail}
        loginError={loginError}
        loginPassword={loginPassword}
        onEmailChange={setLoginEmail}
        onPasswordChange={setLoginPassword}
        onSubmit={handleLogin}
      />
    );
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
      setBoard((current) => {
        const baseBoard = current ?? emptyBoard;

        return {
          ...baseBoard,
          projects: baseBoard.projects.map((project) =>
          project.id === json.project!.id ? json.project! : project,
          ),
        };
      });
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

  async function handlePatchCard(fields: Record<string, unknown>) {
    if (!selectedCard) return;
    await patchProject(selectedCard.id, fields);
  }

  async function handleCreateCard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError("");
    setIsSaving(true);

    try {
      const payload: AgentUpdatePayload = {
        owner: form.owner || userName,
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
        author: userName,
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
          const baseBoard = current ?? emptyBoard;
          const withoutDuplicate = baseBoard.projects.filter(
            (project) => project.id !== json.result!.project.id,
          );

          return {
            ...baseBoard,
            projects: [json.result!.project, ...withoutDuplicate],
            activity: [
              {
                id: `${json.result!.project.id}-manual`,
                projectId: json.result!.project.id,
                projectTitle: json.result!.project.title,
                createdAt: new Date().toISOString(),
                source: "cli" as const,
                author: userName,
                summary: json.result!.project.summary,
              },
              ...baseBoard.activity,
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
      <header className="sticky top-0 z-40 bg-[var(--surface)]/95 backdrop-blur shadow-[0_4px_28px_rgba(24,28,30,0.05)]">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-7">
          <div className="flex items-center gap-4 sm:gap-5">
            <span className="headline-font text-[1.2rem] font-extrabold text-[var(--foreground)] sm:text-[1.45rem]">
              Kansito
            </span>
            <nav className="hidden items-center gap-4 lg:flex">
              {(["projects", "tasks", "calendar"] as AppTab[]).map((tab) => (
                <button
                  key={tab}
                  className={`nav-font text-[0.88rem] rounded-full px-3 py-1.5 transition active:scale-[0.96] ${
                    activeTab === tab
                      ? "bg-[#eef2ff] font-semibold text-[var(--primary)] hover:bg-[#e4eaff]"
                      : "font-medium text-[var(--muted)] hover:bg-[var(--surface-container)] hover:text-[var(--foreground)]"
                  }`}
                  onClick={() => setActiveTab(tab)}
                  type="button"
                >
                  {tab === "projects"
                    ? "Proyectos"
                    : tab === "tasks"
                      ? "Tareas"
                      : "Calendario"}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <label className="hidden items-center gap-3 rounded-full bg-[#d7dce1] px-4 py-2 text-[var(--muted)] md:flex">
              <span className="text-[var(--muted-soft)]">
                <IconSearch />
              </span>
              <input
                className="nav-font w-36 border-none bg-transparent p-0 text-[0.88rem] text-[var(--foreground)] placeholder:text-[var(--muted-soft)] focus:ring-0 xl:w-52"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  activeTab === "projects"
                    ? "Buscar proyectos..."
                    : activeTab === "tasks"
                      ? "Buscar tareas..."
                      : "Buscar calendario..."
                }
                type="text"
                value={query}
              />
            </label>
            <div className="relative" ref={userMenuRef}>
              <button
                aria-expanded={isUserMenuOpen}
                className="flex items-center gap-2.5 rounded-full bg-white px-2 py-1.5 shadow-[0_8px_20px_rgba(24,28,30,0.06)]"
                onClick={() => setIsUserMenuOpen((current) => !current)}
                type="button"
              >
              <div className="headline-font flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#eef2ff] text-[0.78rem] font-bold text-[var(--primary)]">
                  {initialsFromEmail(authEmail)}
                </div>
                <div className="hidden sm:block">
                  <span className="nav-font text-[0.82rem] font-medium text-[var(--foreground)]">
                    {authEmail}
                  </span>
                </div>
                <span className="hidden text-[var(--muted)] sm:block">
                  <IconChevronDown />
                </span>
              </button>
              {isUserMenuOpen ? (
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
                    Notificaciones
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
                    Ajustes
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
                    Perfil
                  </button>
                  <button
                    className="nav-font flex w-full items-center gap-3 rounded-[1rem] px-3 py-2.5 text-left text-[0.95rem] text-[#ba1a1a] transition hover:bg-[#fdf1f1]"
                    onClick={handleLogout}
                    type="button"
                  >
                    Salir
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-4 py-6 sm:px-6 md:px-8 md:py-7">
        <div className="mb-7 sm:mb-8">
          <nav className="nav-font mb-2.5 flex flex-wrap items-center gap-2 text-[0.76rem] text-[var(--muted)] sm:text-[0.86rem]">
            <span>Espacio</span>
            <span>/</span>
            <span>{boardData.workspace.name}</span>
            <span>/</span>
            <span className="font-semibold text-[var(--primary)]">Kanban</span>
          </nav>
          <h1 className="headline-font text-[1.72rem] font-extrabold leading-none text-[var(--foreground)] sm:text-[2.05rem] md:text-[2.45rem]">
            {activeTab === "projects"
              ? "Tablero"
              : activeTab === "tasks"
                ? "Tareas"
                : "Calendario"}
          </h1>
        </div>

        {activeTab === "projects" ? (
          <section key="projects" className="animate-tab-fade-in no-scrollbar -mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8">
            <div className="flex min-w-max gap-4 sm:gap-5">
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
          <section key="tasks" className="animate-tab-fade-in grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tasksView.length ? (
              tasksView.map((task) => (
                <button
                  key={task.id}
                  className="kanban-card relative overflow-hidden p-4 text-left transition-transform duration-200 hover:-translate-y-0.5"
                  onClick={() => handleToggleTask(task.projectId, task.taskIndex)}
                  type="button"
                >
                  <div className={`absolute bottom-0 left-0 top-0 w-1.5 ${barStyles[task.status]}`} />
                  <div className="pl-2">
                    <p className="nav-font text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      {task.projectTitle}
                    </p>
                    <h3 className={`headline-font mt-2.5 text-[1rem] font-bold text-[var(--foreground)] ${task.done ? "line-through opacity-50" : ""}`}>
                      {task.label}
                    </h3>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className={`nav-font rounded-full px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-[0.14em] ${tagStyles[task.status]}`}>
                        {task.status.replaceAll("_", " ")}
                      </span>
                      <span className="nav-font text-xs text-[var(--muted-soft)]">
                        {task.done ? "Completada" : "Pendiente"}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="nav-font rounded-[1.5rem] bg-[var(--surface-card)] p-5 text-sm text-[var(--muted)] shadow-[0_8px_20px_rgba(24,28,30,0.04)]">
                No hay tareas para la busqueda actual.
              </div>
            )}
          </section>
        ) : null}

        {activeTab === "calendar" ? (
          <section key="calendar" className="animate-tab-fade-in grid gap-4 lg:grid-cols-2">
            {calendarView.length ? (
              calendarView.map((project) => (
                <button
                  key={project.id}
                  className="kanban-card relative overflow-hidden p-5 text-left transition-transform duration-200 hover:-translate-y-0.5"
                  onClick={() => openCard(project)}
                  type="button"
                >
                  <div className={`absolute bottom-0 left-0 top-0 w-1.5 ${barStyles[project.status]}`} />
                  <div className="pl-2">
                    <div className="flex items-center justify-between gap-4">
                      <p className="nav-font text-xs uppercase tracking-[0.16em] text-[var(--muted-soft)]">
                        {formatDate(project.lastUpdate)}
                      </p>
                      <span className={`nav-font rounded-full px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-[0.14em] ${tagStyles[project.status]}`}>
                        {project.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <h3 className="headline-font mt-2.5 text-[1.08rem] font-bold text-[var(--foreground)]">
                      {project.title}
                    </h3>
                    <p className="nav-font mt-2.5 text-[0.88rem] leading-5 text-[var(--muted-soft)]">
                      {project.summary}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="nav-font rounded-[1.5rem] bg-[var(--surface-card)] p-5 text-sm text-[var(--muted)] shadow-[0_8px_20px_rgba(24,28,30,0.04)]">
                No hay proyectos para el calendario actual.
              </div>
            )}
          </section>
        ) : null}
      </main>

      <button
        aria-label="Agregar tarjeta"
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--primary),var(--primary-strong))] text-white shadow-[0_24px_50px_rgba(0,64,223,0.35)] transition hover:scale-105 hover:shadow-[0_28px_56px_rgba(0,64,223,0.45)] active:scale-[0.97] sm:bottom-8 sm:right-8 sm:h-16 sm:w-16"
        onClick={() => setOverlay("add")}
        type="button"
      >
        <span className="text-3xl font-light leading-none sm:text-4xl">+</span>
      </button>

      {overlay === "notifications" ? (
        <Overlay
          onClose={() => setOverlay(null)}
          subtitle="Actividad reciente del tablero y avisos de cambios."
          title="Notificaciones"
        >
          <div className="space-y-3">
            {boardData.activity.map((entry) => (
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
        <CenteredPanel
          onClose={() => setOverlay(null)}
          subtitle="Preferencias visuales de esta sesión."
          title="Ajustes"
        >
          <div className="space-y-3">
            {[
              ["compactCards", "Tarjetas compactas"],
              ["showHints", "Mostrar contexto"],
              ["highlightUrgent", "Resaltar urgentes"],
            ].map(([key, label]) => (
              <button
                key={key}
                className="flex w-full items-center justify-between rounded-[1.25rem] bg-[#f7f9fb] px-4 py-4 text-left transition hover:bg-[var(--surface-container)] active:scale-[0.99]"
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
        </CenteredPanel>
      ) : null}

      {overlay === "profile" && !selectedCard ? (
        <CenteredPanel
          onClose={() => setOverlay(null)}
          subtitle="Sesión activa en este tablero."
          title="Perfil"
        >
          <div className="rounded-[1.75rem] bg-[#f7f9fb] p-6">
            <div className="headline-font flex h-16 w-16 items-center justify-center rounded-full bg-[#eef2ff] text-xl font-bold text-[var(--primary)]">
              {initialsFromEmail(authEmail || DEFAULT_LOGIN_EMAIL)}
            </div>
            <h3 className="headline-font mt-4 text-xl font-bold text-[var(--foreground)]">{userName}</h3>
            <p className="nav-font mt-2 text-sm text-[var(--muted-soft)]">
              {authEmail || DEFAULT_LOGIN_EMAIL}
            </p>
            <p className="nav-font mt-2 text-sm text-[var(--muted)]">Owner · Espacio principal</p>
            <p className="nav-font mt-5 text-sm leading-6 text-[var(--muted-soft)]">
              Sesión activa validada contra MySQL. Desde acá podemos seguir creciendo permisos y perfiles reales.
            </p>
          </div>
        </CenteredPanel>
      ) : null}

      {overlay === "card" && selectedCard ? (
        <CardModal
          project={selectedCard}
          onClose={() => setOverlay(null)}
          onMove={handleMoveProject}
          onPatch={handlePatchCard}
        />
      ) : null}

      {overlay === "add" ? (
        <CenteredPanel
          onClose={() => setOverlay(null)}
          subtitle="Crea una tarjeta nueva y guardala en el tablero."
          title="Nueva tarjeta"
        >
          <form className="space-y-4" onSubmit={handleCreateCard}>
            <div className="space-y-1.5">
              <label className="nav-font block text-xs font-semibold text-[var(--muted)]">Título</label>
              <input
                className="w-full rounded-[1rem] border-none bg-[var(--surface-container)] px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--primary)]/30 focus:outline-none"
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
                type="text"
                value={form.title}
              />
            </div>
            <div className="space-y-1.5">
              <label className="nav-font block text-xs font-semibold text-[var(--muted)]">Repositorio</label>
              <input
                className="w-full rounded-[1rem] border-none bg-[var(--surface-container)] px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--primary)]/30 focus:outline-none"
                onChange={(event) => setForm((current) => ({ ...current, repository: event.target.value }))}
                required
                type="text"
                value={form.repository}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="nav-font block text-xs font-semibold text-[var(--muted)]">Estado</label>
                <Dropdown
                  options={[
                    { value: "backlog", label: "Pendiente", cls: "bg-[#eef2ff] text-[var(--chip-blue)]" },
                    { value: "in_progress", label: "En curso", cls: "bg-[#fff3eb] text-[var(--chip-orange)]" },
                    { value: "on_hold", label: "En pausa", cls: "bg-[#f3eeff] text-[var(--chip-violet)]" },
                    { value: "review", label: "Revisión", cls: "bg-[#fff3eb] text-[var(--chip-orange)]" },
                    { value: "done", label: "Hecho", cls: "bg-[#eaf5ef] text-[var(--chip-green)]" },
                  ]}
                  value={form.status}
                  onChange={(v) => setForm((current) => ({ ...current, status: v as ProjectStatus }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="nav-font block text-xs font-semibold text-[var(--muted)]">Prioridad</label>
                <Dropdown
                  options={[
                    { value: "low", label: "Prioridad baja", cls: "bg-[#f0faf4] text-[var(--tertiary)]" },
                    { value: "medium", label: "Prioridad media", cls: "bg-[#fff8ec] text-[var(--secondary-deep)]" },
                    { value: "high", label: "Prioridad alta", cls: "bg-[#fff1f1] text-[#ba1a1a]" },
                  ]}
                  value={form.priority}
                  onChange={(v) => setForm((current) => ({ ...current, priority: v as "low" | "medium" | "high" }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="nav-font block text-xs font-semibold text-[var(--muted)]">
                Tags <span className="font-normal opacity-50">· separados por coma</span>
              </label>
              <input
                className="w-full rounded-[1rem] border-none bg-[var(--surface-container)] px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--primary)]/30 focus:outline-none"
                onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                placeholder="frontend, kanban, github"
                type="text"
                value={form.tags}
              />
            </div>
            <div className="space-y-1.5">
              <label className="nav-font block text-xs font-semibold text-[var(--muted)]">Resumen</label>
              <textarea
                className="min-h-24 w-full rounded-[1rem] border-none bg-[var(--surface-container)] px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--primary)]/30 focus:outline-none resize-none"
                onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                required
                value={form.summary}
              />
            </div>
            {createError ? <p className="nav-font text-sm text-[#ba1a1a]">{createError}</p> : null}
            <button
              className="nav-font w-full rounded-full bg-[linear-gradient(135deg,var(--primary),var(--primary-strong))] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Guardando..." : "Crear tarjeta"}
            </button>
          </form>
        </CenteredPanel>
      ) : null}
    </div>
  );
}

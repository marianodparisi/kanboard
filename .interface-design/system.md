# BentoBoard - Interface Design System

## Direction & Feel

**Identity:** "The Chromatic Curator" - editorial boldness with modular Bento structure. Curated, not corporate.  
**User:** Maria - power user managing her own GitHub projects. Needs fast scanning, quick edits, drag-to-move.  
**Feel:** Premium tile magazine meets developer tool. Confident color, generous whitespace, tonal structure over borders.

---

## Depth Strategy: Tonal Layering + Subtle Shadows

No 1px borders as primary separators. Structure comes from surface shifts and spacing.

- **Columns:** tonal background surfaces (e.g. `#eef2f4`, `var(--surface-container)`, `#ece9f3`, `var(--surface-high)`)
- **Cards:** `bg-white` with `box-shadow: 0 1px 2px rgba(24,28,30,0.02), 0 8px 20px rgba(24,28,30,0.04)`
- **Header:** `backdrop-blur` + `shadow-[0_4px_28px_rgba(24,28,30,0.05)]` - no border-b
- **Floating modals:** `bg-[rgba(247,250,252,0.97)] backdrop-blur-[32px]` + rich shadow `0_32px_80px_rgba(24,28,30,0.18)`
- **Side drawers:** `bg-[rgba(247,250,252,0.92)] backdrop-blur-[28px]`

---

## Color Tokens

```css
--primary: #0040df;         /* Deep blue - primary anchor */
--primary-strong: #2d5bff;  /* Hover gradient end */
--secondary: #fe6b00;       /* Energetic orange - in_progress */
--secondary-deep: #a04100;  /* Orange column tone */
--hold: #7451b8;            /* Purple - on_hold */
--tertiary: #22603f;        /* Forest green - done */
--tertiary-soft: #3c7956;   /* Done card bar */
--muted: #434656;           /* Cool-toned secondary text */
--muted-soft: #747688;      /* Tertiary text */
--chip-blue: #1848dd;       /* Backlog chip */
--chip-violet: #7c59c1;     /* On-hold chip */
--chip-orange: #ff6b00;     /* In-progress chip */
--chip-green: #5a8168;      /* Done chip */
```

---

## Typography

- **Headlines / titles:** `Plus_Jakarta_Sans` via `.headline-font` class - `letter-spacing: -0.03em`, bold/extrabold
- **Body / nav / labels:** `Inter` via `.nav-font` class
- **Section labels:** `.section-title` - `0.72rem`, `uppercase`, `letter-spacing: 0.18em`
- **Card titles dominate:** `max-w-[14ch]`, `1rem-1.15rem`, `font-bold`, `headline-font`

---

## Spacing Base

- Base unit: `0.25rem` (4px) - Tailwind default scale
- Cards: `p-5` compact / `p-6` full
- Columns: `p-5`/`p-6`, `gap-5`/`gap-6`
- Modal: `px-7 pt-7 pb-7`
- Drawers: `p-8`

---

## Border Radius

- **Columns & modal containers:** `2rem` (`rounded-[2rem]`)
- **Cards:** `2rem` via `.kanban-card`
- **Drawers:** full height, squared edge on left side
- **Buttons (CTAs):** `rounded-full` - pill shape
- **Chips/tags:** `rounded-full`
- **Inputs:** `rounded-[1rem]`
- **Dropdown menus:** `rounded-[1.5rem]`
- **Inner panels (details/tasks):** `rounded-[1.5rem]`

---

## Component Patterns

### Kanban Card

```text
.kanban-card (rounded-[2rem], bg-white, subtle shadow)
  |- absolute left bar: 6px wide, bg-[barStyles[status]]
  |- tag chip: rounded-full, bg-[tagStyles[status]], extrabold uppercase tracking
  |- title: headline-font, max-w-[14ch], bold
  |- optional repo hint: nav-font, muted-soft
  `- footer: meta icon + status text + avatar image
```

**barStyles (left accent bar):**
- backlog -> `var(--primary)` blue
- in_progress -> `var(--secondary)` orange
- on_hold -> `var(--hold)` purple
- done -> `var(--tertiary-soft)` green

**tagStyles (chip color):**
- backlog -> `var(--chip-blue)` + white text
- in_progress -> `var(--chip-orange)` + white text
- on_hold -> `var(--chip-violet)` + white text
- done -> `var(--chip-green)` + white text

### Card Detail Modal (centered)

```text
fixed inset-0, flex items-center justify-center
backdrop: rgba(24,28,30,0.30) blur-[4px], click-outside closes
dialog: max-w-2xl, max-h-[90vh], rounded-[2rem], glass surface
  |- top status bar: h-1.5, barStyles[status]
  |- header: tag chip + priority label + title (1.65rem extrabold) + close button
  |- column move buttons: rounded-full pills
  |- summary text
  |- 2-col grid: Details + Tasks (rounded-[1.5rem] bg-surface-low)
  `- edit form (embedded, inputs borderless + focus ring)
```

### Nav Tabs (active pod)

```text
Active:   rounded-full bg-[#eef2ff] px-3.5 py-1.5 font-semibold text-[var(--primary)]
Inactive: px-3.5 py-1.5 font-medium text-[var(--muted)] hover:text-[var(--foreground)]
```

### CTA Buttons

```text
bg-[linear-gradient(135deg,var(--primary),var(--primary-strong))]
rounded-full, font-semibold text-white
hover:opacity-90 active:scale-[0.98]
```

### Side Drawers (settings, notifications, profile, login, new card)

```text
fixed inset-0, flex justify-end
aside: max-w-md, glass surface (rgba 0.92, blur 28px)
header: title (headline-font 2xl bold) + Cerrar button (surface-container pill)
```

### Task Cards (Task view)

- Same `.kanban-card` surface + left accent bar by status
- Status chip (`tagStyles`) bottom-left
- Completed tasks: `line-through opacity-50`

### Calendar Cards

- Same `.kanban-card` surface + left accent bar by status
- Header row: date (`muted-soft`) + status chip (`tagStyles`) right-aligned
- Summary below title

### FAB

```text
rounded-full, bg-[linear-gradient(135deg,var(--primary),var(--primary-strong))]
shadow-[0_24px_50px_rgba(0,64,223,0.35)]
hover: scale-105 + stronger shadow
```

---

## Global Rules

```css
button { cursor: pointer; }
```

All interactive elements get pointer cursor via global CSS - not per-component.

---

## Surface Elevation Model

| Level | Token | Usage |
|---|---|---|
| Base | `var(--surface)` `#f7fafc` | Page background |
| Low | `var(--surface-low)` `#f1f4f6` | Inner panels (details, tasks) |
| Container | `var(--surface-container)` `#ebeef0` | Column surfaces, button bg |
| High | `var(--surface-high)` `#e7ebee` | Done column |
| Card | `var(--surface-card)` `#ffffff` | Cards, inputs |
| Floating | `rgba(247,250,252,0.92-0.97) + backdrop-blur` | Modals, drawers |

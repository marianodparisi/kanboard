<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Design memory

All frontend work in this project must follow the design direction captured in `docs/design-memory.md`.
Treat that file as the standing visual source of truth unless the user explicitly overrides it.

## Kansito operating memory

Kansito is the canonical board for tracking work done by agents across repositories.

- When an agent starts meaningful work for a repo, it should create or refresh the related Kansito card.
- When an agent finishes a task, it should update the card status, summary, tags, and tasks as needed.
- If the work belongs to another repository, the agent should still report it back into Kansito using the API documented in `docs/llm-api-guide.md`.
- Prefer stable `projectId` values so repeated updates land on the same card instead of creating duplicates.
- If there is any doubt, treat Kansito as the source of truth for project progress.

# Contributing

## Flujo recomendado

1. Crear una rama desde `main`.
2. Hacer cambios pequeños y verificables.
3. Correr `npm.cmd run lint`.
4. Correr `npm.cmd run build`.
5. Abrir PR con contexto claro de lo cambiado.

## Guía de cambios

- Respetar la memoria visual en `docs/design-memory.md`.
- Evitar romper la persistencia local de `data/board.json`.
- Mantener los cambios del front consistentes con el sistema Bento del proyecto.
- Si agregás nuevas acciones UI, conectarlas a persistencia real o marcarlas claramente como futuras.

## Antes de mergear

- Validar comportamiento en desktop y pantallas chicas.
- Revisar que las acciones principales sigan funcionando:
  - crear tarjeta
  - editar tarjeta
  - mover tarjeta
  - toggle de tareas
  - paneles de usuario/settings/notifications

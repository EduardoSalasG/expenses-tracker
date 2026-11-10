# Handoff — release v0.6.7 — 2026-11-10

## Estado de release

- Producción: `main` y el tag anotado `v0.6.7` apuntan a `28bc723e06a59119c558629452a565c27ac0ccbb`.
- GitHub Actions: el workflow [Deploy expenses-tracker backend #42838921429](https://github.com/EduardoSalasG/expenses-tracker/actions/runs/42838921429) terminó correctamente.
- Salud pública: Netlify respondió HTTP 200; API `/health/live` respondió `{"status":"ok"}`; `/health/ready` respondió HTTP 200 con `database: ok`; Swagger `/api/docs` respondió HTTP 200.

## Cambios incluidos

- El chat resuelve categorías y subcategorías usando exclusivamente el idioma preferido del usuario.
- Las categorías personalizadas guardan nombres editables en español e inglés; la edición manual prevalece sobre traducciones automáticas.
- Se añadió `PUT /categories/{categoryId}/translations`, documentado en Swagger, y un diálogo accesible en la biblioteca de categorías.

## Evidencia

- `pnpm run version:check`: correcto para `0.6.7`.
- Backend: 205 pruebas correctas, 8 pruebas de integración omitidas.
- Frontend: 94 pruebas correctas.
- `pnpm run release:verify`: correcto fuera del sandbox; el sandbox local puede bloquear intermitentemente lecturas de dependencias Angular y el caché GPU de Chrome.

## Próximo trabajo

- El cambio OpenSpec `localize-chat-categories` sigue activo: quedan pendientes la revisión visual manual a 320 px/móvil/escritorio y el cierre de las tareas de QA/documentación restantes antes de archivarlo.

# Bullent Spec 8-X1: Correcciones Touch Input MVP

## Goal

Ajustar la primera version de controles touch para no afectar el modo embed desktop y mostrar controles solo cuando realmente se juega.

## Corrections

- Intercambiar posiciones:
  - poderes en zona inferior izquierda;
  - movimiento en zona inferior derecha.
- Mostrar controles touch solo en estado `running`.
- Ocultar controles touch en `ready`, `dead` y settings.
- No activar controles touch en `?embed=1`.

## Embed Rule

`/?embed=1` queda reservado para embeber en escritorio dentro del portfolio.

No debe recibir la capa touch mobile. Si luego se necesita una experiencia mobile embebida o fullscreen, se definira otra ruta/modo especifico.

## Acceptance Criteria

- En touch-first, al iniciar partida aparecen controles.
- Al salir de partida o morir, los controles desaparecen.
- La zona izquierda gestiona poderes.
- La zona derecha gestiona movimiento.
- `/?embed=1` no muestra controles touch.
- `pnpm selfcheck` pasa.
- `pnpm build` pasa.

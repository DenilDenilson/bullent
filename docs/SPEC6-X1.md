# Bullent Screen Spec 6-X1: Correcciones de Pantalla de Inicio

## Goal

Pulir la pantalla de inicio de SPEC6 reduciendo ruido visual y corrigiendo encimamientos.

## Scope

- Solo afecta el overlay del estado `ready`.
- No cambia reglas de juego, poderes, configuracion ni record interno.
- Mantiene el estilo glassmorphism verde/cyan.
- Mantiene el CTA `CLICK / ENTER - INICIAR`.

## Corrections

- Quitar los chips superiores:
  - no mostrar `BEST`;
  - no mostrar `MVP BUILD`.
- Quitar la descripcion secundaria:
  - no mostrar `Las balas rebotan, se acumulan...`.
- Quitar la descripcion de movimiento:
  - no mostrar `moverte por la arena`.
- Mantener:
  - titulo `BULLENT`;
  - byline `BY DENIL`;
  - tagline `ESQUIVA EL CAOS. ROMPE TU RECORD.`;
  - controles `MOVIMIENTO`, `WASD`, `↑ ↓ ← →`;
  - lista vertical de poderes;
  - gear de configuracion abajo a la derecha.
- Ajustar tamaños y espacios para que:
  - los poderes entren completos;
  - las descripciones no se corten feo;
  - el CTA no tape ninguna card;
  - la pantalla tenga mas respiro.

## Acceptance Criteria

- La pantalla de inicio no muestra `BEST`.
- La pantalla de inicio no muestra `MVP BUILD`.
- La pantalla de inicio no muestra la descripcion secundaria de balas.
- La pantalla de inicio no muestra `moverte por la arena`.
- Los tres poderes visibles encajan sin quedar tapados por el CTA.
- `pnpm selfcheck` y `pnpm build` pasan.

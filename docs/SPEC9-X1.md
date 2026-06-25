# Bullent Spec 9-X1: Tablet Mobile Layout Fix

## Goal

Corregir `/?mobile=1` en vistas tipo tablet para que mantenga la misma composicion mobile tipo consola, solo que mas grande.

## Bug

En anchos grandes, el modo mobile heredaba columnas del layout standalone:

- HUD quedaba a la izquierda;
- arena/start screen quedaba a la derecha;
- se rompia la forma vertical definida en SPEC9.

## Corrections

- `/?mobile=1` siempre usa una sola columna:
  - HUD arriba;
  - arena al centro;
  - controles abajo.
- En tablet, la arena puede escalar mas alla del ancho base si hay espacio vertical.
- El canvas debe mantener render nitido al escalar.
- HUD y deck de controles deben alinearse al ancho de la arena.
- Correccion ergonomica: en tablet, los controles deben ir a los extremos laterales del deck, no centrados debajo de la arena.
- `/?embed=1` no cambia.

## Acceptance Criteria

- En viewport mobile angosto, el layout se ve como antes.
- En viewport tablet/ancho, el layout conserva la forma mobile vertical.
- La arena queda centrada, no a la derecha.
- HUD no queda separado a la izquierda.
- Controles touch quedan cerca de los bordes para agarre de tablet:
  - poderes hacia el extremo izquierdo;
  - movimiento hacia el extremo derecho.
- `pnpm selfcheck` pasa.
- `pnpm build` pasa.

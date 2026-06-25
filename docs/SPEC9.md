# Bullent Spec 9: Mobile Fullscreen Game Layout

## Goal

Crear un modo mobile dedicado para jugar Bullent en pantalla completa desde otra pestaña, sin contaminar el embed desktop.

El objetivo es que el jugador abra una URL enfocada en juego mobile y tenga una composicion tipo consola portatil:

```txt
┌────────────────────┐
│ HUD / detalles      │
├────────────────────┤
│                    │
│      ARENA         │
│                    │
├────────────────────┤
│ poderes | movimiento│
└────────────────────┘
```

## URL Modes

Mantener modos existentes:

- `/` -> standalone desktop/general.
- `/?embed=1` -> embed desktop limpio para portfolio.

Agregar modo nuevo:

- `/?mobile=1` -> experiencia mobile fullscreen.

`/?mobile=1` esta pensado para abrirse en otra pestaña desde el portfolio o desde la pagina standalone.

## Scope

- Reorganizar layout para mobile fullscreen.
- Mantener el mismo juego, canvas, poderes y reglas.
- Reutilizar controles touch de SPEC8:
  - poderes abajo izquierda;
  - movimiento abajo derecha;
  - doble tap = `Destello`;
  - hold = `Letargo`.
- No cambiar balance.
- No modificar JSON de niveles.
- No implementar aun perfil mobile de dificultad.

## Layout

### Mobile Fullscreen

El documento debe ocupar todo el viewport:

- `body` sin scroll horizontal;
- altura usando viewport moderno (`100dvh` cuando sea posible);
- fondo oscuro consistente con Bullent.

La pagina se divide en tres zonas:

1. Top HUD
   - muestra informacion compacta:
     - tiempo actual;
     - best record;
     - bullets;
   - no debe tapar la arena.

2. Arena
   - mantiene aspect ratio del juego;
   - usa todo el ancho razonable disponible;
   - queda centrada;
   - no se deforma;
   - si sobra espacio vertical, se reparte arriba/abajo.

3. Control Deck
   - ocupa la zona inferior;
   - zona izquierda para poderes;
   - zona derecha para movimiento;
   - debe ser suficientemente grande para pulgares.

## Interaction

- En `/?mobile=1`, mostrar controles touch aunque el modo normal no los mostraria por tamano.
- Si se detecta teclado, teclado sigue funcionando, pero no debe destruir el layout mobile.
- Settings debe seguir disponible, pero reubicado para no chocar con controles.
- Start screen y dead screen deben seguir existiendo.
- Los controles tactiles solo aparecen durante `running`, como SPEC8-X1.

## Links

La pagina standalone deberia poder ofrecer un link visible:

```txt
abrir mobile
```

apuntando a:

```txt
/?mobile=1
```

El portfolio podra usar ese link para abrir Bullent en una nueva pestaña cuando el usuario este en mobile.

## Acceptance Criteria

- `/?embed=1` sigue limpio para iframe desktop.
- `/?mobile=1` muestra una experiencia fullscreen orientada a mobile.
- En `/?mobile=1`, el juego no queda como un cuadrito dentro de una pagina desktop.
- La arena mantiene aspect ratio.
- Los controles quedan en la franja inferior:
  - poderes izquierda;
  - movimiento derecha.
- Los controles solo aparecen al jugar.
- `pnpm selfcheck` pasa.
- `pnpm build` pasa.

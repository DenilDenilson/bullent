# Bullent Spec 8: Mobile Touch Input MVP

## Goal

Hacer que Bullent pueda jugarse en dispositivos tactiles sin cambiar el gameplay ni el balance.

La implementacion agrega una capa de input touch. El core sigue recibiendo direccion y poderes como hasta ahora.

## Device Rule

Bullent debe preferir la version de teclado cuando el dispositivo parece tener teclado/mouse.

Regla MVP:

- activar controles touch solo si el dispositivo parece `touch-first`;
- `touch-first` significa:
  - `pointer: coarse`;
  - sin `any-pointer: fine`;
  - sin `hover: hover`.
- si durante la sesion se detecta `keydown`, esconder controles touch y usar teclado.

Nota: el navegador no expone una forma confiable de saber si existe teclado fisico. Esta regla evita que una laptop touch reciba UI mobile por accidente.

## Touch Controls

La pantalla tactil se divide en zonas gestuales grandes:

- zona inferior izquierda:
  - joystick virtual por drag;
  - no es un boton;
  - aparece feedback visual suave al tocar;
  - produce un `Vec2` de movimiento.
- zona inferior derecha:
  - zona de poderes por gestos;
  - doble tap ejecuta `Destello`;
  - mantener presionado activa `Letargo`;
  - no hay botones separados por poder en esta version.

## Input Merge

- Teclado se mantiene siempre.
- Si hay direccion de teclado, esa direccion tiene prioridad.
- Si no hay direccion de teclado, se usa direccion touch.
- Letargo se activa con `Ctrl` o hold touch.
- Destello se activa con `V` o doble tap touch.

## Scope

- No cambia balance.
- No cambia JSON de niveles.
- No implementa layout mobile tipo gameboy; eso queda para SPEC9.
- No agrega multiples botones de poderes; eso puede venir cuando existan mas poderes.

## Acceptance Criteria

- En desktop normal no aparece UI touch.
- En laptop touch con mouse/trackpad no aparece UI touch.
- En dispositivo touch-first aparece una zona gestual inferior.
- Drag en la zona izquierda mueve al jugador.
- Doble tap en zona derecha ejecuta `Destello`.
- Hold en zona derecha activa `Letargo`.
- Teclado sigue funcionando.
- `pnpm selfcheck` pasa.
- `pnpm build` pasa.

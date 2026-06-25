# Bullent Spec 7: Deploy MVP y modos Standalone/Embed

## Goal

Preparar Bullent para publicarse como MVP en Cloudflare Pages con dos modos desde la misma app:

- `https://bullent.denil.org/` -> pagina completa standalone;
- `https://bullent.denil.org/?embed=1` -> solo el juego para iframe.

El despliegue lo ejecuta Denil. El codigo debe soportar ambos modos.

## Hosting

Target recomendado: Cloudflare Pages.

Configuracion esperada:

```txt
Framework preset: Vite
Build command: pnpm build
Build output directory: dist
Production domain: bullent.denil.org
```

Cloudflare Pages debe poder desplegar desde Git y generar previews por commit/branch si se conecta el repositorio.

## Modes

### Standalone

URL:

```txt
https://bullent.denil.org/
```

Debe mostrar una pagina completa alrededor del juego:

- juego centrado;
- titulo/descripcion breve de pagina;
- link hacia `https://www.denil.org/`;
- hint para embeber o abrir el juego;
- fondo visual consistente con Bullent.

La experiencia jugable sigue dentro del mismo `#game-shell`.

### Embed

URL:

```txt
https://bullent.denil.org/?embed=1
```

Debe mostrar solo la experiencia jugable:

- sin header de pagina;
- sin texto externo;
- sin padding extra del documento;
- `#game-shell` pegado al viewport disponible;
- fondo del documento transparente u oscuro simple;
- ideal para iframe de `460x560`.

No debe ser solo el `canvas`, porque el juego necesita overlay de inicio, settings y poderes.

## Interface

No hay API publica.

La deteccion de modo vive en `src/main.ts` leyendo `URLSearchParams`.

El modo se expone como clase en `body`:

- `mode-standalone`
- `mode-embed`

CSS decide layout y visibilidad segun esa clase.

## Iframe contract

Embed recomendado en portfolio:

```html
<iframe
  src="https://bullent.denil.org/?embed=1"
  title="Bullent"
  width="460"
  height="560"
  loading="lazy"
></iframe>
```

El iframe puede luego recibir estilos del portfolio para borde, sombra o posicion.

## Acceptance Criteria

- `/` muestra una pagina standalone, no solo el canvas flotando.
- `/?embed=1` muestra solo el juego y no muestra contenido standalone.
- El juego mantiene start screen, settings, poderes y controles en ambos modos.
- `pnpm selfcheck` pasa.
- `pnpm build` pasa.

# Bullent TODO

Lista viva de mejoras. La regla: primero documentar lo que ayuda a iterar, luego mover balance a JSON, y solo después meter sistemas más grandes.

## 🔥 Próximo

- [ ] Documentar el flujo para agregar poderes sin perderse entre `powers.json`, `src/powers`, UI, input y VFX.
- [ ] Mover las teclas/asignaciones de poderes a `public/powers.json`.
- [ ] Mover colores y VFX de poderes a `public/powers.json`.
  - Ejemplos: estela de Letargo, líneas de Presagio, color de burbujas y feedback de activación.

## 🤖 Bot / Autoplay

- [ ] Optimizar el bot para calcular peligro solo con balas cercanas o relevantes.
  - Ahora revisa más de lo necesario; el upgrade natural es filtrar por distancia/riesgo antes del lookahead.
- [ ] Agregar un switch in-game para cambiar entre persona y bot sin volver al inicio.
- [ ] Documentar cómo usar `pnpm bot:benchmark` y `pnpm bot:tune` para balance.
- [ ] Evaluar el replay de muerte: quitar el zoom o extender duración si se siente muy abrupto.

## ⚡ Poderes

- [ ] Agregar un poder de teletransporte a zona segura.
  - Idea original: poder pedido por mi hermana.
  - Balance sugerido: cooldown alto y lectura visual clara para que no se sienta gratis.

## 🧹 Arquitectura / Docs

- [ ] Refactorizar y documentar los flujos principales antes de que crezcan más.
  - Partida: inicio, running, muerte, replay y restart.
  - Poderes: config, estado, input, render y cooldown.
  - Mobile: layout, joystick, pad de poderes y preferencia teclado/touch.
- [ ] Revisar archivos sueltos de experimentos/parches antes de publicar una versión más limpia.

## 🌱 Futuro

- [ ] Selector de temas usando CSS variables antes de pensar en un sistema más grande.
- [ ] Estadísticas por intento: pickups, uso de poderes, tiempo real, bonus y causa de muerte.
- [ ] IA evolutiva ya entrenada cargada en el juego, sin entrenarla dentro de este repo.

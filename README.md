<div align="center">

# 🟣 Bullent

### Juego web minimalista de esquivar balas para portfolios interactivos

![Estado](https://img.shields.io/badge/estado-MVP%20en%20dise%C3%B1o-7C3AED)
![Tipo](https://img.shields.io/badge/tipo-browser%20game-2563EB)
![Stack](https://img.shields.io/badge/stack-TypeScript%20%7C%20Canvas%20%7C%20Vite-16A34A)
![Render](https://img.shields.io/badge/render-Canvas%202D-F97316)
![Deploy](https://img.shields.io/badge/deploy-Cloudflare%20Pages-0EA5E9)
![Embed](https://img.shields.io/badge/embed-iframe-EC4899)

**Aguanta más tiempo. Esquiva el caos.**
Un minijuego 2D embebible, diseñado para vivir dentro de un portfolio sin depender de frameworks pesados.

</div>

---

## 🎮 Qué es Bullent

**Bullent** es un juego web 2D minimalista donde el jugador controla un círculo dentro de una arena mientras distintos disparadores lanzan balas hacia su posición.

Las balas rebotan en las paredes y se acumulan durante el nivel, haciendo que cada segundo sea más peligroso que el anterior.

> [!IMPORTANT]
> Bullent no busca ser un juego grande ni un motor complejo.
> Es una experiencia pequeña, pulida y embebible para demostrar interacción, arquitectura frontend y diseño de dificultad en navegador.

---

## 🧠 Idea principal

El jugador empieza en el centro de la arena.

En el primer nivel aparece un disparador ubicado sobre el jugador. Este dispara hacia la posición actual del círculo cada cierto tiempo.

Con cada nivel aparece un nuevo disparador, siguiendo los vértices de un octágono regular.

```txt
Nivel 1  → 1 disparador
Nivel 2  → 2 disparadores
Nivel 3  → 3 disparadores
...
Nivel 8  → 8 disparadores
```

La meta es simple:

> [!TIP]
> Sobrevivir el mayor tiempo posible sin tocar ninguna bala.

---

## ⚡ Reglas del juego

| Elemento        | Comportamiento                                |
| --------------- | --------------------------------------------- |
| 🟣 Jugador      | Círculo controlado con teclado                |
| 🎯 Disparadores | Apuntan hacia la posición actual del jugador  |
| 💥 Balas        | Rebotan contra las paredes                    |
| ☠️ Daño         | Una bala toca al jugador y termina la partida |
| ⏱️ Objetivo     | Aguantar el mayor tiempo posible              |
| 🧩 Nivel        | Configurable mediante JSON o panel in-game    |
| 🏆 Récord       | Mejor tiempo guardado localmente              |

---

## 🕹️ Controles

Bullent está pensado inicialmente para teclado.

```txt
W / ↑  → moverse arriba
A / ←  → moverse izquierda
S / ↓  → moverse abajo
D / →  → moverse derecha
```

En futuras versiones podrían añadirse habilidades como cámara lenta, escudo, dash o poderes temporales.

---

## 📈 Dificultad

La dificultad principal nace de tres ideas:

* el nivel puede configurarse con uno o más disparadores;
* las balas rebotan contra las paredes;
* las balas se acumulan durante la partida.

Esto genera un sistema simple, pero con comportamiento emergente.

| Parámetro | Controla |
| --------- | -------- |
| Disparadores | Cantidad, posición y cadencia |
| Balas | Tamaño, velocidad y máximo acumulado |
| Jugador | Tamaño y velocidad |
| Arena | Tamaño del espacio jugable |

> [!WARNING]
> En la primera versión, la dificultad puede escalar muy rápido.
> Parte del objetivo del proyecto es estudiar cómo ajustar la curva para mantener al jugador en una zona de flujo.

---

## 🧱 Decisiones técnicas

Bullent será un proyecto completamente ejecutado en el navegador.

Stack recomendado:

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript\&logoColor=white)
![Canvas](https://img.shields.io/badge/Canvas%202D-Browser%20API-F97316)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite\&logoColor=white)
![Cloudflare Pages](https://img.shields.io/badge/Cloudflare%20Pages-F38020?logo=cloudflare\&logoColor=white)

```txt
TypeScript
Canvas 2D
Vite
CSS variables
Cloudflare Pages
```

No se requiere backend, base de datos ni SSR para la primera versión.

---

## 🧩 Arquitectura recomendada

Bullent usará una arquitectura modular con **POO ligera**.

La idea es usar clases para entidades que tienen estado y comportamiento:

| Clase / módulo | Responsabilidad                                                     |
| -------------- | ------------------------------------------------------------------- |
| `Game`         | Coordinar estado, loop, récord y condiciones de partida |
| `Player`       | Representar al jugador y su movimiento                              |
| `Bullet`       | Representar balas, velocidad, rebotes y posición                    |
| `Shooter`      | Representar disparadores y lógica de disparo                        |
| `Input`        | Leer teclado y traducirlo a movimiento                              |
| `Renderer`     | Dibujar la escena en Canvas                                         |

Pero no todo necesita ser una clase.

La configuración debería mantenerse como datos simples:

```txt
niveles
dificultad
colores
tema visual
constantes del juego
valores de balance
```

> [!NOTE]
> El objetivo no es crear una arquitectura pesada, sino separar responsabilidades para que el juego pueda crecer sin volverse difícil de mantener.

---

## 🎨 Estilo visual

La primera versión tendrá una estética **minimalista neón**.

El estilo debe estar separado de la lógica del juego para permitir cambios visuales sin tocar las reglas internas.

Temas posibles a futuro:

| Tema         | Descripción                                       |
| ------------ | ------------------------------------------------- |
| 🟣 Neon      | Brillos, fondo oscuro y colores intensos          |
| ⚪ Clean      | Minimalista, suave y de bajo contraste            |
| 🕹️ Retro    | Estética arcade o pixel-inspired                  |
| 🌃 Cyberpunk | Alto contraste, glow agresivo y colores saturados |
| ⚫ Mono       | Blanco, negro y escala de grises                  |

---

## 🌐 Embebido en portfolio

Bullent está pensado para vivir como una app independiente y ser embebido en otro sitio mediante un `iframe`.

```html
<iframe
  src="https://bullent.pages.dev/"
  width="460"
  height="560"
  title="Bullent"
  loading="lazy"
></iframe>
```

Este enfoque permite mantener el juego aislado del portfolio principal.

### Ventajas

* El juego puede actualizarse sin tocar el portfolio.
* Puede compartirse como enlace independiente.
* Puede reutilizarse en otras webs.
* No contamina la arquitectura del sitio principal.
* Si el juego falla, no rompe el portfolio.

---

## 🚀 Deploy

Bullent puede desplegarse como sitio estático.

Hosting recomendado:

```txt
Cloudflare Pages
```

Flujo sugerido:

```txt
Desarrollo local
→ Build estático
→ Deploy en Cloudflare Pages
→ Embed mediante iframe en el portfolio
```

---

## 🧪 Qué busca enseñar este proyecto

Bullent no es solo un juego pequeño. También es una excusa para practicar fundamentos importantes de software frontend.

| Área              | Aprendizaje                                            |
| ----------------- | ------------------------------------------------------ |
| 🎮 Game loop      | Actualización continua del estado del juego            |
| 🧭 Input handling | Lectura de teclado y movimiento fluido                 |
| 🧱 POO práctica   | Entidades con estado y comportamiento                  |
| 🧮 Colisiones     | Detección entre círculos y límites                     |
| 🌀 Física simple  | Movimiento, velocidad y rebotes                        |
| 🎨 Rendering      | Dibujo en Canvas 2D                                    |
| 🧠 Estado         | Idle, running, dead, win, level transition             |
| 📈 Dificultad     | Balance, progresión y zona de flujo                    |
| 🧩 Modularidad    | Separación entre lógica, render, input y configuración |
| 🌐 Distribución   | Deploy estático y embebido con iframe                  |

---

## 🗺️ Futuras ideas

Bullent puede crecer de forma progresiva sin perder su esencia minimalista.

### Roadmap de poderes

#### Jugador

| Estado | Poder | Tipo | Efecto | Uso principal | Riesgo / Balance |
| --- | --- | --- | --- | --- | --- |
| No implementado | Escudo de impacto | Defensivo | Bloquea una bala o permite sobrevivir a un golpe | Perdonar un error puntual | Debe durar poco o bloquear solo un impacto |
| Implementado | Dash corto | Movimiento | Desplaza rápidamente al jugador en una dirección | Escapar de encierros | Puede matar al jugador si se usa mal |
| Implementado | Camara lenta | Control temporal | Ralentiza el tiempo global mientras se mantiene Ctrl | Sobrevivir momentos caoticos | No debe durar demasiado |
| No implementado | Pulso repelente | Control de espacio | Empuja las balas cercanas hacia afuera | Abrir espacio cuando el jugador esta rodeado | No deberia destruir todas las balas |
| No implementado | Fase | Evasion | El jugador ignora colisiones por un instante | Atravesar una zona peligrosa | Requiere timing preciso |
| No implementado | Gravedad inversa | Defensa avanzada | Las balas cercanas se curvan alejandose del jugador | Reducir presion cercana | Puede volver los patrones impredecibles |
| No implementado | Limpieza parcial | Emergencia | Elimina algunas balas dentro de un radio | Recuperarse de una situacion critica | Puede bajar demasiado la dificultad |
| No implementado | Nucleo estable | Pasivo | Al quedarse quieto, el jugador carga energia | Premiar juego arriesgado y estrategico | Quedarse quieto es peligroso |

#### Enemigos / disparadores

| Estado | Poder enemigo | Tipo | Efecto | Uso principal | Riesgo / Balance |
| --- | --- | --- | --- | --- | --- |
| Implementado | Disparo normal | Base | Apunta hacia la posicion actual del jugador | Primer patron de aprendizaje | Puede volverse plano sin variantes |
| No implementado | Disparo predictivo | Precision | Apunta hacia donde el jugador probablemente estara | Castigar movimiento en linea recta | No debe ser perfecto para evitar injusticia |
| No implementado | Doble disparo | Presion | Lanza dos balas con separacion angular | Crear pequenos abanicos de peligro | Puede saturar rapido la pantalla |
| No implementado | Bala pesada | Control de espacio | Dispara una bala mas grande y lenta | Bloquear rutas del jugador | Debe ser facil de leer visualmente |
| No implementado | Bala acelerada | Escalado | La bala empieza lenta y aumenta velocidad | Subir tension con el tiempo | Puede sorprender demasiado si acelera mucho |
| No implementado | Bala lenta | Persistencia | Bala lenta que permanece mas tiempo en pantalla | Ensuciar la arena y cerrar caminos | Muchas balas lentas pueden volver el juego injusto |
| No implementado | Disparo giratorio | Patron | El disparador rota su angulo de disparo | Crear patrones circulares o espirales | Mejor usarlo en niveles avanzados |
| No implementado | Shooter imantado | Seguimiento suave | Las balas corrigen ligeramente su direccion hacia el jugador | Aumentar presion constante | No debe sentirse como misil imposible |
| No implementado | Bala divisoria | Caos progresivo | La bala se divide tras ciertos rebotes | Crear dificultad avanzada | Puede romper la curva de dificultad |

Orden recomendado:

| Prioridad | Categoria | Poder | Motivo |
| ---: | --- | --- | --- |
| 1 | Jugador | Dash corto | Da habilidad, movilidad y expresividad al jugador |
| 2 | Jugador | Escudo de impacto | Perdona errores sin eliminar el peligro |
| 3 | Jugador | Camara lenta | Es claro, util y facil de entender |
| 4 | Enemigo | Disparo predictivo | Hace que el movimiento del jugador importe mas |
| 5 | Enemigo | Bala pesada | Anade variedad sin complicar demasiado |
| 6 | Enemigo | Doble disparo | Aumenta presion de forma simple |

Posibles mejoras:

* 🛡️ Escudo temporal
* 🐢 Cámara lenta
* ⚡ Dash
* ✨ Power-ups
* 🔊 Efectos de sonido
* 💾 Mejor tiempo local
* 📊 Estadísticas de intento
* 🎚️ Modos de dificultad
* 📱 Controles móviles
* 🎨 Selector de temas
* 🧪 Sistema de balance por configuración

---

## ✅ Principios del proyecto

> [!CAUTION]
> Bullent debe mantenerse pequeño, claro y fácil de embeber.

Reglas guía:

* No usar frameworks pesados para el MVP.
* No mezclar lógica del juego con estilos visuales.
* No hacer que el portfolio dependa internamente del juego.
* No complicar la arquitectura antes de necesitarlo.
* Mantener la dificultad configurable.
* Priorizar una experiencia simple, pulida y legible.
* Separar renderizado, input, entidades y configuración.
* Diseñar pensando en futuras habilidades, pero sin implementarlas antes de tiempo.

---

## 🧬 Filosofía

Bullent parte de una idea simple:

> esquivar balas dentro de un espacio cada vez más peligroso.

La gracia está en convertir esa idea pequeña en una experiencia cuidada: clara, rápida de entender, difícil de dominar y suficientemente pulida como para vivir dentro de un portfolio personal.

No busca impresionar por tamaño.
Busca demostrar criterio, interacción y buen diseño de software en navegador.

---

<div align="center">

**Bullent** — Un pequeño caos geométrico para tu portfolio. 🟣

</div>

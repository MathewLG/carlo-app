# Carlo App design direction

Written from the owner's answers on 2026-10-24. Values marked *(proposed)* were
filled in by the agent to fit those answers; change any of them freely.

## Identity

- **What it is:** a family keepsake. Parents and loved ones write memories and
  messages for Carlo to read when he is older.
- **Personality (owner):** playful and bright.
- **Carlo's favorite color (owner):** blue.
- **Things Carlo loves (owner):** Paw Patrol and Spidey. These are licensed
  characters, so the app never uses them, their logos, or look-alikes. The
  playful feel comes from original details instead.
- **Typography (owner):** rounded, friendly sans.

## Palette

Core colors come from the existing logo (`public/assets/images/carlo-app.png`).

| Token | Hex | Use |
|---|---|---|
| `carlo-blue` | `#004AAD` | Logo blue. Primary buttons (white text), links, focus ring |
| `sky` | `#0CC0DF` | Logo cyan. Fills only, always with `ink` text on top. Never as text on white (2.18:1) |
| `sun` | `#FFC93C` | The one accent *(proposed)*. Only on the "add a memory" action |
| `ink` | `#14274A` | Text and the chunky outlines *(proposed)* |
| `ink-soft` | `#46607F` | Secondary text *(proposed)* |
| `cloud` | `#EEF7FF` | Page background *(proposed)* |
| `danger` | `#B42318` | Delete actions and errors, always with words, never color alone |

Contrast checked with the WCAG formula: white on carlo-blue 8.13, ink on cloud
13.66, ink on sun 9.64, ink on sky 6.78, ink-soft on cloud 5.98, danger on white
6.57, carlo-blue focus ring on cloud 7.5.

## Typography

- **Headings, names, buttons:** Fredoka *(proposed)*. Rounded terminals read as
  friendly and a little toy-like, which matches "playful".
- **Reading text:** Nunito *(proposed)*. Rounded too, but calmer and easier to
  read in long memories.

## Motif

Memories look like **stickers on the fridge**: white cards with a 2px `ink`
outline, a hard offset shadow (no blur), and a small tilt that alternates
from card to card. Buttons share the same outline and hard shadow, and press
down on click. This is the one repeated gesture that makes the app Carlo's.

## Dials

ENERGY 2 / RHYTHM 2 / MOTION 1

- MOTION 1: hover and press states only. No looping or entrance animations,
  because the content is personal text that should sit still to be read.
- Light theme only: "bright" is part of the identity, and there is no dark-mode
  request.

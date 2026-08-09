---
name: react-bits
description: Use when adding an animated UI component, text effect, cursor/hover effect, or WebGL/canvas background to a React project via React Bits (reactbits.dev) — or when asked to recall/write a React Bits component's code, props, or install steps from memory instead of fetching it.
---

# React Bits

Fetches real, current component source from the React Bits public registry instead of recalling it from training data. React Bits (reactbits.dev, MIT + Commons Clause, by David Haz) publishes 165 animated components — Text Animations, Animations, Components, Backgrounds — each in 4 variants (JS/TS × CSS/Tailwind).

## The hard rule

**Never write React Bits component code from memory. Always fetch it live.**

Verified failure mode (baseline test, no skill): asked for Aurora + BlurText, an agent hallucinated plausible-looking code, guessed `framer-motion` as a dependency (the live package is `motion`), invented prop defaults, and only disclosed the guessing when explicitly asked. The code looked complete and shippable. It wasn't current.

Training data goes stale; this library updates variants in sync. If you can't reach the registry, say so — don't fall back to recalled code.

## Fetch

```bash
node scripts/rb-add.mjs <Component> [<Component>...] --variant <JS|TS>-<CSS|TW> --dest <path> [--install]
node scripts/rb-add.mjs --list                      # print all 165 names
```

Writes real source files to `--dest` (default `src/components`) and prints the exact `npm install` line for that component's dependencies (default variant: `TS-TW`). `--install` runs it for you.

No script access? Fetch directly — same registry, same rules:
```bash
curl -s https://reactbits.dev/r/<Name>-<JS|TS>-<CSS|TW>.json   # one component, files[].content = source
curl -s https://reactbits.dev/r/registry.json                  # index, 660 entries, no source, no category field
```
**reactbits.dev is an SPA** — an unknown path still returns HTTP 200 with an HTML shell. A 200 status proves nothing; parse the body as JSON and check it before trusting it.

## Workflow

1. **Confirm the variant** — JS or TS, CSS or Tailwind. Default to matching the project's existing files; ask if genuinely ambiguous.
2. **Find the component** — grep [references/catalog.md](references/catalog.md) (offline, 165 entries with category + description + deps) or `--list`.
3. **Fetch it** with `rb-add.mjs` (above). Never hand-write the file.
4. **Read the fetched file's own prop type/interface before wiring it up.** Don't guess prop names or defaults even for a component you fetched — read what's actually in the file.
5. **Install the printed dependencies** (or pass `--install`).

## Gotchas

- **Scoped-package deps break naive parsing.** 10 components depend on scoped packages, e.g. `PixelTrail` → `@react-three/fiber@^9.3.0`. Splitting a dep string on `@` to get the name yields `""` for these. `rb-add.mjs` parses correctly (`/^(@[^/]+\/[^@]+|[^@]+)@?(.*)$/`); don't reimplement this by hand.
- **CSS variants are multi-file.** `JS-CSS`/`TS-CSS` ship a component file *and* a sibling `.css` file (both must be written). `JS-TW`/`TS-TW` are single-file with Tailwind utility classes.
- **No category field in the registry.** `registry.json` has name/title/deps/files only. Category (Text Animations / Animations / Components / Backgrounds) lives only in `references/catalog.md` (sourced from `reactbits.dev/llms.txt`).
- **`verbatimModuleSyntax` TS projects**: some fetched files import types alongside values in one `import {...}` statement (e.g. `import { motion, Transition } from 'motion/react'`) — split into a separate `import type {...}` if the project's tsconfig has `verbatimModuleSyntax: true`. This is a mechanical fix, not a reason to rewrite the component.

## Categories (165 total)

Text Animations (32) · Animations (36) · Components (44) · Backgrounds (53). Full list with one-line descriptions and dependencies: [references/catalog.md](references/catalog.md).

## After installing

For a craft-bar review of the motion you just wired up (easing, duration, frequency-appropriateness, reduced-motion), the upstream repo ships separate skills at `DavidHDev/react-bits/AGENTS/SKILLS/` (`review-animations`, `improve-animations`, `find-animation-opportunities`, `apple-design`) — not bundled here, distinct concern (craft review vs. correct fetch/install).

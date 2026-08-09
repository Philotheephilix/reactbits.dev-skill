# reactbits.dev-skill

A Claude Code skill for [React Bits](https://reactbits.dev) (by David Haz, MIT + Commons Clause) — fetches real component source from the public registry instead of recalling it from training data.

This repo's own tooling (script, workflow, catalog metadata) is [MIT licensed](LICENSE). It doesn't vendor any React Bits component source — `rb-add.mjs` fetches it live from reactbits.dev at install time, under React Bits' own license.

The skill itself lives in [`react-bits/`](react-bits/SKILL.md) (personal-skills layout: `<repo>/<skill-name>/SKILL.md`).

## Why fetch instead of recall

Baseline test (no skill): asked for an Aurora background + BlurText heading, an agent produced plausible, complete-looking code — and guessed `framer-motion` as the dependency. The live package is `motion`. It also invented prop defaults. It disclosed the guessing only when asked directly.

Same task, with the skill: the agent fetched the live registry JSON, installed the correct `motion` package, and reported prop defaults and an internal implementation detail (which prop drives a WebGL context rebuild vs. which is read per-frame) that only exist in the actual current source.

## Install

```bash
git clone https://github.com/Philotheephilix/reactbits.dev-skill.git ~/.claude/reactbits.dev-skill 2>/dev/null || git -C ~/.claude/reactbits.dev-skill pull; ln -sfn ~/.claude/reactbits.dev-skill/react-bits ~/.claude/skills/react-bits
```

Restart the Claude Code session (skills load at session start). Re-run the same line later to update — it pulls the repo and refreshes the symlink.

Working from a local clone instead? `ln -s "$(pwd)/react-bits" ~/.claude/skills/react-bits`.

## What's in the registry

165 components — Text Animations (32), Animations (36), Components (44), Backgrounds (53) — each in 4 variants (JS/TS × CSS/Tailwind). Full catalog: [`react-bits/references/catalog.md`](react-bits/references/catalog.md).

```
https://reactbits.dev/r/registry.json              index, 660 entries
https://reactbits.dev/r/<Name>-<JS|TS>-<CSS|TW>.json   one component's source
```

reactbits.dev is an SPA — unknown paths return HTTP 200 with an HTML shell. The fetch script validates parsed JSON, not status codes.

## Contents

- `react-bits/SKILL.md` — the skill
- `react-bits/scripts/rb-add.mjs` — fetches, resolves scoped-package deps, writes files, prints the install command
- `react-bits/scripts/gen-catalog.mjs` — regenerates `references/catalog.md` from the live registry + llms.txt
- `react-bits/references/catalog.md` — offline catalog; kept current by [`.github/workflows/update-catalog.yml`](.github/workflows/update-catalog.yml), which runs `gen-catalog.mjs` daily and commits if the registry changed

## Keeping the catalog current

`.github/workflows/update-catalog.yml` runs daily (03:17 UTC) and on manual dispatch. It regenerates `catalog.md` and commits only if the diff is non-empty — most days it's a no-op. Requires the repo to be pushed to GitHub with Actions enabled; nothing to configure beyond that (uses the default `GITHUB_TOKEN`).

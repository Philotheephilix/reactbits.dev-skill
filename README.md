# reactbits.dev-skill

Claude Code skill for [React Bits](https://reactbits.dev) — fetches real component source from the live registry instead of recalling it from memory (verified: without this, agents guess wrong package names and invent prop defaults).

## Install

```bash
claude plugin marketplace add Philotheephilix/reactbits.dev-skill && claude plugin install react-bits@reactbits.dev-skill
```

To update later: `claude plugin update react-bits@reactbits.dev-skill`.

## What's here

- [`react-bits/SKILL.md`](react-bits/SKILL.md) — the skill
- [`react-bits/references/catalog.md`](react-bits/references/catalog.md) — all 165 components, auto-updated daily by [`.github/workflows/update-catalog.yml`](.github/workflows/update-catalog.yml)
- `react-bits/scripts/rb-add.mjs` — fetches a component's real source + deps and writes it to disk

## License

This repo's own code is [MIT](LICENSE). It doesn't vendor React Bits' component source — that's fetched live at install time, under React Bits' own license (MIT + Commons Clause, © David Haz).

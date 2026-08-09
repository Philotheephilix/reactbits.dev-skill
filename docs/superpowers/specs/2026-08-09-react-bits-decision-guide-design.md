# React Bits decision guide — design spec

Date: 2026-08-09
Status: approved by user, pending implementation plan

## Problem

The `react-bits` skill (`react-bits/SKILL.md`) solves *fetch correctness*: never hallucinate component source, always pull live from the registry. It does not help with *selection*. Given a design need ("this landing page needs a hero background"), the agent has no structured way to choose among 165 components — it either browses `catalog.md` cold (flat alphabetical list, no judgment) or falls back to whatever name it recalls first, which reintroduces a milder version of the exact problem the skill was built to prevent: picking based on familiarity/memory instead of fit.

## Goals

- Given a stated intent (backgrounds, text, micro-interactions, or components), the agent should land on a small, ranked candidate list with a stated reason, instead of guessing or listing all matching names unranked.
- Cover all 4 categories (Text Animations, Animations, Components, Backgrounds), not just Backgrounds — confirmed with user; the original ask ("like the animations for the background") was an example, not a scope limit.
- Selection reasoning should be groundable in catalog data (dependency footprint) — not vibes — so it doesn't rot as fast as opinion-only guidance would.
- Preserve the existing skill's scope boundary: this is a *selection* layer, not a *restraint* layer. Whether to animate at all (frequency/purpose gating) stays out of scope — already delegated to the upstream `find-animation-opportunities` / `review-animations` skills, referenced from `SKILL.md`'s "After installing" section. Duplicating that logic here would fork two copies of the same judgment.

## Non-goals

- No automatic keyword-based classifier. 165 components is small enough to hand-curate once; an automated classifier would need to be at least as good as manual judgment to be worth the added moving part, and a mediocre auto-classifier actively misleads (a confidently-wrong recommendation is worse than the current "no guidance" baseline).
- No full frequency/purpose gate (see Goals — that's the other skills' job). This guide's "avoid for" lines are a size-appropriate exception: a one-line caveat grounded in the *specific component's* mechanism (e.g. "fires on every pointermove"), not a general restraint framework.
- No per-project customization (brand voice, existing design system). The guide recommends React Bits' own components against generic intents; a specific project's constraints layer on top in conversation, same as today.

## File structure

New file: `react-bits/references/decision-guide.md` — separate from `catalog.md`.

Rationale for separation: `catalog.md` is mechanically regenerated daily from the live registry (`gen-catalog.mjs`) and must stay a faithful mirror of upstream data — no room for curated opinion inside a file a cron job overwrites. `decision-guide.md` is hand-written judgment that cites `catalog.md` entries by name; it changes only when a human (or an agent under instruction) deliberately revises it.

## Weight tier — formal rule

Every recommendation carries a weight tag, derived mechanically from the component's `deps` field in `catalog.md` (no judgment call, so it can't drift from the data):

| Tier | Rule | Rationale |
|---|---|---|
| **light** | `deps: none` | Pure CSS/canvas/vanilla JS. Zero bundle cost, safe default. |
| **mid** | deps present, none of `three`, `ogl`, `@react-three/*`, `postprocessing` | DOM/canvas animation libraries (`gsap`, `motion`, small helpers). Real but modest cost. |
| **heavy** | any dep is `three`, `ogl`, `@react-three/*`, or `postprocessing` | WebGL. Highest bundle + GPU cost; justify before reaching for one. |

This mirrors the dependency-frequency data already gathered for this project (`ogl` 45 uses, `three`-family 22+7+4, `postprocessing` 4 — the WebGL cluster — vs. `gsap` 36 / `motion` 20 as the DOM-animation middle tier, and 39 zero-dep components as the light tier).

## Entry format

```markdown
### <Intent name>
- **Recommended: <Name>** (<deps>, <weight>) — <why this is the default pick>
- Alt: **<Name>** (<deps>, <weight>) — <what it trades off against the recommended pick>
- Alt: **<Name>** (<deps>, <weight>) — <ditto>
- Avoid for: <specific situation> — <mechanism-grounded reason>
```

`Avoid for` is omitted when a component category has no component-specific footgun worth flagging (most component-level intents; it appears mainly on cursor-follow and full-viewport background intents where the failure mode is concrete and specific, not a general restraint reminder).

## Full taxonomy

All entries below are grounded in the current `catalog.md` (verified against it while writing this spec — names, descriptions, and deps below match the live registry as of 2026-08-09; a future regeneration of `catalog.md` supersedes them, hence the staleness guard below).

### Backgrounds

**Hero / landing background**
- Recommended: **Aurora** (ogl, heavy) — flowing gradient, reads as premium/SaaS, the most commonly reached-for hero background in the library
- Alt: **Waves** (none, light) — zero-dep line-wave field, safe default when bundle size matters more than visual richness
- Alt: **Silk** (three+@react-three/fiber, heavy) — richer 3D fabric look, heavier than Aurora
- Avoid for: dashboards/admin panels — full-viewport decorative motion competes with data density

**Section divider / ambient texture** (behind content, low attention, should not compete with foreground)
- Recommended: **DotGrid** (gsap, mid) — animated dot grid reads as texture, not spectacle
- Alt: **Noise** (none, light) — zero-dep film-grain overlay, cheapest ambient option
- Alt: **Grainient** (ogl, heavy) — grainy gradient swirl, richer but heavier than the intent usually needs

**Interactive / cursor-reactive backdrop** (portfolio, creative-agency sites)
- Recommended: **DotField** (none, light) — zero-dep cursor bulge/glow/wave grid, cheapest interactive option
- Alt: **LiquidEther** (three, heavy) — interactive liquid shader, richer, real GPU cost
- Alt: **RippleGrid** (ogl, heavy) — continuous ripple grid, similar cost tier to LiquidEther

**Error / 404 / empty-state mood**
- Recommended: **Lightning** (none, light) — zero-dep procedural lightning, dramatic without WebGL cost
- Alt: **Galaxy** (ogl, heavy) — starfield with parallax, calmer "lost in space" tone
- Alt: **LetterGlitch** (none, light) — matrix-style glitch, fits a "something broke" tone

**Retro / terminal / glitch mood**
- Recommended: **FaultyTerminal** (ogl, heavy) — CRT scanline flicker, purpose-built for this mood
- Alt: **LetterGlitch** (none, light) — zero-dep alternative, matrix-style rather than CRT-style

**Calm / ambient / professional** (SaaS about page, docs site)
- Recommended: **DarkVeil** (ogl, heavy) — subtle dark animation with postprocessing, understated
- Alt: **Waves** (none, light) — cheapest calm option (same pick as the hero-background light alt — one component can serve two intents)
- Alt: **Topography** (ogl, heavy) — living contour map, more distinctive, same cost tier as DarkVeil

### Text Animations

**Heading entrance / emphasis** (first-view impact, seen once per pageview)
- Recommended: **BlurText** (motion, mid) — soft, versatile, low visual noise
- Alt: **SplitText** (gsap+@gsap/react, mid) — precise per-character/word stagger control
- Alt: **ScrollReveal** (gsap, mid) — ties the reveal to scroll position instead of mount
- Avoid for: body copy or any text read repeatedly — reserve for headings seen once per pageview, not paragraphs

**Stat / number counter**
- Recommended: **CountUp** (motion, mid) — purpose-built, formatting + decimals support; no strong alternate in the catalog for this exact intent

**Looping marquee / ticker**
- Recommended: **ScrollVelocity** (motion, mid) — marquee speed tracks scroll velocity, feels responsive rather than decorative
- Alt: **TextLoop** (gsap, mid) — marquee flows along a curved SVG path, more overtly decorative
- Avoid for: dense information tickers users must read carefully — motion competes with reading

**Typewriter / terminal feel**
- Recommended: **TextType** (gsap, mid) — typewriter effect with blinking cursor, purpose-built
- Alt: **SplitFlapText** (none, light) — mechanical departure-board feel, zero-dep alternative with a different (not lesser) aesthetic

**Retro / hacker branding moment**
- Recommended: **DecryptedText** (motion, mid) — glyph-cycling decrypt effect, the most "hacker" option among text components
- Alt: **GlitchText** (none, light) — zero-dep RGB-split glitch, cheapest option

**Interactive / pointer-reactive text** (portfolio hero flourish)
- Recommended: **VariableProximity** (motion, mid) — letter styling reacts continuously to pointer distance
- Alt: **TextPressure** (none, light) — zero-dep pointer-pressure warp
- Alt: **WarpText** (ogl, heavy) — WebGL bend/refract; only justified when the page already pays the WebGL cost elsewhere

### Animations (micro-interactions, cursor effects, entrance wrappers)

**Click / tap feedback**
- Recommended: **ClickSpark** (none, light) — zero-dep particle burst at click point, cheapest positive-feedback option
- Alt: **StickerPeel** (gsap, mid) — playful "peel" commit feedback, better suited to card-shaped targets

**Cursor trail / follower** (portfolio, marketing, creative sites only)
- Recommended: **BlobCursor** (gsap, mid) — organic inertia-based follower, most polished trail effect in the catalog
- Alt: **ImageTrail** (gsap, mid) — trail rendered from images, fits portfolio/gallery contexts
- Alt: **PixelTrail** (@react-three/drei+@react-three/fiber+three, heavy) — retro pixel trail, heaviest option
- Avoid for: any dense or productivity UI — these fire on every pointermove (100+ events/minute of active use), which the frequency-based restraint logic in the upstream `review-animations`/`find-animation-opportunities` skills would reject outright for anything but a marketing/portfolio surface

**Hover reveal / highlight on cards or content**
- Recommended: **GlareHover** (none, light) — zero-dep realistic glare, cheapest hover polish
- Alt: **GradualBlur** (none, light) — cinematic progressive un-blur, suited to image reveals specifically

**Scroll/mount entrance wrapper for arbitrary content**
- Recommended: **AnimatedContent** (gsap, mid) — general-purpose wrapper, configurable direction/distance/duration/easing
- Alt: **FadeContent** (gsap, mid) — fade/slide only; pick this over AnimatedContent when the extra configuration surface is unneeded

**High-flourish 3D/interactive accent** (marketing/hero contexts already paying for WebGL)
- Recommended: **Antigravity** (@react-three/fiber+three, heavy) — 3D particle field repelling from the cursor
- Alt: **MetaBalls** (ogl, heavy) — liquid metaball merge/separate effect
- Avoid for: any context below a marketing/hero page — the WebGL cost isn't justified for incidental UI

### Components

**Navigation** (dock/pill/sidebar)
- Recommended: **Dock** (motion, mid) — macOS-style magnifying dock; the most recognizable pattern, already verified working end-to-end in this project's Playwright smoke test
- Alt: **PillNav** (react-router-dom+gsap, mid) — sliding pill highlight, fits a conventional top nav bar
- Alt: **LineSidebar** (none, light) — zero-dep cursor-proximity sidebar, cheapest option

**Interactive card surface** (feature callouts, pricing, portfolio)
- Recommended: **SpotlightCard** (none, light) — zero-dep cursor-spotlight; cheapest option, already verified working in this project
- Alt: **TiltedCard** (motion, mid) — 3D pointer-tilt, more tactile feel
- Alt: **GlassSurface** (none, light) — Apple-style glass distortion; despite the visual richness, zero dependencies

**Gallery / carousel**
- Recommended: **Carousel** (motion+react-icons, mid) — touch gestures + looping, general-purpose default
- Alt: **CircularGallery** (ogl, heavy) — orbit gallery, more visual flair, real GPU cost
- Alt: **DomeGallery** (@use-gesture/react, mid) — immersive 3D dome; a distinct interaction model (drag-to-orbit) rather than a strict upgrade

**Expanding / staggered menu**
- Recommended: **StaggeredMenu** (gsap, mid) — staggered open/close, the common fullscreen-nav pattern
- Alt: **BubbleMenu** (gsap, mid) — floating circular expanding menu, more playful tone
- Alt: **FlowingMenu** (gsap, mid) — liquid active-indicator between items, subtler than a full open/close menu

**Progress / step indicator**
- Recommended: **Stepper** (motion, mid) — animated multi-step progress indicator, purpose-built; no strong alternate for this exact intent

## SKILL.md integration

Add one new section immediately after "The hard rule" (keeps the fetch-correctness rule as the very first thing read, since it's the higher-severity failure mode):

```markdown
## When to use what

Don't browse 165 names cold. Start from intent — "hero background," "click feedback,"
"stat counter" — and check [references/decision-guide.md](references/decision-guide.md),
grouped by category into common intents with a recommended pick, 2-3 alternates, and a
dependency-weight tag (light = no deps, mid = gsap/motion, heavy = WebGL via
three/ogl/postprocessing) so the choice is grounded in actual cost, not just looks.

Example: "add a hero background, must stay light for mobile" -> decision-guide.md's
Backgrounds > Hero section -> Waves (light) over Aurora (heavy).

This picks *which* component fits. It doesn't decide *whether* to animate at all — for
that judgment call, see the upstream `review-animations` / `find-animation-opportunities`
skills referenced below.
```

Approximately 9 lines — stays within the file's existing token-conscious style (current `SKILL.md` is ~500 words total; this keeps it under ~600).

## Staleness guard

Extend `.github/workflows/update-catalog.yml` with one additional step after "Regenerate catalog from reactbits.dev":

```yaml
- name: Flag components missing from the decision guide
  run: |
    comm -23 \
      <(grep -oE '\*\*[A-Za-z0-9]+\*\*' react-bits/references/catalog.md | tr -d '*' | sort -u) \
      <(grep -oE '\*\*[A-Za-z0-9]+\*\*' react-bits/references/decision-guide.md | tr -d '*' | sort -u) \
      | tee /tmp/uncatalogued.txt
    if [ -s /tmp/uncatalogued.txt ]; then
      echo "::warning::$(wc -l < /tmp/uncatalogued.txt) component(s) in catalog.md have no entry in decision-guide.md: $(paste -sd, /tmp/uncatalogued.txt)"
    fi
```

`::warning::` annotates the run without failing it — new components appearing in the registry shouldn't block the daily catalog refresh; they should surface as a visible TODO for whoever next revises `decision-guide.md` by hand. This is the "cheap diff-based staleness flag" from the approved design — explicitly not an auto-classifier.

## Subagent verification plan

Same RED/GREEN method already used for the fetch-vs-hallucinate baseline test on this skill.

**Test briefs** (span all 4 categories, each engineered to have a clear right-ish answer under the guide above):

1. "SaaS dashboard needs a subtle way to confirm a save action succeeded." (Animations — click/tap feedback; dashboard context should also suppress any cursor-follow suggestion)
2. "Marketing landing page needs an eye-catching hero background. Must stay performant on mobile." (Backgrounds — hero, weight-constrained -> should surface Waves over Aurora/Silk)
3. "Portfolio site wants a playful cursor effect following the mouse." (Animations — cursor trail; portfolio context makes this an *appropriate* use, unlike brief 1)
4. "Blog post wants to show off '10,000+ users' as an animated stat." (Text Animations — counter)
5. "404 page needs some personality, nothing heavy." (Backgrounds — error/empty mood, weight-constrained -> should avoid the heavy alternates)

**RED (baseline):** run each brief against the current shipped skill (no `decision-guide.md`). Expect: either a name pulled from general training-data familiarity (risk of drift back toward the original hallucination failure mode) or an unranked dump of catalog names with no stated reasoning, and no differentiation between brief 1 (avoid cursor-follow) and brief 3 (cursor-follow is fine here).

**GREEN (with the guide):** re-run with `decision-guide.md` present. Pass criteria per brief:
- Recommendation is a real name from the guide's matching intent section.
- Weight reasoning is surfaced unprompted on the two weight-constrained briefs (2 and 5) — e.g. brief 2 should mention Waves being lighter than Aurora, not just assert Waves.
- Brief 1 does not recommend a cursor-follow component (BlobCursor/ImageTrail/PixelTrail); brief 3 does, and does not carry brief 1's dashboard caveat.
- No invented component names (cross-check every name mentioned against `catalog.md`).

**Refactor loop:** any brief where the GREEN run still picks poorly or invents a name -> tighten that intent's wording or its "avoid for" line, re-run only that brief, repeat until all 5 pass.

## Rollout steps (for the implementation plan)

1. Write `react-bits/references/decision-guide.md` (content drafted above; copy in directly, this spec's taxonomy is the source of truth).
2. Add the "When to use what" section to `react-bits/SKILL.md`.
3. Add the staleness-guard step to `.github/workflows/update-catalog.yml`.
4. Run the RED baseline (5 briefs, current shipped skill) and record verbatim outputs.
5. Run the GREEN pass (5 briefs, with the new guide) and score against the pass criteria above.
6. Refactor any failing brief; re-test until 5/5 pass.
7. Commit, push, manually trigger the workflow once (`gh workflow run`) to confirm the new staleness-guard step runs clean against the current (fully-covered) catalog.

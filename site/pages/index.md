---
title: system.css
section:
order: 0
summary: One CSS file, one Datastar runtime, one SQLite file — the stack and its laws, documented once for every project that uses them.
---

**system.css** is a design *engine*, not a component library. You write
semantic HTML and a handful of composition classes, then theme everything
through a few inherited custom properties: `--hue`, `--bg`, `--fg`,
`--type`, `--lift`, `--gap`. There is no `.btn-primary`. A button is a
button; its look comes from the knobs it inherits.

This site is the engine's dictionary and its law, generated from the same
files an agent loads when it works on a project built on the stack:

- **How-to** — start a project, author a page, a form, a rocket, the
  land-and-stream server, the migrations.
- **Engine** — the painter model, the cascade constitution, layout, the
  rhythm ladder, the FOUC ledger, the form canon. The `system-css` skill,
  page by page.
- **Components** — Datastar-driven components over a baked DOM, and the
  rocket state canon. The `datastar-components` skill.
- **Land & stream** — the server half: pure CQRS, the one view channel,
  morph at scale. The `land-and-stream` skill.
- **Charts** — server-rendered SVG styled entirely through the engine.
  The `svg-charts` skill.
- **Lab** — every specimen, live: primitives, compositions, colour, type,
  icons, state, ARIA, forms, charts, and the rocket benches.
- **Skills** — the four skill files as an agent reads them, raw.

## The three laws in one breath

1. **One file, one spine.** The engine is a single stylesheet with a fixed
   `@layer` order. Layers decide the cascade; specificity is zero
   everywhere. A specificity fight is a system failure, never a patch.
2. **No new classes.** Every surface composes the existing primitives
   and the style API. A gap in the vocabulary is raised at the lab bench,
   never filled with a one-off class.
3. **Navigation is the browser's.** Plain links and redirects; the
   backend owns state; the fat morph is the stream's verb. Signals
   sparingly; statics are the only cache.

## Where to start

Read [Start a project](howto/start.html), then keep the
[Engine overview](engine/overview.html) open while you build. When a
page looks wrong, the [Lab](lab/primitives.html) shows what right looks
like.

## The sibling library

[migrate](https://github.com/Deufel/migrate) runs the numbered SQL
migrations for SQLite: one file per change, one transaction per file, a
foreign-key check before commit, a checksum on record. Its README is its
specification; [the how-to](howto/migrate.html) shows the boot wiring.

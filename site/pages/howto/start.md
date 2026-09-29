---
title: Start a project
section: howto
order: 0
---

A project on this stack is a Go server, one SQLite file, one CSS file and
one Datastar runtime. Nothing is built at the front; the server renders
whole pages and the stream morphs them.

## The files

```
static/system.css        the engine — copy it from a release, never edit it in the app
static/datastar.js       the Datastar runtime (core from the CDN, or the Pro bundle you license)
static/rocket/*.js       the client-state components you actually use
.claude/skills/          the four skills, copied whole — an agent loads them before touching UI
db/migrations/0001-*.sql the schema, declared once; every later file one change
```

## The document head

Every page carries the same head. The order matters: the colour scheme
meta before any stylesheet (the interstitial frame between two documents
is painted before CSS arrives), fonts with `display=optional`, the engine,
then one Datastar runtime.

```html
<!doctype html>
<html lang="en" data-ui-theme="dark">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
  <meta name="color-scheme" content="dark"/>
  <link rel="stylesheet" href="/static/system.css?v=…"/>
  <script type="module" src="/static/datastar.js"></script>
</head>
```

Version every static reference (`?v=` from a hash computed at boot) and
cache them immutable: HTML can then never pair with a stale sheet.

## The page shell

The engine's grid has named regions. A page places its parts into them
and nothing else; a region a page does not use collapses.

```html
<div class="page">
  <header class="pg-header">…</header>
  <nav class="pg-navigation spread-column tablet desktop">…</nav>
  <header class="pg-main-header column">…</header>
  <main class="pg-main column">…</main>
</div>
```

Regions: `pg-banner` · `pg-header` · `pg-subheader` · `pg-navigation` ·
`pg-toolbar` · `pg-main-header` · `pg-main-subheader` · `pg-main` ·
`pg-main-aside` · `pg-main-footer` · `pg-aside` · `pg-footer`. This site
is built on exactly that shell.

## The contracts to copy on day one

A project on this stack keeps four tests green from its first commit.
They are cheap to write and expensive to add later:

- **Inline geometry** — a `style=` attribute may carry knobs (`--gap`,
  `--bg`, `--type` …) and anchor plumbing, nothing else; the count per
  template may only go down.
- **The rhythm ladder** — `--gap` takes only its rungs: `0 · 0.25lh ·
  0.5lh · 1lh` for block rhythm, `0.25em · 0.5em · 1em` for inline rows.
- **Every POST classified** — each command route names the role that
  may call it, and the table of classifications is the test.
- **The schema is the migrations** — one baseline, one file per change,
  never edited once committed; the runner records checksums.

## What not to build

No client router, no history API, no client cache, no CSS-in-JS, no
component framework. The browser navigates; the server renders; the
stream morphs; the engine paints.

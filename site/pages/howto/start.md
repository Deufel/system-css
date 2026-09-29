---
title: Start a project
section: howto
order: 0
---

A project is a Go server, one SQLite file, one CSS file and one Datastar
runtime. There is no build step. The server renders whole pages; the
stream morphs them.

## Files

```
static/system.css        the engine, from a release; never edited in the app
static/datastar.js       the runtime: the free bundle with Rocket, or the Pro bundle
static/rocket/*.js       the client-state components you use
.claude/skills/          the four skills, copied whole
db/migrations/0001-*.sql the schema; each later file is one change
```

## Getting the engine

1. The Go module. `go get github.com/Deufel/system-css`. Serve the
   embedded files from your origin, versioned and cached immutable.

   ```go
   import systemcss "github.com/Deufel/system-css"
   // systemcss.Static(): system.css, rocket/*.js
   // systemcss.Skills(): the four skills
   ```

2. The CDN, for a page without a server. Pin a tag:

   ```html
   <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Deufel/system-css@v0.5.1/static/system.css"/>
   ```

3. A copy of `static/system.css` from a release. Do not edit it.

## Head

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

The color-scheme meta comes before the stylesheet: the frame between two
documents paints before CSS arrives. Version each static URL with a hash
computed at boot and cache it immutable.

## Shell

```html
<div class="page">
  <header class="pg-header">…</header>
  <nav class="pg-navigation spread-column tablet desktop">…</nav>
  <header class="pg-main-header column">…</header>
  <main class="pg-main column">…</main>
</div>
```

Regions: `pg-banner` `pg-header` `pg-subheader` `pg-navigation`
`pg-toolbar` `pg-main-header` `pg-main-subheader` `pg-main`
`pg-main-aside` `pg-main-footer` `pg-aside` `pg-footer`. An unused region
collapses. See [The shell](shell.html).

## Tests to add on day one

- Inline geometry: a `style` attribute carries knobs and anchor plumbing
  only. The count per template only goes down.
- The ladders: `--gap` takes `0 · 0.25lh · 0.5lh · 1lh` or `0.25em ·
  0.5em · 1em`; `--measure` takes `1 · 2 · 3`.
- Every POST route names the role that may call it.
- The schema is the migrations: one baseline, one file per change,
  never edited after commit.

## Do not build

A client router, the history API, a client cache, CSS-in-JS, a component
framework.

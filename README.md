# system.css

One CSS file, one Datastar runtime, one SQLite file. This repository is
the design engine (`static/system.css`), the client-state components it
sizes (`static/rocket/`), the four skills an agent loads before touching
UI on the stack (`.claude/skills/`), and the docs site that documents all
of it (`docs/`, GitHub Pages).

**The site:** https://deufel.github.io/system-css/

## Use it

1. Copy `static/system.css` into your project from a tagged release.
   Never edit the copy; raise gaps here.
2. Load one Datastar runtime. The core bundle from the CDN runs the
   engine and the rockets that need no client library; the Pro bundle
   also runs the rockets that import its `rocket` module.
3. Copy `.claude/skills/` whole into your project's `.claude/`.
4. Read the site's How-to, in order.

## Regenerate the site

```
go run ./cmd/sitegen
```

`site/lab/` IS the lab: every specimen of the engine as an HTML fragment,
the dictionary of its vocabulary, embedded as `systemcss.Lab()` so a
project's stale sweep knows which engine words are demonstrated. A new
engine word gets its specimen here first. `static/datastar.js` is the
free Datastar bundle with Rocket (v1.0.4); a project on Datastar Pro
keeps its own bundle at that path.

## The sibling

[migrate](https://github.com/Deufel/migrate) — numbered SQL migrations
for SQLite, the rules and the runner.

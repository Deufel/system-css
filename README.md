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

The lab specimens under `site/lab/` are exported from the EventOS UI lab
(`go run ./cmd/labexport ../system-css/site/lab` there); the lab is the
dictionary, this site publishes it.

## The sibling

[migrate](https://github.com/Deufel/migrate) — numbered SQL migrations
for SQLite, the rules and the runner.

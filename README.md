# system.css

One CSS file, one Datastar runtime, one SQLite file. This repository holds
the engine (`static/system.css`), the rockets (`static/rocket/`), the four
skills (`.claude/skills/`), the lab (`site/lab/`) and the docs site
(`docs/`, GitHub Pages).

**The site:** https://deufel.github.io/system-css/

## Laws

- One file, one spine. Layers decide the cascade; specificity is zero.
- No new classes. Compose the primitives and the knobs.
- Knobs are steps, not lengths: `--type`, `--gap`, `--measure`, `--rise`.
- Nothing shifts. A changing value, an opened state, a loaded row must not move its neighbours.
- Navigation is the browser's. The server owns state.

## Use it

1. `go get github.com/Deufel/system-css`, or the CDN at a tag, or a copy of
   `static/system.css` from a release. Do not edit the copy.
2. Load one Datastar runtime at `static/datastar.js`.
3. Copy `.claude/skills/` into your project.
4. Read the How-to.

## Regenerate the site

```
go run ./cmd/sitegen
```

`site/lab/` is the lab: every specimen as an HTML fragment, embedded as
`systemcss.Lab()`. A new engine word gets its specimen here first.
`static/datastar.js` is the free Datastar bundle with Rocket (v1.0.4). A
project on Datastar Pro keeps its own bundle at that path.

## The sibling

[migrate](https://github.com/Deufel/migrate) — numbered SQL migrations
for SQLite, the rules and the runner.

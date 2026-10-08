---
name: svg-charts
description: Build server-rendered SVG charts (scatter/bubble, line, bar, area, dot, sparkline) in the Go + templ + system.css stack — geometry computed in Go, emitted as an SVG string via @templ.Raw, and styled ENTIRELY through the system.css engine (the --fg ink scale + the currentColor bridge + --hue-shift per series) with ZERO literal colors. Use this whenever building, editing, or theming an SVG chart, graph, plot, or data visualization in this stack (eventos-app / system.css / Datastar / land-and-stream), or whenever the user mentions charts, graphs, plots, axes, gridlines, bubbles, data viz, or asks to "visualize" / "graph" / "plot" data as SVG — even if they don't name the technique. Pairs with the system-css skill (the styling engine); verify with the real toolchain (templ generate · go build · go test) and the cmd/snap visual loop. Do NOT use for client-side JS charting libraries (Chart.js, D3, Recharts) — this is server-rendered SVG strings.
scope: general
---

# SVG charts (engine-styled, server-rendered)

Charts in this stack are **Go functions that return an SVG string**, dropped into a
template with `@templ.Raw(...)`. There is no client-side charting library and no
canvas — the server computes geometry and emits markup, the same way the map in
`view/usmap.go` does. The general builders live in
`view/chartrender.go`; page-owned ones live beside their view —
`view/statusbar.go`, `view/landing.go` (`StatesMapSVG`, `cumulativeSVG` —
gf-341/347/354) and `view/territory.go` (`TerritoryMapSVG` /
`TerritoryStateSVG`, `Project()` pins — gf-364). The shared helpers
(`foLabel`, `hueShift`/`hueStyle`, `ff2`, `scEsc`) stay in chartrender.go
and are IMPORTED, never copied.

The thing that makes this stack different from every other charting approach: **you
never write a color.** No hex, no `rgb()`, no `oklch()` literal, no `fill="steelblue"`.
Every stroke and fill is `currentColor`, and the mike.css engine computes that color
from a single number — `--fg` — that you set on the element or its group. Get this one
idea right and the rest is just coordinate math.

Read `references/worked-example.md` for a complete, annotated build (the
spend-vs-volume bubble chart: Go builder + renderer data method + templ wiring
+ a backend-driven series toggle). ⚠ It is a PATTERN document — its code was
swept in gf-33 and is NOT in the tree; the SHIPPED exemplars to copy structure
from are view/chartrender.go (cssLayersStackSVG / repoLocStackSVG + the
CSSMetricsSection legend in view/admin_dev.templ, live on Admin → Metrics) and
view/statusbar.go.

## The one mechanism you must understand: `--fg` → `currentColor`

mike.css computes ink for **every element** (`@layer core.color { :where(*) { … color: oklch(…) } }`),
and bridges SVG with `:where(svg) { color: currentColor }`. So the recipe is always:

1. Set `--fg` (and `--hue-shift` when you want color) on an SVG element or a `<g>`.
2. Paint with `fill="currentColor"` and/or `stroke="currentColor"`.

That's it. The engine turns `--fg` into the actual `color`, and `currentColor` picks it up.

### The `--fg` scale — `n ∈ [-1 .. 0 .. 1]`

`--fg` encodes **contrast and chroma in one number**. Sign picks the channel; magnitude is strength:

- **`-1`** → heavy **neutral** ink (grayscale, maximum contrast vs. the surface).
- **`0`** → equals the background (invisible — useful for nothing, avoid).
- **`+1`** → maximum **chromatic** contrast (fully saturated ink at the current hue).

Negative is neutral/structural; positive is colored/expressive. So chart *furniture*
(axes, gridlines, ticks, titles) is negative, and *data marks* (bars, bubbles, lines)
are positive when you want them to carry hue. A practical ladder:

| Layer | `--fg` | why |
|---|---|---|
| Faint gridlines | `-0.13` | barely there, just enough to read values |
| Axis lines | `-0.4` | structural but quiet |
| Labels (foLabel default) | `-0.8` at `--type: -2` | readable, clearly furniture |
| Data marks | `1` | full chroma — the data is the star (gf-69, per Mike) |
| Data marks (neutral) | `-0.85` | a single-series chart that wants no hue |
| Quiet outlines (a silhouette behind the data) | `-0.25` | the unselected states/counties, at low fill-opacity (gf-364) |
| A prior period | `-0.55` dashed | last year's line under this year's (gf-347) |
| A secondary fill under the marks | `0.2` | the territory's states under its counties at `1` (gf-364) |

(These are the SHIPPED values — the Metrics charts, the Charts shelf, the
landing and the territory picker use exactly these rungs; don't invent
intermediate steps.)

### Hue per series: `--hue-shift`, never `--hue-lock`

**THE LADDER (gf-182, per Mike — supersedes the full-wheel spread
below):** series step **+30° apiece** from the theme hue — an analogous
run that stays cohesive with the page and re-themes as one family; the
wheel spread read as a carnival against any theme. Fixed step, not
divided by count (series four keeps its color when a fifth arrives).
`hueShift`/`hueStyle` implement it; the shelf's "Categorical color"
card shows the ladder re-theming live under a second surface hue.

The engine's hue is `--hue + --hue-shift` (unless `--hue-lock` overrides it). To give
each series its own color, spread them around the wheel and set `--hue-shift` on the
mark: `shift = idx * 360 / n`. Because it *rides on the inherited `--hue`*, the whole
chart re-themes correctly when the page hue changes — admin-red vs. product-indigo just
works.

**Never reach for `--hue-lock` to color a series.** `--hue-lock` hard-pins hue for an
element *and its entire subtree* and refuses the cascade — it exists only for semantic
primitives (success/info/danger pills) that must mean the same thing everywhere. Using
it as a coloring tool poisons inheritance and is, per the color API's load-bearing
rules, insurmountable tech debt. If you just want a color, that's `--fg` (+ `--hue-shift`).

The ONE sanctioned hue-lock use in a chart: a segment whose color IS a meaning —
created = success, rejected = danger (`view/statusbar.go`'s result bar). That is the
semantic-primitive case the lock exists for, not series coloring.

### Text via `<foreignObject>` — and its scaling trap

ALL chart text is engine-typed `<foreignObject>` — the `foLabel` helper in
view/chartrender.go (2026-08-30, per Mike: no SVG `<text>`, no hand fonts,
no px literals; the engine types everything). ⚠ The text lives in SVG
coordinates: the whole drawing — text included — scales by
rendered-width / viewBox-width, so `--type: -2` only means what it says
when the viewBox width ≈ the rendered width. Pin the builder's nominal W
to its host container and say so in a comment (view/statusbar.go's "THE
NOMINAL WIDTH IS THE DIALOG'S" warning is the exemplar).

## Anatomy of a chart builder

A builder is a plain Go function (`func fooSVG(data …) string`) using a
`strings.Builder` and `fmt.Fprintf`. Structure it in **back-to-front layers**, each
wrapped in a `<g>` that sets `--fg` once:

```
viewBox 0 0 W H  (fixed logical units; the SVG scales to its container)
└─ root <svg> style="inline-size: 100%; block-size: auto; --fg: -0.5;" role="img" aria-label="…"
   ├─ <g> gridlines      --fg: -0.13   stroke=currentColor
   ├─ <g> axes           --fg: -0.4    stroke=currentColor
   ├─ foLabel(...) labels  (foreignObject, --type: -2 / --fg: -0.8 built in)
   └─ data marks         --fg: 1 via hueStyle(idx, n), fill-opacity for overlap
```

Conventions that keep charts consistent and legible:

- **Fixed `viewBox`, fluid render.** Pick logical `W, H` (shipped sizes:
  720×380 for the Metrics stacks, 460×240 shelf bars, 240×60 sparkline) and reserve
  margins (`ml, mr, mt, mb`) for labels. The root style `inline-size: 100%; block-size: auto`
  lets it scale to any container while the math stays in fixed units.
- **Scale functions.** Write small closures `xp(v)`, `yp(v)` that map a data value into
  pixel space. Remember SVG y grows downward, so `yp` subtracts from the bottom.
  Add ~8% headroom to max values so marks don't touch the frame.
- **Area-proportional sizing.** For bubbles, radius ∝ `sqrt(value/max)` so *area* (not
  radius) encodes magnitude — radius scaling lies about the data. Keep a floor (`r ≥ 4`)
  so tiny/zero values stay visible.
- **Translucent marks.** `fill-opacity: 0.4`–`0.5` on bubbles/areas so overlaps read; a
  full-opacity `currentColor` stroke gives each mark a crisp edge.
- **Native tooltips.** Put a `<title>…</title>` inside each mark — free hover text, no JS.
- **Text:** `foLabel(x, y, w, h, align, inner)` — never `<text>`, never a
  `font:` declaration. Escape any user-supplied label with `scEsc`.
- **Compact number formatters.** Small helpers for `$1.2k`, trimmed decimals, etc., so
  axis ticks and tooltips stay readable.

## Gotchas (these will bite)

- **`%` in `fmt.Fprintf` must be `%%`.** `inline-size: 100%%` in the format string.
- **`%g` for coordinates** — clean float output (`70`, not `70.000000`).
- **Raw string literals (backticks) for SVG fragments.** Keep them balanced —
  `go build ./...` is the checker; this is compiled Go, so compile early and often.
- **Don't hand-color anything.** If you typed `#`, `rgb`, `oklch(`, or a color name into
  a chart, stop — it's wrong. Color comes from `--fg` + `--hue-shift` only.
- **`--fg` goes on the element/group, `currentColor` on the paint.** Setting `fill="--fg"`
  or a bare `--fg` with no `currentColor` paint does nothing.

## Integration with the stack

1. **Data** is computed in a renderer method (e.g. `func (rn *Renderer) scatter(…) (…)`),
   returning view structs — never compute chart numbers in the template.
2. **View struct** carries the raw values (one struct per mark) plus whatever the builder
   needs for scaling/color (e.g. a `YearIdx` for hue, a total series count).
3. **Template** calls `@templ.Raw(fooSVG(d.Data, …))`. Wrap it in a `.bg` surface div if
   you want a card around it.
4. **Verify for real.** `templ generate && go build ./... && go test ./...`
   must stay green, and LOOK at the result: render the section through a
   throwaway preview harness test (the GEN_PREVIEW pattern in
   a specimen in the lab's Charts page) or `go run ./cmd/snap`, and read the PNGs — the
   chart bugs worth catching are visual.

### Interactive charts are BACKEND-DRIVEN

Filtering, toggling series, switching grouping, zooming a range — **all server-side.**
This is the load-bearing rule of the stack (the Tao of Datastar; their land-and-stream
architecture). Do **not** reach for client-side `data-show` / `data-style` / DOM mutation
to hide or recolor marks. Instead:

- The control (a `.tag` button, a segmented toggle) carries the input UP as a signal on a
  debounced or click `@post`.
- A command handler reads the signal (`datastar.ReadSignals`), applies **one** mutation
  (toggle a year in/out, change the group key), builds an internal URL with the new state
  as query params, and re-renders the **whole page** through the normal `Stream → resolve
  → PatchElements` path. Browser URL never changes.
- Signals that carry chart state are plain `data-signals` (no `__ifmissing`) so every
  morph re-merges them server-authoritatively. Snapback on a bus-event morph is fine.

**Legends double as filters.** Render the toggle tags with a swatch colored by the *same*
`--hue-shift` index the marks use, via THE shared helper — `hueShift(idx, n)` /
`hueStyle(idx, n)` in view/chartrender.go, the ONLY pair that may exist (a second
copy WILL drift; one already did and was swept). A series' color is then identical
in the chart and its legend by construction.

## The quieting doctrine (gf-69c — what makes a chart look finished)

- **No per-mark totals** — gridlines do the work; numbers live in the native
  `<title>` tooltips, plus at most ONE selective direct label (the endpoint,
  the max) where the question demands it.
- **A legend toggle keeps IDENTICAL content in both states** — no layout
  shift (the outline-not-border spirit); state rides `data-ui-state`.
- Legend = tags tinted by their series hue on a borderless `.surface` at
  `--lift: -0.2`, overlaid in RESERVED margin space (mr accounts for it).
- Title = `hgroup` with `h3` + `small`, HTML over the chart (.chart-host /
  .chart-title / .chart-legend, engine recipes in static/mike.css), never
  drawn in the SVG.
- A single series gets NO legend — the title names it.
- Sorted marks wherever order is free (ranking reads instantly); ONE axis,
  always — two measures of different scale are two charts.

## The shelf — copy from here

**Admin → UI lab → Engine → Charts** is the living catalog: column bars,
dot plot (the ranking form), line+area with endpoint label, donut paired
with the same data as ranked dots (when the question is "which is bigger",
the dots win — the donut earns its place only for "how much of the
whole"), horizontal bars, the calendar heatmap (CSS `.bg` cells — intensity
IS `--bg`; not every "chart" needs SVG), and the stat-tile sparkline. The
general builders (`ChartPoint`, `barColSVG`, `dotPlotSVG`, `lineAreaSVG`,
`donutSVG`, `fbHBarSVG`, `concurrencyLine`) live in view/chartrender.go —
extend those before writing a new one.

See `references/worked-example.md` for the full toggle command + legend-tag wiring.

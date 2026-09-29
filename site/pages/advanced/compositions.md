---
title: Screens from primitives
section: advanced
order: 2
---

There is no dashboard component, split view or kanban. A complex screen
is regions, primitives, the stack and the overlay slots.

## Working screen

```html
<div class="page">
  <header class="pg-header">…</header>
  <nav class="pg-navigation spread-column tablet desktop">…</nav>
  <header class="pg-main-header column">…</header>
  <nav class="pg-main-subheader"><div class="tabs-underline">…</div></nav>
  <nav class="pg-toolbar spread-column tablet desktop">…</nav>
  <main class="pg-main column owns-scroll">…</main>
  <aside class="pg-aside desktop">…</aside>
</div>
```

Leave out unused regions. The [dashboard demo](../demos/dashboard.html)
is this shape.

## Tiles

`.grid` with `--grid-min` and `.card` children. `.row-wide` takes the
whole row. A tile is a `.column` of a caption, a `.num` and a sparkline.

## Roster with a detail

The roster in `pg-main`. The detail in a right `.drawer` opened from the
row, or in `pg-main-aside` on a wide screen.

## Chart with states

A `.card` holding a `.stack`: the chart, a `.glass` veil while it
refreshes, an `.alert` when empty. The card's height does not change.

## Overlays

`.hud` is a fixed, click-through grid with nine slots, `.tl` to `.br`:
the fab cluster, the toast pile.

## Three-zone header

`.lcr` is a `1fr auto 1fr` grid: left, centre, right.

If a screen seems to need a class of its own, it is a specimen the lab
lacks or a composition not yet found. Raise it at the lab.

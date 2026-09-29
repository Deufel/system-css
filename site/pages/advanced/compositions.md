---
title: Complex screens from primitives
section: advanced
order: 2
---

There is no dashboard component, no split view, no kanban. There are
regions, a handful of primitives, the stack and the overlay slots, and
every complex screen is those in some order. Six recipes that cover most
of what an operations product asks for.

## The working screen

The shell with a rail, a toolbar rail for the view's members, the
canvas for the work, an aside for context:

```html
<div class="page">
  <header class="pg-header">…</header>
  <nav class="pg-navigation spread-column tablet desktop">…</nav>
  <header class="pg-main-header column">…crumbs, title, verbs…</header>
  <nav class="pg-main-subheader"><div class="tabs-underline">…views…</div></nav>
  <nav class="pg-toolbar spread-column tablet desktop">…the view's members…</nav>
  <main class="pg-main column owns-scroll">…</main>
  <aside class="pg-aside desktop">…</aside>
</div>
```

The regions a screen does not use, it leaves out. The [dashboard
demo](../demos/dashboard.html) is this shape.

## Tiles

A `.grid` with `--grid-min` and `.card` children: as many columns as fit
at that minimum, one on a phone, the `.row-wide` child taking the whole
row for a hero tile. A tile is a `.column` of a caption, a `.num` and a
sparkline; nothing is sized by hand.

## The roster with a detail

The roster in `pg-main`, the detail in a right `.drawer` opened from the
row. The row stays where it was; the drawer edits it; the stream re-lands
both. On a wide screen the detail can be `pg-main-aside` instead, and the
choice is one class.

## A chart with its states

A `.card` holding a `.stack`: the chart, and over it a `.glass` veil while
the numbers refresh, or an `.alert` when there are none. The card never
changes height between states.

## Overlays

`.hud` is a fixed, click-through grid with nine slots, `.tl` to `.br`: the
fab cluster, the toast pile, a floating "back to top". Nothing inside a
region has to know about them, and a morph cannot disturb them.

## The three-zone header

`.lcr` is a `1fr auto 1fr` grid: a left thing, a centred thing, a right
thing, each aligned to its zone without a margin trick. A page header on
a phone, a dialog's head, a toolbar's middle.

## The rule under all of them

Every one of these is composition: primitives, knobs, ARIA state,
the regions. The day a screen seems to need a class of its own, it is
either a specimen the lab lacks or a composition not yet found. Raise it
at the bench; do not write the class.

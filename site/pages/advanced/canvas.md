---
title: Canvas and rise
section: advanced
order: 3
---

Two knobs that shape a screen without a length written by hand.

## Canvas

A screen opts in by putting `.canvas` on the regions that do the work:
`pg-toolbar`, `pg-main`, `pg-main-footer`. Each paints a rounded, inset
surface at the shared tone `--canvas`, and every adjacency zeroes the
edge it shares: a toolbar beside the main flattens their common corners,
a footer under it the same. Add or remove a region and the corners
re-solve; there is nothing to opt out of and nothing empty to detect.
The tone stack stays legible in three tiers: chrome, canvas, and a card
on the canvas.

## Rise

`.rise` takes `--rise` hundredths of the small viewport as a minimum
block size:

```html
<div class="column rise" style="--rise: 55;">…the hero…</div>
```

The block takes its share of the screen; content taller than the share
pushes past it and the canvas scrolls, which is the honest degradation
on a phone. One number, one meaning, no flex negotiation. The [landing
demo](../demos/landing.html) opens on a rise.

---
title: The stack
section: advanced
order: 1
---

```css
:where(.stack) { display: grid; grid-template-areas: "stack"; & > * { grid-area: stack } }
```

Every child takes the one cell. They overlap, each fills it, and the
cell is as tall as the tallest child.

## States in one footprint

Put loading, content, empty and error in a stack and toggle them with
`data-show`. The cell keeps the tallest height; nothing else moves while
a request is in flight. A state false at land carries
`style="display: none;"`.

```html
<div class="stack">
  <div class="column" data-show="$state == 'loading'" style="display: none;">…</div>
  <div class="column" data-show="$state == 'content'">…</div>
  <div class="alert inf" data-show="$state == 'empty'" style="display: none;"><div>Nothing yet.</div></div>
</div>
```

## A layer over a thing

A `.glass` veil over a chart while it refreshes, a caption over a frame:
the layer fills the cell and carries its own surface. Placement inside
the cell is not the stack's job. For a corner badge use a `.spread` row
above the thing, or the `.hud` slots on a fixed overlay.

## Not for

Anything that should push its neighbours. A single child.
[Specimen](../lab/stack.html).

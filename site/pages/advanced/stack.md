---
title: The stack
section: advanced
order: 1
---

`.stack` is a grid with one named area, and every child takes it:

```css
:where(.stack) { display: grid; grid-template-areas: "stack"; & > * { grid-area: stack } }
```

So the children overlap, each fills the cell, and the cell is as tall as
the tallest of them. That one property is the whole tool.

## The same footprint for every state

A region that can be loading, filled, empty or failed usually reflows as
it changes. Put the four states in a stack and toggle them with
`data-show`; the cell keeps the height of the tallest, and nothing else
on the page moves while a request is in flight. The seed-hide law
applies: a state that is false at land carries `style="display: none;"`
so the landed HTML never paints two states for a frame.

```html
<div class="stack">
  <div class="column" data-show="$state == 'loading'" style="display: none;">…skeleton…</div>
  <div class="column" data-show="$state == 'content'">…</div>
  <div class="alert inf" data-show="$state == 'empty'" style="display: none;"><div>Nothing yet.</div></div>
</div>
```

## A layer over a thing

A veil over a chart while it refreshes, a caption over a frame, a scrim
with a message over a table: the layer is a `.glass` or a `.card` that
fills the cell. It carries its own surface, so the thing beneath stays
legible through the glass and hidden under the card, whichever you
chose. Placement inside the cell is not the stack's job: a layer fills
it. For a badge in a corner, use the `.hud` slots on a fixed overlay, or
a `.spread` row above the thing.

## Where it does not belong

Anything that should push its neighbours. A stack hides height changes;
a list that grows should grow. And never as a positioning trick for one
element: a single child in a stack is a `.column`.

The [Stack specimen](../lab/stack.html) has the three patterns live.

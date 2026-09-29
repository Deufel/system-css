---
title: The wash
section: advanced
order: 0
---

A page's tint. Two soft radial pools in the surface's own colour, fixed
to the viewport, under everything. It is the hue made visible, and it
re-themes with the hue slider and with day and night.

```html
<div class="page">
  <div class="wash" aria-hidden="true"><i></i></div>
  <header class="pg-header">…</header>
  …
</div>
```

## How it paints

- `.wash` is `position: fixed; inset: 0; z-index: -1` with `--bg: 0.26`:
  the engine resolves that `--bg` into the first pool's colour.
- The `<i>` inside is the second pool. It is a real child, at the same
  ladder step and `--hue-shift: 30`, because the engine resolves `--_bg`
  per element and a pseudo-element cannot carry its own hue.
- The host, `.page`, gets `isolation: isolate` through `:has(> .wash)`,
  so the pools paint above the host's surface and under its content.
  Without the stacking context a negative z-index would fall behind the
  body.

## When to use it

A landing page, a public shell, a phone app's home: surfaces that are
mostly one region and want depth without a card. Not a dense working
screen, where the cards already carry the depth and a wash under them
is noise. One wash per page, first child, `aria-hidden`. The [Wash
specimen](../lab/wash.html) puts one on this site so you can move the hue.

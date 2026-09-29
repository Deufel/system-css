---
title: The wash
section: advanced
order: 0
---

Two radial pools in the surface's colour, fixed to the viewport, under
everything. It follows the hue and the theme.

```html
<div class="page">
  <div class="wash" aria-hidden="true"><i></i></div>
  …
</div>
```

- `.wash` is `position: fixed; inset: 0; z-index: -1` at `--bg: 0.26`.
  The engine resolves that into the first pool.
- The `<i>` is the second pool: a real child at the same step with
  `--hue-shift: 30`. A pseudo-element cannot carry its own hue.
- `:has(> .wash)` gives the host `isolation: isolate`, so the pools paint
  above the host's surface and under its content.

Use it on a landing page, a public shell, a phone home. Not on a dense
working screen. One per page, first child, `aria-hidden`.
[Specimen](../lab/wash.html).

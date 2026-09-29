---
title: Canvas and rise
section: advanced
order: 3
---

## Canvas

Put `.canvas` on `pg-toolbar`, `pg-main` or `pg-main-footer`. Each
paints a rounded inset surface at the tone `--canvas`. Adjacent canvas
regions flatten the corners they share. Add or remove a region and the
corners re-solve.

## Rise

`.rise` takes `--rise` hundredths of the small viewport as a minimum
block size:

```html
<div class="column rise" style="--rise: 55;">…</div>
```

Content taller than the share pushes past it and the canvas scrolls.
The [landing demo](../demos/landing.html) opens on a rise.

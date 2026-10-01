---
title: Author a page
section: howto
order: 2
---

## Compose

`.row`, `.column`, `.spread` (space between), `.grid` (auto-fit;
`--grid-min` sets the column floor), `.lcr` (left, centre, right),
`.oneline` (no wrap), `.content-1/2/3` (centred at a rung of the content ladder: 1
column, 2 reading, 3 working), `.card`, `.scroll-x`, `.truncate`,
`.prelines`.

```html
<section class="column content-3" style="--gap: 1lh;">
  <div class="grid" style="--grid-min: 20rem;">
    <div class="card column" style="--gap: 0.25lh;">
      <strong>Location</strong>
      <span>Riverwalk Fest</span>
      <small style="--fg: -0.55;">1 Main St, Joliet</small>
    </div>
  </div>
</section>
```

## Knobs

- `--hue` sets a subtree's hue. `--hue-shift` turns it. `--hue-lock`
  pins it. `.suc` `.inf` `.wrn` `.dgr` are hue locks for buttons, tags
  and graphs, not text colours.
- `--bg` is an absolute surface from −1 to +1. `--lift` is relative:
  N steps above the host.
- `--fg` is the ink. Negative is quiet neutral (`-0.55` for captions).
  Positive is chromatic.
- `--type` is a step on the type scale. It inherits. One step on a
  container re-rhythms text, gaps and control heights.

Numbers: `.num` keeps a value and its delta on one line. `.num-good` and
`.num-bad` colour the valence (a falling cost is good). `.est` and
`.past` mark certainty and time. `.number` is a fixed-width readout.

## State

Pressed is `aria-pressed`. Current is `aria-current`. Disabled is
`aria-disabled`. Invalid is `aria-invalid`, with the message in the
field's `small`. Component phases are `data-ui-state`. No `.active`
class.

## Dialogs and menus

```html
<dialog class="modal" closedby="any" data-preserve-attr="open">…</dialog>
<button popovertarget="m1">More</button>
<div class="menu" popover id="m1">…</div>
```

`data-preserve-attr="open"` is required on a live page: a push morphs the
document and would close the dialog.

## Verify

Render at phone, tablet and desktop widths and look at the images.
Restart the server before judging a CSS change; statics are cached at
boot.

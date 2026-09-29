---
title: Author a page
section: howto
order: 1
---

A page is semantic HTML on the shell's regions, composed from the
engine's primitives and themed through the knobs. The checklist, in the
order you will need it.

## Compose, never class

Layout is `.row`, `.column`, `.spread` (a row with space between),
`.grid` (auto-fit, `--grid-min` sets the column floor), `.lcr` (a
left-centre-right header), `.oneline` (no wrap), `.measure` (a centred
surface; `--measure` is a rung, 1 a column · 2 reading · 3 working),
`.card` (a lifted surface), `.scroll-x`,
`.truncate`, `.prelines`.

```html
<section class="column measure" style="--measure: 3; --gap: 1lh;">
  <div class="grid" style="--grid-min: 20rem;">
    <div class="card column" style="--gap: 0.25lh;">
      <strong>Location</strong>
      <span>Riverwalk Fest</span>
      <small style="--fg: -0.55;">1 Main St, Joliet</small>
    </div>
  </div>
</section>
```

## Theme through the knobs

- `--hue` sets a subtree's hue; `--hue-shift` nudges it; `--hue-lock`
  pins it. The semantic locks `.suc` `.inf` `.wrn` `.dgr` are hue locks
  for buttons, tags and graphs — never text colourers.
- `--bg` is an absolute surface on a −1 … +1 walk; `--lift` is a
  relative one, N steps above the host. Use `--lift` for "a little
  raised on whatever is behind it".
- `--fg` is the ink: negative values quiet neutral ink (`-0.55` is the
  usual caption), positive values chromatic ink toward the hue.
- `--type` is a step on the type scale and it inherits. One step on a
  container re-rhythms text, gaps and control heights together.

Numbers are a separate family: `.num` keeps a value and its delta on one
line, `.num-good` and `.num-bad` colour the **valence** (a falling cost is
good), `.est` and `.past` carry certainty and time. Colour is valence,
typography is time; the axes never collide.

## State rides ARIA

Pressed is `aria-pressed`, the current place is `aria-current`, a
disabled choice is `aria-disabled`, an invalid field is `aria-invalid`
with the message in the field's `small`. Component phases live in
`data-ui-state`. Never a `.active` class of your own.

## Dialogs and menus are native

```html
<dialog class="modal" closedby="any" data-preserve-attr="open">…</dialog>
<button popovertarget="m1">More</button>
<div class="menu" popover id="m1">…</div>
```

On a live page `data-preserve-attr="open"` is mandatory: a push morphs
the whole document and would otherwise close the dialog under the
person.

## Verify with eyes

Render the page at phone, tablet and desktop widths and read the images.
A template that looks right in your head has not been verified. Restart
the server before judging a CSS change; statics are cached at boot.

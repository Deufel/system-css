---
title: The shell
section: howto
order: 1
---

The shell is a CSS grid with named regions. No JavaScript. This page
uses it.

## Regions

```
b  b  b  b  b        pg-banner         full-width band
n  h  h  h  h        pg-header
n  s  s  s  s        pg-subheader
n  mh mh mh a        pg-main-header    crumbs · title · verbs
n  ms ms ms a        pg-main-subheader tabs (n2)
n  t  m  ma a        pg-toolbar (n3) · pg-main · pg-main-aside · pg-aside
n  t  mf mf a        pg-main-footer
n  f  f  f  f        pg-footer
```

`pg-navigation` (n) runs the full height under the banner. An unused
region collapses to nothing. The navigation levels: the rail (n1) lists
sections; the tabs (n2) a section's views; the toolbar rail (n3) the
pages of a view; the lens below the title composes within a page.

## Gates

Responsiveness is show and hide, not a second layout. `.mobile`,
`.tablet` and `.desktop` hide an element outside its band; the visibility
layer, the spine's last, restores it with `display: revert-layer`:

```css
@layer visibility {
  .mobile, .tablet, .desktop { display: none; }
  @media (width < 576px)          { .mobile  { display: revert-layer } }
  @media (576px <= width < 768px) { .tablet  { display: revert-layer } }
  @media (width >= 768px)         { .desktop { display: revert-layer } }
}
```

`revert-layer` rolls the declaration back to what earlier layers said,
so a gated `.row` returns as a flex row. Put the gate on a wrapper that
also carries a layout primitive. Never on an inline element. The
container tiers `.small`, `.medium`, `.large` work the same way inside a
container; a collapsed rail shows glyphs alone.

`display: none` removes the hidden copy from the tab order and the
accessibility tree. Two copies of a control, one per band, is the
pattern. Do not add `aria-hidden` to either.

## Why not a component

The shell must be correct at first paint, survive every morph, print,
and work without JavaScript. The collapsed rail is a stored preference
rendered as a width. Focus mode is a `data-ui-state` the server stamps.
The phone's dock is a region. A component would add client state to the
frame and nothing else.

## Per page

1. Put each part in its region.
2. Set the rail width once on `.page` with `--pg-navigation-w`.
3. Gate the rail `.tablet .desktop`. Give the phone a dock in `pg-footer`
   or a drawer.
4. Set `--bg` on a region to repaint it. The aside is recessed by default.
5. Title, crumbs and verbs go in `pg-main-header`; tabs in the
   subheader; a view's members in the toolbar rail.

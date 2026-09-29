---
title: The shell
section: howto
order: 1
---

The shell is a CSS grid with named regions and no JavaScript. This page
is on it. The decision not to make it a component is deliberate and
worth stating, since Rocket is free now and a `<page-shell>` element is
easy to imagine.

## The regions

```
b  b  b  b  b        pg-banner        the one full-width band
n  h  h  h  h        pg-header        the content-side header
n  s  s  s  s        pg-subheader
n  mh mh mh a        pg-main-header   crumbs · title · verbs
n  ms ms ms a        pg-main-subheader  tabs (n2)
n  t  m  ma a        pg-toolbar (n3) · pg-main · pg-main-aside · pg-aside
n  t  mf mf a        pg-main-footer
n  f  f  f  f        pg-footer
```

`pg-navigation` (n) runs the full height under the banner. A region a
page does not use collapses to nothing, so a public page with no rail
and a phone with the rail gated off need no second grid. The four
navigation levels: the rail (n1) lists sections; the tabs (n2) a
section's few views; the toolbar rail (n3) the pages of a view; the
lens beneath the title composes within a page.

## The gates, and the layer trick

Responsiveness is show and hide, never a second layout. A `.mobile`,
`.tablet` or `.desktop` class hides its element everywhere except its
band, and the media layer restores it with `display: revert-layer`:

```css
@layer media {
  .mobile, .tablet, .desktop { display: none; }
  @media (width < 576px)          { .mobile  { display: revert-layer } }
  @media (576px <= width < 768px) { .tablet  { display: revert-layer } }
  @media (width >= 768px)         { .desktop { display: revert-layer } }
}
```

`revert-layer` rolls the declaration back to whatever the earlier layers
said, so a gated `.row` comes back as a flex row and a gated `<nav>` as
a block. The gate goes on a wrapper that also carries a layout primitive,
never on a styled leaf, and never on an inline element. The same trick
runs the density tiers inside a container: `.small`, `.medium`, `.large`
on rail labels, so a collapsed rail shows glyphs alone.

`display: none` is the right verb because it removes the hidden copy
from the tab order and the accessibility tree. Two copies of a control,
one per band, are the pattern; `aria-hidden` on either is a bug.

## Why not a rocket

The shell must be right at first paint, before any script runs, and it
must survive every morph, print cleanly and hold when JavaScript fails.
A component could add nothing the server's stamp does not already give:
the collapsed rail is a stored preference rendered as a width, focus
mode is a `data-ui-state` the server stamps, the phone's dock is a
region. Client state on the frame is the one place the FOUC ledger says
never to put it. So the shell stays declarative, and the effort goes
into making it explicit: this page, the region table, and the lab.

## What a page does

1. Put each part in its region and nothing outside them.
2. Set the rail's width once on `.page` with `--pg-navigation-w`; let it
   grow for long labels; collapse it by stamping the icon width.
3. Gate the rail `.tablet .desktop`; give the phone a dock in `pg-footer`
   or a drawer.
4. Set `--bg` on a region to repaint it; the aside is recessed by default.
5. Keep the title, crumbs and verbs in `pg-main-header`, tabs in the
   subheader, the toolbar rail for a view's members.

---
name: system-css
description: Author HTML/UI with system.css — an OKLCH + type-driven design engine where components are styled semantic elements themed by inherited custom properties (--hue, --bg, --fg, --lift, --type), not variant classes. Use when building or editing pages, components, forms, tables, dashboards, or app shells on system.css; when the user mentions system.css, the painter/engine model, the .page shell and pg-* regions, the revert-layer gates (.mobile/.tablet/.desktop), the .row/.column/.grid primitives, the .card/.tag/.avatar/.tabs-underline/.search-box components, the semantic hue locks (.suc/.inf/.wrn/.dgr), the number family (.num/.delta/.num-good/.est/.past), or the Laws of authoring. Do NOT use for Tailwind, Bootstrap, or Material work — this engine rejects palette-of-decisions frameworks.
scope: general (the engine travels; the EventOS paths inside are examples)
---

# system.css — the engine

system.css is a small design **engine**, not a component library. You style
semantic HTML (button, table, form) and a handful of composition classes, then
theme everything by setting a few inherited custom properties. There are no
.btn-primary / .btn-lg variant classes. A button is a button; its appearance
comes from the --bg/--fg/--hue it inherits.

## ONE file, one spine

The engine is a SINGLE file: `static/system.css`, edited in-repo (the old
four-file split and the "canonical source lives elsewhere / read-mostly"
doctrine are both retired). Concern boundaries survive as @layer sections
inside the file, opened by one spine statement:

    @layer reset, core.color, core.type, core.layout, theme, base,
           components, utility, media, skin, view-transitions;

Layers, not source order, decide the cascade — read the whole file before
changing it (the layer order IS the cascade; a rule's position in the file
tells you nothing about who wins).

## THE PAINTER MODEL (how color works)

Color is computed, not picked. You never write a hex value. Instead:

- --hue (0–360) sets the base hue for a subtree. --hue-shift nudges it relative
  to context; --hue-lock pins it absolutely regardless of what's inherited
  (used by components and graphs that must stay a fixed color).
- --bg is an ABSOLUTE surface position on a −1…+1 walk through three theme
  anchors: −1 = neutral floor, 0 = paper, +1 = full chroma. Setting --bg on any
  element repaints its surface (the universal :where(*) rule re-derives the
  internal --_bg from each element's own --bg).
- --lift is a RELATIVE surface: this element's surface, N above the host it
  sits on. Use --lift for "slightly raised card on whatever's behind it"; use
  --bg for an absolute surface.
- --fg is the INK. Sign selects neutral vs chromatic ink; magnitude sets
  intensity. --fg: -1 = full neutral ink (near-black on light). --fg: 0.85 =
  high-chroma ink toward the current hue (this is how colored numbers get their
  vivid green/red). Small negative values (−0.5…−0.6) = quiet/muted ink.
- --type is a size STEP on the type scale; it also drives weight — and it
  INHERITS (canon since gf-68): set it on a container and the subtree
  follows; the scale is absolute, so steps never compound. Type IS spacing
  (lh/em everywhere), so one step re-rhythms text AND gaps AND control
  heights (--_control-h is type-derived). COMPONENTS never re-type their
  own elements — only a USAGE site nudges, only through the knob.

Registered properties (@property — typed/animatable): --bg, --fg, --hue-shift,
--lift, --gap, --type, --_sem-ink, --row-width. Everything else is a plain
custom property.

- --focus and --border are the derived token PAIR every surface computes:
  --border is the quiet edge, --focus the vibrant one (focus rings, the
  .Card voice, active outlines). Read them (border: 1px solid
  var(--border)); never redefine them.

Publisher contract: a region or .bg element paints via
background-color: var(--_bg); --surf: var(--_bg); --surf-bg: var(--bg). You
rarely write this — regions and .card do it for you. If you set --bg on a
custom element and want it painted, add .bg or let a pg-* region rule do it.

## THE CASCADE CONSTITUTION (hard laws)

1. Layers decide the cascade. Within a layer, specificity is ZERO. Every
   selector is wrapped in :where(...), and :not() guards go INSIDE the
   :where(). No ID selectors, no !important outside the media and skin layers
   (config switches that must out-cascade), no specificity battles. A
   specificity conflict is a SYSTEM FAILURE requiring root-cause review — never
   patch it with a more-specific selector.
2. Do not touch engine internals when the public API suffices. Internal vars
   are --_-prefixed (--_bg, --_sem-ink). Author with the public knobs above. If
   you find yourself reaching for --_sem-ink, stop — you almost certainly want
   --hue-lock + --fg instead.
3. The right LAYER owns the change. Region surfaces (pg-* --bg) ship in the
   skin layer; an app recipe that has settled graduates into the engine's
   own components layer (the project layer RETIRED 2026-09-01, gf-133 —
   ProjectStyles is gone); a public page's one-off look lives in that
   page's own `@scope` block (the landing's idiom). A rule
   in the wrong layer is silently out-cascaded — that is a layer-placement
   bug, never a specificity problem to fight.
4. **NO NEW CSS CLASSES (gf-185, per Mike, at maximum emphasis).** The
   engine's whole point is explicit declarative HTML composed from the
   EXISTING composition classes + the style API (--type/--bg/--fg/
   --hue-shift/--hue-lock/--lift/--gap) — never a new class per feature.
   A vertical stepper, a card variant, a layout arrangement: composition
   (.row/.column + knobs + the ARIA-state idioms + native elements like
   <progress>), not a class. The EXCEPTION LIST is components that
   require CLIENT STATE (the google-maps rocket, the date picker) plus
   Mike's named three — `.wash`, the landing's `@scope`, `.app-icon` —
   nothing else qualifies without an explicit conversation with Mike.
   When composition genuinely cannot express something, that is a gap to
   RAISE (evolve a composition class, or extend the exception list — at
   the lab bench, with Mike), never a silent new class. Class sprawl
   "enables a corruption that is mathematically impossible to overcome
   after a certain point." Corollary: every NEW component or convention
   is demoed in THE LAB (system-css/site/lab, published at
   https://deufel.github.io/system-css/lab/) and aligned with Mike BEFORE
   product use.

Enforcement is Go now (the cowork-era conformance.py is long gone):
`go test ./...` runs view/ratchet_test.go — the INLINE-GEOMETRY ratchet
(style= is sanctioned only for --knobs, anchor-name/position-anchor, and
commented one-offs; per-.templ counts may only go DOWN), the icon 24px-box
ratchet, and the anatomy-reach ratchet (project CSS may not restyle engine
anatomy). The cssaudit package charts lines-per-layer complexity on the
admin Metrics page. Keep them all green.

## LAYOUT — the page shell and primitives

Regions (grid areas on .page, 5-column shell): pg-banner (b), pg-header (h),
pg-subheader (s), pg-navigation (n), pg-toolbar (t), pg-main-header (mh),
pg-main-subheader (ms — a band under the main header: tabs, crumbs, filter
strips that belong to main but must not scroll with it), pg-main (m),
pg-main-aside (ma — the main-scoped flank, inboard of pg-aside, starting under
the main header), pg-main-footer (mf), pg-aside (a), pg-footer (f). Set --bg on
any of them to repaint. pg-aside is recessed by default.

Rails are MIN-WIDTH, TYPE-DERIVED, SERVER-DRIVEN. The published knobs are
--pg-navigation-w / --pg-toolbar-w (default 8lh, stamped once on .page);
rails can GROW for long content and are exact only when collapsed, where the
width is the glyph ANATOMY calc (glyph + item padding + rail padding —
centered by construction, never by bespoke rules). Collapse is an explicit
server-stamped width (the theme pref (sys_pref, key nav_density) → --pg-navigation-w:
var(--rail-w-icon)); labels drop out through the container TIER gates
(.medium/.large on the label span). The data-ui-density attribute is
RETIRED and stays retired — never infer density from attributes, and never
infer rail shape from page width (the @container page restyle is retired
too).

Asides are CONTENT-SIZED (no declared width, no containment — the auto track
hugs the one-off widget the flank carries). Consequence: aside content cannot
gate on the aside itself. ONE topology: there are no alternate grids at narrow
widths — a region that cannot fit gates itself (.c-desktop on an aside) and its
track collapses; narrow reachability of a gated flank is an app decision (dock,
drawer), not a shell re-slot.

Flow primitives: .row / .column (flex), .grid (auto-fit with --grid-min),
.spread (space-between row), .lcr (left-center-right 3-zone grid — used for
headers), .flank, .oneline (nowrap), .stack (overlap).

Responsive gates (revert-layer trick, in the media layer) — TWO FAMILIES, TWO
JOBS:
- Viewport gates: .mobile / .tablet / .desktop show an element only at that
  viewport width. Container equivalents (LAYOUT band family): .c-mobile /
  .c-tablet / .c-desktop, same breakpoints (576px / 768px) measured on the
  nearest query container.
- DENSITY TIERS (component scale): .small (< 8rem) / .medium (8rem–20rem) /
  .large (≥ 20rem). small = the glyph alone; medium = glyph + label; large =
  the full block. "And-up" is the multi-class idiom (class="medium large").
  The 8rem boundary is rail math: it straddles the rail's two declared widths
  at every type size, so rail content gates on the tiers instead of inferring
  density from attributes.
- .fine / .coarse gate on pointer type.
Container rule: gate classes go on a dedicated wrapper div, never on a styled
leaf component, and the gated element must also carry a layout primitive
(revert-layer restores the primitive's display, not a default).

Focus mode (gf-262): a STORED pref like every other display choice —
the server stamps data-ui-state="focus" on .page and the chrome
collapses so pg-main* fill the viewport. The Theme shelf of the profile
dialog posts /settings/focus/mode; the focus fab retired in gf-307 (its
engine classes .focus-fab .i-expand .i-collapse wait, undemoed, for the
day it returns) and the old hidden #focus-toggle checkbox before it.

THE EDIT CARD (gf-262, view/settings.templ editCard): the ONE shape for a
record's form — h3 + pencil top-right (unlocks), the canon fieldsets bound
readonly while locked, Cancel bottom-left as a native type="reset" (the
fields fall back to their stored values — no seed strings), Save
bottom-right posting the form (contentType 'form'). Stored values are
judged by the RENDER (aria-invalid + the message in the field's small —
canon (4)); a wizard lights the one control to click next with
data-ui-state="guide" (a still ring + a slow glow, motion-gated; the
set-up walk that first used it retired in gf-313).

Print: @media print (in the media layer) strips every region except pg-main*,
drops surfaces to white while keeping borders, forces black ink. The screen is
the themed medium; paper is austere.

## COMPONENTS (styled semantics + a few classes)

.card (lifted surface panel), .tag (small pill; pair with a hue helper),
.avatar, .crumbs (--type: -3, a crumb <a> is a BARE link — the recipe restates nothing base owns, gf-334), .tree
(nested lists of links), .tabs / .tabs-underline (the latter is the GitHub underline
treatment; icon-aware, .count pill support), .button-group, .nav-item /
.nav-icon, .drawer (+ .left/.right/.top and .glass), .modal, .menu (popover),
.search-box (icon+input+kbd as one control), .icon (THE icon-only square —
explicit class, aria-label required; never rely on selector inference),
section.owns-scroll (a component-scrolled section that stops clipping —
how every full-height roster is built; overflow-y:auto clips BOTH axes,
which is why corner badges shear without it), .roster (THE SERVER-DRIVEN
TABLE: one class on the div holding a roster's head, form and table;
truncating cells, the hugging column model with .clip absorbers, tonal
head and hover, 1lh head controls that wake on hover, the shadowed
.scroll-x — all CSS over server markup, zero client state), .focus-fab, .glass utility,
.hud overlay slots (t/c/b row × l/c/r column; corner slots pad 1lh, the
centre none — a scope zeroes it when the top row must be one line,
gf-358; a .fab-1/2/3 inside a .hud is frozen to 2.4lh), .wash (gf-359 — a
viewport-fixed underlay of two soft pools in the surface's own colour;
`:has(> .wash)` makes the HOST a stacking context so the pools paint
above its surface and under its content; the second pool is a real CHILD
at --hue-shift: 30, never a pseudo — the engine resolves --_bg per
element), .county-map (an engine recipe demoed in the lab only since
gf-364's picker paints by --fg groups).

Anatomy glyphs are DECLARED boxes: flex-frozen, exempt from the reset's
fluid max-inline-size cap (the 4px-glyph bug), and .icon self-centers —
a square control never stretches. Know what a class IS before composing
it: .sec is a skin-layer BUTTON voice — on a wrapper it paints a ghost
box (the gf-46 button-group scar). Voices, locks, and recipes attach to
specific anatomy.

Dialogs are native <dialog class="modal"> in three engine sizes (.sm 22rem ·
default 28rem · .lg 54rem, all glass, top-pinned), opened by a one-line
showModal() onclick and closed declaratively (closedby="any";
data-preserve-attr="open" is MANDATORY on every dialog on a live page — a push morphs the whole page and closes it under the person (gf-357)). popover +
popovertarget drive menus — and a closed .menu popover must get
display:none, never opacity alone (opacity leaves hidden menus in the tab
order).

## SEMANTIC HUE LOCKS vs NUMBER FORMATTING (keep separate)

- .suc / .inf / .wrn / .dgr are HUE LOCKS. They pin a hue
  (success/info/warning/danger) against local context so a button, tag, or SVG
  graph stays that color no matter what --hue surrounds it. They set --hue-lock
  (+ the commit flag). They are NOT text/number colorers.
- The number family (separate concern, in system.css utility layer):
  - .num — a value+delta cluster: white-space: nowrap + tabular figures,
    auto-spaces a child .delta. Keeps "312 CE ▲ 8%" on one line.
  - .delta — small tabular indicator (▲ 8%), never wraps. Layout only.
  - .num-good / .num-bad — chromatic green / red ink via
    --hue-lock: var(--hue-suc|--hue-dgr) + --fg: 0.85. Self-contained number
    formatters, independent of the .suc/.dgr component locks.
  - .num-flat — quiet neutral ink for unchanged values.
  - .est — italic + ~ prefix: an estimate/projection.
  - .past — quieted ink (--fg: -0.55): a prior period.
  - .num-table — table modifier: all cells tabular; .num cells right-align.

The two-axis rule: COLOR encodes valence (favorable/unfavorable — color the
valence, NOT the raw sign; a falling cost is favorable → .num-good). TYPOGRAPHY
encodes certainty/time (.est, .past). The axes are orthogonal and never collide
— a past unfavorable delta is quiet AND red.

The CSS/Go dividing line: if a class changes how a number looks in context
(color, weight, alignment, wrapping) it is CSS. If it changes which digits
appear (rounding, currency, k/M abbreviation, precision) it is Go — format the
string in the template, then let CSS style the finished text.

## THE RHYTHM LADDER (gf-231, per Mike — "prevent drift")

`--gap` takes ONLY these rungs — a usage site picks a rung, never a
number: block rhythm `0 · 0.25lh (default) · 0.5lh · 1lh`; inline rows
(chip/button rows) `0.25em · 0.5em · 1em`. 419 inline gaps across 23
values had crept in before this; `TestGapLadderRatchet` counts
off-ladder values per .templ and the count may only go down (event/home
are clean; admin/settings carry the grandfathered debt — snap values
when you touch a site). Same spirit for every knob: the engine owns
the scale, templates pick steps.

## Authoring checklist

- Theme by setting --hue / --bg / --lift / --fg / --type, not classes.
- Never write a hex color. Never write an ID selector or !important (outside
  media/skin). Never fight specificity — find the root cause.
- Gate responsiveness with .mobile/.tablet/.desktop on wrapper divs.
- Use native dialog (showModal + closedby) and popover for dynamic UI.
- Inline style= carries ONLY knobs (--bg/--fg/--type/--gap…) or anchor
  plumbing — the geometry ratchet counts everything else, and counts may
  only go down. Run `go test ./...` after every CSS change.
- Engine changes go in static/system.css in the right layer; a settled app
  recipe graduates into the engine's components layer, a public page's
  one-off look rides its own `@scope` block — never unlayered, never a
  project layer (retired gf-133).
- VERIFY WITH EYES, not imagination: a throwaway GEN_* preview test
  (view/preview_test.go pattern) or `go run ./cmd/snap`, then READ the
  PNGs. And remember staticfs caches assets at boot — restart the app
  before judging any CSS change against the running server.

## View transitions & the FOUC ledger (hard-won — do not relearn)

**CROSS-DOCUMENT VT IS OFF (gf-200, per Mike: "more trouble than it's
worth").** Measured 2026-09-04: with `@view-transition
{navigation: auto}` active, EVERY same-origin navigation stalled ~4s —
the old document held open (SSE alive four seconds past the new GET)
waiting for a snapshot that never completed, then the transition timed
out, skipped, and showed the white interstitial; cross-origin
navigations ran in 21ms. All cost, no cross-fade. The opt-in is
commented out in the view-transitions layer with the evidence; the
`html[data-vt-ran]` pagereveal probe stays armed — any re-enable
experiment starts by uncommenting the opt-in and watching that probe,
and MUST verify the ~4s stall stays gone. The baked `meta
color-scheme` keeps plain document swaps dark-to-dark.

The nav cross-blur lived in `@layer view-transitions` (the spine's last
layer; the old `project` tail is retired) as `@view-transition
{ navigation: auto }` plus explicit animations. The navigation-flash
bugs run to ground so far; each is a LAW now:

- **Stale-sheet FOUC is dead — assets are VERSIONED (gf-188).** The
  static handler computes a per-file version at boot; layout stamps
  every static reference `?v=` (the `av()` helper, wired via
  `view.AssetVer`); versioned URLs cache `immutable`, so HTML can never
  pair with a mismatched sheet no matter the deploy cadence. If a
  "FOUC after deploy" report ever returns, check av() coverage first —
  module-internal import specifiers are the one known unversioned crack.
- **One name, one rendered box includes OVERLAYS (gf-188).** The toasts
  hud was a second not-`.mobile` `.hud` silently sharing `vt-hud` with
  the fab cluster — armed only when an unseen toast painted it, then
  every navigation hard-cut. Overlays whose content differs per page get
  `view-transition-name: none`, never a lifted group.

- **Custom VT animations silently wipe plus-lighter (gf-140).** The UA
  applies `mix-blend-mode: plus-lighter` through its OWN animation —
  override `animation-name` on `::view-transition-old/new` and the blend
  vanishes: mid-cross the two half-transparent snapshots sum below 100%
  and the canvas flashes through every navigation. Any custom VT
  animation must restore `isolation: isolate` on the image-pair,
  `plus-lighter` on old/new, and LINEAR timing both sides so opacities
  sum to 1 at every instant.
- **In-flow data-show FALSE-at-seed carries inline `display: none;`
  (gf-198 — THE SEED-HIDE LAW).** Datastar evaluates after its module
  loads, AFTER first paint: an in-flow element whose data-show
  expression is false at land paints VISIBLE for a frame (Set-Up →
  General landed doubled with a live Save row; every feedback thread
  landed with its composer open). The floor is the landed HTML itself:
  seed-hide with inline `display: none;` (datastar overwrites
  el.style.display on evaluation). Same law for data-attr state:
  BAKE the landed value server-side (the locked form now lands
  `data-ui-state="locked"` beside its data-attr binding). Elements
  inside a closed `<dialog>` are exempt — they never paint. `display`
  in this idiom is state, not geometry; the ratchet baselines carry a
  dated note where it is used.
- **Client-state hosts get their display rule in the ENGINE, not a
  rocket-injected sheet (gf-198).** hold-confirm's
  `display:inline-flex` lived only in JS injectCSS — the pre-upgrade
  frame rendered the host inline and reflowed on connect. Every
  custom-element host is sized by system.css's `:where(host)` rules
  (date-picker, day-picker, combo-box…); a rocket's injected CSS may
  add BEHAVIOR chrome only, never the host's own box.
- **The INTERSTITIAL frame is pre-CSS — bake `meta color-scheme`
  (gf-200).** Between two documents the engine paints the window
  default (WHITE) until the incoming page's color-scheme is known;
  CSS's `color-scheme` arrives too late for that frame. Chrome-the-
  browser masks the gap with the cross-doc view transition; app-mode
  windows (chromium --app — Omarchy web apps) don't, so dark-mode
  users see a white flash on every click. The layout bakes
  `<meta name="color-scheme">` from the SERVER-known theme (dark /
  light / "dark light" for auto) beside the theme-color meta — the
  blank frame then paints in the right darkness with or without a
  view transition.
- **Every `<script>` in the head must exist on disk (gf-47).** A
  parser-blocking 404 stalls first paint AND breaks the VT handoff. A
  batch commit once scooped an unrelated deletion — verify a commit's
  file list, and after deleting any static/ file grep layout.templ for
  its tag.
- **One landing = ONE document GET (gf-47).** A client-side default-view
  or remembered-lens re-navigation doubles the load and the cross-fade
  (reads as page-wide FOUC). Any "apply stored view" logic must compare
  URLs order-insensitively (page=1 ≡ absent) and use location.replace
  with a handoff key that skips the second transition.
- **Theme/size/skin seed rides the ROOT element (gf-108), and statics
  serve stale-while-revalidate (gf-113)** — the `<html>` data-attrs must
  be baked server-side (a bundle that evaluates root bindings before the
  body seed strips the theme for a frame), and `staticfs` must keep
  `max-age=0, stale-while-revalidate` so CSS renders from cache
  instantly. Check response headers before suspecting the cascade.

When a flash report arrives: FIRST check the console for 404s and count
document GETs per click (network tab), THEN test with `--cfg-motion: 0`
(a flash that survives motion-0 is a blend/paint bug, not an animation
bug), and only then read the VT rules.

## THE FORM CANON (gf-173, per Mike — follow this EXACTLY)

The practice bench is the lab's Forms page (site/lab/forms.html,
https://deufel.github.io/system-css/lab/forms.html); the engine rules live in
the form/fieldset sections of system.css. If a product form doesn't look
like the bench specimens, the product form is wrong.

- **Everything lives in `<fieldset>`s.** A fieldset is ONE ROW of
  fields; `<legend>` names the group (the legend's own `<small>` is the
  GROUP state slot). A form-section heading is `<h3>`.
- **Every field — checkboxes included — is label → small → control:**
  `<label><span>Name</span><small></small><input/></label>` (checkbox:
  `<label><input/><span>Text</span><small></small></label>`). The EMPTY
  `<small></small>` is mandatory — it reserves the 1lh state row so the
  layout never shifts when a message lands.
- **`<small>` is STATE, almost never a caption.** Self-descriptor hint
  text is a smell — if information is truly needed, it belongs in the
  page's info popover. State lights the slot through the canonical
  channels only: `aria-invalid="true"` on the control (danger hue +
  message in that field's small) or `.suc/.inf/.wrn/.dgr` on the label
  or fieldset. Never a separate error div.
- **Everything fills the entire width** — controls by the canon's own
  rules; a lone submit `button` in a `.column` does NOT stretch on its
  own, it takes `class="fill"` (gf-313: the wizard's buttons). Row shares ride
  `--row-width: <number>` — a BARE NUMBER (it is a registered
  `<number>` property; a flex shorthand like `1 1 100%` is INVALID and
  silently falls back to 1). Since gf-173 labels flex under legended
  fieldsets too; buttons keep hugging.
- **The submit runs through datastar:**
  `data-on:submit__prevent={"@post('"+url+"', {contentType: 'form'})"}`.
  A file input additionally requires `enctype="multipart/form-data"` on
  the form (gf-52 — without it the bundle silently drops the file). A
  second endpoint on the same form = a `data-on:click` @post button
  (formaction can't fire under __prevent; nested forms are
  parser-dropped, gf-63).
- **The handler stores → publishes → answers 204.** Never HTML back,
  never a redirect on a datastar form; the fat-morph re-lands truth.
  `required` generates the asterisk — never hand-write one.
- **`<div role="form">`** is the sanctioned formless spelling for a
  CQRS group (checkboxes that post individually) — same recipe, no
  submit.
- **State rides the OUTLINE, never the surface (gf-174):** a stated
  field keeps its neutral raised background; the locked hue colors only
  the border and the small (the engine re-hues the bg back to ambient —
  don't fight it, don't add tinted backgrounds).
- **Fieldsets breathe:** the engine gives a fieldset 0.35lh after
  itself inside a form (gf-174) — never add manual spacers between
  groups. An `<hr>` may draw the seam between CONCERNS in one form; a
  `<details><summary>` folds a rarely-touched tail (fields inside
  follow the same canon).
- **The segmented groove splits EVENLY (gf-175):** chips share the
  groove equally (flex: 1) and the checked chip wears the ACTIVE state
  paint (--bg: 1, inverted ink — same as [data-ui-state="active"]). Be
  prudent: don't wear the groove where the longest option can't fit its
  equal share.
- **The LOCKED form (gf-175):** the reading state — NOT disabled.
  `data-ui-state="locked"` on the form (field chrome stands down,
  controls sleep, buttons stay live) + real `readonly` on text controls
  for AT (aria-readonly doesn't apply to role=form). The state rides a
  SIGNAL + data-attr bindings so fat-morphs re-land it intact (the
  orgEdit precedent); Unlock flips the signal, Save re-locks through
  the normal 204+publish, Cancel just re-locks and the morph restores
  stored values. Specimen on the bench.
- **THE SINGLE-ROW FORM (gf-183, per Mike):** for concise surfaces
  that must not hog space — a chat composer, a compact search, an
  inline sign-in. ONE legend-less `<fieldset>`, BARE controls
  (aria-label + placeholder carry the name; no label grid, no state
  small), the submit hugging its own width (buttons hug in every
  fieldset). Weight fields with `--row-width` as usual. The moment a
  field needs a visible name or a state slot it has outgrown the
  pattern — use the full canon.
- **THE ACTION ROW (gf-176, per Mike): submit bottom-RIGHT, cancel
  bottom-LEFT, SPREAD apart** — `<div class="spread">` as the form's
  last row (cancel/destructive first, submit last; a lone submit rides
  an empty `<span></span>` on the left). Opposite-effect buttons get
  maximum visual separation so a user can't fat-finger the wrong one.
  Never a centered or adjacent pair.
- **THE DATABASE FLOWS (gf-176 — wired specimens on the lab's Forms
  bench):**
  (1) EDIT/SAVE/CANCEL — the draft mechanism: Edit seeds signals from
  the stored value (the seed expression is server-rendered, so morphs
  keep it fresh), typing stays client-side, Cancel discards, Save posts
  signals → 204 → morph re-lands truth.
  (2) UNLOCK/AUTOSAVE/LOCK — no draft, no Save: the bound field posts
  on `data-on:input__debounce.500ms`, the morph carries the receipt
  ("saved …" in the legend's small), Lock re-sleeps the chrome.
  (3) SQL PREFLIGHT (gf-177) — the draft debounces into a CHECK op that
  validates WITHOUT writing (business rules + a uniqueness query, self
  excluded) and stores draft+verdict in a scratch row; the morph
  disables Save and speaks a CONCISE per-rule message in the error
  small (which speaks ONLY on error); Save re-validates and lets the
  real UNIQUE constraint backstop a race; Cancel clears the scratch —
  nothing was ever written.
  (4) DEBOUNCED STORED-STATE VALIDATION — the value stores raw; the
  RENDER judges it and the morph delivers aria-invalid + the message in
  the field's small. Validation is stored state re-rendered — never
  client truth; a second tab goes red at the same instant.
- **THE LAYOUT-SHIFT DOCTRINE (gf-178, per Mike): whenever possible,
  do not cause layout shift.** Editing must not reflow the page. For
  edits with significant validation, use the ANCHORED SMALL DIALOG:
  `.modal.sm.anchored` — the subject wears `anchor-name`, the dialog
  wears `position-anchor` (the sanctioned inline pair). ⚠ Chrome gives
  DIALOGS no implicit invoker anchor yet (popovertarget does, commandfor
  on a dialog does NOT — verified live, gf-183): the trigger wears
  `anchor-name`, its click stamps `el.style.positionAnchor` on the
  dialog BEFORE `commandfor` opens it (pinned from the first paint), and
  the server re-stamps it by morph from the stored edit state. One
  dialog, many triggers. It opens pinned beside the subject in the top
  layer (zero shift), growing toward inline-START (edit triggers live
  at row ends), with a `min-inline-size` in the recipe — without one,
  auto width silently SHRINKS into a cramped position-area region
  instead of overflowing it, and `position-try-fallbacks` never fire
  (fallbacks trigger on overflow only — verified live, gf-184). The platform gives the focus
  trap + an inert page (exactly ONE edit open, by construction) and
  Escape/light-dismiss ARE cancel — wire `data-on:close` to the cancel
  op so an abandoned edit can never leak scratch state. One dialog per
  surface, always in the DOM (the selected-row idiom), content +
  anchor server-rendered from stored edit state, kept open across
  morphs by `data-preserve-attr="open"`. Inline editing remains right
  ONLY for trivial single-value flips (a status select, a checkbox) —
  anything with preflight rules earns the dialog.
- **`.stress` is the lab's resize handle** (resize: horizontal) — for
  stress-testing specimens only; product surfaces size by composition.
- **Radios have two spellings:** a PLAIN group rides the checkbox
  recipe (input → span → small, one label per option, per-option state
  smalls); a short exclusive choice worn like a control is the
  SEGMENTED `.tabs` groove — a `div role="group"` with a `.legend`
  child (NOT a fieldset — its anonymous box breaks tile stretch). Both
  A label may carry an ICON before its span (gf-362: Manufacturer |
  Wholesaler | Retailer with factory · truck · store); a disabled option
  keeps its chip and says why in `title`.
  are specimens on the lab's Forms page.

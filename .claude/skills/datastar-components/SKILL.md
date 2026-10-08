---
name: datastar-components
description: Author small interactive UI components from Datastar reactive attributes over a baked DOM, styled with system.css — date pickers, range pickers, month calendars, comboboxes/autocompletes, and multi/single selection grids. Use whenever building or editing such a component with Datastar (data-signals/data-bind/data-text/data-show/data-class/data-attr/data-style/data-on), or when the user mentions Datastar, $-signals, a baked-grid-of-buttons component, an anchored/flipping popover, the lowercase-namespace gotcha, data-ui-* state hooks, or wiring reactive state onto system.css primitives. Pairs with the system-css skill (which covers the styling engine itself). Do NOT use for React/Vue/Svelte components or for server-rendered Datastar SSE backends — this is client-side, build-stepless, signal-driven HTML (the server half — CQRS commands, streams, morph-vs-replace — is the land-and-stream skill).
scope: general
---

# Datastar-enhanced components

These components are **HTML, not a framework app**. There is no build step, no
virtual DOM, and no client-side templating. The markup *is* the component;
[Datastar](https://data-star.dev) attributes make it reactive, and
mike.css styles it (static/mike.css — read the system-css skill). State lives in **signals**, not in
form fields — with the land-and-stream qualifier stated up front: signals
hold COMPONENT-EPHEMERAL state (draft, hover, shown month) and act as
TRANSPORT for commands; anything a view renders is STORE truth, and a
fat-morph re-merging a signal server-authoritatively is correct behavior,
not a bug. Every component below is the same small shape — learn it once.

> Read the **system-css** skill for the styling engine (--bg/--fg/--type,
> primitives, the surface contract). This skill is only about wiring Datastar
> onto it.

## The recipe — every component follows it

1. **One signal namespace holds all state.** `data-signals:ns="{ ... }"` on the
   wrapper. Everything reads/writes `$ns.field`.
2. **Bake the structurally-constant DOM.** Datastar has **no client-side loop or
   template**. A month grid always has 42 day cells; a numpad has 12 keys; a
   combobox list has N options. Emit those nodes at author/build time (a Python
   f-string loop, a server template — anything that runs *before* the page
   ships). The DOM shape is fixed; only its *content and state* change.
3. **Bind each baked node reactively** — `data-text`, `data-show`,
   `data-class`, `data-attr`, `data-style`, `data-on`.
4. **Props down via pure helpers; events up via `data-on`.** Plain JS functions
   take signal values as arguments and return a value/boolean
   (`cellIsToday($cal.v, i)`, `cbFilter($cb.q)`). They never read globals or
   mutate — they're props-down. `data-on:click` is events-up: it mutates the
   signal, the bindings recompute.
5. **Layout from the engine's primitives in the markup; the rest from the API.**
   See "Don't hand-roll layout" below.

## Datastar bindings these components use

| Attribute | Purpose |
|---|---|
| `data-signals:ns="{...}"` | declare the component's state (JSON; may reference globals like a baked `DP_INIT`) |
| `data-bind:field` | two-way bind a control's value to a signal |
| `data-text="expr"` | element text content |
| `data-show="expr"` | toggle visibility (inline `display`) |
| `data-class:name="expr"` | toggle a class |
| `data-attr:name="expr"` | toggle/set an attribute (**see boolean rule below**) |
| `data-style:--prop="expr"` | drive a CSS custom property → repaints through the engine |
| `data-on:evt="stmt"` | event handler (`click`, `input`, `keydown`, `focus`, `blur`, …); `evt` is in scope |

### Gotchas (all verified by rendering)

- **Lowercase the signal namespace.** HTML lowercases attribute names, so
  `data-signals:calSm` becomes `calsm` and `$calSm` silently fails to resolve.
  Use all-lowercase namespaces: `dp`, `rng`, `cb`, `sel`, `view`, `cal`.
- **`data-attr:NAME` with a boolean toggles attribute _presence_**, not a
  `"true"`/`"false"` string. `data-attr:data-ui-selected="cellIso(v,i) === $cal.sel"`
  puts `data-ui-selected` on the selected cell and removes it elsewhere — so
  `[data-ui-selected]` matches *exactly*. Multi-dash names work. For a **token**
  attribute (a value, not mere presence) use a ternary:
  `data-attr:aria-current="cellIsToday(v,i) ? 'date' : 'false'"` → matched as
  `[aria-current="date"]`.
- **`data-style:--prop` is the reactive paint knob — for COMPONENT CHROME
  only.** `data-style:--bg="busy(iso)"` drives a cell's surface through the
  color engine; prefer it over toggling many classes. It is NEVER for
  application data or chart marks — data recolors server-side (the
  svg-charts backend-toggle rule); this knob paints the throwaway
  interaction state a component owns.
- **Avoid `data-computed`.** It silently no-opped under an earlier bundle;
  inline the expression in each binding instead. (The project pins Datastar Pro
  v1.0.2, which does export `computed` — re-verify by rendering before relying
  on it.)
- **No client loops.** Bake the constant DOM, then `data-show`/`data-text` each
  baked node. Don't try to generate rows on the client.
- **A suggest lane replies to a FIXED listbox id.** `SuggestReply(w, r,
  "ws", …)` patches `#ws-list` (`ComboOptionsView` renders `id+"-list"`),
  so a ComboBox/ComboSelect's `id` must EQUAL its lane's reply id and be
  unique on the page. gf-367: the portfolio wizard's `pfws`/`pfwb` boxes
  posted to lanes that answered `ws`/`wb` — the search never landed an
  option and nobody saw an error.
- **`data-bind` takes the VALUE form here: `data-bind="sq"`, never the
  key form `data-bind:sq`** (gf-385: the group-pick input rendered
  `data-bind:gpq` and neither direction synced — the pick wrote the
  signal and the field kept the typed text; the pinned bundle honours
  the value form, which every combobox uses).
- **Load Datastar from `/static/datastar.js`** (the pinned Pro bundle,
  v1.0.2) as a `<script type="module">` — the base layout does this once;
  never add a second runtime or a CDN copy. (Inlining is only for throwaway
  offline artifacts, not this app.)

## State belongs in `data-ui-*`, not `data-*`

Datastar owns the `data-*` space. Put your **styling state hooks** under the
framework's existing `data-ui-*` namespace (it already uses
`data-ui-theme/size/motion` and `.tag[data-ui-state]`). This avoids any
collision with Datastar and makes selectors self-documenting:

```css
.cal .ngrid > button[aria-current="date"]    { outline: 2px dashed var(--focus); }
.cal .ngrid > button[data-ui-selected] { outline: 2px solid var(--focus); }
.cal .ngrid > button[data-ui-adjacent] { --bg: 0.1; }
```
```html
<button data-attr:aria-current="cellIsToday($cal.v,i) ? 'date' : 'false'"
        data-attr:data-ui-selected="cellIso($cal.v,i) === $cal.sel"
        data-attr:data-ui-adjacent="!cellInMonth($cal.v,i)">…</button>
```

**Classes are identity; `data-ui-*` (or ARIA) is state.** A class says *what the
element is* — a layout primitive or component (`.card`, `.column`, `.ngrid`,
`.tag`), authored once, never toggled. A `data-ui-*` attribute says *what state
it's in*, toggled at runtime by `data-attr`. Keep them visibly separate:
`class="column"` (it's a column) carrying `data-ui-selected` (it's selected).

**If the element already carries ARIA state, style off that — don't add a
redundant flag.** Selection grids set `aria-pressed`/`aria-checked`; a combobox
option sets `aria-selected`. Style `&[aria-pressed="true"]` directly so the
accessible state and its look share one source of truth and one binding. Reserve
`data-ui-*` for state with no ARIA equivalent — a calendar's *adjacent*
(out-of-month) day, a range's band / preview / endpoints. (A calendar's *today*
is a real ARIA fact, `aria-current="date"`, so it stays ARIA.) Two house
reservations on top of that rule: `data-ui-state="active"` is the ENGINE's
painted lens-control state (--bg 1 / --fg −1 — an applied sort/filter/scope
is a condition ARIA has no word for), and `data-ui-state="on|off"` is the
legend-toggle pair. Never stamp an ARIA state AND a data-ui-* flag for the
same fact — one source of truth, one binding.

> `data-class` (reactively toggling a *class*) is still fine for genuinely
> class-shaped things — toggling a layout primitive, or the container-band
> `.medium`/`.column` reveal. The rule is only that visual *state* lives in
> `data-ui-*`/ARIA, not that every reactive toggle is an attribute.

### Where component CSS lives

Wrap each component's rules in `@layer block` (with a comment banner) and
**nest the state inside the structural class**, so an element and its states
read as one block:

```css
@layer block {
  /* calendar — standalone month surface */
  .cal .ngrid > button {
    aspect-ratio: 1; display: grid; place-items: center; --bg: 0.3;
    & > b               { --type: -1; --fg: -0.9; }
    &[data-ui-adjacent] { --bg: 0.1; & > b { --fg: -0.6; } }
    &[aria-current="date"]    { outline: 2px dashed var(--focus); }
    &[data-ui-selected] { outline: 2px solid var(--focus); }
  }
}
```

Your components then become genuine peers of `.card`/`.tag` in the same layer,
so the cascade stays predictable instead of "app CSS wins by being unlayered."
The engine declares the spine up front (`@layer reset, core.color, core.type,
core.shell, core.shape, theme, base, composition, block, utility, exception,
visibility;`), so an appended `@layer block {}` block *joins* that layer after
the engine's blocks — it doesn't become a new top layer. A product keeps its
blocks in ONE sheet of its own (EventOS: static/blocks.css), one `<blk-*>`
rule each (the block contract in the system-css skill). Do **not** leave
component rules unlayered: they would out-cascade the `visibility` layer and
break the revert-layer gates (`.small`/`.medium`/`.c-*`/the shapes). Reactive
paints are unaffected: `data-style:--bg` and inline `style="--bg:…"` are inline
styles, which beat any layer.
1. Put `.container` on a wrapper (it sets `container-type: inline-size`).
2. Give a child both a **gate class** and a **layout primitive**:
   `class="medium column"`. The gate class (in the visibility layer) hides it with
   `display:none` out of band; in band it becomes `display: revert-layer`,
   which restores the value from the earlier layer — i.e. `.column`'s flex.
   **The primitive is load-bearing:** a bare `.medium` with no composed display
   reverts to default `block`, not hidden.

Two container gate families, two jobs: `.small`/`.medium`/`.large` are
**density tiers** (component scale: `.small` < 8rem = glyph alone, `.medium`
8rem–20rem = glyph + label, `.large` ≥ 20rem = full block; "and-up" via
multi-class `class="medium large"`). `.c-mobile`/`.c-tablet`/`.c-desktop` are
the **layout band** family (576px / 768px, container-measured).

```html
<button class="column">                 <!-- a day cell -->
  <b data-text="cellDay(v,i)"></b>
  <span class="medium large column">…2 chips…</span>  <!-- glyph+label and up -->
  <span class="large column">…3 chips…</span>         <!-- full block only -->
</button>
```
No `@container` rule in your CSS — the framework already gates both families.

## Anchored popover (combobox / menu)

Use CSS anchor positioning instead of JS measurement:
`anchor-name` on the field; on a `popover="manual"` element set
`position-anchor`, `top: anchor(bottom)`, `width: anchor-size(width)`, and
`position-try-fallbacks: flip-block` so it opens downward and flips up near the
viewport bottom. It lives in the top layer (no `z-index` juggling). Chromium
125+; add an `@supports` fallback if Firefox/Safari matter.

Two scars to carry (gf-79, gf-46): a CLOSED `.menu` popover must get
`display: none` — hiding by opacity alone leaves every hidden menu in the
tab order. And out-of-flow anchor positioning LOSES to morphs: the moment
the server removes or replaces the anchor node, everything anchored to it
jumps or orphans. Anchor to stable, server-owned nodes only; anything that
chains or stacks (toasts) stays IN-FLOW with `interpolate-size` collapse —
degrade is a snap, never a break. An overlay that traces an element pins
to THE TRACED ELEMENT itself, never its wrapper (hold-confirm's inset:0
mis-scale).

## The six components

*(This skill ships no references folder — its bundled reference and
examples were lost in an old repack and never restored; the table below
is the surviving summary, and the live in-tree exemplars are the rockets
under `static/rocket/` and their benches on Admin → UI lab → Rockets.)*

| Component | Signal shape | Patterns it teaches |
|---|---|---|
| Date — single | `{v, s}` (view month, selected ISO) | popover calendar, baked 42 cells, `aria-current` (today) + `data-ui-selected` |
| Date — range | `{v, a, b, h}` (anchor, end, hover) | two endpoints + hover preview, band tint via `--bg` |
| Calendar | `{v, sel}` | standalone month surface, `.ngrid`+`.spread` nav, in/out tint, Today/prev/next |
| Combobox | `{q, open, hi, label}` (query, open, highlighted idx) | text filter, keyboard nav, anchored flipping popover |
| group-pick (gf-385) | three page signals: typed text · picked name (the TAG) · rename draft | pick-or-make over server rows: focus shows all, typing filters, Enter picks only a highlighted ROW (a typed word is never a value — "No match" + an Add row chosen from the list), the pick is a tag in the field, a pencil renames a row in place (Enter/check saves, Escape/leaving cancels), per-row delete disabled while in use; `view.GroupPick(GroupPickSpec)`; bench UI → Rockets |
| Selection grid — multi | `{ids: []}` | array signal, toggle membership, `aria-pressed` + `data-ui-state` |
| Selection grid — single | `{id}` | single-id signal, radio semantics, `aria-checked` |

## Rocket components (Datastar Pro) — when to reach for them

Everything above is build-stepless HTML: bake the DOM, bind it, inline the
bundle. **Rocket** is the other mode — Datastar **Pro**'s web-component API
(`rocket(tag, {...})`). It packages a component as a real custom element with a
typed prop API, instance-scoped state, and a `render()` that *can* loop. It is
not a replacement for the recipe above; it is for a specific kind of component.

**Use Rocket only when all of these hold** (the date picker is the canonical yes):

- There is a **public API worth typing** — attributes a page author sets
  (`mode`, `value`, `value-end`), decoded via codecs (`oneOf`, `string`, `date`).
- The state is **genuinely ephemeral and client-only** — draft selection, hovered
  cell, shown month. In a server-owns-state app (land-and-stream), the *committed*
  value is server state and flows back in as an attribute; only the throwaway
  interaction state lives in the component. If the "state" is application data,
  it does **not** belong in a client component — render it server-side.
- The internal DOM is **repetitive** — Rocket's `render` supports
  `<template data-for="i in [...]">`, so the 42 cells are *looped*, not baked.
  This is the main ergonomic win over the vanilla recipe. ⚠ The carve-out
  (gf-44 doctrine): if the server ALREADY renders the markup, Rocket owns
  interaction ONLY — a behavior wrapper over server truth. A roster
  needs no rocket at all: it is server markup under the engine's
  `.roster` component (gf-98). The app's month calendar is server markup
  over `cal-*`; a client-rendered calendar is the standalone-widget case,
  never the app's.
- You **reuse it across pages**, so a registered element + typed wrapper pays off.

Display-only or server-driven things (card, tag, alert, table, dashboard, a
disclosure toggle) are **not** Rocket candidates — a typed templ/partial wrapper
gives the same drop-in reuse without a client runtime. By this test most apps
have only a few Rocket components: date/time pickers, combobox, token input.

### The shape

```js
import { rocket } from '/static/datastar.js';   // ABSOLUTE path (see gotcha)
// pure date/format helpers on window so rendered expressions can call them
Object.assign(window, { cellDay, cellIso, cellInMonth, cellIsToday, som, monthLabel, fmtPretty });

rocket('event-date-picker', {
  mode: 'light',                                  // inherit the engine; shadow DOM walls it off
  props: ({ oneOf, string }) => ({
    mode:     oneOf('single','range').default('single'),
    value:    string.default(''),                 // committed start ISO; reflects to attribute
    valueEnd: string.default(''),
  }),
  setup: ({ $$, props, host, action }) => {       // destructure `action` — needed below
    $$.da = ''; $$.db = ''; $$.hover = '';        // ephemeral draft/UI state
    $$.v  = props.value ? som(new Date(props.value).getTime(),0) : som(Date.now(),0);
    action('commit', () => {                       // registered action (see gotcha)
      host.setAttribute('value', $$.da);
      host.dispatchEvent(new CustomEvent('change', { bubbles:true, detail:{ start:$$.da, end:$$.db||$$.da }}));
    });
  },
  render: ({ html }) => html`
    <div class="calendar">
      <template data-for="i in [0,1,2,/* … */,41]">     <!-- looped, not baked -->
        <button data-text="cellDay($$v,i)"
          data-attr:data-ui-selected="!!($$da && cellIso($$v,i)===$$da)"
          data-on:click="$$clicked=cellIso($$v,i); @pick()"></button>
      </template>
      <button data-on:click="@commit(); el.closest('[popover]').hidePopover()">Confirm</button>
    </div>
  `,
});
```

## The stepped dialog (wizard) grammar — three templs, one signal (gf-314/315)

A wizard inside the app is a `dialog.modal.glass` whose STATIONS ride
one page-local signal: `data-signals__ifmissing="{pkw: N}"` on the
dialog seeds N from the record at land (the first station whose fact is
open) and keeps it across morphs; `wizSignalStrip(sig, stations)` is the
house crumb trail with every station clickable and `aria-current` on
the active one; `wizSignalFoot(sig, last)` is Back/Next; each body is a
`data-show="$sig == i"`. Every verb inside is a 204 + publish, and the
morph re-lands the tags. Outside the app (no session, a reload between
steps) the wizard is a PAGE of plain forms and 303s with the strip as real
links (`/start`'s six stations, gf-360…366; the page opens NO stream —
`Page.NoStream` — so nothing can morph a half-filled form) — a dialog
cannot survive the sign-in reload. `wizOpener` is the header-rack "Set
up" verb. The PORTFOLIO wizard is retired (gf-367); packages
(`view/settings.templ`, signal `pkw`) is the surviving exemplar.

## Morph armor — protecting client/wizard state from server morphs

A region whose CHILDREN carry in-flight state (a multi-step wizard body, a
component-owned DOM island) must survive the page-wide morphs a land-and-stream
app fires on every publish. Verified against the bundle source (gf-51):

- **`data-ignore-morph`** — when BOTH the DOM node and the incoming node carry
  it, the morph walk returns the node untouched, subtree included. This is the
  tool for subtree state. (One side only ≠ armor.)
- **Replace-mode patches bypass the morpher** (plain `replaceWith`) — which is
  how the armored region's OWNER updates it: the server command answers with
  `PatchElements(html, WithModeReplace())`, and the rendered fragment re-carries
  the id + the armor attribute so later patches and morphs behave the same.
- **`data-preserve-attr` is NOT armor** — it shields the listed *attributes*
  (`open` on a dialog, inline `style`) while the children still morph. Right
  tool for keeping a dialog open across a morph; wrong tool for keeping what's
  inside it.

The worked example: the connector wizard (`connWizDialog` in
`view/settings.templ`, its commands in `handler/connector.go`) — a
stepped dialog whose station is derived from what the org has saved,
each command a 204 + org publish, the page's own fat-morph re-landing
the next station. (The CSV import wizard that first carried this armor
retired with the seam; the lab's mock (system-css/site/lab) keeps its shape.)

Two more morph/fetch traps, verified in the bundle source (gf-52):

- **`data-on:submit` ALWAYS prevents the native submit** (bundle: `el
  instanceof HTMLFormElement && event === "submit" && preventDefault()`,
  with or without `__prevent`). A native `method="post"` form must carry
  no `data-on:submit`; a Datastar form is `data-on:submit__prevent` +
  `@post(url, {contentType: 'form'})` + a 204 (gf-358, the contact
  dialog lost a day of messages to this).

- **File uploads need `enctype="multipart/form-data"` ON THE FORM.**
  `@post(url, {contentType: 'form'})` builds a FormData, but ships it as
  the body only when the form declares that enctype — otherwise the bundle
  flattens it to `URLSearchParams` and every file input silently drops
  (server sees "no file"). The attribute is load-bearing even though no
  native submit ever happens.
- **A morphed checkbox freezes after its first flip.** The morpher diffs
  `checked` by comparing the ATTRIBUTE on old-vs-new but writes only the
  PROPERTY, leaving the old attribute stale — every later morph
  false-negatives. Fix: key the input's `id` by state (e.g. `act-7-on` /
  `act-7-off`) so old and new never pair and the morph replaces the node.

### Rocket gotchas (each cost a real debugging cycle here)

- **A rocket host RE-RENDERS its template on every prop change** (gf-323,
  learned on the virtual-scroll bench, retired gf-324): every `data-attr:*` landing after first
  render runs `render` again, so element references captured in
  `onFirstRender` point at detached nodes while Datastar keeps patching
  the live ones by id. Re-query the nodes at the top of every reset
  (`host.querySelector('[data-viewport]')`), and pass STATIC props as
  plain attributes — only a value that truly changes rides `data-attr:`.
  The reference virtual-scroll also averaged empty blocks into a running
  height total; measure only what holds rows, by its own row count.
- **A rocket that renders its own subtree must OWN it end to end**
  (gf-323, on prod): the page-wide morph on every publish deletes what
  the server did not send, so the host needs `data-ignore-morph` — and
  that same flag makes Datastar skip any patch aimed inside the subtree,
  the rocket's own block replies included. Apply those by hand (parse
  the `datastar-patch-elements` event, swap the live element's children
  by id) instead of dispatching them back to Datastar. Verify under
  publishes, not on a quiet page: the scratch server showed nothing
  because nothing published. And any scroller that re-positions content
  above the viewport sets `overflow-anchor: none` on it, or Chrome's
  scroll anchoring will move scrollTop after every re-position and the
  scroller will chase its own tail.

- **`$$name` is the instance-local signal.** Inside `render`, write `$$da`,
  `$$mode`; in `setup`, `$$.da = ''`. Rocket rewrites `$$` to a per-instance path,
  so multiple instances on a page don't collide. Helpers are still plain JS on
  `window`, called with `$$` values as args (props-down, unchanged from the recipe).
- **Register actions with `action(name, fn)` — not `$$.fn = …`.** Defining
  `$$.commit = () => {}` does **not** make `@commit()` callable; you get
  *"Undefined Rocket action: commit."* Destructure `action` from the setup context
  and call `action('commit', () => {...})`.
- **Local actions take NO arguments — pass data via a signal.** Calling
  `@pick(cellIso($$v,i))` makes Rocket rewrite the dispatch and **recurse into a
  `Maximum call stack size exceeded`**. The working pattern mirrors no-arg
  `@commit()`: set a signal first, then call the bare action which reads it —
  `data-on:click="$$clicked=cellIso($$v,i); @pick()"`, and inside, `const iso = $$.clicked;`.
- **Boolean-coerce every `data-attr` expression with `!!(...)`.** Rocket sets an
  attribute whenever the expression yields a *string*; `$$da && …` returns `''`
  (empty string, not `false`) when `$$da` is empty, so `data-ui-selected=""`
  lands on **every** cell and presence-based CSS (`[data-ui-selected]`) matches
  all of them. `data-attr:data-ui-selected="!!($$da && cellIso($$v,i)===$$da)"`
  forces a real boolean, so Rocket omits the attribute when false. (This is the
  Rocket-specific counterpart to the vanilla presence rule above.)
- **`mode: 'light'`** so the component lives in the page's DOM/CSS and inherits
  the engine's tokens. Shadow DOM (`open`/`closed`) would wall off the stylesheet;
  only reach for it if you *want* encapsulation and theme purely via custom props.
- **Commit on light-dismiss.** A `[popover]` fires `toggle`; wire
  `data-on:toggle="evt.newState==='closed' && <valid> && @commit()"` so clicking
  outside locks in the selection (no separate Cancel needed).

### Project integration (Go + templ, or any SSR)

- **One file per component**, served as a static asset:
  `static/rocket/<name>.js`. Its bundle import must be **absolute**
  (`/static/datastar.js`) — a relative `./datastar.js` resolves against the
  subfolder and 404s.
- **A thin typed wrapper** in your view layer (one templ component) gives the
  drop-in API and lets the compiler catch attribute typos:
  ```go
  templ EventDatePicker(mode, value, valueEnd string) {
    <event-date-picker mode={ mode }
      if value != "" { value={ value } }
      if valueEnd != "" { value-end={ valueEnd } }
    ></event-date-picker>
  }
  ```
- **Load it once from the base layout** (`<script type="module"
  src="/static/rocket/<name>.js">`). Registration is idempotent and
  order-independent — custom elements upgrade whenever the definition lands — so
  per-page placement doesn't matter and HTTP caching makes it a one-time download.
- **Shipping a new component:** the `.js` goes in static/rocket/, the templ
  wrapper in view/; run `templ generate` and confirm the wrapper compiled —
  and give it a bench page in the lab (system-css/site/lab/rocket-<name>.html) so regressions
  are seen in the lab first.
- **Whole-page morph caveat (land-and-stream):** when an SSE update morphs a page
  with the component open, the morph diffs against Rocket's managed interior. If
  the internals get clobbered mid-interaction, keep the morph off the host's
  subtree (`data-ignore-morph` on BOTH nodes) and let Rocket own it — and
  update the armored region only via replace-mode patches (the fat-morph
  bypass; see land-and-stream §2).
- **Observers get cleanup, always.** A MutationObserver left running under a
  fat-morphing page re-scans every morphed node — that leak was the bulk of
  the phantom ~5s morph cost (gf-98). Register observers in setup, disconnect
  in cleanup, re-observe on re-attach; props are codec'd; define is idempotent.
- **Datastar signals only — no custom `data-q`/`data-sort` stamps** (gf-66):
  server state rides real signals or server-rendered attributes the engine
  already knows (`data-ui-*`, ARIA), never an invented data-* vocabulary.

## THE .active UTILITY (gf-191, per Mike)

A TRANSIENT client highlight (keyboard focus row in a combobox/menu,
a hover-independent "this one" marker) is the `.active` utility class —
never `aria-current`, which keeps its REAL meaning (the current page /
step / date in a set: the org switcher's current org, the wizard
strip's current station). Rockets toggle `.active` for paint and the
proper ARIA attribute for semantics (`aria-selected` in a listbox).
The engine's paint recipes list `.active` beside their ARIA selectors.

## THE ROCKET STATE CANON (gf-191, per Mike: "there should be canon
solutions for these situations" — paid for three times: the search
rocket, toast-card, the combobox)

Every rocket that holds client state under fat-morphs follows these
FIVE laws; a new rocket that deviates is wrong until proven otherwise:

1. **Client-owned state rides an ATTRIBUTE on the host**, shielded by
   `data-preserve-attr` in the server markup — never a JS-only flag.
   (dialog `open`, `data-ui-state` for a popover, `aria-expanded` for
   a toast's fold, `data-ignore` for maps.) An attribute survives
   inspection, gives CSS a hook, and morphs can be told to keep it; a
   closure variable dies silently. THE CONVERSE (gf-470): state the
   SERVER can know is the server's, un-shielded — the toast's own word
   (`unread` · `read` · `leaving`) is stamped from seen_at and a
   just-dismissed grace window; the rocket only echoes it a round trip
   early, and the next morph agrees. A preserved attribute the server
   also renders is two truths — the server's can never land.
2. **Observers RESTORE and RE-HOME; they never DECIDE.** A
   MutationObserver may re-home derived state (the highlight the morph
   swapped out from under you, command-palette's resetActive) and
   re-assert what the preserved attribute already says — it must never
   originate a state change. An observer that opens things will one
   day open them on a data-text ripple.
3. **State changes come from USER INTENT only**: focus, clicks, and
   `isTrusted` events. A signal write dispatches synthetic events
   (`isTrusted: false`) — a rocket that treats those as input will act
   on its own echo.
4. **Rockets never invent data.** Every committable choice is a
   server-rendered element with its own datastar action; Enter/keys
   just .click() it. If the rocket can fabricate a selection, the
   server and client can disagree.
5. **Content is server truth and morphs freely.** Armor the CONTAINER
   (`data-ignore-morph` for imperative third-party DOM, REPLACE-mode
   patches for wizard bodies), never the data.

## Pre-ship checklist

- Signal namespace is **lowercase**; one signal object per component.
- DOM is **baked** (no client loop); every dynamic node is bound.
- Layout is **primitives**; custom CSS is only `aspect-ratio` + `--type/--bg/--fg`
  + `data-ui-*` state.
- Booleans go through `data-attr` (presence); tokens/strings via ternary.
- Datastar loads once, from `/static/datastar.js` (no second runtime).
- You **rendered it** (headless or real browser) and checked geometry + state +
  no console errors — not just eyeballed the markup.
- **(Rocket only)** actions are registered with `action(name, fn)` and called with
  **no args** (data passed via a signal); every `data-attr` expression is
  `!!()`-coerced; the bundle import is an **absolute** path; `mode: 'light'`.

## One bad expression takes the whole page down (gf-175)

datastar throws `ValueRequired` on an EMPTY expression (e.g.
`data-on:submit__prevent=""`) and the exception ABORTS the page's entire
attribute walk — every `data-*` binding on the page goes inert: blank
`data-text`, `data-show` not hiding, `data-attr` never applying. The
symptom reads like "datastar didn't load." A demo/no-op handler still
needs a real expression (`"0"`); when a whole page's bindings die at
once, check the console for ONE plugin error before debugging any
individual binding.

## Dialogs on a live page

Every `<dialog>` on a land-and-stream page carries `data-preserve-attr="open"`
(Mike, 2026-09-17). A push from the stream morphs the whole page; without the
preserve, the morph resets the `open` attribute and the dialog closes under
the person mid-form for a reason they cannot see. The contact and vote
dialogs are the exemplars.

Local draft state in a public dialog rides `_`-prefixed signals (off the
wire) kept by the Pro persist plugin —
`data-persist:contact="{include: /^_contact\./}"` on the form, the submit
handler clearing them and setting the dialog's own `_sent` flag
(`__ifmissing`, so a push cannot reset it) — view/layout.templ, gf-358.

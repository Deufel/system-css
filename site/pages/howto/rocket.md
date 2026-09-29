---
title: Author a rocket
section: howto
order: 3
---

A rocket is a web component for the one thing Datastar cannot do on its
own: hold client state, or reach a browser API. Everything else is a
Datastar attribute over a baked DOM. Before writing one, check that the
component is not already a `select`, a `dialog`, a `popover`, or a signal.

## The contract

- **Light DOM only.** No shadow root; the engine styles the host and its
  children like any element. The host's own box is sized by the engine's
  `:where(host)` rule, never by a stylesheet the rocket injects.
- **Morph-proof.** A push morphs the whole page. Anything the rocket
  injects must survive that or re-inject itself from a MutationObserver;
  the cleanest rocket injects nothing.
- **Server-stamped `data-*` is the single source of truth.** Props come
  down as attributes the server renders; the rocket never invents state
  the server does not know.
- **Events go up.** The rocket dispatches a bubbling `CustomEvent`; a
  Datastar `data-on:<event>` on an ancestor posts it. The rocket never
  fetches.
- **No clocks.** A number that ticks is rendered by the server from its
  record and re-landed by the stream. A counter that subtracts a server
  stamp from the phone's `Date.now()` is wrong by the phone's drift.

## A complete example

The visit tracker: a tap reads the device position once, fills the
form's hidden fields, raises an event; the form posts itself.

```js
class ActivationTracker extends HTMLElement {
  constructor() { super(); this._onClick = this._onClick.bind(this); }
  connectedCallback() { this.addEventListener('click', this._onClick); }
  disconnectedCallback() { this.removeEventListener('click', this._onClick); }
  _onClick(e) {
    const btn = e.target.closest('[data-trk-action]');
    if (!btn || !this.contains(btn) || btn.hasAttribute('aria-busy')) return;
    const name = btn.getAttribute('data-trk-action') === 'out' ? 'visitout' : 'visitin';
    const form = this.closest('form');
    btn.setAttribute('aria-busy', 'true');
    const done = (detail) => {
      btn.removeAttribute('aria-busy');
      for (const k of ['lat', 'lng', 'acc']) {
        const f = form && form.querySelector('input[name="v' + k + '"]');
        if (f) f.value = String(detail[k]);
      }
      this.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
    };
    navigator.geolocation.getCurrentPosition(
      (p) => done({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      () => done({ lat: 0, lng: 0, acc: 0 }),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  }
}
customElements.define('activation-tracker', ActivationTracker);
```

```html
<form data-on:visitin="@post('/o/1/activations/7/checkin', {contentType: 'form'})">
  <input type="hidden" name="vlat" value="0"/> …
  <activation-tracker class="column">
    <button type="button" class="pri" data-trk-action="in">Check in</button>
  </activation-tracker>
</form>
```

Event names are lowercase: Datastar lowercases attribute names, so
`data-on:visitIn` would never fire.

## Every rocket's requirements

Since Datastar v1.0.4, **Rocket is free**: `bundles/datastar-rocket.js` is
core plus the `rocket` module, and it is the bundle this library ships at
`static/datastar.js` and the site runs. Every rocket here imports
`../datastar.js`, so a project that licenses **Datastar Pro** keeps its own
bundle at that path and the same rockets run on it. What stays Pro is
thirteen attributes and actions — `data-animate`, `data-custom-validity`,
`data-match-media`, `data-on-raf`, `data-on-resize`, `data-persist`,
`data-query-string`, `data-replace-url`, `data-scroll-into-view`,
`data-view-transition`, `@clipboard`, `@fit`, `@intl` — and a component
that uses one is marked *Pro only* below (none does today). An API means
a key and a bill; a permission means the browser asks the person.

<!-- needs-table -->

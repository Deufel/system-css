---
title: Author a rocket
section: howto
order: 4
---

A rocket is a web component for what Datastar cannot do alone: hold
client state or reach a browser API. Before writing one, check that the
job is not a `select`, a `dialog`, a `popover` or a signal.

## Contract

- Light DOM only. The engine styles the host and its children. The host's
  box comes from the engine's `:where(host)` rule, not from injected CSS.
- Morph-proof. A push morphs the page. Inject nothing, or re-inject from
  a MutationObserver.
- Server-stamped `data-*` is the state. The rocket invents none.
- Events go up. The rocket dispatches a bubbling `CustomEvent`; a
  `data-on:<event>` on an ancestor posts. The rocket never fetches.
- No clocks. A ticking number is rendered by the server and re-landed by
  the stream.

## Example

The visit tracker reads the device position once per tap, fills the
form's hidden fields and raises an event. The form posts itself.

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

Event names are lowercase. Datastar lowercases attribute names, so
`data-on:visitIn` never fires.

## Requirements

Datastar v1.0.4 moved Rocket out of Pro. `bundles/datastar-rocket.js` is
core plus the `rocket` module. The library ships it at
`static/datastar.js`; every rocket imports `../datastar.js`, so a project
on Datastar Pro keeps its own bundle at that path. Thirteen attributes
and actions remain Pro: `data-animate`, `data-custom-validity`,
`data-match-media`, `data-on-raf`, `data-on-resize`, `data-persist`,
`data-query-string`, `data-replace-url`, `data-scroll-into-view`,
`data-view-transition`, `@clipboard`, `@fit`, `@intl`. A component that
uses one is marked below. None does today. API means a key and a bill.
Permission means the browser asks.

<!-- needs-table -->

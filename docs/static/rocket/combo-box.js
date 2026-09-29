/*
 * combo-box — Datastar Pro (Rocket) web component (gf-191).
 * Location: static/rocket/combo-box.js
 *
 * THE UNIFIED SELECTION combobox (per Mike: "like the Google Maps search
 * bar"): a text input over a server-morphed listbox. This rocket owns
 * BEHAVIOR ONLY — open/close, keyboard navigation, click-outside — and
 * never data: the page binds the input to a signal (debounced @post
 * refreshes the options), the server renders every option as a real
 * button whose own data-on:click commits the pick. Enter just clicks
 * the highlighted option; the rocket cannot invent a selection.
 *
 * MARKUP CONTRACT (server-rendered, light DOM):
 *   <combo-box>
 *     <input type="text" role="combobox" style="anchor-name: --cb-N;" …/>
 *     <menu class="menu" popover="manual" role="listbox"
 *           style="position-anchor: --cb-N;">
 *       <button type="button" role="option" data-on:click="…">…</button>
 *       …
 *     </menu>
 *   </combo-box>
 *
 * The listbox is the engine's .menu popover (top layer — THE LAYOUT-SHIFT
 * DOCTRINE: suggestions never reflow the form) anchored by the sanctioned
 * inline pair. The active option wears the .active utility (paint) +
 * aria-selected (semantics) — aria-current keeps its real meaning.
 *
 * MORPH ARMOR: options are server truth and morph freely; a morph resets
 * the highlight (the option under the old index may be gone). The
 * popover's open state is client-owned and re-asserted after each morph
 * while the input holds focus.
 *
 * NOTE: the import below is ABSOLUTE (/static/datastar.js) — a relative
 * './datastar.js' would resolve inside /static/rocket/ and 404.
 */
import { rocket } from '/static/datastar.js';

const comboSetup = (strict) => ({ host, cleanup }) => {
    const input = host.querySelector('input');
    const list = host.querySelector('[role="listbox"]');
    if (!input || !list) return;

    let active = -1;
    // VISIBLE options only (gf-191, Mike: "we also need arrow key
    // support" — arrows were walking data-show-hidden rows). The test is
    // the OPTION'S OWN state (hidden attr / its inline display, which is
    // where data-show writes) — never ancestor visibility: while the
    // popover is closed EVERYTHING inside is invisible, and an
    // ancestor-aware check (round 2's checkVisibility) made openable()
    // count zero forever — the menu could never open at all.
    const visible = (el) => !el.hidden && el.style.display !== 'none';
    const options = () => [...list.querySelectorAll('[role="option"]')].filter(visible);
    // paint = the .active utility (per Mike: a keyboard highlight is not
    // aria-current — that attribute keeps its real meaning); the
    // matching option also wears aria-selected for AT.
    const paint = () => {
      const os = options();
      [...list.querySelectorAll('[role="option"]')].forEach((o) => {
        const on = active >= 0 && o === os[active];
        o.classList.toggle('active', on);
        if (on) o.setAttribute('aria-selected', 'true');
        else o.removeAttribute('aria-selected');
      });
    };
    const openable = () => options().length > 0;
    // open state MIRRORS onto the host as data-ui-state (the house
    // pattern, per Mike — the command-palette precedent): an attribute
    // morphs can be told to preserve, a styling hook, and one source of
    // truth the rocket re-asserts from after any morph.
    const open = () => {
      // the attribute records INTENT even before options exist — the
      // first debounced server answer arrives via the observer, which
      // restores what this attribute already says (canon law 2).
      host.setAttribute('data-ui-state', 'open');
      if (!openable() || list.matches(':popover-open')) return;
      try { list.showPopover(); } catch (e) {}
    };
    const close = () => {
      active = -1;
      paint();
      host.removeAttribute('data-ui-state');
      if (list.matches(':popover-open')) {
        try { list.hidePopover(); } catch (e) {}
      }
    };
    // BEST-MATCH AUTOFOCUS (gf-191, per Mike): the first option is
    // pre-highlighted whenever the set refreshes, so type → Enter commits
    // the best match — no arrow required.
    const autoHighlight = () => {
      active = options().length ? 0 : -1;
      paint();
    };
    const move = (delta) => {
      const os = options();
      if (!os.length) return;
      open();
      active = (active + delta + os.length) % os.length;
      paint();
      os[active].scrollIntoView({ block: 'nearest' });
    };

    const onKey = (e) => {
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); move(1); break;
        case 'ArrowUp': e.preventDefault(); move(-1); break;
        case 'Enter':
          if (active >= 0 && list.matches(':popover-open')) {
            e.preventDefault();
            options()[active]?.click();
            close();
          }
          break;
        case 'Escape':
          if (list.matches(':popover-open')) { e.stopPropagation(); close(); }
          break;
        case 'Tab': close(); break;
      }
    };
    // MATCH HIGHLIGHTING (gf-191, per Mike — the global search's <mark>
    // grammar, subtler): the matched substring of each option label wears
    // <mark> (engine: chromatic ink, nothing else). Labels are remembered
    // on first touch; reactive spans (data-text) own their text and are
    // skipped. The observer is quieted around our own writes.
    const escHTML = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const escRX = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const highlight = () => {
      const q = input.value.trim();
      quietMO(() => {
        for (const o of list.querySelectorAll('[role="option"]')) {
          const span = o.querySelector('span');
          if (!span || span.hasAttribute('data-text')) continue;
          if (span.dataset.cbLabel === undefined) span.dataset.cbLabel = span.textContent;
          const label = span.dataset.cbLabel;
          if (!q) { span.textContent = label; continue; }
          const parts = label.split(new RegExp('(' + escRX(q) + ')', 'ig'));
          span.innerHTML = parts.map((p, i) => (i % 2 ? '<mark>' + escHTML(p) + '</mark>' : escHTML(p))).join('');
        }
      });
    };

    // STRICT judgement (combo-select): empty is fine; otherwise the text
    // must exactly match a suggestion label. Verdict rides aria-invalid +
    // the host's data-ui-state and a bubbling change {value, valid}.
    const judge = () => {
      if (!strict) return;
      const v = input.value.trim().toLowerCase();
      const labels = [...list.querySelectorAll('[role="option"] span')]
        .map((s) => (s.dataset.cbLabel !== undefined ? s.dataset.cbLabel : s.textContent).trim().toLowerCase());
      const valid = v === '' || labels.includes(v);
      input.setAttribute('aria-invalid', valid ? 'false' : 'true');
      if (valid) host.removeAttribute('data-ui-state');
      else host.setAttribute('data-ui-state', 'invalid');
      host.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { value: input.value, valid } }));
    };
    const onBlur = () => judge();

    const onFocus = () => open();
    // open only on REAL keystrokes: a pick writes the input's bound
    // signal, and the framework's synthetic input event (isTrusted:
    // false) must never read as intent.
    const onInput = (e) => { if (e.isTrusted) { open(); highlight(); autoHighlight(); } };
    const onDocDown = (e) => {
      if (!host.contains(e.target)) close();
    };
    // an option click commits through its own datastar handler — the
    // rocket only tidies up after it
    const chip = () => host.querySelector('[data-cb-chip]');
    const onListClick = (e) => {
      if (e.target.closest('[role="option"]')) {
        close();
        // the pick just wrote the signal; judge after the write settles,
        // then hand focus to the chip box (if this pick chipped) so
        // Backspace can remove it
        queueMicrotask(() => queueMicrotask(() => {
          judge();
          const c = chip();
          if (c && visible(c)) c.focus();
        }));
      }
    };
    // Backspace/Delete on the focused chip box removes the pick — by
    // clicking the server-rendered × (the rocket never clears state
    // itself); focus returns to the input for immediate re-typing.
    const onHostKey = (e) => {
      if ((e.key === 'Backspace' || e.key === 'Delete') && e.target.closest('[data-cb-chip]')) {
        e.preventDefault();
        host.querySelector('[data-cb-clear]')?.click();
        queueMicrotask(() => queueMicrotask(() => input.focus()));
      }
    };
    const onClearClick = (e) => {
      if (e.target.closest('[data-cb-clear]')) {
        queueMicrotask(() => queueMicrotask(() => input.focus()));
      }
    };

    // MORPH ARMOR — the command-palette discipline: the observer ONLY
    // re-homes the highlight (a morph swapped the options under it) and
    // closes when the set empties; it NEVER opens. Opening belongs to
    // focus and trusted keystrokes alone — that is what stops a pick's
    // data-text ripple from reopening the menu Enter just closed. The
    // popover element itself survives child morphs, so an open menu
    // stays open while its options refresh; if a morph replaced the
    // whole panel, the preserved host attribute says what to restore.
    let quiet = false;
    const quietMO = (fn) => { quiet = true; fn(); queueMicrotask(() => { mo.takeRecords(); quiet = false; }); };
    const mo = new MutationObserver(() => {
      if (quiet) return;
      highlight(); // a morph brought fresh labels — re-mark for the live query
      autoHighlight(); // …and pre-highlight the best match (type → Enter)
      if (!openable()) { close(); return; }
      if (host.getAttribute('data-ui-state') === 'open' && !list.matches(':popover-open')) {
        try { list.showPopover(); } catch (e) {}
      }
    });
    mo.observe(list, { childList: true, subtree: true });

    input.addEventListener('keydown', onKey);
    input.addEventListener('blur', onBlur);
    host.addEventListener('keydown', onHostKey);
    host.addEventListener('click', onClearClick);
    input.addEventListener('focus', onFocus);
    input.addEventListener('input', onInput);
    list.addEventListener('click', onListClick);
    document.addEventListener('pointerdown', onDocDown);
    cleanup(() => {
      mo.disconnect();
      input.removeEventListener('keydown', onKey);
      input.removeEventListener('blur', onBlur);
      host.removeEventListener('keydown', onHostKey);
      host.removeEventListener('click', onClearClick);
      input.removeEventListener('focus', onFocus);
      input.removeEventListener('input', onInput);
      list.removeEventListener('click', onListClick);
      document.removeEventListener('pointerdown', onDocDown);
    });
};

// combo-box — FREE: suggestions + a free-form lane (the use-as-typed row).
rocket('combo-box', { mode: 'light', setup: comboSetup(false) });
// combo-select — STRICT (gf-191, per Mike: "a second version without the
// free-form option"): the committed value must match the source; anything
// else wears aria-invalid + data-ui-state="invalid" and the bubbling
// change event carries {value, valid} for the page to speak the message
// (the date-picker's change grammar). A distinct element, one shared
// setup — the day-picker precedent.
rocket('combo-select', { mode: 'light', setup: comboSetup(true) });

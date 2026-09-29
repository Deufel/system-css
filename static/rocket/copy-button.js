/*
 * copy-button — Datastar Pro (Rocket) web component.
 * Location: static/rocket/copy-button.js
 *
 * BEHAVIOR-ONLY (gf-164, the flaky-button fix): the button and both
 * glyphs are SERVER-RENDERED inside the host (view/settings.templ
 * copyButton) — the toast-card pattern. The old version client-rendered
 * its children into an element the server ships empty, so every
 * fat-morph swept them away (children follow the server) and the button
 * only reappeared when a rotate replaced the element outright. Now a
 * morph re-lands the same markup and there is nothing to lose; this
 * wrapper only copies the host's `code` attribute (server-stamped, the
 * single source of truth) and swaps the glyphs for 1.6s via [hidden].
 * A morph during the swap resets to the idle glyph — harmless.
 */
import { rocket } from '/static/datastar.js';

rocket('copy-button', {
  mode: 'light', // system.css owns the look; shadow DOM would wall it off
  setup: ({ host, cleanup }) => {
    let timer = 0;
    const setState = (copied) => {
      host.querySelectorAll('.copy-idle').forEach((el) => { el.hidden = copied; });
      host.querySelectorAll('.copy-done').forEach((el) => { el.hidden = !copied; });
    };
    const onClick = async (evt) => {
      if (!(evt.target instanceof Element) || !evt.target.closest('button')) return;
      const text = host.getAttribute('code') || '';
      if (!text) return;
      try { await navigator.clipboard.writeText(text); } catch { return; }
      setState(true);
      clearTimeout(timer);
      timer = setTimeout(() => setState(false), 1600);
    };
    host.addEventListener('click', onClick);
    cleanup(() => { clearTimeout(timer); host.removeEventListener('click', onClick); });
  },
});

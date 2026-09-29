/*
 * command-palette — global-search behaviour component.
 * Location: static/rocket/command-palette.js
 *
 * Loaded once from the base layout:
 *   <script type="module" src="/static/rocket/command-palette.js"></script>
 *
 * This is a BEHAVIOUR-only web component — a plain custom element, NOT a
 * rocket() render component — and that's deliberate. The palette markup, the
 * result rows and the scope tabs are all server-owned: templ renders them and
 * the SSE stream patches fresh results into #gsearch-results. The query rides UP
 * via a Datastar data-bind + debounced @post on the input; the scope pills carry
 * gscope up the same way. A rocket() render function would want to OWN the DOM it
 * renders and would fight (clobber) those server patches. So this element renders
 * nothing — it only wires the imperative interaction the server can't express:
 *
 *   - Cmd/Ctrl-K   toggle the dialog (open + focus input / close)
 *   - Up / Down    move the active row over the server-rendered [data-gsrow]s
 *   - Enter        navigate the active row (it's a real <a>, so just .click() it)
 *   - Tab / ShiftTab  cycle the scope pills (.click() the next [data-gsscope],
 *                     which fires its own @post — server re-renders in that scope)
 *   - Esc          native <dialog> handles close
 *
 * The native modal <dialog> provides the focus trap, Esc and backdrop, so this
 * element leans on that instead of re-implementing a trap. Because rows are
 * server-patched, a MutationObserver re-homes the active row to the first result
 * whenever a new set lands.
 */

const isToggleKey = (e) => (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K');

class CommandPalette extends HTMLElement {
  connectedCallback() {
    this.dialog = this.closest('dialog');
    this.input = this.querySelector('#gsearch-input');
    this.results = this.querySelector('#gsearch-results');
    this.active = -1;

    // Cmd/Ctrl-K toggles from anywhere on the page.
    this._onDocKey = (e) => {
      if (isToggleKey(e)) { e.preventDefault(); this.toggle(); }
    };
    document.addEventListener('keydown', this._onDocKey);

    // Row / scope navigation is only meaningful while the dialog is open.
    this._onKey = (e) => this.onKey(e);
    (this.dialog || this).addEventListener('keydown', this._onKey);

    // Clear the highlight when the dialog closes.
    if (this.dialog) {
      this._onClose = () => this.setActive(-1);
      this.dialog.addEventListener('close', this._onClose);
    }

    // The server patches fresh rows into #gsearch-results — re-home the active
    // row to the first result each time a new set arrives.
    if (this.results) {
      this._obs = new MutationObserver(() => this.resetActive());
      this._obs.observe(this.results, { childList: true, subtree: true });
    }
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this._onDocKey);
    (this.dialog || this).removeEventListener('keydown', this._onKey);
    if (this.dialog && this._onClose) this.dialog.removeEventListener('close', this._onClose);
    if (this._obs) this._obs.disconnect();
  }

  rows() { return Array.from(this.querySelectorAll('[data-gsrow]')); }
  scopeTabs() { return Array.from(this.querySelectorAll('[data-gsscope]')); }
  isOpen() { return this.dialog ? this.dialog.open : false; }

  toggle() {
    if (!this.dialog) return;
    if (this.dialog.open) { this.dialog.close(); return; }
    this.dialog.showModal();
    // autofocus on the input covers most cases; this is belt-and-suspenders.
    if (this.input) requestAnimationFrame(() => { this.input.focus(); this.input.select(); });
  }

  resetActive() {
    const rows = this.rows();
    this.setActive(rows.length ? 0 : -1);
  }

  setActive(i) {
    const rows = this.rows();
    rows.forEach((r) => r.setAttribute('aria-selected', 'false'));
    this.active = (i >= 0 && i < rows.length) ? i : -1;
    if (this.active < 0) {
      if (this.input) this.input.removeAttribute('aria-activedescendant');
      return;
    }
    const row = rows[this.active];
    if (!row.id) row.id = 'gsrow-' + this.active;
    row.setAttribute('aria-selected', 'true');
    row.scrollIntoView({ block: 'nearest' });
    if (this.input) this.input.setAttribute('aria-activedescendant', row.id);
  }

  move(delta) {
    const rows = this.rows();
    if (!rows.length) return;
    let i = this.active < 0 ? (delta > 0 ? 0 : rows.length - 1) : this.active + delta;
    if (i < 0) i = rows.length - 1;
    if (i >= rows.length) i = 0;
    this.setActive(i);
  }

  cycleScope(delta) {
    const tabs = this.scopeTabs();
    if (!tabs.length) return;
    let cur = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    if (cur < 0) cur = 0;
    let i = cur + delta;
    if (i < 0) i = tabs.length - 1;
    if (i >= tabs.length) i = 0;
    tabs[i].click(); // fires the pill's own @post → server re-renders in that scope
  }

  onKey(e) {
    if (!this.isOpen()) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.move(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.move(-1);
        break;
      case 'Enter': {
        const rows = this.rows();
        if (this.active >= 0 && rows[this.active]) {
          e.preventDefault();
          rows[this.active].click();
        }
        break;
      }
      case 'Tab':
        e.preventDefault();
        this.cycleScope(e.shiftKey ? -1 : 1);
        break;
    }
  }
}

customElements.define('gsearch-palette', CommandPalette);

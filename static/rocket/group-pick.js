/*
 * group-pick — Datastar Pro (Rocket) web component (gf-385).
 * Location: static/rocket/group-pick.js
 *
 * THE PICK-OR-MAKE INPUT for the light vocabularies — brand families,
 * supplier families, reporting categories (per Mike, 2026-09-18: "an
 * input that on click shows you all of the available items, lets you
 * type and create a new one on the spot, and delete an item directly in
 * the dropdown — simple category management for things that are not
 * load-bearing; once a family or category is in use you cannot delete
 * it"; rev 2 the same day: "the selected item renders in the input as a
 * TAG — a categorical input; do NOT auto-add a typed word — the typed
 * input must match an existing element, a new one is added FROM THE
 * LIST; no match shows a message; a pencil on the row turns it into an
 * input and lets the user change the item directly, in the menu").
 *
 * This rocket owns BEHAVIOR ONLY — open on focus (the WHOLE list,
 * untyped), filter as you type, keyboard walking, Enter on a real row,
 * the row's edit mode, click-outside — and never data: every row is
 * server-rendered with its own datastar actions (pick · rename · delete
 * · add-as-typed), and the server decides which delete is disabled (in
 * use). Enter only ever clicks a highlighted row; the typed word never
 * becomes a value by itself.
 *
 * MARKUP CONTRACT (server-rendered, light DOM — view.GroupPick; the
 * HOST carries the anchor-name, so the list hangs under the field whether
 * it shows the input or the tag):
 *   <group-pick data-preserve-attr="data-ui-state" style="anchor-name: --gp-N;">
 *     <input type="text" role="combobox" data-bind="q" data-show="!picked"/>
 *     <div class="field" data-gp-chip tabindex="0" data-show="picked">
 *       <span class="tag"><span data-text="$v"></span></span>
 *       <button data-gp-clear data-on:click="…">×</button>
 *     </div>
 *     <menu class="menu" popover="manual" role="listbox">
 *       <div role="option">
 *         <button data-gp-pick data-on:click="…"><span data-gp-label>AB</span><small>3 in use</small></button>
 *         <input data-gp-rename data-bind="e" hidden/>
 *         <button data-gp-save hidden data-on:click="…">✓</button>
 *         <button data-gp-edit>✎</button>
 *         <button data-gp-del disabled? data-on:click="…">🗑</button>
 *       </div> …
 *       <small data-gp-nomatch hidden>No match.</small>
 *       <div role="option" data-gp-create hidden><button data-gp-pick data-on:click="…">Add “<span data-text="$q">”</button></div>
 *       <small data-gp-empty hidden>Nothing yet.</small>
 *     </menu>
 *   </group-pick>
 *
 * CANON (gf-191): open state rides the host's data-ui-state (preserved
 * across morphs); the observer re-filters and re-homes the highlight
 * after a morph, never opens; only trusted keystrokes filter; the rocket
 * invents no row and no value.
 *
 * NOTE: the import below is ABSOLUTE (/static/datastar.js).
 */
import { rocket } from '../datastar.js';

rocket('group-pick', {
  mode: 'light',
  setup: ({ host, cleanup }) => {
    const input = host.querySelector('input[role="combobox"]');
    const list = host.querySelector('[role="listbox"]');
    if (!input || !list) return;

    let active = -1;
    let typed = false; // false = the whole list (opened by focus, nothing typed yet)
    const rows = () => [...list.querySelectorAll('[role="option"]')];
    const label = (r) => (r.querySelector('[data-gp-label]')?.textContent || '').trim();
    const shown = (r) => !r.hidden && r.style.display !== 'none';
    const visible = () => rows().filter(shown);
    const isCreate = (r) => r.hasAttribute('data-gp-create');
    const chip = () => host.querySelector('[data-gp-chip]');
    const isShown = (el) => !!el && el.style.display !== 'none';

    // FILTER — the rocket's one judgement over server rows: a typed word
    // keeps the rows containing it; the add row shows when the word is
    // no row's exact name; "no match" when the word is in no row at all;
    // the empty note when there is nothing and nothing typed.
    const filter = () => {
      const q = typed ? input.value.trim().toLowerCase() : '';
      let any = false, exact = false;
      for (const r of rows()) {
        if (isCreate(r)) continue;
        const l = label(r).toLowerCase();
        const hit = !q || l.includes(q);
        r.hidden = !hit;
        if (hit) any = true;
        if (q && l === q) exact = true;
      }
      const create = list.querySelector('[data-gp-create]');
      if (create) create.hidden = !(q && !exact);
      const nomatch = list.querySelector('[data-gp-nomatch]');
      if (nomatch) nomatch.hidden = !(q && !any);
      const empty = list.querySelector('[data-gp-empty]');
      if (empty) empty.hidden = !!q || any;
    };
    const paint = () => {
      const vs = visible();
      for (const r of rows()) {
        const on = active >= 0 && r === vs[active];
        r.classList.toggle('active', on);
        if (on) r.setAttribute('aria-selected', 'true'); else r.removeAttribute('aria-selected');
      }
    };
    const open = () => {
      host.setAttribute('data-ui-state', 'open');
      filter();
      if (list.matches(':popover-open')) return;
      try { list.showPopover(); } catch (e) {}
    };
    const close = () => {
      endEdit(false);
      active = -1; paint();
      host.removeAttribute('data-ui-state');
      if (list.matches(':popover-open')) { try { list.hidePopover(); } catch (e) {} }
    };
    // BEST MATCH pre-highlights a REAL row only — never the add row: a
    // typed word is added from the list on purpose, not by Enter's echo.
    const best = () => {
      const vs = visible();
      active = typed && vs.length && !isCreate(vs[0]) ? 0 : -1;
      paint();
    };
    const move = (d) => {
      const vs = visible();
      if (!vs.length) return;
      open();
      active = (active + d + vs.length) % vs.length;
      paint();
      vs[active].scrollIntoView({ block: 'nearest' });
    };

    // EDIT MODE — the pencil turns the row into an input holding the
    // name; Enter (or the check) clicks the row's save action, Escape
    // or leaving cancels. One row edits at a time.
    let editing = null;
    const beginEdit = (row) => {
      endEdit(false);
      const inp = row.querySelector('[data-gp-rename]');
      if (!inp) return;
      editing = row;
      row.setAttribute('data-ui-state', 'editing');
      inp.hidden = false;
      row.querySelector('[data-gp-save]')?.removeAttribute('hidden');
      inp.value = label(row);
      inp.dispatchEvent(new Event('input', { bubbles: true })); // the bound draft signal follows
      inp.focus();
      inp.select();
    };
    const endEdit = (save) => {
      if (!editing) return;
      const row = editing;
      editing = null;
      if (save) row.querySelector('[data-gp-save]')?.click();
      row.removeAttribute('data-ui-state');
      const inp = row.querySelector('[data-gp-rename]');
      if (inp) inp.hidden = true;
      row.querySelector('[data-gp-save]')?.setAttribute('hidden', '');
    };

    const onFocus = () => { typed = false; open(); best(); };
    // the TAG opens the list too (rev 3): a picked field is one tap from
    // its alternatives — the whole list, a pick replaces; arrows and
    // Enter walk it from the tag, Backspace clears it
    const onChipFocus = () => { typed = false; open(); best(); };
    const onChipClick = (e) => { if (!e.target.closest('[data-gp-clear]')) { typed = false; open(); } };
    const onInput = (e) => { if (e.isTrusted) { typed = true; open(); best(); } };
    const onKey = (e) => {
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); move(1); break;
        case 'ArrowUp': e.preventDefault(); move(-1); break;
        case 'Enter':
          // only a highlighted row commits — a word that matches nothing
          // stays a word (the no-match note says so)
          if (list.matches(':popover-open')) {
            e.preventDefault();
            if (active >= 0) { visible()[active]?.querySelector('[data-gp-pick]')?.click(); close(); }
          }
          break;
        case 'Escape': if (list.matches(':popover-open')) { e.preventDefault(); e.stopPropagation(); close(); } break; // preventDefault: keeps the modal open (EventOS #237)
        case 'Tab': close(); break;
      }
    };
    const onListKey = (e) => {
      const inp = e.target.closest('[data-gp-rename]');
      if (!inp) return;
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); endEdit(true); input.focus(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); endEdit(false); input.focus(); }
    };
    const onListFocusOut = (e) => {
      // leaving the rename input cancels — unless the focus went to its
      // own save check, whose click is the commit
      if (editing && e.target.closest('[data-gp-rename]') && !e.relatedTarget?.closest?.('[data-gp-save]')) endEdit(false);
    };
    // a pick or an add commits through its own datastar handler and
    // closes (focus to the chip so Backspace can clear it); a delete or
    // a save keeps the list open with the input focused; the pencil
    // opens edit mode
    const onListClick = (e) => {
      if (e.target.closest('[data-gp-edit]')) { e.preventDefault(); beginEdit(e.target.closest('[role="option"]')); return; }
      if (e.target.closest('[data-gp-save]')) { endEdit(false); queueMicrotask(() => input.focus()); return; }
      if (e.target.closest('[data-gp-pick]')) {
        close();
        queueMicrotask(() => queueMicrotask(() => { const c = chip(); if (isShown(c)) c.focus(); }));
        return;
      }
      if (e.target.closest('[data-gp-del]')) { e.preventDefault(); queueMicrotask(() => input.focus()); }
    };
    // the chip: Backspace/Delete clicks the server-rendered × (the rocket
    // never clears state itself); the × hands focus back to the input
    const onHostKey = (e) => {
      if ((e.key === 'Backspace' || e.key === 'Delete') && e.target.closest('[data-gp-chip]')) {
        e.preventDefault();
        host.querySelector('[data-gp-clear]')?.click();
        queueMicrotask(() => queueMicrotask(() => input.focus()));
      }
    };
    const onHostClick = (e) => {
      if (e.target.closest('[data-gp-clear]')) queueMicrotask(() => queueMicrotask(() => input.focus()));
    };
    const onDocDown = (e) => { if (!host.contains(e.target)) close(); };

    // MORPH ARMOR: a morph brought fresh rows — re-filter, re-home the
    // highlight, drop a vanished edit, restore what the host attribute
    // says; never open.
    const mo = new MutationObserver(() => {
      if (editing && !editing.isConnected) editing = null;
      filter();
      if (active >= visible().length) active = visible().length - 1;
      paint();
      if (host.getAttribute('data-ui-state') === 'open' && !list.matches(':popover-open')) {
        try { list.showPopover(); } catch (e) {}
      }
    });
    mo.observe(list, { childList: true, subtree: true, characterData: true });

    input.addEventListener('focus', onFocus);
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKey);
    const c0 = chip();
    if (c0) { c0.addEventListener('focus', onChipFocus); c0.addEventListener('click', onChipClick); c0.addEventListener('keydown', onKey); }
    list.addEventListener('keydown', onListKey);
    list.addEventListener('focusout', onListFocusOut);
    list.addEventListener('click', onListClick);
    host.addEventListener('keydown', onHostKey);
    host.addEventListener('click', onHostClick);
    document.addEventListener('pointerdown', onDocDown);
    cleanup(() => {
      mo.disconnect();
      input.removeEventListener('focus', onFocus);
      input.removeEventListener('input', onInput);
      input.removeEventListener('keydown', onKey);
      if (c0) { c0.removeEventListener('focus', onChipFocus); c0.removeEventListener('click', onChipClick); c0.removeEventListener('keydown', onKey); }
      list.removeEventListener('keydown', onListKey);
      list.removeEventListener('focusout', onListFocusOut);
      list.removeEventListener('click', onListClick);
      host.removeEventListener('keydown', onHostKey);
      host.removeEventListener('click', onHostClick);
      document.removeEventListener('pointerdown', onDocDown);
    });
  },
});

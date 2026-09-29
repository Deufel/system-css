/*
 * date-picker — Datastar Pro (Rocket) web component.
 * Location: static/rocket/date-picker.js
 *
 * Loaded once from the base layout:
 *   <script type="module" src="/static/rocket/date-picker.js"></script>
 *
 * Used via the typed templ wrapper view.DatePicker(mode, value, valueEnd),
 * or directly as an element:
 *   <date-picker mode="range" value="2026-06-18" value-end="2026-06-26"></date-picker>
 *
 * Commits (the on-day check, or click-outside) dispatch a bubbling `change`:
 *   el.addEventListener('change', e => { const {start, end, mode} = e.detail });
 *
 * INTERACTION (no mode toggle — the `mode` PROP is a cap, not a user switch):
 *   - mode="single": every pick is one day (start === end); clicking moves it.
 *   - mode="range" : first pick is a single day (start === end) and gets the
 *       confirm check; a second, different pick makes it a range; a further pick
 *       on a complete range edits the nearest endpoint. The confirm check always
 *       rides the LAST-picked endpoint — click it (or click outside) to commit.
 *
 * COLOUR: the calpop is a real surface and publishes all three painter lines
 * (background-color + --surf-l + --surf-bg). Every button inside resets
 * --lift to its initial (guaranteed-invalid) value so its absolute --bg takes
 * effect — that's what lets the selected/in-range cells (positive --bg) pull
 * the inherited --hue instead of computing a neutral lift off the host.
 *
 * NOTE: the import below is ABSOLUTE (/static/datastar.js). Because this file lives in
 * a subfolder, a relative './datastar.js' would resolve to static/rocket/ and 404.
 * Requires system.css on the page for tokens.
 */
import { rocket } from '../datastar.js';

// ---- pure date helpers (props-down, no signals) ----
  const pad = n => String(n).padStart(2,'0');
  const isoOf = d => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const som = (ms,delta) => { const d=new Date(ms); return new Date(d.getFullYear(), d.getMonth()+delta, 1).getTime(); };
  const gridStart = viewMs => { const d=new Date(viewMs); const first=new Date(d.getFullYear(),d.getMonth(),1); const dow=(first.getDay()+6)%7; return new Date(d.getFullYear(),d.getMonth(),1-dow).getTime(); };
  const cellDate = (viewMs,i) => { const s=new Date(gridStart(viewMs)); return new Date(s.getFullYear(),s.getMonth(),s.getDate()+i); };
  const cellDay = (viewMs,i) => cellDate(viewMs,i).getDate();
  const cellIso = (viewMs,i) => isoOf(cellDate(viewMs,i));
  const cellInMonth = (viewMs,i) => cellDate(viewMs,i).getMonth() === new Date(viewMs).getMonth();
  const cellIsToday = (viewMs,i) => cellIso(viewMs,i) === isoOf(new Date());
  const todayIso = () => isoOf(new Date());
  const monthLabel = viewMs => new Date(viewMs).toLocaleDateString(undefined,{month:'long',year:'numeric'});
  const fmtPretty = iso => { if(!iso) return ''; const p=iso.split('-'); return new Date(+p[0],+p[1]-1,+p[2]).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'}); };
  const nightsBetween = (a,b) => Math.round((new Date(b)-new Date(a))/86400000);
  // fmtRange — the crumb shortening strategy (render's instanceLabel): shared
  // parts stated once, so a range reads "Jul 24–27, 2026" instead of two full
  // dates. Same month → "Jul 24–27, 2026"; same year → "Jul 24 – Aug 2, 2026";
  // else both dates in full. Single day → "Jul 24, 2026".
  const fmtRange = (a,b) => {
    if(!a) return '';
    const d = iso => { const p=iso.split('-'); return new Date(+p[0],+p[1]-1,+p[2]); };
    const da=d(a), md = x => x.toLocaleDateString(undefined,{month:'short',day:'numeric'}),
          mdy = x => x.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
    if(!b || b===a) return mdy(da);
    const db=d(b);
    if(da.getFullYear()===db.getFullYear() && da.getMonth()===db.getMonth())
      return md(da) + '–' + db.getDate() + ', ' + db.getFullYear();
    if(da.getFullYear()===db.getFullYear())
      return md(da) + ' – ' + mdy(db);
    return mdy(da) + ' – ' + mdy(db);
  };

  // far-navigation helpers (gf-50): the month/year header links open a
  // month grid or a 12-year page — a date years away is two clicks, not a
  // prev-button hammering session.
  const yearOf = ms => new Date(ms).getFullYear();
  const monthOf = ms => new Date(ms).getMonth();
  const monthOnly = ms => new Date(ms).toLocaleDateString(undefined, { month: 'long' });
  const monthName = m => new Date(2000, m, 1).toLocaleDateString(undefined, { month: 'short' });
  const withMonth = (ms, m) => new Date(yearOf(ms), m, 1).getTime();
  const withYear = (ms, y) => new Date(y, monthOf(ms), 1).getTime();
  const addYears = (ms, n) => new Date(yearOf(ms) + n, monthOf(ms), 1).getTime();
  const yearAt = (ms, i) => yearOf(ms) - 5 + i; // the 12-slot year page: y−5 … y+6
  const todayM = () => new Date().getMonth();
  const todayY = () => new Date().getFullYear();

  // expose helpers for Datastar expressions in the rendered markup
  Object.assign(window, { cellDay, cellIso, cellInMonth, cellIsToday, som, todayIso, monthLabel, fmtPretty, fmtRange, nightsBetween, yearOf, monthOf, monthOnly, monthName, withMonth, withYear, addYears, yearAt, todayM, todayY });

  rocket('date-picker', {
    mode: 'light',  // inherit system.css — shadow DOM would wall it off
    props: ({ oneOf, string }) => ({
      mode:     oneOf('single','range').default('single'),
      trigger:  oneOf('field','icon').default('field'),  // 'icon' = compact calendar button (inline edit affordance)
      value:    string.default(''),   // committed start ISO
      valueEnd: string.default(''),   // committed end ISO
    }),
    setup: ({ $$, props, host, action }) => {
      // committed values mirror props; draft (da/db) + view + last are local state
      $$.sela = props.value;
      $$.selb = props.valueEnd || props.value;
      $$.da = '';
      $$.db = '';
      $$.hover = '';
      $$.clicked = '';
      $$.last = '';           // the cell carrying the confirm check (last-picked endpoint)
      $$.v = props.value ? som(new Date(props.value).getTime(),0) : som(Date.now(),0);
      $$.grid = '';           // '' = days · 'months' · 'years' (the far-nav overlays)
      $$.pid = 'evp-' + Math.random().toString(36).slice(2, 9);  // unique dialog id (multiple pickers per page)

      // events-up: commit is a registered action, callable as @commit() in markup
      action('commit', () => {
        $$.sela = $$.da;
        $$.selb = $$.db || $$.da;
        host.setAttribute('value', $$.sela);
        host.setAttribute('value-end', $$.selb);
        host.dispatchEvent(new CustomEvent('change', {
          bubbles: true,
          detail: { start: $$.sela, end: $$.selb, mode: ($$.sela === $$.selb ? 'single' : 'range') }
        }));
      });

      // smart selection. single cap → always one day. range → first pick is a single
      // day (start===end), a second distinct pick opens a range, and a pick on a
      // complete range edits the nearest endpoint. $$.last tracks where the check sits.
      action('pick', () => {
        const iso = $$.clicked;
        // a pick sets the START only; the END is the next distinct pick — always
        // unified (single OR range), no mode gate.
        if (!$$.da) { $$.da = iso; $$.db = ''; $$.last = iso; return; }   // first pick → start, no end yet
        if (!$$.db) {                                                     // start set, no end → second pick is the other bookend
          if (iso === $$.da) { $$.last = iso; return; }                  // same day → stays a single day
          if (iso > $$.da) { $$.db = iso; }
          else { $$.db = $$.da; $$.da = iso; }
          $$.last = iso; return;
        }
        // complete range exists → edit the nearest endpoint (check follows it)
        if (iso > $$.db) { $$.db = iso; $$.last = iso; return; }   // after end -> extend end
        if (iso < $$.da) { $$.da = iso; $$.last = iso; return; }   // before start -> move start
        const dStart = Math.abs(new Date(iso) - new Date($$.da));
        const dEnd   = Math.abs(new Date(iso) - new Date($$.db));
        if (dStart < dEnd) { $$.da = iso; $$.last = iso; }         // nearer start -> start
        else { $$.db = iso; $$.last = iso; }                       // tie or nearer end -> end
      });
    },
    render: ({ html, props }) => html`
      <div style="display:${props.trigger === 'icon' ? 'inline-block' : 'block'}">
        <style>
      /* @layer components (2026-09-01: the project layer retired) — injected <style> comes after system.css, so same-layer ties still go to these rules */
      @layer components {
        /* TOP-PINNED, not centred: matches the canonical dialog geometry, so a
           picker opened from inside a top-pinned modal does not jump to the
           middle of the screen, and a taller month grid grows downward instead
           of shifting the header up under the cursor. */
        .calpop  { --bg: 0; background-color: var(--_bg); --surf-l: var(--_bg-l); --surf-bg: var(--bg);
                   margin-inline: auto; margin-block-start: 8vh; margin-block-end: auto;
                   inline-size: max-content; min-inline-size: 0; max-inline-size: 94vw;
                   border: 1px solid var(--border); border-radius: var(--cfg-radius); padding: 0.7lh 0.8em; }
        .calpop::backdrop { background-color: oklch(0 0 0 / 0.5); }
        /* every control in the dialog resets --lift so its absolute --bg applies
           (and positive --bg pulls the inherited --hue). */
        .calpop button { --lift: initial; }
        .calendar {
          display: grid; grid-template-columns: repeat(7, minmax(0, 2.4lh)); gap: 0.15lh;
        }
        .calendar > small { text-align: center; --fg: -0.5; --type: -1; }
        .calendar > button {
          position: relative; aspect-ratio: 1; min-inline-size: 0; min-block-size: 0; --bg: 0.08; --type: -1;
        }
        .calendar > button[data-ui-adjacent]              { --bg: -1; --fg: -0.7; }
        .calendar > button[data-ui-inrange]               { --bg: 0.6; }
        .calendar > button[data-ui-preview]               { --bg: 0.3; }
        .calendar > button[aria-current="date"]           { outline: 2px dotted var(--focus); outline-offset: -2px; }
        .calendar > button[data-ui-selected]              { --bg: 0.6; }
        .calendar > button[data-ui-start],
        .calendar > button[data-ui-end]                   { --bg: 0.6; }
        /* the confirm endpoint: edge-aligned ring + a corner check; click it to commit */
        .calendar > button[data-ui-confirm]               { outline: 2px solid var(--focus); outline-offset: -2px; color: transparent; }
        .calendar > button[data-ui-confirm]::after {
          content: ""; position: absolute; inset: 0; margin: auto;
          inline-size: 64%; block-size: 64%; background-color: var(--focus);
          -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E") center / contain no-repeat;
          mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E") center / contain no-repeat;
        }
        /* the far-nav overlays (gf-51): all three grids STACK in one cell so
           the popup never changes size — the day grid defines it, the jump
           grids stretch to fill it, and visibility (not display) swaps them. */
        .calbody { display: grid; }
        .calbody > * { grid-area: 1 / 1; }
        .calbody > .caljump { visibility: hidden; }
        .calbody[data-ui-grid="months"] > .calendar, .calbody[data-ui-grid="years"] > .calendar { visibility: hidden; }
        .calbody[data-ui-grid="months"] > .caljump[data-ui-kind="months"] { visibility: visible; }
        .calbody[data-ui-grid="years"] > .caljump[data-ui-kind="years"] { visibility: visible; }
        .caljump { display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-rows: 1fr; gap: 0.15lh; }
        .caljump > button { min-inline-size: 0; min-block-size: 0; --bg: 0.08; --type: -1; }
        /* today's month / today's year: the same dotted tell as today's day */
        .caljump > button[aria-current="date"] { outline: 2px dotted var(--focus); outline-offset: -2px; }
      }
      </style>

        ${props.trigger === 'icon'
          ? html`<button type="button" class="compact" aria-label="Edit dates"
              style="--bg:0.25; --type:-2; --lift:initial"
              data-on:click="$$da=$$sela; $$db=$$selb; $$last=($$selb||$$sela); $$grid=''; if($$sela){$$v=som(new Date($$sela).getTime(),0)}; document.getElementById($$pid).showModal()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="inline-size:1em;block-size:1em"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>
            </button>`
          : html`<button type="button" class="field" aria-haspopup="dialog"
              data-on:click="$$da=$$sela; $$db=$$selb; $$last=($$selb||$$sela); $$grid=''; if($$sela){$$v=som(new Date($$sela).getTime(),0)}; document.getElementById($$pid).showModal()">
              <span style="--fg:-0.5; display:inline-flex"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="inline-size:1.05em;block-size:1.05em;flex:0 0 auto"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg></span>
              <span data-text="!$$sela ? 'Select a date' : fmtRange($$sela, $$selb)"></span>
            </button>`}

        <dialog data-attr:id="$$pid" class="calpop"><div class="column">

          <!-- month + year are LINKS (gf-50): each opens a jump grid, and
               the arrows step what the open grid shows — a month in day
               view, a year in month view, a 12-year page in year view. -->
          <div class="spread" style="align-items:center">
            <button type="button" aria-label="Previous" style="--bg:0.06" data-on:click="$$grid==='years' ? ($$v=addYears($$v,-12)) : $$grid==='months' ? ($$v=addYears($$v,-1)) : ($$v=som($$v,-1))"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
            <div class="row" style="--gap:0.3em">
              <button type="button" class="bare" style="--bg:0" aria-label="Choose month" data-text="monthOnly($$v)" data-attr:aria-pressed="$$grid==='months'" data-on:click="$$grid = $$grid==='months' ? '' : 'months'"></button>
              <button type="button" class="bare" style="--bg:0" aria-label="Choose year" data-text="yearOf($$v)" data-attr:aria-pressed="$$grid==='years'" data-on:click="$$grid = $$grid==='years' ? '' : 'years'"></button>
            </div>
            <button type="button" aria-label="Next" style="--bg:0.06" data-on:click="$$grid==='years' ? ($$v=addYears($$v,12)) : $$grid==='months' ? ($$v=addYears($$v,1)) : ($$v=som($$v,1))"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>
          </div>

          <div class="spread" style="align-items:center">
            <div class="column" style="gap:0">
              <small data-text="!$$da ? 'Nothing selected' : fmtPretty($$da)"></small>
              <small data-text="($$db && $$db!==$$da) ? fmtPretty($$db) : '—'" style="--fg:-0.6"></small>
              <small style="--fg:-0.6" data-text="!$$da ? '\u00A0' : (($$db && $$db!==$$da) ? ((nightsBetween($$da,$$db)+1)+' days') : 'Single day')"></small>
            </div>
            <div class="row">
              <button type="button" style="--bg:0.04" data-on:click="$$da=''; $$db=''; $$last=''">Clear</button>
              <button type="button" style="--bg:0.04" data-on:click="$$v=som(Date.now(),0); $$da=todayIso(); $$db=todayIso(); $$last=todayIso()">Today</button>
            </div>
          </div>

          <!-- Rocket loop: cells are generated, not baked -->
          <div class="calbody" data-attr:data-ui-grid="$$grid">
          <div class="calendar" data-on:mouseleave="$$hover=''">
            <small>M</small><small>T</small><small>W</small><small>T</small><small>F</small><small>S</small><small>S</small>
            <template data-for="i in [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41]">
              <button type="button"
                data-on:mouseenter="$$hover = cellIso($$v,i)"
                data-text="cellDay($$v, i)"
                data-attr:data-ui-adjacent="!cellInMonth($$v, i)"
                data-attr:aria-current="cellIsToday($$v, i) ? 'date' : 'false'"
                data-attr:data-ui-selected="!!($$da && cellIso($$v,i)===$$da && (!$$db || $$db===$$da))"
                data-attr:data-ui-start="!!($$da && $$db && $$da!==$$db && cellIso($$v,i)===$$da)"
                data-attr:data-ui-end="!!($$da && $$db && $$da!==$$db && cellIso($$v,i)===$$db)"
                data-attr:data-ui-inrange="!!($$da && $$db && $$da!==$$db && cellIso($$v,i) > $$da && cellIso($$v,i) < $$db)"
                data-attr:data-ui-preview="!!($$da && !$$db && $$hover && ((cellIso($$v,i) >= $$da && cellIso($$v,i) <= $$hover) || (cellIso($$v,i) <= $$da && cellIso($$v,i) >= $$hover)))"
                data-attr:data-ui-confirm="!!($$last && cellIso($$v,i)===$$last)"
                data-on:click="cellIso($$v,i)===$$last ? (@commit(), document.getElementById($$pid).close()) : ($$clicked = cellIso($$v,i), @pick())"></button>
            </template>
          </div>

          <!-- the jump grids: pick a month (of the shown year) or a year
               (12 per page); either lands back in day view. -->
          <div class="caljump" data-ui-kind="months">
            <template data-for="m in [0,1,2,3,4,5,6,7,8,9,10,11]">
              <button type="button" data-text="monthName(m)"
                data-attr:aria-pressed="monthOf($$v)===m"
                data-attr:aria-current="yearOf($$v)===todayY() && todayM()===m ? 'date' : 'false'"
                data-on:click="$$v=withMonth($$v,m); $$grid=''"></button>
            </template>
          </div>
          <div class="caljump" data-ui-kind="years">
            <template data-for="i in [0,1,2,3,4,5,6,7,8,9,10,11]">
              <button type="button" data-text="yearAt($$v,i)"
                data-attr:aria-pressed="yearOf($$v)===yearAt($$v,i)"
                data-attr:aria-current="yearAt($$v,i)===todayY() ? 'date' : 'false'"
                data-on:click="$$v=withYear($$v,yearAt($$v,i)); $$grid='months'"></button>
            </template>
          </div>
          </div>

          <!-- The picker is the ONE dialog here that keeps a bottom Cancel rather
               than a header X. It is not a form: the calendar body IS the input,
               and a control that sits directly under the thing you just clicked
               is where the hand already is. Cancel and Save spread the row so the
               destructive-ish and the committing choice are at opposite ends. -->
          <div class="spread">
            <button type="button" style="--bg:0.06" data-on:click="document.getElementById($$pid).close()">Cancel</button>
            <button type="button" class="pri suc" data-attr:disabled="!$$da" data-on:click="@commit(); document.getElementById($$pid).close()">Save</button>
          </div>

        </div></dialog>
      </div>
    `,
  });

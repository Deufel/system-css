/*
 * day-picker — Datastar Pro (Rocket) web component.
 * Location: static/rocket/day-picker.js
 *
 * Loaded once from the base layout:
 *   <script type="module" src="/static/rocket/day-picker.js"></script>
 *
 * Used via the typed templ wrapper view.DayPicker(value), or directly:
 *   <day-picker value="2026-06-18"></day-picker>
 *
 * WHY A SEPARATE COMPONENT rather than <date-picker mode="single">.
 * The range picker carries machinery a single day has no use for: a draft PAIR
 * (da/db), the nearest-endpoint edit rule, the hover preview band, and a
 * three-line summary whose second and third lines are permanently "—" and
 * "Single day". On a one-day field all of that is either dead weight or an
 * outright lie about what the control can do — the user sees range affordances
 * and reasonably expects a range. This is the same interaction with the range
 * concepts REMOVED, not hidden: one draft value, click to select, Save (or the
 * confirm check ON the selected cell — gf-50, parity with the range picker) to
 * commit.
 *
 * It emits the SAME event shape as date-picker so call sites are interchangeable:
 *   el.addEventListener('change', e => { const {start, end, mode} = e.detail });
 * with end === start and mode === 'single', always.
 *
 * DIALOG GRAMMAR: top-pinned rather than centred, so it lands where every other
 * dialog lands and grows downward. It deliberately DIVERGES from the app's
 * header-X rule: a picker is not a form, the calendar body is the input, and the
 * commit controls belong directly under it — Cancel and Save spread on one row.
 *
 * NOTE: the import is ABSOLUTE (/static/datastar.js). This file lives in a
 * subfolder, so './datastar.js' would resolve to static/rocket/ and 404.
 * Requires system.css on the page for tokens.
 *
 * SELF-CONTAINED date helpers, deliberately. An earlier draft reused the ones
 * date-picker.js publishes onto window — which works only as long as that file
 * is loaded, is loaded FIRST, and keeps those exact names. That is an invisible
 * coupling that breaks at runtime with a blank calendar and no error worth
 * reading. These are ~10 lines of pure date math; owning them is cheaper than
 * owning the load-order rule. They are namespaced `dp*` so the two sets can
 * never collide on window.
 */
import { rocket } from '/static/datastar.js';

const dpPad = n => String(n).padStart(2, '0');
const dpIsoOf = d => d.getFullYear() + '-' + dpPad(d.getMonth() + 1) + '-' + dpPad(d.getDate());
const dpSom = (ms, delta) => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth() + delta, 1).getTime(); };
const dpGridStart = viewMs => { const d = new Date(viewMs); const first = new Date(d.getFullYear(), d.getMonth(), 1); const dow = (first.getDay() + 6) % 7; return new Date(d.getFullYear(), d.getMonth(), 1 - dow).getTime(); };
const dpCellDate = (viewMs, i) => { const s = new Date(dpGridStart(viewMs)); return new Date(s.getFullYear(), s.getMonth(), s.getDate() + i); };
const dpCellDay = (viewMs, i) => dpCellDate(viewMs, i).getDate();
const dpCellIso = (viewMs, i) => dpIsoOf(dpCellDate(viewMs, i));
const dpCellInMonth = (viewMs, i) => dpCellDate(viewMs, i).getMonth() === new Date(viewMs).getMonth();
const dpCellIsToday = (viewMs, i) => dpCellIso(viewMs, i) === dpIsoOf(new Date());
const dpToday = () => dpIsoOf(new Date());
const dpMonthLabel = viewMs => new Date(viewMs).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
const dpPretty = iso => { if (!iso) return ''; const p = iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); };
// far-navigation helpers (gf-50): the month/year header links open a month
// grid or a 12-year page, so a date years away is two clicks, not a
// prev-button hammering session.
const dpYearOf = ms => new Date(ms).getFullYear();
const dpMonthOf = ms => new Date(ms).getMonth();
const dpMonthOnly = ms => new Date(ms).toLocaleDateString(undefined, { month: 'long' });
const dpMonthName = m => new Date(2000, m, 1).toLocaleDateString(undefined, { month: 'short' });
const dpWithMonth = (ms, m) => new Date(dpYearOf(ms), m, 1).getTime();
const dpWithYear = (ms, y) => new Date(y, dpMonthOf(ms), 1).getTime();
const dpAddYears = (ms, n) => new Date(dpYearOf(ms) + n, dpMonthOf(ms), 1).getTime();
const dpYearAt = (ms, i) => dpYearOf(ms) - 5 + i; // the 12-slot year page: y−5 … y+6
const dpTodayM = () => new Date().getMonth();
const dpTodayY = () => new Date().getFullYear();

// Datastar expressions evaluate in global scope, so the markup below can only
// reach these through window.
Object.assign(window, { dpSom, dpCellDay, dpCellIso, dpCellInMonth, dpCellIsToday, dpToday, dpMonthLabel, dpPretty, dpYearOf, dpMonthOf, dpMonthOnly, dpMonthName, dpWithMonth, dpWithYear, dpAddYears, dpYearAt, dpTodayM, dpTodayY });

rocket('day-picker', {
  mode: 'light',  // inherit system.css — shadow DOM would wall it off
  props: ({ oneOf, string }) => ({
    trigger: oneOf('field', 'icon').default('field'),
    value:   string.default(''),   // committed ISO day ('' = nothing chosen)
  }),
  setup: ({ $$, props, host, action }) => {
    $$.sel = props.value;                 // committed
    $$.d   = '';                          // draft — what the calendar is showing as picked
    $$.v   = props.value ? dpSom(new Date(props.value).getTime(), 0) : dpSom(Date.now(), 0);
    $$.grid = '';                         // '' = days · 'months' · 'years' (the far-nav overlays)
    $$.pid = 'dyp-' + Math.random().toString(36).slice(2, 9);

    // events-up: commit the draft. end === start and mode === 'single' always,
    // so a consumer written against <date-picker> needs no branching.
    action('commit', () => {
      $$.sel = $$.d;
      host.setAttribute('value', $$.sel);
      host.dispatchEvent(new CustomEvent('change', {
        bubbles: true,
        detail: { start: $$.sel, end: $$.sel, mode: 'single' },
      }));
    });
  },
  render: ({ html, props }) => html`
    <div style="display:${props.trigger === 'icon' ? 'inline-block' : 'block'}">
      <style>
      /* @layer components (2026-09-01: the project layer retired) — injected <style> comes after system.css, so same-layer ties still go to these rules */
      @layer components {
      .daypop { --bg: 0; background-color: var(--_bg); --surf-l: var(--_bg-l); --surf-bg: var(--bg);
                margin-inline: auto; margin-block-start: 8vh; margin-block-end: auto;
                inline-size: max-content; min-inline-size: 0; max-inline-size: 94vw;
                border: 1px solid var(--border); border-radius: var(--cfg-radius); padding: 0.7lh 0.8em; }
      .daypop::backdrop { background-color: oklch(0 0 0 / 0.5); }
      /* every control resets --lift so its absolute --bg applies (and a positive
         --bg pulls the inherited --hue instead of computing a neutral lift). */
      .daypop button { --lift: initial; }
      .daycal { display: grid; grid-template-columns: repeat(7, minmax(0, 2.4lh)); gap: 0.15lh; }
      .daycal > small  { text-align: center; --fg: -0.5; --type: -1; }
      .daycal > button { position: relative; aspect-ratio: 1; min-inline-size: 0; min-block-size: 0; --bg: 0.08; --type: -1; }
      .daycal > button[data-ui-adjacent]     { --bg: -1; --fg: -0.7; }
      .daycal > button[aria-current="date"]  { outline: 2px dotted var(--focus); outline-offset: -2px; }
      .daycal > button[data-ui-selected]     { --bg: 0.6; }
      /* the confirm cell (gf-50, parity with date-picker): the selected day
         wears the ring + corner check; clicking IT commits and closes. */
      .daycal > button[data-ui-confirm]      { outline: 2px solid var(--focus); outline-offset: -2px; color: transparent; }
      .daycal > button[data-ui-confirm]::after {
        content: ""; position: absolute; inset: 0; margin: auto;
        inline-size: 64%; block-size: 64%; background-color: var(--focus);
        -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E") center / contain no-repeat;
        mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E") center / contain no-repeat;
      }
      /* the far-nav overlays (gf-51): all three grids STACK in one cell so
         the popup never changes size — the day grid defines it, the jump
         grids stretch to fill it, and visibility (not display) swaps them. */
      .dpbody { display: grid; }
      .dpbody > * { grid-area: 1 / 1; }
      .dpbody > .dayjump { visibility: hidden; }
      .dpbody[data-ui-grid="months"] > .daycal, .dpbody[data-ui-grid="years"] > .daycal { visibility: hidden; }
      .dpbody[data-ui-grid="months"] > .dayjump[data-ui-kind="months"] { visibility: visible; }
      .dpbody[data-ui-grid="years"] > .dayjump[data-ui-kind="years"] { visibility: visible; }
      .dayjump { display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-rows: 1fr; gap: 0.15lh; }
      .dayjump > button { min-inline-size: 0; min-block-size: 0; --bg: 0.08; --type: -1; }
      /* today's month / today's year: the same dotted tell as today's day */
      .dayjump > button[aria-current="date"] { outline: 2px dotted var(--focus); outline-offset: -2px; }
      }
      </style>

      ${props.trigger === 'icon'
        ? html`<button type="button" class="compact" aria-label="Edit date"
            style="--bg:0.25; --type:-2; --lift:initial"
            data-on:click="$$d=$$sel; $$grid=''; if($$sel){$$v=dpSom(new Date($$sel).getTime(),0)}; document.getElementById($$pid).showModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="inline-size:1em;block-size:1em"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>
          </button>`
        : html`<button type="button" class="field" aria-haspopup="dialog"
            data-on:click="$$d=$$sel; $$grid=''; if($$sel){$$v=dpSom(new Date($$sel).getTime(),0)}; document.getElementById($$pid).showModal()">
            <span style="--fg:-0.5; display:inline-flex"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="inline-size:1.05em;block-size:1.05em;flex:0 0 auto"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg></span>
            <span data-text="!$$sel ? 'Select a date' : dpPretty($$sel)"></span>
          </button>`}

      <dialog data-attr:id="$$pid" class="daypop"><div class="column">

        <!-- month + year are LINKS (gf-50): each opens a jump grid, and the
             prev/next arrows step what the open grid shows — a month in day
             view, a year in month view, a 12-year page in year view. -->
        <div class="spread" style="align-items:center">
          <button type="button" aria-label="Previous" style="--bg:0.06" data-on:click="$$grid==='years' ? ($$v=dpAddYears($$v,-12)) : $$grid==='months' ? ($$v=dpAddYears($$v,-1)) : ($$v=dpSom($$v,-1))"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
          <div class="row" style="--gap:0.3em">
            <button type="button" class="bare" style="--bg:0" aria-label="Choose month" data-text="dpMonthOnly($$v)" data-attr:aria-pressed="$$grid==='months'" data-on:click="$$grid = $$grid==='months' ? '' : 'months'"></button>
            <button type="button" class="bare" style="--bg:0" aria-label="Choose year" data-text="dpYearOf($$v)" data-attr:aria-pressed="$$grid==='years'" data-on:click="$$grid = $$grid==='years' ? '' : 'years'"></button>
          </div>
          <button type="button" aria-label="Next" style="--bg:0.06" data-on:click="$$grid==='years' ? ($$v=dpAddYears($$v,12)) : $$grid==='months' ? ($$v=dpAddYears($$v,1)) : ($$v=dpSom($$v,1))"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>
        </div>

        <div class="spread" style="align-items:center">
          <small data-text="!$$d ? 'Nothing selected' : dpPretty($$d)"></small>
          <div class="row">
            <button type="button" style="--bg:0.04" data-on:click="$$d=''">Clear</button>
            <button type="button" style="--bg:0.04" data-on:click="$$v=dpSom(Date.now(),0); $$d=dpToday()">Today</button>
          </div>
        </div>

        <!-- Rocket loop: cells are generated, not baked. Clicking the cell
             that already holds the draft (it wears the confirm check, same
             as date-picker's endpoint) commits and closes. -->
        <div class="dpbody" data-attr:data-ui-grid="$$grid">
        <div class="daycal">
          <small>M</small><small>T</small><small>W</small><small>T</small><small>F</small><small>S</small><small>S</small>
          <template data-for="i in [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41]">
            <button type="button"
              data-text="dpCellDay($$v, i)"
              data-attr:data-ui-adjacent="!dpCellInMonth($$v, i)"
              data-attr:aria-current="dpCellIsToday($$v, i) ? 'date' : 'false'"
              data-attr:data-ui-selected="!!($$d && dpCellIso($$v,i)===$$d)"
              data-attr:data-ui-confirm="!!($$d && dpCellIso($$v,i)===$$d)"
              data-on:click="dpCellIso($$v,i)===$$d ? (@commit(), document.getElementById($$pid).close()) : ($$d = dpCellIso($$v,i))"></button>
          </template>
        </div>

        <!-- the jump grids: a year lands in the MONTH view (year → month →
             day, the walk every good date picker does); a month lands in
             the day view. -->
        <div class="dayjump" data-ui-kind="months">
          <template data-for="m in [0,1,2,3,4,5,6,7,8,9,10,11]">
            <button type="button" data-text="dpMonthName(m)"
              data-attr:aria-pressed="dpMonthOf($$v)===m"
              data-attr:aria-current="dpYearOf($$v)===dpTodayY() && dpTodayM()===m ? 'date' : 'false'"
              data-on:click="$$v=dpWithMonth($$v,m); $$grid=''"></button>
          </template>
        </div>
        <div class="dayjump" data-ui-kind="years">
          <template data-for="i in [0,1,2,3,4,5,6,7,8,9,10,11]">
            <button type="button" data-text="dpYearAt($$v,i)"
              data-attr:aria-pressed="dpYearOf($$v)===dpYearAt($$v,i)"
              data-attr:aria-current="dpYearAt($$v,i)===dpTodayY() ? 'date' : 'false'"
              data-on:click="$$v=dpWithYear($$v,dpYearAt($$v,i)); $$grid='months'"></button>
          </template>
        </div>
        </div>

        <!-- Cancel beside Save, not a header X — see date-picker.js. The calendar
             body is the input, so the commit controls belong under it. -->
        <div class="spread">
          <button type="button" style="--bg:0.06" data-on:click="document.getElementById($$pid).close()">Cancel</button>
          <button type="button" class="pri suc" data-attr:disabled="!$$d" data-on:click="@commit(); document.getElementById($$pid).close()">Save</button>
        </div>

      </div></dialog>
    </div>
  `,
});

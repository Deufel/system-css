/*
 * mini-calc — Datastar Pro (Rocket) web component.
 * Location: static/rocket/mini-calc.js
 *
 * A purely client-side scratchpad calculator. No server, no persistence — just a
 * quick calculator in the HUD. State is four signals scoped INSIDE the component
 * ($$), so nothing leaks to the page or the backend. The logic is the set of pure
 * reducers below (take state, return new state); every key is a Datastar
 * expression that swaps the state for the reducer's result.
 *
 * mode:'light' so system.css tokens apply. Import is ABSOLUTE (subfolder).
 */
import { rocket } from '../datastar.js';

// ---- pure reducers: take state, return new state; never mutate, never read globals ----
const cFmt = (x) => {
  if (!isFinite(x)) return "Error";
  let s = (Math.round(x * 1e12) / 1e12).toString();
  if (s.replace("-", "").replace(".", "").length > 13) s = x.toExponential(6);
  return s;
};
const cCalc = (a, op, b) => {
  switch (op) {
    case "+": return a + b;
    case "−": return a - b;
    case "×": return a * b;
    case "÷": return b === 0 ? NaN : a / b;
    default:  return b;
  }
};
const cClr   = ()      => ({ a: 0, op: "", cur: "0", fresh: true });
const cDigit = (s, d)  => {
  if (s.cur === "Error") s = cClr();
  if (s.fresh || s.cur === "0") return { ...s, cur: d, fresh: false };
  if (s.cur.replace("-", "").replace(".", "").length >= 12) return s;
  return { ...s, cur: s.cur + d, fresh: false };
};
const cDot = (s) => {
  if (s.cur === "Error") return { ...cClr(), cur: "0.", fresh: false };
  if (s.fresh) return { ...s, cur: "0.", fresh: false };
  return s.cur.includes(".") ? s : { ...s, cur: s.cur + ".", fresh: false };
};
const cOp = (s, o) => {
  const b = parseFloat(s.cur);
  if (s.op && !s.fresh) {
    const r = cCalc(s.a, s.op, b);
    return { a: r, op: o, cur: cFmt(r), fresh: true };
  }
  return { a: b, op: o, cur: s.cur, fresh: true };
};
const cEq = (s) => {
  if (!s.op) return s;
  const r = cCalc(s.a, s.op, parseFloat(s.cur));
  return { a: r, op: "", cur: cFmt(r), fresh: true };
};
const cNeg = (s) => {
  if (s.cur === "Error" || s.cur === "0") return s;
  return { ...s, cur: s.cur.startsWith("-") ? s.cur.slice(1) : "-" + s.cur };
};
const cPct = (s) => ({ ...s, cur: cFmt(parseFloat(s.cur) / 100), fresh: true });
const cDel = (s) => {
  if (s.fresh || s.cur === "Error") return s;
  const neg = s.cur.startsWith("-");
  const body = neg ? s.cur.slice(1) : s.cur;
  const next = body.length <= 1 ? "0" : body.slice(0, -1);
  return { ...s, cur: next === "0" ? "0" : (neg ? "-" : "") + next };
};
Object.assign(window, { cFmt, cCalc, cClr, cDigit, cDot, cOp, cEq, cNeg, cPct, cDel });

rocket('mini-calc', {
  mode: 'light',
  setup: ({ $$, host, cleanup }) => {
    // one state object, scoped to this instance
    $$.calc = { a: 0, op: "", cur: "0", fresh: true };

    // keyboard bridge: route physical keys through the SAME buttons (one source of
    // truth). Scoped to the host so it only fires while the calc has focus — no
    // global key hijacking elsewhere on the page.
    const onKey = (e) => {
      const k = e.key === "Enter" ? "=" : e.key;
      const btn = host.querySelector('[data-key="' + CSS.escape(k) + '"]');
      if (btn) { e.preventDefault(); btn.click(); }
    };
    host.addEventListener("keydown", onKey);
    cleanup(() => host.removeEventListener("keydown", onKey));
  },
  render: ({ html }) => html`
    <section class="calc card column" tabindex="0" autofocus
             style="--bg:-0.55; --hue:255; outline:none; inline-size:100%;">

      <div class="screen card" style="--bg:-0.78;">
        <small class="expr" data-text="$$calc.op ? cFmt($$calc.a) + ' ' + $$calc.op : ''"></small>
        <output class="now" data-text="$$calc.cur" style="--type:2; text-align:right; display:block;"></output>
      </div>

      <div class="keys" role="group" aria-label="Calculator keypad"
           style="display:grid; grid-template-columns:repeat(4,1fr); gap:0.3lh;">
        <button data-key="Escape"    style="--bg:-0.3" data-on:click="$$calc = cClr()">AC</button>
        <button data-key="Backspace" style="--bg:-0.3" data-on:click="$$calc = cDel($$calc)" aria-label="Delete">⌫</button>
        <button data-key="%"         style="--bg:-0.3" data-on:click="$$calc = cPct($$calc)">%</button>
        <button data-key="/"         style="--bg:0.6"  data-on:click="$$calc = cOp($$calc,'÷')">÷</button>

        <button data-key="7" style="--bg:-0.12" data-on:click="$$calc = cDigit($$calc,'7')">7</button>
        <button data-key="8" style="--bg:-0.12" data-on:click="$$calc = cDigit($$calc,'8')">8</button>
        <button data-key="9" style="--bg:-0.12" data-on:click="$$calc = cDigit($$calc,'9')">9</button>
        <button data-key="*" style="--bg:0.6" data-on:click="$$calc = cOp($$calc,'×')">×</button>

        <button data-key="4" style="--bg:-0.12" data-on:click="$$calc = cDigit($$calc,'4')">4</button>
        <button data-key="5" style="--bg:-0.12" data-on:click="$$calc = cDigit($$calc,'5')">5</button>
        <button data-key="6" style="--bg:-0.12" data-on:click="$$calc = cDigit($$calc,'6')">6</button>
        <button data-key="-" style="--bg:0.6" data-on:click="$$calc = cOp($$calc,'−')">−</button>

        <button data-key="1" style="--bg:-0.12" data-on:click="$$calc = cDigit($$calc,'1')">1</button>
        <button data-key="2" style="--bg:-0.12" data-on:click="$$calc = cDigit($$calc,'2')">2</button>
        <button data-key="3" style="--bg:-0.12" data-on:click="$$calc = cDigit($$calc,'3')">3</button>
        <button data-key="+" style="--bg:0.6" data-on:click="$$calc = cOp($$calc,'+')">+</button>

        <button style="--bg:-0.3" data-on:click="$$calc = cNeg($$calc)" aria-label="Plus minus">±</button>
        <button data-key="0" style="--bg:-0.12" data-on:click="$$calc = cDigit($$calc,'0')">0</button>
        <button data-key="." style="--bg:-0.12" data-on:click="$$calc = cDot($$calc)">.</button>
        <button data-key="=" style="--bg:0.82" data-on:click="$$calc = cEq($$calc)" aria-label="Equals">=</button>
      </div>
    </section>`,
});

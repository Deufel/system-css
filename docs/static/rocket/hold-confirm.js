// hold-confirm — WRAPS a normal button and gates its action behind a press-and-
// hold. Your button keeps its native styles untouched; this adds the hold timing
// and a progress outline that traces the button's exact rounded-rectangle border.
//
// The trace is an SVG <path> normalized with pathLength="100" and revealed by
// animating stroke-dashoffset. Because the dash distributes along the path's TRUE
// arc length, it moves at a constant speed and hugs the real border on ANY shape —
// square icon button or wide full-width button alike (a conic gradient sweeps by
// angle, so it raced the short edges and crawled the long ones on wide buttons).
// A closed path also closes seamlessly, so no overlap fudge is needed.
//
// Complete the hold (~1.5s) and it fires a bubbling `confirm` event — the parent
// owns the actual write, so the wrapper is identical for any action:
//
//   <fieldset data-on:confirm="@post('/.../delete'); el.closest('[popover]')?.hidePopover()">
//     <hold-confirm class="dgr" data-ignore-morph>
//       <button type="button" style="inline-size:100%">Delete asset</button>
//     </hold-confirm>
//   </fieldset>
//
// Lifting early (or, with a mouse, sliding off) cancels. Keyboard users hold
// Space/Enter. The trace ink is var(--focus) (danger-hued here, since .dgr on the
// host locks the hue). Props down (the button + hold ms), events up (confirm).
//
// Attribute (optional):  hold — hold duration in ms (default 1500)

const SVGNS = "http://www.w3.org/2000/svg";
const STROKE = 3; // trace thickness, px
const HOLD_MS = 1500; // default hold duration

let injected = false;
function injectCSS() {
  if (injected) return;
  injected = true;
  const s = document.createElement("style");
  s.textContent =
    "hold-confirm{display:inline-flex;position:relative}" +
    // ⚠ NOT inset:0 — the overlay is pinned to the BUTTON's own box by
    // _measure (left/top/width/height), because the host's box is not the
    // button's box: any host padding, alignment gap or extra sibling made
    // the inset-stretched svg render the trace offset AND mis-scaled
    // (viewBox was button-sized, the svg element host-sized — gf-51).
    "hold-confirm>.hc-trace{position:absolute;overflow:visible;opacity:0;" +
    "transition:opacity .12s;pointer-events:none}" +
    "hold-confirm.holding>.hc-trace{opacity:1}" +
    // var(--focus): system.css's resolved OKLCH focus colour, recomputed per
    // element from the inherited hue lock — danger-hued under a .dgr host.
    "hold-confirm>.hc-trace>path{fill:none;stroke:var(--focus);stroke-linecap:round}";
  document.head.appendChild(s);
}

class HoldConfirm extends HTMLElement {
  connectedCallback() {
    if (this._init) return;
    const btn = this.querySelector("button");
    if (!btn) return; // nothing to wrap
    this._init = true;
    injectCSS();
    this._btn = btn;
    this._hold = parseInt(this.getAttribute("hold") || String(HOLD_MS), 10);

    btn.type = btn.type || "button"; // never submit a form on a tap
    btn.style.touchAction = "none";
    btn.style.userSelect = "none";
    btn.style.webkitUserSelect = "none";
    btn.style.webkitTouchCallout = "none";

    // Trace overlay: an SVG path sized to the button, drawn by stroke-dashoffset.
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("class", "hc-trace");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(SVGNS, "path");
    path.setAttribute("pathLength", "100");
    path.setAttribute("stroke-width", String(STROKE));
    path.setAttribute("stroke-dasharray", "100");
    path.setAttribute("stroke-dashoffset", "100"); // empty until held
    svg.appendChild(path);
    this.appendChild(svg);
    this._svg = svg;
    this._path = path;

    this._measure();
    // Re-fit on any size change — including 0→size when the popover first opens.
    this._ro = new ResizeObserver(() => this._measure());
    this._ro.observe(btn);

    const start = (e) => { e.preventDefault(); this._start(); };
    const cancel = () => this._cancel();
    btn.addEventListener("pointerdown", start);
    btn.addEventListener("pointerup", cancel);
    btn.addEventListener("pointerleave", cancel); // mouse slide-off
    btn.addEventListener("pointercancel", cancel);
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
    btn.addEventListener("keydown", (e) => {
      if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); this._start(); }
    });
    btn.addEventListener("keyup", (e) => {
      if (e.key === " " || e.key === "Enter") this._cancel();
    });
  }

  disconnectedCallback() {
    this._cancel();
    if (this._ro) this._ro.disconnect();
  }

  // Rebuild the trace to match the button. Fine pointers get the border
  // trace: a rounded rectangle hugging the button's own edge, start at
  // top-centre, clockwise, inset by half the stroke. COARSE pointers get
  // the ORBIT (gf-51, per Mike): a circle well outside the button, because
  // the holding finger is covering the button — progress drawn under the
  // finger is progress nobody sees. Same pathLength=100 normalization, so
  // the hold animation is identical either way. The overlay svg is pinned
  // to the button's box (offsetLeft/Top within the position:relative host),
  // never inset:0 — see injectCSS.
  _measure() {
    const w = this._btn.offsetWidth, h = this._btn.offsetHeight;
    if (!w || !h) return; // not laid out yet (e.g. popover closed)
    const st = this._svg.style;
    st.left = this._btn.offsetLeft + "px";
    st.top = this._btn.offsetTop + "px";
    st.width = w + "px";
    st.height = h + "px";
    this._svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    if (matchMedia("(pointer: coarse)").matches) {
      // the orbit: centred on the button, radius pushed past the longer
      // half-side plus a finger's breadth. overflow:visible lets it draw
      // far outside the viewBox.
      const cx = w / 2, cy = h / 2;
      const r = Math.max(w, h) / 2 + 22;
      this._path.setAttribute("stroke-width", String(STROKE + 1));
      this._path.setAttribute("d",
        "M" + cx + " " + (cy - r) +
        "A" + r + " " + r + " 0 1 1 " + cx + " " + (cy + r) +
        "A" + r + " " + r + " 0 1 1 " + cx + " " + (cy - r) + "Z");
      return;
    }
    const i = STROKE / 2;
    const raw = parseFloat(getComputedStyle(this._btn).borderTopLeftRadius) || 0;
    const R = Math.max(0, Math.min(raw - i, (w - 2 * i) / 2, (h - 2 * i) / 2));
    const cx = w / 2, x0 = i, x1 = w - i, y0 = i, y1 = h - i;
    this._path.setAttribute("stroke-width", String(STROKE));
    const d =
      "M" + cx + " " + y0 +
      "H" + (x1 - R) +
      "A" + R + " " + R + " 0 0 1 " + x1 + " " + (y0 + R) +
      "V" + (y1 - R) +
      "A" + R + " " + R + " 0 0 1 " + (x1 - R) + " " + y1 +
      "H" + (x0 + R) +
      "A" + R + " " + R + " 0 0 1 " + x0 + " " + (y1 - R) +
      "V" + (y0 + R) +
      "A" + R + " " + R + " 0 0 1 " + (x0 + R) + " " + y0 +
      "H" + cx + "Z";
    this._path.setAttribute("d", d);
  }

  _start() {
    if (this._raf) return; // already holding
    this.classList.add("holding");
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / this._hold); // real, linear progress
      // easeOutQuad on the VISUAL only: full speed early, decelerating into the
      // close so the finish feels settled. Fire stays keyed to real p.
      const eased = 1 - (1 - p) * (1 - p);
      this._path.setAttribute("stroke-dashoffset", String(100 * (1 - eased)));
      if (p >= 1) { this._raf = 0; this._fire(); return; }
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  _cancel() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
    this.classList.remove("holding");
    if (this._path) this._path.setAttribute("stroke-dashoffset", "100");
  }

  _fire() {
    this._cancel();
    this.dispatchEvent(new CustomEvent("confirm", { bubbles: true }));
  }
}

customElements.define("hold-confirm", HoldConfirm);

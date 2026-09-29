// <toast-card> — the dismissal half of the toast lifecycle (gf-26;
// registered through rocket() since gf-44, per the upstream convention:
// one registration path, idempotent re-define, cleanup-managed
// listeners — even for a behavior-only wrapper).
//
// The card, its entrance, and its exit transition are all server/CSS-
// owned (.toast is a canonical system.css component): @starting-style
// animates the card IN when a morph inserts it; data-ui-state="leaving"
// animates it OUT. This wrapper only SEQUENCES the exit, which CSS
// cannot do alone because the node's removal belongs to the server:
// click on [data-toast-dismiss] → set data-ui-state="leaving" AND
// dispatch the bubbling `dismiss` at once (feedback #151, 2026-09-24:
// the verb used to wait for the slide, and a morph landing inside that
// wait replaced the node and cancelled the timer — the card was gone on
// the client and never dismissed on the server, so "Dismiss all" hung
// over an empty stack). The host's data-on:dismiss posts, and the
// user's own morph removes the node — the slide runs for whatever the
// morph leaves it. The server stamps data-preserve-attr="data-ui-state"
// so an unrelated morph cannot snap an in-flight exit back upright.
import { rocket } from "/static/datastar.js";

rocket("toast-card", {
  mode: "light", // system.css owns the look; shadow DOM would wall it off
  setup: ({ host, cleanup }) => {
    // leave starts the exit and hands the verb to the host's data-on
    // binding in the same tick: "dismiss" posts the dismissal, "trash"
    // (gf-161) posts the delete — same slide, different consequence.
    const leave = (verb) => {
      if (host.dataset.uiState === "leaving") return;
      host.dataset.uiState = "leaving";
      host.dispatchEvent(new CustomEvent(verb, { bubbles: true }));
    };
    // READ BY DWELL (feedback #101; #137: "a few seconds"): the pointer
    // resting on the card for two seconds is the read receipt — once; the
    // server re-stamps the state and the unread dot leaves with it.
    let dwell = 0;
    const onEnter = () => {
      if (host.dataset.uiState) return; // read or leaving already
      dwell = setTimeout(() => host.dispatchEvent(new CustomEvent("read", { bubbles: true })), 2000);
    };
    const onLeave = () => clearTimeout(dwell);
    const expand = (ex) => {
      ex.setAttribute("aria-expanded", ex.getAttribute("aria-expanded") === "true" ? "false" : "true");
      if (!host.dataset.uiState) host.dispatchEvent(new CustomEvent("read", { bubbles: true }));
    };
    const onClick = (e) => {
      // expand (feedback #101, rev 2 #137): the card unfolds in place —
      // state rides aria-expanded, the engine's :has() rule shows the body
      // an expand IS a read (feedback #154): the receipt posts once; the
      // button's aria-expanded is preserved through the morph it causes
      if (e.target.closest("[data-toast-expand]")) return expand(e.target.closest("[data-toast-expand]"));
      if (e.target.closest("[data-toast-trash]")) return leave("trash");
      if (e.target.closest("[data-toast-dismiss]")) return leave("dismiss");
    };
    host.addEventListener("click", onClick);
    host.addEventListener("pointerenter", onEnter);
    host.addEventListener("pointerleave", onLeave);
    cleanup(() => {
      host.removeEventListener("click", onClick);
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointerleave", onLeave);
      clearTimeout(dwell);
    });
  },
});

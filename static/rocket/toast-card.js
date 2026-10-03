// <toast-card> — the verbs of the toast lifecycle (gf-26; registered
// through rocket() since gf-44: one registration path, idempotent
// re-define, cleanup-managed listeners — even for a behavior-only
// wrapper).
//
// The card, its entrance and its exit are server/CSS-owned (.toast is a
// canonical system.css component): @starting-style animates the card IN
// when a morph inserts it; data-ui-state="leaving" animates it OUT. The
// host carries ONE state word, data-ui-state — "unread" (the dot),
// "read" (quiet), "leaving" (the exit) — which the SERVER stamps (seen_at,
// and a just-dismissed grace window) and this wrapper echoes a round
// trip early, so the verb answers under the pointer and the morph that
// lands next agrees with what the card already shows (rev 3 gf-470,
// feedback #198: the dot used to be a second element beside the
// attribute — two things for a morph to remove, the "double removal").
//
// The verbs, each ONE event the host's data-on binding posts:
//   read     — the pointer rested two seconds (feedback #101, #137), or
//              the expand verb opened the fold (#154); once, from unread.
//   dismiss  — [data-toast-dismiss]: the card leaves, rests in the drawer.
//   trash    — [data-toast-trash]: the card leaves, the row is deleted.
//   fold     — the expand verb opened or closed the fold (detail.open).
// Leaving sets the state AND dispatches in the same tick (feedback #151,
// 2026-09-24: a verb that waited for the slide was cancelled by any
// morph landing inside the wait); the server renders the card as
// leaving for a grace window, so the morph keeps the node through the
// exit and the one after removes a node that is already display: none.
// The expand verb flips aria-expanded on the button a round trip early
// (preserved through morphs by the server's data-preserve-attr) and
// raises `fold` with detail.open, so the server can keep the state and
// render it on the next page.
import { rocket } from '../datastar.js';

rocket("toast-card", {
  mode: "light", // system.css owns the look; shadow DOM would wall it off
  setup: ({ host, cleanup }) => {
    let dwell = 0;
    // one word, two transitions: unread → read (once), anything → leaving (once)
    const go = (word, verb) => { host.dataset.uiState = word; host.dispatchEvent(new CustomEvent(verb, { bubbles: true })); };
    const read = () => { if (host.dataset.uiState === "unread") go("read", "read"); };
    const leave = (verb) => { clearTimeout(dwell); if (host.dataset.uiState !== "leaving") go("leaving", verb); };
    const onEnter = () => { if (host.dataset.uiState === "unread") dwell = setTimeout(read, 2000); };
    const onLeave = () => clearTimeout(dwell);
    const onClick = (e) => {
      const expand = e.target.closest("[data-toast-expand]");
      // the fold's state is the server's to keep (EventOS feedback #212): `fold` tells it
      if (expand) { const open = expand.getAttribute("aria-expanded") !== "true"; expand.setAttribute("aria-expanded", open); host.dispatchEvent(new CustomEvent("fold", { bubbles: true, detail: { open } })); read(); }
      else if (e.target.closest("[data-toast-trash]")) leave("trash");
      else if (e.target.closest("[data-toast-dismiss]")) leave("dismiss");
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

---
name: land-and-stream
description: The server-side laws for the Go + Datastar + SSE "land-and-stream" architecture — pure CQRS on command paths, the one-view-channel rule, morph vs replace at scale, warm-brotli streaming, publish ordering, hot windows, and the measurement discipline that found all of it. Use when building or changing ANY command handler, stream/publish path, fragment answer, roster render, or when diagnosing perceived slowness in this stack — and BEFORE proposing a second channel, a cache, or a client-side workaround. Pairs with datastar-components (the client half) and system-css (the styling). Hard-won 2026-08-26 (gf-82…96); the costs quoted were measured, not estimated.
scope: general (laws measured on EventOS; they hold for any Datastar SSE app)
---

# Land-and-stream — the server laws

Land-and-stream: every page load opens `/stream`; the server renders whole
pages; updates arrive as morphs down that one long-lived connection. These
are the laws learned by breaking them, with the measured price of each.

## 1. Pure CQRS: commands answer 204; the stream is the ONE view channel

A command handler **stores state, answers `204 No Content`, publishes**.
The view — for *every* tab, the acting one included — arrives as the
stream's whole-page render (the **fat-morph** — house term). On table
and product paths this is absolute: never answer a command with
rendered fragments, no matter how much faster it seems.

The ONE sanctioned exception (scoped 2026-08-30, per Mike): a
SELF-CONTAINED exploratory surface — the import-wizard body, the admin
css-chart toggle, the SQL console result — may answer with a targeted
replace-mode patch of its own `data-ignore-morph`-armored region. The
exception is narrow by construction: the region is morph-armored (the
fat-morph won't fight it), page-local, and renders nothing any other
tab needs. If another tab could care, it's a table path — 204 + publish.
ONE further exception, stated and dated (2026-09-17, gf-362): `POST
/start/pick` (handler/handler.go StartPick) answers SIGNALS — the `g:`
place reference, the map fix, the office's `_name`/`_website`. It is
sanctioned because the sign-up wizard has no org and opens no stream
(`Page.NoStream`), so there is no view channel to answer on. Every page
that streams keeps the one-channel rule.

Why this is a law and not a preference — the hybrid (fragment answer +
publish) was tried and produced three distinct failures:

- **The echo**: the actor's own stream re-rendered and re-shipped the
  whole page it had just received — double server render, double
  bandwidth on the same thin pipe the next answer needed.
- **THE RACE**: publish fired before the answer was written; when the
  whole-page morph reached the browser first it morphed *stale* DOM into
  the new state at full cost (~5s on a 3.5k-row reorder), **striking at
  random** — which made every instrumented run disagree with every lived
  experience. Nondeterministic bugs cost 10× the tokens.
- **Cold dictionaries**: each fragment answer compressed from scratch
  (130KB for a table 99% identical to what the client held). The stream's
  long-lived brotli window compresses successive near-identical frames to
  almost nothing — the cheap channel was the stream all along.

Corollaries: any state a view needs must be **stored** state (even the
half-typed search term — `TableLens.Live`), because the stream can only
render what the store holds. Signals are TRANSPORT, not truth: they
carry the input up; the store renders it back down, and a morph
re-merging a signal server-authoritatively (plain `data-signals`, no
`__ifmissing`) is correct behavior. And if you ever must publish from a
path that also writes a response: **answer first, publish after**,
always.

The store's fine print (each line was a bug):
- **No lens state in the URL, ever** — sort/scope/unlinked/facets are
  @posts against the prefs row (`sys_pref`, the lens key per
  user/org/section — `db.TableLens`), merged on write.
- **A nil prefs patch value DELETES its key**, so absent == spec
  defaults; writers must know absent-vs-empty or a lens write
  resurrects hidden columns.
- **Selection is server state** (a `sys_pref` row per user/org/section); bulk verbs read the
  store, and select-all is one `INSERT…SELECT` under the live lens WHERE.
- **Search terms REFINE (AND)**; same-facet values OR within their key;
  facet counts must filter `archived_at` or parked rows leak in.
- **Default lens = `status:active`** — stored-lens ABSENCE seeds the
  filter; an explicit clear is respected. The reset verb restores
  default lens + spec columns + empty selection in ONE 204.

Actor-exclusion (tab ids, skip-the-actor publishes) was built and then
deleted in the same day: under pure CQRS there is no second channel to
deduplicate. If you find yourself building exclusion, you have two
channels — remove one instead.

## 2. Morph at scale — and a stale-measurement warning

Idiomorph over this stack, measured at 3,541 keyed table rows:

| operation | cost |
|---|---|
| in-place attribute flips (checkbox, column hide) | 300–450ms, no long task |
| row-set shrink (search narrowing) | fast, no long task |
| reorder (sort) | ~5.1s **STALE — see below** |
| native swap of the same subtree (`outerHTML`) | 117ms + 268ms datastar rescan |

**The ~5s reorder figure was measured with since-deleted code in the
path**: a client table rocket (MutationObservers re-scanning on every
morphed node, purged gf-98 — rosters are server markup under the
engine's `.roster` component now) and the race-era double channel
(gf-91/93).
Re-measured 2026-08-26 on the deployed Pi via the admin Stream bench
(gf-99d; the bench itself was retired in gf-111 once it had done this
job — the numbers stand, the instrument is gone): an 8,000-row reorder frame — comparable DOM node count to the
full 3.5k roster — cost **30.5ms on the client main thread** (~4µs/row);
server side 57ms warm. The real morph engine is ~165× faster than the
stale figure said; the seconds belonged entirely to the deleted code.
Lesson twice over: a measurement is stamped with the code that produced
it, and quoting it after that code is deleted is guessing wearing a
number. Morph cost at scale is REAL but linear-ish, not cliff-shaped;
re-measure before fencing anything — the longtask beacon on Admin →
Usage ("How it feels") is the standing client instrument, and a scratch
Go probe timing each render piece alone (a throwaway `_test.go` that times
one render piece — gf-99c found 424ms/render hiding in one picker fill → 4ms) is the
server-side one. The hot window (below) remains the right default because EVERY
leg scales with row count. Row `id` attributes are still mandatory —
they make the in-place cases correct and cheap.

**Morph armor** (the fat-morph's escape hatches — client details in the
datastar-components skill): a region whose subtree the server must not
diff carries `data-ignore-morph` on BOTH the shipped and the incoming
node, and updates only via replace-mode patches from its own command; a
single attribute that must survive (a dialog's `open`, a style) rides
`data-preserve-attr`. Never use preserve-attr as subtree armor. And a
nested `<form>` is DROPPED by the full-document parser but legal inside
a morphed fragment (it arrives through a `<template>`) — a dialog form
that works after a morph and vanishes on a fresh land is this;
`formaction` on a button is the idiom that needs no nesting.

**DOM scale laws**: one server-filled edit dialog PER ROSTER (filled
with the single-selected row on each selection morph), never a dialog
per row — N dialogs in the DOM is the 2000-customer scaling bug solved
before it shipped.

## 3. The hot window: row count is the master lever

Every leg — query scan, templ render, compression CPU, wire bytes,
browser parse, datastar init, morph walk — scales linearly with rendered
rows (~830B and ~12–15µs of server render per roster row; ~0.3ms of
browser work per row on land). Rosters default to the **first 500 rows**
(`LensNDefault`) with a sticky "Show all"; search/filters/facet counts/
select-all still operate on the full set server-side. 500 rows keeps
every interaction in the ~100ms class on an Orange Pi 5; "Show all" at
3.5k re-enters the slow class knowingly.

## 4. The measurement discipline (how all of this was found)

Server telemetry alone is structurally blind: the request log said 59ms
while the user felt 5 seconds. When something "feels slow":

1. **State a hypothesis, then instrument — never patch on theory.** Two
   confident theories (compression, row keys) were implemented before the
   real cause was measured; both were fine work aimed at the wrong organ.
2. Build the waterfall in the browser: `performance` nav/resource
   timing (TTFB / download / apply), a `PerformanceObserver` on
   `longtask`, a MutationObserver for apply bursts. The client beacon
   (`static/telemetry.js` → `sys_metric` → Admin Usage "How it
   feels") keeps this running permanently.
3. Distrust an unreproducible number — it usually means a **race**; find
   the two racers before measuring anything else.
4. SQLite is never guilty until the raw query is timed alone (5ms for
   3.5k rows with five joins; the 77ms "slow query" was one missing
   index probed per-row). Go render cost that smells wrong is usually
   allocation churn (per-row string concatenation), not templ.
5. Measure on the deployed hardware path — localhost hides the wire, the
   proxy, and the Pi's CPU. And verify which build is actually running
   before trusting any prod measurement (`tr[id]` presence, a marker).

## 5. Assorted laws with scars attached

- **A page's stream subscribes by the ORG IN ITS PATH** (`/o/{id}/…`),
  plus the user's own subject, plus the world tables it renders. A page
  with no org in its path — `/start`, `/admin/*`, the landing —
  re-lands ONLY on the user subject: a verb it fires must `publishUser`
  too, or the 204 lands nothing (gf-317, the territory toggles). Say
  which subject re-lands the page before writing a 204 for it. THE
  WIZARD HAS TWO HALVES (gf-363): before the org exists the stations are
  plain forms + 303s and no stream at all; from Locations on, the page
  streams on the USER subject (handler/stream.go subscribes
  `bus.UserSubject`) and every verb — `/start/warehouse`, the delete,
  the territory toggles — is a 204 + `publishUser`.
- **A keystroke lane never shares a limiter with a credential lane**
  (gf-362, found on prod): `/start/where-suggest` and `/start/pick` sat
  on the login limiter (12/min per IP) and the suggest keystrokes spent
  it — the pick answered 429. `startLimit` (600/min, routes.go) carries
  both.

- **Select-all (and any bulk write) stays inside SQLite**: one
  `INSERT … SELECT` under the same lens WHERE the roster reads — ids
  never round-trip through Go (the read-then-insert-per-row loop was
  179ms → 62ms end to end at 5k rows).
- **One definition per filter**: search columns, facet CASEs, and sweep
  WHEREs read the same compile-time vars — two copies WILL drift.
- **Derive, never copy** (the live-SUM doctrine generalized): effective
  status computes down the chain at read time; a family's supplier
  derives via its brands. Write-time cascades destroy children's own
  truth and cannot be undone.
- **The schema is the numbered files under `db/migrations/`** (gf-416) —
  an index or a column is the next file, never an edit to a committed one.
- **SSE answers must be exempted from generic compression middleware**
  (match on the request's `Accept: text/event-stream`); datastar's own
  writer owns that encoding.
- **No no-JS fallback paths, ever** — a GET-form fallback under a
  Datastar app is changing the tires on a car with no engine. One wire.
- **Labs never write into product data paths** — the UI lab's toast test
  once used the real notification producer and chased the operator
  across production pages. An exerciser is page-local and ephemeral.

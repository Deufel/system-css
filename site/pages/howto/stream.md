---
title: Land and stream in Go
section: howto
order: 4
---

Every page opens `/stream`. Commands answer 204 and publish; the stream
re-renders the whole page for every open connection and sends it as one
morph. The page is never assembled on the client from fragments.

## The skeleton

```go
// a command: write, publish, 204 — never a fragment
func (h *Handler) Rename(w http.ResponseWriter, r *http.Request) {
	orgID := pathID(r, "org_id")
	if err := h.DB.Rename(r.Context(), orgID, r.FormValue("name")); err != nil {
		http.Error(w, "save failed", http.StatusInternalServerError)
		return
	}
	_ = h.Bus.Publish(bus.OrgSubject(orgID), nil)
	w.WriteHeader(http.StatusNoContent)
}

// the stream: one SSE connection per open page; every org event re-lands it
func (s *Stream) Serve(w http.ResponseWriter, r *http.Request) {
	sse := datastar.NewSSE(w, r)
	sub, _ := s.Bus.Subscribe(bus.OrgSubject(orgID))
	defer sub.Unsubscribe()
	for {
		select {
		case <-r.Context().Done():
			return
		case <-sub.C:
			html, _ := s.Render.Page(r.Context(), path) // the WHOLE page
			_ = sse.MergeFragments(html, datastar.WithSelector("body"), datastar.WithMergeMode(datastar.FragmentMergeModeMorph))
		}
	}
}
```

The bus is embedded NATS; subjects are `org.<id>.<table>` and
`glb.<table>`. A coalescer folds a burst of publishes into one render.

## The laws with scars attached

- **A render is O(page), never O(world).** A page reads what it shows.
  Row count is the master lever: a roster's hot window is the rows on
  screen, the rest lands on demand.
- **Never answer a fragment on a table path.** The one view channel is
  the stream; a command that returns HTML creates a second truth.
- **Seed-hide with inline `display: none`.** An in-flow element whose
  `data-show` is false at land paints visible for a frame; the landed
  HTML itself is the floor.
- **Measure before you pin.** Every threshold in the doctrine was found
  with a stopwatch on the real page; a cliff you have not measured is a
  guess.

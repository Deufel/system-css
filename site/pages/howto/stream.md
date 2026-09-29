---
title: Land and stream in Go
section: howto
order: 5
---

Every page opens `/stream`. A command answers 204 and publishes. The
stream re-renders the whole page for each open connection and sends one
morph. The client never assembles a page from fragments.

```go
// a command: write, publish, 204
func (h *Handler) Rename(w http.ResponseWriter, r *http.Request) {
	orgID := pathID(r, "org_id")
	if err := h.DB.Rename(r.Context(), orgID, r.FormValue("name")); err != nil {
		http.Error(w, "save failed", http.StatusInternalServerError)
		return
	}
	_ = h.Bus.Publish(bus.OrgSubject(orgID), nil)
	w.WriteHeader(http.StatusNoContent)
}

// the stream: one SSE connection per open page
func (s *Stream) Serve(w http.ResponseWriter, r *http.Request) {
	sse := datastar.NewSSE(w, r)
	sub, _ := s.Bus.Subscribe(bus.OrgSubject(orgID))
	defer sub.Unsubscribe()
	for {
		select {
		case <-r.Context().Done():
			return
		case <-sub.C:
			html, _ := s.Render.Page(r.Context(), path)
			_ = sse.MergeFragments(html, datastar.WithSelector("body"), datastar.WithMergeMode(datastar.FragmentMergeModeMorph))
		}
	}
}
```

The bus is embedded NATS. Subjects are `org.<id>.<table>` and
`glb.<table>`. A coalescer folds a burst of publishes into one render.

## Rules

- A render is O(page). A page reads what it shows. A roster's hot window
  is the rows on screen.
- Never answer a fragment on a table path. The stream is the one view
  channel.
- Seed-hide with inline `display: none`. An element whose `data-show` is
  false at land paints visible for a frame otherwise.
- Measure before you pin a threshold.

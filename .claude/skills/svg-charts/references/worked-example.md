# Worked example: the spend-vs-volume bubble chart

> ⚠ **PATTERN DOCUMENT — the code below is NOT in the tree.** These helpers
> (`scHueShift`/`scK`/`scN`/`foText`, `scatterSVG`, `ReportScatterCmd`, the
> `/reporting/*` routes) were swept in gf-33 before shipping; only `scEsc`
> survives. Copy the STRUCTURE, not the source. The shipped exemplars are
> `view/chartrender.go` (cssLayersStackSVG/repoLocStackSVG + the
> CSSMetricsSection legend in view/admin_dev.templ) and `view/statusbar.go`.
> Known drift from current law in the snippets below — follow the tree, not
> the snippet, where they disagree: inline geometry on the legend swatch
> (violates the view/ratchet_test.go geometry ratchet — compose engine
> classes instead), `font: 11px` literals (use foLabel's engine-typed
> foreignObject), legend swatches at --fg 0.75 (shipped charts use --fg 1),
> and the command answering with PatchElements + no publish (table-path
> commands are 204 + publish; a targeted fragment patch is sanctioned only
> for self-contained exploratory surfaces like the css-chart toggle).

A complete, copyable build of one chart, end to end. It plots one bubble per
occurrence — case-equivalents per day (x) against total event spend (y), sized by
attendance, colored by calendar year — with a backend-driven year filter whose tags
double as the legend. Adapt the shape; keep the conventions.

## Contents
1. The Go builder (`view/chartrender.go`)
2. The data method (`render/renderer.go`)
3. The view structs
4. The template section + legend/filter tags
5. The toggle command (handler + renderer morph + route)

---

## 1. The Go builder — `view/chartrender.go`

Note: `scHueShift` is shared with the legend tags (§4) so a year's color matches in
both places. `scEsc` escapes user text in `<title>`. `%%` is a literal `%`. Marks are
chromatic (`--fg: 0.75`) with per-series `--hue-shift`; furniture is neutral.

```go
package view

import (
	"fmt"
	"math"
	"strings"
)

// scHueShift spreads n series evenly around the wheel — distinct hue per series,
// riding the inherited --hue so the chart re-themes with the page.
func scHueShift(idx, n int) int {
	if n < 1 {
		n = 1
	}
	return idx * 360 / n
}

func scEsc(s string) string {
	return strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;", `"`, "&quot;").Replace(s)
}

func scK(d float64) string { // compact dollars: 1.2k, 850
	if d >= 1000 {
		return strings.TrimSuffix(fmt.Sprintf("%.1f", d/1000), ".0") + "k"
	}
	return fmt.Sprintf("%.0f", d)
}

func scN(v float64) string { // one decimal, trimmed
	return strings.TrimSuffix(fmt.Sprintf("%.1f", v), ".0")
}

func scatterSVG(points []ScatterPoint, yearN int) string {
	const W, H = 720.0, 440.0
	const ml, mr, mt, mb = 72.0, 18.0, 16.0, 46.0
	pw, ph := W-ml-mr, H-mt-mb

	var maxX, maxY float64
	maxA := 0
	for _, p := range points {
		if p.CEDay > maxX {
			maxX = p.CEDay
		}
		if float64(p.SpendCents) > maxY {
			maxY = float64(p.SpendCents)
		}
		if p.Attendance > maxA {
			maxA = p.Attendance
		}
	}
	if maxX <= 0 {
		maxX = 1
	}
	if maxY <= 0 {
		maxY = 1
	}
	maxX *= 1.08 // headroom so marks don't touch the frame
	maxY *= 1.08
	xp := func(v float64) float64 { return ml + v/maxX*pw }
	yp := func(v float64) float64 { return mt + ph - v/maxY*ph } // y grows downward
	rad := func(a int) float64 {
		if maxA <= 0 || a <= 0 {
			return 4 // visible floor
		}
		return 5 + math.Sqrt(float64(a)/float64(maxA))*17 // area ∝ attendance
	}

	var b strings.Builder
	fmt.Fprintf(&b, `<svg viewBox="0 0 %g %g" xmlns="http://www.w3.org/2000/svg" style="inline-size: 100%%; block-size: auto; --fg: -0.5;" role="img" aria-label="Event spend versus case-equivalents per day, sized by attendance">`, W, H)

	// gridlines (faintest)
	b.WriteString(`<g stroke="currentColor" style="--fg: -0.13;" stroke-width="1">`)
	for i := 1; i <= 4; i++ {
		gy := mt + ph - float64(i)/4*ph
		fmt.Fprintf(&b, `<line x1="%g" y1="%g" x2="%g" y2="%g"/>`, ml, gy, ml+pw, gy)
	}
	b.WriteString(`</g>`)

	// axes
	b.WriteString(`<g stroke="currentColor" style="--fg: -0.4;" stroke-width="1">`)
	fmt.Fprintf(&b, `<line x1="%g" y1="%g" x2="%g" y2="%g"/>`, ml, mt+ph, ml+pw, mt+ph)
	fmt.Fprintf(&b, `<line x1="%g" y1="%g" x2="%g" y2="%g"/>`, ml, mt, ml, mt+ph)
	b.WriteString(`</g>`)

	// tick labels (font set once on the group)
	b.WriteString(`<g fill="currentColor" style="--fg: -0.55; font: 11px system-ui, sans-serif;">`)
	for i := 0; i <= 4; i++ {
		gy := mt + ph - float64(i)/4*ph
		fmt.Fprintf(&b, `<text x="%g" y="%g" text-anchor="end" dominant-baseline="middle">$%s</text>`, ml-7, gy, scK(maxY*float64(i)/4/100))
		gx := ml + float64(i)/4*pw
		fmt.Fprintf(&b, `<text x="%g" y="%g" text-anchor="middle">%s</text>`, gx, mt+ph+16, scN(maxX*float64(i)/4))
	}
	b.WriteString(`</g>`)

	// axis titles
	b.WriteString(`<g fill="currentColor" style="--fg: -0.7; font: 12px system-ui, sans-serif;">`)
	fmt.Fprintf(&b, `<text x="%g" y="%g" text-anchor="middle">CE / day</text>`, ml+pw/2, H-5)
	fmt.Fprintf(&b, `<text transform="translate(15 %g) rotate(-90)" text-anchor="middle">Event spend</text>`, mt+ph/2)
	b.WriteString(`</g>`)

	// data marks — chromatic, one hue per series, translucent fill + crisp stroke
	for _, p := range points {
		fmt.Fprintf(&b, `<circle cx="%g" cy="%g" r="%g" fill="currentColor" stroke="currentColor" stroke-width="1" style="--fg: 0.75; --hue-shift: %d; fill-opacity: 0.42;"><title>%s — %s CE/day · $%s · %d</title></circle>`,
			xp(p.CEDay), yp(float64(p.SpendCents)), rad(p.Attendance), scHueShift(p.YearIdx, yearN),
			scEsc(p.Label), scN(p.CEDay), scK(float64(p.SpendCents)/100), p.Attendance)
	}

	b.WriteString(`</svg>`)
	return b.String()
}
```

---

## 2. The data method — `render/renderer.go`

Geometry-free here: compute the raw values + the stable per-series index for color.
An empty selection means "all" (so toggling the last series off snaps back rather than
blanking). Drop empty rows so they don't pile on the origin. Color index is assigned in
sorted order so a series keeps its color regardless of which others are visible.

```go
func (rn *Renderer) scatter(ctx context.Context, orgID int64, years []int) ([]view.ScatterPoint, []view.ScatterYear, int) {
	rows, _ := rn.DB.ScatterData(ctx, orgID)

	yearIdx := map[int]int{}
	var allYears []int
	for _, r := range rows {
		if len(r.StartDate) < 4 {
			continue
		}
		y, err := strconv.Atoi(r.StartDate[:4])
		if err != nil {
			continue
		}
		if _, seen := yearIdx[y]; !seen {
			yearIdx[y] = 0
			allYears = append(allYears, y)
		}
	}
	sort.Ints(allYears)
	for i, y := range allYears {
		yearIdx[y] = i // stable color index
	}

	sel := map[int]bool{}
	for _, y := range years {
		if _, ok := yearIdx[y]; ok {
			sel[y] = true
		}
	}
	if len(sel) == 0 { // empty selection = all
		for _, y := range allYears {
			sel[y] = true
		}
	}

	syears := make([]view.ScatterYear, 0, len(allYears)) // recent-first for the tags
	for i := len(allYears) - 1; i >= 0; i-- {
		y := allYears[i]
		syears = append(syears, view.ScatterYear{Year: y, Idx: yearIdx[y], Selected: sel[y]})
	}

	var points []view.ScatterPoint
	for _, r := range rows {
		if len(r.StartDate) < 4 {
			continue
		}
		y, err := strconv.Atoi(r.StartDate[:4])
		if err != nil || !sel[y] {
			continue
		}
		if r.CE <= 0 && r.SpendCents <= 0 { // skip empty occurrences
			continue
		}
		ceDay := r.CE
		if d := daySpan(r.StartDate, r.EndDate); d > 1 {
			ceDay = r.CE / float64(d)
		}
		points = append(points, view.ScatterPoint{
			Label: r.EventName, Year: y, YearIdx: yearIdx[y],
			CEDay: ceDay, SpendCents: r.SpendCents, Attendance: r.Attendance,
		})
	}
	return points, syears, len(allYears)
}
```

The `ScatterData` query sums the real source tables per occurrence (here: spend from
`sponsorship_lines.amount_cents`, CE from `sale_lines`). **Watch out:** an additive
schema column like `event_instances.sponsorship_cents` may exist but be a never-populated
`DEFAULT 0` — always confirm which table actually holds the value before summing, or the
whole axis reads zero.

---

## 3. The view structs

The point struct carries raw values + the color index; the series struct backs the tags.

```go
type ScatterPoint struct {
	Label      string
	Year       int
	YearIdx    int // index into the sorted year list → hue
	CEDay      float64
	SpendCents int64
	Attendance int
}

type ScatterYear struct {
	Year     int
	Idx      int // same index → swatch hue matches its bubbles
	Selected bool
}

// On the page struct: Scatter []ScatterPoint; ScatterYears []ScatterYear; ScatterYearN int
```

---

## 4. The template — chart + legend/filter tags

`scatterSignals` seeds the selection as a server-authoritative signal (no `__ifmissing`).
`scatterYearTag` is the legend AND the filter: its swatch uses the *same* `scHueShift`
index as the bubbles, and its click posts the toggle command.

```go
// scatterSignals: selected years as a plain signal, re-merged each morph.
func scatterSignals(d Report) string {
	csv := ""
	for _, y := range d.ScatterYears {
		if y.Selected {
			if csv != "" {
				csv += ","
			}
			csv += itoa(int64(y.Year))
		}
	}
	return "{scatterYears: '" + csv + "'}"
}

templ scatterYearTag(orgID int64, y ScatterYear, n int) {
	<button type="button" class="tag" data-ui-state={ onOff(y.Selected) } data-on:click={ "@post('" + orgURL(orgID, "/reporting/scatter") + "?toggle=" + itoa(int64(y.Year)) + "')" }>
		<span style={ "display: inline-block; inline-size: 0.7em; block-size: 0.7em; border-radius: 50%; vertical-align: -0.05em; margin-inline-end: 0.35em; background: currentColor; --fg: 0.75; --hue-shift: " + itoa(int64(scHueShift(y.Idx, n))) + ";" }></span>
		{ itoa(int64(y.Year)) }
	</button>
}
```

The swatch is a plain `<span>` (NOT `.bg`): the engine computes its `color` from
`--fg: 0.75` + `--hue-shift`, and `background: currentColor` paints it that color. The
`.tag` + `data-ui-state="on"/"off"` gives the selected/greyed states.

In the page body:

```html
if len(d.ScatterYears) > 0 {
	<section class="column" style="gap: 0.6lh;" data-signals={ scatterSignals(d) }>
		<div class="column" style="gap: 0.1lh;">
			<h2 style="--type: 1; margin: 0;">Spend vs. volume</h2>
			<small style="--fg: -0.6;">Each bubble is one occurrence … lower-right moves volume cheaply.</small>
		</div>
		<div class="row" style="flex-wrap: wrap; gap: 0.4em; align-items: center;">
			<small style="--fg: -0.6; --type: -1;">Years</small>
			for _, y := range d.ScatterYears {
				@scatterYearTag(d.OrgID, y, d.ScatterYearN)
			}
		</div>
		<div class="bg" style="--bg: 0.04; border-radius: var(--cfg-radius); padding: 0.5lh 0.6em;">
			@templ.Raw(scatterSVG(d.Scatter, d.ScatterYearN))
		</div>
	</section>
}
```

---

## 5. The toggle command — handler + morph + route

Pure exploratory command: read the signal, flip one year via `?toggle`, re-render the
whole page through `Stream`. No client-side filtering anywhere.

```go
// handler — read scatterYears, flip the toggled year, re-render.
func (h *Handler) ReportScatterCmd(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.homeOrg(r)
	if !ok {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	var s struct {
		Years string `json:"scatterYears"`
	}
	_ = datastar.ReadSignals(r, &s)
	seen := map[int]bool{}
	years := make([]int, 0)
	for _, p := range strings.Split(s.Years, ",") {
		if v, e := strconv.Atoi(strings.TrimSpace(p)); e == nil && !seen[v] {
			seen[v] = true
			years = append(years, v)
		}
	}
	if t := r.URL.Query().Get("toggle"); t != "" {
		if tv, e := strconv.Atoi(t); e == nil {
			if seen[tv] {
				out := years[:0]
				for _, y := range years {
					if y != tv {
						out = append(out, y)
					}
				}
				years = out
			} else {
				years = append(years, tv)
			}
		}
	}
	html, ok := h.Render.ScatterMorph(r.Context(), orgID, years)
	if !ok {
		http.Error(w, "render failed", http.StatusInternalServerError)
		return
	}
	_ = datastar.NewSSE(w, r).PatchElements(string(html))
}

// renderer — encode the new state into an internal URL and re-resolve the page.
func (rn *Renderer) ScatterMorph(ctx context.Context, orgID int64, years []int) ([]byte, bool) {
	q := url.Values{}
	if len(years) > 0 {
		csv := make([]string, 0, len(years))
		for _, y := range years {
			csv = append(csv, strconv.Itoa(y))
		}
		q.Set("years", strings.Join(csv, ","))
	}
	u := orgURL(orgID, "/reporting/summary")
	if enc := q.Encode(); enc != "" {
		u += "?" + enc
	}
	return rn.Stream(ctx, u) // Stream → resolve → render whole page
}
```

The `resolve` case for the page parses `q.Get("years")` (CSV → `[]int`) and threads it
into the data method, so a normal load and a toggle command take the identical path —
the browser URL never changes, but the server re-renders from the new state every time.

Route + capability:

```go
r.With(authn.RequireUser).Post("/o/{id}/reporting/scatter", h.ReportScatterCmd)
// "POST /o/{id}/reporting/scatter": member,
```

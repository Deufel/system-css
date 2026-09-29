// Package charts — server-rendered SVG for the stack: geometry computed
// here, paint left ENTIRELY to the engine. Every mark is currentColor with
// a --fg knob for weight (the engine turns --fg into ink), a series may
// carry --hue-shift, every label is a foreignObject the engine types
// (--type, --fg — no hand fonts, no px literals). The builders answer
// strings a template drops in raw. Ported from EventOS's view layer
// (gf-69 · gf-283), the shelf the svg-charts skill names.
package charts

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

// Point is one labelled value.
type Point struct {
	Label string
	Val   float64
}

// Bar is one horizontal bar: its label, the value's word, its share.
type Bar struct {
	Label, ValueLabel string
	Pct               int
}

func esc(s string) string {
	return strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;", `"`, "&quot;").Replace(s)
}

func ff(v float64) string { return strconv.FormatFloat(v, 'f', 2, 64) }

// Kfmt — a number as a person reads it: 950 · 1.2k · 3.4M.
func Kfmt(v float64) string {
	switch {
	case math.Abs(v) >= 1e6:
		return strconv.FormatFloat(v/1e6, 'f', 1, 64) + "M"
	case math.Abs(v) >= 1e3:
		return strconv.FormatFloat(v/1e3, 'f', 1, 64) + "k"
	}
	return strconv.FormatFloat(v, 'f', 0, 64)
}

func maxOf(pts []Point) float64 {
	m := 0.0
	for _, p := range pts {
		if p.Val > m {
			m = p.Val
		}
	}
	if m == 0 {
		m = 1
	}
	return m
}

// niceStep — a gridline step of 1 · 2 · 5 × a power of ten.
func niceStep(raw float64) float64 {
	if raw <= 0 {
		return 1
	}
	mag := math.Pow(10, math.Floor(math.Log10(raw)))
	for _, m := range []float64{1, 2, 5} {
		if raw <= m*mag {
			return m * mag
		}
	}
	return 10 * mag
}

// label — one chart label as a foreignObject: HTML text the engine types.
func label(x, y, w, h float64, align, inner string) string {
	return fmt.Sprintf(`<foreignObject x="%s" y="%s" width="%s" height="%s" style="overflow: visible;"><small xmlns="http://www.w3.org/1999/xhtml" style="display: block; text-align: %s; --type: -2; --fg: -0.8;">%s</small></foreignObject>`,
		ff(x), ff(y), ff(w), ff(h), align, inner)
}

func open(w, h float64, aria string) string {
	return fmt.Sprintf(`<svg viewBox="0 0 %g %g" xmlns="http://www.w3.org/2000/svg" style="inline-size: 100%%; block-size: auto; --fg: -0.5;" role="img" aria-label="%s">`, w, h, esc(aria))
}

// Columns — vertical bars, one per category, in the caller's order.
func Columns(pts []Point, aria string) string {
	n := len(pts)
	if n == 0 {
		return ""
	}
	const W, H = 460.0, 240.0
	const ml, mr, mt, mb = 40.0, 10.0, 12.0, 24.0
	pw, ph := W-ml-mr, H-mt-mb
	yMax := maxOf(pts) * 1.08
	yp := func(v float64) float64 { return mt + ph - v/yMax*ph }
	step := pw / float64(n)
	bw := math.Min(step*0.68, 48)
	var b strings.Builder
	b.WriteString(open(W, H, aria))
	g := niceStep(yMax / 4)
	b.WriteString(`<g stroke="currentColor" style="--fg: -0.13;">`)
	for v := g; v < yMax; v += g {
		fmt.Fprintf(&b, `<line x1="%g" y1="%s" x2="%g" y2="%s"/>`, ml, ff(yp(v)), W-mr, ff(yp(v)))
	}
	b.WriteString(`</g>`)
	for v := 0.0; v < yMax; v += g {
		b.WriteString(label(0, yp(v)-8, ml-6, 16, "end", Kfmt(v)))
	}
	fmt.Fprintf(&b, `<line x1="%g" y1="%s" x2="%g" y2="%s" stroke="currentColor" style="--fg: -0.4;"/>`, ml, ff(mt+ph), W-mr, ff(mt+ph))
	for i, p := range pts {
		x := ml + step*(float64(i)+0.5) - bw/2
		y := yp(p.Val)
		fmt.Fprintf(&b, `<rect x="%s" y="%s" width="%s" height="%s" rx="2" fill="currentColor" style="--fg: 1;"><title>%s: %s</title></rect>`,
			ff(x), ff(y), ff(bw), ff(mt+ph-y), esc(p.Label), Kfmt(p.Val))
		b.WriteString(label(x+bw/2-40, H-18, 80, 14, "center", esc(p.Label)))
	}
	b.WriteString(`</svg>`)
	return b.String()
}

// Dots — the ranking form: one dot per category on a whisper leader,
// sorted by the caller; reads like a table, scales like ink.
func Dots(pts []Point, aria string) string {
	n := len(pts)
	if n == 0 {
		return ""
	}
	const W = 460.0
	const ml, mr, mt, mb = 130.0, 40.0, 8.0, 8.0
	const rowH = 24.0
	H := mt + mb + float64(n)*rowH
	pw := W - ml - mr
	max := maxOf(pts) * 1.05
	var b strings.Builder
	b.WriteString(open(W, H, aria))
	for i, p := range pts {
		mid := mt + float64(i)*rowH + rowH/2
		x := ml + pw*p.Val/max
		b.WriteString(label(0, mid-8, ml-10, 16, "end", esc(p.Label)))
		fmt.Fprintf(&b, `<line x1="%g" y1="%s" x2="%s" y2="%s" stroke="currentColor" style="--fg: -0.13;"/>`, ml, ff(mid), ff(x-6), ff(mid))
		fmt.Fprintf(&b, `<circle cx="%s" cy="%s" r="4.5" fill="currentColor" style="--fg: 1;"><title>%s: %s</title></circle>`, ff(x), ff(mid), esc(p.Label), Kfmt(p.Val))
		b.WriteString(label(x+8, mid-8, 60, 16, "start", Kfmt(p.Val)))
	}
	b.WriteString(`</svg>`)
	return b.String()
}

// LineArea — change over time: one line, a translucent area for weight,
// the endpoint dot and its value (the newest number is the one asked for).
func LineArea(pts []Point, aria string) string {
	n := len(pts)
	if n < 2 {
		return ""
	}
	const W, H = 460.0, 200.0
	const ml, mr, mt, mb = 40.0, 46.0, 30.0, 22.0
	pw, ph := W-ml-mr, H-mt-mb
	yMax := maxOf(pts) * 1.1
	xp := func(i int) float64 { return ml + pw*float64(i)/float64(n-1) }
	yp := func(v float64) float64 { return mt + ph - v/yMax*ph }
	var b strings.Builder
	b.WriteString(open(W, H, aria))
	g := niceStep(yMax / 3)
	b.WriteString(`<g stroke="currentColor" style="--fg: -0.13;">`)
	for v := g; v < yMax; v += g {
		fmt.Fprintf(&b, `<line x1="%g" y1="%s" x2="%g" y2="%s"/>`, ml, ff(yp(v)), W-mr, ff(yp(v)))
	}
	b.WriteString(`</g>`)
	for v := 0.0; v < yMax; v += g {
		b.WriteString(label(0, yp(v)-8, ml-6, 16, "end", Kfmt(v)))
	}
	fmt.Fprintf(&b, `<line x1="%g" y1="%s" x2="%g" y2="%s" stroke="currentColor" style="--fg: -0.4;"/>`, ml, ff(mt+ph), W-mr, ff(mt+ph))
	var pth strings.Builder
	for i, p := range pts {
		pth.WriteString(ff(xp(i)) + "," + ff(yp(p.Val)) + " ")
	}
	fmt.Fprintf(&b, `<polygon fill="currentColor" fill-opacity="0.1" style="--fg: 1;" points="%s,%s %s%s,%s"/>`, ff(ml), ff(mt+ph), pth.String(), ff(xp(n-1)), ff(mt+ph))
	fmt.Fprintf(&b, `<polyline fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" style="--fg: 1;" points="%s"/>`, pth.String())
	for i, p := range pts {
		fmt.Fprintf(&b, `<circle cx="%s" cy="%s" r="7" fill="transparent"><title>%s: %s</title></circle>`, ff(xp(i)), ff(yp(p.Val)), esc(p.Label), Kfmt(p.Val))
	}
	last := pts[n-1]
	fmt.Fprintf(&b, `<circle cx="%s" cy="%s" r="3.5" fill="currentColor" style="--fg: 1;"/>`, ff(xp(n-1)), ff(yp(last.Val)))
	b.WriteString(label(xp(n-1)+7, yp(last.Val)-8, mr-10, 16, "start", Kfmt(last.Val)))
	stride := n/6 + 1
	drawn := ""
	for i, p := range pts {
		if i%stride == 0 && p.Label != drawn {
			b.WriteString(label(xp(i)-40, H-16, 80, 14, "center", esc(p.Label)))
			drawn = p.Label
		}
	}
	b.WriteString(`</svg>`)
	return b.String()
}

// HBars — horizontal bars with the value's word at the end of each.
func HBars(bars []Bar, aria string) string {
	n := len(bars)
	if n == 0 {
		return ""
	}
	const W = 460.0
	const ml, mr, mt, mb = 150.0, 56.0, 8.0, 8.0
	const rowH = 28.0
	H := mt + mb + float64(n)*rowH
	pw := W - ml - mr
	var b strings.Builder
	b.WriteString(open(W, H, aria))
	fmt.Fprintf(&b, `<line x1="%g" y1="%g" x2="%g" y2="%g" stroke="currentColor" style="--fg: -0.4;" stroke-width="1"/>`, ml, mt, ml, mt+float64(n)*rowH)
	for i, r := range bars {
		top := mt + float64(i)*rowH
		mid := top + rowH/2
		pct := math.Max(0, math.Min(100, float64(r.Pct)))
		bw := math.Max(2, pw*pct/100)
		fmt.Fprintf(&b, `<rect x="%g" y="%g" width="%g" height="%g" rx="2" fill="currentColor" style="--fg: 1;"><title>%s: %s</title></rect>`, ml, top+6, bw, rowH-12, esc(r.Label), esc(r.ValueLabel))
		b.WriteString(label(0, mid-8, ml-8, 16, "end", esc(r.Label)))
		b.WriteString(label(ml+bw+6, mid-8, mr-10, 16, "start", esc(r.ValueLabel)))
	}
	b.WriteString(`</svg>`)
	return b.String()
}

// Sparkline — a stat tile's trace: no axes, no labels, the shape alone.
func Sparkline(vals []float64, aria string) string {
	n := len(vals)
	if n < 2 {
		return ""
	}
	const w, h = 240.0, 60.0
	max := 0.0
	for _, v := range vals {
		max = math.Max(max, v)
	}
	if max == 0 {
		max = 1
	}
	var pts strings.Builder
	for i, v := range vals {
		pts.WriteString(ff(w*float64(i)/float64(n-1)) + "," + ff(h-(v/max)*(h-6)-3) + " ")
	}
	var b strings.Builder
	fmt.Fprintf(&b, `<svg viewBox="0 0 240 60" preserveAspectRatio="none" style="inline-size: 100%%; block-size: auto; display: block;" role="img" aria-label="%s">`, esc(aria))
	b.WriteString(`<polygon style="--fg: 0.85;" fill="currentColor" fill-opacity="0.12" points="0,60 ` + pts.String() + `240,60"/>`)
	b.WriteString(`<polyline style="--fg: 0.85;" fill="none" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke" stroke-linejoin="round" points="` + pts.String() + `"/></svg>`)
	return b.String()
}

package charts

import (
	"regexp"
	"strings"
	"testing"
)

// TestChartLaws — every builder paints with currentColor and the --fg
// knob only, types labels as foreignObject small, and names no colour,
// no font, no px.
func TestChartLaws(t *testing.T) {
	pts := []Point{{"Jan", 310}, {"Feb", 285}, {"Mar", 402}, {"Apr", 390}, {"May", 455}, {"Jun", 512}}
	out := map[string]string{
		"Columns":   Columns(pts, "a"),
		"Dots":      Dots(pts, "b"),
		"LineArea":  LineArea(pts, "c"),
		"HBars":     HBars([]Bar{{"Beer", "1.2k", 80}, {"Wine", "610", 40}}, "d"),
		"Sparkline": Sparkline([]float64{3, 5, 4, 8, 6}, "e"),
	}
	hex := regexp.MustCompile(`#[0-9a-fA-F]{3,8}\b|\brgb\(|\boklch\(|font-family|font-size|\d+px`)
	for name, svg := range out {
		if svg == "" {
			t.Errorf("%s: empty", name)
			continue
		}
		if hex.MatchString(svg) {
			t.Errorf("%s: a literal colour, font or pixel: %s", name, hex.FindString(svg))
		}
		if strings.Contains(svg, "<text") {
			t.Errorf("%s: an SVG <text> — labels are foreignObject small the engine types", name)
		}
		if !strings.Contains(svg, "currentColor") {
			t.Errorf("%s: no currentColor", name)
		}
	}
	if Kfmt(1234) != "1.2k" || Kfmt(2500000) != "2.5M" || Kfmt(950) != "950" {
		t.Error("Kfmt")
	}
}

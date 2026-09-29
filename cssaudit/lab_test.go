package cssaudit

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// Two things the law does not count: the inside of an <svg> (a drawing IS
// geometry — the chart builders emit it from Go) and the seed-hide
// (data-show false at land carries an inline display:none, the FOUC
// ledger's floor).
var (
	svgBlock = regexp.MustCompile(`(?s)<svg\b.*?</svg>`)
	seedHide = regexp.MustCompile(`(?s)(<[a-z][^>]*\bdata-show=[^>]*)style="display: none;"`)
)

// TestLabAtZero — the lab is the dictionary, so it obeys the laws it
// teaches: no inline geometry (knobs and anchor plumbing only) and every
// --gap on the ladder, in every specimen.
func TestLabAtZero(t *testing.T) {
	files, _ := filepath.Glob(filepath.Join("..", "site", "lab", "*.html"))
	if len(files) < 20 {
		t.Fatalf("only %d specimens found", len(files))
	}
	for _, f := range files {
		b, _ := os.ReadFile(f)
		src := seedHide.ReplaceAllString(svgBlock.ReplaceAllString(string(b), ""), "$1")
		if n := InlineGeometry(src); n != 0 {
			t.Errorf("%s: %d style attributes carry geometry", filepath.Base(f), n)
		}
		if n := OffLadderGaps(src); n != 0 {
			t.Errorf("%s: %d --gap values off the ladder", filepath.Base(f), n)
		}
		if strings.Contains(src, "!important") {
			t.Errorf("%s: !important", filepath.Base(f))
		}
	}
}

package systemcss

import (
	"io/fs"
	"regexp"
	"strings"
	"testing"
)

// TestEngineLaws pins the cascade constitution on the file itself: one
// spine of twelve layers named in order, no !important outside a print
// block, no literal colour, no ID selector.
func TestEngineLaws(t *testing.T) {
	b, err := fs.ReadFile(Static(), "mike.css")
	if err != nil {
		t.Fatal(err)
	}
	css := string(b)
	spine := strings.Join(strings.Fields(regexp.MustCompile(`(?s)/\*.*?\*/`).ReplaceAllString(css, "")), " ")
	if !strings.Contains(spine, "@layer reset, core.color, core.type, core.shell, core.shape, theme, base, composition, block, utility, exception, visibility;") {
		t.Error("the spine statement is missing or reordered")
	}
	if n := strings.Count(css, "@layer reset,"); n != 1 {
		t.Errorf("%d spine statements, want 1", n)
	}
	hex := regexp.MustCompile(`#[0-9a-fA-F]{3,8}\b`)
	code := regexp.MustCompile(`(?s)/\*.*?\*/`).ReplaceAllString(css, "") // comments are not colours
	for i, line := range strings.Split(code, "\n") {
		if strings.Contains(line, "url(") {
			continue
		}
		if hex.MatchString(line) {
			t.Errorf("line %d: a literal colour: %s", i+1, strings.TrimSpace(line))
		}
	}
	// !important only inside a print block (law 2: an important declaration
	// inverts the layer order and would beat the gates; paper has no gates)
	depth, inPrint := 0, false
	blanked := regexp.MustCompile(`(?s)/\*.*?\*/`).ReplaceAllStringFunc(css, func(c string) string { return strings.Repeat("\n", strings.Count(c, "\n")) }) // comments are not declarations; the lines keep their numbers
	for i, line := range strings.Split(blanked, "\n") {
		at := strings.Index(line, "@media print")
		if at >= 0 && !inPrint {
			inPrint, depth = true, 0
			line = line[at:]
		}
		if strings.Contains(line, "!important") && !inPrint {
			t.Errorf("line %d: !important outside a print block", i+1)
		}
		if inPrint {
			depth += strings.Count(line, "{") - strings.Count(line, "}")
			if depth <= 0 {
				inPrint = false
			}
		}
	}
	// colour and shape apart: an explicit corners choice is declared after the skins
	if strings.LastIndex(css, `[data-ui-radius="3"]`) < strings.Index(css, `[data-ui-skin="material"]`) {
		t.Error("the corners choice does not outrank the skins (declare [data-ui-radius] after the skin blocks)")
	}
	if strings.Contains(css, "::highlight(") {
		t.Error("syntax highlighting belongs in static/highlight.css, not the engine every page loads")
	}
	hl, err := fs.ReadFile(Static(), "highlight.css")
	if err != nil {
		t.Fatal("static/highlight.css missing")
	}
	for _, line := range strings.Split(string(hl), "\n") {
		if strings.Contains(line, "color:") && !strings.Contains(line, "var(--cfg-dark)") {
			t.Errorf("highlight.css: a token colour not derived from the engine's signals: %s", strings.TrimSpace(line))
		}
	}
	if strings.Contains(css, "#") && regexp.MustCompile(`(?m)^\s*#[a-zA-Z]`).MatchString(css) {
		t.Error("an ID selector")
	}
}

// TestEmbed pins what the module ships.
func TestEmbed(t *testing.T) {
	for _, p := range []string{"mike.css", "rocket/hold-confirm.js", "rocket/date-picker.js"} {
		if _, err := fs.Stat(Static(), p); err != nil {
			t.Errorf("static: %s missing", p)
		}
	}
	for _, p := range []string{"primitives.html", "forms.html", "rocket-hold-confirm.html"} {
		if _, err := fs.Stat(Lab(), p); err != nil {
			t.Errorf("lab: %s missing", p)
		}
	}
	if b, _ := fs.ReadFile(Static(), "datastar.js"); !strings.Contains(string(b), "Rocket") || strings.Contains(string(b), "Datastar Pro") {
		t.Error("static/datastar.js is not the free bundle with Rocket")
	}
	for _, s := range []string{"system-css", "datastar-components", "land-and-stream", "svg-charts"} {
		if _, err := fs.Stat(Skills(), s+"/SKILL.md"); err != nil {
			t.Errorf("skill %s missing", s)
		}
	}
}

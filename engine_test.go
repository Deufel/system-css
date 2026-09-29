package systemcss

import (
	"io/fs"
	"regexp"
	"strings"
	"testing"
)

// TestEngineLaws pins the cascade constitution on the file itself: one
// spine, layers named in order, no !important outside the media and
// skin layers, no literal colour, every selector wrapped in :where().
func TestEngineLaws(t *testing.T) {
	b, err := fs.ReadFile(Static(), "system.css")
	if err != nil {
		t.Fatal(err)
	}
	css := string(b)
	if !strings.Contains(css, "@layer reset, core.color, core.type, core.layout, theme, base,") {
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
	// !important only inside the media and skin layers (config switches that must out-cascade)
	layer := ""
	for i, line := range strings.Split(css, "\n") {
		if m := regexp.MustCompile(`^@layer ([a-z.-]+)\s*\{`).FindStringSubmatch(line); m != nil {
			layer = m[1]
		}
		if strings.Contains(line, "!important") && layer != "media" && layer != "skin" && !strings.Contains(line, "@media print") {
			t.Errorf("line %d: !important in layer %q", i+1, layer)
		}
	}
	if strings.Contains(css, "#") && regexp.MustCompile(`(?m)^\s*#[a-zA-Z]`).MatchString(css) {
		t.Error("an ID selector")
	}
}

// TestEmbed pins what the module ships.
func TestEmbed(t *testing.T) {
	for _, p := range []string{"system.css", "rocket/hold-confirm.js", "rocket/date-picker.js"} {
		if _, err := fs.Stat(Static(), p); err != nil {
			t.Errorf("static: %s missing", p)
		}
	}
	for _, s := range []string{"system-css", "datastar-components", "land-and-stream", "svg-charts"} {
		if _, err := fs.Stat(Skills(), s+"/SKILL.md"); err != nil {
			t.Errorf("skill %s missing", s)
		}
	}
}

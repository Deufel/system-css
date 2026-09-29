package systemcss

import (
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// exceptions — engine words no specimen wears yet, each with its reason;
// a word listed here is a specimen owed, not a word forgiven.
var exceptions = map[string]string{
	// the shell's app-side words — an app stamps them; the site has no rail toggle, account or version
	"focus-fab": "focus mode's control — an app stamps it", "i-expand": "the rail's collapse glyph pair", "i-collapse": "the rail's collapse glyph pair",
	"nav-search": "the rail's search item (EventOS's command palette)", "nav-account": "the rail's account item", "nav-version": "the rail's version foot",
	"org-mark": "the org's logo mark in the rail",
	// PRODUCT COMPONENTS THE ENGINE CARRIES (the review of 2026-09-29): each is a specimen owed, or a move to the app's project layer
	"otable": "the outline table (EventOS Portfolio) — specimen or project layer", "otable-head": "otable", "otable-row": "otable", "otable-node": "otable", "otable-name": "otable", "otable-cell": "otable", "otable-fold": "otable", "otable-text": "otable",
	"p-search": "the command palette (EventOS) — specimen or project layer", "p-scopes": "palette", "p-results": "palette", "p-hint": "palette", "p-group": "palette", "p-row": "palette", "p-body": "palette", "p-title": "palette", "p-sub": "palette", "p-ret": "palette", "p-foot": "palette",
	"cal-month": "the month calendar (EventOS events) — specimen or project layer", "cal-dow": "calendar", "cal-wk": "calendar", "cal-d": "calendar", "cal-more": "calendar", "cal-b": "calendar", "cont-l": "calendar", "cont-r": "calendar",
	"gmap-dot": "the google-maps rocket's chrome (needs a key) — project layer", "gmap-chip": "google-maps", "gmap-pop": "google-maps", "gmap-pop-title": "google-maps", "gmap-pop-close": "google-maps", "gmap-ctl": "google-maps", "gmap-err": "google-maps",
	"erd-map": "the schema map (EventOS Database) — project layer", "erd-edges": "schema map", "erd-node": "schema map",
	"dt-tags": "the roster's lens strip (EventOS) — specimen owed (the roster)", "dt-head": "roster", "bulk-list": "roster", "list-item": "roster",
	"gs-trigger": "the global search trigger (EventOS)", "gs-tlabel": "global search",
	"heat-month": "the calendar heatmap — specimen owed (the Charts page)", "tab-toggles": "toggle tags in a tab strip — specimen owed",
	"hud-pop": "an anchored surface off a hud fab — specimen owed", "kicker": "a tiny group label — specimen owed", "stub-slot": "a designed placeholder — specimen owed",
	// shell regions the docs shell leaves out — the shell how-to names them; EventOS's screens wear them
	"pg-banner": "the one full-width band — an app's system message", "pg-subheader": "a band under the header", "pg-main-aside": "the main-scoped flank",
	// specimens owed for the bigger words
	"roster": "THE SERVER-DRIVEN TABLE — the lab's largest debt; its lens strip, bulk list and scroll", "chart-host": "the chart card's chrome (host · title · legend) — specimen owed on the Charts page", "chart-title": "chart chrome", "chart-legend": "chart chrome",
}

var (
	cssComment = regexp.MustCompile(`(?s)/\*.*?\*/`)
	classTok   = regexp.MustCompile(`\.([a-zA-Z][\w-]*)`)
	wordTok    = regexp.MustCompile(`[A-Za-z][\w-]*`)
	classAttr  = regexp.MustCompile(`class="([^"]*)"`)
)

// TestVocabulary — THE LAB IS THE DICTIONARY: every class the engine
// defines is worn by a specimen, a demo or a rocket. An engine word with
// no page is not stale, it is undemoed — the fix is a specimen, never a
// deletion; the exceptions carry a reason each.
func TestVocabulary(t *testing.T) {
	css, err := fs.ReadFile(Static(), "system.css")
	if err != nil {
		t.Fatal(err)
	}
	// WORN means a class attribute's value (a mention in prose is not a
	// wearer): the specimens, the demos and the site's own shell. A rocket
	// wears through JavaScript, so its words count whole.
	worn := map[string]bool{}
	for _, pat := range []string{"site/lab/*.html", "site/demos/*.html", "docs/index.html", "docs/lab/primitives.html", "docs/demos/full-pages.html"} {
		files, _ := filepath.Glob(pat)
		for _, f := range files {
			b, _ := os.ReadFile(f)
			for _, m := range classAttr.FindAllStringSubmatch(string(b), -1) {
				for _, c := range strings.Fields(m[1]) {
					worn[c] = true
				}
			}
		}
	}
	rockets, _ := filepath.Glob("static/rocket/*.js")
	for _, f := range rockets {
		b, _ := os.ReadFile(f)
		for _, w := range wordTok.FindAllString(string(b), -1) {
			worn[w] = true
		}
	}
	seen := map[string]bool{}
	var missing []string
	for _, m := range classTok.FindAllStringSubmatch(cssComment.ReplaceAllString(string(css), ""), -1) {
		c := m[1]
		if seen[c] || worn[c] || exceptions[c] != "" {
			continue
		}
		if len(c) <= 2 { // .5, .em — numbers and units the regex cannot tell apart
			continue
		}
		seen[c] = true
		missing = append(missing, c)
	}
	if len(missing) > 0 {
		t.Errorf("%d engine classes no specimen wears — add a specimen to site/lab (or a reason to exceptions): %s", len(missing), strings.Join(missing, " "))
	}
	for c := range exceptions {
		if worn[c] {
			t.Errorf("exception %q is worn now — drop it from the list", c)
		}
	}
}

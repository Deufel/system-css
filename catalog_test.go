package systemcss

import (
	"strings"
	"testing"
)

// TestUtilitiesCatalog — the utility layer reads whole: every rule has a
// selector and declarations, the words the engine documents are found,
// a nested print block keeps its prefix, and no rule from another layer
// leaks in.
func TestUtilitiesCatalog(t *testing.T) {
	us, err := Utilities()
	if err != nil {
		t.Fatal(err)
	}
	if len(us) < 30 {
		t.Fatalf("only %d utility rules — the layer parser lost blocks", len(us))
	}
	byWord := map[string]Utility{}
	for _, u := range us {
		if u.Selector == "" || u.Rule == "" {
			t.Errorf("line %d: an empty selector or rule: %+v", u.Line, u)
		}
		for _, w := range u.Words {
			byWord[w] = u
		}
	}
	for _, w := range []string{"measure", "fill", "grow", "truncate", "glass", "suc", "oneline", "scroll-x", "np", "active"} {
		if _, ok := byWord[w]; !ok {
			t.Errorf(".%s is not in the catalog", w)
		}
	}
	if u := byWord["np"]; !strings.HasPrefix(u.Selector, "@media print") {
		t.Errorf(".np should carry its media prefix, got %q", u.Selector)
	}
	if u := byWord["measure"]; !strings.Contains(u.Note, "RUNG") || !strings.Contains(u.Rule, "40ch") {
		t.Errorf("the measure's note and rule should be its own: %+v", u)
	}
	if _, ok := byWord["card"]; ok && byWord["card"].Selector == ":where(.card)" {
		t.Error("the components layer leaked into the catalog")
	}
	if w := Wearers(); len(w["measure"]) == 0 || len(w["grow"]) == 0 {
		t.Errorf("the lab wears .measure and .grow; wearers: %d words", len(w))
	}
}

func TestSubjectWords(t *testing.T) {
	for sel, want := range map[string]string{
		":where(.hud) > :where(.br)": "br",
		":where(.page:has(> .hud.mobile)) ~ :where(.hud) > :where(.br.toasts)": "br toasts",
		":where(.row, .column) > :where(hr)":                                   "",
		":where(.suc)":                                                         "suc",
		":where(.menu) > :where(button, a):hover":                              "",
		":where(.a), :where(.b) :where(.c)":                                    "a c",
	} {
		if got := strings.Join(classWords(sel), " "); got != want {
			t.Errorf("%s → %q, want %q", sel, got, want)
		}
	}
}

func TestParseUtilitiesBond(t *testing.T) {
	css := "@layer utility {\n  /* a note */\n  :where(.a) { x: 1; }\n\n  /* orphan */\n\n  :where(.b) { y: 2; /* inner */ }\n  @media print { :where(.c) { display: none !important; } }\n}\n@layer components { :where(.d) { z: 3 } }\n"
	us := parseUtilities(css)
	if len(us) != 3 {
		t.Fatalf("want 3 rules, got %d: %+v", len(us), us)
	}
	if us[0].Note != "a note" || us[1].Note != "" || us[1].Rule != "y: 2;" || us[2].Selector != "@media print :where(.c)" {
		t.Errorf("%+v", us)
	}
}

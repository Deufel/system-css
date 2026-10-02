package systemcss

import (
	"io/fs"
	"regexp"
	"strings"
	"testing"
)

// TestMailEdition — THE MICRO EDITION's law: literal CSS a mail client
// keeps. No custom properties, no oklch, no layers, no scopes, no :where;
// every selector scoped under .mail; the dark scheme present.
func TestMailEdition(t *testing.T) {
	b, err := fs.ReadFile(Static(), "mail.css")
	if err != nil {
		t.Fatal(err)
	}
	css := regexp.MustCompile(`(?s)/\*.*?\*/`).ReplaceAllString(string(b), "")
	for _, bad := range []string{"var(", "oklch(", "@layer", "@scope", ":where(", "@container", "--"} {
		if strings.Contains(css, bad) {
			t.Errorf("mail.css carries %q — a mail client strips it", bad)
		}
	}
	// every rule's selector list: the text before its "{" once the media
	// wrappers are peeled (a rule's declarations may span lines)
	flat := regexp.MustCompile(`@media[^{]*\{`).ReplaceAllString(css, "")
	for _, block := range strings.Split(flat, "}") {
		sel, _, ok := strings.Cut(block, "{")
		if !ok {
			continue
		}
		for _, one := range strings.Split(sel, ",") {
			if s := strings.TrimSpace(one); s != "" && !strings.HasPrefix(s, ".mail") {
				t.Errorf("selector %q is not scoped under .mail", s)
			}
		}
	}
	if !strings.Contains(css, "prefers-color-scheme: dark") {
		t.Error("the dark scheme is missing")
	}
}

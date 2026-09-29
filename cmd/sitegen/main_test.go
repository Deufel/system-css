package main

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// TestSiteLinks — every relative href and src in the generated site
// resolves to a file (run `go run ./cmd/sitegen` first; the docs are
// committed, so the test reads them as they will be served).
func TestSiteLinks(t *testing.T) {
	root := filepath.Join("..", "..", "docs")
	if _, err := os.Stat(filepath.Join(root, "index.html")); err != nil {
		t.Skip("docs/ not generated")
	}
	ref := regexp.MustCompile(`(?:href|src)="([^"#]+)`)
	pages, missing := 0, 0
	_ = filepath.WalkDir(root, func(p string, d os.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.HasSuffix(p, ".html") {
			return err
		}
		pages++
		b, _ := os.ReadFile(p)
		for _, m := range ref.FindAllStringSubmatch(string(b), -1) {
			u := m[1]
			if strings.HasPrefix(u, "http") || strings.HasPrefix(u, "mailto:") || strings.HasPrefix(u, "data:") || strings.HasPrefix(u, "tel:") || strings.HasPrefix(u, "/") {
				continue
			}
			u = strings.SplitN(u, "?", 2)[0]
			if _, err := os.Stat(filepath.Join(filepath.Dir(p), u)); err != nil {
				missing++
				if missing <= 20 {
					t.Errorf("%s → %s: missing", strings.TrimPrefix(p, root+"/"), u)
				}
			}
		}
		return nil
	})
	if pages < 60 {
		t.Errorf("only %d pages generated", pages)
	}
}

package systemcss

import (
	"io/fs"
	"regexp"
	"sort"
	"strings"
)

// Utility — one rule of the engine's utility layer: the words it defines
// (the class tokens of its selector), the selector as written, its
// declarations on one line, and the comment that stood above it.
type Utility struct {
	Words    []string
	Selector string
	Rule     string
	Note     string
	Line     int // where the rule starts in system.css
}

// Utilities — THE CATALOG of the utility layer, read from the engine
// itself: every rule inside an `@layer utility { … }` block, in file
// order, with the comment above it as its note. A nested at-rule (a
// print media block) is walked and its name prefixed to the selector.
func Utilities() ([]Utility, error) {
	css, err := fs.ReadFile(Static(), "mike.css")
	if err != nil {
		return nil, err
	}
	return parseUtilities(string(css)), nil
}

var utilityLayer = regexp.MustCompile(`@layer utility \{`)

func parseUtilities(css string) []Utility {
	var out []Utility
	for _, m := range utilityLayer.FindAllStringIndex(css, -1) {
		start := m[1]
		end := matchBrace(css, start-1)
		if end < 0 {
			continue
		}
		out = append(out, parseRules(css, start, end, "", lineAt(css, start))...)
	}
	return out
}

// parseRules — the rules of a block between two offsets: comments feed
// the next rule's note, a nested at-rule descends with its prefix.
func parseRules(css string, start, end int, prefix string, _ int) []Utility {
	var out []Utility
	i, note := start, ""
	for i < end {
		switch {
		case strings.HasPrefix(css[i:], "/*"):
			j := strings.Index(css[i:], "*/")
			if j < 0 {
				return out
			}
			note = collapse(css[i+2 : i+j])
			i += j + 2
		case css[i] == ' ' || css[i] == '\n' || css[i] == '\t' || css[i] == '\r':
			// a blank line between a comment and a rule breaks the bond
			if css[i] == '\n' && strings.HasPrefix(strings.TrimLeft(css[i+1:], " \t"), "\n") {
				note = ""
			}
			i++
		default:
			open := strings.IndexByte(css[i:], '{')
			if open < 0 || i+open >= end {
				return out
			}
			sel := collapse(css[i : i+open])
			close := matchBrace(css, i+open)
			if close < 0 {
				return out
			}
			body := css[i+open+1 : close]
			if strings.HasPrefix(sel, "@") {
				out = append(out, parseRules(css, i+open+1, close, strings.TrimSpace(prefix+" "+sel), 0)...)
			} else {
				out = append(out, Utility{
					Words: classWords(sel), Selector: strings.TrimSpace(prefix + " " + sel),
					Rule: collapse(stripComments(body)), Note: note, Line: lineAt(css, i),
				})
			}
			note = ""
			i = close + 1
		}
	}
	return out
}

// matchBrace — the index of the brace closing the one at open.
func matchBrace(s string, open int) int {
	depth := 0
	for i := open; i < len(s); i++ {
		switch s[i] {
		case '{':
			depth++
		case '}':
			depth--
			if depth == 0 {
				return i
			}
		case '/':
			if strings.HasPrefix(s[i:], "/*") {
				if j := strings.Index(s[i:], "*/"); j > 0 {
					i += j + 1
				}
			}
		}
	}
	return -1
}

var (
	blockComment = regexp.MustCompile(`(?s)/\*.*?\*/`)
	spaces       = regexp.MustCompile(`\s+`)
	classWord    = regexp.MustCompile(`\.([a-zA-Z][\w-]*)`)
)

func stripComments(s string) string { return blockComment.ReplaceAllString(s, "") }
func collapse(s string) string      { return strings.TrimSpace(spaces.ReplaceAllString(s, " ")) }

// classWords — the words a selector DEFINES: the class tokens of each
// selector's subject (its last compound — `.hud > .br` defines .br, a
// `:has()` or `:where()` guard names a context, not a word), distinct,
// in order.
func classWords(sel string) []string {
	seen := map[string]bool{}
	var out []string
	for _, one := range splitTop(sel, ',') {
		parts := splitTop(one, ' ', '>', '~', '+')
		if len(parts) == 0 {
			continue
		}
		for _, m := range classWord.FindAllStringSubmatch(parts[len(parts)-1], -1) {
			if !seen[m[1]] {
				seen[m[1]] = true
				out = append(out, m[1])
			}
		}
	}
	return out
}

// splitTop — a selector split on any of the separators at paren depth 0,
// empty pieces dropped.
func splitTop(s string, seps ...byte) []string {
	var out []string
	depth, start := 0, 0
	flush := func(end int) {
		if p := strings.TrimSpace(s[start:end]); p != "" {
			out = append(out, p)
		}
	}
	for i := 0; i < len(s); i++ {
		switch c := s[i]; {
		case c == '(':
			depth++
		case c == ')':
			depth--
		case depth == 0 && strings.IndexByte(string(seps), c) >= 0:
			flush(i)
			start = i + 1
		}
	}
	flush(len(s))
	return out
}

func lineAt(s string, off int) int { return strings.Count(s[:off], "\n") + 1 }

// Wearers — which lab pages wear a word (a class attribute's value, as
// the vocabulary test counts it): word → sorted page keys.
func Wearers() map[string][]string {
	attr := regexp.MustCompile(`class="([^"]*)"`)
	by := map[string]map[string]bool{}
	entries, _ := fs.ReadDir(Lab(), ".")
	for _, e := range entries {
		key := strings.TrimSuffix(e.Name(), ".html")
		b, err := fs.ReadFile(Lab(), e.Name())
		if err != nil {
			continue
		}
		for _, m := range attr.FindAllStringSubmatch(string(b), -1) {
			for _, c := range strings.Fields(m[1]) {
				if by[c] == nil {
					by[c] = map[string]bool{}
				}
				by[c][key] = true
			}
		}
	}
	out := map[string][]string{}
	for c, pages := range by {
		for p := range pages {
			out[c] = append(out[c], p)
		}
		sort.Strings(out[c])
	}
	return out
}

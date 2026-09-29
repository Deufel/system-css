// Package cssaudit — the engine's COUNTERS: what a template may carry in
// a style attribute (knobs and anchor plumbing, never geometry), which --gap
// values are on the ladder, and whether project CSS reaches into engine
// anatomy. One implementation for every project on the engine and for the
// lab itself (the lab is held at zero).
package cssaudit

import (
	"regexp"
	"strings"
)

// geomRe matches geometry-carrying declarations. (?:^|[^-]) keeps custom-
// property KNOBS out of the count: --gap/--measure/--grid-min are the style
// API, not inline geometry. (Go's RE2 has no lookbehind; the group stands in.)
var geomRe = regexp.MustCompile(`(?:^|[^-])\b(display|gap|padding|margin|flex|inline-size|block-size|min-inline-size|max-inline-size|min-block-size|max-block-size|border|position|inset|align-items|align-self|justify-content|justify-self|overflow|text-align|translate|border-radius|width|height|top|left|right|bottom|grid-template|grid-column|grid-row|aspect-ratio|white-space|text-decoration|font-weight|line-height|letter-spacing|cursor|z-index|object-fit|place-items)\s*:`)

var anchorOnlyRe = regexp.MustCompile(`^\s*(anchor-name|position-anchor)\s*:[^;]*;?\s*$`)

var styleAttrRe = regexp.MustCompile(`style="([^"]*)"|style=\{[^}]*"([^"]*)"`)

// InlineGeometry counts style= attributes in templ source that carry
// geometry (anchor-only styles exempt).
func InlineGeometry(src string) int {
	n := 0
	for _, m := range styleAttrRe.FindAllStringSubmatch(src, -1) {
		body := m[1]
		if body == "" {
			body = m[2]
		}
		if anchorOnlyRe.MatchString(body) {
			continue
		}
		if geomRe.MatchString(body) {
			n++
		}
	}
	return n
}

// the ladder's rungs (system.css, the composition primitives block):
// 0 · 0.25lh · 0.5lh · 1lh for block rhythm, 0.25em · 0.5em · 1em for
// inline rows.
var gapRe = regexp.MustCompile(`--gap:\s*([0-9.]+(?:lh|em)?)`)

var gapLadder = map[string]bool{"0": true, "0.25lh": true, "0.5lh": true, "1lh": true, "0.25em": true, "0.5em": true, "1em": true}

// the measure ladder (2026-09-29): --measure is a rung — 1 a column · 2
// reading · 3 working — never a length.
var measureRe = regexp.MustCompile(`--measure:\s*([^;"}]+)`)

var measureLadder = map[string]bool{"1": true, "2": true, "3": true}

// OffLadderMeasures counts --measure values that are not a rung.
func OffLadderMeasures(src string) int {
	n := 0
	for _, m := range measureRe.FindAllStringSubmatch(src, -1) {
		if !measureLadder[strings.TrimSpace(m[1])] {
			n++
		}
	}
	return n
}

// OffLadderGaps counts --gap values off the ladder in templ source.
func OffLadderGaps(src string) int {
	n := 0
	for _, m := range gapRe.FindAllStringSubmatch(src, -1) {
		if !gapLadder[m[1]] {
			n++
		}
	}
	return n
}

// anatomyRe — engine anatomy a project rule must not reach into.
var anatomyRe = regexp.MustCompile(`\.(nav-item|nav-icon|menu|modal|toast|badge|search-box)\b|\bthead\b|\btbody\b`)

// AnatomyReach counts anatomy reaches inside the PRODUCT COMPONENTS block
// of system.css; -1 when the block is not found.
func AnatomyReach(systemCSS string) int {
	i := strings.Index(systemCSS, "PRODUCT COMPONENTS")
	if i < 0 {
		return -1
	}
	k := strings.Index(systemCSS[i:], "@layer components {")
	if k < 0 {
		return -1
	}
	i += k
	depth, j := 0, i
	for ; j < len(systemCSS); j++ {
		if systemCSS[j] == '{' {
			depth++
		} else if systemCSS[j] == '}' {
			depth--
			if depth == 0 {
				break
			}
		}
	}
	if j >= len(systemCSS) {
		j = len(systemCSS) - 1
	}
	return len(anatomyRe.FindAllString(systemCSS[i:j+1], -1))
}

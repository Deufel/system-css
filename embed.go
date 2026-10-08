// Package systemcss ships the engine as a Go module: the stylesheet, the
// rockets and the four skills, embedded, so a project serves them from
// its own origin at a pinned version — "statics are the only cache", the
// FOUC ledger's versioning intact — and copies the skills into its
// .claude/skills verbatim (a test in the project keeps the copies equal).
// static/datastar.js is the FREE Datastar bundle with Rocket (v1.0.4 —
// Rocket left Pro that release); a project that licenses Pro keeps its
// own bundle at the same path and skips this file when it syncs. The
// rockets import `../datastar.js`, so either bundle is the one runtime.
// The same files reach the browser from a CDN at a tag:
//
//	https://cdn.jsdelivr.net/gh/Deufel/system-css@v1.0.0/static/mike.css
package systemcss

import (
	"embed"
	"io/fs"
)

//go:embed static all:.claude/skills site/lab
var files embed.FS

// Static — the engine and the rockets: system.css, rocket/*.js.
func Static() fs.FS {
	sub, _ := fs.Sub(files, "static")
	return sub
}

// Lab — THE LAB: every specimen of the engine as an HTML fragment
// (site/lab/*.html), the dictionary of its vocabulary; a project's stale
// sweep reads it to know which engine words are demonstrated.
func Lab() fs.FS {
	sub, _ := fs.Sub(files, "site/lab")
	return sub
}

// Skills — the four skills: <name>/SKILL.md and their references.
func Skills() fs.FS {
	sub, _ := fs.Sub(files, ".claude/skills")
	return sub
}

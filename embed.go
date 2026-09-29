// Package systemcss ships the engine as a Go module: the stylesheet, the
// rockets and the four skills, embedded, so a project serves them from
// its own origin at a pinned version — "statics are the only cache", the
// FOUC ledger's versioning intact — and copies the skills into its
// .claude/skills verbatim (a test in the project keeps the copies equal).
// The same files reach the browser from a CDN at a tag:
//
//	https://cdn.jsdelivr.net/gh/Deufel/system-css@v0.1.0/static/system.css
package systemcss

import (
	"embed"
	"io/fs"
)

//go:embed static all:.claude/skills
var files embed.FS

// Static — the engine and the rockets: system.css, rocket/*.js.
func Static() fs.FS {
	sub, _ := fs.Sub(files, "static")
	return sub
}

// Skills — the four skills: <name>/SKILL.md and their references.
func Skills() fs.FS {
	sub, _ := fs.Sub(files, ".claude/skills")
	return sub
}

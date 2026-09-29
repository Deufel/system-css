// sitegen — the docs site, generated (gf-437). Inputs: site/pages/**/*.md
// (how-to pages with a front matter), .claude/skills/*/SKILL.md (each
// split by its ## headings into a section of pages, and copied raw for
// agents), site/lab/*.html (the UI lab's specimens, exported from EventOS
// by cmd/labexport), static/ (the engine and the rockets, copied under
// docs/static). Output: docs/, the GitHub Pages root. Every link is
// relative, so the site works at any path. Navigation is the browser's:
// every page is a real page; Datastar carries only the page's own state
// (the theme).
//
//	go run ./cmd/sitegen
package main

import (
	"bytes"
	"fmt"
	htmlesc "html"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	mdhtml "github.com/yuin/goldmark/renderer/html"
)

const (
	outDir = "docs"
	cdn    = "https://cdn.jsdelivr.net/gh/starfederation/datastar@1.0.0/bundles/datastar.js"
)

// page is one output document.
type page struct {
	Section, Tab, Slug, Title, Summary string
	Order                              int
	Body                               string // rendered HTML
	Raw                                bool   // a lab fragment: not markdown, no measure
}

// tab is one VIEW of a section (n2) — few, never a table of contents.
type tab struct{ Key, Label string }

// section is one rail item; its pages are the tabs.
type section struct {
	Key, Label, Icon string
	Tabs             []tab
	Pages            []*page
}

var sections = []*section{
	{Key: "", Label: "Home", Icon: "sparkles"},
	{Key: "howto", Label: "How-to", Icon: "pencil"},
	{Key: "engine", Label: "Engine", Icon: "palette"},
	{Key: "components", Label: "Components", Icon: "boxes"},
	{Key: "stream", Label: "Land & stream", Icon: "boxes"},
	{Key: "charts", Label: "Charts", Icon: "palette"},
	{Key: "lab", Label: "Lab", Icon: "sparkles", Tabs: []tab{{"engine", "Engine"}, {"rockets", "Rockets"}}},
	{Key: "skills", Label: "Skills", Icon: "pencil"},
}

// skillSections — a skill file becomes a section, split by its ## headings.
var skillSections = []struct{ skill, section string }{
	{"system-css", "engine"}, {"datastar-components", "components"}, {"land-and-stream", "stream"}, {"svg-charts", "charts"},
}

// labLabels — the lab's page labels in the rail's order (the rockets follow).
var labLabels = []struct{ key, label string }{
	{"primitives", "Primitives"}, {"compositions", "Compositions"}, {"color", "Color"}, {"type", "Type"}, {"icons", "Icons"},
	{"state", "State"}, {"aria", "ARIA"}, {"forms", "Forms"}, {"charts", "Charts"},
}

// liveRockets — the rockets that run on core Datastar; the rest import
// the Pro runtime's rocket module and are shown as code.
var liveRockets = []string{"hold-confirm", "command-palette", "image-input", "exif"}

// need — what a rocket requires beyond the engine: the Datastar PRO
// rocket module, a paid or permissioned API, another file, a server
// endpoint the page must answer; and whether the library ships it.
type need struct {
	Pro     bool
	API     string // a key, a billing account, a permission
	Deps    string // other files or browser capabilities
	Server  string // what the page's server must answer
	Shipped bool   // in this repository (else it lives in the app)
}

// rocketNeeds — read off each file's header and imports; the bench page
// and the How-to table both render it.
var rocketNeeds = map[string]need{
	"hold-confirm":       {Shipped: true},
	"command-palette":    {Shipped: true, Server: "a search endpoint the palette's input posts to"},
	"exif":               {Shipped: true, Deps: "none — a dependency-free EXIF reader"},
	"image-input":        {Shipped: true, Deps: "exif.js; may read the device's position (Geolocation, a permission)"},
	"copy-button":        {Shipped: true, Pro: true, Deps: "the Clipboard API (a secure context)"},
	"date-picker":        {Shipped: true, Pro: true},
	"day-picker":         {Shipped: true, Pro: true},
	"combo-box":          {Shipped: true, Pro: true, Server: "an endpoint that morphs the listbox as the input's signal posts"},
	"group-pick":         {Shipped: true, Pro: true, Server: "the pick-or-make verbs (list · create · delete)"},
	"mini-calc":          {Shipped: true, Pro: true},
	"toast-card":         {Shipped: true, Pro: true},
	"google-maps":        {Pro: true, API: "Google Maps JavaScript API — a key, billed"},
	"mini-map":           {Pro: true, API: "Google Static Maps API — a key, billed"},
	"activation-tracker": {Deps: "the device's Geolocation API (a permission)", Server: "the check-in and check-out verbs"},
	"bug-report":         {Pro: true, Server: "the feedback lane (the app's, not the library's)"},
	"element-pick":       {Server: "the feedback lane (the app's, not the library's)"},
}

// needsCard — the requirements as a card at the top of a bench page.
func needsCard(key string) string {
	n, ok := rocketNeeds[key]
	if !ok {
		return ""
	}
	row := func(k, v string) string {
		return `<span class="spread"><span style="--fg: -0.55;">` + k + `</span><span>` + v + `</span></span>`
	}
	var sb strings.Builder
	sb.WriteString(`<div class="card column" style="--gap: 0.25lh; --type: -1;"><strong>Requires</strong>`)
	if n.Pro {
		sb.WriteString(row("Runtime", `Datastar <b>Pro</b> — imports its <code>rocket</code> module from <code>/static/datastar.js</code>`))
	} else {
		sb.WriteString(row("Runtime", "Datastar core (the free build)"))
	}
	if n.API != "" {
		sb.WriteString(row("API", n.API))
	}
	if n.Deps != "" {
		sb.WriteString(row("Depends on", n.Deps))
	}
	if n.Server != "" {
		sb.WriteString(row("Server", n.Server))
	}
	if n.Shipped {
		sb.WriteString(row("Shipped", "in this repository, <code>static/rocket/"+key+".js</code>"))
	} else {
		sb.WriteString(row("Shipped", "no — an app component (EventOS); shown for the pattern"))
	}
	sb.WriteString(`</div>`)
	return sb.String()
}

// needsTable — every rocket's requirements, one row each, for the How-to.
func needsTable() string {
	keys := make([]string, 0, len(rocketNeeds))
	for k := range rocketNeeds {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	var sb strings.Builder
	sb.WriteString(`<div class="scroll-x"><table style="--type: -1;"><thead><tr><th>Rocket</th><th>Runtime</th><th>API</th><th>Depends on</th><th>Server</th><th>Shipped</th></tr></thead><tbody>`)
	for _, k := range keys {
		n := rocketNeeds[k]
		rt, sh := "core", "yes"
		if n.Pro {
			rt = "<b>Pro</b>"
		}
		if !n.Shipped {
			sh = "no (app)"
		}
		sb.WriteString(`<tr><td><code>` + k + `</code></td><td>` + rt + `</td><td>` + n.API + `</td><td>` + n.Deps + `</td><td>` + n.Server + `</td><td>` + sh + `</td></tr>`)
	}
	sb.WriteString(`</tbody></table></div>`)
	return sb.String()
}

var md = goldmark.New(
	goldmark.WithExtensions(extension.GFM),
	goldmark.WithParserOptions(parser.WithAutoHeadingID()),
	goldmark.WithRendererOptions(mdhtml.WithUnsafe()),
)

func main() {
	must(os.RemoveAll(outDir))
	must(os.MkdirAll(outDir, 0o755))
	must(copyTree("static", filepath.Join(outDir, "static")))
	must(copyTree(filepath.Join("site", "assets"), filepath.Join(outDir, "assets")))
	must(os.WriteFile(filepath.Join(outDir, ".nojekyll"), nil, 0o644))
	icons := loadIcons()

	bySection := map[string]*section{}
	for _, s := range sections {
		bySection[s.Key] = s
	}
	// how-to pages and the home page from site/pages
	must(filepath.WalkDir("site/pages", func(p string, d os.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.HasSuffix(p, ".md") {
			return err
		}
		pg := parsePage(p)
		if pg.Section == "howto" && pg.Slug == "rocket" {
			pg.Body = strings.Replace(pg.Body, "<!-- needs-table -->", needsTable(), 1)
		}
		if s, ok := bySection[pg.Section]; ok {
			s.Pages = append(s.Pages, pg)
		}
		return nil
	}))
	// the skills: split into sections, and copied raw
	for _, ss := range skillSections {
		src := filepath.Join(".claude", "skills", ss.skill, "SKILL.md")
		b, err := os.ReadFile(src)
		must(err)
		for i, pg := range splitSkill(string(b), ss.section) {
			pg.Order = i
			bySection[ss.section].Pages = append(bySection[ss.section].Pages, pg)
		}
		must(copyTree(filepath.Join(".claude", "skills", ss.skill), filepath.Join(outDir, "skills", ss.skill)))
		bySection["skills"].Pages = append(bySection["skills"].Pages, &page{
			Section: "skills", Slug: ss.skill, Title: ss.skill, Order: len(bySection["skills"].Pages),
			Body: render(string(b)),
		})
	}
	// the lab
	for i, l := range labLabels {
		if b, err := os.ReadFile(filepath.Join("site", "lab", l.key+".html")); err == nil {
			bySection["lab"].Pages = append(bySection["lab"].Pages, &page{Section: "lab", Tab: "engine", Slug: l.key, Title: l.label, Order: i, Body: string(b), Raw: true})
		}
	}
	rockets, _ := filepath.Glob("site/lab/rocket-*.html")
	sort.Strings(rockets)
	for i, f := range rockets {
		key := strings.TrimSuffix(strings.TrimPrefix(filepath.Base(f), "rocket-"), ".html")
		b, _ := os.ReadFile(f)
		body := string(b)
		if !contains(liveRockets, key) {
			body = `<div class="alert inf" role="note"><div>This bench needs what the card below names and the site does not load it: the markup is shown, the behaviour runs in an app that has it.</div></div>` + body
		}
		body = needsCard(key) + body
		bySection["lab"].Pages = append(bySection["lab"].Pages, &page{Section: "lab", Tab: "rockets", Slug: "rocket-" + key, Title: key, Order: 100 + i, Body: body, Raw: true})
	}
	for _, s := range sections {
		sort.SliceStable(s.Pages, func(i, j int) bool { return s.Pages[i].Order < s.Pages[j].Order })
	}
	// write
	n := 0
	for _, s := range sections {
		for _, pg := range s.Pages {
			must(os.MkdirAll(filepath.Dir(outPath(pg)), 0o755))
			must(os.WriteFile(outPath(pg), []byte(shell(pg, s, icons)), 0o644))
			n++
		}
	}
	fmt.Printf("sitegen: %d pages → %s/\n", n, outDir)
}

func outPath(pg *page) string {
	if pg.Section == "" {
		return filepath.Join(outDir, pg.Slug+".html")
	}
	return filepath.Join(outDir, pg.Section, pg.Slug+".html")
}

// href — a page's address relative to another page.
func href(from, to *page) string {
	rel := ""
	if from.Section != "" {
		rel = "../"
	}
	if to.Section == "" {
		return rel + to.Slug + ".html"
	}
	return rel + to.Section + "/" + to.Slug + ".html"
}

// parsePage — front matter (title · section · order · summary) then markdown.
func parsePage(path string) *page {
	b, err := os.ReadFile(path)
	must(err)
	s := string(b)
	pg := &page{Slug: strings.TrimSuffix(filepath.Base(path), ".md")}
	if strings.HasPrefix(s, "---\n") {
		end := strings.Index(s[4:], "\n---\n")
		for _, line := range strings.Split(s[4:4+end], "\n") {
			k, v, _ := strings.Cut(line, ":")
			v = strings.TrimSpace(v)
			switch strings.TrimSpace(k) {
			case "title":
				pg.Title = v
			case "section":
				pg.Section = v
			case "order":
				pg.Order, _ = strconv.Atoi(v)
			case "summary":
				pg.Summary = v
			}
		}
		s = s[4+end+5:]
	}
	if pg.Title == "" {
		pg.Title = pg.Slug
	}
	pg.Body = render(s)
	return pg
}

var h2 = regexp.MustCompile(`(?m)^## (.+)$`)

// splitSkill — the preamble is "Overview"; every ## heading is a page.
func splitSkill(src, sec string) []*page {
	body := src
	if strings.HasPrefix(body, "---\n") {
		if end := strings.Index(body[4:], "\n---\n"); end >= 0 {
			body = body[4+end+5:]
		}
	}
	locs := h2.FindAllStringIndex(body, -1)
	var out []*page
	add := func(title, text string) {
		text = strings.TrimSpace(text)
		if text == "" {
			return
		}
		out = append(out, &page{Section: sec, Slug: slug(title), Title: shortTitle(title), Body: render(text)})
	}
	if len(locs) == 0 {
		add("Overview", body)
		return out
	}
	pre := strings.TrimSpace(body[:locs[0][0]])
	pre = regexp.MustCompile(`(?m)^# .+\n`).ReplaceAllString(pre, "")
	add("Overview", pre)
	for i, l := range locs {
		end := len(body)
		if i+1 < len(locs) {
			end = locs[i+1][0]
		}
		title := strings.TrimSpace(body[l[0]+3 : l[1]])
		add(title, body[l[0]:end])
	}
	return out
}

var nonWord = regexp.MustCompile(`[^a-z0-9]+`)

func slug(title string) string {
	t := strings.ToLower(shortTitle(title))
	t = strings.Trim(nonWord.ReplaceAllString(t, "-"), "-")
	parts := strings.Split(t, "-")
	if len(parts) > 5 {
		parts = parts[:5]
	}
	return strings.Join(parts, "-")
}

// shortTitle — the heading without its parenthetical or trailing dash clause.
func shortTitle(t string) string {
	if i := strings.Index(t, " ("); i > 0 {
		t = t[:i]
	}
	if i := strings.Index(t, " — "); i > 0 {
		t = t[:i]
	}
	t = strings.TrimSpace(t)
	// SHOUTED headings read quieter as labels: sentence case when most letters shout
	upper, letters := 0, 0
	for _, r := range t {
		if r >= 'A' && r <= 'Z' {
			upper++
		}
		if (r >= 'A' && r <= 'Z') || (r >= 'a' && r <= 'z') {
			letters++
		}
	}
	if letters > 3 && upper*10 > letters*6 {
		t = strings.ToUpper(t[:1]) + strings.ToLower(t[1:])
	}
	return t
}

// langClass — goldmark's `language-x` becomes the highlighter's bare
// language word (js → javascript, sql → sqlite).
var langClass = regexp.MustCompile(`class="language-([a-z0-9]+)"`)

func render(markdown string) string {
	var buf bytes.Buffer
	must(md.Convert([]byte(markdown), &buf))
	return langClass.ReplaceAllStringFunc(buf.String(), func(m string) string {
		l := langClass.FindStringSubmatch(m)[1]
		switch l {
		case "js":
			l = "javascript"
		case "sql":
			l = "sqlite"
		}
		return `class="` + l + `"`
	})
}

var h2html = regexp.MustCompile(`<h2 id="([^"]+)">(.+?)</h2>`)

// toc — the page's h2 list, when it has three or more.
func toc(body string) string {
	ms := h2html.FindAllStringSubmatch(body, -1)
	if len(ms) < 3 {
		return ""
	}
	var sb strings.Builder
	sb.WriteString(`<nav class="card column" aria-label="On this page" style="--gap: 0; --type: -1;"><strong>On this page</strong>`)
	for _, m := range ms {
		sb.WriteString(`<a href="#` + m[1] + `">` + stripTags(m[2]) + `</a>`)
	}
	sb.WriteString(`</nav>`)
	return sb.String()
}

var tagRe = regexp.MustCompile(`<[^>]+>`)

func stripTags(s string) string { return tagRe.ReplaceAllString(s, "") }

func loadIcons() map[string]string {
	out := map[string]string{}
	files, _ := filepath.Glob("site/icons/*.svg")
	for _, f := range files {
		b, _ := os.ReadFile(f)
		s := regexp.MustCompile(`\s+`).ReplaceAllString(string(b), " ")
		out[strings.TrimSuffix(filepath.Base(f), ".svg")] = strings.TrimSpace(s)
	}
	return out
}

func navItem(href, label, icon string, current bool) string {
	aria := ""
	if current {
		aria = ` aria-current="page"`
	}
	return `<a class="nav-item" href="` + href + `"` + aria + `>` + icon + `<span class="medium large">` + htmlesc.EscapeString(label) + `</span></a>`
}

// shell — the page on the engine's own grid, on the shell grammar:
// pg-header (the brand, the theme), pg-navigation (n1: the sections),
// pg-main-header (crumbs, the title, the phone's menu), pg-main-subheader
// (n2: the section's views, only when it has more than one),
// pg-toolbar (n3: the pages of the view), pg-main (the content).
func shell(pg *page, cur *section, icons map[string]string) string {
	root := "./"
	if pg.Section != "" {
		root = "../"
	}
	var view []*page
	for _, p := range cur.Pages {
		if p.Tab == pg.Tab {
			view = append(view, p)
		}
	}
	railLabel := cur.Label
	for _, t := range cur.Tabs {
		if t.Key == pg.Tab {
			railLabel = t.Label
		}
	}
	var nav strings.Builder
	for _, s := range sections {
		if len(s.Pages) > 0 {
			nav.WriteString(navItem(href(pg, s.Pages[0]), s.Label, icons[s.Icon], s == cur))
		}
	}
	var tabs strings.Builder
	if len(cur.Tabs) > 1 {
		tabs.WriteString(`<nav class="pg-main-subheader" aria-label="` + cur.Label + `"><div class="tabs-underline" style="--type: -1;">`)
		for _, t := range cur.Tabs {
			var first *page
			for _, p := range cur.Pages {
				if p.Tab == t.Key {
					first = p
					break
				}
			}
			if first == nil {
				continue
			}
			aria := ""
			if t.Key == pg.Tab {
				aria = ` aria-current="page"`
			}
			tabs.WriteString(`<a href="` + href(pg, first) + `"` + aria + `>` + t.Label + `</a>`)
		}
		tabs.WriteString(`</div></nav>`)
	}
	var rail strings.Builder
	if len(view) > 1 {
		rail.WriteString(`<nav class="pg-toolbar spread-column tablet desktop" aria-label="` + railLabel + `"><div class="column" style="--gap: 0.1lh;"><small class="rail-head medium large">` + railLabel + `</small>`)
		for _, p := range view {
			rail.WriteString(navItem(href(pg, p), p.Title, "", p == pg))
		}
		rail.WriteString(`</div></nav>`)
	}
	var menu strings.Builder
	menu.WriteString(`<details class="site-menu mobile column" style="--gap: 0.25lh;"><summary class="tag">Menu</summary><div class="row" style="--gap: 0.5em; --type: -1;">`)
	for _, s := range sections {
		if len(s.Pages) > 0 {
			menu.WriteString(`<a class="tag" href="` + href(pg, s.Pages[0]) + `">` + s.Label + `</a>`)
		}
	}
	menu.WriteString(`</div>`)
	if len(view) > 1 {
		menu.WriteString(`<div class="column" style="--gap: 0; --type: -1;">`)
		for _, p := range view {
			menu.WriteString(`<a href="` + href(pg, p) + `">` + htmlesc.EscapeString(p.Title) + `</a>`)
		}
		menu.WriteString(`</div>`)
	}
	menu.WriteString(`</details>`)
	crumbs := `<nav class="crumbs" aria-label="Breadcrumb"><a href="` + root + `index.html">system.css</a>`
	if cur.Key != "" {
		crumbs += `<a href="` + href(pg, cur.Pages[0]) + `">` + cur.Label + `</a>`
		if railLabel != cur.Label {
			crumbs += `<a href="` + href(pg, view[0]) + `">` + railLabel + `</a>`
		}
	}
	crumbs += `</nav>`
	body := pg.Body
	measure := `<section class="column measure" style="--measure: 80ch; --gap: 1lh;">`
	if pg.Raw {
		measure = `<section class="column" style="--gap: 1lh;">`
	} else {
		body = toc(body) + body
	}
	scripts := ""
	for _, r := range liveRockets {
		scripts += `<script type="module" src="` + root + `static/rocket/` + r + `.js"></script>`
	}
	return `<!doctype html>
<html lang="en" data-signals="{theme: (function () { try { return localStorage.getItem('theme') || '' } catch (e) { return '' } })()}" data-attr:data-ui-theme="$theme != '' ? $theme : false">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<meta name="color-scheme" content="dark light"/>
<title>` + htmlesc.EscapeString(pg.Title) + ` — system.css</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Roboto+Mono:wght@400;500&display=optional" rel="stylesheet"/>
<link rel="stylesheet" href="` + root + `static/system.css"/>
<link rel="stylesheet" href="` + root + `assets/site.css"/>
<script>try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-ui-theme',t)}catch(e){}</script>
<script type="module" src="` + cdn + `"></script>
` + scripts + `
</head>
<body>
<div class="page">
	<header class="pg-header spread" style="--gap: 0.5em;">
		<a href="` + root + `index.html" class="row oneline" style="--gap: 0.5em;"><strong>system.css</strong><small style="--fg: -0.55;">the engine</small></a>
		<span class="row oneline" style="--gap: 0.5em;">
			<a href="https://github.com/Deufel/system-css" style="--type: -1;">GitHub</a>
			<button type="button" class="icon" aria-label="Theme" title="Theme: system → dark → light" data-on:click="$theme = $theme == '' ? 'dark' : ($theme == 'dark' ? 'light' : ''); try { localStorage.setItem('theme', $theme) } catch (e) {}">
				<span data-show="$theme == ''" style="display: none;">` + icons["monitor"] + `</span>
				<span data-show="$theme == 'dark'" style="display: none;">` + icons["moon"] + `</span>
				<span data-show="$theme == 'light'" style="display: none;">` + icons["sun"] + `</span>
			</button>
		</span>
	</header>
	<nav class="pg-navigation spread-column tablet desktop" aria-label="Sections">
		<div class="column">` + nav.String() + `</div>
	</nav>
	<header class="pg-main-header column">
		` + crumbs + `
		<div class="spread"><h1>` + htmlesc.EscapeString(pg.Title) + `</h1></div>
		` + menu.String() + `
	</header>
	` + tabs.String() + rail.String() + `
	<main class="pg-main column owns-scroll">
		` + measure + `
` + body + `
		</section>
	</main>
</div>
<script src="` + root + `assets/highlight.js"></script>
</body>
</html>
`
}

func contains(xs []string, x string) bool {
	for _, v := range xs {
		if v == x {
			return true
		}
	}
	return false
}

func copyTree(src, dst string) error {
	return filepath.WalkDir(src, func(p string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(src, p)
		if d.IsDir() {
			return os.MkdirAll(filepath.Join(dst, rel), 0o755)
		}
		b, err := os.ReadFile(p)
		if err != nil {
			return err
		}
		return os.WriteFile(filepath.Join(dst, rel), b, 0o644)
	})
}

func must(err error) {
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

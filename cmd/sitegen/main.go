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
	Section, Slug, Title, Summary string
	Order                         int
	Body                          string // rendered HTML
	Raw                           bool   // a lab fragment: not markdown
}

// section is one rail item; its pages are the tabs.
type section struct {
	Key, Label, Icon string
	Pages            []*page
}

var sections = []*section{
	{Key: "", Label: "Home", Icon: "sparkles"},
	{Key: "howto", Label: "How-to", Icon: "pencil"},
	{Key: "engine", Label: "Engine", Icon: "palette"},
	{Key: "components", Label: "Components", Icon: "boxes"},
	{Key: "stream", Label: "Land & stream", Icon: "boxes"},
	{Key: "charts", Label: "Charts", Icon: "palette"},
	{Key: "lab", Label: "Lab", Icon: "sparkles"},
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

var md = goldmark.New(
	goldmark.WithExtensions(extension.GFM),
	goldmark.WithParserOptions(parser.WithAutoHeadingID()),
	goldmark.WithRendererOptions(mdhtml.WithUnsafe()),
)

func main() {
	must(os.RemoveAll(outDir))
	must(os.MkdirAll(outDir, 0o755))
	must(copyTree("static", filepath.Join(outDir, "static")))
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
			bySection["lab"].Pages = append(bySection["lab"].Pages, &page{Section: "lab", Slug: l.key, Title: l.label, Order: i, Body: string(b), Raw: true})
		}
	}
	rockets, _ := filepath.Glob("site/lab/rocket-*.html")
	sort.Strings(rockets)
	for i, f := range rockets {
		key := strings.TrimSuffix(strings.TrimPrefix(filepath.Base(f), "rocket-"), ".html")
		b, _ := os.ReadFile(f)
		body := string(b)
		if !contains(liveRockets, key) {
			body = `<div class="alert inf" role="note"><div>This bench imports the Datastar Pro runtime's <code>rocket</code> module, which the site does not load; the markup is shown, the behaviour runs in an app that ships Pro.</div></div>` + body
		}
		bySection["lab"].Pages = append(bySection["lab"].Pages, &page{Section: "lab", Slug: "rocket-" + key, Title: "Rocket · " + key, Order: 100 + i, Body: body, Raw: true})
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
	if t == strings.ToUpper(t) && len(t) > 3 { // SHOUTED headings read quieter as labels
		t = strings.ToUpper(t[:1]) + strings.ToLower(t[1:])
	}
	return t
}

func render(markdown string) string {
	var buf bytes.Buffer
	must(md.Convert([]byte(markdown), &buf))
	return buf.String()
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

// shell — the page on the engine's own grid: pg-header (the title, the
// theme), pg-navigation (the sections), pg-main-header (the section's
// pages as tabs), pg-main (the content, on a measure).
func shell(pg *page, cur *section, icons map[string]string) string {
	root := "./"
	if pg.Section != "" {
		root = "../"
	}
	var nav strings.Builder
	for _, s := range sections {
		if len(s.Pages) == 0 {
			continue
		}
		first := s.Pages[0]
		aria := ""
		if s == cur {
			aria = ` aria-current="page"`
		}
		nav.WriteString(`<a class="nav-item" href="` + href(pg, first) + `"` + aria + `>` + icons[s.Icon] + `<span class="medium large">` + s.Label + `</span></a>`)
	}
	var tabs strings.Builder
	if len(cur.Pages) > 1 {
		tabs.WriteString(`<nav class="tabs-underline scroll-x" aria-label="` + cur.Label + `">`)
		for _, p := range cur.Pages {
			cls := ""
			if p == pg {
				cls = ` aria-current="page"`
			}
			tabs.WriteString(`<a href="` + href(pg, p) + `"` + cls + `>` + htmlesc.EscapeString(p.Title) + `</a>`)
		}
		tabs.WriteString(`</nav>`)
	}
	var mobile strings.Builder
	mobile.WriteString(`<nav class="row mobile" aria-label="Sections" style="--gap: 0.5em; --type: -1;">`)
	for _, s := range sections {
		if len(s.Pages) == 0 {
			continue
		}
		mobile.WriteString(`<a class="tag" href="` + href(pg, s.Pages[0]) + `">` + s.Label + `</a>`)
	}
	mobile.WriteString(`</nav>`)
	body := pg.Body
	if !pg.Raw {
		body = toc(body) + body
	}
	scripts := ""
	for _, r := range liveRockets {
		scripts += `<script type="module" src="` + root + `static/rocket/` + r + `.js"></script>`
	}
	return `<!doctype html>
<html lang="en" data-signals="{theme: ''}" data-attr:data-ui-theme="$theme != '' ? $theme : false">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<meta name="color-scheme" content="dark light"/>
<title>` + htmlesc.EscapeString(pg.Title) + ` — system.css</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Roboto+Mono:wght@400;500&display=optional" rel="stylesheet"/>
<link rel="stylesheet" href="` + root + `static/system.css"/>
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
		<div class="spread"><h1>` + htmlesc.EscapeString(pg.Title) + `</h1></div>
		` + mobile.String() + tabs.String() + `
	</header>
	<main class="pg-main column owns-scroll">
		<section class="column measure" style="--measure: 80ch; --gap: 1lh;">
` + body + `
		</section>
	</main>
</div>
<script>document.addEventListener('datastar-ready',()=>{try{const t=localStorage.getItem('theme')||'';window.ds&&window.ds.signals&&window.ds.signals.set('theme',t)}catch(e){}})</script>
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

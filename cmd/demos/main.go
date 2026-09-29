// demos — full pages built on the engine alone, generated: the geometry
// of every chart computed by the charts package, every surface painted
// by system.css, not a rule of CSS written by hand. Each page sets its
// own theme, hue, skin, corners and size at the root — the colour engine
// on display — and obeys the laws it demonstrates (no inline geometry:
// knobs only). Output: site/demos/*.html, committed; the site frames them.
//
//	go run ./cmd/demos
package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/Deufel/system-css/charts"
)

type demo struct {
	file, title, tag, blurb string
	root                    string // the html attributes: theme · size · skin · corners · hue
	body                    string
}

func head(title, root string) string {
	return `<!doctype html>
<html lang="en" ` + root + `>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<meta name="color-scheme" content="dark light"/>
<title>` + title + ` — a system.css demo</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Roboto+Mono:wght@400;500&family=Hanken+Grotesk:wght@400;500;600;700&family=Spline+Sans+Mono:wght@400;500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=optional" rel="stylesheet"/>
<link rel="stylesheet" href="../static/system.css"/>
<script type="module" src="../static/datastar.js"></script>
<script type="module" src="../static/rocket/hold-confirm.js"></script>
</head>
<body>
`
}

const foot = `
</body>
</html>
`

func card(title, body string) string {
	return `<div class="card column" style="--gap: 0.25lh;"><strong>` + title + `</strong>` + body + `</div>`
}

func stat(label, value, delta, tone string, spark []float64) string {
	return `<div class="card column" style="--gap: 0.25lh;"><small style="--fg: -0.55;">` + label + `</small><span class="num" style="--type: 3;">` + value + ` <span class="delta ` + tone + `">` + delta + `</span></span>` + charts.Sparkline(spark, label+" trend") + `</div>`
}

func navItems(items [][2]string, active string) string {
	var b strings.Builder
	for _, it := range items {
		aria := ""
		if it[0] == active {
			aria = ` aria-current="page"`
		}
		b.WriteString(`<a class="nav-item" href="#"` + aria + `><span class="medium large">` + it[0] + `</span></a>`)
	}
	return b.String()
}

func dashboard() demo {
	rev := []charts.Point{{Label: "Apr", Val: 41200}, {Label: "May", Val: 44800}, {Label: "Jun", Val: 43100}, {Label: "Jul", Val: 49800}, {Label: "Aug", Val: 52600}, {Label: "Sep", Val: 58900}}
	top := []charts.Point{{Label: "Riverside Beverage", Val: 18400}, {Label: "Summit Imports", Val: 15100}, {Label: "Blue Heron", Val: 12200}, {Label: "Kestrel & Co", Val: 9800}, {Label: "Nightjar", Val: 6100}}
	byClass := []charts.Bar{{Label: "Beer", ValueLabel: "1.24k cases", Pct: 100}, {Label: "Wine", ValueLabel: "610", Pct: 49}, {Label: "Spirits", ValueLabel: "340", Pct: 27}, {Label: "RTD", ValueLabel: "190", Pct: 15}}
	body := `<div class="page">
<header class="pg-header spread" style="--gap: 0.5em;"><span class="row oneline" style="--gap: 0.5em;"><span class="avatar">NW</span><strong>Northwind</strong><small style="--fg: -0.55;">operations</small></span><span class="row oneline" style="--gap: 0.5em;"><label class="search-box"><input type="search" placeholder="Search accounts, events…" aria-label="Search"/><kbd>⌘K</kbd></label><span class="avatar" style="--hue-shift: 120;">MD</span></span></header>
<nav class="pg-navigation spread-column tablet desktop" aria-label="Primary"><div class="column">` + navItems([][2]string{{"Overview"}, {"Events"}, {"Activations"}, {"Accounts"}, {"Reports"}, {"Settings"}}, "Overview") + `</div></nav>
<header class="pg-main-header column"><nav class="crumbs"><a href="#">Northwind</a><a href="#">Overview</a></nav><div class="spread"><h1>Overview</h1><span class="row oneline" style="--gap: 0.5em;"><button type="button" class="sec">Export</button><button type="button" class="pri">New event</button></span></div></header>
<nav class="pg-main-subheader" aria-label="Range"><div class="tabs-underline" style="--type: -1;"><a href="#">Day</a><a href="#" aria-current="page">Week</a><a href="#">Month</a></div></nav>
<main class="pg-main column owns-scroll">
<section class="column" style="--gap: 1lh;">
<div class="grid" style="--grid-min: 14rem;">` +
		stat("Revenue, month to date", "$58.9k", "▲ 12%", "num-good", []float64{41, 44, 43, 49, 52, 58}) +
		stat("Active accounts", "312", "▲ 8", "num-good", []float64{280, 291, 295, 301, 304, 312}) +
		stat("Events this week", "14", "▼ 2", "num-bad", []float64{19, 16, 17, 15, 16, 14}) +
		stat("Cost per case", "$4.21", "▼ 3%", "num-good", []float64{4.6, 4.5, 4.4, 4.3, 4.3, 4.21}) + `</div>
<div class="grid" style="--grid-min: 22rem;">` +
		card("Revenue by month", `<div class="row" style="--gap: 0.5em; --type: -1;"><span class="tag">2026</span><span class="tag" style="--fg: -0.55;">net of returns</span></div>`+charts.LineArea(rev, "Revenue by month")) +
		card("Top accounts", charts.Dots(top, "Top accounts by revenue")) +
		card("Cases by class", `<div style="--hue-shift: 40;">`+charts.HBars(byClass, "Cases by class")+`</div>`) +
		card("Live now", `<div class="column" style="--gap: 0.25lh;">
<span class="spread"><span class="row oneline" style="--gap: 0.5em;"><span class="tag suc">live</span>Riverwalk Fest</span><small style="--fg: -0.55;">2 reps · 1h 40m</small></span>
<span class="spread"><span class="row oneline" style="--gap: 0.5em;"><span class="tag suc">live</span>Lockport Tasting</span><small style="--fg: -0.55;">1 rep · 25m</small></span>
<span class="spread"><span class="row oneline" style="--gap: 0.5em;"><span class="tag wrn">late</span>Harbor Market</span><small style="--fg: -0.55;">planned 14:00</small></span>
<span class="spread"><span class="row oneline" style="--gap: 0.5em;"><span class="tag">done</span>Depot Pop-up</span><small style="--fg: -0.55;">3h 10m on site</small></span></div>`) + `</div>
<div class="card column" style="--gap: 0.5lh;"><div class="spread"><strong>Invoices awaiting the ERP's answer</strong><span class="tag inf">7 unconfirmed</span></div>
<div class="scroll-x"><table class="num-table" style="--type: -1;"><thead><tr><th>Event</th><th>Customer</th><th>Issued</th><th class="num">Lines</th><th class="num">Gross</th><th>Status</th></tr></thead><tbody>
<tr><td>Riverwalk Fest</td><td>Riverside Beverage</td><td>Sep 26</td><td class="num">14</td><td class="num">$4,210.00</td><td><span class="tag inf">unconfirmed</span></td></tr>
<tr><td>Lockport Tasting</td><td>Summit Imports</td><td>Sep 25</td><td class="num">6</td><td class="num">$1,180.50</td><td><span class="tag suc">confirmed</span></td></tr>
<tr><td>Harbor Market</td><td>Blue Heron</td><td>Sep 24</td><td class="num">9</td><td class="num">$2,045.00</td><td><span class="tag inf">unconfirmed</span></td></tr>
<tr><td>Depot Pop-up</td><td>Kestrel &amp; Co</td><td>Sep 22</td><td class="num">3</td><td class="num">$610.00</td><td><span class="tag dgr">credit</span></td></tr>
</tbody></table></div></div>
</section></main>
<aside class="pg-aside desktop"><div class="column" style="--gap: 0.5lh; --type: -1;"><small class="rail-head">Activity</small>
<div class="column" style="--gap: 0.25lh;"><span class="row oneline" style="--gap: 0.5em;"><span class="avatar" style="--hue-shift: 60;">JK</span><span>Jonah checked in at Riverwalk</span></span><small style="--fg: -0.55;">4m ago</small></div>
<div class="column" style="--gap: 0.25lh;"><span class="row oneline" style="--gap: 0.5em;"><span class="avatar" style="--hue-shift: 200;">RI</span><span>Rina closed invoice #4821</span></span><small style="--fg: -0.55;">22m ago</small></div>
<div class="column" style="--gap: 0.25lh;"><span class="row oneline" style="--gap: 0.5em;"><span class="avatar" style="--hue-shift: 300;">SA</span><span>Sasha added Blue Heron's brands</span></span><small style="--fg: -0.55;">1h ago</small></div>
<div class="alert inf" role="note"><div>Usage resets in 8 days.</div></div></div></aside>
</div>`
	return demo{"dashboard.html", "Operations dashboard", "dark · hue 255 · corners 2", "Stat tiles with sparklines, revenue over time, a ranked dot plot, horizontal bars on a shifted hue, a live list on the semantic locks, an invoice table and the aside — the ten-slot app shell.", `data-ui-theme="dark" data-ui-size="md" data-ui-radius="2" style="--hue: 255;"`, body}
}

func report() demo {
	vol := []charts.Point{{Label: "Jan", Val: 812}, {Label: "Feb", Val: 790}, {Label: "Mar", Val: 905}, {Label: "Apr", Val: 1040}, {Label: "May", Val: 1180}, {Label: "Jun", Val: 1310}, {Label: "Jul", Val: 1290}, {Label: "Aug", Val: 1420}, {Label: "Sep", Val: 1510}}
	share := []charts.Bar{{Label: "Penrose Brewing", ValueLabel: "31%", Pct: 100}, {Label: "Virtue Cider", ValueLabel: "22%", Pct: 71}, {Label: "Half Acre", ValueLabel: "18%", Pct: 58}, {Label: "Maplewood", ValueLabel: "12%", Pct: 39}, {Label: "Others", ValueLabel: "17%", Pct: 55}}
	rank := []charts.Point{{Label: "Chicago", Val: 540}, {Label: "Joliet", Val: 410}, {Label: "Naperville", Val: 380}, {Label: "Aurora", Val: 290}, {Label: "Elgin", Val: 210}}
	toc := `<aside class="pg-aside desktop"><nav class="toc column" aria-label="On this page" style="--gap: 0; --type: -1;"><small class="rail-head">Contents</small><a href="#volume">Volume</a><a href="#share">Share by supplier</a><a href="#where">Where it sold</a><a href="#outlook">Outlook</a></nav></aside>`
	body := `<div class="page">
<header class="pg-header spread" style="--gap: 0.5em;"><span class="row oneline" style="--gap: 0.5em;"><strong>Northwind</strong><small style="--fg: -0.55;">reports</small></span><span class="row oneline" style="--gap: 0.5em;"><button type="button" class="sec">Print</button><button type="button" class="pri">Share</button></span></header>
<header class="pg-main-header column"><nav class="crumbs"><a href="#">Reports</a><a href="#">Q3 2026</a></nav><div class="spread"><h1>Third quarter, in cases</h1><span class="tag">draft</span></div></header>
<main class="pg-main column owns-scroll"><section class="column measure" style="--measure: 70ch; --gap: 1lh;">
<p style="--type: 1;">The quarter closed at <span class="num">1,510 cases <span class="delta num-good">▲ 19%</span></span> over the same quarter last year, on <span class="num">312 <span class="delta num-good">▲ 8</span></span> active accounts. Craft beer carried the growth; wine held; spirits fell for a second quarter.</p>
<h2 id="volume">Volume</h2>
<p>Monthly cases delivered, all classes. The July dip is the holiday week; September is the strongest month the territory has recorded.</p>
<div class="card">` + charts.Columns(vol, "Cases by month") + `</div>
<h2 id="share">Share by supplier</h2>
<p>Penrose keeps a third of the volume. Virtue's cider gained four points on a summer programme; the long tail is thirty-one houses.</p>
<div class="card" style="--hue-shift: -40;">` + charts.HBars(share, "Share by supplier") + `</div>
<h2 id="where">Where it sold</h2>
<p>Ranked by cases. Chicago is a third of the quarter; the collar counties grew faster.</p>
<div class="card" style="--hue-shift: 60;">` + charts.Dots(rank, "Cases by city") + `</div>
<blockquote class="card column" style="--gap: 0.25lh; --lift: 1;"><p style="--type: 1;">"The number we wanted was the September line: the first month the territory delivered more than it forecast."</p><small style="--fg: -0.55;">— the ops lead, month-end review</small></blockquote>
<h2 id="outlook">Outlook</h2>
<div class="grid" style="--grid-min: 12rem;"><div class="card column" style="--gap: 0;"><small style="--fg: -0.55;">Q4 forecast</small><span class="num est" style="--type: 2;">4,600</span><small class="past">Q4 2025: 3,910</small></div><div class="card column" style="--gap: 0;"><small style="--fg: -0.55;">Events booked</small><span class="num" style="--type: 2;">41 <span class="delta num-good">▲ 6</span></span><small class="past">same time last year: 35</small></div><div class="card column" style="--gap: 0;"><small style="--fg: -0.55;">Returns</small><span class="num" style="--type: 2;">1.9% <span class="delta num-bad">▲ 0.3</span></span><small class="past">target: under 1.5%</small></div></div>
<p><small style="--fg: -0.55;">Colour encodes valence — a falling cost is good; typography encodes time — an estimate is italic, a prior period quiet. The two axes never collide.</small></p>
</section></main>` + toc + `</div>`
	return demo{"report.html", "Quarterly report", "light · material · hue 150", "A long-form report on the reading measure with a contents aside: columns, horizontal bars and a ranked dot plot each on its own hue turn, the number family for valence and time, a pull quote on a lift.", `data-ui-theme="light" data-ui-size="md" data-ui-skin="material" data-ui-radius="1" style="--hue: 150;"`, body}
}

func field() demo {
	body := `<div class="page"><div class="wash" aria-hidden="true"><i></i></div>
<header class="pg-header spread" style="--gap: 0.5em;"><span class="row oneline" style="--gap: 0.5em;"><span class="avatar">JK</span><strong>Jonah</strong></span><span class="tag suc">on site · 1h 12m</span></header>
<header class="pg-main-header column"><div class="spread"><h1>Today</h1><small style="--fg: -0.55;">Tue, Sep 29</small></div></header>
<main class="pg-main column owns-scroll"><section class="column measure" style="--measure: 30rem; --gap: 0.5lh;">
<div class="card column" style="--gap: 0.5lh; --lift: 1;"><div class="spread"><strong>Riverwalk Fest</strong><span class="tag suc">live</span></div><small style="--fg: -0.55;">Riverside Beverage · 1 Main St, Joliet</small><div class="spread"><span class="num" style="--type: 2;">1h 12m</span><small style="--fg: -0.55;">since 13:36 · 46 m from the door</small></div>
<div class="row" style="--gap: 0.5em;"><span class="tag">Penrose</span><span class="tag">Virtue</span><span class="tag">Half Acre</span></div>
<fieldset data-on:confirm="$done = true"><hold-confirm class="dgr" data-ignore-morph><button type="button" class="fill">Hold to check out</button></hold-confirm></fieldset></div>
<div class="card column" style="--gap: 0.25lh;"><div class="spread"><strong>Lockport Tasting</strong><span class="tag">planned</span></div><small style="--fg: -0.55;">Summit Imports · 15:30 · 4.2 mi</small><button type="button" class="pri">Check in</button></div>
<div class="card column" style="--gap: 0.25lh;"><div class="spread"><strong>Harbor Market</strong><span class="tag wrn">late</span></div><small style="--fg: -0.55;">Blue Heron · planned 14:00</small><button type="button" class="sec">Reschedule</button></div>
<div class="card column" style="--gap: 0.25lh;"><div class="spread"><strong>Depot Pop-up</strong><span class="tag">done</span></div><small style="--fg: -0.55;">Kestrel &amp; Co · 3h 10m on site · 2 expenses</small></div>
<div class="alert inf" role="note"><div>Your position is read once per tap. The clock is the server's.</div></div>
</section></main>
<footer class="pg-footer"><nav class="row" aria-label="Dock" style="--gap: 0;"><a class="nav-item" href="#" aria-current="page"><span>Today</span></a><a class="nav-item" href="#"><span>Map</span></a><a class="nav-item" href="#"><span>Expenses</span></a><a class="nav-item" href="#"><span>Me</span></a></nav></footer>
</div>`
	return demo{"field.html", "Field app", "phone · hue 30 · pill corners · large type", "A rep's day on the phone shell: the wash under everything, the live visit with its clock and a hold-to-confirm, planned and late visits on the semantic locks, a dock in the footer.", `data-ui-theme="dark" data-ui-size="lg" data-ui-radius="3" style="--hue: 30;" data-signals="{done: false}"`, body}
}

func landing() demo {
	growth := []charts.Point{{Label: "'22", Val: 12}, {Label: "'23", Val: 31}, {Label: "'24", Val: 58}, {Label: "'25", Val: 96}, {Label: "'26", Val: 140}}
	body := `<div class="page"><div class="wash" aria-hidden="true"><i></i></div>
<header class="pg-header spread" style="--gap: 0.5em;"><strong>Lumen</strong><span class="row oneline" style="--gap: 0.5em;"><a href="#">Product</a><a href="#">Pricing</a><a href="#">Docs</a><button type="button" class="sec">Sign in</button><button type="button" class="pri">Start free</button></span></header>
<main class="pg-main column owns-scroll"><section class="column measure" style="--measure: 64rem; --gap: 1lh;">
<div class="column rise" style="--rise: 55; --gap: 0.5lh; --type: 1;"><span class="tag inf">v2 · one file</span><h1 style="--type: 6;">Ship your interface at the speed of thought</h1><p style="--type: 1; --fg: -0.55;">One tiny CSS engine. Every surface, control and layout derives from type and a signed colour axis — so it just fits, in any theme, at any scale.</p><div class="row" style="--gap: 0.5em;"><button type="button" class="pri">Start free</button><button type="button" class="sec">Book a demo</button></div><small style="--fg: -0.55;">No credit card · 5-minute setup</small></div>
<div class="grid" style="--grid-min: 16rem;">
<div class="card column" style="--gap: 0.25lh;"><strong>Paint by knob</strong><small style="--fg: -0.55;">Set --hue, --bg, --fg, --type. There is no palette to pick from and nothing to name.</small></div>
<div class="card column" style="--gap: 0.25lh; --hue-shift: 60;"><strong>One spine</strong><small style="--fg: -0.55;">Eleven layers decide the cascade. Specificity is zero everywhere, forever.</small></div>
<div class="card column" style="--gap: 0.25lh; --hue-shift: 120;"><strong>Charts from ink</strong><small style="--fg: -0.55;">SVG painted by currentColor; a series is a hue turn, weight is --fg.</small></div>
<div class="card column" style="--gap: 0.25lh; --hue-shift: 180;"><strong>The shell is CSS</strong><small style="--fg: -0.55;">Named regions, gates that roll a layer back, no script at first paint.</small></div>
</div>
<div class="grid" style="--grid-min: 22rem;"><div class="card column" style="--gap: 0.25lh;"><strong>Teams on the engine</strong><small style="--fg: -0.55;">and the pages they ship, by year</small>` + charts.LineArea(growth, "Teams by year") + `</div><div class="card column" style="--gap: 0.5lh; --lift: 1;"><p style="--type: 2;">"We deleted eleven thousand lines of CSS and the product got better looking."</p><span class="row oneline" style="--gap: 0.5em;"><span class="avatar" style="--hue-shift: 90;">AK</span><span class="column" style="--gap: 0;"><strong>Ada K.</strong><small style="--fg: -0.55;">head of design, Orbit</small></span></span></div></div>
<h2 style="--type: 3;">Pricing</h2>
<div class="grid" style="--grid-min: 16rem;">
<div class="card column" style="--gap: 0.5lh;"><strong>Basic</strong><span class="num" style="--type: 4;">$0</span><small style="--fg: -0.55;">the engine, the lab, the docs</small><button type="button" class="sec fill">Start</button></div>
<div class="card column" style="--gap: 0.5lh; --lift: 2;"><div class="spread"><strong>Standard</strong><span class="tag inf">popular</span></div><span class="num" style="--type: 4;">$49<small style="--fg: -0.55;">/mo</small></span><small style="--fg: -0.55;">the rockets, the charts, priority answers</small><button type="button" class="pri fill">Start free</button></div>
<div class="card column" style="--gap: 0.5lh;"><strong>Pro</strong><span class="num" style="--type: 4;">$149<small style="--fg: -0.55;">/mo</small></span><small style="--fg: -0.55;">a design system of your own, on the engine</small><button type="button" class="sec fill">Talk to us</button></div>
</div>
</section></main>
<footer class="pg-footer spread" style="--type: -1; --fg: -0.55;"><span>Lumen · built on system.css</span><span class="row" style="--gap: 0.5em;"><a href="#">Docs</a><a href="#">GitHub</a><a href="#">Status</a></span></footer>
</div>`
	return demo{"landing.html", "Landing page", "dark · hue 320 · the wash", "A marketing page on the wash: a hero on a viewport share with display type, a feature grid stepping the hue, a growth chart beside a quote on a lift, pricing tiers, a footer.", `data-ui-theme="dark" data-ui-size="md" data-ui-radius="1" style="--hue: 320;"`, body}
}

func main() {
	dir := filepath.Join("site", "demos")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	var index strings.Builder
	for _, d := range []demo{dashboard(), report(), field(), landing()} {
		if err := os.WriteFile(filepath.Join(dir, d.file), []byte(head(d.title, d.root)+d.body+foot), 0o644); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		fmt.Fprintf(&index, "%s\t%s\t%s\t%s\n", d.file, d.title, d.tag, d.blurb)
	}
	if err := os.WriteFile(filepath.Join(dir, "index.tsv"), []byte(index.String()), 0o644); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Println("demos: 4 pages → site/demos/")
}

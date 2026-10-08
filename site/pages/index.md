---
title: mike.css
section:
order: 0
summary: One CSS file, one Datastar runtime, one SQLite file.
---

mike.css (the system-css module) is a design engine, not a component library. You write
semantic HTML and a few composition classes, then set inherited custom
properties: `--hue`, `--bg`, `--fg`, `--type`, `--lift`, `--gap`. There
is no `.btn-primary`. A button is a button.

This site is generated from the same files an agent loads to work on a
project built on the stack.

- **How-to**: start a project, the shell, a page, a form, a rocket, the
  server, migrations.
- **Engine**: the `system-css` skill, one page per section.
- **Components**: the `datastar-components` skill.
- **Land & stream**: the `land-and-stream` skill, the server half.
- **Charts**: the `svg-charts` skill.
- **Advanced**: the wash, the stack, canvas and rise, composing screens.
- **Lab**: every specimen, live.
- **Demos**: full pages on the engine.
- **Skills**: the four skill files, raw.

## Laws

1. One file, one spine. Layers decide the cascade. Specificity is zero.
2. No new classes. Compose the primitives and the knobs. A gap is raised
   at the lab, not filled with a class.
3. Knobs are steps, not lengths.
4. Nothing shifts. A change of state or value does not move its
   neighbours.
5. Navigation is the browser's. The server owns state. Signals are rare.

## Start

Read [Start a project](howto/start.html). Keep the
[Engine](engine/overview.html) open while you build. The
[Lab](lab/primitives.html) shows what correct looks like.

[migrate](https://github.com/Deufel/migrate) runs the SQL migrations.
[The how-to](howto/migrate.html) shows the boot wiring.

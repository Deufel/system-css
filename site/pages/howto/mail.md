---
title: Mail
section: howto
order: 8
---

A mail client runs none of the engine. Gmail strips custom properties,
`oklch()`, `@layer`, `@scope`, `:where()` and container queries; Outlook
desktop keeps only inline `style` attributes. So the engine ships a
MICRO EDITION, `static/mail.css`: literal sRGB baked from the anchors at
the default hue, light and dark through `prefers-color-scheme`, every
selector scoped under `.mail`, and the column rung as the card's measure.

## What a mail is

One card. The classes are the engine's names at their mail size:

```html
<!doctype html>
<html><head><meta charset="utf-8"><meta name="color-scheme" content="light dark">
<style>/* static/mail.css, inlined whole */</style></head>
<body class="mail">
  <div class="card">
    <p class="kicker">Sign in</p>
    <h1>Your EventOS sign-in code</h1>
    <p>Enter it on the page that asked. It expires in ten minutes.</p>
    <p class="code">123456</p>
    <p class="foot">If you didn't request this, ignore this email.</p>
  </div>
</body></html>
```

A button is `<a class="btn" href="…">Open</a>`. Send it as
`multipart/alternative` with the plain text first — the text part is
what deliverability and screen readers read; the HTML part is the same
words dressed.

## Laws

1. Literal CSS only: `mail_test.go` refuses a custom property, `oklch()`,
   a layer, a scope, `:where()`, a container query.
2. Every selector starts with `.mail`.
3. The renderer repeats the three colours that matter as inline styles
   (the card's background and ink, the button) for clients that drop the
   head style.
4. The hue is the default (255). A per-org hue in mail would mean baking
   per org at send time; not taken.

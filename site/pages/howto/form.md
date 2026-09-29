---
title: Author a form
section: howto
order: 2
---

Forms follow one canon exactly. Fieldsets own structure; every field is
`label → small → control`; `small` is the STATE slot, never a caption;
everything fills the width; Datastar submits; the handler answers 204
and the stream re-lands the page.

## The shape

```html
<form data-on:submit__prevent="@post('/o/1/settings/warehouses', {contentType: 'form'})">
  <fieldset>
    <legend>Warehouse <small>where the trucks load</small></legend>
    <label>
      <span>Name</span>
      <small></small>
      <input name="name" required autocomplete="off"/>
    </label>
    <label style="--row-width: 2;">
      <span>Address</span>
      <small></small>
      <input name="address"/>
    </label>
    <label>
      <span>Kind</span>
      <small></small>
      <select name="kind">
        <option value="warehouse">Warehouse</option>
        <option value="office">Office</option>
      </select>
    </label>
  </fieldset>
  <div class="spread">
    <button type="reset" class="sec">Cancel</button>
    <button type="submit" class="pri">Save</button>
  </div>
</form>
```

## The rules that bite

- The `small` under a field carries its state — the validation message,
  a "saved" word — and is empty at rest. Captions go in the legend.
- `--row-width` on a label spans it across the fieldset's columns.
- A stored value is judged by the render: `aria-invalid="true"` on the
  control and the message in its `small`, never a client-side check the
  server does not repeat.
- The record form is THE EDIT CARD: a pencil unlocks, Cancel is a native
  `type="reset"` (fields fall back to their stored values), Save posts.
  One grammar for every record.
- `@post(url, {contentType: 'form'})` ships the form's own fields, so no
  signal has to mirror an input. Reach for signals only for state the
  server does not hold.
- A wizard lights the one control to press next with
  `data-ui-state="guide"`; it never explains in prose what the control
  already says.

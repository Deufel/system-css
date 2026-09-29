---
title: Author a form
section: howto
order: 3
---

Fieldsets own structure. Each field is `label → small → control`. The
`small` holds state, not a caption. Everything fills the width. Datastar
submits. The handler answers 204 and the stream re-lands the page.

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

## Rules

- The field's `small` is empty at rest. It carries the validation
  message or a "saved". Captions go in the legend.
- `--row-width` on a label spans it across the fieldset's columns.
- The server judges a stored value: `aria-invalid="true"` on the control,
  the message in its `small`.
- A record's form is the edit card: a pencil unlocks, Cancel is a native
  `type="reset"`, Save posts.
- `@post(url, {contentType: 'form'})` sends the form's fields. No signal
  mirrors an input.
- A wizard lights the next control with `data-ui-state="guide"`.

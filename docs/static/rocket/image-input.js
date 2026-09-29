/*
 * image-input — the photo field. Prepares an image and gets out of the way.
 * Location: static/rocket/image-input.js
 * Loaded once from the base layout.
 *
 * IT DOES NOT UPLOAD. That is the whole design. Its predecessor (photo-upload)
 * owned a `fetch`, harvested sibling inputs into its own FormData, and fired a
 * custom event so the host dialog could close — three mechanisms invented to
 * work around a problem Datastar had already solved. `@post(url, {contentType:
 * 'form'})` walks to the enclosing <form>, builds a real FormData including file
 * inputs, and posts it — ⚠ PROVIDED the form declares
 * enctype="multipart/form-data"; without it the bundle flattens the body to
 * urlencoded and files silently drop (gf-52). It even runs
 * checkValidity()/reportValidity() first. So
 * the posting is Datastar's job and this element does only what Datastar cannot:
 *
 *   1. DOWNSCALE on-device, so a 12 MB phone photo never reaches a SQLite BLOB.
 *      The result is written BACK into the <input type=file> via DataTransfer,
 *      which is what makes it invisible to everything downstream — the form has
 *      a file input, the file in it just happens to be smaller now.
 *   2. READ EXIF FIRST, off the original bytes. The canvas re-encode in step 1
 *      destroys EXIF wholesale (that is also why the decode asks for
 *      imageOrientation: 'from-image' — it bakes the rotation in before the tag
 *      that described it is gone). Read after downscaling and there is nothing
 *      left to read.
 *   3. Stamp the browser's own location, kept in SEPARATE fields from the EXIF
 *      ones. See below.
 *   4. Preview.
 *
 * TWO SOURCES, NEVER MERGED. shot_* comes from the image; upload_* comes from
 * the browser at upload time. A photo taken at a bar at 6pm and uploaded from
 * the rep's couch at 11pm has a real shot location that the upload fix would
 * silently overwrite with the wrong answer, and nobody could ever tell. So a
 * missing shot_lat stays MISSING — this element never falls back from one to the
 * other, and the server stores NULL rather than a plausible substitute.
 *
 * Markup contract — the host writes the file input and the submit control; this
 * element creates the hidden metadata fields itself so call sites stay legible:
 *
 *   <form enctype="multipart/form-data" data-on:submit__prevent="@post(url, {contentType:'form'})">
 *     <image-input profile="receipt">
 *       <input type="file" name="photo" accept="image/*">
 *       <img data-ii-preview>
 *       <small data-ii-status></small>
 *     </image-input>
 *     <button type="submit">Save</button>
 *   </form>
 *
 * Attribute: profile — "photo" (default) or "receipt". See PROFILES.
 */
import { readExif } from '/static/rocket/exif.js';

// Two profiles because the content differs. A face at 1600px is generous — it is
// already wider than Instagram's 1080px feed and prints at 5.3in at 300dpi. A
// thermal receipt's line items at that size are marginal, and receipts are the
// one thing a model might later be asked to read, so they get more pixels. The
// volume difference is noise: receipts are a fraction of photo count.
const PROFILES = {
  photo: { maxEdge: 1600, quality: 0.82 },
  receipt: { maxEdge: 2400, quality: 0.88 },
};

// The metadata fields this element owns. Names match the server's FormValue
// keys 1:1 (handler.photoProvenance) — an empty string means "not known", which
// the server turns into SQL NULL rather than 0.
const META_FIELDS = ['shot_at', 'shot_lat', 'shot_lng', 'upload_lat', 'upload_lng', 'upload_acc', 'meta'];

function humanSize(n) {
  return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB';
}

async function downscale(file, maxEdge, quality) {
  let bmp;
  try {
    // from-image bakes the EXIF orientation into the pixels. It has to happen
    // here because the re-encode below drops the tag that describes it.
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (e) {
    bmp = await createImageBitmap(file);
  }
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
  if (bmp.close) bmp.close();
  return await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/jpeg', quality)
  );
}

class ImageInput extends HTMLElement {
  connectedCallback() {
    if (this._wired) return; // a morph can reconnect the host; do not double-bind
    this._fileEl = this.querySelector('input[type=file]');
    if (!this._fileEl) return;
    this._wired = true;
    this._preview = this.querySelector('[data-ii-preview]');
    // The status line is looked up in the enclosing FORM, not just inside this
    // element — it usually belongs on the submit row, beside the button, which
    // is outside. Scoping it to this.querySelector meant the size readout
    // silently never appeared whenever the layout was the sensible one. Falls
    // back to a descendant so either placement works.
    const scope = this.closest('form') || this;
    this._status = scope.querySelector('[data-ii-status]');
    this._fields = {};
    for (const name of META_FIELDS) {
      const el = document.createElement('input');
      el.type = 'hidden';
      el.name = name;
      this.appendChild(el);
      this._fields[name] = el;
    }
    this._onFile = this._onFile.bind(this);
    this._fileEl.addEventListener('change', this._onFile);
  }

  disconnectedCallback() {
    if (this._fileEl) this._fileEl.removeEventListener('change', this._onFile);
    this._wired = false;
  }

  _setStatus(t) {
    if (this._status) this._status.textContent = t;
  }

  _set(name, v) {
    if (this._fields && this._fields[name]) this._fields[name].value = v == null ? '' : String(v);
  }

  // iiReset clears the field without submitting — the trigger that opens a
  // dialog calls it, so a form abandoned half-filled does not come back holding
  // the last attempt. Public because the caller, not this element, knows when a
  // reset is meaningful.
  iiReset() {
    if (this._fileEl) this._fileEl.value = '';
    for (const name of META_FIELDS) this._set(name, '');
    if (this._preview) {
      this._preview.removeAttribute('src');
      this._preview.style.display = 'none';
    }
    this._setStatus('');
  }

  async _onFile() {
    const f = this._fileEl.files && this._fileEl.files[0];
    for (const name of META_FIELDS) this._set(name, '');
    if (!f) {
      this._setStatus('');
      return;
    }
    if (!f.type.startsWith('image/')) {
      this._setStatus('Please choose an image.');
      this._fileEl.value = '';
      return;
    }
    this._setStatus('Preparing…');

    // EXIF FIRST, off the original bytes — see the header. readExif never
    // throws and never rejects, so there is deliberately no try/catch here: a
    // PNG, a HEIC or a truncated file all come back as empty values.
    const exif = await readExif(f);
    this._set('shot_at', exif.shotAt);
    this._set('shot_lat', exif.lat);
    this._set('shot_lng', exif.lng);
    if (exif.tags && Object.keys(exif.tags).length) {
      this._set('meta', JSON.stringify(exif.tags));
    }

    const p = PROFILES[this.getAttribute('profile')] || PROFILES.photo;
    let blob;
    try {
      blob = await downscale(f, p.maxEdge, p.quality);
    } catch (e) {
      blob = f; // canvas failed (some HEIC paths) — ship the original, capped server-side
    }

    // Write the prepared image BACK into the file input, so the ordinary form
    // post carries it and nothing downstream has to know this element exists.
    // A DataTransfer is the only sanctioned way to set input.files.
    try {
      const dt = new DataTransfer();
      dt.items.add(new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' }));
      this._fileEl.files = dt.files;
    } catch (e) {
      // Ancient browser with no DataTransfer: the untouched original is still
      // in the input, so the upload still works — it is just bigger.
    }

    if (this._preview) {
      this._preview.src = URL.createObjectURL(blob);
      this._preview.style.display = '';
    }
    this._setStatus(humanSize(blob.size) + ' ready');

    // The browser's own fix, in its OWN fields. Best-effort and asynchronous:
    // if the user submits before it lands, upload_* stays empty, which is the
    // honest answer rather than a stale coordinate from a previous photo.
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this._set('upload_lat', pos.coords.latitude);
          this._set('upload_lng', pos.coords.longitude);
          this._set('upload_acc', pos.coords.accuracy);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  }
}

if (!customElements.get('image-input')) {
  customElements.define('image-input', ImageInput);
}

/**
 * exif.js — dependency-free EXIF reader for the browser.
 *
 * Contract: `readExif(fileOrBlob)` NEVER throws and NEVER rejects. Anything we
 * cannot make sense of — a PNG, a HEIC, a JPEG with no APP1, a truncated file,
 * 1KB of noise — resolves to the empty shape below. Photo upload is a side
 * quest in the user's flow; it must not be able to break the page.
 *
 * Everything here is bounded on purpose: we read a fixed prefix of the blob,
 * cap the number of tags, and bounds-check every read. A malformed offset
 * should cost us a few wasted microseconds, not a hung tab.
 */

/** EXIF lives in the first APP segments, right behind SOI. Reading an 8MB
 *  phone JPEG to find bytes that are always inside the first few KB is waste.
 *  256KB is generous headroom for images with a large embedded thumbnail. */
const MAX_READ_BYTES = 256 * 1024;

/** Hard cap on tags across all IFDs. A corrupt `count` or a self-referential
 *  IFD chain can otherwise spin; this makes the worst case trivially bounded. */
const MAX_TAGS = 200;

/** UNDEFINED blobs bigger than this are vendor payloads, not information we
 *  can render. Dropping them keeps `tags` JSON-serialisable and small. */
const MAX_UNDEFINED_BYTES = 256;

/** Tag IDs that point at a nested IFD rather than carrying a value. */
const TAG_EXIF_IFD = 0x8769;
const TAG_GPS_IFD = 0x8825;
const TAG_INTEROP_IFD = 0xa005;

const TAG_MAKERNOTE = 0x927c; // dropped unconditionally — opaque vendor blob
const TAG_USERCOMMENT = 0x9286; // dropped unless it decodes to clean ASCII

// Byte width of each TIFF type, indexed by type code. Index 0 is unused;
// anything outside 1..10 is an unknown type and the entry is skipped.
const TYPE_SIZES = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8];

// --- Tag name tables ---------------------------------------------------------
// Separate tables per IFD kind: GPS tag 0x0001 and IFD0 tag 0x0001 are
// different tags, so a single flat map would mislabel one of them.

const TIFF_TAGS = {
  0x0100: 'ImageWidth',
  0x0101: 'ImageLength',
  0x0102: 'BitsPerSample',
  0x0103: 'Compression',
  0x0106: 'PhotometricInterpretation',
  0x010e: 'ImageDescription',
  0x010f: 'Make',
  0x0110: 'Model',
  0x0111: 'StripOffsets',
  0x0112: 'Orientation',
  0x0115: 'SamplesPerPixel',
  0x011a: 'XResolution',
  0x011b: 'YResolution',
  0x011c: 'PlanarConfiguration',
  0x0128: 'ResolutionUnit',
  0x0131: 'Software',
  0x0132: 'DateTime',
  0x013b: 'Artist',
  0x013e: 'WhitePoint',
  0x013f: 'PrimaryChromaticities',
  0x0211: 'YCbCrCoefficients',
  0x0213: 'YCbCrPositioning',
  0x0214: 'ReferenceBlackWhite',
  0x8298: 'Copyright',
};

const EXIF_TAGS = {
  0x829a: 'ExposureTime',
  0x829d: 'FNumber',
  0x8822: 'ExposureProgram',
  0x8824: 'SpectralSensitivity',
  0x8827: 'ISOSpeedRatings',
  0x8830: 'SensitivityType',
  0x8832: 'RecommendedExposureIndex',
  0x9000: 'ExifVersion',
  0x9003: 'DateTimeOriginal',
  0x9004: 'DateTimeDigitized',
  0x9010: 'OffsetTime',
  0x9011: 'OffsetTimeOriginal',
  0x9012: 'OffsetTimeDigitized',
  0x9101: 'ComponentsConfiguration',
  0x9102: 'CompressedBitsPerPixel',
  0x9201: 'ShutterSpeedValue',
  0x9202: 'ApertureValue',
  0x9203: 'BrightnessValue',
  0x9204: 'ExposureBiasValue',
  0x9205: 'MaxApertureValue',
  0x9206: 'SubjectDistance',
  0x9207: 'MeteringMode',
  0x9208: 'LightSource',
  0x9209: 'Flash',
  0x920a: 'FocalLength',
  0x9214: 'SubjectArea',
  0x9286: 'UserComment',
  0x9290: 'SubSecTime',
  0x9291: 'SubSecTimeOriginal',
  0x9292: 'SubSecTimeDigitized',
  0xa000: 'FlashpixVersion',
  0xa001: 'ColorSpace',
  0xa002: 'PixelXDimension',
  0xa003: 'PixelYDimension',
  0xa004: 'RelatedSoundFile',
  0xa20b: 'FlashEnergy',
  0xa20e: 'FocalPlaneXResolution',
  0xa20f: 'FocalPlaneYResolution',
  0xa210: 'FocalPlaneResolutionUnit',
  0xa214: 'SubjectLocation',
  0xa215: 'ExposureIndex',
  0xa217: 'SensingMethod',
  0xa300: 'FileSource',
  0xa301: 'SceneType',
  0xa302: 'CFAPattern',
  0xa401: 'CustomRendered',
  0xa402: 'ExposureMode',
  0xa403: 'WhiteBalance',
  0xa404: 'DigitalZoomRatio',
  0xa405: 'FocalLengthIn35mmFilm',
  0xa406: 'SceneCaptureType',
  0xa407: 'GainControl',
  0xa408: 'Contrast',
  0xa409: 'Saturation',
  0xa40a: 'Sharpness',
  0xa40c: 'SubjectDistanceRange',
  0xa420: 'ImageUniqueID',
  0xa430: 'CameraOwnerName',
  0xa431: 'BodySerialNumber',
  0xa432: 'LensSpecification',
  0xa433: 'LensMake',
  0xa434: 'LensModel',
  0xa435: 'LensSerialNumber',
};

const GPS_TAGS = {
  0x0000: 'GPSVersionID',
  0x0001: 'GPSLatitudeRef',
  0x0002: 'GPSLatitude',
  0x0003: 'GPSLongitudeRef',
  0x0004: 'GPSLongitude',
  0x0005: 'GPSAltitudeRef',
  0x0006: 'GPSAltitude',
  0x0007: 'GPSTimeStamp',
  0x0008: 'GPSSatellites',
  0x0009: 'GPSStatus',
  0x000a: 'GPSMeasureMode',
  0x000b: 'GPSDOP',
  0x000c: 'GPSSpeedRef',
  0x000d: 'GPSSpeed',
  0x000e: 'GPSTrackRef',
  0x000f: 'GPSTrack',
  0x0010: 'GPSImgDirectionRef',
  0x0011: 'GPSImgDirection',
  0x0012: 'GPSMapDatum',
  0x0013: 'GPSDestLatitudeRef',
  0x0014: 'GPSDestLatitude',
  0x0015: 'GPSDestLongitudeRef',
  0x0016: 'GPSDestLongitude',
  0x0017: 'GPSDestBearingRef',
  0x0018: 'GPSDestBearing',
  0x0019: 'GPSDestDistanceRef',
  0x001a: 'GPSDestDistance',
  0x001b: 'GPSProcessingMethod',
  0x001c: 'GPSAreaInformation',
  0x001d: 'GPSDateStamp',
  0x001e: 'GPSDifferential',
  0x001f: 'GPSHPositioningError',
};

const INTEROP_TAGS = {
  0x0001: 'InteroperabilityIndex',
  0x0002: 'InteroperabilityVersion',
};

// --- byte reading ------------------------------------------------------------

/**
 * A bounds-checked cursor over the file bytes.
 *
 * `little` is decided once, from the TIFF header's II/MM magic, and threaded
 * through every multi-byte read. This is the classic EXIF bug: JPEG's own
 * segment framing (marker, segment length) is ALWAYS big-endian, but the TIFF
 * block inside APP1 declares its own order and may be either. Reading the TIFF
 * block with the JPEG's implicit big-endian gives you plausible-looking
 * garbage — offsets that land inside the file but on the wrong bytes — rather
 * than a clean failure, which is why it survives casual testing.
 */
class Reader {
  constructor(bytes) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.little = false;
  }

  /** True when [pos, pos+len) is entirely inside the buffer. Every accessor
   *  goes through this so a wild offset returns null instead of throwing. */
  has(pos, len) {
    return pos >= 0 && len >= 0 && pos + len <= this.view.byteLength;
  }

  u8(p) { return this.has(p, 1) ? this.view.getUint8(p) : null; }
  i8(p) { return this.has(p, 1) ? this.view.getInt8(p) : null; }
  u16(p) { return this.has(p, 2) ? this.view.getUint16(p, this.little) : null; }
  i16(p) { return this.has(p, 2) ? this.view.getInt16(p, this.little) : null; }
  u32(p) { return this.has(p, 4) ? this.view.getUint32(p, this.little) : null; }
  i32(p) { return this.has(p, 4) ? this.view.getInt32(p, this.little) : null; }

  /** Big-endian u16 — for JPEG segment framing, which is byte-order fixed. */
  u16be(p) { return this.has(p, 2) ? this.view.getUint16(p, false) : null; }
}

// --- JPEG segment scan -------------------------------------------------------

/**
 * Locate the TIFF header inside the JPEG's APP1/Exif segment.
 * Returns the absolute offset of the TIFF header ("II"/"MM"), or -1.
 *
 * We walk the marker chain rather than searching for the "Exif\0\0" string,
 * because that string can legitimately occur inside compressed scan data or a
 * thumbnail; only a marker walk tells us it is a real segment header.
 */
function findExifTiffStart(r) {
  if (r.u8(0) !== 0xff || r.u8(1) !== 0xd8) return -1; // not SOI: not a JPEG

  let p = 2;
  const end = r.view.byteLength;

  while (p + 4 <= end) {
    // Segments may be preceded by any number of 0xFF fill bytes.
    if (r.u8(p) !== 0xff) return -1; // desynchronised — refuse to guess
    while (p < end && r.u8(p) === 0xff) p++;
    const marker = r.u8(p);
    if (marker === null) return -1;
    p++;

    // SOS (0xDA) starts entropy-coded data and EOI (0xD9) ends the file;
    // no metadata segment follows either, so stop rather than scan pixels.
    if (marker === 0xda || marker === 0xd9) return -1;

    // Standalone markers (RSTn, TEM) carry no length field.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;

    const segLen = r.u16be(p); // segment length is big-endian, always
    if (segLen === null || segLen < 2) return -1;
    const dataStart = p + 2;
    const dataEnd = p + segLen;
    if (dataEnd > end) return -1; // truncated segment

    if (marker === 0xe1) {
      // APP1 may also be XMP ("http://ns.adobe.com/xap/1.0/\0"); only the
      // "Exif\0\0" identifier means a TIFF block follows.
      if (
        r.u8(dataStart) === 0x45 && r.u8(dataStart + 1) === 0x78 &&
        r.u8(dataStart + 2) === 0x69 && r.u8(dataStart + 3) === 0x66 &&
        r.u8(dataStart + 4) === 0x00 && r.u8(dataStart + 5) === 0x00
      ) {
        return dataStart + 6; // TIFF header starts right after the identifier
      }
    }
    p = dataEnd;
  }
  return -1;
}

// --- TIFF value decoding -----------------------------------------------------

/** RATIONAL/SRATIONAL as a JS number. A zero denominator is legal-looking
 *  garbage in the wild (some cameras write 0/0 for unset values); returning 0
 *  instead of Infinity/NaN keeps `tags` JSON-serialisable. */
function ratio(num, den) {
  if (num === null || den === null || den === 0) return 0;
  return num / den;
}

/** True if every byte is printable ASCII or common whitespace. Used to decide
 *  whether an UNDEFINED/UserComment payload is text we can safely surface. */
function isCleanAscii(bytes) {
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    if (c === 9 || c === 10 || c === 13) continue;
    if (c < 0x20 || c > 0x7e) return false;
  }
  return true;
}

function asciiOf(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

/**
 * Read the value of one IFD entry.
 *
 * `entry` is the absolute offset of the 12-byte entry. Layout:
 *   +0 tag (u16)  +2 type (u16)  +4 count (u32)  +8 value-or-offset (4 bytes)
 *
 * The last field is the crux of TIFF: if the value fits in 4 bytes it lives
 * INLINE there; otherwise those 4 bytes are an offset. Crucially that offset is
 * relative to the START OF THE TIFF HEADER, not to the file, the APP1 segment,
 * or the IFD — the whole TIFF block is a self-contained address space that
 * happens to be embedded in a JPEG.
 *
 * Note we do not byte-swap the inline case specially: sub-4-byte values are
 * stored left-justified in the field in file order, so reading them
 * sequentially from entry+8 with the file's byte order is correct for both
 * II and MM.
 */
function readValue(r, tiffStart, entry) {
  const type = r.u16(entry + 2);
  const count = r.u32(entry + 4);
  if (type === null || count === null) return undefined;
  if (type < 1 || type > 10) return undefined; // unknown type: cannot size it
  if (count === 0 || count > 0x10000) return undefined; // absurd count

  const size = TYPE_SIZES[type];
  const total = size * count;
  const base = total <= 4 ? entry + 8 : r.u32(entry + 8) + tiffStart;
  if (base === null || !Number.isFinite(base) || !r.has(base, total)) return undefined;

  switch (type) {
    case 2: { // ASCII — NUL-terminated, count includes the terminator
      const raw = r.bytes.subarray(base, base + count);
      let end = raw.length;
      for (let i = 0; i < raw.length; i++) {
        if (raw[i] === 0) { end = i; break; }
      }
      return asciiOf(raw.subarray(0, end)).trim();
    }
    case 7: { // UNDEFINED — opaque bytes
      if (count > MAX_UNDEFINED_BYTES) return undefined; // vendor payload
      const raw = r.bytes.subarray(base, base + count);
      // Version tags (ExifVersion "0230") are ASCII-ish; surface those as text
      // and everything else as a small byte array so it stays serialisable.
      if (isCleanAscii(raw)) return asciiOf(raw);
      return Array.from(raw);
    }
    default: {
      const out = [];
      for (let i = 0; i < count; i++) {
        const p = base + i * size;
        switch (type) {
          case 1: out.push(r.u8(p)); break;
          case 3: out.push(r.u16(p)); break;
          case 4: out.push(r.u32(p)); break;
          case 5: out.push(ratio(r.u32(p), r.u32(p + 4))); break;
          case 6: out.push(r.i8(p)); break;
          case 8: out.push(r.i16(p)); break;
          case 9: out.push(r.i32(p)); break;
          case 10: out.push(ratio(r.i32(p), r.i32(p + 4))); break;
        }
      }
      if (out.some((v) => v === null)) return undefined;
      return out.length === 1 ? out[0] : out;
    }
  }
}

// --- IFD walk ----------------------------------------------------------------

/**
 * Read one IFD into `out`, returning the offsets of any sub-IFDs it points at.
 * `ifdOffset` is relative to the TIFF header, matching how TIFF stores it.
 */
function readIfd(r, tiffStart, ifdOffset, names, out, state) {
  const pos = tiffStart + ifdOffset;
  const count = r.u16(pos);
  if (count === null || count === 0 || count > 512) return {};

  const subIfds = {};
  for (let i = 0; i < count; i++) {
    if (state.tagCount >= MAX_TAGS) break;
    const entry = pos + 2 + i * 12;
    if (!r.has(entry, 12)) break;
    const tag = r.u16(entry);
    if (tag === null) break;

    // Sub-IFD pointers are structure, not content: record and don't emit.
    if (tag === TAG_EXIF_IFD || tag === TAG_GPS_IFD || tag === TAG_INTEROP_IFD) {
      const v = readValue(r, tiffStart, entry);
      if (typeof v === 'number' && v > 0) subIfds[tag] = v;
      continue;
    }

    // MakerNote is a multi-KB proprietary structure with its own private
    // offset conventions. There is no portable way to read it and no reason
    // to carry it around, so it never reaches `tags`.
    if (tag === TAG_MAKERNOTE) continue;

    const name = names[tag];
    if (!name) continue; // unknown/vendor tag — skip rather than emit hex keys
    state.tagCount++;

    let value = readValue(r, tiffStart, entry);
    if (value === undefined) continue;

    if (tag === TAG_USERCOMMENT) {
      value = decodeUserComment(value);
      if (value === undefined) continue;
    }

    out[name] = value;
  }
  return subIfds;
}

/**
 * UserComment is UNDEFINED with an 8-byte character-code prefix
 * ("ASCII\0\0\0", "UNICODE\0", "JIS\0\0\0\0\0", or eight NULs for unknown).
 * We only surface it when the payload is clean ASCII; anything else is dropped
 * rather than mojibake'd into `tags`.
 */
function decodeUserComment(value) {
  if (typeof value === 'string') {
    const body = value.startsWith('ASCII') ? value.slice(8) : value;
    const trimmed = body.replace(/\0+$/, '').trim();
    return trimmed === '' ? undefined : trimmed;
  }
  if (Array.isArray(value) && value.length > 8) {
    const head = asciiOf(value.slice(0, 5));
    if (head !== 'ASCII') return undefined;
    const body = value.slice(8);
    if (!isCleanAscii(body)) return undefined;
    const trimmed = asciiOf(body).replace(/\0+$/, '').trim();
    return trimmed === '' ? undefined : trimmed;
  }
  return undefined;
}

// --- derived fields ----------------------------------------------------------

/**
 * "YYYY:MM:DD HH:MM:SS" -> "YYYY-MM-DDTHH:MM:SS".
 * Deliberately NOT parsed into a Date and NOT suffixed with Z: EXIF timestamps
 * carry no zone, so stamping one on would silently shift the photo's time.
 */
function toIso(exifDate) {
  if (typeof exifDate !== 'string') return '';
  const m = exifDate.trim().match(
    /^(\d{4})[:\-](\d{2})[:\-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})/
  );
  if (!m) return '';
  const [, y, mo, d, h, mi, s] = m;
  // Reject the all-zero placeholder some devices write for "unset".
  if (y === '0000' || mo === '00' || d === '00') return '';
  if (+mo > 12 || +d > 31 || +h > 23 || +mi > 59 || +s > 60) return '';
  return `${y}-${mo}-${d}T${h}:${mi}:${s}`;
}

/**
 * GPSLatitude/GPSLongitude are 3 RATIONALs — degrees, minutes, seconds — and
 * are always POSITIVE. The hemisphere lives in the separate *Ref tag. If the
 * ref is missing we return null rather than assuming N/E: a wrong hemisphere
 * is a worse failure than no coordinate at all.
 */
function toDecimal(dms, ref, negativeRef) {
  if (!Array.isArray(dms) || dms.length < 2) return null;
  if (typeof ref !== 'string' || ref.length === 0) return null;
  const [d, m, s = 0] = dms;
  if (![d, m, s].every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
  let deg = d + m / 60 + s / 3600;
  if (!Number.isFinite(deg)) return null;
  if (ref.trim().toUpperCase().charAt(0) === negativeRef) deg = -deg;
  return deg;
}

// --- entry point -------------------------------------------------------------

function emptyResult() {
  return { shotAt: '', lat: null, lng: null, tags: {} };
}

/**
 * Parse EXIF from a File/Blob.
 *
 * Resolves — always. Callers get a fully-shaped object even for a PNG or a
 * pile of random bytes, so they never need a try/catch around this.
 */
export async function readExif(fileOrBlob) {
  const result = emptyResult();
  try {
    if (!fileOrBlob || typeof fileOrBlob.slice !== 'function') return result;

    // Only the head of the file: EXIF is always near the front.
    const head = fileOrBlob.slice(0, MAX_READ_BYTES);
    const buf = await head.arrayBuffer();
    const bytes = new Uint8Array(buf);
    if (bytes.length < 16) return result;

    const r = new Reader(bytes);
    const tiffStart = findExifTiffStart(r);
    if (tiffStart < 0) return result;

    // Byte order magic: 0x4949 "II" (Intel, little-endian) or 0x4D4D "MM"
    // (Motorola, big-endian). Decided here once and used for every subsequent
    // multi-byte read in the TIFF block.
    const order = r.u16be(tiffStart);
    if (order === 0x4949) r.little = true;
    else if (order === 0x4d4d) r.little = false;
    else return result;

    // 42 is the TIFF magic; it also confirms we picked the right byte order.
    if (r.u16(tiffStart + 2) !== 42) return result;

    const ifd0Offset = r.u32(tiffStart + 4);
    if (ifd0Offset === null || ifd0Offset < 8) return result;

    const tags = result.tags;
    const state = { tagCount: 0 };

    // IFD0. We deliberately do NOT follow the next-IFD pointer to IFD1: that
    // is the embedded thumbnail's directory and its tags would just shadow the
    // main image's with smaller, misleading values.
    const subs = readIfd(r, tiffStart, ifd0Offset, TIFF_TAGS, tags, state);

    // Exif SubIFD (0x8769) — where the interesting capture metadata lives.
    const gps = {};
    if (subs[TAG_EXIF_IFD] !== undefined) {
      const exifSubs = readIfd(r, tiffStart, subs[TAG_EXIF_IFD], EXIF_TAGS, tags, state);
      // The GPS pointer normally sits in IFD0, but some writers put it (or an
      // Interop pointer) in the SubIFD; accept either without recursing.
      if (exifSubs[TAG_GPS_IFD] !== undefined && subs[TAG_GPS_IFD] === undefined) {
        subs[TAG_GPS_IFD] = exifSubs[TAG_GPS_IFD];
      }
      if (exifSubs[TAG_INTEROP_IFD] !== undefined) {
        readIfd(r, tiffStart, exifSubs[TAG_INTEROP_IFD], INTEROP_TAGS, tags, state);
      }
    }

    // GPS IFD (0x8825) — read into its own object first so we can derive
    // lat/lng, then merged into tags.
    if (subs[TAG_GPS_IFD] !== undefined) {
      readIfd(r, tiffStart, subs[TAG_GPS_IFD], GPS_TAGS, gps, state);
      Object.assign(tags, gps);
    }

    result.lat = toDecimal(gps.GPSLatitude, gps.GPSLatitudeRef, 'S');
    result.lng = toDecimal(gps.GPSLongitude, gps.GPSLongitudeRef, 'W');
    // A coordinate is only meaningful as a pair; half of one is noise.
    if (result.lat === null || result.lng === null) {
      result.lat = null;
      result.lng = null;
    }

    result.shotAt =
      toIso(tags.DateTimeOriginal) ||
      toIso(tags.DateTimeDigitized) ||
      toIso(tags.DateTime);

    return result;
  } catch (_err) {
    // Failing soft is the contract. Return whatever we managed to collect.
    return result;
  }
}

export default readExif;

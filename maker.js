// Any image -> die-cut sticker. Port of Cursor-Companion's ImageCleaner.
const OUT = 360, WORK = 900;
let lib = null;

export async function makeSticker(file, { keepBg = false, onStatus = () => {} } = {}) {
  let c = toCanvas(await createImageBitmap(file), keepBg ? OUT : WORK);
  if (!keepBg) {
    if (!flatLightBorder(c)) {
      try {
        const cut = await lift(file, onStatus);
        c = toCanvas(await createImageBitmap(cut), WORK);
      } catch (e) {
        console.warn('subject cut-out failed, using flat clean', e);
      }
    }
    onStatus('trimming the edges…');
    c = clean(c);
    if (!c) throw new Error('nothing was left after removing the background');
  }
  const webp = c.toDataURL('image/webp', 0.9);
  return webp.startsWith('data:image/webp') ? webp : c.toDataURL('image/png');
}

function toCanvas(src, max) {
  const k = Math.min(1, max / Math.max(src.width, src.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(src.width * k));
  c.height = Math.max(1, Math.round(src.height * k));
  c.getContext('2d', { willReadFrequently: true }).drawImage(src, 0, 0, c.width, c.height);
  return c;
}

// Busy photos: in-browser AI cut-out (the web stand-in for Apple Vision subject lifting).
async function lift(file, onStatus) {
  onStatus('finding the subject…');
  lib ??= import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm').catch(e => { lib = null; throw e; });
  const { removeBackground } = await lib;
  return removeBackground(file, {
    model: 'isnet_quint8',
    output: { format: 'image/png' },
    progress: (k, cur, total) => k.startsWith('fetch') && total && onStatus(`getting the magic scissors (first time only) ${Math.round((cur / total) * 100)}%`),
  });
}

export function flatLightBorder(c) {
  const s = document.createElement('canvas');
  s.width = s.height = 64;
  const ctx = s.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(c, 0, 0, 64, 64);
  const px = ctx.getImageData(0, 0, 64, 64).data;
  let ok = 0, total = 0;
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    if (x && y && x < 63 && y < 63) continue;
    const i = (y * 64 + x) * 4, r = px[i], g = px[i + 1], b = px[i + 2];
    total++;
    if (px[i + 3] < 20 || (Math.min(r, g, b) > 178 && Math.max(r, g, b) - Math.min(r, g, b) < 26)) ok++;
  }
  return ok / total > 0.7;
}

export function clean(c) {
  const w = c.width, h = c.height, n = w * h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, w, h), px = img.data;
  const alpha = new Uint8ClampedArray(n);
  let transparent = 0;
  for (let i = 0; i < n; i++) { alpha[i] = px[i * 4 + 3]; if (alpha[i] < 10) transparent++; }

  // White or fake-checkerboard backgrounds.
  if (transparent / n < 0.05) {
    const light = new Uint8Array(n), grey = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      light[i] = mn > 178 && mx - mn < 26 ? 1 : 0;
      grey[i] = light[i] && (r + g + b) / 3 < 242 ? 1 : 0;
    }
    // Seal hairline gaps in outlines before flood filling.
    const barrier = dilate(light.map(v => 1 - v), w, h, 3);
    const sealed = light.map((v, i) => (v && !barrier[i] ? 1 : 0));
    const [labels, count] = label(sealed, w, h);
    const size = new Int32Array(count + 1), greys = new Int32Array(count + 1), border = new Uint8Array(count + 1);
    for (let i = 0; i < n; i++) {
      const l = labels[i];
      if (!l) continue;
      size[l]++;
      if (grey[i]) greys[l]++;
      const x = i % w, y = (i / w) | 0;
      if (!x || !y || x === w - 1 || y === h - 1) border[l] = 1;
    }
    const core = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const l = labels[i];
      if (l && (border[l] || (size[l] > 40 && greys[l] / size[l] > 0.22))) core[i] = 1;
    }
    const grown = dilate(core, w, h, 3);
    const bg = grown.map((v, i) => (v && light[i] ? 1 : 0));
    const near = dilate(bg, w, h, 2);
    for (let i = 0; i < n; i++) {
      if (bg[i]) { alpha[i] = 0; continue; }
      alpha[i] = 255;
      if (near[i]) {
        const lum = (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 3;
        alpha[i] = Math.max(0, Math.min(1, (250 - lum) / 110)) * 255;
      }
    }
  }

  // Keep the main body; drop stray sparkles and specks.
  const [labels, count] = label(alpha.map(a => (a > 10 ? 1 : 0)), w, h);
  if (count > 1) {
    const size = new Int32Array(count + 1);
    for (let i = 0; i < n; i++) size[labels[i]]++;
    size[0] = 0;
    const biggest = Math.max(...size);
    for (let i = 0; i < n; i++) if (labels[i] && size[labels[i]] < biggest * 0.04) alpha[i] = 0;
  }

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (alpha[y * w + x] > 8) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  if (maxX < minX) return null;
  for (let i = 0; i < n; i++) px[i * 4 + 3] = alpha[i];
  ctx.putImageData(img, 0, 0);

  const cw = maxX - minX + 1, ch = maxY - minY + 1, k = OUT / Math.max(cw, ch);
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(cw * k));
  out.height = Math.max(1, Math.round(ch * k));
  const o = out.getContext('2d');
  o.imageSmoothingQuality = 'high';
  o.drawImage(c, minX, minY, cw, ch, 0, 0, out.width, out.height);
  return out;
}

// Square max-filter, separable.
function dilate(m, w, h, r) {
  const tmp = new Uint8Array(m.length), out = new Uint8Array(m.length);
  for (let y = 0; y < h; y++) {
    let run = -1e9;
    for (let x = 0; x < w; x++) { if (m[y * w + x]) run = x; if (x - run <= r) tmp[y * w + x] = 1; }
    run = 1e9;
    for (let x = w - 1; x >= 0; x--) { if (m[y * w + x]) run = x; if (run - x <= r) tmp[y * w + x] = 1; }
  }
  for (let x = 0; x < w; x++) {
    let run = -1e9;
    for (let y = 0; y < h; y++) { if (tmp[y * w + x]) run = y; if (y - run <= r) out[y * w + x] = 1; }
    run = 1e9;
    for (let y = h - 1; y >= 0; y--) { if (tmp[y * w + x]) run = y; if (run - y <= r) out[y * w + x] = 1; }
  }
  return out;
}

// 4-connected component labelling.
function label(m, w, h) {
  const labels = new Int32Array(m.length), stack = [];
  let next = 0;
  for (let s = 0; s < m.length; s++) {
    if (!m[s] || labels[s]) continue;
    labels[s] = ++next;
    stack.push(s);
    while (stack.length) {
      const i = stack.pop(), x = i % w;
      if (x > 0 && m[i - 1] && !labels[i - 1]) { labels[i - 1] = next; stack.push(i - 1); }
      if (x < w - 1 && m[i + 1] && !labels[i + 1]) { labels[i + 1] = next; stack.push(i + 1); }
      if (i >= w && m[i - w] && !labels[i - w]) { labels[i - w] = next; stack.push(i - w); }
      if (i < w * (h - 1) && m[i + w] && !labels[i + w]) { labels[i + w] = next; stack.push(i + w); }
    }
  }
  return [labels, next];
}

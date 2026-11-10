// Illustrated flowers as SVG strings, plus growth stages for the garden.
export const COLORS = {
  red: '#E0314B', pink: '#FF8DB5', blush: '#FFC4D6', white: '#FFF7F2', yellow: '#FFD23F', orange: '#FF8F3C',
  peach: '#FFB394', coral: '#FF6F61', purple: '#9B6DF0', lilac: '#C7A6FF', magenta: '#D93B8C', blue: '#6FA3FF',
};
export const KINDS = {
  rose: { name: 'Rose', colors: ['red', 'pink', 'white', 'yellow', 'peach', 'purple'] },
  tulip: { name: 'Tulip', colors: ['red', 'pink', 'yellow', 'purple', 'orange', 'white'] },
  lily: { name: 'Lily', colors: ['white', 'pink', 'orange', 'yellow'] },
  daisy: { name: 'Daisy', colors: ['white', 'pink', 'yellow', 'lilac'] },
  sunflower: { name: 'Sunflower', colors: ['yellow', 'orange'] },
  sakura: { name: 'Cherry blossom', colors: ['blush', 'white'] },
  peony: { name: 'Peony', colors: ['pink', 'coral', 'white', 'magenta'] },
  lavender: { name: 'Lavender', colors: ['purple', 'lilac'] },
  hibiscus: { name: 'Hibiscus', colors: ['red', 'pink', 'orange', 'yellow'] },
};

let uid = 0;
const mix = (hex, to, t) => {
  const a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16);
  const c = [16, 8, 0].map(s => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
};
const light = (h, t) => mix(h, '#ffffff', t);
const dark = (h, t) => mix(h, '#2a0a12', t);
const ring = (n, fn, off = 0) => Array.from({ length: n }, (_, i) => fn(off + (i * 360) / n, i)).join('');
const svg = (body, defs) => `<svg viewBox="0 0 100 130" aria-hidden="true"><defs>${defs}</defs>${body}</svg>`;
const radial = (id, stops, attrs = '') => `<radialGradient id="${id}" ${attrs}>${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</radialGradient>`;
const linear = (id, stops, y = true) => `<linearGradient id="${id}" x1="0" y1="0" x2="${y ? 0 : 1}" y2="${y ? 1 : 0}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;

function stem(id, top = 70, leaves = true) {
  const g = `${id}s`;
  return {
    defs: linear(g, [[0, '#7BC67E'], [1, '#3E8E4A']], false),
    body: `<path d="M50 ${top} C47 ${top + 20} 54 ${top + 38} 51 128" stroke="#4E9A55" stroke-width="3.2" fill="none" stroke-linecap="round"/>`
      + (leaves ? `<path d="M51 104 C38 96 28 100 22 108 C34 112 44 110 51 104Z" fill="url(#${g})"/><path d="M51 112 C62 102 74 104 80 110 C70 118 58 117 51 112Z" fill="url(#${g})"/>` : ''),
  };
}

const HEADS = {
  rose(c, id) {
    const g = id + 'p';
    const defs = radial(g, [[0, light(c, 0.35)], [0.6, c], [1, dark(c, 0.3)]]);
    const edge = dark(c, 0.4);
    const body = ring(5, a => `<ellipse cx="50" cy="25" rx="17" ry="21" transform="rotate(${a} 50 45)" fill="url(#${g})" stroke="${edge}" stroke-width=".7"/>`)
      + ring(5, a => `<ellipse cx="50" cy="32" rx="13" ry="15" transform="rotate(${a} 50 45)" fill="url(#${g})" stroke="${edge}" stroke-width=".7"/>`, 36)
      + `<circle cx="50" cy="45" r="12" fill="${dark(c, 0.12)}" stroke="${edge}" stroke-width=".7"/>`
      + `<path d="M42 45 a8 8 0 1 1 8 8 a5.5 5.5 0 1 1 -5.5 -5.5 a3 3 0 1 1 3 3" fill="none" stroke="${dark(c, 0.45)}" stroke-width="1.3" stroke-linecap="round"/>`;
    return { defs, body };
  },
  tulip(c, id) {
    const g = id + 'p';
    const defs = linear(g, [[0, light(c, 0.3)], [0.55, c], [1, dark(c, 0.3)]]);
    const edge = dark(c, 0.35);
    const body = `<path d="M50 18 C30 24 30 56 50 72 C70 56 70 24 50 18Z" fill="${dark(c, 0.15)}"/>`
      + `<path d="M50 74 C28 68 22 38 30 16 C40 28 47 42 50 74Z" fill="url(#${g})" stroke="${edge}" stroke-width=".7"/>`
      + `<path d="M50 74 C72 68 78 38 70 16 C60 28 53 42 50 74Z" fill="url(#${g})" stroke="${edge}" stroke-width=".7"/>`
      + `<path d="M50 76 C37 62 37 34 50 22 C63 34 63 62 50 76Z" fill="url(#${g})" stroke="${edge}" stroke-width=".7"/>`
      + `<path d="M50 30 C47 40 47 54 49 66" stroke="${light(c, 0.45)}" stroke-width="1.4" fill="none" opacity=".7"/>`;
    return { defs, body, top: 74 };
  },
  lily(c, id) {
    const g = id + 'p';
    const defs = radial(g, [[0, light(c, 0.55)], [0.5, light(c, 0.15)], [1, c]]);
    const edge = dark(c, 0.3), spot = dark(c, 0.5);
    const petal = a => `<path d="M50 45 C40 32 42 12 50 3 C58 12 60 32 50 45Z" transform="rotate(${a} 50 45)" fill="url(#${g})" stroke="${edge}" stroke-width=".7"/>`
      + `<path d="M50 40 L50 14" transform="rotate(${a} 50 45)" stroke="${dark(c, 0.15)}" stroke-width="1" opacity=".6"/>`
      + `<circle cx="48" cy="30" r=".9" fill="${spot}" transform="rotate(${a} 50 45)"/><circle cx="52" cy="24" r=".8" fill="${spot}" transform="rotate(${a} 50 45)"/>`;
    const body = ring(3, petal, 30) + ring(3, petal, 90)
      + ring(6, a => `<path d="M50 45 Q52 34 50 26" transform="rotate(${a} 50 45)" stroke="#C9D36A" stroke-width="1" fill="none"/><ellipse cx="50" cy="25" rx="1.6" ry="2.8" fill="#C0572B" transform="rotate(${a} 50 45)"/>`, 15)
      + `<circle cx="50" cy="45" r="3.2" fill="#B9CF6A"/>`;
    return { defs, body };
  },
  daisy(c, id) {
    const g = id + 'c';
    const defs = radial(g, [[0, '#FFE680'], [0.7, '#F4B400'], [1, '#C98500']]);
    const petals = c === COLORS.yellow ? '#FFF3B0' : c;
    const body = ring(18, a => `<ellipse cx="50" cy="23" rx="4.6" ry="17" transform="rotate(${a} 50 45)" fill="${petals}" stroke="${dark(petals, 0.25)}" stroke-width=".6"/>`, 10)
      + ring(18, a => `<ellipse cx="50" cy="25" rx="4" ry="15" transform="rotate(${a} 50 45)" fill="${light(petals, 0.4)}" stroke="${dark(petals, 0.2)}" stroke-width=".5"/>`)
      + `<circle cx="50" cy="45" r="10" fill="url(#${g})"/>`
      + ring(10, a => `<circle cx="50" cy="39.5" r=".9" fill="#A86A00" transform="rotate(${a} 50 45)"/>`);
    return { defs, body };
  },
  sunflower(c, id) {
    const g = id + 'p', s = id + 'c';
    const defs = linear(g, [[0, light(c, 0.35)], [1, dark(c, 0.15)]]) + radial(s, [[0, '#6B3E1E'], [0.8, '#4A2812'], [1, '#2E180A']]);
    const petal = a => `<path d="M50 45 C44 32 45 14 50 4 C55 14 56 32 50 45Z" transform="rotate(${a} 50 45)" fill="url(#${g})" stroke="${dark(c, 0.35)}" stroke-width=".6"/>`;
    let seeds = '';
    for (let i = 1; i < 70; i++) {
      const r = 1.85 * Math.sqrt(i), t = i * 2.39996;
      seeds += `<circle cx="${(50 + r * Math.cos(t)).toFixed(2)}" cy="${(45 + r * Math.sin(t)).toFixed(2)}" r=".8" fill="#9B6A2E" opacity=".75"/>`;
    }
    const body = ring(16, petal, 11) + ring(16, petal) + `<circle cx="50" cy="45" r="16" fill="url(#${s})"/>` + seeds;
    return { defs, body };
  },
  sakura(c, id) {
    const g = id + 'p';
    const defs = radial(g, [[0, '#FF9CBD'], [0.35, light(c, 0.2)], [1, c]]);
    const body = ring(5, a => `<path d="M50 45 C37 37 36 15 46 11 L50 17 L54 11 C64 15 63 37 50 45Z" transform="rotate(${a} 50 45)" fill="url(#${g})" stroke="${dark(c, 0.25)}" stroke-width=".7"/>`)
      + ring(10, a => `<path d="M50 45 L50 33" transform="rotate(${a} 50 45)" stroke="#E0517F" stroke-width=".8"/><circle cx="50" cy="32.5" r="1.2" fill="#F2B33D" transform="rotate(${a} 50 45)"/>`, 18)
      + `<circle cx="50" cy="45" r="3" fill="#E0517F"/>`;
    return { defs, body };
  },
  peony(c, id) {
    const g = id + 'p';
    const defs = radial(g, [[0, light(c, 0.45)], [0.7, c], [1, dark(c, 0.22)]]);
    const edge = dark(c, 0.3);
    const blob = (r, d, a) => `<circle cx="50" cy="${45 - d}" r="${r}" transform="rotate(${a} 50 45)" fill="url(#${g})" stroke="${edge}" stroke-width=".6"/>`;
    const body = ring(9, a => blob(13, 22, a)) + ring(8, a => blob(12, 14, a), 20) + ring(6, a => blob(9.5, 7, a), 10) + ring(4, a => blob(6.5, 2.5, a), 45);
    return { defs, body };
  },
  lavender(c, id) {
    const g = id + 'p';
    const defs = radial(g, [[0, light(c, 0.35)], [1, dark(c, 0.2)]]);
    let body = `<path d="M50 72 L50 12" stroke="#5E9A5A" stroke-width="2.4"/>`;
    for (let i = 0; i < 13; i++) {
      const y = 70 - i * 4.4, s = 1 - i * 0.045;
      body += `<ellipse cx="${45 - s * 2}" cy="${y}" rx="${6.6 * s}" ry="${4.4 * s}" transform="rotate(-25 45 ${y})" fill="url(#${g})"/>`
        + `<ellipse cx="${55 + s * 2}" cy="${y - 2}" rx="${6.6 * s}" ry="${4.4 * s}" transform="rotate(25 55 ${y - 2})" fill="url(#${g})"/>`
        + `<ellipse cx="50" cy="${y - 3.5}" rx="${4.6 * s}" ry="${3.6 * s}" fill="url(#${g})"/>`;
    }
    return { defs, body, top: 72 };
  },
  hibiscus(c, id) {
    const g = id + 'p';
    const defs = radial(g, [[0, dark(c, 0.55)], [0.2, dark(c, 0.2)], [0.5, c], [1, light(c, 0.3)]], 'gradientUnits="userSpaceOnUse" cx="50" cy="45" r="40"');
    const body = ring(5, a => `<path d="M50 45 C30 40 22 14 40 7 C47 4 55 5 60 9 C74 18 64 40 50 45Z" transform="rotate(${a} 50 45)" fill="url(#${g})" stroke="${dark(c, 0.3)}" stroke-width=".7"/>`)
      + `<path d="M50 45 Q60 34 70 18" stroke="${light(c, 0.3)}" stroke-width="2" fill="none"/>`
      + ring(6, (a, i) => `<circle cx="${70 + Math.cos(a) * 3}" cy="${18 + Math.sin(a) * 3}" r="1.6" fill="#FFD23F"/>`);
    return { defs, body };
  },
};

export function flowerSVG(kind, colorKey) {
  const c = COLORS[colorKey] || COLORS.pink, id = `f${++uid}`, head = (HEADS[kind] || HEADS.rose)(c, id);
  const st = stem(id, head.top || 66);
  return svg(st.body + head.body, st.defs + head.defs);
}

// Garden stages: 0 seed, 1 sprout, 2 leafy, 3 bud, 4 bloom.
export function plantSVG(kind, colorKey, stage) {
  if (stage >= 4) return flowerSVG(kind, colorKey);
  const c = COLORS[colorKey] || COLORS.pink, id = `g${++uid}`;
  const leaf = (x, y, flip, s = 1) => `<path d="M${x} ${y} c${-12 * s * flip} -6 ${-20 * s * flip} -2 ${-24 * s * flip} 6 c${10 * s * flip} 5 ${18 * s * flip} 3 ${24 * s * flip} -6Z" fill="#5DB566" stroke="#3E8E4A" stroke-width=".6"/>`;
  if (stage === 0) return svg(`<ellipse cx="50" cy="124" rx="9" ry="5.5" fill="#8A5A3B"/><ellipse cx="48" cy="122" rx="3" ry="2" fill="#B07D57"/>`, '');
  const top = stage === 1 ? 108 : stage === 2 ? 84 : 58;
  let body = `<path d="M50 128 C49 ${(128 + top) / 2} 51 ${top + 8} 50 ${top}" stroke="#4E9A55" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  body += stage === 1 ? leaf(50, 110, 1, 0.6) + leaf(50, 110, -1, 0.6) : leaf(51, 106, 1) + leaf(51, 114, -1) + (stage === 3 ? leaf(50, 88, 1, 0.8) : leaf(50, 92, -1, 0.7));
  if (stage === 3) {
    body += `<path d="M50 ${top + 2} C40 ${top - 6} 42 ${top - 26} 50 ${top - 30} C58 ${top - 26} 60 ${top - 6} 50 ${top + 2}Z" fill="url(#${id}b)" stroke="${dark(c, 0.35)}" stroke-width=".7"/>`
      + `<path d="M50 ${top + 3} C44 ${top} 42 ${top - 8} 44 ${top - 14} M50 ${top + 3} C56 ${top} 58 ${top - 8} 56 ${top - 14}" stroke="#4E9A55" stroke-width="2.2" fill="none"/>`;
  }
  return svg(body, linear(`${id}b`, [[0, light(c, 0.3)], [1, dark(c, 0.2)]]));
}

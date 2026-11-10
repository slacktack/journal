// Soft generative ambient: slow pad chords plus wind-chime notes, made live with Web Audio.
let ctx = null, master = null, bus = null, timers = [], on = false;
const BASE = 196; // G3
const hz = semi => BASE * 2 ** (semi / 12);
const CHORDS = [[0, 4, 7, 11], [-3, 0, 4, 7], [-7, -3, 0, 4], [-5, -1, 2, 7]];
const CHIMES = [12, 14, 16, 19, 21, 24, 26, 28, 31];

function tone(freq, start, len, vol, type = 'sine', attack = 2.5) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + len);
  o.connect(g).connect(bus);
  o.start(start); o.stop(start + len + 0.1);
}

function chords(i = 0) {
  if (!on) return;
  const t = ctx.currentTime + 0.05;
  for (const s of CHORDS[i % CHORDS.length]) { tone(hz(s), t, 10, 0.035); tone(hz(s) * 2.003, t, 10, 0.012, 'triangle'); }
  timers.push(setTimeout(() => chords(i + 1), 8000));
}

function chimes() {
  if (!on) return;
  if (Math.random() < 0.7) {
    const f = hz(CHIMES[Math.floor(Math.random() * CHIMES.length)]), t = ctx.currentTime + 0.02;
    tone(f, t, 3.2, 0.05, 'sine', 0.01);
    tone(f * 2, t, 1.6, 0.012, 'sine', 0.01);
  }
  timers.push(setTimeout(chimes, 700 + Math.random() * 1400));
}

export function startMusic() {
  ctx ??= new (window.AudioContext || window.webkitAudioContext)();
  ctx.resume();
  if (on) return;
  on = true;
  master = ctx.createGain();
  master.gain.setValueAtTime(0, ctx.currentTime);
  master.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 3);
  const delay = ctx.createDelay(), fb = ctx.createGain(), lp = ctx.createBiquadFilter();
  delay.delayTime.value = 0.43; fb.gain.value = 0.42; lp.type = 'lowpass'; lp.frequency.value = 2400;
  bus = ctx.createGain();
  bus.connect(master); bus.connect(delay);
  delay.connect(lp).connect(fb).connect(delay);
  lp.connect(master);
  master.connect(ctx.destination);
  chords(); chimes();
}

export function stopMusic() {
  if (!on) return;
  on = false;
  timers.forEach(clearTimeout); timers = [];
  const m = master;
  m.gain.cancelScheduledValues(ctx.currentTime);
  m.gain.setValueAtTime(m.gain.value, ctx.currentTime);
  m.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
  setTimeout(() => m.disconnect(), 1000);
}

import { makeSticker } from './maker.js';
import { PHOTOS, photo, photoImg, plantImg, GROWABLE } from './flowers.js';
import { startMusic, stopMusic } from './music.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const shift = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const pick = a => a[Math.floor(Math.random() * a.length)];
const mobile = () => matchMedia('(max-width: 920px)').matches;
const HEX = /^#[0-9a-f]{6}$/i;
const local = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
};

const BOARD = 'moodboard';
const THEMES = [
  { id: 'kitty', name: 'Hello Kitty', buddy: 'hellokitty/image-copy-9.png' },
  { id: 'cinna', name: 'Cinnamoroll', buddy: 'cinnamoroll/image.png' },
  { id: 'custard', name: 'Custard', buddy: 'hellokitty/image-copy-10.png' },
  { id: 'night', name: 'Starry night', buddy: 'cinnamoroll/image-copy-2.png' },
  { id: 'rose', name: 'Rose garden', buddy: 'hellokitty/image-copy-15.png' },
];
const MOODS = [['happy', '😊', '#FFD84D'], ['love', '🥰', '#FF8FB8'], ['calm', '😌', '#8FD6B4'], ['sad', '😢', '#8FBAFF'], ['grumpy', '😤', '#FF9A7A'], ['sleepy', '😴', '#B9A3FF']];
const WEATHER = [['☀️', 'sunny'], ['⛅', 'cloudy'], ['🌧️', 'rainy'], ['⛈️', 'stormy'], ['❄️', 'snowy'], ['🌈', 'rainbow']];
const PAPERS = [['lined', 'Lined'], ['dots', 'Dotted'], ['grid', 'Grid'], ['hearts', 'Hearts'], ['plain', 'Plain']];
const FONTS = ['Gaegu', 'Caveat', 'Patrick Hand', 'Yomogi', 'Indie Flower', 'Kalam', 'Mali', 'Sniglet'];
const SIZES = [['s', 'Small', 21, 30], ['m', 'Medium', 24, 34], ['l', 'Big', 28, 40]];
const INKS = [['', 'Theme ink'], ['#E8558B', 'Pink'], ['#3A7BD5', 'Blue'], ['#8B5CF6', 'Purple'], ['#2F9E6E', 'Green'], ['#B5651D', 'Caramel'], ['#222222', 'Black']];
const BGS = [['gingham', 'Gingham'], ['dots', 'Dots'], ['stripes', 'Stripes'], ['hearts', 'Hearts'], ['grid', 'Grid'], ['plain', 'Plain']];
const HABITS = [['water', '💧', 'Water'], ['sleep', '😴', 'Sleep'], ['skin', '🧴', 'Skincare'], ['move', '🏃‍♀️', 'Move'], ['read', '📖', 'Read'], ['veggies', '🥦', 'Veggies'], ['vitamins', '💊', 'Vitamins'], ['nospend', '💸', 'No spend']];
const WORD_STYLES = [['1', 'bubble'], ['2', 'note'], ['3', 'speech'], ['4', 'pop'], ['5', 'dark']];
const EMOJI = '🌹 🌷 🌺 🌻 🌼 💐 🥀 🎀 🍓 🌸 ⭐ 💖 🍰 🧁 🌈 ☁️ 🍒 🌷 🧸 🍡 🦄 🌙 ✨ 💌 🎈 🍮 🍑 🫧 🐾 💤 🍭 🌼 🎂 📷 🎧 ☕ 🧋 🍪 💅 👑 🦋 🍀 🎵'.split(' ');
const PROMPTS = [
  'What made you smile today?', 'Three tiny things you are grateful for', 'The yummiest thing you ate',
  'Describe your outfit of the day', 'Who made your day better?', 'Something you are proud of this week',
  'A song stuck in your head', 'What would make tomorrow perfect?', 'A dream you want to come true',
  'The cutest thing you saw today', 'What are you looking forward to?', 'A small win to celebrate',
  'How did you take care of yourself today?', 'One thing you learned', 'A note to future you',
];
const CHEERS = ['You are doing amazing ✨', 'Drink some water 💧', 'Proud of you ♡', 'Hi hi! 👋', 'You deserve a treat 🍰', 'Big hug 🫂', 'Stay cute 🎀'];

let key = local.get('diary-key') || '';
let settings = (() => { try { return JSON.parse(local.get('diary-look')) || {}; } catch { return {}; } })();
let BUILTIN = [], entries = {}, custom = {}, packs = {};
let entry = null, lastDay = iso(new Date()), sel = null, fresh = -1, timer = null, settingsTimer = null;
let calMonth = new Date(), wordStyle = '1', drawerTab = local.get('diary-drawer') || '';

const charImg = path => `<img src="/stickers/${esc(path)}" alt="" loading="lazy">`;
const buddySrc = b => (b?.startsWith('p:') ? '/stickers/' + b.slice(2) : custom[b]);
const days = () => Object.values(entries).filter(e => /^\d{4}-/.test(e.id));
const moods = () => MOODS.map(([id, e, c]) => [id, settings.moodEmoji?.[id] || e, c]);
const habits = () => (Array.isArray(settings.habits) ? settings.habits : HABITS);
const theme = () => THEMES.find(t => t.id === settings.theme) || THEMES[0];

async function api(path, opts = {}) {
  const r = await fetch('/api/' + path, { ...opts, headers: { 'content-type': 'application/json', 'x-journal-key': encodeURIComponent(key) } });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { showLock(key ? j.error : ''); throw new Error('locked'); }
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 2600);
}

/* ---------- look ---------- */

function applyLook() {
  const th = theme(), root = document.documentElement, st = root.style, c = settings.colors || {};
  root.dataset.theme = th.id;
  for (const v of ['--accent', '--desk', '--desk2', '--paper', '--panel', '--ink', '--muted', '--soft', '--line']) st.removeProperty(v);
  const paper = HEX.test(c.paper) ? c.paper : null;
  if (HEX.test(c.accent)) {
    st.setProperty('--accent', c.accent);
    st.setProperty('--soft', `color-mix(in srgb, ${c.accent} 13%, ${paper || 'var(--paper)'})`);
    st.setProperty('--line', `color-mix(in srgb, ${c.accent} 30%, ${paper || 'var(--paper)'})`);
  }
  if (HEX.test(c.desk)) { st.setProperty('--desk', c.desk); st.setProperty('--desk2', `color-mix(in srgb, ${c.desk} 35%, white)`); }
  if (paper) { st.setProperty('--paper', paper); st.setProperty('--panel', `color-mix(in srgb, ${paper} 60%, white)`); }
  if (HEX.test(c.ink)) { st.setProperty('--ink', c.ink); st.setProperty('--muted', `color-mix(in srgb, ${c.ink} 62%, ${paper || 'white'})`); }

  const bgPhoto = settings.bg === 'photo' && custom[settings.bgImage];
  document.body.dataset.bg = bgPhoto ? 'photo' : BGS.some(b => b[0] === settings.bg) ? settings.bg : 'gingham';
  document.body.style.backgroundImage = bgPhoto ? `url("${bgPhoto}")` : '';

  const src = buddySrc(settings.buddy) || '/stickers/' + th.buddy;
  $('#buddy').innerHTML = $('#lockBuddy').innerHTML = `<img src="${esc(src)}" alt="">`;
  $('#pagebarBuddy').src = src;
  const name = settings.name || 'my little diary';
  $('#brand').textContent = $('#lockName').textContent = document.title = name;
  local.set('diary-look', JSON.stringify({ ...settings, habits: undefined }));
  requestAnimationFrame(() => (document.querySelector('meta[name=theme-color]').content = getComputedStyle(document.body).getPropertyValue('--desk2').trim()));
}

function saveSettings(patch) {
  Object.assign(settings, patch);
  applyLook();
  clearTimeout(settingsTimer);
  settingsTimer = setTimeout(async () => {
    try { await api('settings', { method: 'PUT', body: JSON.stringify(settings) }); }
    catch (err) { if (err.message !== 'locked') toast('Design didn’t sync: ' + err.message); }
  }, 400);
}

/* ---------- design studio ---------- */

function renderDesign() {
  const cs = getComputedStyle(document.documentElement), c = settings.colors || {};
  const hex = (k, v) => (HEX.test(c[k]) ? c[k] : (cs.getPropertyValue(v).trim().match(/^#[0-9a-f]{6}/i)?.[0] || '#ffffff'));
  $('#diaryName').value = settings.name || '';
  $('#themeList').innerHTML = THEMES.map(t =>
    `<button class="theme-card" data-theme="${t.id}" data-pick-theme="${t.id}" aria-pressed="${t.id === theme().id && !settings.colors}"><img src="/stickers/${t.buddy}" alt="">${t.name}</button>`).join('');
  $('#c-accent').value = hex('accent', '--accent'); $('#c-desk').value = hex('desk', '--desk');
  $('#c-paper').value = hex('paper', '--paper'); $('#c-ink').value = hex('ink', '--ink');
  const photo = custom[settings.bgImage];
  $('#bgList').innerHTML = BGS.map(([v, l]) => `<button class="pv-${v}" data-bg="${v}" aria-pressed="${document.body.dataset.bg === v}">${l}</button>`).join('')
    + `<button data-bg="photo" aria-pressed="${document.body.dataset.bg === 'photo'}" style="${photo ? `background-image:url('${photo}')` : ''}">${photo ? 'My photo' : '📷 Use a photo'}</button>`
    + (photo ? `<button data-bg="newphoto">📷 New photo</button>` : '');
  const buddies = [...THEMES.map(t => ['', `/stickers/${t.buddy}`]).slice(0, 1), ...BUILTIN.flatMap(p => p.files.map(f => ['p:' + f, '/stickers/' + f])),
    ...Object.keys(custom).filter(id => !packs[id]?.startsWith('_')).map(id => [id, custom[id]])];
  $('#buddyList').innerHTML = buddies.map(([v, src]) => `<button data-buddy-pick="${esc(v)}" aria-pressed="${(settings.buddy || '') === v}" title="${v ? '' : 'Theme buddy'}"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join('');
  $('#creditList').innerHTML = PHOTOS.map(p => `<li><a href="${esc(p.page)}" target="_blank" rel="noopener">${esc(p.credit)}</a></li>`).join('');
  $('#moodEdit').innerHTML = moods().map(([id, e]) => `<input class="field" data-mood-edit="${id}" value="${esc(e)}" maxlength="8" aria-label="Face for ${id}" title="${id}">`).join('');
  $('#habitEdit').innerHTML = habits().map(([id, e, l], i) =>
    `<div><input class="field emo" data-habit-emo="${i}" value="${esc(e)}" maxlength="8" aria-label="Habit icon"><input class="field" data-habit-label="${i}" value="${esc(l)}" maxlength="16" aria-label="Habit name"><button data-habit-del="${i}" aria-label="Remove habit">✕</button></div>`).join('');
}

$('#settingsBtn').onclick = () => { renderDesign(); $('#codeShow').value = key; $('#settings').showModal(); };
$('#diaryName').oninput = e => saveSettings({ name: e.target.value.trim() });
$('#settings').addEventListener('click', e => {
  const t = e.target.closest('[data-pick-theme]')?.dataset.pickTheme;
  const bg = e.target.closest('[data-bg]')?.dataset.bg;
  const bud = e.target.closest('[data-buddy-pick]')?.dataset.buddyPick;
  const del = e.target.closest('[data-habit-del]')?.dataset.habitDel;
  if (t) { saveSettings({ theme: t, colors: undefined }); renderDesign(); }
  else if (bg === 'newphoto' || (bg === 'photo' && !custom[settings.bgImage])) $('#bgUpload').click();
  else if (bg) { saveSettings({ bg }); renderDesign(); }
  else if (bud != null) { saveSettings({ buddy: bud }); renderDesign(); }
  else if (del != null) { const h = habits().slice(); h.splice(+del, 1); saveSettings({ habits: h }); renderDesign(); renderBits(); }
});
$('#settings').addEventListener('input', e => {
  const el = e.target;
  if (el.type === 'color') { saveSettings({ colors: { ...(settings.colors || {}), [el.id.slice(2)]: el.value } }); return; }
  if (el.dataset.moodEdit) { saveSettings({ moodEmoji: { ...(settings.moodEmoji || {}), [el.dataset.moodEdit]: el.value.trim() } }); renderFeel(); }
  const hi = el.dataset.habitEmo ?? el.dataset.habitLabel;
  if (hi != null) {
    const h = habits().map(x => x.slice());
    h[+hi][el.dataset.habitEmo != null ? 1 : 2] = el.value.trim();
    saveSettings({ habits: h }); renderBits();
  }
});
$('#resetColors').onclick = () => { saveSettings({ colors: undefined }); renderDesign(); };
$('#addHabit').onclick = () => {
  saveSettings({ habits: [...habits(), ['h' + Date.now().toString(36), '⭐', 'New habit']] });
  renderDesign(); renderBits();
  $$('[data-habit-label]').at(-1)?.select();
};
$('#bgUpload').onchange = async e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    toast('Setting your background…');
    const src = await photoData(f, 1400, 0.72);
    const { id } = await api('stickers', { method: 'POST', body: JSON.stringify({ src, pack: '_backgrounds' }) });
    custom[id] = src; packs[id] = '_backgrounds';
    saveSettings({ bg: 'photo', bgImage: id }); renderDesign();
  } catch (err) { if (err.message !== 'locked') toast('Couldn’t use that photo: ' + err.message); }
};

async function photoData(file, max, q) {
  const img = await createImageBitmap(file), k = Math.min(1, max / Math.max(img.width, img.height));
  const c = Object.assign(document.createElement('canvas'), { width: Math.round(img.width * k), height: Math.round(img.height * k) });
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', q);
}

/* ---------- lock & boot ---------- */

function showLock(msg = '', step = 'code') {
  $('#app').hidden = true; $('#lock').hidden = false;
  $('#codeStep').hidden = step !== 'code'; $('#newStep').hidden = step !== 'new';
  $('#lockMsg').textContent = msg;
  if (step === 'code') { $('#pw').value = ''; $('#pw').focus(); }
}

async function boot() {
  try {
    const [e, s, st, b] = await Promise.all([api('entries'), api('stickers'), api('settings'), fetch('/stickers/packs.json').then(r => r.json()).catch(() => [])]);
    BUILTIN = b;
    if (!e.entries.length && !s.stickers.length && !st.created) return showLock('', 'new');
    entries = Object.fromEntries(e.entries.map(x => [x.id, x]));
    custom = Object.fromEntries(s.stickers.map(x => [x.id, x.src]));
    packs = Object.fromEntries(s.stickers.map(x => [x.id, x.pack || 'My stickers']));
    settings = st;
    applyLook();
    $('#lock').hidden = true; $('#app').hidden = false;
    renderStreak(); openDay(iso(new Date()));
  } catch (err) {
    if (err.message !== 'locked') { showLock(err.message); }
  }
}

/* ---------- the page ---------- */

const blank = id => ({ id, title: '', body: '', mood: '', weather: '', paper: 'lined', stickers: [], habits: [], todos: [], song: '', voice: [], ink: [], tint: '', pen: { font: 'Gaegu', size: 'm', ink: '', ...settings.pen } });

function openDay(d) {
  flush();
  if (rec) rec.mr.stop();
  if (drawing) toggleDraw(false);
  audio.pause(); playing = null;
  const board = d === BOARD;
  if (!board) lastDay = d;
  entry = { ...blank(d), ...structuredClone(entries[d] || {}) };
  sel = null; fresh = -1; select(null);
  $('#paper').classList.toggle('board', board);
  $('#title').placeholder = board ? 'My moodboard' : 'Dear diary…';
  if (!board) {
    const date = parse(d);
    $('#date').value = d;
    $('#dayNum').textContent = date.getDate();
    $('#weekday').textContent = date.toLocaleDateString(undefined, { weekday: 'long' });
    $('#monthYear').textContent = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    $('#today').hidden = d === iso(new Date());
    const hash = [...d].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
    $('#prompt').textContent = '✨ ' + PROMPTS[Math.abs(hash) % PROMPTS.length];
  }
  $('#title').value = entry.title;
  $('#body').innerHTML = cleanHTML(entry.html ?? (entry.body ? entry.body.split('\n').map(l => `<div>${esc(l) || '<br>'}</div>`).join('') : ''));
  $('#song').value = entry.song;
  $('#saved').textContent = entries[d] ? 'Saved' : '';
  applyPen(); renderFeel(); renderBits(); renderStickers(); renderDrawer(); renderVoices(); renderPageTools();
}

function applyPen() {
  const p = entry.pen, st = $('#paper').style, sz = SIZES.find(s => s[0] === p.size) || SIZES[1];
  st.setProperty('--hand', `'${FONTS.includes(p.font) ? p.font : 'Gaegu'}'`);
  st.setProperty('--fs', sz[2]); st.setProperty('--lh', sz[3]);
  INKS.some(i => i[0] && i[0] === p.ink) ? st.setProperty('--pen', p.ink) : st.removeProperty('--pen');
  TINTS.some(t => t[0] && t[0] === entry.tint) ? st.setProperty('--paper', entry.tint) : st.removeProperty('--paper');
}

function setPen(patch) {
  entry.pen = { ...entry.pen, ...patch };
  applyPen(); renderDrawer(); renderPageTools(); changed();
  saveSettings({ pen: entry.pen });
}

function renderFeel() {
  if (!entry) return;
  $('#moods').innerHTML = moods().map(([v, e]) => `<button data-mood="${v}" aria-pressed="${entry.mood === v}" title="${v}" aria-label="Mood: ${v}">${esc(e)}</button>`).join('');
  $('#weathers').innerHTML = WEATHER.map(([e, l]) => `<button data-weather="${e}" aria-pressed="${entry.weather === e}" title="${l}" aria-label="Weather: ${l}">${e}</button>`).join('');
  $('#body').className = 'body p-' + entry.paper;
}
$('.feel').onclick = e => {
  const b = e.target.closest('button');
  if (!b) return;
  const [k, v] = b.dataset.mood ? ['mood', b.dataset.mood] : ['weather', b.dataset.weather];
  entry[k] = entry[k] === v ? '' : v;
  renderFeel(); changed();
};

function renderBits() {
  if (!entry) return;
  $('#habits').innerHTML = habits().map(([v, i, l]) => `<button data-habit="${esc(v)}" aria-pressed="${entry.habits.includes(v)}"><i>${esc(i)}</i>${esc(l)}</button>`).join('')
    || '<p class="hint">Add habits in 🎨 Design.</p>';
  $('#todos').innerHTML = entry.todos.map((t, i) =>
    `<li class="${t.done ? 'done' : ''}"><input type="checkbox" data-i="${i}" ${t.done ? 'checked' : ''} aria-label="Done"><span>${esc(t.t)}</span><button data-x="${i}" aria-label="Remove task">✕</button></li>`).join('');
}
$('#habits').onclick = e => {
  const v = e.target.closest('[data-habit]')?.dataset.habit;
  if (!v) return;
  entry.habits = entry.habits.includes(v) ? entry.habits.filter(h => h !== v) : [...entry.habits, v];
  renderBits(); changed();
};
$('#todoForm').onsubmit = e => {
  e.preventDefault();
  const t = $('#todoIn').value.trim();
  if (!t) return;
  entry.todos.push({ t, done: false }); $('#todoIn').value = '';
  renderBits(); changed();
};
$('#todos').onclick = e => {
  const { i, x } = e.target.dataset;
  if (i != null) { entry.todos[i].done = e.target.checked; if (e.target.checked) toast(pick(['Yay! ✨', 'So productive 💅', 'Done and done 🎀'])); }
  else if (x != null) entry.todos.splice(x, 1);
  else return;
  renderBits(); changed();
};


function changed() {
  clearTimeout(timer);
  $('#saved').textContent = 'Editing…';
  timer = setTimeout(save, 700);
}

function flush() {
  if (timer) { clearTimeout(timer); save(); }
}

async function save() {
  timer = null;
  const e = entry;
  if (!e.title && !e.body && !e.mood && !e.weather && !e.song && !e.stickers.length && !e.habits.length && !e.todos.length && !e.voice?.length && !e.ink?.length && !entries[e.id]) return;
  e.updatedAt = Date.now();
  entries[e.id] = structuredClone(e);
  if (e === entry) $('#saved').textContent = 'Saving…';
  try {
    await api('entries', { method: 'PUT', body: JSON.stringify(e) });
    if (e === entry) $('#saved').textContent = 'Saved';
    renderStreak();
  } catch (err) {
    if (err.message === 'locked') return;
    if (e === entry) { $('#saved').textContent = 'Not saved yet, retrying…'; timer = setTimeout(save, 5000); }
    toast('Couldn’t save: ' + err.message);
  }
}

$('#title').oninput = e => { entry.title = e.target.value; changed(); };
$('#body').oninput = () => { entry.html = cleanHTML($('#body').innerHTML); entry.body = $('#body').innerText.replace(/\n{3,}/g, '\n\n').trim(); changed(); };
$('#body').addEventListener('paste', e => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); });
$('#song').oninput = e => { entry.song = e.target.value; changed(); };
$('#prompt').onclick = () => {
  const b = $('#body');
  b.insertAdjacentHTML('beforeend', `<div><b>${esc($('#prompt').textContent.slice(2))}</b></div><div><br></div>`);
  b.focus();
  const r = document.createRange(); r.selectNodeContents(b.lastChild); r.collapse(true);
  getSelection().removeAllRanges(); getSelection().addRange(r);
  b.dispatchEvent(new Event('input'));
};
$('#dayNum').onclick = () => { try { $('#date').showPicker(); } catch { $('#date').click(); } };
$('#date').onchange = e => e.target.value && openDay(e.target.value);
$('#prev').onclick = () => openDay(shift(entry.id, -1));
$('#next').onclick = () => openDay(shift(entry.id, 1));
$('#today').onclick = () => openDay(iso(new Date()));
$('#delete').onclick = async () => {
  if (!entries[entry.id] || !(await ask('Tear out this page?', 'This page and everything on it will be gone for good.', 'Tear it out'))) return;
  clearTimeout(timer); timer = null;
  try {
    await api('entries?id=' + entry.id, { method: 'DELETE' });
    delete entries[entry.id];
    openDay(entry.id); renderStreak(); toast('Page torn out');
  } catch (err) { toast(err.message); }
};
document.addEventListener('visibilitychange', () => document.hidden && flush());
document.addEventListener('focusin', e => { if (mobile() && e.target.matches('#title, #body, .bits .field')) document.body.classList.add('typing'); });
document.addEventListener('focusout', () => document.body.classList.remove('typing'));

/* ---------- voice notes ---------- */

let rec = null, playing = null;
const audio = new Audio(), voiceCache = new Map();
const clock = s => `${Math.floor(s / 60)}:${pad(Math.round(s) % 60)}`;

function renderVoices() {
  const list = entry.voice || [];
  $('#voices').innerHTML = list.map(v => `<div class="voice${playing === v.id ? ' playing' : ''}">
    <button class="vplay" data-play="${esc(v.id)}" aria-label="${playing === v.id ? 'Pause' : 'Play'} voice note">${playing === v.id ? '❚❚' : '▶'}</button>
    <span class="wave">${'<i></i>'.repeat(16)}</span><small>${clock(v.dur || 0)}</small>
    <button class="vdel" data-vdel="${esc(v.id)}" aria-label="Delete voice note">✕</button></div>`).join('');
  // Fetch ahead so a tap can play right away (iOS only allows play() inside the tap).
  for (const v of list) if (!voiceCache.has(v.id)) {
    voiceCache.set(v.id, api('voice?id=' + encodeURIComponent(v.id)).then(r => (voiceCache.set(v.id, r.src), r.src)).catch(() => (voiceCache.delete(v.id), null)));
  }
}

function setRecUI(on, t = 0) {
  $('#recBtn').classList.toggle('recording', on);
  $('#recBtn span').textContent = on ? `Stop  ${clock(t)} / 2:00` : 'Voice note';
}

$('#recBtn').onclick = async () => {
  if (rec) return rec.mr.stop();
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return toast('Recording needs the https site and a browser that can record audio.');
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch { return toast('Microphone access is blocked. Allow it in your browser settings, then try again.'); }
  const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(t => MediaRecorder.isTypeSupported(t));
  const mr = new MediaRecorder(stream, { ...(mime && { mimeType: mime }), audioBitsPerSecond: 24000 });
  const chunks = [], start = Date.now(), page = entry;
  mr.ondataavailable = e => e.data.size && chunks.push(e.data);
  mr.onstop = async () => {
    stream.getTracks().forEach(t => t.stop());
    clearInterval(rec.tick); clearTimeout(rec.cap); rec = null; setRecUI(false);
    const dur = (Date.now() - start) / 1000;
    if (dur < 1) return toast('That was too short to save.');
    const blob = new Blob(chunks, { type: mr.mimeType || chunks[0]?.type || 'audio/webm' });
    const src = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
    try {
      const { id } = await api('voice', { method: 'POST', body: JSON.stringify({ src }) });
      voiceCache.set(id, src);
      (page.voice ??= []).push({ id, dur: Math.round(dur) });
      if (page === entry) { renderVoices(); changed(); }
      else { entries[page.id] = structuredClone(page); api('entries', { method: 'PUT', body: JSON.stringify(page) }); }
      toast('Voice note saved 🎙');
    } catch (err) { if (err.message !== 'locked') toast('Couldn’t save the voice note: ' + err.message); }
  };
  mr.start(1000);
  rec = { mr, tick: setInterval(() => setRecUI(true, (Date.now() - start) / 1000), 250), cap: setTimeout(() => mr.state === 'recording' && mr.stop(), 120000) };
  setRecUI(true);
};

$('#voices').onclick = async e => {
  const p = e.target.closest('[data-play]')?.dataset.play, d = e.target.closest('[data-vdel]')?.dataset.vdel;
  if (p) {
    if (playing === p) { audio.pause(); playing = null; return renderVoices(); }
    let src = voiceCache.get(p);
    if (src instanceof Promise) src = await src;
    if (!src) return toast('Couldn’t load that voice note.');
    audio.src = src;
    audio.play().then(() => { playing = p; renderVoices(); })
      .catch(() => toast('This browser can’t play that recording format. Try it on the device that recorded it.'));
  } else if (d && (await ask('Delete this voice note?', 'You won’t be able to get it back.', 'Delete'))) {
    try { await api('voice?id=' + encodeURIComponent(d), { method: 'DELETE' }); }
    catch (err) { if (err.message === 'locked') return; }
    if (playing === d) { audio.pause(); playing = null; }
    entry.voice = entry.voice.filter(v => v.id !== d);
    renderVoices(); changed();
  }
};
audio.onended = () => { playing = null; renderVoices(); };

/* ---------- moodboard photos ---------- */

$('#boardPhoto').onclick = () => $('#boardUpload').click();
$('#boardUpload').onchange = async e => {
  const files = [...e.target.files];
  e.target.value = '';
  for (const f of files) {
    try {
      toast('Pinning your photo…');
      const src = await makeSticker(f, { keepBg: true });
      const { id } = await api('stickers', { method: 'POST', body: JSON.stringify({ src, pack: 'Moodboard photos' }) });
      custom[id] = src; packs[id] = 'Moodboard photos';
      addSticker('c:' + id, 32);
    } catch (err) { if (err.message !== 'locked') toast('Couldn’t pin that photo: ' + err.message); }
  }
  renderDrawer();
};

/* ---------- stickers on the page ---------- */

function stickerInner(code) {
  const t = code[0], v = code.slice(2);
  if (t === 'e') return esc(v);
  if (t === 'p') return charImg(v);
  if (t === 'c') return custom[v] ? `<img src="${esc(custom[v])}" alt="">` : '';
  if (t === 't') return esc(v.slice(2));
  if (t === 'r') return photoImg(v);
  return '';
}

function renderStickers() {
  $('#layer').innerHTML = inkSVG() + entry.stickers.map((s, i) => {
    const kind = s.s[0] === 'w' ? ` washi w${+s.s.slice(2)}` : s.s[0] === 't' ? ` txt txt${+s.s[2]}` : '';
    return `<div class="stk${kind}${i === sel ? ' sel' : ''}${i === fresh ? ' new' : ''}" data-i="${i}" style="--x:${+s.x};--y:${+s.y};--s:${+s.size};--r:${+s.r}deg">${stickerInner(s.s)}</div>`;
  }).join('');
  fresh = -1;
  if (entry.id === BOARD) {
    const lowest = Math.max(0, ...entry.stickers.map(s => +s.y + +s.size / 2), ...(entry.ink || []).flatMap(s => s.p.filter((_, i) => i % 2)));
    $('#paper').style.minHeight = `${Math.round((lowest * $('#layer').clientWidth) / 100) + 320}px`;
  } else $('#paper').style.minHeight = '';
}

function select(i) {
  sel = i;
  $$('.stk').forEach(n => n.classList.toggle('sel', +n.dataset.i === i));
  $('#tools').hidden = i == null;
  $('#layer').classList.toggle('editing', i != null);
  document.body.classList.toggle('editing', i != null);
}

function addSticker(code, size) {
  const r = $('#paper').getBoundingClientRect(), w = r.width / 100;
  const y = Math.max(10, Math.min((innerHeight * 0.45 - r.top) / w, r.height / w - 10));
  entry.stickers.push({ s: code, x: Math.round(35 + Math.random() * 30), y: Math.round(y), size: size || { w: 34, t: 14, p: 24, c: 22, r: 22 }[code[0]] || 13, r: Math.round(Math.random() * 24 - 12) });
  fresh = entry.stickers.length - 1;
  renderStickers(); select(fresh); changed();
  if (mobile()) closeSheets();
}

// One finger drags; two fingers pinch to resize and twist to rotate.
const pts = new Map();
let gesture = null;
const gap = () => { const [a, b] = [...pts.values()]; return [Math.hypot(b.x - a.x, b.y - a.y), (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI]; };
function startGesture() {
  const s = entry.stickers[sel];
  if (!s) return (gesture = null);
  if (pts.size >= 2) { const [d, a] = gap(); gesture = { pinch: true, d, a, size: s.size, r: s.r }; }
  else { const p = [...pts.values()][0]; gesture = { pinch: false, x: p.x, y: p.y, ox: s.x, oy: s.y }; }
}
$('#layer').addEventListener('pointerdown', e => {
  const el = e.target.closest('.stk');
  if (!el && pts.size === 0) { select(null); return; }
  e.preventDefault();
  if (el && pts.size === 0) select(+el.dataset.i);
  try { $('#layer').setPointerCapture(e.pointerId); } catch {}
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  startGesture();
});
$('#layer').addEventListener('pointermove', e => {
  if (!pts.has(e.pointerId) || !gesture) return;
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const s = entry.stickers[sel], el = $(`.stk[data-i="${sel}"]`), w = $('#layer').clientWidth / 100;
  if (!s || !el) return;
  if (gesture.pinch && pts.size >= 2) {
    const [d, a] = gap();
    s.size = Math.round(Math.max(4, Math.min(95, (gesture.size * d) / gesture.d)) * 10) / 10;
    s.r = Math.round(gesture.r + a - gesture.a);
    el.style.setProperty('--s', s.size); el.style.setProperty('--r', s.r + 'deg');
  } else if (!gesture.pinch) {
    s.x = Math.max(0, Math.min(100, Math.round((gesture.ox + (e.clientX - gesture.x) / w) * 10) / 10));
    s.y = Math.max(0, Math.round((gesture.oy + (e.clientY - gesture.y) / w) * 10) / 10);
    el.style.setProperty('--x', s.x); el.style.setProperty('--y', s.y);
  }
  gesture.moved = true;
});
const endPointer = e => {
  if (!pts.delete(e.pointerId)) return;
  const moved = gesture?.moved;
  if (pts.size) startGesture();
  else { gesture = null; if (moved) { changed(); if (entry.id === BOARD) renderStickers(), select(sel); } }
};
$('#layer').addEventListener('pointerup', endPointer);
$('#layer').addEventListener('pointercancel', endPointer);
$('#layer').addEventListener('wheel', e => {
  const el = e.target.closest('.stk');
  if (!el) return;
  e.preventDefault();
  const i = +el.dataset.i, s = entry.stickers[i];
  if (sel !== i) select(i);
  if (e.shiftKey) s.r += e.deltaY > 0 ? 5 : -5;
  else s.size = Math.max(4, Math.min(95, s.size + (e.deltaY > 0 ? -1 : 1)));
  el.style.setProperty('--s', s.size); el.style.setProperty('--r', s.r + 'deg');
  changed();
}, { passive: false });

const TOOLS = {
  smaller: s => (s.size = Math.max(4, s.size - 3)),
  bigger: s => (s.size = Math.min(95, s.size + 3)),
  left: s => (s.r -= 15),
  right: s => (s.r += 15),
  front: (s, i) => { entry.stickers.push(...entry.stickers.splice(i, 1)); sel = entry.stickers.length - 1; },
  remove: (s, i) => { entry.stickers.splice(i, 1); sel = null; },
  done: () => (sel = null),
};
$('#tools').onclick = e => {
  const t = e.target.closest('button')?.dataset.t;
  if (!t || sel == null) return;
  TOOLS[t](entry.stickers[sel], sel);
  if (t !== 'done') changed();
  renderStickers(); select(sel);
};

/* ---------- sticker drawer ---------- */

function byPack() {
  const out = {};
  for (const id in custom) if (!packs[id]?.startsWith('_')) (out[packs[id] || 'My stickers'] ??= []).push(id);
  return out;
}

function drawerTabs() {
  return [
    ...BUILTIN.map((p, i) => ({ id: 'pack' + i, label: p.name, icon: charImg(p.files[0]) })),
    { id: 'flowers', label: 'Real flowers & plants', icon: photoImg('rose-pink') },
    { id: 'mine', label: 'My stickers', icon: '⭐' },
    { id: 'words', label: 'Words', icon: 'Aa' },
    { id: 'tape', label: 'Washi tape', icon: '🎞️' },
    { id: 'emoji', label: 'Doodles', icon: '🍓' },
    { id: 'style', label: 'Pen & paper', icon: '✏️' },
  ];
}

function renderDrawer() {
  if (!entry) return;
  const tabs = drawerTabs();
  if (!tabs.some(t => t.id === drawerTab)) drawerTab = tabs[0].id;
  $('#drawerTabs').innerHTML = tabs.map(t => `<button role="tab" data-dtab="${t.id}" aria-selected="${t.id === drawerTab}" title="${esc(t.label)}" aria-label="${esc(t.label)}">${t.icon}</button>`).join('');
  $('#drawerTitle').textContent = tabs.find(t => t.id === drawerTab).label;
  const btn = (code, inner, label) => `<button class="sticker-btn" data-s="${esc(code)}" aria-label="${esc(label)}">${inner}</button>`;
  let html = '';
  if (drawerTab.startsWith('pack')) {
    const p = BUILTIN[+drawerTab.slice(4)];
    html = `<div class="sgrid big">${p.files.map(f => btn('p:' + f, charImg(f), p.name)).join('')}</div>`;
  } else if (drawerTab === 'flowers') {
    const groups = {};
    for (const p of PHOTOS) (groups[p.group] ??= []).push(p);
    html = Object.entries(groups).map(([g, list]) => `<p class="sub">${g}</p><div class="sgrid big flowers">${list.map(p => btn('r:' + p.id, photoImg(p.id), p.name)).join('')}</div>`).join('');
  } else if (drawerTab === 'mine') {
    html = Object.entries(byPack()).map(([pack, ids]) =>
      `<p class="sub">${esc(pack)}</p><div class="sgrid big">${ids.map(id => btn('c:' + id, `<img src="${esc(custom[id])}" alt="">`, pack)).join('')}</div>`).join('')
      + `<button class="make-tile" data-go="studio">+ Turn any picture into a sticker</button>`;
  } else if (drawerTab === 'words') {
    html = `<form id="wordForm" class="row-form"><input id="wordIn" class="field" placeholder="omg, bestie, yay…" maxlength="40" aria-label="Sticker text"><button class="btn small">Stick</button></form>
      <div class="word-styles">${WORD_STYLES.map(([v, l]) => `<button type="button" class="txt txt${v}" data-ws="${v}" aria-pressed="${v === wordStyle}">${l}</button>`).join('')}</div>`;
  } else if (drawerTab === 'tape') {
    html = `<div class="sgrid big">${[1, 2, 3, 4, 5, 6].map(n => btn('w:' + n, `<span class="washi w${n}"></span>`, 'Washi tape')).join('')}</div>`;
  } else if (drawerTab === 'emoji') {
    html = `<div class="sgrid">${EMOJI.map(e => btn('e:' + e, e, e)).join('')}</div>`;
  } else {
    const p = entry.pen;
    html = `<p class="sub">Handwriting</p>
      <div class="fonts">${FONTS.map(f => `<button data-pen-font="${f}" aria-pressed="${p.font === f}" style="font-family:'${f}',cursive">Dear diary<small>${f}</small></button>`).join('')}</div>
      <p class="sub">Size</p>
      <div class="sizes">${SIZES.map(([v, l, fs]) => `<button data-pen-size="${v}" aria-pressed="${p.size === v}" style="font-size:${fs - 2}px">${l}</button>`).join('')}</div>
      <p class="sub">Ink</p>
      <div class="inks">${INKS.map(([v, l]) => `<button data-pen-ink="${v}" aria-pressed="${p.ink === v}" style="--c:${v || 'var(--ink)'}" title="${l}" aria-label="${l}"></button>`).join('')}</div>
      ${entry.id === BOARD ? '' : `<p class="sub">Paper</p>
      <div class="papers">${PAPERS.map(([v, l]) => `<button class="paper-opt" data-paper="${v}" aria-pressed="${entry.paper === v}"><span class="swatch p-${v}"></span>${l}</button>`).join('')}</div>`}`;
  }
  $('#drawerBody').innerHTML = html;
}

$('#drawer').addEventListener('click', e => {
  const q = a => e.target.closest(`[${a}]`)?.getAttribute(a);
  const t = q('data-dtab'), s = q('data-s'), ws = q('data-ws'), paper = q('data-paper'), go = q('data-go');
  const font = q('data-pen-font'), size = q('data-pen-size'), ink = q('data-pen-ink');
  if (t) { drawerTab = t; local.set('diary-drawer', t); renderDrawer(); }
  else if (s) addSticker(s);
  else if (ws) { wordStyle = ws; $$('[data-ws]').forEach(b => b.setAttribute('aria-pressed', b.dataset.ws === ws)); }
  else if (paper) { entry.paper = paper; renderFeel(); renderDrawer(); renderPageTools(); changed(); }
  else if (font) setPen({ font });
  else if (size) setPen({ size });
  else if (ink != null) setPen({ ink });
  else if (go) { closeSheets(); show('studio'); }
});
$('#drawer').addEventListener('submit', e => {
  e.preventDefault();
  const t = $('#wordIn').value.trim();
  if (t) addSticker(`t:${wordStyle}:${t}`);
});

/* ---------- bottom sheets (phones) ---------- */

function openSheet(name) {
  closeSheets();
  if (name === 'draw') return toggleDraw(true);
  if (name === 'bits') $('#bits').classList.add('open');
  else {
    if (name === 'style') drawerTab = 'style';
    else if (drawerTab === 'style') drawerTab = '';
    renderDrawer();
    $('#drawer').classList.add('open');
  }
  $('#scrim').hidden = false;
}
function closeSheets() {
  $$('.sheet').forEach(s => { s.classList.remove('open'); s.style.removeProperty('--drag'); });
  $('#scrim').hidden = true;
}
$('#pagebar').onclick = e => { const b = e.target.closest('[data-open]'); if (b) openSheet(b.dataset.open); };
$('#scrim').onclick = closeSheets;
$$('[data-close]').forEach(b => (b.onclick = closeSheets));
$$('.sheet .grab, .sheet .drawer-head, .sheet .sheet-head').forEach(h => {
  h.addEventListener('pointerdown', e => {
    if (!mobile() || e.target.closest('button')) return;
    const sheet = h.closest('.sheet'), y0 = e.clientY;
    let dy = 0;
    sheet.classList.add('dragging');
    h.setPointerCapture(e.pointerId);
    h.onpointermove = m => { dy = Math.max(0, m.clientY - y0); sheet.style.setProperty('--drag', dy + 'px'); };
    h.onpointerup = h.onpointercancel = () => {
      h.onpointermove = h.onpointerup = h.onpointercancel = null;
      sheet.classList.remove('dragging');
      dy > 90 ? closeSheets() : sheet.style.removeProperty('--drag');
    };
  });
});

/* ---------- streak, calendar, memories ---------- */

function streak() {
  let d = iso(new Date()), n = 0;
  if (!entries[d]) d = shift(d, -1);
  while (entries[d]) { n++; d = shift(d, -1); }
  return n;
}
function renderStreak() { const n = streak(); $('#streak').textContent = n ? `🔥 ${n}` : ''; }

const thumbOf = e => {
  const s = e.stickers?.find(x => 'pr'.includes(x.s[0]) || (x.s[0] === 'c' && custom[x.s.slice(2)]));
  if (!s) return '';
  const v = s.s.slice(2);
  return s.s[0] === 'p' ? '/stickers/' + v : s.s[0] === 'r' ? photo(v)?.src || '' : custom[v];
};

function renderCal() {
  const y = calMonth.getFullYear(), m = calMonth.getMonth(), t = iso(new Date());
  $('#calTitle').textContent = calMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  let html = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<span class="dow">${d}</span>`).join('') + '<span></span>'.repeat(new Date(y, m, 1).getDay());
  for (let d = 1; d <= new Date(y, m + 1, 0).getDate(); d++) {
    const k = `${y}-${pad(m + 1)}-${pad(d)}`, e = entries[k], mood = e && moods().find(x => x[0] === e.mood), thumb = e && thumbOf(e);
    html += `<button class="day${k === t ? ' today' : ''}${e ? ' has' : ''}" data-d="${k}" style="${mood ? '--m:' + mood[2] : ''}" aria-label="${k}${e ? ', has a page' : ''}">
      <span class="n">${d}</span>${thumb ? `<img src="${esc(thumb)}" alt="">` : ''}${mood ? `<span class="mood">${esc(mood[1])}</span>` : e && !thumb ? '<span class="mood">📝</span>' : ''}</button>`;
  }
  $('#cal').innerHTML = html;
}
$('#cal').onclick = e => { const b = e.target.closest('[data-d]'); if (b) { show('write', b.dataset.d); } };
$('#calPrev').onclick = () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1); renderCal(); };
$('#calNext').onclick = () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1); renderCal(); };

const memo = e => {
  const d = parse(e.id), mood = moods().find(x => x[0] === e.mood)?.[1] || '', thumb = thumbOf(e);
  const meta = [mood + (e.weather || ''), e.voice?.length && '🎙 ' + e.voice.length, e.song && '🎧 ' + e.song].filter(Boolean).map(esc).join('  ');
  const font = FONTS.includes(e.pen?.font) ? e.pen.font : 'Gaegu';
  return `<button class="memo" data-d="${e.id}" style="--hand:'${font}'">
    <span class="memo-date"><b>${d.getDate()}</b>${d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
    <span class="memo-text"><b>${esc(e.title || 'Untitled page')}</b><p>${esc((e.body || '').slice(0, 200))}</p><small>${meta}</small></span>
    ${thumb ? `<img src="${esc(thumb)}" alt="">` : '<span></span>'}</button>`;
};

function renderMemories() {
  const all = days(), t = iso(new Date());
  const withMood = moods().map(([v, e, c]) => [e, c, all.filter(x => x.mood === v).length]).filter(x => x[2]);
  const total = withMood.reduce((n, x) => n + x[2], 0);
  $('#stats').innerHTML = `<div class="stat"><b>${all.length}</b><span>pages</span></div><div class="stat"><b>${streak()}</b><span>days in a row</span></div>
    <div class="stat"><b>${all.reduce((n, e) => n + (e.stickers?.length || 0), 0)}</b><span>stickers stuck</span></div>
    ${total ? `<div class="moodbar">${withMood.map(([, c, n]) => `<i style="--c:${c};--w:${(n / total) * 100}%"></i>`).join('')}</div>
    <div class="moodkey">${withMood.map(([e, , n]) => `<span>${esc(e)} ${n}</span>`).join('')}</div>` : ''}`;
  const past = all.filter(e => e.id.slice(5) === t.slice(5) && e.id !== t);
  $('#onthisday').innerHTML = past.length ? `<div class="otd"><h2>On this day</h2><div class="memos">${past.map(memo).join('')}</div></div>` : '';
  renderList();
}

function renderList() {
  const q = $('#search').value.toLowerCase().trim();
  const list = days().filter(e => !q || `${e.title} ${e.body} ${e.song}`.toLowerCase().includes(q)).sort((a, b) => b.id.localeCompare(a.id));
  $('#list').innerHTML = list.map(memo).join('') || `<p class="empty">${q ? 'No pages match that search.' : 'No pages yet. Write today’s page and it shows up here.'}</p>`;
}
$('#search').oninput = renderList;
$('#tab-memories').onclick = e => { const b = e.target.closest('.memo'); if (b) show('write', b.dataset.d); };

/* ---------- sticker maker ---------- */

function renderMine() {
  const groups = byPack();
  $('#packList').innerHTML = Object.keys(groups).map(p => `<option value="${esc(p)}">`).join('');
  const star = v => `<button class="star${settings.buddy === v ? ' on' : ''}" data-buddy="${esc(v)}" aria-label="Make this your buddy">⭐</button>`;
  $('#mine').innerHTML = Object.entries(groups).map(([pack, ids]) =>
    `<h3 class="pack-title">${esc(pack)} <small>${ids.length} sticker${ids.length > 1 ? 's' : ''}</small></h3><div class="mine-grid">${ids.map(id =>
      `<div class="mine"><img src="${esc(custom[id])}" alt="">${star(id)}<button class="del" data-del="${esc(id)}" aria-label="Delete sticker">✕</button></div>`).join('')}</div>`).join('')
    + BUILTIN.map(p => `<h3 class="pack-title">${esc(p.name)} <small>built in</small></h3><div class="mine-grid">${p.files.map(f =>
      `<div class="mine">${charImg(f)}${star('p:' + f)}</div>`).join('')}</div>`).join('');
}

async function makeMany(files) {
  const pack = $('#packIn').value.trim().replace(/^_+/, '') || 'My stickers';
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    const name = esc(f.name || 'Pasted picture');
    const row = document.createElement('div');
    row.className = 'making-item';
    row.innerHTML = `<span class="spinner"></span><span>${name}: cutting it out…</span>`;
    $('#making').prepend(row);
    try {
      const src = await makeSticker(f, { keepBg: $('#keepBg').checked, onStatus: s => (row.lastChild.textContent = `${f.name || 'Pasted picture'}: ${s}`) });
      const { id } = await api('stickers', { method: 'POST', body: JSON.stringify({ src, pack }) });
      custom[id] = src; packs[id] = pack;
      row.innerHTML = `<img src="${esc(src)}" alt=""><span>${name} is now a sticker in <b>${esc(pack)}</b></span>`;
      renderMine(); renderDrawer();
    } catch (err) {
      if (err.message === 'locked') return;
      row.innerHTML = `<span>⚠️</span><span>${name} couldn’t be made into a sticker: ${esc(err.message)}</span>`;
    }
  }
}

$('#upload').onchange = e => { makeMany([...e.target.files]); e.target.value = ''; };
const drop = $('#drop');
drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
drop.ondragleave = () => drop.classList.remove('over');
drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); makeMany([...e.dataTransfer.files]); };
document.addEventListener('paste', e => {
  if ($('#tab-studio').hidden) return;
  const files = [...e.clipboardData.files].filter(f => f.type.startsWith('image/'));
  if (files.length) makeMany(files);
});

$('#mine').onclick = async e => {
  const b = e.target.closest('[data-buddy]')?.dataset.buddy;
  if (b) {
    saveSettings({ buddy: settings.buddy === b ? '' : b });
    renderMine();
    return toast(settings.buddy ? 'New buddy! ⭐' : 'Buddy reset to your theme');
  }
  const id = e.target.closest('[data-del]')?.dataset.del;
  if (!id || !(await ask('Delete this sticker?', 'It disappears from every page it’s on.', 'Delete'))) return;
  try {
    await api('stickers?id=' + encodeURIComponent(id), { method: 'DELETE' });
    delete custom[id];
    if (settings.buddy === id) saveSettings({ buddy: '' });
    renderMine(); renderDrawer(); renderStickers();
  } catch (err) { toast(err.message); }
};

/* ---------- garden ---------- */

let seed = GROWABLE[0];
const STAGES = ['Seed', 'Sprout', 'Sapling', 'Young plant', 'Full grown'];
const plantDef = kind => (kind?.startsWith('c:') ? (settings.plants || []).find(d => 'c:' + d.id === kind) : null);
const plantName = kind => plantDef(kind)?.name || photo(kind)?.name || 'Plant';
function plantPic(kind, stage) {
  const d = plantDef(kind);
  if (!d) return plantImg(photo(kind) ? kind : 'rose-pink', stage);
  const src = custom[d.stages[stage]];
  return src ? `<img src="${esc(src)}" class="stage custom" style="width:${40 + stage * 14}%" alt="">` : '';
}
const gardenData = () => (entries.garden ??= { id: 'garden', plants: [], stickers: [] });
const ago = d => (d ? Math.round((parse(iso(new Date())) - parse(d)) / 864e5) : 0);

function saveGarden() {
  api('entries', { method: 'PUT', body: JSON.stringify(gardenData()) }).catch(err => err.message !== 'locked' && toast('Garden didn’t save: ' + err.message));
}

function renderGarden() {
  const g = gardenData(), t = iso(new Date());
  const blooming = g.plants.filter(p => p.stage >= 4).length;
  $('#gardenStats').textContent = g.plants.length
    ? `${g.plants.length} plant${g.plants.length > 1 ? 's' : ''}, ${blooming} blooming`
    : 'Nothing planted yet. Plant your first seed!';
  $('#bed').innerHTML = g.plants.map((p, i) => {
    const kind = plantDef(p.kind) || photo(p.kind) ? p.kind : 'rose-pink', stage = Math.max(0, Math.min(4, +p.stage || 0));
    const watered = p.last === t, thirsty = !watered && ago(p.last || p.planted) >= 3;
    const status = watered ? (stage >= 4 ? 'Blooming and happy' : 'Watered today')
      : thirsty ? 'Very thirsty!' : stage >= 4 ? 'Fully grown' : `${STAGES[stage]}, needs water`;
    return `<div class="plot${thirsty ? ' thirsty' : ''}" data-i="${i}">
      <button class="pull" data-pull="${i}" aria-label="Pull out this plant">✕</button>
      <div class="plant">${plantPic(kind, stage)}</div>
      <b>${esc(plantName(kind))}</b><small>${status}</small>
      <div class="row">${watered ? '<button class="btn small ghost-btn" disabled>Watered ✓</button>' : `<button class="btn small" data-water="${i}">💧 Water</button>`}
      ${stage >= 4 ? `<button class="btn small ghost-btn" data-pick="${i}">Pick 🌸</button>` : ''}</div></div>`;
  }).join('');
}

function renderSeeds() {
  const mine = (settings.plants || []).filter(d => custom[d.stages[4]]).map(d =>
    `<button data-kind="c:${esc(d.id)}" aria-pressed="${seed === 'c:' + d.id}" class="mine-plant"><img src="${esc(custom[d.stages[4]])}" alt="">${esc(d.name)}<span data-delplant="${esc(d.id)}" aria-label="Delete this plant type">✕</span></button>`);
  $('#seedKinds').innerHTML = mine.join('') + GROWABLE.map(id => `<button data-kind="${id}" aria-pressed="${seed === id}">${photoImg(id)}${esc(photo(id).name)}</button>`).join('');
}

$('#plantBtn').onclick = () => { $('#seedPicker').hidden = false; renderSeeds(); $('#seedPicker').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };
$('#seedCancel').onclick = () => ($('#seedPicker').hidden = true);
$('#seedPicker').onclick = async e => {
  const del = e.target.closest('[data-delplant]')?.dataset.delplant;
  if (del) {
    if (await ask('Delete this plant type?', 'Plants of this kind already in your garden stay put.', 'Delete')) saveSettings({ plants: (settings.plants || []).filter(d => d.id !== del) });
    return renderSeeds();
  }
  const k = e.target.closest('[data-kind]')?.dataset.kind;
  if (k) { seed = k; renderSeeds(); }
};

let pm = null;
function renderPM() {
  $('#pmSlots').innerHTML = STAGES.map((l, i) => {
    const v = pm.stages[i];
    return `<button class="pm-slot${v ? ' has' : ''}" data-slot="${i}">${v === 'busy' ? '<span class="spinner"></span>' : v ? `<img src="${esc(v)}" alt="" style="width:${40 + i * 14}%">` : '<i>+</i>'}<small>${i + 1}. ${l}${i === 4 ? ' *' : ''}</small></button>`;
  }).join('');
}
$('#customPlantBtn').onclick = () => { pm = { stages: Array(5).fill(null) }; $('#pmName').value = ''; renderPM(); $('#seedPicker').hidden = true; $('#plantMaker').hidden = false; };
$('#pmCancel').onclick = () => { pm = null; $('#plantMaker').hidden = true; };
$('#pmSlots').onclick = e => { const s = e.target.closest('[data-slot]'); if (s && pm.stages[+s.dataset.slot] !== 'busy') { pm.slot = +s.dataset.slot; $('#pmFile').click(); } };
$('#pmFile').onchange = async e => {
  const f = e.target.files[0], i = pm.slot;
  e.target.value = '';
  if (!f) return;
  pm.stages[i] = 'busy'; renderPM();
  try { pm.stages[i] = await makeSticker(f); }
  catch (err) { pm.stages[i] = null; toast('Couldn’t use that picture: ' + err.message); }
  renderPM();
};
$('#pmSave').onclick = async () => {
  if (!pm.stages[4] || pm.stages[4] === 'busy' || pm.stages.includes('busy')) return toast('Add a picture for the last stage (Full grown) first.');
  const name = $('#pmName').value.trim() || 'My plant', up = {};
  try {
    for (let i = 0; i < 5; i++) if (pm.stages[i]) {
      const { id } = await api('stickers', { method: 'POST', body: JSON.stringify({ src: pm.stages[i], pack: '_plant' }) });
      custom[id] = pm.stages[i]; packs[id] = '_plant'; up[i] = id;
    }
    // Missing stages borrow the nearest earlier picture, or the next one up.
    const stages = [0, 1, 2, 3, 4].map(i => { for (let j = i; j >= 0; j--) if (up[j]) return up[j]; for (let j = i; j < 5; j++) if (up[j]) return up[j]; });
    const def = { id: 'u' + Date.now().toString(36), name, stages };
    saveSettings({ plants: [...(settings.plants || []), def] });
    pm = null; $('#plantMaker').hidden = true;
    seed = 'c:' + def.id; $('#seedPicker').hidden = false; renderSeeds();
    toast(`${name} is ready. Plant it! 🌱`);
  } catch (err) { if (err.message !== 'locked') toast('Couldn’t save the plant: ' + err.message); }
};
$('#seedPlant').onclick = () => {
  const g = gardenData();
  if (g.plants.length >= 24) return toast('Your garden is full. Pull a plant out to make room.');
  g.plants.push({ id: Date.now().toString(36), kind: seed, stage: 0, last: '', planted: iso(new Date()) });
  saveGarden(); $('#seedPicker').hidden = true; renderGarden();
  toast(`${plantName(seed)} planted 🌱 Water it every day!`);
};
$('#bed').onclick = async e => {
  const q = a => e.target.closest(`[${a}]`)?.getAttribute(a);
  const w = q('data-water'), pk = q('data-pick'), pull = q('data-pull'), g = gardenData();
  if (w != null) {
    const p = g.plants[w], grew = (+p.stage || 0) < 4;
    p.last = iso(new Date());
    if (grew) p.stage = (+p.stage || 0) + 1;
    saveGarden(); renderGarden();
    const plot = $(`.plot[data-i="${w}"]`);
    plot.insertAdjacentHTML('beforeend', `<div class="drops">${Array.from({ length: 8 }, (_, k) => `<i style="left:${28 + k * 6}%;animation-delay:${k * 70}ms"></i>`).join('')}</div>`);
    if (grew) plot.classList.add('grew');
    toast(grew && p.stage === 4 ? `Your ${plantName(p.kind).toLowerCase()} is fully grown! 🌳` : 'Glug glug 💧');
  } else if (pk != null) {
    const p = g.plants[pk];
    show('write', iso(new Date()));
    const d = plantDef(p.kind);
    addSticker(d ? 'c:' + d.stages[4] : 'r:' + p.kind);
    toast('Picked for today’s page 🌷');
  } else if (pull != null && (await ask('Pull out this plant?', 'It leaves your garden for good.', 'Pull it out'))) {
    g.plants.splice(+pull, 1); saveGarden(); renderGarden();
  }
};

/* ---------- pop-ups, music ---------- */

function ask(title, text, yes = 'Delete', no = 'Keep it') {
  const d = $('#ask');
  $('#askTitle').textContent = title; $('#askText').textContent = text;
  $('#askYes').textContent = yes; $('#askNo').textContent = no;
  $('#askBuddy').innerHTML = $('#buddy').innerHTML;
  d.returnValue = '';
  d.showModal(); $('#askNo').focus();
  return new Promise(r => d.addEventListener('close', () => r(d.returnValue === 'yes'), { once: true }));
}
$('#ask').addEventListener('click', e => { if (e.target === $('#ask')) $('#ask').close(); });

const musicOn = () => local.get('diary-music') !== 'off';
function setMusic(on, play = true) {
  local.set('diary-music', on ? 'on' : 'off');
  if (play) on ? startMusic() : stopMusic();
  const b = $('#musicBtn');
  b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', on ? 'Mute music' : 'Play music'); b.classList.toggle('muted', !on);
  $('#musicToggle').checked = on;
}
$('#musicBtn').onclick = () => { setMusic(!musicOn()); toast(musicOn() ? 'Music on 🎶' : 'Music off'); };
$('#musicToggle').onchange = e => setMusic(e.target.checked);
document.addEventListener('pointerdown', e => { if (musicOn() && !e.target.closest('#musicBtn')) startMusic(); }, { once: true });
setMusic(musicOn(), false);

/* ---------- drawing ---------- */

const DCOLORS = ['ink', '#E8558B', '#E0314B', '#FF8F3C', '#F4C430', '#2F9E6E', '#3A7BD5', '#8B5CF6', '#222222', '#FFFFFF'];
const DSIZES = [0.35, 0.75, 1.5];
const PENS = [['pen', '✒️ Pen'], ['marker', '🖍 Marker'], ['eraser', '🧽 Eraser']];
let drawing = false, stroke = null;
const brush = { pen: 'pen', color: 'ink', size: 1 };

const inkPath = s => {
  const p = s.p;
  if (p.length < 4) return `M${p[0]} ${p[1]}l0 .01`;
  let d = `M${p[0]} ${p[1]}`;
  for (let i = 2; i < p.length - 2; i += 2) d += `Q${p[i]} ${p[i + 1]} ${((p[i] + p[i + 2]) / 2).toFixed(1)} ${((p[i + 1] + p[i + 3]) / 2).toFixed(1)}`;
  return d + `L${p.at(-2)} ${p.at(-1)}`;
};
const strokeEl = s => `<path d="${inkPath(s)}" stroke="${HEX.test(s.c) ? s.c : 'var(--pen, var(--ink))'}" stroke-width="${+s.w || 0.75}"${s.m ? ' opacity=".38"' : ''} fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const inkSVG = () => `<svg class="ink" viewBox="0 0 100 100" preserveAspectRatio="xMinYMin meet">${(entry.ink || []).filter(s => Array.isArray(s.p) && s.p.length >= 2).map(strokeEl).join('')}</svg>`;
const redrawInk = () => { const svg = $('#layer .ink'); if (svg) svg.outerHTML = inkSVG(); };
const pagePt = e => { const r = $('#layer').getBoundingClientRect(); return [Math.round(((e.clientX - r.left) / r.width) * 1000) / 10, Math.round(((e.clientY - r.top) / r.width) * 1000) / 10]; };

function renderDrawbar() {
  $('#dbPens').innerHTML = PENS.map(([v, l]) => `<button data-pen="${v}" aria-pressed="${brush.pen === v}">${l}</button>`).join('');
  $('#dbColors').innerHTML = DCOLORS.map(c => `<button class="dot" data-dcolor="${c}" aria-pressed="${brush.color === c}" style="--c:${c === 'ink' ? 'var(--ink)' : c}" aria-label="Color ${c}"></button>`).join('');
  $('#dbSizes').innerHTML = DSIZES.map((s, i) => `<button data-dsize="${i}" aria-pressed="${brush.size === i}" aria-label="Brush size ${i + 1}"><i style="--d:${6 + i * 6}px"></i></button>`).join('');
}

function toggleDraw(on) {
  drawing = on;
  select(null); closeSheets();
  $('#layer').classList.toggle('drawing', on);
  $('#drawbar').hidden = !on;
  $('#drawBtn').classList.toggle('on', on);
  document.body.classList.toggle('editing', on);
  if (on) { renderDrawbar(); toast('Draw anywhere on the page ✏️'); }
}
$('#drawBtn').onclick = () => toggleDraw(!drawing);
$('#drawbar').onclick = async e => {
  const q = a => e.target.closest(`[${a}]`)?.getAttribute(a);
  const pen = q('data-pen'), c = q('data-dcolor'), size = q('data-dsize'), act = q('data-d');
  if (pen) brush.pen = pen;
  if (c) { brush.color = c; if (brush.pen === 'eraser') brush.pen = 'pen'; }
  if (size != null) brush.size = +size;
  if (act === 'undo' && entry.ink?.length) { entry.ink.pop(); redrawInk(); changed(); }
  if (act === 'clear' && entry.ink?.length && (await ask('Clear your drawing?', 'Every line on this page will be erased.', 'Clear it'))) { entry.ink = []; redrawInk(); changed(); }
  if (act === 'done') return toggleDraw(false);
  renderDrawbar();
};

function eraseAt(x, y) {
  const before = entry.ink.length;
  entry.ink = entry.ink.filter(s => { for (let i = 0; i < s.p.length; i += 2) if (Math.hypot(s.p[i] - x, s.p[i + 1] - y) < 2 + s.w / 2) return false; return true; });
  if (entry.ink.length !== before) redrawInk();
}
$('#layer').addEventListener('pointerdown', e => {
  if (!drawing) return;
  e.preventDefault(); e.stopImmediatePropagation();
  try { $('#layer').setPointerCapture(e.pointerId); } catch {}
  entry.ink ??= [];
  const [x, y] = pagePt(e);
  if (brush.pen === 'eraser') { stroke = { erase: true }; return eraseAt(x, y); }
  stroke = { c: brush.color, w: DSIZES[brush.size] * (brush.pen === 'marker' ? 3.2 : 1), p: [x, y], ...(brush.pen === 'marker' && { m: 1 }) };
  $('#layer .ink').insertAdjacentHTML('beforeend', strokeEl(stroke));
  stroke.el = $('#layer .ink').lastElementChild;
}, true);
$('#layer').addEventListener('pointermove', e => {
  if (!drawing || !stroke) return;
  e.stopImmediatePropagation();
  for (const ev of e.getCoalescedEvents?.() || [e]) {
    const [x, y] = pagePt(ev);
    if (stroke.erase) eraseAt(x, y);
    else if (Math.hypot(x - stroke.p.at(-2), y - stroke.p.at(-1)) > 0.25) stroke.p.push(x, y);
  }
  if (!stroke.erase) stroke.el.setAttribute('d', inkPath(stroke));
}, true);
const endStroke = e => {
  if (!drawing || !stroke) return;
  e.stopImmediatePropagation();
  if (!stroke.erase) { const { el, ...s } = stroke; entry.ink.push(s); }
  stroke = null; changed();
};
$('#layer').addEventListener('pointerup', endStroke, true);
$('#layer').addEventListener('pointercancel', endStroke, true);

/* ---------- page style bar ---------- */

const TINTS = [['', 'Theme'], ['#FFF4F8', 'Blush'], ['#F1F7FF', 'Sky'], ['#F1FBF3', 'Mint'], ['#FFF9E6', 'Butter'], ['#F6F1FF', 'Lilac'], ['#FFF2E8', 'Peach'], ['#FFFFFF', 'White']];

function renderPageTools() {
  const p = entry.pen, sz = SIZES.find(s => s[0] === p.size) || SIZES[1];
  const font = FONTS.includes(p.font) ? p.font : 'Gaegu';
  $('[data-menu=font] b').textContent = font; $('[data-menu=font] b').style.fontFamily = `'${font}', cursive`;
  $('[data-menu=size] b').textContent = sz[1];
  $('[data-menu=paper] b').innerHTML = `<i class="mini p-${entry.paper}"></i>${PAPERS.find(x => x[0] === entry.paper)?.[1] || 'Lined'}`;
  $('#ptInk').innerHTML = INKS.map(([v, l]) => `<button data-ink="${v}" aria-pressed="${p.ink === v}" style="--c:${v || 'var(--ink)'}" title="${l}" aria-label="${l}"></button>`).join('');
  $('#ptTint').innerHTML = TINTS.map(([v, l]) => `<button class="tint" data-tint="${v}" aria-pressed="${(entry.tint || '') === v}" style="--c:${v || 'var(--paper)'}" title="${l} page" aria-label="${l} page"></button>`).join('');
  $('.pt-paper').hidden = entry.id === BOARD;
}

let menuOpen = null;
function closeMenu() { menuOpen = null; $('#ptMenu').hidden = true; applyPen(); }
function openMenu(kind, anchor) {
  if (menuOpen === kind) return closeMenu();
  const m = $('#ptMenu'), p = entry.pen;
  menuOpen = kind;
  m.innerHTML = kind === 'font'
    ? FONTS.map(f => `<button role="option" data-pick="${f}" aria-selected="${p.font === f}" style="font-family:'${f}',cursive"><b>Dear diary, today was lovely</b><small>${f}</small></button>`).join('')
    : kind === 'size'
      ? SIZES.map(([v, l, fs]) => `<button role="option" data-pick="${v}" aria-selected="${p.size === v}" style="font-family:'${p.font}',cursive"><b style="font-size:${fs}px">Dear diary</b><small>${l}</small></button>`).join('')
      : PAPERS.map(([v, l]) => `<button role="option" data-pick="${v}" aria-selected="${entry.paper === v}"><i class="swatch p-${v}"></i><small>${l}</small></button>`).join('');
  m.className = 'pt-menu pt-menu-' + kind;
  m.hidden = false;
  const r = anchor.getBoundingClientRect();
  m.style.left = Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8)) + 'px';
  m.style.top = Math.min(r.bottom + 8, innerHeight - m.offsetHeight - 8) + 'px';
}
$('#pagetools').addEventListener('click', e => { const b = e.target.closest('[data-menu]'); if (b) openMenu(b.dataset.menu, b); });
// Hovering an option previews it on the page; leaving the menu puts the real choice back.
$('#ptMenu').addEventListener('pointerover', e => {
  const v = e.target.closest('[data-pick]')?.dataset.pick, st = $('#paper').style;
  if (!v) return;
  if (menuOpen === 'font') st.setProperty('--hand', `'${v}'`);
  if (menuOpen === 'size') { const s = SIZES.find(x => x[0] === v); st.setProperty('--fs', s[2]); st.setProperty('--lh', s[3]); }
  if (menuOpen === 'paper') $('#body').className = 'body p-' + v;
});
$('#ptMenu').addEventListener('pointerleave', () => { applyPen(); renderFeel(); });
$('#ptMenu').onclick = e => {
  const v = e.target.closest('[data-pick]')?.dataset.pick;
  if (!v) return;
  if (menuOpen === 'font') setPen({ font: v });
  else if (menuOpen === 'size') setPen({ size: v });
  else { entry.paper = v; renderFeel(); renderDrawer(); renderPageTools(); changed(); }
  closeMenu();
};
document.addEventListener('pointerdown', e => { if (menuOpen && !e.target.closest('#ptMenu, [data-menu]')) closeMenu(); });
$('#ptInk').onclick = e => { const v = e.target.closest('[data-ink]')?.dataset.ink; if (v != null) setPen({ ink: v }); };
$('#ptTint').onclick = e => {
  const v = e.target.closest('[data-tint]')?.dataset.tint;
  if (v == null) return;
  entry.tint = v; applyPen(); renderPageTools(); changed();
};

/* ---------- rich text: select words, then style them ---------- */

const TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'SPAN', 'FONT', 'BR', 'DIV', 'P']);
const CSS_OK = ['color', 'background-color', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-decoration', 'text-decoration-line'];
function cleanHTML(html) {
  const t = document.createElement('template');
  t.innerHTML = html || '';
  const walk = node => {
    for (const n of [...node.childNodes]) {
      if (n.nodeType === 3) continue;
      if (n.nodeType !== 1) { n.remove(); continue; }
      if (!TAGS.has(n.tagName)) {
        if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|IMG|SVG|VIDEO|AUDIO)$/.test(n.tagName)) n.remove();
        else { walk(n); n.replaceWith(...n.childNodes); }
        continue;
      }
      const keep = [];
      for (const p of CSS_OK) {
        const v = n.style.getPropertyValue(p);
        if (v && /^[#(),.%\w\s'"-]+$/.test(v) && !/url|expression/i.test(v)) keep.push(`${p}:${v}`);
      }
      const color = n.getAttribute('color');
      if (color && /^#[0-9a-f]{3,8}$/i.test(color)) keep.push(`color:${color}`);
      const face = (n.getAttribute('face') || '').replace(/['"]/g, '');
      if (FONTS.includes(face)) keep.push(`font-family:'${face}'`);
      for (const at of [...n.attributes]) n.removeAttribute(at.name);
      if (keep.length) n.setAttribute('style', keep.join(';'));
      walk(n);
    }
  };
  walk(t.content);
  return t.innerHTML;
}

const TEXT_COLORS = ['#5B3A47', '#E8558B', '#E0314B', '#FF7A30', '#D9A400', '#2F9E6E', '#14A3A3', '#3A7BD5', '#8B5CF6', '#B5651D', '#222222', '#A0A0A0'];
const HIGHLIGHTS = ['#FFD6E5', '#FFF19A', '#CFF3DA', '#D4E6FF', '#E8DBFF', '#FFDDC2'];
let saved = null;
$('#fmt').innerHTML = `
  <div class="fmt-row">
    <button data-f="bold" aria-label="Bold"><b>B</b></button><button data-f="italic" aria-label="Italic"><i>I</i></button>
    <button data-f="underline" aria-label="Underline"><u>U</u></button><button data-f="strikeThrough" aria-label="Strikethrough"><s>S</s></button>
    <span class="sep"></span><button data-f="smaller" aria-label="Smaller">A<sup>−</sup></button><button data-f="bigger" aria-label="Bigger">A<sup>+</sup></button>
    <span class="sep"></span><button data-f="fonts" class="fmt-font" aria-label="Font for selection">Aa ▾</button><button data-f="removeFormat" aria-label="Clear style">⌫</button>
  </div>
  <div class="fmt-row">${TEXT_COLORS.map(c => `<button class="sw" data-color="${c}" style="--c:${c}" aria-label="Text color ${c}"></button>`).join('')}
    <label class="sw any" title="Any color" aria-label="Pick any color"><input type="color" id="fmtAny" value="#e8558b"></label></div>
  <div class="fmt-row"><span class="lbl">Highlight</span>${HIGHLIGHTS.map(c => `<button class="sw hl" data-hl="${c}" style="--c:${c}" aria-label="Highlight ${c}"></button>`).join('')}
    <button class="sw none" data-hl="transparent" aria-label="No highlight">⦸</button></div>
  <div class="fmt-fonts" hidden>${FONTS.map(f => `<button data-font="${f}" style="font-family:'${f}',cursive">${f}</button>`).join('')}</div>`;

const inBody = n => n && $('#body').contains(n.nodeType === 1 ? n : n.parentNode);
function placeFmt() {
  const f = $('#fmt');
  f.hidden = false;
  if (mobile()) return;
  const r = saved.getBoundingClientRect();
  f.style.left = Math.max(8, Math.min(r.left + r.width / 2 - f.offsetWidth / 2, innerWidth - f.offsetWidth - 8)) + 'px';
  f.style.top = (r.top - f.offsetHeight - 12 > 70 ? r.top - f.offsetHeight - 12 : r.bottom + 12) + 'px';
}
document.addEventListener('selectionchange', () => {
  const s = getSelection();
  if (s.rangeCount && !s.isCollapsed && inBody(s.anchorNode) && inBody(s.focusNode)) { saved = s.getRangeAt(0).cloneRange(); placeFmt(); }
  else if (!$('#fmt').contains(document.activeElement)) $('#fmt').hidden = true;
});
function style(cmd, val) {
  if (!saved) return;
  const s = getSelection();
  s.removeAllRanges(); s.addRange(saved);
  document.execCommand('styleWithCSS', false, true);
  if (cmd === 'hiliteColor' && !document.execCommand('hiliteColor', false, val)) document.execCommand('backColor', false, val);
  else if (cmd === 'bigger' || cmd === 'smaller') {
    document.execCommand('styleWithCSS', false, false);
    document.execCommand('fontSize', false, '7');
    $$('#body font[size="7"]').forEach(f => { const sp = document.createElement('span'); sp.style.fontSize = cmd === 'bigger' ? '1.3em' : '0.8em'; sp.append(...f.childNodes); f.replaceWith(sp); });
  } else document.execCommand(cmd, false, val);
  if (s.rangeCount) saved = s.getRangeAt(0).cloneRange();
  $('#body').dispatchEvent(new Event('input'));
}
$('#fmt').addEventListener('pointerdown', e => { if (!e.target.closest('input')) e.preventDefault(); });
$('#fmt').addEventListener('mousedown', e => { if (!e.target.closest('input')) e.preventDefault(); });
$('#fmt').addEventListener('click', e => {
  const q = a => e.target.closest(`[${a}]`)?.getAttribute(a);
  const f = q('data-f'), c = q('data-color'), hl = q('data-hl'), font = q('data-font');
  if (f === 'fonts') { $('.fmt-fonts').hidden = !$('.fmt-fonts').hidden; return placeFmt(); }
  if (f) style(f);
  if (c) style('foreColor', c);
  if (hl) style('hiliteColor', hl);
  if (font) { style('fontName', font); $('.fmt-fonts').hidden = true; }
});
$('#fmtAny').addEventListener('input', e => style('foreColor', e.target.value));

/* ---------- shell ---------- */

function show(tab, day) {
  const section = tab === 'moodboard' ? 'write' : tab;
  $$('main > section').forEach(s => (s.hidden = s.id !== 'tab-' + section));
  $$('.tabs button').forEach(b => (b.dataset.tab === tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  closeSheets(); select(null);
  if (tab === 'write') openDay(day || lastDay);
  else if (tab === 'moodboard') openDay(BOARD);
  else flush();
  if (tab === 'calendar') renderCal();
  if (tab === 'memories') renderMemories();
  if (tab === 'studio') renderMine();
  if (tab === 'garden') { $('#seedPicker').hidden = true; renderGarden(); }
  scrollTo({ top: 0 });
}
$('.tabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) show(b.dataset.tab); };

$('#buddy').onclick = () => {
  const b = $('#bubble');
  b.textContent = pick(CHEERS); b.hidden = false;
  clearTimeout(b.t); b.t = setTimeout(() => (b.hidden = true), 2200);
};
$('#export').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ entries: Object.values(entries), stickers: custom, settings }, null, 2)], { type: 'application/json' }));
  a.download = `my-diary-${iso(new Date())}.json`;
  a.click();
};
$('#lockBtn').onclick = () => { flush(); $('#settings').close(); key = ''; local.set('diary-key', ''); showLock(); };
$('#lockForm').onsubmit = e => { e.preventDefault(); key = $('#pw').value.trim(); local.set('diary-key', key); boot(); };
$('#createDiary').onclick = async () => {
  try {
    await api('settings', { method: 'PUT', body: JSON.stringify({ ...settings, created: Date.now() }) });
    toast('Your new diary is ready 🎀');
    boot();
  } catch (err) { if (err.message !== 'locked') $('#lockMsg').textContent = err.message; }
};
$('#otherCode').onclick = () => { key = ''; local.set('diary-key', ''); showLock(); };
$('#codeToggle').onclick = () => { const i = $('#codeShow'); i.type = i.type === 'password' ? 'text' : 'password'; $('#codeToggle').textContent = i.type === 'text' ? 'Hide' : 'Show'; };
$('#codeCopy').onclick = async () => { try { await navigator.clipboard.writeText(key); toast('Code copied'); } catch { toast('Copy didn’t work. Tap Show and copy it by hand.'); } };

applyLook();
boot();

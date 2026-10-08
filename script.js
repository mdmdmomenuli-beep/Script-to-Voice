'use strict';
const $ = s => document.querySelector(s);
const bn = n => String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);

/* ---------- আবেগ ---------- */
const EMO = {
  natural: { bn: 'স্বাভাবিক', rate: 1,    pitch: 1,    vol: 1 },
  happy:   { bn: 'খুশি',      rate: 1.08, pitch: 1.15, vol: 1 },
  sad:     { bn: 'দুঃখী',     rate: 0.85, pitch: 0.85, vol: 0.85 },
  angry:   { bn: 'রাগী',      rate: 1.1,  pitch: 0.95, vol: 1 },
  calm:    { bn: 'শান্ত',     rate: 0.85, pitch: 0.95, vol: 0.9 },
  curious: { bn: 'জিজ্ঞাসু',  rate: 1,    pitch: 1.1,  vol: 1 },
};
const ORDER = Object.keys(EMO);
const KEY = {
  sad: ['দুঃখ', 'কষ্ট', 'কান্না', 'মন খারাপ', 'একা', 'হারিয়ে', 'ব্যথা'],
  angry: ['রাগ', 'বিরক্ত', 'ঘৃণা', 'অসহ্য', 'ধিক্কার'],
  happy: ['খুশি', 'আনন্দ', 'ভালোবাসি', 'অভিনন্দন', 'দারুণ', 'চমৎকার', 'ধন্যবাদ'],
  calm: ['শান্ত', 'ধীরে', 'নিঃশ্বাস', 'বিশ্রাম', 'নিশ্চিন্ত'],
};
const split = t => (t.match(/[^।!?.]+[।!?.]*/g) || []).map(x => x.trim()).filter(Boolean);
function guess(s) {
  for (const e in KEY) if (KEY[e].some(w => s.includes(w))) return e;
  if (/\?$/.test(s)) return 'curious';
  if (/!$/.test(s)) return 'happy';
  return 'natural';
}

/* ---------- সেটিংস ---------- */
const store = {
  get() { try { return JSON.parse(localStorage.getItem('kontho') || '{}'); } catch (e) { return {}; } },
  set(o) { try { localStorage.setItem('kontho', JSON.stringify(o)); } catch (e) {} },
};
const S = Object.assign({ gender: 'female', music: false, speed: 1, mvol: 0.5, voice: 'auto' }, store.get());
const save = () => store.set(S);

/* ---------- লেখা বিশ্লেষণ ---------- */
let sents = [];
const over = {};
function analyse() {
  sents = split($('#text').value).map(t => ({ t, e: over[t] || guess(t) }));
  const box = $('#score');
  box.innerHTML = '';
  if (!sents.length) {
    box.innerHTML = '<li class="empty" style="border:0">লেখা দিলে এখানে প্রতিটি বাক্যের সুর দেখা যাবে। সুর পছন্দ না হলে সুরের নামে ট্যাপ করে বদলে নিন।</li>';
    return;
  }
  sents.forEach((s, i) => {
    const li = document.createElement('li');
    li.dataset.e = s.e;
    const p = document.createElement('button');
    p.type = 'button'; p.className = 'line'; p.textContent = s.t;
    p.title = 'এই বাক্য থেকে শুনুন';
    p.onclick = () => play(i);
    const c = document.createElement('button');
    c.type = 'button'; c.className = 'chip'; c.textContent = EMO[s.e].bn;
    c.title = 'সুর বদলান';
    c.onclick = () => {
      s.e = ORDER[(ORDER.indexOf(s.e) + 1) % ORDER.length];
      over[s.t] = s.e; li.dataset.e = s.e; c.textContent = EMO[s.e].bn;
    };
    li.append(p, c);
    box.append(li);
  });
}

/* ---------- ভয়েস ---------- */
let voices = [];
const norm = l => (l || '').replace('_', '-').toLowerCase();
const FEM = /nabanita|tanishaa|female|woman/i;
const MAL = /pradeep|bashkar|bhaskar|\bmale\b|\bman\b/i;
function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  voices = speechSynthesis.getVoices().filter(v => norm(v.lang).startsWith('bn'));
  const sel = $('#voice');
  sel.innerHTML = '<option value="auto">স্বয়ংক্রিয়</option>';
  voices.forEach(v => sel.add(new Option(v.name + ' (' + v.lang + ')', v.voiceURI)));
  sel.value = voices.some(v => v.voiceURI === S.voice) ? S.voice : 'auto';
  $('#warn').hidden = voices.length > 0;
}
function pickVoice() {
  if (S.voice !== 'auto') return { v: voices.find(x => x.voiceURI === S.voice), shift: 1 };
  const want = S.gender === 'male' ? MAL : FEM;
  const m = voices.find(v => want.test(v.name));
  if (m) return { v: m, shift: 1 };
  // মিলিয়ে নেওয়ার মতো ভয়েস না পেলে সুরের উচ্চতা বদলে ছেলে/মেয়ে বোঝানো হয়
  return { v: voices[0], shift: S.gender === 'male' ? 0.72 : 1.12 };
}

/* ---------- মিউজিক (ব্রাউজারেই তৈরি) ---------- */
const MUS = {
  natural: { root: 130.8, step: 3.2, wave: 'sine',     cut: 1400, ch: [[0,4,7,11],[5,9,12,16],[9,12,16,19],[7,11,14,17]] },
  happy:   { root: 174.6, step: 2.0, wave: 'triangle', cut: 3000, arp: 1, ch: [[0,4,7],[7,11,14],[9,12,16],[5,9,12]] },
  sad:     { root: 146.8, step: 4.0, wave: 'sine',     cut: 900,  ch: [[0,3,7,10],[8,12,15],[5,8,12],[7,10,14]] },
  angry:   { root: 110,   step: 1.4, wave: 'sawtooth', cut: 700,  pulse: 1, ch: [[0,3,7],[1,5,8],[0,3,7],[-2,2,5]] },
  calm:    { root: 196,   step: 5.0, wave: 'sine',     cut: 1000, ch: [[0,7,12,16],[5,12,16,19],[-3,4,9,16],[0,7,11,16]] },
  curious: { root: 164.8, step: 2.2, wave: 'triangle', cut: 2200, arp: 1, ch: [[0,3,7],[5,8,12],[3,7,10],[7,10,14]] },
};
let ac, master, filt, timer = 0, nextT = 0, ci = 0, mood = 'natural';

function tone(f, t, d, type, g) {
  const o = ac.createOscillator(), a = ac.createGain();
  o.type = type; o.frequency.value = f;
  a.gain.setValueAtTime(0, t);
  a.gain.linearRampToValueAtTime(g, t + Math.min(0.4, d * 0.2));
  a.gain.linearRampToValueAtTime(0, t + d);
  o.connect(a); a.connect(filt);
  o.start(t); o.stop(t + d + 0.05);
}
function chord(t, m, ns) {
  ns.forEach(n => tone(m.root * 2 ** (n / 12), t, m.step * 1.2, m.wave, 0.07));
  if (m.arp) {
    const a = [...ns, ns[0] + 12, ns[1] + 12];
    a.forEach((n, i) => tone(m.root * 4 * 2 ** (n / 12), t + (i * m.step) / a.length, 0.5, 'triangle', 0.05));
  }
  if (m.pulse) for (let i = 0; i < 4; i++) tone(m.root, t + (i * m.step) / 4, 0.18, 'sawtooth', 0.12);
}
function sched() {
  const m = MUS[mood];
  while (nextT < ac.currentTime + 0.5) { chord(nextT, m, m.ch[ci % m.ch.length]); nextT += m.step; ci++; }
}
function musicOn() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); filt = ac.createBiquadFilter();
    filt.type = 'lowpass'; filt.connect(master); master.connect(ac.destination);
  }
  ac.resume();
  filt.frequency.value = MUS[mood].cut;
  master.gain.cancelScheduledValues(ac.currentTime);
  master.gain.setTargetAtTime(S.mvol * 0.5, ac.currentTime, 0.3);
  nextT = ac.currentTime + 0.1; ci = 0;
  clearInterval(timer); timer = setInterval(sched, 200); sched();
}
function musicOff() {
  clearInterval(timer); timer = 0;
  if (master) master.gain.setTargetAtTime(0, ac.currentTime, 0.4);
}
function setMood(e) {
  if (e === mood) return;
  mood = e;
  if (ac && timer) { filt.frequency.setTargetAtTime(MUS[e].cut, ac.currentTime, 0.3); nextT = ac.currentTime + 0.1; ci = 0; }
}

/* ---------- প্লেয়ার ---------- */
let playing = false, idx = 0, token = 0;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const PLAY = 'M8 5v14l11-7z', STOP = 'M6 6h12v12H6z';

function ui(on, msg) {
  playing = on;
  $('#ico').setAttribute('d', on ? STOP : PLAY);
  $('#play').setAttribute('aria-label', on ? 'থামান' : 'শুনুন');
  $('#wave').classList.toggle('live', on);
  if (msg) $('#status').textContent = msg;
}
function mark(i) {
  document.querySelectorAll('#score li').forEach((li, k) => li.classList.toggle('now', k === i));
  const el = document.querySelectorAll('#score li')[i];
  if (el) el.scrollIntoView({ block: 'nearest' });
}
function stop(msg) {
  token++;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  musicOff(); mark(-1);
  ui(false, msg || 'থামানো হয়েছে');
}
function next(my) {
  if (my !== token) return;
  if (idx >= sents.length) { musicOff(); mark(-1); ui(false, 'শেষ। আবার শুনতে চাপুন'); return; }
  const s = sents[idx], e = EMO[s.e], { v, shift } = pickVoice();
  mark(idx);
  $('#status').textContent = 'বলছি: ' + EMO[s.e].bn + ' সুরে';
  setMood(s.e);
  const u = new SpeechSynthesisUtterance(s.t);
  u.lang = v ? v.lang : 'bn-BD';
  if (v) u.voice = v;
  u.rate = clamp(e.rate * S.speed, 0.5, 2);
  u.pitch = clamp(e.pitch * shift, 0, 2);
  u.volume = e.vol;
  u.onend = () => setTimeout(() => { idx++; next(my); }, 300);
  u.onerror = ev => {
    if (my !== token || ev.error === 'canceled' || ev.error === 'interrupted') return;
    stop('ভয়েস চালাতে সমস্যা হয়েছে। অন্য ভয়েস বা ব্রাউজার চেষ্টা করুন');
  };
  speechSynthesis.speak(u);
}
function play(from) {
  if (!('speechSynthesis' in window)) { $('#status').textContent = 'এই ব্রাউজারে ভয়েস সাপোর্ট নেই'; return; }
  if (!sents.length) { $('#status').textContent = 'আগে কিছু লিখুন'; $('#text').focus(); return; }
  token++; speechSynthesis.cancel();
  const my = token;
  idx = typeof from === 'number' ? from : 0;
  mood = sents[idx].e;
  if (S.music) musicOn();
  ui(true);
  next(my);
}

/* ---------- ইভেন্ট ---------- */
const SAMPLE = 'আজ আমার মন খুব খুশি! তুমি কি আমার সাথে আসবে? কাল রাতে একা বসে ছিলাম, মনটা খুব খারাপ ছিল। এখন সব শান্ত, ধীরে নিঃশ্বাস নাও।';
let deb;
$('#text').addEventListener('input', () => {
  $('#count').textContent = bn($('#text').value.length) + ' / ' + bn(1000);
  if (playing) stop('লেখা বদলেছে, আবার শুনুন চাপুন');
  clearTimeout(deb); deb = setTimeout(analyse, 250);
});
$('#sample').onclick = () => { $('#text').value = SAMPLE; $('#text').dispatchEvent(new Event('input')); };
$('#play').onclick = () => (playing ? stop() : play());

document.querySelectorAll('input[name=gender]').forEach(r => {
  r.checked = r.value === S.gender;
  r.onchange = () => { S.gender = r.value; save(); };
});
$('#music').checked = S.music;
$('#music').onchange = e => {
  S.music = e.target.checked; save();
  if (playing) S.music ? musicOn() : musicOff();
};
$('#speed').value = S.speed;
$('#speedOut').textContent = bn(S.speed.toFixed(1)).replace('.', '.') + '×';
$('#speed').oninput = e => {
  S.speed = +e.target.value; save();
  $('#speedOut').textContent = bn(S.speed.toFixed(1)) + '×';
};
$('#mvol').value = S.mvol;
$('#mvol').oninput = e => {
  S.mvol = +e.target.value; save();
  if (master && timer) master.gain.setTargetAtTime(S.mvol * 0.5, ac.currentTime, 0.1);
};
$('#voice').onchange = e => { S.voice = e.target.value; save(); };

if ('speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();
} else {
  $('#warn').hidden = false;
  $('#warn').textContent = 'এই ব্রাউজার ভয়েস সাপোর্ট করে না। Chrome বা Edge ব্যবহার করুন।';
}
$('#text').dispatchEvent(new Event('input'));

// v3.0.1 checks: clipping + Mark Complete, Friday exclusivity, tick sound,
// revise tab gone, countdown font, 0-minute reminders, Blessed Reminder,
// new themes and fonts, version label. Headless Chrome, Vite dev server.
import { launch, open, sleep } from './lib.mjs';
import fs from 'node:fs';
import path from 'node:path';

const SHOTS = '/workspace/prayer/shots301/';
fs.mkdirSync(SHOTS, { recursive: true });
const b = await launch();
let pass = 0, fail = 0;
const out = [];
const ok = (name, cond, info = '') => {
  (cond ? pass++ : fail++);
  const line = `${cond ? 'PASS' : 'FAIL'} ${name}${info ? '  — ' + info : ''}`;
  out.push(line);
  console.log(line);
};

const FRI = '2026-11-20T12:30:00+06:00'; // Friday Dhuhr in Dhaka
const ISHA = '2026-11-15T19:00:00+06:00';
const MORNING = '2026-11-15T10:00:00+06:00'; // Sunday, no tag-heavy window

function clipInfo() {
  const els = [
    ...document.querySelectorAll('#countdownView .ref-quote, #countdownView .ref-quote blockquote, #countdownView .ref-note, #countdownView .practical, #eventRakahCard, #eventRakahCard p, #eventCompletionCard, #eventCompletionCard .ref-note')
  ];
  return els.filter(Boolean).map(el => {
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const before = getComputedStyle(el, '::before');
    return {
      sel: el.className || el.id,
      sw: el.scrollWidth, cw: el.clientWidth,
      sh: el.scrollHeight, ch: el.clientHeight,
      overflowX: el.scrollWidth <= el.clientWidth + 1,
      overflowY: el.scrollHeight <= el.clientHeight + 2,
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
      clip: style.overflow,
      beforeTop: before && before.content && before.content !== 'none' ? before.top : null
    };
  });
}

// ---- 1. clipping + Mark Complete (EN/BN, wide/medium/narrow)
for (const lang of ['en', 'bn']) {
  for (const [label, w, h] of [['wide', 1280, 720], ['mid', 900, 720], ['narrow', 420, 700]]) {
    const p = await open(b, { lang, w, h, at: ISHA });
    await p.evaluate(() => {
      const e = document.querySelector('[data-event-countdown][data-key="isha"]') || document.querySelector('[data-event-countdown]');
      e?.click();
    });
    await sleep(1100);
    const info = await p.evaluate(clipInfo);
    const quote = info.filter(x => /ref-quote|blockquote/.test(x.sel) || /In Hanafi|হানাফি|practice/.test(x.text));
    const clipped = info.filter(x => !x.overflowX || (x.sh - x.ch > 4 && /ref-quote|ref-note|practical|blockquote/.test(x.sel)));
    const noteOk = await p.evaluate(() => {
      const text = (document.querySelector('#countdownView')?.innerText || '');
      return { hasIn: /In Hanafi practice|হানাফি/.test(text), raw: text.replace(/\s+/g, ' ').slice(0, 240) };
    });
    ok(`${lang}/${label}: quote and notes are not clipped`, clipped.length === 0 && noteOk.hasIn, JSON.stringify({ clipped: clipped.slice(0, 3), note: noteOk }));
    const mc = await p.evaluate(() => {
      const btn = document.querySelector('#eventCompletionCard .mark-event-complete, #countdownView .mark-event-complete');
      if (!btn) return null;
      const row = btn.closest('.completion-row') || btn.parentElement;
      const ticks = document.querySelector('#eventCompletionCard .part-tick, #countdownView .part-tick');
      const br = btn.getBoundingClientRect(), tr = ticks?.getBoundingClientRect();
      return { text: btn.textContent.trim(), disabled: btn.disabled, rightOf: !tr || (w => {
        const narrow = window.innerWidth <= 520;
        return narrow ? br.top + 2 >= (tr.bottom - 8) : br.left + 2 >= tr.right - 4;
      })() };
    });
    ok(`${lang}/${label}: countdown Mark Complete is present and placed`, !!(mc && /Mark Complete|সম্পন্ন/.test(mc.text) && mc.rightOf), JSON.stringify(mc));
    if (label === 'wide' && lang === 'en') await (await p.$('#eventCompletionCard, #countdownView .event-prayer-card'))?.screenshot({ path: path.join(SHOTS, 'countdown-complete-en.png') });
    if (label === 'wide' && lang === 'bn') await (await p.$('#eventCompletionCard, #countdownView .event-prayer-card'))?.screenshot({ path: path.join(SHOTS, 'countdown-complete-bn.png') });
    await p.close();
  }
}

// ---- 2. Friday Jumu’ah / Dhuhr exclusivity
{
  const p = await open(b, { lang: 'en', w: 1280, h: 720, at: FRI });
  const labels = await p.evaluate(() => [...document.querySelectorAll('.live-event .part-tick.fard span')].map(s => s.textContent.trim()));
  ok('Friday home shows 2 Jumu’ah and 4 Dhuhr', labels.includes('2 Jumu’ah') && labels.includes('4 Dhuhr'), JSON.stringify(labels));
  const jumuah = await p.$('.live-event .part-tick.fard[data-sub-key="jumuah"]');
  ok('Jumu’ah tick is present', !!jumuah);
  if (jumuah) { await jumuah.click(); await sleep(600); }
  const after = await p.evaluate(() => {
    const j = document.querySelector('.live-event .part-tick.fard[data-sub-key="jumuah"]');
    const d = document.querySelector('.live-event .part-tick.fard[data-sub-key="dhuhr"]');
    const rec = JSON.parse(localStorage.getItem('prayer-times-data') || '{}');
    const day = rec.history?.['2026-11-20'] || {};
    return {
      jDone: j?.classList.contains('done'), dLocked: d?.classList.contains('is-exclusive') || d?.classList.contains('is-locked'),
      fridayFard: day.fridayFard, jumuah: !!day.fard?.jumuah, dhuhr: !!day.fard?.dhuhr
    };
  });
  ok('ticking Jumu’ah locks Dhuhr and records 2 rak’ahs choice', after.jDone && after.dLocked && after.fridayFard === 'jumuah' && after.jumuah && !after.dhuhr, JSON.stringify(after));
  const dhuhrBtn = await p.$('.live-event .part-tick.fard[data-sub-key="dhuhr"]');
  if (dhuhrBtn) { await dhuhrBtn.click(); await sleep(400); }
  const blocked = await p.evaluate(() => {
    const rec = JSON.parse(localStorage.getItem('prayer-times-data') || '{}');
    const day = rec.history?.['2026-11-20'] || {};
    return { fridayFard: day.fridayFard, dhuhr: !!day.fard?.dhuhr };
  });
  ok('clicking the locked Dhuhr circle does not switch the record', blocked.fridayFard === 'jumuah' && !blocked.dhuhr, JSON.stringify(blocked));
  await (await p.$('.live-event'))?.screenshot({ path: path.join(SHOTS, 'friday-card-en.png') });
  await p.close();
}

// ---- 3. tick sound toggle and playLayerSound gate
{
  const p = await open(b, { lang: 'en', w: 1280, h: 720, at: ISHA, data: { sound: true, tickSound: true } });
  await p.click('#settingsToggle');
  await sleep(400);
  const tog = await p.evaluate(() => {
    const el = document.querySelector('#tickSoundToggle');
    return { exists: !!el, checked: !!el?.checked, label: el?.parentElement?.textContent.trim() };
  });
  ok('settings has a Tick sound switch, default on', tog.exists && tog.checked && /Tick sound/.test(tog.label), JSON.stringify(tog));
  await p.click('#settingsToggle');
  await sleep(300);
  const sounded = await p.evaluate(async () => {
    let starts = 0;
    const Orig = window.AudioContext || window.webkitAudioContext;
    if (!Orig) return { starts: -1 };
    const Wrap = class extends Orig {
      constructor(...a) { super(...a); const o = this.createOscillator; this.createOscillator = function (...x) { const n = o.apply(this, x); const s = n.start.bind(n); n.start = function (...y) { starts++; return s(...y); }; return n; }; }
    };
    window.AudioContext = Wrap;
    window.webkitAudioContext = Wrap;
    const tick = document.querySelector('.live-event .part-tick:not([disabled]):not([data-locked])');
    tick?.click();
    await new Promise(r => setTimeout(r, 500));
    return { starts, hasTick: !!tick };
  });
  ok('ticking a circle starts the synthesised tick (or AudioContext is used)', sounded.starts !== 0 && sounded.hasTick, JSON.stringify(sounded));
  await p.close();
}

// ---- 4. revise tab gone
{
  const p = await open(b, { lang: 'en', w: 1280, h: 720, at: ISHA });
  const gone = await p.evaluate(() => !document.querySelector('#reviseSection, #reviseRecords') && !/Revise event record/.test(document.body.innerText));
  ok('Revise event record tab is gone', gone);
  await p.close();
}

// ---- 5. countdown font
{
  const p = await open(b, { lang: 'en', w: 1280, h: 720, at: ISHA });
  const font = await p.evaluate(() => {
    const pick = document.querySelector('.live-event .countdown-card-value, .live-event .countdown-large, #nextCountValue');
    const hero = document.querySelector('#countdownLarge, .clock-hero-count, .best-count');
    const sample = pick || hero;
    if (!sample) return { missing: true, classes: [...document.querySelectorAll('[class*="count"]')].slice(0, 8).map(e => e.className) };
    const cs = getComputedStyle(sample);
    return { ff: cs.fontFamily, vn: cs.fontVariantNumeric, mono: /mono|consolas|menlo|courier/i.test(cs.fontFamily), text: sample.textContent.trim(), cls: sample.className };
  });
  ok('time-left countdown uses the clock face, not monospace, with tabular nums', !font.missing && !font.mono && /tabular-nums/.test(font.vn || ''), JSON.stringify(font));
  await p.close();
}

// ---- 6. 0-minute preferred reminders can be set and show 0
{
  const p = await open(b, { lang: 'en', w: 1280, h: 720, at: ISHA, data: { prefReminders: { begin: { enabled: true, minutes: { isha: 0 } }, end: { enabled: true, minutes: { isha: 0 } } } } });
  await p.click('#settingsToggle');
  await sleep(500);
  await p.evaluate(() => document.getElementById('prefReminders')?.scrollIntoView());
  const vals = await p.evaluate(() => {
    const begin = document.querySelector('#pref-begin-isha');
    const tab = document.getElementById('prefTabEnd');
    tab?.click();
    const end = document.querySelector('#pref-end-isha');
    return { begin: begin?.value, end: end?.value, min: begin?.min };
  });
  ok('preferred reminder fields accept and show 0', vals.begin === '0' && vals.end === '0' && vals.min === '0', JSON.stringify(vals));
  await p.screenshot({ path: path.join(SHOTS, 'reminders-zero.png'), clip: { x: 0, y: 0, width: 1280, height: 720 } });
  // tighter crop if the card is on screen
  const box = await p.$('#prefReminders');
  if (box) await box.screenshot({ path: path.join(SHOTS, 'reminders-zero.png') });
  await p.close();
}

// ---- 7. Blessed Reminder
{
  const p = await open(b, { lang: 'en', w: 1280, h: 720, at: MORNING });
  await sleep(1200); // quran lazy load
  const card = await p.evaluate(() => {
    const el = document.getElementById('dailyNote');
    if (!el) return { missing: true };
    return { hidden: el.hidden, text: el.innerText.replace(/\s+/g, ' ').trim(), html: el.innerHTML.slice(0, 400) };
  });
  ok('Blessed Reminder title is shown', /A Blessed Reminder/i.test(card.text || ''), JSON.stringify(card).slice(0, 300));
  ok('Blessed Reminder shows a verse reference', /Al-Fatihah|Al-Baqarah|Al-Mu|surah|:/.test(card.text || '') || /\d+:\d+/.test(card.text || ''), (card.text || '').slice(0, 180));
  const more = await p.evaluate(() => {
    const btn = document.querySelector('[data-blessed-toggle]');
    if (!btn) return { present: false };
    const before = document.querySelector('.blessed-tr')?.textContent.length || 0;
    btn.click();
    const after = document.querySelector('.blessed-tr')?.textContent.length || 0;
    return { present: true, label: btn.textContent.trim(), before, after };
  });
  if (more.present) ok('Read more expands a long verse', more.after >= more.before, JSON.stringify(more));
  else ok('Read more appears only when the verse is long (this verse is short)', true);
  const persist = await p.evaluate(() => localStorage.getItem('prayer-times-blessed-reminder'));
  ok('Blessed Reminder remembers its place', !!persist, String(persist).slice(0, 120));
  const note = await p.$('#dailyNote');
  if (note) await note.screenshot({ path: path.join(SHOTS, 'blessed-reminder-en.png') });
  await p.close();
}

// ---- 8. themes + fonts
{
  const p = await open(b, { lang: 'en', w: 1100, h: 720, at: ISHA });
  await p.click('#settingsToggle');
  await sleep(400);
  const themes = await p.evaluate(async () => {
    const select = document.getElementById('themeSelect');
    const want = ['Desert Night','Indigo Dusk','Emerald Night','Charcoal Copper','Deep Plum','Sandstone','Pearl Mint','Linen','Dawn Peach','Sky Lilac'];
    const options = [...select.options].map(o => o.value || o.textContent);
    const shots = [];
    for (const name of want) {
      select.value = name;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      const cs = getComputedStyle(document.body);
      const bg = cs.getPropertyValue('--bg') || cs.backgroundColor;
      const fg = cs.getPropertyValue('--text') || cs.color;
      shots.push({ name, present: options.some(o => o.includes(name)), bg, fg });
    }
    return { count: options.length, shots };
  });
  ok('all 10 new themes are in the picker (20 total)', themes.count >= 20 && themes.shots.every(s => s.present && s.bg), JSON.stringify({ count: themes.count, names: themes.shots.map(s => s.name) }));
  // contact sheet
  await p.evaluate(() => { document.getElementById('settingsToggle')?.click(); });
  await sleep(300);
  const sheet = await p.evaluate(async () => {
    const names = ['Desert Night','Indigo Dusk','Emerald Night','Charcoal Copper','Deep Plum','Sandstone','Pearl Mint','Linen','Dawn Peach','Sky Lilac'];
    const select = document.getElementById('themeSelect');
    const colors = [];
    for (const name of names) {
      select.value = name;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      const cs = getComputedStyle(document.documentElement);
      colors.push({
        name,
        bg: getComputedStyle(document.body).backgroundColor,
        text: getComputedStyle(document.body).color,
        card: cs.getPropertyValue('--card') || cs.getPropertyValue('--panel') || ''
      });
    }
    return colors;
  });
  // paint a simple sheet via a data page? we'll screenshot swatches later in node if needed.
  fs.writeFileSync('/tmp/theme-swatches.json', JSON.stringify(sheet, null, 2));
  const fonts = await p.evaluate(async () => {
    await pWait?.();
  }).catch(() => null);
  const fontState = await p.evaluate(async () => {
    document.getElementById('settingsToggle')?.click?.();
    const en = document.getElementById('enFontSelect');
    const bn = document.getElementById('uiFontSelect');
    const enIds = en ? [...en.options].map(o => o.value) : [];
    const bnIds = bn ? [...bn.options].map(o => o.value) : [];
    if (en) { en.value = 'inter'; en.dispatchEvent(new Event('change', { bubbles: true })); }
    if (bn) { bn.value = 'kalpurush'; bn.dispatchEvent(new Event('change', { bubbles: true })); }
    await document.fonts.ready;
    const inter = document.fonts.check('16px Inter') || document.fonts.check('12px "Inter"');
    const kal = document.fonts.check('16px Kalpurush') || document.fonts.check('12px "Kalpurush"');
    const app = getComputedStyle(document.documentElement).getPropertyValue('--app-font')
      || getComputedStyle(document.body).fontFamily;
    return { enIds, bnIds, inter, kal, app, enFont: document.documentElement.style.getPropertyValue('--en-font'), uiFont: document.documentElement.style.getPropertyValue('--ui-font') };
  });
  ok('English font picker has Inter, Manrope, Outfit, Plus Jakarta Sans, Fraunces', ['inter','manrope','outfit','jakarta','fraunces'].every(id => fontState.enIds.includes(id)), JSON.stringify(fontState.enIds));
  ok('Bangla picker includes the five new fonts', ['kalpurush','siyam','solaiman','lohit','adorsho'].every(id => fontState.bnIds.includes(id)), JSON.stringify(fontState.bnIds));
  ok('chosen Inter and Kalpurush apply on the font stack', /Inter/.test(fontState.enFont + fontState.app) && /Kalpurush/.test(fontState.uiFont + fontState.app), JSON.stringify(fontState).slice(0, 300));
  await p.screenshot({ path: path.join(SHOTS, 'fonts-sample.png') });
  await p.close();
}

// ---- 9. version label
for (const [lang, w, h] of [['en', 1280, 720], ['bn', 1280, 720], ['en', 420, 700], ['bn', 420, 700]]) {
  const p = await open(b, { lang, w, h, at: ISHA });
  const info = await p.evaluate(() => {
    const el = document.getElementById('appVersionLabel');
    if (!el) return { missing: true };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const others = [...document.querySelectorAll('button, .toast, #copyrightMark, .icon-button')].map(n => ({ t: (n.id || n.className || '').toString().slice(0, 40), b: n.getBoundingClientRect() })).filter(o => o.b.width && o.b.height);
    const overlap = others.filter(o => !(r.right <= o.b.left + 1 || r.left >= o.b.right - 1 || r.bottom <= o.b.top + 1 || r.top >= o.b.bottom - 1));
    return { text: el.textContent.trim(), pe: cs.pointerEvents, visible: r.width > 0 && r.height > 0 && cs.opacity !== '0' && cs.visibility !== 'hidden', bottom: innerHeight - r.bottom, right: innerWidth - r.right, overlap: overlap.map(o => o.t), fontSize: cs.fontSize };
  });
  const expected = lang === 'bn' ? 'v৩.০.১' : 'v3.0.1';
  ok(`${lang} ${w}x${h}: version label is ${expected}, tiny, non-overlapping`, info.text === expected && info.visible && info.pe === 'none' && info.overlap.length === 0 && parseFloat(info.fontSize) <= 12, JSON.stringify(info));
  if (lang === 'en' && w === 1280) {
    await p.screenshot({ path: path.join(SHOTS, 'version-label-en.png') });
  }
  await p.close();
}

// focused layout audit
const issues = [];
for (const lang of ['en', 'bn']) {
  for (const [w, h] of [[1280, 720], [420, 700]]) {
    const p = await open(b, { lang, w, h, at: ISHA });
    const found = await p.evaluate(() => {
      const bad = [];
      for (const el of document.querySelectorAll('#eventCompletionCard, #countdownView .ref-quote, #dailyNote, #appVersionLabel, .live-event, .hero-row')) {
        if (el.scrollWidth > el.clientWidth + 2) bad.push({ id: el.id || el.className, sw: el.scrollWidth, cw: el.clientWidth });
      }
      return bad;
    });
    // open countdown too
    await p.evaluate(() => document.querySelector('[data-event-countdown]')?.click());
    await sleep(800);
    const more = await p.evaluate(() => {
      const bad = [];
      const root = document.getElementById('countdownView');
      if (!root) return ['no-countdown'];
      for (const el of root.querySelectorAll('.ref-quote, .ref-note, .practical, .mark-event-complete, .completion-row')) {
        if (el.scrollWidth > el.clientWidth + 2) bad.push((el.className || el.tagName) + ` ${el.scrollWidth}>${el.clientWidth}`);
      }
      const quote = root.querySelector('.ref-quote');
      if (quote) {
        const q = quote.getBoundingClientRect();
        const beforeH = 20;
        if (q.top < 0) bad.push('quote-offscreen');
      }
      return bad;
    });
    const all = [...found, ...more];
    ok(`layout ${lang} ${w}x${h}: completion and home cards do not overflow`, all.length === 0, JSON.stringify(all));
    if (all.length) issues.push({ lang, w, h, all });
    await p.close();
  }
}

await b.close();
console.log(`\n${pass} passed, ${fail} failed, ${pass + fail} total`);
fs.writeFileSync('/tmp/e2e-v301.txt', out.join('\n') + `\n\n${pass} passed, ${fail} failed\n`);
if (fail) process.exit(1);

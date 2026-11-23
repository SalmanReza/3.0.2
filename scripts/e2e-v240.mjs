// v2.4.0 checks: sequential voluntary ticks, Witr odd totals, even/odd boxes,
// reward phrases and the five-Fard disc verse, reward toggle, progress-circle
// placement, voluntary progress lines. Headless Chrome, Vite dev server.
import { launch, open, sleep } from './lib.mjs';
import fs from 'node:fs';
import { trayTooltipText } from '../src/tray-tooltip.js';

const SHOTS = '/workspace/prayer/shots240/';
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

const ISHA = '2026-11-15T19:00:00+06:00';
const DHUHR = '2026-11-15T12:30:00+06:00';
const DUHA = '2026-11-15T08:00:00+06:00';

function historyFiveFardOnly() {
  return { fard: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true } };
}

// ---- 1. Qiyam tick order and locks
for (const lang of ['en', 'bn']) {
  const p = await open(b, { lang, w: 1280, h: 720, at: ISHA });
  const card = await p.$('.live-event [data-vol-tick="qiyam"]');
  ok(`${lang}: Qiyam card is on the home page`, !!card);
  const state = await p.evaluate(() => {
    const ticks = [...document.querySelectorAll('[data-vol-tick="qiyam"]')];
    return ticks.map(t => ({
      i: Number(t.dataset.volIndex),
      disabled: t.disabled,
      locked: t.classList.contains('is-locked'),
      done: t.classList.contains('done')
    }));
  });
  ok(`${lang}: only the first Qiyam circle can be ticked`, state.length === 6 && !state[0].disabled && !state[0].locked && state.slice(1).every(t => t.disabled && t.locked));
  await p.click('[data-vol-tick="qiyam"][data-vol-index="0"]'); await sleep(250);
  await p.click('[data-vol-tick="qiyam"][data-vol-index="2"]'); await sleep(200);
  let after = await p.evaluate(() => ({
    count: document.querySelector('[data-vol-count="qiyam"]')?.textContent,
    done: [...document.querySelectorAll('[data-vol-tick="qiyam"]')].map(t => t.classList.contains('done')),
    phrase: document.querySelector('#voluntaryReward')?.innerText || ''
  }));
  ok(`${lang}: skipping ahead is ignored; first tick records 2 rak‘ahs`, /^2 |^২ /.test(after.count) && after.done[0] && !after.done[2], JSON.stringify(after));
  await p.click('[data-vol-tick="qiyam"][data-vol-index="1"]'); await sleep(250);
  after = await p.evaluate(() => ({
    count: document.querySelector('[data-vol-count="qiyam"]')?.textContent,
    done: [...document.querySelectorAll('[data-vol-tick="qiyam"]')].map(t => t.classList.contains('done')),
    locked: [...document.querySelectorAll('[data-vol-tick="qiyam"]')].map(t => t.classList.contains('is-locked') || t.disabled),
    line: document.querySelector('#progressStatus')?.textContent || ''
  }));
  ok(`${lang}: two ticks fill in order (4 rak‘ahs)`, /^4 |^৪ /.test(after.count) && after.done[0] && after.done[1] && !after.done[2], after.count);
  ok(`${lang}: only the last ticked circle can be unticked`, after.locked[0] === true && after.locked[1] === false, JSON.stringify(after.locked));
  ok(`${lang}: progress line reacts to Qiyam`, /Qiyam|কিয়ামুল লাইল/.test(after.line) && /4|৪/.test(after.line), after.line);
  const shot = await p.$('.live-event:has([data-vol-tick="qiyam"])');
  if (shot) await shot.screenshot({ path: SHOTS + `qiyam-locks-${lang}.png` });
  await p.close();
}

// ---- 2. Witr odd circles + migration of old 2+1
{
  const p = await open(b, { lang: 'en', w: 1280, h: 720, at: ISHA, data: { history: { '2026-11-15': { rakahSets: { witr: [true, true] }, rakahs: { witr: 3 } } } } });
  const info = await p.evaluate(() => {
    const ticks = [...document.querySelectorAll('[data-vol-tick="witr"]')];
    return {
      keys: [...document.querySelectorAll('.live-event [data-event-countdown], .live-event [data-vol-tick]')].map(e => e.dataset.key || e.dataset.volTick),
      labels: ticks.map(t => t.querySelector('span')?.textContent.trim()),
      done: ticks.map(t => t.classList.contains('done')),
      count: document.querySelector('[data-vol-count="witr"]')?.textContent || ''
    };
  });
  const labels = info.labels;
  const done = info.done;
  const count = info.count;
  ok('Witr circles are 1, 3, 5, 7, 9, 11', labels.join(',') === '1,3,5,7,9,11', JSON.stringify(info));
  ok('old 2+1 Witr migrates to a total of 3', /^3 /.test(count) && done[0] && done[1] && !done[2], `${count} ${JSON.stringify(done)}`);
  const more = await p.evaluate(() => document.querySelector('[data-vol-extra="witr"] label')?.textContent || '');
  ok('Witr has a More than 11? box', /More than 11/.test(more), more);
  const card = await p.$('.live-event:has([data-vol-tick="witr"])');
  if (card) await card.screenshot({ path: SHOTS + 'witr-card-en.png' });
  await p.close();
}
{
  const p = await open(b, { lang: 'bn', w: 1280, h: 720, at: ISHA });
  const labels = await p.evaluate(() => [...document.querySelectorAll('[data-vol-tick="witr"] span')].map(s => s.textContent.trim()));
  ok('Witr labels use Bangla digits', labels.join(',') === '১,৩,৫,৭,৯,১১', JSON.stringify(labels));
  const card = await p.$('.live-event:has([data-vol-tick="witr"])');
  if (card) await card.screenshot({ path: SHOTS + 'witr-card-bn.png' });
  await p.close();
}

// ---- 3. even/odd total boxes
{
  const p = await open(b, { lang: 'en', w: 1280, h: 720, at: ISHA });
  const submit = async (key, v) => p.evaluate((key, v) => {
    const form = document.querySelector(`[data-vol-extra="${key}"]`);
    const input = form.querySelector('input');
    input.value = v;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    // the listener is on submit; dispatch may not fire the handler bound with addEventListener if we don't call requestSubmit
    return true;
  }, key, v);
  const typeSubmit = async (key, v) => {
    const sel = `#volExtra-${key}`;
    await p.$eval(sel, e => { e.value = ''; });
    if (v !== '') await p.type(sel, v);
    await p.click(`[data-vol-extra="${key}"] .vol-extra-set`);
    await sleep(200);
    return p.evaluate(key => ({
      msg: document.querySelector(`[data-vol-extra="${key}"] .vol-extra-msg`)?.textContent || '',
      count: document.querySelector(`[data-vol-count="${key}"]`)?.textContent || ''
    }), key);
  };
  const w14 = await typeSubmit('witr', '14');
  ok('Witr rejects 14 and hints 13 or 15', /13 or 15/.test(w14.msg), JSON.stringify(w14));
  const w13 = await typeSubmit('witr', '13');
  ok('Witr accepts 13', /^13 /.test(w13.count) && w13.msg === '', JSON.stringify(w13));
  const q15 = await typeSubmit('qiyam', '15');
  ok('Qiyam rejects 15 and hints 14 or 16', /14 or 16/.test(q15.msg), JSON.stringify(q15));
  const q14 = await typeSubmit('qiyam', '14');
  ok('Qiyam accepts 14', /^14 /.test(q14.count) && q14.msg === '', JSON.stringify(q14));
  const bnDigits = await typeSubmit('qiyam', '১৬');
  ok('Qiyam accepts Bangla digits 16', /^16 /.test(bnDigits.count), JSON.stringify(bnDigits));
  await p.close();
}

// ---- 4. reward phrases by kind
const phrases = {
  fard: { at: DHUHR, sel: '.round-check.layer-fard, .part-tick.fard', en: /La ilaha illallah/, bn: /লা ইলাহা ইল্লাল্লাহ/, kind: 'fard' },
  sunnah: { at: DHUHR, sel: '.live-event .part-tick.sunnah', en: /Allahu Akbar/, bn: /আল্লাহু আকবার/, kind: 'sunnah' },
  nafl: { at: DHUHR, sel: '.live-event .part-tick.nafl', en: /Alhamdulillah/, bn: /আলহামদুলিল্লাহ/, kind: 'nafl', data: { history: { '2026-11-15': { fard: { dhuhr: true } } } } },
  voluntary: { at: DUHA, sel: '.mark-event-complete', en: /SubhanAllah/, bn: /সুবহানাল্লাহ/, kind: 'voluntary' }
};
for (const [kind, spec] of Object.entries(phrases)) {
  const p = await open(b, { lang: 'en', w: 1280, h: 720, at: spec.at, data: { recognitionPace: { voluntary: 8 }, ...(spec.data || {}) } });
  const el = await p.$(spec.sel);
  ok(`home has a ${kind} control at the test time`, !!el);
  if (el) { await el.click(); await sleep(400); }
  const r = await p.evaluate(() => {
    const e = document.querySelector('#voluntaryReward');
    return { hidden: e.hidden, kind: e.dataset.kind, text: (e.innerText || '').replace(/\s+/g, ' ') };
  });
  ok(`${kind} tick shows its phrase`, !r.hidden && r.kind === spec.kind && spec.en.test(r.text), JSON.stringify(r));
  if (kind === 'fard') {
    await p.screenshot({ path: SHOTS + 'reward-panel-en.png' });
  }
  await p.close();
}
{
  const p = await open(b, { lang: 'bn', w: 1280, h: 720, at: DHUHR, data: { recognitionPace: { voluntary: 8 } } });
  await p.click('.round-check.layer-fard, .part-tick.fard'); await sleep(400);
  const r = await p.evaluate(() => document.querySelector('#voluntaryReward')?.innerText || '');
  ok('Bangla Fard phrase uses Bangla pronunciation and meaning', /লা ইলাহা ইল্লাল্লাহ/.test(r) && /আল্লাহ ছাড়া কোনো উপাস্য নেই/.test(r), r.replace(/\s+/g, ' '));
  await p.screenshot({ path: SHOTS + 'reward-panel-bn.png' });
  await p.close();
}

// ---- 5. five Fard only: disc verse, and the toggle hides it
{
  const p = await open(b, { lang: 'en', w: 1280, h: 720, at: ISHA, data: { history: { '2026-11-15': historyFiveFardOnly() } } });
  const disc = await p.evaluate(() => ({
    text: document.querySelector('#progressFigure .pf-reward')?.textContent || '',
    caption: document.querySelector('#progressCaption')?.textContent || '',
    coreHidden: document.querySelector('#progressCore')?.hidden
  }));
  ok('disc verse appears with five Fard only', disc.text.includes('قَدْ أَفْلَحَ الْمُؤْمِنُونَ') && /Qad aflaha|believers have succeeded|Mu'minun 23:1/.test(disc.caption) && disc.coreHidden, JSON.stringify(disc));
  const card = await p.$('.progress-panel');
  if (card) await card.screenshot({ path: SHOTS + 'progress-verse-en.png' });
  await p.close();
}
{
  const p = await open(b, { lang: 'bn', w: 1280, h: 720, at: ISHA, data: { history: { '2026-11-15': historyFiveFardOnly() } } });
  const disc = await p.evaluate(() => ({
    text: document.querySelector('#progressFigure .pf-reward')?.textContent || '',
    caption: document.querySelector('#progressCaption')?.textContent || ''
  }));
  ok('Bangla caption carries the verse pronunciation, meaning and reference', disc.text.includes('قَدْ أَفْلَحَ الْمُؤْمِنُونَ') && /কাদ আফলাহাল|সফলকাম|আল-মুমিনুন ২৩:১/.test(disc.caption), JSON.stringify(disc));
  const card = await p.$('.progress-panel');
  if (card) await card.screenshot({ path: SHOTS + 'progress-verse-bn.png' });
  await p.close();
}
{
  const p = await open(b, { lang: 'en', w: 1280, h: 720, at: ISHA, data: { showRewardText: false, history: { '2026-11-15': historyFiveFardOnly() } } });
  const disc = await p.evaluate(() => document.querySelector('#progressFigure .pf-reward')?.textContent || '');
  ok('Show reward text off hides the disc verse', disc === '', disc);
  await p.click('.round-check.layer-fard, .live-event .part-tick, .mark-event-complete'); await sleep(400);
  const panel = await p.evaluate(() => document.querySelector('#voluntaryReward')?.hidden);
  ok('Show reward text off also hides tick phrases', panel !== false, `hidden=${panel}`);
  await p.close();
}

// ---- 6. progress circle centred in the left third, vertically in the card
{
  const p = await open(b, { lang: 'en', w: 1280, h: 720, at: DHUHR });
  const geom = await p.evaluate(() => {
    const card = document.querySelector('.progress-panel');
    const visual = document.querySelector('.progress-visual');
    const cs = getComputedStyle(card);
    const padL = parseFloat(cs.paddingLeft) || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    const padT = parseFloat(cs.paddingTop) || 0;
    const padB = parseFloat(cs.paddingBottom) || 0;
    const cr = card.getBoundingClientRect();
    const vr = visual.getBoundingClientRect();
    const left = cr.left + padL;
    const width = cr.width - padL - padR;
    const top = cr.top + padT;
    const height = cr.height - padT - padB;
    const third = width / 3;
    const midX = vr.left + vr.width / 2;
    const midY = vr.top + vr.height / 2;
    return {
      dx: midX - (left + third / 2),
      dy: midY - (top + height / 2),
      midX, midY, left, third, width, height
    };
  });
  ok('progress circle centred horizontally in the left third (±2 px)', Math.abs(geom.dx) <= 2, JSON.stringify(geom));
  ok('progress circle centred vertically in the card (±2 px)', Math.abs(geom.dy) <= 2, JSON.stringify(geom));
  await p.close();
}

// ---- 7. astrolabe switches close-up
{
  const p = await open(b, { lang: 'en', w: 1280, h: 720, at: DHUHR });
  const tools = await p.$('.astro-tools');
  if (tools) await tools.screenshot({ path: SHOTS + 'astro-switches-en.png' });
  const smooth = await p.evaluate(() => {
    const el = document.querySelector('.astro-tool');
    const after = getComputedStyle(el, '::after').backgroundImage;
    return after;
  });
  ok('Rotate/Flip ::after is the soft groove treatment, not hard knurl teeth', /repeating-conic-gradient/i.test(smooth) && !/1\.1deg/.test(smooth), smooth.slice(0, 180));
  await p.close();
}

// ---- tray text (printed; no screenshot)
const trayEn = trayTooltipText({ available: [{ name: 'Isha', msLeft: (5 * 60 + 17) * 60000 }], next: { name: 'Fajr', ms: (6 * 60 + 2) * 60000 }, lang: 'en' });
const trayBn = trayTooltipText({ available: [{ name: 'ইশা', msLeft: (5 * 60 + 17) * 60000 }], next: { name: 'ফজর', ms: (6 * 60 + 2) * 60000 }, lang: 'bn' });
const trayShort = trayTooltipText({ available: [{ name: 'Isha', msLeft: 42 * 60000 }], next: { name: 'Fajr', ms: 50 * 60000 }, lang: 'en' });
ok('tray English example', trayEn === 'Isha: 5h 17m left\nNext: Fajr in 6h 2m', trayEn);
ok('tray Bangla example', trayBn.includes('ইশা') && trayBn.includes('ফজর') && !/[0-9]/.test(trayBn), trayBn);
ok('tray minutes only under an hour', trayShort === 'Isha: 42m left\nNext: Fajr in 50m', trayShort);
console.log('TRAY EN:\n' + trayEn);
console.log('TRAY BN:\n' + trayBn);
console.log('TRAY SHORT:\n' + trayShort);

await b.close();
fs.writeFileSync('/tmp/e2e240-results.txt', out.join('\n') + `\n\n${pass}/${pass + fail} passed\n`);
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);

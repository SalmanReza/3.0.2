// v2.1.1 scripted interface checks. Needs the vite dev server on :1420 and puppeteer-core + Chrome (see scripts/lib.mjs).
import {launch,open,sleep} from './lib.mjs';
import fs from 'node:fs';
const SHOTS=process.env.SHOTS||'/workspace/prayer/shots211/'; fs.mkdirSync(SHOTS,{recursive:true});
const results=[]; const ok=(n,c,d='')=>{results.push([c,n,d]); console.log((c?'PASS ':'FAIL ')+n+(d?'  — '+d:''));};
const b=await launch();
const M=(p,sel)=>p.evaluate(s=>{const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(); return {w:r.width,h:r.height,x:r.x,y:r.y}},sel);
const angle=p=>p.evaluate(()=>parseFloat(document.querySelector('#astroStage').dataset.angle));
const page=p=>p.evaluate(()=>({astro:!document.querySelector('#astroView').hidden, exp:document.body.classList.contains('astro-expanded')}));
const stageCenter=async p=>{const r=await M(p,'#astroStage'); return {cx:r.x+r.w/2, cy:r.y+r.h/2, R:r.w/2}};
const T='2026-11-15T12:30:00+06:00';

// ---------------- 1. forbidden card ----------------
for (const lang of ['en','bn']) for (const [w,h,tag] of [[1280,720,'1280x720'],[480,760,'small']]) for (const [k,at,next] of [['zawal','2026-11-15T11:40:00+06:00',/Dhuhr|যোহর/],['sunrise','2026-11-15T06:20:00+06:00',/Ishraq|ইশরাক/],['sunset','2026-11-15T17:05:00+06:00',/Maghrib|মাগরিব/]]) {
  if (k!=='zawal' && w!==1280) continue;
  const p=await open(b,{lang,w,h,at});
  const r=await p.evaluate(()=>{const c=document.querySelector('.forbidden-card'); if(!c) return null; const cs=getComputedStyle(c); const cr=c.getBoundingClientRect();
    const bad=[...c.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect(); return r.width>0&&(r.right>cr.right+1||r.left<cr.left-1||r.bottom>cr.bottom+1||r.top<cr.top-1)}).map(e=>e.className);
    const clipped=[...c.querySelectorAll('*')].filter(e=>e.scrollWidth>e.clientWidth+1&&getComputedStyle(e).overflow!=='visible').map(e=>e.className);
    const rgb=cs.boxShadow; const inner=c.querySelector('.forbidden-left-box');
    return {text:c.innerText.replace(/\s+/g,' '), bad, clipped, icon:c.querySelectorAll('svg,img').length, shadow:rgb, innerCountdown:!!inner&&inner.classList.contains('countdown-card'), bar:!!c.querySelector('.forbidden-progress > i'), nextLine:c.querySelector('.forbidden-next')?.textContent||'', pct:parseFloat(c.querySelector('.forbidden-progress > i').style.width)}});
  ok(`forbidden card ${k} ${lang} ${tag}: calm pause layout, no icon, inner countdown card, progress bar, Next line`, r&&r.icon===0&&r.innerCountdown&&r.bar&&next.test(r.nextLine)&&(lang==='bn'?/বিরতি/.test(r.text):/PAUSE/.test(r.text)), r&&r.text);
  ok(`forbidden card ${k} ${lang} ${tag}: nothing overflows or is clipped`, r&&r.bad.length===0&&r.clipped.length===0, r&&JSON.stringify([r.bad,r.clipped]));
  ok(`forbidden card ${k} ${lang} ${tag}: amber edge, no red/violet`, r&&/0\.788\d*\s+0\.584\d*\s+0\.235/.test(r.shadow), r&&r.shadow.slice(0,90));
  if (k==='zawal'&&w===1280) {
    const p0=r.pct; await sleep(5200); const p1=await p.$eval('.forbidden-progress > i',e=>parseFloat(e.style.width));
    ok(`forbidden progress bar fills as the window passes (${lang})`, p1>p0, `${p0.toFixed(2)}% → ${p1.toFixed(2)}%`);
    await p.screenshot({path:SHOTS+`forbidden-${lang}.png`});
  }
  if (k==='zawal'&&w===480) await p.screenshot({path:SHOTS+`forbidden-${lang}-small.png`,fullPage:true});
  ok(`forbidden page ${k} ${lang} ${tag}: no console errors`, p.errs.length===0, p.errs.join('|'));
  await p.close();
}

// ---------------- 2. astrolabe click vs drag ----------------
{
  const p=await open(b,{lang:'en',w:1280,h:720,at:T});
  const {cx,cy,R}=await stageCenter(p); const a0=await angle(p);
  await p.click('#astroRotateBtn'); await sleep(250); // v2.2.0: rotation is locked until Rotate is on
  // drag
  await p.mouse.move(cx+R*0.8,cy); await p.mouse.down(); for(let i=1;i<=10;i++){ await p.mouse.move(cx+R*0.8,cy+i*8); await sleep(20);} await p.mouse.up(); await sleep(1500);
  const pg1=await page(p), a1=await angle(p);
  ok('dragging rotates the astrolabe and does not open the page', !pg1.astro&&Math.abs(a1-a0)>1, `Δ=${(a1-a0).toFixed(1)}° page=${JSON.stringify(pg1)}`);
  // double-click resets and does not open
  await p.mouse.click(cx+R*0.3,cy+R*0.2,{count:2}); await sleep(1800);
  const pg2=await page(p), a2=await angle(p);
  ok('double-click resets rotation and does not open the page', !pg2.astro&&Math.abs(((a2+180)%360+360)%360-180)<0.5, `angle=${a2.toFixed(2)}`);
  // flip button click does not open
  await p.click('#astroFlipBtn'); await sleep(900); const pg3=await page(p);
  ok('clicking the flip button does not open the page', !pg3.astro, JSON.stringify(pg3));
  await p.click('#astroFlipBtn'); await sleep(900);
  // plain click opens (Rotate must be off, as in v2.2.0)
  await p.click('#astroRotateBtn'); await sleep(300);
  await p.mouse.click(cx+R*0.3,cy+R*0.25); await sleep(1600);
  const pg4=await page(p);
  ok('a plain click opens the astrolabe page', pg4.astro&&pg4.exp, JSON.stringify(pg4));
  ok('no console errors (click/drag)', p.errs.length===0, p.errs.join('|'));
  await p.close();
}
{
  const p=await open(b,{lang:'en',w:1280,h:720,at:T});
  await p.focus('#astroStage'); await p.keyboard.press('Enter'); await sleep(1500);
  ok('Enter on the focused astrolabe opens the page (keyboard)', (await page(p)).astro);
  await p.close();
}

// ---------------- 3. expanded page: layout, clock, cards, back, resize ----------------
for (const lang of ['en','bn']) {
  const p=await open(b,{lang,w:1280,h:720,at:T});
  const {cx,cy,R}=await stageCenter(p); await p.mouse.click(cx+R*0.3,cy+R*0.25); await sleep(1600);
  await p.click('#astroRotateBtn'); await sleep(250); // Rotate on (the expanded page has the same control)
  const st=await p.evaluate(()=>{const q=s=>document.querySelector(s); const vis=e=>!!e&&e.offsetParent!==null&&getComputedStyle(e).display!=='none';
    return {clockTop:!!q('#topbarClock #analogClockButton'), readout:!!q('#topbarClock .clock-readout'), stageIn:!!q('#astroBigSlot #skyPanel'), topHidden:!vis(q('#skyPanel .astro-top')), footHidden:!vis(q('#skyPanel .astro-foot')), coordHidden:!vis(q('#locationLabel')), homeHidden:q('#homeView').hidden, text:q('#astroView').innerText.replace(/\s+/g,' '), stageW:q('#astroStage').getBoundingClientRect().width, clockW:q('#analogClockButton').getBoundingClientRect().width, sw:document.documentElement.scrollWidth, iw:innerWidth}});
  ok(`expanded astrolabe page (${lang}): clock in top bar, astrolabe in the centre, home hidden`, st.clockTop&&st.readout&&st.stageIn&&st.homeHidden, JSON.stringify({clockTop:st.clockTop,stageIn:st.stageIn,stageW:Math.round(st.stageW),clockW:Math.round(st.clockW)}));
  const need = lang==='en' ? [/SUN/,/Height/,/Direction/,/MOON/,/Phase/,/Illumination/,/FORBIDDEN TIME/,/Sunrise/,/Zawal/,/Before sunset/,/CURRENT AND NEXT PRAYER/,/Dhuhr/,/Asr/,/COORDINATES/,/Latitude/,/Longitude/,/23\.8103° N/,/90\.4125° E/,/sidereal/] : [/সূর্য/,/উচ্চতা/,/দিক/,/চাঁদ/,/দশা/,/আলোকিত/,/নিষিদ্ধ সময়/,/সূর্যোদয়/,/জাওয়াল/,/সূর্যাস্তের আগে/,/যোহর/,/আসর/,/স্থানাঙ্ক/,/অক্ষাংশ/,/২৩\.৮১০৩° উত্তর/,/৯০\.৪১২৫° পূর্ব/];
  const miss=need.filter(r=>!r.test(st.text)).map(String);
  ok(`expanded page (${lang}) shows sun, moon, pause windows, prayers and coordinates`, miss.length===0, miss.join(' '));
  ok(`expanded page (${lang}): small-instrument labels and top-bar coordinates are hidden, so nothing is shown twice`, st.topHidden&&st.footHidden&&st.coordHidden, JSON.stringify({top:st.topHidden,foot:st.footHidden,coord:st.coordHidden}));
  if (lang==='bn') { const lat=await p.evaluate(()=>[...document.querySelectorAll('#astroView *')].filter(e=>e.children.length===0&&/[A-Za-z]{3,}/.test(e.textContent)).map(e=>e.textContent)); ok('expanded page (bn): no stray English words', lat.every(t=>/UTC|Asia\/Dhaka|^Dhaka$/.test(t)), JSON.stringify(lat)); }
  const t1=await p.$eval('#liveClock',e=>e.textContent); await sleep(2200); const t2=await p.$eval('#liveClock',e=>e.textContent);
  ok(`top-bar clock keeps running (${lang})`, t1!==t2, `${t1} → ${t2}`);
  const a0=await angle(p); const c=await stageCenter(p);
  await p.mouse.move(c.cx+c.R*0.85,c.cy); await p.mouse.down(); for(let i=1;i<=10;i++){await p.mouse.move(c.cx+c.R*0.85,c.cy+i*10);await sleep(15);} await p.mouse.up(); await sleep(1500);
  ok(`astrolabe is rotatable on the expanded page (${lang})`, Math.abs((await angle(p))-a0)>1);
  if (lang==='en') await p.screenshot({path:SHOTS+'astro-expanded-en.png',fullPage:true}); else await p.screenshot({path:SHOTS+'astro-expanded-bn.png',fullPage:true});
  await p.click('#astroBack'); await sleep(1600);
  const back=await p.evaluate(()=>({home:!document.querySelector('#homeView').hidden, row:!!document.querySelector('.instrument-row #skyPanel'), clock:!!document.querySelector('#clockCard #analogClockButton'), cls:document.body.classList.contains('astro-expanded')}));
  ok(`Back returns home with both instruments restored (${lang})`, back.home&&back.row&&back.clock&&!back.cls, JSON.stringify(back));
  ok(`no console errors on the astrolabe page (${lang})`, p.errs.length===0, p.errs.join('|'));
  await p.close();
}
for (const [w,h,s] of [[1920,1080,1],[1366,768,1.25],[800,900,1],[420,700,1]]) {
  const p=await open(b,{lang:'en',w,h,at:T,scale:s});
  const r=await M(p,'#astroStage'); await p.mouse.click(r.x+r.w*0.65,r.y+r.h*0.62); await sleep(1600);
  const o=await p.evaluate(()=>{const bad=[...document.querySelectorAll('#astroView .astro-info, #astroView .astro-info *, .topbar *')].filter(e=>{const r=e.getBoundingClientRect(); return r.width>0&&(r.right>innerWidth+1||r.left<-1)}).length; return {sw:document.documentElement.scrollWidth,iw:innerWidth,bad,stage:document.querySelector('#astroStage').getBoundingClientRect().width}});
  ok(`expanded astrolabe page fits horizontally at ${w}x${h}@${s}x`, o.sw<=o.iw+1&&o.bad===0, JSON.stringify(o));
  await p.close();
}
// clock page <-> astrolabe page
{
  const p=await open(b,{lang:'en',w:1280,h:720,at:T});
  await p.click('#analogClockButton'); await sleep(1500);
  const r=await M(p,'#astroStage'); await p.mouse.click(r.x+r.w*0.3,r.y+r.h*0.7); await sleep(1700);
  const s1=await page(p); const clk=await p.evaluate(()=>({top:!!document.querySelector('#topbarClock #analogClockButton'), timeHidden:document.querySelector('#timeView').hidden}));
  ok('clicking the top-bar astrolabe on the clock page switches to the astrolabe page', s1.astro&&clk.top&&clk.timeHidden, JSON.stringify([s1,clk]));
  await p.click('#analogClockButton'); await sleep(1700);
  const s2=await p.evaluate(()=>({time:!document.querySelector('#timeView').hidden, astro:!document.querySelector('#astroView').hidden, bigClock:!!document.querySelector('#clockBigSlot #analogClockButton'), topAstro:!!document.querySelector('#topbarAstro #skyPanel')}));
  ok('clicking the top-bar clock on the astrolabe page switches back to the clock page', s2.time&&!s2.astro&&s2.bigClock&&s2.topAstro, JSON.stringify(s2));
  await p.click('#timeBack'); await sleep(1500);
  ok('Back from there returns home', await p.evaluate(()=>!document.querySelector('#homeView').hidden&&!!document.querySelector('.instrument-row #skyPanel')));
  ok('no console errors (page switching)', p.errs.length===0, p.errs.join('|'));
  await p.close();
}

// ---------------- 4. detail, flip, persistence ----------------
const textsUpright=p=>p.evaluate(()=>{const out=[]; for(const t of document.querySelectorAll('#avBody text')){ const m=t.getScreenCTM(); const det=m.a*m.d-m.b*m.c; if(det<=0) out.push(t.textContent); } return out;});
{
  const p=await open(b,{lang:'en',w:1280,h:720,at:T});
  const home=await p.evaluate(()=>({det:getComputedStyle(document.querySelector('#avDetailFixed')).opacity, cls:document.querySelector('#astroStage').classList.contains('is-detailed'), w:document.querySelector('#astroStage').offsetWidth}));
  ok('home astrolabe stays clean (detail layers hidden while small)', home.det==='0'&&!home.cls, JSON.stringify(home));
  const r=await M(p,'#astroStage'); await p.mouse.click(r.x+r.w*0.65,r.y+r.h*0.62); await sleep(1700);
  await p.click('#astroRotateBtn'); await sleep(250); // Rotate on
  const big=await p.evaluate(()=>({det:getComputedStyle(document.querySelector('#avDetailFixed')).opacity, rete:getComputedStyle(document.querySelector('#skyReteDetail')).opacity, labels:[...document.querySelectorAll('.av-star-label')].map(e=>e.textContent), ticks:(document.querySelector('.av-d-limb path')||{getAttribute:()=>''}).getAttribute('d').split('M').length-1}));
  ok('enlarged astrolabe shows the finer detail (1° scale, star names)', big.det==='1'&&big.rete==='1'&&big.labels.length>=10&&big.ticks>250, JSON.stringify({det:big.det,labels:big.labels.length,ticks:big.ticks}));
  ok('star names are upright on screen', (await p.evaluate(()=>[...document.querySelectorAll('.av-star-label')].every(e=>{const m=e.getScreenCTM(); return Math.abs(m.b)<0.02&&m.a>0}))));
  // rotate then check labels still upright
  const c=await stageCenter(p); await p.mouse.move(c.cx+c.R*0.85,c.cy); await p.mouse.down(); for(let i=1;i<=12;i++){await p.mouse.move(c.cx+c.R*0.85,c.cy+i*14);await sleep(15);} await p.mouse.up(); await sleep(1600);
  ok('star names stay upright after turning the instrument', await p.evaluate(()=>[...document.querySelectorAll('.av-star-label')].every(e=>{const m=e.getScreenCTM(); return Math.abs(m.b)<0.02&&m.a>0})), `angle=${(await angle(p)).toFixed(1)}`);
  ok('all printed text reads normally (not mirrored) before flipping', (await textsUpright(p)).length===0);
  const aBefore=await angle(p);
  // flip with animation sampled mid-way
  await p.click('#astroFlipBtn'); await sleep(120);
  const mid=await p.evaluate(()=>{const f=document.querySelector('#astroFlip'); const an=f.getAnimations(); return {anim:an.length, tf:getComputedStyle(f).transform, flipping:document.querySelector('#astroStage').classList.contains('is-flipping')}});
  ok('flip is a 3D coin-flip animation (rotateY in progress)', mid.anim>0&&mid.flipping&&mid.tf!=='none', JSON.stringify(mid));
  await sleep(900);
  const fl=await p.evaluate(()=>({flipped:document.querySelector('#astroStage').dataset.flipped, pressed:document.querySelector('#astroFlipBtn').getAttribute('aria-pressed'), saved:JSON.parse(localStorage.getItem('prayer-times-data')).astro, mirror:document.querySelector('#avMirror').getAttribute('transform')}));
  ok('flip toggles the flip only (rotation unchanged) and is saved', fl.flipped==='1'&&fl.pressed==='true'&&fl.saved.flipped===true&&Math.abs((await angle(p))-aBefore)<0.01&&/scale\(-1 1\)/.test(fl.mirror), JSON.stringify(fl)+` angle ${aBefore.toFixed(2)}→${(await angle(p)).toFixed(2)}`);
  ok('flipped view keeps every printed word and number readable (not mirrored)', (await textsUpright(p)).length===0, (await textsUpright(p)).join(','));
  ok('star names upright when flipped', await p.evaluate(()=>[...document.querySelectorAll('.av-star-label')].every(e=>{const m=e.getScreenCTM(); return Math.abs(m.b)<0.02&&m.a>0})));
  // drag direction follows the hand when flipped
  const a1=await angle(p); const c2=await stageCenter(p);
  await p.mouse.move(c2.cx+c2.R*0.85,c2.cy); await p.mouse.down(); for(let i=1;i<=10;i++){await p.mouse.move(c2.cx+c2.R*0.85,c2.cy+i*10);await sleep(15);} await sleep(200); await p.mouse.up(); await sleep(1500);
  const a2=await angle(p);
  ok('flipped: dragging down on the right side turns it the opposite internal way (still follows the hand)', (a2-a1)<-1 && aBefore!==0, `Δ=${(a2-a1).toFixed(1)}°`);
  await p.screenshot({path:SHOTS+'astro-flipped-page.png',fullPage:true});
  const rr=await M(p,'#astroStage'); await p.screenshot({path:SHOTS+'astro-flipped-closeup.png',clip:{x:rr.x-8,y:rr.y-8,width:rr.w+28,height:rr.h+28}});
  // reload: both restored
  const angSaved=await angle(p); await sleep(600);
  await p.reload({waitUntil:'networkidle0'}); await sleep(900);
  const rl=await p.evaluate(()=>({flipped:document.querySelector('#astroStage').dataset.flipped, angle:parseFloat(document.querySelector('#astroStage').dataset.angle)}));
  ok('rotation and flip are restored after a reload', rl.flipped==='1'&&Math.abs(rl.angle-angSaved)<0.1, JSON.stringify(rl)+` saved=${angSaved.toFixed(2)}`);
  // Home / double-click resets rotation only
  await p.click('#astroRotateBtn'); await sleep(300); await p.focus('#astroStage'); await p.keyboard.press('Home'); await sleep(3400);
  const rs=await p.evaluate(()=>({flipped:document.querySelector('#astroStage').dataset.flipped, angle:parseFloat(document.querySelector('#astroStage').dataset.angle), saved:JSON.parse(localStorage.getItem('prayer-times-data')).astro}));
  ok('Home resets rotation only (flip stays), and that is saved', rs.flipped==='1'&&Math.abs(rs.angle)<0.1&&rs.saved.flipped===true&&Math.abs(rs.saved.angle)<0.1, JSON.stringify(rs));
  await p.click('#astroFlipBtn'); await sleep(900);
  ok('flip button toggles back', (await p.$eval('#astroStage',e=>e.dataset.flipped))==='0');
  ok('no console errors (detail/flip)', p.errs.length===0, p.errs.join('|'));
  await p.close();
}
{
  const p=await open(b,{lang:'bn',w:1280,h:720,at:T,data:{astro:{angle:35,flipped:true}}});
  const tt=await p.evaluate(()=>({title:document.querySelector('#astroFlipBtn').title, aria:document.querySelector('#astroFlipBtn').getAttribute('aria-label'), flipped:document.querySelector('#astroStage').dataset.flipped, angle:document.querySelector('#astroStage').dataset.angle}));
  ok('flip button label and tooltip are Bangla; saved orientation applied on start', /উল্টান/.test(tt.title)&&/উল্টান/.test(tt.aria)&&tt.flipped==='1'&&Math.abs(parseFloat(tt.angle)-35)<0.01, JSON.stringify(tt));
  await p.close();
}

// ---------------- 5. rewards ----------------
const rw=p=>p.evaluate(()=>{const e=document.querySelector('#voluntaryReward'); const c=document.querySelector('#progressCore'); const er=e.getBoundingClientRect(); const bad=[...e.querySelectorAll('*')].filter(x=>{const r=x.getBoundingClientRect(); return r.width>0&&(r.right>er.right+1||r.left<er.left-1)}).length; return {hidden:e.hidden, kind:e.dataset.kind, text:e.innerText.replace(/\s+/g,' '), core:c.innerText, bad, clipped:e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1, title:document.querySelector('#progressTitle').textContent}});
for (const lang of ['en','bn']) {
  const pace={sunnah:2,nafl:1,voluntary:5};
  // fard
  let p=await open(b,{lang,w:1280,h:720,at:T,data:{recognitionPace:pace}});
  await p.click('.round-check.layer-fard'); await sleep(400); let r=await rw(p);
  ok(`fard tick shows La ilaha illallah in a readable panel (${lang})`, !r.hidden&&r.kind==='fard'&&(lang==='en'?/La ilaha illallah.*There is no god but Allah/.test(r.text):/লা ইলাহা ইল্লাল্লাহ.*আল্লাহ ছাড়া কোনো উপাস্য নেই/.test(r.text))&&r.bad===0&&!r.clipped&&/[1১]\/[5৫]/.test(r.core), JSON.stringify(r));
  const fs=await p.evaluate(()=>{const e=document.querySelector('#voluntaryReward .recog-tr'); return parseFloat(getComputedStyle(e).fontSize)}); ok(`reward phrase is at a readable size (${lang})`, fs>=13, `${fs}px`);
  await p.screenshot({path:SHOTS+`reward-fard-${lang}.png`});
  await sleep(2800); r=await rw(p); ok(`fard phrase still visible at 3.2 s of its 5 s (${lang})`, !r.hidden, JSON.stringify(r));
  await sleep(2800); r=await rw(p); ok(`fard phrase cleared by itself after its 5 s (${lang})`, r.hidden&&r.text==='', JSON.stringify(r));
  ok(`no console errors (fard reward ${lang})`, p.errs.length===0, p.errs.join('|')); await p.close();
  // voluntary
  p=await open(b,{lang,w:1280,h:720,at:'2026-11-15T08:00:00+06:00',data:{recognitionPace:pace}});
  await p.click('.mark-event-complete'); await sleep(400); r=await rw(p);
  ok(`voluntary Mark Complete shows SubhanAllah (${lang})`, !r.hidden&&r.kind==='voluntary'&&(lang==='en'?/SubhanAllah/.test(r.text)&&/Glory be to Allah/.test(r.text):/সুবহানাল্লাহ/.test(r.text)&&/আল্লাহ পবিত্র/.test(r.text))&&r.bad===0&&!r.clipped, JSON.stringify(r));
  await p.screenshot({path:SHOTS+`reward-voluntary-${lang}.png`});
  await sleep(3800); r=await rw(p); ok(`voluntary reward still visible at 4.2 s of its 5 s (${lang})`, !r.hidden);
  await sleep(1700); r=await rw(p); ok(`voluntary reward clears after the configured 5 s (${lang})`, r.hidden&&r.text==='', JSON.stringify(r));
  ok(`no console errors (voluntary reward ${lang})`, p.errs.length===0, p.errs.join('|')); await p.close();
  // day complete
  const rec={fard:{fajr:true,dhuhr:true,asr:true,maghrib:true},sunnah:{fajr_before:true,dhuhr_before:true,dhuhr_after:true,maghrib_after:true,isha_after:true},nafl:{dhuhr_nafl:true,asr_before:true,maghrib_nafl:true,isha_before:true,isha_nafl:true},voluntary:{duha:true,awwabin:true,qiyam:true,tahajjud:true,tarawih:true,witr:true,eid_prayer:true}};
  p=await open(b,{lang,w:1280,h:720,at:'2026-11-15T19:00:00+06:00',data:{recognitionPace:{sunnah:2,nafl:1,voluntary:5},history:{'2026-11-15':rec}}});
  await p.click('.round-check.layer-fard'); await sleep(500); r=await rw(p);
  ok(`completing the fifth Fard shows the Fard phrase and leaves the disc verse (${lang})`, !r.hidden&&r.kind==='fard'&&(lang==='en'?/La ilaha illallah/.test(r.text):/লা ইলাহা ইল্লাল্লাহ/.test(r.text))&&r.bad===0&&!r.clipped, JSON.stringify(r));
  await p.screenshot({path:SHOTS+`reward-daycomplete-${lang}.png`});
  const disc=await p.evaluate(()=>({svg:(document.querySelector('#progressFigure .pf-reward')||{}).textContent||'', caption:document.querySelector('#progressCaption').textContent}));
  ok(`five Fard: 23:1 is in the disc and the caption (${lang})`, /قَدْ أَفْلَحَ الْمُؤْمِنُونَ/.test(disc.svg)&&(lang==='en'?/Qad aflaha|believers have succeeded|Mu'minun 23:1/.test(disc.caption):/কাদ আফলাহাল|সফলকাম|আল-মুমিনুন ২৩:১/.test(disc.caption)), JSON.stringify(disc));
  await sleep(6200); r=await rw(p);
  const disc2=await p.evaluate(()=>(document.querySelector('#progressFigure .pf-reward')||{}).textContent||'');
  ok(`after the timed phrase, the disc verse remains (${lang})`, r.hidden&&/قَدْ أَفْلَحَ الْمُؤْمِنُونَ/.test(disc2), JSON.stringify({r,disc2}));
  ok(`no console errors (day complete ${lang})`, p.errs.length===0, p.errs.join('|')); await p.close();
}
await b.close();
const fails=results.filter(r=>!r[0]); console.log(`\n${results.length-fails.length}/${results.length} passed`); fs.writeFileSync('/tmp/e2e211-results.txt',results.map(r=>(r[0]?'PASS ':'FAIL ')+r[1]+(r[2]?'  — '+r[2]:'')).join('\n')); process.exit(fails.length?1:0);

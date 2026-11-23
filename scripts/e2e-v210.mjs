// v2.1.0 scripted interaction tests. Needs the vite dev server on :1420 and puppeteer-core + Chrome.
import {launch,open,sleep,latin} from './lib.mjs';
const results=[]; const ok=(n,c,d='')=>{results.push([c,n,d]); console.log((c?'PASS ':'FAIL ')+n+(d?'  — '+d:''));};
const b=await launch();
const M=(p,sel)=>p.evaluate(s=>{const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(); return {w:r.width,h:r.height,x:r.x,y:r.y}},sel);
const stageAngle=p=>p.evaluate(()=>parseFloat(document.querySelector('#astroStage').dataset.angle));
const center=async(p)=>{const r=await M(p,'#astroStage'); return {cx:r.x+r.w/2, cy:r.y+r.h/2, R:r.w/2}};

// ---- 1. tick = 80% of Mark Complete (Fard, Sunnah, Nafl, voluntary) at several sizes and scales
for (const [w,h,s] of [[1280,720,1],[1366,768,1.25],[1920,1080,1.5],[1024,640,1]]) {
  for (const [at,label] of [['2026-11-15T12:30:00+06:00','fard/sunnah/nafl'],['2026-11-15T08:00:00+06:00','voluntary']]) {
    const p=await open(b,{w,h,at,scale:s}); 
    const mc=await M(p,'.mark-event-complete');
    // v2.3.0: ranked sizes: main Fard tick 90%, Sunnah 80%, Nafl / optional / voluntary 70% (the 0.80 rule of v2.1.0 is retired)
    const ticks=await p.evaluate(()=>[...document.querySelectorAll('.live-event .round-check, .live-event .part-tick i')].map(e=>{const r=e.getBoundingClientRect();const c=e.closest('.part-tick')?.className||'round-check';const want=/\bsunnah\b/.test(c)?.8:/\b(nafl|voluntary)\b/.test(c)?.7:.9;return [Math.round(r.width*100)/100,Math.round(r.height*100)/100,want]}));
    const bad=ticks.filter(([tw,th,want])=>Math.abs(tw/mc.h-want)>0.02||Math.abs(th/mc.h-want)>0.02);
    ok(`tick diameter = rank × Mark Complete height (Fard .9, Sunnah .8, Nafl/voluntary .7) [${label}, ${w}x${h} @${s}x]`, ticks.length>0&&bad.length===0, `MC=${mc.h.toFixed(1)}px ticks=${ticks.length} ratios=${[...new Set(ticks.map(t=>(t[0]/mc.h).toFixed(3)))].join(',')}`);
    await p.close();
  }
}

// ---- 2. astrolabe drag / momentum / fine mode / wheel / keys / reset
{
  const p=await open(b,{w:1280,h:720,at:'2026-11-15T12:30:00+06:00'});
  await p.click('#astroRotateBtn'); await sleep(250); // v2.2.0: rotation is locked until Rotate is switched on
  const {cx,cy,R}=await center(p);
  const a0=await stageAngle(p);
  // slow fine drag near the rim: 60px of movement
  await p.mouse.move(cx+R*0.85,cy); await p.mouse.down();
  for(let i=1;i<=12;i++){ await p.mouse.move(cx+R*0.85, cy+ i*5); await sleep(40);} await sleep(300); await p.mouse.up();
  await sleep(1500); const a1=await stageAngle(p);
  // fast flick
  await p.mouse.move(cx+R*0.85,cy); await p.mouse.down();
  for(let i=1;i<=6;i++){ await p.mouse.move(cx+R*0.85, cy+ i*25); await sleep(8);} await p.mouse.up();
  const aFlickEnd=await stageAngle(p); await sleep(150); const aMid=await stageAngle(p); await sleep(2500); const aRest=await stageAngle(p);
  ok('astrolabe rotates with mouse drag (fine)', Math.abs(a1-a0)>0.5, `Δ=${(a1-a0).toFixed(2)}°`);
  ok('fast flick moves farther than slow drag', Math.abs(aRest-a1)>Math.abs(a1-a0)*2, `slow=${(a1-a0).toFixed(1)}° flick=${(aRest-a1).toFixed(1)}°`);
  ok('momentum: keeps rotating after release, then comes to rest', Math.abs(aMid-aFlickEnd)>0.3 && Math.abs((await stageAngle(p))-aRest)<0.05, `after release +${(aMid-aFlickEnd).toFixed(1)}° then settled at ${aRest.toFixed(1)}°`);
  // shift = fine: same pixel drag gives much smaller rotation
  const f0=await stageAngle(p);
  await p.keyboard.down('Shift'); await p.mouse.move(cx+R*0.5,cy); await p.mouse.down();
  for(let i=1;i<=12;i++){ await p.mouse.move(cx+R*0.5, cy+ i*5); await sleep(40);} await sleep(300); await p.mouse.up(); await p.keyboard.up('Shift'); await sleep(1500);
  const f1=await stageAngle(p);
  const s0=await stageAngle(p);
  await p.mouse.move(cx+R*0.5,cy); await p.mouse.down();
  for(let i=1;i<=12;i++){ await p.mouse.move(cx+R*0.5, cy+ i*5); await sleep(40);} await sleep(300); await p.mouse.up(); await sleep(1500);
  const s1=await stageAngle(p);
  ok('Shift gives fine adjustment (smaller rotation for the same drag)', Math.abs(f1-f0)>0.02 && Math.abs(f1-f0) < Math.abs(s1-s0)*0.5, `fine=${(f1-f0).toFixed(2)}° normal=${(s1-s0).toFixed(2)}°`);
  // wheel + keys + reset
  const w0=await stageAngle(p); await p.mouse.move(cx,cy); await p.mouse.wheel({deltaY:120}); await sleep(900); const w1=await stageAngle(p);
  ok('mouse wheel gives a small smooth glide', Math.abs(w1-w0)>0.1 && Math.abs(w1-w0)<15, `Δ=${(w1-w0).toFixed(2)}°`);
  await p.focus('#astroStage'); await p.keyboard.press('ArrowRight'); await sleep(900); const k1=await stageAngle(p);
  ok('arrow keys rotate', Math.abs(k1-w1)>0.1, `Δ=${(k1-w1).toFixed(2)}°`);
  await p.mouse.click(cx,cy,{count:2}); let r1=await stageAngle(p); const t0=Date.now(); for(let i=0;i<40;i++){ await sleep(250); const n=await stageAngle(p); if(Math.abs(n-r1)<0.001) break; r1=n; } const tReset=((Date.now()-t0)/1000).toFixed(1);
  ok('double-click resets to 0° (smoothly, no snap)', Math.abs(((r1+180)%360+360)%360-180)<0.5, `angle=${r1.toFixed(2)}° after ${tReset}s`);
  // no distortion: stage keeps aspect 1:1 after rotation; svg rotates via transform on inner group
  const sq=await M(p,'#astroStage'); ok('astrolabe stage stays perfectly square (no distortion)', Math.abs(sq.w-sq.h)<0.6, `${sq.w.toFixed(1)}×${sq.h.toFixed(1)}`);
  // motion of sun/moon visible: rete rotation changes between two times
  ok('no console errors on home', p.errs.length===0, p.errs.join('|'));
  await p.close();
}

// ---- 3. clock expand / back; astrolabe in top bar and still rotatable
{
  const p=await open(b,{w:1280,h:720,at:'2026-11-15T12:30:00+06:00'});
  await p.click('#astroRotateBtn'); await sleep(250); // v2.2.0: Rotate on
  await p.click('#analogClockButton'); await sleep(1300);
  const st=await p.evaluate(()=>({exp:document.body.classList.contains('clock-expanded'), top:!!document.querySelector('#topbarAstro #skyPanel'), shown:!document.querySelector('#timeView').hidden, big:!!document.querySelector('#clockBigSlot #analogClockButton'), home:document.querySelector('#homeView')?.hidden}));
  ok('clock click opens expanded page; astrolabe moved to top bar; clock in the page', st.exp&&st.top&&st.shown&&st.big, JSON.stringify(st));
  const txt=await p.evaluate(()=>document.querySelector('#timeView').innerText);
  ok('expanded page shows status, countdown, timings', /Dhuhr/.test(txt)&&/\d\d:\d\d:\d\d/.test(txt)&&/Asr/.test(txt)&&/Preferred/i.test(txt), txt.replace(/\s+/g,' ').slice(0,120));
  const {cx,cy,R}=await center(p); const a0=await stageAngle(p);
  await p.mouse.move(cx+R*0.85,cy); await p.mouse.down(); for(let i=1;i<=10;i++){await p.mouse.move(cx+R*0.85,cy+i*8);await sleep(15);} await p.mouse.up(); await sleep(1500);
  ok('astrolabe in the top bar remains rotatable', Math.abs((await stageAngle(p))-a0)>0.5, `Δ=${((await stageAngle(p))-a0).toFixed(1)}°`);
  await p.click('#timeBack'); await sleep(1300);
  const st2=await p.evaluate(()=>({exp:document.body.classList.contains('clock-expanded'), row:!!document.querySelector('.instrument-row #skyPanel'), clock:!!document.querySelector('.clock-card #analogClockButton'), shown:document.querySelector('#timeView').hidden}));
  ok('Back returns to the prayers page with both instruments restored', !st2.exp&&st2.row&&st2.clock&&st2.shown, JSON.stringify(st2));
  ok('no console errors during expand/back', p.errs.length===0, p.errs.join('|'));
  await p.close();
}

// ---- 4. Fard tick + Mark Complete; voluntary ticks, >12 input, reward and recognition seconds
{
  const p=await open(b,{w:1280,h:720,at:'2026-11-15T08:00:00+06:00',data:{recognitionPace:{sunnah:2,nafl:1,voluntary:3}}});
  const only=await p.evaluate(()=>({ticks:document.querySelectorAll('.live-event .vol-ticks .part-tick').length, mc:!!document.querySelector('.live-event .mark-event-complete'), oldRakah:!!document.querySelector('.live-event [data-rakah-set], .live-event .rakah-sets, .live-event .rakah-set')}));
  ok('voluntary event shows Mark Complete + 6 two-rakah ticks, old rakah-set UI gone', only.ticks===6&&only.mc&&!only.oldRakah, JSON.stringify(only));
  for(let i=0;i<3;i++){ await p.click(`.live-event [data-vol-index="${i}"]`); await sleep(150); }
  const c3=await p.$eval('[data-vol-count]',e=>e.textContent); ok('ticking 3 sets = 6 rak‘ahs', /^6 /.test(c3), c3);
  // persisted
  const stored=JSON.parse(await p.evaluate(()=>localStorage.getItem('prayer-times-data')));
  const rec=/"rakahs":6|"rakahSets"/.test(JSON.stringify(stored))||(JSON.stringify(stored).match(/duha[^}]{0,200}/)||[''])[0]; console.log('   stored sample:',JSON.stringify(stored).match(/.{0,80}duha.{0,160}/)?.[0]);
  ok('voluntary rakahs persisted in existing storage', !!rec);
  await p.reload({waitUntil:'networkidle0'}); await sleep(800);
  const c3b=await p.$eval('[data-vol-count]',e=>e.textContent); ok('survives reload', /^6 /.test(c3b), c3b);
  // > 12 validation
  const submit=async v=>{ await p.$eval('#volExtra-duha',e=>{e.value=''}); if(v!=='') await p.type('#volExtra-duha',v); await p.click('.vol-extra-set'); await sleep(200); return {msg:await p.$eval('.vol-extra-msg',e=>e.textContent), count:await p.$eval('[data-vol-count]',e=>e.textContent), val:await p.$eval('#volExtra-duha',e=>e.value)}; };
  for (const bad of ['abc','-4','12','13','3.5','0','1000000','']) { const r=await submit(bad); ok(`>12 input rejects ${JSON.stringify(bad)}`, r.msg.length>0 && !/^(13|1000000) /.test(r.count), `msg="${r.msg}" count="${r.count}"`); }
  const g=await submit('20'); ok('>12 input accepts 20 (even)', /^20 /.test(g.count) && g.msg==='' , `count=${g.count} msg="${g.msg}"`);
  const g2=await submit('14'); ok('>12 input accepts 14', /^14 /.test(g2.count), g2.count);
  await p.click('[data-vol-index="5"]'); await sleep(200);
  const afterUntick=await p.$eval('[data-vol-count]',e=>e.textContent); ok('un-ticking the last circle falls back to the twelve rak‘ahs of the ticks', /^12 /.test(afterUntick), afterUntick);
  // reward
  await p.click('.mark-event-complete'); await sleep(400);
  const rw=await p.evaluate(()=>{const e=document.querySelector('#voluntaryReward'); return {hidden:e.hidden, text:e.innerText}});
  ok('Mark Complete shows the voluntary reward phrase (SubhanAllah)', !rw.hidden&&/SubhanAllah|Glory be to Allah|সুবহানাল্লাহ/.test(rw.text), rw.text.replace(/\s+/g,' ').slice(0,160));
  await sleep(1800); const mid=await p.$eval('#voluntaryReward',e=>!e.hidden); await sleep(2200); const gone=await p.$eval('#voluntaryReward',e=>e.hidden);
  ok('reward stays for the configured 3 s and then disappears', mid&&gone, `visible@2.2s=${mid} hiddenAfter4.4s=${gone}`);
  ok('no console errors (voluntary)', p.errs.length===0, p.errs.join('|'));
  await p.close();
}
// One reward-seconds setting applies to every phrase, including Fard
{
  const p=await open(b,{w:1280,h:720,at:'2026-11-15T12:30:00+06:00',data:{recognitionPace:{sunnah:2,nafl:1,voluntary:5}}});
  await p.click('.round-check.layer-fard'); await sleep(400);
  const shown=await p.evaluate(()=>{const e=document.querySelector('#voluntaryReward'); return {hidden:e.hidden, kind:e.dataset.kind, text:e.innerText};});
  ok('Fard tick shows La ilaha illallah in the reward panel', !shown.hidden&&shown.kind==='fard'&&/La ilaha illallah|There is no god but Allah/.test(shown.text), JSON.stringify(shown));
  await sleep(2600);
  const mid=await p.evaluate(()=>!document.querySelector('#voluntaryReward').hidden);
  await sleep(3200);
  const gone=await p.evaluate(()=>document.querySelector('#voluntaryReward').hidden);
  ok('Fard phrase uses the shared reward seconds (visible at 3 s, gone after 5 s)', mid&&gone, `visible@3s=${mid} hiddenAfter6s=${gone}`);
  await p.close();
}
// Settings: voluntary seconds persists, Bangla label, profile expanded, reminders tabs
{
  const p=await open(b,{w:1280,h:720,at:'2026-11-15T12:30:00+06:00'});
  await p.click('#settingsToggle'); await sleep(500);
  await p.$eval('#voluntarySeconds',e=>{e.value='';}); await p.type('#voluntarySeconds','17'); await p.$eval('#voluntarySeconds',e=>e.dispatchEvent(new Event('change',{bubbles:true}))); await sleep(300);
  const sv=JSON.parse(await p.evaluate(()=>localStorage.getItem('prayer-times-data'))).recognitionPace;
  ok('voluntary recognition seconds persisted', sv.voluntary===17 && sv.sunnah>0, JSON.stringify(sv));
  await p.$eval('#voluntarySeconds',e=>{e.value='';}); await p.type('#voluntarySeconds','999'); await p.$eval('#voluntarySeconds',e=>e.dispatchEvent(new Event('change',{bubbles:true}))); await sleep(300);
  ok('out-of-range seconds is clamped', (JSON.parse(await p.evaluate(()=>localStorage.getItem('prayer-times-data'))).recognitionPace.voluntary)<=120);
  const prof=await p.evaluate(()=>({det:!!document.querySelector('details.calculation-profile'), vis:document.querySelector('.profile-controls').offsetHeight>0}));
  ok('Calculation Profile permanently expanded (no collapse control)', !prof.det&&prof.vis, JSON.stringify(prof));
  await p.click('[data-pref-tab="end"]'); await sleep(200);
  const tabs=await p.evaluate(()=>({b:document.querySelector('#prefPanelBegin').hidden,e:document.querySelector('#prefPanelEnd').hidden}));
  ok('two preferred-time reminder tabs switch', tabs.b===true&&tabs.e===false, JSON.stringify(tabs));
  await p.click('#prefEnableEnd'); await sleep(200);
  const pr=JSON.parse(await p.evaluate(()=>localStorage.getItem('prayer-times-data'))).prefReminders;
  ok('preferred-end reminder switch persisted independently', pr&&pr.end&&pr.end.enabled===true&&!(pr.begin&&pr.begin.enabled), JSON.stringify(pr).slice(0,200));
  await p.close();
}
await b.close();
const fails=results.filter(r=>!r[0]); console.log(`\n${results.length-fails.length}/${results.length} passed`); process.exit(fails.length?1:0);

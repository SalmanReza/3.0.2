// v2.3.0 checks: tick diameters (Mark Complete 100 / Fard 90 / Sunnah 80 / Nafl + optional + voluntary 70) on home and the expanded countdown page,
// Bangla tooltips for Rotate/Flip (live switch, expanded page, on/off wording), settings crown rendering, logo B. Headless Chrome, Vite dev server.
import {launch,open,sleep} from './lib.mjs';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const SHOTS='/workspace/prayer/shots230/'; fs.mkdirSync(SHOTS,{recursive:true});
const b=await launch(); let pass=0, fail=0; const out=[];
const ok=(name,cond,info='')=>{ (cond?pass++:fail++); const line=`${cond?'PASS':'FAIL'} ${name}${info?'  — '+info:''}`; out.push(line); console.log(line); };
const near=(a,b,t=0.6)=>Math.abs(a-b)<=t;
const THEMES=[['dark',null],['light','Porcelain']];
const probe=p=>p.evaluate(()=>{
  const w=e=>e?+e.getBoundingClientRect().width.toFixed(2):null; const h=e=>e?+e.getBoundingClientRect().height.toFixed(2):null;
  const sh=document.querySelector('.app-shell'); const t=document.createElement('i'); t.style.cssText='position:absolute;visibility:hidden;width:var(--mc-h);height:1px'; sh.append(t); const mc=t.getBoundingClientRect().width; t.remove();
  const q=s=>[...document.querySelectorAll(s)];
  const labelOf=e=>(e.closest('.part-tick')?.querySelector('span')?.textContent||'').trim();
  return {mc, mark:w(document.querySelector('.live-event .mark-event-complete')),
    main:q('.live-event .round-check').map(w),
    ticks:q('.live-event .part-tick, #eventCompletionCard .part-tick').filter(e=>e.getBoundingClientRect().width>0).map(e=>({cls:e.className.replace(/\s+/g,' '),label:e.querySelector('span')?.textContent.trim(),d:w(e.querySelector('i')),h:h(e.querySelector('i'))})) };
});
async function setTheme(p,name){ if(!name) return; await p.evaluate(n=>{const d=JSON.parse(localStorage.getItem('prayer-times-data')); d.theme=n; localStorage.setItem('prayer-times-data',JSON.stringify(d));},name); await p.reload({waitUntil:'networkidle0'}); await sleep(900); }
const ratio=(d,mc)=>+(d/mc).toFixed(3);

// ---- 1. tick diameters on home (Isha card: main Fard tick, 4 before (optional), 2 Sunnah after, 2 Nafl)
for(const lang of ['en','bn']) for(const [tn,theme] of THEMES){
  const p=await open(b,{lang,w:1280,h:720,at:'2026-11-15T18:45:00+06:00'}); if(theme) await setTheme(p,theme);
  const r=await probe(p);
  const byCls=c=>r.ticks.filter(t=>new RegExp('\\b'+c+'\\b').test(t.cls));
  const main=r.main[0]; const sun=byCls('sunnah'), naf=byCls('nafl');
  ok(`home ${lang}/${tn}: Mark Complete is 100% (${r.mark}px)`, near(r.mark,r.mc));
  ok(`home ${lang}/${tn}: Fard tick = 90% of Mark Complete`, near(main,r.mc*.9), `${main}px = ${ratio(main,r.mc)}`);
  ok(`home ${lang}/${tn}: every Sunnah tick = 80%`, sun.length>0&&sun.every(t=>near(t.d,r.mc*.8)&&near(t.h,r.mc*.8)), JSON.stringify(sun.map(t=>t.d)));
  ok(`home ${lang}/${tn}: every Nafl tick, including the optional sunnah, = 70%`, naf.length>=2&&naf.every(t=>near(t.d,r.mc*.7)&&near(t.h,r.mc*.7)), JSON.stringify(naf.map(t=>[t.label,t.d])));
  const opt=r.ticks.find(t=>/optional|ঐচ্ছিক|ইচ্ছামূলক/i.test(t.label||''));
  ok(`home ${lang}/${tn}: the "(optional)" tick exists and is 70%`, !!opt&&near(opt.d,r.mc*.7), JSON.stringify(opt));
  const labels=await p.evaluate(()=>[...document.querySelectorAll('.live-event .part-tick')].map(e=>{const s=e.querySelector('span').getBoundingClientRect(),a=e.getBoundingClientRect();return {l:s.left>=a.left-1&&s.right<=a.right+1, sw:e.querySelector('span').scrollWidth<=e.querySelector('span').clientWidth+1}}));
  ok(`home ${lang}/${tn}: labels fit inside their tick buttons`, labels.every(x=>x.l&&x.sw), JSON.stringify(labels));
  const ov=await p.evaluate(()=>{const els=[...document.querySelectorAll('.live-event .part-tick')].map(e=>e.getBoundingClientRect()); for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){const a=els[i],c=els[j]; if(a.left<c.right-.5&&c.left<a.right-.5&&a.top<c.bottom-.5&&c.top<a.bottom-.5) return [i,j];} return null;});
  ok(`home ${lang}/${tn}: tick buttons do not overlap`, ov===null, JSON.stringify(ov));
  if(lang==='en') { const card=await p.$('.live-event'); await card.screenshot({path:SHOTS+`isha-ticks-${tn}-en.png`}); }
  if(lang==='bn'&&tn==='dark') { const card=await p.$('.live-event'); await card.screenshot({path:SHOTS+`isha-ticks-dark-bn.png`}); }
  await p.close();
}
// voluntary sets at 70% (Qiyam etc.), home
{ const p=await open(b,{lang:'en',w:1280,h:720,at:'2026-11-15T18:45:00+06:00'});
  const v=await p.evaluate(()=>{const sh=document.querySelector('.app-shell'); const t=document.createElement('i'); t.style.cssText='position:absolute;visibility:hidden;width:var(--mc-h);height:1px'; sh.append(t); const mc=t.getBoundingClientRect().width; t.remove(); return {mc,v:[...document.querySelectorAll('.part-tick.voluntary i')].map(e=>+e.getBoundingClientRect().width.toFixed(2))}});
  ok('voluntary set ticks on home = 70%', v.v.length>0&&v.v.every(d=>near(d,v.mc*.7)), JSON.stringify(v)); await p.close(); }

// ---- 2. expanded countdown page (#eventCompletionCard)
for(const [lang,at,key] of [['en','2026-11-15T18:45:00+06:00','isha'],['bn','2026-11-15T18:45:00+06:00','isha'],['en','2026-11-15T18:15:00+06:00','awwabin'],['bn','2026-11-15T18:15:00+06:00','awwabin']]) for(const [tn,theme] of THEMES){
  const p=await open(b,{lang,w:1280,h:720,at}); if(theme) await setTheme(p,theme);
  await p.evaluate(k=>{const e=[...document.querySelectorAll('[data-event-countdown]')].find(x=>x.dataset.key===k)||document.querySelector('[data-event-countdown]'); e.click();},key); await sleep(1100);
  const r=await probe(p); const t=r.ticks.filter(x=>x.d>0);
  const exp=c=>/\bfard\b/.test(c)?.9:/\bsunnah\b/.test(c)?.8:.7;
  ok(`countdown page ${lang}/${tn}/${key}: ${t.length} ticks, each at its rank (Fard 90 / Sunnah 80 / Nafl, optional, voluntary 70)`, t.length>0&&t.every(x=>near(x.d,r.mc*exp(x.cls))&&near(x.h,x.d)), JSON.stringify(t.map(x=>[x.cls.replace('part-tick ','').slice(0,22),x.d])));
  const fit=await p.evaluate(()=>[...document.querySelectorAll('#eventCompletionCard .part-tick')].every(e=>{const s=e.querySelector('span'); return s.scrollWidth<=s.clientWidth+1 && s.getBoundingClientRect().right<=e.getBoundingClientRect().right+1;}));
  ok(`countdown page ${lang}/${tn}/${key}: labels fit`, fit);
  if(key==='isha'&&lang==='en') { const card=await p.$('#eventCompletionCard'); await card.screenshot({path:SHOTS+`countdown-ticks-${tn}-en.png`}); }
  if(key==='isha'&&lang==='bn'&&tn==='dark') { const card=await p.$('#eventCompletionCard'); await card.screenshot({path:SHOTS+`countdown-ticks-dark-bn.png`}); }
  await p.close();
}
// nafl light edge is inside (inset), not outside
{ const p=await open(b,{lang:'en',w:1280,h:720,at:'2026-11-15T18:45:00+06:00'});
  const s=await p.evaluate(()=>{const e=document.querySelector('.live-event .part-tick.nafl i'); const c=getComputedStyle(e); return {sh:c.boxShadow, w:e.getBoundingClientRect().width, ow:e.offsetWidth}});
  ok('Nafl light edge is an inset shadow (outer diameter unchanged)', /inset/.test(s.sh)&&!/^rgba?\([^)]*\) 0px 0px 0px 1px(?! inset)/.test(s.sh), s.sh); await p.close(); }

// ---- 3. Bangla tooltips: live language switch, home + expanded page, on/off wording
{ const p=await open(b,{lang:'en',w:1280,h:720,at:'2026-11-15T12:30:00+06:00'});
  const T=()=>p.evaluate(()=>['astroRotateBtn','astroFlipBtn','astroTools'].map(i=>{const e=document.getElementById(i);return [e.title,e.getAttribute('aria-label')]}));
  const hasBn=s=>/[\u0980-\u09FF]/.test(s), noLat=s=>!/[A-Za-z]{3,}/.test(s);
  let t=await T(); ok('EN home: Rotate and Flip tooltips in English', t[0][0]==='Rotate the astrolabe: off (click to turn on)'&&t[1][0]==='Flip the astrolabe (not flipped)', JSON.stringify(t));
  await p.evaluate(()=>{const s=document.getElementById('languageSelect'); s.value='bn'; s.dispatchEvent(new Event('change',{bubbles:true}));}); await sleep(600);
  t=await T(); ok('live switch to Bangla: tooltips and aria-labels change at once (home)', t.every(x=>hasBn(x[0]||x[1])&&noLat(x[1])), JSON.stringify(t));
  await p.click('#astroRotateBtn'); await sleep(300); t=await T();
  ok('Bangla, Rotate ON wording', /চালু/.test(t[0][0])&&t[0][0]===t[0][1]&&noLat(t[0][0]), t[0][0]);
  await p.click('#astroFlipBtn'); await sleep(1200); t=await T();
  ok('Bangla, Flip state wording (flipped)', /উল্টানো/.test(t[1][0])&&noLat(t[1][0]), t[1][0]);
  await p.screenshot({path:SHOTS+'bn-home-before-tooltip.png'});
  await p.evaluate(()=>document.querySelector('#astroStage').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))); await sleep(1500);
  t=await T(); ok('Bangla: tooltips stay Bangla on the expanded astrolabe page', t.every(x=>hasBn(x[0]||x[1])&&noLat(x[1])), JSON.stringify(t));
  await p.evaluate(()=>{const s=document.getElementById('languageSelect'); if(s){s.value='en'; s.dispatchEvent(new Event('change',{bubbles:true}));}}); await sleep(600);
  t=await T(); const enBack=await p.evaluate(()=>document.documentElement.lang);
  ok('switching back to English (page language '+enBack+') restores English labels, state wording kept', /on \(click to turn off\)/.test(t[0][0])&&/flipped\)/.test(t[1][0]), JSON.stringify(t));
  await p.close(); }
// Bangla tooltip really visible: hover and screenshot (native tooltip is not captured in headless, so also show the title as an overlay)
{ const p=await open(b,{lang:'bn',w:1280,h:720,at:'2026-11-15T12:30:00+06:00'});
  const bx=await p.evaluate(()=>{const e=document.getElementById('astroRotateBtn'); const r=e.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height,t:e.title}});
  await p.mouse.move(bx.x+bx.w/2,bx.y+bx.h/2);
  await p.evaluate(t=>{const d=document.createElement('div'); d.id='tipShot'; d.textContent=t; const e=document.getElementById('astroRotateBtn').getBoundingClientRect(); d.style.cssText=`position:fixed;left:${e.left}px;top:${e.bottom+8}px;background:#fffbe6;color:#111;border:1px solid #888;padding:3px 7px;font:13px 'Segoe UI','Noto Sans Bengali',sans-serif;z-index:99999;box-shadow:0 2px 6px rgba(0,0,0,.4)`; document.body.append(d);},bx.t);
  await p.screenshot({path:SHOTS+'bn-tooltip-rotate.png',clip:{x:Math.max(0,bx.x-260),y:Math.max(0,bx.y-60),width:560,height:170}}); await p.close(); }

// ---- 4. settings crown: smooth edge, same size/position, gear, hover turn; crisp at 100/125/150/200%
for(const [dpr,tag] of [[1,'1x'],[1.25,'125'],[1.5,'150'],[2,'2x']]){
  const p=await open(b,{lang:'en',w:1280,h:720,at:'2026-11-15T12:30:00+06:00',scale:dpr});
  const c=await p.evaluate(()=>{const e=document.getElementById('settingsToggle'); const r=e.getBoundingClientRect(); const rem=parseFloat(getComputedStyle(document.documentElement).fontSize); const a=getComputedStyle(e,'::after'); const bf=getComputedStyle(e,'::before'); return {rem,w:r.width,h:r.height,x:r.x,y:r.y,after:a.backgroundImage,mask:a.maskImage||a.webkitMaskImage,hard:/1\.1deg|0 67%|transparent 67%/.test(a.backgroundImage+(a.maskImage||a.webkitMaskImage||'')),svg:!!e.querySelector('svg'),before:bf.boxShadow.slice(0,80)}});
  if(tag==='1x') ok('crown: no hard-edged knurl teeth (soft grooves, soft mask); size 2.55rem and engraved gear kept', !c.hard&&/repeating-conic-gradient/.test(c.after)&&c.svg&&Math.abs(c.w-2.55*c.rem)<0.6&&Math.abs(c.h-c.w)<0.1, JSON.stringify({w:c.w,h:c.h,hard:c.hard}));
  await p.screenshot({path:SHOTS+`crown-${tag}.png`,clip:{x:c.x-14,y:c.y-14,width:c.w+28,height:c.h+28}});
  if(dpr===2){ await p.hover('#settingsToggle'); await sleep(450); const rot=await p.evaluate(()=>getComputedStyle(document.querySelector('#settingsToggle svg')).transform); ok('crown: gear still turns on hover', rot!=='none'&&rot!=='matrix(1, 0, 0, 1, 0, 0)', rot); await p.screenshot({path:SHOTS+'crown-closeup-2x.png',clip:{x:c.x-18,y:c.y-18,width:c.w+36,height:c.h+36}}); }
  await p.close();
}
// ---- 5. logo B and version
{ const root=new URL('../', import.meta.url); const file=f=>fileURLToPath(new URL(f, root)); const read=f=>fs.readFileSync(file(f),'utf8'); const html=read('index.html'); const icon=read('src-tauri/icons/icon.svg'); const fav=read('public/favicon.svg');
  ok('logo B (crescent + star over rete rings) is in the header, favicon and icon.svg', html.includes('pBS')&&icon===fav&&icon===read('scripts/logo-b.svg')&&!/mihrab niche/.test(icon));
  const dims=f=>{const b=fs.readFileSync(file('src-tauri/icons/'+f)); return b.readUInt32BE(16)+'x'+b.readUInt32BE(20)};
  const ico=fs.readFileSync(file('src-tauri/icons/icon.ico')); const n=ico.readUInt16LE(4); const sizes=[...Array(n).keys()].map(i=>ico[6+i*16]||256);
  const d=['32x32.png','128x128.png','128x128@2x.png','icon.png'].map(dims);
  ok('Tauri PNGs (32, 128, 256, 512) and the ICO (16-256) are regenerated', d.join()==='32x32,128x128,256x256,512x512'&&sizes.join()==='16,24,32,48,64,128,256', d.join(' ')+' | ico '+sizes.join(','));
  for(const [lang,theme,tn] of [['en',null,'dark'],['bn',null,'dark'],['en','Porcelain','light'],['bn','Porcelain','light']]){
    const p=await open(b,{lang,w:1280,h:720,at:'2026-11-15T12:30:00+06:00',scale:2}); if(theme) await setTheme(p,theme);
    const r=await p.evaluate(()=>{const e=document.querySelector('.topbar'); const r=e.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}});
    await p.screenshot({path:SHOTS+`header-${tn}-${lang}.png`,clip:{x:0,y:0,width:1280,height:r.h+r.y+4}}); 
    if(lang==='en') await p.screenshot({path:SHOTS+`header-logo-closeup-${tn}.png`,clip:{x:0,y:0,width:300,height:r.h+r.y+4}});
    await p.close(); }
}
fs.writeFileSync('/tmp/e230-results.txt',out.join('\n')+`\n${pass}/${pass+fail} passed\n`);
console.log(`\n${pass}/${pass+fail} passed`); await b.close();

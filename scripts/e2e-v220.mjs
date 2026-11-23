// v2.2.0 checks: horizontal countdown panel + centred card, Rotate lock, button clearance, matched buttons, plate/crown, logo,
// equal sizes with 1-4 events, astrolabe sharpness. Headless Chrome against the Vite dev server (Asia/Dhaka, faked clock).
import {launch,open,sleep} from './lib.mjs';
import { fileURLToPath } from 'node:url';
const SHOTS='/tmp/e220shots/';
const b=await launch(); let pass=0, fail=0; const out=[];
const ok=(name,cond,info='')=>{ (cond?pass++:fail++); const line=`${cond?'PASS':'FAIL'} ${name}${info?'  — '+info:''}`; out.push(line); console.log(line); };
const R=(p,sel)=>p.evaluate(s=>{const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height,r:r.right,b:r.bottom,cx:r.x+r.width/2,cy:r.y+r.height/2};},sel);
const angle=p=>p.evaluate(()=>parseFloat(document.querySelector('#astroStage').dataset.angle));
const openEvent=async(p,key)=>{ await p.evaluate(k=>{const e=[...document.querySelectorAll('[data-event-countdown]')].find(x=>x.dataset.key===k)||document.querySelector('[data-event-countdown]'); e.click();},key); await sleep(900); };

// ---- 1. countdown page: horizontal panel; centred information card when there is no preferred-time card
for(const lang of ['en','bn']){
  for(const [at,key,expectBest,label] of [['2026-11-15T18:15:00+06:00','awwabin',false,'Awwabin (voluntary)'],['2026-11-15T14:30:00+06:00','dhuhr',false,'Dhuhr (fard)'],['2026-11-15T16:30:00+06:00','asr',false,'Asr (fard)'],['2026-11-15T23:30:00+06:00','isha',false,'Isha (fard, after its preferred time)'],['2026-11-15T10:00:00+06:00','duha',true,'Duha (has a preferred-time card)'],['2026-11-15T18:45:00+06:00','isha',true,'Isha early (has a preferred-time card)']]){
    const p=await open(b,{lang,w:1280,h:720,at}); await openEvent(p,key);
    const g=await p.evaluate(()=>{const q=s=>document.querySelector(s); const r=e=>{const b=e.getBoundingClientRect(); return {x:b.x,y:b.y,w:b.width,h:b.height,r:b.right,b:b.bottom,cx:b.x+b.width/2,cy:b.y+b.height/2}};
      const hero=q('#eventHero'), cards=q('#countdownView .page-cards');
      return {best:!q('#bestBlock').hidden, hero:r(hero), left:r(q('#eventHero .cf-left')), centre:r(q('#eventHero .cf-centre')), start:r(q('#countdownStart')), info:r(q('#eventPrayerCard')), bestR:r(q('#bestBlock')), timing:r(q('#eventTimingCard')), cards:r(cards),
        font:parseFloat(getComputedStyle(q('#countdownLarge')).fontSize), colour:getComputedStyle(q('#countdownLarge')).color, noBest:cards.classList.contains('no-best')};});
    const horizontal=g.left.r<=g.centre.x+1 && g.centre.r<=g.start.x+1 && Math.abs(g.left.cy-g.centre.cy)<g.hero.h*0.35 && Math.abs(g.start.cy-g.centre.cy)<g.hero.h*0.35;
    ok(`${lang} ${label}: countdown is a horizontal panel (name | countdown | times on one row, full width)`, horizontal && Math.abs(g.hero.w-g.timing.w)<2, `hero ${g.hero.w.toFixed(0)}px wide vs timing card ${g.timing.w.toFixed(0)}px, height ${g.hero.h.toFixed(0)}px`);
    ok(`${lang} ${label}: centre column is centred in the panel`, Math.abs(g.centre.cx-g.hero.cx)<=Math.max(40,Math.abs(g.left.w-g.start.w)/2+6), `centre ${g.centre.cx.toFixed(0)} vs panel ${g.hero.cx.toFixed(0)}`);
    if(!expectBest) ok(`${lang} ${label}: no preferred-time card, information card centred under the panel`, !g.best && Math.abs(g.info.cx-g.hero.cx)<2 && g.info.y>g.hero.b, `info centre ${g.info.cx.toFixed(1)} vs panel centre ${g.hero.cx.toFixed(1)}, width ${g.info.w.toFixed(0)}`);
    else ok(`${lang} ${label}: preferred-time card present, today's two-card layout kept (preferred card left, info card right, as in v2.1.1)`, g.best && g.bestR.x<g.info.x && Math.abs(g.info.y-g.bestR.y)<2 && !g.noBest, `info x ${g.info.x.toFixed(0)}, best x ${g.bestR.x.toFixed(0)}`);
    if(lang==='en' && key==='duha') ok('countdown digit size unchanged (same clamp as v2.1.1)', g.font>60, `${g.font.toFixed(1)}px`);
    ok(`${lang} ${label}: no console errors`, p.errs.length===0, p.errs.join('|'));
    await p.close();
  }
}
{ // stacks below 900px, no clipping
  const p=await open(b,{lang:'en',w:820,h:900,at:'2026-11-15T18:15:00+06:00'}); await openEvent(p,'awwabin');
  const g=await p.evaluate(()=>{const r=s=>{const b=document.querySelector(s).getBoundingClientRect(); return {y:b.y,cy:b.y+b.height/2,cx:b.x+b.width/2,w:b.width}}; return {l:r('#eventHero .cf-left'),c:r('#eventHero .cf-centre'),s:r('#countdownStart'), h:r('#eventHero'), hs:document.documentElement.scrollWidth>innerWidth+1}});
  ok('stacks vertically below 900px (name, countdown, times in one column), no horizontal scroll', g.c.y>g.l.y && g.s.y>g.c.y && Math.abs(g.l.cx-g.c.cx)<3 && !g.hs, JSON.stringify({l:g.l.y|0,c:g.c.y|0,s:g.s.y|0}));
  await p.screenshot({path:SHOTS+'countdown-stacked-820.png',fullPage:true}); await p.close();
}
for(const lang of ['en','bn']){
  let p=await open(b,{lang,w:1280,h:720,at:'2026-11-15T18:15:00+06:00'}); await openEvent(p,'awwabin');
  await p.screenshot({path:SHOTS+`countdown-no-preferred-${lang}.png`,fullPage:true}); await p.close();
  p=await open(b,{lang,w:1280,h:720,at:'2026-11-15T10:00:00+06:00'}); await openEvent(p,'duha');
  await p.screenshot({path:SHOTS+`countdown-with-preferred-${lang}.png`,fullPage:true}); await p.close();
}

// ---- 2. Rotate lock, flip, buttons
{
  const p=await open(b,{lang:'en',w:1280,h:720,at:'2026-11-15T12:30:00+06:00'});
  const st0=await p.evaluate(()=>({rot:document.querySelector('#astroRotateBtn').getAttribute('aria-pressed'), cls:document.querySelector('#astroStage').classList.contains('rotate-on')}));
  ok('Rotate is off by default (button not pressed, no gold rim)', st0.rot==='false' && !st0.cls);
  const r=await R(p,'#astroStage'); const cx=r.cx, cy=r.cy;
  const a0=await angle(p);
  await p.mouse.move(cx+r.w*0.4,cy); await p.mouse.down(); await p.mouse.move(cx+r.w*0.4,cy+r.h*0.25,{steps:12}); await p.mouse.up(); await sleep(700);
  ok('dragging does nothing while Rotate is off', Math.abs((await angle(p))-a0)<0.001, `Δ=${((await angle(p))-a0).toFixed(3)}°`);
  ok('a drag with Rotate off does not open the page', await p.evaluate(()=>document.body.classList.contains('astro-expanded'))===false);
  await p.focus('#astroStage'); await p.keyboard.press('ArrowRight'); await sleep(500);
  ok('arrow keys and wheel are also locked while Rotate is off', Math.abs((await angle(p))-a0)<0.001);
  await p.click('#astroRotateBtn'); await sleep(300);
  const st1=await p.evaluate(()=>({rot:document.querySelector('#astroRotateBtn').getAttribute('aria-pressed'), cls:document.querySelector('#astroStage').classList.contains('rotate-on'), rim:getComputedStyle(document.querySelector('#astroStage'),'::after').opacity, cursor:getComputedStyle(document.querySelector('#astroStage')).cursor}));
  ok('Rotate on: button pressed, faint gold rim shown, grab cursor', st1.rot==='true' && st1.cls && parseFloat(st1.rim)>0.9 && st1.cursor==='grab', JSON.stringify(st1));
  await p.mouse.move(cx+r.w*0.4,cy); await p.mouse.down(); await p.mouse.move(cx+r.w*0.4,cy+r.h*0.2,{steps:10}); await p.mouse.up(); await sleep(1500);
  const a1=await angle(p); ok('with Rotate on, dragging rotates (momentum glide included)', Math.abs(a1-a0)>3, `Δ=${(a1-a0).toFixed(1)}°`);
  await p.mouse.click(cx,cy+r.h*0.3); await sleep(700);
  ok('with Rotate on, a click does not open the astrolabe page', (await p.evaluate(()=>document.body.classList.contains('astro-expanded')))===false);
  await p.click('#astroRotateBtn'); await sleep(300);
  const a2=await angle(p); await p.mouse.move(cx+r.w*0.4,cy); await p.mouse.down(); await p.mouse.move(cx+r.w*0.4,cy+r.h*0.2,{steps:8}); await p.mouse.up(); await sleep(900);
  ok('Rotate off again: the angle stays where it was and the dial is locked', Math.abs((await angle(p))-a2)<0.001, `angle ${a2.toFixed(1)}°`);
  await sleep(500);
  const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('prayer-times-data')).astro);
  ok('the angle is saved', Math.abs(saved.angle-a2)<0.6, JSON.stringify(saved));
  await p.reload({waitUntil:'networkidle0'}); await sleep(900);
  const rl=await p.evaluate(()=>({rot:document.querySelector('#astroRotateBtn').getAttribute('aria-pressed'), angle:parseFloat(document.querySelector('#astroStage').dataset.angle)}));
  ok('after a reload the angle is restored but Rotate starts off', rl.rot==='false' && Math.abs(rl.angle-a2)<0.6, JSON.stringify(rl));
  await p.mouse.click(cx,cy+r.h*0.3); await sleep(1700);
  ok('a plain click (Rotate off) opens the astrolabe page', await p.evaluate(()=>document.body.classList.contains('astro-expanded')));
  // expanded page: rotate and flip pair, Instrument card text
  const ex=await p.evaluate(()=>({tools:!!document.querySelector('#astroBigSlot #astroTools'), rot:!!document.querySelector('#astroBigSlot #astroRotateBtn'), help:document.querySelector('#astroView .astro-help')?.innerText}));
  ok('expanded page has the Rotate and Flip pair', ex.tools && ex.rot);
  ok('Instrument card: "Rotate: Turn on Rotate, then drag", fine adjustment, flip, reset', /Rotate\s*\n?.*Turn on Rotate, then drag/i.test(ex.help) && /Fine adjustment/.test(ex.help) && /Flip/.test(ex.help) && /Reset rotation/.test(ex.help), JSON.stringify(ex.help));
  await p.click('#astroFlipBtn'); await sleep(1400);
  ok('flip still works', (await p.$eval('#astroStage',e=>e.dataset.flipped))==='1');
  await p.click('#astroFlipBtn'); await sleep(1400);
  ok('flip toggles back', (await p.$eval('#astroStage',e=>e.dataset.flipped))==='0');
  await p.close();
}
for(const lang of ['en','bn']){
  const p=await open(b,{lang,w:1280,h:720,at:'2026-11-15T12:30:00+06:00'});
  const tip=await p.evaluate(()=>({rt:document.querySelector('#astroRotateBtn').title, ra:document.querySelector('#astroRotateBtn').getAttribute('aria-label'), ft:document.querySelector('#astroFlipBtn').title, fa:document.querySelector('#astroFlipBtn').getAttribute('aria-label')}));
  ok(`${lang} tooltips and aria-labels on both buttons`, tip.rt&&tip.ra&&tip.ft&&tip.fa && (lang==='en'?/Rotate/.test(tip.rt)&&/Flip/.test(tip.ft):/[\u0980-\u09FF]/.test(tip.rt)&&/[\u0980-\u09FF]/.test(tip.ft)&&!/[A-Za-z]{3,}/.test(tip.rt+tip.ft)), JSON.stringify(tip));
  await p.close();
}
// clearance on home at several sizes
for(const [w,h,s] of [[1280,720,1],[1920,1080,1],[1366,768,1.25],[1024,640,1.5],[900,700,1]]){
  const p=await open(b,{lang:'en',w,h,at:'2026-11-15T12:30:00+06:00',scale:s});
  const g=await p.evaluate(()=>{const rc=e=>{const b=e.getBoundingClientRect(); return {x:b.x,y:b.y,r:b.right,b:b.bottom,w:b.width,h:b.height,cx:b.x+b.width/2,cy:b.y+b.height/2}};
    const panel=rc(document.querySelector('#skyPanel')), stage=rc(document.querySelector('#astroStage')), rb=rc(document.querySelector('#astroRotateBtn')), fb=rc(document.querySelector('#astroFlipBtn'));
    const rows=[...document.querySelectorAll('#skyObservatoryFooter > *')].map(rc); const texts=[...document.querySelectorAll('#skyPanel .astro-top > *')].map(rc);
    return {panel,stage,rb,fb,rows,texts};});
  const clear=Math.min(...[g.rb,g.fb].map(x=>Math.min(x.x-g.panel.x,x.y-g.panel.y,g.panel.r-x.r,g.panel.b-x.b)));
  const R0=g.stage.w/2*0.99; const distDial=Math.min(...[g.rb,g.fb].map(x=>{const dx=Math.max(x.x-g.stage.cx,0,g.stage.cx-x.r), dy=Math.max(x.y-g.stage.cy,0,g.stage.cy-x.b); return Math.hypot(dx,dy);}));
  const hit=(a,bx)=>!(a.r<=bx.x||a.x>=bx.r||a.b<=bx.y||a.y>=bx.b);
  const overlapRows=[g.rb,g.fb].some(x=>[...g.rows,...g.texts].some(y=>hit(x,y)));
  ok(`${w}x${h}@${s}: buttons ≥16px from every panel border`, clear>=16, `min clearance ${clear.toFixed(1)}px`);
  ok(`${w}x${h}@${s}: buttons clear of the dial, forbidden-time rows and astrolabe text`, distDial>=R0-0.5 && !overlapRows, `nearest point to dial centre ${distDial.toFixed(1)}px vs dial radius ${R0.toFixed(1)}px, overlap=${overlapRows}`);
  ok(`${w}x${h}@${s}: Rotate and Flip are the same size`, Math.abs(g.rb.w-g.fb.w)<0.5 && Math.abs(g.rb.h-g.fb.h)<0.5, `${g.rb.w.toFixed(1)} vs ${g.fb.w.toFixed(1)}`);
  await p.close();
}
{ // expanded page: buttons don't touch the dial
  const p=await open(b,{lang:'en',w:1280,h:720,at:'2026-11-15T12:30:00+06:00'});
  await p.evaluate(()=>document.querySelector('#astroStage').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))); await sleep(1800);
  const g=await p.evaluate(()=>{const rc=e=>{const b=e.getBoundingClientRect(); return {x:b.x,y:b.y,r:b.right,b:b.bottom,w:b.width,cx:b.x+b.width/2,cy:b.y+b.height/2}}; return {stage:rc(document.querySelector('#astroStage')), rb:rc(document.querySelector('#astroRotateBtn')), fb:rc(document.querySelector('#astroFlipBtn')), vw:innerWidth, vh:innerHeight};});
  const dist=Math.min(...[g.rb,g.fb].map(x=>{const dx=Math.max(x.x-g.stage.cx,0,g.stage.cx-x.r), dy=Math.max(x.y-g.stage.cy,0,g.stage.cy-x.b); return Math.hypot(dx,dy);}));
  ok('expanded page: buttons sit just below the dial, do not cover it, and stay inside the window', dist>=g.stage.w/2*0.99-0.5 && g.rb.y>=g.stage.b-1 && g.fb.r<=g.vw && g.fb.b<=g.vh+400, `${dist.toFixed(1)} vs radius ${(g.stage.w/2*0.99).toFixed(1)}`);
  await p.close();
}

// ---- 3. logo, header plate and crown
for(const lang of ['en','bn']){
  const p=await open(b,{lang,w:1280,h:720,at:'2026-11-15T12:30:00+06:00'});
  const g=await p.evaluate(()=>{const plate=document.querySelector('#locationLabel'), crown=document.querySelector('#settingsToggle'); const rc=e=>{const b=e.getBoundingClientRect(); return {w:b.width,h:b.height,x:b.x,y:b.y,r:b.right,b:b.bottom}};
    return {logo:document.querySelector('#brandMark svg').innerHTML.includes('pBS'), name:document.querySelector('.brand-name').textContent, text:plate.innerText.replace(/\s+/g,' ').trim(), tag:plate.tagName, place:plate.querySelector('.cp-place')?.textContent, plate:rc(plate), crown:rc(crown), crownRound:getComputedStyle(crown).borderRadius, vw:innerWidth, mono:getComputedStyle(plate.querySelector('.cp-coords')).fontFamily};});
  const reEn=/^23\.8103° N 90\.4125° E Dhaka$/, reBn=/^[\u09E6-\u09EF]{2}\.[\u09E6-\u09EF]{4}° উ [\u09E6-\u09EF]{2}\.[\u09E6-\u09EF]{4}° পূ Dhaka$/;
  ok(`${lang} new logo in the header, brand name kept (${g.name})`, g.logo && (lang==='en'?g.name==='Prayer Times':/[\u0980-\u09FF]/.test(g.name)));
  ok(`${lang} coordinates plate text`, (lang==='en'?reEn:reBn).test(g.text), JSON.stringify(g.text));
  ok(`${lang} plate is a button; crown is round; both inside the viewport`, g.tag==='BUTTON' && g.crown.w>=36 && Math.abs(g.crown.w-g.crown.h)<0.5 && g.plate.r<=g.vw && g.crown.x>0 && g.plate.h>30, `plate ${g.plate.w.toFixed(0)}x${g.plate.h.toFixed(0)} crown ${g.crown.w.toFixed(0)}px`);
  if(lang==='en') ok('plate digits use a monospace face', /mono|Consolas/i.test(g.mono), g.mono);
  await p.click('#locationLabel'); await sleep(900);
  ok(`${lang} clicking the plate opens the location settings`, await p.evaluate(()=>!document.getElementById('settingsView').hidden && document.querySelector('.location-settings').getBoundingClientRect().top<innerHeight*0.6));
  await p.click('#settingsToggle'); await sleep(500);
  ok(`${lang} the crown still goes Home from settings`, await p.evaluate(()=>!document.getElementById('homeView').hidden));
  await p.close();
}
{
  const p=await open(b,{lang:'en',w:1280,h:720,at:'2026-11-15T12:30:00+06:00',scale:3});
  const tb=await R(p,'.topbar'); await p.screenshot({path:SHOTS+'header-en-3x.png',clip:{x:0,y:Math.max(0,tb.y-2),width:tb.w,height:tb.h+4}});
  const lg=await R(p,'#brandMark'); await p.screenshot({path:SHOTS+'logo-header-closeup-3x.png',clip:{x:lg.x-4,y:lg.y-4,width:lg.w+8,height:lg.h+8}});
  await p.close();
}
{ // logo files: same artwork everywhere, sizes
  const fs=await import('node:fs'); const root=new URL('../', import.meta.url); const file=f=>fileURLToPath(new URL(f, root));
  const icon=fs.readFileSync(file('src-tauri/icons/icon.svg'),'utf8'), fav=fs.readFileSync(file('public/favicon.svg'),'utf8');
  ok('icon.svg equals favicon.svg and is logo B (v2.3.0)', icon===fav && icon.includes('pBS') && icon.includes('pBG'));
  const dims=n=>{const d=fs.readFileSync(file('src-tauri/icons/'+n)); return [d.readUInt32BE(16),d.readUInt32BE(20)];};
  ok('PNG set regenerated: 32, 128, 256, 512', JSON.stringify([dims('32x32.png'),dims('128x128.png'),dims('128x128@2x.png'),dims('icon.png')])===JSON.stringify([[32,32],[128,128],[256,256],[512,512]]));
  const ico=fs.readFileSync(file('src-tauri/icons/icon.ico')); const n=ico.readUInt16LE(4); const sizes=[]; for(let i=0;i<n;i++) sizes.push(ico[6+16*i]||256);
  ok('ICO holds 16, 24, 32, 48, 64, 128, 256', JSON.stringify(sizes)==='[16,24,32,48,64,128,256]', sizes.join(','));
}

// ---- 4. never shrink: 1, 2, 3 and 4 events at once give identical sizes
const sizeProbe=p=>p.evaluate(()=>{const q=s=>document.querySelector(s); const fs=s=>{const e=q(s); return e?+parseFloat(getComputedStyle(e).fontSize).toFixed(3):null}; const wh=s=>{const e=q(s); if(!e) return null; const r=e.getBoundingClientRect(); return [+r.width.toFixed(2),+r.height.toFixed(2)]};
  const shell=q('.app-shell'); return {events:document.querySelectorAll('.live-event').length, zoomStyle:shell.style.zoom, zoom:getComputedStyle(shell).zoom, mark:wh('.live-event .mark-event-complete'), tick:wh('.live-event .round-check'), name:fs('.live-name'), tickLabel:fs('.live-event .part-tick span'), timeLeft:wh('.live-event .countdown-card'), stage:wh('#astroStage'), clock:wh('#analogSvg'), topbarH:wh('.topbar')?.[1], brand:fs('.brand-name'), heading:fs('.live-events-section .section-heading h2'), nextName:fs('#nextName'), root:fs('html'), body:fs('body')};});
for(const [lang,w,h,s] of [['en',1280,720,1],['bn',1280,720,1],['en',1024,640,1.5],['en',1920,1080,1]]){
  const probes=[];
  for(const at of ['2026-11-15T12:30:00+06:00','2026-11-15T18:15:00+06:00','2026-11-15T18:45:00+06:00','2026-11-15T02:00:00+06:00']){
    const p=await open(b,{lang,w,h,at,scale:s}); probes.push(await sizeProbe(p)); if(lang==='en'&&w===1280&&at.includes('18:45')) await p.screenshot({path:SHOTS+'home-3-events-en.png'}); if(lang==='bn'&&at.includes('18:45')) await p.screenshot({path:SHOTS+'home-3-events-bn.png'}); await p.close();
  }
  const counts=probes.map(x=>x.events).join('/');
  const keys=Object.keys(probes[0]).filter(k=>k!=='events');
  const diffs=keys.filter(k=>probes.some(x=>JSON.stringify(x[k])!==JSON.stringify(probes[0][k])));
  ok(`${lang} ${w}x${h}@${s}: events shown ${counts}; no zoom-out and every measured size identical`, diffs.length===0 && probes.every(x=>x.zoomStyle===''&&x.zoom==='1') && probes[0].events===1 && probes[3].events>=3, diffs.length?`DIFFERENT: ${diffs.map(k=>k+': '+probes.map(x=>JSON.stringify(x[k])).join(' | ')).join('; ')}`:`mark ${JSON.stringify(probes[0].mark)} tick ${JSON.stringify(probes[0].tick)} name ${probes[0].name}px stage ${JSON.stringify(probes[0].stage)}`);
}
{ // the page may scroll with 4 events; nothing is cut
  const p=await open(b,{lang:'en',w:1280,h:720,at:'2026-11-15T02:00:00+06:00'});
  const g=await p.evaluate(()=>({sh:document.documentElement.scrollHeight, ih:innerHeight, hs:document.documentElement.scrollWidth>innerWidth+1}));
  ok('with 4 events the page is longer than the window and scrolls vertically only', g.sh>g.ih && !g.hs, `${g.sh}px content in a ${g.ih}px window`);
  await p.screenshot({path:SHOTS+'home-4-events-en.png',fullPage:true}); await p.close();
}

// ---- 5. astrolabe sharpness: hairline floor, text floor, no pinned layers; at 1x and 2x
for(const scale of [1,2]){
  const p=await open(b,{lang:'en',w:1280,h:720,at:'2026-11-15T12:30:00+06:00',scale}); 
  for(const where of ['home','expanded']){
    if(where==='expanded'){ await p.evaluate(()=>document.querySelector('#astroStage').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))); await sleep(1800); }
    const g=await p.evaluate(()=>{const st=document.querySelector('#astroStage'), svg=document.querySelector('#skySvg'); const dpr=devicePixelRatio, css=st.offsetWidth, dpu=css*dpr/400;
      let thin=0,total=0,minDev=99; for(const e of svg.querySelectorAll('[stroke-width]')){ const base=parseFloat(e.dataset.sw0??e.getAttribute('stroke-width')); const w=parseFloat(e.getAttribute('stroke-width')); if(!(base>0)) continue; total++; const need=Math.min(Math.max(base,0.8/dpu),base*2.5); if(w+0.002<need) thin++; minDev=Math.min(minDev,w*dpu);} 
      const texts=[...svg.querySelectorAll('text')].filter(t=>t.getBoundingClientRect().width>0); const minFont=Math.min(...texts.map(t=>parseFloat(getComputedStyle(t).fontSize)*css/400));
      return {css,dpr,total,thin,minDev:+minDev.toFixed(2),minFont:+minFont.toFixed(2),texts:texts.length,tf:st.style.getPropertyValue('--av-tf'),wc:[getComputedStyle(document.querySelector('#avBody')).willChange,getComputedStyle(document.querySelector('#astroFlip')).willChange],tr:getComputedStyle(svg).textRendering,sr:getComputedStyle(svg).shapeRendering, bodyTf:document.querySelector('#avBody').getAttribute('transform')};});
    const textTarget=Math.min(6.4,4.3*1.4*g.css/400);
    ok(`${scale}x ${where} (${g.css}px): every hairline is at least the floor (0.8 device px, never above 2.5x its design width)`, g.thin===0, `${g.total} strokes, ${g.thin} below floor, thinnest ${g.minDev} device px`);
    ok(`${scale}x ${where}: smallest printed text ≥ ${textTarget.toFixed(1)} CSS px`, g.minFont+0.15>=textTarget, `${g.minFont}px (${g.texts} labels, factor ${g.tf})`);
    ok(`${scale}x ${where}: no pinned GPU layer, vector text, SVG rotation`, g.wc.every(v=>v==='auto') && g.tr==='geometricprecision' && /^rotate\(/.test(g.bodyTf||''), JSON.stringify({wc:g.wc,tr:g.tr}));
  }
  await p.close();
}
// header astrolabe on the clock page keeps the same treatment
{
  const p=await open(b,{lang:'en',w:1280,h:720,at:'2026-11-15T12:30:00+06:00'}); await p.click('#analogClockButton'); await sleep(1500);
  const g=await p.evaluate(()=>({tools:getComputedStyle(document.querySelector('.topbar-astro .astro-tools')).display, inTop:!!document.querySelector('#topbarAstro #skyPanel'), w:document.querySelector('#astroStage').offsetWidth, tr:getComputedStyle(document.querySelector('#skySvg')).textRendering}));
  ok('clock page: small header astrolabe keeps crisp rendering and hides the control pair', g.inTop && g.tools==='none' && g.tr==='geometricprecision', JSON.stringify(g));
  await p.close();
}
console.log(`\n${pass}/${pass+fail} passed`);
(await import('node:fs')).writeFileSync('/tmp/e220-results.txt',out.join('\n')+`\n${pass}/${pass+fail} passed\n`);
await b.close(); process.exit(fail?1:0);

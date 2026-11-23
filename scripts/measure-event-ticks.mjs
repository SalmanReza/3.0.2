// Compares the tick circles on the home "Available now" card with the ones on the event countdown page ("Completion & recording").
import {launch,open,sleep} from './lib.mjs';
const SHOTS='/workspace/prayer/shots211/'; const b=await launch(); let bad=0;
const sizes=p=>p.evaluate(()=>{
  const mc=document.querySelector('.live-event .mark-event-complete')?.getBoundingClientRect().height||0;
  const z=parseFloat(getComputedStyle(document.querySelector('.app-shell')).zoom)||1;
  const q=sel=>[...document.querySelectorAll(sel)].filter(e=>e.offsetParent).map(e=>{const r=e.getBoundingClientRect(); return {cls:e.parentElement.className.replace(/\s+/g,'.'),w:+r.width.toFixed(2),h:+r.height.toFixed(2),lbl:e.parentElement.innerText.replace(/\s+/g,' ').slice(0,18)};});
  return {mc,z,home:q('.live-event .part-tick i, .live-event .round-check'),event:q('#eventCompletionCard .part-tick i'),
    eventSpan:[...document.querySelectorAll('#eventCompletionCard .part-tick span')].map(e=>parseFloat(getComputedStyle(e).fontSize)),
    homeSpan:[...document.querySelectorAll('.live-event .part-tick span')].map(e=>parseFloat(getComputedStyle(e).fontSize))};
});
for(const [scene,at] of [['fard','2026-11-15T12:30:00+06:00'],['voluntary','2026-11-15T08:00:00+06:00']]) for(const lang of ['en','bn']){
  const p=await open(b,{lang,w:1280,h:720,at});
  const home=await sizes(p);
  await p.evaluate(()=>{const e=document.querySelector('.live-event [data-event-countdown]')||document.querySelector('[data-event-countdown]'); e.click();});
  await sleep(1200);
  const ev=await sizes(p);
  const target=+(home.mc*0.8).toFixed(2);
  const homeW=[...new Set(home.home.map(x=>x.w))], evW=[...new Set(ev.event.map(x=>x.w))];
  const ok=ev.event.length>0 && evW.length===1 && Math.abs(evW[0]-homeW[0])<0.6 && Math.abs(homeW[0]-target)<0.6 && ev.event.every(x=>Math.abs(x.w-x.h)<0.1);
  if(!ok) bad++;
  console.log(`${ok?'PASS':'FAIL'} ${scene} ${lang}: MarkComplete=${home.mc.toFixed(2)}px 80%=${target} | home ticks ${JSON.stringify(homeW)} | event-page ticks ${JSON.stringify(ev.event.map(x=>x.w))} (${ev.event.map(x=>x.lbl).join(' / ')}) | label font home ${[...new Set(home.homeSpan)]} event ${[...new Set(ev.eventSpan)]}`);
  if(scene==='fard'){
    const c=await p.$('#eventCompletionCard'); await c.scrollIntoView(); await sleep(200);
    await p.screenshot({path:SHOTS+`expanded-ticks-${lang}.png`}); }
  await p.close();
}
await b.close(); process.exit(bad?1:0);

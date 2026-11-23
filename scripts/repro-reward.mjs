import {launch,open,sleep} from './lib.mjs';
const D='/workspace/prayer/shots211/repro/';
const b=await launch();
const dump=async(p,label)=>{ const r=await p.evaluate(()=>{const q=s=>document.querySelector(s); const vis=e=>{if(!e) return null; const r=e.getBoundingClientRect(); return {hidden:e.hidden, h:Math.round(r.height), top:Math.round(r.top), text:e.innerText.replace(/\s+/g,' ').slice(0,200)}}; return {core:vis(q('#progressCore')), reward:vis(q('#progressReward')), vol:vis(q('#voluntaryReward')), note:vis(q('#dailyNote')), title:q('#progressTitle').textContent, vh:innerHeight, sh:document.documentElement.scrollHeight}}); console.log(label, JSON.stringify(r)); };
// FARD
{ const p=await open(b,{lang:'en',w:1280,h:720,at:'2026-11-15T12:30:00+06:00'});
  await dump(p,'fard before'); await p.click('.round-check.layer-fard'); await sleep(400); await dump(p,'fard +0.4s'); await p.screenshot({path:D+'fard-en.png'}); await sleep(3000); await dump(p,'fard +3.4s'); await sleep(13000); await dump(p,'fard +16s'); console.log(p.errs); await p.close(); }
// VOL
{ const p=await open(b,{lang:'en',w:1280,h:720,at:'2026-11-15T08:00:00+06:00'});
  await p.click('.mark-event-complete'); await sleep(400); await dump(p,'vol +0.4s'); await p.screenshot({path:D+'vol-en.png'}); await sleep(9000); await dump(p,'vol +9.4s'); console.log(p.errs); await p.close(); }
await b.close();

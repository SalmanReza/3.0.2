import {launch,open,sleep} from './lib.mjs';
const D=process.argv[2]||'/workspace/prayer/shots211/';
const b=await launch();
const jobs=[['zawal','2026-11-15T11:40:00+06:00'],['sunrise','2026-11-15T06:20:00+06:00'],['sunset','2026-11-15T17:05:00+06:00']];
for(const lang of ['en','bn']) for(const [w,h,tag] of [[1280,720,'1280x720'],[480,760,'small']]) for(const [k,at] of jobs){
  if(k!=='zawal' && !(w===1280)) continue;
  const p=await open(b,{lang,w,h,at});
  const info=await p.evaluate(()=>{const c=document.querySelector('.forbidden-card'); if(!c) return null; const bad=[]; const cr=c.getBoundingClientRect(); for(const e of c.querySelectorAll('*')){const r=e.getBoundingClientRect(); if(r.width&&(r.right>cr.right+1||r.left<cr.left-1)) bad.push(e.className)} return {text:c.innerText.replace(/\s+/g,' '), w:Math.round(cr.width), h:Math.round(cr.height), bad, sw:c.scrollWidth, cw:c.clientWidth}});
  console.log(lang,tag,k,JSON.stringify(info), p.errs.join('|'));
  const el=await p.$('#liveEvents'); await el.scrollIntoView?.(); 
  await p.screenshot({path:D+`forbidden-${k}-${lang}-${tag}.png`, fullPage:w<600});
  await p.close();
}
await b.close();

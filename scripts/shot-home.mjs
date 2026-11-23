import {launch,open,sleep} from './lib.mjs';
const [,, tag='home', at='2026-11-15T12:30:00+06:00', lang='en', w='1280', h='720', scale='1'] = process.argv;
const b=await launch(); const p=await open(b,{lang,w:+w,h:+h,at,scale:+scale});
await p.screenshot({path:`/workspace/prayer/shots220/${tag}.png`});
console.log(JSON.stringify(await p.evaluate(()=>{const r=s=>{const e=document.querySelector(s); if(!e) return null; const b=e.getBoundingClientRect(); return [b.x,b.y,b.width,b.height].map(Math.round)}; return {panel:r('#skyPanel'),stage:r('#astroStage'),top:r('.astro-top'),flipbtn:r('#astroFlipBtn'),foot:r('#skyObservatoryFooter'),clock:r('#clockCard')}})));
await b.close();

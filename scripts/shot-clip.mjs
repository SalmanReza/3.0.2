import {launch,open,sleep} from './lib.mjs';
// usage: node shot-clip.mjs out.png selector [lang] [scale] [w] [h] [at] [clickRotate] [expanded]
const [,, out, sel, lang='en', scale='2', w='1280', h='720', at='2026-11-15T12:30:00+06:00', rot='0', exp='0', pad='6'] = process.argv;
const b=await launch(); const p=await open(b,{lang,w:+w,h:+h,at,scale:+scale});
if(exp==='1'){ await p.evaluate(()=>document.querySelector('#astroStage').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))); await sleep(1800); }
if(rot==='1'){ await p.click('#astroRotateBtn'); await sleep(400); }
const r=await p.$eval(sel,e=>e.getBoundingClientRect().toJSON());
await p.screenshot({path:out,clip:{x:Math.max(0,r.x-+pad),y:Math.max(0,r.y-+pad),width:r.width+2*+pad,height:r.height+2*+pad}});
await b.close();

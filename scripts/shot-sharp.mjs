import {launch,open,sleep} from './lib.mjs';
const tag=process.argv[2]||'after'; const D='/workspace/prayer/shots220/';
const b=await launch();
for(const scale of [1,2]) for(const lang of ['en','bn']){
  const p=await open(b,{lang,w:1280,h:720,at:'2026-11-15T12:30:00+06:00',scale});
  const box=await p.$eval('#astroStage',e=>e.getBoundingClientRect().toJSON());
  await p.screenshot({path:D+`sharp-${tag}-home-astro-${lang}-${scale}x.png`,clip:{x:box.x,y:box.y,width:box.width,height:box.height}});
  const cb=await p.$eval('#analogSvg',e=>e.getBoundingClientRect().toJSON());
  if(lang==='en') await p.screenshot({path:D+`sharp-${tag}-home-clock-${scale}x.png`,clip:{x:cb.x,y:cb.y,width:cb.width,height:cb.height}});
  // expanded page
  await p.evaluate(()=>document.querySelector('#astroStage').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))); await sleep(1800);
  const eb=await p.$eval('#astroStage',e=>e.getBoundingClientRect().toJSON());
  await p.screenshot({path:D+`sharp-${tag}-expanded-astro-${lang}-${scale}x.png`,clip:{x:eb.x,y:eb.y,width:eb.width,height:eb.height}});
  // zoom crop: upper-left quadrant detail
  await p.screenshot({path:D+`sharp-${tag}-expanded-crop-${lang}-${scale}x.png`,clip:{x:eb.x+eb.width*0.30,y:eb.y+eb.height*0.05,width:eb.width*0.25,height:eb.height*0.25}});
  await p.close();
}
await b.close();

import {launch,open,sleep} from './lib.mjs';
const D=process.argv[2]||'/workspace/prayer/shots211/';
const b=await launch();
const T='2026-11-15T12:30:00+06:00';
for (const [lang,flip] of [['en',false],['bn',false],['en',true]]) {
  const p=await open(b,{lang,w:1366,h:768,at:T,scale:2,data:flip?{astro:{angle:0,flipped:true}}:{}});
  const st=await p.evaluate(()=>document.querySelector('#astroStage').getBoundingClientRect().toJSON());
  await p.mouse.click(st.x+st.width*0.8, st.y+st.height*0.5);
  await sleep(1500);
  const r=await p.evaluate(()=>document.querySelector('#astroStage').getBoundingClientRect().toJSON());
  await p.screenshot({path:D+`astro-closeup-${lang}${flip?'-flipped':''}.png`,clip:{x:r.x-10,y:r.y-10,width:r.width+30,height:r.height+30}});
  await p.screenshot({path:D+`astro-page-${lang}${flip?'-flipped':''}.png`});
  await p.close();
}
await b.close();

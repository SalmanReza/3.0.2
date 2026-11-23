import {launch,open,sleep} from './lib.mjs';
const D=process.argv[2]||'/workspace/prayer/shots211/';
const b=await launch();
const T='2026-11-15T12:30:00+06:00';
for (const [lang,w,h,tag] of [['en',1280,720,'en-1280x720'],['bn',1366,768,'bn-1366x768'],['en',1920,1080,'en-1920x1080'],['en',720,900,'en-720x900']]) {
  const p=await open(b,{lang,w,h,at:T});
  await p.click('#astroStage',{offset:{x:5,y:5}}).catch(()=>{});
  await p.evaluate(()=>{}); 
  const st=await p.evaluate(()=>document.querySelector('#astroStage').getBoundingClientRect().toJSON());
  await p.mouse.click(st.x+st.width/2+st.width*0.3, st.y+st.height/2+st.height*0.1);
  await sleep(1500);
  const info=await p.evaluate(()=>({page:!document.querySelector('#astroView').hidden, exp:document.body.classList.contains('astro-expanded'), clockTop:!!document.querySelector('#topbarClock #analogClockButton'), stage:document.querySelector('#astroStage').getBoundingClientRect().width, detailed:document.querySelector('#astroStage').classList.contains('is-detailed')}));
  console.log(tag,JSON.stringify(info),p.errs.join('|'));
  await p.screenshot({path:D+`astro-expanded-${tag}.png`, fullPage:true});
  await p.close();
}
await b.close();

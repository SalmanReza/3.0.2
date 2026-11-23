import {launch,open,sleep} from './lib.mjs';
const D=process.argv[2]||'/workspace/prayer/shots211/';
const b=await launch();
const T='2026-11-15T12:30:00+06:00';
const st=p=>p.evaluate(()=>{const e=document.querySelector('#voluntaryReward'); const c=document.querySelector('#progressCore'); return {hidden:e.hidden, kind:e.dataset.kind, text:e.innerText.replace(/\s+/g,' ').slice(0,160), core:c.innerText, scrollW:e.scrollWidth, clientW:e.clientWidth}});
for (const lang of ['en','bn']) {
  let p=await open(b,{lang,w:1280,h:720,at:T,data:{recognitionPace:{sunnah:2,nafl:1,voluntary:6}}});
  await p.click('.round-check.layer-fard'); await sleep(400);
  console.log(lang,'fard+0.4',JSON.stringify(await st(p))); await p.screenshot({path:D+`reward-fard-${lang}.png`}); 
  await sleep(15500); console.log(lang,'fard+15.9',JSON.stringify(await st(p))); await p.close();
  p=await open(b,{lang,w:1280,h:720,at:'2026-11-15T08:00:00+06:00',data:{recognitionPace:{sunnah:2,nafl:1,voluntary:6}}});
  await p.click('.mark-event-complete'); await sleep(400);
  console.log(lang,'vol+0.4',JSON.stringify(await st(p))); await p.screenshot({path:D+`reward-voluntary-${lang}.png`});
  await sleep(3000); console.log(lang,'vol+3.4',JSON.stringify(await st(p)));
  await sleep(3600); console.log(lang,'vol+7',JSON.stringify(await st(p))); await p.close();
  // day complete: everything but Isha, ticked at 19:00
  const key='2026-11-15';
  const rec={fard:{fajr:true,dhuhr:true,asr:true,maghrib:true},sunnah:{fajr_before:true,dhuhr_before:true,dhuhr_after:true,maghrib_after:true,isha_after:true},nafl:{dhuhr_nafl:true,asr_before:true,maghrib_nafl:true,isha_before:true,isha_nafl:true},voluntary:{duha:true,awwabin:true,qiyam:true,tahajjud:true,tarawih:true,witr:true,eid_prayer:true}};
  p=await open(b,{lang,w:1280,h:720,at:'2026-11-15T19:00:00+06:00',data:{recognitionPace:{sunnah:2,nafl:1,voluntary:6},history:{[key]:rec}}});
  console.log(lang,'day before',JSON.stringify(await st(p)));
  await p.click('.round-check.layer-fard'); await sleep(500);
  console.log(lang,'day+0.5',JSON.stringify(await st(p))); await p.screenshot({path:D+`reward-daycomplete-${lang}.png`});
  await p.close();
}
await b.close();

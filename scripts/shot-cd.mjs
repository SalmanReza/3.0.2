import {launch,open,sleep} from './lib.mjs';
const [,, tag='cd', at='2026-11-15T18:15:00+06:00', lang='en', w='1280', h='720', key='awwabin'] = process.argv;
const b=await launch(); const p=await open(b,{lang,w:+w,h:+h,at});
await p.evaluate(k=>{const e=[...document.querySelectorAll('[data-event-countdown]')].find(x=>x.dataset.key===k)||document.querySelector('[data-event-countdown]'); e.click();},key);
await sleep(1200);
console.log(await p.evaluate(()=>({best:!document.getElementById('bestBlock').hidden, title:document.getElementById('countdownTitle').textContent})));
await p.screenshot({path:`/workspace/prayer/shots220/${tag}.png`,fullPage:true});
await b.close();

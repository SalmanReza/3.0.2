import {launch,open,sleep,latin} from './lib.mjs';
const b=await launch();
const sizes=[[1920,1080,1],[1366,768,1.25],[1280,720,1],[1024,640,1.5],[800,600,1],[640,800,1],[420,700,1]];
const fonts=[['system',null],['serif','Georgia, serif']];
async function audit(p){
  return p.evaluate(()=>{
    const out={clip:[],overlap:[],small:[],hscroll:document.documentElement.scrollWidth>innerWidth+1};
    const shell=document.querySelector('.app-shell'); const zoom=parseFloat(getComputedStyle(shell).zoom)||1;
    const items=[];
    const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    while(w.nextNode()){const n=w.currentNode; const t=n.nodeValue.trim(); if(!t) continue; const el=n.parentElement;
      if(!el||el.closest('svg,script,style,[hidden],option,select,textarea')) continue;
      const cs=getComputedStyle(el); if(cs.visibility==='hidden'||cs.display==='none'||parseFloat(cs.opacity)===0) continue;
      const rg=document.createRange(); rg.selectNodeContents(n); const rects=[...rg.getClientRects()].filter(r=>r.width>0.5&&r.height>0.5); if(!rects.length) continue;
      const r=rg.getBoundingClientRect(); if(r.width===0) continue;
      // hidden by ancestor sized 0?
      let vis=true; for(let a=el;a&&a!==document.body;a=a.parentElement){const c=getComputedStyle(a); if(c.display==='none'||c.visibility==='hidden'){vis=false;break;}}
      if(!vis) continue;
      items.push({el,t,rects,r,fs:parseFloat(cs.fontSize)*zoom});
    }
    const label=e=>(e.id?'#'+e.id:'')+'.'+String(e.className).split(' ').slice(0,2).join('.')+':'+e.tagName.toLowerCase();
    for(const it of items){
      if(it.fs<10.4) out.small.push(label(it.el)+' '+it.fs.toFixed(1)+'px "'+it.t.slice(0,24)+'"');
      // clipping by ancestors
      for(let a=it.el;a&&a!==document.documentElement;a=a.parentElement){
        const c=getComputedStyle(a); if(a===it.el&&c.overflow==='visible') continue;
        if(c.overflow!=='visible'||c.overflowX!=='visible'||c.overflowY!=='visible'){
          const ar=a.getBoundingClientRect();
          for(const r of it.rects){ if(r.left<ar.left-1.5||r.right>ar.right+1.5||r.top<ar.top-1.5||r.bottom>ar.bottom+1.5){ out.clip.push(label(it.el)+' clipped by '+label(a)+' "'+it.t.slice(0,30)+'"'); break; } }
        }
        if(a.classList&&a.classList.contains('app-shell')) break;
      }
      if(it.el.scrollWidth>it.el.clientWidth+2 && getComputedStyle(it.el).overflow!=='visible' && it.el.clientWidth>0) out.clip.push('own scroll overflow '+label(it.el)+' "'+it.t.slice(0,30)+'"');
      if(it.r.right>innerWidth+1||it.r.left<-1) out.clip.push('outside viewport iw='+innerWidth+' r='+Math.round(it.r.left)+'-'+Math.round(it.r.right)+' '+label(it.el)+' "'+it.t.slice(0,30)+'"');
    }
    for(let i=0;i<items.length;i++) for(let j=i+1;j<items.length;j++){
      const A=items[i],B=items[j]; if(A.el===B.el||A.el.contains(B.el)&&false) continue;
      for(const a of A.rects){ let hit=false; for(const c of B.rects){
        const ox=Math.min(a.right,c.right)-Math.max(a.left,c.left), oy=Math.min(a.bottom,c.bottom)-Math.max(a.top,c.top);
        if(ox>1.5&&oy>2.5){hit=true;break;} } if(hit){out.overlap.push(label(A.el)+' "'+A.t.slice(0,22)+'" × '+label(B.el)+' "'+B.t.slice(0,22)+'"');break;} }
    }
    out.zoom=zoom; out.n=items.length; return out;
  });
}
const REC={fard:{fajr:true,dhuhr:true,asr:true,maghrib:true},sunnah:{fajr_before:true,dhuhr_before:true,dhuhr_after:true,maghrib_after:true,isha_after:true},nafl:{dhuhr_nafl:true,asr_before:true,maghrib_nafl:true,isha_before:true,isha_nafl:true},voluntary:{duha:true,awwabin:true,qiyam:true,tahajjud:true,tarawih:true,witr:true,eid_prayer:true}};
const scenes=[
  ['home-fard','2026-11-15T12:30:00+06:00',async p=>{}],
  ['home-vol','2026-11-15T08:00:00+06:00',async p=>{}],
  ['expanded-clock','2026-11-15T12:30:00+06:00',async p=>{await p.click('#analogClockButton'); await sleep(1300);}],
  ['settings','2026-11-15T12:30:00+06:00',async p=>{await p.click('#settingsToggle'); await sleep(600);}],
  ['forbidden-zawal','2026-11-15T11:40:00+06:00',async p=>{}],
  ['forbidden-sunset','2026-11-15T17:05:00+06:00',async p=>{}],
  ['astro-page','2026-11-15T12:30:00+06:00',async p=>{await p.evaluate(()=>document.querySelector('#astroStage').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))); await sleep(1500);}],
  ['reward-fard','2026-11-15T12:30:00+06:00',async p=>{await p.click('.round-check.layer-fard'); await sleep(500);}],
  ['reward-vol','2026-11-15T08:00:00+06:00',async p=>{await p.click('.mark-event-complete'); await sleep(500);}],
  ['countdown-no-pref','2026-11-15T18:15:00+06:00',async p=>{await p.evaluate(()=>[...document.querySelectorAll('[data-event-countdown]')].find(x=>x.dataset.key==='awwabin').click()); await sleep(900);}],
  ['countdown-pref','2026-11-15T10:00:00+06:00',async p=>{await p.evaluate(()=>document.querySelector('[data-event-countdown]').click()); await sleep(900);}],
  ['home-3-events','2026-11-15T18:45:00+06:00',async p=>{}],
  ['home-rotate-on','2026-11-15T12:30:00+06:00',async p=>{await p.click('#astroRotateBtn'); await sleep(300);}],
  ['reward-day','2026-11-15T19:00:00+06:00',async p=>{await p.click('.round-check.layer-fard'); await sleep(500);},{history:{'2026-11-15':REC}}],
];
let total=0, issues=0;
const only=process.argv[2]; 
for(const lang of ['en','bn']) for(const [w,h,s] of sizes) for(const [fname,ff] of fonts) for(const [name,at,act,data] of scenes){
  if(only && !`${lang}-${name}-${w}`.includes(only)) continue;
  const p=await open(b,{lang,w,h,at,scale:s,data:data||{}});
  if(ff) await p.evaluate(f=>{const st=document.createElement('style');st.textContent=`body, body * { font-family: ${f} !important }`;document.head.append(st);},ff);
  await act(p); await sleep(400);
  const r=await audit(p); total++;
  const bad=r.clip.length+r.overlap.length+(r.hscroll?1:0);
  if(bad||r.errs?.length||p.errs.length){ issues++; console.log(`[${lang} ${name} ${w}x${h}@${s} ${fname}] zoom=${r.zoom} clip=${r.clip.length} overlap=${r.overlap.length} hscroll=${r.hscroll} errs=${p.errs.length}`); for(const x of [...new Set(r.clip)].slice(0,4)) console.log('   clip:',x); for(const x of [...new Set(r.overlap)].slice(0,5)) console.log('   overlap:',x); if(p.errs.length) console.log('   ',p.errs.slice(0,2).join('|')); }
  if(process.env.SMALL && r.small.length) console.log(`[${lang} ${name} ${w}x${h}@${s}] small:`, [...new Set(r.small)].slice(0,8));
  await p.close();
}
console.log(`audited ${total} views, ${issues} with issues`);
await b.close();

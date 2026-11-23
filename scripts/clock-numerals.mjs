// Measures the real gap between the baton and the ink of the 6 and the 9 (screen pixels -> dial units) and takes close-ups.
import {launch,open,sleep} from './lib.mjs';
const D=process.argv[2]||'/workspace/prayer/shots211/';
const b=await launch(); const T='2026-11-15T10:10:30+06:00'; let bad=0;
const measure=p=>p.evaluate(()=>{
  const svg=document.querySelector('#analogSvg'); const cv=document.createElement('canvas').getContext('2d'); const out={};
  for(const t of svg.querySelectorAll('.ck-num')){
    const cs=getComputedStyle(t); cv.font=`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; cv.textAlign='center'; cv.textBaseline='alphabetic';
    const m=cv.measureText(t.textContent); const x=+t.getAttribute('x'), y=+t.getAttribute('y'); const h=+t.dataset.hour;
    const L=x-m.actualBoundingBoxLeft,R=x+m.actualBoundingBoxRight,Tp=y-m.actualBoundingBoxAscent,B=y+m.actualBoundingBoxDescent;
    const cx=(L+R)/2, cy=(Tp+B)/2;
    // baton: the rect nearest the hour at the same hour rotation
    const edge = h===6 ? 100-Tp - 0 : 100-R; // distance from centre to the ink edge nearest the baton (6: top of ink; 9: right of ink)
    const radialEdge = h===6 ? (B-100) : (100-L);
    out[h]={text:t.textContent,gap:+(60.5-radialEdge).toFixed(2),centreRadius:+(h===6?cy-100:100-cx).toFixed(2),offAxis:+(h===6?cx-100:cy-100).toFixed(2)};
  } return out;});
for(const lang of ['en','bn']) for(const mode of ['home','expanded']){
  const p=await open(b,{lang,w:1280,h:720,at:T,scale:3});
  if(mode==='expanded'){ await p.click('#analogClockButton'); await sleep(1500); }
  await sleep(300);
  const r=await measure(p); const g6=r[6].gap,g9=r[9].gap;
  const same=Math.abs(g6-g9)<0.15&&Math.abs(r[6].offAxis)<0.15&&Math.abs(r[9].offAxis)<0.15; if(!same) bad++;
  console.log(`${same?'PASS':'FAIL'} ${lang} ${mode}: gap6=${g6} gap9=${g9} centreRadius6=${r[6].centreRadius} centreRadius9=${r[9].centreRadius} offAxis=${r[6].offAxis}/${r[9].offAxis}  (${r[6].text},${r[9].text})`);
  const box=await p.$eval('#analogSvg',e=>e.getBoundingClientRect().toJSON());
  await p.screenshot({path:D+`clock-closeup-${lang}-${mode}.png`,clip:{x:box.x-4,y:box.y-4,width:box.width+8,height:box.height+8}});
  await p.close();
}
await b.close(); process.exit(bad?1:0);

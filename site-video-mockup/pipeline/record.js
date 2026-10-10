const { chromium } = require('playwright-core');
const fs=require('fs');
const SPEED=850;
(async()=>{
 const b=await chromium.launch({channel:'chrome',args:['--hide-scrollbars']});
 const p=await b.newPage({viewport:{width:1280,height:800},deviceScaleFactor:2});
 await p.route('**/work/creative/film.mp4*', r=>r.fulfill({path:'/Users/ronieliyahu/Documents/Claude/פרוייקטים/אתר פורטפוליו - רוני אליהו/space/work/creative/film.mp4', contentType:'video/mp4'}));
 await p.goto('https://portfolio.ronieliyahu.co.il/',{waitUntil:'networkidle',timeout:60000});
 const H0=await p.evaluate(()=>document.documentElement.scrollHeight);
 for(let y=0;y<H0;y+=600){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(120);}
 await p.waitForTimeout(1500);
 await p.goto('about:blank');
 const cdp=await p.context().newCDPSession(p);
 const frames=[]; let n=0;
 cdp.on('Page.screencastFrame', f=>{
   const name=`frames8/${String(n++).padStart(5,'0')}.jpg`;
   fs.writeFileSync(name, Buffer.from(f.data,'base64'));
   frames.push([name,f.metadata.timestamp]);
   cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId}).catch(()=>{});
 });
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:95,maxWidth:2560,maxHeight:1600,everyNthFrame:1});
 await p.goto('https://portfolio.ronieliyahu.co.il/',{waitUntil:'load'});
 const load=Date.now()/1000;
 let mx=640,my=600;
 const move=async(x,y,ms)=>{const n=Math.max(1,Math.round(ms/16)),x0=mx,y0=my;for(let i=1;i<=n;i++){const t=i/n,e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;await p.mouse.move(x0+(x-x0)*e,y0+(y-y0)*e);await p.waitForTimeout(16);}mx=x;my=y;};
 const scrollTo=async(y)=>{await p.evaluate(([y,v])=>new Promise(r=>{const y0=scrollY,d=Math.abs(y-y0)/v,s=performance.now();(function f(){const t=d?Math.min(1,(performance.now()-s)/1000/d):1;scrollTo(0,y0+(y-y0)*t);t<1?requestAnimationFrame(f):r();})();}),[y,SPEED]);};
 const rects=async(sel)=>p.evaluate(s=>[...document.querySelectorAll(s)].map(e=>{const b=e.getBoundingClientRect();return [b.left+b.width/2,b.top+b.height/2]}).filter(([x,y])=>y>40&&y<760),sel);
 await p.mouse.move(mx,my);
 await p.waitForTimeout(400);
 await p.evaluate(()=>{ const v=document.querySelector('#film video'); const orig=v.play.bind(v); window.__hold=true; v.play=()=>window.__hold?Promise.resolve():orig(); });
 await p.evaluate(()=>{ if(window.lenis) lenis.destroy(); document.documentElement.style.scrollBehavior='auto'; });
 // hero: 5s, the light follows the cursor
 await move(420,330,900); await move(860,300,1100); await move(900,520,800); await move(640,430,800);
 // about: one quick hover on the portrait (calm -> smile)
 await move(1240,760,300);
 await scrollTo(880);
 for (const [x,y] of (await rects('.about .ph .fig')).slice(0,1)){ await move(x,y,350); await p.waitForTimeout(1000); }
 await move(1240,760,300);
 // first branding block only: a quick pass over two cards
 await scrollTo(4400);
 for (const [x,yy] of (await rects('.mb-card')).slice(0,2)){ await move(x,yy,300); await p.waitForTimeout(200); }
 await move(1240,760,300);
 // the film: scroll until it settles into its card, then let it play to the end
 const filmY=await p.evaluate(()=>{const s=document.getElementById('film');return s.offsetTop+innerHeight*0.85;});
 await scrollTo(filmY);
 await p.waitForTimeout(250);
 const rects2=await p.evaluate(()=>{const R=e=>{if(!e)return null;const b=e.getBoundingClientRect();return [b.left,b.top,b.width,b.height]};
   return {stage:R(document.querySelector('#film .film-stage')),dock:R(document.querySelector('.dock')),fabs:R(document.querySelector('.fabs')||document.querySelector('.fab'))};});
 const holdStart=Date.now()/1000;
 await p.evaluate(()=>{const v=document.querySelector('#film video');window.__hold=false;v.currentTime=0;v.play();});
 await p.waitForTimeout(5300);
 global.FILM={holdStart,holdEnd:Date.now()/1000,...rects2}; console.log(JSON.stringify(global.FILM));
 await p.waitForTimeout(150);
 const total=await p.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
 await scrollTo(total);
 await p.waitForTimeout(2000);
 const len=Date.now()/1000-load;
 await cdp.send('Page.stopScreencast'); await p.waitForTimeout(300);
 fs.writeFileSync('frames8.json',JSON.stringify({frames,marks:{load,len,film:global.FILM}}));
 const span=frames.at(-1)[1]-frames[0][1];
 console.log(frames.length,'frames',(frames.length/span).toFixed(1),'fps len',len.toFixed(1));
 await b.close();
})();

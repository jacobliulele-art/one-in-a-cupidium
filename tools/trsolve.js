// Checks every Ultimate Chicken Horse map can be finished with nothing placed, using the game's own physics.
// Needs Playwright. Serve the repo first (python3 -m http.server 8810), then: node tools/trsolve.js [maps] [max steps]
// can a racer reach the flag with nothing placed? BFS over short input bursts using the game's own physics
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({args:['--no-proxy-server']});const p=await b.newPage();
p.on('pageerror',e=>{if(!/fetch/i.test(e.message))console.log('ERR',e.message)});
await p.goto('http://127.0.0.1:8810/index.html');await p.waitForTimeout(2000);
const maps=(process.argv[2]||"crystal,peaks,tropical,woods").split(",");
for(const id of maps){const r=await p.evaluate(({id,LIM})=>{trSetMap(id);TRM.id=null;trSetMap(id);const C=trBuild({items:[],holes:[],map:id});TRG=null;
  let dead=false,won=false;window.trDie=(P)=>{P.st="dead";};window.trSendRes=()=>{};
  const P0={coins:{},x:TR_START.x*TR_TS+2,y:TR_START.y*TR_TS+16-TRP.h-1,vx:0,vy:0,w:TRP.w,h:TRP.h,f:1,st:"run",t:0,coy:0,buf:0};
  const acts=[];for(const h of [-1,0,1])for(const j of [0,1,2])acts.push({h,j});// j: 0 none, 1 tap jump (press+hold 4 frames), 2 hold jump all 8 frames
  const key=P=>[Math.round(P.x/6),Math.round(P.y/6),Math.round(P.vx/80),Math.round(P.vy/140),P.coy>0?1:0].join(",");
  const g=TR_GOAL,gx=(g.x0+1.5)*TR_TS,gy=g.y1*TR_TS,dist=P=>Math.hypot(P.x-gx,(P.y-gy)*1.3);
  const H=[],push=(P,d)=>{H.push([d,P]);let i=H.length-1;while(i>0){const j=(i-1)>>1;if(H[j][0]<=H[i][0])break;[H[i],H[j]]=[H[j],H[i]];i=j;}},
    pop=()=>{const top=H[0],last=H.pop();if(H.length){H[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<H.length&&H[l][0]<H[m][0])m=l;if(r<H.length&&H[r][0]<H[m][0])m=r;if(m===i)break;[H[i],H[m]]=[H[m],H[i]];i=m;}}return top[1];};
  const seen=new Set([key(P0)]),q=[P0];push(P0,dist(P0));let best=P0,n=0;
  while(H.length&&n<LIM){const S=pop();
    for(const a of acts){const P=JSON.parse(JSON.stringify(S));const inp={l:a.h<0,r:a.h>0,j:false,jp:false};let t=P.t;
      for(let f=0;f<8;f++){inp.j=a.j===2||(a.j===1&&f<4);if(f===0&&a.j)inp.jp=true;trStep(P,C,inp,1/60,t);t+=1/60;trCheck(P,C,t);if(P.st!=="run")break;}
      n++;if(P.st==="win"){return{id,ok:true,n,t:P.t.toFixed(1)};}if(P.st!=="run")continue;
      const k=key(P);if(seen.has(k))continue;seen.add(k);q.push(P);push(P,dist(P)+P.t*4);if(P.x>best.x)best=P;}}
  // furthest along: report where it got stuck
  const far=q.reduce((m,s)=>Math.hypot(s.x-(g.x0+1)*TR_TS,s.y-g.y1*TR_TS)<Math.hypot(m.x-(g.x0+1)*TR_TS,m.y-g.y1*TR_TS)?s:m,q[0]);
  return{id,ok:false,n,states:q.length,closest:[Math.floor(far.x/TR_TS),Math.floor(far.y/TR_TS)],maxX:[Math.floor(best.x/TR_TS),Math.floor(best.y/TR_TS)],start:[TR_START.x,TR_START.y],goal:[g.x0,g.y1],W:TR_W,H:TR_H};},{id,LIM:+process.argv[3]||400000});
 console.log(JSON.stringify(r));}
await b.close();})();

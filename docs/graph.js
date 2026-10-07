/* Meridian KG canvas — playful physics, portfolio → tenant.
   Ontology colors: FIBO gold / REC teal / REAM violet.
   Node types and predicates follow the FIBO + REC + REAM ontology. */
(function(){
  var canvas = document.getElementById("kgCanvas");
  if(!canvas) return;
  var tip = document.getElementById("kgTip");
  var live = document.getElementById("kgLive");
  var ctx = canvas.getContext("2d");

  /* Shared motion controller (graph2.js loads first, so it owns it).
     Animation follows the OS reduced-motion setting, live. */
  var Motion = window.MeridianMotion || (window.MeridianMotion = (function(){
    var mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    var subs = [];
    function on(){ return !mq.matches; }
    function src(){ return "os"; }
    function report(e){ try{ window.__meridianError = String((e&&e.message)||e); }catch(_){} }
    if(mq.addEventListener) mq.addEventListener("change", function(){
      subs.slice().forEach(function(f){ try{ f(on(), src()); }catch(e){ report(e); } });
    });
    return { animated:on, source:src, subscribe:function(f){ subs.push(f); } };
  })());
  function motionOn(){ try{ return Motion.animated(); }catch(e){ return true; } }

  var NODES = [
    {id:"fund", label:"Income Fund II", type:"FIBO · Fund", onto:"fibo", col:"#e8b44a", r:30, gx:0, info:"FIBO Fund · pooled vehicle"},
    {id:"port", label:"Alder Portfolio", type:"REAM · PropertyPortfolio", onto:"ream", col:"#a78bfa", r:34, gx:1, info:"REAM · subclass REC Collection · 3 properties"},
    {id:"b0", label:"Beacon Wharf", type:"REAM · BuildingAsset", onto:"ream", col:"#a78bfa", r:30, gx:2, info:"REC Building + FIBO RealProperty · 96 units"},
    {id:"b1", label:"Juniper Court", type:"REAM · BuildingAsset", onto:"ream", col:"#a78bfa", r:28, gx:2, info:"REC Building + FIBO RealProperty · 64 units"},
    {id:"u101", label:"B-101", type:"REC · Apartment", onto:"rec", col:"#2dd4bf", r:22, gx:3, info:"occupied · contract_rent 2,240"},
    {id:"u102", label:"B-102", type:"REC · Apartment", onto:"rec", col:"#2dd4bf", r:22, gx:3, info:"vacant-leased · market_rent 2,310"},
    {id:"u114", label:"B-114", type:"REC · Apartment", onto:"rec", col:"#2dd4bf", r:22, gx:3, info:"occupied · contract_rent 1,265 + pet 35"},
    {id:"j204", label:"J-204", type:"REC · Apartment", onto:"rec", col:"#2dd4bf", r:22, gx:3, info:"occupied · contract_rent 1,875"},
    {id:"l0", label:"L-8814", type:"REAM · OccupancyLease", onto:"ream", col:"#a78bfa", r:22, gx:4, info:"current · leaseEnd 2027-03 · leaseOf B-101"},
    {id:"l1", label:"L-8815", type:"REAM · OccupancyLease", onto:"ream", col:"#a78bfa", r:20, gx:4, info:"future · leaseOf B-102 · stays unattached"},
    {id:"l2", label:"L-8816", type:"REAM · OccupancyLease", onto:"ream", col:"#a78bfa", r:22, gx:4, info:"current · leaseOf B-114"},
    {id:"l3", label:"L-9012", type:"REAM · OccupancyLease", onto:"ream", col:"#a78bfa", r:22, gx:4, info:"current · leaseOf J-204"},
    {id:"t0", label:"Ellis, R.", type:"REC · Person", onto:"rec", col:"#2dd4bf", r:22, gx:5, info:"Tenant · leasee of L-8814"},
    {id:"t1", label:"Okafor, J.", type:"REC · Person", onto:"rec", col:"#2dd4bf", r:20, gx:5, info:"Tenant · future lease L-8815"},
    {id:"t2", label:"Lindqvist, S.", type:"REC · Person", onto:"rec", col:"#2dd4bf", r:22, gx:5, info:"Tenant · leasee of L-8816"},
    {id:"s0", label:"NOI line", type:"REAM · StatementLine", onto:"ream", col:"#a78bfa", r:20, gx:2, lane:-1, info:"Beacon · Jan–Dec · months sum ✓"},
    {id:"s1", label:"GPR line", type:"REAM · StatementLine", onto:"ream", col:"#a78bfa", r:20, gx:2, lane:-1, info:"Juniper · Apr–Mar · months sum ✓"},
    {id:"loan", label:"Loan A", type:"FIBO · LoanSecured", onto:"fibo", col:"#e8b44a", r:22, gx:2, lane:1, info:"collateral: Beacon Wharf · DSCR watched"},
    {id:"doc", label:"Roll PDF", type:"REC · Document", onto:"rec", col:"#2dd4bf", r:20, gx:3, lane:1, info:"SourceDocument · adapter lane · evidence"}
  ];
  var EDGES = [
    ["fund","port","sponsors"], ["port","b0","partOf"], ["port","b1","partOf"],
    ["b0","u101","hasUnit"], ["b0","u102","hasUnit"], ["b0","u114","hasUnit"], ["b1","j204","hasUnit"],
    ["l0","u101","leaseOf"], ["l1","u102","leaseOf"], ["l2","u114","leaseOf"], ["l3","j204","leaseOf"],
    ["l0","t0","leasee"], ["l1","t1","leasee"], ["l2","t2","leasee"],
    ["b0","s0","hasStatementLine"], ["b1","s1","hasStatementLine"],
    ["loan","b0","collateral"], ["doc","u101","mentions"], ["doc","s0","mentions"]
  ];
  var WALK = ["port","b0","u101","l0","t0"];
  var byId = {};
  NODES.forEach(function(n,i){ byId[n.id]=n; n.i=i; });

  var W=800, H=440, dpr=1;
  var CSS_H = 440; /* fixed layout height — never read back the DPR-scaled attribute */
  function resize(){
    dpr = Math.min(2, window.devicePixelRatio||1);
    var r = canvas.parentElement.getBoundingClientRect();
    W = Math.max(320, r.width); H = CSS_H;
    var pw = Math.round(W*dpr), ph = Math.round(H*dpr);
    if(canvas.width !== pw || canvas.height !== ph){ canvas.width = pw; canvas.height = ph; }
    canvas.style.height = H+"px";
    ctx.setTransform(dpr,0,0,dpr,0,0);
    try{ window.__kgSize = W+"x"+H+" dpr"+dpr; }catch(e){}
  }
  window.addEventListener("resize", resize);

  // column slots (spread stacked nodes) + near-target scatter
  NODES.forEach(function(n){
    var mates=NODES.filter(function(m){ return m.gx===n.gx && !m.lane; });
    n.slot = mates.length<2 ? 0 : (mates.indexOf(n)-(mates.length-1)/2);
  });
  function scatter(){
    NODES.forEach(function(n){
      n.x = colX(n.gx)+(Math.random()*70-35);
      n.y = (n.lane?laneY(n.lane):H/2)+(Math.random()*90-45);
      n.vx=(Math.random()-.5)*2; n.vy=(Math.random()-.5)*2;
    });
  }

  var drag=null, hover=null, highlight=null, pulse={t:0, active:true};
  function pos(id){ return byId[id]; }

  /* Tier-2 layout helpers: layered columns carry the portfolio→tenant story. */
  var focus=0, timeMs=0, kgVisible=true;
  var pointer={x:0,y:0,on:false,down:false};
  var pulseTrail=[];
  function colX(c){ var pad=Math.max(56,W*0.08); return pad + c*(W-2*pad)/5; }
  function laneY(l){ return H/2 + l*H*0.30; }
  function isWalkEdge(ed){
    var a=WALK.indexOf(ed[0]), b=WALK.indexOf(ed[1]);
    return a>=0 && b>=0 && Math.abs(a-b)===1;
  }
  function walkCurve(A,B){
    var vx=B.x-A.x, vy=B.y-A.y, vl=Math.hypot(vx,vy)||1;
    return {x:(A.x+B.x)/2 - vy/vl*20, y:(A.y+B.y)/2 + vx/vl*20};
  }
  function quadPt(A,C,B,t){
    var m=1-t;
    return {x:m*m*A.x+2*m*t*C.x+t*t*B.x, y:m*m*A.y+2*m*t*C.y+t*t*B.y};
  }

  function step(){
    var i,j,a,b,dx,dy,d,f;
    focus += ((highlight?1:0)-focus)*0.05;
    var spread=Math.min(96,H*0.17);
    var kCol=0.004+focus*0.004;
    // column + lane gravity (the narrative spine leads; spotlight tightens it)
    NODES.forEach(function(n){
      var tx=colX(n.gx), ty=n.lane?laneY(n.lane):H/2+n.slot*spread;
      var stiff=kCol;
      if(highlight){
        if(highlight.indexOf(n.id)>=0){ ty=H/2+n.slot*spread*0.4; stiff=0.016; }
        else stiff=0.0012;
      }
      n.vx += (tx-n.x)*stiff; n.vy += (ty-n.y)*stiff;
    });
    // edge springs (weak — columns lead; walk edges pull tighter)
    EDGES.forEach(function(ed){
      a=pos(ed[0]); b=pos(ed[1]); dx=b.x-a.x; dy=b.y-a.y; d=Math.sqrt(dx*dx+dy*dy)||1;
      var rest=isWalkEdge(ed)?92:120; f=(d-rest)*0.006;
      dx/=d; dy/=d; a.vx+=dx*f; a.vy+=dy*f; b.vx-=dx*f; b.vy-=dy*f;
    });
    // short-range repulsion
    for(i=0;i<NODES.length;i++){ for(j=i+1;j<NODES.length;j++){
      a=NODES[i]; b=NODES[j]; dx=a.x-b.x; dy=a.y-b.y; d=Math.sqrt(dx*dx+dy*dy)||1;
      if(d<120){ f=(120-d)*0.010/d; a.vx+=dx*f; a.vy+=dy*f; b.vx-=dx*f; b.vy-=dy*f; }
    }}
    // hard collision (circles + label room)
    for(i=0;i<NODES.length;i++){ for(j=i+1;j<NODES.length;j++){
      a=NODES[i]; b=NODES[j]; dx=b.x-a.x; dy=b.y-a.y; d=Math.sqrt(dx*dx+dy*dy)||0.01;
      var min=a.r+b.r+26;
      if(d<min){ var push=(min-d)/d*0.5; dx/=d; dy/=d; a.x-=dx*push; a.y-=dy*push; b.x+=dx*push; b.y+=dy*push; }
    }}
    // integrate + breathing idle + hover magnetism
    timeMs += 16;
    NODES.forEach(function(n){
      if(drag!==n){
        n.vx += Math.sin(timeMs*0.0011 + n.i*1.3)*0.022;
        n.vy += Math.cos(timeMs*0.0009 + n.i*1.7)*0.022;
        if(pointer.on && !pointer.down){
          var hx=pointer.x-n.x, hy=pointer.y-n.y, hd=Math.hypot(hx,hy);
          if(hd<110 && hd>1){ n.vx += hx/hd*0.03; n.vy += hy/hd*0.03; }
        }
      }
      n.vx*=0.88; n.vy*=0.88;
      if(drag!==n){ n.x+=n.vx; n.y+=n.vy; }
      n.x=Math.max(46,Math.min(W-46,n.x)); n.y=Math.max(34,Math.min(H-28,n.y));
    });
    if(pulse.active && motionOn()) pulse.t = (pulse.t+0.0115)%(WALK.length-1);
  }

  function lit(id){ return !highlight || highlight.indexOf(id)>=0; }

  function draw(){
    ctx.clearRect(0,0,W,H);
    var i, e, a, b;
    // edges
    EDGES.forEach(function(ed){
      a=pos(ed[0]); b=pos(ed[1]);
      var onWalk = isWalkEdge(ed);
      var dim = highlight && !(lit(ed[0])&&lit(ed[1]));
      ctx.strokeStyle = onWalk ? "rgba(167,139,250,.9)" : "rgba(255,255,255,.14)";
      ctx.globalAlpha = dim ? .12 : (onWalk ? 1 : .75);
      ctx.lineWidth = onWalk ? 2.4 : 1.1;
      ctx.beginPath();
      if(onWalk){
        var cc=walkCurve(a,b);
        ctx.moveTo(a.x,a.y); ctx.quadraticCurveTo(cc.x,cc.y,b.x,b.y);
      } else { ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); }
      ctx.stroke();
      ctx.globalAlpha = 1;
      if(onWalk && !dim){
        var cc2=walkCurve(a,b), lp=quadPt(a,cc2,b,0.5);
        ctx.fillStyle="rgba(167,139,250,.9)"; ctx.font="10px JetBrains Mono, monospace"; ctx.textAlign="center";
        ctx.fillText(ed[2], lp.x, lp.y-8);
      }
    });
    // walking comet (eased along the curve, with trail)
    if(pulse.active && motionOn()){
      var seg=Math.floor(pulse.t), fr0=pulse.t-seg;
      var fr=fr0*fr0*(3-2*fr0);
      var A=pos(WALK[seg]), B=pos(WALK[Math.min(WALK.length-1,seg+1)]);
      if(A&&B){
        var C=walkCurve(A,B), P=quadPt(A,C,B,fr);
        pulseTrail.push({x:P.x,y:P.y}); if(pulseTrail.length>14) pulseTrail.shift();
        pulseTrail.forEach(function(pt,k){
          var al=(k+1)/pulseTrail.length;
          ctx.fillStyle="rgba(52,211,153,"+(al*0.32)+")";
          ctx.beginPath(); ctx.arc(pt.x,pt.y,3+al*9,0,7); ctx.fill();
        });
        var g=ctx.createRadialGradient(P.x,P.y,0,P.x,P.y,15);
        g.addColorStop(0,"rgba(255,255,255,.95)"); g.addColorStop(0.35,"rgba(52,211,153,.9)"); g.addColorStop(1,"rgba(52,211,153,0)");
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(P.x,P.y,15,0,7); ctx.fill();
      }
    } else if(pulseTrail.length){ pulseTrail.length=0; }
    // nodes
    NODES.forEach(function(n){
      var dim = highlight && !lit(n.id);
      var hot = (hover===n) || (highlight && highlight.indexOf(n.id)>=0);
      ctx.globalAlpha = dim ? .25 : 1;
      // glow
      ctx.beginPath(); ctx.arc(n.x,n.y,n.r+(hot?5:0),0,7);
      ctx.fillStyle = hot ? hexA(n.col,.28) : "rgba(255,255,255,.03)"; ctx.fill();
      // body
      ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,7);
      ctx.fillStyle = "#0b0c12"; ctx.fill();
      ctx.lineWidth = hot?2.4:1.4; ctx.strokeStyle = n.col; ctx.stroke();
      // labels
      ctx.fillStyle = "#fff"; ctx.font = "600 11px Inter, sans-serif"; ctx.textAlign="center";
      ctx.fillText(n.label, n.x, n.y+1);
      ctx.fillStyle = n.col; ctx.font = "9px JetBrains Mono, monospace";
      ctx.fillText(n.type, n.x, n.y+14);
      ctx.globalAlpha = 1;
    });
  }
  function hexA(hex,a){
    var r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
    return "rgba("+r+","+g+","+b+","+a+")";
  }
  var running=false, rafId=null, fpsFrames=0, fpsTime=0;
  function loop(ts){
    if(!running) return;
    if(!kgVisible){ running=false; rafId=null; return; }
    step(); draw();
    try{
      if(ts){ fpsFrames++; if(!fpsTime) fpsTime=ts;
        if(ts-fpsTime>=1000){ window.__kgFps=fpsFrames; fpsFrames=0; fpsTime=ts; } }
    }catch(e){}
    rafId=requestAnimationFrame(loop);
  }
  function start(){ if(running) return; running=true; fpsFrames=0; fpsTime=0; rafId=requestAnimationFrame(loop); }
  function stop(){ running=false; if(rafId) cancelAnimationFrame(rafId); rafId=null; }
  function settle(){ for(var k=0;k<220;k++) step(); draw(); }

  // pointer: drag + hover tooltip
  function evXY(ev){ var r=canvas.getBoundingClientRect(); return {x:ev.clientX-r.left, y:ev.clientY-r.top}; }
  canvas.addEventListener("pointerdown", function(ev){ var p=evXY(ev); pointer.x=p.x; pointer.y=p.y; pointer.on=true; pointer.down=true; drag=nearest(p.x,p.y,42); if(drag){ drag.vx=0; drag.vy=0; try{canvas.setPointerCapture(ev.pointerId);}catch(e){} } });
  canvas.addEventListener("pointermove", function(ev){
    var p=evXY(ev); pointer.x=p.x; pointer.y=p.y; pointer.on=true;
    if(drag){ drag.vx=Math.max(-9,Math.min(9,(p.x-drag.x)*0.6)); drag.vy=Math.max(-9,Math.min(9,(p.y-drag.y)*0.6)); drag.x=p.x; drag.y=p.y; hideTip(); return; }
    hover=nearest(p.x,p.y,34);
    if(hover){ showTip(hover, p); canvas.style.cursor="pointer"; } else { hideTip(); canvas.style.cursor="grab"; }
  });
  ["pointerup","pointercancel"].forEach(function(k){ canvas.addEventListener(k,function(){ pointer.down=false; drag=null; }); });
  canvas.addEventListener("pointerleave", function(){ pointer.on=false; pointer.down=false; drag=null; hideTip(); });
  function nearest(x,y,max){ var best=null,bd=max; NODES.forEach(function(n){ var d=Math.hypot(n.x-x,n.y-y); if(d<bd){bd=d;best=n;} }); return best; }
  function showTip(n,p){
    tip.hidden=false;
    tip.innerHTML="<b>"+n.label+"</b><br><span class='tt'>"+n.type+"</span><br>"+n.info;
    var r=canvas.parentElement.getBoundingClientRect();
    tip.style.left=Math.min(r.width-250,Math.max(8,p.x+16))+"px";
    tip.style.top=Math.max(8,p.y-20)+"px";
  }
  function hideTip(){ tip.hidden=true; }

  window.MeridianGraph = {
    highlight: function(ids){ highlight = ids&&ids.length?ids:null; },
    pulse: function(on){ pulse.active = !!on; if(live) live.textContent = on?"WALKING":"SETTLED"; pulse.t=0; }
  };

  resize(); scatter(); settle();
  if(motionOn()) start();
  try{
    Motion.subscribe(function(on){
      if(on){ if(kgVisible) start(); } else { stop(); settle(); }
    });
  }catch(e){}
  // visibility: pulse replays + loop pauses offscreen (pulse only renders when animated)
  if("IntersectionObserver" in window){
    var sec=document.getElementById("kgraph");
    if(sec) new IntersectionObserver(function(es){
      es.forEach(function(e){
        kgVisible=e.isIntersecting;
        window.MeridianGraph.pulse(e.isIntersecting);
        if(e.isIntersecting && motionOn() && !running) start();
      });
    },{threshold:.15}).observe(sec);
  }
})();

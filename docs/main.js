/* Meridian site — hero loop, scroll reveals, tabs, and the persistent agent rail (auto-play). */
(function(){
  var Motion = window.MeridianMotion || { animated:function(){ return !window.matchMedia("(prefers-reduced-motion: reduce)").matches; }, source:function(){ return "os"; }, subscribe:function(){} };
  function calm(){ try{ return !Motion.animated(); }catch(e){ return false; } }
  function smooth(){ return calm() ? "auto" : "smooth"; }
  var DEBUG = /(?:\?|&)debug\b/.test(location.search);
  function noteError(e){ try{ window.__meridianError = String((e&&e.message)||e); }catch(_){} }
  window.addEventListener("error", function(ev){ noteError(ev.error||ev.message); });

  /* ---------- hero typed loop + counters + tabs ---------- */
  var typed = document.getElementById("typed"), status = document.getElementById("heroStatus");
  var panels = Array.prototype.slice.call(document.querySelectorAll("#heroPanels .panel"));
  var tabBtns = Array.prototype.slice.call(document.querySelectorAll(".hero-tabs button"));
  var beats = [
    {q:"Monthly NOI for the portfolio", s:"READING THE STATEMENTS", p:"noi"},
    {q:"Occupancy by floor plan", s:"READING THE RENT ROLL", p:"occ"},
    {q:"Value this asset from the Excel model", s:"RUNNING THE EXCEL MODEL", p:"model"}
  ];
  var counted = new WeakSet();
  function fmtVal(v,kind){
    if(kind==="m"){ if(v>=1000000) return (v/1000000).toFixed(v%1000000===0?0:2).replace(/\.00$/,"")+"M"; if(v>=1000) return Math.round(v/1000)+"K"; return ""+v; }
    if(kind==="full") return v.toLocaleString("en-US");
    return v.toLocaleString("en-US");
  }
  function animateNumbers(root){
    if(!root) return;
    if(calm()){ root.querySelectorAll("[data-count]").forEach(function(el){ el.textContent="$"+fmtVal(+el.getAttribute("data-count"),el.getAttribute("data-fmt")); }); return; }
    root.querySelectorAll("[data-count]").forEach(function(el){
      if(counted.has(el)) return; counted.add(el);
      var target=+el.getAttribute("data-count"), kind=el.getAttribute("data-fmt"), t0=null, dur=1300;
      (function step(t){ if(!t0)t0=t; var k=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-k,3), v=Math.round(target*e);
        el.textContent="$"+fmtVal(v,kind); if(k<1) requestAnimationFrame(step); })(performance.now());
    });
  }
  function show(name){
    panels.forEach(function(p){ p.classList.toggle("on", p.getAttribute("data-panel")===name); });
    tabBtns.forEach(function(b){ b.classList.toggle("on", b.getAttribute("data-goto")===name); });
    if(name) animateNumbers(document.querySelector('.panel[data-panel="'+name+'"]'));
  }
  tabBtns.forEach(function(b){ b.addEventListener("click", function(){ show(b.getAttribute("data-goto")); holdHero=Date.now()+8000; }); });
  var holdHero=0;
  animateNumbers(document.querySelector(".hero-stage"));

  function wait(ms){ return new Promise(function(r){ setTimeout(r,ms); }); }
  function type(text){ typed.textContent=""; var i=0; return new Promise(function(res){ (function tick(){ typed.textContent=text.slice(0,++i); if(i<text.length) setTimeout(tick,24+Math.random()*36); else res(); })(); }); }
  function erase(){ return new Promise(function(res){ (function tick(){ if(!typed.textContent.length) return res(); typed.textContent=typed.textContent.slice(0,-1); setTimeout(tick,11); })(); }); }
  var idx=0, heroGen=0;
  async function heroLoop(gen){
    if(calm()){ typed.textContent=beats[0].q; status.textContent=""; show(beats[0].p); return; }
    while(gen===heroGen){
      var beat=beats[idx%beats.length];
      if(Date.now()>holdHero){ show(""); status.textContent=""; await type(beat.q); if(gen!==heroGen) return; await wait(300); status.textContent=beat.s; await wait(750); status.textContent=""; show(beat.p); }
      await wait(2800); if(gen!==heroGen) return;
      if(Date.now()>holdHero){ show(""); await erase(); await wait(240); }
      idx++;
    }
  }
  heroLoop(heroGen);

  /* ---------- scroll reveals ---------- */
  var scenes=document.querySelectorAll(".scene");
  if(calm() || !("IntersectionObserver" in window)){ scenes.forEach(function(s){ s.classList.add("in"); animateNumbers(s); }); }
  else{
    var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add("in"); animateNumbers(e.target); io.unobserve(e.target); } }); },{threshold:.22});
    scenes.forEach(function(s){ io.observe(s); });
  }

  /* ---------- doc/workbook tabs ---------- */
  function segWire(segId,attr,paneSel){
    var seg=document.getElementById(segId); if(!seg) return;
    seg.querySelectorAll("button").forEach(function(b){ b.addEventListener("click",function(){
      seg.querySelectorAll("button").forEach(function(x){ x.classList.remove("on"); }); b.classList.add("on");
      var v=b.getAttribute(attr);
      document.querySelectorAll(paneSel).forEach(function(p){ p.classList.toggle("on",p.getAttribute(attr)===v); });
    });});
  }
  segWire("docSeg","data-doc",".docpane");
  document.querySelectorAll("#docFiles .file").forEach(function(f){ f.addEventListener("click",function(){
    var v=f.getAttribute("data-doc");
    document.querySelectorAll("#docFiles .file").forEach(function(x){ x.classList.toggle("on",x===f); });
    document.querySelectorAll(".docpane").forEach(function(p){ p.classList.toggle("on",p.getAttribute("data-doc")===v); });
    var seg=document.getElementById("docSeg"); if(seg) seg.querySelectorAll("button").forEach(function(b){ b.classList.toggle("on",b.getAttribute("data-doc")===v); });
  });});
  segWire("wbSeg","data-wb",".wbpane");

  /* ---------- nav ---------- */
  var t=document.getElementById("navToggle"), m=document.getElementById("navMobile");
  if(t&&m) t.addEventListener("click",function(){ var o=m.classList.toggle("open"); t.setAttribute("aria-expanded",o); });
  if(m) m.querySelectorAll("a").forEach(function(a){ a.addEventListener("click",function(){ m.classList.remove("open"); }); });

  /* ---------- persistent agent rail (auto-play) ---------- */
  var STATES = {
    hero:{sec:"HERO", steps:"2/8 STEPS", q:"Portfolio NOI, trailing twelve?",
      think:"Resolving metric via lexicon…\nT12 NOI walk looks right — executing.",
      tools:[["catalog → metric","t12-noi ✓"],["read statement line","Beacon Jan–Dec"],["run walk","sum(amount_total)"]],
      ans:"Beacon Wharf <b>1.31M</b><sup>[1]</sup> · Juniper Court <b>764K</b><sup>[2]</sup>. Vesper Lofts has no printed NOI line — <b>LINE ABSENT</b>.",
      src:[["1 · Beacon OS ✓",1],["2 · Juniper OS ✓",1],["Vesper · absent",0]], follow:"Which formula did you use?",
      kg:["port","b0","u101","l0","t0"]},
    graph:{sec:"GRAPH", steps:"3/8 STEPS", q:"Show me what the answer stands on.",
      think:"Tracing portfolio → tenant…\npartOf · hasUnit · leaseOf · leasee all resolve.",
      tools:[["traverse graph","depth 4 from Portfolio"],["run walk","hasUnit + leaseOf"],["check evidence","hasMention ×3"]],
      ans:"One trace: <b>Alder Portfolio → Beacon Wharf → B-101 → L-8814 → Ellis, R.</b> Statement, loan, and fund hang off the same spine.",
      src:[["walk · 5 hops ✓",1],["FIBO + REC + REAM ✓",1]],
      kg:["port","b0","u101","l0","t0"]},
    answer:{sec:"ANSWER", steps:"4/8 STEPS", q:"And the missing one?",
      think:"Checking Vesper's statement rows…\nNo NOI label — refusing to invent.",
      tools:[["read statement","Vesper · 12 rows"],["catalog → metric","t12-noi · no match"],["report","LINE ABSENT"]],
      ans:"Vesper Lofts prints no NOI line, so no number is offered for it. The other two cite their printed lines.",
      src:[["Vesper · 0 NOI rows",0],["policy · never invent ✓",1]],
      kg:["b1","s1"]},
    docs:{sec:"INGEST", steps:"3/8 STEPS", q:"Which of my files did you trust — and what did you flag?",
      think:"Routing 3 files…\nRoll + statement → adapters. Deck → narrative lane.",
      tools:[["route files","roll · statement · deck"],["adapter: rent roll","96 units · leases"],["adapter: T12","months sum ✓"]],
      ans:"Rent roll and statement parsed <b>without a model</b>; totals verified month-by-month. <b>3 mismatch rows</b> stay in the exception queue — visible, not absorbed.",
      src:[["adapter · no LLM ✓",1],["exceptions · 3 queued",0]], follow:"Which formula did you use?",
      kg:["doc","u101","s0"]},
    lexicon:{sec:"LEXICON", steps:"2/8 STEPS", q:"Which formula did you use?",
      think:"Loading firm term…\nT12 NOI is APPROVED — running its walk.",
      tools:[["load lexicon","t12-noi · APPROVED"],["run walk","hasStatementLine → sum"],["series","12 dated months"]],
      ans:"The readable walk on the note — <b>sum the printed NOI line</b> per property. Months come back as a dated series; custom terms draft the same way.",
      src:[["lexicon: t12-noi ✓",1],["custom KB · draftable",0]], follow:"Value it at 5.74% cap?",
      kg:["b0","s0"]},
    workbook:{sec:"EXCEL", steps:"4/8 STEPS", q:"Value Beacon Wharf at 5.74% cap?",
      think:"Reading the live cell…\nXLOOKUP resolves — no retyping.",
      tools:[["read cell","D2 =XLOOKUP/ C2"],["evaluate sheet","Formualizer engine"],["named calc","cap-rate-value"]],
      ans:"<b>22,807,018</b><sup>[1]</sup> — NOI 1,310,000 ÷ 5.74%, resolved <b>in the sheet</b>. Sensitivity runs the same path.",
      src:[["1 · sheet D2 ✓",1],["spill · XLOOKUP ✓",1]], follow:"Stress rents −5%?",
      kg:[]},
    python:{sec:"AUTOMATION", steps:"5/8 STEPS", q:"Stress rents −5%?",
      think:"Loading saved snippet…\ncap-rate-value with gross × (1 − 0.35).",
      tools:[["load snippet","cap-rate-value"],["python_run","sandboxed · 41ms"],["write note","dated · cited"]],
      ans:"Downside value <b>21.6M</b> written to a dated note with inputs attached. Same snippet answers next time — no spreadsheet surgery.",
      src:[["snippet ✓",1],["note · cited ✓",1]], follow:"Draft the Monday board?",
      kg:[]},
    desk:{sec:"DESK", steps:"6/8 STEPS", q:"Draft the Monday board.",
      think:"Transcluding PDFs + notes…\nDraft stays ephemeral until signed.",
      tools:[["transclude","roll.pdf · t12#NOI"],["live table","4 expirations"],["draft board","ephemeral"]],
      ans:"Board drafted with <b>live links</b> — PDFs, leases, KPI tables. Scratch stays ephemeral; the signed pack stays put.",
      src:[["![[roll.pdf]] ✓",1],["![[t12#NOI]] ✓",1]], follow:"Bring one rent roll?",
      kg:["u102","l1"]},
    close:{sec:"START", steps:"1/8 STEPS", q:"Bring one rent roll?",
      think:"Ready when you are…\nFile-first, cited, workbook-native.",
      tools:[["ingest","your file → graph"],["answer","cited, never invented"],["keep","Excel calculates"]],
      ans:"Drop a rent roll and a statement — I'll return cited NOI, occupancy, and a workbook value on the same desk.",
      src:[["file-first ✓",1],["cited ✓",1]], follow:"Follow one answer down",
      kg:null}
  };
  var body=document.getElementById("agentBody");
  var cur=null, timers=[];
  function later(fn,ms){ timers.push(setTimeout(fn,ms)); }
  function clearTimers(){ timers.forEach(clearTimeout); timers=[]; }
  function render(key){
    var st=STATES[key]; if(!st||!body) return;
    cur=key; clearTimers();
    body.classList.remove("fade"); void body.offsetWidth; body.classList.add("fade");
    body.innerHTML='<div class="msg-user">'+st.q+'</div>'+
      '<div class="msg-ai"><span class="avatar sm">M</span><div class="ai-col">'+
      '<div class="thinking" id="aThink"><span>Thinking</span><i></i><i></i><i></i></div>'+
      '<details class="reason" id="aReason" hidden><summary>VIEW REASONING</summary><div class="atools" id="aTools"></div></details>'+
      '<div class="aans" id="aAns" hidden></div>'+
      '<div class="asrc slim" id="aSrc" hidden></div>'+
      '</div></div>';
    var thinkEl=document.getElementById("aThink"), reasonEl=document.getElementById("aReason"),
        toolsEl=document.getElementById("aTools"), ansEl=document.getElementById("aAns"), srcEl=document.getElementById("aSrc");
    function finish(){
      if(cur!==key) return;
      thinkEl.style.display="none";
      reasonEl.open=true;
      ansEl.hidden=false; ansEl.innerHTML=st.ans;
      srcEl.hidden=false; srcEl.innerHTML=st.src.map(function(s){ return '<span class="'+(s[1]?'ok':'')+'">'+s[0]+'</span>'; }).join("");
      body.scrollTop=body.scrollHeight;
      updateDbg();
    }
    if(calm()){
      st.tools.forEach(function(tl){
        var div=document.createElement("div"); div.className="atool done"; div.innerHTML='<i class="st"></i><b>'+tl[0]+'</b><span>'+tl[1]+'</span>';
        toolsEl.appendChild(div);
      });
      reasonEl.hidden=false; finish();
    } else {
      reasonEl.hidden=false; reasonEl.open=true;
      st.tools.forEach(function(tl,i){
        var div=document.createElement("div"); div.className="atool"; div.innerHTML='<i class="st"></i><b>'+tl[0]+'</b><span>'+tl[1]+'</span>';
        toolsEl.appendChild(div);
        later(function(){ if(cur!==key)return; div.classList.add("run"); body.scrollTop=body.scrollHeight; }, 900+i*650);
        later(function(){ if(cur!==key)return; div.classList.remove("run"); div.classList.add("done"); }, 1450+i*650);
      });
      later(finish, 1000+st.tools.length*650);
    }
    // graph sync
    if(window.MeridianGraph){
      if(st.kg) window.MeridianGraph.highlight(st.kg);
      else if(st.kg===null) window.MeridianGraph.highlight(null);
      if(key==="graph") window.MeridianGraph.pulse(true);
    }
    updateDbg();
  }
  var watched=document.querySelectorAll("[data-agent]");
  function activeByPosition(){
    var mid=window.innerHeight*0.4, best=null, bestD=1e9;
    watched.forEach(function(w){
      var r=w.getBoundingClientRect(), c=r.top+r.height/2, d=Math.abs(c-mid);
      if(d<bestD){ bestD=d; best=w.getAttribute("data-agent"); }
    });
    return best;
  }
  render("hero");
  if("IntersectionObserver" in window){
    var ao=new IntersectionObserver(function(es){
      var best=null,br=0;
      es.forEach(function(e){ if(e.isIntersecting && e.intersectionRatio>br){ br=e.intersectionRatio; best=e.target.getAttribute("data-agent"); } });
      if(best && best!==cur) render(best);
    },{threshold:[.15,.3,.5,.7]});
    watched.forEach(function(w){ ao.observe(w); });
  }
  /* scroll fallback: nearest section to the viewport band wins (throttled) */
  var scrollTick=false, lastFallback=0;
  window.addEventListener("scroll", function(){
    if(scrollTick) return; scrollTick=true;
    requestAnimationFrame(function(){
      scrollTick=false;
      var now=Date.now(); if(now-lastFallback<350) return; lastFallback=now;
      var b=activeByPosition(); if(b && b!==cur) render(b);
    });
  }, {passive:true});
  /* failsafe: never leave the rail on a stale state */
  setTimeout(function(){ try{ var b=activeByPosition(); if(b && b!==cur) render(b); }catch(e){ noteError(e); } }, 3000);
  /* ---------- motion follows the OS setting; debug overlay ---------- */
  var dbgEl=null;
  function updateDbg(){
    if(!DEBUG || !dbgEl) return;
    var on=false, src="?";
    try{ on=Motion.animated(); src=Motion.source(); }catch(e){}
    var fps="—"; try{ if(typeof window.__kgFps==="number") fps=String(window.__kgFps); }catch(e){}
    var size="—"; try{ if(window.__kgSize) size=String(window.__kgSize); }catch(e){}
    var err=""; try{ if(window.__meridianError) err=String(window.__meridianError); }catch(e){}
    dbgEl.innerHTML="<b>MERIDIAN DEBUG</b> (?debug)<br>"+
      "motion: <span class='"+(on?"ok":"bad")+"'>"+(on?"ANIMATED":"CALM")+"</span> · src="+src+"<br>"+
      "agent: <b>"+(cur||"—")+"</b><br>"+
      "canvas: "+fps+" fps · "+size+"<br>"+
      (err?("<span class='dbg-err'>ERR · "+err+"</span>"):"<span class='ok'>errors: none</span>");
  }
  if(DEBUG){
    dbgEl=document.createElement("div"); dbgEl.className="dbg";
    dbgEl.innerHTML="<b>MERIDIAN DEBUG</b> (?debug)<br>booting…";
    document.body.appendChild(dbgEl);
    setInterval(updateDbg, 1000); updateDbg();
  }
  try{
    Motion.subscribe(function(){
      heroGen++; heroLoop(heroGen);
      if(cur) render(cur);
      updateDbg();
    });
  }catch(e){ noteError(e); }
})();

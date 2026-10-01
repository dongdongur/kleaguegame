/* K-레전드 38 화면과 진행: 카드 드래프트(선발 11 + 후보 5 + 감독) → 시즌(리그·FA컵·ACL) → 겨울 이적시장 → 다음 시즌 */
(function(){
"use strict";
const K=window.KLCore, CFG=K.CONFIG;
const {FORMS,GROUP,SQUADS,TEAMS26,MGRS,STYLE_NAME,tag,shuffle,clone,fitsSlot,YEARS,coversYear}=K;
const MODES={team:"연도 + 팀", pos:"연도 + 포지션"};
const DIFFS={easy:"쉬움 · 2026 현재", hard:"어려움 · 전성기"};
const RATINGS={season:"시즌 (그 시즌 능력치)", prime:"프라임 (전성기 능력치)"};
const TIER_NAME={bronze:"브론즈",silver:"실버",gold:"골드",elite:"엘리트",icon:"아이콘"};

const $ = id => document.getElementById(id);
const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const store = {get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
function el(tag,cls,txt){const e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e;}
const sgn = v => (v>=0?"+":"")+v.toFixed(1);
const hard = () => $("hard").checked;

/* ================= 상태 ================= */
let S;
function newCareer(){ return {no:1,year:2026,div:1,k1:K.TEAMS26.slice(),k2:K.K2_DEFS.slice(),history:[],trophies:{league:0,k2:0,fa:0,acl:0},aclQ:false,prev:null,boost:{},moves:0}; }
function newState(form,mode,diff,rm){
  K.setRatingMode(rm||"season");
  S = {form:form||"4-3-3", mode:mode||"team", diff:diff||"easy", rm:rm||"season", xi:Array(11).fill(null), bench:Array(CFG.BENCH).fill(null),
    squad:null, selected:null, respins:CFG.RESPINS, spinning:false, done:false, picks:0, mgr:null, mgrOffer:null,
    phase:"draft", career:newCareer(), last:null, winter:null};
}
const ctx = () => ({form:S.form, mgr:S.mgr});
const started = () => S.picks>0 || !!S.mgr || S.career.no>1;
const offering = () => !!S.squad || !!S.mgrOffer;
const xiFull = () => S.xi.every(Boolean);
const benchOpen = () => S.bench.some(b=>!b);
const benchCount = () => S.bench.filter(Boolean).length;
const benchPhase = () => !!(S.squad && S.squad.bench);
const blind = () => hard() && !S.done;
function usedNames(){ return new Set(S.xi.concat(S.bench).filter(Boolean).map(x=>x.name)); }
const ready = () => xiFull() && !benchOpen() && !!S.mgr;

/* ================= 카드 ================= */
const SIL='<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="31" r="17"/><path d="M14 98c0-24 15-38 36-38s36 14 36 38z"/></svg>';
/* FIFA 스타일 선수 카드. p: {name,pos,ovr,det?}, o: {pos,sub,badge,badgeCls,cls,blind} */
function cardEl(p,o){
  o=o||{};
  const bl = o.blind!==undefined ? o.blind : blind();
  const t = bl ? "blind" : K.tier(p.ovr);
  const c=el("div","fcard t-"+t+(o.cls?" "+o.cls:""));
  if(!bl && p.ovrP!=null) c.title=p.name+" · 이 시즌 "+p.ovrS+" / 전성기 "+p.ovrP;
  c.append(el("span","fc-ovr",bl?"?":String(p.ovr)), el("span","fc-pos",o.pos||(p.det?p.det[0]:p.pos)));
  const art=el("span","fc-art"); art.innerHTML=SIL; c.appendChild(art);
  c.appendChild(el("span","fc-name",p.name));
  if(o.sub) c.appendChild(el("span","fc-sub",o.sub));
  if(o.badge) c.appendChild(el("span","fc-badge "+(o.badgeCls||""),o.badge));
  return c;
}
function emptyCard(label,cls){ const c=el("div","fcard empty"+(cls?" "+cls:"")); c.append(el("span","fc-ovr",label)); return c; }

/* ================= 상단 · 설정 ================= */
function idleHint(){
  return S.mode==="pos"
    ? "스핀하면 연도와 채워야 할 포지션이 나와요. 그 해 그 포지션을 뛴 선수 카드 중 한 장을 고르세요."
    : "스핀하면 연도와 팀이 나와요. 그 팀 선수 카드 중 한 장을 골라 빈 자리에 넣으세요.";
}
function idleReel(){
  setReel(S.mode==="pos" ? "연도 + 포지션" : "연도 + 팀","스핀을 눌러 시작", S.mode==="pos" ? "그 해 그 포지션을 뛴 선수 중에서 선택" : "그 팀 선수 전원이 공개돼요");
}
function setReel(y,club,sub,crestName){
  $("reelYear").textContent=y; $("reelClub").textContent=club; $("reelEra").textContent=sub;
  const rc=$("reelCrest"); rc.innerHTML=""; if(crestName && crestFile(crestName)){ rc.appendChild(crest(crestName,48)); }
}

function renderSeg(id,map,cur,locked,onPick){
  const seg=$(id); seg.innerHTML="";
  Object.keys(map).forEach(k=>{
    const b=document.createElement("button"); b.type="button"; b.textContent=map[k];
    b.setAttribute("aria-pressed",String(k===cur)); b.disabled = locked && k!==cur;
    b.onclick=()=>{ if(locked||k===cur) return; onPick(k); };
    seg.appendChild(b);
  });
}
function renderForms(){
  const seg=$("formSeg"); seg.innerHTML="";
  Object.keys(FORMS).forEach(f=>{
    const b=document.createElement("button"); b.type="button"; b.textContent=f;
    b.setAttribute("aria-pressed",String(f===S.form)); b.disabled = started() && f!==S.form;
    b.onclick=()=>{ if(started()) return; S.form=f; renderForms(); renderPitch(); };
    seg.appendChild(b);
  });
}
function renderModes(){ renderSeg("modeSeg",MODES,S.mode,started(),m=>{ S.mode=m; idleReel(); $("hint").textContent=idleHint(); renderModes(); }); }
function renderRatings(){ renderSeg("ratingSeg",RATINGS,S.rm,started(),r=>{ S.rm=r; K.setRatingMode(r); renderRatings(); renderOffers(); renderPitch(); }); }
function renderDiffs(){ renderSeg("diffSeg",DIFFS,S.diff,S.done||S.career.no>1&&S.phase==="winter",d=>{ S.diff=d; renderDiffs(); renderBest(); renderOpp(); }); }
function renderBadge(){
  const c=S.career; const b=$("seasonBadge"); b.innerHTML="";
  b.append(el("span","sb-k","SEASON"), el("b",null,String(c.no)), el("span","sb-y",String(c.year)));
  b.appendChild(el("span","chip lg"+c.div,c.div===1?"K리그1":"K리그2"));
  if(c.aclQ) b.appendChild(el("span","chip acl","ACL 진출"));
}
function saveBest(R){
  const all=store.get("kl38-best3")||{}; const m=R.me; const b=all[R.diff];
  if(!b || m.pts>b.pts){ all[R.diff]={pts:m.pts,w:m.w,d:m.d,l:m.l,rank:R.rank}; store.set("kl38-best3",all); }
  renderBest();
}
function renderBest(){
  const all=store.get("kl38-best3")||{}; const b=all[S.diff]; const e=$("best"); e.innerHTML="";
  const lab=S.diff==="hard"?"어려움":"쉬움";
  if(!b){ e.textContent="최고 기록 없음 ("+lab+")"; return; }
  e.append("최고 기록 ("+lab+")"); e.appendChild(el("strong",null,b.w+"승 "+b.d+"무 "+b.l+"패 · "+b.pts+"점"));
}

/* ================= 감독 ================= */
function mgrOvrText(m){ return blind() ? "??" : m.ovr; }
function mgrCard(m,onClick){
  const b=document.createElement(onClick?"button":"div"); b.className="mcard"+(onClick?" pick":""); if(onClick){ b.type="button"; b.onclick=onClick; }
  const top=el("div","mc-top"); top.append(el("span","mc-lab","감독"), el("b",null,m.name), el("span","mc-ovr",String(mgrOvrText(m))));
  const tags=el("div","mc-tags");
  [STYLE_NAME[m.style], "선호 "+m.form+(m.form===S.form?" ✓":""), "조직력 "+"★".repeat(m.org)+"☆".repeat(5-m.org)].forEach(t=>tags.appendChild(el("span","tg",t)));
  b.append(top, el("div","mc-note",m.note), tags);
  return b;
}
function renderMgr(){
  const box=$("mgrBox"); box.innerHTML="";
  const m=S.mgr;
  if(!m){ box.classList.add("empty"); box.append(el("span","mc-none","감독 미선택 · 감독을 뽑으면 팀 전력과 케미에 영향을 줘요")); return; }
  box.classList.remove("empty");
  const fx=K.mgrFx(m,S.form); const bl=blind();
  box.appendChild(mgrCard(m));
  box.appendChild(el("div","mc-fx","보정 공격 "+(bl?"??":sgn(fx.att))+" · 수비 "+(bl?"??":sgn(fx.def))+" · 케미 ×"+fx.mult.toFixed(2)));
}

/* ================= 배치 가능 자리 ================= */
function eligibleSlots(p){
  if(!p) return [];
  if(usedNames().has(p.name)) return [];
  const only = S.squad && S.squad.forSlot!=null ? S.squad.forSlot : null;
  return FORMS[S.form].map((s,i)=>({s,i})).filter(({s,i})=>!S.xi[i] && (only==null || i===only) && fitsSlot(p,s[0])).map(o=>o.i);
}
/* 겨울 이적시장: 영입 후보가 들어갈 수 있는 자리 */
function winterSlots(p){ if(!p) return []; return FORMS[S.form].map((s,i)=>i).filter(i=>fitsSlot(p,FORMS[S.form][i][0])); }

/* ================= 경기장 · 스쿼드 ================= */
function renderPitch(){
  const pitch=$("pitch"); pitch.querySelectorAll(".slot").forEach(n=>n.remove());
  const W=S.phase==="winter" && S.winter && S.winter.cand;
  const can = new Set(W ? winterSlots(S.winter.cand) : eligibleSlots(S.selected));
  const tgt = W && S.winter.target && S.winter.target.xi!=null ? S.winter.target.xi : -1;
  FORMS[S.form].forEach((s,i)=>{
    const p=S.xi[i]; const b=document.createElement("button"); b.type="button";
    b.className="slot"+(can.has(i)?" can":"")+(tgt===i?" target":"");
    b.style.left=s[1]+"%"; b.style.top=s[2]+"%";
    if(!can.has(i)) b.tabIndex=-1;
    if(p){
      const dl = S.phase==="winter" && p.delta ? (p.delta>0?"▲"+p.delta:"▼"+Math.abs(p.delta)) : null;
      b.appendChild(cardEl(p,{pos:s[0],badge:dl,badgeCls:p.delta>0?"up":"down"}));
      b.setAttribute("aria-label", s[0]+" "+p.name);
    } else { b.appendChild(emptyCard(s[0])); b.setAttribute("aria-label", s[0]+" 빈 자리"+(can.has(i)?", 여기에 배치":"")); }
    if(can.has(i)) b.onclick=()=> W ? winterPick({xi:i}) : place(i);
    pitch.appendChild(b);
  });
  renderBench();
  renderStats();
  renderButtons();
}
function renderStats(){
  const filled=S.xi.filter(Boolean).length;
  const r = filled ? K.rate(S.xi,null,ctx()) : null;
  const hide = blind();
  $("ovrV").textContent = r && !hide ? Math.round((r.att+r.def)/2) : (r&&hide?"?":"–");
  $("attV").textContent = r && !hide ? r.att.toFixed(1) : "–";
  $("defV").textContent = r && !hide ? r.def.toFixed(1) : "–";
  $("chemV").textContent = "+"+(r? r.chem:0).toFixed(1);
  $("chemV").title = r ? "같은 팀·시즌 "+r.clubPairs+"쌍, 같은 시기 국가대표 "+r.natPairs+"쌍" : "";
  $("cntV").textContent=filled+"/11 · "+benchCount()+"/"+CFG.BENCH;
  const total=11+CFG.BENCH;
  const pr=$("progress"); pr.innerHTML=""; for(let k=0;k<total;k++){ const i=document.createElement("i"); if(k<filled+benchCount()) i.className="on"; if(k>=11) i.classList.add("bn"); pr.appendChild(i); }
  renderMgr();
  renderBadge();
  const pl=$("phaseLabel");
  pl.textContent = S.phase==="winter" ? "" : S.done ? "시즌 종료" : !xiFull() ? "선발 "+filled+"/11" : benchOpen() ? "후보 "+benchCount()+"/"+CFG.BENCH : S.mgr ? "준비 완료" : "감독 선택";
}
function renderBench(){
  const box=$("bench"); box.innerHTML="";
  box.appendChild(el("div","benchlab","후보 "+benchCount()+"/"+CFG.BENCH));
  const W=S.phase==="winter" && S.winter && S.winter.cand;
  const row=el("div","benchrow");
  S.bench.forEach((p,i)=>{
    const b=document.createElement("button"); b.type="button";
    const can = !!(W && p); const tgt = W && S.winter.target && S.winter.target.bench===i;
    b.className="bslot"+(can?" can":"")+(tgt?" target":"");
    if(p){
      const dl = S.phase==="winter" && p.delta ? (p.delta>0?"▲"+p.delta:"▼"+Math.abs(p.delta)) : null;
      b.appendChild(cardEl(p,{badge:dl,badgeCls:p.delta>0?"up":"down"})); b.setAttribute("aria-label","후보 "+p.name);
    } else { b.appendChild(emptyCard("+")); b.setAttribute("aria-label","후보석 "+(i+1)+" 비어 있음"); }
    if(can) b.onclick=()=>winterPick({bench:i}); else b.disabled=true;
    row.appendChild(b);
  });
  box.appendChild(row);
}
function renderButtons(){
  const filled=S.xi.filter(Boolean).length;
  const win=S.phase==="winter";
  const sim=$("simBtn");
  if(S.done){ sim.textContent="겨울 이적시장 →"; sim.disabled=win; }
  else { sim.textContent=S.career.no>1?"시즌 시작":"시즌 시작"; sim.disabled = !ready(); }
  $("spinBtn").disabled = xiFull() || S.spinning || offering() || S.done;
  $("mgrBtn").disabled = !!S.mgr || S.spinning || offering() || S.done;
  $("benchBtn").disabled = !xiFull() || !benchOpen() || S.spinning || offering() || S.done;
  $("respinBtn").disabled = !offering() || benchPhase() || S.respins<=0 || S.spinning;
  $("respinBtn").textContent = "다시 스핀 ("+S.respins+")";
}

/* ================= 드래프트: 선택지 카드 ================= */
function renderOffers(){
  const ul=$("plist"); ul.innerHTML="";
  if(S.mgrOffer){ S.mgrOffer.forEach(m=>{ const li=el("li","moffer"); li.appendChild(mgrCard(m,()=>pickMgr(m))); ul.appendChild(li); }); return; }
  if(!S.squad) return;
  const used=usedNames();
  const order={GK:0,DF:1,MF:2,FW:3};
  S.squad.players.slice().sort((a,b)=>b.ovr-a.ovr||order[a.pos]-order[b.pos]).forEach((p,idx)=>{
    const li=el("li","offer-li"); li.style.setProperty("--d",(reduce?0:idx*70)+"ms");
    const b=document.createElement("button"); b.type="button"; b.className="offer";
    const slots=eligibleSlots(p).length>0, bn=benchPhase()&&!used.has(p.name);
    const ok=slots||bn;
    b.disabled=!ok; b.setAttribute("aria-pressed",String(S.selected===p));
    const showTag = S.mode==="pos" || benchPhase();
    const dp=p.det?p.det.join("/"):p.pos;
    b.appendChild(cardEl(p,{sub: showTag?tag(SQUADS[p.sq]):dp, cls:(ok?"":"dim")+(S.selected===p?" sel":""), badge: used.has(p.name)?"선택됨":(!ok?"자리 없음":null), badgeCls:"gray"}));
    if(showTag) b.appendChild(el("span","offer-pos",dp));
    b.onclick=()=>pickPlayer(p);
    li.appendChild(b); ul.appendChild(li);
  });
}
function pickPlayer(p){
  if(benchPhase()){ S.selected=p; placeBench(); return; }
  S.selected = (S.selected===p?null:p);
  if(!S.selected){ $("hint").textContent="선수를 골라 주세요."; renderOffers(); renderPitch(); return; }
  const slots=eligibleSlots(S.selected);
  if(slots.length===1){ place(slots[0]); return; }
  $("hint").textContent = S.selected.name+" 카드를 넣을 자리를 경기장에서 눌러 주세요.";
  renderOffers(); renderPitch();
}

/* ================= 스핀 ================= */
function makePosOffer(){
  const used=usedNames();
  const empty=FORMS[S.form].map((s,i)=>i).filter(i=>!S.xi[i]);
  const slot=empty[Math.floor(Math.random()*empty.length)];
  const label=FORMS[S.form][slot][0];
  const byYear=new Map();
  YEARS.forEach(y=>{ const seen=new Set(); const c=[];
    SQUADS.forEach(q=>{ if(coversYear(q,y)) q.players.forEach(p=>{ if(fitsSlot(p,label) && !used.has(p.name) && !seen.has(p.name)){ seen.add(p.name); c.push(p); } }); });
    if(c.length) byYear.set(y,c); });
  const years=[...byYear.keys()];
  /* 후보가 최대한 여러 명인 해를 우선: 5명 이상 > 3명 이상 > 2명 이상 > 아무 해 */
  const tier=[CFG.POS_CANDS,3,2,1].map(n=>years.filter(y=>byYear.get(y).length>=n)).find(a=>a.length)||years;
  const year=tier[Math.floor(Math.random()*tier.length)];
  return {club:label, sub:"그 해 "+label+"를 뛴 선수", year, players:shuffle(byYear.get(year)).slice(0,CFG.POS_CANDS), forSlot:slot};
}
function anyEligible(sq){ return sq.players.some(p=>eligibleSlots(p).length>0); }
function makeTeamOffer(){
  const pool=SQUADS.filter(anyEligible); const q=pool[Math.floor(Math.random()*pool.length)];
  const year=q.yrs[0]+Math.floor(Math.random()*(q.yrs[1]-q.yrs[0]+1));
  let ps = CFG.TEAM_CANDS>0 ? shuffle(q.players).slice(0,CFG.TEAM_CANDS) : q.players.slice();
  if(!ps.some(p=>eligibleSlots(p).length>0)){ const e=shuffle(q.players.filter(p=>eligibleSlots(p).length>0))[0]; ps[ps.length-1]=e; }
  return {club:q.club, sub:q.era+" 시즌 · 선수 "+ps.length+"명 전원 공개", year, players:ps, forSlot:null};
}
function spin(isRespin,toMgr){
  if(S.spinning) return;
  if(isRespin){ if(S.respins<=0) return; S.respins--; }
  const wasMgr=!!toMgr || !!S.mgrOffer;
  S.spinning=true; S.squad=null; S.mgrOffer=null; S.selected=null; renderOffers(); renderPitch();
  let target=null, faces;
  const ry=()=>YEARS[Math.floor(Math.random()*YEARS.length)]+"년";
  if(wasMgr){ faces=()=>{ const m=MGRS[Math.floor(Math.random()*MGRS.length)]; return ["감독",m.name,m.note.split(" · ")[0]]; }; }
  else if(S.mode==="pos"){ target=makePosOffer(); const labs=FORMS[S.form].filter((s,i)=>!S.xi[i]).map(s=>s[0]);
    faces=()=>[ry(),labs[Math.floor(Math.random()*labs.length)],"포지션 스핀"]; }
  else{ target=makeTeamOffer();
    faces=()=>{ const sq=SQUADS[Math.floor(Math.random()*SQUADS.length)]; return [ry(),sq.club,sq.era+" 시즌"]; }; }
  const reel=$("reel"); reel.classList.add("spin");
  const steps = reduce?1:16; let k=0;
  const tick=()=>{
    k++;
    const [y,a,b] = k>=steps && target ? [target.year+"년",target.club,target.sub] : faces();
    setReel(y,a,b,k>=steps&&target&&S.mode!=="pos"?target.club:null);
    if(k<steps){ setTimeout(tick, 40+k*k*1.4); }
    else{
      reel.classList.remove("spin"); S.spinning=false;
      if(wasMgr){ S.mgrOffer=shuffle(MGRS).slice(0,CFG.MGR_CANDS); setReel("감독 후보","감독 후보 "+S.mgrOffer.length+"명","한 명을 선택하세요");
        $("hint").textContent="함께할 감독을 고르세요. 선택하면 바꿀 수 없어요."; }
      else{ S.squad=target;
        $("hint").textContent = S.mode==="pos" ? target.year+"년 "+target.club+" 자리에 들어갈 선수 카드를 고르세요." : target.year+"년 "+target.club+" 선수 카드 중 한 장을 고르세요."; }
      renderOffers(); renderPitch();
    }
  };
  tick();
}
function drawMgr(){ if(S.spinning||S.mgr||offering()) return; spin(false,true); }

/* 후보 뽑기: 선발 11명을 다 뽑은 뒤 5명을 연달아 뽑아요 */
function benchOffer(){
  const used=usedNames(); const seen=new Set(); const c=[];
  shuffle(SQUADS.flatMap(s=>s.players)).forEach(p=>{ if(!used.has(p.name) && !seen.has(p.name)){ seen.add(p.name); c.push(p); } });
  return {club:"후보 영입", sub:"후보 "+(benchCount()+1)+" / "+CFG.BENCH, year:"후보", players:c.slice(0,CFG.BENCH_CANDS), forSlot:null, bench:true};
}
function showBenchOffer(){
  S.squad=benchOffer(); S.selected=null;
  setReel(S.squad.year,S.squad.club,S.squad.sub);
  $("hint").textContent="후보 "+(benchCount()+1)+"번째 선수를 고르세요. 포지션은 상관없어요.";
  renderOffers(); renderPitch();
}
function startBench(){ if(!xiFull()||!benchOpen()||offering()||S.spinning||S.done) return; showBenchOffer(); }

function afterPick(){
  const filled=S.xi.filter(Boolean).length;
  const pos=S.mode==="pos";
  let year, club, era, hint;
  if(filled<11){ year=pos?"연도 + 포지션":"연도 + 팀"; club=pos?"다음 포지션 스핀":"다음 스핀"; era=(11-filled)+"자리 남음"; hint="스핀을 눌러 다음 "+(pos?"포지션":"팀")+"을 뽑으세요."; }
  else if(benchOpen()){ year="선발 완성"; club="후보 "+CFG.BENCH+"명 뽑기"; era=(CFG.BENCH-benchCount())+"명 남음"; hint="'후보 뽑기'를 눌러 후보를 연달아 뽑으세요."+(S.mgr?"":" 감독도 뽑아야 해요."); }
  else { year="준비 완료"; club="베스트 11 + 후보"; era=S.mgr?"시즌을 시작하세요":"감독을 뽑아 주세요"; hint=S.mgr?"2026 K리그1 시즌을 시작해 보세요.":"감독 뽑기를 눌러 감독을 정하세요."; }
  setReel(year,club,era); $("hint").textContent=hint;
}
function pickMgr(m){
  S.mgr=m; S.mgrOffer=null; renderModes(); renderForms();
  afterPick(); if(!xiFull()) $("hint").textContent="스핀을 눌러 선수를 뽑으세요.";
  renderOffers(); renderPitch();
}
function place(i){
  if(!S.selected) return;
  S.xi[i]=clone(S.selected); S.picks++; S.selected=null; S.squad=null;
  afterPick(); renderModes(); renderForms(); renderOffers(); renderPitch();
}
function placeBench(){
  if(!S.selected || !benchOpen()) return;
  S.bench[S.bench.findIndex(b=>!b)]=clone(S.selected); S.picks++; S.selected=null; S.squad=null;
  renderModes(); renderForms();
  if(benchOpen()){ showBenchOffer(); }
  else { afterPick(); renderOffers(); renderPitch(); }
}

/* ================= 상대팀 스쿼드 보기 ================= */
let selOpp=null, selDiv=1;
const oppList = d => d===1 ? S.career.k1 : S.career.k2;
function renderOpp(sel,div){
  if(div!==undefined){ selDiv=div; if(sel===undefined) sel=null; }
  if(sel!==undefined) selOpp=sel;
  const hardD=S.diff==="hard";
  $("oppDiffLabel").textContent="적용 중인 상대 능력치: "+(hardD?"전성기":"2026 현재");
  const tabs=$("oppTabs"); tabs.innerHTML="";
  [[1,"K리그1"],[2,"K리그2"]].forEach(([d,t])=>{ const b=el("button","divtab",t+" ("+oppList(d).length+(S.career.div===d?"+나":"")+")"); b.type="button"; b.setAttribute("aria-pressed",String(d===selDiv)); b.onclick=()=>renderOpp(null,d); tabs.appendChild(b); });
  oppList(selDiv).forEach((t,i)=>{
    const b=document.createElement("button"); b.type="button"; b.className="teamtab";
    const cr=crest(t.club,18); b.append(cr, document.createTextNode(" "+t.short));
    b.setAttribute("aria-pressed",String(i===selOpp)); b.onclick=()=>renderOpp(i===selOpp?null:i);
    tabs.appendChild(b);
  });
  const view=$("oppView"); view.innerHTML="";
  if(selOpp==null || !oppList(selDiv)[selOpp]){ view.appendChild(el("p","hint","팀을 누르면 선수단과 능력치를 볼 수 있어요. 시즌마다 팀 전력이 조금씩 달라지고, 승강으로 팀이 K리그1과 K리그2를 오가요.")); return; }
  const t=oppList(selDiv)[selOpp], boost=S.career.boost[t.club]||0, o=K.oppStrength(t,hardD,boost);
  view.appendChild(el("p","oppsum",t.club+" ("+(selDiv===1?"K리그1":"K리그2")+") · 공격 "+o.att.toFixed(1)+" / 수비 "+o.def.toFixed(1)+(t.players.length?" · 목록에 없는 자리는 기본 "+(t.base+(hardD?CFG.HARD_FILL:0))+"으로 계산":" · 선수 명단 없이 팀 기본 능력치 "+(t.base+(hardD?CFG.HARD_FILL:0))+"로 계산")+(boost?" · 이번 시즌 전력 보정 "+sgn(boost):"")));
  const rivals=K.DERBIES.filter(d=>d[0]===t.club||d[1]===t.club).map(d=>(d[0]===t.club?d[1]:d[0])+" ("+d[2]+")");
  if(rivals.length) view.appendChild(el("p","oppsum","라이벌: "+rivals.join(", ")));
  if(!t.players.length) return;
  const tb=el("table","tbl oppt");
  tb.innerHTML="<thead><tr><th class='t'>포지션</th><th class='t'>이름</th><th class='t'>세부</th><th>2026 현재</th><th>전성기</th></tr></thead>";
  const body=el("tbody"); const order={GK:0,DF:1,MF:2,FW:3};
  t.players.slice().sort((a,b)=>order[a.pos]-order[b.pos]||b.ovr-a.ovr).forEach(p=>{
    const tr=el("tr"); const pc=el("td","t"); pc.appendChild(el("span","pos "+p.pos,p.pos));
    tr.append(pc, el("td","t",p.name), el("td","t",p.det||""), el("td","num"+(hardD?"":" on"),String(p.ovr)), el("td","num"+(hardD?" on":""),String(p.prime)));
    body.appendChild(tr);
  });
  tb.appendChild(body); const wrap=el("div","tablewrap"); wrap.appendChild(tb); view.appendChild(wrap);
}

/* ================= 시즌 진행 ================= */
function runSeason(){
  const c=S.career;
  c.prev={aclQ:c.aclQ,div:c.div,k1:c.k1.slice(),k2:c.k2.slice()};
  const R=window.KLSeason.run({form:S.form,mgr:S.mgr,xi:S.xi,bench:S.bench,diff:S.diff,teamName:$("teamName").value.trim()||"레전드 FC",
    year:c.year,seasonNo:c.no,div:c.div,k1:c.k1,k2:c.k2,aclQualified:c.aclQ,boost:c.boost});
  recordSeason(R);
  showResults(R);
}
/* 승강으로 K리그1·K리그2 팀 목록과 내 소속 리그를 바꿔요 */
function applyMoves(R){
  const c=S.career; const defOf=n=>c.k1.concat(c.k2).find(d=>d.club===n);
  const up=R.moves.up, down=R.moves.down;
  const nk1=c.k1.filter(d=>!down.includes(d.club)), nk2=c.k2.filter(d=>!up.includes(d.club));
  up.filter(x=>x!=="@me").forEach(n=>{ const d=defOf(n); if(d) nk1.push(Object.assign({},d,{div:1})); });
  down.filter(x=>x!=="@me").forEach(n=>{ const d=defOf(n); if(d) nk2.push(Object.assign({},d,{div:2})); });
  c.k1=nk1; c.k2=nk2; c.div=R.nextDiv;
}
function recordSeason(R){
  const c=S.career, m=R.me;
  c.history.push({no:c.no,year:c.year,div:R.div,rank:R.rank,pts:m.pts,w:m.w,d:m.d,l:m.l,gf:m.gf,ga:m.ga,promo:R.promo.text,
    fa:R.fa.champion?"우승":(R.fa.exit||"-"), acl:R.acl.qualified?(R.acl.champion?"우승":(R.acl.exit||R.acl.reached||"-")):"불참", trophies:R.trophies.slice()});
  if(R.trophies.includes("리그 우승")) c.trophies.league++; if(R.trophies.includes("K리그2 우승")) c.trophies.k2++;
  if(R.fa.champion) c.trophies.fa++; if(R.acl.champion) c.trophies.acl++;
  c.aclQ=R.aclNext;
  applyMoves(R);
  S.last=R; S.done=true; S.phase="results";
  R.newAch = window.KLAch ? window.KLAch.check(R,{career:c,mode:S.mode,diff:S.diff,moves:c.moves}) : [];
  saveBest(R);
}
function resim(){
  /* 같은 선수단으로 이번 시즌만 다시 돌려요 (커리어 기록과 승강은 이번 시즌 결과로 교체) */
  const c=S.career, last=c.history.pop();
  if(last){ if(last.trophies.includes("리그 우승")) c.trophies.league--; if(last.trophies.includes("K리그2 우승")) c.trophies.k2--; if(last.trophies.includes("FA컵 우승")) c.trophies.fa--; if(last.trophies.includes("ACL 우승")) c.trophies.acl--; }
  if(c.prev){ c.aclQ=c.prev.aclQ; c.div=c.prev.div; c.k1=c.prev.k1; c.k2=c.prev.k2; }
  runSeason();
}
function resetGame(){
  const f=S.form, md=S.mode, df=S.diff, rm=S.rm; newState(f,md,df,rm);
  $("results").hidden=true; $("results").innerHTML=""; $("careerWrap").hidden=true;
  $("deskDraft").hidden=false; $("deskWinter").hidden=true;
  idleReel(); $("hint").textContent=idleHint();
  renderAll(); window.scrollTo({top:0,behavior:reduce?"auto":"smooth"});
}

/* ================= 겨울 이적시장 ================= */
function enterWinter(){
  const c=S.career;
  /* 선수 성장·하락 */
  S.xi.concat(S.bench).filter(Boolean).forEach(p=>{
    if(S.rm==="prime"){ p.delta=0; return; }
    p.age=(p.age||27)+1;
    const curve=-(K.agePen(p.age,p.pos)-K.agePen(p.age-1,p.pos));
    const d=K.clamp(Math.round(curve+K.randn()*1.1+p.trend*.5),CFG.DEV_RANGE[0],CFG.DEV_RANGE[1]);
    const next=K.clamp(p.ovr+d,CFG.R_MIN,p.ovrP);
    p.delta=next-p.ovr; p.ovr=next; });
  /* 상대팀 전력 변화 */
  TEAMS26.forEach(t=>{ c.boost[t.club]=K.clamp((c.boost[t.club]||0)+K.randn()*.9,-4,4); });
  S.phase="winter";
  S.winter={moves:CFG.TRANSFERS,rerolls:CFG.REROLLS,offer:null,cand:null,target:null,mgrOffer:null,mgrChanged:false,log:[]};
  $("deskDraft").hidden=true; $("deskWinter").hidden=false;
  renderAll(); renderWinter();
  $("desk").scrollIntoView({behavior:reduce?"auto":"smooth",block:"start"});
}
function winterOffer(){
  const used=usedNames(); const seen=new Set(); const c=[];
  shuffle(SQUADS.flatMap(s=>s.players)).forEach(p=>{ if(!used.has(p.name) && !seen.has(p.name)){ seen.add(p.name); c.push(p); } });
  return c.slice(0,CFG.WINTER_CANDS);
}
function renderWinter(){
  const w=S.winter, body=$("winterBody"); body.innerHTML="";
  $("winterLabel").textContent=S.career.year+" → "+(S.career.year+1);
  /* 1) 시즌 사이 변화 */
  const dev=el("div","w-sec"); dev.appendChild(el("h3",null,"시즌 사이 선수 변화"));
  const list=el("div","devlist");
  S.xi.concat(S.bench).filter(Boolean).slice().sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).forEach(p=>{
    const r=el("span","dv "+(p.delta>0?"up":p.delta<0?"down":"flat")); r.append(el("b",null,p.name), document.createTextNode(" "+p.ovr+" "), el("i",null,p.delta>0?"▲"+p.delta:p.delta<0?"▼"+Math.abs(p.delta):"–"));
    list.appendChild(r); });
  dev.appendChild(list); body.appendChild(dev);
  const lgn=el("div","w-sec"); lgn.appendChild(el("h3",null,"다음 시즌 소속"));
  lgn.appendChild(el("p","hint",(S.last&&S.last.promo.text?S.last.promo.text+". ":"")+"다음 시즌은 "+(S.career.div===1?"K리그1":"K리그2")+"에서 시작해요."+(S.career.div===2?" 1위가 되면 1부로 직행 승격해요.":"")+(S.career.aclQ?" ACL에도 출전해요.":"")));
  body.appendChild(lgn);
  /* 2) 영입 */
  const tr=el("div","w-sec"); tr.appendChild(el("h3",null,"선수 영입"));
  tr.appendChild(el("p","hint","영입권 "+w.moves+"장 · 후보 새로고침 "+w.rerolls+"회. 마음에 드는 카드를 고르고, 내보낼 선수를 왼쪽 스쿼드에서 눌러 교체하세요."));
  const row=el("div","btnrow");
  const show=el("button","btn primary",w.offer?"다른 후보 보기":"영입 후보 보기"); show.type="button";
  show.disabled = w.moves<=0 || (w.offer && w.rerolls<=0);
  show.onclick=()=>{ if(w.offer) w.rerolls--; w.offer=winterOffer(); w.cand=null; w.target=null; renderPitch(); renderWinter(); };
  row.appendChild(show); tr.appendChild(row);
  if(w.offer && w.moves>0){
    const ul=el("ul","offers");
    w.offer.slice().sort((a,b)=>b.ovr-a.ovr).forEach(p=>{
      const li=el("li","offer-li"); const b=document.createElement("button"); b.type="button"; b.className="offer";
      const fitsAny=winterSlots(p).length>0;
      b.appendChild(cardEl(p,{blind:false,sub:tag(SQUADS[p.sq]),cls:(w.cand===p?"sel":"")}));
      b.appendChild(el("span","offer-pos",(p.det?p.det.join("/"):p.pos)+(fitsAny?"":" · 후보로만")));
      b.onclick=()=>{ w.cand=(w.cand===p?null:p); w.target=null; renderPitch(); renderWinter(); };
      li.appendChild(b); ul.appendChild(li); });
    tr.appendChild(ul);
  }
  if(w.cand && w.target){
    const t=w.target; const out = t.xi!=null ? S.xi[t.xi] : S.bench[t.bench];
    const bar=el("div","swapbar");
    bar.append(el("span",null,out.name+" ("+out.ovr+")  →  "+w.cand.name+" ("+w.cand.ovr+")"));
    const ok=el("button","btn go","이적 확정"); ok.type="button"; ok.onclick=confirmSwap;
    const no=el("button","btn ghost","취소"); no.type="button"; no.onclick=()=>{ w.target=null; renderPitch(); renderWinter(); };
    bar.append(ok,no); tr.appendChild(bar);
  } else if(w.cand){ tr.appendChild(el("p","hint",w.cand.name+" 카드를 넣을 자리를 스쿼드에서 눌러 주세요. (경기장은 그 자리를 뛸 수 있을 때만, 후보석은 언제든)")); }
  if(w.log.length){ const lg=el("ul","swaplog"); w.log.forEach(x=>lg.appendChild(el("li",null,x))); tr.appendChild(lg); }
  body.appendChild(tr);
  /* 3) 감독 */
  const mg=el("div","w-sec"); mg.appendChild(el("h3",null,"감독"));
  if(w.mgrOffer){
    const ul=el("ul","offers mlist");
    w.mgrOffer.forEach(m=>{ const li=el("li","moffer"); li.appendChild(mgrCard(m,()=>{ S.mgr=m; w.mgrChanged=true; w.mgrOffer=null; renderPitch(); renderWinter(); })); ul.appendChild(li); });
    mg.appendChild(ul);
    const keep=el("button","btn ghost","현 감독 유지"); keep.type="button"; keep.onclick=()=>{ w.mgrOffer=null; w.mgrChanged=true; renderWinter(); }; mg.appendChild(keep);
  } else {
    mg.appendChild(el("p","hint","현재 감독: "+S.mgr.name+(w.mgrChanged?" (이번 겨울 결정 완료)":"")));
    const chg=el("button","btn ghost","감독 교체 후보 보기"); chg.type="button"; chg.disabled=w.mgrChanged;
    chg.onclick=()=>{ w.mgrOffer=shuffle(MGRS.filter(m=>m!==S.mgr)).slice(0,CFG.MGR_CANDS); renderWinter(); };
    mg.appendChild(chg);
  }
  body.appendChild(mg);
  /* 4) 시작 */
  const go=el("div","w-sec"); const st=el("button","btn go big","시즌 "+(S.career.no+1)+" 시작 →"); st.type="button"; st.onclick=startNextSeason;
  go.appendChild(st); body.appendChild(go);
}
function winterPick(t){ const w=S.winter; if(!w||!w.cand) return; w.target=t; renderPitch(); renderWinter(); }
function confirmSwap(){
  const w=S.winter, t=w.target; if(!w||!w.cand||!t) return;
  const out = t.xi!=null ? S.xi[t.xi] : S.bench[t.bench];
  const inn = clone(w.cand); inn.delta=0;
  if(t.xi!=null) S.xi[t.xi]=inn; else S.bench[t.bench]=inn;
  w.log.push(out.name+" → "+inn.name); w.moves--; w.cand=null; w.target=null; w.offer=null;
  renderPitch(); renderWinter();
}
function startNextSeason(){
  const c=S.career; c.moves=S.winter?S.winter.log.length:0; c.no++; c.year++;
  S.winter=null; S.phase="results"; S.done=false;
  /* 지난 시즌 변화 표시 제거 */
  S.xi.concat(S.bench).filter(Boolean).forEach(p=>{ p.delta=0; });
  $("deskWinter").hidden=true; $("deskDraft").hidden=false;
  setReel("SEASON "+c.no,"시즌 진행 중",(c.div===1?"K리그1":"K리그2")+" · FA컵"+(c.aclQ?" · ACL":""));
  runSeason();
}

/* ================= 결과 화면 ================= */
const hue=s=>{ let h=0; for(const ch of s) h=(h*31+ch.charCodeAt(0))%360; return h; };
function crestFile(name){ return window.KL_CRESTS_ON && window.KL_CRESTS && window.KL_CRESTS[name] ? "img/crests/"+window.KL_CRESTS[name] : null; }
function crest(name,size){
  const c=el("span","crest",name.replace(/[^\p{L}\p{N}]/gu,"").slice(0,2)); c.style.setProperty("--h",hue(name)); if(size) c.style.setProperty("--s",size+"px");
  const f=crestFile(name);
  if(f){ const img=new Image(); img.alt=""; img.onload=()=>{ c.textContent=""; c.classList.add("img"); c.appendChild(img); }; img.src=f; }
  return c;
}
function verdict(R){
  const m=R.me; const hd=R.diff==="hard"?" (어려움)":""; const P=R.promo.status;
  if(R.trophies.length===3) return ["트레블 달성"+hd,"리그, FA컵, ACL을 모두 들어 올렸어요."];
  if(R.div===2){
    if(P==="promoted") return ["K리그2 우승, 1부 승격"+hd,"K리그1 직행! 다음 시즌은 1부에서 뛰어요."];
    if(P==="po_promoted") return [R.rank+"위, 승강PO 승리 · 승격"+hd,"플레이오프를 이기고 1부로 올라가요."];
    if(P==="po_failed") return [R.rank+"위, 승격 실패"+hd,"승강 플레이오프에서 졌어요. 다음 시즌 다시 도전해요."];
    return [R.rank+"위, K리그2 잔류"+hd,"우승해서 1부로 올라가 보세요."];
  }
  if(P==="relegated") return [R.rank+"위, K리그2 강등"+hd,R.promo.text+". 다음 시즌은 K리그2에서 시작해요."];
  if(m.w===38) return ["38전 38승. 전설이 됐어요."+hd,"K리그 역사에 없는 완벽한 시즌이에요."];
  if(m.l===0 && R.rank===1) return ["무패 우승"+hd,"리그를 한 번도 지지 않고 정상에 올랐어요."];
  if(R.rank===1 && R.fa.champion) return ["더블 우승"+hd,"리그와 FA컵을 모두 차지했어요."];
  if(R.rank===1) return ["리그 우승"+hd,"승점 "+m.pts+"점으로 정상에 올랐어요."];
  if(R.acl.champion) return ["아시아 정상"+hd,"리그는 "+R.rank+"위지만 ACL을 제패했어요."];
  if(R.fa.champion) return ["FA컵 우승"+hd,"리그는 "+R.rank+"위로 마쳤어요."];
  if(R.rank<=3) return [R.rank+"위, 아시아 무대 진출"+hd,"우승까지 승점 "+(R.table[0].pts-m.pts)+"점이 모자랐어요."];
  if(R.rank<=6) return [R.rank+"위, 파이널A 마감"+hd,"상위 스플릿에는 들었지만 우승 경쟁에서는 밀렸어요."];
  if(R.rank<=9) return [R.rank+"위, 중위권 마감"+hd,"레전드라고 해서 쉬운 리그는 아니에요."];
  if(P==="po_stay") return [R.rank+"위, 승강PO 끝에 잔류"+hd,"플레이오프에서 이겨 1부에 남았어요."];
  return [R.rank+"위, 강등권 위기"+hd,"포지션 밸런스와 후보 로테이션을 다시 점검해 보세요."];
}
function showResults(R){
  S.done=true; renderAll();
  $("hint").textContent="시즌이 끝났어요. '겨울 이적시장'에서 선수단을 손보고 다음 시즌에 도전하세요.";
  const box=$("results"); box.hidden=false; box.innerHTML="";
  const [v1,v2]=verdict(R);
  const hero=el("section","panel hero");
  const hl=el("div","hero-l");
  hl.append(el("div","label","SEASON "+R.seasonNo+" · "+R.year+" · "+R.leagueName+" · 상대 "+(R.diff==="hard"?"어려움":"쉬움")+" · 내 능력치 "+(S.rm==="prime"?"프라임":"시즌")), el("h2","verdict",v1), el("p","vsub",v2));
  const tro=el("div","trophies");
  [[R.leagueName,R.rank===1],["FA컵",R.fa.champion],["ACL",R.acl.champion]].forEach(([n,w])=>{ const t=el("div","trophy"+(w?" won":"")); t.append(el("span","tr-i",w?"🏆":"·"), el("span","tr-n",n)); tro.appendChild(t); });
  hero.append(hl,tro); box.appendChild(hero);
  const tabs=el("div","tabs"); const pane=el("div","tabpane");
  const defs=[["sum","요약"],["fx","경기"],["tbl","순위"],["awd","시상식"],["plr","선수단"]];
  const paint=id=>{ [...tabs.children].forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.id===id)));
    pane.innerHTML=""; pane.appendChild(({sum:paneSum,fx:paneFx,tbl:paneTbl,awd:paneAwd,plr:panePlr})[id](R)); };
  defs.forEach(([id,t])=>{ const b=el("button",null,t); b.type="button"; b.dataset.id=id; b.onclick=()=>paint(id); tabs.appendChild(b); });
  box.append(tabs,pane); paint("sum");
  renderCareer(); renderAch();
  box.scrollIntoView({behavior:reduce?"auto":"smooth",block:"start"});
}

function stat(v,k){ const s=el("div","stat"); s.append(el("div","v",v), el("div","k",k)); return s; }
function paneSum(R){
  const wrap=el("div","pane-sum"); const m=R.me;
  const board=el("div","board");
  [[m.w+"승 "+m.d+"무 "+m.l+"패","리그 전적"],[m.pts+"점","승점"],[R.rank+"위","순위"],[m.gf+" : "+m.ga,"득실"],[R.rate.att.toFixed(1)+" / "+R.rate.def.toFixed(1),"공격 / 수비"]].forEach(([v,k])=>board.appendChild(stat(v,k)));
  wrap.appendChild(board);
  /* 대회별 */
  const comps=el("div","comps");
  const lg=el("div","comp"); lg.append(el("h4",null,R.leagueName), el("p",null,R.rank+"위 / "+R.N+"팀"+(m.grp?" · 파이널"+m.grp:"")+" · 승점 "+m.pts));
  if(R.promo.text) lg.appendChild(el("p","promo "+R.promo.status,R.promo.text));
  comps.appendChild(lg);
  const fa=el("div","comp"); fa.appendChild(el("h4",null,"FA컵"));
  const fl=el("div","stages"); R.fa.stages.forEach(e=>fl.appendChild(el("span","stg "+(e.advance?"ok":"no"),e.stage+" "+e.f+":"+e.a+(e.pk?" (PK "+e.pk[0]+"-"+e.pk[1]+")":"")+" "+e.opp.name)));
  fa.appendChild(fl); fa.appendChild(el("p",null,R.fa.champion?"우승":R.fa.exit)); comps.appendChild(fa);
  const ac=el("div","comp"); ac.appendChild(el("h4",null,"ACL"));
  if(!R.acl.qualified) ac.appendChild(el("p","muted","이번 시즌은 진출하지 못했어요. (전 시즌 리그 "+CFG.ACL_QUAL_RANK+"위 이내 또는 FA컵 우승 시 다음 시즌 진출)"));
  else {
    if(R.acl.group){ const gt=el("div","gtab"); R.acl.group.forEach((t,i)=>gt.appendChild(el("span","g"+(t.me?" me":""),(i+1)+". "+t.name+" "+t.pts+"점"))); ac.appendChild(gt); }
    const kl=el("div","stages"); R.acl.ko.forEach(e=>kl.appendChild(el("span","stg "+(e.res==="W"?"ok":e.res==="D"?"dr":"no"),e.stage+" "+e.f+":"+e.a+(e.pk?" (PK "+e.pk[0]+"-"+e.pk[1]+")":"")+" "+e.opp.name)));
    ac.appendChild(kl); ac.appendChild(el("p",null,R.acl.champion?"우승":(R.acl.exit||"")));
  }
  comps.appendChild(ac); wrap.appendChild(comps);
  const form=el("div","form"); R.log.filter(e=>e.comp==="리그").forEach(g=>{ const i=el("i",g.res); i.title=g.round+"R "+g.f+":"+g.a; form.appendChild(i); });
  wrap.appendChild(form);
  wrap.appendChild(el("p","hint","체력 교체 "+R.rotations+"회 · 경고 "+R.cards.y+"장 · 퇴장 "+R.cards.r+"명 · 징계 결장 "+R.cards.missed+"경기 · 부상 "+R.inj.n+"명 (결장 "+R.inj.missed+"경기)"));
  if(R.newAch && R.newAch.length){
    const na=el("div","newach"); na.appendChild(el("h4",null,"새 업적 달성"));
    R.newAch.forEach(d=>{ const b=el("span","badge "+d.tier); b.append(el("i",null,d.icon), el("b",null,d.name), el("small",null,d.desc)); na.appendChild(b); });
    wrap.appendChild(na);
  }
  const row=el("div","btnrow"); row.style.marginTop="14px";
  const nxt=el("button","btn go","겨울 이적시장 →"); nxt.type="button"; nxt.disabled=S.phase==="winter"; nxt.onclick=enterWinter;
  const again=el("button","btn ghost","새 게임 (다시 드래프트)"); again.type="button"; again.onclick=()=>{ if(confirm("커리어가 초기화돼요. 새로 드래프트할까요?")) resetGame(); };
  const rs=el("button","btn ghost","이번 시즌 다시 시뮬"); rs.type="button"; rs.onclick=resim;
  row.append(nxt,rs,again); wrap.appendChild(row);
  wrap.appendChild(shareBlock(R));
  return wrap;
}
const COMP_CLS={"리그":"lg","FA컵":"fa","ACL":"acl","승강PO":"po"};
function paneFx(R){
  const wrap=el("div","pane-fx"); const chips=el("div","seg"); const ul=el("ul","matches");
  let cur="전체";
  const paint=()=>{ ul.innerHTML=""; [...chips.children].forEach(b=>b.setAttribute("aria-pressed",String(b.textContent===cur)));
    R.log.filter(g=>cur==="전체"||g.comp===cur).forEach(g=>{
      const li=el("li","m"); li.append(el("span","r",g.comp==="리그"?g.round+"R":"#"+g.n), el("span","cp "+COMP_CLS[g.comp],g.comp==="승강PO"?"PO":g.comp),
        el("span","ha",g.home===true?"홈":g.home===false?"원정":"중립"));
      const o=el("span","o",g.opp.name+" · "+(g.comp==="리그"?(g.stage==="정규"?"정규":g.stage):g.stage)+(g.rot?" · 교체 "+g.rot:""));
      const sc=[g.ms.length?g.ms.join(", "):"", g.os.length?(g.os.every(x=>x==="상대 선수")?"상대 "+g.os.length+"골":"상대 "+g.os.join(", ")):""].filter(Boolean).join(" · ");
      o.appendChild(el("span",null,sc||"득점 없음"));
      const cd=[g.ys.length?"경고 "+g.ys.join(", "):"", g.rs.length?"퇴장 "+g.rs.join(", "):"", g.outS.length?"징계결장 "+g.outS.join(", "):"", g.outI.length?"부상결장 "+g.outI.join(", "):"", g.hurt.length?"부상 "+g.hurt.join(", "):""].filter(Boolean).join(" · ");
      if(cd) o.appendChild(el("span","cdl",cd));
      li.appendChild(o);
      li.appendChild(el("span","sc "+g.res,g.f+" : "+g.a+(g.pk?" ("+g.pk[0]+"-"+g.pk[1]+")":"")));
      ul.appendChild(li); }); };
  ["전체","리그","FA컵","ACL","승강PO"].forEach(n=>{ if(n==="ACL"&&!R.acl.qualified) return; if(n==="승강PO"&&!R.log.some(e=>e.comp==="승강PO")) return; const b=el("button",null,n); b.type="button"; b.onclick=()=>{ cur=n; paint(); }; chips.appendChild(b); });
  wrap.append(chips,ul); paint(); return wrap;
}
function paneTbl(R){
  const wrap=el("div","pane-tbl");
  const tb=el("table","tbl"); tb.innerHTML="<thead><tr><th>#</th><th class='t'>팀</th><th>승</th><th>무</th><th>패</th><th>득실</th><th>승점</th></tr></thead>";
  const body=el("tbody");
  const zone=i=>R.div===1 ? (i===R.N-1?" down":i===R.N-2?" po":(i===5?" cut":"")) : (i===0?" up":i===1?" po":"");
  R.table.forEach((t,i)=>{ const tr=el("tr",(t.me?"me":"link")+zone(i));
    if(!t.me){ const d=R.div; let li=oppList(d).findIndex(x=>x.club===t.name), dd=d; if(li<0){ dd=d===1?2:1; li=oppList(dd).findIndex(x=>x.club===t.name); }
      tr.title="눌러서 스쿼드 보기"; tr.onclick=()=>{ renderOpp(li,dd); $("oppWrap").scrollIntoView({behavior:reduce?"auto":"smooth",block:"start"}); }; }
    const nm=el("td","t"); nm.append(crest(t.name,22), document.createTextNode(" "+t.name+(t.grp?" ("+t.grp+")":"")));
    tr.append(el("td","num",String(i+1)), nm, el("td","num",String(t.w)), el("td","num",String(t.d)), el("td","num",String(t.l)), el("td","num",(t.gf-t.ga>0?"+":"")+(t.gf-t.ga)), el("td","num pts",String(t.pts)));
    body.appendChild(tr); });
  tb.appendChild(body); const tw=el("div","tablewrap"); tw.appendChild(tb); wrap.appendChild(tw);
  wrap.appendChild(el("p","hint", R.div===1
    ? "팀 이름을 누르면 스쿼드를 볼 수 있어요. 33라운드 후 상위 6팀은 파이널A, 하위 6팀은 파이널B로 갈라 5라운드를 더 치러요. 12위는 K리그2로 강등, 11위는 K리그2 2위와 승강 플레이오프를 해요."
    : "팀 이름을 누르면 스쿼드를 볼 수 있어요. 17팀이 2번씩(32경기) 겨루고, 1위는 K리그1 직행, 2위는 K리그1 11위와 승강 플레이오프를 해요."));
  if(R.derbies.length){ const d=el("div","derbies"); d.appendChild(el("h4",null,"더비 결과 (상대팀끼리)")); R.derbies.forEach(x=>d.appendChild(el("p",null,x.name+" · "+x.home+" "+x.hg+" : "+x.ag+" "+x.away))); wrap.appendChild(d); }
  return wrap;
}
function awardCard(title,x,line){
  const a=el("div","award"); a.appendChild(el("div","aw-t",title));
  if(!x){ a.appendChild(el("p","muted","해당 없음")); return a; }
  a.appendChild(cardEl({name:x.name,pos:x.pos,ovr:x.ovr},{blind:false,sub:x.short||x.team,cls:x.mine?"mine":""}));
  a.appendChild(el("div","aw-l",line)); return a;
}
function paneAwd(R){
  const A=R.awards, wrap=el("div","pane-awd");
  wrap.appendChild(el("h4","sec","리그 시상"));
  const row=el("div","awards");
  row.appendChild(awardCard("리그 MVP",A.mvp, A.mvp?A.mvp.g+"골 "+A.mvp.a+"도움":""));
  row.appendChild(awardCard("득점왕",A.scorer, A.scorer?A.scorer.g+"골":""));
  row.appendChild(awardCard("도움왕",A.assister, A.assister?A.assister.a+"도움":""));
  const co=el("div","award"); co.appendChild(el("div","aw-t","올해의 감독")); co.appendChild(el("div","aw-coach",A.coach.name)); co.appendChild(el("div","aw-l",A.coach.team+(A.coach.mine?" · 우리 팀":""))); row.appendChild(co);
  wrap.appendChild(row);
  wrap.appendChild(el("h4","sec","베스트 11"));
  const pit=el("div","pitch mini"); const f=FORMS["4-3-3"];
  const by={GK:[],DF:[],MF:[],FW:[]}; A.bestXI.forEach(x=>by[x.pos].push(x));
  const order={DF:["LB","CB","CB","RB"],MF:["CM","CM","CM"],FW:["LW","ST","RW"]};
  const take={GK:0,DF:0,MF:0,FW:0};
  f.forEach(s=>{ const g=GROUP[s[0]]; const x=by[g][take[g]++]; if(!x) return;
    const b=el("div","slot"); b.style.left=s[1]+"%"; b.style.top=s[2]+"%"; b.appendChild(cardEl({name:x.name,pos:x.pos,ovr:x.ovr},{blind:false,pos:s[0],sub:x.short||x.team,cls:x.mine?"mine":""})); pit.appendChild(b); });
  wrap.appendChild(pit);
  wrap.appendChild(el("h4","sec","득점 순위"));
  const tb=el("table","tbl"); tb.innerHTML="<thead><tr><th>#</th><th class='t'>선수</th><th class='t'>팀</th><th>골</th><th>도움</th></tr></thead>";
  const body=el("tbody"); A.topScorers.forEach((x,i)=>{ const tr=el("tr",x.mine?"me":null); tr.append(el("td","num",String(i+1)),el("td","t",x.name),el("td","t",x.short||x.team),el("td","num pts",String(x.g)),el("td","num",String(x.a))); body.appendChild(tr); });
  tb.appendChild(body); const tw=el("div","tablewrap"); tw.appendChild(tb); wrap.appendChild(tw);
  const M=R.mine;
  wrap.appendChild(el("h4","sec","우리 팀 시즌 시상 (전 대회)"));
  const mine=el("div","awards");
  const mk=(t,o,l)=>{ const a=el("div","award"); a.appendChild(el("div","aw-t",t)); if(o) { a.appendChild(cardEl(o.p,{blind:false,sub:o.p.name===""?"":"",cls:"mine"})); a.appendChild(el("div","aw-l",l(o))); } return a; };
  mine.append(mk("팀 MVP",M.mvp,o=>o.g+"골 "+o.a+"도움 · "+o.apps+"경기"), mk("팀 득점왕",M.scorer,o=>o.g+"골"), mk("팀 도움왕",M.assister,o=>o.a+"도움"), mk("철인",M.ironman,o=>o.apps+"경기 출전"));
  wrap.appendChild(mine);
  return wrap;
}
function panePlr(R){
  const wrap=el("div","pane-plr");
  const tb=el("table","tbl"); tb.innerHTML="<thead><tr><th class='t'>선수</th><th>능력치</th><th>경기</th><th>골</th><th>도움</th><th>경고</th><th>퇴장</th><th>결장</th><th>부상</th><th class='t'>체력</th></tr></thead>";
  const body=el("tbody");
  R.stam.forEach(o=>{ const tr=el("tr"); const nm=el("td","t"); nm.append(el("span","pos "+o.p.pos,o.p.pos), document.createTextNode(" "+o.p.name+(o.starter?"":" (후보)")));
    const bar=el("td","t"); const sb=el("span","sbar"); const fl=el("i"); fl.style.width=Math.round(o.st)+"%"; fl.className=o.st<CFG.STAM_ROTATE?"low":""; sb.appendChild(fl); bar.appendChild(sb);
    tr.append(nm, el("td","num",String(o.p.ovr)), el("td","num",String(o.apps)), el("td","num",String(o.g)), el("td","num",String(o.a)), el("td","num",String(o.y)), el("td","num",String(o.r)), el("td","num",String(o.missed)), el("td","num",o.injN?o.injN+"회/"+o.injOut+"경기":"-"), bar);
    body.appendChild(tr); });
  tb.appendChild(body); const tw=el("div","tablewrap"); tw.appendChild(tb); wrap.appendChild(tw);
  wrap.appendChild(el("p","hint","결장 = 카드 징계로 못 뛴 경기, 부상 = 부상 횟수/결장 경기. 체력이 60 아래로 떨어지면 빨간색이에요."));
  return wrap;
}

/* ================= 커리어 · 업적 ================= */
function renderCareer(){
  const c=S.career, w=$("careerWrap");
  w.hidden = c.history.length===0;
  if(w.hidden) return;
  $("careerLabel").textContent="K리그1 "+c.trophies.league+" · K리그2 "+c.trophies.k2+" · FA컵 "+c.trophies.fa+" · ACL "+c.trophies.acl;
  const box=$("career"); box.innerHTML="";
  const tb=el("table","tbl"); tb.innerHTML="<thead><tr><th>시즌</th><th class='t'>리그</th><th>순위</th><th>승점</th><th>전적</th><th class='t'>FA컵</th><th class='t'>ACL</th><th class='t'>승강</th></tr></thead>";
  const body=el("tbody"); c.history.forEach(h=>{ const tr=el("tr"); tr.append(el("td","num",h.no+" ("+h.year+")"),el("td","t",h.div===2?"K리그2":"K리그1"),el("td","num"+(h.rank===1?" pts":""),h.rank+"위"),el("td","num",String(h.pts)),el("td","num",h.w+"-"+h.d+"-"+h.l),el("td","t",h.fa),el("td","t",h.acl),el("td","t",h.promo||"-")); body.appendChild(tr); });
  tb.appendChild(body); const tw=el("div","tablewrap"); tw.appendChild(tb); box.appendChild(tw);
}
function renderAch(){
  const A=window.KLAch; if(!A) return;
  const have=A.unlocked(); const g=$("achGrid"); g.innerHTML="";
  let n=0;
  A.DEFS.forEach(d=>{ const on=!!have[d.id]; if(on) n++;
    const b=el("div","badge "+d.tier+(on?"":" locked")); b.append(el("i",null,on?d.icon:"🔒"), el("b",null,on?d.name:"???"), el("small",null,on?d.desc:d.desc.replace(/[^\s]/g,"·").slice(0,18)));
    b.title=on?d.desc:"아직 달성하지 못했어요"; g.appendChild(b); });
  $("achCount").textContent=n+" / "+A.DEFS.length;
}

/* ================= 공유 (이미지 · 텍스트 · DB) ================= */
function shareBlock(R){
  const sh=el("div","share"); sh.appendChild(el("h4","sec","결과 공유"));
  sh.appendChild(el("p","hint","이미지를 길게 누르거나 우클릭해서 저장한 뒤 단톡방에 올리세요."));
  const row=el("div","btnrow");
  const cb=el("button","btn ghost","결과 텍스트 복사"); cb.type="button"; cb.onclick=()=>copyText(R,cb); row.appendChild(cb);
  if(window.KLShare && KLShare.enabled){ const ub=el("button","btn primary","친구들 기록에 올리기"); ub.type="button"; ub.onclick=()=>uploadResult(R,ub); row.appendChild(ub); }
  sh.appendChild(row);
  const img=el("img"); img.alt="시즌 결과 카드"; sh.appendChild(img);
  drawCard(R).then(url=>{ img.src=url; });
  return sh;
}
function teamSnapshot(){
  const pk=p=>[p.name,K.squadKey(SQUADS[p.sq])];
  return {f:S.form,d:S.career.div,m:S.mgr?S.mgr.name:null,rm:S.rm,xi:S.xi.map(pk),b:S.bench.filter(Boolean).map(pk)};
}
async function uploadResult(R,btn){
  const nick=$("nick").value.trim();
  if(!nick){ btn.textContent="닉네임을 먼저 입력하세요"; $("nick").focus(); setTimeout(()=>btn.textContent="친구들 기록에 올리기",2200); return; }
  store.set("kl38-nick",nick);
  const m=R.me; btn.disabled=true; btn.textContent="올리는 중…";
  try{
    await KLShare.save({nickname:nick, team_name:$("teamName").value.trim()||"레전드 FC", form:S.form, mode:S.mode, diff:S.diff, manager:S.mgr?S.mgr.name:null,
      w:m.w,d:m.d,l:m.l,pts:m.pts,gf:m.gf,ga:m.ga,rank:R.rank, xi:S.xi.map(p=>p.name), season:R.seasonNo, team:teamSnapshot()});
    btn.textContent="올렸어요"; KLShare.refresh();
  }catch(e){ btn.disabled=false; btn.textContent="실패, 다시 시도"; }
}
function summaryText(R){
  const m=R.me, top=Object.entries(R.goals).sort((a,b)=>b[1]-a[1])[0];
  return "K-레전드 38 시즌 "+R.seasonNo+" ("+R.year+" · "+(R.diff==="hard"?"어려움":"쉬움")+")\n"+m.name+" ("+S.form+(S.mgr?", 감독 "+S.mgr.name:"")+(S.mode==="pos"?", 연도+포지션":"")+")\n"+
    R.leagueName+" "+m.w+"승 "+m.d+"무 "+m.l+"패 · 승점 "+m.pts+" · "+R.rank+"위"+(R.promo.text?" ("+R.promo.text+")":"")+(R.trophies.length?"\n🏆 "+R.trophies.join(" · "):"")+
    (top?"\n팀 득점 1위: "+top[0]+" "+top[1]+"골":"")+"\n베스트 11: "+S.xi.map(p=>p.name).join(", ")+"\n후보: "+(S.bench.filter(Boolean).map(p=>p.name).join(", ")||"없음");
}
function copyText(R,btn){
  const t=summaryText(R);
  const ok=()=>{btn.textContent="복사했어요";setTimeout(()=>btn.textContent="결과 텍스트 복사",1600);};
  try{ navigator.clipboard.writeText(t).then(ok).catch(()=>fallback()); }catch(e){ fallback(); }
  function fallback(){ const ta=document.createElement("textarea"); ta.value=t; ta.style.width="100%"; ta.rows=6; btn.after(ta); ta.select(); btn.textContent="아래 텍스트를 복사하세요"; }
}
const TCOL={bronze:["#d9a066","#8a5a2b"],silver:["#f1f4f8","#7d8896"],gold:["#fff0a8","#a97a1b"],elite:["#2c3a7a","#0a1030"],icon:["#fff7d1","#e7c25a"]};
async function drawCard(R){
  try{ await Promise.all([document.fonts.load("40px 'Black Han Sans'"),document.fonts.load("700 20px 'Noto Sans KR'"),document.fonts.load("700 20px 'Oswald'")]); }catch(e){}
  const W=1080,H=1350,c=document.createElement("canvas"); c.width=W; c.height=H; const x=c.getContext("2d");
  const bg=x.createLinearGradient(0,0,0,H); bg.addColorStop(0,"#0b1430"); bg.addColorStop(1,"#05070f"); x.fillStyle=bg; x.fillRect(0,0,W,H);
  x.fillStyle="#19f2a3"; x.fillRect(0,0,W,8);
  x.fillStyle="#19f2a3"; x.font="64px 'Black Han Sans', sans-serif"; x.fillText("K-LEGEND 38",64,112);
  x.fillStyle="#eaf0ff"; x.font="700 34px 'Noto Sans KR', sans-serif"; x.fillText(R.me.name+"  ·  "+S.form+(S.mode==="pos"?"  ·  연도+포지션":""),64,165);
  x.fillStyle="#8d9bc4"; x.font="700 28px 'Noto Sans KR', sans-serif";
  x.fillText((S.mgr?"감독 "+S.mgr.name+" ("+STYLE_NAME[S.mgr.style]+")  ·  ":"")+"시즌 "+R.seasonNo+" · "+(R.diff==="hard"?"어려움":"쉬움"),64,212);
  const m=R.me;
  x.font="700 92px 'Oswald', 'Black Han Sans', sans-serif"; x.fillStyle="#fff"; x.fillText(m.w+"W "+m.d+"D "+m.l+"L",64,300);
  x.font="600 34px 'Oswald', sans-serif"; x.fillStyle="#ffcf4a";
  x.fillText("PTS "+m.pts+"   RANK "+R.rank+"/"+R.N+"   GD "+m.gf+":"+m.ga+(R.trophies.length?"   🏆 "+R.trophies.join(" · "):""),64,352);
  const px=64,py=390,pw=W-128,ph=760;
  const pg=x.createLinearGradient(0,py,0,py+ph); pg.addColorStop(0,"#16794e"); pg.addColorStop(1,"#0f5a39"); x.fillStyle=pg; x.fillRect(px,py,pw,ph);
  for(let i=0;i<8;i+=2){ x.fillStyle="rgba(0,0,0,.08)"; x.fillRect(px,py+i*ph/8,pw,ph/8); }
  x.strokeStyle="rgba(255,255,255,.5)"; x.lineWidth=3; x.strokeRect(px+12,py+12,pw-24,ph-24);
  x.beginPath(); x.moveTo(px+12,py+ph/2); x.lineTo(px+pw-12,py+ph/2); x.stroke();
  x.beginPath(); x.arc(px+pw/2,py+ph/2,80,0,Math.PI*2); x.stroke();
  FORMS[S.form].forEach((s,i)=>{ const p=S.xi[i]; const cx=px+pw*s[1]/100, cy=py+ph*s[2]/100; const w=96,h=134;
    const [c1,c2]=TCOL[K.tier(p.ovr)]; const g=x.createLinearGradient(cx-w/2,cy-h/2,cx+w/2,cy+h/2); g.addColorStop(0,c1); g.addColorStop(1,c2);
    x.save(); x.beginPath(); x.moveTo(cx-w/2,cy-h/2+10); x.lineTo(cx,cy-h/2); x.lineTo(cx+w/2,cy-h/2+10); x.lineTo(cx+w/2,cy+h/2-18); x.lineTo(cx,cy+h/2); x.lineTo(cx-w/2,cy+h/2-18); x.closePath();
    x.fillStyle=g; x.fill(); x.lineWidth=2; x.strokeStyle="rgba(255,255,255,.7)"; x.stroke(); x.restore();
    const ink=(K.tier(p.ovr)==="elite")?"#ffe08a":"#1b1b1b";
    x.fillStyle=ink; x.textAlign="center"; x.font="700 34px 'Oswald', sans-serif"; x.fillText(String(p.ovr),cx-18,cy-h/2+42);
    x.font="600 15px 'Oswald', sans-serif"; x.fillText(s[0],cx-18,cy-h/2+60);
    x.font="700 18px 'Noto Sans KR', sans-serif"; x.fillText(p.name,cx,cy+h/2-34);
    x.font="500 12px 'Oswald', sans-serif"; x.fillText(tag(SQUADS[p.sq]),cx,cy+h/2-18);
    x.textAlign="left"; });
  const bn=S.bench.filter(Boolean).map(p=>p.name).join(", ");
  x.fillStyle="#8d9bc4"; x.font="500 22px 'Noto Sans KR', sans-serif"; x.fillText("후보  "+(bn||"없음"),64,1186);
  const top=Object.entries(R.goals).sort((a,b)=>b[1]-a[1])[0];
  x.fillStyle="#eaf0ff"; x.font="700 30px 'Noto Sans KR', sans-serif";
  if(top) x.fillText("팀 득점 1위  "+top[0]+" "+top[1]+"골",64,1232);
  x.fillStyle="#8d9bc4"; x.font="500 22px 'Noto Sans KR', sans-serif"; x.fillText(verdict(R)[0],64,1274);
  x.fillText("비공식 팬 제작 게임",64,1312);
  return c.toDataURL("image/png");
}

/* ================= 공개 API (친구 맞대결 등) ================= */
function snapshotNow(){ return teamSnapshot(); }

/* ================= 전체 렌더 · 시작 ================= */
function renderAll(){ renderModes(); renderRatings(); renderForms(); renderDiffs(); renderPitch(); renderOffers(); renderBest(); renderAch(); renderCareer(); }

$("spinBtn").onclick=()=>spin(false);
$("respinBtn").onclick=()=>spin(true);
$("mgrBtn").onclick=drawMgr;
$("benchBtn").onclick=startBench;
$("simBtn").onclick=()=>{ if(S.done){ enterWinter(); } else if(ready()){ runSeason(); } };
$("hard").onchange=()=>{ renderOffers(); renderPitch(); };

newState(); { const n=store.get("kl38-nick"); if(n) $("nick").value=n; }
idleReel(); $("hint").textContent=idleHint();
renderAll(); renderOpp(null);
window.__KL38 = {K, S:()=>S, snapshot:snapshotNow, runSeason, enterWinter};
window.KLGame = {state:()=>S, snapshot:snapshotNow, cardEl, el, crest, renderAch};
})();

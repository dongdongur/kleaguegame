/* K-레전드 38 게임 로직: 스핀, 드래프트(선발 11 + 후보 5), 감독, 체력, 2026 K리그1 시즌 시뮬레이션, 결과 화면 */
(function(){
"use strict";

/* ===== 밸런스 설정: 여기 숫자만 바꿔도 난이도가 바뀌어요 ===== */
const CONFIG = {
  RESPINS: 2,          // 게임당 다시 스핀 횟수
  GOAL_BASE: 1.3,      // 실력이 같을 때 한 팀의 평균 득점
  SPREAD: 15,          // 작을수록 실력 차이가 결과에 크게 반영됨
  HOME_ADV: 0.6,       // 홈 어드밴티지 (능력치 점수)
  CHEM_PER_PAIR: 0.4,  // 같은 팀(시즌) 출신 2명당 케미 보너스
  NAT_PER_PAIR: 0.25,  // 같은 시기 국가대표 2명당 케미 보너스
  CHEM_MAX: 2.5,       // 케미 보너스 상한
  OUT_OF_POS: 2,       // 주 포지션이 아닌 자리에 세웠을 때 능력치 감점
  POS_CANDS: 5,        // 포지션 스핀에서 보여줄 후보 선수 수
  MGR_CANDS: 3,        // 감독 뽑기에서 보여줄 후보 감독 수
  MGR_PER_OVR: 0.12,   // 감독 능력치 1당 공격·수비 보정 (80이 기준)
  MGR_STYLE: 0.6,      // 공격형/수비형 감독의 공격↔수비 보정
  MGR_FORM: 0.5,       // 선호 포메이션과 맞을 때 공격·수비 보너스
  BENCH: 5,            // 후보 선수 수 (포메이션과 상관없이 아무 포지션이나 가능)
  /* 체력: 경기마다 뛴 선수는 닳고 쉰 선수는 회복해요. 임계값 아래로 떨어진 선발은 같은 자리를 설 수 있는 후보와 교체돼요. */
  STAM_COST: {GK:3, DF:7, MF:8, FW:7},  // 경기당 체력 소모
  STAM_PLAY_REC: 2,    // 뛴 경기에서도 돌아오는 체력
  STAM_REST: 14,       // 쉬는 경기에서 회복하는 체력
  STAM_ROTATE: 60,     // 이 아래면 후보와 교체
  STAM_MIN: 20,        // 체력 하한
  FATIGUE_FROM: 70,    // 이 아래부터 능력치가 깎여요
  FATIGUE_PER: 0.1,    // 체력 1이 모자랄 때마다 깎이는 능력치
  /* 상대팀(2026 K리그1) */
  HARD_FILL: 9,        // 어려움: 목록에 없는 나머지 선수 기본 능력치 가산
  PRIME_DEFAULT: 7     // 프라임 능력치가 비어 있을 때 올해 능력치에 더하는 값
};
const MGRS = (window.KL_MANAGERS||[]).map((m,i)=>({id:i,name:m[0],note:m[1],ovr:m[2],style:m[3],form:m[4],org:m[5]}));
const GCOL = {GK:"#B7791F",DF:"#2B6CB0",MF:"#2F855A",FW:"#C2412D"};
const STYLE_NAME = {A:"공격형",D:"수비형",B:"균형형"};
const MODES = {team:"팀 스핀", pos:"포지션 스핀"};
const DIFFS = {easy:"쉬움 · 2026 현재 능력치", hard:"어려움 · 전성기 능력치"};
const RAW = window.KL_DATA;

/* "2014–15" -> [2014,2015], "2002 월드컵" -> [2002,2002] */
function yearsOf(era){
  const m=String(era).match(/(\d{4})(?:[–-](\d{2,4}))?/); if(!m) return [0,0];
  const a=+m[1]; let b=a; if(m[2]) b = m[2].length===2 ? +(String(a).slice(0,2)+m[2]) : +m[2];
  return [a,b];
}
const overlap=(x,y,tol)=>x[0]-tol<=y[1] && y[0]-tol<=x[1];
const SQUADS = RAW.map((r,i)=>({id:i,club:r[0],short:r[1],era:r[2],str:r[3],
  nat:r[0]==="대한민국 대표팀", yrs:yearsOf(r[2]),
  players:r[4].map(p=>({name:p[0],pos:p[1],ovr:p[2],alt:p[3]||null,det:p[4]?p[4].split("/"):null,sq:i}))}));
const NATS = SQUADS.filter(q=>q.nat).map(q=>({id:q.id,yrs:q.yrs,names:new Set(q.players.map(p=>p.name))}));
const tag = s => s.short+" "+s.era.replace(/^20|^19/,"'").replace(/–(20|19)?/,"–");

/* 2026 K리그1 상대팀. 프라임 능력치: 직접 적은 값 > 레전드 데이터의 같은 선수 최고값 > 올해 능력치+3 */
const LEGEND_BEST = {};
SQUADS.forEach(q=>q.players.forEach(p=>{ const k=p.name+"|"+p.pos; LEGEND_BEST[k]=Math.max(LEGEND_BEST[k]||0,p.ovr); }));
const TEAMS26 = (window.KL_2026||[]).map(t=>({club:t[0],short:t[1],base:t[2],
  players:t[3].map(p=>{ const legend=LEGEND_BEST[p[0]+"|"+p[1]];
    const prime = p[4]!=null ? p[4] : (legend ? Math.max(p[2],legend) : p[2]+CONFIG.PRIME_DEFAULT);
    return {name:p[0],pos:p[1],ovr:p[2],det:p[3]||"",prime}; })}));

const FORMS = {
 "4-3-3":[["GK",50,90],["LB",14,70],["CB",37,75],["CB",63,75],["RB",86,70],["CM",28,50],["CM",50,55],["CM",72,50],["LW",17,24],["ST",50,15],["RW",83,24]],
 "4-4-2":[["GK",50,90],["LB",14,70],["CB",37,75],["CB",63,75],["RB",86,70],["LM",14,45],["CM",38,51],["CM",62,51],["RM",86,45],["ST",36,19],["ST",64,19]],
 "3-5-2":[["GK",50,90],["CB",26,74],["CB",50,77],["CB",74,74],["LWB",10,47],["CM",32,55],["AM",50,40],["CM",68,55],["RWB",90,47],["ST",36,18],["ST",64,18]],
 "4-2-3-1":[["GK",50,90],["LB",14,70],["CB",37,75],["CB",63,75],["RB",86,70],["DM",36,59],["DM",64,59],["LW",17,35],["AM",50,37],["RW",83,35],["ST",50,14]],
 "4-1-4-1":[["GK",50,90],["LB",14,72],["CB",37,76],["CB",63,76],["RB",86,72],["DM",50,60],["LM",14,42],["CM",38,47],["CM",62,47],["RM",86,42],["ST",50,15]],
 "4-4-1-1":[["GK",50,90],["LB",14,72],["CB",37,76],["CB",63,76],["RB",86,72],["LM",14,52],["CM",38,56],["CM",62,56],["RM",86,52],["AM",50,33],["ST",50,14]],
 "4-3-2-1":[["GK",50,90],["LB",14,72],["CB",37,76],["CB",63,76],["RB",86,72],["CM",28,57],["CM",50,60],["CM",72,57],["AM",33,34],["AM",67,34],["ST",50,14]],
 "4-1-2-1-2":[["GK",50,90],["LB",14,72],["CB",37,76],["CB",63,76],["RB",86,72],["DM",50,62],["CM",28,50],["CM",72,50],["AM",50,36],["ST",38,16],["ST",62,16]],
 "3-4-3":[["GK",50,90],["CB",26,75],["CB",50,77],["CB",74,75],["LWB",11,52],["CM",38,56],["CM",62,56],["RWB",89,52],["LW",18,25],["ST",50,15],["RW",82,25]],
 "3-4-2-1":[["GK",50,90],["CB",26,75],["CB",50,77],["CB",74,75],["LWB",11,52],["CM",38,57],["CM",62,57],["RWB",89,52],["AM",32,33],["AM",68,33],["ST",50,14]],
 "5-3-2":[["GK",50,90],["LWB",10,62],["CB",30,76],["CB",50,78],["CB",70,76],["RWB",90,62],["CM",28,48],["CM",50,52],["CM",72,48],["ST",38,18],["ST",62,18]],
 "5-4-1":[["GK",50,90],["LWB",10,62],["CB",30,76],["CB",50,78],["CB",70,76],["RWB",90,62],["LM",15,44],["CM",38,50],["CM",62,50],["RM",85,44],["ST",50,15]]
};
const GROUP = {GK:"GK",LB:"DF",CB:"DF",RB:"DF",CM:"MF",DM:"MF",AM:"MF",LM:"MF",RM:"MF",LWB:"MF",RWB:"MF",LW:"FW",ST:"FW",RW:"FW"};
/* 자리별로 설 수 있는 세부 포지션 (선수가 "그 시즌에 뛴" 포지션만 배치 가능) */
const ACCEPT = {GK:["GK"],LB:["LB"],RB:["RB"],CB:["CB"],LWB:["LB","LM"],RWB:["RB","RM"],DM:["DM","CM"],CM:["CM","DM","AM"],AM:["AM","CM"],
  LM:["LM","LW"],RM:["RM","RW"],LW:["LW","LM"],RW:["RW","RM"],ST:["ST"]};
function fitsSlot(p,label){
  if(p.det) return p.det.some(c=>ACCEPT[label].includes(c));
  return GROUP[label]===p.pos || GROUP[label]===p.alt;
}

const $ = id => document.getElementById(id);
const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const store = {get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
function el(tag,cls,txt){const e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e;}
function avg(a){return a.length? a.reduce((x,y)=>x+y,0)/a.length : 60;}
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

let S; // state
function newState(form,mode,diff){
  S = {form:form||"4-3-3", mode:mode||"team", diff:diff||"easy", xi:Array(11).fill(null), bench:Array(CONFIG.BENCH).fill(null),
    squad:null, selected:null, respins:CONFIG.RESPINS, spinning:false, done:false, picks:0, mgr:null, mgrOffer:null};
}
function started(){ return S.picks>0 || !!S.mgr; }
function offering(){ return !!S.squad || !!S.mgrOffer; }
const xiFull = () => S.xi.every(Boolean);
const benchOpen = () => S.bench.some(b=>!b);
const benchCount = () => S.bench.filter(Boolean).length;
function usedNames(){ return new Set(S.xi.concat(S.bench).filter(Boolean).map(x=>x.name)); }
function idleHint(){
  return S.mode==="pos"
    ? "스핀하면 채워야 할 포지션이 나와요. 그 포지션 후보 중 한 명을 고르세요."
    : "스핀하면 팀 하나가 나와요. 그 팀에서 선수 한 명을 골라 빈 자리에 넣으세요.";
}
function idleReel(){
  $("reelClub").textContent="스핀을 눌러 시작";
  $("reelEra").textContent = S.mode==="pos" ? "포지션을 뽑고 후보 중 선택" : SQUADS.length+"개 시대별 레전드 팀";
}
function hard(){ return $("hard").checked; }

/* ---------- render setup ---------- */
function renderForms(){
  const seg=$("formSeg"); seg.innerHTML="";
  Object.keys(FORMS).forEach(f=>{
    const b=document.createElement("button"); b.type="button"; b.textContent=f;
    b.setAttribute("aria-pressed", String(f===S.form)); b.disabled = started() && f!==S.form;
    b.onclick=()=>{ if(started()) return; S.form=f; renderForms(); renderPitch(); };
    seg.appendChild(b);
  });
}
function renderModes(){
  const seg=$("modeSeg"); seg.innerHTML="";
  Object.keys(MODES).forEach(m=>{
    const b=document.createElement("button"); b.type="button"; b.textContent=MODES[m];
    b.setAttribute("aria-pressed", String(m===S.mode)); b.disabled = started() && m!==S.mode;
    b.onclick=()=>{ if(started()||m===S.mode) return; S.mode=m; idleReel(); $("hint").textContent=idleHint(); renderModes(); };
    seg.appendChild(b);
  });
}
function renderDiffs(){
  const seg=$("diffSeg"); seg.innerHTML="";
  Object.keys(DIFFS).forEach(d=>{
    const b=document.createElement("button"); b.type="button"; b.textContent=DIFFS[d];
    b.setAttribute("aria-pressed", String(d===S.diff)); b.disabled = S.done;
    b.onclick=()=>{ if(S.done||d===S.diff) return; S.diff=d; renderDiffs(); renderBest(); renderOpp(); };
    seg.appendChild(b);
  });
}

/* ---------- 상대팀 스쿼드 보기 ---------- */
let selOpp=null;
function renderOpp(sel){
  if(sel!==undefined) selOpp=sel;
  const hardD=S.diff==="hard";
  $("oppDiffLabel").textContent="적용 중인 상대 능력치: "+(hardD?"전성기":"2026 현재");
  const tabs=$("oppTabs"); tabs.innerHTML="";
  TEAMS26.forEach((t,i)=>{
    const b=document.createElement("button"); b.type="button"; b.textContent=t.short;
    b.setAttribute("aria-pressed",String(i===selOpp)); b.onclick=()=>renderOpp(i===selOpp?null:i);
    tabs.appendChild(b);
  });
  const view=$("oppView"); view.innerHTML="";
  if(selOpp==null){ view.appendChild(el("p","hint","팀을 누르면 대표 선수단과 능력치를 볼 수 있어요.")); return; }
  const t=TEAMS26[selOpp], o=oppStrength(t,hardD);
  view.appendChild(el("p","oppsum",t.club+" · 공격 "+o.att.toFixed(1)+" / 수비 "+o.def.toFixed(1)+" · 목록에 없는 자리는 기본 "+(t.base+(hardD?CONFIG.HARD_FILL:0))+"으로 계산"));
  const tb=el("table","oppt");
  tb.innerHTML="<thead><tr><th class='t'>포지션</th><th class='t'>이름</th><th class='t'>세부</th><th>2026 현재</th><th>전성기</th></tr></thead>";
  const body=el("tbody"); const order={GK:0,DF:1,MF:2,FW:3};
  t.players.slice().sort((a,b)=>order[a.pos]-order[b.pos]||b.ovr-a.ovr).forEach(p=>{
    const tr=el("tr");
    const pc=el("td","t"); pc.appendChild(el("span","pos "+p.pos,p.pos));
    tr.append(pc, el("td","t",p.name), el("td","t",p.det||""), el("td","num"+(hardD?"":" on"),String(p.ovr)), el("td","num"+(hardD?" on":""),String(p.prime)));
    body.appendChild(tr);
  });
  tb.appendChild(body); const wrap=el("div","tablewrap"); wrap.appendChild(tb); view.appendChild(wrap);
}

/* ---------- manager ---------- */
function mgrFx(m,form){
  if(!m) return {att:0,def:0,mult:1};
  const base=(m.ovr-80)*CONFIG.MGR_PER_OVR;
  let att=base, def=base;
  if(m.style==="A"){ att+=CONFIG.MGR_STYLE; def-=CONFIG.MGR_STYLE; }
  else if(m.style==="D"){ att-=CONFIG.MGR_STYLE; def+=CONFIG.MGR_STYLE; }
  if(m.form===form){ att+=CONFIG.MGR_FORM; def+=CONFIG.MGR_FORM; }
  return {att,def,mult:0.7+0.15*m.org};
}
const sgn = v => (v>=0?"+":"")+v.toFixed(1);
function mgrOvrText(m){ return hard()&&!S.done ? "??" : m.ovr; }
function renderMgr(){
  const box=$("mgrBox"); box.innerHTML="";
  const m=S.mgr;
  if(!m){ box.classList.add("empty"); box.append(el("span","mgrnone","감독 미선택 · 감독을 뽑으면 팀 전력에 영향을 줘요")); return; }
  box.classList.remove("empty");
  const fx=mgrFx(m,S.form);
  const top=el("div","mgrtop"); top.append(el("span","mgrlab","감독"), el("b",null,m.name), el("span","mgrovr",String(mgrOvrText(m))));
  const tags=el("div","mgrtags");
  [STYLE_NAME[m.style], "선호 "+m.form+(m.form===S.form?" ✓":""), "조직력 "+"★".repeat(m.org)+"☆".repeat(5-m.org)].forEach(t=>tags.appendChild(el("span","tg",t)));
  const fxl=el("div","mgrfx","보정 공격 "+(hard()&&!S.done?"??":sgn(fx.att))+" · 수비 "+(hard()&&!S.done?"??":sgn(fx.def))+" · 케미 ×"+fx.mult.toFixed(2));
  box.append(top, el("div","mgrnote",m.note), tags, fxl);
}

/* ---------- 배치 가능 자리 ---------- */
function eligibleSlots(p){
  if(!p) return [];
  if(usedNames().has(p.name)) return [];
  const only = S.squad && S.squad.forSlot!=null ? S.squad.forSlot : null;
  return FORMS[S.form].map((s,i)=>({s,i})).filter(({s,i})=>!S.xi[i] && (only==null || i===only) && fitsSlot(p,s[0])).map(o=>o.i);
}
const canBench = p => !!p && benchOpen() && !usedNames().has(p.name);

function renderPitch(){
  const pitch=$("pitch"); pitch.querySelectorAll(".slot").forEach(n=>n.remove());
  const can = new Set(eligibleSlots(S.selected));
  FORMS[S.form].forEach((s,i)=>{
    const p=S.xi[i]; const b=document.createElement("button"); b.type="button";
    b.className="slot"+(p?" filled g-"+GROUP[s[0]]:"")+(can.has(i)?" can":"");
    b.style.left=s[1]+"%"; b.style.top=s[2]+"%";
    if(!can.has(i)) b.tabIndex=-1;
    const disc=document.createElement("span"); disc.className="disc";
    disc.textContent = p ? (hard()&&!S.done ? "?" : p.ovr) : s[0];
    b.appendChild(disc);
    if(p){
      const n=document.createElement("span"); n.className="nm"; n.textContent=p.name; b.appendChild(n);
      const e=document.createElement("span"); e.className="era"; e.textContent=tag(SQUADS[p.sq]); b.appendChild(e);
      b.setAttribute("aria-label", s[0]+" "+p.name);
    } else b.setAttribute("aria-label", s[0]+" 빈 자리"+(can.has(i)?", 여기에 배치":""));
    if(can.has(i)) b.onclick=()=>place(i);
    pitch.appendChild(b);
  });
  renderBench();
  const filled=S.xi.filter(Boolean).length;
  $("cntV").textContent=filled+"/11 · 후보 "+benchCount()+"/"+CONFIG.BENCH;
  const r = filled ? rate(S.xi) : null;
  const hide = hard() && !S.done;
  $("attV").textContent = r && !hide ? r.att.toFixed(1) : "–";
  $("defV").textContent = r && !hide ? r.def.toFixed(1) : "–";
  $("chemV").textContent = "+"+(r? r.chem:0).toFixed(1);
  $("chemV").title = r ? "같은 팀·시즌 "+r.clubPairs+"쌍, 같은 시기 국가대표 "+r.natPairs+"쌍" : "";
  const total=11+CONFIG.BENCH;
  const pr=$("progress"); pr.innerHTML=""; for(let k=0;k<total;k++){const i=document.createElement("i"); if(k<filled+benchCount()) i.className="on"; if(k>=11) i.classList.add("bn"); pr.appendChild(i);}
  $("simBtn").disabled = filled<11 || !S.mgr || S.done;
  $("spinBtn").disabled = (xiFull() && !benchOpen()) || S.spinning || offering() || S.done;
  $("mgrBtn").disabled = !!S.mgr || S.spinning || offering() || S.done;
  $("respinBtn").disabled = !offering() || S.respins<=0 || S.spinning;
  $("respinBtn").textContent = "다시 스핀 ("+S.respins+")";
  renderMgr();
}

/* 후보석: 아무 포지션이나 들어갈 수 있어요 */
function renderBench(){
  const box=$("bench"); box.innerHTML="";
  const ready = !!S.selected && canBench(S.selected);
  box.classList.toggle("can",ready);
  box.appendChild(el("div","benchlab","후보 "+benchCount()+"/"+CONFIG.BENCH));
  const row=el("div","benchrow");
  S.bench.forEach((p,i)=>{
    const b=document.createElement("button"); b.type="button";
    b.className="bslot"+(p?" filled g-"+p.pos:"")+(ready&&!p?" can":"");
    if(p){
      b.append(el("span","bd",hard()&&!S.done?"?":String(p.ovr)), el("span","bn",p.name), el("span","bp",(p.det?p.det[0]:p.pos)));
      b.setAttribute("aria-label","후보 "+p.name);
    } else { b.append(el("span","bd","+"), el("span","bn","후보 "+(i+1))); b.setAttribute("aria-label","후보석 "+(i+1)+(ready?", 여기에 영입":" 비어 있음")); }
    if(ready && !p) b.onclick=()=>placeBench();
    else b.disabled=true;
    row.appendChild(b);
  });
  box.appendChild(row);
  box.appendChild(el("p","benchnote","선발이 지치면(체력 "+CONFIG.STAM_ROTATE+" 미만) 같은 자리를 설 수 있는 후보가 대신 뛰어요. 후보는 시즌 시작 전까지만 뽑을 수 있어요."));
}

function renderList(){
  const ul=$("plist"); ul.innerHTML="";
  if(S.mgrOffer){ renderMgrList(ul); return; }
  if(!S.squad) return;
  const used=usedNames();
  const order={GK:0,DF:1,MF:2,FW:3};
  S.squad.players.slice().sort((a,b)=>b.ovr-a.ovr||order[a.pos]-order[b.pos]).forEach(p=>{
    const li=document.createElement("li"); const b=document.createElement("button"); b.type="button"; b.className="prow";
    const slots = eligibleSlots(p).length>0, bn = canBench(p);
    const ok = slots || bn;
    b.disabled=!ok; b.setAttribute("aria-pressed", String(S.selected===p));
    const pos=document.createElement("span"); pos.className="pos "+p.pos; pos.textContent=p.pos;
    const n=document.createElement("span"); n.className="n"; n.textContent=p.name;
    const sm=document.createElement("small");
    const dp = p.det ? p.det.join("/") : (p.alt?p.pos+"/"+p.alt:"");
    const showTag = S.mode==="pos" || S.squad.forSlot==null && S.squad.bench;
    sm.textContent = used.has(p.name)?"이미 선택":(showTag?tag(SQUADS[p.sq])+" · "+dp:(slots?dp:(bn?dp+" · 후보로만":"빈 자리 없음"))); n.appendChild(sm);
    const o=document.createElement("span"); o.className="ovr"; o.textContent = hard()? "??" : p.ovr;
    b.append(pos,n,o);
    b.onclick=()=>pickPlayer(p);
    li.appendChild(b); ul.appendChild(li);
  });
}
function pickPlayer(p){
  S.selected = (S.selected===p?null:p);
  if(!S.selected){ $("hint").textContent="선수를 골라 주세요."; renderList(); renderPitch(); return; }
  const slots=eligibleSlots(S.selected), bn=canBench(S.selected);
  if(slots.length===1 && !bn){ place(slots[0]); return; }
  if(slots.length===0 && bn && xiFull()){ placeBench(); return; }
  $("hint").textContent = S.selected.name+"을(를) 넣을 자리를 눌러 주세요."+(slots.length&&bn?" (경기장 또는 후보석)":(bn?" (후보석)":""));
  renderList(); renderPitch();
}

function renderMgrList(ul){
  S.mgrOffer.forEach(m=>{
    const li=document.createElement("li"); const b=document.createElement("button"); b.type="button"; b.className="prow mrow";
    const pos=el("span","pos MG","감독");
    const n=el("span","n",m.name); n.appendChild(el("small",null,STYLE_NAME[m.style]+" · 선호 "+m.form+" · 조직력 "+m.org));
    n.appendChild(el("small","blk",m.note));
    b.append(pos,n,el("span","ovr",String(mgrOvrText(m))));
    b.onclick=()=>pickMgr(m);
    li.appendChild(b); ul.appendChild(li);
  });
}

/* ---------- draft ---------- */
function anyEligible(sq){ return sq.players.some(p=>eligibleSlots(p).length>0); }

/* 포지션 스핀: 빈 자리 하나를 뽑고, 그 포지션에 맞는 후보 선수들을 보여줌. 선발이 다 찼으면 후보석용 아무 선수 */
function makePosOffer(){
  const used=usedNames(); const seen=new Set(); const cands=[];
  const all=shuffle(SQUADS.flatMap(sq=>sq.players));
  if(xiFull()){
    all.forEach(p=>{ if(!used.has(p.name) && !seen.has(p.name)){ seen.add(p.name); cands.push(p); } });
    return {club:"후보 영입", era:"후보 스핀", players:cands.slice(0,CONFIG.POS_CANDS), forSlot:null, bench:true};
  }
  const empty=FORMS[S.form].map((s,i)=>i).filter(i=>!S.xi[i]);
  const slot=empty[Math.floor(Math.random()*empty.length)];
  const label=FORMS[S.form][slot][0];
  all.forEach(p=>{ if(fitsSlot(p,label) && !used.has(p.name) && !seen.has(p.name)){ seen.add(p.name); cands.push(p); } });
  return {club:label, era:"포지션 스핀", players:cands.slice(0,CONFIG.POS_CANDS), forSlot:slot};
}

function spin(isRespin,toMgr){
  if(S.spinning) return;
  if(isRespin){ if(S.respins<=0) return; S.respins--; }
  const wasMgr=!!toMgr || !!S.mgrOffer;
  S.spinning=true; S.squad=null; S.mgrOffer=null; S.selected=null; renderList(); renderPitch();
  let target, faces;
  if(wasMgr){ target=null; faces=()=>{ const m=MGRS[Math.floor(Math.random()*MGRS.length)]; return [m.name,m.note.split(" · ")[0]]; }; }
  else if(S.mode==="pos"){ target=makePosOffer(); const labs=xiFull()?["후보"]:FORMS[S.form].filter((s,i)=>!S.xi[i]).map(s=>s[0]);
    faces=()=>[labs[Math.floor(Math.random()*labs.length)],"포지션 스핀"]; }
  else{
    const pool = xiFull() ? SQUADS : SQUADS.filter(anyEligible);
    target=pool[Math.floor(Math.random()*pool.length)];
    faces=()=>{ const sq=SQUADS[Math.floor(Math.random()*SQUADS.length)]; return [sq.club,sq.era+" 시즌"]; }; }
  const reel=$("reel"); reel.classList.add("spin");
  const steps = reduce?1:16; let k=0;
  const tick=()=>{
    k++;
    const [a,b] = k>=steps && target ? (S.mode==="pos"?[target.club,target.bench?"후보로 영입할 선수":"자리를 채울 후보"]:[target.club,target.era+" 시즌"]) : faces();
    $("reelClub").textContent=a; $("reelEra").textContent=b;
    if(k<steps){ setTimeout(tick, 40+k*k*1.4); }
    else{
      reel.classList.remove("spin"); S.spinning=false;
      if(wasMgr){ S.mgrOffer=shuffle(MGRS).slice(0,CONFIG.MGR_CANDS); $("reelClub").textContent="감독 후보"; $("reelEra").textContent=S.mgrOffer.length+"명 중 한 명을 선택";
        $("hint").textContent="함께할 감독을 고르세요. 선택하면 바꿀 수 없어요."; }
      else{ S.squad=target;
        $("hint").textContent = S.mode==="pos" ? (target.bench?"후보로 영입할 선수를 고르세요.":target.club+" 자리에 들어갈 선수를 후보에서 고르세요.")
          : (xiFull()?"후보석에 영입할 선수를 한 명 고르세요.":"이 팀에서 선수 한 명을 고르세요."); }
      renderList(); renderPitch();
    }
  };
  tick();
}

function drawMgr(){
  if(S.spinning||S.mgr||offering()) return;
  spin(false,true);
}
function afterPick(){
  const filled=S.xi.filter(Boolean).length, bc=benchCount();
  const pos=S.mode==="pos";
  const allDone = filled>=11 && bc>=CONFIG.BENCH;
  let club, era, hint;
  if(filled<11){ club=pos?"다음 포지션 스핀":"다음 스핀"; era=(11-filled)+"자리 남음"; hint="스핀을 눌러 다음 "+(pos?"포지션":"팀")+"을 뽑으세요."; }
  else if(!allDone){ club="선발 11명 완성"; era="후보 "+(CONFIG.BENCH-bc)+"명 더 뽑을 수 있어요"; hint=(S.mgr?"후보를 더 뽑거나 바로 시즌을 시작하세요.":"감독 뽑기를 눌러 감독을 정하세요. 후보도 더 뽑을 수 있어요."); }
  else { club="베스트 11 + 후보 완성"; era=S.mgr?"시즌을 시작하세요":"감독을 뽑아 주세요"; hint=S.mgr?"2026 K리그1 38라운드 시즌을 시뮬레이션해 보세요.":"감독 뽑기를 눌러 감독을 정하세요."; }
  $("reelClub").textContent=club; $("reelEra").textContent=era; $("hint").textContent=hint;
}
function pickMgr(m){
  S.mgr=m; S.mgrOffer=null; renderModes(); renderForms();
  $("reelClub").textContent="감독 "+m.name; $("reelEra").textContent=m.note;
  afterPick(); if(!xiFull()) $("hint").textContent="스핀을 눌러 선수를 뽑으세요.";
  renderList(); renderPitch();
}

function place(i){
  if(!S.selected) return;
  S.xi[i]=S.selected; S.picks++; S.selected=null; S.squad=null;
  afterPick(); renderModes(); renderForms(); renderList(); renderPitch();
}
function placeBench(){
  if(!S.selected || !benchOpen()) return;
  S.bench[S.bench.findIndex(b=>!b)]=S.selected; S.picks++; S.selected=null; S.squad=null;
  afterPick(); renderModes(); renderForms(); renderList(); renderPitch();
}

/* ---------- ratings & sim ---------- */
/* 체력 때문에 깎이는 능력치 */
const fatigue = st => st>=CONFIG.FATIGUE_FROM ? 0 : (CONFIG.FATIGUE_FROM-st)*CONFIG.FATIGUE_PER;
/* xi: 슬롯 순서대로의 선수 배열, st: 선수→체력 Map (없으면 체력 만땅) */
function rate(xi,st){
  const slots=FORMS[S.form]; const g={GK:[],DF:[],MF:[],FW:[]};
  xi.forEach((p,i)=>{ if(!p) return; const lab=slots[i][0], grp=GROUP[lab];
    const prime = p.det ? ACCEPT[lab].includes(p.det[0]) : p.pos===grp;
    g[grp].push(p.ovr-(prime?0:CONFIG.OUT_OF_POS)-(st?fatigue(st.get(p)):0)); });
  const gk=avg(g.GK), df=avg(g.DF), mf=avg(g.MF), fw=avg(g.FW);
  const cnt={}; xi.forEach(p=>{ if(p) cnt[p.sq]=(cnt[p.sq]||0)+1; });
  let pairs=0; Object.values(cnt).forEach(c=>pairs+=c*(c-1)/2);
  const fx=mgrFx(S.mgr,S.form);
  /* 같은 시기 국가대표 케미: 대표팀 항목 출신이거나, 그 대표팀 명단에 있고 소속 시즌이 겹치는 선수 */
  let natPairs=0;
  NATS.forEach(N=>{
    const c=xi.filter(p=>p && (p.sq===N.id || (N.names.has(p.name) && overlap(SQUADS[p.sq].yrs,N.yrs,1)))).length;
    natPairs+=c*(c-1)/2;
  });
  const chem=Math.min(CONFIG.CHEM_MAX*fx.mult, (pairs*CONFIG.CHEM_PER_PAIR+natPairs*CONFIG.NAT_PER_PAIR)*fx.mult);
  return {att: fw*.5+mf*.35+df*.15+chem+fx.att, def: df*.45+gk*.25+mf*.3+chem+fx.def, chem, mgr:fx, clubPairs:pairs, natPairs};
}
function poisson(l){ const L=Math.exp(-l); let k=0,p=1; do{k++; p*=Math.random();}while(p>L); return k-1; }
function pickScorer(players){
  const w={GK:0,DF:.5,MF:2.4,FW:5};
  const ws=players.map(p=>w[p.g||p.pos]*Math.max(1,p.ovr-62)); const tot=ws.reduce((a,b)=>a+b,0);
  let r=Math.random()*tot; for(let i=0;i<players.length;i++){ r-=ws[i]; if(r<=0) return players[i]; } return players[players.length-1];
}

/* 상대팀 전력: 대표 선수들 중 포지션별 상위 선수 + 부족한 자리는 팀 기본 능력치로 채움 */
function oppStrength(t,hardDiff){
  const val=p=>hardDiff?p.prime:p.ovr;
  const fill=t.base+(hardDiff?CONFIG.HARD_FILL:0);
  const top=(g,n)=>{ const a=t.players.filter(p=>p.pos===g).map(val).sort((x,y)=>y-x).slice(0,n); while(a.length<n) a.push(fill); return a; };
  const gk=top("GK",1)[0], df=avg(top("DF",4)), mf=avg(top("MF",3)), fw=avg(top("FW",3));
  return {att:fw*.5+mf*.35+df*.15, def:df*.45+gk*.25+mf*.3,
    players:t.players.map(p=>({name:p.name,pos:p.pos,ovr:val(p)}))};
}

/* n팀 한 바퀴 일정 */
function roundRobin(n){
  const t=[...Array(n).keys()]; const rounds=[];
  for(let r=0;r<n-1;r++){
    const pr=[]; for(let i=0;i<n/2;i++){ const a=t[i], b=t[n-1-i]; pr.push((r+i)%2? [a,b]:[b,a]); }
    rounds.push(pr); t.splice(1,0,t.pop());
  }
  return rounds;
}
const flip = rounds => rounds.map(pr=>pr.map(([a,b])=>[b,a]));

function simulate(){
  const hardDiff = S.diff==="hard";
  const slots=FORMS[S.form];
  const myName=$("teamName").value.trim()||"레전드 FC";
  const opps=TEAMS26.map(t=>{ const o=oppStrength(t,hardDiff); const j=(Math.random()-.5)*2;
    return {name:t.club, short:t.short, att:o.att+j, def:o.def+j*.5, players:o.players}; });
  const teams=[{name:myName,sub:S.form+(S.mgr?" · 감독 "+S.mgr.name:""),me:true,att:0,def:0}].concat(opps);
  teams.forEach(t=>Object.assign(t,{p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}));
  const N=teams.length; // 내 팀 + 2026 K리그1 11팀 = 12팀

  /* 체력 상태 */
  const roster=S.xi.concat(S.bench.filter(Boolean));
  const st=new Map(roster.map(p=>[p,100])), apps=new Map(roster.map(p=>[p,0]));
  let rotations=0;
  const rating0=rate(S.xi);

  const log=[]; const goals={}; let round=0; let lastRate=rating0;
  const playRound=(pairs,stage)=>{
    round++;
    // 이번 경기 라인업: 지친 선발은 같은 자리를 설 수 있는 후보로 교체
    const lineup=S.xi.slice(); const used=new Set(); let rot=0;
    S.xi.forEach((p,i)=>{
      if(st.get(p)<CONFIG.STAM_ROTATE){
        const cands=S.bench.filter(b=>b && !used.has(b) && st.get(b)>st.get(p)+10 && fitsSlot(b,slots[i][0]));
        if(cands.length){ cands.sort((a,b)=>(b.ovr-fatigue(st.get(b)))-(a.ovr-fatigue(st.get(a)))); lineup[i]=cands[0]; used.add(cands[0]); rot++; }
      }
    });
    rotations+=rot;
    const cur=rate(lineup,st); lastRate=cur;
    teams[0].att=cur.att; teams[0].def=cur.def;
    const myPlayers=lineup.map((p,i)=>({...p,g:GROUP[slots[i][0]]}));
    pairs.forEach(([h,a])=>{
      const H=teams[h], A=teams[a];
      const lh=CONFIG.GOAL_BASE*Math.exp((H.att+CONFIG.HOME_ADV-A.def)/CONFIG.SPREAD), la=CONFIG.GOAL_BASE*Math.exp((A.att-H.def-CONFIG.HOME_ADV)/CONFIG.SPREAD);
      const gh=poisson(lh), ga=poisson(la);
      [[H,gh,ga],[A,ga,gh]].forEach(([T,f,g])=>{T.p++;T.gf+=f;T.ga+=g; if(f>g){T.w++;T.pts+=3;} else if(f===g){T.d++;T.pts++;} else T.l++;});
      if(H.me||A.me){
        const mine=H.me, opp=mine?A:H, myG=mine?gh:ga, opG=mine?ga:gh;
        const ms=[]; for(let k=0;k<myG;k++){ const s=pickScorer(myPlayers); goals[s.name]=(goals[s.name]||0)+1; ms.push(s.name);}
        const os=[]; for(let k=0;k<opG;k++){ os.push(pickScorer(opp.players).name);}
        log.push({r:round, home:mine, opp, f:myG, a:opG, res: myG>opG?"W":myG===opG?"D":"L", ms, os, rot, stage});
      }
    });
    // 체력 갱신
    const playing=new Set(lineup);
    lineup.forEach((p,i)=>{ apps.set(p,apps.get(p)+1); st.set(p,Math.max(CONFIG.STAM_MIN, st.get(p)-CONFIG.STAM_COST[GROUP[slots[i][0]]]+CONFIG.STAM_PLAY_REC)); });
    roster.forEach(p=>{ if(!playing.has(p)) st.set(p,Math.min(100, st.get(p)+CONFIG.STAM_REST)); });
  };

  /* 정규 33라운드: 서로 3번씩 */
  const leg1=roundRobin(N), leg2=flip(leg1);
  const leg3=leg1.slice().reverse().map(pr=>pr.map(([a,b],i)=>i%2?[b,a]:[a,b]));
  leg1.concat(leg2,leg3).forEach(pr=>playRound(pr,"정규"));
  /* 33라운드 후 상위 6팀(파이널A) / 하위 6팀(파이널B)으로 갈라 5라운드 */
  const sortFn=(x,y)=>y.pts-x.pts||(y.gf-y.ga)-(x.gf-x.ga)||y.gf-x.gf;
  const idx=teams.map((t,i)=>i);
  const ordered=idx.slice().sort((a,b)=>sortFn(teams[a],teams[b]));
  const groupA=ordered.slice(0,N/2), groupB=ordered.slice(N/2);
  groupA.forEach(i=>teams[i].grp="A"); groupB.forEach(i=>teams[i].grp="B");
  const finals=(g)=>roundRobin(g.length).map(pr=>pr.map(([a,b])=>[g[a],g[b]]));
  const fa=finals(groupA), fb=finals(groupB);
  fa.forEach((pr,k)=>playRound(pr.concat(fb[k]),"파이널"+(teams[0].grp||"")));
  log.forEach(g=>{ if(g.stage.startsWith("파이널")) g.stage="파이널"+teams[0].grp; });
  const table=groupA.slice().sort((a,b)=>sortFn(teams[a],teams[b])).concat(groupB.slice().sort((a,b)=>sortFn(teams[a],teams[b]))).map(i=>teams[i]);
  const stam=roster.map(p=>({p,apps:apps.get(p),st:st.get(p),starter:S.xi.includes(p)})).sort((a,b)=>b.apps-a.apps||b.p.ovr-a.p.ovr);
  return {teams,table,log,goals,me:teams[0],rank:table.indexOf(teams[0])+1,rate:rating0,lastRate,stam,rotations,diff:S.diff,N};
}

/* ---------- results ---------- */
function verdict(R){
  const m=R.me, hd=R.diff==="hard"?" (어려움)":"";
  const nm = R.diff==="hard"?"전성기 상대들":"2026 K리그1";
  if(m.w===38) return ["38전 38승. 전설이 됐어요."+hd,"K리그 역사에 없는 완벽한 시즌이에요."];
  if(m.l===0 && R.rank===1) return ["무패 우승"+hd,"한 번도 지지 않고 정상에 올랐어요."];
  if(R.rank===1) return ["리그 우승"+hd,"승점 "+m.pts+"점으로 "+nm+" 정상에 올랐어요."];
  if(R.rank<=3) return [R.rank+"위, 아시아 무대 진출"+hd,"우승까지 승점 "+(R.table[0].pts-m.pts)+"점이 모자랐어요."];
  if(R.rank<=6) return [R.rank+"위, 파이널A 마감"+hd,"상위 스플릿에는 들었지만 우승 경쟁에서는 밀렸어요."];
  if(R.rank<=9) return [R.rank+"위, 중위권 마감"+hd,"레전드라고 해서 쉬운 리그는 아니에요."];
  return [R.rank+"위, 강등권 위기"+hd,"포지션 밸런스와 후보 로테이션을 다시 점검해 보세요."];
}

function showResults(R){
  S.done=true; renderPitch(); renderDiffs();
  const box=$("results"); box.hidden=false; box.innerHTML="";
  const [v1,v2]=verdict(R); const m=R.me;
  const head=el("section","panel");
  head.append(el("div","label","시즌 결과 · 2026 K리그1 · "+R.N+"팀 38라운드 · "+(R.diff==="hard"?"어려움":"쉬움")));
  const vh=el("p","verdict",v1); vh.appendChild(el("small",null,v2)); head.appendChild(vh);
  const board=el("div","board");
  [[m.w+"승 "+m.d+"무 "+m.l+"패","전적"],[m.pts+"점","승점"],[R.rank+"위","순위"],[m.gf+" : "+m.ga,"득실"],[(R.rate.att).toFixed(1)+" / "+(R.rate.def).toFixed(1),"공격 / 수비"]]
    .forEach(([v,k])=>{const s=el("div","stat"); s.append(el("div","v",v), el("div","k",k)); board.appendChild(s);});
  head.appendChild(board);
  if(S.mgr) head.appendChild(el("p","hint","감독 "+S.mgr.name+" ("+STYLE_NAME[S.mgr.style]+") · 공격 "+sgn(R.rate.mgr.att)+" / 수비 "+sgn(R.rate.mgr.def)+" 보정"));
  head.appendChild(el("p","hint","체력 로테이션 "+R.rotations+"회 · 후보 "+benchCount()+"명"+(benchCount()<CONFIG.BENCH?" (후보를 다 채우면 체력 관리가 더 쉬워져요)":"")));
  const form=el("div","form"); form.setAttribute("aria-label","38경기 흐름");
  R.log.forEach(g=>{const i=el("i",g.res); i.title=g.r+"R "+g.f+":"+g.a; form.appendChild(i);});
  head.appendChild(form);
  const row=el("div","btnrow"); row.style.marginTop="14px";
  const again=el("button","btn primary","다시 드래프트"); again.type="button"; again.onclick=reset;
  const resim=el("button","btn ghost","같은 선수들로 다시 시뮬"); resim.type="button"; resim.onclick=()=>{ const R2=simulate(); saveBest(R2); showResults(R2); };
  row.append(again,resim); head.appendChild(row);
  box.appendChild(head);

  const cols=el("div","cols"); cols.style.marginTop="20px";
  // matches
  const mp=el("section","panel"); mp.appendChild(el("h2",null,"경기별 결과"));
  mp.appendChild(el("div","label","득점자는 경기 아래에 표시돼요"));
  const ul=el("ul","matches");
  R.log.forEach(g=>{
    const li=el("li","m"); li.append(el("span","r",g.r+"R"), el("span","ha",g.home?"홈":"원정"));
    const o=el("span","o",g.opp.name+(g.stage.startsWith("파이널")?" · "+g.stage:"")+(g.rot?" · 교체 "+g.rot:""));
    const sc=[g.ms.length?g.ms.join(", "):"", g.os.length?"상대 "+g.os.join(", "):""].filter(Boolean).join(" · ");
    o.appendChild(el("span",null,sc||"득점 없음")); li.appendChild(o);
    li.appendChild(el("span","sc "+g.res,g.f+" : "+g.a)); ul.appendChild(li);
  });
  mp.appendChild(ul);
  // table + scorers + stamina + share
  const side=el("div"); side.style.display="grid"; side.style.gap="20px";
  const tp=el("section","panel"); tp.appendChild(el("h2",null,"최종 순위"));
  const tw=el("div","tablewrap"); const tb=el("table");
  tb.innerHTML="<thead><tr><th>#</th><th class='t'>팀</th><th>승</th><th>무</th><th>패</th><th>득실</th><th>승점</th></tr></thead>";
  const body=el("tbody");
  R.table.forEach((t,i)=>{ const tr=el("tr",t.me?"me":"link");
    if(!t.me){ const ti=TEAMS26.findIndex(x=>x.club===t.name); tr.title="눌러서 스쿼드 보기"; tr.onclick=()=>{ renderOpp(ti); $("oppWrap").scrollIntoView({behavior:reduce?"auto":"smooth",block:"start"}); }; }
    [i+1,t.name+(t.grp?" ("+t.grp+")":""),t.w,t.d,t.l,(t.gf-t.ga>0?"+":"")+(t.gf-t.ga),t.pts].forEach((v,j)=>{const td=el("td",j===1?"t":"num",String(v)); tr.appendChild(td);});
    body.appendChild(tr); });
  tb.appendChild(body); tw.appendChild(tb); tp.appendChild(tw);
  tp.appendChild(el("p","hint","팀 이름을 누르면 그 팀 스쿼드를 볼 수 있어요. 33라운드 후 상위 6팀은 파이널A, 하위 6팀은 파이널B로 갈라 5라운드를 더 치러요."));
  const sp=el("section","panel"); sp.appendChild(el("h2",null,"팀 득점 순위"));
  const sl=el("ul","scorers");
  const top=Object.entries(R.goals).sort((a,b)=>b[1]-a[1]).slice(0,5);
  if(!top.length) sl.appendChild(el("li",null,"득점이 없었어요."));
  top.forEach(([n,g])=>{const li=el("li"); li.append(el("span",null,n), el("b",null,g+"골")); sl.appendChild(li);});
  sp.appendChild(sl);
  const stp=el("section","panel"); stp.appendChild(el("h2",null,"출전과 체력"));
  stp.appendChild(el("div","label","시즌 종료 시점 체력"));
  const stl=el("ul","stam");
  R.stam.forEach(o=>{ const li=el("li");
    li.append(el("span","pos "+o.p.pos,o.p.pos), el("span","sn",o.p.name+(o.starter?"":" (후보)")), el("span","sa",o.apps+"경기"));
    const bar=el("span","sbar"); const fill=el("i"); fill.style.width=Math.round(o.st)+"%"; fill.className=o.st<CONFIG.STAM_ROTATE?"low":""; bar.appendChild(fill); li.appendChild(bar);
    stl.appendChild(li); });
  stp.appendChild(stl);
  const sh=el("section","panel share"); sh.appendChild(el("h2",null,"결과 공유"));
  sh.appendChild(el("p","hint","이미지를 길게 누르거나 우클릭해서 저장한 뒤 단톡방에 올리세요."));
  const cb=el("button","btn ghost","결과 텍스트 복사"); cb.type="button"; cb.onclick=()=>copyText(R,cb);
  sh.appendChild(cb);
  if(window.KLShare && KLShare.enabled){
    const ub=el("button","btn primary","친구들 기록에 올리기"); ub.type="button"; ub.style.marginLeft="8px"; ub.onclick=()=>uploadResult(R,ub);
    sh.appendChild(ub);
  }
  const img=el("img"); img.alt="시즌 결과 카드"; sh.appendChild(img);
  side.append(tp,sp,stp,sh);
  cols.append(mp,side); box.appendChild(cols);
  drawCard(R,top).then(url=>{ img.src=url; });
  box.scrollIntoView({behavior:reduce?"auto":"smooth",block:"start"});
}

async function uploadResult(R,btn){
  const nick=$("nick").value.trim();
  if(!nick){ btn.textContent="닉네임을 먼저 입력하세요"; $("nick").focus(); setTimeout(()=>btn.textContent="친구들 기록에 올리기",2200); return; }
  store.set("kl38-nick",nick);
  const m=R.me; btn.disabled=true; btn.textContent="올리는 중…";
  try{
    await KLShare.save({nickname:nick, team_name:$("teamName").value.trim()||"레전드 FC", form:S.form, mode:S.mode, diff:S.diff, manager:S.mgr?S.mgr.name:null,
      w:m.w,d:m.d,l:m.l,pts:m.pts,gf:m.gf,ga:m.ga,rank:R.rank, xi:S.xi.map(p=>p.name)});
    btn.textContent="올렸어요"; KLShare.refresh();
  }catch(e){ btn.disabled=false; btn.textContent="실패, 다시 시도"; }
}

function summaryText(R){
  const m=R.me, top=Object.entries(R.goals).sort((a,b)=>b[1]-a[1])[0];
  return "K-레전드 38 시즌 결과 (2026 K리그1 · "+(R.diff==="hard"?"어려움":"쉬움")+")\n"+m.name+" ("+S.form+(S.mgr?", 감독 "+S.mgr.name:"")+(S.mode==="pos"?", 포지션 스핀":"")+")\n"+m.w+"승 "+m.d+"무 "+m.l+"패 · 승점 "+m.pts+" · "+R.rank+"위 · 득실 "+m.gf+":"+m.ga+
    (top?"\n팀 득점 1위: "+top[0]+" "+top[1]+"골":"")+"\n베스트 11: "+S.xi.map(p=>p.name).join(", ")+"\n후보: "+(S.bench.filter(Boolean).map(p=>p.name).join(", ")||"없음");
}
function copyText(R,btn){
  const t=summaryText(R);
  const ok=()=>{btn.textContent="복사했어요";setTimeout(()=>btn.textContent="결과 텍스트 복사",1600);};
  try{ navigator.clipboard.writeText(t).then(ok).catch(()=>fallback()); }catch(e){ fallback(); }
  function fallback(){ const ta=document.createElement("textarea"); ta.value=t; ta.style.width="100%"; ta.rows=6; btn.after(ta); ta.select(); btn.textContent="아래 텍스트를 복사하세요"; }
}

async function drawCard(R,top){
  try{ await Promise.all([document.fonts.load("40px 'Black Han Sans'"),document.fonts.load("700 20px 'Noto Sans KR'"),document.fonts.load("700 20px 'JetBrains Mono'")]); }catch(e){}
  const W=1080,H=1350,c=document.createElement("canvas"); c.width=W; c.height=H; const x=c.getContext("2d");
  x.fillStyle="#0F2A1D"; x.fillRect(0,0,W,H);
  x.fillStyle="#F0B23A"; x.font="64px 'Black Han Sans', sans-serif"; x.fillText("K-레전드 38",64,110);
  x.fillStyle="#E6EEE8"; x.font="700 34px 'Noto Sans KR', sans-serif"; x.fillText(R.me.name+"  ·  "+S.form+(S.mode==="pos"?"  ·  포지션 스핀":""),64,165);
  x.fillStyle="#93A499"; x.font="700 28px 'Noto Sans KR', sans-serif";
  x.fillText((S.mgr?"감독 "+S.mgr.name+" ("+STYLE_NAME[S.mgr.style]+")  ·  ":"")+"2026 K리그1 "+(R.diff==="hard"?"어려움":"쉬움"),64,212);
  const m=R.me;
  x.font="88px 'Black Han Sans', sans-serif"; x.fillStyle="#FFFFFF"; x.fillText(m.w+"승 "+m.d+"무 "+m.l+"패",64,285);
  x.font="700 34px 'JetBrains Mono', monospace"; x.fillStyle="#F0B23A";
  x.fillText("승점 "+m.pts+"   "+R.rank+"위 / "+R.N+"   득실 "+m.gf+":"+m.ga,64,345);
  // pitch
  const px=64,py=390,pw=W-128,ph=760;
  for(let i=0;i<8;i++){ x.fillStyle=i%2?"#1C6341":"#21704A"; x.fillRect(px,py+i*ph/8,pw,ph/8); }
  x.strokeStyle="rgba(255,255,255,.45)"; x.lineWidth=3; x.strokeRect(px+12,py+12,pw-24,ph-24);
  x.beginPath(); x.moveTo(px+12,py+ph/2); x.lineTo(px+pw-12,py+ph/2); x.stroke();
  x.beginPath(); x.arc(px+pw/2,py+ph/2,80,0,Math.PI*2); x.stroke();
  FORMS[S.form].forEach((s,i)=>{ const p=S.xi[i]; const cx=px+pw*s[1]/100, cy=py+ph*s[2]/100;
    x.fillStyle=GCOL[GROUP[s[0]]]; x.beginPath(); x.arc(cx,cy-14,30,0,Math.PI*2); x.fill();
    x.lineWidth=3; x.strokeStyle="#FFFFFF"; x.stroke();
    x.fillStyle="#FFFFFF"; x.font="700 24px 'JetBrains Mono', monospace"; x.textAlign="center"; x.fillText(String(p.ovr),cx,cy-5);
    x.fillStyle="#FFFFFF"; x.font="700 26px 'Noto Sans KR', sans-serif"; x.fillText(p.name,cx,cy+50);
    x.fillStyle="rgba(255,255,255,.75)"; x.font="500 18px 'JetBrains Mono', monospace"; x.fillText(tag(SQUADS[p.sq]),cx,cy+76);
    x.textAlign="left"; });
  const bn=S.bench.filter(Boolean).map(p=>p.name).join(", ");
  x.fillStyle="#93A499"; x.font="500 22px 'Noto Sans KR', sans-serif"; x.fillText("후보  "+(bn||"없음"),64,1186);
  x.fillStyle="#E6EEE8"; x.font="700 30px 'Noto Sans KR', sans-serif";
  if(top[0]) x.fillText("팀 득점 1위  "+top[0][0]+" "+top[0][1]+"골",64,1232);
  x.fillStyle="#93A499"; x.font="500 22px 'Noto Sans KR', sans-serif"; x.fillText(verdict(R)[0],64,1274);
  x.fillText("비공식 팬 제작 게임",64,1312);
  return c.toDataURL("image/png");
}

/* ---------- best record (난이도별) ---------- */
function saveBest(R){
  const all=store.get("kl38-best2")||{}; const m=R.me; const b=all[R.diff];
  if(!b || m.pts>b.pts){ all[R.diff]={pts:m.pts,w:m.w,d:m.d,l:m.l,rank:R.rank}; store.set("kl38-best2",all); }
  renderBest();
}
function renderBest(){
  const all=store.get("kl38-best2")||{}; const b=all[S.diff]; const e=$("best"); e.innerHTML="";
  if(!b){ e.textContent="아직 기록이 없어요 ("+(S.diff==="hard"?"어려움":"쉬움")+")"; return; }
  e.append("내 최고 기록 ("+(S.diff==="hard"?"어려움":"쉬움")+")"); const s=document.createElement("strong"); s.textContent=b.w+"승 "+b.d+"무 "+b.l+"패 · "+b.pts+"점 · "+b.rank+"위"; e.appendChild(s);
}

function reset(){
  const f=S.form, md=S.mode, df=S.diff; newState(f,md,df); $("results").hidden=true; $("results").innerHTML="";
  idleReel(); $("hint").textContent=idleHint();
  renderModes(); renderForms(); renderDiffs(); renderList(); renderPitch(); window.scrollTo({top:0,behavior:reduce?"auto":"smooth"});
}

$("spinBtn").onclick=()=>spin(false);
$("respinBtn").onclick=()=>spin(true);
$("mgrBtn").onclick=drawMgr;
$("simBtn").onclick=()=>{ const R=simulate(); saveBest(R); showResults(R); };
$("hard").onchange=()=>{ renderList(); renderPitch(); };

newState(); { const n=store.get("kl38-nick"); if(n) $("nick").value=n; }
renderModes(); renderForms(); renderDiffs(); renderOpp(null); renderPitch(); renderBest(); idleReel(); $("hint").textContent=idleHint();
window.__KL38 = {SQUADS, TEAMS26, MGRS, FORMS, CONFIG, rate:()=>rate(S.xi), simulate, oppStrength, S:()=>S};
})();

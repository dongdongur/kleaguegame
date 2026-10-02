/* K-라이프 화면 (모바일 우선). 계산은 js/life/engine.js · train.js · nat.js · awards.js · events.js (window.LIFE) */
(function(){
"use strict";
const L=window.LIFE, K=window.KLCore;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const KEY="klife-save", HOF="klife-hof", DEX="klife-dex";
const rd=k=>{ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } };
const wr=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
const app=$("app");
const FAST=!!window.__LIFE_FAST||/[?&]fast/.test(location.search)||(()=>{ try{ return localStorage.getItem("klife-fast")==="1"; }catch(e){ return false; } })();   // 점검용: 로딩 연출 생략

const POSK={FW:"공격수",MF:"미드필더",DF:"수비수",GK:"골키퍼"};
const NEWDRAFT=()=>({name:"",number:"",pos:"FW",sub:"ST",foot:"오른발",role:"",height:"",weight:"",trait:"effort",route:"mid",points:{talent:2,family:2,mentor:2,grit:2,health:2},cands:null,pick:-1,loading:false});
const NEWPLAN=()=>({focus:"",tier:"basic",invest:"",alloc:{}});
let S=rd(KEY); if(S&&S.v!==L.STATE_VER) S=null;
let view=S?(S.retired?(S.quit?"quit":"retired"):S.phase==="draft"?"draft":"game"):"home";
let tab="season";
let draft=NEWDRAFT();
let plan=S&&S.plan?Object.assign(NEWPLAN(),{focus:S.plan.focus||"",tier:S.plan.tier||"basic",invest:S.plan.invest||"",alloc:Object.assign({},S.plan.alloc)}):NEWPLAN();
let seg=null, modals=[], toast=null, off=null, openDet=false, chosenInc=[], planOpen=false, boardTab="table", ldTimer=null;
const TRAITS=()=>L.TRAIT_LIST;
const money=v=>v>=1?(Math.round(v*10)/10)+"억 원":Math.round(v*10000)+"만 원";
const save=()=>{ if(S) wr(KEY,S); };
const age=()=>L.age(S);
const subName=()=>{ const d=L.POSDEF[S.p.pos].subs.find(s=>s[0]===S.p.sub); return d?d[1]:S.p.sub; };
const scoutLabel=()=>{ const b=L.scoutBand(S); return b.final?"재능 "+b.label+" (확정)":"재능 "+b.label+" (예상 · 20세에 확정)"; };
function emblem(club,size){
  const name=club?club.name:"?", code=club&&(club.code||(window.KL_CLUB_CODE||{})[club.id||club.name]);
  const hue=[...name].reduce((h,c)=>(h*31+c.charCodeAt(0))%360,0), ini=esc(name.replace(/[^\p{L}\p{N}]/gu,"").slice(0,2)), sz=size||44;
  if(code&&window.KL_EMBLEM_URL&&window.KL_CRESTS_ON) return `<span class="emb" style="--s:${sz}px;--h:${hue}"><i>${ini}</i><img src="${KL_EMBLEM_URL(code)}" alt="" onerror="this.remove()"></span>`;
  return `<span class="emb" style="--s:${sz}px;--h:${hue}"><i>${ini}</i></span>`;
}
const yearLabel=()=>S.stage==="pro"?"프로 "+(S.history.filter(h=>!h.youth).length+1)+"년차":L.gradeLabel(age());

/* 눌러야 할 곳으로 화면을 올려서 깜빡여 알려줘요 */
function hint(sel,msg){ if(msg){ toast=msg; keep(render); setTimeout(()=>{ toast=null; keep(render); },2200); } const el=document.querySelector(sel); if(!el) return; el.scrollIntoView({block:"center",behavior:"smooth"}); el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); }
function keep(fn){ window.__keepScroll=true; fn(); window.__keepScroll=false; }

/* ================= 렌더 ================= */
function render(){
  if(S&&view==="game"&&S.phase==="offseason"&&!off) buildOff();
  let h="", nav=false;
  if(view==="home") h=homeView();
  else if(view==="create") h=createView();
  else if(view==="scout") h=scoutView();
  else if(view==="draft") h=draftView();
  else if(view==="retired") h=retiredView();
  else if(view==="quit") h=quitView();
  else if(view==="hof") h=hofView();
  else if(view==="dex") h=dexView();
  else { nav=true; h=header()+`<main class="body">${tab==="season"?seasonTab():tab==="player"?playerTab():tab==="career"?careerTab():feedTab()}</main>`+navHtml(); }
  app.className="phone"+(nav?"":" nonav");
  app.innerHTML=h+(modals.length?modalHtml():"")+(toast?`<div class="toast">${esc(toast)}</div>`:"");
  if(modals[0]&&modals[0].t==="sign") bindSign();
  if(!window.__keepScroll) window.scrollTo(0,0);
}
let signDirty=false;
function bindSign(){
  const cv=$("signpad"); if(!cv) return; const cx=cv.getContext("2d"); cx.lineWidth=5; cx.lineCap="round"; cx.lineJoin="round"; cx.strokeStyle="#ffcf4a"; signDirty=false; let down=false;
  const pos=e=>{ const r=cv.getBoundingClientRect(), t=e.touches?e.touches[0]:e; return [(t.clientX-r.left)*cv.width/r.width,(t.clientY-r.top)*cv.height/r.height]; };
  const st=e=>{ e.preventDefault(); down=true; const [x,y]=pos(e); cx.beginPath(); cx.moveTo(x,y); cx.lineTo(x+.1,y); cx.stroke(); signDirty=true; };
  const mv=e=>{ if(!down) return; e.preventDefault(); const [x,y]=pos(e); cx.lineTo(x,y); cx.stroke(); };
  const en=()=>{ down=false; };
  cv.addEventListener("mousedown",st); cv.addEventListener("mousemove",mv); window.addEventListener("mouseup",en);
  cv.addEventListener("touchstart",st,{passive:false}); cv.addEventListener("touchmove",mv,{passive:false}); cv.addEventListener("touchend",en);
}
function askSign(title,lines,fn){ modals.unshift({t:"sign",title,lines,fn}); keep(render); }
function say(m){ toast=m; keep(render); setTimeout(()=>{ toast=null; keep(render); },2200); }
function header(){
  const p=S.p;
  return `<header class="top"><button class="ibtn" data-act="home" title="K-라이프 홈">⌂</button>${emblem(S.club,40)}
   <div class="who"><b>${esc(p.name)} <small>No.${p.number}</small></b><small>${esc(S.club.name)} · ${esc(subName())} · ${age()}세</small></div>
   <div class="ovr"><small>OVR</small><b>${p.ovr}</b></div></header>`;
}
function navHtml(){ return `<nav class="nav">${[["season","🗓","시즌"],["player","⚽","선수"],["career","🏆","커리어"],["feed","📰","소식"]].map(([k,i,t])=>`<button data-act="tab" data-v="${k}" class="${tab===k?"on":""}"><span>${i}</span>${t}</button>`).join("")}</nav>`; }

/* ================= 홈 ================= */
function homeView(){
  const hof=rd(HOF)||[];
  const cont=S&&!S.retired?`<button class="big alt" data-act="continue"><span>이어하기 · ${esc(S.p.name)} (${age()}세)</span><b>→</b></button>`:"";
  return `<main class="body"><div class="brand"><span class="mark">K</span><div><small>K-LIFE</small><b>축구 인생 키우기</b></div></div>
   <section class="hero"><small class="kick">NEW FOOTBALL LIFE</small><h1>이번 생, 어떤 선수로 살아볼까요?</h1>
    <p class="muted">중학교 유소년부터 은퇴까지. 훈련·계약·이적·국가대표·병역까지, 선택이 커리어를 바꿔요.</p>${cont}
    <button class="big" data-act="new"><span>새로운 인생 시작</span><b>→</b></button></section>
   <section class="card"><h3 class="sec">명예의 전당</h3>${hof.length?hof.slice().sort((a,b)=>b.score-a.score).slice(0,10).map((x,i)=>`<div class="hof"><b>${i+1}</b><div><b>${esc(x.name)}</b><br><small>${esc(x.pos)} · ${esc(x.club)} · ${x.years}년 · 통산 ${x.goals}골 ${x.assists}도움${x.retire?" · 영구결번":""}</small></div><span class="pill gold">${x.grade} ${x.score}</span></div>`).join(""):`<p class="muted">아직 은퇴한 선수가 없어요.</p>`}</section>
   <div class="grid2"><button class="wide" data-act="hoflist">🏆 친구들 명예의 전당</button><button class="wide" data-act="dex">📖 이벤트 도감</button></div>
   <section class="card flat"><h3 class="sec">업데이트 예정</h3><p class="muted">· 라리가 · 분데스리가 · 리그 1 · 세리에 A · 챔피언십 실제 선수 명단 (하나씩 순서대로)<br>· J리그 · 사우디 프로리그 이적, AFC 챔피언스리그 확장<br>· 유로파리그, 각국 리그 승강<br>· 더 많은 이벤트와 스토리, 연출 다듬기</p></section>
   <p class="muted c"><a class="lnk" href="index.html">게임 선택 메뉴로</a>${S?` · <button class="lnk" data-act="wipe">저장 삭제</button>`:""}</p></main>`;
}

/* ================= 생성 ================= */
const PT_CATS=[["talent","재능","타고난 재능이 커질 확률 ↑, 숨은 특성(대천재 등) 확률 ↑"],["family","가정환경","부유한 집안일 확률 ↑ → 훈련 지원 포인트 ↑"],["mentor","좋은 스승","20세까지 성장 +4%/포인트"],["grit","끈기","훈련 성공 확률 +6%/포인트 · 기복 ↓ · 중도 포기 위기에 강함"],["health","건강","부상 위험 −7%/포인트"]];
const ROUTES=[["mid","중학교 1학년 (13세 · U15)","가장 길게(6년) 키워요. 15세까지 성장 +8%, 출전 기회도 넉넉해요. 대신 유소년 리그 수준이 낮고, 긴 시간 동안 집안 사정이 바뀔 수 있어요."],["hs","고등학교 1학년 (16세 · U18)","U18 리그는 수준이 높아요. 3년 안에 평가받아야 해서 성장 여유가 짧고, 어린 학년은 출전 기회가 적어요."],["high","고교 졸업 신인 (19세)","곧바로 드래프트에 도전해요. 지명 확률이 낮으면 대학이나 해외 직행을 노려야 해요."],["univ","대학 졸업 신인 (23세)","즉시 전력감이지만 성장 기간이 짧아요. 최종 드래프트에서 지명 못 받으면 커리어가 끝날 수 있어요."]];
function ptsLeft(){ return 10-Object.values(draft.points).reduce((a,b)=>a+b,0); }
function createView(){
  const d=L.POSDEF[draft.pos];
  if(!d.subs.some(s=>s[0]===draft.sub)) draft.sub=d.subs[0][0];
  if(!L.rolesOf(draft.sub).some(r=>r[0]===draft.role)) draft.role=(L.rolesOf(draft.sub)[0]||[])[0]||"";
  const left=ptsLeft();
  return `<main class="body"><div class="row"><button class="ibtn" data-act="home">‹</button><h2>선수 만들기</h2></div>
   <section class="card" id="sec-name"><span class="lab">이름</span><input type="text" id="nm" maxlength="8" value="${esc(draft.name)}" placeholder="선수 이름">
    <span class="lab">등번호 (비워두면 자동)</span><input type="number" id="no" inputmode="numeric" min="1" max="99" value="${esc(draft.number)}" placeholder="1–99"></section>
   <section class="card"><span class="lab">포지션</span><div class="chips">${Object.keys(L.POSDEF).map(k=>`<button data-act="pos" data-v="${k}" class="${draft.pos===k?"on":""}">${POSK[k]}</button>`).join("")}</div>
    <p class="muted">${esc(L.POSINFO[draft.pos])}</p>
    <span class="lab">세부 포지션</span><div class="chips">${d.subs.map(s=>`<button data-act="sub" data-v="${s[0]}" class="${draft.sub===s[0]?"on":""}">${s[1]}</button>`).join("")}</div>
    <p class="muted">${esc(L.SUBINFO[draft.sub]||"")}</p>
    <span class="lab">선호 역할 — 같은 자리에서 맡을 임무 (은사를 만나면 바뀔 수도 있어요)</span>
    ${L.rolesOf(draft.sub).map(r=>`<button class="opt ${draft.role===r[0]?"on":""}" data-act="role" data-v="${r[0]}"><b>${esc(r[1])}</b><small>${esc(r[2])}</small></button>`).join("")}
    <span class="lab">주발</span><div class="chips">${["오른발","왼발","양발"].map(f=>`<button data-act="foot" data-v="${f}" class="${draft.foot===f?"on":""}">${f}</button>`).join("")}</div>
    <p class="note">${esc(L.footInfo(draft.sub,draft.foot).text)}</p>
    ${(draft.sub==="LW"||draft.sub==="RW"||draft.sub==="LB"||draft.sub==="RB")?`<p class="muted">같은 측면이라도 주발에 따라 스타일이 달라져요. 오른쪽 자리 + 오른발 = 정발(크로스형), 오른쪽 자리 + 왼발 = 역발(안으로 파고드는 득점형)이에요.</p>`:""}</section>
   <section class="card" id="sec-pts"><span class="lab">초기 포인트 10 — 남은 포인트 <b style="color:${left?"var(--gold)":"var(--acc)"}">${left}</b></span>
    <p class="muted">포인트를 투자하면 유리한 쪽으로 확률이 쏠려요. 결과는 '무작위 + 투자'로 정해지니, 한쪽에 몰면 대박도 쪽박도 가능해요.</p>
    ${PT_CATS.filter(c=>!(c[0]==="mentor"&&(draft.route==="high"||draft.route==="univ"))).map(([k,n,dsc])=>`<div class="row"><div class="grow"><b>${n}</b><br><small class="muted">${dsc}</small></div><button class="ghost" data-act="pt" data-v="${k}:-1" ${draft.points[k]<=0?"disabled":""}>−</button><b style="min-width:26px;text-align:center;font-family:var(--f-num);font-size:18px">${draft.points[k]}</b><button class="ghost" data-act="pt" data-v="${k}:1" ${draft.points[k]>=5||left<=0?"disabled":""}>＋</button></div>`).join("")}</section>
   <section class="card"><span class="lab">체격 (비워두면 포지션 평균)</span><div class="grid2"><input type="number" id="ht" inputmode="numeric" placeholder="키 cm" value="${esc(draft.height)}"><input type="number" id="wt" inputmode="numeric" placeholder="몸무게 kg" value="${esc(draft.weight)}"></div>
    <p class="note" id="bodyfx">${esc(bodyLine())}</p>
    <p class="muted">크고 무거울수록 피지컬·수비·제공권(골키퍼는 선방 범위)이 유리하고, 스피드·드리블은 불리해요. 작고 가벼우면 반대예요. 포지션 평균(공격수 180cm/73kg, 미드필더 177/70, 수비수 183/77, 골키퍼 188/82)에서 멀수록 효과가 커요.</p></section>
   <section class="card"><span class="lab">성장 특성 (하나) — 숨은 특성은 20세에 재능이 확정될 때 알려줘요</span>${TRAITS().map(t=>`<button class="opt ${draft.trait===t.id?"on":""}" data-act="trait" data-v="${t.id}"><b>${t.icon} ${t.name}</b><small>${t.desc}</small><span class="tp">${t.eff}</span></button>`).join("")}</section>
   <section class="card"><span class="lab">시작 시점</span>${ROUTES.map(([k,t,s])=>`<button class="opt ${draft.route===k?"on":""}" data-act="route" data-v="${k}"><b>${t}</b><small>${s}</small></button>`).join("")}</section>
   <div class="cta"><button class="big ${(!draft.name.trim()||left)?"needs":""}" data-act="scout"><span>${!draft.name.trim()?"이름을 먼저 적어 주세요 ↑":left?"포인트 "+left+"개를 마저 나눠 주세요 ↑":"스카우트 후보 3명 보기"}</span><b>→</b></button></div></main>`;
}
function bodyLine(){ return "체격 효과: "+L.bodyText(draft.pos,+draft.height||0,+draft.weight||0); }
function readForm(){ const g=id=>{ const e=$(id); return e?e.value:null; }; const n=g("nm"); if(n!=null) draft.name=n; const no=g("no"); if(no!=null) draft.number=no; const h=g("ht"); if(h!=null) draft.height=h; const w=g("wt"); if(w!=null) draft.weight=w; }
function makeCands(){
  const t=L.rollTalent(); const ty=L.TYPES[draft.pos];
  return ty.map(x=>L.create({name:draft.name.trim()||"이름 없는 선수",pos:draft.pos,sub:draft.sub,role:draft.role,type:x[0],route:draft.route,talent:t,foot:draft.foot,trait:draft.trait,points:Object.assign({},draft.points),number:+draft.number||undefined,height:+draft.height||undefined,weight:+draft.weight||undefined}));
}
function scoutView(){
  if(draft.loading) return `<main class="body"><section class="card load"><small class="kick">SCOUTING</small><h2>스카우트가 후보를 추리는 중</h2><div class="pg"><i style="width:${draft.prog||10}%"></i></div><div class="steps"><p class="ok">${POSK[draft.pos]} 후보군 추리기</p><p class="ok">주발·체격 대조</p><p>잠재력 평가</p></div></section></main>`;
  const d=L.POSDEF[draft.pos];
  return `<main class="body"><div class="row"><button class="ibtn" data-act="create">‹</button><h2>스카우트 리포트</h2></div>
   <p class="muted">세 후보는 능력치 총합이 비슷하고 분포만 달라요. 재능 등급은 20세가 되면 확정돼요. 그 전에는 스카우터가 범위로만 알려줘요.</p>
   <div class="scout">${draft.cands.map((c,i)=>`<button class="cand ${draft.pick===i?"on":""}" data-act="cand" data-v="${i}"><div class="hd"><b>후보 ${i+1} · ${esc(c.p.typeName)}</b><b>${c.p.ovr}</b></div>
     ${d.stats.map(([k,n])=>`<div class="sbar"><span>${n}</span><div class="bar"><i style="width:${c.p.stats[k]}%"></i></div><b>${c.p.stats[k]}</b></div>`).join("")}<small class="muted">${c.p.height}cm ${c.p.weight}kg · ${c.p.foot} · ${esc(L.traitName(c.p.trait))} · ${esc(c.family.name)}</small></button>`).join("")}</div>
   <div class="cta"><button class="big ${draft.pick<0?"needs":""}" data-act="start"><span>${draft.pick<0?"후보를 골라 주세요 ↑":"후보 "+(draft.pick+1)+"로 시작"}</span><b>→</b></button></div></main>`;
}

/* ================= 드래프트 (지명 확률 · 해외 직행) ================= */
function ensureDr(){ if(!S.dr) S.dr={rolled:false,ok:false,chance:L.draftChance(S),direct:L.overseasDirect(S)}; return S.dr; }
function draftView(){
  const dr=ensureDr(); const finalDraft=age()>=22;
  const pay=o=>{ const c=L.clubPayroll(S,o.club.id,o.club.lg); return c?`<small>구단 최고 ${money(c.top.sal)} · 최저 ${money(c.low.sal)}</small>`:""; };
  const card=(o,i,act)=>`<button class="offer" data-act="${act}" data-v="${i}">${emblem(o.club,52)}<div><b>${esc(o.club.name)}</b><small>${esc(o.tag||L.lgLabel(o.club.lg))} · 전력 ${o.lvl} · 예상 ${esc(o.role)}</small>${pay(o)}<span class="sal">연봉 ${money(o.salary)} · ${o.years}년</span></div></button>`;
  let h=`<main class="body"><small class="kick">K LEAGUE DRAFT</small><h2>프로 입단 도전</h2>
   <section class="card"><div class="row"><div class="grow"><b>${esc(S.p.name)}</b><br><small class="muted">${POSK[S.p.pos]} · OVR ${S.p.ovr} · ${esc(scoutLabel())}</small></div><div class="stat"><small>지명 확률</small><b style="color:${dr.chance>=60?"var(--acc)":dr.chance>=30?"var(--gold)":"var(--red)"}">${dr.chance}%</b></div></div>
    <div class="bar ${dr.chance<30?"warn":""}"><i style="width:${dr.chance}%"></i></div>
    <p class="muted">능력치와 잠재력으로 정해져요. ${finalDraft?"이번이 마지막 기회예요. 지명받지 못하면 프로의 꿈은 여기까지예요.":"지명받지 못해도 대학에 진학해 성장한 뒤 다시 도전할 수 있어요."}</p></section>`;
  if(!dr.rolled){
    h+=`<button class="big" data-act="draftgo"><span>드래프트 참가</span><b>→</b></button>`;
    if(dr.direct.length){ h+=`<h3 class="sec">해외 직행 (프리미어리그)</h3><p class="muted">지명 결과를 기다리지 않고 바로 해외 구단 2군(U21) 계약을 맺어요. 큰 환경에서 성장하지만 출전 기회는 적어요.</p>${dr.direct.map((o,i)=>card(o,i,"signdirect")).join("")}`; }
    if(!finalDraft) h+=`<button class="wide" data-act="univ">드래프트 대신 대학 진학 (성장 후 재도전)</button>`;
  } else if(dr.ok){
    h+=`<p class="note good">🎉 지명에 성공했어요! 입단 제의가 도착했어요.</p>${S.offers.map((o,i)=>card(o,i,"sign")).join("")}`;
    if(dr.direct.length) h+=`<h3 class="sec">해외 직행도 가능해요</h3>${dr.direct.map((o,i)=>card(o,i,"signdirect")).join("")}`;
    if(!finalDraft) h+=`<button class="wide" data-act="univ">대학 진학 (성장 후 재도전)</button>`;
  } else {
    h+=`<p class="note warn">😢 이번 드래프트에서는 어느 구단에도 지명받지 못했어요.</p>`;
    if(dr.direct.length) h+=`<h3 class="sec">해외 직행 (프리미어리그)</h3>${dr.direct.map((o,i)=>card(o,i,"signdirect")).join("")}`;
    if(!finalDraft) h+=`<button class="big" data-act="univ"><span>대학에 진학해 다시 도전</span><b>→</b></button>`;
    h+=`<button class="wide red" data-act="quitdraft">축구를 접는다</button>`;
  }
  return h+`</main>`;
}

/* ================= 시즌 탭 ================= */
function meters(){
  const m=(n,v,cls)=>`<div class="meter"><span>${n}</span><div class="bar ${cls||""}"><i style="width:${v}%"></i></div><b>${Math.round(v)}</b></div>`;
  return `<section class="card flat">${m("컨디션",S.cond,S.cond<50?"warn":"")}${m("사기",S.morale,S.morale<40?"warn":"")}${m("인기",S.fame,"gold")}<div class="row"><small class="muted">보유 자금 <b style="color:var(--gold)">${money(S.funds)}</b></small><span class="grow"></span><button class="ghost" data-act="shop" style="min-height:36px">💸 소비·후원</button></div></section>`;
}
function timeline(){
  const cur=S.sim?S.sim.seg:-1; const segs=S.sim?S.sim.segs:L.segsFor(S);
  return `<div class="tl">${segs.map((s,i)=>`<div class="${S.phase==="result"||i<cur?"done":i===cur?"now":""}"><b>${s.label}</b>${s.months}</div>`).join("")}</div>`;
}
function seasonTab(){
  if(S.military==="serving"&&S.milKind==="army"&&S.phase==="prep") return armyView();
  const ph=S.phase;
  if(ph==="prep") return prepView();
  if(ph==="run") return runView();
  if(ph==="result") return resultView();
  if(ph==="offseason") return offseasonView();
  return "";
}
function armyView(){
  return `<small class="kick">${S.year} 시즌</small><h2>군 복무 ${S.mildone+1}/2년차</h2><section class="card"><p class="muted">현역으로 복무 중이에요. 이번 해는 경기에 나갈 수 없고 몸 상태가 조금 떨어져요.</p></section>
   <div class="cta"><button class="big" data-act="army"><span>한 해 보내기</span><b>→</b></button></div>`;
}

/* 훈련 설정 (시즌 준비 · 구간마다 다시 바꿀 수 있어요) */
function allocLeft(){ const al=plan.alloc||{}; return L.familyPts(S)-Object.values(al).reduce((a,b)=>a+(b|0),0); }
function planEditor(){
  const d=L.POSDEF[S.p.pos], p=S.p, ws=L.weakStrong(S); const T=L.TIERS;
  const tierBtns=["basic","mid","top"].map(t=>{ const c=L.trainCost(S,t); return `<button class="trainbtn ${plan.tier===t?"on":""}" data-act="tier" data-v="${t}"><b>${T[t].name}</b><small>${T[t].desc}</small><em>${c?"구간당 "+money(c):"무료"}</em></button>`; }).join("");
  const stat=d.stats.map(([k,n])=>{ const i=L.trainInfo(S,k,plan.tier); return `<button class="trainbtn ${plan.focus===k?"on":""}" data-act="focus" data-v="${k}"><b>${n} 훈련</b><small>현재 ${p.stats[k]} · ${L.PHYS.has(k)?"체력형":"기술형"}</small><em>${i.chance?"능력치 +1 성공 확률 "+i.chance+"%":"이 등급으론 더 못 올라요"}</em></button>`; }).join("");
  const inv=[["", "투자 안 함","비용 없음"]].concat(Object.entries(L.INV_SEG).map(([k,v])=>{ const c=r1(v.cost*L.priceScale(S)); let tgt=""; if(k==="weak"){ const i=L.trainInfo(S,ws.weak,plan.tier); tgt=" → "+ws.names[ws.weak]+" ("+(i.chance*.8|0)+"%)"; } if(k==="strong"){ const i=L.trainInfo(S,ws.strong,plan.tier); tgt=" → "+ws.names[ws.strong]+" ("+(i.chance*.8|0)+"%)"; } return [k,v.name,v.desc+tgt+" · 비용 "+money(c)]; }));
  return `<h3 class="sec" id="sec-tier">트레이너 등급 <small class="muted">능력치가 높을수록 상위 트레이너가 필요해요</small></h3><div class="grid2">${tierBtns}</div>
   <h3 class="sec" id="sec-train">훈련 방향 <small class="muted">성공하면 해당 능력치 +1</small></h3><div class="grid2">${stat}
    <button class="trainbtn ${plan.focus==="rest"?"on":""}" data-act="focus" data-v="rest"><b>휴식·회복</b><small>컨디션 +10 · 사기 +1</small></button>
    <button class="trainbtn ${plan.focus==="media"?"on":""}" data-act="focus" data-v="media"><b>미디어 활동</b><small>인기 +2~4</small></button></div>
   <h3 class="sec" id="sec-invest">자기 투자</h3><div class="grid2">${inv.map(([k,n,s])=>`<button class="trainbtn ${plan.invest===k?"on":""}" data-act="invest" data-v="${k}"><b>${n}</b><small>${s}</small></button>`).join("")}</div>
   ${famCard()}`;
}
function r1(v){ return Math.round(v*10)/10; }
function famCard(){
  const pts=L.familyPts(S); if(!pts) return "";
  const al=plan.alloc||{}, left=allocLeft();
  return `<h3 class="sec" id="sec-fam">가정 지원 투자 <small class="muted">${esc(S.family.name)} · 남은 포인트 ${left}/${pts}</small></h3>
   <section class="card flat"><p class="muted">부모님의 지원을 어디에 쓸까요? 구간마다 다시 나눌 수 있어요. 집안 사정이 좋아지거나 나빠지면 포인트도 함께 바뀌어요. 해외 캠프는 대박이 터질 수도, 무리해서 지칠 수도 있어요.</p>
   ${L.INV_CATS.map(([k,n,dsc])=>`<div class="row"><div class="grow"><b>${n}</b><br><small class="muted">${dsc}</small></div><button class="ghost" data-act="al" data-v="${k}:-1" ${(al[k]|0)<=0?"disabled":""}>−</button><b style="min-width:26px;text-align:center;font-family:var(--f-num);font-size:18px">${al[k]|0}</b><button class="ghost" data-act="al" data-v="${k}:1" ${(al[k]|0)>=5||left<=0?"disabled":""}>＋</button></div>`).join("")}</section>`;
}
function compCard(){
  const key=S.stage==="youth"||S.stage==="univ"?"YOUTH":L.leagueKey(S); const names=[];
  names.push(key==="YOUTH"?(S.stage==="univ"?"대학 리그":(S.club.abroad?"해외 유스 리그":"유소년 리그")):L.lgLabel(key==="K1"&&S.club.lg==="MIL"?"MIL":key));
  if(key==="K1"||key==="K2") names.push("FA컵"); if(L.isForeign(key)) L.cupNames(key).forEach(n=>names.push(n)); if(key==="YOUTH") names.push("전국대회");
  if(key==="K1"&&S.acl) names.push("AFC 챔피언스리그 🌏"); if(L.isForeign(key)&&S.ucl) names.push("UEFA 챔피언스리그 ⭐");
  return `<p class="note">🏟 올해 출전 대회: ${names.map(esc).join(" · ")}${(key==="K1"&&S.acl)?"<br><small>지난 시즌 성적(또는 구단 전력)으로 AFC 챔피언스리그 출전권을 얻었어요.</small>":""}</p>`;
}
function prepView(){
  const p=S.p;
  const youthTip=S.stage==="youth"?`<p class="note">${esc(L.youthTeamName(S.club.short,age()))} · ${L.gradeLabel(age())}. ${age()<=15?"U15는 성장기라 성장이 8% 빠르고 출전 기회가 넉넉해요.":"U18는 리그 수준이 높아 어린 학년은 출전이 어려워요."} 유소년 리그에서 두각을 나타내면 연령별 대표팀과 해외 유스의 눈에 띄어요.</p>`:"";
  const mil=S.military==="sangmu"?`<p class="note">🎖 김천 상무 복무 중 (${S.mildone+1}/2년차)</p>`:"";
  return `<small class="kick">${L.seasonLabel(S)} 프리시즌 (${L.preMonths(S)})</small><h2>${yearLabel()} · ${L.seasonLabel(S)} 시즌 준비</h2>
   <section class="card prow"><div class="row">${emblem(S.club,56)}<div class="grow"><small class="muted">${esc(S.club.name)}</small><br><b>${esc(S.p.typeName)} · ${esc(subName())}</b><br><small class="muted">${esc(scoutLabel())}</small></div></div></section>
   ${youthTip}${mil}${compCard()}${meters()}
   ${planEditor()}
   <h3 class="sec">올해 일정</h3>${timeline()}
   <div class="cta"><button class="big ${plan.focus?"":"needs"}" data-act="begin"><span>${plan.focus?"훈련 후 시즌 시작":"훈련 방향을 골라 주세요 ↑"}</span><b>→</b></button></div>`;
}
function planSummary(){
  const d=L.POSDEF[S.p.pos]; const nm=plan.focus==="rest"?"휴식·회복":plan.focus==="media"?"미디어 활동":(d.stats.find(s=>s[0]===plan.focus)||[0,"미선택"])[1]+" 훈련";
  const al=plan.alloc||{}; const alTxt=L.INV_CATS.filter(([k])=>al[k]).map(([k,n])=>n+" "+al[k]).join(" · ");
  return `${nm} · ${L.TIERS[plan.tier].name}${plan.invest?" · "+L.INV_SEG[plan.invest].name:""}${alTxt?" · 가정 투자: "+alTxt:""}`;
}
function runView(){
  const sim=S.sim, nxt=sim.segs[sim.seg];
  return `<small class="kick">${L.seasonLabel(S)} ${nxt?nxt.label:""}</small><h2>${nxt?nxt.label+" · "+nxt.months:"시즌 종료"}</h2>${timeline()}${meters()}
   ${seg?segCard(seg):`<section class="card"><p class="muted">훈련 계획이 반영된 채로 시즌이 시작돼요.</p></section>`}
   ${nxt?`<section class="card flat"><div class="row"><div class="grow"><small class="kick">NEXT TRAINING</small><br><b>${esc(nxt.label)} 훈련 설정</b><br><small class="muted">${esc(planSummary())}</small></div><button class="ghost" data-act="planbtn">${planOpen?"접기":"변경"}</button></div></section>${planOpen?planEditor():""}`:""}
   ${tableCard(sim)}
   <div class="cta"><button class="big ${nxt&&!plan.focus?"needs":""}" data-act="next"><span>${nxt?(plan.focus?nxt.label+" 진행":"훈련 방향을 골라 주세요 ↑"):"시즌 결과 보기"}</span><b>→</b></button></div>`;
}
function segCard(o){
  const chips=o.recs.filter(r=>r.comp==="리그").map(r=>`<i class="${r.res}">${r.res==="W"?"승":r.res==="D"?"무":"패"}</i>`).join("");
  const cups=o.recs.filter(r=>r.comp!=="리그");
  return `<section class="card"><small class="kick">${o.label.toUpperCase()} RESULT</small><div class="row"><div class="grow"><b style="font-size:18px">${o.segStat.W}승 ${o.segStat.D}무 ${o.segStat.L}패</b><br><small class="muted">${o.rank}위 / ${o.N}팀 · 승점 ${o.pts}</small></div><div class="stat"><small>평점</small><b>${o.segStat.rt||"-"}</b></div></div>
   <div class="chipsr">${chips}</div>
   <div class="four"><div class="stat"><small>출전</small><b>${o.segStat.apps}</b></div><div class="stat"><small>골</small><b>${o.segStat.g}</b></div><div class="stat"><small>도움</small><b>${o.segStat.as}</b></div><div class="stat"><small>누적</small><b>${o.cum.g}G ${o.cum.a}A</b></div></div>
   ${cups.map(r=>`<p class="note ${r.res==="W"?"good":"warn"}">🏆 ${esc(r.comp)} ${esc(r.cupRound||"")} ${r.res==="W"?"통과":"탈락"} (${r.f}:${r.a}${r.pk?" 승부차기":""})${r.min?" · 평점 "+r.rt:" · 결장"}</p>`).join("")}
   ${o.inj?`<p class="note warn">🩹 ${esc(o.inj.part)} 부상 — ${o.inj.matches}경기 결장</p>`:""}
   ${o.paid?`<p class="muted">이번 구간 훈련·투자 비용 ${money(o.paid)}</p>`:""}</section>`;
}
/* 리그 순위표 전체: 승-무-패 · 득실 · 승점 (좌우·상하로 밀어서 볼 수 있어요) */
function fullTable(rows,meId){
  return `<div class="tablewrap"><div class="tab"><div class="tr hd full"><span>#</span><span>팀</span><span>경기</span><span>승-무-패</span><span>득실</span><span>승점</span></div>${rows.map((t,i)=>`<div class="tr full ${(t.me||t.id===meId)?"me":""}"><span>${i+1}</span><span>${esc(t.name)}</span><span>${t.p!=null?t.p:t.w+t.d+t.l}</span><span>${t.w}-${t.d}-${t.l}</span><span>${t.gf-t.ga>0?"+":""}${t.gf-t.ga}</span><span><b>${t.pts}</b></span></div>`).join("")}</div></div>`;
}
function tableCard(sim){
  const tab=Object.values(sim.tab).sort((x,y)=>y.pts-x.pts||(y.gf-y.ga)-(x.gf-x.ga)||y.gf-x.gf).map(t=>Object.assign({},t,{name:L.teamName(sim,t.id)}));
  return `<section class="card flat"><h3 class="sec">리그 순위 <small class="muted">밀어서 전체 보기</small></h3>${fullTable(tab,sim.myId)}</section>`;
}
function boardCard(R){
  if(!R.table) return ""; const b=R.board;
  const tabs=[["table","순위표"],["scorers","득점왕"],["assists","도움왕"],["ratings","평점 1위"]];
  const list=k=>{ const arr=b&&b[k]||[]; if(!arr.length) return `<p class="muted">기록이 없어요.</p>`; return `<div class="tab">${arr.map((x,i)=>`<div class="tr ${x.me?"me":""}" style="grid-template-columns:26px 1fr 1fr 44px"><span>${i+1}</span><span>${esc(x.name)}</span><span class="muted">${esc(x.team)}</span><span><b>${k==="ratings"?x.v.toFixed?x.v.toFixed(2):x.v:x.v}</b></span></div>`).join("")}</div>`; };
  return `<section class="card flat"><h3 class="sec">${esc(R.leagueName)} 최종 기록</h3><div class="chips">${tabs.map(([k,n])=>`<button data-act="btab" data-v="${k}" class="${boardTab===k?"on":""}">${n}</button>`).join("")}</div>
   ${boardTab==="table"?fullTable(R.table,null):list(boardTab)}</section>`;
}

/* ===== 시즌 결과 ===== */
function resultView(){
  const R=S.lastR; if(!R) return "";
  const gk=S.p.pos==="GK";
  const stats=R.military?[]:[["출전",R.apps],[gk?"무실점":"골",gk?R.cs:R.goals],[gk?"선발":"도움",gk?R.starts:R.assists],["평점",R.rating||"-"]];
  const comps=(R.cups||[]).map(c=>`<p class="note ${c.res==="우승"?"good":""}">🏟 ${esc(c.name)} — ${esc(c.res)}</p>`).join("");
  return `<small class="kick">${R.age}세 시즌</small><h2>${R.year} 시즌 결과</h2>
   <div class="pills"><span class="pill acc">${esc(R.leagueName)}</span><span class="pill">${esc(R.role||"")}</span>${R.rank?`<span class="pill gold">${R.rank}위 / ${R.N}팀</span>`:""}</div>
   ${stats.length?`<section class="four">${stats.map(([k,v])=>`<div class="stat"><small>${k}</small><b>${v}</b></div>`).join("")}</section>`:`<section class="card"><p class="muted">군 복무로 한 해를 보냈어요.</p></section>`}
   ${R.rank?`<section class="card flat"><div class="three"><div class="stat"><small>전적</small><b>${R.W}-${R.D}-${R.L}</b></div><div class="stat"><small>득실</small><b>${R.gf}:${R.ga}</b></div><div class="stat"><small>OVR</small><b>${R.ovr0}→${R.ovr1}</b></div></div></section>`:""}
   ${R.trophies.length?`<div class="pills">${R.trophies.map(t=>`<span class="pill gold">🏆 ${esc(t)}</span>`).join("")}</div>`:""}
   ${R.awards.length?`<div class="pills">${R.awards.map(a=>`<span class="pill gold">⭐ ${esc(a)} · ${esc(L.awardComp(a,R))}</span>`).join("")}</div>`:""}
   ${(R.records||[]).map(t=>`<p class="note good">🏅 ${esc(t)}</p>`).join("")}
   ${R.awards.some(a=>/베스트 11|올해의 팀/.test(a))&&!R.youth?`<button class="wide" data-act="xi">⭐ 이번 시즌 베스트 11 보기</button>`:""}
   ${R.ballon?`<button class="wide" data-act="ballon">🏅 발롱도르 후보 ${R.ballon.rank}위 — 30인 명단 보기</button>`:""}
   ${comps}${R.nextAcl?`<p class="note good">🌏 다음 시즌 AFC 챔피언스리그 출전권을 얻었어요!</p>`:""}${R.nextUcl?`<p class="note good">⭐ 다음 시즌 UEFA 챔피언스리그에 진출해요!</p>`:""}
   ${(R.natEvents||[]).map(e=>e.skipped?`<p class="note warn">🇰🇷 ${esc(e.name)} — ${esc(e.text)}</p>`:e.declined?`<p class="note warn">🇰🇷 ${esc(e.name)} — 소집 불참</p>`:`<p class="note ${e.title?"good":""}">🇰🇷 ${esc(e.name)} · ${esc(e.stage)} (팀 ${e.games||e.caps}경기 중 ${e.caps}경기 출전 · ${e.goals}골)${e.exempt?" · 병역 특례!":""}</p>`).join("")}
   ${R.injury?`<p class="note warn">🩹 ${esc(R.injury.text)}</p>`:""}${R.bonus?`<p class="note good">💰 옵션 보너스 ${R.bonus}억 (${(R.bonusHit||[]).map(esc).join(", ")})</p>`:""}
   ${R.endorse?`<p class="note ${R.endorse.ok?"good":"warn"}">🤝 ${esc(R.endorse.brand)} 광고 ${R.endorse.ok?"조건 달성":"조건 미달"} — ${money(R.endorse.pay)}</p>`:""}${R.famNote?`<p class="note">${esc(R.famNote)}</p>`:""}
   ${S.promoNote?`<p class="note">${esc(S.promoNote)}</p>`:""}
   ${boardCard(R)}
   ${R.table?`<button class="wide" data-act="det">${openDet?"▾":"▸"} 내 경기 기록 보기</button>${openDet?`<section class="card flat">${(R.matches||[]).filter(m=>m.min>0).slice(0,60).map(m=>`<div class="mrow ${m.res}"><b>${m.comp==="리그"?m.r+"R":esc(m.comp.slice(0,3))}</b><span>${m.home?"홈":"원정"} ${esc(L.teamName({teams:R.simTeams||[]},m.opp))}</span><small>${m.g?m.g+"골 ":""}${m.as?m.as+"도움 ":""}${m.rt}</small><em>${m.f}:${m.a}</em></div>`).join("")}</section>`:""}`:""}
   <div class="cta"><button class="big" data-act="offseason"><span>오프시즌으로</span><b>→</b></button></div>`;
}

/* ===== 오프시즌: 계약 · 이적 · 병역 · 광고 ===== */
function offseasonView(){
  if(!off) return "";
  if(S.stage!=="pro"){
    const ag=age()+1;
    return `<small class="kick">OFFSEASON</small><h2>${S.year+1}년을 준비해요</h2><section class="card"><p class="muted">${S.stage==="youth"?(ag>L.YOUTH_END?"유소년 과정을 마치고 프로 드래프트에 도전해요.":ag===16?"고등학교에 진학하며 U18 팀으로 올라가요.":"한 학년 올라가요."):(ag>=L.UNIV_DRAFT?"대학을 졸업하고 프로 드래프트에 도전해요.":"다음 학년으로 올라가요.")}</p></section>
     <div class="cta"><button class="big" data-act="nextyear"><span>다음 해로</span><b>→</b></button></div>`;
  }
  const lg=S.club.lg==="MIL"?"K1":S.club.lg, pay=L.clubPayroll(S,S.club.id,lg);
  let h=`<small class="kick">OFFSEASON · 이적 시장</small><h2>${S.year+1}년 오프시즌</h2>`;
  if(S.promoNote) h+=`<p class="note">${esc(S.promoNote)}</p>`;
  if(off.retire){ h+=`<section class="card"><p class="note warn">${esc(S.p.name)}의 나이와 기량으로는 더 이상 계약을 이어 가기 어려워요.</p></section><div class="cta"><button class="big" data-act="retire"><span>현역 은퇴</span><b>→</b></button></div>`; return h; }
  if(off.mil&&!off.milDone){
    h+=`<section class="card"><h3 class="sec">병역</h3><p class="muted">${off.mil.must?"올해는 병역을 해결해야 해요. 상무에 지원하거나 현역으로 입대해요.":"병역을 미리 해결할 수 있어요. 상무는 선발되어야 해요."}</p>
     ${off.mil.canMil?`<button class="wide" data-act="mil" data-v="sangmu">김천 상무 지원</button>`:`<p class="muted">상무 지원은 OVR 66 이상부터 가능해요.</p>`}
     <button class="wide" data-act="mil" data-v="army">현역 입대 (2년)</button>${off.mil.must?"":`<button class="ghost" data-act="mil" data-v="skip">나중에</button>`}</section>`;
  }
  if(S.military==="exempt") h+=`<p class="note good">🎖 병역 특례를 받아 병역 문제가 해결되었어요.</p>`;
  const c=off.contract; const inMil=S.club.lg==="MIL"||S.military==="serving"||S.military==="sangmu";
  if(inMil) h+=`<section class="card"><h3 class="sec">복무 중</h3><p class="muted">군 복무 중에는 월급 수준(연 0.3억)만 받고 계약을 새로 맺거나 이적할 수 없어요. 2년을 채우고 전역하면 원래 팀으로 돌아가요.</p></section>`;
  else if(S.contractYears<=1){
    const opts=L.incentiveOptions(S,c.offer);
    h+=`<section class="card"><h3 class="sec">재계약</h3><div class="three"><div class="stat"><small>현재 연봉</small><b>${money(c.last)}</b></div><div class="stat"><small>제시액</small><b>${money(c.offer)}</b></div><div class="stat"><small>${c.rate>=0?"+":""}${c.rate}%</small><b>${c.years}년</b></div></div>
     ${pay?`<div class="pay"><small>${esc(S.club.name)} 최고 연봉</small><b>${esc(pay.top.name)} ${money(pay.top.sal)}</b><small>최저 연봉</small><b>${esc(pay.low.name)} ${money(pay.low.sal)}</b><small>평균</small><b>${money(pay.avg)}</b></div>`:""}
     <span class="lab">연봉 옵션 (선택) — 기본급이 조금 낮아지는 대신, 조건을 채우면 시즌 끝에 보너스를 받아요</span>
     ${opts.map(o=>`<label class="chk"><input type="checkbox" data-act="inc" data-v="${o.id}" ${chosenInc.includes(o.id)?"checked":""}><div><b>${esc(o.label)}</b><small>달성 예상 ${o.prob}% · 보너스 ${o.bonus}억</small></div></label>`).join("")}
     <div class="grid2"><button class="ghost" data-act="renego" ${off.renego?"disabled":""}>재협상 (1회)</button><button class="ghost" data-act="accept">계약 수락</button></div>
     ${off.accepted?`<p class="note good">계약 완료: 연봉 ${money(S.salary)} · ${S.contractYears}년${S.incentives.length?" · 옵션 "+S.incentives.length+"개":""}</p>`:""}</section>`;
  } else h+=`<section class="card"><h3 class="sec">계약</h3><p class="muted">연봉 ${money(S.salary)} · 계약 ${S.contractYears}년 남음</p>${pay?`<div class="pay"><small>구단 최고 연봉</small><b>${money(pay.top.sal)}</b><small>구단 최저 연봉</small><b>${money(pay.low.sal)}</b></div>`:""}</section>`;
  if(S.endorse) h+=`<section class="card flat"><h3 class="sec">광고 계약 중</h3><p class="muted">${esc(S.endorse.brand)} · 연 ${money(S.endorse.fee)} · ${S.endorse.years}년 남음 — 조건: ${esc(S.endorse.clause.label)}</p></section>`;
  else if(off.endorse&&off.endorse.length) h+=`<h3 class="sec">광고 제의 <small class="muted">하나만 고를 수 있어요</small></h3>${off.endorse.map((o,i)=>`<button class="offer" data-act="endorse" data-v="${i}"><div><b>${esc(o.brand)}</b><small>${o.years}년 계약 · 조건: ${esc(o.clause.label)} (못 채우면 절반만)</small><span class="sal">연 ${money(o.fee)}</span></div></button>`).join("")}`;
  h+=`<h3 class="sec">이적 제의</h3>${off.transfers.length?off.transfers.map((o,i)=>`<button class="offer" data-act="transfer" data-v="${i}">${emblem(o.club,48)}<div><b>${esc(o.club.name)}</b><small>${esc(o.tag)} · 전력 ${o.lvl} · 예상 ${esc(o.role)}</small><span class="sal">연봉 ${money(o.salary)} · ${o.years}년</span></div></button>`).join(""):`<p class="muted">${inMil?"복무 중에는 이적 제의가 오지 않아요.":"지금은 들어온 이적 제의가 없어요."}</p>`}`;
  h+=`${L.canRetire(S)?`<button class="wide red" data-act="retire">현역 은퇴</button>`:""}
   <div class="cta"><button class="big ${(!inMil&&S.contractYears<=1&&!off.accepted)?"needs":""}" data-act="nextyear"><span>${(!inMil&&S.contractYears<=1&&!off.accepted)?"계약을 먼저 확정해 주세요 ↑":"다음 시즌으로"}</span><b>→</b></button></div>`;
  return h;
}

/* ================= 선수 / 커리어 / 소식 ================= */
function playerTab(){
  const p=S.p, d=L.POSDEF[p.pos], b=L.scoutBand(S);
  return `<section class="card"><div class="row"><div class="grow"><small class="kick">${esc(p.typeName)}</small><h2>${esc(p.name)}</h2><small class="muted">No.${p.number} · ${p.height}cm ${p.weight}kg · ${p.foot} · ${esc(L.traitName(p.trait))}${S.scoutFinal&&p.hidden?" · "+esc(L.traitName(p.hidden,true)):""}</small></div><div class="stat"><small>OVR</small><b style="font-size:30px;color:var(--acc)">${p.ovr}</b></div></div>
   ${d.stats.map(([k,n])=>`<div class="sbar"><span>${n}</span><div class="bar"><i style="width:${p.stats[k]}%"></i></div><b>${p.stats[k]}</b></div>`).join("")}
   <div class="three"><div class="stat"><small>최고 OVR</small><b>${p.peak}</b></div><div class="stat"><small>재능${b.final?"":" 예상"}</small><b>${b.label}</b></div><div class="stat"><small>나이</small><b>${age()}</b></div></div>
   ${b.final?"":`<p class="muted">재능 등급은 20세 시즌이 끝나면 확정돼요. 경기 결과와 성장에 따라 달라질 수 있어요.</p>`}</section>
   ${styleCard()}
   ${meters()}
   <section class="card flat"><h3 class="sec">계약</h3><div class="pay"><small>소속</small><b>${esc(S.club.name)}</b><small>연봉</small><b>${S.stage==="pro"?money(S.salary):"-"}</b><small>계약 기간</small><b>${S.stage==="pro"?S.contractYears+"년":"-"}</b><small>보유 자금</small><b>${money(S.funds)}</b><small>가정 환경</small><b>${S.family?esc(S.family.name)+(L.familyPts(S)?" · "+L.familyPts(S)+"점":""):"-"}</b><small>병역</small><b>${({none:"미필",exempt:"특례(면제)",sangmu:"상무 복무 중",serving:"현역 복무 중",served:"군필"})[S.military]||"-"}</b></div>${S.incentives.length?`<span class="lab">연봉 옵션</span>${S.incentives.map(o=>`<p class="muted">· ${esc(o.label)} (+${o.bonus}억)</p>`).join("")}`:""}
    ${S.endorse?`<p class="muted">🤝 ${esc(S.endorse.brand)} 광고 · 연 ${money(S.endorse.fee)}</p>`:""}${(S.cars||[]).length?`<p class="muted">🚗 보유 차량: ${(S.cars).map(c=>esc(c.name)).join(", ")}</p>`:""}
    <button class="wide" data-act="shop">💸 소비·후원</button></section>`;
}
function styleCard(){
  const p=S.p, r=L.roleDef(p.sub,p.role), f=L.footInfo(p.sub,p.foot), tr=L.TRAIT_LIST.find(t=>t.id===p.trait), ty=L.TYPES[p.pos].find(x=>x[0]===p.type);
  const hid=p.hidden&&L.scoutBand(S).final?L.HIDDEN_LIST.find(h=>h.id===p.hidden):null;
  return `<section class="card flat"><h3 class="sec">플레이 스타일</h3>
   <p><b>${esc(subName())}</b> <small class="muted">${esc(L.SUBINFO[p.sub]||"")}</small></p>
   ${r?`<p><b>${esc(r.name)}</b> <small class="muted">${esc(r.desc)}</small></p>`:""}
   <p><b>${esc(f.label)}</b> <small class="muted">${esc(f.text)}</small></p>
   ${ty?`<p><b>${esc(ty[1])}</b> <small class="muted">${esc(ty[3])}</small></p>`:""}
   ${tr?`<p><b>${tr.icon} ${esc(tr.name)}</b> <small class="muted">${esc(tr.desc)}</small></p>`:""}
   ${hid?`<p><b>${hid.icon} ${esc(hid.name)}</b> <small class="muted">${esc(hid.desc)}</small></p>`:""}
   <p><b>체격</b> <small class="muted">${esc(L.bodyText(p.pos,p.height,p.weight))}</small></p></section>`;
}
function careerTab(){
  const c=S.career, pro=S.history.filter(h=>!h.youth), yth=S.history.filter(h=>h.youth);
  const aw=S.awards.filter(a=>!a.youth), tr=S.trophies.filter(t=>!t.youth);
  const league=tr.filter(t=>/리그1 우승|리그2 우승|프리미어리그 우승/.test(t.name)).length;
  const lg=L.legacy(S);
  return `<section class="card"><small class="kick">PRO CAREER</small><div class="four"><div class="stat"><small>출전</small><b>${c.apps}</b></div><div class="stat"><small>골</small><b>${c.goals}</b></div><div class="stat"><small>도움</small><b>${c.assists}</b></div><div class="stat"><small>대표팀</small><b>${c.caps}</b></div></div>
    <div class="four"><div class="stat"><small>우승</small><b>${tr.length}</b></div><div class="stat"><small>리그우승</small><b>${league}</b></div><div class="stat"><small>수상</small><b>${aw.length}</b></div><div class="stat"><small>평점</small><b>${c.ratingN?(c.ratingSum/c.ratingN).toFixed(2):"-"}</b></div></div></section>
   ${honours()}
   ${S.ballon.length?`<section class="card flat"><h3 class="sec">발롱도르 순위</h3>${S.ballon.map(b=>`<p class="muted">${b.year} · <b>${b.rank}위</b> (${esc(b.club)})</p>`).join("")}</section>`:""}
   <section class="card flat"><h3 class="sec">시즌별 기록</h3>${pro.length?pro.slice().reverse().map(h=>`<div class="mrow"><b>${h.year}</b><span>${esc(h.club)}<br><small>${esc(h.leagueName)} ${h.rank?h.rank+"위":""}</small></span><small>${h.military?"군 복무":h.apps+"경기 "+h.goals+"G "+h.assists+"A"}</small><em>${h.ovr1||""}</em></div>`).join(""):`<p class="muted">프로 기록이 아직 없어요.</p>`}
    ${yth.length?`<h3 class="sec">유소년·대학 시절</h3>${yth.slice().reverse().map(h=>`<div class="mrow"><b>${h.age}세</b><span>${esc(h.club)}</span><small>${h.apps}경기 ${h.goals}G</small><em>${h.ovr1||""}</em></div>`).join("")}`:""}</section>
   ${valueChart()}
   <section class="card flat"><h3 class="sec">커리어 평가</h3><div class="pay"><small>커리어 점수</small><b>${lg.total}</b><small>예상 등급</small><b>${L.legacyGrade(lg.total)}</b></div></section>`;
}
function feedTab(){
  const mo=S.moments.slice().reverse();
  return `<section class="card flat"><h3 class="sec">최근 소식</h3>${S.feed.length?S.feed.slice(0,40).map(f=>`<div style="padding:8px 0;border-bottom:1px solid var(--line2)"><small class="muted">${esc(f.when)}</small><br><span>${f.tone>0?'<span class="dot"></span>':""}${esc(f.text)}</span></div>`).join(""):`<p class="muted">소식이 아직 없어요.</p>`}</section>
   <section class="card flat"><h3 class="sec">커리어 하이라이트</h3>${mo.length?mo.map(m=>`<div style="padding:8px 0;border-bottom:1px solid var(--line2)"><span class="pill gold">${esc(m.badge)}</span> <small class="muted">${m.year} · ${m.age}세 · ${esc(m.club)}</small><br>${esc(m.text)}</div>`).join(""):`<p class="muted">아직 하이라이트가 없어요.</p>`}</section>`;
}

/* ================= 명예의 전당 (서버 저장 · 친구와 비교) · 이벤트 도감 ================= */
const CFG=window.KL_CONFIG||{};
const hofOn=!!(CFG.SUPABASE_URL&&CFG.SUPABASE_ANON_KEY);
const HH={apikey:CFG.SUPABASE_ANON_KEY,Authorization:"Bearer "+CFG.SUPABASE_ANON_KEY,"Content-Type":"application/json"};
let hofRows=null, hofErr="", hofBusy=false;
function dexAdd(id){ const d=rd(DEX)||{}; d[id]=(d[id]||0)+1; wr(DEX,d); }
function dexView(){ const d=rd(DEX)||{}, all=L.dexAll(); const n=all.filter(x=>d[x.id]).length;
  return `<main class="body"><div class="row"><button class="ibtn" data-act="home">‹</button><h2>이벤트 도감</h2></div>
   <section class="card flat"><h3 class="sec">확률 도감 — 이벤트 규칙</h3>${L.EVENT_RULES.map(t=>`<p class="muted">· ${esc(t)}</p>`).join("")}</section>
   <p class="muted">지금까지 만난 이벤트 ${n}/${all.length}</p>${all.map(x=>d[x.id]?`<div class="card flat"><b>${esc(x.title)}</b><small class="muted">${x.story?esc(x.story)+" · ":""}만난 횟수 ${d[x.id]}회</small></div>`:`<div class="card flat" style="opacity:.55"><b>???</b><small class="muted">아직 만나지 못한 이벤트</small></div>`).join("")}</main>`; }
function mainClub(){ const e=Object.entries(S.clubYears||{}).sort((a,b)=>b[1]-a[1])[0]; return e?e[0]:S.club.name; }
function hofEntry(nick){
  const c=S.career, lg=L.legacy(S), tr=S.trophies.filter(t=>!t.youth), aw=S.awards.filter(a=>!a.youth&&!/후보/.test(a.name));
  return {nickname:nick,name:S.p.name,pos:POSK[S.p.pos],type_name:S.p.typeName,club:mainClub(),years:S.history.filter(h=>!h.youth).length,apps:c.apps,goals:c.goals,assists:c.assists,caps:c.caps,
    trophies:tr.length,awards:aw.length,ballon:S.ballon.filter(b=>b.rank===1).length,ballon_cand:S.ballon.length,wc:tr.filter(t=>/FIFA 월드컵 우승/.test(t.name)).length,peak:S.p.peak,
    score:lg.total,grade:L.legacyGrade(lg.total),jersey:(S.jersey||[]).length,cs:c.cs||0};
}
async function hofPost(row){
  if(!hofOn) throw new Error("서버 설정이 없어요");
  const r=await fetch(CFG.SUPABASE_URL+"/rest/v1/life_hof",{method:"POST",headers:Object.assign({Prefer:"return=minimal"},HH),body:JSON.stringify(row)});
  if(!r.ok) throw new Error(r.status===404?"서버에 life_hof 표가 아직 없어요":"등록 실패 ("+r.status+")");
}
async function hofLoad(){
  hofBusy=true; hofErr=""; render();
  try{ if(!hofOn) throw new Error("서버 설정이 없어요");
    const r=await fetch(CFG.SUPABASE_URL+"/rest/v1/life_hof?select=*&order=score.desc&limit=40",{headers:HH});
    if(!r.ok) throw new Error(r.status===404?"서버에 life_hof 표가 아직 없어요":"불러오기 실패 ("+r.status+")");
    hofRows=await r.json(); }
  catch(e){ hofErr=e.message; hofRows=[]; }
  hofBusy=false; render();
}
function hofView(){
  return `<main class="body"><div class="row"><button class="ibtn" data-act="home">‹</button><h2>친구들 명예의 전당</h2></div>
   <p class="muted">은퇴한 선수를 서버에 등록하면 친구들과 비교할 수 있어요. 선수를 누르면 내 최고 선수와 비교해요.</p>
   ${hofBusy?'<p class="muted c">불러오는 중…</p>':""}${hofErr?'<p class="note warn">'+esc(hofErr)+'</p>':""}
   ${(hofRows||[]).map((x,i)=>`<button class="offer" data-act="hofcmp" data-v="${i}"><b style="font-family:var(--f-num);color:var(--gold);width:26px">${i+1}</b><div><b>${esc(x.name)} <small class="muted">by ${esc(x.nickname)}</small></b><small>${esc(x.pos)} · ${esc(x.club)} · ${x.years}년 · ${x.goals}골 ${x.assists}도움${x.jersey?" · 영구결번":""}${x.ballon?" · 발롱도르 "+x.ballon+"회":""}</small></div><span class="pill gold">${esc(x.grade)} ${x.score}</span></button>`).join("")}
   ${!hofBusy&&hofRows&&!hofRows.length&&!hofErr?'<p class="muted c">아직 등록된 선수가 없어요.</p>':""}</main>`;
}
function bestLocal(){ const h=rd(HOF)||[]; return h.filter(x=>x.apps!=null).sort((a,b)=>b.score-a.score)[0]||null; }
function cmpHtml(a){
  const b=bestLocal(); if(!b) return `<div class="ov"><div class="sheet"><div class="grab"></div><h3>${esc(a.name)}</h3><p class="muted">내 쪽에 비교할 은퇴 선수가 없어요. 먼저 선수를 은퇴시켜 보세요.</p><button class="wide" data-act="mok">닫기</button></div></div>`;
  const rows=[["커리어 점수","score"],["전성기 OVR","peak"],["출전","apps"],["골","goals"],["도움","assists"],["대표팀","caps"],["우승","trophies"],["수상","awards"],["발롱도르","ballon"],["월드컵 우승","wc"],["영구결번","jersey"]];
  const w=rows.filter(r=>(b[r[1]]||0)>(a[r[1]]||0)).length, l=rows.filter(r=>(b[r[1]]||0)<(a[r[1]]||0)).length;
  return `<div class="ov"><div class="sheet"><div class="grab"></div><small class="kick">HEAD TO HEAD</small><h3>${esc(b.name)} vs ${esc(a.name)}</h3><p class="muted">내 ${esc(b.name)}(${esc(b.grade)}) · ${esc(a.nickname)}의 ${esc(a.name)}(${esc(a.grade)})</p>
   <div class="tab">${rows.map(([n,k])=>{ const x=b[k]||0,y=a[k]||0; return `<div class="tr" style="grid-template-columns:1fr 70px 70px"><span>${n}</span><span style="color:${x>y?"var(--acc)":"var(--muted)"};font-weight:${x>y?800:400}">${x}</span><span style="color:${y>x?"var(--gold)":"var(--muted)"};font-weight:${y>x?800:400}">${y}</span></div>`; }).join("")}</div>
   <p class="note ${w>l?"good":l>w?"warn":""}">${w>l?"내 선수가 "+w+"개 항목에서 앞서요!":l>w?"친구 선수가 "+l+"개 항목에서 앞서요.":"막상막하예요."}</p><button class="wide" data-act="mok">닫기</button></div></div>`;
}

/* ================= 공용 조각 ================= */
function valueChart(){
  const h=S.valueHist||[]; if(h.length<2) return "";
  const W=320,H=120,pad=14, mx=Math.max(...h.map(x=>x.val)), n=h.length;
  const px=i=>pad+(W-2*pad)*(n===1?0:i/(n-1)), py=v=>H-pad-(H-2*pad)*(Math.log(v+1)/Math.log(mx+1));
  const pts=h.map((x,i)=>px(i)+","+py(x.val)).join(" "); const peak=h.reduce((b,x,i)=>x.val>h[b].val?i:b,0);
  const money2=v=>v>=1?(Math.round(v*10)/10)+"억":Math.round(v*10000)+"만";
  return `<section class="card flat"><small class="kick">MARKET VALUE</small><h3 class="sec">몸값 흐름</h3>
   <svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block"><polyline points="${pad},${H-pad} ${pts} ${W-pad},${H-pad}" fill="rgba(255,207,74,.10)" stroke="none"/><polyline points="${pts}" fill="none" stroke="#ffcf4a" stroke-width="2.2"/>
   ${h.map((x,i)=>`<circle cx="${px(i)}" cy="${py(x.val)}" r="${i===peak?5:3}" fill="${i===peak?"#ffcf4a":x.mil?"#27d7ff":"#fff"}"/>`).join("")}</svg>
   <div class="pay"><small>최고 몸값</small><b>${money2(h[peak].val)} (${h[peak].year}, ${h[peak].age}세)</b><small>마지막 몸값</small><b>${money2(h[n-1].val)}</b></div>
   <p class="muted">몸값은 이적 시장 가치예요. 연봉과 달라요. 파란 점은 군 복무 시기예요. 복무 중에는 월급 수준(연 0.3억)만 받지만 선수 가치는 그대로 평가돼요.</p></section>`;
}
function honours(){
  const tr=S.trophies.filter(t=>!t.youth), aw=S.awards.filter(a=>!a.youth&&!/후보/.test(a.name));
  const ys=y=>"'"+String(y).slice(2);
  const grpT={}; tr.forEach(x=>{ (grpT[x.name]=grpT[x.name]||[]).push(ys(x.year)); });
  const grpA={}; aw.forEach(x=>{ (grpA[x.name]=grpA[x.name]||[]).push(ys(x.year)+(x.comp?"·"+x.comp:"")); });
  const row=(n,arr)=>`<div class="mrow" style="grid-template-columns:1fr 2fr"><b>${esc(n)}${arr.length>1?" ×"+arr.length:""}</b><small>${arr.map(esc).join(" · ")}</small></div>`;
  const trH=Object.entries(grpT).sort((x,y)=>y[1].length-x[1].length).map(([n,a])=>row(n,a)).join(""), awH=Object.entries(grpA).sort((x,y)=>y[1].length-x[1].length).map(([n,a])=>row(n,a)).join("");
  if(!trH&&!awH) return "";
  return `<section class="card flat"><small class="kick">HONOURS</small><h3 class="sec">우승 연혁</h3>${trH||'<p class="muted">우승 기록이 없어요.</p>'}${awH?'<h3 class="sec">개인 수상 (대회)</h3>'+awH:""}</section>`;
}
function playStyle(){
  const es=S.evStats; if(!es||es.n<3) return "";
  const rr=es.risk/es.n, name=rr>=.55?["🎲","과감한 승부사","확률이 낮아도 질러 보는 타입이었어요."]:rr<=.2?["🧭","신중한 모범생","안전한 길을 골라 흔들림이 적었어요."]:["⚖️","균형 잡힌 현실주의자","걸 때와 물러설 때를 알았어요."];
  return `<section class="card flat"><small class="kick">HOW YOU PLAYED</small><h3 class="sec">플레이 성향</h3><div class="row"><span style="font-size:42px">${name[0]}</span><div class="grow"><b style="font-size:18px">${name[1]}</b><br><small class="muted">${name[2]}</small></div></div>
   <div class="three"><div class="stat"><small>선택</small><b>${es.n}</b></div><div class="stat"><small>성공</small><b>${es.hit}</b></div><div class="stat"><small>운</small><b>${es.luck>=0?"+":""}${es.luck.toFixed(1)}</b></div></div>
   <p class="muted">모험(성공 확률 50% 이하) 선택 ${es.risk}번 중 ${es.riskHit}번 성공 · 운이 +면 기대보다 많이 성공한 거예요.</p></section>`;
}
function legendCard(){
  if(!L.compareLegends) return ""; const cmp=L.compareLegends(S); if(!cmp.list.length) return "";
  return `<section class="card flat"><small class="kick">LEGEND COMPARISON</small><h3 class="sec">역대 레전드와 비교</h3><p class="muted">${esc(cmp.type)} 타입 · 내 커리어 점수 <b>${cmp.mine}</b> (레전드 수치는 공개 기록 기반 근사치)</p>
   ${cmp.list.map(x=>`<div class="card" style="gap:6px"><div class="row"><div class="grow"><b>${esc(x.n)}</b>${x.typed?' <span class="pill acc">같은 유형</span>':""}<br><small class="muted">${esc(x.tag)}</small></div><span class="pill ${x.beat?"gold":""}">${x.beat?"넘어섰어요!":x.pct+"%"}</span></div>
    <div class="bar ${x.beat?"gold":""}"><i style="width:${Math.min(100,x.pct)}%"></i></div>
    <div class="pay">${x.rows.map(r=>`<small>${r[0]}</small><b style="color:${r[1]>=r[2]?"var(--acc)":"var(--muted)"}">${r[1]} <span class="muted">vs</span> ${r[2]}</b>`).join("")}</div></div>`).join("")}</section>`;
}
function chainHtml(){ const ch=L.clubChain(S); return ch.map(c=>c.mil?"🎖 "+c.name:c.name).join(" → "); }
/* ================= 은퇴 · 중도 포기 ================= */
function retiredView(){
  const lg=L.legacy(S), g=L.legacyGrade(lg.total), c=S.career, jr=S.jersey||[];
  return `<main class="body"><small class="kick">RETIREMENT</small><h1>${esc(S.p.name)}, 그라운드를 떠나다</h1>
   <p class="muted">${L.age(S)}세 · 프로 ${S.history.filter(h=>!h.youth).length}시즌 · ${esc(chainHtml())}</p>
   <div class="pills">${L.titlesOf(S).map(t=>`<span class="pill gold">🏷 ${esc(t)}</span>`).join("")}</div>
   ${jr.map(j=>`<section class="banner"><small>PERMANENTLY RETIRED NUMBER</small><div class="no">${j.number}</div><b>${esc(j.club)} 영구결번</b><small>${j.yrs}시즌 활약 · 우승 ${j.titles}회</small></section>`).join("")}
   <section class="hero"><small class="kick">LEGACY</small><div class="row"><h1 style="font-size:64px;color:var(--gold)">${g}</h1><div class="grow"><b style="font-size:24px;font-family:var(--f-num)">${lg.total}</b><br><small class="muted">커리어 점수</small></div></div></section>
   <section class="four"><div class="stat"><small>출전</small><b>${c.apps}</b></div><div class="stat"><small>골</small><b>${c.goals}</b></div><div class="stat"><small>도움</small><b>${c.assists}</b></div><div class="stat"><small>대표팀</small><b>${c.caps}</b></div></section>
   <section class="card flat"><div class="pay"><small>전성기 OVR</small><b>${S.p.peak}</b><small>우승</small><b>${S.trophies.filter(t=>!t.youth).length}회</b><small>수상</small><b>${S.awards.filter(a=>!a.youth).length}회</b><small>발롱도르 후보</small><b>${S.ballon.length}회</b><small>누적 옵션 보너스</small><b>${money(c.bonus||0)}</b><small>누적 광고 수입</small><b>${money(c.sponsor||0)}</b></div></section>
   ${valueChart()}${playStyle()}${honours()}${legendCard()}
   ${S.moments.length?`<section class="card flat"><h3 class="sec">하이라이트</h3>${S.moments.slice(-12).reverse().map(m=>`<p class="muted">${m.year} · ${esc(m.text)}</p>`).join("")}</section>`:""}
   <section class="card flat"><h3 class="sec">명예의 전당 등록</h3><p class="muted">서버에 등록하면 친구들이 내 선수를 보고 비교할 수 있어요.</p>${S.hofUp?'<p class="note good">등록 완료! 친구 명예의 전당에서 확인해 보세요.</p>':`<input type="text" id="nick" maxlength="12" placeholder="닉네임" value="${esc(((()=>{ try{ return localStorage.getItem("klife-nick")||""; }catch(e){ return ""; } })()))}"><button class="wide" data-act="hofup">서버에 등록</button>`}<button class="ghost" data-act="hoflist">친구들 명예의 전당 보기</button></section>
   ${childCard()}
   <button class="big" data-act="new"><span>새로운 인생 시작</span><b>→</b></button><button class="wide" data-act="home">K-라이프 홈</button></main>`;
}
function quitView(){
  const q=S.quit||{text:"축구를 그만두었습니다."};
  return `<main class="body"><small class="kick">ANOTHER LIFE</small><h1>${esc(S.p.name)}, 다른 길을 걷다</h1>
   <section class="hero"><p>${esc(q.text)}</p><p class="muted">${q.age}세 · ${q.year}년. 모든 운동선수가 성공하는 건 아니에요. 하지만 이 시간은 헛되지 않았어요.</p></section>
   <section class="card flat"><div class="pay"><small>최고 OVR</small><b>${S.p.peak}</b><small>유소년 기록</small><b>${S.career.youthApps}경기 ${S.career.youthGoals}골</b><small>가정 환경</small><b>${S.family?esc(S.family.name):"-"}</b></div></section>
   ${S.moments.length?`<section class="card flat"><h3 class="sec">하이라이트</h3>${S.moments.slice(-8).reverse().map(m=>`<p class="muted">${m.year} · ${esc(m.text)}</p>`).join("")}</section>`:""}
   <button class="big" data-act="new"><span>다시, 새로운 인생</span><b>→</b></button><button class="wide" data-act="home">K-라이프 홈</button></main>`;
}
function childCard(){
  const fam=L.childFamily(S);
  return `<section class="card flat"><small class="kick">NEXT GENERATION</small><h3 class="sec">세대 계승 — 자녀로 이어하기</h3>
   <p class="muted">부모(전성기 OVR ${S.p.peak})의 재능이 자녀에게 이어져요. 같은 포지션이면 안정적이고, 다른 포지션을 고르면 부모보다 훨씬 좋거나 훨씬 나쁜 재능이 나올 수 있어요. 집안 형편은 부모의 커리어로 정해져요 (<b>${esc(fam.name)}</b>).</p>
   <input type="text" id="kid" maxlength="8" placeholder="자녀 이름" value="${esc(S.p.name.slice(0,1))}">
   <div class="chips">${Object.keys(L.POSDEF).map(k=>`<button data-act="kidpos" data-v="${k}" class="${(draft.kidPos||S.p.pos)===k?"on":""}">${POSK[k]}${k===S.p.pos?" (부모와 같음)":""}</button>`).join("")}</div>
   <button class="wide" data-act="kid">자녀 키우기 →</button></section>`;
}

/* ================= 소비 · 후원 ================= */
function shopHtml(){
  const m=modals[0]; const row=(kind,it)=>{ const owned=(kind==="car"&&(S.cars||[]).some(c=>c.id===it.id))||(it.price>=40&&(S.owned||[]).includes(it.id));
    return `<div class="card flat" style="gap:4px"><div class="row"><div class="grow"><b>${esc(it.name)}</b> <span class="pill gold">${money(it.price)}</span><br><small class="muted">${esc(it.note)} · 사기 +${it.mood}${it.cond?" · 컨디션 +"+it.cond:""}${it.fame?" · 인기 +"+it.fame:""}${it.rep?" · 평판 +"+it.rep:""}</small></div><button class="ghost" data-act="buy" data-v="${kind}:${it.id}" ${owned||S.funds<it.price?"disabled":""}>${owned?"보유":"구매"}</button></div></div>`; };
  return `<div class="ov"><div class="sheet"><div class="grab"></div><small class="kick">SPENDING</small><h3>소비·후원</h3><p class="muted">보유 자금 <b style="color:var(--gold)">${money(S.funds)}</b> · 차량은 해마다 가격의 5%가 유지비로 나가요.</p>
   ${m.msg?`<p class="note ${m.ok?"good":"warn"}">${esc(m.msg)}</p>`:""}
   <h3 class="sec">자동차</h3>${L.CARS.map(c=>row("car",c)).join("")}<h3 class="sec">생활·기부</h3>${L.GIFTS.map(g=>row("gift",g)).join("")}
   <p class="muted">${S.endorse?"광고 계약 중: "+esc(S.endorse.brand):"광고 제의는 인기가 높아지면 오프시즌에 들어와요."}</p><button class="wide" data-act="mok">닫기</button></div></div>`;
}

/* ================= 팝업 ================= */
function modalHtml(){
  const m=modals[0];
  if(m.t==="shop") return shopHtml();
  if(m.t==="hofcmp") return cmpHtml(m.a);
  if(m.t==="grow"){ const g=m.g; return `<div class="ov center"><div class="sheet"><small class="kick">${esc(m.label)} · TRAINING RESULT</small><h3>능력치가 변했어요</h3>
    <div class="row"><div class="stat grow"><small>OVR</small><b>${g.ovr0} → ${g.ovr1}</b></div></div>
    ${g.changes.map(c=>`<div class="row"><b class="grow">${esc(c.name)}</b><b style="color:${c.d>0?"var(--acc)":"var(--red)"};font-family:var(--f-num);font-size:20px">${c.d>0?"▲ +":"▼ "}${c.d}</b></div>`).join("")}
    ${(m.notes||[]).map(n=>`<p class="note warn">${esc(n)}</p>`).join("")}<button class="big" data-act="mok"><span>확인</span><b>→</b></button></div></div>`; }
  if(m.t==="event"){
    const e=m.ev;
    const uc=e.ucl?" ucl":"";
    if(m.res){ const r=m.res; return `<div class="ov center${uc}"><div class="sheet evt"><span class="tagline">${esc(e.story||"EVENT")}</span><h3>${esc(e.title)}</h3><div class="res ${r.hit?"":"no"}"><b>${esc(r.text)}</b>${r.lines.length?`<small>${r.lines.map(esc).join(" · ")}</small>`:""}</div>
      <p class="muted">${r.safe?"안전한 선택 · 주사위 없이 확정 (효과 60%, 30% 확률로 작은 대가)":"🎲 주사위 "+r.roll+" / 성공 기준 "+r.need+" → "+(r.hit?"성공":"실패")}</p><button class="big" data-act="mok"><span>확인</span><b>→</b></button></div></div>`; }
    return `<div class="ov${uc}"><div class="sheet evt"><div class="grab"></div><span class="tagline">${esc(e.story?"스토리 · "+e.story:"EVENT · "+S.year)}</span><h3>${esc(e.title)}</h3><p class="muted">${esc(e.body)}</p>${e.opts.map((o,i)=>`<button class="opt" data-act="evopt" data-v="${i}"><b>${esc(o.label)}</b>${o.safe?`<p style="color:var(--acc)">안전한 선택 · 확정 (효과 60% · 30% 확률로 작은 대가)</p>`:(o.p!=null&&o.p<100)?`<p>성공 확률 ${o.p}%</p>`:`<p style="color:var(--acc)">확정</p>`}${o.costNote?`<small class="muted">${esc(o.costNote)}</small>`:""}</button>`).join("")}</div></div>`;
  }
  if(m.t==="nat"){ const r=m.r; return `<div class="ov center"><div class="sheet"><small class="kick">NATIONAL TEAM</small><h3>${esc(r.name)} ${r.year}</h3>${r.skipped||r.declined?`<p class="note warn">${esc(r.text)}</p>`:`<div class="banner" style="color:var(--txt);border-color:${r.title?"var(--gold)":"var(--line)"};background:var(--panel2)"><div class="no" style="font-size:34px">${esc(r.stage)}</div><small>${r.caps}경기 ${r.goals}골</small></div>${r.carry?`<p class="note good">🌟 ${esc(r.text)}</p>`:""}${r.golden?`<p class="note good">🏅 대회 MVP(골든볼)로 선정!</p>`:""}${r.exempt?`<p class="note good">🎖 병역 특례를 받았어요!</p>`:""}`}<button class="big" data-act="mok"><span>확인</span><b>→</b></button></div></div>`; }
  if(m.t==="callup"){ const c=m.c, refused=(S.nat&&S.nat.refused)||0; return `<div class="ov center"><div class="sheet"><small class="kick">CALL-UP</small><h3>${esc(c.name)} 대표팀 소집</h3><p class="muted">${esc(S.p.name)} 선수가 ${esc(c.name)} 명단에 이름을 올렸어요. 소집에 응할까요?</p>${refused?`<p class="note warn">지금까지 소집을 ${refused}번 거부했어요. 3번이 되면 '대표팀 기피자'로 낙인찍혀요.</p>`:""}
    <button class="big" data-act="callgo"><span>대회에 합류</span><b>→</b></button><button class="wide red" data-act="calldecl">불참한다 (인기·평판 하락)</button></div></div>`; }
  if(m.t==="ballon"){ const R=S.lastR; const lst=L.ballonList(S,R.ballon.rank); return `<div class="ov"><div class="sheet"><div class="grab"></div><small class="kick">BALLON D'OR ${R.year}</small><h3>후보 30인 · 내 순위 ${R.ballon.rank}위</h3><div class="tab">${lst.map(x=>`<div class="tr ${x.me?"me":""}" style="grid-template-columns:30px 1fr"><span>${x.rank}</span><span>${esc(x.name)}${x.me?" ◀":""}</span></div>`).join("")}</div><button class="wide" data-act="mok">닫기</button></div></div>`; }
  if(m.t==="sign") return `<div class="ov center"><div class="sheet"><small class="kick">CONTRACT</small><h3>${esc(m.title)}</h3>${m.lines.map(x=>`<p class="muted">${esc(x)}</p>`).join("")}<canvas id="signpad" width="640" height="240" class="signpad"></canvas><p class="muted c">아래 칸에 손가락(또는 마우스)으로 사인해 주세요</p><div class="grid2"><button class="ghost" data-act="signclear">지우기</button>${S.sign?`<button class="ghost" data-act="signprev">이전 사인 쓰기</button>`:`<span></span>`}</div><button class="big" data-act="signdone"><span>서명하고 계약 확정</span><b>✍</b></button><button class="wide" data-act="signcancel">다시 생각해 볼게요</button></div></div>`;
  if(m.t==="ucl") return `<div class="ov center ucl"><div class="sheet uclsheet"><div class="stars">★ ★ ★ ★ ★ ★ ★ ★</div><small class="kick">CHAMPIONS NIGHT</small><h3>챔피언스리그 · ${esc(m.label)}</h3>${m.recs.map(r=>`<div class="umatch"><span class="rd">${esc(r.cupRound||"")}</span><b>${esc(r.opp)}</b><em class="${r.res==="W"?"w":r.res==="L"?"l":"d"}">${r.f}:${r.a}${r.pk?" (PK "+r.pk[0]+"-"+r.pk[1]+")":""}</em><small>${r.min>0?(r.g?r.g+"골 ":"")+(r.as?r.as+"도움 ":"")+"평점 "+r.rt:"결장"}</small></div>`).join("")}<button class="big" data-act="mok"><span>계속</span><b>→</b></button></div></div>`;
  if(m.t==="xi") return `<div class="ov center"><div class="sheet"><small class="kick">BEST ELEVEN ${S.lastR.year}</small><h3>${esc(S.lastR.leagueName)} 베스트 11</h3><div class="xi">${m.list.map(x=>`<div class="${x.me?"me":""}"><b>${esc(x.slot)}</b><span>${esc(x.name)}${x.me?" ◀":""}</span><small>${esc(x.club)} · ${x.ovr}</small></div>`).join("")}</div><button class="big" data-act="mok"><span>닫기</span><b>→</b></button></div></div>`;
  if(m.t==="gold") return `<div class="ov center gold"><div class="sheet goldsheet"><div class="rays"></div><small class="kick">${esc(m.kick)}</small><div class="ball">⚽</div><h3>${esc(m.title)}</h3><p class="gsub">${esc(m.sub)}</p><p class="muted c">${esc(m.club)}</p>${m.lines.map(x=>`<p class="muted c">${esc(x)}</p>`).join("")}<button class="big" data-act="mok"><span>트로피 받기</span><b>🏆</b></button></div></div>`;
  if(m.t==="msg") return`<div class="ov center"><div class="sheet"><small class="kick">${esc(m.kick||"알림")}</small><h3>${esc(m.title)}</h3><p>${esc(m.body)}</p>${m.banner?`<div class="banner"><div class="no">${esc(m.banner)}</div></div>`:""}<button class="big" data-act="mok"><span>확인</span><b>→</b></button></div></div>`;
  return "";
}

/* ================= 흐름 ================= */
/* 로딩 팝업은 한 번만 띄우고 막대·문구만 바꿔요 (다시 그리지 않아서 깜빡이지 않아요) */
let ld=null;
function showLoading(kick,title,steps){
  hideLoading(); const el=document.createElement("div"); el.className="ov center load"; el.innerHTML=`<div class="sheet"><small class="kick">${esc(kick)}</small><h3>${esc(title)}</h3><div class="pg"><i style="width:6%"></i></div><div class="steps">${steps.map(s=>`<p>${esc(s)}</p>`).join("")}</div></div>`;
  document.body.appendChild(el); ld={el,steps}; return ld;
}
function setLoading(i,n){ if(!ld) return; ld.el.querySelector(".pg i").style.width=Math.round(i/n*100)+"%"; ld.el.querySelectorAll(".steps p").forEach((p,k)=>{ p.className=k<i?"ok":""; }); }
function hideLoading(){ if(ld){ ld.el.remove(); ld=null; } }
function runLoading(kick,title,steps,done){
  if(FAST){ done(); return; }
  showLoading(kick,title,steps); let i=0; const n=steps.length;
  const tick=()=>{ i++; setLoading(i,n); if(i<n) setTimeout(tick,520); else setTimeout(()=>{ hideLoading(); done(); },380); };
  setTimeout(tick,420);
}
function afterSegment(out){
  seg=out; const q=[];
  if(out.growth&&out.growth.changes.length) q.push({t:"grow",g:out.growth,label:out.label,notes:out.notes});
  else if(out.notes&&out.notes.length) q.push({t:"grow",g:{changes:[],ovr0:out.growth.ovr0,ovr1:out.growth.ovr1},label:out.label,notes:out.notes});
  out.callups.forEach(c=>q.push({t:"callup",c}));
  const uc=(out.recs||[]).filter(r=>r.cup==="ucl"); if(uc.length) q.push({t:"ucl",recs:uc,label:out.label});
  const uev=L.rollUclEvent?L.rollUclEvent(S,out):null; if(uev) q.push({t:"event",ev:uev});
  const ev=uev?null:L.rollEvent(S,out); if(ev) q.push({t:"event",ev});
  modals=q; save(); render();
}
function startSeason(){ L.beginSeason(S,Object.assign({},plan,{alloc:Object.assign({},plan.alloc)})); save(); }
function runNext(){
  if(!S.sim) return;
  if(S.sim.seg>=S.sim.segs.length){ finishSeason(); return; }
  const sg=S.sim.segs[S.sim.seg];
  L.setPlan(S,Object.assign({},plan,{alloc:Object.assign({},plan.alloc)}));
  runLoading(L.seasonLabel(S)+" 시즌",sg.label+" 진행 중",[sg.months+" 일정 확인","훈련·트레이닝","리그 경기 진행","컵 대회·대표팀 소집","기록 집계"],()=>{ const out=L.playSegment(S); afterSegment(out); });
}
function finishSeason(){
  runLoading(S.year+" 시즌","시즌 결산 중",["최종 순위 확정","개인 기록 집계","수상 후보 평가","재능 평가·성장 반영"],()=>{
    const sim=S.sim; const teams=sim?sim.teams:[];
    const R=L.finishSeason(S); R.simTeams=teams; seg=null; boardTab="table";
    if(R.scoutFinal){ const sf=R.scoutFinal; const hid=sf.hidden?" 그리고 스카우터가 숨은 재능을 발견했습니다 — "+L.traitName(sf.hidden,true)+". "+L.HIDDEN_LIST.find(h=>h.id===sf.hidden).desc:""; const txt={S:"세계 무대에서도 통할 재목입니다. 키우기에 따라 월드클래스가 될 수 있어요.",A:"국가대표급 잠재력이 보입니다. 꾸준히 성장하면 리그 정상급이 될 거예요.",B:"1군 주전으로 충분히 자리 잡을 재목입니다.",C:"재능은 평범하지만 노력으로 길을 개척할 수 있는 선수입니다."}[sf.grade];
      modals.push({t:"msg",kick:"SCOUT REPORT",title:"재능 딱지가 확정됐어요: "+sf.grade,body:"20세까지의 경기 결과와 성장을 종합한 스카우터의 최종 평가입니다. "+txt+hid,banner:sf.grade}); }
    else if(S.history.length===1&&!S.scoutedMid){ S.scoutedMid=true; modals.push({t:"msg",kick:"SCOUT REPORT",title:"스카우터의 첫 중간 평가: "+L.scoutBand(S).label,body:"아직은 범위로만 말할 수 있어요. 20세가 되면 경기 결과와 성장에 따라 하나로 확정됩니다."}); }
    if(R.ballon&&R.ballon.rank===1){ const n=S.ballon.filter(b=>b.rank===1).length; modals.unshift({t:"gold",kick:"BALLON D'OR "+R.year,title:esc0(S.p.name)+", 올해의 발롱도르",sub:(n>1?n+"번째 ":"")+"세계 최고의 선수로 선정됐어요",club:R.club.name,lines:[R.leagueName+" "+R.rank+"위 · "+R.goals+"골 "+R.assists+"도움 · 평점 "+R.rating,...(R.trophies.length?[R.trophies.join(" · ")]:[])]}); }
    save(); render();
  });
}
function esc0(s){ return String(s==null?"":s); }
function buildOff(){
  off={};
  if(S.stage==="pro"){
    off={contract:L.contractOffer(S),transfers:L.transferOffers(S),mil:L.militaryPrompt(S),milDone:false,renego:false,accepted:false,retire:false,endorse:L.endorseOffers(S)};
    if(S.military==="serving"||S.military==="sangmu"||S.club.lg==="MIL"){ off.transfers=[]; off.endorse=[]; }
    if(L.mustRetire(S)) off.retire=true;
    chosenInc=[];
  }
}
function goOffseason(){
  S.phase="offseason"; buildOff();
  if(S.stage==="pro"){
    const jh=L.jerseyHint(S); if(jh) modals.push({t:"msg",kick:"CLUB LEGEND",title:jh.name+"의 상징이 되어 가요",body:jh.yrs+"시즌째 한 팀에서 뛰고 있어요. 이대로 은퇴한다면 영구결번 이야기가 나올지도 몰라요."});
  }
  save(); render();
}
function doRetire(){
  const jr=L.jerseyRetired(S); S.jersey=jr; S.retired=true; view="retired";
  const h=rd(HOF)||[]; h.push(Object.assign(hofEntry(""),{retire:jr.length>0}));
  wr(HOF,h); save(); render();
}
function nextYear(){
  L.nextYear(S); off=null; seg=null; openDet=false; planOpen=false; S.promoNote=null;
  if(S.phase==="draft"){ S.dr=null; view="draft"; } else view="game";
  save(); render();
}
function finishPopup(){            // 팝업이 모두 끝난 뒤 처리(중도 포기 엔딩 등)
  if(!modals.length&&S&&S.retired&&S.quit&&view==="game"){ view="quit"; }
}

/* ================= 이벤트 위임 ================= */
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-act]"); if(!b) return; const act=b.dataset.act, v=b.dataset.v; if(b.tagName==="INPUT") return;
  if(ld) return;
  if(view==="create"||view==="scout") readForm();
  switch(act){
    case "home": view="home"; render(); break;
    case "tab": tab=v; render(); break;
    case "continue": view=S.retired?(S.quit?"quit":"retired"):S.phase==="draft"?"draft":"game"; tab="season"; render(); break;
    case "wipe": if(confirm("저장된 선수를 삭제할까요?")){ try{ localStorage.removeItem(KEY); }catch(_){} S=null; render(); } break;
    case "new": S=null; draft=NEWDRAFT(); plan=NEWPLAN(); view="create"; render(); break;
    case "pos": draft.pos=v; draft.sub=L.POSDEF[v].subs[0][0]; keep(render); break;
    case "sub": draft.sub=v; draft.role=""; keep(render); break;
    case "role": draft.role=v; keep(render); break;
    case "foot": draft.foot=v; keep(render); break;
    case "trait": draft.trait=v; keep(render); break;
    case "route": draft.route=v; if(v==="high"||v==="univ") draft.points.mentor=0; keep(render); break;
    case "pt": { const [k,d]=v.split(":"); const nx=draft.points[k]+(+d); if(nx<0||nx>5||(+d>0&&ptsLeft()<=0)) break; draft.points[k]=nx; keep(render); break; }
    case "create": view="create"; render(); break;
    case "scout":
      if(!draft.name.trim()){ hint("#sec-name","이름을 먼저 적어 주세요"); break; }
      if(ptsLeft()>0){ hint("#sec-pts","포인트 "+ptsLeft()+"개가 남았어요. 모두 나눠 주세요"); break; }
      draft.cands=makeCands(); draft.pick=-1;
      if(FAST){ view="scout"; render(); break; }
      view="scout"; draft.loading=true; draft.prog=10; render(); setTimeout(()=>{ draft.prog=55; render(); setTimeout(()=>{ draft.loading=false; render(); },700); },650); break;
    case "cand": draft.pick=+v; keep(render); break;
    case "start": { if(draft.pick<0){ hint(".cand","후보를 한 명 골라 주세요"); break; } S=draft.cands[draft.pick]; plan=NEWPLAN(); view=S.phase==="draft"?"draft":"game"; tab="season";
      if(S.phase==="draft") S.dr=null; else modals.push({t:"msg",kick:"FAMILY",title:S.family.name,body:S.family.note+". 해마다 지원 포인트 "+S.family.pts+"점으로 성장 투자를 고를 수 있고, 구간마다 다시 나눌 수 있어요. 가정 형편은 살다 보면 바뀌기도 해요."});
      save(); render(); break; }
    case "draftgo": { const dr=ensureDr(); dr.rolled=true; dr.ok=Math.random()*100<dr.chance; if(dr.ok) S.offers=L.draftOffers(S); else S.offers=[]; save(); render(); break; }
    case "sign": { const o=S.offers[+v]; askSign("프로 계약서 · "+o.club.name,["연봉 "+money(o.salary)+" · "+o.years+"년 계약","예상 역할 "+o.role],()=>{ L.signWith(S,o); S.dr=null; view="game"; tab="season"; save(); render(); }); break; }
    case "signdirect": { const o=S.dr.direct[+v]; askSign("해외 직행 계약서 · "+o.club.name,["연봉 "+money(o.salary)+" · "+o.years+"년 계약","프리미어리그 2군(U21)에서 시작해요"],()=>{ L.signWith(S,o); S.abroadYouth=true; S.dr=null; view="game"; tab="season"; save(); render(); }); break; }
    case "signclear": { const cv=$("signpad"); if(cv){ cv.getContext("2d").clearRect(0,0,cv.width,cv.height); signDirty=false; } break; }
    case "signprev": { const cv=$("signpad"), im=new Image(); im.onload=()=>{ const c=cv.getContext("2d"); c.clearRect(0,0,cv.width,cv.height); c.drawImage(im,0,0,cv.width,cv.height); signDirty=true; }; im.src=S.sign; break; }
    case "signcancel": modals.shift(); keep(render); break;
    case "signdone": { if(!signDirty){ say("사인을 먼저 해 주세요"); break; } const cv=$("signpad"); S.sign=cv.toDataURL("image/png"); const m=modals.shift(); save(); if(m&&m.fn) m.fn(); break; }
    case "univ": L.chooseUniv(S); S.dr=null; view="game"; tab="season"; save(); render(); break;
    case "quitdraft": L.quitCareer(S,"draft","프로 구단의 지명을 받지 못해 축구를 접기로 했습니다."); S.dr=null; view="quit"; save(); render(); break;
    case "focus": plan.focus=v; keep(render); break;
    case "tier": plan.tier=v; keep(render); break;
    case "invest": plan.invest=v; keep(render); break;
    case "planbtn": planOpen=!planOpen; keep(render); break;
    case "al": { const [k,d]=v.split(":"); plan.alloc=plan.alloc||{}; const cur=plan.alloc[k]|0, nx=cur+(+d); if(nx<0||nx>5||(+d>0&&allocLeft()<=0)) break; plan.alloc[k]=nx; keep(render); break; }
    case "begin": if(!plan.focus){ hint("#sec-train","훈련 방향을 골라 주세요"); break; } startSeason(); seg=null; render(); runNext(); break;
    case "next": if(S.sim&&S.sim.seg<S.sim.segs.length&&!plan.focus){ planOpen=true; keep(render); setTimeout(()=>hint("#sec-train","훈련 방향을 골라 주세요"),30); break; } runNext(); break;
    case "army": { const R=L.armyYear(S); S.lastR=R; save(); render(); break; }
    case "det": openDet=!openDet; keep(render); break;
    case "btab": boardTab=v; keep(render); break;
    case "ballon": modals.push({t:"ballon"}); render(); break;
    case "xi": modals.push({t:"xi",list:L.bestXI(S,S.lastR)}); render(); break;
    case "shop": modals.push({t:"shop"}); keep(render); break;
    case "buy": { const [kind,id]=v.split(":"); const r=L.buyItem(S,kind,id); const m=modals[0]; if(m&&m.t==="shop"){ m.msg=r.text; m.ok=r.ok; } save(); keep(render); break; }
    case "endorse": { const o=off.endorse[+v]; L.signEndorse(S,o); off.endorse=[]; save(); say(o.brand+"와 광고 계약을 맺었어요"); break; }
    case "offseason": goOffseason(); break;
    case "nextyear": if(off&&S.stage==="pro"&&S.contractYears<=1&&!off.accepted&&!(S.club.lg==="MIL"||S.military==="serving"||S.military==="sangmu")){ hint("[data-act=accept]","계약을 먼저 확정해 주세요"); break; } nextYear(); break;
    case "inc": chosenInc=chosenInc.includes(v)?chosenInc.filter(x=>x!==v):chosenInc.concat(v); keep(render); break;
    case "renego": { if(off.renego) break; const n=L.negotiate(S,off.contract); off.renego=true; const o=Object.assign({},off.contract,{offer:n.offer,rate:n.rate}); off.contract=o; say(n.mult>1?"협상 성공! 연봉이 올랐어요":n.mult<1?"역효과… 구단이 제시액을 낮췄어요":"구단이 기존 제안을 유지했어요"); break; }
    case "accept": { const o=L.applyIncentives(S,off.contract,chosenInc); askSign("재계약서 · "+S.club.name,["연봉 "+money(o.offer)+" · "+o.years+"년"],()=>{ L.acceptContract(S,o); off.accepted=true; save(); keep(render); }); break; }
    case "transfer": { const o=off.transfers[+v]; askSign("이적 계약서 · "+o.club.name,["연봉 "+money(o.salary)+" · "+o.years+"년 계약"],()=>{ if(L.doTransfer(S,o)===false){ say("군 복무 중에는 이적할 수 없어요"); return; } off.accepted=true; off.transfers=[]; off.contract={last:o.salary,offer:o.salary,rate:0,years:o.years}; S.contractYears=o.years; save(); say(o.club.name+"(으)로 이적했어요"); }); break; }
    case "mil": { if(v==="skip"){ off.milDone=true; } else { L.enlist(S,v); off.milDone=true; off.transfers=[]; off.endorse=[]; off.contract=L.contractOffer(S); } save(); keep(render); break; }
    case "retire": doRetire(); break;
    case "kidpos": { const k=(document.getElementById("kid")||{}).value; draft.kidName=k; draft.kidPos=v; keep(render); break; }
    case "kid": { const nm=((document.getElementById("kid")||{}).value||draft.kidName||"").trim(); if(nm.length<2){ say("자녀 이름을 두 글자 이상 적어 주세요"); break; } const pos=draft.kidPos||S.p.pos; const res=L.createChild(S,{name:nm,pos,trait:S.p.trait}); const par=S; S=res.state; plan=NEWPLAN(); view="game"; tab="season"; save();
      const tl=res.talent; modals.push({t:"msg",kick:"NEXT GENERATION",title:nm+" — "+par.p.name+"의 "+(S.gen)+"세대",body:(tl.same?"부모와 같은 포지션이라 재능이 안정적으로 이어졌어요.":"다른 포지션을 선택해 재능이 크게 달라질 수 있었어요.")+" 재능 바탕 "+tl.base+" (±"+tl.spread+" 범위)에서 뽑은 결과는 비밀이에요. 20세가 되면 스카우터가 알려줄 거예요. 집안 형편: "+S.family.name+"."}); render(); break; }
    case "dex": view="dex"; render(); break;
    case "hoflist": view="hof"; render(); hofLoad(); break;
    case "hofcmp": modals.push({t:"hofcmp",a:hofRows[+v]}); render(); break;
    case "hofup": { const nk=(document.getElementById("nick")||{}).value||""; if(!nk.trim()){ say("닉네임을 적어 주세요"); break; } try{ localStorage.setItem("klife-nick",nk.trim()); }catch(_){} hofPost(hofEntry(nk.trim())).then(()=>{ S.hofUp=true; save(); keep(render); say("명예의 전당에 등록했어요"); }).catch(e=>say(e.message)); break; }
    case "mok": modals.shift(); finishPopup(); save(); keep(render); if(!modals.length&&!window.__keepScrollOnClose) {} break;
    case "evopt": { const m=modals[0]; m.res=L.resolveEvent(S,m.ev,+v); dexAdd(m.ev.id); save(); keep(render); break; }
    case "callgo": { const m=modals[0]; modals[0]={t:"nat",r:L.joinTournament(S,m.c)}; save(); keep(render); break; }
    case "calldecl": { const m=modals[0]; modals[0]={t:"nat",r:L.declineCall(S,m.c)}; save(); keep(render); break; }
  }
});
document.addEventListener("input",e=>{ if(e.target.id==="ht"||e.target.id==="wt"){ draft.height=(document.getElementById("ht")||{}).value||""; draft.weight=(document.getElementById("wt")||{}).value||""; const bf=document.getElementById("bodyfx"); if(bf) bf.textContent=bodyLine(); } if(e.target.id==="nm"){ draft.name=e.target.value; } });
window.__LIFE={get S(){return S;},get view(){return view;},act:(a,v)=>{ const el=document.createElement("button"); el.dataset.act=a; if(v!=null) el.dataset.v=v; document.body.appendChild(el); el.click(); el.remove(); },render,draftSet:o=>Object.assign(draft,o),getPlan:()=>plan,setPlan:p=>{plan=p;},get modals(){return modals;},get off(){return off;},get seg(){return seg;}};
render();
})();

/* K-라이프 화면 (모바일 우선). 계산은 js/life/engine.js 와 nat/awards/events (window.LIFE) */
(function(){
"use strict";
const L=window.LIFE, K=window.KLCore;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const KEY="klife-save", HOF="klife-hof";
const rd=k=>{ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } };
const wr=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
const app=$("app");
const FAST=!!window.__LIFE_FAST||/[?&]fast/.test(location.search)||(()=>{ try{ return localStorage.getItem("klife-fast")==="1"; }catch(e){ return false; } })();               // 점검용: 로딩 연출을 건너뛰어요

let S=rd(KEY); if(S&&S.v!==L.STATE_VER) S=null;
let view=S?(S.retired?"retired":S.phase==="draft"?"draft":"game"):"home";
let tab="season";
let draft={name:"",number:"",pos:"FW",sub:"ST",foot:"오른발",height:"",weight:"",trait:"effort",route:"mid",cands:null,pick:-1,loading:false};
let plan={focus:"",invest:"",alloc:{}};
let seg=null;                       // 방금 끝난 구간 결과
let modals=[];                      // 순서대로 보여줄 팝업 {t,...}
let loading=null, toast=null, off=null, openDet=false, chosenInc=[];
const POSK={FW:"공격수",MF:"미드필더",DF:"수비수",GK:"골키퍼"};
const TRAITS=()=>L.TRAIT_LIST;
const money=v=>v>=1?(Math.round(v*10)/10)+"억 원":Math.round(v*10000)+"만 원";
const save=()=>{ if(S) wr(KEY,S); };
const age=()=>L.age(S);
const subName=()=>{ const d=L.POSDEF[S.p.pos].subs.find(s=>s[0]===S.p.sub); return d?d[1]:S.p.sub; };
const grade=v=>v>=85?["S","g-s"]:v>=75?["A","g-a"]:v>=65?["B","g-b"]:v>=55?["C","g-c"]:["D","g-d"];
const potShown=()=>S.history.length>0;
function emblem(club,size){
  const name=club?club.name:"?", code=club&&(club.code||(window.KL_CLUB_CODE||{})[club.id||club.name]);
  const hue=[...name].reduce((h,c)=>(h*31+c.charCodeAt(0))%360,0), ini=esc(name.replace(/[^\p{L}\p{N}]/gu,"").slice(0,2)), sz=size||44;
  if(code&&window.KL_EMBLEM_URL&&window.KL_CRESTS_ON) return `<span class="emb" style="--s:${sz}px;--h:${hue}"><i>${ini}</i><img src="${KL_EMBLEM_URL(code)}" alt="" onerror="this.remove()"></span>`;
  return `<span class="emb" style="--s:${sz}px;--h:${hue}"><i>${ini}</i></span>`;
}
const yearLabel=()=>S.stage==="pro"?"프로 "+(S.history.filter(h=>!h.youth).length+1)+"년차":L.gradeLabel(age());

/* ================= 렌더 ================= */
function render(){
  if(S&&view==="game"&&S.phase==="offseason"&&!off) buildOff();
  let h="", nav=false;
  if(view==="home") h=homeView();
  else if(view==="create") h=createView();
  else if(view==="scout") h=scoutView();
  else if(view==="draft") h=draftView();
  else if(view==="retired") h=retiredView();
  else if(view==="hof") h=hofView();
  else { nav=true; h=header()+`<main class="body">${tab==="season"?seasonTab():tab==="player"?playerTab():tab==="career"?careerTab():feedTab()}</main>`+navHtml(); }
  app.className="phone"+(nav?"":" nonav");
  app.innerHTML=h+(loading?loadHtml():"")+(modals.length?modalHtml():"")+(toast?`<div class="toast">${esc(toast)}</div>`:"");
  if(!window.__keepScroll) window.scrollTo(0,0);
}
function say(m){ toast=m; render(); setTimeout(()=>{ toast=null; render(); },2000); }
function header(){
  const p=S.p;
  return `<header class="top"><a class="ibtn" href="index.html" title="처음 화면">⌂</a>${emblem(S.club,40)}
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
   <button class="wide" data-act="hoflist">🏆 친구들 명예의 전당</button>
   <p class="muted c"><a class="lnk" href="index.html">처음 화면으로</a>${S?` · <button class="lnk" data-act="wipe">저장 삭제</button>`:""}</p></main>`;
}

/* ================= 생성 ================= */
function createView(){
  const d=L.POSDEF[draft.pos];
  if(!d.subs.some(s=>s[0]===draft.sub)) draft.sub=d.subs[0][0];
  return `<main class="body"><div class="row"><button class="ibtn" data-act="home">‹</button><h2>선수 만들기</h2></div>
   <section class="card"><span class="lab">이름</span><input type="text" id="nm" maxlength="8" value="${esc(draft.name)}" placeholder="선수 이름">
    <span class="lab">등번호 (비워두면 자동)</span><input type="number" id="no" inputmode="numeric" min="1" max="99" value="${esc(draft.number)}" placeholder="1–99"></section>
   <section class="card"><span class="lab">포지션</span><div class="chips">${Object.keys(L.POSDEF).map(k=>`<button data-act="pos" data-v="${k}" class="${draft.pos===k?"on":""}">${POSK[k]}</button>`).join("")}</div>
    <span class="lab">세부 포지션</span><div class="chips">${d.subs.map(s=>`<button data-act="sub" data-v="${s[0]}" class="${draft.sub===s[0]?"on":""}">${s[1]}</button>`).join("")}</div>
    <span class="lab">주발</span><div class="chips">${["오른발","왼발","양발"].map(f=>`<button data-act="foot" data-v="${f}" class="${draft.foot===f?"on":""}">${f}</button>`).join("")}</div></section>
   <section class="card"><span class="lab">체격 (비워두면 포지션 평균)</span><div class="grid2"><input type="number" id="ht" inputmode="numeric" placeholder="키 cm" value="${esc(draft.height)}"><input type="number" id="wt" inputmode="numeric" placeholder="몸무게 kg" value="${esc(draft.weight)}"></div>
    <p class="note" id="bodyfx">${esc(bodyLine())}</p>
    <p class="muted">크고 무거울수록 피지컬·수비·제공권(골키퍼는 선방 범위)이 유리하고, 스피드·드리블은 불리해요. 작고 가벼우면 반대예요. 포지션 평균(공격수 180cm/73kg, 미드필더 177/70, 수비수 183/77, 골키퍼 188/82)에서 멀수록 효과가 커요.</p></section>
   <section class="card"><span class="lab">성장 특성 (하나) — 숨은 특성은 첫 시즌 뒤 스카우터가 알려줘요</span>${TRAITS().map(t=>`<button class="opt ${draft.trait===t.id?"on":""}" data-act="trait" data-v="${t.id}"><b>${t.icon} ${t.name}</b><small>${t.desc}</small><span class="tp">${t.eff}</span></button>`).join("")}</section>
   <section class="card"><span class="lab">시작 시점</span>
    ${[["mid","중학교 1학년 (13세)","구단 U15 유스에서 시작해요. 가장 길게 키울 수 있어요."],["hs","고등학교 1학년 (16세)","구단 U18 유스에서 시작해 고교 시절을 거쳐요."],["high","고교 졸업 신인 (19세)","곧바로 프로 드래프트에 도전해요."],["univ","대학 졸업 신인 (23세)","즉시 전력감이지만 성장 기간이 짧아요."]].map(([k,t,s])=>`<button class="opt ${draft.route===k?"on":""}" data-act="route" data-v="${k}"><b>${t}</b><small>${s}</small></button>`).join("")}</section>
   <div class="cta"><button class="big" data-act="scout" ${draft.name.trim()?"":"disabled"}><span>스카우트 후보 3명 보기</span><b>→</b></button></div></main>`;
}
function bodyLine(){ return "체격 효과: "+L.bodyText(draft.pos,+draft.height||0,+draft.weight||0); }
function readForm(){ const g=id=>{ const e=$(id); return e?e.value:null; }; const n=g("nm"); if(n!=null) draft.name=n; const no=g("no"); if(no!=null) draft.number=no; const h=g("ht"); if(h!=null) draft.height=h; const w=g("wt"); if(w!=null) draft.weight=w; }
function makeCands(){
  const t=L.rollTalent(); const ty=L.TYPES[draft.pos];
  return ty.map(x=>L.create({name:draft.name.trim()||"이름 없는 선수",pos:draft.pos,sub:draft.sub,type:x[0],route:draft.route,talent:t,foot:draft.foot,trait:draft.trait,number:+draft.number||undefined,height:+draft.height||undefined,weight:+draft.weight||undefined}));
}
function scoutView(){
  if(draft.loading) return `<main class="body"><section class="card load"><small class="kick">SCOUTING</small><h2>스카우트가 후보를 추리는 중</h2><div class="pg"><i style="width:${draft.prog||10}%"></i></div><div class="steps"><p class="ok">${POSK[draft.pos]} 후보군 추리기</p><p class="ok">주발·체격 대조</p><p>잠재력 평가</p></div></section></main>`;
  const d=L.POSDEF[draft.pos];
  return `<main class="body"><div class="row"><button class="ibtn" data-act="create">‹</button><h2>스카우트 리포트</h2></div>
   <p class="muted">세 후보는 능력치 총합이 비슷하고 분포만 달라요. 잠재력은 첫 시즌을 마친 뒤 평가돼요.</p>
   <div class="scout">${draft.cands.map((c,i)=>`<button class="cand ${draft.pick===i?"on":""}" data-act="cand" data-v="${i}"><div class="hd"><b>후보 ${i+1} · ${esc(c.p.typeName)}</b><b>${c.p.ovr}</b></div>
     ${d.stats.map(([k,n])=>`<div class="sbar"><span>${n}</span><div class="bar"><i style="width:${c.p.stats[k]}%"></i></div><b>${c.p.stats[k]}</b></div>`).join("")}<small class="muted">${c.p.height}cm ${c.p.weight}kg · ${c.p.foot} · ${esc(L.traitName(c.p.trait))}</small></button>`).join("")}</div>
   <div class="cta"><button class="big" data-act="start" ${draft.pick<0?"disabled":""}><span>${draft.pick<0?"후보를 골라 주세요":"후보 "+(draft.pick+1)+"로 시작"}</span><b>→</b></button></div></main>`;
}

/* ================= 드래프트 ================= */
function draftView(){
  const pay=o=>{ const c=L.clubPayroll(S,o.club.id,o.club.lg); return c?`<small>구단 최고 ${money(c.top.sal)} · 최저 ${money(c.low.sal)}</small>`:""; };
  return `<main class="body"><small class="kick">K LEAGUE DRAFT</small><h2>입단 제의가 도착했어요</h2>
   <p class="muted">${esc(S.p.name)} · ${POSK[S.p.pos]} · OVR ${S.p.ovr}. 주전 경쟁 가능성과 연봉을 비교해 보세요.</p>
   ${S.offers.map((o,i)=>`<button class="offer" data-act="sign" data-v="${i}">${emblem(o.club,52)}<div><b>${esc(o.club.name)}</b><small>${L.lgLabel(o.club.lg)} · 전력 ${o.lvl} · 예상 ${esc(o.role)}</small>${pay(o)}<span class="sal">연봉 ${money(o.salary)} · ${o.years}년</span></div></button>`).join("")}
   <button class="wide" data-act="univ" ${age()>=22?"disabled":""}>대학 진학 (성장 후 재도전)</button></main>`;
}

/* ================= 시즌 탭 ================= */
function meters(){
  const m=(n,v,cls)=>`<div class="meter"><span>${n}</span><div class="bar ${cls||""}"><i style="width:${v}%"></i></div><b>${Math.round(v)}</b></div>`;
  return `<section class="card flat">${m("컨디션",S.cond,S.cond<50?"warn":"")}${m("사기",S.morale,S.morale<40?"warn":"")}${m("인기",S.fame,"gold")}</section>`;
}
function timeline(){
  const cur=S.sim?S.sim.seg:-1;
  return `<div class="tl">${L.SEGS.map((s,i)=>`<div class="${S.phase==="result"||i<cur?"done":i===cur?"now":""}"><b>${s.label}</b>${s.months}</div>`).join("")}</div>`;
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
const TRAIN=[["rest","휴식·회복","컨디션 +28, 부상 위험 ↓"],["coach","개인 코치","전 능력 소폭 ↑ · 비용 0.2억"],["media","미디어 활동","인기 +5~9"]];
function prepView(){
  const d=L.POSDEF[S.p.pos], p=S.p;
  const youthTip=S.stage==="youth"?`<p class="note">${L.youthTeamName(S.club.short,age())} · ${L.gradeLabel(age())}. 유소년 리그에서 두각을 나타내면 연령별 대표팀에 뽑혀요.</p>`:"";
  const mil=S.military==="sangmu"?`<p class="note">🎖 김천 상무 복무 중 (${S.mildone+1}/2년차)</p>`:"";
  return `<small class="kick">${S.year} 프리시즌</small><h2>${yearLabel()} · ${S.year}년 시즌 준비</h2>
   <section class="card prow"><div class="row">${emblem(S.club,56)}<div class="grow"><small class="muted">${esc(S.club.name)}</small><br><b>${esc(S.p.typeName)} · ${esc(subName())}</b><br><small class="muted">${potShown()?"잠재력 "+grade(p.pot)[0]:"잠재력 평가 전"} · 자금 ${money(S.funds)}</small></div></div></section>
   ${youthTip}${mil}${meters()}
   <h3 class="sec">훈련 방향</h3><div class="grid2">${d.stats.map(([k,n])=>`<button class="trainbtn ${plan.focus===k?"on":""}" data-act="focus" data-v="${k}"><b>${n} 훈련</b><small>현재 ${p.stats[k]}</small><em>${L.PHYS.has(k)?"체력형":"기술형"} ▲</em></button>`).join("")}
    ${TRAIN.map(([k,n,s])=>`<button class="trainbtn ${plan.focus===k?"on":""}" data-act="focus" data-v="${k}"><b>${n}</b><small>${s}</small></button>`).join("")}</div>
   ${famCard()}
   <h3 class="sec">자기 투자 <small class="muted">보유 ${money(S.funds)}</small></h3><div class="grid2">${[["","투자 안 함","자금을 아껴요"]].concat(Object.entries(L.INVEST).map(([k,v])=>[k,v.name,"비용 "+v.cost+"억"])).map(([k,n,s])=>`<button class="trainbtn ${plan.invest===k?"on":""}" data-act="invest" data-v="${k}"><b>${n}</b><small>${s}</small></button>`).join("")}</div>
   <h3 class="sec">올해 일정</h3>${timeline()}
   <div class="cta"><button class="big" data-act="begin" ${plan.focus?"":"disabled"}><span>${plan.focus?"훈련 후 시즌 시작":"훈련 방향을 골라 주세요"}</span><b>→</b></button></div>`;
}
function allocLeft(){ const al=plan.alloc||{}; return L.familyPts(S)-Object.values(al).reduce((a,b)=>a+(b|0),0); }
function famCard(){
  const pts=L.familyPts(S); if(!pts&&!(S.family&&S.stage!=="pro")) return "";
  if(!pts) return "";
  const al=plan.alloc||{}, left=allocLeft();
  return `<h3 class="sec">성장 투자 <small class="muted">${esc(S.family.name)} · 남은 포인트 ${left}/${pts}</small></h3>
   <section class="card flat"><p class="muted">부모님의 지원을 어디에 쓸까요? 많이 투자할수록 크게 성장해요. 안 쓴 포인트는 용돈(자금)이 돼요. 해외 캠프는 대박이 터질 수도, 무리해서 지칠 수도 있어요.</p>
   ${L.INV_CATS.map(([k,n,d])=>`<div class="row"><div class="grow"><b>${n}</b><br><small class="muted">${d}</small></div><button class="ghost" data-act="al" data-v="${k}:-1" ${(al[k]|0)<=0?"disabled":""}>−</button><b style="min-width:26px;text-align:center;font-family:var(--f-num);font-size:18px">${al[k]|0}</b><button class="ghost" data-act="al" data-v="${k}:1" ${(al[k]|0)>=5||left<=0?"disabled":""}>＋</button></div>`).join("")}</section>`;
}
function runView(){
  const sim=S.sim, nxt=L.SEGS[sim.seg];
  const last=seg;
  return `<small class="kick">${S.year} ${nxt?nxt.label:""}</small><h2>${nxt?nxt.label+" · "+nxt.months:"시즌 종료"}</h2>${timeline()}${meters()}
   ${last?segCard(last):`<section class="card"><p class="muted">훈련 계획이 반영된 상태로 시즌이 시작돼요.</p></section>`}
   ${tableCard(sim)}
   <div class="cta"><button class="big" data-act="next"><span>${nxt?nxt.label+" 진행":"시즌 결과 보기"}</span><b>→</b></button></div>`;
}
function segCard(o){
  const chips=o.recs.filter(r=>r.comp==="리그").map(r=>`<i class="${r.res}">${r.res==="W"?"승":r.res==="D"?"무":"패"}</i>`).join("");
  const cups=o.recs.filter(r=>r.comp!=="리그");
  return `<section class="card"><small class="kick">${o.label.toUpperCase()} RESULT</small><div class="row"><div class="grow"><b style="font-size:18px">${o.segStat.W}승 ${o.segStat.D}무 ${o.segStat.L}패</b><br><small class="muted">${o.rank}위 / ${o.N}팀 · 승점 ${o.pts}</small></div><div class="stat"><small>평점</small><b>${o.segStat.rt||"-"}</b></div></div>
   <div class="chipsr">${chips}</div>
   <div class="four"><div class="stat"><small>출전</small><b>${o.segStat.apps}</b></div><div class="stat"><small>골</small><b>${o.segStat.g}</b></div><div class="stat"><small>도움</small><b>${o.segStat.as}</b></div><div class="stat"><small>누적</small><b>${o.cum.g}G ${o.cum.a}A</b></div></div>
   ${cups.map(r=>`<p class="note ${r.res==="W"?"good":"warn"}">🏆 ${esc(r.comp)} ${esc(r.cupRound||"")} ${r.res==="W"?"통과":"탈락"} (${r.f}:${r.a}${r.pk?" 승부차기":""})${r.min?" · 평점 "+r.rt:" · 결장"}</p>`).join("")}
   ${o.inj?`<p class="note warn">🩹 ${esc(o.inj.part)} 부상 — ${o.inj.matches}경기 결장</p>`:""}</section>`;
}
function tableCard(sim){
  const tab=Object.values(sim.tab).sort((x,y)=>y.pts-x.pts||(y.gf-y.ga)-(x.gf-x.ga)||y.gf-x.gf);
  const meI=tab.findIndex(t=>t.id===sim.myId); const show=new Set([0,1,2,tab.length-1,meI-1,meI,meI+1].filter(i=>i>=0&&i<tab.length));
  const rows=[...show].sort((a,b)=>a-b);
  return `<section class="card flat"><h3 class="sec">리그 순위</h3><div class="tab"><div class="tr hd"><span>#</span><span>팀</span><span>경기</span><span>승점</span></div>${rows.map(i=>{ const t=tab[i]; return `<div class="tr ${t.id===sim.myId?"me":""}"><span>${i+1}</span><span>${esc(L.teamName(sim,t.id))}</span><span>${t.p}</span><span>${t.pts}</span></div>`; }).join("")}</div></section>`;
}

/* ===== 시즌 결과 ===== */
function resultView(){
  const R=S.lastR; if(!R) return "";
  const gk=S.p.pos==="GK";
  const stats=R.military?[]:[["출전",R.apps],[gk?"무실점":"골",gk?R.cs:R.goals],[gk?"선발":"도움",gk?R.starts:R.assists],["평점",R.rating||"-"]];
  return `<small class="kick">${R.age}세 시즌</small><h2>${R.year} 시즌 결과</h2>
   <div class="pills"><span class="pill acc">${esc(R.leagueName)}</span><span class="pill">${esc(R.role||"")}</span>${R.rank?`<span class="pill gold">${R.rank}위 / ${R.N}팀</span>`:""}</div>
   ${stats.length?`<section class="four">${stats.map(([k,v])=>`<div class="stat"><small>${k}</small><b>${v}</b></div>`).join("")}</section>`:`<section class="card"><p class="muted">군 복무로 한 해를 보냈어요.</p></section>`}
   ${R.rank?`<section class="card flat"><div class="three"><div class="stat"><small>전적</small><b>${R.W}-${R.D}-${R.L}</b></div><div class="stat"><small>득실</small><b>${R.gf}:${R.ga}</b></div><div class="stat"><small>OVR</small><b>${R.ovr0}→${R.ovr1}</b></div></div></section>`:""}
   ${R.trophies.length?`<div class="pills">${R.trophies.map(t=>`<span class="pill gold">🏆 ${esc(t)}</span>`).join("")}</div>`:""}
   ${R.awards.length?`<div class="pills">${R.awards.map(a=>`<span class="pill gold">⭐ ${esc(a)}</span>`).join("")}</div>`:""}
   ${R.ballon?`<button class="wide" data-act="ballon">🏅 발롱도르 후보 ${R.ballon.rank}위 — 30인 명단 보기</button>`:""}
   ${(R.natEvents||[]).map(e=>e.skipped?`<p class="note warn">🇰🇷 ${esc(e.name)} — ${esc(e.text)}</p>`:`<p class="note ${e.title?"good":""}">🇰🇷 ${esc(e.name)} · ${esc(e.stage)} (${e.caps}경기 ${e.goals}골)${e.exempt?" · 병역 특례!":""}</p>`).join("")}
   ${R.injury?`<p class="note warn">🩹 ${esc(R.injury.text)}</p>`:""}${R.bonus?`<p class="note good">💰 옵션 보너스 ${R.bonus}억 (${(R.bonusHit||[]).map(esc).join(", ")})</p>`:""}
   ${S.promoNote?`<p class="note">${esc(S.promoNote)}</p>`:""}
   ${R.table?`<button class="wide" data-act="det">${openDet?"▾":"▸"} 최종 순위표 · 내 경기 기록</button>${openDet?`<section class="card flat"><div class="tab">${R.table.map((t,i)=>`<div class="tr ${t.me?"me":""}"><span>${i+1}</span><span>${esc(t.name)}</span><span>${t.w}-${t.d}-${t.l}</span><span>${t.pts}</span></div>`).join("")}</div><h3 class="sec">내 경기</h3>${(R.matches||[]).filter(m=>m.min>0).slice(0,60).map(m=>`<div class="mrow ${m.res}"><b>${m.comp==="리그"?m.r+"R":esc(m.comp.slice(0,3))}</b><span>${m.home?"홈":"원정"} ${esc(L.teamName(R.simTeams||{teams:[]},m.opp))}</span><small>${m.g?m.g+"골 ":""}${m.as?m.as+"도움 ":""}${m.rt}</small><em>${m.f}:${m.a}</em></div>`).join("")}</section>`:""}`:""}
   <div class="cta"><button class="big" data-act="offseason"><span>오프시즌으로</span><b>→</b></button></div>`;
}

/* ===== 오프시즌: 계약 · 이적 · 병역 ===== */
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
  if(inMil) h+=`<section class="card"><h3 class="sec">복무 중</h3><p class="muted">군 복무 중에는 월급 수준(연 0.3억)만 받고 계약을 새로 맺을 수 없어요. 전역하면 원래 팀으로 돌아가요.</p></section>`;
  else if(S.contractYears<=1){
    const opts=L.incentiveOptions(S,c.offer);
    h+=`<section class="card"><h3 class="sec">재계약</h3><div class="three"><div class="stat"><small>현재 연봉</small><b>${money(c.last)}</b></div><div class="stat"><small>제시액</small><b>${money(c.offer)}</b></div><div class="stat"><small>${c.rate>=0?"+":""}${c.rate}%</small><b>${c.years}년</b></div></div>
     ${pay?`<div class="pay"><small>${esc(S.club.name)} 최고 연봉</small><b>${esc(pay.top.name)} ${money(pay.top.sal)}</b><small>최저 연봉</small><b>${esc(pay.low.name)} ${money(pay.low.sal)}</b><small>평균</small><b>${money(pay.avg)}</b></div>`:""}
     <span class="lab">연봉 옵션 (선택) — 기본급이 조금 낮아지는 대신, 조건을 채우면 시즌 끝에 보너스를 받아요</span>
     ${opts.map(o=>`<label class="chk"><input type="checkbox" data-act="inc" data-v="${o.id}" ${chosenInc.includes(o.id)?"checked":""}><div><b>${esc(o.label)}</b><small>달성 예상 ${o.prob}% · 보너스 ${o.bonus}억</small></div></label>`).join("")}
     <div class="grid2"><button class="ghost" data-act="renego" ${off.renego?"disabled":""}>재협상 (1회)</button><button class="ghost" data-act="accept">계약 수락</button></div>
     ${off.accepted?`<p class="note good">계약 완료: 연봉 ${money(S.salary)} · ${S.contractYears}년${S.incentives.length?" · 옵션 "+S.incentives.length+"개":""}</p>`:""}</section>`;
  } else h+=`<section class="card"><h3 class="sec">계약</h3><p class="muted">연봉 ${money(S.salary)} · 계약 ${S.contractYears}년 남음</p>${pay?`<div class="pay"><small>구단 최고 연봉</small><b>${money(pay.top.sal)}</b><small>구단 최저 연봉</small><b>${money(pay.low.sal)}</b></div>`:""}</section>`;
  h+=`<h3 class="sec">이적 제의</h3>${off.transfers.length?off.transfers.map((o,i)=>`<button class="offer" data-act="transfer" data-v="${i}">${emblem(o.club,48)}<div><b>${esc(o.club.name)}</b><small>${esc(o.tag)} · 전력 ${o.lvl} · 예상 ${esc(o.role)}</small><span class="sal">연봉 ${money(o.salary)} · ${o.years}년</span></div></button>`).join(""):`<p class="muted">지금은 들어온 이적 제의가 없어요.</p>`}`;
  h+=`${L.canRetire(S)?`<button class="wide red" data-act="retire">현역 은퇴</button>`:""}
   <div class="cta"><button class="big" data-act="nextyear" ${(!inMil&&S.contractYears<=1&&!off.accepted)?"disabled":""}><span>${(!inMil&&S.contractYears<=1&&!off.accepted)?"계약을 먼저 확정해 주세요":"다음 시즌으로"}</span><b>→</b></button></div>`;
  return h;
}

/* ================= 선수 / 커리어 / 소식 ================= */
function playerTab(){
  const p=S.p, d=L.POSDEF[p.pos];
  return `<section class="card"><div class="row"><div class="grow"><small class="kick">${esc(p.typeName)}</small><h2>${esc(p.name)}</h2><small class="muted">No.${p.number} · ${p.height}cm ${p.weight}kg · ${p.foot} · ${esc(L.traitName(p.trait))+(potShown()&&p.hidden?" · "+esc(L.traitName(p.hidden,true)):"")}</small></div><div class="stat"><small>OVR</small><b style="font-size:30px;color:var(--acc)">${p.ovr}</b></div></div>
   ${d.stats.map(([k,n])=>`<div class="sbar"><span>${n}</span><div class="bar"><i style="width:${p.stats[k]}%"></i></div><b>${p.stats[k]}</b></div>`).join("")}
   <div class="three"><div class="stat"><small>최고 OVR</small><b>${p.peak}</b></div><div class="stat"><small>잠재력</small><b>${potShown()?grade(p.pot)[0]:"?"}</b></div><div class="stat"><small>나이</small><b>${age()}</b></div></div></section>
   ${meters()}
   <section class="card flat"><h3 class="sec">계약</h3><div class="pay"><small>소속</small><b>${esc(S.club.name)}</b><small>연봉</small><b>${S.stage==="pro"?money(S.salary):"-"}</b><small>계약 기간</small><b>${S.stage==="pro"?S.contractYears+"년":"-"}</b><small>보유 자금</small><b>${money(S.funds)}</b><small>가정 환경</small><b>${S.family?esc(S.family.name)+(L.familyPts(S)?" · "+L.familyPts(S)+"점":""):"-"}</b><small>병역</small><b>${({none:"미필",exempt:"특례(면제)",sangmu:"상무 복무 중",serving:"현역 복무 중",served:"군필"})[S.military]||"-"}</b></div>${S.incentives.length?`<span class="lab">연봉 옵션</span>${S.incentives.map(o=>`<p class="muted">· ${esc(o.label)} (+${o.bonus}억)</p>`).join("")}`:""}</section>`;
}
function careerTab(){
  const c=S.career, pro=S.history.filter(h=>!h.youth), yth=S.history.filter(h=>h.youth);
  const cnt=(arr,re)=>arr.filter(x=>re.test(x.name)).length;
  const aw=S.awards.filter(a=>!a.youth), tr=S.trophies.filter(t=>!t.youth);
  const league=tr.filter(t=>/리그1 우승|리그2 우승|프리미어리그 우승/.test(t.name)).length;
  const lg=L.legacy(S);
  return `<section class="card"><small class="kick">PRO CAREER</small><div class="four"><div class="stat"><small>출전</small><b>${c.apps}</b></div><div class="stat"><small>골</small><b>${c.goals}</b></div><div class="stat"><small>도움</small><b>${c.assists}</b></div><div class="stat"><small>대표팀</small><b>${c.caps}</b></div></div>
    <div class="four"><div class="stat"><small>우승</small><b>${tr.length}</b></div><div class="stat"><small>리그우승</small><b>${league}</b></div><div class="stat"><small>수상</small><b>${aw.length}</b></div><div class="stat"><small>평점</small><b>${c.ratingN?(c.ratingSum/c.ratingN).toFixed(2):"-"}</b></div></div></section>
   <section class="card flat"><h3 class="sec">주요 수상</h3>${[["리그 MVP|PFA 올해의 선수|올해의 선수|KFA 올해의 선수|AFC 올해의 국제선수","올해의 선수·MVP"],["올해의 골키퍼|골든글러브","올해의 골키퍼"],["득점왕|골든부트","득점왕"],["도움왕|플레이메이커상","도움왕"],["베스트 11|올해의 팀","베스트 11/팀"],["영플레이어","영플레이어"],["^발롱도르$","발롱도르"],["^발롱도르 후보","발롱도르 후보"]].map(([re,n])=>[n,cnt(aw,new RegExp(re))]).filter(x=>x[1]).map(([n,v])=>`<span class="pill gold">${n} ×${v}</span>`).join(" ")||`<p class="muted">아직 수상이 없어요.</p>`}</section>
   ${S.ballon.length?`<section class="card flat"><h3 class="sec">발롱도르 순위</h3>${S.ballon.map(b=>`<p class="muted">${b.year} · <b>${b.rank}위</b> (${esc(b.club)})</p>`).join("")}</section>`:""}
   ${tr.length?`<section class="card flat"><h3 class="sec">트로피</h3><div class="pills">${tr.map(t=>`<span class="pill gold">🏆 ${t.year} ${esc(t.name)}</span>`).join("")}</div></section>`:""}
   <section class="card flat"><h3 class="sec">시즌별 기록</h3>${pro.length?pro.slice().reverse().map(h=>`<div class="mrow"><b>${h.year}</b><span>${esc(h.club)}<br><small>${esc(h.leagueName)} ${h.rank?h.rank+"위":""}</small></span><small>${h.military?"군 복무":h.apps+"경기 "+h.goals+"G "+h.assists+"A"}</small><em>${h.ovr1||""}</em></div>`).join(""):`<p class="muted">프로 기록이 아직 없어요.</p>`}
    ${yth.length?`<h3 class="sec">유소년·대학 시절</h3>${yth.slice().reverse().map(h=>`<div class="mrow"><b>${h.age}세</b><span>${esc(h.club)}</span><small>${h.apps}경기 ${h.goals}G</small><em>${h.ovr1||""}</em></div>`).join("")}`:""}</section>
   ${honours()}${valueChart()}
   <section class="card flat"><h3 class="sec">커리어 평가</h3><div class="pay"><small>커리어 점수</small><b>${lg.total}</b><small>예상 등급</small><b>${L.legacyGrade(lg.total)}</b></div></section>`;
}
function feedTab(){
  const mo=S.moments.slice().reverse();
  return `<section class="card flat"><h3 class="sec">최근 소식</h3>${S.feed.length?S.feed.slice(0,40).map(f=>`<div style="padding:8px 0;border-bottom:1px solid var(--line2)"><small class="muted">${esc(f.when)}</small><br><span>${f.tone>0?'<span class="dot"></span>':""}${esc(f.text)}</span></div>`).join(""):`<p class="muted">소식이 아직 없어요.</p>`}</section>
   <section class="card flat"><h3 class="sec">커리어 하이라이트</h3>${mo.length?mo.map(m=>`<div style="padding:8px 0;border-bottom:1px solid var(--line2)"><span class="pill gold">${esc(m.badge)}</span> <small class="muted">${m.year} · ${m.age}세 · ${esc(m.club)}</small><br>${esc(m.text)}</div>`).join(""):`<p class="muted">아직 하이라이트가 없어요.</p>`}</section>`;
}

/* ================= 명예의 전당 (서버 저장 · 친구와 비교) ================= */
const CFG=window.KL_CONFIG||{};
const hofOn=!!(CFG.SUPABASE_URL&&CFG.SUPABASE_ANON_KEY);
const HH={apikey:CFG.SUPABASE_ANON_KEY,Authorization:"Bearer "+CFG.SUPABASE_ANON_KEY,"Content-Type":"application/json"};
let hofRows=null, hofErr="", hofBusy=false;
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
  if(!r.ok) throw new Error(r.status===404?"서버에 life_hof 표가 아직 없어요 (supabase/schema.sql 실행 필요)":"등록 실패 ("+r.status+")");
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
   <p class="muted">몸값은 이적 시장 가치예요. 연봉과 달라요. 군 복무 중에는 월급 수준(연 0.3억)만 받지만 선수 가치는 그대로 평가돼요. (파란 점)</p></section>`;
}
function honours(){
  const grp=(arr,key)=>{ const m={}; arr.forEach(x=>{ const k=key(x); (m[k]=m[k]||[]).push(x.year); }); return m; };
  const tr=S.trophies.filter(t=>!t.youth), aw=S.awards.filter(a=>!a.youth&&!/후보/.test(a.name));
  const row=(n,ys)=>`<div class="mrow" style="grid-template-columns:1fr 2fr"><b>${esc(n)}${ys.length>1?" ×"+ys.length:""}</b><small>${ys.map(y=>"'"+String(y).slice(2)).join(" · ")}</small></div>`;
  const t=grp(tr,x=>x.name), a=grp(aw,x=>x.name);
  const trH=Object.entries(t).sort((x,y)=>y[1].length-x[1].length).map(([n,ys])=>row(n,ys)).join(""), awH=Object.entries(a).sort((x,y)=>y[1].length-x[1].length).map(([n,ys])=>row(n,ys)).join("");
  if(!trH&&!awH) return "";
  return `<section class="card flat"><small class="kick">HONOURS</small><h3 class="sec">우승 연혁</h3>${trH||'<p class="muted">우승 기록이 없어요.</p>'}${awH?'<h3 class="sec">개인 수상</h3>'+awH:""}</section>`;
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
/* ================= 은퇴 ================= */
function retiredView(){
  const lg=L.legacy(S), g=L.legacyGrade(lg.total), c=S.career, jr=S.jersey||[];
  return `<main class="body"><small class="kick">RETIREMENT</small><h1>${esc(S.p.name)}, 그라운드를 떠나다</h1>
   <p class="muted">${S.p.born+0?"":""}${L.age(S)}세 · 프로 ${S.history.filter(h=>!h.youth).length}시즌 · ${esc(Object.keys(S.clubYears).join(" → "))}</p>
   ${jr.map(j=>`<section class="banner"><small>PERMANENTLY RETIRED NUMBER</small><div class="no">${j.number}</div><b>${esc(j.club)} 영구결번</b><small>${j.yrs}시즌 활약 · 우승 ${j.titles}회</small></section>`).join("")}
   <section class="hero"><small class="kick">LEGACY</small><div class="row"><h1 style="font-size:64px;color:var(--gold)">${g}</h1><div class="grow"><b style="font-size:24px;font-family:var(--f-num)">${lg.total}</b><br><small class="muted">커리어 점수</small></div></div></section>
   <section class="four"><div class="stat"><small>출전</small><b>${c.apps}</b></div><div class="stat"><small>골</small><b>${c.goals}</b></div><div class="stat"><small>도움</small><b>${c.assists}</b></div><div class="stat"><small>대표팀</small><b>${c.caps}</b></div></section>
   <section class="card flat"><div class="pay"><small>전성기 OVR</small><b>${S.p.peak}</b><small>우승</small><b>${S.trophies.filter(t=>!t.youth).length}회</b><small>수상</small><b>${S.awards.filter(a=>!a.youth).length}회</b><small>발롱도르 후보</small><b>${S.ballon.length}회</b><small>누적 옵션 보너스</small><b>${money(c.bonus||0)}</b></div></section>
   ${valueChart()}${playStyle()}${honours()}${legendCard()}
   ${S.moments.length?`<section class="card flat"><h3 class="sec">하이라이트</h3>${S.moments.slice(-12).reverse().map(m=>`<p class="muted">${m.year} · ${esc(m.text)}</p>`).join("")}</section>`:""}
   <section class="card flat"><h3 class="sec">명예의 전당 등록</h3><p class="muted">서버에 등록하면 친구들이 내 선수를 보고 비교할 수 있어요.</p>${S.hofUp?'<p class="note good">등록 완료! 친구 명예의 전당에서 확인해 보세요.</p>':`<input type="text" id="nick" maxlength="12" placeholder="닉네임" value="${esc(((()=>{ try{ return localStorage.getItem("klife-nick")||""; }catch(e){ return ""; } })()))}"><button class="wide" data-act="hofup">서버에 등록</button>`}<button class="ghost" data-act="hoflist">친구들 명예의 전당 보기</button></section>
   <button class="big" data-act="new"><span>새로운 인생 시작</span><b>→</b></button><button class="wide" data-act="home">처음으로</button></main>`;
}

/* ================= 팝업 ================= */
function loadHtml(){
  const L0=loading;
  return `<div class="ov center load"><div class="sheet"><small class="kick">${esc(L0.kick)}</small><h3>${esc(L0.title)}</h3><div class="pg"><i style="width:${L0.pct}%"></i></div><div class="steps">${L0.steps.map((s,i)=>`<p class="${i<L0.step?"ok":""}">${esc(s)}</p>`).join("")}</div></div></div>`;
}
function modalHtml(){
  const m=modals[0];
  if(m.t==="hofcmp") return cmpHtml(m.a);
  if(m.t==="event"){
    const e=m.ev;
    if(m.res) return `<div class="ov center"><div class="sheet evt"><span class="tagline">${esc(e.story||"EVENT")}</span><h3>${esc(e.title)}</h3><div class="res ${m.res.hit?"":"no"}"><b>${esc(m.res.text)}</b>${m.res.lines.length?`<small>${m.res.lines.map(esc).join(" · ")}</small>`:""}</div><button class="big" data-act="mok"><span>확인</span><b>→</b></button></div></div>`;
    return `<div class="ov"><div class="sheet evt"><div class="grab"></div><span class="tagline">${esc(e.story?"스토리 · "+e.story:"EVENT · "+S.year)}</span><h3>${esc(e.title)}</h3><p class="muted">${esc(e.body)}</p>${e.opts.map((o,i)=>`<button class="opt" data-act="evopt" data-v="${i}"><b>${esc(o.label)}</b>${o.p!=null&&o.p<100?`<p>성공 확률 ${o.p}%</p>`:""}</button>`).join("")}</div></div>`;
  }
  if(m.t==="nat"){ const r=m.r; return `<div class="ov center"><div class="sheet"><small class="kick">NATIONAL TEAM</small><h3>${esc(r.name)} ${r.year}</h3>${r.skipped?`<p class="note warn">${esc(r.text)}</p>`:`<div class="banner" style="color:var(--txt);border-color:${r.title?"var(--gold)":"var(--line)"};background:var(--panel2)"><div class="no" style="font-size:34px">${esc(r.stage)}</div><small>${r.caps}경기 ${r.goals}골</small></div>${r.carry?`<p class="note good">🌟 ${esc(r.text)}</p>`:""}${r.golden?`<p class="note good">🏅 대회 MVP(골든볼)로 선정!</p>`:""}${r.exempt?`<p class="note good">🎖 병역 특례를 받았어요!</p>`:""}`}<button class="big" data-act="mok"><span>확인</span><b>→</b></button></div></div>`; }
  if(m.t==="callup"){ return `<div class="ov center"><div class="sheet"><small class="kick">CALL-UP</small><h3>${esc(m.c.name)} 대표팀 소집</h3><p class="muted">${esc(S.p.name)} 선수가 ${esc(m.c.name)} 명단에 이름을 올렸어요.</p><button class="big" data-act="callgo"><span>대회에 합류</span><b>→</b></button></div></div>`; }
  if(m.t==="ballon"){ const R=S.lastR; const lst=L.ballonList(S,R.ballon.rank); return `<div class="ov"><div class="sheet"><div class="grab"></div><small class="kick">BALLON D'OR ${R.year}</small><h3>후보 30인 · 내 순위 ${R.ballon.rank}위</h3><div class="tab">${lst.map(x=>`<div class="tr ${x.me?"me":""}" style="grid-template-columns:30px 1fr"><span>${x.rank}</span><span>${esc(x.name)}${x.me?" ◀":""}</span></div>`).join("")}</div><button class="wide" data-act="mok">닫기</button></div></div>`; }
  if(m.t==="msg") return `<div class="ov center"><div class="sheet"><small class="kick">${esc(m.kick||"알림")}</small><h3>${esc(m.title)}</h3><p>${esc(m.body)}</p>${m.banner?`<div class="banner"><div class="no">${esc(m.banner)}</div></div>`:""}<button class="big" data-act="mok"><span>확인</span><b>→</b></button></div></div>`;
  return "";
}

/* ================= 흐름 ================= */
function runLoading(kick,title,steps,done){
  if(FAST){ done(); return; }
  loading={kick,title,steps,step:0,pct:6}; render(); let i=0;
  const tick=()=>{ i++; loading.step=i; loading.pct=Math.min(100,Math.round(i/steps.length*100)); render(); if(i<steps.length) setTimeout(tick,520); else setTimeout(()=>{ loading=null; done(); },380); };
  setTimeout(tick,420);
}
function afterSegment(out){
  seg=out; const q=[];
  out.callups.forEach(c=>{ const r=L.joinTournament(S,c); q.push({t:"nat",r}); });
  const ev=L.rollEvent(S,out); if(ev) q.push({t:"event",ev});
  if(out.last){ /* 마지막 구간 이후 시즌 결산은 사용자가 버튼으로 */ }
  modals=q; save(); render();
}
function startSeasonAt(){ L.beginSeason(S,{focus:plan.focus,invest:plan.invest||"",alloc:Object.assign({},plan.alloc)}); save(); }
function runNext(){
  if(!S.sim) return;
  if(S.sim.seg>=L.SEGS.length){ finishSeason(); return; }
  const sg=L.SEGS[S.sim.seg];
  runLoading(S.year+" 시즌",sg.label+" 진행 중",[sg.months+" 일정 확인","리그 경기 진행","컵 대회·대표팀 소집","기록 집계"],()=>{ const out=L.playSegment(S); afterSegment(out); });
}
function finishSeason(){
  runLoading(S.year+" 시즌","시즌 결산 중",["최종 순위 확정","개인 기록 집계","수상 후보 평가","능력치 성장 반영"],()=>{
    const sim=S.sim; const teams=sim?{teams:sim.teams}:null;
    const R=L.finishSeason(S); R.simTeams=teams; seg=null;
    if(S.history.length===1&&!S.scouted){ S.scouted=true; const g=S.p.grade; const txt={S:"세계 무대에서도 통할 재목입니다. 키우기에 따라 월드클래스가 될 수 있어요.",A:"국가대표급 잠재력이 보입니다. 꾸준히 성장하면 리그 정상급이 될 거예요.",B:"1군 주전으로 충분히 자리 잡을 재목입니다. 노력 여하에 따라 더 오를 수 있어요.",C:"재능은 평범하지만 노력으로 길을 개척할 수 있는 선수입니다."}[g]; const hid=S.p.hidden?" 그리고 스카우터가 숨은 재능을 발견했습니다 — "+L.traitName(S.p.hidden,true)+". "+L.HIDDEN_LIST.find(h=>h.id===S.p.hidden).desc:""; modals.push({t:"msg",kick:"SCOUT REPORT",title:"스카우터의 첫 평가: 잠재력 "+g,body:txt+hid,banner:g}); }
    save(); render();
  });
}
function buildOff(){
  off={};
  if(S.stage==="pro"){
    off={contract:L.contractOffer(S),transfers:L.transferOffers(S),mil:L.militaryPrompt(S),milDone:false,renego:false,accepted:false,retire:false};
    if(S.military==="serving"||S.military==="sangmu") off.transfers=[];
    if(L.mustRetire(S)) off.retire=true;
    chosenInc=[];
  }
}
function goOffseason(){
  S.phase="offseason"; buildOff();
  if(S.stage==="pro"){
    /* 영구결번 예고 이벤트 */
    const jh=L.jerseyHint(S); if(jh) modals.push({t:"msg",kick:"CLUB LEGEND",title:jh.name+"의 상징이 되어 가요",body:jh.yrs+"시즌째 한 팀에서 뛰고 있어요. 이대로 은퇴한다면 영구결번 이야기가 나올지도 몰라요."});
  }
  save(); render();
}
function doRetire(){
  const jr=L.jerseyRetired(S); S.jersey=jr; S.retired=true; view="retired";
  const lg=L.legacy(S); const h=rd(HOF)||[]; h.push(Object.assign(hofEntry(""),{retire:jr.length>0}));
  wr(HOF,h); save(); render();
}
function nextYear(){
  /* 군 복무 현역: 경기 없이 한 해를 보내요 */
  L.nextYear(S); off=null; plan={focus:"",invest:"",alloc:{}}; seg=null; openDet=false; S.promoNote=null;
  if(S.phase==="draft") view="draft"; else view="game";
  if(S.stage==="pro"&&S.military==="serving"&&S.milKind==="army") { /* 현역 복무 중 */ }
  save(); render();
}

/* ================= 이벤트 위임 ================= */
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-act]"); if(!b) return; const act=b.dataset.act, v=b.dataset.v; if(b.tagName==="INPUT") return;
  if(loading) return;
  if(view==="create"||view==="scout") readForm();
  switch(act){
    case "home": view="home"; render(); break;
    case "tab": tab=v; render(); break;
    case "continue": view=S.retired?"retired":S.phase==="draft"?"draft":"game"; tab="season"; render(); break;
    case "wipe": if(confirm("저장된 선수를 삭제할까요?")){ try{ localStorage.removeItem(KEY); }catch(_){} S=null; render(); } break;
    case "new": S=null; draft={name:"",number:"",pos:"FW",sub:"ST",foot:"오른발",height:"",weight:"",trait:"effort",route:"mid",cands:null,pick:-1,loading:false}; view="create"; render(); break;
    case "pos": draft.pos=v; draft.sub=L.POSDEF[v].subs[0][0]; render(); break;
    case "sub": draft.sub=v; render(); break;
    case "foot": draft.foot=v; render(); break;
    case "trait": draft.trait=v; render(); break;
    case "route": draft.route=v; render(); break;
    case "create": view="create"; render(); break;
    case "scout": if(!draft.name.trim()) break; draft.cands=makeCands(); draft.pick=-1;
      if(FAST){ view="scout"; render(); break; }
      view="scout"; draft.loading=true; draft.prog=10; render(); setTimeout(()=>{ draft.prog=55; render(); setTimeout(()=>{ draft.loading=false; render(); },700); },650); break;
    case "cand": draft.pick=+v; render(); break;
    case "start": { if(draft.pick<0) break; S=draft.cands[draft.pick]; plan={focus:"",invest:"",alloc:{}}; view=S.phase==="draft"?"draft":"game"; tab="season"; if(S.phase==="draft") S.offers=L.draftOffers(S); else modals.push({t:"msg",kick:"FAMILY",title:S.family.name,body:S.family.note+". 해마다 지원 포인트 "+S.family.pts+"점으로 성장 투자를 고를 수 있어요. 가정 형편은 살다 보면 바뀌기도 해요."}); save(); render(); break; }
    case "sign": { const o=S.offers[+v]; L.signWith(S,o); view="game"; tab="season"; save(); render(); break; }
    case "univ": L.chooseUniv(S); view="game"; tab="season"; save(); render(); break;
    case "focus": plan.focus=v; render(); break;
    case "invest": plan.invest=v; render(); break;
    case "al": { const [k,d]=v.split(":"); plan.alloc=plan.alloc||{}; const cur=plan.alloc[k]|0, nx=cur+(+d); if(nx<0||nx>5||(+d>0&&allocLeft()<=0)) break; plan.alloc[k]=nx; window.__keepScroll=true; render(); window.__keepScroll=false; break; }
    case "begin": if(!plan.focus) break; startSeasonAt(); seg=null; render(); runNext(); break;
    case "next": runNext(); break;
    case "army": { const R=L.armyYear(S); S.lastR=R; save(); render(); break; }
    case "det": openDet=!openDet; render(); break;
    case "ballon": modals.push({t:"ballon"}); render(); break;
    case "offseason": goOffseason(); break;
    case "nextyear": nextYear(); break;
    case "inc": chosenInc=chosenInc.includes(v)?chosenInc.filter(x=>x!==v):chosenInc.concat(v); window.__keepScroll=true; render(); window.__keepScroll=false; break;
    case "renego": { if(off.renego) break; const n=L.negotiate(S,off.contract); off.renego=true; const o=Object.assign({},off.contract,{offer:n.offer,rate:n.rate}); off.contract=o; say(n.mult>1?"협상 성공! 연봉이 올랐어요":n.mult<1?"역효과… 구단이 제시액을 낮췄어요":"구단이 기존 제안을 유지했어요"); break; }
    case "accept": { const o=L.applyIncentives(S,off.contract,chosenInc); L.acceptContract(S,o); off.accepted=true; save(); render(); break; }
    case "transfer": { const o=off.transfers[+v]; L.doTransfer(S,o); off.accepted=true; off.transfers=[]; off.contract={last:o.salary,offer:o.salary,rate:0,years:o.years}; S.contractYears=o.years; save(); say(o.club.name+"(으)로 이적했어요"); break; }
    case "mil": { if(v==="skip"){ off.milDone=true; } else { L.enlist(S,v); off.milDone=true; if(v==="army"){ off.transfers=[]; } off.contract=L.contractOffer(S); } save(); render(); break; }
    case "retire": doRetire(); break;
    case "hoflist": view="hof"; render(); hofLoad(); break;
    case "hofcmp": modals.push({t:"hofcmp",a:hofRows[+v]}); render(); break;
    case "hofup": { const nk=(document.getElementById("nick")||{}).value||""; if(!nk.trim()){ say("닉네임을 적어 주세요"); break; } try{ localStorage.setItem("klife-nick",nk.trim()); }catch(_){} hofPost(hofEntry(nk.trim())).then(()=>{ S.hofUp=true; save(); render(); say("명예의 전당에 등록했어요"); }).catch(e=>say(e.message)); break; }
    case "mok": modals.shift(); save(); render(); break;
    case "evopt": { const m=modals[0]; m.res=L.resolveEvent(S,m.ev,+v); save(); render(); break; }
    case "callgo": { const m=modals[0]; modals[0]={t:"nat",r:L.joinTournament(S,m.c)}; save(); render(); break; }
  }
});
document.addEventListener("input",e=>{ if(e.target.id==="ht"||e.target.id==="wt"){ draft.height=(document.getElementById("ht")||{}).value||""; draft.weight=(document.getElementById("wt")||{}).value||""; const bf=document.getElementById("bodyfx"); if(bf) bf.textContent=bodyLine(); } if(e.target.id==="nm"){ draft.name=e.target.value; const btn=document.querySelector("[data-act=scout]"); if(btn) btn.disabled=!draft.name.trim(); } });
window.__LIFE={get S(){return S;},get view(){return view;},act:(a,v)=>{ const el=document.createElement("button"); el.dataset.act=a; if(v!=null) el.dataset.v=v; document.body.appendChild(el); el.click(); el.remove(); },render,draftSet:o=>Object.assign(draft,o),getPlan:()=>plan,setPlan:p=>{plan=p;},get modals(){return modals;},get off(){return off;},get seg(){return seg;}};
render();
})();

/* K-라이프 화면. 계산은 js/life/engine.js (window.LIFE) */
(function(){
"use strict";
const L=window.LIFE, K=window.KLCore;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const KEY="klife-save", HOF="klife-hof";
const rd=k=>{ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } };
const wr=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
const app=$("app");

let S=rd(KEY);
if(S && S.v!==L.STATE_VER) S=null;
let view=S?(S.retired?"retired":S.phase==="draft"?"draft":S.club?"game":"draft"):"home";
let tab="season";
let draft={name:"",pos:"FW",sub:"ST",type:"finisher",route:"mid",talent:null,rerolls:1};
let plan={focus:null,rest:false};
let anim=null, toast=null, modal=null, openAcc=false;

const POSK={FW:"공격수",MF:"미드필더",DF:"수비수",GK:"골키퍼"};
const money=v=>v>=1?(Math.round(v*10)/10)+"억 원":Math.round(v*10000)+"만 원";
const save=()=>{ if(S) wr(KEY,S); };
const age=()=>L.age(S);
const subName=()=>{ const d=L.POSDEF[S.p.pos].subs.find(s=>s[0]===S.p.sub); return d?d[1]:S.p.sub; };
const yearLabel=()=>{ const n=S.history.filter(x=>!!x.youth===(S.stage!=="pro")).length+1; return S.stage==="youth"?(age()<16?"중학교 ":"고등학교 ")+(age()<16?age()-12:age()-15)+"학년":S.stage==="univ"?"대학 "+(age()-17)+"학년":"프로 "+(S.history.filter(x=>!x.youth).length+1)+"년차"; };
const statGrade=v=>v>=85?["S","g-s"]:v>=75?["A","g-a"]:v>=65?["B","g-b"]:v>=55?["C","g-c"]:["D","g-d"];

/* ---- 구단 엠블럼 ---- */
function emblem(club,size){
  const name=club?club.name:"?", code=club&&(club.code||(window.KL_CLUB_CODE||{})[club.id||club.name]);
  const hue=[...name].reduce((h,c)=>(h*31+c.charCodeAt(0))%360,0);
  const ini=esc(name.replace(/[^\p{L}\p{N}]/gu,"").slice(0,2));
  const sz=size||44;
  if(code&&window.KL_EMBLEM_URL&&window.KL_CRESTS_ON) return `<span class="emb" style="--s:${sz}px;--h:${hue}"><i>${ini}</i><img src="${KL_EMBLEM_URL(code)}" alt="" onload="this.previousElementSibling.style.display='none'" onerror="this.remove()"></span>`;
  return `<span class="emb" style="--s:${sz}px;--h:${hue}"><i>${ini}</i></span>`;
}

/* ---- 공통 틀 ---- */
function header(){
  const p=S.p;
  return `<header class="top"><a class="ibtn" href="index.html" title="감독 버전">⌂</a>
    ${emblem(S.club,40)}<div class="who"><b>${esc(p.name)}</b><small>${esc(subName())} · ${age()}세</small></div>
    <div class="ovr"><small>OVR</small><b>${p.ovr}</b></div></header>
  <nav class="tabs">${[["season","시즌"],["career","커리어"],["player","선수"],["honors","우승 연혁"]].map(([k,t])=>`<button data-act="tab" data-v="${k}" class="${tab===k?"on":""}">${t}</button>`).join("")}</nav>`;
}
function render(){
  let h="";
  if(view==="home") h=homeView();
  else if(view==="create") h=createView();
  else if(view==="draft") h=draftView();
  else if(view==="retired") h=retiredView();
  else h=header()+`<main class="body">${tab==="season"?seasonTab():tab==="career"?careerTab():tab==="player"?playerTab():honorsTab()}</main>`;
  app.innerHTML=h+(modal?modalHtml():"")+(toast?`<div class="toast">${esc(toast.m)}</div>`:"");
  const wrap=document.querySelector(".body"); if(wrap) wrap.scrollTop=0;
}
function say(m){ if(toast) clearTimeout(toast.t); toast={m,t:setTimeout(()=>{ toast=null; render(); },2400)}; render(); }

/* ================= 홈 ================= */
function homeView(){
  const hof=rd(HOF)||[];
  const cont=S&&!S.retired?`<button class="big alt" data-act="continue"><span>이어하기</span><small>${esc(S.p.name)} · ${age()}세 · ${esc(S.club?S.club.name:"입단 전")}</small></button>`:"";
  return `<main class="home"><div class="brand"><span class="mark">K</span><div><small>K-LIFE</small><b>축구 인생 키우기</b></div></div>
    <section class="hero"><small>NEW FOOTBALL LIFE</small><h1>이번 생, 어떤 선수로 살아볼까요?</h1><p>18세 유망주로 K리그에 입단해서 해외 진출, 국가대표, 은퇴까지. 한 선수의 인생을 키워 보세요.</p>
    ${cont}<button class="big" data-act="new"><span>새로운 인생 시작</span><b>→</b></button></section>
    <section class="card"><h3>명예의 전당</h3>${hof.length?hof.slice().sort((a,b)=>b.score-a.score).slice(0,8).map((x,i)=>`<div class="hofrow"><b>${i+1}</b><div><b>${esc(x.name)}</b><small>${esc(x.pos)} · 최고 OVR ${x.peak} · ${x.seasons}시즌 · ${x.goals}골 ${x.assists}도움</small></div><em>${x.score}점</em></div>`).join(""):`<p class="muted">아직 은퇴한 선수가 없어요.</p>`}</section>
    <p class="links"><a href="index.html">감독 버전 (K-레전드 38)</a>${S?` · <button class="lnk" data-act="wipe">저장 삭제</button>`:""}</p></main>`;
}

/* ================= 생성 ================= */
function createView(){
  const d=L.POSDEF[draft.pos], ty=L.TYPES[draft.pos];
  if(!d.subs.some(s=>s[0]===draft.sub)) draft.sub=d.subs[0][0];
  if(!ty.some(t=>t[0]===draft.type)) draft.type=ty[0][0];
  const t=draft.talent;
  return `<main class="home"><div class="brand"><button class="ibtn" data-act="home">‹</button><b class="tt">선수 만들기</b></div>
   <section class="card"><label class="lab">이름</label><input id="nm" maxlength="8" value="${esc(draft.name)}" placeholder="선수 이름"></section>
   <section class="card"><label class="lab">포지션</label><div class="chips">${Object.keys(L.POSDEF).map(k=>`<button data-act="pos" data-v="${k}" class="${draft.pos===k?"on":""}">${POSK[k]}</button>`).join("")}</div>
     <label class="lab">세부 포지션</label><div class="chips">${d.subs.map(s=>`<button data-act="sub" data-v="${s[0]}" class="${draft.sub===s[0]?"on":""}">${s[1]}</button>`).join("")}</div></section>
   <section class="card"><label class="lab">선수 유형</label>${ty.map(x=>`<button class="opt ${draft.type===x[0]?"on":""}" data-act="type" data-v="${x[0]}"><b>${x[1]}</b><small>${x[3]}</small></button>`).join("")}</section>
   <section class="card"><label class="lab">시작 시점</label>
     <button class="opt ${draft.route==="mid"?"on":""}" data-act="route" data-v="mid"><b>중학교 입학 (13세)</b><small>유소년 시절부터 키워요. 구단 유스에서 시작해 프로 드래프트까지</small></button>
     <button class="opt ${draft.route==="hs"?"on":""}" data-act="route" data-v="hs"><b>고등학교 입학 (16세)</b><small>고교 무대에서 시작해 프로 드래프트 또는 대학 진학</small></button>
     <button class="opt ${draft.route==="high"?"on":""}" data-act="route" data-v="high"><b>고졸 신인 (18세)</b><small>곧바로 프로 드래프트</small></button>
     <button class="opt ${draft.route==="univ"?"on":""}" data-act="route" data-v="univ"><b>대졸 신인 (22세)</b><small>즉시 전력감이지만 성장 기간이 짧아요</small></button></section>
   <section class="card talent"><label class="lab">재능 뽑기</label>${t?`<div class="tal g-${t.grade.toLowerCase()}"><b>${t.grade}</b><small>${t.grade==="S"?"세계 무대까지 노려볼 재능":t.grade==="A"?"K리그 정상급으로 클 수 있어요":t.grade==="B"?"꾸준히 노력하면 주전급":"노력으로 길을 개척해야 해요"}</small></div>
     <button class="ghost" data-act="roll" ${draft.rerolls<=0?"disabled":""}>다시 뽑기 (${draft.rerolls})</button>`:`<button class="big" data-act="roll"><span>재능 뽑기</span><b>🎲</b></button>`}</section>
   <button class="big go" data-act="begin" ${t&&draft.name.trim()?"":"disabled"}><span>프로 도전</span><b>→</b></button></main>`;
}

/* ================= 드래프트 ================= */
function draftView(){
  return `<main class="home"><div class="brand"><b class="tt">K리그 신인 드래프트</b></div>
   <section class="hero"><small>${esc(S.p.name)} · ${L.POSDEF[S.p.pos].name} · OVR ${S.p.ovr}</small><h1>입단 제의가 도착했어요</h1><p>세 구단 중 한 곳을 선택하세요. 구단 수준이 높을수록 경쟁이 치열하고, 낮을수록 기회를 잡기 쉬워요.</p></section>
   ${S.offers.map((o,i)=>`<button class="offer" data-act="sign" data-v="${i}">${emblem(o.club,52)}<div><b>${esc(o.club.name)}</b><small>${L.lgLabel(o.club.lg)} · 구단 수준 ${o.lvl}</small><small>연봉 ${money(o.salary)} · ${o.years}년 · 예상 ${o.role}</small></div><span>→</span></button>`).join("")}${age()<=18?`<button class="opt" data-act="univ"><b>대학에 진학한다</b><small>4년 더 성장한 뒤 22세에 드래프트를 받아요 (더 좋은 조건을 기대할 수 있어요)</small></button>`:""}</main>`;
}

/* ================= 시즌 탭 ================= */
function seasonTab(){
  if(anim) return animView();
  const ph=S.phase;
  if(ph==="train") return trainView();
  if(ph==="result") return resultView();
  if(ph==="offseason") return (S.stage==="pro"&&S.contract)?offseasonView():`<small class="kick">${yearLabel()}</small><h2>${S.year+1}년을 준비해요</h2>${infoCard()}<p class="muted c">잠시만요…</p>`;
  return "";
}
function infoCard(extra){
  return `<section class="card prow">${emblem(S.club,64)}<div class="pmain"><small>${esc(S.club.name)}</small><b>${esc(S.p.name)} <em>${age()}세</em></b><span class="role">${S.stage==="pro"&&S.team==="2군"?"2군 · ":""}${esc(L.roleLabel(L.startRateAt(S.p.ovr,roleLvl(),S.trust,S.p)))}</span></div><div class="ptype"><small>선수 유형</small><b>${esc(S.p.typeName)}</b></div></section>${extra||""}`;
}
function roleLvl(){ if(S.stage==='youth'||S.stage==='univ') return 28+(age()-13)*4.7+S.youthTier; const d=L.defById(S.club.id); if(d) return L.clubLevel(d); const f=L.FOREIGN.find(x=>x.id===S.club.id); return f?f.lvl-2:75; }
function trainView(){
  const yrs=S.history.length;
  if(S.military==="serving"){
    return `<small class="kick">${yearLabel()}</small><h2>${S.year}년 군 복무</h2>${infoCard()}<section class="card"><p class="muted">현역으로 복무 중이에요. 그라운드를 떠나 있는 동안 몸 상태가 조금씩 떨어져요. (${S.mildone}/2년)</p><button class="big go" data-act="serve"><span>복무 이어가기</span><b>→</b></button></section>`;
  }
  const d=L.POSDEF[S.p.pos];
  const mil=S.military==="sangmu"?`<p class="note">🎖 김천 상무 복무 중 (${S.mildone+1}/2년차)</p>`:"";
  return `<small class="kick">${yearLabel()}</small><h2>${S.year}년 시즌 준비</h2>${infoCard(mil)}
   <section class="card"><h3>훈련 계획</h3><p class="muted">이번 시즌 집중해서 키울 능력치를 고르세요. 선택한 능력치가 더 많이 올라요.</p>
    <div class="chips">${d.stats.map(([k,n])=>`<button data-act="focus" data-v="${k}" class="${plan.focus===k?"on":""}">${n} <b>${S.p.stats[k]}</b></button>`).join("")}</div>
    <label class="check"><input type="checkbox" data-act="rest" ${plan.rest?"checked":""}> 몸 관리 우선 (부상 위험 ↓, 성장 약간 ↓)</label>
    <button class="big go" data-act="play" ${plan.focus?"":"disabled"}><span>시즌 시작</span><b>→</b></button>${plan.focus?"":`<p class="muted c">집중 훈련 능력치를 하나 골라 주세요.</p>`}</section>`;
}
function animView(){
  const st=["전반기 (3~6월)","중반기 (7~9월)","후반기 (10~12월)"];
  return `<section class="anim"><div class="ab"><small>SEASON</small><b>${S.year}</b><span></span><small>AGE</small><b>${age()}세</b></div><h2>${st[anim.i]||st[2]} 진행</h2><p>경기 일정과 선수 기록을 계산하고 있어요.</p><div class="prog"><i style="width:${(anim.i+1)/3*100}%"></i></div></section>`;
}
function reviewLine(R){
  if(R.military) return "그라운드를 떠나 보낸 한 해";
  if(R.awards.includes("리그 MVP")) return "리그의 주인공이 된 시즌";
  if(R.awards.includes("득점왕")) return "골로 말한 시즌";
  if(R.trophies.length) return "트로피와 함께한 시즌";
  if(R.dOvr>=4) return "한 단계 껑충 성장한 시즌";
  if(R.injury&&R.injury.severe) return "부상과 싸운 시즌";
  if(R.rating>=7.2) return "기량을 폭발시킨 시즌";
  if(R.apps<8) return "기회를 기다린 시즌";
  if(R.rating<6.1) return "아쉬움이 남은 시즌";
  return "꾸준히 자리를 지킨 시즌";
}
function resultView(){
  const R=S.lastR, gk=S.p.pos==="GK";
  if(!R) return "";
  const rows=(R.matches||[]).filter(m=>m.min>0);
  const stats=[["출전",R.apps+"경기"],[gk?"클린시트":"골",gk?R.cs:R.goals],[gk?"선발":"도움",gk?R.starts:R.assists],["평점",R.rating||"-"]];
  return `<small class="kick">${R.youth?(R.age<16?"중학교 ":"유소년·대학 "):"프로 "}${R.age}세 시즌</small><h2>${R.year} 시즌 결과</h2>
   <div class="sub2"><b>${esc(R.leagueName)}</b><span>${esc(R.role||"")}</span><span>${R.apps}경기</span></div>
   <section class="review"><small>SEASON REVIEW</small><b>${reviewLine(R)}</b></section>
   <section class="grid4">${stats.map(([k,v])=>`<div><small>${k}</small><b>${v}</b></div>`).join("")}</section>
   ${R.injury?`<p class="note warn">🩹 ${esc(R.injury.text)}</p>`:""}
   ${R.national?`<p class="note">🇰🇷 국가대표 ${esc(R.national)}</p>`:""}${(R.nationalEvents||[]).map(e=>`<p class="note">🏆 ${esc(e.t)} · ${esc(e.res)}</p>`).join("")}
   <section class="card"><small class="kick">TEAM RESULT</small><div class="trow">${emblem(R.club,40)}<b>${esc(R.club.name)}</b>${R.trophies.length?`<em>🏆 ${R.trophies.length}</em>`:""}</div>
     ${R.rank?`<div class="two"><div><small>최종 순위</small><b>${R.rank}위 / ${R.N}팀</b></div><div class="hi"><small>전적</small><b>${R.W}승 ${R.D}무 ${R.L}패</b></div></div>`:`<p class="muted">군 복무로 이번 시즌은 경기에 나서지 못했어요.</p>`}
     ${R.trophies.map(t=>`<span class="pill gold">🏆 ${esc(t)}</span>`).join("")}</section>
   ${R.awards.length?`<section class="pills">${R.awards.map(a=>`<span class="pill gold">⭐ ${esc(a)}</span>`).join("")}</section>`:""}
   <section class="ovrbox"><small>OVR 변화</small><b>${R.ovr0} <i>→</i> ${R.ovr1||S.p.ovr}</b></section>
   <button class="acc" data-act="acc">${openAcc?"▾":"▸"} 상세 기록</button>
   ${openAcc?`<section class="card det">${R.board?`<h4>득점 순위</h4>${R.board.scorers.map((x,i)=>`<div class="rank ${x.me?"me":""}"><b>${i+1}</b><span>${esc(x.name)}</span><small>${esc(x.club)}</small><em>${x.v}골</em></div>`).join("")}<h4>도움 순위</h4>${R.board.assisters.map((x,i)=>`<div class="rank ${x.me?"me":""}"><b>${i+1}</b><span>${esc(x.name)}</span><small>${esc(x.club)}</small><em>${x.v}도움</em></div>`).join("")}`:""}
     <h4>내 경기 기록</h4>${rows.slice(0,40).map(m=>`<div class="mrow ${m.res}"><b>${m.round}R</b><span>${m.home?"홈":"원정"} ${esc(m.opp)}</span><em>${m.f}:${m.a}</em><small>${m.min}분${m.g?" ⚽"+m.g:""}${m.as?" 🅰"+m.as:""} · ${m.rt}</small></div>`).join("")||"<p class='muted'>출전 기록이 없어요.</p>"}</section>`:""}
   <button class="big go" data-act="offseason"><span>스토브리그로</span><b>→</b></button>`;
}

/* ================= 스토브리그 ================= */
function offseasonView(){
  const c=S.contract;
  const lg=S.p.ovr, can=L.canRetire(S);
  return `<small class="kick">${yearLabel()}</small><h2>${S.year+1}년 스토브리그</h2>${infoCard()}
   <section class="card"><div class="three"><div><small>지난 연봉</small><b>${money(c.last)}</b></div><div><small>구단 제시액</small><b class="blue">${money(c.offer)}</b></div><div><small>인상률</small><b>${c.rate>=0?"+":""}${c.rate}%</b></div></div>
    <div class="row2"><button class="ghost" data-act="renego" ${S.renego?"disabled":""}>재협상</button><button class="big go sm" data-act="accept"><span>수락 후 시즌 진행</span><b>→</b></button></div></section>
   <button class="wide" data-act="market">트레이드 요청</button>
   <div class="row2"><button class="wide red" data-act="retire" ${can?"":"disabled"}>현역 은퇴</button><button class="wide" data-act="reset">새로운 인생 시작</button></div>
   ${can?"":`<p class="muted c">은퇴는 만 30세부터 선택할 수 있어요.</p>`}`;
}

/* ================= 모달 ================= */
function modalHtml(){
  const m=modal;
  if(m.t==="interest"){
    const o=m.offer;
    if(m.done) return `<div class="ov"><div class="dlg"><div class="kk"><span class="tag">스토브리그</span> · OFFSEASON EVENT</div><h3>트레이드 제안</h3><div class="quote">${esc(m.msg)}</div><div class="resbox"><small>선택 결과</small><b>${esc(m.done)}</b><hr><p>${esc(m.doneDesc)}</p></div><button class="big go" data-act="evnext"><span>확인 후 스토브리그로</span><b>→</b></button></div></div>`;
    return `<div class="ov"><div class="dlg"><div class="kk"><span class="tag">스토브리그</span> · OFFSEASON EVENT</div><h3>트레이드 제안</h3><div class="quote">${esc(o.club.name)}이(가) 영입 의사를 전달했습니다.</div>
     <div class="offerbox">${emblem(o.club,52)}<div><b>${esc(o.club.name)}</b><small>${esc(o.tag||L.lgLabel(o.club.lg))} · 구단 수준 ${o.lvl}</small><small>연봉 ${money(o.salary)} · ${o.years}년${o.role?" · 예상 "+o.role:""}</small></div></div>
     <div class="row2"><button class="ghost" data-act="evstay">원소속팀 잔류</button><button class="big go sm" data-act="evgo"><span>이적한다</span><b>→</b></button></div></div></div>`;
  }
  if(m.t==="mil"){
    return `<div class="ov"><div class="dlg"><div class="kk"><span class="tag">병역</span> · MILITARY</div><h3>병역 의무</h3><div class="quote">만 ${m.age}세가 되었습니다. ${m.must?"더 이상 입대를 미룰 수 없어요.":"입대 시기를 정해야 해요."}</div>
     ${m.msg?`<p class="note warn">${esc(m.msg)}</p>`:""}
     <button class="opt" data-act="milsangmu" ${m.canMil&&!m.failed?"":"disabled"}><b>김천 상무 지원</b><small>${m.canMil?(m.failed?"이번엔 탈락했어요":"합격하면 2년간 선수 생활을 이어가요 (합격률 약 70%)"):"OVR 66 이상이어야 지원할 수 있어요"}</small></button>
     <button class="opt" data-act="milarmy"><b>현역 입대</b><small>2년간 그라운드를 떠나요. 능력치가 조금 떨어질 수 있어요</small></button>
     ${m.must?"":`<button class="opt" data-act="milskip"><b>입대 연기</b><small>만 29세 전까지는 미룰 수 있어요</small></button>`}</div></div>`;
  }
  if(m.t==="callup") return `<div class="ov"><div class="dlg"><div class="kk">· FIRST TEAM CALL-UP</div><h3>1군 콜업</h3><p class="muted">스프링캠프와 최근 기량을 인정받아 개막 1군 엔트리에 합류합니다.</p><div class="swap"><div><small>이전 소속</small><b>2군</b></div><span>→</span><div class="hi"><small>새 소속</small><b>1군</b></div></div><button class="big go" data-act="evcallup"><span>1군 합류 확인</span><b>✓</b></button></div></div>`;
  if(m.t==="demote") return `<div class="ov"><div class="dlg"><div class="kk">· RESERVE TEAM</div><h3>2군 합류 통보</h3><p class="muted">출전 기회가 적어 다음 시즌은 2군에서 경기 감각을 키우기로 했습니다.</p><div class="swap"><div><small>이전 소속</small><b>1군</b></div><span>→</span><div class="hi"><small>새 소속</small><b>2군</b></div></div><button class="big go" data-act="evdemote"><span>확인</span><b>✓</b></button></div></div>`;
  if(m.t==="poschange"){ const o=m.offer; return `<div class="ov"><div class="dlg"><div class="kk">POSITION CHANGE PROPOSAL</div><h3>다음 시즌 포지션 변경 제안</h3><p class="muted">${o.group?"코칭스태프가 새로운 포지션에서 더 큰 가능성을 봤어요. ":"비슷한 자리에서 역할을 바꿔 보자는 제안이에요. "}원하는 포지션을 직접 선택할 수 있습니다.</p><div class="swap"><div><small>현재 포지션</small><b>${esc(subName())}</b></div><span>→</span><div class="hi"><small>제안 포지션</small><b>${esc(o.name)}</b></div></div><div class="row2"><button class="ghost" data-act="evnochange">현재 포지션 유지</button><button class="big go sm" data-act="evchange"><span>변경 수락</span><b>✓</b></button></div></div></div>`; }
  if(m.t==="natl"){ const c=m.list[m.i]; return `<div class="ov"><div class="dlg"><div class="kk">${S.lastR.year} NATIONAL TEAM</div><h3>국가대표팀에 선발되었습니다</h3><p class="muted">대표팀 참가 여부를 결정하세요. 참가하면 대회 결과가 기록과 병역에 반영될 수 있어요.</p><div class="offerbox"><div><small>INTERNATIONAL</small><b>${esc(c.name)}</b><small>${c.wild?"와일드카드 선발":"정식 선발"}${c.exemptMedal?" · "+(c.exemptMedal==="gold"?"금메달 시 병역 특례":"동메달 이상 병역 특례"):""}</small></div></div><button class="ghost" data-act="natno">참가하지 않음</button><button class="big go" data-act="natyes"><span>대표팀 참가</span><b>→</b></button></div></div>`; }
  if(m.t==="natres") return `<div class="ov"><div class="dlg"><div class="kk">TOURNAMENT RESULT</div><h3>${esc(m.name)}</h3><div class="quote">${esc(m.text)}</div><button class="big go" data-act="natnext"><span>확인</span><b>→</b></button></div></div>`;
  if(m.t==="retired"){
    return `<div class="ov"><div class="dlg"><h3>${esc(m.title)}</h3><div class="quote">${esc(m.msg)}</div><button class="big go" data-act="evnext"><span>확인</span><b>→</b></button></div></div>`;
  }
  if(m.t==="market"){
    return `<div class="ov"><div class="dlg"><div class="kk"><span class="tag">스토브리그</span> · TRANSFER MARKET</div><h3>이적 시장</h3>
     ${m.list.length?m.list.map((o,i)=>`<button class="offer" data-act="mkgo" data-v="${i}">${emblem(o.club,46)}<div><b>${esc(o.club.name)}</b><small>${esc(o.tag||L.lgLabel(o.club.lg))} · 구단 수준 ${o.lvl}</small><small>연봉 ${money(o.salary)} · ${o.years}년${o.role?" · 예상 "+o.role:""}</small></div><span>→</span></button>`).join(""):`<p class="muted">지금은 관심을 보이는 구단이 없어요. 활약을 더 보여 주세요.</p>`}
     <button class="ghost" data-act="close">닫기</button></div></div>`;
  }
  if(m.t==="confirm"){
    return `<div class="ov"><div class="dlg"><h3>${esc(m.title)}</h3><div class="quote">${esc(m.msg)}</div><div class="row2"><button class="ghost" data-act="close">취소</button><button class="big ${m.red?"red":"go"} sm" data-act="${m.yes}"><span>확인</span></button></div></div></div>`;
  }
  return "";
}

/* ================= 커리어 / 선수 / 우승 ================= */
function careerTab(){
  const c=S.career, h=S.history, gk=S.p.pos==="GK";
  const pro=h.filter(x=>!x.youth), clubs=new Set(pro.map(x=>x.clubId)).size, avg=c.ratingN?(c.ratingSum/c.ratingN).toFixed(2):"-";
  const grid=[["경기",c.apps],["선발",c.starts],[gk?"클린시트":"골",gk?c.cs:c.goals],["도움",c.assists],["공격 포인트",c.goals+c.assists],["평균 평점",avg],["MOM",c.mom],["A매치",c.caps],["A매치 골",c.intGoals],["우승",S.trophies.length],["수상",S.awards.length],["출전 시간",Math.round(c.minutes/60)+"시간"]];
  const last=pro.slice(-5);
  const chart=last.length>1?(()=>{ const W=300,H=110,pad=18; const vals=last.map(x=>x.rating||0); const lo=Math.min(5.5,...vals.filter(v=>v>0)),hi=Math.max(8,...vals); const px=i=>pad+i*(W-2*pad)/(last.length-1), py=v=>H-pad-(v-lo)/(hi-lo)*(H-2*pad);
    return `<svg viewBox="0 0 ${W} ${H}" class="chart"><polyline fill="none" stroke="#0a7be0" stroke-width="3" points="${vals.map((v,i)=>px(i)+","+py(v||lo)).join(" ")}"/>${vals.map((v,i)=>`<circle cx="${px(i)}" cy="${py(v||lo)}" r="4.5" fill="#fff" stroke="#0a7be0" stroke-width="3"/><text x="${px(i)}" y="${H-3}" text-anchor="middle" font-size="10" fill="#667">${last[i].year}</text>`).join("")}</svg>`; })():`<p class="muted">시즌이 쌓이면 그래프가 나타나요.</p>`;
  const ms=[["apps",100,"100경기 출전"],["apps",200,"200경기 출전"],["apps",300,"300경기 출전"],["goals",50,"50골"],["goals",100,"100골"],["goals",200,"200골"],["assists",50,"50도움"],["assists",100,"100도움"],["caps",50,"A매치 50경기"]].filter(m=>!(gk&&m[0]==="goals"));
  const next=ms.filter(m=>c[m[0]]<m[1]).slice(0,3);
  return `<small class="kick">CAREER</small><h2>진행 중 커리어</h2>
   <section class="grid4 four"><div><small>프로 경력</small><b>${pro.length}시즌</b></div><div><small>소속 구단</small><b>${clubs}팀</b></div><div><small>현재 계약</small><b>${S.contractYears}년</b></div><div><small>병역</small><b>${({none:"미필",exempt:"면제",served:"완료",sangmu:"상무",serving:"복무"})[S.military]||"-"}</b></div></section>
   <h3 class="sh">통산 핵심 기록</h3><section class="g12">${grid.map(([k,v])=>`<div><small>${k}</small><b>${v}</b></div>`).join("")}</section>
   <h3 class="sh">최근 5시즌 평점</h3><section class="card">${chart}</section>
   <h3 class="sh">다음 이정표</h3>${next.map(m=>`<div class="mile"><div><b>${m[2]}</b><small>${m[1]-c[m[0]]} 남음</small></div><span class="bar"><i style="width:${c[m[0]]/m[1]*100}%"></i></span></div>`).join("")||"<p class='muted'>모든 이정표를 달성했어요!</p>"}
   <h3 class="sh">수상 및 주요 경력</h3><section class="card pills">${S.awards.concat(S.trophies).slice(-14).map(a=>`<span class="pill gold">🏆 ${esc(a.name)} · ${a.year}</span>`).join("")||"<p class='muted'>아직 없어요.</p>"}</section>
   <h3 class="sh">시즌 기록</h3>${h.slice().reverse().map(x=>`<div class="slog"><b>${x.year} · ${esc(x.club)}${x.youth?" <em class='pill'>유소년·대학</em>":""}${x.team==="2군"&&!x.youth?" <em class='pill'>2군</em>":""}</b><small>${esc(x.leagueName||"")}${x.rank?" "+x.rank+"위":""} · ${x.apps}경기 ${S.p.pos==="GK"?x.cs+"클린시트":x.goals+"골 "+x.assists+"도움"} · 평점 ${x.rating||"-"} · OVR ${x.ovr1||""}</small></div>`).join("")||"<p class='muted'>첫 시즌을 치르면 기록이 쌓여요.</p>"}`;
}
function playerTab(){
  const p=S.p, d=L.POSDEF[p.pos];
  return `<small class="kick">PLAYER</small><h2>${esc(p.name)}</h2>
   <section class="card prow">${emblem(S.club,56)}<div class="pmain"><small>${esc(S.club.name)} · ${L.lgLabel(S.club.lg)}</small><b>${esc(subName())}</b><span class="role">${esc(p.typeName)}</span></div><div class="ptype"><small>OVR</small><b>${p.ovr}</b></div></section>
   <section class="card"><h3>능력치</h3>${d.stats.map(([k,n])=>{ const v=p.stats[k],[g,c]=statGrade(v); return `<div class="abil"><span>${n}</span><b>${v}</b><i class="gr ${c}">${g}</i><span class="bar"><i style="width:${v}%"></i></span></div>`; }).join("")}</section>
   <section class="card infos"><div><small>잠재력 등급</small><b>${p.grade}</b></div><div><small>키</small><b>${p.height}cm</b></div><div><small>최고 OVR</small><b>${p.peak}</b></div><div><small>연봉</small><b>${money(S.salary)}</b></div><div><small>계약</small><b>${S.contractYears}년</b></div><div><small>평판</small><b>${Math.round(S.rep)}</b></div><div><small>감독 신뢰</small><b>${Math.round(S.trust*100)}</b></div><div><small>병역</small><b>${({none:"미필",exempt:"면제",served:"완료",sangmu:"상무 복무",serving:"복무 중"})[S.military]}</b></div></section>`;
}
function honorsTab(){
  const t=S.trophies, a=S.awards;
  return `<small class="kick">HONORS</small><h2>우승 연혁</h2>
   <section class="card">${t.length?t.slice().reverse().map(x=>`<div class="hrow"><b>${x.year}</b><span>${esc(x.name)}</span><small>${esc(x.club)}</small></div>`).join(""):"<p class='muted'>아직 우승 기록이 없어요.</p>"}</section>
   <h3 class="sh">개인 수상</h3><section class="card">${a.length?a.slice().reverse().map(x=>`<div class="hrow"><b>${x.year}</b><span>${esc(x.name)}</span></div>`).join(""):"<p class='muted'>아직 수상 기록이 없어요.</p>"}</section>
   <h3 class="sh">모멘트</h3>${S.moments.slice().reverse().slice(0,12).map(m=>`<div class="slog"><b>${m.year} · ${m.age}세 ${m.badge?`<em class="pill">${esc(m.badge)}</em>`:""}</b><small>${esc(m.text)}</small></div>`).join("")}`;
}

/* ================= 은퇴 ================= */
function retiredView(){
  const lg=L.legacy(S), p=S.p, c=S.career;
  const best=S.history.slice().sort((a,b)=>(b.rating||0)*(b.apps||0)-(a.rating||0)*(a.apps||0)).slice(0,3);
  const d=L.POSDEF[p.pos];
  const g=lg.total>=2200?"S":lg.total>=1600?"A":lg.total>=1200?"B":lg.total>=800?"C":"D";
  return `<main class="home"><div class="brand"><b class="tt">${esc(p.name)} 은퇴</b></div>
   <section class="legacy"><div class="lhead">${emblem(S.club,56)}<div><b>${esc(p.name)}</b><small>${esc(S.club.name)} · ${esc(subName())} · 은퇴 ${age()}세</small></div></div>
    <div class="lscore"><small>LEGACY SCORE</small><b>${lg.total}점 <i class="gr g-${g.toLowerCase()}">${g}</i></b></div>
    <div class="g5"><div><small>선수 가치</small><b>${lg.value}</b></div><div><small>누적 기록</small><b>${lg.rec}</b></div><div><small>수상</small><b>${lg.aw}</b></div><div><small>우승</small><b>${lg.tr}</b></div><div><small>국가대표</small><b>${lg.nat}</b></div></div>
    <div class="peak"><small>PRIME ABILITY</small>${d.stats.map(([k,n])=>`<div class="abil"><span>${n}</span><b>${p.stats[k]}</b><span class="bar"><i style="width:${p.stats[k]}%"></i></span></div>`).join("")}</div></section>
   <section class="grid4"><div><small>경기</small><b>${c.apps}</b></div><div><small>${p.pos==="GK"?"클린시트":"골"}</small><b>${p.pos==="GK"?c.cs:c.goals}</b></div><div><small>도움</small><b>${c.assists}</b></div><div><small>A매치</small><b>${c.caps}</b></div></section>
   <h3 class="sh">가장 빛난 3년</h3>${best.map((x,i)=>`<div class="slog"><b>${i+1}. ${x.year} · ${x.age}세 · ${esc(x.club)}</b><small>${x.apps}경기 ${p.pos==="GK"?x.cs+"클린시트":x.goals+"골 "+x.assists+"도움"} · 평점 ${x.rating}</small></div>`).join("")}
   <h3 class="sh">커리어 연대기</h3>${S.moments.map(m=>`<div class="slog"><b>${m.year} · ${m.age}세 <em class="pill">${esc(m.badge||"")}</em></b><small>${esc(m.text)}</small></div>`).join("")}
   <button class="big go" data-act="reset2"><span>새로운 인생 시작</span><b>→</b></button><p class="links"><a href="index.html">감독 버전으로</a></p></main>`;
}

/* ================= 동작 ================= */
function startSeason(){
  anim={i:0}; render();
  const R=L.simSeason(S,{focus:plan.focus,rest:plan.rest}); S.lastR=R; S.plan=null; save();
  const step=()=>{ if(!anim) return; anim.i++; if(anim.i>=3){ anim=null; checkCallups(); render(); return; } render(); setTimeout(step,650); };
  setTimeout(step,650);
}
function checkCallups(){ const R=S&&S.lastR; if(R&&R.callups&&R.callups.length&&!R.callupsDone&&S.phase==="result"&&!modal) modal={t:"natl",list:R.callups,i:0}; }
function buildEvents(){
  const ev=L.offseasonEvents(S);
  const offers=L.transferOffers(S);
  if(S.stage==="pro"&&offers.length&&Math.random()<.4+S.rep/200) ev.push({t:"interest",offer:offers[Math.floor(Math.random()*offers.length)]});
  S.market=offers; return ev;
}
function toOffseason(){
  openAcc=false;
  if(S.stage==="youth"||S.stage==="univ"){ S.afterEv="youth"; S.ev=L.offseasonEvents(S).filter(e=>e.t==="poschange"); S.phase="offseason"; save(); runEvents(); return; }
  if(S.military==="serving"){ L.nextYear(S); S.phase="train"; plan={focus:null,rest:false}; save(); render(); return; }
  S.contract=L.contractOffer(S); S.renego=false; S.phase="offseason"; S.ev=buildEvents(); save(); runEvents();
}
function runEvents(){
  const e=S.ev&&S.ev.shift(); save();
  if(!e){ modal=null; if(S.afterEv==="youth"){ S.afterEv=null; L.nextYear(S); plan={focus:null,rest:false}; if(S.phase==="draft"){ view="draft"; } save(); render(); return; } render(); return; }
  if(e.t==="forceRetire"){ modal={t:"retired",title:"은퇴를 결심합니다",msg:S.p.name+" 선수는 긴 선수 생활을 마무리하기로 했습니다."}; S.ev=[{t:"__retire"}]; render(); return; }
  if(e.t==="__retire"){ doRetire(); return; }
  if(e.t==="mil"){ modal={t:"mil",must:e.must,canMil:e.canMil,age:e.age,failed:false}; render(); return; }
  if(e.t==="callup"){ modal={t:"callup"}; render(); return; }
  if(e.t==="demote"){ modal={t:"demote"}; render(); return; }
  if(e.t==="poschange"){ modal={t:"poschange",offer:e.offer}; render(); return; }
  if(e.t==="interest"){ modal={t:"interest",offer:e.offer,msg:e.offer.club.name+"이(가) 영입 의사를 전달했습니다."}; render(); return; }
  runEvents();
}
function doRetire(){
  S.retired=true; S.phase="retired"; const lg=L.legacy(S);
  const hof=rd(HOF)||[]; hof.push({name:S.p.name,pos:POSK[S.p.pos],peak:S.p.peak,seasons:S.history.length,goals:S.career.goals,assists:S.career.assists,score:lg.total,at:Date.now()}); wr(HOF,hof.slice(-30));
  view="retired"; modal=null; save(); render();
}
function nextSeason(){
  L.acceptContract(S,S.contract); L.nextYear(S); S.phase="train"; plan={focus:null,rest:false}; S.ev=[]; modal=null; tab="season"; save(); render();
  if(S.promoNote) say(S.promoNote);
}
function act(a,b){
  const v=b&&b.dataset.v;
  switch(a){
    case "tab": tab=v; render(); break;
    case "new": draft={name:"",pos:"FW",sub:"ST",type:"finisher",route:"mid",talent:null,rerolls:1}; view="create"; render(); break;
    case "home": view="home"; render(); break;
    case "continue": view=S.retired?"retired":S.phase==="draft"?"draft":S.club?"game":"draft"; render(); break;
    case "wipe": if(confirm("저장된 인생을 삭제할까요? (명예의 전당은 남아요)")){ localStorage.removeItem(KEY); S=null; view="home"; render(); } break;
    case "pos": draft.name=($("nm")||{value:draft.name}).value; draft.pos=v; draft.sub=L.POSDEF[v].subs[0][0]; draft.type=L.TYPES[v][0][0]; render(); break;
    case "sub": draft.name=$("nm").value; draft.sub=v; render(); break;
    case "type": draft.name=$("nm").value; draft.type=v; render(); break;
    case "route": draft.name=$("nm").value; draft.route=v; render(); break;
    case "roll": draft.name=($("nm")||{value:draft.name}).value; if(draft.talent){ if(draft.rerolls<=0) break; draft.rerolls--; } draft.talent=L.rollTalent(); render(); break;
    case "begin": { draft.name=$("nm").value.trim(); if(!draft.name||!draft.talent) break;
      S=L.create({name:draft.name,pos:draft.pos,sub:draft.sub,type:draft.type,route:draft.route,talent:draft.talent});
      if(S.stage==="pro"){ S.offers=L.draftOffers(S); S.phase="draft"; view="draft"; } else { plan={focus:null,rest:false}; view="game"; tab="season"; } save(); render(); break; }
    case "univ": L.chooseUniv(S); plan={focus:null,rest:false}; view="game"; tab="season"; save(); render(); break;
    case "sign": L.signWith(S,S.offers[+v]); plan={focus:null,rest:false}; view="game"; tab="season"; save(); render(); break;
    case "focus": plan.focus=v; render(); break;
    case "rest": plan.rest=b.checked; break;
    case "play": if(plan.focus) startSeason(); break;
    case "serve": startSeason(); break;
    case "acc": openAcc=!openAcc; render(); break;
    case "offseason": toOffseason(); break;
    case "renego": if(!S.renego){ S.renego=true; const r=L.negotiate(S,S.contract); S.contract=Object.assign({},S.contract,{offer:r.offer,rate:r.rate}); save(); say(r.mult>1?"재협상 성공! 제시액이 올랐어요.":r.mult<1?"구단이 불쾌해하며 제시액을 낮췄어요.":"구단이 제시액을 그대로 유지했어요."); } break;
    case "accept": nextSeason(); break;
    case "market": modal={t:"market",list:S.market&&S.market.length?S.market:L.transferOffers(S)}; render(); break;
    case "mkgo": { const o=modal.list[+v]; L.doTransfer(S,o); S.contract=L.contractOffer(S); S.contract.offer=o.salary; S.contract.years=o.years; S.contract.rate=Math.round((o.salary/Math.max(.1,S.contract.last)-1)*100); modal=null; save(); render(); say(o.club.name+"으로 이적했어요."); break; }
    case "close": modal=null; render(); break;
    case "retire": modal={t:"confirm",title:"현역 은퇴",msg:"정말 은퇴할까요? 은퇴하면 커리어가 마무리되고 레거시 점수가 정해져요.",yes:"retire2",red:true}; render(); break;
    case "retire2": doRetire(); break;
    case "reset": modal={t:"confirm",title:"새로운 인생 시작",msg:"지금 인생을 포기하고 처음부터 시작할까요? (기록은 남지 않아요)",yes:"reset2",red:true}; render(); break;
    case "reset2": localStorage.removeItem(KEY); S=null; draft={name:"",pos:"FW",sub:"ST",type:"finisher",route:"mid",talent:null,rerolls:1}; modal=null; view="create"; render(); break;
    case "evstay": modal=Object.assign({},modal,{done:"원소속팀 잔류",doneDesc:"이적 제안을 거절하고 현재 팀에서 선수 생활을 이어갑니다."}); render(); break;
    case "evgo": { const o=modal.offer; L.doTransfer(S,o); S.contract=L.contractOffer(S); S.contract.offer=o.salary; S.contract.years=o.years; S.contract.rate=Math.round((o.salary/Math.max(.1,S.contract.last)-1)*100); S.market=[];
      modal=Object.assign({},modal,{done:o.club.name+" 이적",doneDesc:o.club.name+"에서 새로운 시즌을 시작합니다. (연봉 "+money(o.salary)+")"}); save(); render(); break; }
    case "evnext": modal=null; runEvents(); break;
    case "milsangmu": { const ok=Math.random()<.7; if(ok){ L.enlist(S,"sangmu"); S.contract={last:S.salary,offer:.3,rate:0,years:2}; S.salary=.3; modal={t:"retired",title:"상무 합격",msg:"김천 상무에 합격했습니다. 2년 동안 선수 생활과 복무를 병행합니다."}; S.ev=[{t:"__sangmu"}]; S.market=[]; save(); render(); }
      else { modal=Object.assign({},modal,{failed:true,msg:"김천 상무 선발에서 탈락했습니다."}); render(); } break; }
    case "milarmy": L.enlist(S,"army"); modal={t:"retired",title:"입대",msg:"현역으로 입대했습니다. 2년 뒤 그라운드로 돌아옵니다."}; S.ev=[{t:"__army"}]; save(); render(); break;
    case "milskip": modal=null; runEvents(); break;
    case "evcallup": S.team="1군"; modal=null; runEvents(); break;
    case "evdemote": S.team="2군"; modal=null; runEvents(); break;
    case "evchange": L.changePosition(S,modal.offer); modal=null; save(); runEvents(); break;
    case "evnochange": modal=null; runEvents(); break;
    case "natyes": case "natno": { const R=S.lastR, c=modal.list[modal.i]; const res=L.joinTournament(S,R,c,a==="natyes"); save(); modal={t:"natres",name:c.name,text:res.text,list:modal.list,i:modal.i}; render(); break; }
    case "natnext": { const nl=modal.list, ni=modal.i+1; if(ni<nl.length){ modal={t:"natl",list:nl,i:ni}; } else { S.lastR.callupsDone=true; save(); modal=null; } render(); break; }
  }
  /* 특별 이벤트 처리 */
  if(a==="evnext" && S && S.ev && S.ev[0] && (S.ev[0].t==="__sangmu"||S.ev[0].t==="__army")){ const e=S.ev.shift(); modal=null;
    if(e.t==="__army"){ L.nextYear(S); S.phase="train"; plan={focus:null,rest:false}; S.ev=[]; save(); render(); } else { nextSeason(); } }
}
app.addEventListener("click",e=>{ const b=e.target.closest("[data-act]"); if(!b||b.tagName==="INPUT") return; act(b.dataset.act,b); });
app.addEventListener("change",e=>{ const b=e.target.closest("[data-act]"); if(b&&b.tagName==="INPUT") act(b.dataset.act,b); });
app.addEventListener("input",e=>{ if(e.target.id==="nm"){ draft.name=e.target.value; const go=document.querySelector("[data-act=begin]"); if(go) go.disabled=!(draft.talent&&draft.name.trim()); } });
checkCallups(); render();
window.__LIFE={S:()=>S,view:()=>view,act,render};
})();

/* K-레전드 38 게임 로직: 스핀, 드래프트, 시뮬레이션, 결과 화면 */
(function(){
"use strict";

/* ===== 밸런스 설정: 여기 숫자만 바꿔도 난이도가 바뀌어요 ===== */
const CONFIG = {
  RESPINS: 2,          // 게임당 다시 스핀 횟수
  GOAL_BASE: 1.35,     // 실력이 같을 때 한 팀의 평균 득점
  SPREAD: 7,           // 작을수록 실력 차이가 결과에 크게 반영됨
  HOME_ADV: 0.6,       // 홈 어드밴티지 (능력치 점수)
  CHEM_PER_PAIR: 0.4,  // 같은 팀 출신 2명당 케미 보너스
  CHEM_MAX: 2,         // 케미 보너스 상한
  OUT_OF_POS: 2        // 보조 포지션에 세웠을 때 능력치 감점
};
const RAW = window.KL_DATA;
const SQUADS = RAW.map((r,i)=>({id:i,club:r[0],short:r[1],era:r[2],str:r[3],
  players:r[4].map(p=>({name:p[0],pos:p[1],ovr:p[2],alt:p[3]||null,sq:i}))}));
const tag = s => s.short+" "+s.era.replace(/^20|^19/,"'").replace(/–(20|19)?/,"–");

const FORMS = {
 "4-3-3":[["GK",50,90],["LB",14,70],["CB",37,75],["CB",63,75],["RB",86,70],["CM",28,50],["CM",50,55],["CM",72,50],["LW",17,24],["ST",50,15],["RW",83,24]],
 "4-4-2":[["GK",50,90],["LB",14,70],["CB",37,75],["CB",63,75],["RB",86,70],["LM",14,45],["CM",38,51],["CM",62,51],["RM",86,45],["ST",36,19],["ST",64,19]],
 "3-5-2":[["GK",50,90],["CB",26,74],["CB",50,77],["CB",74,74],["LWB",10,47],["CM",32,55],["AM",50,40],["CM",68,55],["RWB",90,47],["ST",36,18],["ST",64,18]],
 "4-2-3-1":[["GK",50,90],["LB",14,70],["CB",37,75],["CB",63,75],["RB",86,70],["DM",36,59],["DM",64,59],["LW",17,35],["AM",50,37],["RW",83,35],["ST",50,14]]
};
const GROUP = {GK:"GK",LB:"DF",CB:"DF",RB:"DF",CM:"MF",DM:"MF",AM:"MF",LM:"MF",RM:"MF",LWB:"MF",RWB:"MF",LW:"FW",ST:"FW",RW:"FW"};

const $ = id => document.getElementById(id);
const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const store = {get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

let S; // state
function newState(form){
  S = {form:form||"4-3-3", xi:Array(11).fill(null), squad:null, selected:null, respins:CONFIG.RESPINS, spinning:false, done:false, picks:0};
}

/* ---------- render setup ---------- */
function renderForms(){
  const seg=$("formSeg"); seg.innerHTML="";
  Object.keys(FORMS).forEach(f=>{
    const b=document.createElement("button"); b.type="button"; b.textContent=f;
    b.setAttribute("aria-pressed", String(f===S.form)); b.disabled = S.picks>0 && f!==S.form;
    b.onclick=()=>{ if(S.picks>0) return; S.form=f; renderForms(); renderPitch(); };
    seg.appendChild(b);
  });
}
function hard(){ return $("hard").checked; }

function eligibleSlots(p){
  if(!p) return [];
  const names = new Set(S.xi.filter(Boolean).map(x=>x.name));
  if(names.has(p.name)) return [];
  return FORMS[S.form].map((s,i)=>({s,i})).filter(({s,i})=>!S.xi[i] && (GROUP[s[0]]===p.pos || GROUP[s[0]]===p.alt)).map(o=>o.i);
}

function renderPitch(){
  const pitch=$("pitch"); pitch.querySelectorAll(".slot").forEach(n=>n.remove());
  const can = new Set(eligibleSlots(S.selected));
  FORMS[S.form].forEach((s,i)=>{
    const p=S.xi[i]; const b=document.createElement("button"); b.type="button";
    b.className="slot"+(p?" filled":"")+(can.has(i)?" can":"");
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
  const filled=S.xi.filter(Boolean).length;
  $("cntV").textContent=filled+"/11";
  const r = filled ? rate(S.xi) : null;
  const hide = hard() && !S.done;
  $("attV").textContent = r && !hide ? r.att.toFixed(1) : "–";
  $("defV").textContent = r && !hide ? r.def.toFixed(1) : "–";
  $("chemV").textContent = "+"+(r? r.chem:0).toFixed(1);
  const pr=$("progress"); pr.innerHTML=""; for(let k=0;k<11;k++){const i=document.createElement("i"); if(k<filled) i.className="on"; pr.appendChild(i);}
  $("simBtn").disabled = filled<11 || S.done;
  $("spinBtn").disabled = filled>=11 || S.spinning || !!S.squad;
  $("respinBtn").disabled = !S.squad || S.respins<=0 || S.spinning;
  $("respinBtn").textContent = "다시 스핀 ("+S.respins+")";
}

function renderList(){
  const ul=$("plist"); ul.innerHTML="";
  if(!S.squad) return;
  const used=new Set(S.xi.filter(Boolean).map(x=>x.name));
  const order={GK:0,DF:1,MF:2,FW:3};
  S.squad.players.slice().sort((a,b)=>order[a.pos]-order[b.pos]||b.ovr-a.ovr).forEach(p=>{
    const li=document.createElement("li"); const b=document.createElement("button"); b.type="button"; b.className="prow";
    const ok = eligibleSlots(p).length>0;
    b.disabled=!ok; b.setAttribute("aria-pressed", String(S.selected===p));
    const pos=document.createElement("span"); pos.className="pos "+p.pos; pos.textContent=p.pos;
    const n=document.createElement("span"); n.className="n"; n.textContent=p.name;
    const sm=document.createElement("small"); sm.textContent = used.has(p.name)?"이미 선발":(p.alt?p.pos+"/"+p.alt:(ok?"":"빈 자리 없음")); n.appendChild(sm);
    const o=document.createElement("span"); o.className="ovr"; o.textContent = hard()? "??" : p.ovr;
    b.append(pos,n,o);
    b.onclick=()=>{ S.selected = (S.selected===p?null:p); const slots=eligibleSlots(S.selected);
      if(S.selected && slots.length===1){ place(slots[0]); return; }
      $("hint").textContent = S.selected ? S.selected.name+"을(를) 넣을 자리를 경기장에서 눌러 주세요." : "선수를 골라 주세요.";
      renderList(); renderPitch(); };
    li.appendChild(b); ul.appendChild(li);
  });
}

/* ---------- draft ---------- */
function anyEligible(sq){ return sq.players.some(p=>eligibleSlots(p).length>0); }

function spin(isRespin){
  if(S.spinning) return;
  if(isRespin){ if(S.respins<=0) return; S.respins--; }
  S.spinning=true; S.squad=null; S.selected=null; renderList(); renderPitch();
  const pool = SQUADS.filter(anyEligible);
  const target = pool[Math.floor(Math.random()*pool.length)];
  const reel=$("reel"); reel.classList.add("spin");
  const steps = reduce?1:16; let k=0;
  const tick=()=>{
    k++;
    const sq = k>=steps ? target : SQUADS[Math.floor(Math.random()*SQUADS.length)];
    $("reelClub").textContent=sq.club; $("reelEra").textContent=sq.era+" 시즌";
    if(k<steps){ setTimeout(tick, 40+k*k*1.4); }
    else{ reel.classList.remove("spin"); S.spinning=false; S.squad=target;
      $("hint").textContent="이 팀에서 선수 한 명을 고르세요."; renderList(); renderPitch(); }
  };
  tick();
}

function place(i){
  if(!S.selected) return;
  S.xi[i]=S.selected; S.picks++; S.selected=null; S.squad=null;
  const filled=S.xi.filter(Boolean).length;
  $("reelClub").textContent = filled<11 ? "다음 스핀" : "베스트 11 완성";
  $("reelEra").textContent = filled<11 ? (11-filled)+"자리 남음" : "시즌을 시작하세요";
  $("hint").textContent = filled<11 ? "스핀을 눌러 다음 팀을 뽑으세요." : "38라운드 시즌을 시뮬레이션해 보세요.";
  renderForms(); renderList(); renderPitch();
}

/* ---------- ratings & sim ---------- */
function avg(a){return a.length? a.reduce((x,y)=>x+y,0)/a.length : 60;}
function rate(xi){
  const slots=FORMS[S.form]; const g={GK:[],DF:[],MF:[],FW:[]};
  xi.forEach((p,i)=>{ if(!p) return; const grp=GROUP[slots[i][0]]; const pen = (p.pos===grp)?0:CONFIG.OUT_OF_POS; g[grp].push(p.ovr-pen); });
  const gk=avg(g.GK), df=avg(g.DF), mf=avg(g.MF), fw=avg(g.FW);
  const cnt={}; xi.forEach(p=>{ if(p) cnt[p.sq]=(cnt[p.sq]||0)+1; });
  let pairs=0; Object.values(cnt).forEach(c=>pairs+=c*(c-1)/2);
  const chem=Math.min(CONFIG.CHEM_MAX, pairs*CONFIG.CHEM_PER_PAIR);
  return {att: fw*.5+mf*.35+df*.15+chem, def: df*.45+gk*.25+mf*.3+chem, chem};
}
function poisson(l){ const L=Math.exp(-l); let k=0,p=1; do{k++; p*=Math.random();}while(p>L); return k-1; }
function pickScorer(players){
  const w={GK:0,DF:.5,MF:2.4,FW:5};
  const ws=players.map(p=>w[p.g||p.pos]*Math.max(1,p.ovr-62)); const tot=ws.reduce((a,b)=>a+b,0);
  let r=Math.random()*tot; for(let i=0;i<players.length;i++){ r-=ws[i]; if(r<=0) return players[i]; } return players[players.length-1];
}
function schedule(n){
  const t=[...Array(n).keys()]; const rounds=[];
  for(let r=0;r<n-1;r++){
    const pr=[]; for(let i=0;i<n/2;i++){ const a=t[i], b=t[n-1-i]; pr.push((r+i)%2? [a,b]:[b,a]); }
    rounds.push(pr); t.splice(1,0,t.pop());
  }
  return rounds.concat(rounds.map(pr=>pr.map(([a,b])=>[b,a])));
}
function simulate(){
  const me=rate(S.xi);
  const slots=FORMS[S.form];
  const myPlayers=S.xi.map((p,i)=>({...p,g:GROUP[slots[i][0]]}));
  const opps=SQUADS.slice().sort(()=>Math.random()-.5).slice(0,19);
  const teams=[{name:$("teamName").value.trim()||"레전드 FC",sub:S.form,me:true,att:me.att,def:me.def}]
    .concat(opps.map(o=>{const j=(Math.random()-.5)*2; return {name:o.short+" "+o.era, sub:o.club, sq:o, att:o.str+j, def:o.str+j*.5};}));
  teams.forEach(t=>Object.assign(t,{p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}));
  const rounds=schedule(20); const log=[]; const goals={};
  rounds.forEach((pr,ri)=>pr.forEach(([h,a])=>{
    const H=teams[h], A=teams[a];
    const lh=CONFIG.GOAL_BASE*Math.exp((H.att+CONFIG.HOME_ADV-A.def)/CONFIG.SPREAD), la=CONFIG.GOAL_BASE*Math.exp((A.att-H.def-CONFIG.HOME_ADV)/CONFIG.SPREAD);
    const gh=poisson(lh), ga=poisson(la);
    [[H,gh,ga],[A,ga,gh]].forEach(([T,f,g])=>{T.p++;T.gf+=f;T.ga+=g; if(f>g){T.w++;T.pts+=3;} else if(f===g){T.d++;T.pts++;} else T.l++;});
    if(H.me||A.me){
      const mine=H.me, opp=mine?A:H, myG=mine?gh:ga, opG=mine?ga:gh;
      const ms=[]; for(let k=0;k<myG;k++){ const s=pickScorer(myPlayers); goals[s.name]=(goals[s.name]||0)+1; ms.push(s.name);}
      const os=[]; const oppPl=opp.sq.players; for(let k=0;k<opG;k++){ os.push(pickScorer(oppPl).name);}
      log.push({r:ri+1, home:mine, opp, f:myG, a:opG, res: myG>opG?"W":myG===opG?"D":"L", ms, os});
    }
  }));
  const table=teams.slice().sort((x,y)=>y.pts-x.pts||(y.gf-y.ga)-(x.gf-x.ga)||y.gf-x.gf);
  return {teams,table,log,goals,me:teams[0],rank:table.indexOf(teams[0])+1,rate:me};
}

/* ---------- results ---------- */
function verdict(R){
  const m=R.me;
  if(m.w===38) return ["38전 38승. 전설이 됐어요.","K리그 역사에 없는 완벽한 시즌이에요."];
  if(m.l===0 && R.rank===1) return ["무패 우승","한 번도 지지 않고 정상에 올랐어요."];
  if(R.rank===1) return ["리그 우승","승점 "+m.pts+"점으로 레전드 리그 정상에 올랐어요."];
  if(R.rank<=3) return [R.rank+"위, 아시아 무대 진출","우승까지 승점 "+(R.table[0].pts-m.pts)+"점이 모자랐어요."];
  if(R.rank<=10) return [R.rank+"위, 중위권 마감","레전드끼리의 싸움은 만만치 않아요."];
  if(R.rank>=18) return [R.rank+"위, 강등","포지션 밸런스를 다시 점검해 보세요."];
  return [R.rank+"위, 하위권 마감","다음 드래프트에서는 수비 라인을 먼저 채워 보세요."];
}
function el(tag,cls,txt){const e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e;}

function showResults(R){
  S.done=true; renderPitch();
  const box=$("results"); box.hidden=false; box.innerHTML="";
  const [v1,v2]=verdict(R); const m=R.me;
  const head=el("section","panel");
  head.append(el("div","label","시즌 결과 · 20팀 38라운드"));
  const vh=el("p","verdict",v1); vh.appendChild(el("small",null,v2)); head.appendChild(vh);
  const board=el("div","board");
  [[m.w+"승 "+m.d+"무 "+m.l+"패","전적"],[m.pts+"점","승점"],[R.rank+"위","순위"],[m.gf+" : "+m.ga,"득실"],[(R.rate.att).toFixed(1)+" / "+(R.rate.def).toFixed(1),"공격 / 수비"]]
    .forEach(([v,k])=>{const s=el("div","stat"); s.append(el("div","v",v), el("div","k",k)); board.appendChild(s);});
  head.appendChild(board);
  const form=el("div","form"); form.setAttribute("aria-label","38경기 흐름");
  R.log.forEach(g=>{const i=el("i",g.res); i.title=g.r+"R "+g.f+":"+g.a; form.appendChild(i);});
  head.appendChild(form);
  const row=el("div","btnrow"); row.style.marginTop="14px";
  const again=el("button","btn primary","다시 드래프트"); again.type="button"; again.onclick=reset;
  const resim=el("button","btn ghost","같은 11명으로 다시 시뮬"); resim.type="button"; resim.onclick=()=>{ const R2=simulate(); saveBest(R2); showResults(R2); };
  row.append(again,resim); head.appendChild(row);
  box.appendChild(head);

  const cols=el("div","cols"); cols.style.marginTop="20px";
  // matches
  const mp=el("section","panel"); mp.appendChild(el("h2",null,"경기별 결과"));
  mp.appendChild(el("div","label","득점자는 경기 아래에 표시돼요"));
  const ul=el("ul","matches");
  R.log.forEach(g=>{
    const li=el("li","m"); li.append(el("span","r",g.r+"R"), el("span","ha",g.home?"홈":"원정"));
    const o=el("span","o",(g.home?"vs ":"@ ")+g.opp.name);
    const sc=[g.ms.length?g.ms.join(", "):"", g.os.length?"상대 "+g.os.join(", "):""].filter(Boolean).join(" · ");
    o.appendChild(el("span",null,sc||"득점 없음")); li.appendChild(o);
    li.appendChild(el("span","sc "+g.res,g.f+" : "+g.a)); ul.appendChild(li);
  });
  mp.appendChild(ul);
  // table + scorers + share
  const side=el("div"); side.style.display="grid"; side.style.gap="20px";
  const tp=el("section","panel"); tp.appendChild(el("h2",null,"최종 순위"));
  const tw=el("div","tablewrap"); const tb=el("table");
  tb.innerHTML="<thead><tr><th>#</th><th class='t'>팀</th><th>승</th><th>무</th><th>패</th><th>득실</th><th>승점</th></tr></thead>";
  const body=el("tbody");
  R.table.forEach((t,i)=>{ const tr=el("tr",t.me?"me":null);
    [i+1,t.name,t.w,t.d,t.l,(t.gf-t.ga>0?"+":"")+(t.gf-t.ga),t.pts].forEach((v,j)=>{const td=el("td",j===1?"t":"num",String(v)); tr.appendChild(td);});
    body.appendChild(tr); });
  tb.appendChild(body); tw.appendChild(tb); tp.appendChild(tw);
  const sp=el("section","panel"); sp.appendChild(el("h2",null,"팀 득점 순위"));
  const sl=el("ul","scorers");
  const top=Object.entries(R.goals).sort((a,b)=>b[1]-a[1]).slice(0,5);
  if(!top.length) sl.appendChild(el("li",null,"득점이 없었어요."));
  top.forEach(([n,g])=>{const li=el("li"); li.append(el("span",null,n), el("b",null,g+"골")); sl.appendChild(li);});
  sp.appendChild(sl);
  const sh=el("section","panel share"); sh.appendChild(el("h2",null,"결과 공유"));
  sh.appendChild(el("p","hint","이미지를 길게 누르거나 우클릭해서 저장한 뒤 단톡방에 올리세요."));
  const cb=el("button","btn ghost","결과 텍스트 복사"); cb.type="button"; cb.onclick=()=>copyText(R,cb);
  sh.appendChild(cb);
  const img=el("img"); img.alt="시즌 결과 카드"; sh.appendChild(img);
  side.append(tp,sp,sh);
  cols.append(mp,side); box.appendChild(cols);
  drawCard(R,top).then(url=>{ img.src=url; });
  box.scrollIntoView({behavior:reduce?"auto":"smooth",block:"start"});
}

function summaryText(R){
  const m=R.me, top=Object.entries(R.goals).sort((a,b)=>b[1]-a[1])[0];
  return "K-레전드 38 시즌 결과\n"+m.name+" ("+S.form+")\n"+m.w+"승 "+m.d+"무 "+m.l+"패 · 승점 "+m.pts+" · "+R.rank+"위 · 득실 "+m.gf+":"+m.ga+
    (top?"\n팀 득점 1위: "+top[0]+" "+top[1]+"골":"")+"\n베스트 11: "+S.xi.map(p=>p.name).join(", ");
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
  x.fillStyle="#E6EEE8"; x.font="700 34px 'Noto Sans KR', sans-serif"; x.fillText(R.me.name+"  ·  "+S.form,64,165);
  const m=R.me;
  x.font="88px 'Black Han Sans', sans-serif"; x.fillStyle="#FFFFFF"; x.fillText(m.w+"승 "+m.d+"무 "+m.l+"패",64,285);
  x.font="700 34px 'JetBrains Mono', monospace"; x.fillStyle="#F0B23A";
  x.fillText("승점 "+m.pts+"   "+R.rank+"위 / 20   득실 "+m.gf+":"+m.ga,64,345);
  // pitch
  const px=64,py=390,pw=W-128,ph=760;
  for(let i=0;i<8;i++){ x.fillStyle=i%2?"#1C6341":"#21704A"; x.fillRect(px,py+i*ph/8,pw,ph/8); }
  x.strokeStyle="rgba(255,255,255,.45)"; x.lineWidth=3; x.strokeRect(px+12,py+12,pw-24,ph-24);
  x.beginPath(); x.moveTo(px+12,py+ph/2); x.lineTo(px+pw-12,py+ph/2); x.stroke();
  x.beginPath(); x.arc(px+pw/2,py+ph/2,80,0,Math.PI*2); x.stroke();
  FORMS[S.form].forEach((s,i)=>{ const p=S.xi[i]; const cx=px+pw*s[1]/100, cy=py+ph*s[2]/100;
    x.fillStyle="#F3F6F2"; x.beginPath(); x.arc(cx,cy-14,30,0,Math.PI*2); x.fill();
    x.fillStyle="#14221A"; x.font="700 24px 'JetBrains Mono', monospace"; x.textAlign="center"; x.fillText(String(p.ovr),cx,cy-5);
    x.fillStyle="#FFFFFF"; x.font="700 26px 'Noto Sans KR', sans-serif"; x.fillText(p.name,cx,cy+50);
    x.fillStyle="rgba(255,255,255,.75)"; x.font="500 18px 'JetBrains Mono', monospace"; x.fillText(tag(SQUADS[p.sq]),cx,cy+76);
    x.textAlign="left"; });
  x.fillStyle="#E6EEE8"; x.font="700 30px 'Noto Sans KR', sans-serif";
  if(top[0]) x.fillText("팀 득점 1위  "+top[0][0]+" "+top[0][1]+"골",64,1215);
  x.fillStyle="#93A499"; x.font="500 22px 'Noto Sans KR', sans-serif"; x.fillText(verdict(R)[0],64,1262);
  x.fillText("비공식 팬 제작 게임",64,1300);
  return c.toDataURL("image/png");
}

/* ---------- best record ---------- */
function saveBest(R){
  const b=store.get("kl38-best"); const m=R.me;
  if(!b || m.pts>b.pts){ store.set("kl38-best",{pts:m.pts,w:m.w,d:m.d,l:m.l,rank:R.rank}); }
  renderBest();
}
function renderBest(){
  const b=store.get("kl38-best"); const e=$("best"); e.innerHTML="";
  if(!b){ e.textContent="아직 기록이 없어요"; return; }
  e.append("내 최고 기록"); const s=document.createElement("strong"); s.textContent=b.w+"승 "+b.d+"무 "+b.l+"패 · "+b.pts+"점 · "+b.rank+"위"; e.appendChild(s);
}

function reset(){
  const f=S.form; newState(f); $("results").hidden=true; $("results").innerHTML="";
  $("reelClub").textContent="스핀을 눌러 시작"; $("reelEra").textContent=SQUADS.length+"개 시대별 레전드 팀";
  $("hint").textContent="스핀하면 팀 하나가 나와요. 그 팀에서 선수 한 명을 골라 빈 자리에 넣으세요.";
  renderForms(); renderList(); renderPitch(); window.scrollTo({top:0,behavior:reduce?"auto":"smooth"});
}

$("spinBtn").onclick=()=>spin(false);
$("respinBtn").onclick=()=>spin(true);
$("simBtn").onclick=()=>{ const R=simulate(); saveBest(R); showResults(R); };
$("hard").onchange=()=>{ renderList(); renderPitch(); };

newState(); renderForms(); renderPitch(); renderBest();
$("reelEra").textContent=SQUADS.length+"개 시대별 레전드 팀";
window.__KL38 = {SQUADS, FORMS, rate:()=>rate(S.xi), simulate, S:()=>S};
})();

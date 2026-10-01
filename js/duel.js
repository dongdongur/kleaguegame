/* 친구 팀과의 맞대결: 친구가 올린 베스트 11 스냅샷을 불러와 홈&어웨이 2경기 합산으로 겨뤄요. 경기마다 분 단위 로그를 볼 수 있어요 */
(function(){
"use strict";
const K=window.KLCore, CFG=K.CONFIG;
const $=id=>document.getElementById(id);
const el=(t,c,x)=>{const e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e;};
const rnd=(lo,hi)=>lo+Math.floor(Math.random()*(hi-lo+1));

/* [이름, "구단|시즌"] -> 선수 데이터 */
function resolve(entry){
  const q=K.SQUADS.find(s=>K.squadKey(s)===entry[1]); if(!q) return null;
  return q.players.find(p=>p.name===entry[0])||null;
}
function buildFriend(snap){
  if(!snap || !snap.xi) return null;
  const xi=snap.xi.map(resolve); if(xi.length!==11 || xi.some(x=>!x)) return null;
  const fit=p=>{ const c=K.clone(p); c.ovr = snap.rm==="prime" ? p.ovrP : p.ovrS; return c; };   // 친구가 고른 능력치 기준(시즌/프라임)으로 복원
  return {form:snap.f, xi:xi.map(fit), mgr:K.MGRS.find(m=>m.name===snap.m)||null, roles:Array.isArray(snap.ro)?snap.ro:null};
}
const sideRate = t => K.rate(t.xi,null,{form:t.form,mgr:t.mgr,roles:t.roles});
const withGroup = t => t.xi.map((p,i)=>Object.assign({},p,{g:K.GROUP[K.FORMS[t.form][i][0]]}));

/* 한 경기: 홈/원정 팀 객체와 능력치로 결과를 만들어요. 득점자·도움은 팀 선수들 중에서 뽑아요 */
function playLeg(H,A,hr,ar,ko,agg){
  const ha=CFG.HOME_ADV;
  const lh=CFG.GOAL_BASE*Math.exp((hr.att+ha-ar.def)/CFG.SPREAD), la=CFG.GOAL_BASE*Math.exp((ar.att-hr.def-ha)/CFG.SPREAD);
  let gh=K.poisson(lh), ga=K.poisson(la), et=false; const h0=gh, a0=ga;
  if(ko && gh+agg.h===ga+agg.a){ et=true; gh+=K.poisson(lh*CFG.ET_FACTOR); ga+=K.poisson(la*CFG.ET_FACTOR); }
  const goals=(T,n,n0)=>{ const ps=withGroup(T); const out=[]; for(let k=0;k<n;k++){ const s=K.pickScorer(ps); const as=Math.random()<.7?K.pickAssist(ps,s):null; out.push({s:s.name,a:as?as.name:null,et:k>=n0}); } return out; };
  return {gh,ga,et,hg:goals(H,gh,h0),ag:goals(A,ga,a0)};
}

/* 내 시점의 로그 항목을 만들어요 (왼쪽=나, 오른쪽=친구). home: 내가 홈인지 */
function entryFor(leg,home,me,fr,rm,rf,myN,frN,stage,pk){
  const myG = home ? leg.hg : leg.ag, frG = home ? leg.ag : leg.hg;
  const f = myG.length, a = frG.length;
  const ev=[]; const push=(t,k,text,side)=>ev.push({t,k,text,side});
  myG.forEach(g=>push(g.et?rnd(91,120):rnd(1,92),"goal",g.s+(g.a?" (도움 "+g.a+")":""),"me"));
  frG.forEach(g=>push(g.et?rnd(91,120):rnd(1,92),"goal",g.s+(g.a?" (도움 "+g.a+")":""),"opp"));
  const myP=withGroup(me), frP=withGroup(fr);
  for(let i=0;i<rnd(0,3);i++) push(rnd(8,88),"yellow",myP[rnd(1,10)].name+" 경고","me");
  for(let i=0;i<rnd(0,3);i++) push(rnd(8,88),"yellow",frP[rnd(1,10)].name+" 경고","opp");
  const extraMe=K.clamp(Math.round(3+(rm.att-rf.def)/10+Math.random()*3),1,9), extraFr=K.clamp(Math.round(3+(rf.att-rm.def)/10+Math.random()*3),1,9);
  const chance=(side,n,shooters,keeper)=>{ for(let i=0;i<n;i++){ const t=rnd(3,89), r=Math.random(), sh=K.pickScorer(shooters).name;
    if(r<.42) push(t,"save",sh+"의 유효슈팅을 "+keeper+" 선방",side);
    else if(r<.78) push(t,"miss",sh+"의 슈팅이 골문을 벗어남",side);
    else if(r<.9) push(t,"post",sh+"의 슛이 골대를 강타",side);
    else push(t,"chance",sh+" 결정적 찬스를 놓침",side); } };
  chance("me",extraMe,myP,frP[0].name); chance("opp",extraFr,frP,myP[0].name);
  const tl=K.assembleLog(ev,{f,a,et:leg.et,pk,mn:myN,on:frN,names:myP.map(p=>p.name)});
  const poss=Math.round(K.clamp(50+((rm.att+rm.def)-(rf.att+rf.def))*.35,34,66));
  const shM=f+extraMe, shF=a+extraFr;
  const stats={poss:[poss,100-poss],shots:[shM,shF],sot:[f+Math.round(extraMe*.45),a+Math.round(extraFr*.45)],corners:[Math.round(shM*.5+rnd(0,2)),Math.round(shF*.5+rnd(0,2))],fouls:[rnd(8,15),rnd(8,15)]};
  return {comp:"친구 맞대결",stage,home,f,a,et:leg.et,pk,opp:{name:frN},tl,stats,formation:me.form,
    lineup:myP.map((p,i)=>({pos:K.FORMS[me.form][i][0],name:p.name,ovr:p.ovr}))};
}

function open(row){
  const box=$("duelBox"); box.innerHTML="";
  const G=window.KLGame; const S=G.state();
  const friend=buildFriend(row.team);
  const card=el("div","duel panel-in");
  card.appendChild(el("h4","sec","친구 팀 맞대결"));
  if(!friend){ card.appendChild(el("p","hint","이 기록은 선수 정보를 불러올 수 없어요. (옛 형식이거나 데이터가 바뀌었어요)")); box.appendChild(card); return; }
  if(!S.xi.every(Boolean) || !S.mgr){ card.appendChild(el("p","hint","내 팀을 먼저 완성해 주세요. 선발 11명과 감독이 필요해요. (후보는 없어도 돼요)")); box.appendChild(card); box.scrollIntoView({behavior:"smooth",block:"center"}); return; }
  const me={form:S.form, xi:S.xi, mgr:S.mgr, roles:S.roles};
  const rm=sideRate(me), rf=sideRate(friend);
  const myN=$("teamName").value.trim()||"레전드 FC", frN=row.nickname+"의 "+row.team_name;
  const head=el("div","duel-head");
  const side=(title,name,r,t)=>{ const s=el("div","duel-side"); s.append(el("div","label",title), el("b",null,name), el("div","duel-ovr",String(Math.round((r.att+r.def)/2))), el("small",null,t.form+(t.mgr?" · 감독 "+t.mgr.name:"")+" · 공격 "+r.att.toFixed(1)+" / 수비 "+r.def.toFixed(1))); return s; };
  head.append(side("나",myN,rm,me), el("div","duel-vs","VS"), side("도전 대상",frN,rf,friend));
  card.appendChild(head);
  const go=el("button","btn go","맞대결 시작 (홈&어웨이 2경기)"); go.type="button";
  const out=el("div","duel-out");
  go.onclick=()=>{
    go.disabled=true; out.innerHTML="";
    const l1=playLeg(me,friend,rm,rf,false,{h:0,a:0});                 // 1차전: 내 홈
    const l2=playLeg(friend,me,rf,rm,true,{h:l1.ga,a:l1.gh});          // 2차전: 상대 홈 (합산이 같으면 연장)
    const myTot=l1.gh+l2.ga, frTot=l1.ga+l2.gh;
    let pk=null, win=myTot>frTot;
    if(myTot===frTot){ const pw=.5+K.clamp((rm.att+rm.def-rf.att-rf.def)/2/60,-.15,.15); win=Math.random()<pw; const ws=4+(Math.random()<.4?1:0), ls=Math.max(2,ws-1-(Math.random()<.3?1:0)); pk=win?[ws,ls]:[ls,ws]; }
    const entries=[entryFor(l1,true,me,friend,rm,rf,myN,frN,"1차전 (내 홈)",null), entryFor(l2,false,me,friend,rm,rf,myN,frN,"2차전 (상대 홈)",pk)];
    const R={me:{name:myN}};
    /* 경기별 요약 + 눌러서 펼치는 로그 */
    entries.forEach((e,i)=>{
      const r=el("div","duel-leg clickable"); r.title="눌러서 경기 로그 보기";
      r.append(el("span","dl-t",e.stage+(e.et?" · 연장":"")), el("span","dl-s",myN+"  "+e.f+" : "+e.a+"  "+frN),
        el("span","dl-g",(e.tl.filter(t=>t.k==="goal").map(t=>t.text.replace(/^GOAL! |^실점 /,"").replace(/\s+\(\d+ : \d+\)$/,"")).join(" · "))||"무득점"));
      const lg=el("div","duel-log"); lg.hidden=true;
      r.onclick=()=>{ if(lg.hidden){ lg.innerHTML=""; lg.appendChild(G.matchLogEl(e,R)); lg.hidden=false; r.classList.add("open"); } else { lg.hidden=true; r.classList.remove("open"); } };
      out.append(r,lg); });
    const fin=el("div","duel-final "+(win?"win":"lose"));
    fin.append(el("b",null,(win?"승리":"패배")+"  합계 "+myTot+" : "+frTot+(pk?"  (승부차기 "+pk[0]+"-"+pk[1]+")":"")), el("span",null,win?row.nickname+" 팀을 꺾었어요!":row.nickname+" 팀의 벽을 넘지 못했어요."));
    out.appendChild(fin);
    out.appendChild(el("p","hint","경기를 누르면 분 단위 로그를 볼 수 있어요."));
    if(win && window.KLAch){ const d=KLAch.grant("duel_win"); if(d){ out.appendChild(el("p","hint","새 업적 달성: "+d.icon+" "+d.name)); if(G.renderAch) G.renderAch(); } }
    if(window.KLShare && KLShare.enabled && row.id){
      const nick=($("nick").value||"").trim();
      if(nick){ const rec=el("button","btn ghost","결과를 친구 기록에 남기기"); rec.type="button";
        rec.onclick=async()=>{ rec.disabled=true; rec.textContent="올리는 중…"; try{ await KLShare.saveDuel({challenger:nick,defender_id:row.id,cg:Math.min(30,myTot),dg:Math.min(30,frTot),winner:win?"challenger":"defender"}); rec.textContent="남겼어요"; KLShare.refresh(); }catch(e){ rec.disabled=false; rec.textContent="실패 (SQL 설정 확인)"; } };
        out.appendChild(rec); }
      else out.appendChild(el("p","hint","닉네임을 입력하면 결과를 친구 기록에 남길 수 있어요."));
    }
    const again=el("button","btn ghost","다시 붙기"); again.type="button"; again.onclick=()=>{ go.disabled=false; out.innerHTML=""; }; out.appendChild(again);
  };
  card.append(go,out); box.appendChild(card);
  box.scrollIntoView({behavior:"smooth",block:"center"});
}
/* 친구 라인업 보기: 선발 11명(포메이션 위치), 후보, 감독 */
function view(row){
  const box=$('duelBox'); box.innerHTML='';
  const snap=row.team, G=window.KLGame;
  const card=el('div','duel panel-in');
  card.appendChild(el('h4','sec',row.nickname+'의 '+row.team_name+' 라인업'));
  const friend=buildFriend(snap);
  if(!friend){ card.appendChild(el('p','hint','이 기록은 선수 정보를 불러올 수 없어요. (옛 형식이거나 데이터가 바뀌었어요)')); box.appendChild(card); return; }
  const r=sideRate(friend);
  card.appendChild(el('p','hint',friend.form+(friend.mgr?' · 감독 '+friend.mgr.name:'')+' · 공격 '+r.att.toFixed(1)+' / 수비 '+r.def.toFixed(1)+' · '+(snap.rm==='prime'?'전성기 능력치':'시즌 능력치')));
  const pitch=el('div','pitch mini lineup-pitch');
  friend.xi.forEach((p,i)=>{ const s=K.FORMS[friend.form][i]; const w=el('div','slot lineup-slot'); w.style.left=s[1]+'%'; w.style.top=s[2]+'%';
    w.appendChild(G.cardEl(p,{blind:false})); w.appendChild(el('span','lineup-pos',s[0])); w.onclick=()=>G.showInfo(p); pitch.appendChild(w); });
  card.appendChild(pitch);
  const bench=(snap.b||[]).map(resolve).filter(Boolean);
  if(bench.length){ card.appendChild(el('h4','sec','후보'));
    const row2=el('div','lineup-bench'); bench.forEach(b=>{ const p=K.clone(b); p.ovr=snap.rm==='prime'?b.ovrP:b.ovrS; const c=G.cardEl(p,{blind:false}); c.onclick=()=>G.showInfo(p); row2.appendChild(c); }); card.appendChild(row2); }
  const close=el('button','btn ghost','닫기'); close.type='button'; close.onclick=()=>{ box.innerHTML=''; }; card.appendChild(close);
  box.appendChild(card); box.scrollIntoView({behavior:'smooth',block:'center'});
}
window.KLDuel={open,view};
})();

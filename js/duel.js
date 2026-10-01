/* 친구 팀과의 맞대결: 친구가 올린 베스트 11 스냅샷을 불러와 홈&어웨이 2경기 합산으로 겨뤄요 */
(function(){
"use strict";
const K=window.KLCore, CFG=K.CONFIG;
const $=id=>document.getElementById(id);
const el=(t,c,x)=>{const e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e;};

/* [이름, "구단|시즌"] -> 선수 데이터 */
function resolve(entry){
  const q=K.SQUADS.find(s=>K.squadKey(s)===entry[1]); if(!q) return null;
  return q.players.find(p=>p.name===entry[0])||null;
}
function buildFriend(snap){
  if(!snap || !snap.xi) return null;
  const xi=snap.xi.map(resolve); if(xi.length!==11 || xi.some(x=>!x)) return null;
  return {form:snap.f, xi:xi.map(K.clone), mgr:K.MGRS.find(m=>m.name===snap.m)||null};
}
const sideRate = t => K.rate(t.xi,null,{form:t.form,mgr:t.mgr});

function playLeg(H,A,hr,ar,ko,agg){
  const ha=CFG.HOME_ADV;
  const lh=CFG.GOAL_BASE*Math.exp((hr.att+ha-ar.def)/CFG.SPREAD), la=CFG.GOAL_BASE*Math.exp((ar.att-hr.def-ha)/CFG.SPREAD);
  let gh=K.poisson(lh), ga=K.poisson(la), et=false;
  if(ko && gh+agg.h===ga+agg.a){ et=true; gh+=K.poisson(lh*CFG.ET_FACTOR); ga+=K.poisson(la*CFG.ET_FACTOR); }
  const sc=(T,n)=>{ const ps=T.xi.map((p,i)=>Object.assign({},p,{g:K.GROUP[K.FORMS[T.form][i][0]]})); const out=[]; for(let k=0;k<n;k++) out.push(K.pickScorer(ps).name); return out; };
  return {gh,ga,et,hs:sc(H,gh),as:sc(A,ga)};
}

function open(row){
  const box=$("duelBox"); box.innerHTML="";
  const G=window.KLGame; const S=G.state();
  const friend=buildFriend(row.team);
  const card=el("div","duel panel-in");
  card.appendChild(el("h4","sec","친구 팀 맞대결"));
  if(!friend){ card.appendChild(el("p","hint","이 기록은 선수 정보를 불러올 수 없어요. (옛 형식이거나 데이터가 바뀌었어요)")); box.appendChild(card); return; }
  if(!S.xi.every(Boolean) || !S.mgr){ card.appendChild(el("p","hint","내 팀을 먼저 완성해 주세요. 선발 11명과 감독이 필요해요. (후보는 없어도 돼요)")); box.appendChild(card); box.scrollIntoView({behavior:"smooth",block:"center"}); return; }
  const me={form:S.form, xi:S.xi, mgr:S.mgr};
  const rm=sideRate(me), rf=sideRate(friend);
  const head=el("div","duel-head");
  const side=(title,name,r,t)=>{ const s=el("div","duel-side"); s.append(el("div","label",title), el("b",null,name), el("div","duel-ovr",String(Math.round((r.att+r.def)/2))), el("small",null,t.form+(t.mgr?" · 감독 "+t.mgr.name:"")+" · 공격 "+r.att.toFixed(1)+" / 수비 "+r.def.toFixed(1))); return s; };
  head.append(side("나",$("teamName").value.trim()||"레전드 FC",rm,me), el("div","duel-vs","VS"), side("도전 대상",row.nickname+" · "+row.team_name,rf,friend));
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
    const line=(t,l,hn,an)=>{ const r=el("div","duel-leg"); r.append(el("span","dl-t",t), el("span","dl-s",hn+" "+l.gh+" : "+l.ga+" "+an+(l.et?" (연장)":"")),
      el("span","dl-g",[l.hs.length?hn+": "+l.hs.join(", "):"", l.as.length?an+": "+l.as.join(", "):""].filter(Boolean).join(" / ")||"무득점")); return r; };
    const myN=$("teamName").value.trim()||"레전드 FC", frN=row.nickname;
    out.append(line("1차전",l1,myN,frN), line("2차전",l2,frN,myN));
    const fin=el("div","duel-final "+(win?"win":"lose"));
    fin.append(el("b",null,(win?"승리":"패배")+"  합계 "+myTot+" : "+frTot+(pk?"  (승부차기 "+pk[0]+"-"+pk[1]+")":"")), el("span",null,win?row.nickname+" 팀을 꺾었어요!":row.nickname+" 팀의 벽을 넘지 못했어요."));
    out.appendChild(fin);
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
window.KLDuel={open};
})();

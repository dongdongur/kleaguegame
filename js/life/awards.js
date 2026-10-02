/*
 * K-라이프 수상 · 발롱도르 · 영구결번 (js/life/awards.js)
 * 시즌이 끝나면 L.awardsFor 가 호출돼요. 다른 선수들의 기록은 리그 수준에 맞춰 만든 가상 경쟁자예요.
 */
(function(){
"use strict";
const L=window.LIFE, {rnd,ri,pick,clamp,logistic,r1,shuffle}=L;

/* 리그 1위 기록 기준 (K1/K2/EPL) */
const LEADERS={K1:{g:[15,23],a:[9,14],cs:[13,19]},K2:{g:[14,22],a:[8,13],cs:[12,17]},EPL:{g:[20,32],a:[12,20],cs:[14,20]},EPL2:{g:[18,28],a:[11,17],cs:[13,19]},BUN:{g:[22,36],a:[12,20],cs:[12,17]},LAL:{g:[20,32],a:[11,18],cs:[14,20]},SEA:{g:[19,30],a:[10,16],cs:[14,20]},L1:{g:[18,30],a:[10,16],cs:[12,17]},J1:{g:[16,26],a:[9,14],cs:[13,18]},SPL:{g:[20,32],a:[10,16],cs:[12,17]}};
const mvpScore=(R,S)=>{
  const pos=S.p.pos, lead=LEADERS[R.leagueKey]||LEADERS.K1;
  const out=(R.rating-6.4)*2.4+(R.rank<=3?1.0:R.rank<=6?.4:0)+(R.rank===1?.8:0);
  const prod=pos==="FW"?R.goals/lead.g[1]*2.2+R.assists/lead.a[1]*.5:pos==="MF"?R.goals/lead.g[1]*1.2+R.assists/lead.a[1]*1.5:pos==="DF"?R.goals/6*.5+R.cs/lead.cs[1]*.8:R.cs/lead.cs[1]*1.6;
  return out+prod+(R.apps<18?-2:0);
};

L.awardsFor=function(S,R,sim){
  const A=R.awards, lg=R.leagueKey, p=S.p, lead=LEADERS[lg]||LEADERS.K1;
  if(R.youth){
    if(R.rank===1&&R.rating>=7.2&&Math.random()<.6) A.push(S.stage==="univ"?"대학 리그 MVP":"유소년 리그 MVP");
    const topG=ri(10,17); if(R.goals>=topG&&p.pos!=="GK") A.push("유소년 득점왕");
    return;
  }
  if(R.apps<10) { L.ballonCheck(S,R); return; }
  const ag=L.age(S), K1=lg==="K1", K2=lg==="K2", E=lg==="EPL";
  /* 득점·도움·클린시트 */
  const bd=R.board; const tg=bd?Math.max(1,bd.maxG):ri(lead.g[0],lead.g[1]), ta=bd?Math.max(1,bd.maxA):ri(lead.a[0],lead.a[1]), tc=ri(lead.cs[0],lead.cs[1]);
  const goalTitle=E?"골든부트":"득점왕", assistTitle=E?"플레이메이커상":"도움왕";
  if(p.pos!=="GK"){
    if(R.goals>=tg&&R.goals>=8) A.push(R.goals===tg&&Math.random()<.18?"공동 "+goalTitle:goalTitle);
    if(R.assists>=ta&&R.assists>=6) A.push(R.assists===ta&&Math.random()<.18?"공동 "+assistTitle:assistTitle);
  } else if(R.cs>=tc&&R.cs>=9) A.push("올해의 골키퍼");
  /* 올해의 선수(MVP) */
  const sc=mvpScore(R,S)+(R.board&&R.board.maxRt&&R.rating>=R.board.maxRt?.8:0), need=2.9+rnd(-.5,.7);
  if(sc>=need){ A.push(E?"PFA 올해의 선수":K2?"K리그2 MVP":"리그 MVP"); }
  /* 베스트 11 · 올해의 팀 */
  const pa=p.pos==="GK"?R.rating-.0:R.rating; const bx=(pa-6.5)*1.6+(R.rank<=4?.6:0)+(R.apps>=24?.4:-.6)+rnd(-.5,.5);
  if(bx>=1.5&&!A.includes("PFA 올해의 선수")&&!A.includes("리그 MVP")) A.push(E?"PFA 올해의 팀":"베스트 11");
  else if(A.includes("PFA 올해의 선수")||A.includes("리그 MVP")){ A.push(E?"PFA 올해의 팀":"베스트 11"); }
  /* 영플레이어 */
  if(ag<=(E?21:22)&&R.apps>=15&&R.rating>=6.8&&Math.random()<.45+(R.rating-6.8)*.8) A.push(E?"PFA 영플레이어상":"영플레이어상");
  /* 팀 올해의 선수 (클럽 내 평가) */
  if(R.rating>=7.1&&!A.length&&Math.random()<.5) A.push("팀 올해의 선수");
  /* 연말 시상 (국내 선수 대상) */
  if(!E&&(K1||K2)&&(A.includes("리그 MVP")||sc>=need+1.2)&&Math.random()<.5) A.push("KFA 올해의 선수");
  if(sc>=need+(E?.2:.8)&&Math.random()<.35) A.push("AFC 올해의 국제선수");
  L.ballonCheck(S,R,sc);
};

/* ================= 발롱도르 후보 30인 ================= */
/* 점수 = 능력치·시즌 활약·팀 성과(리그/챔스)·국제대회·인지도. 가상 경쟁자 30명의 점수와 비교해 순위를 정해요 */
L.ballonCheck=function(S,R,sc){
  const p=S.p; if(p.ovr<76||R.apps<15||R.youth) return;
  const lgBonus={EPL:0,LAL:0,BUN:-.5,SEA:-1,L1:-2.5,EPL2:-8,LAL2:-8,BUN2:-8,SEA2:-8,FR2:-8,K1:-6,K2:-10,J1:-6,SPL:-5}[R.leagueKey]||-6;
  const nat=R.natEvents||[]; let natB=0; nat.forEach(n=>{ if(n.skipped) return; natB+=n.t==="wc"?(n.title?6:/준우승|4강/.test(n.stage)?2.5:.6):n.t==="ac"?(n.title?1.5:.4):0; });
  const cup=R.trophies.reduce((a,t)=>a+(/(프리미어리그|라리가|분데스리가|세리에 A) 우승/.test(t)?2.2:/리그 1 우승/.test(t)?1.5:/챔피언스리그 우승/.test(t)?3:0),0);
  const prod=p.pos==="FW"?R.goals*.12+R.assists*.05:p.pos==="MF"?R.goals*.1+R.assists*.1:p.pos==="DF"?R.goals*.15+R.cs*.04:R.cs*.12;
  const s=(p.ovr-80)*.35+(R.rating-6.9)*3.2+prod*.7+lgBonus+cup+natB+S.fame*.02;
  const comps=[]; for(let i=0;i<30;i++) comps.push(9.5-i*.3+rnd(-1.1,1.1));
  comps.sort((a,b)=>b-a);
  let rank=1+comps.filter(c=>c>s).length;
  if(rank>30) return;
  R.ballon={rank,score:r1(s)}; S.ballon.push({year:R.year,rank,club:R.club.name});
  R.awards.push(rank===1?"발롱도르":"발롱도르 후보 "+rank+"위"); if(rank===1) R.trophies.push("발롱도르 수상");
};
/* 후보 30인 명단 (연도별 · 내 이름이 들어가요) */
/* 실존 스타 [이름, 출생연도, 전성기 평가, 포지션]. 나이에 따라 평가가 변하고, 후보 순위는 그 평가로 정해져요 */
const STARS=[["킬리안 음바페",1998,94,"FW"],["엘링 홀란",2000,93,"FW"],["라민 야말",2007,95,"FW"],["주드 벨링엄",2003,91,"MF"],["비니시우스 주니오르",2000,91,"FW"],["오스만 뎀벨레",1997,90,"FW"],["해리 케인",1993,90,"FW"],["하피냐",1996,89,"FW"],["로드리",1996,89,"MF"],["모하메드 살라",1992,88,"FW"],["자말 무시알라",2003,90,"MF"],["플로리안 비르츠",2003,89,"MF"],["페드리",2002,88,"MF"],["비티냐",2000,88,"MF"],["부카요 사카",2001,88,"FW"],["라우타로 마르티네스",1997,88,"FW"],["마이클 올리세",2001,88,"FW"],["콜 파머",2002,88,"MF"],["필 포든",2000,87,"MF"],["페데리코 발베르데",1998,87,"MF"],["케빈 더 브라위너",1991,87,"MF"],["마르틴 외데고르",1998,86,"MF"],["손흥민",1992,86,"FW"],["후안 알바레스",2000,87,"FW"],["흐비차 크바라츠헬리아",2001,87,"FW"],["주앙 네베스",2004,87,"MF"],["김민재",1996,85,"DF"],["이강인",2001,84,"MF"],["티보 쿠르투아",1992,87,"GK"],["알리송",1992,86,"GK"],["버질 판 다이크",1991,86,"DF"],["안토니오 뤼디거",1993,85,"DF"],["윌리엄 살리바",2001,87,"DF"],["가브리엘 마갈량이스",1997,86,"DF"],["파우 쿠바르시",2007,86,"DF"],["조슈아 키미히",1995,87,"MF"],["알렉산더 이삭",1999,86,"FW"],["빅토르 요케레스",1998,86,"FW"],["니코 윌리엄스",2002,85,"FW"],["데지레 두에",2005,87,"FW"],["리오넬 메시",1987,92,"FW"],["크리스티아누 호날두",1985,89,"FW"],["카림 벤제마",1987,85,"FW"],["루카 모드리치",1985,83,"MF"],["네이마르",1992,86,"FW"],["로베르트 레반도프스키",1988,87,"FW"],["페란 토레스",2000,82,"FW"],["에두아르도 카마빙가",2002,85,"MF"],["오렐리앵 추아메니",2000,85,"MF"],["트렌트 알렉산더아널드",1998,85,"DF"],["알렉시스 맥알리스터",1998,86,"MF"],["도미니크 소보슬러이",2000,85,"MF"]].map(x=>x.slice(0,4));
const FOREIGN_FIRST=["루카스","마티아스","엔조","디에고","호세","카를로스","이반","미하일","올리버","잭","해리","토마스","레온","막시밀리안","안토니","피에르","마르코","알렉스","다니엘","세바스티안","에밀리오","니콜라스","파블로","로드리고","빅토르","안드레","쥘리앙","펠릭스","테오","라파엘","아마두","모하메드","이브라히마","사디오","압둘라","유수프","타리크","카림","쿠마","요나스","안데르스","스테판","얀","마테오","젠나로","리카르도","앙헬","에두아르도"];
const FOREIGN_LAST=["마르티네스","로시","뮐러","스미스","실바","페레이라","가르시아","로페스","디아스","베르나르","뒤랑","슈미트","바이스","에르난데스","곤살레스","코스타","페르난데스","네베스","올리베이라","소우자","리바스","모레노","벨루치","콘티","브루노","히메네스","산체스","로메로","카스티요","오카포","디알로","쿠야테","트라오레","엔디아예","멘디","바르가스","젠센","한센","닐센","코발","노바크","페트로프","이바노프","슈나이더","헤르만","피셔","베커","바그너"];
function poolName(){ if(Math.random()<.12) return pick(["김","이","박","최","정","강","조","윤","장","임"])+pick(["민","서","지","현","우","준","도","승","재","태"])+pick(["호","혁","우","훈","성","민","진","수","환","영"]); return pick(FOREIGN_FIRST)+" "+pick(FOREIGN_LAST); }
const starRate=(s,yr)=>{ const ag=yr-s[1]; return s[2]-(ag<22?(22-ag)*2.2:0)-(ag>31?(ag-31)*2.6:0)-(s[3]==="GK"?3:s[3]==="DF"?2.5:0); };
L.ballonList=function(S,rank){
  const names=new Set([S.p.name]); const yr=S.lastR?S.lastR.year:S.year;
  const act=STARS.filter(s=>{ const ag=yr-s[1]; return ag>=18&&ag<=37; }).map(s=>({n:s[0],r:starRate(s,yr)+rnd(-1.5,1.5)})).sort((x,y)=>y.r-x.r).filter(x=>x.r>=76);
  const others=[]; act.forEach(x=>{ if(others.length<29&&!names.has(x.n)){ names.add(x.n); others.push(x.n); } });
  while(others.length<29){ let n; do { n=poolName(); } while(names.has(n)); names.add(n); others.push(n); }
  const arr=[]; let k=0; for(let i=1;i<=30;i++){ if(i===rank) arr.push({rank:i,name:S.p.name,me:true}); else arr.push({rank:i,name:others[k++]}); }
  return arr;
};
/* ================= 영구결번 ================= */
/* 한 구단에서 오래 뛰고, 우승·수상으로 기여한 선수에게 은퇴 때 영구결번 제안이 와요. 자동은 아니에요. */
L.jerseyCandidates=function(S){
  const by={}; S.history.filter(h=>!h.youth&&!h.military&&h.clubId).forEach(h=>{ const k=h.clubId; (by[k]=by[k]||{id:k,name:h.club,yrs:0,apps:0,goals:0,assists:0,titles:0,awards:0,last:h.year}).yrs++; const o=by[k]; o.apps+=h.apps; o.goals+=h.goals; o.assists+=h.assists; o.titles+=h.trophies.filter(t=>/리그 우승|프리미어리그 우승|챔피언스리그 우승/.test(t)).length; o.awards+=h.awards.filter(a=>!/후보|베스트|팀 올해/.test(a)).length; o.last=h.year; });
  return Object.values(by).map(o=>{ const score=o.yrs*2.2+o.titles*5+o.awards*3+o.apps/45+(o.goals+o.assists)/30; return Object.assign(o,{score:r1(score)}); })
    .filter(o=>o.yrs>=10&&o.score>=55).sort((a,b)=>b.score-a.score);
};
/* 은퇴 시점: 영구결번 구단 목록과 번호 */
L.jerseyRetired=function(S){ return L.jerseyCandidates(S).map(o=>({club:o.name,id:o.id,number:S.p.number,yrs:o.yrs,titles:o.titles,score:o.score})); };
/* 시즌 도중 예고 (한 구단 8년 이상 + 점수 높음) — 다음 시즌 오프시즌에 한 번만 이벤트로 */
L.jerseyHint=function(S){
  if(S.jerseyHinted) return null; const c=L.jerseyCandidates(S).find(o=>o.id===(S.club&&S.club.id)&&o.yrs>=9&&o.score>=40);
  if(!c) return null; S.jerseyHinted=true; return c;
};

/* 은퇴 칭호: 커리어의 특징을 한 마디로 */
L.titlesOf=function(S){
  const c=S.career, tr=S.trophies.filter(t=>!t.youth), pos=S.p.pos, out=[]; const clubs=Object.keys(S.clubYears||{}).length, yrs=S.history.filter(h=>!h.youth).length, sc=L.legacy(S).total;
  if(S.ballon.some(b=>b.rank===1)||tr.some(t=>/FIFA 월드컵 우승/.test(t.name))) out.push("월드 아이콘");
  if(L.hasHonor&&L.hasHonor(S,"owner")) out.push("구단주 출신 레전드");
  if(L.hasHonor&&L.hasHonor(S,"found")) out.push("기부왕");
  if((S.assetProfit||0)>=150) out.push("투자의 귀재");
  if(sc>=3600) out.push("역대 최고의 전설");
  if(clubs===1&&yrs>=12) out.push("원클럽맨");
  if(pos!=="GK"&&c.goals>=200) out.push("골 머신");
  if(c.assists>=150) out.push("도움 기계");
  if(pos==="GK"&&c.cs>=200) out.push("철벽 수문장"); else if(pos==="DF"&&c.cs>=150) out.push("철벽 수비수");
  if(c.caps>=100) out.push("센추리 클럽");
  if(tr.length>=15) out.push("트로피 수집가");
  if(clubs>=7) out.push("방랑자");
  if((S.jersey||[]).length) out.push("영구결번의 주인공");
  if(((S.nat&&S.nat.refused)||0)>=3) out.push("대표팀 기피자 ('매국노' 소리를 들은)");
  if(!out.length) out.push(sc>=1200?"믿음직한 프로":"묵묵한 선수");
  return out.slice(0,4);
};
/* ================= 리그 기록 · 챔피언스리그 기록 =================
 * 수치는 공개 기록을 바탕으로 한 근사치예요. 내 시즌 기록이 리그 역대 기록을 넘으면 '신기록' 업적이 붙어요. */
const REC={K1:{g:28,a:17},K2:{g:24,a:14},EPL:{g:34,a:20},EPL2:{g:31,a:16},LAL:{g:50,a:21},BUN:{g:41,a:21},SEA:{g:36,a:17},L1:{g:44,a:21},J1:{g:30,a:16},SPL:{g:35,a:17}};
L.LEAGUE_REC=REC; L.UCL_REC={season:17,career:140,leader:[7,12]};
L.recordsFor=function(S,R){
  const out=R.records=[]; if(R.youth||R.military) return; const rc=REC[R.leagueKey], ln=L.lgLabel(R.leagueKey);
  if(rc){
    if(R.goals>rc.g){ R.awards.push(ln+" 시즌 최다 골 신기록"); out.push(ln+" 시즌 최다 골 신기록! ("+R.goals+"골, 종전 "+rc.g+"골)"); }
    else if(R.goals===rc.g&&R.goals>0){ out.push(ln+" 시즌 최다 골 타이기록 ("+R.goals+"골)"); }
    if(R.assists>rc.a){ R.awards.push(ln+" 시즌 최다 도움 신기록"); out.push(ln+" 시즌 최다 도움 신기록! ("+R.assists+"도움, 종전 "+rc.a+"도움)"); }
  }
  const u=(R.matches||[]).filter(m=>m.cup==="ucl"), ug=u.reduce((s,m)=>s+(m.g||0),0), ua=u.reduce((s,m)=>s+(m.as||0),0);
  R.uclGoals=ug; R.uclAssists=ua; if(!u.length) return;
  const c=S.career, was=c.uclG||0; c.uclG=was+ug; c.uclA=(c.uclA||0)+ua;
  if(ug>=5&&ug>=ri(L.UCL_REC.leader[0],L.UCL_REC.leader[1])){ R.awards.push("챔피언스리그 득점왕"); out.push("UEFA 챔피언스리그 득점왕 ("+ug+"골)"); }
  if(ug>L.UCL_REC.season){ R.awards.push("챔스 시즌 최다 골 신기록"); out.push("챔피언스리그 한 시즌 최다 골 신기록! ("+ug+"골)"); }
  if(c.uclG>L.UCL_REC.career&&was<=L.UCL_REC.career){ R.awards.push("챔스 통산 최다 골 신기록"); out.push("챔피언스리그 통산 최다 골 신기록! (통산 "+c.uclG+"골, 종전 "+L.UCL_REC.career+"골)"); }
};
const _base=L.awardsFor; L.awardsFor=function(S,R,sim){ _base(S,R,sim); L.recordsFor(S,R); };
L.calendarAwards=L.awardsFor;

/* ================= 베스트 11 명단 =================
 * 그 시즌 리그 최고의 11명. 실존 선수가 있는 리그(K리그·프리미어리그)는 실제 이름으로, 그 밖의 리그는 가상 선수로 채워요. */
L.bestXI=function(S,R){
  const key=R.leagueKey, slots=["GK","LB","CB","CB","RB","DM","CM","AM","LW","ST","RW"];
  const GRP={GK:"GK",LB:"DF",CB:"DF",RB:"DF",DM:"MF",CM:"MF",AM:"MF",LW:"FW",ST:"FW",RW:"FW"};
  const pool=[];
  if(key==="K1"||key==="K2") L.leagueClubs(S,key).forEach(c=>{ if(c.def_) c.def_.players.forEach(p=>pool.push({name:p.name,det:p.det||null,pos:p.pos,ovr:p.ovr,club:c.short})); });
  else if(L.isForeign(key)) L.leagueClubs(S,key).forEach(c=>{ (c.players||[]).forEach(p=>pool.push({name:p[0],det:null,pos:p[1],ovr:p[2],club:c.short})); });
  const used=new Set(), me=S.p, out=[]; let meIdx=slots.indexOf(me.sub); if(meIdx<0) meIdx=slots.findIndex(s=>GRP[s]===me.pos);
  slots.forEach((slot,i)=>{
    if(i===meIdx){ out.push({slot,name:me.name,club:R.club.short||R.club.name,ovr:me.ovr,me:true}); return; }
    let cand=pool.filter(p=>!used.has(p.name)&&(p.det===slot)); if(!cand.length) cand=pool.filter(p=>!used.has(p.name)&&p.pos===GRP[slot]);
    cand.sort((x,y)=>y.ovr-x.ovr);
    if(cand.length){ const c=cand[Math.min(cand.length-1,Math.floor(Math.random()*2))]; used.add(c.name); out.push({slot,name:c.name,club:c.club,ovr:c.ovr}); }
    else out.push({slot,name:poolName(),club:"",ovr:Math.round(R.lvl+ri(0,5))});
  });
  return out;
};

})();

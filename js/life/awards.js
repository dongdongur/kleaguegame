/*
 * K-라이프 수상 · 발롱도르 · 영구결번 (js/life/awards.js)
 * 시즌이 끝나면 L.awardsFor 가 호출돼요. 다른 선수들의 기록은 리그 수준에 맞춰 만든 가상 경쟁자예요.
 */
(function(){
"use strict";
const L=window.LIFE, {rnd,ri,pick,clamp,logistic,r1,shuffle}=L;

/* 리그 1위 기록 기준 (K1/K2/EPL) */
const LEADERS={K1:{g:[15,23],a:[9,14],cs:[13,19]},K2:{g:[14,22],a:[8,13],cs:[12,17]},EPL:{g:[20,32],a:[12,20],cs:[14,20]}};
const mvpScore=(R,S)=>{
  const pos=S.p.pos, lead=LEADERS[R.leagueKey]||LEADERS.K1;
  const out=(R.rating-6.4)*2.4+(R.rank<=3?1.0:R.rank<=6?.4:0)+(R.rank===1?.8:0);
  const prod=pos==="FW"?R.goals/lead.g[1]*2.2+R.assists/lead.a[1]*.5:pos==="MF"?R.goals/lead.g[1]*1.2+R.assists/lead.a[1]*1.5:pos==="DF"?R.goals/6*.5+R.cs/lead.cs[1]*.8:R.cs/lead.cs[1]*1.6;
  return out+prod+(R.apps<18?-2:0);
};
function poolName(){ return pick(["김","이","박","최","정","강","조","윤","장","임"])+pick(["민","서","지","현","우","준","도","승","재","태"])+pick(["호","혁","우","훈","성","민","진","수","환","영"]); }

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
  } else if(R.cs>=tc&&R.cs>=9) A.push(E?"골든글러브":"올해의 골키퍼");
  /* 올해의 선수(MVP) */
  const sc=mvpScore(R,S)+(R.board&&R.board.maxRt&&R.rating>=R.board.maxRt?.8:0), need=2.9+rnd(-.5,.7);
  if(sc>=need){ A.push(E?"PFA 올해의 선수":K1?"리그 MVP":"K리그2 MVP"); }
  /* 베스트 11 · 올해의 팀 */
  const pa=p.pos==="GK"?R.rating-.0:R.rating; const bx=(pa-6.5)*1.6+(R.rank<=4?.6:0)+(R.apps>=24?.4:-.6)+rnd(-.5,.5);
  if(bx>=1.5&&!A.includes("PFA 올해의 선수")&&!A.includes("리그 MVP")) A.push(E?"PFA 올해의 팀":K1||K2?"베스트 11":"올해의 팀");
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
  const lgBonus=R.leagueKey==="EPL"?0:R.leagueKey==="K1"?-6:-10;
  const nat=R.natEvents||[]; let natB=0; nat.forEach(n=>{ if(n.skipped) return; natB+=n.t==="wc"?(n.title?6:/준우승|4강/.test(n.stage)?2.5:.6):n.t==="ac"?(n.title?1.5:.4):0; });
  const cup=R.trophies.reduce((a,t)=>a+(/프리미어리그 우승/.test(t)?2.2:/챔피언스리그 우승/.test(t)?3:0),0);
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
/* 실존 스타(활동 시기 [시작,끝] 해) — 그 시기에 활동 중인 선수가 후보에 먼저 들어가요. 부족한 자리는 가상의 선수로 채워요 */
const STARS=[["리오넬 메시",2000,2029],["크리스티아누 호날두",2000,2028],["킬리안 음바페",2000,2038],["엘링 홀란",2000,2038],["주드 벨링엄",2000,2040],["빈시우스 주니오르",2000,2037],["로드리",2000,2033],["모하메드 살라",2000,2030],["해리 케인",2000,2034],["라민 야말",2000,2046],["오스만 뎀벨레",2000,2036],["하피냐",2000,2036],["케빈 더 브라위너",2000,2029],["페드리",2000,2040],["부카요 사카",2000,2040],["필 포든",2000,2038],["비티냐",2000,2040],["페데리코 발베르데",2000,2038],["카림 벤제마",2000,2027],["루카 모드리치",2000,2027],["네이마르",2000,2028],["손흥민",2000,2030],["로베르트 레반도프스키",2000,2028],["마르틴 외데고르",2000,2036],["비르힐 판 다이크",2000,2030],["티보 쿠르투아",2000,2033],["알리송",2000,2032],["플로리안 비르츠",2000,2042],["자말 무시알라",2000,2040],["파블로 가비",2000,2040],["니코 윌리엄스",2000,2040],["쥘 쿤데",2000,2036],["안토니오 뤼디거",2000,2031],["알렉산더 이삭",2000,2036],["라우타로 마르티네스",2000,2035],["후안 알바레스",2000,2036],["이강인",2000,2038],["김민재",2000,2034],["루이스 디아스",2000,2034],["주앙 네베스",2000,2043]];
L.ballonList=function(S,rank){
  const names=new Set([S.p.name]); const yr=S.lastR?S.lastR.year:S.year; const act=shuffle(STARS.filter(s=>yr>=s[1]&&yr<=s[2]).map(s=>s[0]));
  const arr=[]; for(let i=1;i<=30;i++){ if(i===rank) arr.push({rank:i,name:S.p.name,me:true}); else { let n=act.pop(); if(!n||names.has(n)){ do { n=poolName(); } while(names.has(n)); } names.add(n); arr.push({rank:i,name:n}); } }
  /* 실존 스타는 앞 순위에 오도록 정렬 (가상 선수는 뒤로) */
  const fake=s=>!STARS.some(x=>x[0]===s.name); const others=arr.filter(a=>!a.me).sort((a,b)=>fake(a)-fake(b)); let k=0;
  return arr.map(a=>a.me?a:Object.assign({},a,{name:others[k++].name}));
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
L.calendarAwards=L.awardsFor;
})();

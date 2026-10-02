/*
 * K-라이프 국제대회 (js/life/nat.js)
 * 실제 개최 연도에 맞춰 열려요. 대표팀 발탁은 능력치 기준, 결과는 한국 대표팀 전력의 현실적인 확률로 정해요.
 *   월드컵 2026·2030…(4년) · 아시안컵 2027·2031…(4년) · 올림픽 2028·2032…(U-23, 4년) · 아시안게임 2026·2030…(U-23, 4년)
 *   U-20 월드컵 2027·2029…(홀수 해, 19~20세) · U-17 월드컵 매년(15~17세, 유소년 두각자만)
 * 올림픽 메달 / 아시안게임 금메달이면 병역 특례(면제)를 받아요.
 */
(function(){
"use strict";
const L=window.LIFE, {rnd,ri,pick,clamp,logistic,r1,binom}=L; const shuffle=L.shuffle;

/* 통과 확률 사다리: 한국의 평균적인 실력 기준 (조별 → 토너먼트). 선수 한 명이 바꾸는 폭은 작아요 */
const TOURN={
  wc:{id:"wc",name:"FIFA 월드컵",short:"월드컵",first:2026,every:4,m:[6,7],minAge:19,thr:77,
      rounds:[["조별리그",.60],["32강",.60],["16강",.40],["8강",.30],["4강",.30],["결승",.30]],matches:[3,1,1,1,1,1],medal:false,sens:.004},
  ac:{id:"ac",name:"AFC 아시안컵",short:"아시안컵",first:2027,every:4,m:[1,1],minAge:19,thr:73,
      rounds:[["조별리그",.90],["16강",.78],["8강",.65],["4강",.58],["결승",.50]],matches:[3,1,1,1,1],medal:false},
  oly:{id:"oly",name:"올림픽",short:"올림픽",first:2028,every:4,m:[7,8],minAge:19,maxAge:23,thr:64,
      rounds:[["조별리그",.62],["8강",.45],["4강",.45],["동메달 결정전",.55]],matches:[3,1,1,1],medal:true},
  ag:{id:"ag",name:"아시안게임",short:"아시안게임",first:2026,every:4,m:[9,10],minAge:19,maxAge:23,thr:62,
      rounds:[["조별리그",.95],["16강",.84],["8강",.70],["4강",.68],["결승",.62]],matches:[3,1,1,1,1],medal:true},
  u20:{id:"u20",name:"FIFA U-20 월드컵",short:"U-20 월드컵",first:2027,every:2,m:[5,6],minAge:18,maxAge:20,thr:0,rel:2,
      rounds:[["조별리그",.74],["16강",.58],["8강",.50],["4강",.46],["결승",.48]],matches:[3,1,1,1,1],medal:false},
  u17:{id:"u17",name:"FIFA U-17 월드컵",short:"U-17 월드컵",first:2000,every:1,m:[10,11],minAge:15,maxAge:17,thr:0,rel:3,
      rounds:[["조별리그",.72],["16강",.55],["8강",.50],["4강",.45],["결승",.46]],matches:[3,1,1,1,1],medal:false},
};
L.TOURN=TOURN;
/* 개최지: 실제로 정해진 곳은 그대로, 그 뒤는 가상 개최지예요 */
const HOST={wc:{2026:"미국·캐나다·멕시코",2030:"스페인·포르투갈·모로코",2034:"사우디아라비아"},ac:{2027:"사우디아라비아",2031:"카타르"},oly:{2028:"미국 로스앤젤레스",2032:"호주 브리즈번"},ag:{2026:"일본 아이치·나고야",2030:"카타르 도하",2034:"사우디아라비아 리야드"}};
const FAKE_HOST={wc:["브라질","독일","한국·일본","잉글랜드","아르헨티나","이집트","호주","프랑스","멕시코"],ac:["일본","한국","카타르","호주","이란","우즈베키스탄"],oly:["프랑스 파리","일본 오사카","캐나다 토론토","독일 베를린","브라질 리우"],ag:["중국 항저우","인도네시아","한국","우즈베키스탄"],u20:["아르헨티나","칠레","폴란드","인도네시아","우즈베키스탄","이집트"],u17:["카타르","페루","인도네시아","브라질","세네갈"]};
/* ===== 조 편성 · 상대국 ===== */
const POOLS={
 wc:{strong:["브라질","아르헨티나","프랑스","잉글랜드","스페인","독일","포르투갈","네덜란드","이탈리아","벨기에"],mid:["크로아티아","우루과이","콜롬비아","모로코","미국","멕시코","일본","세네갈","덴마크","스위스","이란","에콰도르"],weak:["호주","캐나다","노르웨이","사우디아라비아","이집트","튀니지","파라과이","가나","카타르","우즈베키스탄","뉴질랜드","파나마"]},
 ac:{strong:["일본","이란","호주","사우디아라비아"],mid:["카타르","우즈베키스탄","이라크","UAE","요르단"],weak:["중국","태국","오만","바레인","인도","시리아","팔레스타인","인도네시아"]},
 oly:{strong:["스페인","프랑스","아르헨티나","브라질","이탈리아"],mid:["일본","모로코","이집트","미국","우크라이나","콜롬비아"],weak:["뉴질랜드","이라크","우즈베키스탄","도미니카공화국","기니","파라과이"]},
 ag:{strong:["일본","이란","우즈베키스탄","사우디아라비아"],mid:["카타르","UAE","이라크","호주","중국"],weak:["태국","베트남","인도네시아","홍콩","요르단","바레인"]},
 u20:{strong:["브라질","아르헨티나","프랑스","스페인","잉글랜드","이탈리아"],mid:["우루과이","콜롬비아","일본","미국","멕시코","모로코"],weak:["이집트","호주","뉴질랜드","나이지리아","사우디아라비아","파나마"]},
 u17:{strong:["브라질","프랑스","스페인","잉글랜드","독일"],mid:["일본","멕시코","미국","세네갈","이란"],weak:["인도네시아","뉴질랜드","우즈베키스탄","코트디부아르","파라과이"]}
};
const pickN=(a,n)=>shuffle(a).slice(0,n);
L.drawTournament=function(id){
  const P=POOLS[id]||POOLS.wc; const used=new Set();
  const take=(arr,tier)=>{ const c=pickN(arr.filter(x=>!used.has(x)),1)[0]||arr[0]; used.add(c); return {n:c,tier}; };
  const grp=[take(P.strong,"강팀"),take(P.mid,"중위권"),take(P.weak,"약체")];
  const group=String.fromCharCode(65+ri(0,11))+"조";
  const ko=[pickN(P.mid.concat(P.weak),1)[0],pickN(P.mid.concat(P.strong),1)[0],pickN(P.strong,1)[0],pickN(P.strong,1)[0],pickN(P.strong,1)[0],pickN(P.strong,1)[0]];
  return {group,opps:grp,ko};
};
/* 이긴/진 점수 */
const score=(w)=>{ if(w==="W"){ const a=pick([[1,0],[2,0],[2,1],[3,1],[1,0],[3,0],[2,1]]); return a; } if(w==="D"){ const k=pick([0,1,1,2]); return [k,k]; } const a=pick([[0,1],[0,2],[1,2],[1,3],[0,1],[0,3]]); return a; };
L.genRun=function(t,r,draw,played,outRound,title,medal,stage){
  const out=[]; const g=draw.opps; let pts=0;
  /* 조별리그: 통과하면 4점 이상, 못 하면 3점 이하 */
  const passed=!(/^조별리그 탈락/.test(stage||""));
  const pats=passed?[["W","W","L"],["W","D","D"],["W","W","W"],["W","D","L"],["D","W","D"],["W","L","W"]]:[["L","L","D"],["D","L","L"],["W","L","L"],["L","L","L"],["D","D","L"],["L","D","L"]];
  const pat=pick(pats); const order=shuffle([0,1,2]);
  pat.forEach((res,i)=>{ const o=g[order[i]]; const [f,a]=score(res); pts+=res==="W"?3:res==="D"?1:0; out.push({stage:"조별리그 "+(i+1)+"차전",opp:o.n,tier:o.tier,f,a,res}); });
  r.group={name:draw.group,teams:["대한민국"].concat(g.map(x=>x.n)),pts,rank:passed?(pts>=7?1:2):(pts>=3?3:4),passed};
  if(t.id==="oly"){
    if(played>=2){ const ko=draw.ko; const names=["8강","4강"]; for(let i=1;i<played&&i<=2;i++){ const lastLost=(i===played-1)&&/탈락/.test(stage); const [f,a]=score(lastLost?"L":"W"); out.push({stage:names[i-1],opp:ko[i-1],tier:"토너먼트",f,a,res:lastLost?"L":"W"}); }
      if(played===4){ const lost4=/4강 탈락/.test(stage)||stage==="동메달"||stage==="4위"; if(stage==="금메달"||stage==="은메달"){ const [f,a]=score(stage==="금메달"?"W":"L"); out.push({stage:"결승",opp:ko[2],tier:"결승",f,a,res:stage==="금메달"?"W":"L"}); } else if(stage==="동메달"||stage==="4위"){ const [f,a]=score(stage==="동메달"?"W":"L"); out.push({stage:"동메달 결정전",opp:ko[2],tier:"3·4위전",f,a,res:stage==="동메달"?"W":"L"}); } } }
    return out;
  }
  for(let i=1;i<played;i++){ const rn=t.rounds[i][0]; const lastLost=(i===played-1)&&!title; const res=lastLost?"L":"W"; let [f,a]=score(res); let pk=null; if(Math.random()<.15&&res==="W"&&(rn==="8강"||rn==="4강"||rn==="결승")){ a=f; pk=[5,4]; } else if(lastLost&&Math.random()<.18){ a=f; pk=[3,4]; }
    out.push({stage:rn,opp:draw.ko[Math.min(i-1,5)],tier:rn==="결승"?"결승":"토너먼트",f,a,res,pk}); }
  return out;
};
L.hostOf=function(id,y){ const h=HOST[id]&&HOST[id][y]; if(h) return h; const l=FAKE_HOST[id]||["미정"]; return l[Math.abs((y*7+id.length*3)%l.length)]+" (가상)"; };
const held=(t,y)=>y>=t.first&&(y-t.first)%t.every===0;
const levelRef=S=>S.stage==="pro"||S.stage==="univ"?0:L.youthLevel(L.age(S));

/* 발탁 확률 (능력치 기준 · 소속 리그가 낮으면 불리) */
L.callupProb=function(S,t){
  const ag=L.age(S), p=S.p; if(ag<t.minAge||(t.maxAge&&ag>t.maxAge)) return 0;
  if(S.military==="serving"&&S.milKind==="army") return 0;
  if(t.rel!=null){                                   // 유소년 대표: 또래 기준 상대 능력치 (두각을 나타낸 선수만)
    const ref=L.youthLevel(Math.min(ag,18))+(S.stage==="youth"?S.youthTier:0)+(S.stage==="pro"?6:0);
    return clamp(logistic((p.ovr-ref-t.rel)/2.8),0,.9)*(S.stage==="youth"||ag<=17?1:.75);
  }
  const lg=S.club&&S.club.lg, bonus=(lg==="EPL"||lg==="LAL"||lg==="BUN"||lg==="SEA")?4:lg==="L1"?3:lg==="SPL"?1:lg==="K2"?-3:lg==="EPL2"?1:0;
  return clamp(logistic((p.ovr+bonus+S.rep*.02+L.fameEff(S.fame)*.02-1-t.thr)/2.6),0,.97);
};
/* 개최 달 → 이 구간 뒤에 소집돼요. K리그(3~12월 시즌)와 프리미어리그(8~5월 시즌)는 구간 달이 달라요 */
function segFor(cal,month){ if(cal==="E") return month>=8&&month<=10?"h1":month>=11?"h2":month<=3?"h3":"h4"; return month<=6?"h1":month<=8?"h2":month<=10?"h3":"h4"; }
L.planCallups=function(S,sim){
  const out=[]; if(S.military==="serving"&&S.milKind==="army") return out;
  const cal=sim&&sim.cal||"K";
  Object.values(TOURN).forEach(t=>{
    /* K리그: 같은 해에 열리는 대회. 프리미어리그 시즌(8월~이듬해 5월): 올해 8월 이후 + 내년 8월까지의 대회 */
    const years=cal==="E"?[S.year,S.year+1]:[S.year];
    years.forEach(y=>{ if(!held(t,y)) return; const m=t.m[0]; if(cal==="E"&&!((y===S.year&&m>=8)||(y===S.year+1&&m<=8))) return;
      const pr=L.callupProb(S,t); if(pr>0&&Math.random()<pr) out.push({t:t.id,name:t.name,short:t.short,host:L.hostOf(t.id,y),draw:L.drawTournament(t.id),after:segFor(cal,m),year:y,months:t.m[0]===t.m[1]?t.m[0]+"월":t.m[0]+"~"+t.m[1]+"월",done:false,pr:Math.round(pr*100)}); }); });
  /* 월드컵·아시안컵 해에는 확실한 에이스가 못 나가는 일이 없도록 부상 시 제외 */
  return out;
};

/* 대회를 치러요. 결과는 {stage, title, medal, caps, goals, text} */
L.joinTournament=function(S,c){
  const t=TOURN[c.t], p=S.p, sim=S.sim; c.done=true; const YR=c.year||S.year;
  const inj=sim&&sim.out>3; if(inj){ const r={t:t.id,name:t.name,year:S.year,skipped:true,text:"부상으로 대표팀 소집에서 제외되었습니다."}; sim.natRecs.push(r); return r; }
  const ref=t.rel!=null?L.youthLevel(Math.min(L.age(S),18))+(S.stage==="youth"?S.youthTier:0)+(S.stage==="pro"?6:0):t.thr;
  const rel=p.ovr-ref+(L.traitFx(p).big-1)*12;
  const sr=clamp(logistic((rel+(t.rel!=null?t.rel:1))/3.2)*.85+.1,.1,.97);               // 대회에서의 비중(선발 확률)
  /* 초특급 에이스(능력치 90 후반)는 혼자서 경기를 뒤집어요: 팀이 약해도 통과 확률을 크게 끌어올려요 */
  const carry=clamp((p.ovr-88)/9,0,1);
  const stepP=(base,i)=>{ const v=clamp(base*Math.exp(rel*(t.sens||.012)*(i<1?1:.6)),.05,.97); return clamp(v+(1-v)*carry*.5,.05,.97); };
  let played=0, stage, title=false, medal=null, reached=0, outRound=null;
  if(t.id==="oly"){
    /* 조별 → 8강 → 4강 → (승: 결승 / 패: 동메달 결정전) */
    const path=[]; let alive=true;
    for(let i=0;i<3&&alive;i++){ played=i+1; if(Math.random()>=stepP(t.rounds[i][1],i)){ alive=false; stage=t.rounds[i][0]+" 탈락"; } }
    if(alive){ played=4; const gold=Math.random()<clamp(.4+rel*.008,.2,.7); title=gold; medal=gold?"금":"은"; stage=gold?"금메달":"은메달"; }
    else if(stage==="4강 탈락"){ played=4; if(Math.random()<.55){ medal="동"; stage="동메달"; } else stage="4위"; }
  } else {
    reached=0; outRound=null;
    for(let i=0;i<t.rounds.length;i++){ played=i+1; if(Math.random()<stepP(t.rounds[i][1],i)) reached=i+1; else { outRound=t.rounds[i][0]; break; } }
    if(!outRound){ title=true; medal="금"; stage="우승"; }
    else if(outRound==="결승") { stage="준우승"; medal="은"; }
    else stage=outRound+" 탈락";
  }
  let games=0; for(let i=0;i<played;i++) games+=t.matches[i];
  const caps=Math.max(0,Math.round(games*sr)); const mf=sr>.5?.9:.5;
  const goals=binom(caps,clamp(L.shareG(p.sub)*mf*.8*Math.exp((p.ovr-ref)/30),0,.5));
  const r={t:t.id,name:t.name,short:t.short,year:YR,host:L.hostOf(t.id,YR),stage,caps,games,goals,title,medal,reached:played,rel:Math.round(rel),sr:Math.round(sr*100),text:""};
  if(t.id==="wc"&&r.stage==="우승") r.text="월드컵 우승! 온 나라가 뒤집어졌습니다.";
  /* 반영 */
  S.career.caps+=caps; S.career.intGoals+=goals;
  if(sim){ sim.natRecs.push(r); sim.capsAuto+=caps; sim.intGoalsAuto+=goals; }
  S.fame=Math.max(0,S.fame+(t.id==="wc"?10:t.id==="ac"||t.id==="oly"?6:3)+(title?8:0)+goals*1.5);
  S.rep=clamp(S.rep+(t.id==="wc"?5:3)+(title?5:0),0,100);
  S.morale=clamp(S.morale+(title?12:medal?6:-1),0,100); S.cond=clamp(S.cond-6,20,100);
  const gl=(medal==="금"||title);
  if(sim){ if(title) sim.cupTitles.push(t.medal?t.name+" 금메달":t.name+" 우승"); else if(t.id==="oly"&&medal) sim.cupTitles.push(t.name+" "+stage); }
  if(t.medal){ if((t.id==="ag"&&gl)||(t.id==="oly"&&medal)){ if(S.military==="none"||S.military==="sangmu"||S.military==="serving"&&S.milKind==="sangmu"){ if(S.military==="none"){ S.military="exempt"; r.exempt=true; L.addMoment(S,"병역 특례","병역 특례",t.name+" "+stage+"! 병역 혜택을 받았습니다."); } } } }
  if(caps>0) L.addMoment(S,t.short+" "+(stage==="우승"||/금/.test(stage)?"우승":"출전"),t.short,t.name+" "+S.year+" · "+stage+" ("+caps+"경기 "+goals+"골)");
  L.feedAdd(S,S.year+" "+t.short,t.name+" "+stage+" · "+caps+"경기 "+goals+"골",title?1:0);
  if(title&&carry>=.45){ r.carry=true; r.text=(t.id==="wc"?"월드컵을 혼자 지배했습니다. ":"대회를 혼자 지배했습니다. ")+"결정적인 순간마다 당신이 있었어요."; if(t.id==="wc"||t.id==="ac"){ r.golden=true; S.awards.push({year:S.year,name:t.id==="wc"?"월드컵 골든볼":"아시안컵 MVP",youth:false,comp:t.name}); } }
  r.text=r.text||(title?"우승을 차지했습니다.":stage);
  try{ r.matches=L.genRun(t,r,c.draw||L.drawTournament(t.id),played,typeof outRound!=="undefined"?outRound:null,title,medal,stage); }catch(e){ r.matches=[]; }
  return r;
};
})();

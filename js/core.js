/* K-레전드 38 코어: 설정, 데이터 가공, 포메이션, 능력치 계산 (화면과 무관한 순수 로직) */
(function(){
"use strict";

/* ===== 밸런스 설정: 여기 숫자만 바꿔도 난이도가 바뀌어요 ===== */
const CONFIG = {
  RESPINS: 2,          // 게임당 다시 스핀 횟수
  GOAL_BASE: 1.3,      // 실력이 같을 때 한 팀의 평균 득점
  SPREAD: 21,          // 작을수록 실력 차이가 결과에 크게 반영됨
  HOME_ADV: 0.85,      // 홈 어드밴티지 (능력치 점수)
  CHEM_PER_PAIR: 0.55, // 같은 팀(시즌) 출신 2명당 케미 보너스
  NAT_PER_PAIR: 0.35,  // 같은 시기 국가대표 2명당 케미 보너스
  CHEM_MAX: 3.5,       // 케미 보너스 상한
  OUT_OF_POS: 3,       // 주 포지션이 아닌 자리에 세웠을 때 능력치 감점
  FORCED_POS: 8,       // 아예 못 서는 포지션에 억지로 세웠을 때 감점

  /* 능력치 척도: 원본 데이터의 70점이 62점, 점수 차이는 1.4배로 벌려요. 바닥은 R_MIN */
  R_BASE: 62, R_ANCHOR: 70, R_SCALE: 1.4, R_MIN: 58, R_MAX: 99,
  /* 시즌별 능력치 = 나이 곡선 + 그 시즌 평가 + 컨디션 (프라임 모드는 전성기 능력치 그대로) */
  W_AGE: .65,          // 나이 곡선 비중 (나머지는 원본 시즌 평가)
  NOISE: 2.4,          // 시즌마다 조금씩 달라지는 컨디션 폭
  AGE_PEAK: {GK:[27,35], DF:[26,32], MF:[25,31], FW:[24,30]},  // 전성기 나이대
  AGE_UP: 1.8,         // 전성기 전, 1살 어릴 때마다 깎이는 능력치
  AGE_DOWN1: 1.0,      // 전성기 후 처음 3년, 1살마다 깎이는 능력치
  AGE_DOWN2: 1.5,      // 그 뒤로 1살마다 깎이는 능력치
  POS_CANDS: 5,        // 연도+포지션 스핀에서 보여줄 후보 선수 수
  TEAM_CANDS: 0,       // 연도+팀 스핀에서 공개할 선수 수 (0이면 그 팀 선수 전원 공개)
  BENCH_CANDS: 6,      // 후보 뽑기에서 라운드마다 보여줄 선수 수
  MGR_CANDS: 3,        // 감독 뽑기에서 보여줄 후보 감독 수
  MGR_PER_OVR: 0.17,   // 감독 능력치 1당 공격·수비 보정 (80이 기준)
  MGR_STYLE: 0.85,     // 공격형/수비형 감독의 공격↔수비 보정
  MGR_FORM: 0.7,       // 선호 포메이션과 맞을 때 공격·수비 보너스
  BENCH: 5,            // 후보 선수 수 (포메이션과 상관없이 아무 포지션이나 가능)

  /* 체력: 경기마다 뛴 선수는 닳고 쉰 선수는 회복해요. 임계값 아래로 떨어진 선발은 같은 자리를 설 수 있는 후보와 교체돼요. */
  STAM_COST: {GK:3, DF:7, MF:8, FW:7},  // 경기당 체력 소모
  STAM_PLAY_REC: 2,    // 뛴 경기에서도 돌아오는 체력
  STAM_REST: 14,       // 쉬는 경기에서 회복하는 체력
  STAM_ROTATE: 60,     // 이 아래면 후보와 교체
  STAM_MIN: 20,        // 체력 하한
  FATIGUE_FROM: 70,    // 이 아래부터 능력치가 깎여요
  FATIGUE_PER: 0.14,   // 체력 1이 모자랄 때마다 깎이는 능력치

  /* 카드: 퇴장은 그 경기를 10명으로 치르고 다음 경기 결장, 경고 5장 누적마다 1경기 결장 */
  CARD_Y: {GK:.02, DF:.13, MF:.14, FW:.08},  // 경기당 경고 확률
  CARD_R: .004,        // 경기당 다이렉트 퇴장 확률
  CARD_Y2: .03,        // 경고를 받은 선수가 같은 경기에서 한 번 더 받아 퇴장당할 확률
  RED_PEN: 5.5,        // 퇴장 1명당 그 경기 공격·수비 감점
  OPP_RED: .06,        // 상대팀이 한 경기에서 퇴장을 당할 확률
  OPP_YELLOW: 1.8,     // 상대팀 경기당 평균 경고 수
  YOUTH_OVR: 60,       // 결장자를 대신할 후보조차 없을 때 투입되는 유스 선수 능력치

  /* 부상: 체력이 낮을수록 잘 다쳐요. [확률, 최소 결장, 최대 결장] */
  INJ_BASE: .005,      // 경기당 선수 1명의 부상 확률
  INJ_GK: .4,          // 골키퍼는 이 배율만큼 덜 다쳐요
  INJ_LEN: [[.55,1,3],[.35,4,8],[.10,9,16]],

  /* 더비(상대팀끼리의 경기) */
  DERBY_SPREAD: 34,    // 더비는 이 값으로 계산해서 이변이 잘 나와요
  DERBY_HOME: 1.3,     // 더비 홈 이점

  /* 2026 현역 선수는 같은 척도에서 한 단계 더 끌어올려요 (올해 활약 중인 선수가 너무 낮게 평가되지 않게) */
  UP26_SLOPE: 1.15, UP26_ADD: 4,
  AI_DRIFT: 1.3,       // 시즌이 바뀔 때 상대 선수 능력치가 흔들리는 폭
  AI_SWAPS: 8,         // 시즌마다 상대팀끼리 맞바꾸는 선수 수 (이적시장)
  /* 상대팀(2026 K리그1) */
  HARD_FILL: 6.5,      // 어려움: 목록에 없는 나머지 선수 기본 능력치 가산
  PRIME_DEFAULT: 2,    // 프라임 능력치가 비어 있을 때 올해 능력치에 더하는 값 (원본 척도)
  CUP_HARD: 0,         // 어려움: FA컵/ACL 상대 팀 능력치 가산

  /* 대회 일정: 리그 N라운드를 치른 뒤에 열려요 */
  FA_AFTER: [6,14,22,31],                   // FA컵 16강, 8강, 4강, 결승
  ACL_GROUP_AFTER: [3,7,11,15,19,23],       // ACL 조별리그 6경기
  ACL_KO_AFTER: [26,28,29,31,33,35,37],     // 16강 1·2차전, 8강 1·2차전, 4강 1·2차전, 결승
  ACL_QUAL_RANK: 3,                         // 리그 이 순위 이내면 다음 시즌 ACL 진출 (FA컵 우승팀도 진출)
  ET_FACTOR: .34,                           // 연장전 득점 기대값 (90분 대비)

  /* 시즌 사이 */
  TRANSFERS: 3,        // 겨울 이적시장 영입 기회
  REROLLS: 2,          // 영입 후보 다시 보기 횟수
  WINTER_CANDS: 8,     // 영입 후보 수
  DEV_RANGE: [-4,3]    // 시즌 사이 능력치 변화 범위
};

Object.assign(CONFIG, window.KL_OVERRIDE||{});   // (개발용) 밸런스 실험할 때 바깥에서 설정을 덮어쓸 수 있어요
const MGRS = (window.KL_MANAGERS||[]).map((m,i)=>({id:i,name:m[0],note:m[1],ovr:m[2],style:m[3],form:m[4],org:m[5]}));
const STYLE_NAME = {A:"공격형",D:"수비형",B:"균형형"};
const RAW = window.KL_DATA;

/* "2014–15" -> [2014,2015], "2002 월드컵" -> [2002,2002] */
function yearsOf(era){
  const m=String(era).match(/(\d{4})(?:[–-](\d{2,4}))?/); if(!m) return [0,0];
  const a=+m[1]; let b=a; if(m[2]) b = m[2].length===2 ? +(String(a).slice(0,2)+m[2]) : +m[2];
  return [a,b];
}
const overlap=(x,y,tol)=>x[0]-tol<=y[1] && y[0]-tol<=x[1];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
/* 팀 전체 능력치는 선수 바닥(R_MIN)에 걸리지 않게 따로 변환 */
const teamScale = x => Math.round(CONFIG.R_BASE+(x-CONFIG.R_ANCHOR)*CONFIG.R_SCALE);
const rescale = x => clamp(Math.round(CONFIG.R_BASE+(x-CONFIG.R_ANCHOR)*CONFIG.R_SCALE), CONFIG.R_MIN, CONFIG.R_MAX);
const BORN = window.KL_BORN||{};
/* 나이에 따른 능력치 감점 */
function agePen(age,pos){
  const pk=CONFIG.AGE_PEAK[pos]||[25,31];
  if(age<pk[0]) return (pk[0]-age)*CONFIG.AGE_UP;
  if(age<=pk[1]) return 0;
  const y=age-pk[1]; return Math.min(y,3)*CONFIG.AGE_DOWN1+Math.max(0,y-3)*CONFIG.AGE_DOWN2;
}
/* 같은 입력이면 항상 같은 값이 나오는 컨디션 편차 (-NOISE ~ +NOISE, 가운데로 몰려요) */
function jitter(key){
  let h=2166136261; for(let i=0;i<key.length;i++){ h^=key.charCodeAt(i); h=Math.imul(h,16777619); }
  const u=((h>>>0)%10000)/10000; h=Math.imul(h^(h>>>15),2246822519); const v=((h>>>0)%10000)/10000;
  return (u+v-1)*CONFIG.NOISE;
}
const SQUADS = RAW.map((r,i)=>({id:i,club:r[0],short:r[1],era:r[2],str:r[3],
  nat:r[0]==="대한민국 대표팀", yrs:yearsOf(r[2]),
  players:r[4].map(p=>({name:p[0],pos:p[1],raw:p[2],alt:p[3]||null,det:p[4]?p[4].split("/"):null,sq:i}))}));
/* 원본 데이터에서 같은 선수의 최고 능력치(전성기)와 처음 등장한 해 */
const LEGEND_BEST = {}, BEST_BY_NAME = {}, FIRST_YEAR = {};
SQUADS.forEach(q=>q.players.forEach(p=>{ const k=p.name+"|"+p.pos; LEGEND_BEST[k]=Math.max(LEGEND_BEST[k]||0,p.raw); BEST_BY_NAME[p.name]=Math.max(BEST_BY_NAME[p.name]||0,p.raw); FIRST_YEAR[p.name]=Math.min(FIRST_YEAR[p.name]||9999,q.yrs[0]); }));
SQUADS.forEach(q=>q.players.forEach(p=>{
  p.yr=(q.yrs[0]+q.yrs[1])/2;
  const born = BORN[p.name]!=null ? BORN[p.name] : FIRST_YEAR[p.name]-27;   // 모르면 처음 등장한 해에 27살로 가정
  p.age=Math.round(p.yr-born);
  const primeS=rescale(BEST_BY_NAME[p.name]);
  const curve=primeS-agePen(p.age,p.pos);
  const mixed=CONFIG.W_AGE*curve+(1-CONFIG.W_AGE)*rescale(p.raw)+jitter(p.name+"|"+q.short+"|"+q.era);
  p.ovrP=primeS;                                   // 전성기(프라임) 능력치
  p.ovrS=clamp(Math.round(mixed),CONFIG.R_MIN,primeS); // 그 시즌 능력치
  p.ovr=p.ovrS;
}));
let RATING_MODE="season";
/* 내 선수 능력치 기준: "season"(그 시즌) 또는 "prime"(전성기) */
function setRatingMode(m){ RATING_MODE=m==="prime"?"prime":"season"; SQUADS.forEach(q=>q.players.forEach(p=>{ p.ovr = RATING_MODE==="prime"?p.ovrP:p.ovrS; })); }
const NATS = SQUADS.filter(q=>q.nat).map(q=>({id:q.id,yrs:q.yrs,names:new Set(q.players.map(p=>p.name))}));
const tag = s => s.short+" "+s.era.replace(/^20|^19/,"'").replace(/–(20|19)?/,"–");
const squadKey = s => s.short+"|"+s.era;
let YEARS = [];
const calcYears = () => { const a=SQUADS.map(q=>q.yrs[0]), b=SQUADS.map(q=>q.yrs[1]); const out=[]; for(let y=Math.min(...a);y<=Math.max(...b);y++) out.push(y); YEARS = out; };
calcYears();
const coversYear = (q,y) => q.yrs[0]<=y && y<=q.yrs[1];

/* 2026 K리그1 상대팀. 프라임 능력치: 직접 적은 값 > 레전드 데이터의 같은 선수 최고값 > 올해 능력치+PRIME_DEFAULT (모두 원본 척도로 정한 뒤 한꺼번에 변환) */
const up26 = x => 70+(x-70)*CONFIG.UP26_SLOPE+CONFIG.UP26_ADD;
const FORM26 = window.KL_2026_FORM||{}, BUMP26 = window.KL_2026_BUMP||{};
const TEAMS26 = (window.KL_2026||[]).map(t=>{ const form=FORM26[t[0]]||0;
  return {club:t[0],short:t[1],div:1,base:teamScale(up26(t[2]+form)),
  players:t[3].map(p=>{ const legend=LEGEND_BEST[p[0]+"|"+p[1]];
    const cur = up26(p[2]+form+(BUMP26[p[0]]||0));
    const ovr=rescale(cur);
    /* 전성기: 직접 적은 값 > 레전드 데이터의 같은 선수 최고값 > 올해 능력치 + PRIME_DEFAULT */
    const primeRaw = p[4]!=null ? rescale(up26(p[4])) : (legend ? rescale(legend) : rescale(up26(p[2]+CONFIG.PRIME_DEFAULT)));
    return {name:p[0],pos:p[1],ovr,det:p[3]||"",prime:Math.max(ovr,primeRaw)}; })}; });
/* 2026 현역 선수도 드래프트에서 뽑을 수 있게 구단 시즌 하나로 추가 (상대팀에 있어도 내 팀에 뽑을 수 있어요) */
TEAMS26.forEach(t=>{
  const id=SQUADS.length;
  SQUADS.push({id,club:t.club,short:t.short,era:"2026",str:t.base,nat:false,yrs:[2026,2026],
    players:t.players.map(p=>({name:p.name,pos:p.pos,raw:p.ovr,alt:null,det:p.det?p.det.split("/"):null,sq:id,yr:2026,age:27,ovrS:p.ovr,ovrP:p.prime,ovr:p.ovr}))});
});
calcYears();
/* K리그2 팀: 선수 명단 없이 팀 기본 능력치만 있어요 (1부로 올라오면 그 능력치 그대로 K리그1 팀이 돼요) */
const K2_DEFS = (window.KL_K2||[]).map(t=>({club:t[0],short:t[0],div:2,base:teamScale(t[2]),players:[]}));
/* ACL 참가팀(해외): 선수단이 있으면 선수 능력치로, 없으면 팀 기본 능력치로 계산 */
const ACL_POOL = (window.KL_ACL_TEAMS||[]).map(t=>({club:t[0],short:t[0],kind:t[1],div:0,base:teamScale(up26(t[2])),
  players:t[3].map(p=>{ const ovr=rescale(up26(p[2])); const prime=p[4]!=null?rescale(up26(p[4])):rescale(up26(p[2]+CONFIG.PRIME_DEFAULT));
    return {name:p[0],pos:p[1],ovr,det:p[3]||"",prime:Math.max(ovr,prime)}; })}));
const DERBIES = window.KL_DERBIES||[];
function derbyName(a,b){ const d=DERBIES.find(x=>(x[0]===a&&x[1]===b)||(x[0]===b&&x[1]===a)); return d?d[2]:null; }

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

/* 카드 등급: 능력치에 따라 FIFA처럼 색이 달라요 */
function tier(ovr){ return ovr>=90?"icon":ovr>=85?"elite":ovr>=80?"gold":ovr>=75?"silver":"bronze"; }

function avg(a){return a.length? a.reduce((x,y)=>x+y,0)/a.length : 60;}
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function poisson(l){ const L=Math.exp(-l); let k=0,p=1; do{k++; p*=Math.random();}while(p>L); return k-1; }
function randn(){ let u=0,v=0; while(!u) u=Math.random(); while(!v) v=Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
function pickScorer(players){
  const w={GK:0,DF:.5,MF:2.4,FW:5};
  const ws=players.map(p=>w[p.g||p.pos]*Math.max(1,p.ovr-62)); const tot=ws.reduce((a,b)=>a+b,0);
  if(!(tot>0)) return players[players.length-1];
  let r=Math.random()*tot; for(let i=0;i<players.length;i++){ r-=ws[i]; if(r<=0) return players[i]; } return players[players.length-1];
}
/* 도움 선수: 골을 넣은 선수를 뺀 나머지 중에서 중원·공격수 위주로 */
function pickAssist(players,scorer){
  const w={GK:.05,DF:.9,MF:3,FW:2.2};
  const c=players.filter(p=>p!==scorer && p.name!==scorer.name);
  const ws=c.map(p=>w[p.g||p.pos]*Math.max(1,p.ovr-60)); const tot=ws.reduce((a,b)=>a+b,0);
  if(!c.length||!(tot>0)) return null;
  let r=Math.random()*tot; for(let i=0;i<c.length;i++){ r-=ws[i]; if(r<=0) return c[i]; } return c[c.length-1];
}

/* 드래프트로 뽑은 선수는 복사해서 써요 (시즌마다 능력치가 변해도 원본 데이터는 그대로) */
let UID=1;
function clone(p){ return Object.assign({},p,{uid:UID++, base:p.ovr, trend:Math.random()*1.4-.9, delta:0}); }

/* 감독 보정 */
function mgrFx(m,form){
  if(!m) return {att:0,def:0,mult:1};
  const base=(m.ovr-80)*CONFIG.MGR_PER_OVR;
  let att=base, def=base;
  if(m.style==="A"){ att+=CONFIG.MGR_STYLE; def-=CONFIG.MGR_STYLE; }
  else if(m.style==="D"){ att-=CONFIG.MGR_STYLE; def+=CONFIG.MGR_STYLE; }
  if(m.form===form){ att+=CONFIG.MGR_FORM; def+=CONFIG.MGR_FORM; }
  return {att,def,mult:0.7+0.15*m.org};
}

/* 체력 때문에 깎이는 능력치 */
const fatigue = st => st>=CONFIG.FATIGUE_FROM ? 0 : (CONFIG.FATIGUE_FROM-st)*CONFIG.FATIGUE_PER;

/* 팀 능력치. xi: 슬롯 순서대로의 선수 배열, st: 선수→체력 Map(없으면 만땅), ctx: {form, mgr} */
function rate(xi,st,ctx){
  const slots=FORMS[ctx.form]; const g={GK:[],DF:[],MF:[],FW:[]};
  xi.forEach((p,i)=>{ if(!p) return; const lab=slots[i][0], grp=GROUP[lab];
    const prime = p.det ? ACCEPT[lab].includes(p.det[0]) : p.pos===grp;
    const pen = !fitsSlot(p,lab) ? CONFIG.FORCED_POS : (prime?0:CONFIG.OUT_OF_POS);
    const sv = st && st.has(p) ? st.get(p) : 100;
    g[grp].push(p.ovr-pen-(st?fatigue(sv):0)); });
  const gk=avg(g.GK), df=avg(g.DF), mf=avg(g.MF), fw=avg(g.FW);
  const cnt={}; xi.forEach(p=>{ if(p && p.sq>=0) cnt[p.sq]=(cnt[p.sq]||0)+1; });
  let pairs=0; Object.values(cnt).forEach(c=>pairs+=c*(c-1)/2);
  const fx=mgrFx(ctx.mgr,ctx.form);
  /* 같은 시기 국가대표 케미: 대표팀 항목 출신이거나, 그 대표팀 명단에 있고 소속 시즌이 겹치는 선수 */
  let natPairs=0;
  NATS.forEach(N=>{
    const c=xi.filter(p=>p && p.sq>=0 && (p.sq===N.id || (N.names.has(p.name) && overlap(SQUADS[p.sq].yrs,N.yrs,1)))).length;
    natPairs+=c*(c-1)/2;
  });
  const chem=Math.min(CONFIG.CHEM_MAX*fx.mult, (pairs*CONFIG.CHEM_PER_PAIR+natPairs*CONFIG.NAT_PER_PAIR)*fx.mult);
  return {att: fw*.5+mf*.35+df*.15+chem+fx.att, def: df*.45+gk*.25+mf*.3+chem+fx.def, chem, mgr:fx, clubPairs:pairs, natPairs,
    ovr: avg(xi.filter(Boolean).map(p=>p.ovr))};
}

/* 상대팀 전력: 대표 선수들 중 포지션별 상위 선수 + 부족한 자리는 팀 기본 능력치로 채움 */
function oppStrength(t,hardDiff,boost){
  const val=p=>hardDiff?p.prime:p.ovr; const b=boost||0;
  const fill=t.base+(hardDiff?CONFIG.HARD_FILL:0);
  const top=(g,n)=>{ const a=t.players.filter(p=>p.pos===g).map(val).sort((x,y)=>y-x).slice(0,n); while(a.length<n) a.push(fill); return a; };
  const gk=top("GK",1)[0], df=avg(top("DF",4)), mf=avg(top("MF",3)), fw=avg(top("FW",3));
  return {att:fw*.5+mf*.35+df*.15+b, def:df*.45+gk*.25+mf*.3+b,
    players:t.players.map(p=>({name:p.name,pos:p.pos,ovr:val(p)+b}))};
}

/* 분 단위 이벤트 목록을 시간순으로 정리하고, 전반/후반 종료·연장·승부차기 표시와 누적 스코어를 붙여요.
   ev: [{t:분, k:종류, text, side:"me"|"opp"}], c: {f,a,et,pk,mn(내 팀 이름),on(상대 이름),names(승부차기 키커 후보)} */
function assembleLog(ev,c){
  const label=t=>t<=90?t+"'":"연장 "+(t-90)+"'";
  ev.sort((x,y)=>x.t-y.t);
  const out=[{t:0,k:"mark",text:"킥오프"}];
  let sm=0,so=0,half=false,ft=false;
  ev.forEach(e=>{
    if(!half && e.t>45){ out.push({t:45,k:"mark",text:"전반 종료  "+sm+" : "+so}); half=true; }
    if(!ft && e.t>90){ out.push({t:90,k:"mark",text:"후반 종료  "+sm+" : "+so}); ft=true; if(c.et) out.push({t:90,k:"mark",text:"연장전 시작"}); }
    if(e.k==="goal"){ if(e.side==="me") sm++; else so++; e.text=(e.side==="me"?"GOAL! ":"실점 ")+e.text+"  ("+sm+" : "+so+")"; }
    out.push(e);
  });
  if(!half) out.push({t:45,k:"mark",text:"전반 종료  "+sm+" : "+so});
  if(!ft) out.push({t:90,k:"mark",text:"후반 종료  "+sm+" : "+so});
  if(c.et && !out.some(e=>e.text==="연장전 시작")) out.push({t:90.5,k:"mark",text:"연장전 시작"});
  out.sort((x,y)=>x.t-y.t);
  out.forEach(e=>{ e.m = e.k==="mark"&&e.t===0 ? "0'" : (e.k==="mark"&&e.t===45?"HT":(e.k==="mark"&&e.t===90?"FT":label(Math.round(e.t)))); });
  out.push({t:999,k:"mark",m:"종료",text:"경기 종료  "+c.mn+" "+c.f+" : "+c.a+" "+c.on+(c.pk?"  (승부차기 "+c.pk[0]+"-"+c.pk[1]+")":"")});
  if(c.pk){
    const take=(n,score)=>{ const r=Array(n).fill(false); const idx=shuffle([...Array(n).keys()]); for(let i=0;i<score&&i<n;i++) r[idx[i]]=true; return r; };
    const kicks=Math.max(5,c.pk[0],c.pk[1]); const mine=take(kicks,c.pk[0]), theirs=take(kicks,c.pk[1]);
    const names=c.names&&c.names.length?c.names:["우리 선수"];
    for(let i=0;i<kicks;i++){
      out.push({t:1000,m:"PK",k:mine[i]?"pkgoal":"pkmiss",text:(i+1)+"번 키커 "+names[(10-i+names.length*2)%names.length]+(mine[i]?" 성공":" 실패"),side:"me"});
      out.push({t:1000,m:"PK",k:theirs[i]?"pkgoal":"pkmiss",text:(i+1)+"번 키커 상대 "+(theirs[i]?"성공":"실패"),side:"opp"});
    }
  }
  return out;
}

window.KLCore = {CONFIG, MGRS, STYLE_NAME, SQUADS, NATS, TEAMS26, K2_DEFS, ACL_POOL, DERBIES, FORMS, GROUP, ACCEPT, YEARS,
  yearsOf, overlap, tag, squadKey, coversYear, derbyName, fitsSlot, tier, avg, shuffle, poisson, randn, clamp, pickScorer, pickAssist,
  clone, mgrFx, fatigue, rate, oppStrength, assembleLog, rescale, agePen, setRatingMode, ratingMode:()=>RATING_MODE};
})();

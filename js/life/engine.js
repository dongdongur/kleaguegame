/*
 * K-라이프 (축구선수 키우기) 엔진
 * ------------------------------------------------------------
 * 감독 버전(js/core.js)의 K리그 구단·선수 데이터를 그대로 쓰고, 한 선수의 커리어를 시즌 단위로 진행해요.
 * 이 파일은 화면과 상관없는 계산만 있어요 (js/life/ui.js 가 화면).
 *
 *   LIFE.rollTalent(pos)          재능 뽑기
 *   LIFE.create(opts)             새 인생 만들기
 *   LIFE.draftOffers(S)           드래프트 입단 제의 3곳
 *   LIFE.simSeason(S, plan)       한 시즌을 진행하고 결과 기록(R)을 돌려줘요 (S 가 바뀌어요)
 *   LIFE.contractOffer(S)         시즌 뒤 연봉 협상 정보
 *   LIFE.transferOffers(S)        이적 시장 제의 (국내 + 해외)
 *   LIFE.nextYear(S)              다음 해로 넘어가요
 *   LIFE.legacy(S)                은퇴 후 레거시 점수
 */
(function(){
"use strict";
const K=window.KLCore, CFG=K.CONFIG;
const rnd=(a,b)=>a+Math.random()*(b-a), ri=(a,b)=>Math.floor(rnd(a,b+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const logistic=z=>1/(1+Math.exp(-z));
const r1=v=>Math.round(v*10)/10;

/* ================= 포지션·능력치 ================= */
const POSDEF={
  FW:{name:"공격수",subs:[["ST","스트라이커"],["LW","왼쪽 윙어"],["RW","오른쪽 윙어"]],
      stats:[["finishing","골 결정력"],["dribble","드리블"],["pace","스피드"],["physical","피지컬"],["composure","침착함"]],w:[.30,.20,.20,.15,.15]},
  MF:{name:"미드필더",subs:[["CM","중앙 미드필더"],["AM","공격형 미드필더"],["DM","수비형 미드필더"]],
      stats:[["passing","패스"],["vision","시야"],["dribble","드리블"],["stamina","활동량"],["defending","수비"]],w:[.25,.20,.20,.20,.15]},
  DF:{name:"수비수",subs:[["CB","센터백"],["LB","왼쪽 풀백"],["RB","오른쪽 풀백"]],
      stats:[["defending","수비"],["tackle","대인 수비"],["physical","피지컬"],["pace","스피드"],["building","빌드업"]],w:[.30,.25,.20,.15,.10]},
  GK:{name:"골키퍼",subs:[["GK","골키퍼"]],
      stats:[["saving","선방"],["reflex","반응속도"],["handling","핸들링"],["kicking","킥"],["command","수비 지휘"]],w:[.30,.25,.20,.10,.15]},
};
/* 유형: 시작 능력치와 성장이 한쪽으로 기울어요 (0~4 번째 능력치 보정) */
const TYPES={
  FW:[["finisher","골잡이형",[6,-2,0,0,3],"박스 안에서 득점을 만드는 타입"],["dribbler","돌파형",[-2,6,4,-3,0],"빠른 발과 드리블로 수비를 벗기는 타입"],["target","타깃형",[3,-4,-3,7,2],"몸싸움과 제공권으로 버티는 타입"]],
  MF:[["playmaker","플레이메이커형",[6,5,0,-2,-3],"패스와 시야로 경기를 조율하는 타입"],["box","박스 투 박스형",[0,0,1,7,2],"활동량으로 공수를 오가는 타입"],["destroyer","수비형 미드필더형",[-1,-2,-3,3,7],"공을 따내고 지켜 주는 타입"]],
  DF:[["stopper","스토퍼형",[5,3,3,-3,-4],"강한 대인 수비로 막는 타입"],["builder","빌드업형",[-1,-2,-1,0,8],"후방에서 패스로 공격을 만드는 타입"],["runner","오버래핑 풀백형",[-3,-2,0,8,3],"측면을 오르내리는 타입"]],
  GK:[["shotstopper","선방형",[6,5,0,-4,-2],"반사신경으로 막아내는 타입"],["sweeper","스위퍼 키퍼형",[-1,0,-1,6,4],"발밑과 위치 선정이 좋은 타입"],["commander","지휘형",[0,-2,3,0,7],"수비를 조율하는 타입"]],
};
const STATE_VER=1;
const ovrOf=p=>{ const d=POSDEF[p.pos]; return Math.round(d.stats.reduce((s,[k],i)=>s+p.stats[k]*d.w[i],0)); };

/* 재능 뽑기: 잠재력은 숨기고 등급(S/A/B/C)만 보여줘요 */
function rollTalent(){
  const x=Math.random(), pot=x<.05?ri(90,97):x<.22?ri(82,89):x<.55?ri(74,81):ri(64,73);
  const grade=pot>=90?"S":pot>=82?"A":pot>=74?"B":"C";
  return {pot,grade};
}
/* 나이별 성장 (한 해 동안 능력치가 평균 몇 오르는지) */
const AGE_RATE={13:4.3,14:4.3,15:4.3,16:4.3,17:4.8,18:4.5,19:4.0,20:3.5,21:3.0,22:2.5,23:2.0,24:1.4,25:.9,26:.5,27:.2,28:0,29:-.3,30:-.8,31:-1.3,32:-1.8,33:-2.3,34:-2.8,35:-3.3,36:-3.8};
const ageRate=(age,pos)=>{ if(age<17) return AGE_RATE[clamp(age,13,16)]; const sh=pos==="GK"?3:pos==="DF"?1:0; const a=clamp(age-sh,17,36); return AGE_RATE[a]!=null?AGE_RATE[a]:-4; };
const PHYS=new Set(["pace","stamina","physical"]);

function create(o){
  const t=o.talent||rollTalent(), pos=o.pos, d=POSDEF[pos];
  const ty=TYPES[pos].find(x=>x[0]===o.type)||TYPES[pos][0];
  const a0=o.route==="mid"?13:o.route==="hs"?16:o.route==="univ"?22:18;
  const base=a0<18?Math.max(18,42+(t.pot-60)*.30-(18-a0)*4.4+rnd(-2,2)):42+(t.pot-60)*.30+(a0-18)*3.2+rnd(-2,2);        // 재능이 좋을수록 시작 능력이 높아요
  const stats={}; d.stats.forEach(([k],i)=>{ stats[k]=clamp(Math.round(base+ty[2][i]+rnd(-3,3)),12,95); });
  const S={v:STATE_VER,startYear:2008+a0,year:2008+a0,
    p:{name:o.name||"이름 없는 선수",pos,sub:o.sub||d.subs[0][0],type:ty[0],typeName:ty[1],born:2008,pot:t.pot,grade:t.grade,stats,peak:0,route:o.route||"high",height:ri(170,192)},
    club:null,salary:0,contractYears:0,trust:.4,military:"none",mildone:0,team:"1군",stage:a0<18?"youth":"pro",youthTier:0,
    phase:a0<18?"train":"draft",offers:[],plan:null,history:[],awards:[],trophies:[],moments:[],
    career:{apps:0,starts:0,minutes:0,goals:0,assists:0,cs:0,caps:0,intGoals:0,ratingSum:0,ratingN:0,mom:0},
    drift:{},league:{k1:null,k2:null},rep:50,foreignStay:0,injuryNote:null,log:[],retired:false};
  S.p.ovr=ovrOf(S.p); S.p.peak=S.p.ovr;
  initLeague(S);
  if(a0<18){ const d=pick(K.TEAMS26.concat(K.K2_DEFS)); S.youthTier=ri(-3,3); S.club={id:d.club,name:d.short+(a0<16?" U15":" U18"),short:d.short,lg:"YOUTH",code:(window.KL_CLUB_CODE||{})[d.club]||null,parent:d.club}; }
  return S;
}
const age=S=>S.year-S.p.born;

/* ================= 구단·리그 ================= */
/* 리그 구성: K리그1 12팀(김천 상무 포함) / K리그2 17팀. 승강이 있으면 해마다 바뀌어요 */
function allDefs(){ return K.TEAMS26.concat([K.GIMCHEON],K.K2_DEFS); }
function defById(id){ return allDefs().find(d=>d.club===id); }
function initLeague(S){
  S.league.k1=K.TEAMS26.map(d=>d.club).concat([K.GIMCHEON.club]);
  S.league.k2=K.K2_DEFS.map(d=>d.club);
}
function strengthOf(S,def){
  const d=S.drift[def.club]||0; const s=K.oppStrength(def,false,d); return {att:s.att,def:s.def,lvl:(s.att+s.def)/2};
}
/* 구단 기준 능력치: 주전급(상위 11명) 평균 */
function clubLevel(def){
  const ps=def.players.slice().sort((a,b)=>b.ovr-a.ovr).slice(0,11); return ps.length?ps.reduce((s,p)=>s+p.ovr,0)/ps.length:60;
}
const LGNAME={K1:"K리그1",K2:"K리그2",MIL:"김천 상무",YOUTH:"유소년 리그",UNIV:"대학 리그"};
const FOREIGN=[
 {id:"mci",name:"맨체스터 시티",short:"맨시티",lg:"EPL",lvl:90},{id:"ars",name:"아스널",short:"아스널",lg:"EPL",lvl:88},{id:"nlc",name:"뉴캐슬",short:"뉴캐슬",lg:"EPL",lvl:82},{id:"bha",name:"브라이턴",short:"브라이턴",lg:"EPL",lvl:78},{id:"wol",name:"울버햄튼",short:"울버햄튼",lg:"EPL",lvl:74},
 {id:"rma",name:"레알 마드리드",short:"레알",lg:"LALIGA",lvl:90},{id:"rso",name:"레알 소시에다드",short:"소시에다드",lg:"LALIGA",lvl:80},{id:"get",name:"헤타페",short:"헤타페",lg:"LALIGA",lvl:73},
 {id:"fcb",name:"바이에른 뮌헨",short:"뮌헨",lg:"BUNDES",lvl:90},{id:"bvb",name:"도르트문트",short:"도르트문트",lg:"BUNDES",lvl:84},{id:"mgl",name:"묀헨글라트바흐",short:"묀헨",lg:"BUNDES",lvl:73},
 {id:"int",name:"인터 밀란",short:"인테르",lg:"SERIEA",lvl:86},{id:"nap",name:"나폴리",short:"나폴리",lg:"SERIEA",lvl:82},{id:"tor",name:"토리노",short:"토리노",lg:"SERIEA",lvl:73},
 {id:"psg",name:"파리 생제르맹",short:"PSG",lg:"LIGUE1",lvl:88},{id:"ren",name:"스타드 렌",short:"렌",lg:"LIGUE1",lvl:75},
 {id:"alh",name:"알 힐랄",short:"알 힐랄",lg:"SAUDI",lvl:83},{id:"aln",name:"알 나스르",short:"알 나스르",lg:"SAUDI",lvl:82},{id:"alt",name:"알 타아문",short:"알 타아문",lg:"SAUDI",lvl:70},
 {id:"vis",name:"비셀 고베",short:"비셀 고베",lg:"J1",lvl:72},{id:"kas",name:"가시마 앤틀러스",short:"가시마",lg:"J1",lvl:71},
];
const LG_SAL={K1:1,K2:.45,MIL:.25,EPL:6.5,LALIGA:5.5,BUNDES:5,SERIEA:4.8,LIGUE1:3.5,SAUDI:5.2,J1:1.8};
const LG_LABEL={EPL:"프리미어리그",LALIGA:"라리가",BUNDES:"분데스리가",SERIEA:"세리에 A",LIGUE1:"리그 1",SAUDI:"사우디 프로리그",J1:"J1리그"};
const lgLabel=lg=>LGNAME[lg]||LG_LABEL[lg]||lg;
const isForeign=lg=>!!LG_LABEL[lg];

/* 연봉 (억 원): 능력치가 오를수록 가파르게 올라요 */
function salaryOf(ovr,age,lg){ const base=.25*Math.exp((ovr-55)/7.5); const ageF=age<=21?.8:age<=30?1:age<=33?.9:.7; return Math.max(.3,r1(base*(LG_SAL[lg]||1)*ageF)); }

/* 간이 순위표: 내 리그가 아닌 쪽 리그의 승강을 정하는 데 써요 */
function quickTable(S,key){
  const ids=(key==="K1"?S.league.k1:S.league.k2); const defs=ids.map(defById).filter(Boolean); const st={}, tab={};
  defs.forEach(d=>{ st[d.club]=strengthOf(S,d); tab[d.club]={club:d.club,pts:0,gf:0,ga:0}; });
  schedule(defs.map(d=>d.club),key==="K1"?3:2,key==="K1"?38:36).forEach(([h,a])=>{ const [gh,ga]=playMatch(st[h],st[a]); const H=tab[h],A=tab[a]; H.gf+=gh;H.ga+=ga;A.gf+=ga;A.ga+=gh; if(gh>ga) H.pts+=3; else if(gh<ga) A.pts+=3; else {H.pts++;A.pts++;} });
  return Object.values(tab).sort((x,y)=>y.pts-x.pts||(y.gf-y.ga)-(x.gf-x.ga)).map(t=>t.club);
}
/* ================= 드래프트·이적 ================= */
function mkClubRef(S,name,lg,extra){ return Object.assign({name,lg},extra||{}); }
function clubRefFromDef(S,def,lg){ return {id:def.club,name:def.club,short:def.short||def.club,lg:lg||(S.league.k1.includes(def.club)?"K1":"K2"),code:(window.KL_CLUB_CODE||{})[def.club]||null}; }
function listClubs(S,lg){ return (lg==="K1"?S.league.k1:S.league.k2).map(defById).filter(Boolean); }

function draftOffers(S){
  const p=S.p, score=p.ovr+(p.pot-p.ovr)*.35;
  const k1=listClubs(S,"K1").map(d=>({d,l:clubLevel(d)})).sort((a,b)=>b.l-a.l), k2=listClubs(S,"K2").map(d=>({d,l:clubLevel(d)})).sort((a,b)=>b.l-a.l);
  const pool=[]; // 점수가 높으면 K1 상위 구단 제의가 와요
  const hi=clamp((score-52)/22,0,1);   // 0=K2 위주, 1=K1 위주
  const mk=(x,lg)=>({def:x.d,lg,lvl:x.l});
  for(let i=0;i<3;i++){
    const useK1=Math.random()<.25+hi*.7;
    const arr=useK1?k1:k2; const idx=clamp(Math.floor((1-hi)*(arr.length-1)*(useK1?.7:.5)+rnd(0,arr.length*.45)),0,arr.length-1);
    pool.push(mk(arr[idx],useK1?"K1":"K2"));
  }
  const seen=new Set(); const out=[];
  pool.forEach(c=>{ if(seen.has(c.def.club)) return; seen.add(c.def.club); out.push(c); });
  while(out.length<3){ const c=mk(pick(k2),"K2"); if(!seen.has(c.def.club)){ seen.add(c.def.club); out.push(c); } }
  return out.sort((a,b)=>b.lvl-a.lvl).map(c=>{
    const sr=startRateAt(p.ovr,c.lvl,S.trust,p);
    return {club:clubRefFromDef(S,c.def,c.lg),lvl:r1(c.lvl),salary:salaryOf(p.ovr+3,age(S),c.lg),years:3,role:roleLabel(sr),sr};
  });
}
function signWith(S,offer){ S.club=offer.club; S.salary=offer.salary; S.contractYears=offer.years; S.phase="train"; S.offers=[]; S.stage="pro"; S.team=offer.sr<.14?"2군":"1군";
  if(!S.history.length) addMoment(S,"프로 입단","입단",S.club.name+"과 프로 계약을 맺었습니다.");
}

/* ================= 출전 · 시즌 ================= */
function startRateAt(ovr,lvl,trust,p){
  const a=p.born!=null?0:0; const youth=clamp((p.pot-ovr)/40,0,.25);
  const z=(ovr-(lvl-1.5))/3.6, sr0=logistic(z);
  return clamp(sr0*.8+trust*.2+youth*(sr0<.5?.4:0),.02,.97);
}
const roleLabel=sr=>sr>=.85?"핵심 주전":sr>=.6?"주전":sr>=.35?"로테이션":sr>=.12?"벤치":"2군";

/* 한 경기 결과 (홈/원정) */
function playMatch(h,a){
  const ha=CFG.HOME_ADV, lh=CFG.GOAL_BASE*Math.exp((h.att+ha-a.def)/CFG.SPREAD), la=CFG.GOAL_BASE*Math.exp((a.att-h.def-ha)/CFG.SPREAD);
  return [K.poisson(lh),K.poisson(la)];
}
/* 일정: 모든 팀 쌍을 n번씩 (+ 홈/원정 번갈아), 부족한 경기는 무작위 쌍으로 채워요 */
function schedule(ids,per,total){
  const m=[]; for(let i=0;i<ids.length;i++) for(let j=i+1;j<ids.length;j++) for(let k=0;k<per;k++) m.push(k%2?[ids[i],ids[j]]:[ids[j],ids[i]]);
  while(m.length<total*ids.length/2){ const i=ri(0,ids.length-1); let j=ri(0,ids.length-1); if(i===j) continue; m.push([ids[i],ids[j]]); }
  return m;
}
/* 내 선수가 구단 전력에 주는 영향 */
function myImpact(S,sr,lvl){
  const d=(S.p.ovr-lvl)*sr/11*1.4, w={FW:[1.4,.3],MF:[.9,.8],DF:[.35,1.3],GK:[.1,1.8]}[S.p.pos];
  return {att:d*w[0],def:d*w[1]};
}
const SHARE_G={ST:.26,LW:.15,RW:.15,AM:.10,CM:.055,DM:.03,CB:.035,LB:.02,RB:.02,GK:0};
const SHARE_A={ST:.11,LW:.17,RW:.17,AM:.20,CM:.13,DM:.05,CB:.02,LB:.09,RB:.09,GK:.005};
const sg=k=>SHARE_G[k]!=null?SHARE_G[k]:.05, sa=k=>SHARE_A[k]!=null?SHARE_A[k]:.05;   // GK 는 0 이라서 || 로 쓰면 안 돼요
function binom(n,p){ let k=0; for(let i=0;i<n;i++) if(Math.random()<p) k++; return k; }

function playerSeasonStats(def,gf,ga,rankFactor,year){
  /* 구단 선수들에게 득점·도움을 나눠요 (실제 선수 이름으로 득점왕 경쟁을 만들어요) */
  const ps=def.players.slice().sort((a,b)=>b.ovr-a.ovr).slice(0,16).map(p=>({name:p.name,pos:p.pos,g:p.pos,ovr:p.ovr,age:ageOfPlayer(p,year),id:p.id,club:def.club,goals:0,assists:0,apps:0}));
  ps.forEach((p,i)=>{ p.apps=clamp(Math.round(38*(i<11?rnd(.72,.97):rnd(.3,.65))),4,38); });
  for(let k=0;k<gf;k++){ const s=K.pickScorer(ps); s.goals++; if(Math.random()<.72){ const a=K.pickAssist(ps,s); if(a) a.assists++; } }
  const lvl=ps.length?ps.reduce((s,p)=>s+p.ovr,0)/ps.length:65;
  ps.forEach(p=>{ p.rating=r1(clamp(6.25+(p.ovr-lvl)/22+p.goals*.035+p.assists*.025+(rankFactor||0)*.25+rnd(-.25,.25),5.4,8.4)); });
  return ps;
}

const RECS=()=>window.KL_RECORDS||{};
function ageOfPlayer(p,year){ const r=p.id&&RECS()[p.id]; if(r&&r[0]) return year-r[0]; let h=0; const s=String(p.name); for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))%1000; return 19+h%17; }
/* ================= 유소년·대학 시즌 ================= */
const youthLevel=ag=>28+(ag-13)*4.7;
const UNIVS=["연세대학교","고려대학교","한양대학교","성균관대학교","중앙대학교","명지대학교","단국대학교","인천대학교"];
function chooseUniv(S){ S.stage="univ"; S.club={id:"univ",name:pick(UNIVS),short:"대학",lg:"UNIV",code:null}; S.phase="train"; S.offers=[]; addMoment(S,"대학 진학","대학 진학",S.club.name+"에 진학했습니다."); }
function simYouthSeason(S,plan){
  const p=S.p, ag=age(S), R={year:S.year,age:ag,ovr0:p.ovr,club:Object.assign({},S.club),plan:plan||{},youth:true};
  S.plan=plan||{}; S.tables={};
  const lvl=youthLevel(ag)+S.youthTier+(S.stage==="univ"?2:0), injury=rollInjury(S,plan);
  const sr=clamp(startRateAt(p.ovr,lvl,S.trust,p)*(1-injury.frac*.6),0,.97);
  const matches=[]; let W=0,D=0,L=0,gf=0,ga=0; const n=S.stage==="univ"?20:22;
  for(let i=1;i<=n;i++){ const opp=lvl+rnd(-6,6); const [a,b]=playMatch({att:lvl,def:lvl},{att:opp,def:opp}); matches.push({round:i,home:i%2===1,opp:"상대 "+i,f:a,a:b}); gf+=a; ga+=b; if(a>b)W++; else if(a===b)D++; else L++; }
  const my=mySeason(S,matches,sr,lvl,injury,{club:S.club.id}); Object.assign(R,my);
  R.W=W;R.D=D;R.L=L;R.gf=gf;R.ga=ga;R.N=12;R.rank=clamp(Math.round(12-(W+D*.4)/n*11+rnd(-1.5,1.5)),1,12);R.lvl=r1(lvl);R.role=roleLabel(sr);
  R.leagueName=lgLabel(S.club.lg); R.injury=injury.text?injury:null; R.trophies=[]; R.awards=[]; R.table=null;
  if(R.rank<=2 && Math.random()<.5) R.trophies.push(S.stage==="univ"?"대학 리그 우승":"전국 대회 우승");
  if(R.goals>=14 && p.pos!=="GK") R.awards.push(S.stage==="univ"?"대학 득점왕":"유소년 득점왕");
  if(R.rating>=7.4 && R.apps>=12) R.awards.push(S.stage==="univ"?"대학 MVP":"유소년 MVP");
  nationalTeam(S,R); growth(S,R); commitSeason(S,R); S.phase="result"; return R;
}
/* ================= 시즌 진행 ================= */
function simSeason(S,plan){
  const p=S.p, ag=age(S), R={year:S.year,age:ag,ovr0:p.ovr,club:Object.assign({},S.club),plan:plan||{}};
  const lgKey=S.club.lg;
  S.plan=plan||{};
  if(S.stage==="youth"||S.stage==="univ") return simYouthSeason(S,plan);
  /* ---- 군 복무 중이면 시즌을 뛰지 못해요 ---- */
  if(S.military==="serving"){ S.tables={K1:quickTable(S,"K1"),K2:quickTable(S,"K2")}; return finishMilitaryYear(S,R); }
  const foreign=isForeign(lgKey);
  /* ---- 리그 ---- */
  let table, myT, others=[], rankings=[], lvl, gf=0, ga=0, W=0,D=0,L=0, myDef=null;
  const injury=rollInjury(S,plan);
  S.tables={};
  if(!foreign){
    const key=lgKey==="MIL"?"K1":lgKey; // 상무는 K리그1 소속
    const ids=(key==="K1"?S.league.k1:S.league.k2).slice();
    const defs=ids.map(defById).filter(Boolean);
    myDef=defById(S.club.id)||defs[0];
    const st={}; defs.forEach(d=>{ st[d.club]=strengthOf(S,d); });
    lvl=clubLevel(myDef);
    R.role0=roleLabel(startRateAt(p.ovr,lvl,S.trust,p));
    let sr=clamp(startRateAt(p.ovr,lvl,S.trust,p)*(1-injury.frac*.6),.0,.97); if(S.team==="2군") sr=Math.min(sr,.1);
    const imp=myImpact(S,sr,lvl); st[myDef.club]={att:st[myDef.club].att+imp.att,def:st[myDef.club].def+imp.def,lvl:st[myDef.club].lvl};
    const fixtures=schedule(defs.map(d=>d.club),key==="K1"?3:2,key==="K1"?38:36);
    const tab={}; defs.forEach(d=>tab[d.club]={club:d.club,p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0});
    const myMatches=[]; let myRound=0;
    fixtures.forEach(([h,a],idx)=>{ const [gh,ga2]=playMatch(st[h],st[a]); const H=tab[h],A=tab[a];
      H.p++;A.p++;H.gf+=gh;H.ga+=ga2;A.gf+=ga2;A.ga+=gh; if(gh>ga2){H.w++;A.l++;H.pts+=3}else if(gh<ga2){A.w++;H.l++;A.pts+=3}else{H.d++;A.d++;H.pts++;A.pts++}
      if(h===myDef.club||a===myDef.club){ myRound++; myMatches.push({round:myRound,home:h===myDef.club,opp:h===myDef.club?a:h,f:h===myDef.club?gh:ga2,a:h===myDef.club?ga2:gh}); } });
    table=Object.values(tab).sort((x,y)=>y.pts-x.pts||(y.gf-y.ga)-(x.gf-x.ga)||y.gf-x.gf);
    myT=table.find(t=>t.club===myDef.club); R.rank=table.indexOf(myT)+1; R.table=table; R.N=table.length;
    S.tables[key]=table.map(t=>t.club);
    gf=myT.gf; ga=myT.ga; W=myT.w; D=myT.d; L=myT.l;
    /* ---- 내 출전과 기록 ---- */
    const my=mySeason(S,myMatches,sr,lvl,injury,myDef);
    Object.assign(R,my);
    /* ---- 다른 선수들 (득점왕·MVP 경쟁) ---- */
    defs.forEach(d=>{ const t=tab[d.club]; const ranked=table.indexOf(t); const rf=(table.length-ranked)/table.length-.5;
      let goals=t.gf; if(d.club===myDef.club) goals=Math.max(0,t.gf-R.goals);
      const ps=playerSeasonStats(d,goals,t.ga,rf,S.year); if(d.club===myDef.club){ ps.forEach(q=>{ q.mate=true; }); }
      others.push(...ps); });
    R.leagueName=lgLabel(S.club.lg==="MIL"?"K1":S.club.lg);
  } else {
    /* 해외 리그: 순위표를 따로 만들지 않고 구단 수준으로 결과를 뽑아요 */
    const F=FOREIGN.find(f=>f.id===S.club.id)||{lvl:75}; lvl=F.lvl-2; R.role0=roleLabel(startRateAt(p.ovr,lvl,S.trust,p));
    let sr=clamp(startRateAt(p.ovr,lvl,S.trust,p)*(1-injury.frac*.6),0,.97); if(S.team==="2군") sr=Math.min(sr,.1);
    const strength=(F.lvl-70)/3+rnd(-2.2,2.2);                  // 구단 수준이 높을수록 좋은 순위
    const N=20; R.N=N; R.rank=clamp(Math.round(N/2-strength*1.3+rnd(-2,2)),1,N);
    const ptsPer=clamp(1.5+strength*.12+rnd(-.2,.2),.6,2.7); W=Math.round(38*clamp(ptsPer/3+.05,.1,.8)); D=ri(5,10); L=Math.max(0,38-W-D);
    gf=Math.round(38*clamp(1.5+strength*.1,.8,2.8)); ga=Math.round(38*clamp(1.4-strength*.08,.6,2));
    const myMatches=[]; for(let i=1;i<=38;i++){ const gh=K.poisson(clamp(1.5+strength*.1,.6,3)), ga2=K.poisson(clamp(1.3-strength*.07,.4,2.4)); myMatches.push({round:i,home:i%2===1,opp:"상대 "+i,f:gh,a:ga2}); }
    const my=mySeason(S,myMatches,sr,lvl,injury,{club:S.club.id});
    Object.assign(R,my); R.leagueName=lgLabel(S.club.lg); R.table=null;
    R.W=W;R.D=D;R.L=L;
  }
  R.W=W;R.D=D;R.L=L;R.gf=gf;R.ga=ga; R.lvl=r1(lvl); R.injury=injury.text?injury:null;
  ["K1","K2"].forEach(k=>{ if(!S.tables[k]) S.tables[k]=quickTable(S,k); });
  /* ---- 컵·대륙 대회 ---- */
  seasonExtras(S,R,myDef);
  /* ---- 수상 ---- */
  awardsFor(S,R,others);
  /* ---- 국가대표 ---- */
  nationalTeam(S,R);
  /* ---- 성장 ---- */
  growth(S,R);
  /* ---- 기록 반영 ---- */
  commitSeason(S,R);
  S.phase="result";
  return R;
}

function rollInjury(S,plan){
  const base=.22*(plan&&plan.rest?.55:1)*(age(S)>=31?1.25:1);
  if(Math.random()>base) return {frac:0,weeks:0,text:null};
  const x=Math.random(), weeks=x<.6?ri(2,6):x<.9?ri(7,16):ri(17,34);
  const part=pick(["햄스트링","발목","무릎 인대","종아리","허벅지","어깨","갈비뼈","발등"]);
  return {frac:clamp(weeks/42,0,.75),weeks,text:part+" 부상 · "+weeks+"주 결장",severe:weeks>=17};
}

function mySeason(S,matches,sr,lvl,injury,myDef){
  const p=S.p, sub=p.sub, ovr=p.ovr; const myMatches=[]; let apps=0,starts=0,minutes=0,goals=0,assists=0,cs=0,ratingSum=0,mom=0,ratedN=0;
  const form=Math.exp(K.randn()*.26), formA=Math.exp(K.randn()*.2); const out=[]; const miss=new Set(); let injMatches=Math.round(injury.frac*matches.length*1.3);
  const startIdx=ri(0,Math.max(0,matches.length-injMatches-1)); for(let i=startIdx;i<startIdx+injMatches;i++) miss.add(i);
  matches.forEach((m,i)=>{
    const rec={round:m.round,home:m.home,opp:m.opp,f:m.f,a:m.a,res:m.f>m.a?"W":m.f===m.a?"D":"L",min:0,g:0,as:0,rt:null,st:false};
    if(!miss.has(i)){
      const r=Math.random();
      if(r<sr){ rec.st=true; rec.min=clamp(Math.round(rnd(62,90)),45,90); }
      else if(r<sr+(1-sr)*.55 && sr<.9){ rec.min=ri(8,32); }
      if(rec.min>0){
        apps++; if(rec.st) starts++; minutes+=rec.min; const mf=rec.min/90;
        rec.g=binom(m.f,clamp((sg(sub))*form*Math.exp((ovr-lvl)/18)*mf,0,.6));
        rec.as=binom(Math.max(0,m.f-rec.g),clamp((sa(sub))*formA*Math.exp((ovr-lvl)/22)*mf,0,.5));
        goals+=rec.g; assists+=rec.as;
        let rt=6.05+(ovr-lvl)/20*(.5+mf*.5)+(rec.res==="W"?.35:rec.res==="L"?-.3:0)+rec.g*.95+rec.as*.55+rnd(-.5,.5);
        if(p.pos==="GK"||p.pos==="DF"){ if(m.a===0){ rt+=.5; if(p.pos==="GK"&&rec.st) cs++; } else rt-=Math.min(m.a,4)*.12; }
        rec.rt=r1(clamp(rt,3.5,10)); ratingSum+=rec.rt*mf; ratedN+=mf;
        if(rec.rt>=8.3 && rec.st) mom++;
      }
    }
    out.push(rec);
  });
  const rating=ratedN?r1(ratingSum/ratedN):0;
  return {apps,starts,minutes,goals,assists,cs,mom,rating,matches:out,sr:r1(sr),role:roleLabel(sr)};
}

function seasonExtras(S,R,myDef){
  R.trophies=[]; R.extra=[];
  const p=S.p, lgKey=S.club.lg;
  if(!isForeign(lgKey)){
    const key=lgKey==="MIL"?"K1":lgKey;
    /* 리그 우승·승격 */
    if(R.rank===1) R.trophies.push(key==="K1"?"K리그1 우승":"K리그2 우승");
    /* FA컵: 구단 수준과 내 비중으로 */
    const lv=(clubLevel(myDef)-66)/3.5, faRounds=4; let fa=0; for(let i=0;i<faRounds;i++){ if(Math.random()<clamp(.45+lv*.08,.2,.75)) fa++; else break; }
    R.fa=fa; if(fa===faRounds) R.trophies.push("FA컵 우승");
    /* AFC 챔피언스리그 (전 시즌 3위 이내) */
    if(S.acl){ const ok=Math.random()<clamp(.1+lv*.1,.02,.35); R.acl=ok?"우승":pick(["조별리그 탈락","16강","8강","4강"]); if(ok) R.trophies.push("AFC 챔피언스리그 우승"); }
    S.nextAcl=key==="K1"&&R.rank<=3;
  } else {
    const F=FOREIGN.find(f=>f.id===S.club.id)||{lvl:75};
    if(R.rank===1) R.trophies.push(lgLabel(lgKey)+" 우승");
    if(F.lvl>=84 && Math.random()<.1+(F.lvl-84)*.02) R.trophies.push("유럽 대항전 우승");
    S.nextAcl=false;
  }
  /* 컵 대회 출전 보정: 출전 시간이 있으면 몇 경기를 더 뛰어요 */
  const extraApps=Math.round((R.fa||0)*0.9*(R.sr)+(S.acl?4*R.sr:0)); if(extraApps>0){ R.apps+=extraApps; R.starts+=Math.round(extraApps*.7); R.minutes+=extraApps*70;
    const eg=binom(extraApps,clamp((sg(p.sub))*1.1,0,.6)); R.goals+=eg; R.extraGoals=eg; }
}

function awardsFor(S,R,others){
  R.awards=[]; const p=S.p;
  if(!others.length || !R.table) { if(R.rating>=7.6 && R.apps>=20) R.awards.push("팀 올해의 선수"); return; }
  const me={name:p.name,pos:p.pos,g:p.pos,ovr:p.ovr,age:age(S),goals:R.goals-(R.extraGoals||0),assists:R.assists,apps:R.apps,rating:R.rating,me:true,club:S.club.id};
  const pool=others.filter(o=>!o.mate||true).concat([me]); const qual=pool.filter(o=>o.apps>=14);
  const top=(arr,f)=>arr.slice().sort((a,b)=>f(b)-f(a))[0];
  const scorer=top(qual,o=>o.goals*100+o.assists-o.apps*.01), ast=top(qual,o=>o.assists*100+o.goals-o.apps*.01), mvpC=qual.filter(o=>{ const t=R.table.findIndex(x=>x.club===o.club); return t>=0&&t<Math.ceil(R.table.length/2); });
  const mvp=top(mvpC,o=>o.rating+o.goals*.03+o.assists*.02), young=top(qual.filter(o=>o.age<=23),o=>o.rating+o.goals*.03);
  R.board={scorers:qual.slice().sort((a,b)=>b.goals-a.goals||b.assists-a.assists).slice(0,5).map(o=>({name:o.name,club:o.club,v:o.goals,me:!!o.me})),
           assisters:qual.slice().sort((a,b)=>b.assists-a.assists||b.goals-a.goals).slice(0,5).map(o=>({name:o.name,club:o.club,v:o.assists,me:!!o.me})),
           mvp:mvp?mvp.name:null,scorer:scorer?scorer.name:null};
  if(R.apps<14) return;
  /* 동률이면 공동 수상 (패치노트: 완전 동률은 공동 순위·수상) */
  const mg=Math.max(...qual.map(o=>o.goals)), ma=Math.max(...qual.map(o=>o.assists));
  if(me.goals===mg&&mg>0) R.awards.push(qual.filter(o=>o.goals===mg).length>1?"공동 득점왕":"득점왕");
  if(me.assists===ma&&ma>0) R.awards.push(qual.filter(o=>o.assists===ma).length>1?"공동 도움왕":"도움왕");
  if(mvp&&mvp.me) R.awards.push("리그 MVP");
  if(young&&young.me&&age(S)<=23) R.awards.push("영플레이어상");
  /* 베스트 11: 포지션별 평점 상위 */
  const need={GK:1,DF:4,MF:3,FW:3}; const grp=qual.filter(o=>o.g===p.pos).sort((a,b)=>b.rating-a.rating+((b.goals+b.assists)-(a.goals+a.assists))*.03);
  if(grp.slice(0,need[p.pos]).some(o=>o.me)) R.awards.push("베스트 11");
}

/* ================= 국가대표 · 병역 ================= */
const WC=[2026,2030,2034,2038,2042,2046], AC=[2027,2031,2035,2039,2043], AG=[2026,2030,2034,2038,2042];
/* 대회 목록: 선발되면 참가/불참을 고를 수 있어요 */
const TOURN=[
 {id:"wc",name:"FIFA 월드컵",years:[2030,2034,2038,2042,2046,2050,2054],min:20,max:45,thr:0,tier:3,games:[3,7],medal:false},
 {id:"ac",name:"AFC 아시안컵",years:[2027,2031,2035,2039,2043,2047,2051],min:19,max:45,thr:-1,tier:2,games:[3,7],medal:false},
 {id:"oly",name:"올림픽 (U-23)",years:[2028,2032,2036,2040,2044,2048],min:18,max:28,thr:-6,tier:2,games:[3,6],medal:true,exemptMedal:"bronze"},
 {id:"ag",name:"아시안게임 (U-23)",years:[2026,2030,2034,2038,2042,2046],min:18,max:28,thr:-7,tier:1,games:[3,6],medal:true,exemptMedal:"gold"},
 {id:"u20",name:"U-20 월드컵",years:[2027,2029,2031,2033,2035,2037],min:18,max:20,thr:-14,tier:1,games:[3,6],medal:false},
 {id:"u17",name:"U-17 월드컵",years:[2025,2027,2029,2031,2033,2035],min:15,max:17,thr:-26,tier:1,games:[3,6],medal:false},
];
const STAGES=["조별리그 탈락","16강","8강","4강","준우승","우승"];
function nationalTeam(S,R){
  const p=S.p, ag=age(S); R.national=null; R.callups=[]; R.nationalEvents=[];
  const base={FW:76,MF:75,DF:74,GK:73}[p.pos]; const lg=isForeign(S.club.lg)?2:0;
  /* 친선·예선(상시 소집): 일정 수준 이상이어야 불려요 */
  if(!R.youth && ag>=19){
    const chance=logistic((p.ovr+lg-base)/2.4)*clamp((R.apps||0)/22,.2,1);
    if(Math.random()<chance){ const caps=ri(2,6); R.caps=caps; S.career.caps+=caps; const ig=Math.random()<clamp(sg(p.sub)*3.2,0,.6)?ri(1,2):0; S.career.intGoals+=ig; R.intGoals=ig; R.national="친선·예선 "+caps+"경기"+(ig?" · "+ig+"골":""); }
  }
  /* 대회 소집 후보: 연령 조건 + 능력치 */
  TOURN.forEach(t=>{
    if(!t.years.includes(S.year)||ag<t.min||ag>t.max) return;
    if((t.id==="oly"||t.id==="ag")&&(S.military==="exempt"||S.military==="served")&&ag>23) return;
    const wild=(t.id==="oly"||t.id==="ag")&&ag>23;           // 와일드카드: 능력이 확실히 높아야 해요
    const thr=base+t.thr+(wild?4:0)-(R.youth?0:0);
    const sel=logistic((p.ovr+lg-thr)/2.4)*clamp((R.apps||12)/20,.35,1);
    if(Math.random()<sel) R.callups.push({id:t.id,name:t.name,tier:t.tier,medal:t.medal,exemptMedal:t.exemptMedal||null,games:t.games,wild});
  });
}
/* 대회 참가: 결과를 정하고 기록에 반영해요 (UI 가 참가를 고르면 호출) */
function joinTournament(S,R,c,join){
  const rec=S.history[S.history.length-1]; const p=S.p;
  if(!join){ R.nationalEvents.push({t:c.name,res:"불참"}); S.rep=clamp(S.rep-1,0,100); return {text:c.name+"에는 참가하지 않았습니다.",stage:null}; }
  const lv=clamp((p.ovr-(75-c.tier*5))/18,-1,1.2);                     // 한국 전력 보정
  let x=Math.random()+lv*.18-(c.tier>=3?.04:0); const idx=x<.28?0:x<.58?1:x<.78?2:x<.9?3:x<.97?4:5;
  const stage=STAGES[idx]; const games=clamp(ri(c.games[0],c.games[1])-(idx===0?3:0)+(idx>=4?1:0),2,8);
  const eg=binom(games,clamp(sg(p.sub)*2.2,0,.5)), ea=binom(games,clamp(sa(p.sub)*1.6,0,.4));
  S.career.caps+=games; S.career.intGoals+=eg; if(rec){ rec.caps=(rec.caps||0)+games; }
  let res=stage, medal=null;
  if(c.medal){ medal=idx>=5?"금메달":idx===4?"은메달":idx===3?(Math.random()<.5?"동메달":"4위"):null; res=medal||stage; }
  R.nationalEvents.push({t:c.name,res:res+" · "+games+"경기"+(eg?" "+eg+"골":"")});
  if(idx>=5&&!c.medal){ S.trophies.push({year:S.year,name:c.name+" 우승",club:"대표팀"}); R.trophies.push(c.name+" 우승"); if(rec) rec.trophies.push(c.name+" 우승"); }
  if(medal){ S.trophies.push({year:S.year,name:c.name+" "+medal,club:"대표팀"}); R.trophies.push(c.name+" "+medal); if(rec) rec.trophies.push(c.name+" "+medal); }
  let exempt=false;
  if(c.exemptMedal && S.military!=="exempt" && S.military!=="served"){ if((c.exemptMedal==="gold"&&medal==="금메달")||(c.exemptMedal==="bronze"&&(medal==="금메달"||medal==="은메달"||medal==="동메달"))){ S.military="exempt"; exempt=true; S.trophies.push({year:S.year,name:"병역 특례",club:"대표팀"}); } }
  addMoment(S,c.name,c.name,c.name+" "+res+(exempt?" — 병역 특례를 받았습니다.":""));
  S.rep=clamp(S.rep+(idx>=3?6:idx>=1?3:1),0,100);
  return {text:c.name+" "+res+" · "+games+"경기"+(eg?" "+eg+"골":"")+(ea?" "+ea+"도움":"")+(exempt?" · 병역 특례!":""),stage:res,exempt};
}
function finishMilitaryYear(S,R){
  S.mildone++; R.military=true; R.apps=0;R.starts=0;R.minutes=0;R.goals=0;R.assists=0;R.cs=0;R.rating=0;R.rank=0;R.W=0;R.D=0;R.L=0;R.gf=0;R.ga=0;R.trophies=[];R.awards=[];R.matches=[];R.leagueName="군 복무";R.role="복무";R.sr=0;R.N=0;R.table=null;
  /* 복무 중 능력치는 조금 줄어요 */
  const p=S.p; const d=ri(0,2); Object.keys(p.stats).forEach(k=>{ p.stats[k]=clamp(p.stats[k]-(PHYS.has(k)?d:Math.floor(d/2)),25,99); }); p.ovr=ovrOf(p); R.ovr1=p.ovr;
  if(S.mildone>=2){ S.military="served"; addMoment(S,"전역","군복무",S.year+"년 전역하고 원소속팀으로 복귀합니다."); }
  S.history.push(slimRecord(R,S)); S.phase="result"; return R;
}

/* ================= 성장 ================= */
function growth(S,R){
  const p=S.p, ag=age(S), plan=S.plan||{}; const before=p.ovr; const d=POSDEF[p.pos];
  const rate=ageRate(ag,p.pos);
  const gap=clamp((p.pot-p.ovr)/10,.04,ag<18?1.0:1.7);   // 잠재력에 가까워질수록 성장이 둔해져요
  const srG=S.team==="2군"?Math.max(R.sr,.5):R.sr, ptBonus=(srG-.4)*1.0*(ag<26?1:.3);                            // 많이 뛸수록 어린 선수는 빨리 자라요
  const ty=TYPES[p.pos].find(x=>x[0]===p.type);
  d.stats.forEach(([k],i)=>{
    let dv=rate>0 ? rate*gap+ptBonus : rate;
    if(PHYS.has(k) && ag>=28) dv-=.5+ (ag-28)*.18;
    dv+=(ty?ty[2][i]:0)*.03;                                            // 유형 방향으로 조금 더 자라요
    if(plan.focus===k) dv+=1.6;
    if(plan.rest) dv-=.15;
    dv+=rnd(-1.3,1.3);
    if(R.injury&&R.injury.severe&&PHYS.has(k)) dv-=1.2;
    p.stats[k]=clamp(Math.round(p.stats[k]+dv),25,99);
  });
  p.ovr=ovrOf(p); p.peak=Math.max(p.peak,p.ovr); R.ovr1=p.ovr; R.dOvr=p.ovr-before;
  /* 잠재력은 시즌 활약에 따라 조금 달라져요 */
  if(R.rating>=7.3) p.pot=Math.min(99,p.pot+ (Math.random()<.5?1:0)); else if(R.rating>0&&R.rating<6.1&&ag<24) p.pot=Math.max(p.ovr,p.pot-(Math.random()<.4?1:0));
  /* 감독 신뢰 */
  S.trust=clamp(S.trust+(R.sr-.5)*.25+(R.rating>7?.05:0),.05,.95);
  /* 평판(이적 시장에서의 가치) */
  S.rep=clamp(S.rep+(R.rating-6.4)*4+(R.awards.length*6)+(R.trophies.length*3),0,100);
}

function commitSeason(S,R){
  const c=S.career, p=S.p;
  if(R.youth){ R.awards.forEach(a=>S.awards.push({year:S.year,name:a,youth:true})); R.trophies.forEach(t=>S.trophies.push({year:S.year,name:t,club:S.club.name,youth:true})); R.awards.concat(R.trophies).forEach(t=>addMoment(S,t,t,S.year+"년 "+t+" 달성")); S.history.push(slimRecord(R,S)); return; }
  c.apps+=R.apps; c.starts+=R.starts; c.minutes+=R.minutes; c.goals+=R.goals; c.assists+=R.assists; c.cs+=R.cs||0; c.mom+=R.mom||0;
  if(R.rating>0){ c.ratingSum+=R.rating*R.apps; c.ratingN+=R.apps; }
  R.awards.forEach(a=>S.awards.push({year:S.year,name:a}));
  R.trophies.forEach(t=>S.trophies.push({year:S.year,name:t,club:S.club.name}));
  moments(S,R);
  S.history.push(slimRecord(R,S));
  if(S.acl) S.acl=false; if(S.nextAcl) S.acl=true;
}
function slimRecord(R,S){
  return {year:R.year,age:R.age,club:R.club.name,clubId:R.club.id,lg:R.club.lg,leagueName:R.leagueName,rank:R.rank,N:R.N,W:R.W,D:R.D,L:R.L,apps:R.apps,starts:R.starts,minutes:R.minutes,goals:R.goals,assists:R.assists,cs:R.cs||0,rating:R.rating,mom:R.mom||0,
    ovr0:R.ovr0,ovr1:R.ovr1,awards:R.awards.slice(),trophies:R.trophies.slice(),role:R.role,salary:S.salary,caps:R.caps||0,military:!!R.military,injury:R.injury?R.injury.text:null,fa:R.fa,acl:R.acl||null,youth:!!R.youth,team:S.team};
}
function addMoment(S,text,badge,detail){ S.moments.push({year:S.year,age:age(S),club:S.club?S.club.name:"",badge,text:detail||text}); }
function moments(S,R){
  const c=S.career, h=S.history;
  if(h.length===0 && R.apps>0) addMoment(S,"1군 데뷔","1군 데뷔","처음 받은 1군 무대에서 "+R.apps+"경기에 출전하며 프로 커리어를 시작했습니다.");
  if(R.goals>0 && c.goals-R.goals===0) addMoment(S,"첫 골","프로 첫 골","프로 무대에서 첫 골을 터뜨렸습니다.");
  R.awards.forEach(a=>addMoment(S,a,a,(R.year)+"시즌 "+a+"을 수상했습니다."));
  R.trophies.forEach(t=>addMoment(S,t,t,t+"의 주인공이 되었습니다."));
  [[100,"apps","100경기 출전"],[200,"apps","200경기 출전"],[300,"apps","300경기 출전"],[50,"goals","50골"],[100,"goals","100골"],[200,"goals","200골"],[50,"assists","50도움"],[100,"assists","100도움"]].forEach(([n,k,t])=>{ if(c[k]>=n && c[k]-R[k]<n) addMoment(S,t,t,"통산 "+t+"을 달성했습니다."); });
  if(R.injury&&R.injury.severe) addMoment(S,"큰 부상","큰 부상",R.injury.text+" — 긴 재활 끝에 복귀를 준비합니다.");
  R.nationalEvents.forEach(e=>addMoment(S,e.t,e.t,e.t+" "+e.res));
  if(R.dOvr>=4) addMoment(S,"급성장","급성장","한 시즌 만에 능력치가 "+R.dOvr+" 올랐습니다.");
  if(!h.length||R.club.id!==(h[h.length-1]||{}).clubId) if(h.length) addMoment(S,"이적","이적",R.club.name+" 유니폼을 입었습니다.");
}

/* ================= 시즌 후: 계약·이적·병역·은퇴 ================= */
function contractOffer(S){
  const last=S.history[S.history.length-1]||{}; const ag=age(S)+1;
  const lvl=S.club.lg&&!isForeign(S.club.lg)?clubLevel(defById(S.club.id)||{players:[]}):75;
  const perf=clamp((last.rating||6.2)-6.3,-1,2)*.08, trustF=clamp(S.trust-.4,-.3,.4)*.3;
  const market=salaryOf(S.p.ovr,ag,S.club.lg==="MIL"?"K1":S.club.lg);
  const offer=r1(Math.max(.3,market*(1+perf+trustF)*(S.rep>70?1.08:1)));
  return {last:S.salary,offer,rate:Math.round((offer/Math.max(.1,S.salary)-1)*100),years:ag<=23?3:ag<=30?2:1};
}
function negotiate(S,offer){
  const x=Math.random(); const mult=x<.45?1.15:x<.8?1.0:.92; return {offer:r1(offer.offer*mult),mult,rate:Math.round((offer.offer*mult/Math.max(.1,S.salary)-1)*100),years:offer.years};
}
function acceptContract(S,offer){ S.salary=offer.offer; S.contractYears=offer.years; }
function transferOffers(S){
  const p=S.p, ag=age(S)+1, out=[];
  const score=p.ovr+S.rep*.04;
  /* 국내 이적 */
  const k1=listClubs(S,"K1").filter(d=>d.club!==S.club.id), k2=listClubs(S,"K2").filter(d=>d.club!==S.club.id);
  const cands=k1.concat(k2).map(d=>({d,l:clubLevel(d),lg:S.league.k1.includes(d.club)?"K1":"K2"}));
  const want=cands.filter(c=>{ const sr=startRateAt(p.ovr,c.l,S.trust,p); return sr>.35 && c.l<score+6 && c.l>score-14; }).sort(()=>Math.random()-.5).slice(0,3);
  want.forEach(c=>out.push({club:clubRefFromDef(S,c.d,c.lg),lvl:r1(c.l),salary:salaryOf(p.ovr+1,ag,c.lg),years:3,tag:lgLabel(c.lg)}));
  /* 해외 진출: 능력이 어느 정도 이상일 때 */
  if(p.ovr>=72 && ag<=32 && !isForeign(S.club.lg) && S.military!=="serving"){
    const eligible=FOREIGN.filter(f=>f.lvl<=p.ovr+6 && f.lvl>=p.ovr-10).sort(()=>Math.random()-.5).slice(0,3);
    eligible.forEach(f=>{ const sr=startRateAt(p.ovr,f.lvl-2,S.trust,p); out.push({club:{id:f.id,name:f.name,short:f.short,lg:f.lg,code:null},lvl:f.lvl,salary:salaryOf(p.ovr,ag,f.lg),years:3,tag:LG_LABEL[f.lg],foreign:true,role:roleLabel(sr)}); });
  }
  return out;
}
function doTransfer(S,offer){
  S.club=offer.club; S.salary=offer.salary; S.contractYears=offer.years; S.trust=.35;
  if(isForeign(offer.club.lg)) addMoment(S,"해외 진출","해외 진출",offer.club.name+"(으)로 이적해 새로운 도전을 시작합니다.");
}
/* 병역: 만 26세 이상 이 되면 입대 선택 / 28세에는 의무 */
function militaryPrompt(S){
  const ag=age(S)+1;
  if(S.military!=="none") return null;
  if(ag<26) return null;
  return {must:ag>=29,canMil:S.p.ovr>=66};
}
function enlist(S,kind){
  S.military="serving"; S.mildone=0;
  if(kind==="sangmu"){ S.milKind="sangmu"; S.club={id:K.GIMCHEON.club,name:"김천 상무",short:"김천",lg:"MIL",code:(window.KL_CLUB_CODE||{})["김천 상무"]||null,origin:S.club}; S.military="sangmu"; S.mildone=0; addMoment(S,"입대","군복무","김천 상무에 입대했습니다. 2년 동안 선수 생활과 복무를 병행합니다."); }
  else { S.milKind="army"; S.origin=S.club; addMoment(S,"입대","군복무","현역으로 입대했습니다. 2년 동안 그라운드를 떠납니다."); }
}
/* 상무 복무는 선수 생활을 계속하므로 simSeason 이 그대로 진행돼요. 2시즌 뒤 전역 */
function afterSeasonMilitary(S){
  if(S.military==="sangmu"){ S.mildone++; if(S.mildone>=2){ S.military="served"; const o=S.club.origin; S.club=o||S.club; if(o) S.club=Object.assign({},o); addMoment(S,"전역","군복무","전역하고 "+S.club.name+"으로 복귀합니다."); S.contractYears=2; } }
}
/* 은퇴: 자발적(30세 이상) 또는 강제 */
function mustRetire(S){ const ag=age(S)+1; return ag>=41 || (ag>=34 && S.p.ovr<56) || (ag>=37 && S.p.ovr<64); }
function canRetire(S){ return age(S)+1>=30; }

/* 포지션 변경 제안: 같은 계열의 다른 세부 포지션이거나(70%) 계열이 바뀌어요(30%) */
const CHANGE_GROUP={FW:["MF"],MF:["DF","FW"],DF:["MF"],GK:[]};
function positionChangeOffer(S){
  const p=S.p, ag=age(S); if(ag<14||ag>28||S.stage==="univ"&&false) return null;
  if(Math.random()>(S.stage==="pro"?.07:.12)) return null;
  const same=POSDEF[p.pos].subs.filter(x=>x[0]!==p.sub);
  if(same.length&&(Math.random()<.7||!CHANGE_GROUP[p.pos].length)){ const t=pick(same); return {pos:p.pos,sub:t[0],name:t[1],group:false}; }
  const g=CHANGE_GROUP[p.pos]; if(!g.length) return null; const np=pick(g); const t=POSDEF[np].subs[0]; return {pos:np,sub:t[0],name:t[1],group:true,posName:POSDEF[np].name};
}
function changePosition(S,o){
  const p=S.p, ovr=p.ovr; const nd=POSDEF[o.pos];
  if(o.pos!==p.pos){ const ns={}; nd.stats.forEach(([k],i)=>{ ns[k]=clamp(Math.round((p.stats[k]!=null?p.stats[k]:ovr-4)+rnd(-3,3)-(p.stats[k]!=null?0:0)),12,95); });
    const adj=ovr-(ovrOfStats(nd,ns)); nd.stats.forEach(([k])=>{ if(p.stats[k]==null) ns[k]=clamp(ns[k]+adj-3,12,95); });
    p.stats=ns; p.pos=o.pos; p.type=TYPES[o.pos][0][0]; p.typeName=TYPES[o.pos][0][1]; }
  p.sub=o.sub; p.ovr=ovrOf(p); addMoment(S,"포지션 변경","포지션 변경",o.name+"(으)로 포지션을 바꿨습니다.");
}
const ovrOfStats=(d,st)=>Math.round(d.stats.reduce((s,[k],i)=>s+st[k]*d.w[i],0));
/* 스토브리그 이벤트 큐 (화면이 하나씩 보여줘요) */
function offseasonEvents(S){
  const ev=[], last=S.history[S.history.length-1]||{};
  if(mustRetire(S)) ev.push({t:"forceRetire"});
  const mp=militaryPrompt(S); if(mp&&S.military==="none"&&S.stage==="pro") ev.push({t:"mil",must:mp.must,canMil:mp.canMil,age:age(S)+1});
  const pc=S.stage!=="univ"?positionChangeOffer(S):null; if(pc) ev.push({t:"poschange",offer:pc});
  if(S.stage==="pro"&&S.team==="2군"&&S.phase!=="draft"){ const lvl=S.club.lg&&!isForeign(S.club.lg)?clubLevel(defById(S.club.id)||{players:[]}):75;
    if(startRateAt(S.p.ovr+2,lvl,S.trust,S.p)>=.26 || (last.rating>=7.0&&Math.random()<.5)) ev.push({t:"callup"}); }
  else if(S.stage==="pro"&&S.team==="1군"&&age(S)<=22&&last.apps<=4&&Math.random()<.25) ev.push({t:"demote"});
  return ev;
}
function nextYear(S){
  if(S.stage==="youth"||S.stage==="univ"){ S.year++; S.drift={}; if((S.stage==="youth"&&age(S)>=18)||(S.stage==="univ"&&age(S)>=22)){ S.stage="pro"; S.phase="draft"; S.offers=draftOffers(S); } else { S.phase="train"; S.plan=null; } return; }
  /* 승강: K리그1 하위 2팀과 K리그2 상위 2팀이 자리를 바꿔요 (내 시즌 표 기준) */
  const last=S.history[S.history.length-1];
  applyPromotion(S);
  /* 구단 전력 변화 */
  allDefs().forEach(d=>{ S.drift[d.club]=clamp((S.drift[d.club]||0)*.7+rnd(-1.2,1.2),-5,5); });
  afterSeasonMilitary(S);
  S.year++; S.contractYears=Math.max(0,S.contractYears-1);
  if(S.military==="serving" && S.milKind==="army"){ S.phase="train"; S.plan=null; return; }
  S.phase="train"; S.plan=null;
  if((S.stage==="youth"&&age(S)>=18)||(S.stage==="univ"&&age(S)>=22)){ S.stage="pro"; S.phase="draft"; S.offers=draftOffers(S); }
}
/* K리그1 하위 2팀(김천 상무는 제외)과 K리그2 상위 2팀이 자리를 바꿔요. 내 구단이 바뀌면 소속 리그도 바뀌어요 */
function applyPromotion(S){
  const t=S.tables; S.promoNote=null; if(!t||!t.K1||!t.K2) return;
  const mil=K.GIMCHEON.club;
  const down=t.K1.filter(c=>c!==mil).slice(-2), up=t.K2.slice(0,2);
  S.league.k1=S.league.k1.filter(c=>!down.includes(c)).concat(up);
  S.league.k2=S.league.k2.filter(c=>!up.includes(c)).concat(down);
  if(S.club.lg==="K1"&&down.includes(S.club.id)){ S.club.lg="K2"; S.promoNote="강등: "+S.club.name+"이(가) K리그2로 내려갑니다."; addMoment(S,"강등","강등",S.club.name+"이(가) K리그2로 강등되었습니다."); }
  if(S.club.lg==="K2"&&up.includes(S.club.id)){ S.club.lg="K1"; S.promoNote="승격: "+S.club.name+"이(가) K리그1으로 올라갑니다."; addMoment(S,"승격","승격",S.club.name+"이(가) K리그1으로 승격했습니다."); }
}

/* ================= 레거시 ================= */
function legacy(S){
  const c=S.career; const a=S.awards, t=S.trophies;
  const value=Math.round(S.p.peak*8);
  const rec=Math.round(c.goals*3+c.assists*2+c.apps*.5+c.cs*1.5);
  const aw=a.reduce((s,x)=>s+({"리그 MVP":60,"득점왕":45,"공동 득점왕":35,"도움왕":35,"공동 도움왕":25,"베스트 11":22,"영플레이어상":18,"팀 올해의 선수":10}[x.name]||8),0);
  const tr=t.reduce((s,x)=>s+(/AFC 챔피언스리그|유럽/.test(x.name)?90:/아시안게임/.test(x.name)?50:/아시안컵/.test(x.name)?70:/우승/.test(x.name)?45:20),0);
  const nat=c.caps*3+c.intGoals*10;
  return {total:value+rec+aw+tr+nat,value,rec,aw,tr,nat};
}
function grade(v){ return v>=88?"S":v>=80?"A":v>=70?"B":v>=60?"C":"D"; }

window.LIFE={chooseUniv,joinTournament,TOURN,positionChangeOffer,changePosition,offseasonEvents,POSDEF,TYPES,rollTalent,create,ovrOf,age,draftOffers,signWith,applyPromotion,simSeason,contractOffer,negotiate,acceptContract,transferOffers,doTransfer,militaryPrompt,enlist,mustRetire,canRetire,nextYear,legacy,grade,lgLabel,isForeign,clubLevel,defById,roleLabel,salaryOf,listClubs,startRateAt,FOREIGN,LG_LABEL,STATE_VER,
  };
})();

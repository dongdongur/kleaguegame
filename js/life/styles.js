/*
 * K-라이프 세부 포지션 · 역할 · 주발 (js/life/styles.js)
 * - 세부 포지션: 같은 포지션 안에서의 자리(예: 공격수 → 스트라이커/윙어). 골·도움이 나오는 비율과 어울리는 능력치가 달라져요.
 * - 역할: 그 자리에서 맡는 임무(포처, 가짜 9번, 라움도이터 …). 시작 능력치를 조금 옮기고, 골/도움이 나오는 비율을 바꿔요.
 * - 주발: 윙어·풀백은 '정발'이면 크로스·돌파로 도움 ▲, '역발'이면 안으로 파고들어 득점 ▲. 양발은 약점이 없는 대신 효과가 작아요.
 * 은사 이벤트로 세부 포지션이 바뀌거나 역할 변경 제안을 받을 수 있어요.
 */
(function(){
"use strict";
const L=window.LIFE; if(!L) return;

/* 포지션별로 어떤 능력치가 왜 중요한지 */
L.POSINFO={
 FW:"골문 앞에서 득점을 만드는 자리예요. 골 결정력(30%)·드리블(20%)·스피드(20%)가 OVR에 크게 반영돼요.",
 MF:"공수의 연결고리예요. 패스(25%)·시야(20%)·드리블(20%)·활동량(20%)이 OVR에 크게 반영돼요.",
 DF:"실점을 막는 자리예요. 수비(30%)·대인 수비(25%)·피지컬(20%)이 OVR에 크게 반영돼요.",
 GK:"마지막 방어선이에요. 선방(30%)·반응속도(25%)·핸들링(20%)이 OVR에 크게 반영돼요."
};
L.SUBINFO={
 ST:"최전방 공격수. 득점이 가장 많이 나오는 자리예요. 골 결정력·침착함·피지컬이 중요해요.",
 LW:"왼쪽 측면 공격수. 돌파와 크로스, 안으로 파고드는 슈팅이 무기예요. 스피드·드리블이 중요해요.",
 RW:"오른쪽 측면 공격수. 돌파와 크로스, 안으로 파고드는 슈팅이 무기예요. 스피드·드리블이 중요해요.",
 CM:"중원의 중심. 패스와 활동량으로 공수를 오가요. 도움과 골이 고르게 나와요.",
 AM:"공격형 미드필더. 최전방 바로 뒤에서 기회를 만들어요. 도움이 많고 골도 가끔 나와요. 패스·시야가 중요해요.",
 DM:"수비형 미드필더. 수비 앞에서 공을 따내고 연결해요. 골·도움은 적지만 팀 안정감을 줘요. 수비·활동량이 중요해요.",
 CB:"중앙 수비수. 몸으로 막고 제공권을 책임져요. 무실점 기록이 중요하고 수비·대인 수비·피지컬이 핵심이에요.",
 LB:"왼쪽 풀백. 측면 수비와 오버래핑을 오가요. 도움이 가끔 나오고 스피드가 중요해요.",
 RB:"오른쪽 풀백. 측면 수비와 오버래핑을 오가요. 도움이 가끔 나오고 스피드가 중요해요.",
 GK:"골키퍼. 실점을 막는 게 전부예요. 선방·반응속도가 중요해요."
};
/* [id, 이름, 설명, {g:골배수, a:도움배수, st:{능력치:증감}}] */
const WING=[
 ["inside","인사이드 포워드","안쪽으로 파고들어 직접 슛을 노려요. 골 ▲ 도움 ▼ · 드리블·결정력 ▲ 피지컬 ▼",{g:1.25,a:.85,st:{dribble:2,finishing:1,physical:-1}}],
 ["classic","전통 윙어","라인을 타고 올라가 크로스를 올려요. 도움 ▲ 골 ▼ · 스피드·드리블 ▲ 결정력 ▼",{g:.8,a:1.35,st:{pace:2,dribble:1,finishing:-1}}],
 ["raum","라움도이터","공간을 찾아 비어 있는 곳에 나타나요. 골 ▲ · 침착함 ▲ 피지컬 ▼",{g:1.2,a:.9,st:{composure:2,physical:-1}}],
 ["insidewinger","인사이드 윙어","하프스페이스로 들어와 연계와 슛을 함께 해요. 골·도움 ▲ · 드리블·침착함 ▲ 피지컬 ▼",{g:1.1,a:1.15,st:{dribble:1,composure:1,pace:1,physical:-1}}],
 ["widepm","와이드 플레이메이커","측면에 서서 패스로 기회를 만들어요. 도움 ▲▲ 골 ▼ · 드리블·침착함 ▲ 결정력 ▼",{g:.8,a:1.5,st:{dribble:2,composure:1,finishing:-2}}],
 ["presswing","프레싱 윙어","공을 잃으면 가장 먼저 압박해요. 수비 가담 ▲ · 피지컬·스피드 ▲ 결정력·드리블 ▼",{g:.9,a:.95,st:{physical:2,pace:1,finishing:-1,dribble:-1}}],
 ["wingst","윙 스트라이커","측면에서 박스 안으로 달려 들어가요. 골 ▲▲ 도움 ▼ · 결정력·스피드 ▲ 드리블 ▼",{g:1.35,a:.7,st:{finishing:2,pace:1,dribble:-1}}]
];
const FB=[
 ["overlap","공격형 풀백","측면을 끝까지 오르내려요. 도움 ▲ 골 ▲ · 스피드·빌드업 ▲ 수비 ▼",{g:1.4,a:1.5,st:{pace:2,building:1,defending:-2}}],
 ["invert","인버티드 풀백","안쪽으로 들어와 패스를 풀어줘요. 빌드업 ▲ 대인 수비 ▼",{g:1,a:1.1,st:{building:3,tackle:-1}}],
 ["defend","수비형 풀백","수비에 집중해요. 수비·대인 수비 ▲ 스피드 ▼ · 도움 ▼",{g:.6,a:.6,st:{defending:2,tackle:2,pace:-1}}],
 ["wingback","윙백","수비와 공격을 가리지 않고 측면 전체를 책임져요. 도움·골 ▲ · 스피드 ▲ 수비 ▼",{g:1.2,a:1.4,st:{pace:2,defending:-1,building:1}}],
 ["pmfb","플레이메이킹 풀백","풀백이지만 패스로 공격을 설계해요. 도움 ▲ · 빌드업 ▲▲ 스피드 ▼",{g:.8,a:1.4,st:{building:3,pace:-1}}],
 ["balfb","밸런스형 풀백","공수 균형이 좋아요. 약점이 적고 안정적이에요",{g:.9,a:.95,st:{defending:1,building:1}}]
];
L.ROLES={
 ST:[["poacher","포처","박스 안에서 기회를 기다렸다 마무리해요. 골 ▲ 도움 ▼ · 결정력·침착함 ▲ 드리블 ▼",{g:1.15,a:.75,st:{finishing:2,composure:1,dribble:-1}}],
     ["target","타깃맨","높은 공과 몸싸움으로 버텨요. 피지컬 ▲ 스피드 ▼ · 헤딩 골이 많아요",{g:1.05,a:.9,st:{physical:3,pace:-2}}],
     ["false9","가짜 9번","내려와 연결하고 동료의 골을 도와요. 도움 ▲ 골 ▼ · 드리블 ▲ 결정력 ▼",{g:.85,a:1.5,st:{dribble:2,finishing:-1}}],
     ["complete","올라운드 공격수","약점 없이 고루 해요. 효과는 작지만 안정적이에요",{g:1,a:1.05,st:{}}],
     ["advfw","어드밴스드 포워드","수비 라인 뒷공간으로 계속 침투해요. 골 ▲ · 스피드·결정력 ▲ 침착함·피지컬 ▼",{g:1.2,a:.8,st:{pace:2,finishing:1,composure:-1,physical:-1}}],
     ["deepfw","딥라잉 포워드","한 칸 내려와 동료와 연계해요. 도움 ▲ · 드리블·침착함 ▲ 스피드 ▼",{g:.95,a:1.25,st:{dribble:1,composure:1,pace:-1}}],
     ["pressfw","프레싱 포워드","최전방에서 가장 먼저 압박해요. 수비 가담 ▲ · 피지컬·스피드 ▲ 침착함 ▼",{g:1,a:1,st:{physical:2,pace:1,composure:-1}}]],
 LW:WING, RW:WING,
 AM:[["maker","플레이메이커 (10번)","경기를 조율하고 결정적인 패스를 줘요. 도움 ▲ · 패스·시야 ▲ 수비 ▼",{g:.9,a:1.3,st:{passing:2,vision:2,defending:-2}}],
     ["shadow","섀도 스트라이커","스트라이커 뒤에서 침투해 골을 노려요. 골 ▲ · 드리블 ▲ 수비·패스 ▼",{g:1.4,a:.8,st:{dribble:2,defending:-2,passing:-1}}],
     ["raum2","라움도이터","빈 공간을 찾아 들어가요. 골 ▲ · 시야 ▲ 활동량 ▼",{g:1.2,a:.95,st:{vision:2,stamina:-1}}],
     ["trequarti","트레콰르티스타","자유롭게 움직이며 상상 밖의 플레이를 해요. 도움·골 ▲ · 드리블 ▲▲ 수비·활동량 ▼▼",{g:1.1,a:1.25,st:{dribble:3,vision:1,defending:-3,stamina:-2}}],
     ["advpm","어드밴스드 플레이메이커","높은 위치에서 득점 기회를 만들어요. 도움 ▲▲ · 패스·시야 ▲ 활동량 ▼",{g:1,a:1.35,st:{passing:2,vision:2,stamina:-1}}],
     ["secondst","세컨드 스트라이커","최전방 파트너로 골과 연결을 겸해요. 골 ▲ · 드리블·활동량 ▲ 패스 ▼",{g:1.3,a:.9,st:{dribble:1,stamina:1,passing:-1}}]],
 CM:[["b2b","박스 투 박스","전 구역을 뛰어다녀요. 활동량·수비 ▲ 시야 ▼ · 골·도움 모두 가끔 나와요",{g:1.05,a:1,st:{stamina:3,defending:1,vision:-1}}],
     ["regista","딥라잉 플레이메이커","뒤에서 길게 공을 뿌려요. 도움 ▲ · 패스 ▲ 활동량 ▼",{g:.7,a:1.25,st:{passing:3,vision:1,stamina:-2}}],
     ["mezz","메짤라","측면으로 벌려 공격에 가담해요. 골 ▲ · 드리블 ▲ 수비 ▼",{g:1.3,a:1,st:{dribble:2,defending:-1}}],
     ["carrilero","카레일로","측면 공간을 커버하며 팀의 균형을 잡아요. 활동량·수비 ▲ 드리블 ▼",{g:.7,a:1,st:{stamina:3,defending:1,dribble:-1}}],
     ["cmwinner","볼 위닝 미드필더","공을 따내는 데 특화돼 있어요. 수비·활동량 ▲ 패스·시야 ▼",{g:.6,a:.8,st:{defending:2,stamina:2,passing:-2,vision:-1}}],
     ["advpm2","어드밴스드 플레이메이커","중원에서 기회를 만드는 창조자예요. 도움 ▲ · 시야 ▲▲ 수비 ▼",{g:1,a:1.3,st:{vision:2,passing:1,defending:-2}}]],
 DM:[["anchor","앵커맨","수비 앞을 지켜 줘요. 수비 ▲ · 골·도움 ▼",{g:.5,a:.7,st:{defending:3,dribble:-1}}],
     ["winner","볼 위너","공을 가로채는 데 특화돼 있어요. 수비·활동량 ▲ 패스 ▼",{g:.6,a:.6,st:{defending:2,stamina:2,passing:-2}}],
     ["regista2","레지스타","수비형이지만 패스로 공격을 열어요. 패스 ▲ 도움 ▲ 활동량 ▼",{g:.7,a:1.4,st:{passing:3,vision:1,stamina:-2}}],
     ["halfback","하프백","수비 라인 사이로 내려가 3백을 만들어요. 수비·패스 ▲ 활동량 ▼",{g:.5,a:.8,st:{defending:2,passing:1,stamina:-1}}],
     ["dmpm","디펜시브 플레이메이커","수비 위치에서 공격을 설계해요. 도움 ▲ · 패스·시야 ▲ 수비 ▼",{g:.7,a:1.2,st:{passing:2,vision:1,defending:-1}}]],
 CB:[["stopper","스토퍼","강하게 부딪혀 상대를 막아요. 수비·대인 수비 ▲ 빌드업 ▼",{g:.9,a:.8,st:{defending:2,tackle:2,building:-3}}],
     ["ballplay","볼 플레잉 센터백","후방에서 패스로 공격을 만들어요. 빌드업 ▲ 대인 수비·피지컬 ▼",{g:.8,a:1.5,st:{building:4,tackle:-1,physical:-1}}],
     ["libero","리베로","커버와 전진 수비를 겸해요. 스피드·빌드업 ▲ 피지컬 ▼",{g:1,a:1.2,st:{pace:2,building:2,physical:-2}}],
     ["nononsense","노 논센스 센터백","단순하고 확실하게 걷어내요. 수비·대인 수비 ▲ 빌드업 ▼▼",{g:.9,a:.6,st:{defending:2,tackle:2,physical:1,building:-4}}],
     ["widecb","와이드 센터백","3백의 바깥쪽에서 넓게 커버하고 올라가요. 스피드 ▲ · 도움 ▲ 피지컬 ▼",{g:1,a:1.1,st:{pace:2,tackle:1,physical:-1}}],
     ["covercb","커버 센터백","동료 뒤를 지켜 주는 해결사예요. 수비 ▲▲ 스피드 ▲ 피지컬 ▼",{g:.8,a:.9,st:{defending:3,pace:1,physical:-2}}]],
 LB:FB, RB:FB,
 GK:[["sweeper","스위퍼 키퍼","골문 밖까지 나와 발로 풀어줘요. 킥·지휘 ▲ 반응속도 ▼",{g:1,a:1,st:{kicking:3,command:1,reflex:-1}}],
     ["line","골라인 키퍼","선방에 집중해요. 선방·반응속도 ▲ 킥 ▼",{g:1,a:1,st:{saving:2,reflex:2,kicking:-3}}],
     ["ballkeeper","볼 플레잉 키퍼","정확한 킥과 패스로 빌드업을 시작해요. 킥 ▲▲ 지휘 ▲ 반응속도 ▼",{g:1,a:1.1,st:{kicking:3,command:1,reflex:-1}}],
     ["commandgk","지휘형 골키퍼","수비 라인을 지휘해요. 지휘·핸들링 ▲ 반응속도 ▼",{g:1,a:1,st:{command:3,handling:1,reflex:-1}}],
     ["supersaver","슈퍼 세이버","믿기 힘든 선방을 해요. 선방·반응속도 ▲▲ 킥 ▼",{g:1,a:1,st:{saving:3,reflex:1,kicking:-2}}]]
};
L.rolesOf=sub=>L.ROLES[sub]||[];
L.roleDef=(sub,id)=>{ const r=L.rolesOf(sub).find(x=>x[0]===id); return r?{id:r[0],name:r[1],desc:r[2],fx:r[3]}:null; };
L.roleName=p=>{ const r=L.roleDef(p.sub,p.role); return r?r.name:""; };

/* 주발 효과: 윙어·풀백은 측면과 주발의 조합이 중요해요 */
L.footInfo=function(sub,foot){
  const side=sub==="LW"||sub==="LB"?"L":sub==="RW"||sub==="RB"?"R":null;
  if(foot==="양발") return {g:1.05,a:1.05,label:"양발",text:"양쪽 모두 소화해요. 약점이 없는 대신 눈에 띄는 장점도 작아요 (골·도움 +5%)."};
  if(!side){
    if(sub==="CB"&&foot==="왼발") return {g:1,a:1,st:{building:2},label:"왼발",text:"왼발 센터백은 희소해서 빌드업이 좋아져요 (빌드업 +2)."};
    return {g:1,a:1,label:foot,text:"중앙에서는 주발에 따른 큰 차이가 없어요."};
  }
  const natural=(side==="L"&&foot==="왼발")||(side==="R"&&foot==="오른발");
  const wing=sub==="LW"||sub==="RW";
  return natural?{g:.95,a:1.12,label:"정발",text:(wing?"정발 윙어":"정발 풀백")+": 라인을 타고 올라가 크로스·돌파로 도움이 늘어요 (도움 +12%, 골 −5%)."}
                :{g:1.15,a:.92,label:"역발",text:(wing?"역발 윙어":"역발 풀백")+": 안쪽으로 파고들어 직접 슛을 노려요 (골 +15%, 도움 −8%)."};
};
/* 경기에서 쓰는 최종 배수 */
L.styleFx=function(p){
  const r=L.roleDef(p.sub,p.role), f=L.footInfo(p.sub,p.foot);
  return {g:(r?r.fx.g:1)*f.g, a:(r?r.fx.a:1)*f.a};
};
/* 시작 능력치 반영 (역할 + 주발) */
L.applyStyle=function(p){
  const d=L.POSDEF[p.pos], ok=new Set(d.stats.map(s=>s[0]));
  const prev=p.sfx||{}; Object.keys(prev).forEach(k=>{ if(ok.has(k)) p.stats[k]=Math.max(10,p.stats[k]-prev[k]); });
  const r=L.roleDef(p.sub,p.role), f=L.footInfo(p.sub,p.foot), now={};
  const add=st=>{ Object.keys(st||{}).forEach(k=>{ if(ok.has(k)){ now[k]=(now[k]||0)+st[k]; p.stats[k]=Math.max(10,Math.min(95,p.stats[k]+st[k])); } }); };
  add(r&&r.fx.st); add(f.st); p.sfx=now; p.ovr=L.ovrOf(p);
};
/* 세부 포지션 바꾸기 (은사·감독의 제안). 같은 포지션 안에서만 바뀌어요 */
function logStyle(S,text){ (S.styleLog=S.styleLog||[]).push({year:S.year,age:L.age(S),text}); }
L.logStyle=logStyle;
L.changeSub=function(S,sub){ const p=S.p; if(!L.POSDEF[p.pos].subs.some(s=>s[0]===sub)) return false; const was=L.POSDEF[p.pos].subs.find(s=>s[0]===p.sub); p.sub=sub; const r=L.rolesOf(sub)[0]; p.role=r?r[0]:null; L.applyStyle(p); const nn=L.POSDEF[p.pos].subs.find(s=>s[0]===sub)[1]; L.addMoment(S,"포지션 변경","포변",(was?was[1]:"")+" → "+nn+" 포지션을 바꿨어요."); logStyle(S,(was?was[1]:"")+" → "+nn+" 포지션 변경 ("+L.roleName(p)+" 역할)"); return true; };
L.changeRole=function(S,id){ const p=S.p; const r=L.roleDef(p.sub,id); if(!r) return false; p.role=id; L.applyStyle(p); L.addMoment(S,"역할 변경","역할",r.name+" 역할을 맡게 됐어요."); logStyle(S,r.name+" 역할로 변경"); return true; };
})();

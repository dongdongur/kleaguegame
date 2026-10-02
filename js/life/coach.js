/*
 * K-라이프 감독의 전술 색 (js/life/coach.js)
 * 구단마다 감독이 있고, 감독은 전술 색을 가져요. 내 역할이 그 색과 맞으면 출전 기회와 신뢰가 늘고, 맞지 않으면 줄어요.
 * 감독은 몇 년마다 바뀔 수 있어요. 안 맞을 때는 역할을 바꾸거나 이적을 고민해 볼 수 있어요.
 *   - 맞음: 출전 비중 +4%p · 시즌 말 감독 신뢰 +3
 *   - 안 맞음: 출전 비중 −5%p · 시즌 말 감독 신뢰 −3
 */
(function(){
"use strict";
const L=window.LIFE; if(!L) return;
const {clamp,pick,ri}=L;
L.COACH_STYLES={
 attack:{name:"공격 축구",anti:"defend",desc:"점수를 내는 데 집중해요. 윙어와 공격수가 빛나요."},
 possess:{name:"점유 축구",anti:"direct",desc:"패스로 경기를 지배해요. 패스와 시야가 좋은 선수가 환영받아요."},
 counter:{name:"역습 축구",anti:"possess",desc:"수비 후 빠른 전환을 노려요. 스피드와 침투가 중요해요."},
 press:{name:"압박 축구",anti:"defend",desc:"전방부터 강하게 압박해요. 활동량이 많은 선수가 사랑받아요."},
 defend:{name:"수비 축구",anti:"attack",desc:"실점을 줄이는 걸 최우선으로 해요. 수비 조직력이 핵심이에요."},
 direct:{name:"직선 축구",anti:"possess",desc:"롱볼과 공중전을 활용해요. 타깃형과 터프한 수비수가 중용돼요."}
};
/* 역할이 어울리는 전술 색 */
const TAGS={poacher:["attack","counter"],target:["direct","defend"],false9:["possess"],complete:[],
 inside:["attack","counter","press"],classic:["direct","attack"],raum:["possess","counter"],
 maker:["possess","attack"],shadow:["attack","counter"],raum2:["possess"],
 b2b:["press","attack"],regista:["possess"],mezz:["attack","press"],
 anchor:["defend","possess"],winner:["press","defend"],regista2:["possess"],
 stopper:["defend","direct"],ballplay:["possess","press"],libero:["attack"],
 overlap:["attack","press"],invert:["possess"],defend:["defend"],sweeper:["possess","press"],line:["defend","direct"]};
const MGR_FAM=["김","이","박","최","정","강","조","윤","장","임","한","오"], MGR_GIV=["상철","정수","동호","태영","민규","성호","재원","기영","진우","승현"];
const MGR_FOR=["루이스 마르티네스","안드레아 로시","한스 뮐러","피에르 뒤랑","제임스 카터","라파엘 고메스","토마스 베르그","마르코 이바노비치"];
function newCoach(S){
  const foreign=L.isForeign(S.club.lg); const name=foreign?pick(MGR_FOR):pick(MGR_FAM)+pick(MGR_GIV);
  const keys=Object.keys(L.COACH_STYLES); let style=pick(keys);
  /* 강팀일수록 공격·점유, 약팀일수록 수비·역습·직선 색이 나올 확률이 높아요 */
  const cc=L.leagueClubs(S,S.club.lg==="MIL"?"K1":S.club.lg).find(x=>x.id===S.club.id); const lv=cc?cc.l:null; if(lv!=null){ const strong=lv>=78; if(strong&&Math.random()<.5) style=pick(["attack","possess","press"]); else if(!strong&&Math.random()<.5) style=pick(["defend","counter","direct"]); }
  return {name,style,club:S.club.id,since:S.year};
}
L.coachFor=function(S){
  if(S.stage!=="pro"||!S.club) return null;
  if(!S.coach||S.coach.club!==S.club.id||S.coach.since==null){ S.coach=newCoach(S); S.coachNew=true; }
  return S.coach;
};
L.styleFit=function(S){
  const c=L.coachFor(S); if(!c) return {fit:"none"};
  const st=L.COACH_STYLES[c.style]; const tags=TAGS[S.p.role]||[];
  let fit="mid";
  if(tags.includes(c.style)) fit="good";
  else if(tags.length&&tags.some(t=>L.COACH_STYLES[t].anti===c.style||L.COACH_STYLES[c.style].anti===t)) fit="bad";
  const rn=L.roleName(S.p);
  const text=fit==="good"?`${c.name} 감독의 ${st.name}와(과) ${rn} 역할이 잘 맞아요. 출전 기회와 신뢰가 늘어요.`
    :fit==="bad"?`${c.name} 감독의 ${st.name}와(과) ${rn} 역할이 어긋나요. 출전 기회와 신뢰가 줄어요. 역할을 바꾸거나 이적을 고민해 볼 수 있어요.`
    :`${c.name} 감독의 ${st.name}. ${rn?rn+" 역할과 큰 영향은 없어요.":"큰 영향은 없어요."}`;
  return {fit,coach:c,style:st,text};
};
/* 시즌 시작: 출전 비중에 반영 */
L.coachAdjustSr=function(S,sr){ const f=L.styleFit(S); return clamp(sr+(f.fit==="good"?.04:f.fit==="bad"?-.05:0),.02,.97); };
/* 시즌 끝: 신뢰 보정 + 감독 교체 */
L.coachSeasonEnd=function(S){
  const f=L.styleFit(S); if(f.fit==="good") S.trust=clamp(S.trust+.03,.05,.95); else if(f.fit==="bad") S.trust=clamp(S.trust-.03,.05,.95);
};
L.coachNextYear=function(S){
  if(S.stage!=="pro"||!S.coach) return; S.coachNew=false;
  const yrs=S.year-S.coach.since; const p=.08+yrs*.07;
  if(Math.random()<p){ const old=S.coach; S.coach=newCoach(S); S.coachNew=true; S.coachFrom=old; }
};
/* 내 세부 포지션 중 현재 감독 색에 맞는 역할 */
L.rolesFitting=function(S){ const c=L.coachFor(S); if(!c) return []; return L.rolesOf(S.p.sub).filter(r=>r[0]!==S.p.role&&(TAGS[r[0]]||[]).includes(c.style)); };
const R=(label,p,win,lose,ok,no)=>({label,p,win,lose,ok,no}), Z=(label,win,ok)=>({label,safe:true,win,ok});
const {pro}=L.EVC;
L.EVPOOL.push({id:"coach_clash",w:3,when:S=>pro(S)&&S.stage==="pro"&&L.styleFit(S).fit==="bad"&&S.history.filter(h=>!h.youth).length>=1,title:"감독과의 전술 갈등",body:"감독의 전술 색과 내 스타일이 어긋나요. 최근 출전 기회도 줄었어요.",
 dynamic:(S,base)=>{ const f=L.styleFit(S), fit=L.rolesFitting(S); const opts=[];
   if(fit.length){ const r=fit[0]; const o=R(r[1]+" 역할로 바꿔 적응한다",70,{trust:4,morale:2},{trust:-2,morale:-3},"감독의 색에 맞춰 새 역할을 맡았어요. "+r[2],"적응이 쉽지 않았어요. 원래 역할을 유지해요."); o.act="role:"+r[0]; opts.push(o); }
   opts.push(R("감독과 면담해 내 스타일을 설명한다",50,{trust:3,morale:2},{trust:-4,morale:-3},"감독이 내 장점을 다시 보게 됐어요.","감독의 마음을 돌리지 못했어요."));
   opts.push(Z("묵묵히 훈련하며 때를 기다린다",{trust:1,morale:-1},"인내심을 보였어요."));
   return Object.assign({},base,{body:base.body+" ("+f.coach.name+" 감독 · "+f.style.name+")",opts}); }});
L.EVPOOL.push({id:"coach_praise",w:2.5,when:S=>pro(S)&&S.stage==="pro"&&L.styleFit(S).fit==="good",title:"감독의 신임",body:"감독이 '네 스타일이 우리 팀의 방향과 딱 맞는다'고 칭찬해요.",
 opts:[R("더 적극적으로 팀 전술에 녹아든다",75,{trust:4,morale:4,fame:1},{morale:-1},"전술의 핵심 선수로 자리를 굳혔어요.","의욕이 앞서 몇 번 실수했어요."),Z("고마움을 표하고 묵묵히 한다",{trust:2,morale:2},"신뢰가 더 단단해졌어요.")]});
})();
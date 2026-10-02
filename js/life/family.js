/*
 * K-라이프 결혼과 자녀 (js/life/family.js)
 * 연애 → 프러포즈 → 결혼식 → 자녀의 탄생과 성장까지 이어지는 이야기예요. 자녀는 이름과 재능 조짐이 생기고,
 * 은퇴 후 '세대 계승'에서 실제 내 자녀로 이어서 키울 수 있어요.
 */
(function(){
"use strict";
const L=window.LIFE; if(!L||!L.EVC) return;
const {clamp,pick,ri,rnd,r1}=L;
const {pro}=L.EVC;
const age=S=>L.age(S);
const R=(label,p,win,lose,ok,no,act)=>({label,p,win,lose,ok,no,act}), Z=(label,win,ok,act)=>({label,safe:true,win,ok,act});
const KID_M=["지후","도윤","서준","하준","시우","민재","건우","현우","준우","이안"], KID_F=["서아","하윤","지안","수아","채원","나은","예린","소율","아린","다은"];
L.kidAge=(S,k)=>S.year-k.born;
L.newKid=function(S){ const girl=Math.random()<.5; const used=(S.kids||[]).map(k=>k.name);
  let nm; do{ nm=pick(girl?KID_F:KID_M); }while(used.includes(nm)&&used.length<8);
  const pot=clamp(Math.round(58+(((S.p.ovr+S.p.pot)/2)-58)*.5+rnd(-9,9)),55,97);
  const k={name:nm,girl,born:S.year,pot,grade:pot>=90?"S":pot>=82?"A":pot>=74?"B":"C",order:(S.kids||[]).length+1};
  (S.kids=S.kids||[]).push(k); S.lastBirth=S.year; return k; };
L.kidHint=k=>k.grade==="S"?"세계 무대에서 통할 재능이 보여요":k.grade==="A"?"국가대표급 재능 조짐이 있어요":k.grade==="B"?"주전으로 자리잡을 만한 재능이에요":"평범하지만 노력으로 길을 열 수 있어요";
L.marry=function(S){ S.married={year:S.year}; S.dating=false; L.addMoment(S,"결혼","결혼","결혼했습니다."); L.feedAdd(S,S.year+" 가정","결혼식을 올렸어요",1); };

/* 예전에 있던 단순 결혼·출산 이벤트는 새 연결 이벤트로 교체 */
L.EVPOOL=L.EVPOOL.filter(e=>e.id!=="l_wedding"&&e.id!=="l_baby");
const E=(id,w,when,title,body,opts,extra)=>L.EVPOOL.push(Object.assign({id,w,when,title,body,opts},extra||{}));
const single=S=>pro(S)&&!S.married&&!S.dating&&age(S)>=22&&age(S)<=33;
const dating=S=>pro(S)&&S.dating&&!S.married&&age(S)>=23;
const married=S=>pro(S)&&!!S.married;
const kids=S=>(S.kids||[]).length;
E("fm_date",2.2,single,"운명 같은 만남","오랜 팬이던 사람과 우연히 가까워졌어요. 마음이 자꾸 쓰여요.",[R("용기 내 데이트를 신청한다",65,{morale:6,fame:1},{morale:-3},"조심스럽게 연인이 되었어요.","타이밍이 어긋났어요.","dating"),Z("조금 더 시간을 갖는다",{morale:1},"천천히 알아 가기로 했어요.")]);
E("fm_propose",2.4,dating,"프러포즈 준비","소중한 사람과 평생을 약속하고 싶어요.",[R("깜짝 이벤트로 프러포즈한다",75,{morale:10,rep:2},{morale:-6},"눈물을 글썽이며 고개를 끄덕였어요!","아직은 때가 아니라는 말을 들었어요.","marry"),R("조용히 반지를 건넨다",85,{morale:8},{morale:-4},"따뜻한 미소로 승낙했어요.","조금 더 생각해 보겠대요.","marry"),Z("조금 더 기다린다",{trust:1},"더 좋은 때를 기다리기로 했어요.")],{repeat:true});
E("fm_wedding",3,S=>married(S)&&S.married.year===S.year&&!S.weddingDone,"결혼식 날","결혼식 날이에요. 동료들과 감독, 팬들의 축하 메시지가 쏟아져요.",[Z("가족과 가까운 사람만 모시는 작은 결혼식",{morale:8,rep:3,funds:-.1},"소박하지만 따뜻했어요.","wedding"),R("동료·팬과 함께하는 큰 결혼식",85,{morale:8,fame:4,funds:-1},{morale:2,funds:-1},"전국이 축하해 준 결혼식이었어요.","일정이 꼬여 조금 정신없었어요.","wedding")]);
E("fm_honeymoon",2,S=>married(S)&&S.weddingDone&&!S.honeymoon,"신혼여행 vs 시즌","신혼여행 일정과 시즌 준비가 겹쳤어요.",[R("짧게 다녀온다",70,{morale:7,cond:3},{morale:2,cond:-3},"둘만의 시간을 보냈어요.","일정이 짧아 아쉬웠어요.","honeymoon"),Z("시즌 후로 미룬다",{trust:2},"훈련을 우선했어요.","honeymoon")]);
E("fm_support",2.2,married,"아내(남편)의 응원","경기장에서 가족이 응원해 줘요. 힘이 불끈 솟아요.",[Z("경기 후 가족과 함께 시간을 보낸다",{morale:6,cond:2},"든든한 지지대예요.")],{repeat:true});
E("fm_baby",3.2,S=>married(S)&&kids(S)<3&&age(S)>=24&&(S.lastBirth==null||S.year-S.lastBirth>=2)&&S.married.year<S.year,"새 생명","가족에게 기쁜 소식이 찾아왔어요.",[Z("가슴 벅차게 맞이한다",{morale:10,trust:1},"아이가 세상에 나왔어요.","baby")],{repeat:true});
E("fm_parent",2.2,S=>married(S)&&kids(S)>=1&&S.kids.some(k=>L.kidAge(S,k)<=3),"육아와 훈련 사이","밤마다 아기가 깨요. 훈련에 집중하기가 쉽지 않아요.",[R("아내와 교대로 돌본다",75,{morale:5,trust:1,cond:-3},{cond:-6,morale:-1},"가족이 한 팀이 됐어요.","피로가 쌓였어요."),Z("도우미의 도움을 받는다",{cond:3,funds:-.1},"잠은 챙겼지만 마음이 쓰여요.")],{repeat:true});
E("fm_ball",2,S=>kids(S)>=1&&S.kids.some(k=>L.kidAge(S,k)>=3&&L.kidAge(S,k)<=6),"아이의 첫 축구공","아이가 아빠(엄마) 경기 영상을 보고 공을 차고 싶대요.",[R("마당에서 같이 공을 찬다",85,{morale:7},{morale:2},"아이가 환하게 웃었어요.","아이가 금세 다른 장난감에 정신이 팔렸어요."),Z("유소년 교실에 보낸다",{morale:3},"또래 친구들과 어울리기 시작했어요.")]);
E("fm_stadium",1.8,S=>kids(S)>=1&&S.fame>=15&&S.kids.some(k=>L.kidAge(S,k)>=4),"아이와 함께 입장","선수 입장 때 아이 손을 잡고 나올 수 있게 해 준대요.",[Z("아이와 손잡고 입장한다",{morale:8,fame:3},"카메라가 온통 그 장면을 비췄어요.")]);
E("fm_hint",2.4,S=>kids(S)>=1&&S.kids.some(k=>L.kidAge(S,k)>=8&&!k.hinted),"아이의 재능","아이가 공을 차는 모습을 본 코치가 이야기를 꺼냈어요.",[Z("가만히 지켜본다",{morale:4},"자라나는 모습이 대견해요.","kidhint")],{repeat:true});
E("fm_conflict",2,S=>married(S)&&(S.fame>=30||(S.club&&L.isForeign(S.club.lg))),"원정과 가정의 균형","원정과 훈련이 이어져 가족과 보낼 시간이 부족해요.",[R("휴가를 쪼개 가족과 보낸다",70,{morale:5,trust:-1},{morale:-3},"가족이 큰 힘이 됐어요.","어쩔 수 없이 대화가 줄었어요.",null),Z("선수 생활에 몰두한다",{trust:2,morale:-2},"조금 외로운 시즌이었어요.")]);
E("fm_ad",1.8,S=>married(S)&&kids(S)>=1&&S.fame>=25,"가족 광고 제안","한 브랜드가 온 가족이 나오는 광고를 제안했어요.",[R("가족과 함께 촬영한다",80,{fame:5,funds:.5,morale:4},{fame:-1},"따뜻한 가족 광고가 호평받았어요.","아이가 카메라 앞에서 울어 버렸어요."),Z("사생활을 지킨다",{rep:2},"가족의 평온을 택했어요.")]);
E("fm_sick",1.8,S=>kids(S)>=1&&S.kids.some(k=>L.kidAge(S,k)<=6),"아이가 아파요","경기 전날 아이가 열이 났어요.",[R("병원에 함께 간다",80,{morale:2,rep:2,trust:-1},{morale:-1},"아이가 금세 나았어요. 팀도 이해해 줬어요.","경기 컨디션이 조금 떨어졌어요."),Z("아내(남편)에게 맡기고 경기를 준비한다",{trust:1,morale:-3},"마음이 편하지는 않았어요.")]);

/* 선택지에 붙은 특수 효과 */
const baseResolve=L.resolveEvent;
L.resolveEvent=function(S,ev,idx){
  const o=ev.opts[idx]; const res=baseResolve(S,ev,idx); const a=o&&o.act, hit=res.hit;
  if(a==="dating"&&hit){ S.dating=true; res.lines.push("연인이 생겼어요"); }
  if(a==="marry"&&hit){ L.marry(S); res.lines.push("결혼했어요!"); }
  if(a==="wedding"){ S.weddingDone=true; }
  if(a==="honeymoon"){ S.honeymoon=true; }
  if(a==="baby"){ const k=L.newKid(S); res.lines.push("🍼 "+k.name+" ("+(k.girl?"딸":"아들")+") 탄생!"); }
  if(a==="kidhint"){ const ks=(S.kids||[]).filter(k=>L.kidAge(S,k)>=8&&!k.hinted); if(ks.length){ const k=ks[0]; k.hinted=true; res.lines.push(k.name+": "+k.grade+"급 재능 — "+L.kidHint(k)); } }
  return res;
};
/* ===== 자녀 육성: 12세까지 방향(포지션)을 정하고 돈·튜터링으로 미리 키워요 ===== */
L.KID_INV={skill:{name:"개인 기술 레슨",cost:.8,max:6,desc:"기술 능력치 시작값 +1.5 / 단계"},body:{name:"피지컬 트레이닝",cost:.8,max:6,desc:"체력 능력치 시작값 +1.8 / 단계"},mind:{name:"멘탈·학업 튜터링",cost:.6,max:4,desc:"끈기 +1 (2단계마다) · 기복 감소"},camp:{name:"해외 유학 캠프",cost:4,max:3,desc:"재능(잠재력) +2 / 단계 (목표 포지션과 같으면 +3 추가)"}};
L.kidOpen=(S,k)=>L.kidAge(S,k)<=12;
L.kidCost=(S,key)=>r1(L.KID_INV[key].cost*(1+Math.max(0,S.salary||0)*.02));
L.kidDirect=function(S,i,pos){ const k=(S.kids||[])[i]; if(!k) return {ok:false,text:"자녀를 찾을 수 없어요."}; if(!L.kidOpen(S,k)) return {ok:false,text:k.name+"는 이미 12세를 넘어 방향이 굳어졌어요."}; k.dir=pos; return {ok:true,text:k.name+"의 목표 포지션을 "+L.POSDEF[pos].name+"로 정했어요. (이 방향에 맞춰 육성하면 효과가 커져요)"}; };
L.kidInvest=function(S,i,key){ const k=(S.kids||[])[i], d=L.KID_INV[key]; if(!k||!d) return {ok:false,text:"없는 항목이에요."}; if(!L.kidOpen(S,k)) return {ok:false,text:k.name+"는 12세를 넘어 더 이상 육성할 수 없어요."};
  k.inv=k.inv||{}; if((k.inv[key]||0)>=d.max) return {ok:false,text:"이 항목은 최대 단계예요."}; const c=L.kidCost(S,key); if(S.funds<c) return {ok:false,text:"자금이 부족해요. (필요 "+c+"억)"};
  S.funds=r1(S.funds-c); k.inv[key]=(k.inv[key]||0)+1; L.feedAdd(S,S.year+" 가정",k.name+" "+d.name+" ("+c+"억)",1); if(L.charDelta) L.charDelta(S,.6,"가정: 자녀 교육"); return {ok:true,text:k.name+" · "+d.name+" "+k.inv[key]+"단계 (-"+c+"억)"}; };
/* 자녀로 이어 키울 때 육성 결과 반영 */
L.kidApply=function(C,kid,pos){ if(!kid||!kid.inv) return; const lv=kid.inv, same=!kid.dir||kid.dir===pos, mul=same?1:.5; const PH=L.PHYS;
  Object.keys(C.p.stats).forEach(k=>{ const add=PH.has(k)?(lv.body||0)*1.8:(lv.skill||0)*1.5*mul; C.p.stats[k]=clamp(Math.round(C.p.stats[k]+add),10,95); });
  if(C.points) C.points.grit=(C.points.grit|0)+Math.floor((lv.mind||0)/2);
  const dp=Math.round((lv.camp||0)*2+(kid.dir===pos?3:0)); if(dp){ C.p.pot=clamp(C.p.pot+dp,55,99); C.p.pot0=C.p.pot; C.p.grade=C.p.pot>=90?"S":C.p.pot>=82?"A":C.p.pot>=74?"B":"C"; }
  C.p.ovr=L.ovrOf(C.p); C.p.peak=C.p.ovr; };

/* ===== 플레잉코치 ===== */
L.canPlayCoach=S=>S.stage==="pro"&&age(S)>=32&&!S.playcoach&&S.military!=="serving"&&S.club&&S.club.lg!=="MIL";
L.setPlayCoach=function(S){ S.playcoach={since:S.year,club:S.club.id,club_name:S.club.name}; S.pcYears=0; S.salary=r1(Math.max(.3,S.salary*.75)); S.trust=clamp(S.trust+.06,.05,.95); L.addMoment(S,"플레잉코치","코치","플레잉코치로 새 역할을 시작했습니다."); if(L.logStyle) L.logStyle(S,"플레잉코치 전환"); L.feedAdd(S,S.year+" 커리어","플레잉코치로 전환 — 선수와 코치를 겸해요",1); if(L.charDelta) L.charDelta(S,2,"헌신: 플레잉코치"); };
L.pcSeasonEnd=function(S){ if(!S.playcoach) return; S.pcYears=(S.pcYears||0)+1; S.fame=Math.max(0,S.fame+.8); S.rep=clamp(S.rep+1.2,0,100); };
L.pcFx=S=>S.playcoach?{team:.5,srCap:.6}:{team:0,srCap:1};

/* 가족 이벤트는 시즌 마무리 구간에 상황에 맞는 것이 우선해서 나와요 (일반 이벤트 추첨에만 맡기면 너무 드물어서) */
const baseRoll=L.rollEvent;
const FORCED=[["fm_wedding",S=>1],["fm_honeymoon",S=>.5],["fm_baby",S=>.4],["fm_propose",S=>.5],["fm_date",S=>.24]];
L.rollEvent=function(S,out){
  if(out&&out.seg==="h4"&&S.military!=="serving"&&S.stage==="pro"){ for(const [id,p] of FORCED){ const e=L.EVPOOL.find(x=>x.id===id); if(!e||!e.when(S)) continue; if(!e.repeat&&(S.evSeen||[]).includes(id)) continue; if(Math.random()<p(S)){ S.segCount=(S.segCount||0)+1; return L.markEvent(S,{id:e.id,title:e.title,body:e.body,opts:e.opts,repeat:e.repeat}); } } }
  return baseRoll(S,out);
};
const pcOn=S=>pro(S)&&!!S.playcoach;
E("pc_teach",2.4,pcOn,"후배에게 알려 주는 법","훈련 후 후배들이 하나둘 질문을 들고 찾아와요. 코치로서의 첫 수업이에요.",[R("1대1로 꼼꼼히 가르친다",80,{trust:3,rep:3,morale:3,cond:-3},{cond:-5,morale:-1},"후배가 눈에 띄게 성장했어요.","시간을 많이 썼지만 효과는 작았어요.",null),Z("영상으로 요점만 정리해 준다",{trust:2,rep:1},"효율적으로 가르쳤어요.")]);
E("pc_lead",2,pcOn,"감독 대신 지휘","감독이 퇴장당해 당신이 벤치에서 전술 지시를 하게 됐어요.",[R("과감한 교체로 승부를 건다",50,{fame:4,trust:4,morale:4},{trust:-2,morale:-3},"교체 카드가 적중해 역전승했어요!","교체가 어긋나 아쉬운 결과였어요.",null),Z("감독의 계획대로 이어 간다",{trust:2,rep:2},"안정적으로 마쳤어요.")]);
E("pc_plan",1.8,pcOn,"훈련 프로그램 설계","코치진 회의에서 훈련 프로그램 일부를 직접 짜 보라는 제안이 왔어요.",[R("선수 시절 경험을 담아 설계한다",70,{trust:3,rep:3,morale:3},{trust:-1},"선수단 호평을 받았어요.","현실과 달라 수정이 필요했어요.",null),Z("선임 코치의 자료를 따른다",{trust:1},"무난하게 마쳤어요.")]);
E("pc_bench",1.8,pcOn,"벤치에 앉은 플레잉코치","경기에서 교체 명단에 올랐어요. 후배의 활약이 눈부셔요.",[Z("벤치에서 후배를 응원하고 조언한다",{morale:3,rep:3,trust:2},"선수와 코치 사이에서 균형을 잡았어요."),R("한 번 더 주전에 도전한다",40,{trust:3,morale:5,fame:2},{morale:-4},"노장의 투혼에 박수가 쏟아졌어요.","아직은 후배들이 앞서 있어요.",null)]);
})();
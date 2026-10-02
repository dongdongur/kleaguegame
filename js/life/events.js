/*
 * K-라이프 시즌 중 이벤트 (js/life/events.js)
 * 구간(전반기/중반기/후반기/시즌 마무리)이 끝날 때마다 일정 확률로 한 건씩 나와요.
 * 선택지에는 성공 확률이 표시되고, 결과는 컨디션·사기·인기·평판·감독 신뢰·자금·능력치에 반영돼요.
 * 스토리 이벤트(평생의 라이벌 등)는 여러 구간에 걸쳐 이어져요.
 */
(function(){
"use strict";
const L=window.LIFE, {rnd,ri,pick,clamp,r1}=L;
const RIVAL_NAMES=["장재혁","오민석","한서진","백도윤","이강훈","서태영","문지후","권도현"];

function eff(S,e){
  const p=S.p, out=[];
  const add=(k,lab,v)=>{ if(v) out.push(lab+" "+(v>0?"+":"")+v); };
  if(e.morale){ S.morale=clamp(S.morale+e.morale,0,100); add("m","사기",e.morale); }
  if(e.cond){ S.cond=clamp(S.cond+e.cond,0,100); add("c","컨디션",e.cond); }
  if(e.fame){ S.fame=clamp(S.fame+e.fame,0,100); add("f","인기",e.fame); }
  if(e.rep){ S.rep=clamp(S.rep+e.rep,0,100); add("r","평판",e.rep); }
  if(e.trust){ S.trust=clamp(S.trust+e.trust/100,.05,.95); add("t","감독 신뢰",e.trust); }
  if(e.funds){ S.funds=r1(Math.max(0,S.funds+e.funds)); out.push("자금 "+(e.funds>0?"+":"")+e.funds+"억"); }
  if(e.pot){ p.pot=clamp(p.pot+e.pot,p.ovr,99); add("p","잠재력",e.pot); }
  if(e.stat){ const d=L.POSDEF[p.pos]; const st=e.stat>0?d.stats[ri(0,d.stats.length-1)]:d.stats[ri(0,d.stats.length-1)]; p.stats[st[0]]=clamp(p.stats[st[0]]+e.stat,10,99); p.ovr=L.ovrOf(p); out.push(st[1]+" "+(e.stat>0?"+":"")+e.stat); }
  if(e.fam&&S.family){ S.family.pts=Math.max(0,S.family.pts+e.fam); out.push("가정 지원 포인트 "+(e.fam>0?"+":"")+e.fam); }
  if(e.inj){ S.sim&&(S.sim.out+=e.inj); out.push("결장 "+e.inj+"경기"); }
  return out;
}
L.applyEffects=eff;

/* 이벤트 정의: cond(S,seg) 로 나올 수 있는 상황을 제한해요 */
const POOL=[
 {id:"famcrash",w:2.2,once:"fam1",when:S=>S.family&&(S.stage==="youth"||S.stage==="univ")&&S.family.pts>=4&&!S.famEv,title:"아버지 사업이 어려워졌어요",body:"부모님 사업이 크게 흔들려 가정 형편이 나빠졌습니다. 뒷바라지가 예전 같지 않을 거예요.",
  opts:[{label:"아르바이트와 장학금으로 보탠다",p:55,win:{fam:-1,morale:-2,trust:2},lose:{fam:-3,morale:-6,cond:-6},ok:"힘들지만 길을 찾았어요. 지원이 조금만 줄었어요.",no:"버거운 한 해가 됐어요. 지원이 크게 줄었습니다."},
        {label:"사실대로 말하고 함께 견딘다",p:100,win:{fam:-2,morale:3},ok:"가족이 하나가 됐어요. 지원 포인트는 줄었지만 마음은 단단해졌어요."}]},
 {id:"famboom",w:1.2,when:S=>S.family&&(S.stage==="youth"||S.stage==="univ")&&S.family.pts<12&&!S.famEv2,title:"가정에 좋은 일이 생겼어요",body:"부모님이 승진·사업 호조로 뒷바라지를 더 해 줄 수 있게 되었습니다.",
  opts:[{label:"감사히 받고 더 열심히 한다",p:100,win:{fam:2,morale:4},ok:"지원 포인트가 늘었어요!"}]},
 {id:"famletter",w:1.5,when:S=>S.family&&(S.stage==="youth"||S.stage==="univ"),title:"부모님의 응원",body:"경기장에 몰래 오신 부모님이 도시락과 편지를 건네 주셨습니다.",
  opts:[{label:"편지를 읽는다",p:100,win:{morale:7,trust:1},ok:"가슴이 따뜻해졌어요."}]},
 {id:"sponsoryouth",w:1.2,when:S=>S.family&&S.family.pts<=5&&S.stage==="youth"&&S.fame>=8,title:"지역 후원자의 제안",body:"지역 기업인이 어려운 형편의 유망주를 돕고 싶다고 합니다.",
  opts:[{label:"정중히 받아들인다",p:85,win:{fam:2,fame:2},lose:{fam:0,morale:-2},ok:"후원 덕에 지원 포인트가 늘었어요.",no:"사정이 있어 무산됐어요."},{label:"스스로 해내겠다며 사양한다",p:100,win:{trust:2,morale:3},ok:"자존심을 지켰어요."}]},
 {id:"press",w:3,title:"기자회견 질문",body:"경기 후 기자가 예민한 질문을 던졌습니다. 어떻게 답할까요?",
  opts:[{label:"솔직하게 답한다",p:60,win:{morale:3,fame:3,rep:1},lose:{morale:-3,fame:-2},ok:"솔직한 답변이 호평을 받았어요.",no:"말이 곡해되어 기사가 나갔어요."},
        {label:"“팀이 먼저입니다”라고 답한다",p:90,win:{rep:1,trust:2},lose:{},ok:"무난하게 넘겼어요.",no:"무난하게 넘겼어요."}]},
 {id:"fanmeet",w:2,when:S=>S.fame>=10,title:"팬 사인회 요청",body:"구단이 팬 사인회 참석을 부탁했습니다.",
  opts:[{label:"참석한다",p:100,win:{fame:6,morale:4,cond:-4},ok:"팬들의 응원이 힘이 됐어요."},{label:"컨디션 관리를 이유로 정중히 거절한다",p:100,win:{cond:4,fame:-1},ok:"푹 쉬었어요."}]},
 {id:"sponsor",w:2,when:S=>S.fame>=18&&S.stage==="pro",title:"스폰서 제안",body:"스포츠 브랜드가 개인 후원을 제안했습니다.",
  opts:[{label:"계약한다",p:100,win:{funds:+(0.4).toFixed(1),fame:4,cond:-3},ok:"후원 계약금이 들어왔어요."},{label:"경기에 집중하겠다며 거절한다",p:100,win:{trust:3,morale:2},ok:"감독이 마음에 들어 했어요."}]},
 {id:"coachtalk",w:3,title:"감독의 면담",body:"감독이 개인 면담을 요청했습니다.",
  opts:[{label:"출전 시간에 대해 묻는다",p:55,win:{trust:5,morale:2},lose:{trust:-3,morale:-3},ok:"기회를 주겠다는 답을 들었어요.",no:"다소 불편한 분위기였어요."},{label:"조언을 듣는다",p:100,win:{stat:1,trust:2},ok:"경기 읽는 법을 배웠어요."}]},
 {id:"teammate",w:3,title:"팀 훈련 중 마찰",body:"훈련 중 동료와 신경전이 벌어졌습니다.",
  opts:[{label:"먼저 사과하고 푼다",p:80,win:{morale:2,trust:2},lose:{morale:-2},ok:"라커룸 분위기가 풀렸어요.",no:"어색함이 이어졌어요."},{label:"맞받아친다",p:35,win:{morale:3,fame:2},lose:{morale:-5,trust:-5},ok:"기싸움에서 밀리지 않았어요.",no:"감독에게 경고를 받았어요."}]},
 {id:"injscare",w:2,when:S=>S.cond<70,title:"몸에 이상 신호",body:"훈련 중 종아리에 묵직한 통증이 느껴집니다.",
  opts:[{label:"바로 의무팀에 알린다",p:100,win:{cond:8,morale:-1},ok:"큰 문제 없이 넘어갔어요."},{label:"참고 훈련한다",p:45,win:{stat:1},lose:{inj:ri(2,5),morale:-4,cond:-8},ok:"통증이 가라앉았어요.",no:"결국 근육이 올라와 쉬게 됐어요."}]},
 {id:"fanchant",w:2,when:S=>S.fame>=12,title:"팬들의 응원가",body:"서포터즈가 당신의 이름을 부르는 응원가를 만들었습니다.",
  opts:[{label:"경기 후 인사한다",p:100,win:{morale:6,fame:3},ok:"가슴이 벅찼어요."}]},
 {id:"agent",w:2,when:S=>S.stage==="pro"&&S.fame>=15,title:"에이전트의 연락",body:"에이전트가 다른 구단의 관심이 있다고 전합니다.",
  opts:[{label:"시즌 끝까지 집중한다",p:100,win:{trust:4,morale:1},ok:"팀에 집중하기로 했어요."},{label:"관심을 흘려 몸값을 올린다",p:50,win:{rep:3,fame:3},lose:{trust:-6,morale:-2},ok:"몸값이 올랐다는 소문이 돌아요.",no:"구단이 기분 나빠 해요."}]},
 {id:"secretvid",w:1,when:S=>L.age(S)<=19,title:"SNS 영상이 화제",body:"훈련 중 개인기 영상이 SNS에서 퍼지고 있습니다.",
  opts:[{label:"영상을 더 올린다",p:60,win:{fame:8,morale:3},lose:{fame:-3,trust:-3},ok:"조회수가 폭발했어요.",no:"“훈련에 집중하라”는 말을 들었어요."},{label:"그냥 둔다",p:100,win:{fame:2},ok:"조용히 넘어갔어요."}]},
 {id:"charity",w:1,when:S=>S.stage==="pro",title:"지역 사회 활동",body:"유소년 클리닉에 와 달라는 요청이 왔습니다.",
  opts:[{label:"참여한다",p:100,win:{rep:3,fame:3,morale:3,cond:-3},ok:"아이들과 즐거운 시간을 보냈어요."},{label:"일정이 바빠 사양한다",p:100,win:{},ok:"다음 기회로 미뤘어요."}]},
 {id:"mentor",w:2,when:S=>L.age(S)<=22,title:"베테랑의 조언",body:"팀의 베테랑이 따로 불러 노하우를 알려 줍니다.",
  opts:[{label:"열심히 배운다",p:85,win:{stat:1,pot:1,trust:2},lose:{morale:-1},ok:"한 단계 성장한 느낌이에요.",no:"조금 어려웠어요."}]},
 {id:"slump",w:2,when:S=>S.morale<45,title:"슬럼프",body:"몇 경기째 마음먹은 대로 풀리지 않습니다.",
  opts:[{label:"심리 상담을 받는다",p:75,win:{morale:12},lose:{morale:3},ok:"마음이 한결 가벼워졌어요.",no:"조금 나아졌어요."},{label:"혼자 이겨낸다",p:40,win:{morale:15,stat:1},lose:{morale:-6},ok:"스스로 벽을 넘었어요.",no:"한동안 더 힘들었어요."}]},
 {id:"derbyfan",w:1,when:S=>S.stage==="pro",title:"라이벌 팬과의 설전",body:"라이벌 팀 팬들이 SNS에서 당신을 도발합니다.",
  opts:[{label:"무시한다",p:100,win:{rep:1},ok:"품격 있게 넘겼어요."},{label:"유쾌하게 받아친다",p:55,win:{fame:6,morale:3},lose:{fame:-4,trust:-3},ok:"재치 있는 답이 화제였어요.",no:"역풍을 맞았어요."}]},
 {id:"gift",w:1,when:S=>S.stage==="youth",title:"학교 체육 선생님의 응원",body:"선생님이 방과 후 개인 훈련을 도와주겠다고 합니다.",
  opts:[{label:"감사히 받는다",p:100,win:{stat:1,cond:-3,morale:3},ok:"기본기가 탄탄해졌어요."}]},
];

/* 이벤트 도감: 한 번이라도 만난 이벤트를 모아서 보여줘요 */
L.dexAll=function(){ return POOL.map(p=>({id:p.id,title:p.title,pos:!!p.when})).concat([{id:"rival1",title:"또래 라이벌의 등장",story:"평생의 라이벌 1/3"},{id:"rival2",title:"라이벌과의 첫 맞대결",story:"평생의 라이벌 2/3"},{id:"rival3",title:"결정적 승부",story:"평생의 라이벌 3/3"}]); };
/* 평생의 라이벌 (3부작): 같은 나이·같은 포지션의 라이벌과 엇갈리는 이야기 */
function rivalEvent(S,seg){
  const st=S.story; if(!st||st.id!=="rival") return null; if(st.wait>0){ st.wait--; return null; }
  const rv=st.name, step=st.step;
  if(step===1){ st.step=2; st.wait=ri(3,5); return {id:"rival1",story:"평생의 라이벌 1/3",title:"또래 라이벌의 등장",body:"같은 나이, 같은 포지션. 언론이 당신과 "+rv+"을(를) 나란히 비교하기 시작했습니다.",
    opts:[{label:"공개적으로 선전포고한다",p:100,win:{morale:2,fame:10},ok:"“누가 더 낫냐고요? 곧 알게 될 겁니다.” 불이 붙었어요."},{label:"조용히 실력으로 보여준다",p:100,win:{trust:3,morale:3},ok:"말보다 발로 증명하기로 했어요."}]}; }
  if(step===2){ st.step=3; st.wait=ri(4,7); const win=S.p.ovr>=st.ovr; st.lead=win; return {id:"rival2",story:"평생의 라이벌 2/3",title:"라이벌과의 첫 맞대결",body:rv+"의 소속팀과 만났습니다. "+(win?"당신이 앞서는 흐름입니다.":"상대가 더 잘나가고 있어요."),
    opts:[{label:"정면 승부한다",p:win?65:40,win:{morale:6,fame:6,stat:1},lose:{morale:-5,fame:-1},ok:"뜨거운 승부 끝에 웃었어요.",no:"한 수 아래임을 인정할 수밖에 없었어요."},{label:"팀플레이에 집중한다",p:80,win:{trust:4,morale:2},lose:{morale:-1},ok:"팀이 이겼어요.",no:"팀은 무승부로 끝났어요."}]}; }
  if(step===3){ S.story=null; const win=S.p.ovr+rnd(-4,4)>=st.ovr; return {id:"rival3",story:"평생의 라이벌 3/3",title:"결정적 승부",body:"모두가 지켜보는 가운데 "+rv+"과(와) 마지막 승부를 겨루게 되었습니다.",
    opts:[{label:"모든 걸 쏟아붓는다",p:win?70:45,win:{morale:10,fame:12,rep:4,pot:1},lose:{morale:-6,fame:-2},ok:"당신이 이 이야기의 주인공이었어요.",no:"아쉽지만, 라이벌 덕분에 한 단계 성장했어요."},{label:"침착하게 정석대로 간다",p:75,win:{morale:5,fame:5,trust:3},lose:{morale:-2},ok:"안정적으로 승부를 가져갔어요.",no:"승부는 졌어요. 하지만 존중을 얻었어요."}]}; }
  return null;
}
L.startStory=function(S){ if(S.story||S.storyDone) return; if(S.history.length<1) return; S.story={id:"rival",step:1,wait:0,name:pick(RIVAL_NAMES),ovr:S.p.ovr+ri(-2,3)}; S.storyDone=true; };

/* 구간이 끝날 때 호출. 이벤트 한 건(또는 null) */
L.rollEvent=function(S,out){
  // 가정 환경 이벤트는 한 번 일어나면 표시를 남겨 반복을 막아요
  if(S.military==="serving") return null;
  L.startStory(S);
  const rv=rivalEvent(S,out); if(rv) return rv;
  if(Math.random()>.42) return null;
  const pool=POOL.filter(e=>!e.when||e.when(S)); let tot=pool.reduce((a,e)=>a+e.w,0), r=Math.random()*tot;
  for(const e of pool){ r-=e.w; if(r<=0){ if(e.id==="famcrash") S.famEv=true; if(e.id==="famboom") S.famEv2=true; return {id:e.id,title:e.title,body:e.body,opts:e.opts.map(o=>Object.assign({},o,{win:Object.assign({},o.win),lose:o.lose?Object.assign({},o.lose):null}))}; } }
  return null;
};
/* 선택지 결과 */
L.resolveEvent=function(S,ev,idx){
  const o=ev.opts[idx]; const hit=Math.random()*100<(o.p!=null?o.p:100);
  const lines=eff(S,hit?o.win:(o.lose||{}));
  const text=hit?o.ok:(o.no||o.ok);
  const es=S.evStats=S.evStats||{n:0,risk:0,riskHit:0,hit:0,luck:0}; es.n++; if(hit) es.hit++; if((o.p!=null?o.p:100)<=50){ es.risk++; if(hit) es.riskHit++; } es.luck=Math.round((es.luck+(hit?1:0)-(o.p!=null?o.p:100)/100)*100)/100;
  L.feedAdd(S,S.year+" 이벤트",(ev.story?ev.story+" · ":"")+ev.title+" — "+text,hit?1:-1);
  return {hit,text,lines};
};
})();

/*
 * 팬 반응 · 기자회견
 * ------------------------------------------------------------
 * 문구는 이 파일에서 직접 쓴 것이고, 결과(순위·득점·더비·연승 등)에 맞춰 골라 써요.
 *   KLFans.season(R, c, team)  시즌이 끝난 뒤 커뮤니티 글과 SNS 글
 *   KLFans.match(g, team)      경기 하나에 대한 짧은 반응
 *   KLPress.pre(c, S)          시즌 전 기자회견 질문 3개
 *   KLPress.post(R, c)         시즌 후 기자회견 질문 2개
 *   KLPress.settle(R, c)       시즌 결과로 목표 달성 여부를 따지고 평판을 바꿔요
 * 평판(c.rep): fans 팬 신뢰, press 언론, squad 선수단 사기 — 0~100, 50이 보통.
 * 선수단 사기는 팀 공격·수비에 ±1.2까지 반영돼요 (KLPress.moraleFx).
 */
(function(){
"use strict";
const rnd=a=>a[Math.floor(Math.random()*a.length)];
const shuf=a=>{ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const num=(lo,hi)=>lo+Math.floor(Math.random()*(hi-lo+1));
const NICK_A=["축덕","새벽","강철","푸른","붉은","노란","녹색","고독한","열혈","야간","주말","월급","직관","원정","응원","올드","뉴비","프로","할말많은","조용한"];
const NICK_B=["서포터","팬","직관러","스카이석","N석","남문","북측","대장","아저씨","형","러버","관중","시즌권자","파이터","팔로워","논객"];
const nick=()=>rnd(NICK_A)+rnd(NICK_B)+(Math.random()<.5?num(1,99):"");
const EMO=["⚽","🔥","😭","😤","🙌","👏","😅","🫡","💪","🤔"];
/* 글 하나: tone +1 칭찬, 0 보통, -1 비판 */
const mk=(src,tone,text,extra)=>Object.assign({src,tone,text,nick:nick(),emoji:rnd(EMO)},extra||{});
const fmk=(tone,text)=>mk("fmk",tone,text,{up:tone>0?num(40,260):tone<0?num(8,90):num(15,120),dn:tone<0?num(5,60):num(2,40),views:num(300,4200)});
const sns=(tone,text)=>mk("sns",tone,text);

function season(R,c,team){
  const me=R.me, N=R.N||12, rank=R.rank, top=R.mine&&R.mine.scorer, mvp=R.mine&&R.mine.mvp;
  const topN=top?top.p.name:"", mvpN=mvp?mvp.p.name:"";
  const div=R.div===1?"K리그1":"K리그2";
  const out=[]; const add=(kind,tone,t)=>out.push(kind==="f"?fmk(tone,t):sns(tone,t));
  const champ=rank===1, podium=rank<=3, bottom=rank>N-2;
  const rep=c.rep||{fans:50,press:50,squad:50};
  /* ---- 순위 ---- */
  if(champ) [["f",1,team+" 우승이다!! "+me.pts+"점으로 "+div+" 1위, 올 한 해 고생했다 진짜"],["f",1,"우승 확정 보고 소리 질렀다 ㅋㅋㅋ 시즌권 끊길 잘했네"],["s",1,"우승이다 우승!!! "+team+" 🏆"],["s",1,"이 맛에 축구 본다… 내년에도 같이 가자"]].forEach(x=>add(x[0],x[1],x[2]));
  else if(podium) [["f",1,rank+"위면 선방했다. 우승만 아니었을 뿐 시즌 내내 재밌었음"],["s",1,"3위 안에 들었으면 만족! 내년엔 진짜 노려보자"],["f",0,"좋은 시즌인데 마지막 한 끗이 아쉽다…"]].forEach(x=>add(x[0],x[1],x[2]));
  else if(!bottom) [["f",0,rank+"위… 딱 중간이네. 무난한데 설레지는 않았다"],["s",0,"올해도 그냥 그런 시즌이었다. 내년엔 뭐라도 보여줘라"],["f",-1,"이 전력으로 "+rank+"위면 감독 운영이 아쉽다"]].forEach(x=>add(x[0],x[1],x[2]));
  else [["f",-1,rank+"위… 이게 맞냐 진짜. 강등 걱정하면서 경기 봐야 하다니"],["s",-1,"시즌권 환불하고 싶다 ㅠㅠ"],["f",-1,"감독 거취 얘기가 나올 수밖에 없는 성적이다"],["s",-1,"그래도 응원은 계속한다… 힘내라 "+team]].forEach(x=>add(x[0],x[1],x[2]));
  /* ---- 컵·대륙 ---- */
  if(R.fa&&R.fa.champion) add("s",1,"FA컵 우승!! 트로피 하나 더 추가 🏆");
  else if(R.fa&&R.fa.exit) add("f",0,"FA컵은 "+R.fa.exit+"에서 끝났네. 리그에 집중이라도 하자");
  if(R.acl&&R.acl.champion) add("f",1,"AFC 챔스 우승이라니… 꿈인가 생시인가");
  else if(R.acl&&R.acl.qualified&&R.acl.exit) add("s",0,"AFC 챔스는 "+R.acl.exit+" 탈락. 아시아 무대는 역시 쉽지 않다");
  /* ---- 개인 ---- */
  if(top&&top.g>=10) add("s",1,topN+" "+top.g+"골!! 이 선수 없었으면 어쩔 뻔했냐");
  else if(top) add("s",0,topN+"가 팀 득점 1위인데 "+top.g+"골이면 공격이 전체적으로 아쉬운 시즌");
  if(mvp) add("f",1,"올해 팀 MVP는 "+mvpN+" 이견 없다. 재계약 꼭 해야 함");
  /* ---- 더비 ---- */
  const dl=R.log.filter(g=>g.derby);
  if(dl.length){ const w=dl.filter(g=>g.res==="W").length, l=dl.filter(g=>g.res==="L").length;
    if(w>l) add("f",1,"더비에서 "+w+"승! 이건 진짜 못 참지 ㅋㅋㅋ 라이벌 팬들 조용하네");
    else if(l>w) add("f",-1,"더비를 졌다… 다음 더비까지 어떻게 기다리냐 ㅠㅠ"); }
  /* ---- 큰 점수 ---- */
  const lg=R.log.filter(g=>g.comp==="리그").sort((a,b)=>(b.f-b.a)-(a.f-a.a));
  if(lg[0]&&lg[0].f-lg[0].a>=4) add("s",1,lg[0].opp.name+"전 "+lg[0].f+":"+lg[0].a+" 대승 ㅋㅋㅋ 이런 경기만 계속 보고 싶다");
  const worst=lg[lg.length-1]; if(worst&&worst.a-worst.f>=3) add("f",-1,worst.opp.name+"전 "+worst.f+":"+worst.a+" 참패는 두고두고 기억날 듯");
  /* ---- 부상·징계 ---- */
  if(R.inj&&R.inj>=6) add("f",-1,"올해 부상자가 너무 많았다. 로테이션이나 관리 쪽 점검이 필요해 보임");
  if(R.cards&&R.cards.r>=4) add("s",-1,"퇴장이 "+R.cards.r+"번이나… 경고 관리 좀 하자");
  /* ---- 평판 ---- */
  if(rep.fans>=70) add("f",1,"요즘 감독 평가가 좋아졌다. 팬들이랑 소통도 하고 믿음이 감");
  else if(rep.fans<=30) add("f",-1,"팬 신뢰가 바닥이다. 이번 시즌 안에 반전이 없으면 힘들다");
  if(rep.press>=70) add("s",1,"기자회견 발언이 시원하다. 이 감독 인터뷰는 챙겨 보게 됨");
  /* ---- 목표 판정 ---- */
  if(c.goalResult){ if(c.goalResult.ok) add("f",1,"시즌 전에 말한 목표('"+c.goalResult.label+"') 지켰다. 말한 대로 하는 감독 좋다");
    else add("f",-1,"'"+c.goalResult.label+"'이라더니… 말만 앞섰던 시즌 아니냐"); }
  return {fmk:shuf(out.filter(x=>x.src==="fmk")).slice(0,6).sort((a,b)=>b.up-a.up), sns:shuf(out.filter(x=>x.src==="sns")).slice(0,6)};
}

/* 경기 하나에 대한 반응 (3개 안팎) */
function match(g){
  const out=[]; const W=g.res==="W", L=g.res==="L", d=g.f-g.a, opp=g.opp.name;
  const cnt=(g.ms||[]).reduce((o,n)=>(o[n]=(o[n]||0)+1,o),{}); const hat=Object.entries(cnt).find(e=>e[1]>=3);
  if(g.derby) out.push(W?sns(1,opp+"전 이겼다!! 이거 하나로 한 달은 버틴다 ㅋㅋ"):L?sns(-1,"더비를 지다니… 오늘은 잠 못 잘 듯"):sns(0,"더비는 비겨도 찝찝하다"));
  if(hat) out.push(sns(1,hat[0]+" 해트트릭!!! 오늘 경기장 뒤집어졌다"));
  if(W&&d>=3) out.push(sns(1,g.f+":"+g.a+" 대승. 오늘 같은 경기면 걱정이 없다"));
  else if(L&&d<=-3) out.push(sns(-1,g.f+":"+g.a+"… 이건 감독이 설명해야 한다"));
  else if(W) out.push(sns(1,rnd(["이겼다! 승점 3점 챙겼다","경기 내용은 별로여도 이기면 장땡 ㅋㅋ","오늘도 집에 가는 길이 가볍다"])));
  else if(L) out.push(sns(-1,rnd(["아 진짜 이걸 지네… 슈팅은 많았는데","오늘은 뭐가 안 풀렸다 ㅠㅠ","다음 경기 보고 판단하자, 일단 오늘은 아쉽다"])));
  else out.push(sns(0,rnd(["무승부… 이긴 것도 진 것도 아닌 애매한 기분","승점 1점이라도 챙긴 걸로 위안을 삼자"])));
  if(g.mom) out.push(sns(1,"오늘 MOM은 "+g.mom+" 인정"));
  if(g.rs&&g.rs.length) out.push(fmk(-1,g.rs[0]+" 퇴장은 너무 아쉽다. 팀을 어렵게 만들었다"));
  return out.slice(0,3);
}

/* ================= 기자회견 ================= */
/* 답변 효과: f 팬 신뢰 / p 언론 / s 선수단 사기. goal 은 이번 시즌 목표(시즌 끝에 달성 여부를 따져요) */
const GOALS_K1=[{id:"title",label:"우승",f:4,p:3,s:2,text:"우승을 목표로 합니다. 이 선수들이면 가능하다고 생각합니다."},
 {id:"top3",label:"3위 이내",f:2,p:1,s:1,text:"3위 이내, 대륙 대회 진출권을 목표로 합니다."},
 {id:"mid",label:"중위권 이상",f:0,p:0,s:0,text:"일단 중위권 이상을 지키면서 팀을 만들어 가겠습니다."},
 {id:"safe",label:"잔류",f:-2,p:-1,s:-1,text:"잔류가 첫 번째 목표입니다. 한 경기씩 가겠습니다."}];
const GOALS_K2=[{id:"title",label:"우승·승격",f:4,p:3,s:2,text:"우승해서 곧바로 승격하겠습니다."},
 {id:"top3",label:"3위 이내",f:2,p:1,s:1,text:"3위 이내, 승격 경쟁에 끝까지 남겠습니다."},
 {id:"mid",label:"중위권 이상",f:0,p:0,s:0,text:"안정적으로 중위권 이상을 지키겠습니다."},
 {id:"safe",label:"하위권 탈출",f:-2,p:-1,s:-1,text:"먼저 하위권에서 벗어나는 것이 목표입니다."}];

function pre(c,S){
  const goals=c.div===1?GOALS_K1:GOALS_K2, qs=[];
  qs.push({kind:"goal",who:rnd(["박민철 기자(스포츠일간)","한서윤 기자(풋볼코리아)","오지훈 기자(KBN)"]),
    text:c.no===1?"감독님, 부임을 축하드립니다. 이번 시즌 목표를 말씀해 주시겠습니까?":"새 시즌이 시작됩니다. 지난 시즌을 돌아보면서 이번 시즌 목표를 말씀해 주세요.",
    answers:goals.map(g=>({label:g.text,goal:g.id,goalLabel:g.label,f:g.f,p:g.p,s:g.s}))});
  const xi=(S.xi||[]).filter(Boolean).slice().sort((a,b)=>b.ovr-a.ovr), ace=xi[0];
  if(ace) qs.push({kind:"ace",who:"이다은 기자(스포츠월드)",text:ace.name+" 선수에 대한 팀의 의존도가 높다는 평가가 있는데요, 어떻게 보십니까?",
    answers:[{label:"에이스는 에이스입니다. 우리 팀의 중심으로 믿고 갑니다.",f:1,p:1,s:ace.ovr>=80?2:0},
             {label:"한 선수에게 기대지 않습니다. 팀 전체가 같이 이겨야 합니다.",f:1,p:0,s:1},
             {label:"그 정도로 잘하면 의존해도 되는 것 아닙니까? (웃음)",f:0,p:2,s:-1}]});
  const dby=(window.KL_DERBIES||[])[0], riv=c.div===1&&dby?dby[2]:null;
  qs.push({kind:"rival",who:"정우진 기자(일간스포츠)",text:riv?"이번 시즌 '"+riv+"' 같은 라이벌전이 있습니다. 팬들의 기대가 큰데 각오를 들려주세요.":"올 시즌 가장 경계하는 상대가 있다면 어디입니까?",
    answers:[{label:"팬들이 가장 기다리는 경기입니다. 무조건 이기겠습니다.",f:3,p:2,s:-1},
             {label:"상대를 존중합니다. 우리 경기만 하면 결과는 따라옵니다.",f:0,p:0,s:1},
             {label:"특정 팀은 의식하지 않습니다. 모든 경기가 똑같이 중요합니다.",f:-1,p:0,s:1}]});
  return qs;
}
function post(R){
  const rank=R.rank, N=R.N||12, good=rank<=3, bad=rank>N-2, qs=[];
  qs.push({kind:"review",who:"박민철 기자(스포츠일간)",
    text:good?"시즌을 마친 소감을 들려주세요. 성적에 만족하십니까?":bad?"성적이 기대에 못 미쳤습니다. 책임을 어떻게 생각하십니까?":"무난한 성적으로 마무리했는데요, 스스로 점수를 준다면 몇 점입니까?",
    answers: good?[{label:"선수들 덕분입니다. 하지만 아직 배고픕니다. 더 높은 곳을 보겠습니다.",f:2,p:1,s:2},{label:"만족합니다. 이 성적은 모두의 노력의 결과입니다.",f:2,p:0,s:1},{label:"더 잘할 수 있었다고 생각합니다. 반성할 부분도 있습니다.",f:1,p:2,s:0}]
     : bad?[{label:"모든 책임은 제게 있습니다. 비시즌에 바꾸겠습니다.",f:2,p:2,s:-1},{label:"부상과 운이 따르지 않은 부분도 있었습니다.",f:-2,p:-2,s:1},{label:"선수들도 각자 돌아봐야 합니다.",f:-1,p:0,s:-3}]
     :[{label:"60점입니다. 개선할 부분이 분명히 보였습니다.",f:1,p:1,s:0},{label:"나쁘지 않았습니다. 내년이 더 기대됩니다.",f:1,p:0,s:1},{label:"점수를 매기기 어렵습니다. 결과가 말해 줄 겁니다.",f:-1,p:-1,s:0}]});
  qs.push({kind:"next",who:"한서윤 기자(풋볼코리아)",text:"비시즌 계획을 말씀해 주세요. 선수단에 변화가 있을까요?",
    answers:[{label:"과감하게 보강하겠습니다. 필요한 자리는 확실히 채우겠습니다.",f:2,p:1,s:1},{label:"지금 선수들을 믿습니다. 큰 변화는 없을 겁니다.",f:0,p:0,s:2},{label:"냉정하게 평가해 정리할 선수는 정리하겠습니다.",f:1,p:1,s:-2}]});
  return qs;
}
/* ================= 시즌 이벤트 (선수단·구단·언론) =================
 * 시즌이 시작되기 전에 일어나는 사건들. 선택지마다 성공 확률(chance)이 있으면 확률로 결과가 갈려요.
 * 효과는 f 팬 신뢰 · p 언론 · s 선수단 사기 (선수단 사기는 팀 전력에 그대로 반영돼요).
 * 시즌 막판의 '결정적 순간' 인터뷰(pivot)는 시즌 결과가 나온 뒤, 결과를 보여주기 전에 한 번 나와요. */
const EVENTS=[
 {id:"bench",pos:false,who:"라커룸 소식",text:"벤치에 앉아 있던 한 베테랑이 출전 시간에 불만을 드러냈다는 소문이 돌아요.",
  answers:[{label:"개인 면담으로 풀겠다",chance:70,win:{f:0,p:0,s:3},lose:{f:0,p:0,s:-3},ok:"진솔한 대화로 오해가 풀렸어요.",no:"면담이 오히려 불만을 키웠어요."},
           {label:"경쟁은 당연하다고 선을 긋는다",chance:45,win:{f:1,p:1,s:2},lose:{f:0,p:-2,s:-5},ok:"단호한 리더십이 먹혔어요.",no:"선수단 분위기가 얼어붙었어요."},
           {label:"출전 기회를 약속한다",chance:100,win:{f:-1,p:0,s:2},ok:"불만은 가라앉았지만 전술 부담이 생겼어요."}]},
 {id:"clash",pos:false,who:"훈련장 소식",text:"훈련 중 베테랑과 신예가 크게 부딪혔어요. 선수단이 술렁입니다.",
  answers:[{label:"주장단에게 중재를 맡긴다",chance:65,win:{f:0,p:0,s:4},lose:{f:0,p:0,s:-2},ok:"주장단이 잘 수습했어요.",no:"중재가 편파라는 말이 나왔어요."},
           {label:"둘 다 불러 엄하게 경고한다",chance:50,win:{f:0,p:1,s:1},lose:{f:0,p:0,s:-4},ok:"분위기가 단번에 정리됐어요.",no:"감독에 대한 반감이 생겼어요."}]},
 {id:"sponsor",pos:true,who:"구단 프런트",text:"새 스폰서가 후원금을 크게 늘렸어요. 어디에 쓸까요?",
  answers:[{label:"훈련 시설과 의무팀에 투자한다",chance:100,win:{f:0,p:0,s:4},ok:"선수단이 환영했어요."},
           {label:"팬 서비스와 이벤트에 쓴다",chance:100,win:{f:4,p:1,s:0},ok:"팬들의 호응이 컸어요."}]},
 {id:"banner",pos:true,who:"서포터즈",text:"서포터즈가 경기장 전체를 덮는 대형 걸개를 준비했다고 알려 왔어요.",
  answers:[{label:"선수단과 함께 감사 인사를 한다",chance:100,win:{f:3,p:0,s:3},ok:"가슴 벅찬 분위기가 만들어졌어요."}]},
 {id:"press",pos:false,who:"언론 소식",text:"한 매체가 팀 전술을 비판하는 악의적인 기사를 냈어요.",
  answers:[{label:"기자회견에서 정면 반박한다",chance:40,win:{f:2,p:3,s:2},lose:{f:-1,p:-4,s:-1},ok:"논리적인 반박이 오히려 호평을 받았어요.",no:"괜한 논란만 키웠어요."},
           {label:"대응하지 않는다",chance:100,win:{f:0,p:-1,s:1},ok:"선수들은 흔들리지 않았어요."}]},
 {id:"camp",pos:true,who:"코칭스태프",text:"코치진이 단합을 위한 전지훈련을 제안했어요.",
  answers:[{label:"선수단 MT를 겸해 다녀온다",chance:100,win:{f:0,p:0,s:4},ok:"선수들이 한결 가까워졌어요."},
           {label:"훈련만 집중해서 간다",chance:100,win:{f:0,p:0,s:1},ok:"훈련 강도가 올랐어요."}]},
 {id:"rookie",pos:true,who:"유소년 코치",text:"유스 출신 신예가 훈련에서 눈에 띄는 활약을 하고 있어요.",
  answers:[{label:"기회를 준다",chance:60,win:{f:2,p:1,s:3},lose:{f:0,p:0,s:-1},ok:"신예가 팀에 활력을 불어넣었어요.",no:"아직은 시기상조였어요."},
           {label:"더 지켜본다",chance:100,win:{f:0,p:0,s:1},ok:"차분히 기다리기로 했어요."}]},
 {id:"ace",pos:false,who:"이적 시장",text:"에이스를 향한 이적설이 연일 보도되고 있어요.",
  answers:[{label:"직접 만나 잔류를 설득한다",chance:55,win:{f:2,p:1,s:3},lose:{f:-2,p:0,s:-4},ok:"에이스가 팀에 남기로 마음먹었어요.",no:"설득이 통하지 않아 분위기만 어수선해졌어요."},
           {label:"협상은 구단에 맡긴다",chance:100,win:{f:-1,p:1,s:-1},ok:"감독은 경기에만 집중하기로 했어요."}]},
 {id:"owner",pos:false,who:"구단 수뇌부",text:"구단 고위층이 이번 시즌 더 높은 성적을 은근히 요구하고 있어요.",
  answers:[{label:"자신 있다고 답한다",chance:50,win:{f:2,p:2,s:1},lose:{f:-1,p:-2,s:-2},ok:"자신감이 신뢰를 샀어요.",no:"부담만 키운 말이 됐어요."},
           {label:"현실적인 목표를 설명한다",chance:100,win:{f:0,p:0,s:2},ok:"차분한 설명에 선수단이 안도했어요."}]},
 {id:"fans",pos:true,who:"팬 커뮤니티",text:"팬 대표들이 감독과의 대화 자리를 요청했어요.",
  answers:[{label:"기꺼이 만난다",chance:75,win:{f:4,p:1,s:1},lose:{f:-1,p:0,s:0},ok:"솔직한 대화로 신뢰가 쌓였어요.",no:"기대만큼의 반응은 아니었어요."},
           {label:"경기 결과로 보여주겠다고 한다",chance:100,win:{f:0,p:0,s:1},ok:"말 대신 결과로 가기로 했어요."}]},
];
function events(c,S){
  const out=[]; const pool=EVENTS.slice(); const n=Math.random()<.72?(Math.random()<.28?2:1):0; const used=c.evSeen||(c.evSeen=[]);
  for(let i=0;i<n;i++){
    const cand=pool.filter(e=>!used.includes(e.id)); const src=cand.length?cand:pool; const e=src[Math.floor(Math.random()*src.length)];
    pool.splice(pool.indexOf(e),1); used.push(e.id); if(used.length>6) used.shift();
    out.push({kind:"event",pos:e.pos,who:e.who,text:e.text,answers:e.answers.map(a=>Object.assign({},a))});
  }
  return out;
}
/* 시즌 막판 결정적 순간 (결과가 나온 뒤 · 공개 전) */
function pivot(R,c){
  const N=R.N||12, qs=[]; const t=(R.table||[]);
  const me=t.findIndex(x=>x.me); if(me<0) return qs; const pts=i=>t[i]?t[i].pts:0;
  if(R.rank===1 && t[1] && pts(0)-pts(1)<=3) qs.push({kind:"title",who:"우승 직후 중계 인터뷰",text:"마지막 순간까지 숨 막히는 우승 경쟁 끝에 정상에 올랐습니다! 지금 기분이 어떠십니까?",
    answers:[{label:"선수들이 만든 기적입니다. 팬 여러분께 이 우승을 바칩니다!",f:3,p:1,s:2},{label:"끝까지 믿어 준 구단에 감사드립니다.",f:1,p:2,s:1},{label:"아직 시즌이 끝난 것 같지 않네요. 눈물이 나서 말이 안 나옵니다…",f:2,p:0,s:3}]});
  else if(R.rank===2 && pts(0)-pts(1)<=3) qs.push({kind:"close",who:"시즌 종료 직후 인터뷰",text:"승점 "+(pts(0)-pts(1))+"점 차이로 우승을 놓쳤습니다. 지금 선수들에게 어떤 말을 해 주고 싶으신가요?",
    answers:[{label:"끝까지 최선을 다했습니다. 내년에는 반드시 정상에 서겠습니다.",f:2,p:1,s:2},{label:"운이 따르지 않았습니다. 하지만 결과는 인정합니다.",f:0,p:1,s:0},{label:"아쉬움이 너무 큽니다… 오늘은 말하지 않겠습니다.",f:-1,p:-1,s:-1}]});
  const safe=t[N-3]; if(R.div===1&&R.rank>=N-2&&safe&&pts(N-3)-pts(me)<=4) qs.push({kind:"relegation",who:"강등 결정전 후 인터뷰",text:"강등권 싸움의 마지막 라운드가 끝났습니다. 결과를 어떻게 받아들이십니까?",
    answers:R.rank>=N?[{label:"모든 책임은 제게 있습니다. 다시 돌아오겠습니다.",f:2,p:2,s:-1},{label:"선수들은 최선을 다했습니다. 비판은 제가 받겠습니다.",f:1,p:1,s:2}]
      :[{label:"선수들이 정말 기특합니다. 잔류가 목표 이상의 성과입니다!",f:3,p:1,s:3},{label:"아슬아슬했습니다. 내년에는 이런 일이 없도록 준비하겠습니다.",f:1,p:1,s:1}]});
  if(R.fa&&R.fa.champion) qs.push({kind:"fa",who:"FA컵 우승 직후 인터뷰",text:"FA컵을 들어올렸습니다! 이번 우승의 의미는 무엇일까요?",
    answers:[{label:"선수단 전체가 로테이션하면서 함께 이룬 우승입니다.",f:2,p:1,s:3},{label:"팬들이 응원해 주신 덕분입니다. 이 트로피를 팬들에게 돌려드립니다.",f:4,p:0,s:1}]});
  return qs;
}
/* 시즌 목표 판정 + 평판 갱신 */
function settle(R,c){
  const N=R.N||12, rank=R.rank, g=c.goal; c.rep=c.rep||{fans:50,press:50,squad:50}; const r=c.rep;
  const ok={title:rank===1,top3:rank<=3,mid:rank<=Math.ceil(N/2),safe:rank<=N-2};
  c.goalResult=g?{ok:!!ok[g.id],label:g.label}:null;
  if(g){ const big=g.id==="title"?1.5:g.id==="top3"?1.2:1; if(ok[g.id]){ r.fans+=4*big; r.press+=3*big; r.squad+=2*big; } else { r.fans-=5*big; r.press-=4*big; r.squad-=3*big; } }
  const d=rank<=3?3:rank<=Math.ceil(N/2)?1:rank<=N-2?-1:-4; r.fans+=d; r.squad+=d*.7; r.press+=d*.5;
  if(R.fa&&R.fa.champion){ r.fans+=2; r.squad+=1; } if(R.acl&&R.acl.champion){ r.fans+=3; r.press+=2; }
  ["fans","press","squad"].forEach(k=>{ r[k]=clamp(Math.round(r[k]*10)/10,0,100); });
  return c.goalResult;
}
function apply(c,ans){ c.rep=c.rep||{fans:50,press:50,squad:50}; const r=c.rep;
  if(ans.chance!=null){ const hit=Math.random()*100<ans.chance; const e=hit?ans.win:(ans.lose||ans.win); r.fans=clamp(r.fans+(e.f||0),0,100); r.press=clamp(r.press+(e.p||0),0,100); r.squad=clamp(r.squad+(e.s||0),0,100); return {hit,text:hit?ans.ok:(ans.no||ans.ok),eff:e}; }
  r.fans=clamp(r.fans+(ans.f||0),0,100); r.press=clamp(r.press+(ans.p||0),0,100); r.squad=clamp(r.squad+(ans.s||0),0,100);
  if(ans.goal) c.goal={id:ans.goal,label:ans.goalLabel}; }
/* 다음 시즌 시작 전, 평판이 보통(50)쪽으로 조금 돌아가요 */
function drift(c){ if(!c.rep) return; ["fans","press","squad"].forEach(k=>{ c.rep[k]=Math.round((c.rep[k]+(50-c.rep[k])*.2)*10)/10; }); }
/* 선수단 사기가 팀 계산에 주는 보정 (±1.2) */
function moraleFx(c){ const s=c&&c.rep?c.rep.squad:50; return clamp((s-50)/50*1.2,-1.2,1.2); }

window.KLFans={season,match};
window.KLPress={pre,post,settle,apply,drift,moraleFx,events,pivot};
})();

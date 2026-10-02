/*
 * K-라이프 시즌 이벤트 (js/life/events.js)
 * 구간(전반기·중반기·후반기·시즌 마무리)이 끝날 때마다 일정 확률로 이벤트가 하나 나와요. 나이대(중학생·고등학생·대학생·프로)에 맞는 이야기만 나와요.
 * 확률 규칙(화면의 '확률 도감'에도 적혀 있어요):
 *   - 이벤트가 나올 확률: 전반기 70% · 중반기 55% · 후반기 70% · 시즌 마무리 55%. 한 번 나온 이벤트는 그 인생에서 다시 나오지 않아요.
 *   - 선택지에 적힌 % 가 실제 성공 확률이에요. 1~100 사이 주사위를 굴려서 그 값 이하면 성공. 숨은 보정은 없어요.
 *   - '안전한 선택'은 주사위 없이 확정돼요. 대신 좋은 효과가 60%로 줄고, 30% 확률로 작은 대가(사기 −3 / 감독 신뢰 −1 / 인기 −2 중 하나)가 따라와요.
 *   - 결과 수치는 표시값의 70~130% 사이로 조금씩 달라져요.
 */
(function(){
"use strict";
const L=window.LIFE, {rnd,ri,pick,clamp,r1}=L;
const RIVAL="김동현";
const SEG_P={h1:.70,h2:.55,h3:.70,h4:.55};

function scale(v,f){ return v==null?0:Math.round(v*f); }
function eff(S,e,f){
  f=f||1; const p=S.p, out=[]; const add=(lab,v)=>{ if(v) out.push(lab+" "+(v>0?"+":"")+v); };
  const m=k=>scale(e[k],f);
  if(e.morale){ const v=m("morale"); S.morale=clamp(S.morale+v,0,100); add("사기",v); }
  if(e.cond){ const v=m("cond"); S.cond=clamp(S.cond+v,0,100); add("컨디션",v); }
  if(e.fame){ const v=m("fame"); S.fame=clamp(S.fame+v,0,100); add("인기",v); }
  if(e.rep){ const v=m("rep"); S.rep=clamp(S.rep+v,0,100); add("평판",v); }
  if(e.trust){ const v=m("trust"); S.trust=clamp(S.trust+v/100,.05,.95); add("감독 신뢰",v); }
  if(e.funds){ S.funds=r1(Math.max(0,S.funds+e.funds)); out.push("자금 "+(e.funds>0?"+":"")+e.funds+"억"); }
  if(e.pot){ p.pot=clamp(p.pot+e.pot,p.ovr,99); add("잠재력",e.pot); }
  if(e.stat){ const d=L.POSDEF[p.pos]; const st=d.stats[ri(0,d.stats.length-1)]; p.stats[st[0]]=clamp(p.stats[st[0]]+e.stat,10,99); p.ovr=L.ovrOf(p); out.push(st[1]+" "+(e.stat>0?"+":"")+e.stat); }
  if(e.ug&&S.sim&&S.p.pos!=="GK"){ const r=[...S.sim.recs].reverse().find(x=>x.cup==="ucl"&&x.min>0); if(r){ r.g++; S.sim.my.g++; out.push("챔피언스리그 골 +1"); } }
  if(e.inj){ if(S.sim) S.sim.out+=e.inj; out.push("결장 "+e.inj+"경기"); }
  if(e.fam&&S.family){ S.family.pts=Math.max(0,S.family.pts+e.fam); out.push("가정 지원 포인트 "+(e.fam>0?"+":"")+e.fam); }
  return out;
}
L.applyEffects=eff;

const young=S=>L.age(S)<=15&&S.stage==="youth", teen=S=>S.stage==="youth"&&L.age(S)>=16, univ=S=>S.stage==="univ", pro=S=>S.stage==="pro", minor=S=>S.stage==="youth";
const A=(label,o)=>Object.assign({label},o);
L.EVC={young,teen,univ,pro,minor}; L.EVA=A; L.EVPOOL=[];   // 선택지 만들기
/* 이벤트 정의: id, w(가중치), when, who(상황 한 줄), title, body, opts */
const POOL=[
 /* ---- 중학생 (13~15세) ---- */
 {id:"boomboom",w:3,when:young,title:"붐붐차의 등장!",body:"훈련이 끝나기 무섭게 정문 앞에 노란 간식 트럭 '붐붐차'가 나타났어요. 호떡 냄새가 코를 찌릅니다.",
  opts:[A("한 입만 사 먹는다",{p:100,win:{morale:6,cond:-2},ok:"달콤한 호떡에 힘이 났어요. 배는 좀 무겁지만요."}),
        A("참고 개인 훈련을 더 한다",{p:70,win:{stat:1,morale:-1},lose:{morale:-4},ok:"유혹을 이겨냈어요. 발끝이 한결 가벼워졌어요.",no:"배고픔에 집중이 안 됐어요."}),
        A("친구들과 나눠 먹는다",{safe:true,win:{morale:5,trust:2},ok:"웃음꽃이 핀 간식 시간이었어요."})]},
 {id:"shoe",w:2,when:young,title:"운동화가 입을 벌렸다",body:"경기 직전, 밑창이 쩍 벌어졌어요. 새 신발은 아직 없어요.",
  opts:[A("테이프로 칭칭 감고 뛴다",{p:55,win:{morale:3,stat:1},lose:{cond:-6,inj:1,morale:-3},ok:"헐렁한 신발로도 불꽃같이 뛰었어요.",no:"발목이 삐끗했어요."}),
        A("코치님께 솔직히 말한다",{safe:true,win:{trust:3,morale:2},ok:"코치님이 예비 신발을 빌려주셨어요."})]},
 {id:"lunch",w:2,when:young,title:"급식실 반찬 걸고 한 판",body:"형들이 급식 반찬 하나를 걸고 키핑 대결을 제안했어요.",
  opts:[A("받아들인다",{p:50,win:{morale:6,fame:1,stat:1},lose:{morale:-4},ok:"소시지를 두 개나 얻었어요!",no:"볼을 뺏기고 말았어요. 오늘 급식은 밥뿐이에요."}),
        A("정중히 거절한다",{safe:true,win:{trust:2},ok:"괜히 다치지 않는 게 낫죠."})]},
 {id:"eyes",w:2,when:young,title:"눈 감고 드리블 특훈",body:"코치님이 안대를 건네며 '이 훈련만 통과하면 달라질 거다'라고 해요.",
  opts:[A("도전한다",{p:60,win:{stat:1,morale:3},lose:{morale:-3,cond:-3},ok:"볼 감각이 확 열렸어요.",no:"콘에 걸려 넘어졌어요."}),
        A("차근차근 눈을 뜨고 한다",{safe:true,win:{stat:1},ok:"기본기가 한 칸 단단해졌어요."})]},
 {id:"sleepy",w:2,when:young,title:"교실에서 꾸벅꾸벅",body:"전날 훈련의 피로로 수업 시간에 졸다가 선생님께 걸렸어요.",
  opts:[A("솔직히 사과하고 졸음을 쫓는다",{p:80,win:{morale:1,trust:2},lose:{morale:-3},ok:"선생님이 웃으며 넘어가 주셨어요.",no:"반 전체가 보는 앞에서 한 소리 들었어요."}),
        A("모른 척 계속 잔다",{p:25,win:{cond:8},lose:{morale:-6,fam:-1},ok:"운 좋게 꿀잠을 잤어요.",no:"결국 부모님께 연락이 갔어요."})]},
 {id:"street",w:2,when:young,title:"동네 형들의 2대2 길거리 축구",body:"골목에서 동네 형들이 한 명이 모자라다며 불러 세웠어요.",
  opts:[A("끼어서 뛴다",{p:65,win:{stat:1,morale:5},lose:{cond:-4,morale:-1},ok:"골목 구석구석이 드리블 연습장이 됐어요.",no:"미끄러져서 무릎이 까졌어요."}),
        A("구경만 한다",{safe:true,win:{morale:1},ok:"박수 치며 응원했어요."})]},
 {id:"letter",w:1,when:young,title:"후배의 쪽지",body:"동네 축구교실 꼬마가 '언젠가 형처럼 되고 싶어요'라는 쪽지를 건넸어요.",
  opts:[A("답장을 써 준다",{safe:true,win:{morale:6,trust:1},ok:"가슴이 따뜻해졌어요. 더 열심히 해야겠어요."})]},
 {id:"puberty",w:2,when:young,title:"사춘기, 이유 없는 짜증",body:"오늘따라 모든 게 귀찮고 짜증이 나요. 훈련에 집중이 안 돼요.",
  opts:[A("달리기로 풀어본다",{p:70,win:{morale:4,cond:-3,stat:1},lose:{morale:-3},ok:"땀에 짜증이 씻겨 내려갔어요.",no:"더 지치기만 했어요."}),
        A("친구와 수다를 떤다",{safe:true,win:{morale:5},ok:"웃고 나니 한결 나아졌어요."})]},
 {id:"snack",w:1,when:minor,title:"합숙소 야식 사건",body:"몰래 라면을 끓이다 사감 선생님께 딱 걸렸어요. 냄새가 문제였어요.",
  opts:[A("순순히 자수한다",{safe:true,win:{trust:2,morale:-1},ok:"반성문 한 장으로 끝났어요."}),
        A("룸메이트 탓을 한다",{p:35,win:{morale:2},lose:{trust:-5,morale:-4},ok:"룸메이트가 순순히 대신 혼나 줬어요.",no:"결국 둘 다 혼났고 의리가 깨졌어요."})]},
 {id:"scoutrumor",w:2,when:minor,title:"관중석에 낯선 어른들",body:"오늘 경기 관중석에 수첩을 든 어른들이 앉아 있었어요. 스카우터일지도 몰라요.",
  opts:[A("평소처럼 한다",{safe:true,win:{trust:2},ok:"침착하게 제 플레이를 했어요."}),
        A("눈에 띄게 화려하게 뛴다",{p:45,win:{fame:4,morale:4,trust:2},lose:{morale:-4,trust:-3},ok:"화려한 플레이로 시선을 끌었어요!",no:"과욕이 실수로 이어졌어요."})]},
 /* ---- 고등학생 (16~18세) ---- */
 {id:"exam",w:3,when:teen,title:"수능이냐, 축구냐",body:"담임 선생님이 상담에서 '축구가 안 풀릴 때를 대비해 공부도 챙기자'고 하세요.",
  opts:[A("매일 한 시간씩 공부한다",{p:75,win:{morale:2,trust:2,cond:-3},lose:{cond:-5,morale:-2},ok:"성적이 조금 올라 걱정이 줄었어요.",no:"체력만 깎이고 성적은 그대로예요."}),
        A("축구에만 집중하겠다고 말한다",{p:40,win:{stat:1,morale:3},lose:{trust:-3,morale:-4,fam:-1},ok:"선생님이 응원해 주셨어요.",no:"부모님 귀에 들어가 한바탕 난리가 났어요."}),
        A("시간표를 짜서 둘 다 챙긴다",{safe:true,win:{morale:1,trust:2},ok:"빠듯하지만 균형을 잡았어요."})]},
 {id:"roommate",w:2,when:teen,title:"룸메이트의 코골이 지진",body:"기숙사 룸메이트의 코골이가 새벽마다 벽을 흔들어요. 잠을 못 자겠어요.",
  opts:[A("귀마개를 끼고 버틴다",{safe:true,win:{cond:2},ok:"그래도 어찌어찌 잠들었어요."}),
        A("솔직하게 이야기한다",{p:70,win:{cond:6,morale:2},lose:{morale:-3},ok:"룸메이트가 미안하다며 자세를 바꿔 줬어요.",no:"서로 어색해졌어요."})]},
 {id:"schoolpaper",w:1,when:teen,title:"교내 신문 인터뷰",body:"교내 신문부 기자가 '우리 학교 유망주'를 인터뷰하고 싶대요.",
  opts:[A("당당하게 응한다",{p:75,win:{fame:3,morale:3},lose:{morale:-2},ok:"학교 복도에서 인사를 받기 시작했어요.",no:"오타투성이 기사에 한참 놀림받았어요."}),
        A("훈련이 바빠 사양한다",{safe:true,win:{trust:2},ok:"훈련에 더 집중하기로 했어요."})]},
 {id:"abroadscout",w:2,when:S=>!!L.overseasYouthOffer(S),title:"프리미어리그 스카우터의 방문",body:"영국에서 날아온 스카우터가 당신의 경기를 보고 갔어요. 아카데미 입단을 제안하고 싶대요.",
  dynamic:"abroad"},
 {id:"crush",w:1,when:teen,title:"복도의 설렘",body:"같은 반 친구가 경기 응원을 오겠다고 했어요. 괜히 신경이 쓰여요.",
  opts:[A("멋진 모습을 보여주겠다고 다짐한다",{p:55,win:{morale:6,stat:1},lose:{morale:-4,cond:-2},ok:"응원에 힘입어 펄펄 날았어요.",no:"긴장해서 볼이 발에 안 붙었어요."}),
        A("평소처럼 마음을 비운다",{safe:true,win:{morale:2},ok:"차분하게 경기를 치렀어요."})]},
 {id:"uncle",w:1,when:teen,title:"삼촌의 한마디",body:"명절에 삼촌이 '운동으로 먹고사는 건 하늘의 별 따기'라며 걱정을 늘어놓아요.",
  opts:[A("꼭 해내겠다고 선언한다",{p:50,win:{morale:6,trust:2},lose:{morale:-5},ok:"가족들이 박수를 쳐 줬어요.",no:"분위기만 어색해졌어요."}),
        A("웃으며 넘긴다",{safe:true,win:{morale:1},ok:"웃어넘기고 마음에 새겼어요."})]},
 {id:"finaleve",w:2,when:teen,title:"결승 전날 밤",body:"내일은 전국대회 결승. 잠이 오지 않아요.",
  opts:[A("볼을 들고 운동장에 나간다",{p:55,win:{morale:4,stat:1},lose:{cond:-6},ok:"달빛 아래서 감각을 깨웠어요.",no:"더 잠이 오지 않아 피곤해졌어요."}),
        A("눈을 감고 상상 훈련을 한다",{safe:true,win:{morale:2,cond:2},ok:"머릿속으로 골을 수십 번 넣었어요."})]},
 /* ---- 대학생 ---- */
 {id:"clubactivity",w:2,when:univ,title:"동아리 축구와 과제 사이",body:"과제 마감과 동아리 친선전이 같은 날이에요.",
  opts:[A("둘 다 해낸다",{p:50,win:{morale:5,fame:1},lose:{cond:-8,morale:-4},ok:"밤샘 끝에 둘 다 해냈어요!",no:"코피가 터지고 말았어요."}),
        A("친선전을 포기한다",{safe:true,win:{trust:2},ok:"과제를 무사히 제출했어요."})]},
 {id:"parttime",w:2,when:univ,title:"아르바이트 제안",body:"학교 근처 카페에서 단기 아르바이트 제안이 왔어요. 용돈이 필요하긴 해요.",
  opts:[A("한 달만 해 본다",{p:70,win:{funds:.1,morale:2,cond:-4},lose:{cond:-8,morale:-2},ok:"용돈이 조금 모였어요.",no:"체력만 바닥나고 말았어요."}),
        A("훈련에 집중한다",{safe:true,win:{trust:2},ok:"훈련 시간을 지켰어요."})]},
 /* ---- 프로 ---- */
 {id:"mascot",w:2,when:pro,title:"마스코트와 승부차기",body:"구단 행사에서 마스코트 인형과 승부차기를 하게 됐어요. 팬들이 카메라를 들고 있어요.",
  opts:[A("진지하게 전력으로 찬다",{p:60,win:{fame:4,morale:3},lose:{fame:-2,morale:-2},ok:"마스코트의 한 방! 팬들이 폭소했어요.",no:"크로스바를 맞고 마스코트가 춤을 췄어요."}),
        A("일부러 져 준다",{safe:true,win:{fame:2,morale:2},ok:"관중석이 박수로 가득 찼어요."})]},
 {id:"live",w:2,when:pro,title:"라이브 방송 중 말실수",body:"팬들과의 라이브 중에 무심코 던진 한마디가 캡처돼 퍼지고 있어요.",
  opts:[A("바로 영상으로 해명한다",{p:60,win:{fame:2,rep:1,morale:1},lose:{fame:-4,rep:-2},ok:"솔직한 해명에 오히려 호감이 올랐어요.",no:"해명이 또 다른 불씨가 됐어요."}),
        A("구단 홍보팀에 맡긴다",{safe:true,win:{trust:1,rep:1},ok:"홍보팀이 깔끔히 수습했어요."})]},
 {id:"toast",w:1,when:pro,title:"회식 건배사 당첨",body:"팀 회식에서 갑자기 건배사 순서가 돌아왔어요.",
  opts:[A("패기 있게 외친다",{p:65,win:{morale:5,trust:2},lose:{morale:-3,fame:-1},ok:"선수단이 한목소리로 따라 외쳤어요.",no:"분위기가 한순간 얼어붙었어요."}),
        A("짧게 한마디만 한다",{safe:true,win:{morale:2},ok:"무난하게 넘어갔어요."})]},
 {id:"wedding",w:1,when:pro,title:"동료의 결혼식 사회",body:"가까운 동료가 결혼식 사회를 부탁했어요.",
  opts:[A("흔쾌히 맡는다",{p:70,win:{morale:5,trust:2},lose:{morale:-2},ok:"센스 있는 진행으로 칭찬받았어요.",no:"축가 순서를 헷갈렸어요."}),
        A("정중히 사양한다",{safe:true,win:{},ok:"축의금으로 마음을 전했어요."})]},
 {id:"tactic",w:2,when:pro,title:"감독의 실험 전술",body:"새 전술 실험으로 포지션을 낯선 자리로 옮겨 보겠대요.",
  opts:[A("적극적으로 도전한다",{p:55,win:{stat:1,trust:4,morale:2},lose:{morale:-4,trust:-2},ok:"새 포지션에서 눈을 떴어요.",no:"어색한 위치에서 헤맸어요."}),
        A("기존 역할을 지키고 싶다고 말한다",{safe:true,win:{trust:1},ok:"감독이 고개를 끄덕였어요."})]},
 {id:"arcade",w:1,when:pro,title:"라커룸 오락기 사건",body:"라커룸에 몰래 들여온 오락기에 선수단 전체가 빠져들었어요.",
  opts:[A("랭킹 1위에 도전한다",{p:50,win:{morale:6,trust:1},lose:{cond:-4,morale:-1},ok:"선수단 최고 기록을 세웠어요!",no:"밤을 새고 컨디션이 엉망이에요."}),
        A("가끔만 즐긴다",{safe:true,win:{morale:2},ok:"적당히 즐겼어요."})]},
 {id:"ref",w:2,when:pro,title:"억울한 판정",body:"경기 막판 명백한 파울이 선언되지 않았어요. 주심에게 항의할까요?",
  opts:[A("강하게 항의한다",{p:35,win:{fame:3,morale:2},lose:{trust:-4,rep:-2,inj:1},ok:"팬들은 속이 시원하다고 했어요.",no:"경고를 받고 징계 위기에 놓였어요."}),
        A("꾹 참는다",{safe:true,win:{trust:1,rep:1},ok:"프로답게 넘겼어요."})]},
 {id:"tube",w:1,when:S=>pro(S)&&S.fame>=18,title:"유튜브 채널 제안",body:"한 제작사가 선수 일상을 담은 채널을 같이 만들자고 제안했어요.",
  opts:[A("한번 해 본다",{p:60,win:{fame:6,funds:.2,cond:-3},lose:{fame:-2,trust:-3},ok:"구독자가 쑥쑥 늘고 있어요.",no:"훈련 소홀 논란이 일었어요."}),
        A("선수 생활에 집중한다",{safe:true,win:{trust:2},ok:"감독이 흐뭇해했어요."})]},
 {id:"rumor",w:2,when:S=>pro(S)&&S.fame>=15,title:"해외 이적설 기사",body:"한 해외 매체가 당신의 이름을 이적 후보로 거론했어요.",
  opts:[A("관심을 즐긴다",{p:50,win:{fame:5,rep:2},lose:{trust:-5,morale:-2},ok:"몸값이 오른다는 소문이 돌아요.",no:"구단 분위기가 싸늘해졌어요."}),
        A("지금 팀에 집중한다고 말한다",{safe:true,win:{trust:3,morale:1},ok:"구단과 팬이 흐뭇해했어요."})]},
 {id:"kids",w:1,when:pro,title:"아동센터 방문",body:"지역 아동센터에서 축구를 가르쳐 달라는 요청이 왔어요.",
  opts:[A("직접 가서 함께 뛴다",{p:90,win:{rep:3,fame:2,morale:4,cond:-2},lose:{cond:-4},ok:"아이들의 웃음소리가 오래 귓가에 남았어요.",no:"일정이 겹쳐 무리했어요."}),
        A("기부금만 전한다",{safe:true,win:{rep:1,funds:-.1},ok:"마음만이라도 전했어요."})]},
 {id:"pitch",w:1,when:pro,title:"잔디가 말이 아니다",body:"홈 구장 잔디 상태가 영 별로예요. 선수들이 불만을 쏟아내요.",
  opts:[A("구단에 정식으로 건의한다",{p:55,win:{trust:2,morale:3},lose:{trust:-2},ok:"구단이 곧바로 보수에 나섰어요.",no:"'선수가 왜 잔디 얘기를 하느냐'는 말을 들었어요."}),
        A("묵묵히 뛴다",{safe:true,win:{trust:1},ok:"프로답게 적응했어요."})]},
 {id:"boo",w:1,when:pro,title:"홈 팬의 야유",body:"연패 후 홈 경기에서 팬들의 야유가 쏟아졌어요.",
  opts:[A("경기 후 직접 다가가 인사한다",{p:60,win:{fame:2,morale:3},lose:{morale:-4,fame:-2},ok:"야유가 응원으로 바뀌었어요.",no:"야유가 더 커졌어요."}),
        A("묵묵히 라커룸으로 향한다",{safe:true,win:{trust:1},ok:"말없이 다음 경기를 준비했어요."})]},
 {id:"agent",w:1,when:S=>pro(S)&&S.fame>=12,title:"에이전트의 수상한 제안",body:"에이전트가 '조금만 크게 부풀리면 계약이 더 좋아진다'고 속삭여요.",
  opts:[A("정직하게 간다",{safe:true,win:{rep:2,trust:2},ok:"깨끗한 길을 택했어요."}),
        A("판을 키워 본다",{p:40,win:{funds:.3,fame:2},lose:{rep:-4,trust:-4},ok:"협상이 의외로 잘 풀렸어요.",no:"과장이 들통나 구설에 올랐어요."})]},
 {id:"fanday",w:1,when:S=>pro(S)&&S.fame>=10,title:"팬 데이",body:"구단이 팬과 함께하는 날을 열기로 했어요. 선수 대표로 나서 달래요.",
  opts:[A("선수단 대표로 나선다",{p:80,win:{fame:4,morale:4,cond:-3},lose:{cond:-5},ok:"팬들과 사진도 찍고 사인도 했어요.",no:"긴 하루에 지쳤어요."}),
        A("동료에게 양보한다",{safe:true,win:{trust:1},ok:"동료가 기쁘게 맡았어요."})]},
 /* ---- 공통 ---- */
 {id:"mentor",w:2,when:S=>L.age(S)<=23&&S.stage!=="youth"||teen(S),title:"선배의 비밀 노트",body:"선배가 자신의 낡은 훈련 노트를 건네요. 빼곡한 메모가 가득해요.",
  opts:[A("밤새 읽고 따라 해 본다",{p:80,win:{stat:1,pot:1,trust:2,cond:-2},lose:{cond:-4},ok:"한 줄 한 줄이 보약 같았어요.",no:"무리하다 몸살이 났어요."}),
        A("짬짬이 천천히 본다",{safe:true,win:{stat:1},ok:"차근차근 소화했어요."})]},
 {id:"slump",w:2,when:S=>S.morale<45,title:"슬럼프의 터널",body:"몇 경기째 마음먹은 대로 풀리지 않아요. 발이 천근만근이에요.",
  opts:[A("전문가와 상담한다",{p:75,win:{morale:12},lose:{morale:3},ok:"마음이 한결 가벼워졌어요.",no:"조금 나아졌어요."}),
        A("혼자 이겨 내 본다",{p:40,win:{morale:15,stat:1},lose:{morale:-6},ok:"스스로 벽을 넘었어요!",no:"한동안 더 힘들었어요."})]},
 {id:"fall",w:1,when:S=>S.cond<60,title:"몸이 보내는 신호",body:"훈련 중 종아리에 묵직한 통증이 느껴져요.",
  opts:[A("바로 의무팀에 알린다",{safe:true,win:{cond:8},ok:"큰일을 막았어요."}),
        A("참고 훈련한다",{p:45,win:{stat:1},lose:{inj:ri(2,5),morale:-4,cond:-8},ok:"통증이 가라앉았어요.",no:"결국 근육이 올라와 쉬게 됐어요."})]},
 /* ---- 가정 형편 (미성년·대학) ---- */
 {id:"famcrash",w:.9,when:S=>S.family&&(minor(S)||univ(S))&&S.family.pts>=4&&!S.famEv&&S.history.length>=2&&!(S.gen>1&&["rich","upper"].includes(S.family.id))&&(["rich","upper"].includes(S.family.id)?Math.random()<.2:true),title:"집안에 먹구름이 몰려왔어요",body:"부모님 사업이 크게 흔들렸어요. 훈련비와 용돈이 눈에 띄게 줄어듭니다.",
  opts:[A("장학금에 도전한다",{p:"schol",win:{fam:-1,morale:3,trust:2},lose:{fam:-3,morale:-6},ok:"장학 선발에 통과했어요! 학비 걱정을 덜었어요.",no:"장학 선발에서 떨어졌어요. 부모님께 죄송한 마음뿐이에요.",act:"quitRisk"}),
        A("아르바이트와 합숙으로 버틴다",{p:55,win:{fam:-1,morale:-2,trust:2},lose:{fam:-3,morale:-6,cond:-6},ok:"힘들지만 길을 찾았어요.",no:"버거운 한 해가 됐어요.",act:"quitRisk"}),
        A("운동을 접고 학업에 전념한다",{safe:true,win:{},ok:"눈물을 삼키며 축구화를 벗었어요.",act:"quitNow"})]},
 {id:"famboom",w:2.4,when:S=>S.family&&(minor(S)||univ(S))&&S.family.pts<12&&!S.famEv2&&S.famEv,title:"집안에 해가 들었어요",body:"부모님 일이 다시 풀리면서 뒷바라지를 더 해 줄 수 있게 되었어요.",
  opts:[A("감사히 받고 더 열심히 한다",{p:100,win:{fam:2,morale:4},ok:"지원 포인트가 늘었어요! 훈련 설정에서 다시 나눠 쓸 수 있어요."})]},
 {id:"famletter",w:.8,when:S=>S.family&&(minor(S)||univ(S)),title:"도시락과 편지",body:"경기장에 몰래 오신 부모님이 도시락과 손편지를 건네셨어요.",
  opts:[A("편지를 읽는다",{safe:true,win:{morale:7,trust:1},ok:"가슴이 따뜻해졌어요."})]},
 {id:"sponsoryouth",w:.8,when:S=>S.family&&S.family.pts<=5&&minor(S)&&S.fame>=6,title:"지역 후원자의 제안",body:"지역 기업인이 어려운 형편의 유망주를 돕고 싶다고 해요.",
  opts:[A("정중히 받아들인다",{p:85,win:{fam:2,fame:2},lose:{morale:-2},ok:"후원 덕에 지원 포인트가 늘었어요.",no:"사정이 있어 무산됐어요."}),
        A("스스로 해내겠다며 사양한다",{safe:true,win:{trust:2,morale:3},ok:"자존심을 지켰어요."})]},
 {id:"studypress",w:.8,when:S=>S.family&&teen(S)&&S.family.pts<=6&&!S.famEv3,title:"'공부해라' 최후통첩",body:"부모님이 성적표를 보시고 '이번 학기에도 이러면 축구는 끝'이라고 하셨어요.",
  opts:[A("약속하고 정말 공부한다",{p:65,win:{morale:-1,trust:2,cond:-4},lose:{cond:-6,morale:-3,fam:-1},ok:"성적이 올라 부모님이 한시름 놓으셨어요.",no:"두 마리 토끼를 쫓다 둘 다 놓쳤어요. 부모님의 지원이 줄었어요.",act:"quitRiskLow"}),
        A("꼭 프로가 되겠다고 맞선다",{p:40,win:{morale:5,fam:1},lose:{morale:-6,fam:-2},ok:"결연한 눈빛에 부모님이 한 번 더 믿어 주셨어요.",no:"집안 분위기가 얼음장이 됐어요.",act:"quitRisk"}),
        A("축구를 포기한다",{safe:true,win:{},ok:"담담히 받아들이고 새 길을 찾기로 했어요.",act:"quitNow"})]},
];
/* 동적 이벤트: 해외 유스 제안 */
function buildAbroad(S,base){
  const off=L.overseasYouthOffer(S); if(!off) return null;
  const opts=off.clubs.slice(0,2).map(c=>A(c.name+" 아카데미로 간다",{p:off.star?85:100,win:{morale:-2},lose:{morale:-6},ok:"새로운 환경, 새로운 언어. 모든 게 낯설지만 가슴이 뛰어요.",no:"비자 문제로 입단이 한 시즌 미뤄졌어요.",act:"abroad:"+c.id+":"+(off.star?"scout":"study"),costNote:off.star?"":"(유학 비용: 가정 지원 포인트 −3)"}));
  opts.push(A("한국에서 더 성장한다",{safe:true,win:{trust:2,morale:2},ok:"익숙한 곳에서 한 단계 더 올라서기로 했어요."}));
  return Object.assign({},base,{opts});
}

/* 평생의 라이벌 (3부작) — 라이벌 이름은 김동현으로 고정해요 */
function rivalName(S){ return S.p.name===RIVAL?"최동현":RIVAL; }
function rivalEvent(S){
  const st=S.story; if(!st||st.id!=="rival") return null; if(st.wait>0){ st.wait--; return null; }
  const rv=st.name, step=st.step;
  if(step===1){ st.step=2; st.wait=ri(3,5); return {id:"rival1",story:"평생의 라이벌 1/3",title:"또래 라이벌의 등장",body:"같은 나이, 같은 포지션. 사람들이 당신과 "+rv+"을(를) 나란히 놓고 비교하기 시작했어요.",
    opts:[A("공개적으로 선전포고한다",{p:100,win:{morale:2,fame:6},ok:"“누가 더 낫냐고요? 곧 알게 될 겁니다.” 불이 붙었어요."}),A("조용히 실력으로 보여준다",{p:100,win:{trust:3,morale:3},ok:"말보다 발로 증명하기로 했어요."})]}; }
  if(step===2){ st.step=3; st.wait=ri(4,7); const win=S.p.ovr>=st.ovr; return {id:"rival2",story:"평생의 라이벌 2/3",title:"라이벌과의 첫 맞대결",body:rv+"의 소속팀과 만났어요. "+(win?"흐름은 당신 쪽이에요.":"상대가 더 잘나가고 있어요."),
    opts:[A("정면 승부한다",{p:win?65:40,win:{morale:6,fame:4,stat:1},lose:{morale:-5,fame:-1},ok:"뜨거운 승부 끝에 웃었어요.",no:"한 수 아래임을 인정할 수밖에 없었어요."}),A("팀플레이에 집중한다",{p:80,win:{trust:4,morale:2},lose:{morale:-1},ok:"팀이 이겼어요.",no:"팀은 무승부로 끝났어요."})]}; }
  if(step===3){ S.story=null; const win=S.p.ovr+rnd(-4,4)>=st.ovr; return {id:"rival3",story:"평생의 라이벌 3/3",title:"결정적 승부",body:"모두가 지켜보는 가운데 "+rv+"과(와) 마지막 승부를 겨루게 되었어요.",
    opts:[A("모든 걸 쏟아붓는다",{p:win?70:45,win:{morale:8,fame:8,rep:3,pot:1},lose:{morale:-6,fame:-2},ok:"당신이 이 이야기의 주인공이었어요.",no:"아쉽지만, 라이벌 덕분에 한 단계 성장했어요."}),A("침착하게 정석대로 간다",{p:75,win:{morale:4,fame:3,trust:3},lose:{morale:-2},ok:"안정적으로 승부를 가져갔어요.",no:"승부는 졌어요. 하지만 존중을 얻었어요."})]}; }
  return null;
}
L.startStory=function(S){ if(S.story||S.storyDone) return; if(S.history.length<1) return; if(L.age(S)<15) return; S.story={id:"rival",step:1,wait:0,name:rivalName(S),ovr:S.p.ovr+ri(-2,3)}; S.storyDone=true; };

/* 이벤트 도감 목록 */
L.dexAll=function(){ return POOL.concat(L.EVPOOL).map(p=>({id:p.id,title:p.title})).concat([{id:"rival1",title:"또래 라이벌의 등장",story:"평생의 라이벌 1/3"},{id:"rival2",title:"라이벌과의 첫 맞대결",story:"평생의 라이벌 2/3"},{id:"rival3",title:"결정적 승부",story:"평생의 라이벌 3/3"}]); };
L.EVENT_RULES=["이벤트가 나올 확률: 전반기 70% · 중반기 55% · 후반기 70% · 시즌 마무리 55%","한 번 나온 이벤트는 9구간 동안 다시 나오지 않아요","선택지에 적힌 %가 실제 성공 확률이에요. 1~100 주사위가 그 값 이하면 성공해요 (숨은 보정 없음)","'안전한 선택'은 주사위 없이 확정되지만, 좋은 효과가 60%로 줄고 30% 확률로 작은 대가가 따라와요","결과 수치는 표시값의 70~130% 사이로 조금씩 달라져요","중학생·고등학생·대학생·프로 나이대에 맞는 이야기만 나와요"];

/* 구간이 끝날 때 호출. segId = 방금 끝난 구간 */
L.rollEvent=function(S,out){
  if(S.military==="serving") return null;
  S.segCount=(S.segCount||0)+1; L.startStory(S);
  const rv=rivalEvent(S); if(rv) return mark(S,rv);
  const prob=SEG_P[out&&out.seg]||.6; if(Math.random()>prob) return null;
  const hist=S.evHist||(S.evHist=[]); const seen=S.evSeen||(S.evSeen=[]); const adaptSkip=L.traitFx(S.p).adapt?/^(e_language|e_weather|p_homesick|fo_food|fo_visa|fo_roommate|fo_coachfrench|z7_homesick|y_homesick|t_homesick)$/:null; const pool=POOL.concat(L.EVPOOL).filter(e=>(!e.when||e.when(S))&&!(adaptSkip&&adaptSkip.test(e.id))&&!seen.includes(e.id)&&!hist.some(h=>h.id===e.id&&S.segCount-h.t<9));
  if(!pool.length) return null; const tot=pool.reduce((a,e)=>a+e.w,0); let r=Math.random()*tot, e=pool[0];
  for(const c of pool){ r-=c.w; if(r<=0){ e=c; break; } }
  if(e.id==="famcrash") S.famEv=true; if(e.id==="famboom") S.famEv2=true; if(e.id==="studypress") S.famEv3=true;
  let ev={id:e.id,title:e.title,body:e.body,opts:e.opts}; if(e.dynamic==="abroad"){ ev=buildAbroad(S,ev); if(!ev) return null; } else if(typeof e.dynamic==="function"){ ev=e.dynamic(S,ev); if(!ev) return null; }
  return mark(S,clone(ev));
};
function clone(ev){ return Object.assign({},ev,{opts:ev.opts.map(o=>Object.assign({},o,{win:Object.assign({},o.win),lose:o.lose?Object.assign({},o.lose):null}))}); }
function mark(S,ev){ (S.evHist=S.evHist||[]).push({id:ev.id,t:S.segCount}); if(!ev.story&&!ev.repeat){ const sn=S.evSeen=S.evSeen||[]; if(!sn.includes(ev.id)) sn.push(ev.id); } if(S.evHist.length>40) S.evHist.shift(); ev=clone(ev); ev.opts.forEach(o=>{ if(o.p==="schol") o.p=L.scholarChance(S); }); return ev; }
L.markEvent=mark;
L.scholarChance=function(S){ const ag=L.age(S), ref=L.youthLevel(Math.min(18,Math.max(13,ag)))+(S.youthTier||0); return Math.round(clamp(35+(S.p.ovr-ref)*5+((S.points||{}).grit|0)*2,12,88)); };

/* 선택지 결과 */
L.resolveEvent=function(S,ev,idx){
  const o=ev.opts[idx]; let hit=true, roll=null, need=null, text, lines=[], cost=null;
  const f=0.7+Math.random()*0.6;
  if(o.safe){ lines=eff(S,o.win,f*.6); text=o.ok; if(Math.random()<.3){ const c=pick([{morale:-3},{trust:-1},{fame:-2}]); lines=lines.concat(eff(S,c,1)); cost=true; text+=" (작은 대가가 따라왔어요)"; } }
  else { need=o.p!=null?o.p:100; if(o.p!=null&&o.p<100){ const tfx=L.traitFx(S.p); need=Math.min(95,need+(tfx.mind?5:0)+((tfx.util&&/^(sub|role):/.test(String(o.act||"")))?15:0)); } roll=ri(1,100); hit=roll<=need; lines=eff(S,hit?o.win:(o.lose||o.win),f); text=hit?o.ok:(o.no||o.ok); }
  /* 특수 결과 */
  let ending=null;
  if(o.act){ const a=String(o.act);
    if(a==="quitNow"&&L.maybeQuit) ending={reason:"family",text:"집안 사정으로 운동을 포기하고 학업에 전념하기로 했습니다."};
    else if(a==="quitRisk"&&!hit&&!(S.family&&(S.family.id==="rich"||S.family.id==="upper"))&&Math.random()<clamp(.35-.05*((S.points||{}).grit|0),.05,.4)) ending={reason:"family",text:"형편이 어려워 더는 운동을 이어 갈 수 없었습니다. 그래도 한때는 누구보다 빛나는 유망주였어요."};
    else if(a==="quitRiskLow"&&!hit&&Math.random()<.2) ending={reason:"study",text:"부모님과의 약속대로 축구를 접고 학업에 매진하기로 했습니다."};
    else if(a.startsWith("sub:")&&hit){ const sub=a.slice(4); const nm=L.POSDEF[S.p.pos].subs.find(s=>s[0]===sub); if(L.changeSub(S,sub)) lines.push("포지션 변경: "+(nm?nm[1]:sub)+" — 역할 "+L.roleName(S.p)); }
    else if(a.startsWith("role:")&&hit){ const id=a.slice(5); if(L.changeRole(S,id)) lines.push("역할 변경: "+L.roleName(S.p)); }
    else if(a.startsWith("abroad:")&&hit){ const [,cid,kind]=a.split(":"); const c=L.EPL().find(x=>x.id===cid); if(c){ L.goAbroadYouth(S,c,kind); lines.push("해외 유스로 이적: "+c.short+" 아카데미"); } }
  }
  const es=S.evStats=S.evStats||{n:0,risk:0,riskHit:0,hit:0,luck:0}; es.n++; if(hit) es.hit++; if(!o.safe&&(o.p!=null?o.p:100)<=50){ es.risk++; if(hit) es.riskHit++; } es.luck=Math.round((es.luck+(o.safe?0:(hit?1:0)-(need!=null?need:100)/100))*100)/100;
  L.feedAdd(S,S.year+" 이벤트",(ev.story?ev.story+" · ":"")+ev.title+" — "+text,hit?1:-1);
  if(ending){ L.quitCareer(S,ending.reason,ending.text); }
  return {hit,roll,need,safe:!!o.safe,text,lines,cost,ending};
};
L.maybeQuit=true;
})();

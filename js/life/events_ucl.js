/*
 * K-라이프 챔피언스리그 전용 이벤트 (js/life/events_ucl.js)
 * 챔스 경기가 있던 구간이 끝나면 라운드에 맞는 특별한 순간이 나와요.
 * 단계: lp=리그 페이즈 · ko=토너먼트(16강·8강) · sf=4강 · fn=결승. 한 인생에서 같은 이벤트는 한 번만 나와요.
 */
(function(){
"use strict";
const L=window.LIFE; if(!L||!L.EVC) return;
const R=(label,p,win,lose,ok,no)=>({label,p,win,lose,ok,no});
const Z=(label,win,ok)=>({label,safe:true,win,ok});
const U=[];
const E=(id,st,title,body,opts)=>U.push({id:"ucl_"+id,st,title,body,opts});
E("anthem",["lp"],"챔피언스 앤섬이 울려 퍼진다","별이 박힌 공이 중앙에 놓이고 앤섬이 경기장을 가득 채워요. 심장이 터질 듯 뛰어요.",[Z("눈을 감고 숨을 고른다",{morale:5,fame:1},"이 순간을 평생 기억하기로 했어요."),R("관중석을 향해 두 팔을 벌린다",70,{fame:4,morale:6},{morale:-2},"카메라가 당신을 한참 비췄어요.","긴장이 더 커졌어요.")]);
E("tunnel",["lp"],"터널에서 마주친 슈퍼스타","터널에서 어릴 때 우상이던 선수와 나란히 섰어요. 그가 먼저 눈을 맞춰 왔어요.",[R("먼저 악수를 청한다",70,{fame:3,morale:4,rep:1},{morale:-2},"'좋은 경기 하자'는 말에 용기가 났어요.","어색한 인사로 끝났어요."),Z("눈을 피하지 않고 선다",{trust:1,morale:3},"기세에서 밀리지 않았어요.")]);
E("away",["lp"],"원정석의 응원단","먼 나라 원정석에 우리 팀 서포터즈가 가득 찼어요. 목이 터져라 이름을 불러요.",[Z("경기 전 원정석으로 달려간다",{fame:3,morale:6},"함성이 힘이 됐어요."),R("전반 첫 골을 약속한다",45,{fame:5,morale:5,ug:1},{morale:-4},"약속을 지켰어요!","약속은 지키지 못했어요.")]);
E("lastgame",["lp"],"리그 페이즈 마지막 경기","16강 직행이 걸린 마지막 경기예요. 감독이 라커룸에서 말없이 칠판만 보고 있어요.",[R("내가 해결하겠다고 말한다",50,{trust:4,morale:5,fame:3},{trust:-3,morale:-4},"선수들의 눈빛이 달라졌어요.","큰소리만 쳤다는 눈초리를 받았어요."),Z("침착하게 계획을 되짚는다",{trust:3},"팀이 차분해졌어요.")]);
E("halftime",["ko"],"하프타임, 0-1","전반을 지고 돌아온 라커룸. 분위기가 무거워요.",[R("동료들을 한 명씩 다독인다",65,{trust:4,morale:4},{morale:-3},"후반에 팀이 살아났어요.","말이 잘 먹히지 않았어요."),R("더 공격적으로 뛰겠다고 선언한다",50,{fame:4,morale:3,ug:1},{morale:-5,cond:-4},"후반 첫 슛부터 흐름이 바뀌었어요.","무리한 플레이가 역습을 불렀어요.")]);
E("tackle",["ko"],"아슬아슬한 태클","위험 지역에서 상대 에이스를 막아야 해요. 카드가 나올 수 있는 상황이에요.",[R("과감하게 태클한다",50,{fame:3,morale:4},{trust:-3,morale:-4,inj:1},"깨끗하게 공을 걷어냈어요!","옐로카드를 받았어요."),Z("몸으로 막으며 지연시킨다",{trust:2},"위기를 넘겼어요.")]);
E("penalty",["ko","sf","fn"],"페널티킥을 얻어냈다","심판의 휘슬! 감독이 당신에게 키커를 맡길지 눈짓을 해요.",[R("내가 차겠다고 나선다",60,{fame:6,morale:7,rep:2,ug:1},{fame:-3,morale:-8},"골망이 크게 출렁였어요!","골키퍼가 막아냈어요. 하늘이 무너지는 기분이에요."),Z("전담 키커에게 양보한다",{trust:2,morale:1},"팀을 먼저 생각했어요.")]);
E("defender",["ko"],"세계 최고 수비수와의 맞대결","상대에는 몇 년째 월드클래스로 꼽히는 수비수가 있어요.",[R("1대1을 반복해 도전한다",50,{fame:4,stat:1,morale:4},{morale:-4,cond:-4},"몇 번 돌파에 성공했어요.","거의 모든 공을 빼앗겼어요."),Z("동료와의 패스 플레이를 늘린다",{trust:2,morale:2},"약점을 공략했어요.")]);
E("extra",["ko","sf"],"연장전에 돌입","120분 승부가 이어져요. 다리에 쥐가 올라와요.",[R("이를 악물고 끝까지 뛴다",55,{fame:5,trust:3,morale:4},{cond:-10,inj:2},"마지막까지 그라운드를 누볐어요.","근육이 찢어지는 느낌이 들었어요."),Z("교체를 요청한다",{trust:-1,cond:5},"팀을 위한 판단이었어요.")]);
E("presser",["ko","sf"],"상대 감독의 도발","상대 감독이 기자회견에서 당신의 팀을 깎아내렸어요.",[R("경기장에서 답하겠다고 말한다",60,{fame:4,morale:5},{fame:-2,trust:-2},"헤드라인은 당신의 몫이었어요.","말만 앞선다는 평을 들었어요."),Z("정중하게 존중을 표한다",{rep:3},"팬들이 품격을 칭찬했어요.")]);
E("home",["sf"],"4강 홈 팬들의 함성","홈 관중이 경기 시작 전부터 전원 기립해 응원가를 불러요.",[Z("가슴에 손을 얹고 인사한다",{morale:7,fame:2},"소름이 돋았어요."),R("첫 터치에 모든 걸 건다",55,{fame:5,morale:5,ug:1},{morale:-3},"첫 슛이 골대를 갈랐어요!","의욕이 앞서 볼이 튀었어요.")]);
E("letter",["fn"],"결승 전야의 편지","호텔 방 문 아래에 가족이 보낸 편지가 끼워져 있어요.",[Z("천천히 읽고 간직한다",{morale:8,trust:1},"눈시울이 뜨거워졌어요."),R("편지를 읽고 곧바로 영상 분석을 한다",55,{stat:1,morale:3},{cond:-5},"머릿속에 경기 그림이 그려졌어요.","잠을 설쳤어요.")]);
E("finaltunnel",["fn"],"결승전 킥오프 직전","경기장 불빛이 눈부셔요. 이 무대에 선 것만으로도 영광이지만, 우승컵은 하나뿐이에요.",[R("마음속으로 '지금이 내 순간'이라 되뇐다",65,{morale:8,fame:4,ug:1},{morale:-3},"모든 것이 느리게 보였어요.","긴장으로 몸이 굳었어요."),Z("동료들과 어깨동무를 한다",{trust:3,morale:5},"팀이 하나가 됐어요.")]);
E("shootout",["fn","sf"],"승부차기","120분 동안 승부가 나지 않았어요. 감독이 키커 순서를 정하고 있어요.",[R("마지막 키커를 자청한다",55,{fame:8,rep:4,morale:8,ug:1},{fame:-4,morale:-10},"결승골로 모두를 열광시켰어요!","실축하고 말았어요. 눈물이 쏟아져요."),Z("세 번째 키커로 나선다",{fame:2,morale:3},"차분히 임무를 마쳤어요.")]);
E("lift",["fn"],"트로피를 들어올리는 순서","시상식에서 주장이 트로피를 건네주려 해요. 누가 먼저 들어올릴지 눈치를 봐요.",[Z("동료에게 먼저 건넨다",{trust:3,rep:3},"선수단이 한 가족처럼 웃었어요."),R("함께 번쩍 들어올린다",90,{fame:6,morale:8},{morale:2},"골든 컨페티가 하늘을 덮었어요!","트로피가 너무 무거워 비틀거렸어요.")]);
E("tactic",["ko","sf","fn"],"감독의 마지막 지시","경기 직전 감독이 '오늘은 네가 키 플레이어'라고 속삭여요.",[R("책임감을 받아들인다",65,{trust:3,morale:5,fame:3},{morale:-4},"자신감이 차올랐어요.","부담감에 어깨가 무거워졌어요."),Z("팀 전체의 승리를 강조한다",{trust:3},"리더의 풍모를 보였어요.")]);
L.UCLPOOL=U;
L.rollUclEvent=function(S,out){
  const recs=(out.recs||[]).filter(r=>r.cup==="ucl"); if(!recs.length) return null;
  const rn=recs[recs.length-1].cupRound||""; const st=/결승/.test(rn)?"fn":/4강/.test(rn)?"sf":/16강|8강/.test(rn)?"ko":"lp";
  const prob={lp:.35,ko:.6,sf:.85,fn:1}[st]; if(Math.random()>prob) return null;
  const seen=S.evSeen||(S.evSeen=[]); const pool=U.filter(e=>e.st.includes(st)&&!seen.includes(e.id)); if(!pool.length) return null;
  const e=pool[Math.floor(Math.random()*pool.length)];
  const ev=L.markEvent(S,{id:e.id,title:e.title,body:e.body,opts:e.opts}); ev.ucl=true; ev.story="CHAMPIONS NIGHT · "+rn; return ev;
};
const base=L.dexAll; L.dexAll=function(){ return base().concat(U.map(e=>({id:e.id,title:e.title,story:"챔피언스리그"}))); };
})();

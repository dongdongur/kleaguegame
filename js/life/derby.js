/*
 * K-라이프 라이벌 더비 (js/life/derby.js)
 * 구단마다 지역 라이벌(슈퍼매치·엘 클라시코 등)이 있어요. 더비 경기는 따로 표시되고, 결과에 따라 사기·인기가 크게 흔들려요.
 * 더비 전용 이벤트가 나오고, 라이벌 구단으로 이적하면 팬들이 분노해요.
 */
(function(){
"use strict";
const L=window.LIFE; if(!L) return;
const {clamp,pick}=L;
/* [구단 A, 구단 B, 더비 이름] — 구단 id 기준 */
L.RIVALS=[
 ["FC 서울","수원 삼성","슈퍼매치"],["울산 HD","전북 현대","현대가 더비"],["울산 HD","포항 스틸러스","동해안 더비"],["FC 서울","인천 유나이티드","경인 더비"],["FC 서울","FC 안양","연고 이전 더비"],["수원 삼성","수원FC","수원 더비"],["FC 서울","서울 이랜드","서울 더비"],["전남 드래곤즈","광주 FC","호남 더비"],["부산 아이파크","경남 FC","낙동강 더비"],["전북 현대","광주 FC","호남 더비"],["대구 FC","포항 스틸러스","경북 더비"],["제주 SK","광주 FC","섬과 육지 더비"],
 ["ars","tot","북런던 더비"],["mun","mci","맨체스터 더비"],["liv","eve","머지사이드 더비"],["liv","mun","노스웨스트 더비"],["ars","chl","런던 더비"],["chl","tot","런던 더비"],["new","sun","타인-위어 더비"],["cry","bha","M23 더비"],["whu","ful","런던 더비"],["avl","wol","웨스트미들랜즈 더비"],
 ["lal_rma","lal_fcb","엘 클라시코"],["lal_rma","lal_atm","마드리드 더비"],["lal_fcb","lal_esp","카탈루냐 더비"],["lal_sev","lal_bet","세비야 더비"],["lal_ath","lal_rso","바스크 더비"],["lal_val","lal_lev","발렌시아 더비"],
 ["bun_bay","bun_bvb","데어 클라시커"],["bun_bmg","bun_koe","라인 더비"],["bun_hsv","bun_sv","북부 더비"],["bun_sge","bun_m05","헤센-라인란트 더비"],["bun_tsg","bun_vfb","바덴뷔르템베르크 더비"],
 ["sea_int","sea_mil","밀라노 더비"],["sea_juv","sea_int","이탈리아 더비"],["sea_rom","sea_laz","로마 더비"],["sea_juv","sea_tor","토리노 더비"],["sea_nap","sea_rom","태양의 더비"],["sea_fio","sea_bol","중부 더비"],
 ["l1_psg","l1_om","르 클라시크"],["l1_nic","l1_mon","코트다쥐르 더비"],["l1_lil","l1_len","북부 더비"],["l1_ren","l1_nan","서부 더비"],["l1_ol","l1_om","올림피크 더비"],
 ["j1_gam","j1_cer","오사카 더비"],["j1_yfm","j1_yfc","요코하마 더비"],["j1_tok","j1_tvd","도쿄 더비"],["j1_kaw","j1_tok","타마가와 더비"],["j1_uni","j1_kas","레즈-앤틀러스 대결"],["j1_nag","j1_shi","중부 더비"],
 ["spl_hil","spl_nas","리야드 더비"],["spl_ahl","spl_itt","제다 더비"],["spl_hil","spl_ahl","사우디 빅매치"],["spl_nas","spl_itt","명문 대결"]
];
const lgOfClub=(S,id)=>{ const keys=["K1","K2","EPL","LAL","BUN","SEA","L1","J1","SPL","EPL2","LAL2","BUN2","SEA2","FR2","J2","SPL2"]; for(const k of keys){ if(L.leagueClubs(S,k).some(c=>c.id===id)) return k; } return null; };
/* 현재 구단의 같은 리그 라이벌(없으면 null) */
L.rivalOf=function(S){
  if(!S.club||S.stage!=="pro") return null; const me=S.club.lg==="MIL"&&S.club.origin?S.club.origin.id:S.club.id; const lg=S.club.lg==="MIL"?"K1":S.club.lg;
  const pairs=L.RIVALS.filter(p=>p[0]===me||p[1]===me); if(!pairs.length) return null;
  const cl=L.leagueClubs(S,lg); const live=pairs.filter(p=>{ const o=p[0]===me?p[1]:p[0]; return cl.some(c=>c.id===o); }); if(!live.length) return null;
  const p=live[0]; const o=p[0]===me?p[1]:p[0]; const oc=cl.find(c=>c.id===o); return {id:o,name:p[2],rivalName:oc.short||oc.name};
};
/* 시즌 시작: 라이벌 저장 */
L.derbyStart=function(S,sim){ sim.rival=L.rivalOf(S); sim.derbies=[]; };
/* 내 경기 하나가 더비면 표시하고 분위기에 반영 */
L.derbyMark=function(S,sim,rec,oppId){
  const rv=sim.rival; if(!rv||oppId!==rv.id||!rec) return; rec.derby=rv.name; sim.derbies.push({r:rec.r,name:rv.name,opp:rv.rivalName,f:rec.f,a:rec.a,res:rec.res,g:rec.g||0,as:rec.as||0,min:rec.min});
  if(rec.min>0){ if(rec.res==="W"){ S.morale=clamp(S.morale+4,0,100); S.fame=Math.max(0,S.fame+1.5+(rec.g?1.5:0)); } else if(rec.res==="L"){ S.morale=clamp(S.morale-4,0,100); S.fame=Math.max(0,S.fame-.5); } }
  const sc=rec.f+":"+rec.a, rvn=rv.rivalName, dn=rv.name;
  const W=[dn+" 승리! "+rvn+"를 "+sc+"로 눌렀어요",rvn+"전 "+sc+" 승리, 서포터즈가 환호했어요",dn+"에서 웃은 쪽은 우리! "+sc,"짜릿한 "+dn+" "+sc+" 승리"], Lo=[dn+" 패배 "+sc+"… 아쉬움이 컸어요",rvn+"에 "+sc+"로 졌어요. 팬들의 한숨이 깊어요,",dn+"에서 무릎 꿇었어요 ("+sc+")",rvn+"전 "+sc+" 패배, 라커룸이 조용했어요"], Dr=[dn+" 무승부 "+sc+" — 팽팽한 승부였어요",rvn+"와 "+sc+"로 비겼어요. 승점 1점을 나눠 가졌어요",dn+" "+sc+" 무승부, 양 팀 모두 아쉬웠어요"];
  const line=rec.res==="W"?pick(W):rec.res==="L"?pick(Lo):pick(Dr); const extra=rec.g?" ("+rec.g+"골)":"";
  L.feedAdd(S,S.year+" 더비",line.replace(/,$/,"")+extra,rec.res==="W"?1:rec.res==="L"?-1:0);
};
/* 라이벌 구단으로 이적하는 경우 */
L.isRivalMove=function(S,toClub){ const me=S.club&&(S.club.lg==="MIL"&&S.club.origin?S.club.origin.id:S.club.id); if(!me||!toClub) return null; const p=L.RIVALS.find(x=>(x[0]===me&&x[1]===toClub.id)||(x[1]===me&&x[0]===toClub.id)); return p?p[2]:null; };

/* ===== 더비 이벤트 (반복 가능, 9구간 쿨다운) ===== */
const R=(label,p,win,lose,ok,no,ch)=>({label,p,win,lose,ok,no,ch}), Z=(label,win,ok,ch)=>({label,safe:true,win,ok,ch});
const {pro}=L.EVC||{};
if(L.EVPOOL&&pro){
 const has=S=>pro(S)&&!!L.rivalOf(S);
 const E=(id,w,title,body,opts)=>L.EVPOOL.push({id,w,repeat:true,when:has,title,body,opts,dynamic:(S,base)=>{ const rv=L.rivalOf(S); if(!rv) return null; return Object.assign({},base,{title:base.title.replace(/#D/g,rv.name),body:base.body.replace(/#D/g,rv.name).replace(/#R/g,rv.rivalName)}); }});
 E("dby_eve",3,"#D 전야","#D가 다가와요. 도시 전체가 #R전 이야기로 들끓고 있어요. 서포터즈가 훈련장에 찾아왔어요.",[R("서포터즈에게 승리를 약속한다",50,{fame:4,morale:5},{fame:-3,morale:-4},"서포터즈가 환호했어요. 이제 이겨야 해요!","약속이 부담이 되어 어깨가 무거워졌어요.",0),Z("묵묵히 훈련에 집중한다",{trust:2,morale:1},"조용히 준비했어요.",0)]);
 E("dby_locker",2.5,"#D 직전 라커룸","킥오프 직전 라커룸에 침묵이 흘러요. 감독이 당신을 보며 '한마디 해 줄래?'라고 해요.",[R("강하게 동기부여한다",60,{trust:4,morale:5,fame:2},{morale:-3},"선수단의 눈빛이 달라졌어요.","말이 너무 거칠었다는 평이 나왔어요.",0),Z("차분하게 평소처럼 하자고 한다",{trust:3},"팀이 안정을 찾았어요.",1)]);
 E("dby_taunt",2.5,"#R 선수의 도발","#R 선수가 인터뷰에서 당신의 팀을 깎아내렸어요. 기자들이 당신의 반응을 기다려요.",[R("경기장에서 답하겠다고 말한다",55,{fame:4,morale:4},{fame:-2,rep:-2,trust:-2},"헤드라인을 장식했어요.","말만 앞선다는 비판을 받았어요.",-1),R("조롱으로 받아친다",30,{fame:5,morale:3},{rep:-5,fame:-3},"팬들이 열광했어요.","논란이 커져 징계 이야기가 나왔어요.",-4),Z("존중을 표하고 넘어간다",{rep:3},"품격 있는 대응이었어요.",3)]);
 E("dby_win",2,"#D 승리의 밤","#R전에서 이겼어요! 팬들이 거리로 쏟아져 나왔어요.",[R("팬들과 함께 승리를 즐긴다",85,{fame:4,morale:6,rep:1},{cond:-3},"도시 전체가 파티가 됐어요.","너무 들뜬 나머지 다음 훈련이 힘들었어요.",1),Z("겸손하게 상대를 존중한다",{rep:3,trust:1},"성숙한 소감이 칭찬받았어요.",3)]);
 E("dby_lose",2,"#D 패배 후 팬들의 분노","#R전에서 졌어요. 팬들이 선수단 버스를 막아섰어요.",[R("버스에서 내려 직접 사과한다",65,{rep:3,fame:2,morale:2},{rep:-2,fame:-2,morale:-3},"팬들이 박수로 격려했어요.","분위기가 더 격해졌어요.",3),Z("구단 대응에 맡긴다",{trust:1},"구단이 상황을 수습했어요.",0)]);
 E("dby_penalty",1.5,"#D 막판 페널티킥","#R전 종료 직전 페널티킥! 키커를 정하는 눈치싸움이 벌어졌어요.",[R("내가 차겠다고 나선다",55,{fame:6,morale:7,trust:3},{fame:-3,morale:-6},"결승골 같은 골이 들어갔어요!","키퍼에게 막히고 말았어요.",0),Z("전담 키커에게 양보한다",{trust:2},"팀을 먼저 생각했어요.",1)]);
}
})();

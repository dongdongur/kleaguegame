/*
 * K-라이프 인기도 등급 · 인성 점수 (js/life/fame.js)
 *  - 인기도: 이제 100에서 멈추지 않아요. 오를수록 더 어렵게 오르고(높을수록 증가폭이 줄어듦), 유명한 만큼 해마다 조금씩 식어요.
 *    등급: 무명 → 지역구급 → 나라급 → 대륙급 → 월드스타 → G.O.A.T
 *  - 인성 점수: 이벤트에서의 선택, 기부, 대표팀 소집, 병역 같은 삶의 태도가 모여요. 광고 계약금·평판·커리어 점수에 영향을 줘요.
 */
(function(){
"use strict";
const L=window.LIFE; if(!L) return;
const {clamp,r1}=L;

/* ===== 인기도 ===== */
L.FAME_TIERS=[[0,"무명","⚪","아직 알아보는 사람이 거의 없어요."],[20,"지역구급","🏘️","동네에서는 알아보는 사람이 생겼어요."],[50,"나라급","🇰🇷","전국에서 이름이 알려졌어요."],[100,"대륙급","🌏","아시아·유럽 어디서나 통하는 스타예요."],[190,"월드스타","🌟","세계가 아는 이름이에요."],[300,"G.O.A.T","🐐","축구 역사에 이름이 남는 존재예요."]];
L.fameTier=f=>{ let t=L.FAME_TIERS[0]; L.FAME_TIERS.forEach(x=>{ if(f>=x[0]) t=x; }); const i=L.FAME_TIERS.indexOf(t), nx=L.FAME_TIERS[i+1]; return {name:t[1],icon:t[2],desc:t[3],i,next:nx?nx[0]:null,nextName:nx?nx[1]:null,base:t[0]}; };
/* 광고·발롱도르 같은 공식에서 쓰는 '실효 인기': 100 넘는 부분은 30%만 반영 */
L.fameEff=f=>f<=100?f:100+(f-100)*.3;
/* 시즌 말 인기 변화: 높을수록 오르기 어렵고, 유명할수록 식는 속도도 조금 빨라요 */
L.fameStep=function(S,raw){ const f=S.fame; let d=raw; if(d>0) d/=(1+Math.max(0,f-60)/80); return d-2-f*.012; };

/* ===== 인성 점수 (0~100, 시작 50) ===== */
L.CHAR_TIERS=[[0,"기피 인물","💢"],[15,"악동","😈"],[30,"까칠한 프로","😒"],[45,"평범한 프로","🙂"],[60,"선량한 선수","😊"],[75,"모범 선수","👍"],[90,"성인군자","😇"]];
L.charTier=c=>{ let t=L.CHAR_TIERS[0]; L.CHAR_TIERS.forEach(x=>{ if(c>=x[0]) t=x; }); return {name:t[1],icon:t[2]}; };
L.charOf=S=>S.char==null?50:S.char;
L.charDelta=function(S,d,why){ if(!d) return; const before=L.charOf(S); S.char=clamp(Math.round((before+d)*10)/10,0,100); (S.charLog=S.charLog||[]).push({year:S.year,d:Math.round(d*10)/10,why:why||""}); if(S.charLog.length>120) S.charLog.shift(); };
/* 선택지 문구로 짐작하는 태도 (도와주기·사과·양보는 +, 몰래·탓하기·보복은 −) */
const POS=/(기부|돕|봉사|사과|양보|진심|정직|감사|격려|가르|아낌없|응원|배려|함께 한다|직접 가서|보살|존중)/, NEG=/(몰래|탓을|강하게 항의|끝까지 맞|맞선다|살짝 본다|복수|부풀려|무시한|조롱|도발|판을 키워)/;
L.charFromChoice=function(S,o,effObj,hit){
  let d=0; const label=o.label||""; if(POS.test(label)) d+=2; if(NEG.test(label)) d-=2.5;
  const rep=(effObj&&effObj.rep)||0; d+=rep*.7; if(o.safe) d+=.2; if(o.ch) d+=o.ch;
  return Math.max(-5,Math.min(5,d)); };
L.charSummary=function(S){ const m={}; (S.charLog||[]).forEach(x=>{ const k=x.why.split(":")[0]||"기타"; m[k]=(m[k]||0)+x.d; });
  const arr=Object.entries(m).map(([k,v])=>({k,v:Math.round(v*10)/10})).filter(x=>Math.abs(x.v)>=1); return {up:arr.filter(x=>x.v>0).sort((a,b)=>b.v-a.v).slice(0,3),down:arr.filter(x=>x.v<0).sort((a,b)=>a.v-b.v).slice(0,3)}; };
/* 인성이 광고·평판·커리어 점수에 주는 영향 */
L.charEndorseMul=S=>clamp(.7+L.charOf(S)/160,.7,1.3);
L.charLegacy=S=>Math.round(clamp((L.charOf(S)-50)*2.5,-125,125));

/* ===== 인성 이벤트 (인성이 낮거나 높을 때만) ===== */
const R=(label,p,win,lose,ok,no,ch)=>({label,p,win,lose,ok,no,ch}), Z=(label,win,ok,ch)=>({label,safe:true,win,ok,ch});
const {pro}=L.EVC||{};
if(L.EVPOOL&&pro){
 const low=S=>pro(S)&&L.charOf(S)<38&&S.fame>=15, hi=S=>pro(S)&&L.charOf(S)>=72&&S.fame>=10;
 L.EVPOOL.push({id:"ch_scandal1",w:3,when:low,title:"악동 논란",body:"최근 행실이 도마 위에 올랐어요. 기자들이 해명을 요구해요.",opts:[R("진심으로 사과한다",65,{rep:2,fame:1,morale:2},{rep:-2,fame:-3},"사과문이 진정성 있다는 평을 받았어요.","사과가 늦었다는 비판이 이어졌어요.",3),R("법률팀을 통해 반박한다",35,{fame:1},{rep:-5,fame:-5},"논란이 잠잠해졌어요.","오히려 불에 기름을 부었어요.",-2),Z("침묵하며 훈련에 집중한다",{trust:1},"시간이 해결해 줄 거예요.",0)]});
 L.EVPOOL.push({id:"ch_scandal2",w:2.5,when:low,title:"팬과의 충돌 영상",body:"팬과 언쟁하는 영상이 퍼졌어요. 스폰서가 불편해해요.",opts:[R("직접 찾아가 사과한다",70,{rep:3,fame:2},{rep:-1,fame:-2},"팬이 용서하며 훈훈하게 마무리됐어요.","사과가 받아들여지지 않았어요.",4),R("편집된 영상이라고 주장한다",25,{fame:1},{rep:-6,fame:-6,funds:-.3},"의혹이 조금 가라앉았어요.","거짓말이 들통나 크게 번졌어요.",-4),Z("구단 홍보팀에 맡긴다",{trust:1},"구단이 수습에 나섰어요.",0)]});
 L.EVPOOL.push({id:"ch_scandal3",w:2,when:S=>low(S)&&(S.endorses||[]).length,title:"스폰서의 경고",body:"광고주가 '이미지 관리가 안 되면 계약을 재검토하겠다'고 통보했어요.",opts:[R("개선을 약속한다",70,{rep:2,funds:.1},{rep:-2,funds:-.3},"스폰서가 한 번 더 기회를 줬어요.","스폰서가 계약금을 깎았어요.",2),Z("계약을 유지하며 지켜본다",{trust:0},"지켜보기로 했어요.",0)]});
 L.EVPOOL.push({id:"ch_fan1",w:2.5,when:hi,title:"모범 선수 후보",body:"리그 사무국이 '모범 선수상' 후보로 당신을 올렸어요.",opts:[R("겸손하게 소감을 전한다",85,{rep:4,fame:3,morale:3},{rep:1},"수상 소식에 팬들이 박수를 보냈어요.","후보로 만족했어요.",2),Z("상금을 유소년 기금에 기부한다",{rep:3,funds:-.1,morale:3},"따뜻한 미담이 퍼졌어요.",4)]});
 L.EVPOOL.push({id:"ch_fan2",w:2,when:hi,title:"팬이 보낸 감사 편지",body:"아픈 아이가 '당신 덕분에 힘을 얻었다'는 편지를 보냈어요.",opts:[R("병원을 직접 찾아간다",90,{rep:4,fame:3,morale:6,cond:-2},{cond:-3},"아이와 가족에게 큰 선물이 됐어요.","일정이 맞지 않아 영상 편지로 대신했어요.",4),Z("사인 유니폼을 보낸다",{morale:3,rep:1},"마음을 전했어요.",1)]});
 L.EVPOOL.push({id:"ch_bully",w:2,when:S=>pro(S)&&S.fame>=8&&L.charOf(S)<55,title:"후배를 대하는 태도",body:"새로 온 후배가 실수를 연발해요. 라커룸 분위기가 팽팽해요.",opts:[R("조용히 불러 다독인다",80,{trust:3,morale:2},{morale:-1},"후배가 큰 힘을 얻었어요.","생각보다 낯설어했어요.",3),R("다 보는 앞에서 크게 혼낸다",30,{trust:1},{trust:-4,morale:-4,rep:-2},"팀이 긴장했어요.","분위기가 얼어붙고 말았어요.",-3),Z("모른 척한다",{trust:0},"그냥 지나갔어요.",-.5)]});
}
})();

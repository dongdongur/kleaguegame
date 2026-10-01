/* FM 스타일 세부 능력치: 이름·변환식·포지션별 종합 능력치 계산 (화면과 무관한 순수 로직) */
(function(){
"use strict";

/* 능력치 묶음 (키는 선수단예시.txt와 같고, 한글 이름은 FM 한국어 표기를 따랐어요) */
const GROUPS = [
 {id:"technical",label:"기술",keys:[["first_touch","퍼스트 터치"],["free_kicks","프리킥"],["heading","헤더"],["corners","코너킥"],["crossing","크로스"],["dribbling","드리블"],["long_shots","중거리 슛"],["long_throws","롱 스로"],["passing","패스"],["penalty_taking","페널티킥"],["tackling","태클"],["technique","테크닉"],["marking","마크"],["finishing","골 결정력"]]},
 {id:"mental",label:"정신",keys:[["aggression","적극성"],["anticipation","예측력"],["bravery","대담성"],["composure","침착성"],["concentration","집중력"],["decisions","판단력"],["determination","의지력"],["flair","창의성"],["leadership","리더십"],["off_the_ball","오프 더 볼"],["positioning","위치 선정"],["teamwork","팀워크"],["vision","시야"],["work_rate","활동량"]]},
 {id:"physical",label:"신체",keys:[["acceleration","가속도"],["agility","민첩성"],["balance","균형 감각"],["jumping_reach","점프 거리"],["natural_fitness","타고난 체력"],["pace","주력"],["stamina","지구력"],["strength","몸싸움"]]},
 {id:"goalkeeping",label:"골키퍼",keys:[["aerial_reach","공중볼 처리"],["command_of_area","지역 장악"],["communication","커뮤니케이션"],["eccentricity","기행"],["handling","핸들링"],["kicking","킥"],["one_on_ones","1대1"],["reflexes","반사 신경"],["rushing_out","돌진"],["punching","펀칭"],["throwing","던지기"]]}
];

/* FM 1~20 능력치를 1~100으로 (제미나이도움/매핑.txt와 같은 식): FM×5−2 에 선수별 보정(−2~+2)을 더해요 */
function fmTo100(fm,subOffset){
  const f=Math.max(1,Math.min(20,fm));
  return Math.max(1,Math.min(100,Math.round(f*5-2+(subOffset||0))));
}

/* 포지션 표기를 묶음으로: FM식(AM(C), DC ...)과 일반 표기(CB, LW ...)를 모두 받아요 */
function posGroup(pos){
  const p=String(pos||"").toUpperCase().replace(/\s/g,"");
  if(p==="GK") return "GK";
  if(/^(DC|CB)/.test(p)) return "CB";
  if(/^(D\(?[LR]|WB|LB|RB|DL|DR)/.test(p)) return "FB";
  if(/^DM/.test(p)) return "DM";
  if(/^(MC|CM|M\(C|ML|MR|LM|RM)$|^MC|^CM/.test(p)) return /^(LM|RM|ML|MR)/.test(p)?"W":"CM";
  if(/^(AM\(C|AMC|AM)/.test(p)) return "AM";
  if(/^(AM\(?[LR]|AML|AMR|LW|RW|W)/.test(p)) return "W";
  if(/^(ST|FW|CF|SS)/.test(p)) return "ST";
  return "CM";
}

/* 포지션별 중요한 능력치와 비중 (합이 1이 되도록 정규화해서 써요). 실제 FM의 역할별 가중치를 단순화한 것이라 참고용이에요 */
const WEIGHTS = {
 GK:{reflexes:3,handling:2.5,one_on_ones:2,aerial_reach:1.5,command_of_area:1.5,communication:1,kicking:1,rushing_out:1,positioning:1.5,concentration:1.5,agility:1.5,decisions:1},
 CB:{tackling:3,marking:3,heading:2.5,positioning:3,anticipation:2,bravery:1.5,strength:2,jumping_reach:2,pace:1.5,concentration:1.5,composure:1,passing:1},
 FB:{tackling:2,marking:1.5,crossing:2,pace:2.5,acceleration:2,stamina:2,work_rate:2,dribbling:1,positioning:1.5,anticipation:1.5,teamwork:1,passing:1},
 DM:{tackling:2.5,positioning:2.5,passing:2,anticipation:2,decisions:2,teamwork:1.5,work_rate:2,stamina:1.5,strength:1.5,marking:1.5,composure:1.5,concentration:1.5},
 CM:{passing:3,vision:2.5,decisions:2,technique:1.5,first_touch:1.5,teamwork:2,work_rate:2,stamina:2,composure:1.5,tackling:1,dribbling:1.5,long_shots:1},
 AM:{passing:2.5,vision:3,technique:2.5,dribbling:2.5,first_touch:2,flair:2,off_the_ball:2,composure:1.5,decisions:1.5,long_shots:1.5,finishing:1.5,agility:1},
 W:{dribbling:3,pace:3,acceleration:3,crossing:2,technique:2,first_touch:1.5,flair:1.5,agility:2,off_the_ball:1.5,finishing:1,passing:1,work_rate:1},
 ST:{finishing:4,off_the_ball:3,composure:2.5,first_touch:2,anticipation:2,heading:1.5,acceleration:1.5,pace:1.5,strength:1.5,dribbling:1.5,technique:1.5,positioning:1}
};
/* 주어진 세부 능력치로 그 포지션에서의 종합 능력치(1~100)를 계산 */
function overallFromAttrs(attrs,pos){
  const g=posGroup(pos), w=WEIGHTS[g]; if(!attrs||!w) return null;
  const flat={}; Object.keys(attrs).forEach(k=>Object.assign(flat,attrs[k]));
  let sum=0,tot=0; Object.keys(w).forEach(k=>{ if(flat[k]!=null){ sum+=flat[k]*w[k]; tot+=w[k]; } });
  return tot?Math.round(sum/tot):null;
}

/* 선수 이름으로 찾아요. 이름이 같은 다른 선수가 섞이지 않게 생년이 있으면 함께 확인할 수 있어요 */
let BY_NAME = {};
function load(list){ BY_NAME={}; (list||[]).forEach(p=>{ BY_NAME[p.name_ko]=p; }); }
function get(name){ return BY_NAME[name]||null; }
load(window.KL_ATTRS);

/* 숫자 하나를 FM처럼 색 구간으로 (낮음 → 높음) */
function tierOf(v){ return v>=90?"s":v>=75?"a":v>=60?"b":v>=40?"c":"d"; }

window.KLAttrs = {GROUPS,WEIGHTS,fmTo100,posGroup,overallFromAttrs,load,get,tierOf};
})();

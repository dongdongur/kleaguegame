/*
 * K-라이프 레전드 비교 (js/life/legends.js)
 * 은퇴한 내 선수를 역대 레전드와 같은 잣대로 비교해요. 수치는 공개된 커리어 기록을 바탕으로 한 대략적인 값(근사치)이고,
 * 점수는 L.legacy 와 같은 방식으로 계산해요. (골·도움·경기·수상·우승·대표팀)
 *   g 골 · a 도움 · apps 경기 · cs 클린시트 · caps 대표팀 경기 · intg 대표팀 골 · wc 월드컵 우승 · ucl 챔스 우승
 *   lg 리그 우승 · cup 기타 우승 · bd 발롱도르 · aw 기타 큰 개인상 · peak 전성기 능력치(우리 기준 1~99)
 */
(function(){
"use strict";
const L=window.LIFE;
const LEGENDS=[
 /* 공격수 — 골잡이형(finisher) / 돌파형(dribbler) / 타깃형(target) */
 {n:"호나우두",pos:"FW",types:["finisher"],g:414,a:100,apps:616,caps:98,intg:62,wc:2,ucl:0,lg:2,cup:6,bd:2,aw:10,peak:97,tag:"괴물 같은 득점 본능"},
 {n:"크리스티아누 호날두",pos:"FW",types:["finisher","target"],g:900,a:250,apps:1250,caps:220,intg:140,wc:0,ucl:5,lg:7,cup:14,bd:5,aw:25,peak:96,tag:"끝없는 득점 기계"},
 {n:"리오넬 메시",pos:"FW",types:["dribbler"],g:850,a:380,apps:1100,caps:190,intg:112,wc:1,ucl:4,lg:12,cup:16,bd:8,aw:30,peak:99,tag:"발끝의 마법사"},
 {n:"호나우지뉴",pos:"FW",types:["dribbler"],g:190,a:120,apps:560,caps:97,intg:33,wc:1,ucl:1,lg:2,cup:3,bd:1,aw:6,peak:94,tag:"웃음을 주는 마술사"},
 {n:"즐라탄 이브라히모비치",pos:"FW",types:["target","finisher"],g:570,a:200,apps:1000,caps:122,intg:62,wc:0,ucl:0,lg:13,cup:10,bd:0,aw:12,peak:92,tag:"압도적인 존재감"},
 {n:"손흥민",pos:"FW",types:["dribbler","finisher"],g:230,a:110,apps:760,caps:135,intg:51,wc:0,ucl:0,lg:0,cup:2,bd:0,aw:6,peak:91,tag:"아시아가 낳은 월드클래스"},
 {n:"차범근",pos:"FW",types:["finisher","target"],g:200,a:40,apps:620,caps:136,intg:58,wc:0,ucl:0,lg:0,cup:2,bd:0,aw:4,peak:88,tag:"한국 축구의 전설"},
 {n:"이동국",pos:"FW",types:["target","finisher"],g:260,a:90,apps:690,caps:105,intg:33,wc:0,ucl:0,lg:8,cup:3,bd:0,aw:8,peak:85,tag:"K리그의 살아 있는 역사"},
 /* 미드필더 — 플레이메이커형(playmaker) / 박스 투 박스형(box) / 수비형(destroyer) */
 {n:"지네딘 지단",pos:"MF",types:["playmaker"],g:100,a:110,apps:800,caps:108,intg:31,wc:1,ucl:1,lg:3,cup:4,bd:1,aw:8,peak:96,tag:"우아함의 극치"},
 {n:"안드레스 이니에스타",pos:"MF",types:["playmaker"],g:60,a:150,apps:900,caps:131,intg:13,wc:1,ucl:4,lg:9,cup:8,bd:0,aw:8,peak:92,tag:"공간을 지배한 마에스트로"},
 {n:"사비 에르난데스",pos:"MF",types:["playmaker"],g:85,a:190,apps:1000,caps:133,intg:13,wc:1,ucl:4,lg:8,cup:9,bd:0,aw:8,peak:92,tag:"패스의 교과서"},
 {n:"기성용",pos:"MF",types:["playmaker"],g:35,a:50,apps:480,caps:110,intg:10,wc:0,ucl:0,lg:3,cup:3,bd:0,aw:2,peak:84,tag:"정확한 롱패스의 대가"},
 {n:"스티븐 제라드",pos:"MF",types:["box"],g:186,a:150,apps:710,caps:114,intg:21,wc:0,ucl:1,lg:0,cup:6,bd:0,aw:5,peak:91,tag:"팀을 짊어진 캡틴"},
 {n:"프랭크 램파드",pos:"MF",types:["box"],g:270,a:150,apps:880,caps:106,intg:29,wc:0,ucl:1,lg:3,cup:8,bd:0,aw:4,peak:90,tag:"골 넣는 미드필더"},
 {n:"박지성",pos:"MF",types:["box"],g:40,a:45,apps:540,caps:100,intg:13,wc:0,ucl:1,lg:4,cup:5,bd:0,aw:4,peak:87,tag:"산소탱크, 두 개의 심장"},
 {n:"세르히오 부스케츠",pos:"MF",types:["destroyer"],g:20,a:50,apps:780,caps:143,intg:2,wc:1,ucl:3,lg:9,cup:7,bd:0,aw:3,peak:89,tag:"축구 지능의 정점"},
 {n:"은골로 캉테",pos:"MF",types:["destroyer"],g:20,a:40,apps:500,caps:56,intg:3,wc:1,ucl:1,lg:2,cup:4,bd:0,aw:3,peak:90,tag:"두 명 몫을 뛰는 사나이"},
 /* 수비수 — 스토퍼형(stopper) / 빌드업형(builder) / 오버래핑 풀백형(runner) */
 {n:"파올로 말디니",pos:"DF",types:["stopper","builder"],g:33,a:40,apps:900,caps:126,intg:7,wc:0,ucl:5,lg:7,cup:8,bd:0,aw:6,peak:93,tag:"수비의 품격"},
 {n:"파비오 칸나바로",pos:"DF",types:["stopper"],g:8,a:10,apps:600,caps:136,intg:2,wc:1,ucl:0,lg:3,cup:3,bd:1,aw:3,peak:90,tag:"뚫리지 않는 벽"},
 {n:"피르힐 판 다이크",pos:"DF",types:["stopper","builder"],g:40,a:12,apps:480,caps:80,intg:10,wc:0,ucl:1,lg:1,cup:3,bd:0,aw:4,peak:91,tag:"압도적인 센터백"},
 {n:"프란츠 베켄바워",pos:"DF",types:["builder"],g:100,a:50,apps:750,caps:103,intg:14,wc:1,ucl:3,lg:5,cup:6,bd:2,aw:6,peak:94,tag:"리베로의 창시자"},
 {n:"김민재",pos:"DF",types:["stopper"],g:12,a:6,apps:380,caps:100,intg:4,wc:0,ucl:0,lg:3,cup:3,bd:0,aw:4,peak:90,tag:"괴물 수비수"},
 {n:"홍명보",pos:"DF",types:["builder","stopper"],g:40,a:25,apps:600,caps:136,intg:10,wc:0,ucl:0,lg:4,cup:4,bd:0,aw:3,peak:87,tag:"영원한 리더"},
 {n:"카푸",pos:"DF",types:["runner"],g:20,a:90,apps:700,caps:142,intg:5,wc:2,ucl:1,lg:3,cup:4,bd:0,aw:3,peak:90,tag:"지칠 줄 모르는 오른쪽 날개"},
 {n:"필립 람",pos:"DF",types:["runner"],g:19,a:90,apps:800,caps:113,intg:5,wc:1,ucl:1,lg:8,cup:8,bd:0,aw:4,peak:90,tag:"완벽한 풀백"},
 {n:"이영표",pos:"DF",types:["runner"],g:12,a:50,apps:600,caps:127,intg:5,wc:0,ucl:0,lg:2,cup:3,bd:0,aw:2,peak:85,tag:"쉼 없이 오르내린 왼쪽 측면"},
 /* 골키퍼 — 선방형(shotstopper) / 스위퍼 키퍼형(sweeper) / 지휘형(commander) */
 {n:"레프 야신",pos:"GK",types:["shotstopper"],g:0,a:0,apps:800,cs:270,caps:78,intg:0,wc:0,ucl:0,lg:5,cup:3,bd:1,aw:5,peak:98,tag:"검은 거미"},
 {n:"잔루이지 부폰",pos:"GK",types:["shotstopper","commander"],g:0,a:0,apps:1100,cs:450,caps:176,intg:0,wc:1,ucl:0,lg:10,cup:9,bd:0,aw:12,peak:95,tag:"가장 긴 시간을 지킨 수호신"},
 {n:"마누엘 노이어",pos:"GK",types:["sweeper"],g:0,a:0,apps:800,cs:340,caps:124,intg:0,wc:1,ucl:2,lg:12,cup:10,bd:0,aw:8,peak:97,tag:"스위퍼 키퍼의 완성"},
 {n:"이케르 카시야스",pos:"GK",types:["commander","shotstopper"],g:0,a:0,apps:900,cs:300,caps:167,intg:0,wc:1,ucl:3,lg:5,cup:8,bd:0,aw:6,peak:93,tag:"성인 성자"},
 {n:"김병지",pos:"GK",types:["commander","sweeper"],g:3,a:0,apps:700,cs:200,caps:6,intg:0,wc:0,ucl:0,lg:0,cup:3,bd:0,aw:3,peak:80,tag:"그라운드의 철인"},
];
/* 같은 잣대의 커리어 점수 (L.legacy 의 가중치와 같은 방향) */
function score(c){
  return Math.round(c.peak*8+c.g*3+c.a*2+c.apps*.5+(c.cs||0)*1.5+c.bd*260+c.aw*30+c.wc*110+c.ucl*110+c.lg*45+c.cup*20+c.caps*3+c.intg*10);
}
LEGENDS.forEach(x=>{ x.score=score(x); });
L.LEGENDS=LEGENDS; L.legendScore=score;

/* 내 선수와 비교할 레전드를 골라요: 같은 유형 우선, 이어서 같은 포지션에서 점수가 가까운 순 */
L.compareLegends=function(S){
  const lg=L.legacy(S), c=S.career, mine=lg.total;
  const myAw=S.awards.filter(a=>!a.youth);
  const my={g:c.goals,a:c.assists,apps:c.apps,cs:c.cs,caps:c.caps,intg:c.intGoals,
    tr:S.trophies.filter(t=>!t.youth).length,aw:myAw.filter(a=>!/후보/.test(a.name)).length,bd:S.ballon.filter(b=>b.rank===1).length,
    wc:S.trophies.filter(t=>/월드컵 우승/.test(t.name)&&/FIFA 월드컵/.test(t.name)).length,peak:S.p.peak};
  const same=LEGENDS.filter(x=>x.pos===S.p.pos);
  const typed=same.filter(x=>x.types.includes(S.p.type)).sort((a,b)=>Math.abs(a.score-mine)-Math.abs(b.score-mine));
  const rest=same.filter(x=>!typed.includes(x)).sort((a,b)=>Math.abs(a.score-mine)-Math.abs(b.score-mine));
  const pick=typed.slice(0,2).concat(rest).slice(0,4);
  const list=pick.map(x=>({n:x.n,tag:x.tag,score:x.score,pct:Math.round(mine/x.score*100),beat:mine>=x.score,typed:typed.includes(x),
    rows:[["골",my.g,x.g],["도움",my.a,x.a],["경기",my.apps,x.apps],["대표팀",my.caps,x.caps],["월드컵 우승",my.wc,x.wc],["발롱도르",my.bd,x.bd],["리그·컵 우승",my.tr,x.lg+x.cup+x.ucl+x.wc]].filter(r=>!(S.p.pos==="GK"&&(r[0]==="골"||r[0]==="도움")))}));
  return {mine,list,type:S.p.typeName};
};
})();

/*
 * 구단 홈 유니폼 (js/kits.js) — 영구결번 현황 등에서 쓰는 유니폼 그림
 * 색은 대략적인 홈 유니폼 느낌만 따라 한 가상의 도안이에요(엠블럼·스폰서 없음). 나중에 바꿀 수 있게 이 표만 고치면 돼요.
 * 형식: "구단명|메인색|보조색|무늬"  무늬: s=단색 · v=세로 줄무늬 · h=가로 줄무늬 · x=반반 · l=소매 색 다름
 */
(function(){
"use strict";
const T=`FC 서울|#111111|#d6001c|v
울산 HD|#0a3d91|#f5c400|s
전북 현대|#0a7a3e|#111111|s
제주 SK|#f58220|#ffffff|s
강원 FC|#f58220|#0b3d91|l
대전 하나 시티즌|#6a1b9a|#0a7a3e|s
포항 스틸러스|#c8102e|#111111|v
FC 안양|#6a1b9a|#fbc02d|s
인천 유나이티드|#0b3d91|#111111|v
광주 FC|#fbc02d|#ffffff|s
부천 FC 1995|#c8102e|#111111|s
김천 상무|#c8102e|#0b2a5b|x
수원 삼성|#0b3d91|#ffffff|s
수원FC|#1565c0|#ffffff|v
서울 이랜드|#111111|#c8102e|v
대구 FC|#4fc3f7|#0b3d91|s
화성 FC|#ffa000|#111111|s
부산 아이파크|#c8102e|#ffffff|s
성남 FC|#111111|#fbc02d|s
전남 드래곤즈|#fbc02d|#0b3d91|s
경남 FC|#c8102e|#fbc02d|s
충남 아산|#0b3d91|#ffffff|s
안산 그리너스|#2e7d32|#ffffff|s
김포 FC|#0b3d91|#c8102e|s
천안 시티|#0b3d91|#111111|s
충북청주|#c8102e|#ffffff|s
파주 프런티어|#e53935|#111111|s
용인 FC|#c8102e|#0b3d91|s
김해 FC 2008|#fbc02d|#111111|s
맨체스터 시티|#6cabdd|#ffffff|s
리버풀|#c8102e|#ffffff|s
아스널|#ef0107|#ffffff|l
첼시|#034694|#ffffff|s
맨체스터 유나이티드|#da291c|#111111|s
토트넘 홋스퍼|#f3f3f3|#132257|s
뉴캐슬 유나이티드|#ffffff|#111111|v
애스턴 빌라|#670e36|#95bfe5|l
브라이턴|#ffffff|#0057b8|v
웨스트햄|#7a263a|#1bb1e7|l
크리스털 팰리스|#1b458f|#c4122e|v
풀럼|#ffffff|#111111|s
브렌트퍼드|#ffffff|#e30613|v
울버햄튼|#fdb913|#111111|s
에버턴|#003399|#ffffff|s
본머스|#da291c|#111111|v
노팅엄 포레스트|#dd0000|#ffffff|s
리즈 유나이티드|#ffffff|#1d428a|s
번리|#6c1d45|#99d6ea|l
선덜랜드|#ffffff|#eb172b|v
레알 마드리드|#ffffff|#e5c36b|s
FC 바르셀로나|#a50044|#004d98|v
아틀레티코 마드리드|#ffffff|#cb3524|v
아틀레틱 빌바오|#ffffff|#ee2523|v
비야레알|#fbe106|#005187|s
레알 소시에다드|#ffffff|#0067b1|v
레알 베티스|#ffffff|#00954c|v
지로나|#ee2523|#ffffff|s
세비야|#ffffff|#d71920|s
발렌시아|#ffffff|#111111|s
셀타 비고|#8ac3ee|#ffffff|s
오사수나|#d91a21|#0a1f44|s
마요르카|#e20613|#111111|s
헤타페|#005999|#ffffff|s
라요 바예카노|#ffffff|#e53935|s
알라베스|#ffffff|#0761af|v
에스파뇰|#ffffff|#007fc8|v
엘체|#ffffff|#0b8c3d|s
레반테|#b4053f|#0a3d91|v
레알 오비에도|#0033a0|#ffffff|s
바이에른 뮌헨|#dc052d|#ffffff|s
바이어 레버쿠젠|#e32221|#111111|s
보루시아 도르트문트|#fde100|#111111|s
RB 라이프치히|#ffffff|#dd0741|s
아인트라흐트 프랑크푸르트|#e1000f|#111111|s
VfB 슈투트가르트|#ffffff|#e32219|s
SC 프라이부르크|#e32219|#111111|s
VfL 볼프스부르크|#65b32e|#ffffff|s
TSG 호펜하임|#1961b5|#ffffff|s
보루시아 묀헨글라트바흐|#ffffff|#2a8b3d|s
마인츠 05|#c3141e|#ffffff|s
베르더 브레멘|#1d9053|#ffffff|s
우니온 베를린|#eb1923|#ffffff|s
FC 아우크스부르크|#ba3733|#ffffff|v
함부르거 SV|#005ca9|#ffffff|s
인터 밀란|#0068a8|#111111|v
SSC 나폴리|#12a0d7|#ffffff|s
AC 밀란|#fb090b|#111111|v
유벤투스|#ffffff|#111111|v
아탈란타|#1e71b8|#111111|v
AS 로마|#8e1f2f|#f0bc42|s
SS 라치오|#87d8f7|#ffffff|s
피오렌티나|#482e92|#ffffff|s
볼로냐|#1a2f48|#c8102e|v
토리노|#8a1e1b|#ffffff|s
제노아|#a30b30|#0a1f44|x
우디네세|#ffffff|#111111|v
사수올로|#00a651|#111111|v
파르마|#ffffff|#fcd116|s
파리 생제르맹|#004170|#da291c|s
AS 모나코|#e51b24|#ffffff|x
올림피크 마르세유|#ffffff|#2faee0|s
올림피크 리옹|#ffffff|#1f3a87|s
릴 OSC|#e4002b|#ffffff|s
RC 랑스|#ffcf00|#e4002b|s
OGC 니스|#cc0000|#111111|v
스타드 렌|#e2001a|#111111|s
비셀 고베|#8b0d2e|#ffffff|s
가시마 앤틀러스|#b3001b|#0a1f44|s
FC 마치다 젤비아|#1b4aa0|#f5c400|s
산프레체 히로시마|#4d2a86|#ffffff|s
요코하마 F. 마리노스|#0f2d78|#ffffff|x
우라와 레즈|#d4001a|#111111|s
가와사키 프론탈레|#2b9be0|#111111|v
감바 오사카|#0b3e8c|#111111|v
세레소 오사카|#e0457b|#111111|s
FC 도쿄|#1a3d8f|#c8102e|v
가시와 레이솔|#f5d300|#111111|s
나고야 그램퍼스|#c8102e|#f5d300|s
알 힐랄|#0b3e91|#ffffff|s
알 나스르|#f5c400|#0b3e91|s
알 아흘리|#0a7a3e|#ffffff|s
알 이티하드|#f2c500|#111111|v
알 카디시야|#f2a900|#0b3e91|s
알 샤밥|#ffffff|#111111|s`;
const MAP={}; T.split("\n").forEach(l=>{ const p=l.split("|"); if(p.length>=4) MAP[p[0].trim()]={c1:p[1],c2:p[2],p:p[3].trim()}; });
const hue=s=>{ let x=0; for(let i=0;i<s.length;i++) x=(x*31+s.charCodeAt(i))%360; return x; };
function kit(name){
  name=String(name||""); if(MAP[name]) return MAP[name];
  const k=Object.keys(MAP).find(n=>name.indexOf(n)>=0||n.indexOf(name)>=0); if(k&&name.length>=2) return MAP[k];
  const h=hue(name); return {c1:"hsl("+h+",62%,42%)",c2:"#ffffff",p:"s"};
}
let uid=0;
/* 유니폼 SVG: num=등번호, club=구단명 */
window.KL_shirt=function(num,club){
  const k=kit(club), id="kc"+(uid++), t=String(num), fs=t.length>2?34:46;
  const body="M38 8 L18 20 L4 46 L24 58 L32 46 L32 120 Q32 124 36 124 L84 124 Q88 124 88 120 L88 46 L96 58 L116 46 L102 20 L82 8 Q60 24 38 8 Z";
  let over="";
  if(k.p==="v") over='<g clip-path="url(#'+id+')">'+[0,1,2,3,4,5,6].map(i=>'<rect x="'+(i*16+4)+'" y="0" width="8" height="130" fill="'+k.c2+'"/>').join("")+'</g>';
  else if(k.p==="h") over='<g clip-path="url(#'+id+')">'+[0,1,2,3,4,5].map(i=>'<rect x="0" y="'+(i*22+14)+'" width="120" height="11" fill="'+k.c2+'"/>').join("")+'</g>';
  else if(k.p==="x") over='<g clip-path="url(#'+id+')"><rect x="60" y="0" width="60" height="130" fill="'+k.c2+'"/></g>';
  else if(k.p==="l") over='<g clip-path="url(#'+id+')"><rect x="0" y="0" width="30" height="130" fill="'+k.c2+'"/><rect x="90" y="0" width="30" height="130" fill="'+k.c2+'"/></g>';
  const txt=lum(k.c1)>150?"#111":"#fff", stroke=lum(k.c1)>150?"rgba(255,255,255,.7)":"rgba(0,0,0,.45)";
  return '<svg viewBox="0 0 120 130" aria-hidden="true"><defs><clipPath id="'+id+'"><path d="'+body+'"/></clipPath><linearGradient id="'+id+'g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(255,255,255,.22)"/><stop offset="1" stop-color="rgba(0,0,0,.28)"/></linearGradient></defs>'
   +'<path d="'+body+'" fill="'+k.c1+'"/>'+over+'<path d="'+body+'" fill="url(#'+id+'g)"/><path d="'+body+'" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2" stroke-linejoin="round"/>'
   +'<path d="M38 8 Q60 24 82 8" fill="none" stroke="'+k.c2+'" stroke-width="4"/>'
   +'<text x="60" y="88" text-anchor="middle" font-family="Oswald,sans-serif" font-weight="700" font-size="'+fs+'" fill="'+txt+'" stroke="'+stroke+'" stroke-width="1.4" paint-order="stroke">'+t.replace(/[<>&]/g,"")+'</text></svg>';
};
function lum(c){ let r=0,g=0,b=0; if(/^#/.test(c)){ const h=c.length===4?c.replace(/./g,(m,i)=>i?m+m:m):c; r=parseInt(h.slice(1,3),16); g=parseInt(h.slice(3,5),16); b=parseInt(h.slice(5,7),16); } else return 90; return .299*r+.587*g+.114*b; }
window.KL_kit=kit;
})();

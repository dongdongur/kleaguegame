/*
 * K-라이프 은퇴 후의 삶 (js/life/epilogue.js)
 * 은퇴한 뒤 어떤 길을 갈지 고르면, 선수 시절의 능력·인기·인성·재산이 이어져서 이야기가 이어져요.
 * 길에 따라 커리어 점수(명예의 전당 점수)에 보너스가 붙어요. 한 번만 고를 수 있어요.
 *   지도자 → 코치 → 감독 / 방송 해설가 / 사업가 / 유소년 아카데미 / 구단주(구단 인수를 했다면) / 가족과 함께
 */
(function(){
"use strict";
const L=window.LIFE; if(!L) return;
const {clamp,pick,ri,rnd,r1}=L;
const poisson=l=>{ let k=0,p=1; const e=Math.exp(-l); do{ k++; p*=Math.random(); }while(p>e); return k-1; };
const mainClub=S=>{ const e=Object.entries(S.clubYears||{}).sort((a,b)=>b[1]-a[1])[0]; return e?e[0]:(S.club?S.club.name:"고향 팀"); };
const age=S=>L.age(S);

/* 선택 가능한 길 */
L.afterPaths=function(S){
  const owner=L.hasHonor&&L.hasHonor(S,"owner"), stake=L.hasHonor&&L.hasHonor(S,"stake");
  const list=[
   {id:"coach",icon:"🧑‍🏫",name:"지도자의 길",desc:"코치로 시작해 감독이 돼요. 능력·인성·경험이 감독 성적에 이어져요."},
   {id:"pundit",icon:"🎙️",name:"방송 해설가·방송인",desc:"인기를 무기로 방송에서 활약해요. 인기 등급이 높을수록 크게 성공해요."},
   {id:"biz",icon:"💼",name:"사업가",desc:"모아 둔 재산과 투자 감각으로 사업을 키워요. 재산이 많을수록 유리해요."},
   {id:"academy",icon:"🏫",name:"유소년 아카데미",desc:"어린 선수들을 키워요. 제자 가운데 프로와 국가대표가 나와요. 인성이 높을수록 좋아요."},
   {id:"family",icon:"🏡",name:"가족과 함께",desc:"조용히 가족과 시간을 보내요. 소박하지만 따뜻한 마무리예요."}
  ];
  if(owner) list.unshift({id:"owner",icon:"🏟️",name:"구단주",desc:"인수한 구단의 구단주로 새 삶을 시작해요."});
  else if(stake) list.splice(1,0,{id:"stakeholder",icon:"📑",name:"구단 이사회",desc:"지분을 가진 구단의 이사회 멤버로 구단 운영에 참여해요."});
  return list;
};

L.afterDo=function(S,id){
  if(S.after) return S.after; const P=L.afterPaths(S).find(x=>x.id===id); if(!P) return null;
  const lg=L.legacy(S).total, ch=L.charOf(S), fm=S.fameMax||S.fame, ft=L.fameTier(fm), club=mainClub(S), a0=age(S), lines=[]; let bonus=0, title="";
  const tf=L.traitFx(S.p); const lead=(tf.winner>0?.25:0)+(S.p.hidden==="iq"?.25:0)+(S.p.hidden==="captain"?.2:0);
  const add=(y,t)=>lines.push({y,t});
  if(id==="coach"){
    const skill=(S.p.peak-62)/32+(ch-50)/110+lg/6000+lead+rnd(-.35,.35);
    add(a0+1,"지도자 자격증(Pro 라이선스)을 따기 위해 연수를 떠났어요.");
    add(a0+2,club+"의 코치로 부임해 후배들을 가르쳤어요.");
    const big=skill>1.25, mid=skill>.75; const team=big?(S.foreignYears>2?"프리미어리그 명문":"K리그 명문"):mid?"K리그 중위권 구단":"2부 리그 구단";
    add(a0+6,team+"의 감독으로 데뷔했어요.");
    const years=ri(5,12), lgT=big?poisson(skill*1.4):mid?poisson(skill*.5):0, cups=poisson(skill*.9);
    if(lgT) add(a0+6+Math.round(years/2),"리그 우승 "+lgT+"회를 이끌었어요!");
    if(cups) add(a0+6+years-1,"컵대회 우승 "+cups+"회를 차지했어요.");
    if(skill<.4) add(a0+6+years,"성적 부진으로 물러나 해설위원으로 활동해요.");
    title=lgT>=3?"전설의 명장":lgT>=1?"우승 감독":cups?"컵의 감독":skill>.75?"믿음직한 감독":"풋내기 감독";
    add(a0+6+years,"최종 평가: "+title+" ("+years+"시즌 · 리그 우승 "+lgT+"회 · 컵 우승 "+cups+"회)");
    bonus=clamp(Math.round(40+skill*90+lgT*45+cups*20),20,360);
  } else if(id==="pundit"){
    const pw=ft.i; const money=r1(pw*3+rnd(1,4)); add(a0+1,"방송사의 러브콜이 쏟아졌어요. ("+ft.name+" 인기)");
    add(a0+2,pw>=3?"예능과 해설을 오가는 국민 해설가가 됐어요.":pw>=1?"축구 전문 해설위원으로 자리를 잡았어요.":"조용히 지역 방송에서 해설을 시작했어요.");
    if(ch>=70) add(a0+5,"솔직하고 따뜻한 입담으로 호감도 1위에 올랐어요.");
    else if(ch<=30) add(a0+5,"거침없는 발언이 논란이 되어 몇 번 구설에 올랐어요.");
    add(a0+8,"유튜브 채널 구독자 "+Math.round((pw+1)*ri(30,90))+"만 명을 돌파했어요.");
    S.funds=r1(S.funds+money); title=pw>=4?"월드스타 해설가":pw>=2?"인기 해설가":"해설위원"; add(a0+10,"최종 평가: "+title+" (방송 수입 +"+money+"억)"); bonus=clamp(Math.round(30+pw*30+fm*.15),20,220);
  } else if(id==="biz"){
    const base=Math.max(1,S.funds+L.assetValue(S)), lucky=Math.random(); const mult=lucky<.15?.5:lucky<.6?1.6:lucky<.9?3:7;
    add(a0+1,"은퇴 후 쌓아 둔 "+r1(base)+"억으로 사업을 시작했어요.");
    add(a0+3,pick(["프랜차이즈 카페","축구 용품 브랜드","스포츠 센터","부동산 개발"])+"로 첫 성과를 냈어요.");
    const end=r1(base*mult); add(a0+9,mult<1?"시장 변화로 큰 손실을 봤어요. 그래도 다시 일어서기로 했어요.":"사업이 크게 성장해 자산이 "+end+"억이 됐어요.");
    S.funds=r1(Math.max(0,end-L.assetValue(S))); title=mult>=7?"축구계의 대부호":mult>=3?"성공한 사업가":mult>=1?"안정적인 사업가":"실패를 딛고 일어선 사업가";
    add(a0+12,"최종 평가: "+title); bonus=mult>=7?160:mult>=3?100:mult>=1?60:30;
  } else if(id==="academy"){
    const n=ri(2,5)+Math.round((ch-40)/20), pros=Math.max(1,n), caps=poisson(pros*.4), star=Math.random()<(.1+Math.max(0,(ch-50))/300+Math.max(0,(S.p.peak-80))/200);
    add(a0+1,club+" 근처에 '"+S.p.name+" 축구 아카데미'를 열었어요.");
    add(a0+5,"첫 졸업생 중 "+pros+"명이 프로 구단에 입단했어요.");
    if(caps) add(a0+9,"제자 가운데 "+caps+"명이 국가대표로 뽑혔어요.");
    if(star) add(a0+14,"제자 한 명이 월드 클래스로 성장해 '스승님'이라 불러 줘요.");
    title=star?"스타를 키운 스승":caps?"대표팀을 키운 지도자":"유소년의 아버지"; add(a0+15,"최종 평가: "+title); bonus=clamp(30+pros*8+caps*20+(star?100:0)+Math.round((ch-50)*.6),20,240);
    if(L.charDelta) L.charDelta(S,3,"은퇴 후: 유소년 아카데미");
  } else if(id==="owner"){
    const t=poisson(1.2+Math.max(0,lg/3000)); add(a0+1,"구단주로서 "+club+"을 이끌게 됐어요. 선수 시절의 경험이 큰 힘이에요.");
    add(a0+4,"새 감독과 선수단 개편을 단행했어요."); if(t) add(a0+9,"구단이 리그 우승 "+t+"회를 차지했어요!");
    title=t>=2?"왕조를 세운 구단주":t?"우승 구단주":"구단을 키운 구단주"; add(a0+12,"최종 평가: "+title); bonus=120+t*40;
  } else if(id==="stakeholder"){
    add(a0+1,"지분을 가진 구단의 이사회 멤버가 됐어요."); add(a0+5,"선수 출신 이사로서 이적 전략과 유스 시스템 개편에 목소리를 냈어요."); title="선수 출신 이사"; add(a0+8,"최종 평가: "+title); bonus=70;
  } else if(id==="family"){
    const kids=(S.kids||[]).length; add(a0+1,"조용히 가족 곁으로 돌아왔어요."); add(a0+3,kids?"아이들이 아버지의 경기 영상을 보며 자랐어요.":"가족과 함께 오랜만에 긴 여행을 떠났어요."); if(S.married) add(a0+10,"아내와 함께 작은 가게를 열었어요."); title="따뜻한 가장"; add(a0+15,"최종 평가: "+title); bonus=40+kids*10;
    if(L.charDelta) L.charDelta(S,2,"은퇴 후: 가족");
  }
  S.after={path:id,name:P.name,icon:P.icon,title,lines,bonus}; L.feedAdd(S,S.year+" 은퇴 후",P.name+" — "+title+" (+"+bonus+")",1);
  return S.after;
};
L.afterLegacy=S=>S.after?S.after.bonus:0;
})();

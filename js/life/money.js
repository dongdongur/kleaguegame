/*
 * K-라이프 돈 쓸 곳 (js/life/money.js)
 *  1) 전담 스태프: 해마다 비용을 내면 훈련·부상·컨디션 등에서 계속 도움을 줘요 (자금이 모자라면 자동 해지)
 *  2) 투자: 예금·부동산·주식·가상자산·카페·내 브랜드. 해마다 수익률이 정해지고 팔 수 있어요
 *  3) 명예: 자서전·재단·동상·구단 지분·구단 인수. 커리어 점수가 오르고 평판·인기가 올라요
 * 소비·후원 창의 탭에서 쓸 수 있어요.
 */
(function(){
"use strict";
const L=window.LIFE; if(!L) return;
const {clamp,r1,rnd,ri}=L;
const randn=()=>{ let u=0,v=0; while(!u) u=Math.random(); while(!v) v=Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };

/* ---------- 1) 스태프 ---------- */
L.STAFF=[
 {id:"chef",icon:"🍳",name:"개인 요리사",cost:.3,desc:"구간마다 컨디션 +3, 부상 확률 −5%"},
 {id:"physio",icon:"🩺",name:"전담 의료팀",cost:.9,desc:"부상 확률 −15%, 결장 기간 −20%"},
 {id:"coach",icon:"🧑‍🏫",name:"개인 기술 코치",cost:1.4,desc:"집중 훈련 성공 확률 +6%p"},
 {id:"mental",icon:"🧘",name:"멘탈 코치",cost:.6,desc:"구간마다 사기 +2, 슬럼프에 강해져요"},
 {id:"analyst",icon:"📊",name:"데이터 분석팀",cost:1.8,desc:"출전 비중 +2%p, 상대 분석으로 평점 소폭 상승"},
 {id:"agent",icon:"🤝",name:"프리미엄 에이전트",cost:1.2,desc:"재계약 연봉 +4%, 광고 계약금 +10%"},
 {id:"pr",icon:"📣",name:"홍보·SNS 팀",cost:1.0,desc:"시즌마다 인기 +2"}
];
L.hasStaff=(S,id)=>!!(S.staff&&S.staff.includes(id));
L.staffCost=(S,s)=>r1(s.cost*(1+Math.max(0,S.salary||0)*.06));
L.hire=function(S,id){ const s=L.STAFF.find(x=>x.id===id); if(!s) return {ok:false,text:"없는 스태프예요."}; S.staff=S.staff||[]; if(S.staff.includes(id)) return {ok:false,text:"이미 고용했어요."};
  const c=L.staffCost(S,s); if(S.funds<c) return {ok:false,text:"자금이 부족해요. (첫 해 비용 "+c+"억)"}; S.staff.push(id); S.funds=r1(S.funds-c); S.hired=S.hired||{}; S.hired[id]=S.year; L.feedAdd(S,S.year+" 소비",s.name+" 고용 (연 "+c+"억)",1); return {ok:true,text:s.name+"을(를) 고용했어요. 해마다 "+c+"억이 들어요."}; };
L.fire=function(S,id){ S.staff=(S.staff||[]).filter(x=>x!==id); const s=L.STAFF.find(x=>x.id===id); return {ok:true,text:(s?s.name:"스태프")+"와(과) 계약을 끝냈어요."}; };
/* 구간마다 */
L.moneySegment=function(S){ const notes=[]; if(S.stage!=="pro") return notes;
  if(L.hasStaff(S,"chef")){ S.cond=clamp(S.cond+3,0,100); }
  if(L.hasStaff(S,"mental")){ S.morale=clamp(S.morale+2,0,100); }
  return notes; };

/* ---------- 2) 투자 ---------- */
L.ASSETS=[
 {id:"bond",icon:"🏦",name:"예금·국채",mean:.03,vol:.006,min:1,desc:"거의 안 변해요. 연 3% 안팎."},
 {id:"estate",icon:"🏢",name:"서울 건물(부동산)",mean:.07,vol:.09,min:10,desc:"임대 수익과 시세 차익. 연 7% 안팎, 가끔 크게 출렁여요."},
 {id:"stock",icon:"📈",name:"주식 ETF",mean:.08,vol:.22,min:2,desc:"평균 연 8%, 해마다 ±22%쯤 출렁여요."},
 {id:"coin",icon:"🪙",name:"가상자산",mean:.12,vol:.65,min:1,desc:"대박과 쪽박이 모두 가능해요. 한 해에 반토막도 나요."},
 {id:"cafe",icon:"☕",name:"카페 창업",mean:.18,vol:.35,fail:.08,min:3,desc:"성공하면 짭짤하지만 폐업 위험(해마다 8%)이 있어요."},
 {id:"brand",icon:"👕",name:"내 이름 브랜드(의류)",mean:.15,vol:.5,fail:.06,fameScaled:true,min:15,desc:"인기가 높을수록 잘 팔려요. 실패하면 사라져요(해마다 6%)."}
];
L.assetDef=id=>L.ASSETS.find(a=>a.id===id);
L.buyAsset=function(S,id,amt){ const d=L.assetDef(id); if(!d) return {ok:false,text:"없는 상품이에요."}; amt=r1(amt);
  if(amt<d.min) return {ok:false,text:"최소 "+d.min+"억부터 투자할 수 있어요."}; if(S.funds<amt) return {ok:false,text:"자금이 부족해요."};
  S.assets=S.assets||[]; let a=S.assets.find(x=>x.id===id); if(!a){ a={id,cost:0,value:0,last:null,year:S.year}; S.assets.push(a); }
  a.cost=r1(a.cost+amt); a.value=r1(a.value+amt); S.funds=r1(S.funds-amt); L.feedAdd(S,S.year+" 투자",d.name+" "+amt+"억 투자",1); return {ok:true,text:d.name+"에 "+amt+"억을 투자했어요."}; };
L.sellAsset=function(S,id){ const a=(S.assets||[]).find(x=>x.id===id); if(!a) return {ok:false,text:"가진 자산이 아니에요."}; const d=L.assetDef(id); S.funds=r1(S.funds+a.value); const gain=r1(a.value-a.cost);
  S.assets=S.assets.filter(x=>x!==a); S.assetProfit=r1((S.assetProfit||0)+gain); L.feedAdd(S,S.year+" 투자",d.name+" 매각 ("+(gain>=0?"+":"")+gain+"억)",gain>=0?1:-1); return {ok:true,text:d.name+"을(를) 팔았어요. "+r1(a.value)+"억 회수 ("+(gain>=0?"+":"")+gain+"억)"}; };
L.assetValue=S=>r1((S.assets||[]).reduce((s,a)=>s+a.value,0));

/* ---------- 3) 명예 ---------- */
L.HONORS=[
 {id:"bio",icon:"📖",name:"자서전 출간",price:3,legacy:25,fame:5,rep:2,note:"내 이야기를 책으로 남겨요."},
 {id:"doc",icon:"🎬",name:"다큐멘터리 제작",price:8,legacy:45,fame:8,rep:3,note:"선수 인생을 담은 다큐가 공개돼요."},
 {id:"found",icon:"🎗️",name:"개인 재단 설립",price:30,legacy:90,rep:8,fame:3,yearly:-1.5,note:"해마다 1.5억씩 기부금이 나가요. 평판과 커리어 점수가 올라요."},
 {id:"statue",icon:"🗿",name:"구단 앞 동상 건립",price:120,legacy:120,fame:10,rep:5,needYears:5,note:"한 구단에서 5시즌 이상 뛰어야 세울 수 있어요."},
 {id:"stake",icon:"📑",name:"소속 구단 지분 인수(약 5%)",price:300,legacy:180,rep:6,fame:6,yield:.03,note:"해마다 지분 가치의 3%가 배당으로 들어와요."},
 {id:"owner",icon:"🏟️",name:"구단 인수 (구단주)",price:1500,legacy:420,rep:12,fame:12,yield:.02,note:"한 구단의 구단주가 돼요. 은퇴 후 '구단주' 칭호가 붙어요."}
];
L.honorDef=id=>L.HONORS.find(h=>h.id===id);
L.hasHonor=(S,id)=>!!(S.honors&&S.honors.some(h=>h.id===id));
L.buyHonor=function(S,id){ const h=L.honorDef(id); if(!h) return {ok:false,text:"없는 항목이에요."}; if(L.hasHonor(S,id)) return {ok:false,text:"이미 했어요."};
  if(S.funds<h.price) return {ok:false,text:"자금이 부족해요. (필요 "+h.price+"억)"};
  if(h.needYears){ const yrs=S.club?(S.clubYears||{})[S.club.name]||0:0; if(yrs<h.needYears) return {ok:false,text:"현재 구단에서 "+h.needYears+"시즌 이상 뛰어야 해요. (지금 "+yrs+"시즌)"}; }
  S.honors=S.honors||[]; S.honors.push({id,year:S.year,club:S.club?S.club.name:"",price:h.price});
  S.funds=r1(S.funds-h.price); if(h.fame) S.fame=clamp(S.fame+h.fame,0,100); if(h.rep) S.rep=clamp(S.rep+h.rep,0,100);
  L.addMoment(S,"명예",h.name,h.name+" ("+h.price+"억)"); L.feedAdd(S,S.year+" 명예",h.name,1); return {ok:true,text:h.name+" 완료! 커리어 점수 +"+h.legacy}; };
L.honorLegacy=S=>(S.honors||[]).reduce((s,x)=>s+((L.honorDef(x.id)||{}).legacy||0),0);

/* ---------- 해마다 정산 (시즌 결과 직후) ---------- */
L.moneyYear=function(S,R){
  const notes=[]; if(S.stage!=="pro"||R.youth) return notes; const tf=L.traitFx(S.p);
  /* 스태프 비용 */
  (S.staff||[]).slice().forEach(id=>{ const s=L.STAFF.find(x=>x.id===id); if(!s) return; const c=L.staffCost(S,s);
    if(S.funds>=c){ S.funds=r1(S.funds-c); notes.push(s.icon+" "+s.name+" 비용 −"+c+"억"); if(id==="pr"){ S.fame=clamp(S.fame+2,0,100); } }
    else { S.staff=S.staff.filter(x=>x!==id); notes.push("⚠ 자금이 부족해 "+s.name+"와(과) 계약이 끝났어요"); } });
  /* 투자 수익 */
  (S.assets||[]).slice().forEach(a=>{ const d=L.assetDef(a.id); if(!d) return; let mean=d.mean*(d.fameScaled?clamp(S.fame/60,.2,1.8):1), vol=d.vol;
    if(tf.invest>1){ mean*=tf.invest; vol*=.85; }
    if(d.fail&&Math.random()<d.fail*(tf.invest>1?.6:1)){ S.assets=S.assets.filter(x=>x!==a); S.assetProfit=r1((S.assetProfit||0)-a.value); notes.push(d.icon+" "+d.name+" 실패! 투자금 "+r1(a.value)+"억이 사라졌어요"); return; }
    const ret=clamp(mean+vol*clamp(randn(),-2.2,2.2),-.85,2.5); const before=a.value; a.value=r1(Math.max(0,a.value*(1+ret))); a.last=ret;
    notes.push(d.icon+" "+d.name+" "+(ret>=0?"+":"")+Math.round(ret*100)+"% ("+r1(before)+" → "+a.value+"억)"); });
  S.assets=(S.assets||[]).filter(a=>a.value>0.05);
  /* 명예 항목: 재단 기부금·구단 배당 */
  (S.honors||[]).forEach(x=>{ const h=L.honorDef(x.id); if(!h) return;
    if(h.yearly){ const c=-h.yearly; if(S.funds>=c){ S.funds=r1(S.funds-c); notes.push(h.icon+" "+h.name+" 기부금 −"+c+"억"); } else { S.rep=clamp(S.rep-2,0,100); notes.push("⚠ 재단 기부금을 못 내 평판이 조금 떨어졌어요"); } }
    if(h.yield){ const d=r1(x.price*h.yield); S.funds=r1(S.funds+d); notes.push(h.icon+" "+h.name+" 배당 +"+d+"억"); } });
  R.moneyNotes=notes; return notes;
};
})();

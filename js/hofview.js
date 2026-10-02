/*
 * 명예의 전당 상세 보기 (js/hofview.js)
 * 메인 화면과 선수판 어디서든 쓰는 구경용 팝업. 선수판 기록(life_hof)은 능력치·업적·커리어 전체를, 감독판 기록(results)은 라인업과 시즌 성적을 보여줘요.
 *   KLHofView.player(row)   KLHofView.manager(row)
 */
(function(){
"use strict";
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let css=false;
function style(){
  if(css) return; css=true; const s=document.createElement("style");
  s.textContent=`
.hv{position:fixed;inset:0;z-index:200;background:rgba(2,4,12,.82);display:flex;align-items:flex-end;justify-content:center;animation:hvf .15s}
@media(min-width:700px){.hv{align-items:center}}
@keyframes hvf{from{opacity:0}}
.hv .box{width:100%;max-width:560px;max-height:92dvh;overflow:auto;background:linear-gradient(180deg,#16224d,#0b1230);border:1px solid rgba(120,150,255,.25);border-radius:22px 22px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom,0));color:#eaf0ff;font:14px/1.55 "Noto Sans KR",system-ui,sans-serif;display:grid;gap:12px}
@media(min-width:700px){.hv .box{border-radius:22px}}
.hv h2{font:400 24px "Black Han Sans","Noto Sans KR",sans-serif;margin:0}
.hv h3{font:400 15px "Black Han Sans","Noto Sans KR",sans-serif;margin:6px 0 0;color:#19f2a3}
.hv small,.hv .mu{color:#8d9bc4;font-size:12.5px}
.hv .hd{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
.hv .pill{padding:4px 10px;border-radius:999px;background:rgba(255,207,74,.15);border:1px solid rgba(255,207,74,.5);color:#ffcf4a;font-weight:700;white-space:nowrap}
.hv .x{min-width:44px;min-height:44px;border-radius:12px;border:1px solid rgba(120,150,255,.25);background:rgba(255,255,255,.05);color:#eaf0ff;font-size:18px;cursor:pointer}
.hv .sb{display:grid;grid-template-columns:90px 1fr 32px;gap:8px;align-items:center;font-size:13px}
.hv .bar{height:8px;border-radius:6px;background:rgba(255,255,255,.08);overflow:hidden}.hv .bar i{display:block;height:100%;background:linear-gradient(90deg,#19f2a3,#27d7ff)}
.hv .sb b{text-align:right;font-family:Oswald,sans-serif}
.hv .kv{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.hv .kv div{padding:8px;border-radius:12px;background:rgba(255,255,255,.05);text-align:center}.hv .kv small{display:block}.hv .kv b{font:600 18px Oswald,sans-serif;color:#ffcf4a}
.hv .tribute{margin:10px 0 4px;padding:12px 14px 10px;border-radius:14px;background:linear-gradient(135deg,rgba(255,207,74,.14),rgba(255,207,74,.03));border:1px solid rgba(255,207,74,.4);font-size:14.5px;font-weight:600;line-height:1.5;position:relative}.hv .tribute span{font:700 28px serif;color:#ffcf4a;margin-right:4px;vertical-align:-8px}.hv .tribute small{display:block;margin-top:4px;font-weight:400;opacity:.7;text-align:right}
.hv .tags{display:flex;flex-wrap:wrap;gap:6px}.hv .tag{padding:4px 10px;border-radius:999px;background:rgba(39,215,255,.12);border:1px solid rgba(39,215,255,.35);font-size:12.5px}
.hv .tag.g{background:rgba(255,207,74,.12);border-color:rgba(255,207,74,.45)}
.hv table{width:100%;border-collapse:collapse;font-size:12.5px}.hv th,.hv td{padding:5px 4px;text-align:right;border-bottom:1px solid rgba(255,255,255,.07);white-space:nowrap}.hv th:nth-child(2),.hv td:nth-child(2){text-align:left}.hv th{color:#8d9bc4;font-weight:500}
.hv .tw{overflow-x:auto}
.hv .ln{display:grid;grid-template-columns:30px 1fr;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.07)}.hv .ln b{color:#19f2a3;font-family:Oswald,sans-serif}
.hv .pitch{position:relative;width:100%;aspect-ratio:3/4;border-radius:14px;background:repeating-linear-gradient(0deg,#0f5a31 0 36px,#116b39 36px 72px);border:2px solid rgba(255,255,255,.35);overflow:hidden}
.hv .pitch:before{content:"";position:absolute;left:0;right:0;top:50%;border-top:2px solid rgba(255,255,255,.25)}
.hv .pp{position:absolute;transform:translate(-50%,-50%);text-align:center;width:62px}
.hv .pp i{display:grid;place-items:center;width:34px;height:34px;margin:0 auto;border-radius:50%;background:#0b1230;border:2px solid #ffcf4a;color:#ffcf4a;font:700 14px Oswald,sans-serif;font-style:normal}
.hv .pp b{display:block;font-size:11.5px;line-height:1.15;text-shadow:0 1px 3px #000;margin-top:2px}
.hv .pp small{display:block;font-size:9.5px;color:#cfe0ff;text-shadow:0 1px 3px #000}
.hv .note{padding:10px 12px;border-radius:12px;background:rgba(255,207,74,.1);border:1px solid rgba(255,207,74,.3);color:#ffe9a8}
`; document.head.appendChild(s);
}
function open(html){
  style(); const w=document.createElement("div"); w.className="hv"; w.innerHTML='<div class="box">'+html+'</div>';
  const close=()=>w.remove(); w.addEventListener("click",e=>{ if(e.target===w||e.target.closest("[data-hvx]")) close(); });
  document.addEventListener("keydown",function k(e){ if(e.key==="Escape"){ close(); document.removeEventListener("keydown",k); } });
  document.body.appendChild(w);
}
const grp=(list)=>{ const m={}; (list||[]).forEach(a=>{ const k=a.name||a[0]; (m[k]=m[k]||[]).push(a.year||a[1]); }); return Object.entries(m).sort((a,b)=>b[1].length-a[1].length); };

/* 명예의 전당 후일담: 기록에 맞춰 헌정 한마디를 골라요 (전부 새로 쓴 가상의 말, 인용한 사람도 가상이에요) */
function tributeQ(r){
  const d=r.detail||{}, pos=r.pos||"";
  const gk=/GK/.test(pos), fw=/FW|ST|WG|CF|LW|RW/.test(pos), df=/DF|CB|LB|RB|WB/.test(pos), mf=!gk&&!fw&&!df;
  const nn=gk?"골키퍼":fw?"공격수":df?"수비수":"미드필더";
  const bal=r.ballon||0, sc=r.score||0, tr=r.trophies||0, aw=r.awards||0, g=r.goals||0, as=r.assists||0, ap=r.apps||0, cp=r.caps||0, yr=r.years||0, ch=d.char||0, fm=d.fame||0;
  const X=[]; const add=(ok,t,w)=>{ if(ok) X.push([t,w]); };
  /* 발롱도르 */
  add(bal>=5,"그보다 위대한 "+nn+"는 없었다.","축구 역사가");
  add(bal>=5,"발롱도르가 그의 이름을 따서 불려야 했다.","원로 기자");
  add(bal>=3,"한 세대의 "+nn+"가 아니라 한 시대의 "+nn+"였다.","원로 기자");
  add(bal>=3,"그의 이름 앞에서는 비교가 의미를 잃는다.","해설위원");
  add(bal>=3,"세 번째 황금 공을 들던 날, 상대 팬도 일어나 박수를 쳤다.","현장 취재기자");
  add(bal>=2,"한 번은 운, 두 번은 실력, 그 이상은 전설이다.","축구 칼럼니스트");
  add(bal>=1,"세계가 그를 한 번은 최고라고 불렀다.","해설위원");
  add(bal>=1,"황금 공을 든 그날, 모두가 일어서서 박수를 쳤다.","현장 취재기자");
  add(bal>=1,"그는 이제 시상식에서 가장 자주 호명되던 이름으로 남았다.","시상식 사회자");
  /* 우승·점수 */
  add(sc>=1500||tr>=18,"트로피장이 좁아서 새로 지어야 했다.","구단 관계자");
  add(sc>=1500||tr>=18,"이긴 횟수를 세다가 그만뒀다.","오랜 서포터");
  add(tr>=12,"그가 있는 팀은 시즌 초부터 우승 후보였다.","상대 감독");
  add(tr>=12,"우승 세리머니에 그가 없으면 사진이 어색할 정도였다.","구단 사진기자");
  add(tr>=6,"큰 경기에 강했다는 말은 그를 위해 있는 표현이다.","중계 캐스터");
  add(tr>=3,"트로피는 그가 지나간 자리에 남은 발자국이었다.","팬 카페 회원");
  add(aw>=15,"상은 그가 고르는 게 아니라, 상이 그를 찾아왔다.","시상식 사회자");
  add(aw>=8,"한 시즌의 활약이 아니라 한 시대의 꾸준함이었다.","리그 관계자");
  add(sc>=900,"기록이 증명하고, 기억이 완성한 선수.","축구 기록원");
  add(sc>=600,"화려하진 않아도 믿음직했던 이름.","동료");
  add(sc<300,"기록은 짧아도 기억은 길게 남는 선수가 있다.","오랜 팬");
  /* 공격수 */
  add(fw&&g>=500,"골대가 그를 보면 먼저 자리를 비켜 주었다.","수비수 동료");
  add(fw&&g>=500,"숫자가 너무 커서 이제는 기록이 아니라 신화다.","축구 기록원");
  add(fw&&g>=300,"그가 박스 안에 서면 경기장이 숨을 죽였다.","중계 캐스터");
  add(fw&&g>=300,"수비수들의 악몽은 늘 같은 등번호였다.","상대 수비수");
  add(fw&&g>=150,"득점은 재능이고, 꾸준함은 존경이다.","감독");
  add(fw&&g>=150,"골키퍼가 가장 보고 싶지 않았던 장면의 주인공.","골키퍼 코치");
  add(fw&&g>=60,"결정적인 순간에 가장 침착했던 사람.","동료 공격수");
  add(fw&&as>=100,"스스로 넣을 수도 있었는데, 더 좋은 자리의 동료에게 내줬다.","동료");
  add(fw&&ap>=400,"공격수로 이렇게 오래 뛴다는 건 그 자체로 기록이다.","트레이너");
  /* 미드필더 */
  add(mf&&as>=150,"그의 발끝에서 시작된 골은 셀 수 없다.","동료 공격수");
  add(mf&&as>=150,"공격수들은 그가 공을 잡으면 이미 뛰기 시작했다.","동료 공격수");
  add(mf&&as>=80,"경기는 그의 템포로 흘렀다.","상대 감독");
  add(mf&&g>=100,"중원에서 시작해 박스 안에서 끝내는 사람.","해설위원");
  add(mf&&ap>=500,"그가 뛴 중원은 단 한 번도 비어 있던 적이 없다.","팀 동료");
  add(mf,"보이지 않는 곳에서 팀을 움직이던 사람.","전술 분석가");
  add(mf,"패스 한 번이 경기장의 공기를 바꿨다.","중계 캐스터");
  /* 수비수 */
  add(df&&ap>=400,"그가 뒤에 있으면 동료들은 앞만 보았다.","동료");
  add(df&&ap>=400,"공격수들이 가장 만나기 싫었던 이름.","상대 공격수");
  add(df,"최고의 수비는 '아무 일도 없었다'는 얼굴로 끝난다.","수비 코치");
  add(df,"그의 태클 소리가 홈 팬에게는 응원가였다.","서포터");
  add(df&&g>=30,"수비수가 골까지 넣으니 상대는 막을 곳이 없었다.","상대 감독");
  /* 골키퍼 */
  add(gk&&ap>=400,"마지막 선은 늘 그가 지켰다.","수비수 동료");
  add(gk,"슛이 나가는 순간 그는 이미 알고 있었다.","골키퍼 코치");
  add(gk,"그가 서 있는 골문은 작아 보였다.","상대 공격수");
  add(gk&&tr>=3,"우승의 절반은 그가 막은 슛으로 만들어졌다.","수석코치");
  /* 인성·인기 */
  add(ch>=80,"실력은 기록으로, 사람됨은 기억으로 남았다.","후배 선수");
  add(ch>=80,"그는 이기고도 상대 팬에게 먼저 인사했다.","원정 팬");
  add(ch>=80,"그를 싫어하는 사람을 찾기가 더 어려웠다.","동료");
  add(ch>=65,"경기장 밖에서도 모범이 된 선수.","구단 직원");
  add(ch>0&&ch<=30,"논란도 그의 이야기의 일부였다. 그래도 실력만큼은 인정이다.","기자");
  add(ch>0&&ch<=30,"불꽃같았고, 그만큼 뜨겁게 논란도 따라다녔다.","칼럼니스트");
  add(fm>=300,"그가 입국하면 공항이 마비됐다.","공항 직원");
  add(fm>=300,"축구를 모르는 사람도 그의 이름은 안다.","방송 PD");
  add(fm>=190,"그의 유니폼은 전 세계 어디서나 볼 수 있었다.","스포츠 용품 업계");
  add(fm>=100,"한국을 넘어 아시아가 알았던 얼굴.","외신 기자");
  /* 영구결번·구단 */
  add(r.jersey,"그의 번호는 이제 아무도 입을 수 없다. 그래야만 한다.","서포터즈 대표");
  add(r.jersey,"번호는 비었지만 그 자리는 한 번도 비어 있지 않았다.","구단 관계자");
  add(r.jersey,"유니폼은 걸렸고, 그의 이야기는 계속 불린다.","팬 카페 회원");
  add(yr>=15&&r.jersey,"한 팀에서 오래 뛴 사람만이 얻는 번호가 있다.","구단 역사가");
  /* 대표팀 */
  add(cp>=150,"태극마크를 달고 뛴 모든 밤이 우리의 밤이었다.","국가대표 동료");
  add(cp>=100,"그가 주장 완장을 차면 대표팀 라커룸이 조용해졌다.","대표팀 코치");
  add(cp>=50,"국가대표는 자리가 아니라 책임이라는 걸 보여 줬다.","협회 관계자");
  add(cp>=1&&cp<50,"태극마크를 단 순간의 떨림은 평생 기억에 남는다.","국가대표 선배");
  /* 커리어 길이·성장 */
  add(yr>=18,"이렇게 오래 뛰었다는 것 자체가 하나의 재능이다.","트레이너");
  add(yr>=18,"그의 데뷔를 본 아이가 그의 은퇴를 본 어른이 되었다.","오랜 팬");
  add(yr>=12,"오래 뛴 선수만이 보여 줄 수 있는 침착함.","동료");
  add(yr>0&&yr<=8,"짧고 강렬했다. 그래서 더 오래 기억된다.","팬 카페 회원");
  add(r.peak>=95,"전성기의 그는 같은 경기를 다른 속도로 뛰는 것 같았다.","상대 감독");
  add(r.peak>=90,"그가 전성기였을 때 리그의 기준이 바뀌었다.","해설위원");
  add(r.peak>=85,"기술이 한 단계 위에 있다는 걸 모두가 알았다.","전술 분석가");
  add(d.hidden,"그에게는 설명하기 어려운 무언가가 있었다.","스카우트");
  add(d.after,"은퇴 뒤에도 그는 축구 곁을 떠나지 않았다.","방송 해설자");
  add(d.family&&d.family.kids&&d.family.kids.length,"그는 이제 아버지로서 새 이야기를 쓰고 있다.","오랜 팬");
  /* 일반 */
  const G=[["공은 둥글고 이야기는 길다. 그의 이야기는 아직 끝나지 않았다.","익명의 팬"],["이름은 잊혀도 장면은 남는다.","관중석의 어느 팬"],["우리는 같은 시대를 살았다. 그것만으로 충분하다.","오랜 팬"],["그가 달린 거리만큼 우리의 응원도 길어졌다.","서포터"],["유니폼은 낡아도 순간은 낡지 않는다.","팬 카페 회원"],["축구는 결국 사람 이야기다. 그는 좋은 이야기였다.","칼럼니스트"],["그 시절 토요일이 즐거웠던 이유 중 하나.","퇴근길 팬"],["그가 뛰던 경기는 끝나도 장면은 계속 재생된다.","하이라이트 편집자"]];
  const pool=X.length>=3?X:X.concat(G);
  let x=0; const s=String(r.id||"")+(r.name||""); for(let i=0;i<s.length;i++) x=(x*31+s.charCodeAt(i))>>>0;
  return pool[x%pool.length];
}
function tribute(r){ const q=tributeQ(r); return '<div class="tribute"><span>“</span>'+esc(q[0])+'<small>— '+esc(q[1])+' (가상)</small></div>'; }
function player(r){
  const d=r.detail;
  let h=`<div class="hd"><div><small>${esc(r.pos)} · ${esc(r.type_name||"")} · by ${esc(r.nickname)}</small><h2>${esc(r.name)}</h2><small>${esc(r.club)} · ${r.years}년${r.jersey?" · 🎽 영구결번":""}</small></div><div style="text-align:right"><span class="pill">${esc(r.grade)} ${r.score}</span><br><button class="x" data-hvx style="margin-top:6px">✕</button></div></div>`;
  h+=tribute(r);
  h+=`<div class="kv"><div><small>전성기 OVR</small><b>${r.peak}</b></div><div><small>출전</small><b>${r.apps}</b></div><div><small>골 / 도움</small><b>${r.goals} / ${r.assists}</b></div><div><small>대표팀</small><b>${r.caps}</b></div><div><small>우승 / 수상</small><b>${r.trophies} / ${r.awards}</b></div><div><small>발롱도르</small><b>${r.ballon}회</b></div></div>`;
  if(!d){ h+=`<p class="note">이 선수는 상세 기록이 함께 올라오기 전에 등록됐어요. 위 요약만 볼 수 있어요. (새로 등록하는 선수부터 능력치·업적·시즌별 커리어를 모두 볼 수 있어요)</p>`; open(h); return; }
  const tags=[]; if(d.ver&&(d.ver.start||d.ver.end)) tags.push("플레이 버전 "+(d.ver.start&&d.ver.start!==d.ver.end?"v"+d.ver.start+" → v"+d.ver.end:"v"+(d.ver.end||d.ver.start))); if(d.sub) tags.push(d.sub); if(d.role) tags.push(d.role); if(d.foot) tags.push(d.foot); if(d.trait) tags.push(d.trait); if(d.hidden) tags.push("✨ "+d.hidden); if(d.height) tags.push(d.height+"cm "+d.weight+"kg");
  h+=`<div class="tags">${tags.map(t=>`<span class="tag">${esc(t)}</span>`).join("")}</div>`;
  if(d.family&&(d.family.married||(d.family.kids&&d.family.kids.length))) h+=`<div class="tags">${d.family.married?`<span class="tag">💍 결혼</span>`:""}${(d.family.kids||[]).map(k=>`<span class="tag">👶 ${esc(k)}</span>`).join("")}</div>`;
  if(d.after) h+=`<h3>은퇴 후: ${esc(d.after.name)} — ${esc(d.after.title)}</h3>`+d.after.lines.map(x=>`<div class="ln"><b>${x[0]}</b><span>${esc(x[1])}</span></div>`).join("");
  if(d.fameTier||d.charTier) h+=`<div class="tags">${d.fameTier?`<span class="tag g">🌟 인기 ${esc(d.fameTier)} (${d.fame})</span>`:""}${d.charTier?`<span class="tag">🙂 인성 ${esc(d.charTier)} (${d.char})</span>`:""}</div>`;
  if(d.styleLog&&d.styleLog.length) h+=`<h3>포지션·역할 변경 기록</h3>`+d.styleLog.map(x=>`<div class="ln"><b>${x[0]}</b><span>${esc(x[2])} <small>(${x[1]}세)</small></span></div>`).join("");
  if(d.titles&&d.titles.length) h+=`<div class="tags">${d.titles.map(t=>`<span class="tag g">${esc(t)}</span>`).join("")}</div>`;
  if(d.stats&&d.stats.length){ h+=`<h3>능력치 (전성기 ${r.peak} · 은퇴 시 ${d.ovr})</h3>`+d.stats.map(s=>`<div class="sb"><span>${esc(s[0])}</span><div class="bar"><i style="width:${s[1]}%"></i></div><b>${s[1]}</b></div>`).join(""); }
  if(d.trophies&&d.trophies.length){ h+=`<h3>우승 기록</h3>`+grp(d.trophies).map(([n,ys])=>`<div class="ln"><b>${ys.length}</b><span>${esc(n)} <small>${ys.join(", ")}</small></span></div>`).join(""); }
  if(d.awards&&d.awards.length){ h+=`<h3>개인 수상 · 업적</h3>`+grp(d.awards).map(([n,ys])=>`<div class="ln"><b>${ys.length}</b><span>${esc(n)} <small>${ys.join(", ")}</small></span></div>`).join(""); }
  if(d.jerseys&&d.jerseys.length) h+=`<h3>영구결번</h3>`+d.jerseys.map(j=>`<div class="ln"><b>${esc(j.number)}</b><span>${esc(j.club)}</span></div>`).join("");
  if(d.chain&&d.chain.length) h+=`<h3>팀 흐름</h3><p>${d.chain.map(c=>esc(c)).join(" → ")}</p>`;
  if(d.ballon&&d.ballon.length) h+=`<h3>발롱도르 순위</h3><p class="mu">${d.ballon.map(b=>b[0]+"년 "+b[1]+"위").join(" · ")}</p>`;
  if(d.seasons&&d.seasons.length){ h+=`<h3>시즌별 커리어</h3><div class="tw"><table><tr><th>나이</th><th>팀</th><th>리그</th><th>출전</th><th>골</th><th>도움</th><th>평점</th><th>OVR</th></tr>${d.seasons.map(s=>`<tr><td>${s[0]}</td><td>${esc(s[1])}</td><td>${esc(s[2])}</td><td>${s[3]}</td><td>${s[4]}</td><td>${s[5]}</td><td>${s[6]||"-"}</td><td>${s[7]||""}</td></tr>`).join("")}</table></div>`; }
  open(h);
}
const FORMS={"4-3-3":[["GK",50,90],["LB",14,70],["CB",37,75],["CB",63,75],["RB",86,70],["CM",28,50],["CM",50,55],["CM",72,50],["LW",17,24],["ST",50,15],["RW",83,24]],"4-4-2":[["GK",50,90],["LB",14,70],["CB",37,75],["CB",63,75],["RB",86,70],["LM",14,45],["CM",38,51],["CM",62,51],["RM",86,45],["ST",36,19],["ST",64,19]],"3-5-2":[["GK",50,90],["CB",26,74],["CB",50,77],["CB",74,74],["LWB",10,47],["CM",32,55],["AM",50,40],["CM",68,55],["RWB",90,47],["ST",36,18],["ST",64,18]],"4-2-3-1":[["GK",50,90],["LB",14,70],["CB",37,75],["CB",63,75],["RB",86,70],["DM",36,59],["DM",64,59],["LW",17,35],["AM",50,37],["RW",83,35],["ST",50,14]],"4-1-4-1":[["GK",50,90],["LB",14,72],["CB",37,76],["CB",63,76],["RB",86,72],["DM",50,60],["LM",14,42],["CM",38,47],["CM",62,47],["RM",86,42],["ST",50,15]],"4-4-1-1":[["GK",50,90],["LB",14,72],["CB",37,76],["CB",63,76],["RB",86,72],["LM",14,52],["CM",38,56],["CM",62,56],["RM",86,52],["AM",50,33],["ST",50,14]],"4-3-2-1":[["GK",50,90],["LB",14,72],["CB",37,76],["CB",63,76],["RB",86,72],["CM",28,57],["CM",50,60],["CM",72,57],["AM",33,34],["AM",67,34],["ST",50,14]],"4-1-2-1-2":[["GK",50,90],["LB",14,72],["CB",37,76],["CB",63,76],["RB",86,72],["DM",50,62],["CM",28,50],["CM",72,50],["AM",50,36],["ST",38,16],["ST",62,16]],"3-4-3":[["GK",50,90],["CB",26,75],["CB",50,77],["CB",74,75],["LWB",11,52],["CM",38,56],["CM",62,56],["RWB",89,52],["LW",18,25],["ST",50,15],["RW",82,25]],"3-4-2-1":[["GK",50,90],["CB",26,75],["CB",50,77],["CB",74,75],["LWB",11,52],["CM",38,57],["CM",62,57],["RWB",89,52],["AM",32,33],["AM",68,33],["ST",50,14]],"5-3-2":[["GK",50,90],["LWB",10,62],["CB",30,76],["CB",50,78],["CB",70,76],["RWB",90,62],["CM",28,48],["CM",50,52],["CM",72,48],["ST",38,18],["ST",62,18]],"5-4-1":[["GK",50,90],["LWB",10,62],["CB",30,76],["CB",50,78],["CB",70,76],["RWB",90,62],["LM",15,44],["CM",38,50],["CM",62,50],["RM",85,44],["ST",50,15]]};
function pitch(form,xi,ov){
  const sl=FORMS[form]; if(!sl||!xi||xi.length!==11) return "";
  const dots=xi.map((p,i)=>{ const s=sl[i], o=ov&&ov[i]!=null?ov[i]:""; const nm=String(p[0]||p).split(" ").slice(-1)[0]; return '<div class="pp" style="left:'+s[1]+'%;top:'+s[2]+'%"><i>'+esc(o)+'</i><b>'+esc(nm)+'</b><small>'+esc(s[0])+(p[1]?" · "+esc(String(p[1]).slice(0,9)):"")+'</small></div>'; }).join("");
  return '<div class="pitch">'+dots+'</div>';
}
function manager(r){
  let h=`<div class="hd"><div><small>by ${esc(r.nickname)} · ${esc(r.form)}${r.manager?" · 감독 "+esc(r.manager):""}</small><h2>${esc(r.team_name)}</h2><small>${r.w}승 ${r.d}무 ${r.l}패 · ${r.rank}위 · 득실 ${r.gf}:${r.ga}</small></div><div style="text-align:right"><span class="pill">${r.pts}점</span><br><button class="x" data-hvx style="margin-top:6px">✕</button></div></div>`;
  const t=r.team||{}, ov=t.ov, cr=t.cr;
  const sum=ov?ov.reduce((a,b)=>a+(b||0),0):null;
  h+=(t.ver?'<div class="tags"><span class="tag">플레이 버전 v'+esc(t.ver)+'</span></div>':'')+'<div class="kv"><div><small>포메이션</small><b>'+esc(t.f||r.form)+'</b></div><div><small>선발 총 능력치</small><b>'+(sum!=null?sum+' <small>(평균 '+(sum/11).toFixed(1)+')</small>':'-')+'</b></div><div><small>시즌 수</small><b>'+(cr?cr.n:(r.season||1))+'</b></div></div>';
  if(r.diff) h+='<div class="tags"><span class="tag '+(r.diff==="hard"?"g":"")+'">'+(r.diff==="hard"?"어려움":"쉬움")+'</span>'+(t.rm?'<span class="tag">'+(t.rm==="prime"?"전성기 능력치":"시즌 능력치")+'</span>':'')+(t.m?'<span class="tag">감독 '+esc(t.m)+'</span>':'')+'</div>';
  const pt=(t.xi&&t.xi.length===11)?pitch(t.f||r.form,t.xi,ov):"";
  if(pt) h+='<h3>선발 라인업</h3>'+pt;
  else if((r.xi||[]).length) h+='<h3>선발 라인업</h3>'+r.xi.map((n,i)=>'<div class="ln"><b>'+(i+1)+'</b><span>'+esc(n)+'</span></div>').join("");
  if(t.b&&t.b.length) h+='<h3>후보</h3><p class="mu">'+t.b.map(b=>esc(b[0])+(b[1]?" ("+esc(String(b[1]).slice(0,8))+")":"")).join(" · ")+'</p>';
  if(cr){
    const T=cr.tr||{}; const tags=[]; if(T.league) tags.push("K리그1 우승 "+T.league+"회"); if(T.k2) tags.push("K리그2 우승 "+T.k2+"회"); if(T.fa) tags.push("FA컵 우승 "+T.fa+"회"); if(T.acl) tags.push("AFC 챔피언스리그 우승 "+T.acl+"회"); if(cr.tre) tags.push("🏆 트레블 "+cr.tre+"회"); if(cr.dbl) tags.push("더블 "+cr.dbl+"회");
    h+='<h3>커리어 업적</h3>'+(tags.length?'<div class="tags">'+tags.map(x=>'<span class="tag g">'+esc(x)+'</span>').join("")+'</div>':'<p class="mu">아직 우승 기록이 없어요.</p>');
    if(cr.h&&cr.h.length) h+='<h3>시즌별 성적</h3><div class="tw"><table><tr><th>시즌</th><th>리그</th><th>순위</th><th>승점</th><th>승</th><th>무</th><th>패</th><th>우승</th></tr>'+cr.h.map(s=>'<tr><td>'+s[0]+'</td><td>'+(s[2]===1?"K1":"K2")+'</td><td>'+s[3]+'</td><td>'+s[4]+'</td><td>'+s[5]+'</td><td>'+s[6]+'</td><td>'+s[7]+'</td><td style="text-align:left;white-space:normal">'+esc((s[10]||"").replace(/\//g,", "))+'</td></tr>').join("")+'</table></div>';
  } else h+='<p class="note">이 기록은 커리어 정보가 함께 올라오기 전에 등록됐어요. 라인업과 시즌 성적만 볼 수 있어요.</p>';
  open(h);
}
window.KLHofView={player,manager,tributeQ};
})();

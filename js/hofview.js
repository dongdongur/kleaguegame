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

function player(r){
  const d=r.detail;
  let h=`<div class="hd"><div><small>${esc(r.pos)} · ${esc(r.type_name||"")} · by ${esc(r.nickname)}</small><h2>${esc(r.name)}</h2><small>${esc(r.club)} · ${r.years}년${r.jersey?" · 🎽 영구결번":""}</small></div><div style="text-align:right"><span class="pill">${esc(r.grade)} ${r.score}</span><br><button class="x" data-hvx style="margin-top:6px">✕</button></div></div>`;
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
window.KLHofView={player,manager};
})();

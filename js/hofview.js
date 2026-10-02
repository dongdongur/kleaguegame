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
  const tags=[]; if(d.sub) tags.push(d.sub); if(d.role) tags.push(d.role); if(d.foot) tags.push(d.foot); if(d.trait) tags.push(d.trait); if(d.hidden) tags.push("✨ "+d.hidden); if(d.height) tags.push(d.height+"cm "+d.weight+"kg");
  h+=`<div class="tags">${tags.map(t=>`<span class="tag">${esc(t)}</span>`).join("")}</div>`;
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
function manager(r){
  let h=`<div class="hd"><div><small>by ${esc(r.nickname)} · ${esc(r.form)}${r.manager?" · 감독 "+esc(r.manager):""}</small><h2>${esc(r.team_name)}</h2><small>${r.w}승 ${r.d}무 ${r.l}패 · ${r.rank}위 · 득실 ${r.gf}:${r.ga}</small></div><div style="text-align:right"><span class="pill">${r.pts}점</span><br><button class="x" data-hvx style="margin-top:6px">✕</button></div></div>`;
  const xi=r.xi||[]; if(xi.length) h+=`<h3>선발 라인업</h3>`+xi.map((n,i)=>`<div class="ln"><b>${i+1}</b><span>${esc(n)}</span></div>`).join("");
  else h+=`<p class="note">라인업 정보가 없어요.</p>`;
  open(h);
}
window.KLHofView={player,manager};
})();

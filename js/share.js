/* 친구들과 기록 공유: Supabase REST로 결과를 저장하고 순위표·맞대결 전적을 보여줘요 */
(function(){
"use strict";
const C = window.KL_CONFIG || {};
const enabled = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY);
const H = {apikey:C.SUPABASE_ANON_KEY, Authorization:"Bearer "+C.SUPABASE_ANON_KEY, "Content-Type":"application/json"};
const $ = id => document.getElementById(id);
const el = (t,c,x)=>{const e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e;};
let sort = "pts";
let rows = [];
let duelStats = {};   // defender_id -> {w,l}

const url = p => C.SUPABASE_URL+"/rest/v1/"+p;
async function post(table,row,optional){
  if(!enabled) throw new Error("공유 서버가 설정되지 않았어요");
  const send=body=>fetch(url(table),{method:"POST",headers:Object.assign({Prefer:"return=minimal"},H),body:JSON.stringify(body)});
  let r=await send(row);
  /* 새 컬럼이 아직 없는 DB라면 옛 형식으로 한 번 더 시도해요 */
  if(!r.ok && optional && r.status===400){ const slim=Object.assign({},row); optional.forEach(k=>delete slim[k]); r=await send(slim); }
  if(!r.ok) throw new Error("저장 실패 ("+r.status+")");
}
const save = row => post("results",row,["team","season","diff"]);
const saveDuel = row => post("duels",row,null);

async function getJson(path){ const r=await fetch(url(path),{headers:H}); if(!r.ok) throw new Error("불러오기 실패 ("+r.status+")"); return r.json(); }
async function load(){
  const order = sort==="pts" ? "pts.desc,gf.desc,created_at.desc" : "created_at.desc";
  const sel="id,created_at,nickname,team_name,form,mode,diff,manager,w,d,l,pts,gf,ga,rank,season,team,xi";
  let data;
  try{ data = await getJson("results?select="+sel+"&order="+order+"&limit=30"); }
  catch(e){ data = await getJson("results?select=id,created_at,nickname,team_name,form,mode,manager,w,d,l,pts,gf,ga,rank,xi&order="+order+"&limit=30"); }
  try{ const d=await getJson("duels?select=defender_id,winner&limit=1000"); duelStats={}; d.forEach(x=>{ const s=duelStats[x.defender_id]||(duelStats[x.defender_id]={w:0,l:0}); if(x.winner==="defender") s.w++; else s.l++; }); }
  catch(e){ duelStats={}; }
  return data;
}

function render(){
  const box=$("shared"); box.innerHTML="";
  if(!rows.length){ box.appendChild(el("p","hint","아직 올라온 기록이 없어요. 첫 기록을 올려 보세요!")); return; }
  const ul=el("ul","lb");
  rows.forEach((r,i)=>{
    const li=el("li","lbrow");
    li.appendChild(el("span","lbn",String(i+1)));
    const who=el("span","lbw",r.nickname);
    who.appendChild(el("small",null,r.team_name+" · "+r.form+(r.manager?" · 감독 "+r.manager:"")+(r.mode==="pos"?" · 연도+포지션":"")+(r.diff==="hard"?" · 어려움":"")+(r.season>1?" · 시즌 "+r.season:"")));
    li.appendChild(who);
    li.appendChild(el("span","lbr",r.w+"승 "+r.d+"무 "+r.l+"패 · "+r.rank+"위"));
    li.appendChild(el("span","lbp",r.pts+"점"));
    const act=el("span","lba");
    const ds=duelStats[r.id]; if(ds) act.appendChild(el("small",null,"방어 "+ds.w+"승 "+ds.l+"패"));
    if(r.team && window.KLDuel){ const b=el("button","btn small","도전"); b.type="button"; b.onclick=()=>KLDuel.open(r); act.appendChild(b); }
    li.appendChild(act);
    ul.appendChild(li);
  });
  box.appendChild(ul);
}
async function refresh(){
  const sec=$("sharedWrap"); if(!sec) return;
  if(!enabled){ sec.hidden=true; return; }
  sec.hidden=false;
  try{ rows=await load(); render(); }
  catch(e){ const b=$("shared"); b.innerHTML=""; b.appendChild(el("p","hint","기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.")); }
}

function init(){
  const seg=$("sharedSort"); if(!seg) return;
  [["pts","승점순"],["new","최신순"]].forEach(([k,t])=>{
    const b=el("button",null,t); b.type="button"; b.setAttribute("aria-pressed",String(k===sort));
    b.onclick=()=>{ sort=k; [...seg.children].forEach(c=>c.setAttribute("aria-pressed",String(c===b))); refresh(); };
    seg.appendChild(b);
  });
  refresh();
}

window.KLShare = {enabled, save, saveDuel, refresh};
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
})();

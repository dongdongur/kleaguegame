/*
 * K리그 공식 사이트(kleague.com) 선수 상세 페이지에서 통산·시즌별 기록(출장·득점·도움 / 골키퍼는 출장·실점·클린시트)과
 * 생년월일·키를 읽어요. 선수 한 명당 페이지 한 장이고, 요청 사이에 시간을 두며 이미 받은 선수는 건너뛰어요(다시 실행하면 이어서 받아요).
 *
 *     node tools/fetch_records.mjs
 *
 * 입력: data-raw/kleague_squads.json (tools/fetch_squads.mjs 결과)   결과: data-raw/records.json
 * 시즌 행: [연도, 팀, [K1], [K2], [PO], [리그컵], [슈퍼컵], [합계]]  (각 대회 [출장,득점,도움] 또는 GK는 [출장,실점,클린시트], 없으면 null)
 */
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,"$1")), "..");
const UA = "Mozilla/5.0 (K-Legend-38 personal fan project)";
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const out = path.join(root,"data-raw/records.json");
const sq = JSON.parse(fs.readFileSync(path.join(root,"data-raw/kleague_squads.json"),"utf8"));
const rec = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out,"utf8")) : {};

function parse(html){
  const s = html.replace(/<script[\s\S]*?<\/script>/g,"").replace(/<style[\s\S]*?<\/style>/g,"");
  const t = s.replace(/<[^>]+>/g,"|").replace(/&nbsp;/g," ").split("|").map(x=>x.trim()).filter(Boolean);
  const after = k => { const i=t.indexOf(k); return i>=0 ? t[i+1] : null; };
  const info = {birth:after("생년월일"), height:+after("키")||null, weight:+after("몸무게")||null, nat:after("국적")};
  const a = t.indexOf("시즌별"), b = t.indexOf("합계", a);
  if(a<0||b<0) return {...info, seasons:[]};
  const seg = t.slice(a+1,b);
  let i = 0; while(i<seg.length && !/^\d{4}$/.test(seg[i])) i++;
  const seasons = [];
  while(i+20<=seg.length){
    const row = seg.slice(i,i+20); if(!/^\d{4}$/.test(row[0])) break;
    const comps=[]; for(let c=0;c<6;c++){ const v=row.slice(2+c*3,5+c*3); comps.push(v.every(x=>x==="-")?null:v.map(x=>x==="-"?0:+x)); }
    seasons.push([+row[0],row[1],...comps]); i+=20;
  }
  return {...info, gk: undefined, seasons};
}
const players = sq.clubs.flatMap(c=>c.players.map(p=>({...p,club:c.name})));
let n=0, fail=0;
for(const p of players){
  if(rec[p.id]) continue;
  try{
    const r = await fetch("https://www.kleague.com/record/playerDetail.do?playerId="+p.id,{headers:{"User-Agent":UA,"Accept-Language":"ko-KR"}});
    if(!r.ok) throw new Error("HTTP "+r.status);
    const d = parse(await r.text()); d.pos=p.pos; d.name=p.name; rec[p.id]=d;
  }catch(e){ fail++; console.log("실패",p.id,p.name,e.message); }
  if(++n%25===0){ fs.writeFileSync(out,JSON.stringify(rec)); console.log(n+"/"+players.length); }
  await sleep(350);
}
fs.writeFileSync(out,JSON.stringify(rec));
console.log("완료",Object.keys(rec).length,"명, 실패",fail);

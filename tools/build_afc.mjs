/* data-raw/afc_squads.json (tools/fetch_afc.mjs 결과) → js/data_afc_squads.js
 * 구단마다 선수 최대 28명 [이름, 포지션] 만 남겨요. 한글 이름이 없는 선수는 영어 이름 그대로예요. */
import fs from "node:fs"; import path from "node:path";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,"$1")), "..");
const src = JSON.parse(fs.readFileSync(path.join(root,"data-raw/afc_squads.json"),"utf8"));
const out = {}; let n = 0, ko = 0;
for(const [club,v] of Object.entries(src)){
  const seen = new Set(), list = [];
  for(const p of v.players){ const k = p.name.replace(/\s+/g,"").toLowerCase(); if(seen.has(k)) continue; seen.add(k); list.push([p.name,p.pos]); if(p.ko) ko++; if(list.length>=28) break; }
  if(list.length){ out[club]=list; n += list.length; }
}
fs.writeFileSync(path.join(root,"js/data_afc_squads.js"),
 "/* AFC 참가팀 선수단 (위키백과 현재 선수단 표에서 수집, tools/build_afc.mjs 로 생성) — 이름·포지션만, 능력치는 core.js 가 팀 수준으로 추정해요 */\nwindow.KL_AFC_SQUADS = "+JSON.stringify(out)+";\n");
console.log("구단",Object.keys(out).length,"선수",n,"(한글 이름",ko+")");

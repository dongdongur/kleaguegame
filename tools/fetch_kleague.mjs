/*
 * K리그 공식 API에서 시즌별 선수 기록을 내려받아 data-raw/ 폴더에 JSON으로 저장해요.
 * (브라우저가 아니라 내 컴퓨터에서 한 번만 실행하는 도구예요. API 키가 사이트에 노출되면 안 되거든요.)
 *
 * 사전 준비: 프로젝트 맨 위 폴더에 .env 파일을 만들고 한 줄을 적어요. (.env는 git에 올라가지 않아요)
 *     KLEAGUE_AUTH_KEY=발급받은키
 *
 * 사용법:
 *     node tools/fetch_kleague.mjs 2026            # 2026년 (K리그1: meet_seq=1)
 *     node tools/fetch_kleague.mjs 2024 2026       # 2024~2026년
 *     node tools/fetch_kleague.mjs 2026 2026 2     # 대회순번을 2로 (K리그2일 가능성, 문서 확인 필요)
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,"$1")), "..");
function readEnv(){
  const f = path.join(root, ".env"); if(!fs.existsSync(f)) return {};
  return Object.fromEntries(fs.readFileSync(f,"utf8").split(/\r?\n/).map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,"")]));
}
const KEY = process.env.KLEAGUE_AUTH_KEY || readEnv().KLEAGUE_AUTH_KEY;
if(!KEY){ console.error("API 키가 없어요. 프로젝트 폴더의 .env 파일에 KLEAGUE_AUTH_KEY=키 한 줄을 적어 주세요."); process.exit(1); }

const y0 = +process.argv[2]; const y1 = +(process.argv[3]||process.argv[2]); const seq = process.argv[4]||"1";
if(!y0){ console.error("사용법: node tools/fetch_kleague.mjs 시작년도 [끝년도] [대회순번]"); process.exit(1); }
const outDir = path.join(root,"data-raw"); fs.mkdirSync(outDir,{recursive:true});
const sleep = ms => new Promise(r=>setTimeout(r,ms));

for(let y=y0;y<=y1;y++){
  const url = `https://api.kleague.com/api/HAPlayerRecord.do?meet_year=${y}&meet_seq=${seq}&home_type=0&excludingPO=N`;
  try{
    const r = await fetch(url,{headers:{authKey:KEY}});
    const j = await r.json();
    const res = j.response||{};
    if(!r.ok || res.resultCode!=="00"){ console.log(`${y} (seq ${seq}): 실패 HTTP ${r.status} code=${res.resultCode} msg=${res.resultMsg}`); continue; }
    const list = res.list||[];
    fs.writeFileSync(path.join(outDir,`HAPlayerRecord_${y}_${seq}.json`), JSON.stringify(list));
    const teams = new Set(list.map(p=>p.TEAM_NAME));
    console.log(`${y} (seq ${seq}): 선수 ${list.length}명, 팀 ${teams.size}개 저장`);
  }catch(e){ console.log(`${y}: 오류 ${e.message}`); }
  await sleep(500);   // 서버에 부담을 주지 않게 천천히
}

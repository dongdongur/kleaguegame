/*
 * data-raw/kleague_squads.json (tools/fetch_squads.mjs 결과)을 게임이 읽는 js/data_squads26.js 로 바꿔요.
 *     node tools/build_squads.mjs
 * 선수 한 명 = [선수코드, 이름, 포지션(GK/DF/MF/FW), 등번호]. 사진은 선수 코드로 K리그 사이트 이미지 주소를 불러와서 보여줘요.
 */
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,"$1")), "..");
const raw = JSON.parse(fs.readFileSync(path.join(root,"data-raw","kleague_squads.json"),"utf8"));

/* 사이트 팀 코드 → 게임에서 쓰는 구단 이름 */
const NAME = {K09:"FC 서울",K27:"FC 안양",K21:"강원 FC",K22:"광주 FC",K35:"김천 상무",K10:"대전 하나 시티즌",K26:"부천 FC 1995",K01:"울산 HD",K18:"인천 유나이티드",K05:"전북 현대",K04:"제주 SK",K03:"포항 스틸러스",
  K20:"경남 FC",K36:"김포 FC",K41:"김해 FC 2008",K17:"대구 FC",K06:"부산 아이파크",K31:"서울 이랜드",K08:"성남 FC",K02:"수원 삼성",K29:"수원FC",K32:"안산 그리너스",K42:"용인 FC",K07:"전남 드래곤즈",K38:"천안 시티",K34:"충남 아산",K37:"충북청주",K40:"파주 프런티어",K39:"화성 FC"};
const out = {};
raw.clubs.forEach(c=>{
  const name = NAME[c.code]; if(!name){ console.log("이름 매핑 없음:",c.code,c.name); return; }
  out[name] = {code:c.code, manager:c.manager||null, players:c.players.map(p=>[p.id,p.name,p.pos,p.num])};
});
const js = `/*
 * 2026 K리그1·K리그2 현역 선수단 (kleague.com 선수/감독 페이지 기준, ${raw.fetchedAt.slice(0,10)} 수집)
 * 자동 생성 파일이에요: node tools/fetch_squads.mjs → node tools/build_squads.mjs
 * 선수 한 명 = [선수코드, 이름, 포지션, 등번호]. 이 목록의 선수는 게임에 전원 들어가고,
 * 능력치를 직접 적은 선수(js/data2026.js)가 아니면 팀 수준을 바탕으로 한 "추정 능력치"가 붙어요 (K리그 API 연동 후 실제 기록으로 교체 예정).
 */
window.KL_SQUADS26 = ${JSON.stringify(out)};
`;
fs.writeFileSync(path.join(root,"js","data_squads26.js"), js);
console.log("js/data_squads26.js:", Object.keys(out).length+"개 클럽,", Object.values(out).reduce((n,c)=>n+c.players.length,0)+"명,", Math.round(js.length/1024)+"KB");

/* data-raw/records.json (tools/fetch_records.mjs 결과) → js/data_records.js (브라우저용, 작게 압축)
 *   window.KL_RECORDS = { 선수코드: [생년, 키, [[연도, 팀, K1출장,득점,도움, K2출장,득점,도움, PO출장,득점,도움], ...]] }  (GK는 득점 자리=실점, 도움 자리=클린시트) */
import fs from "node:fs"; import path from "node:path";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,"$1")), "..");
const rec = JSON.parse(fs.readFileSync(path.join(root,"data-raw/records.json"),"utf8"));
const out = {}; let n=0;
for(const [id,d] of Object.entries(rec)){
  const by = d.birth ? +String(d.birth).slice(0,4) : null;
  const ss = (d.seasons||[]).map(s=>[s[0],s[1],...[s[2],s[3],s[4]].flatMap(c=>c||[0,0,0])]);
  out[id]=[by,d.height||null,ss]; n++;
}
fs.writeFileSync(path.join(root,"js/data_records.js"),
 "/* 선수별 K리그 시즌 기록 (kleague.com 선수 상세 페이지에서 수집, tools/build_records.mjs 로 생성) */\nwindow.KL_RECORDS = "+JSON.stringify(out)+";\n");
console.log("선수",n,"명 →","js/data_records.js", (fs.statSync(path.join(root,"js/data_records.js")).size/1024).toFixed(0)+"KB");

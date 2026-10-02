/*
 * 프리미어리그 20개 구단의 현재 선수단을 위키백과(영어판 "Fs player" 선수단 표)에서 가져오고,
 * 선수 문서에 한국어판 제목이 있으면 그 이름(한글 표기)으로 바꿔요. 한글 문서가 없는 선수는 영어 이름 그대로 둬요.
 * 요청 사이에 간격을 두고, 결과를 data-raw/epl_squads.json 에 저장해요. (위키백과 글은 CC BY-SA 라이선스 — 개인 비상업 용도로 사실 정보(이름·포지션·등번호)만 써요)
 *
 *     node tools/fetch_epl.mjs
 */
import fs from "node:fs"; import path from "node:path";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,"$1")), "..");
const UA = "K-Legend-38 personal fan project (non-commercial)";
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const api = async (params,lang="en") => { const u=`https://${lang}.wikipedia.org/w/api.php?format=json&formatversion=2&`+new URLSearchParams(params);
  for(let t=0;t<6;t++){ const r=await fetch(u,{headers:{"User-Agent":UA}}); if(r.ok) return r.json(); await sleep(2500*(t+1)); } throw new Error("HTTP "+u); };
/* 한국어 구단명 → 영어판 문서 제목 (틀리면 검색으로 다시 찾아요) */
const TITLES = {"arsenal":"Arsenal F.C.","avl":"Aston Villa F.C.","bou":"AFC Bournemouth","bre":"Brentford F.C.","bha":"Brighton & Hove Albion F.C.","bur":"Burnley F.C.","chl":"Chelsea F.C.","cry":"Crystal Palace F.C.","eve":"Everton F.C.","ful":"Fulham F.C.","lee":"Leeds United F.C.","liv":"Liverpool F.C.","mci":"Manchester City F.C.","mun":"Manchester United F.C.","new":"Newcastle United F.C.","nfo":"Nottingham Forest F.C.","sun":"Sunderland A.F.C.","tot":"Tottenham Hotspur F.C.","whu":"West Ham United F.C.","wol":"Wolverhampton Wanderers F.C."};
const POS = {GK:"GK",DF:"DF",MF:"MF",FW:"FW"};
const outFile = path.join(root,"data-raw/afc_squads.json");
const res = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile,"utf8")) : {};

async function wikitext(title){
  const j = await api({action:"parse",page:title,prop:"wikitext",redirects:1}); return j.parse && j.parse.wikitext;
}
function squad(w){
  const out=[]; const re=/\{\{\s*(?:[Ff]s player|[Ff]ootball squad2? player)\s*\|([^}]*)\}\}/g; let m;
  while((m=re.exec(w))){ const a=Object.fromEntries(m[1].split("|").map(s=>{const i=s.indexOf("=");return i<0?[s.trim(),""]:[s.slice(0,i).trim(),s.slice(i+1).trim()];}));
    const nm=(a.name||"").match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/); const title=nm?nm[1]:null, disp=nm?(nm[2]||nm[1]):(a.name||"").replace(/[\[\]]/g,"");
    const pos=(a.pos||"").toUpperCase().slice(0,2); if(!disp||!POS[pos]) continue;
    out.push({en:disp.replace(/\s*\(.*\)$/,""),title,pos,no:+a.no||null,nat:a.nat||null}); }
  return out;
}
async function korean(players){      // 선수 문서 제목들 → 한국어판 제목
  const titles=[...new Set(players.map(p=>p.title).filter(Boolean))]; const map={};
  for(let i=0;i<titles.length;i+=40){ const chunk=titles.slice(i,i+40);
    const j=await api({action:"query",prop:"langlinks",lllang:"ko",lllimit:"max",titles:chunk.join("|"),redirects:1});
    const norm={}; (j.query.normalized||[]).forEach(n=>norm[n.from]=n.to); (j.query.redirects||[]).forEach(n=>norm[n.from]=n.to);
    const ll={}; (j.query.pages||[]).forEach(p=>{ if(p.langlinks&&p.langlinks[0]) ll[p.title]=p.langlinks[0].title.replace(/\s*\(.*\)$/,""); });
    chunk.forEach(t=>{ const k=ll[norm[t]||t]; if(k) map[t]=k; });
    await sleep(400); }
  return map;
}
/* 구단 문서 안에 선수단 표가 별도 틀({{... squad}})로 들어 있는 경우를 위한 패턴 */
const SQUAD_TPL = /\{\{\s*([^|{}\n]*[Ss]quad[^|{}\n]*?)\s*(?:\|[^{}]*)?\}\}/g;
for(const [ko,title] of Object.entries(TITLES)){
  if(res[ko]) continue;
  try{
    let w=await wikitext(title).catch(()=>null), used=title;
    if(!w){ const s=await api({action:"query",list:"search",srsearch:title.replace(/ (F\.C\.|FC|SC)$/,"")+" football club",srlimit:1}); const t=s.query.search[0]&&s.query.search[0].title; if(t){ w=await wikitext(t); used=t; } }
    let pl=w?squad(w):[];
    if(!pl.length && w){ const tm=[...w.matchAll(SQUAD_TPL)].map(m=>m[1].trim()); for(const t of tm){ const tw=await wikitext("Template:"+t).catch(()=>null); if(tw){ pl=squad(tw); if(pl.length) break; } } }
    const kmap=await korean(pl);
    res[ko]={wiki:used,players:pl.map(p=>({name:(p.title&&kmap[p.title])||p.en,en:p.en,ko:!!(p.title&&kmap[p.title]),pos:p.pos,no:p.no,nat:p.nat}))};
    console.log(ko,"→",used,pl.length+"명","(한글",res[ko].players.filter(p=>p.ko).length+")");
  }catch(e){ console.log("실패",ko,e.message); }
  fs.writeFileSync(outFile,JSON.stringify(res)); await sleep(1500);
}
console.log("완료",Object.keys(res).length,"/",Object.keys(TITLES).length);

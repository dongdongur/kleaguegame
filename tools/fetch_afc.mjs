/*
 * AFC 챔피언스리그 참가팀의 현재 선수단을 위키백과(영어판 "Fs player" 선수단 표)에서 가져오고,
 * 선수 문서에 한국어판 제목이 있으면 그 이름(한글 표기)으로 바꿔요. 한글 문서가 없는 선수는 영어 이름 그대로 둬요.
 * 요청 사이에 간격을 두고, 결과를 data-raw/afc_squads.json 에 저장해요. (위키백과 글은 CC BY-SA 라이선스 — 개인 비상업 용도로 사실 정보(이름·포지션·등번호)만 써요)
 *
 *     node tools/fetch_afc.mjs
 */
import fs from "node:fs"; import path from "node:path";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,"$1")), "..");
const UA = "K-Legend-38 personal fan project (non-commercial)";
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const api = async (params,lang="en") => { const u=`https://${lang}.wikipedia.org/w/api.php?format=json&formatversion=2&`+new URLSearchParams(params);
  for(let t=0;t<6;t++){ const r=await fetch(u,{headers:{"User-Agent":UA}}); if(r.ok) return r.json(); await sleep(2500*(t+1)); } throw new Error("HTTP "+u); };
/* 한국어 구단명 → 영어판 문서 제목 (틀리면 검색으로 다시 찾아요) */
const TITLES = {"알 힐랄":"Al Hilal SFC","알 나스르":"Al Nassr FC","알 아흘리":"Al-Ahli Saudi FC","알 이티하드":"Al-Ittihad Club (Jeddah)","알 카디시야":"Al-Qadsiah FC","알 아인":"Al Ain FC","샤밥 알아흘리":"Shabab Al Ahli Club","알 와슬":"Al Wasl FC","알 사드":"Al Sadd SC","알 가라파":"Al-Gharafa SC","알 샤말":"Al-Shamal SC","에스테그랄":"Esteghlal F.C.","트랙터":"Tractor S.C.","네프치":"FC Neftchi Fergana","알 쿠와 알자위야":"Al-Quwa Al-Jawiya","가시마 앤틀러스":"Kashima Antlers","비셀 고베":"Vissel Kobe","가시와 레이솔":"Kashiwa Reysol","교토 상가":"Kyoto Sanga FC","부리람 유나이티드":"Buriram United F.C.","포트 FC":"Port F.C.","라차부리":"Ratchaburi F.C.","상하이 하이강":"Shanghai Port F.C.","베이징 궈안":"Beijing Guoan F.C.","뉴캐슬 제츠":"Newcastle Jets FC","조호르 다룰 탁짐":"Johor Darul Ta'zim F.C.","꽁안 하노이":"Hanoi Police FC",
 "알 타아문":"Al-Taawoun FC","알 와흐다":"Al-Wahda FC (Abu Dhabi)","알 라얀":"Al-Rayyan SC","골고하르 시르잔":"Gol Gohar Sirjan F.C.","나사프":"FC Nasaf","알 샤르타":"Al-Shorta SC","알 파이살리":"Al-Faisaly SC","알 무하라크":"Muharraq Club","알 시브":"Al-Seeb Club","쿠웨이트 SC":"Kuwait SC","알 칼리디야":"Al-Khaldiya SC","알 나흐다":"Al-Nahda Club (Oman)","이스트 벵골":"East Bengal Club","FC 고아":"FC Goa","FC 아르카다그":"FC Arkadag","마치다 젤비아":"FC Machida Zelvia","BG 파툼 유나이티드":"BG Pathum United F.C.","상하이 선화":"Shanghai Shenhua F.C.","멜버른 빅토리":"Melbourne Victory FC","쿠칭 시티":"Kuching City F.C.","꽁안-비엣텔":"Viettel FC","라이언 시티 세일러스":"Lion City Sailors FC","키치 SC":"Kitchee SC","프레아 칸 리치 스바이 리엥":"Preah Khan Reach Svay Rieng FC","탐피네스 로버스":"Tampines Rovers FC","타이포":"Tai Po FC","프놈펜 크라운":"Phnom Penh Crown FC","페르십 반둥":"Persib Bandung","마닐라 디거":"Manila Digger F.C."};
const POS = {GK:"GK",DF:"DF",MF:"MF",FW:"FW"};
const outFile = path.join(root,"data-raw/afc_squads.json");
const res = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile,"utf8")) : {};

async function wikitext(title){
  const j = await api({action:"parse",page:title,prop:"wikitext",redirects:1}); return j.parse && j.parse.wikitext;
}
function squad(w){
  const out=[]; const re=/\{\{\s*[Ff]s player\s*\|([^}]*)\}\}/g; let m;
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

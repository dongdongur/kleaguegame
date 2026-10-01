/*
 * K리그 공식 사이트(kleague.com)의 "선수/감독" 페이지에서 K리그1·K리그2 현역 선수단을 가져와요.
 * 이름, 선수 코드, 등번호, 포지션(GK/DF/MF/FW)만 읽고, 감독도 같이 읽어요. 사진·엠블럼 파일은 내려받지 않아요.
 * 사이트에 부담을 주지 않게 요청 사이에 시간을 두고, 한 번만 실행해서 결과를 data-raw/ 에 저장해요.
 *
 *     node tools/fetch_squads.mjs
 *
 * 결과: data-raw/kleague_squads.json  →  node tools/build_squads.mjs 로 js/data_squads26.js 를 만들어요.
 */
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,"$1")), "..");
const UA = "Mozilla/5.0 (K-Legend-38 personal fan project)";
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const BASE = "https://www.kleague.com/player.do";

async function page(url){
  const r = await fetch(url,{headers:{"User-Agent":UA,"Accept-Language":"ko-KR,ko;q=0.9"}});
  if(!r.ok) throw new Error("HTTP "+r.status+" "+url);
  return r.text();
}
/* 목록 HTML에서 선수 카드를 읽어요: 코드, 이름, 등번호 */
function parse(html){
  const out=[]; const re=/onPlayerClicked\((\d+)\)[\s\S]*?class="name">([^<]*)[\s\S]*?(?:class="num campton">No\.(\d+)<\/span>)?/g;
  const parts = html.split('class="cont-box f-wrap left player-hover"').slice(1);
  for(const p of parts){
    const id=(p.match(/onPlayerClicked\((\d+)\)/)||[])[1]; const name=(p.match(/class="name">([^<]*)/)||[])[1];
    const num=(p.match(/No\.(\d+)/)||[])[1];
    if(id&&name) out.push({id,name:name.trim(),num:num?+num:null});
  }
  return out;
}
/* 클럽 코드 목록은 각 리그 페이지의 선택 상자에서 읽어요 */
async function clubs(league){
  const html = await page(`${BASE}?type=active&leagueId=${league}`);
  const block = html.split('id="clubList"')[1].split("</select>")[0];
  return [...block.matchAll(/<option value="(K\d+)"[^>]*>([^<]*)/g)].map(m=>({code:m[1],name:m[2].trim(),league}));
}

const result = {fetchedAt:new Date().toISOString(), clubs:[]};
for(const league of [1,2]){
  const list = await clubs(league); await sleep(400);
  for(const c of list){
    const squad={code:c.code,name:c.name,league,players:[],manager:null};
    for(const pos of ["gk","df","mf","fw"]){
      const got=new Set();
      for(let pg=1;pg<=12;pg++){
        const html = await page(`${BASE}?page=${pg}&type=active&leagueId=${league}&teamId=${c.code}&pos=${pos}`);
        const ps = parse(html).filter(p=>!got.has(p.id));
        await sleep(400);
        if(!ps.length) break;
        ps.forEach(p=>{ got.add(p.id); squad.players.push({...p,pos:pos.toUpperCase()}); });
      }
    }
    const mh = await page(`${BASE}?page=1&type=active&leagueId=${league}&teamId=${c.code}&pos=manager`);
    const mg = parse(mh)[0]; if(mg) squad.manager=mg.name; await sleep(400);
    /* 같은 선수가 두 포지션에 걸려 나오면 처음 것만 */
    const seen=new Set(); squad.players=squad.players.filter(p=>!seen.has(p.id)&&seen.add(p.id));
    console.log(`K리그${league} ${c.name} (${c.code}): 선수 ${squad.players.length}명`+(squad.manager?` · 감독 ${squad.manager}`:""));
    result.clubs.push(squad);
  }
}
fs.mkdirSync(path.join(root,"data-raw"),{recursive:true});
fs.writeFileSync(path.join(root,"data-raw","kleague_squads.json"),JSON.stringify(result,null,1));
console.log("저장: data-raw/kleague_squads.json  (클럽 "+result.clubs.length+"개, 선수 "+result.clubs.reduce((n,c)=>n+c.players.length,0)+"명)");

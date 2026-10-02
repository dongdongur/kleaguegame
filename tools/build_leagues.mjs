/*
 * tools/leagues_base.json(구단 정보) + data-raw/<리그>_squads.json(위키백과 선수단) → js/data_leagues.js
 * 능력치(ovr)는 "추정"이에요: tools/stars_misc.json 에 적은 스타 선수는 그 값, 나머지는 구단 전력(l)에서 약간 낮춘 값 ± 5 (이름으로 정한 고정 값).
 * 사용: node tools/build_leagues.mjs
 */
import fs from "node:fs"; import path from "node:path";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,"$1")), "..");
const base = JSON.parse(fs.readFileSync(path.join(root,"tools/leagues_base.json"),"utf8"));
const stars = JSON.parse(fs.readFileSync(path.join(root,"tools/stars_misc.json"),"utf8"));
const titles = JSON.parse(fs.readFileSync(path.join(root,"tools/league_titles.json"),"utf8"));
const hash01 = s => { let h=2166136261; for(const c of s){ h^=c.charCodeAt(0); h=Math.imul(h,16777619); } return ((h>>>0)%10000)/10000; };
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const out = {};
for(const key of Object.keys(base)){
  const f = path.join(root,"data-raw/"+key.toLowerCase()+"_squads.json");
  const raw = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f,"utf8")) : null;
  out[key] = base[key].map(c=>{
    const sq = raw && raw[c.id]; if(!sq || !sq.players || !sq.players.length) return c;
    const seen = new Set(); const pl = [];
    sq.players.forEach(p=>{
      if(seen.has(p.en)) return; seen.add(p.en);
      let ovr = stars[p.en]; if(ovr==null) ovr = Math.round(c.l - 7 + (hash01(p.en)*2-1)*5 - (p.pos==="GK"?1:0));
      pl.push([p.name, p.pos, clamp(ovr,55,96), p.en, p.no||0]);
    });
    pl.sort((a,b)=>b[2]-a[2]);
    return Object.assign({}, c, {players: pl.slice(0,30)});
  });
  const n = out[key].filter(c=>c.players).length;
  console.log(key, out[key].length+"구단 중 선수단 있는 곳 "+n);
}
fs.writeFileSync(path.join(root,"js/data_leagues.js"),"/* 해외 리그 구단과 선수단 (위키백과 선수단 + 추정 능력치). tools/build_leagues.mjs 로 만들어요. 선수 [이름, 포지션, 능력치, 영어이름, 등번호]. 프리미어리그는 data_epl.js */\nwindow.KL_FL = "+JSON.stringify(out)+";\n");
console.log("완료");

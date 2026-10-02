/*
 * data-raw/epl_squads.json (위키백과 선수단) → js/data_epl.js
 * 프리미어리그 20개 구단의 1군 선수단. 능력치(ovr)는 "추정"이에요:
 *   - 직접 입력한 스타 선수는 STARS 의 값
 *   - 나머지는 구단 전력(l)에서 약간 낮춘 값 ± 6 (선수 이름으로 정한 고정 값이라 매번 같아요)
 * 사용: node tools/build_epl.mjs
 */
import fs from "node:fs"; import path from "node:path";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,"$1")), "..");
const raw = JSON.parse(fs.readFileSync(path.join(root,"data-raw/epl_squads.json"),"utf8"));

/* 구단 정보: id, 영어 키, 이름, 약칭, 전력(주전급 평균), 대표 색 */
const CLUBS = [
 ["mci","mci","맨체스터 시티","맨시티",91,"#6cabdd"],["liv","liv","리버풀","리버풀",90,"#c8102e"],["ars","arsenal","아스널","아스널",90,"#ef0107"],
 ["chl","chl","첼시","첼시",87,"#034694"],["mun","mun","맨체스터 유나이티드","맨유",86,"#da291c"],["tot","tot","토트넘 홋스퍼","토트넘",85,"#132257"],
 ["new","new","뉴캐슬 유나이티드","뉴캐슬",84,"#241f20"],["avl","avl","애스턴 빌라","빌라",82,"#670e36"],["bha","bha","브라이턴","브라이턴",80,"#0057b8"],
 ["whu","whu","웨스트햄","웨스트햄",79,"#7a263a"],["cry","cry","크리스털 팰리스","팰리스",78,"#1b458f"],["ful","ful","풀럼","풀럼",77,"#444444"],
 ["bre","bre","브렌트퍼드","브렌트퍼드",77,"#e30613"],["wol","wol","울버햄튼","울버햄튼",76,"#fdb913"],["eve","eve","에버턴","에버턴",76,"#003399"],
 ["bou","bou","본머스","본머스",76,"#da291c"],["nfo","nfo","노팅엄 포레스트","노팅엄",75,"#dd0000"],["lee","lee","리즈 유나이티드","리즈",74,"#aaaaaa"],
 ["bur","bur","번리","번리",72,"#6c1d45"],["sun","sun","선덜랜드","선덜랜드",72,"#eb172b"],
];
/* 스타 선수 능력치 (영어 이름 기준, 우리 1~99 척도의 추정값) */
const STARS = {
 "Erling Haaland":94,"Mohamed Salah":91,"Rodri":91,"Bukayo Saka":89,"Virgil van Dijk":88,"Declan Rice":88,"Martin Ødegaard":87,"Cole Palmer":88,"Bruno Fernandes":88,
 "Alexander Isak":88,"Florian Wirtz":86,"Viktor Gyökeres":86,"William Saliba":89,"Gabriel Magalhães":88,"Phil Foden":87,"Rúben Dias":87,"Joško Gvardiol":86,
 "Gianluigi Donnarumma":88,"Alisson":89,"Alisson Becker":89,"Emiliano Martínez":86,"Jordan Pickford":83,"Guglielmo Vicario":82,"Ederson":86,"Ederson Moraes":86,
 "Ibrahima Konaté":84,"Alexis Mac Allister":86,"Dominik Szoboszlai":86,"Cody Gakpo":84,"Hugo Ekitike":84,"Hugo Ekitiké":84,"Bryan Mbeumo":85,"Matheus Cunha":84,
 "Benjamin Šeško":83,"Amad Diallo":80,"Casemiro":80,"James Maddison":82,"Dejan Kulusevski":82,"Micky van de Ven":84,"Cristian Romero":85,"Enzo Fernández":85,
 "Moisés Caicedo":84,"Nicolas Jackson":78,"Reece James":83,"Malo Gusto":80,"Levi Colwill":80,"Estêvão":82,"João Pedro":83,"Bruno Guimarães":85,"Anthony Gordon":83,
 "Sandro Tonali":84,"Nick Pope":82,"Ollie Watkins":83,"Morgan Rogers":82,"Amadou Onana":82,"Ezri Konsa":80,"Antoine Semenyo":82,"Matheus Nunes":82,"Bernardo Silva":87,
 "Savinho":81,"Jérémy Doku":83,"Omar Marmoush":84,"Rayan Cherki":83,"Tijjani Reijnders":83,"Nico O'Reilly":80,"John Stones":85,"Manuel Akanji":85,"Rayan Aït-Nouri":80,
 "Jarrod Bowen":82,"Lucas Paquetá":80,"Mohammed Kudus":79,"Jean-Philippe Mateta":81,"Eberechi Eze":83,"Ismaïla Sarr":79,"Marc Guéhi":84,"Anthony Elanga":78,
 "Morgan Gibbs-White":82,"Elliot Anderson":80,"Chris Wood":79,"Murillo":82,"Kaoru Mitoma":80,"Georginio Rutter":79,"Yankuba Minteh":78,"Jack Grealish":79,
 "Hwang Hee-chan":79,"Yoane Wissa":80,"Kevin Schade":78,"Mikel Merino":83,"Leandro Trossard":82,"Gabriel Jesus":80,"Martin Zubimendi":85,"Eberechi Eze ":83,
 "Kai Havertz":82,"Declan Rice ":88,"Riccardo Calafiori":84,"Jurriën Timber":83,"Ben White":82,"Noni Madueke":80,"Jadon Sancho":78,"Mason Mount":78,"Harry Maguire":79,
 "Lisandro Martínez":83,"Luke Shaw":80,"Diogo Dalot":80,"Altay Bayındır":76,"André Onana":80,"Kobbie Mainoo":79,"Manuel Ugarte":77,"Joe Gomez":79,"Ryan Gravenberch":84,
 "Curtis Jones":80,"Conor Bradley":81,"Milos Kerkez":81,"Giorgi Mamardashvili":83,"Jeremie Frimpong":82,"Alexander Isak ":88,"Trevoh Chalobah":78,"Trent Alexander-Arnold":85,
 "Dan Burn":78,"Fabian Schär":78,"Kieran Trippier":78,"Harvey Barnes":79,"Joelinton":82,"Lewis Miley":74,"Nick Woltemade":82,"Jacob Murphy":78,"Aaron Ramsdale":77,
 "Emi Buendía":76,"Youri Tielemans":82,"Boubacar Kamara":82,"Ollie Watkins ":83,"Lucas Digne":77,"Pau Torres":80,"Matty Cash":79,"John McGinn":80,"Leon Bailey":77,
 "Bart Verbruggen":79,"Jan Paul van Hecke":79,"Pervis Estupiñán":77,"Diego Gómez":77,"Georginio Rutter ":79,"James Milner":72,"Yasin Ayari":76,"Danny Welbeck":78,
 "Andrew Robertson":82,"Wataru Endo":75,"Federico Chiesa":78,"Mateus Fernandes":77,"Adam Smith":74,"Lewis Cook":74,"Ryan Christie":76,"Justin Kluivert":78,"Evanilson":78,
 "Cheick Doucouré":76,"Adam Wharton":80,"Daniel Muñoz":79,"Maxence Lacroix":80,"Dean Henderson":79,"Chris Richards":76,"Jefferson Lerma":76,"Ismaila Sarr ":79,
 "Joachim Andersen":79,"Raúl Jiménez":76,"Harry Wilson":77,"Emile Smith Rowe":76,"Andreas Pereira":76,"Rodrigo Muniz":76,"Sasa Lukic":76,"Antonee Robinson":79,
 "João Palhinha":80,"Pedro Porro":82,"Archie Gray":76,"Xavi Simons":83,"Mohammed Kudus ":79,"Randal Kolo Muani":79,"Mathys Tel":78,"Conor Gallagher":79,
 "Nicolás González":77,"Tomas Soucek":78,"Alphonse Areola":77,"Lucas Bergvall":78,"Pape Matar Sarr":78,"Destiny Udogie":79,"Djed Spence":76,"Wilson Odobert":76,
 "Brennan Johnson":79,"Richarlison":78,"Dominic Solanke":80,"Dominic Solanke-Mitchell":80,"Son Heung-min":88,"Heung-min Son":88,
 "Josh Cullen":74,"Lyle Foster":75,"Jaidon Anthony":75,"Dwight McNeil":76,"Jack Hinshelwood":77,"Carlos Baleba":79,"Yasin Ayari ":76,"Diego Coppola":74,"Jason Steele":74,
};
Object.assign(STARS,{"Ronald Araújo":85,"Bradley Barcola":82,"Iliman Ndiaye":80,"Mateo Kovačić":82,"William Osula":74,"Yang Min-hyeok":68,"Mykhailo Mudryk":77,"Rodrigo Bentancur":80,"Tosin Adarabioyo":78,"Kevin Danso":79,"Radu Drăgușin":78,"Sávio":79,"Souza":72,"Ben Davies":74,"Marcos Senesi":78,"Giovanni Leoni":74,"Jérémy Jacquet":76,"Tino Livramento":80,"Lewis Hall":79,"Sven Botman":80,"Malick Thiaw":81,"Joe Willock":76,"Jacob Ramsey":77,"Kostas Tsimikas":76,"Víctor Muñoz":72,"Allan":72,"Marc-Vivien Foé":66,"Ayyoub Bouaddi":78,"Abdukodir Khusanov":78,"Claudio Echeverri":76,"Kalvin Phillips":72});
const hash01 = s => { let h=2166136261; for(const c of s){ h^=c.charCodeAt(0); h=Math.imul(h,16777619); } return ((h>>>0)%10000)/10000; };
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const out = [];
for(const [id,key,name,short,l,col] of CLUBS){
  const sq = raw[key]; if(!sq){ console.log("없음",id); out.push({id,name,short,l,col,players:[]}); continue; }
  const seen = new Set(); const pl = [];
  sq.players.forEach(p=>{
    const k = p.en; if(seen.has(k)) return; seen.add(k);
    let ovr = STARS[k] ?? STARS[p.en.trim()];
    if(ovr==null){ ovr = Math.round(l - 7 + (hash01(k)*2-1)*5); if(p.pos==="GK") ovr = Math.round(ovr - 1); }
    ovr = clamp(ovr, 55, 96);
    pl.push([p.name, p.pos, ovr, p.en, p.no||0]);
  });
  pl.sort((a,b)=>b[2]-a[2]);
  out.push({id,name,short,l,col,players:pl.slice(0,30)});
  console.log(id, pl.length+"명", "최고", pl[0]&&pl[0][0]+" "+pl[0][2]);
}
const js = "/* 프리미어리그 20개 구단 선수단 (위키백과 선수단 + 추정 능력치). tools/build_epl.mjs 로 만들어요. 선수 [이름, 포지션, 능력치, 영어이름, 등번호] */\nwindow.KL_EPL = "+JSON.stringify(out)+";\n";
fs.writeFileSync(path.join(root,"js/data_epl.js"), js);
console.log("완료", out.length, "구단,", out.reduce((a,c)=>a+c.players.length,0), "명");

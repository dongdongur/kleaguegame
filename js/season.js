/* K-레전드 38 시즌 엔진: K리그1(12팀)/K리그2(17팀) 리그 + FA컵 + AFC챔스 + 승강, 체력·카드·부상, 시상 통계. 화면과 무관한 순수 로직 */
(function(){
"use strict";

/* n팀 한 바퀴 일정 */
function roundRobin(n){
  const t=[...Array(n).keys()]; const rounds=[];
  for(let r=0;r<n-1;r++){
    const pr=[]; for(let i=0;i<n/2;i++){ const a=t[i], b=t[n-1-i]; pr.push((r+i)%2? [a,b]:[b,a]); }
    rounds.push(pr); t.splice(1,0,t.pop());
  }
  return rounds;
}
const flip = rounds => rounds.map(pr=>pr.map(([a,b])=>[b,a]));

/*
 * o = { form, mgr, xi:[11], bench:[0~5], diff:"easy"|"hard", teamName, year, seasonNo,
 *       div:1|2, k1:[K리그1 상대팀 정의], k2:[K리그2 상대팀 정의], aclQualified:0|1|2 (AFC 등급), boost:{구단명:능력치 보정} }
 *   - div 1: k1은 나를 뺀 K리그1 11팀, k2는 K리그2 17팀
 *   - div 2: k1은 K리그1 12팀, k2는 나를 뺀 K리그2 16팀
 */
function run(o){
  const K=window.KLCore, CFG=K.CONFIG, G=K.GROUP;
  const hardDiff=o.diff==="hard";
  const div=o.div||1;
  const ctx={form:o.form,mgr:o.mgr};
  const slots=K.FORMS[o.form];
  const xi=o.xi.slice(), bench=o.bench.filter(Boolean);
  const roster=xi.concat(bench);
  const stM=new Map(roster.map(p=>[p,100]));
  const ps=new Map(roster.map(p=>[p,{apps:0,g:0,lg:0,a:0,la:0,y:0,r:0,susp:0,inj:0,missed:0,injOut:0,injN:0,cs:0}]));
  const youth=g=>({name:"유스 선수",pos:g,ovr:CFG.YOUTH_OVR,alt:null,det:null,sq:-1,youth:true});

  /* ---- 팀 만들기 ---- */
  const jit=()=> (Math.random()-.5)*2;
  const bonus=(CFG.OPP_BONUS&&CFG.OPP_BONUS[o.diff])||0;   // 난이도 보정(능력치 자체는 그대로)
  const mkTeam=def=>{ const s=K.oppStrength(def,hardDiff,((o.boost&&o.boost[def.club])||0)+bonus); const j=jit();
    return {name:def.club, short:def.short||def.club, kind:def.div===2?"K리그2":"K리그1", att:s.att+j, def:s.def+j*.5,
      players:(def.players&&def.players.length)?s.players:null, p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}; };
  /* AFC 상대(해외 클럽): 대표 선수들 + 팀 기본 능력치로 전력을 계산해요. 어려움은 컵대회 가산점(CUP_HARD)이 붙어요 */
  const mkExt=def=>{ const sx=K.oppStrength(def,hardDiff,(hardDiff?CFG.CUP_HARD:0)+bonus); const j=jit();
    return {name:def.club,short:def.club,kind:def.kind,att:sx.att+j,def:sx.def+j*.5,players:(def.players&&def.players.length)?sx.players:null}; };
  const leagueName = div===1?"K리그1":"K리그2";
  const me={name:o.teamName||"레전드 FC", short:o.teamName||"내 팀", me:true, att:0, def:0, sub:o.form+(o.mgr?" · 감독 "+o.mgr.name:""),
    p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0};
  const myLeagueDefs = div===1 ? o.k1 : o.k2;
  const teams=[me].concat(myLeagueDefs.map(mkTeam));
  const N=teams.length;

  const log=[]; const goalsAll={}; let matchNo=0;
  const aiStats=new Map();
  const tally=(team,s,field)=>{ const key=team.name+"|"+s.name; let r=aiStats.get(key);
    if(!r){ r={team:team.name,short:team.short,name:s.name,pos:s.pos,ovr:s.ovr,g:0,a:0}; aiStats.set(key,r); } r[field]++; };
  const derbies=[];
  let rotations=0, totY=0, totR=0; const injured=[];

  const avail=p=>{ const s=ps.get(p); return !!s && s.susp<=0 && s.inj<=0; };
  const effOvr=p=>p.ovr-K.fatigue(stM.get(p));

  /* ---- 경기 로그: 골·카드·부상·교체·결정적 장면을 분 단위로 만들어요 ---- */
  function buildLog(c){
    const rnd=(lo,hi)=>lo+Math.floor(Math.random()*(hi-lo+1));
    const ev=[]; const push=(t,k,txt,side)=>ev.push({t,k,text:txt,side:side||null});
    const mn=me.name, on=c.opp.name;
    const gkName=c.lineup[0]&&!c.lineup[0].youth?c.lineup[0].name:"우리 골키퍼";
    const oppGk=c.opp.players?(c.opp.players.find(p=>p.pos==="GK")||{}).name:null;
    /* 골 */
    c.myG.forEach(g=>push(g.et?rnd(91,120):rnd(1,92),"goal",g.s+(g.a?" (도움 "+g.a+")":""),"me"));
    c.opG.forEach(g=>push(g.et?rnd(91,120):rnd(1,92),"goal",g.s+(g.a?" (도움 "+g.a+")":""),"opp"));
    /* 카드 */
    c.ys.forEach(p=>{ const t=rnd(8,88); push(t,"yellow",p.name+" 경고","me"); });
    c.rs.forEach(p=>{ const second=c.ys.includes(p); const t=second?rnd(50,89):rnd(10,88);
      if(second){ /* 두 번째 경고로 퇴장: 첫 경고를 퇴장보다 앞에 둬요 */ const y=ev.find(e=>e.k==="yellow"&&e.text.startsWith(p.name+" ")); if(y&&y.t>=t) y.t=Math.max(2,t-rnd(5,30)); push(t,"red",p.name+" 두 번째 경고로 퇴장","me"); }
      else push(t,"red",p.name+" 직접 퇴장","me"); });
    for(let i=0;i<c.oy;i++) push(rnd(8,88),"yellow","상대 선수 경고","opp");
    if(c.orr) push(rnd(20,88),"red","상대 선수 퇴장","opp");
    /* 부상 → 교체 */
    c.hurtP.forEach(h=>{ const t=rnd(10,85); const subs=c.bench.filter(b=>!c.used.has(b)&&!c.lineup.includes(b)); const sub=subs.length?subs[rnd(0,subs.length-1)].name:"유스 선수";
      push(t,"injury",h.p.name+" 부상으로 교체 아웃 → "+sub+" 투입 ("+h.len+"경기 결장)","me"); });
    /* 결정적 장면: 득점 외의 슈팅 */
    const goalsMe=c.myG.filter(g=>!g.et).length, goalsOpp=c.opG.filter(g=>!g.et).length;
    const extraMe=K.clamp(Math.round(3+(c.cur.att-c.oD)/7+Math.random()*3),1,9), extraOpp=K.clamp(Math.round(3+(c.opp.att-c.mD)/7+Math.random()*3),1,9);
    const chance=(side,n)=>{ for(let i=0;i<n;i++){ const t=rnd(3,89); const r=Math.random();
      const shooter = side==="me" ? K.pickScorer(c.myP).name : (c.opp.players?K.pickScorer(c.opp.players).name:"상대 선수");
      const keeper = side==="me" ? (oppGk||"상대 골키퍼") : gkName;
      if(r<.42) push(t,"save",shooter+"의 유효슈팅을 "+keeper+" 선방",side);
      else if(r<.78) push(t,"miss",shooter+"의 슈팅이 골문을 벗어남",side);
      else if(r<.9) push(t,"post",shooter+"의 슛이 골대를 강타",side);
      else push(t,"chance",shooter+" 결정적 찬스를 놓침",side); } };
    chance("me",extraMe); chance("opp",extraOpp);
    const out=K.assembleLog(ev,{f:c.f,a:c.a,et:c.et,pk:c.pk,mn,on,names:c.lineup.filter(p=>!p.youth).map(p=>p.name)});
    /* 경기 통계 (능력치 차이로 만든 값이에요) */
    const shM=goalsMe+c.myG.filter(g=>g.et).length+extraMe, shO=goalsOpp+c.opG.filter(g=>g.et).length+extraOpp;
    const sotM=c.f+Math.round(extraMe*.45), sotO=c.a+Math.round(extraOpp*.45);
    const poss=Math.round(K.clamp(50+((c.cur.att+c.cur.def)-(c.opp.att+c.opp.def))*.35,34,66));
    const stats={poss:[poss,100-poss],shots:[shM,shO],sot:[sotM,sotO],corners:[Math.round(shM*.5+rnd(0,2)),Math.round(shO*.5+rnd(0,2))],fouls:[rnd(8,15)+c.ys.length,rnd(8,15)+c.oy]};
    return {events:out,stats};
  }

  /* ---- 내 경기 한 판 ---- */
  function myMatch(m){
    const opp=m.opp;
    const lineup=xi.slice(); const used=new Set(); let rot=0; const outS=[], outI=[];
    xi.forEach((p,i)=>{ const s=ps.get(p); if(s.susp<=0 && s.inj<=0) return;
      (s.inj>0?outI:outS).push(p.name); const lab=slots[i][0];
      let c=bench.filter(b=>!used.has(b) && avail(b) && K.fitsSlot(b,lab));
      if(!c.length) c=bench.filter(b=>!used.has(b) && avail(b));
      if(c.length){ c.sort((x,y)=>effOvr(y)-effOvr(x)); lineup[i]=c[0]; used.add(c[0]); } else lineup[i]=youth(G[lab]); });
    xi.forEach((p,i)=>{ if(!avail(p) || stM.get(p)>=CFG.STAM_ROTATE) return;
      const lab=slots[i][0];
      const c=bench.filter(b=>!used.has(b) && avail(b) && stM.get(b)>stM.get(p)+10 && K.fitsSlot(b,lab));
      if(c.length){ c.sort((x,y)=>effOvr(y)-effOvr(x)); lineup[i]=c[0]; used.add(c[0]); rot++; } });
    rotations+=rot;

    const ys=[], rs=[];
    lineup.forEach((p,i)=>{ if(p.youth) return; const g=G[slots[i][0]];
      if(Math.random()<CFG.CARD_R){ rs.push(p); return; }
      if(Math.random()<CFG.CARD_Y[g]){ ys.push(p); if(Math.random()<CFG.CARD_Y2) rs.push(p); } });
    const oy=K.poisson(CFG.OPP_YELLOW), orr=Math.random()<CFG.OPP_RED?1:0;

    const cur=K.rate(lineup,stM,ctx); me.att=cur.att; me.def=cur.def;
    const pen=CFG.RED_PEN;
    const mA=cur.att-pen*rs.length, mD=cur.def-pen*rs.length, oA=opp.att-pen*orr, oD=opp.def-pen*orr;
    const ha = m.home===true?CFG.HOME_ADV : m.home===false?-CFG.HOME_ADV : 0;
    const lm=CFG.GOAL_BASE*Math.exp((mA+ha-oD)/CFG.SPREAD), lo=CFG.GOAL_BASE*Math.exp((oA-mD-ha)/CFG.SPREAD);
    let f=K.poisson(lm), a=K.poisson(lo), et=false, pk=null; const f0=f, a0=a;
    const aggF=m.agg?m.agg.f:0, aggA=m.agg?m.agg.a:0;
    if(m.ko){
      if(f+aggF===a+aggA){ et=true; f+=K.poisson(lm*CFG.ET_FACTOR); a+=K.poisson(lo*CFG.ET_FACTOR);
        if(f+aggF===a+aggA){ const pw=.5+K.clamp((mA+mD-oA-oD)/2/60,-.15,.15); const win=Math.random()<pw;
          const ws=4+(Math.random()<.4?1:0), ls=Math.max(2,ws-1-(Math.random()<.3?1:0)); pk=win?[ws,ls]:[ls,ws]; } } }
    const res = pk ? (pk[0]>pk[1]?"W":"L") : (f>a?"W":f===a?"D":"L");
    const advance = m.ko ? ((f+aggF>a+aggA) || (f+aggF===a+aggA && !!pk && pk[0]>pk[1])) : null;

    const myP=lineup.map((p,i)=>Object.assign({},p,{g:G[slots[i][0]],ref:p}));
    const league=m.comp==="리그";
    const ms=[], as=[], myG=[], opG=[];
    for(let k=0;k<f;k++){ const s=K.pickScorer(myP); ms.push(s.name); goalsAll[s.name]=(goalsAll[s.name]||0)+1;
      const st=ps.get(s.ref); if(st){ st.g++; if(league) st.lg++; }
      let an=null;
      if(Math.random()<.72){ const asst=K.pickAssist(myP,s); if(asst){ an=asst.name; as.push(asst.name); const a2=ps.get(asst.ref); if(a2){ a2.a++; if(league) a2.la++; } } }
      myG.push({s:s.name,a:an,et:k>=f0}); }
    const os=[];
    for(let k=0;k<a;k++){
      let sn="상대 선수", an=null;
      if(opp.players && opp.players.length){ const s=K.pickScorer(opp.players); sn=s.name;
        if(Math.random()<.6){ const asst=K.pickAssist(opp.players,s); if(asst) an=asst.name; }
        if(league && Math.random()<.72){ tally(opp,s,"g"); if(an){ const o2=opp.players.find(p=>p.name===an); if(o2) tally(opp,o2,"a"); } } }
      os.push(sn); opG.push({s:sn,a:an,et:k>=a0}); }
    if(a===0 && lineup[0] && ps.has(lineup[0])) ps.get(lineup[0]).cs++;

    const serving=roster.filter(p=>ps.get(p).susp>0 || ps.get(p).inj>0);
    const hurt=[], hurtP=[];
    lineup.forEach((p,i)=>{ if(p.youth) return; const s=ps.get(p); const g=G[slots[i][0]];
      let pr=CFG.INJ_BASE*(1+Math.max(0,(CFG.STAM_ROTATE-stM.get(p))/40)); if(g==="GK") pr*=CFG.INJ_GK;
      if(Math.random()<pr){ let x=Math.random(), len=1; for(const [pp,mn,mx] of CFG.INJ_LEN){ if(x<pp){ len=mn+Math.floor(Math.random()*(mx-mn+1)); break; } x-=pp; }
        s.inj=len+1; s.injN++; hurt.push(p.name+"("+len+"경기)"); hurtP.push({p,len}); injured.push({name:p.name,matches:len,comp:m.comp,stage:m.stage}); } });
    const playing=new Set(lineup);
    lineup.forEach((p,i)=>{ if(!stM.has(p)) return; ps.get(p).apps++; stM.set(p,Math.max(CFG.STAM_MIN, stM.get(p)-CFG.STAM_COST[G[slots[i][0]]]+CFG.STAM_PLAY_REC)); });
    roster.forEach(p=>{ if(!playing.has(p)) stM.set(p,Math.min(100, stM.get(p)+CFG.STAM_REST)); });
    serving.forEach(p=>{ const s=ps.get(p); if(s.susp>0){ s.susp--; s.missed++; } if(s.inj>0){ s.inj--; s.injOut++; } });
    ys.forEach(p=>{ const s=ps.get(p); s.y++; totY++; if(s.y%5===0) s.susp++; });
    rs.forEach(p=>{ const s=ps.get(p); s.r++; totR++; s.susp++; });

    const tl=buildLog({m,opp,lineup,myP,myG,opG,f,a,f0,a0,et,pk,ys,rs,oy,orr,hurtP,cur,mA,mD,oA,oD,bench,used});
    matchNo++;
    const entry={n:matchNo, tl:tl.events, stats:tl.stats, lineup:lineup.map((p,i)=>({pos:slots[i][0],name:p.name,ovr:p.ovr,youth:!!p.youth})), formation:o.form, comp:m.comp, stage:m.stage, round:m.round||null, home:m.home, opp:{name:opp.name,kind:opp.kind||leagueName}, f, a, et, pk, res, advance,
      ms, os, as, rot, ys:ys.map(p=>p.name), rs:rs.map(p=>p.name), oy, or:orr, outS, outI, hurt, derby:null};
    log.push(entry);
    return entry;
  }

  /* ---- 상대팀끼리의 경기 ---- */
  function aiGoals(H,A,derby){
    const spread=derby?CFG.DERBY_SPREAD:CFG.SPREAD, ha=derby?CFG.DERBY_HOME:CFG.HOME_ADV;
    return [K.poisson(CFG.GOAL_BASE*Math.exp((H.att+ha-A.def)/spread)), K.poisson(CFG.GOAL_BASE*Math.exp((A.att-H.def-ha)/spread))];
  }
  const upd=(T,f,g)=>{T.p++;T.gf+=f;T.ga+=g; if(f>g){T.w++;T.pts+=3;} else if(f===g){T.d++;T.pts++;} else T.l++;};
  function aiLeague(H,A){
    const dn=K.derbyName(H.name,A.name);
    const [gh,ga]=aiGoals(H,A,!!dn);
    upd(H,gh,ga); upd(A,ga,gh);
    [[H,gh],[A,ga]].forEach(([T,n])=>{ if(!T.players) return; for(let k=0;k<n;k++){ if(Math.random()<.72){ const s=K.pickScorer(T.players); tally(T,s,"g");
      if(Math.random()<.55){ const asst=K.pickAssist(T.players,s); if(asst) tally(T,asst,"a"); } } } });
    if(dn) derbies.push({name:dn,home:H.name,away:A.name,hg:gh,ag:ga});
  }
  const sortFn=(x,y)=>y.pts-x.pts||(y.gf-y.ga)-(x.gf-x.ga)||y.gf-x.gf;
  /* 내가 속하지 않은 리그는 빠르게 한 시즌만 돌려서 최종 순위를 정해요 (승강 계산용) */
  function simAITable(defs){
    const ts=defs.map(mkTeam); const n=ts.length; const m=n%2?n+1:n; const r1=roundRobin(m);
    r1.concat(flip(r1)).forEach(pr=>pr.forEach(([h,a])=>{ if(h>=n||a>=n) return; const [gh,ga]=aiGoals(ts[h],ts[a],false); upd(ts[h],gh,ga); upd(ts[a],ga,gh); }));
    return ts.sort(sortFn);
  }
  /* 상대팀끼리의 2경기 합산 승강 플레이오프. 승자를 돌려줘요 */
  function aiTie(A,B){
    const [a1,b1]=aiGoals(A,B,false), [b2,a2]=aiGoals(B,A,false);
    const ta=a1+a2, tb=b1+b2; if(ta!==tb) return ta>tb?A:B;
    return Math.random()<.5+K.clamp((A.att+A.def-B.att-B.def)/2/60,-.15,.15)?A:B;
  }

  /* ---- 대회 일정 ---- */
  const events={};
  const addEv=(after,fn)=>{ (events[after]=events[after]||[]).push(fn); };

  /* FA컵: 16강은 K리그2 팀, 이후는 K리그1 팀 */
  const fa={stages:[],alive:true,champion:false,exit:null};
  { const k2pool=K.shuffle(div===2?o.k2:o.k2).map(d=>mkTeam(d));   // K리그2 팀
    const k1pool=K.shuffle(div===1?teams.slice(1):o.k1.map(mkTeam));     // K리그1 팀
    const opps=[k2pool[0],k1pool[0],k1pool[1],k1pool[2]];
    const names=["16강","8강","4강","결승"];
    CFG.FA_AFTER.forEach((after,i)=>addEv(after,()=>{
      if(!fa.alive) return;
      const e=myMatch({comp:"FA컵",stage:names[i],opp:opps[i],home:i===3?null:Math.random()<.5,ko:true});
      fa.stages.push(e);
      if(e.advance){ if(i===3) fa.champion=true; } else { fa.alive=false; fa.exit=names[i]+" 탈락"; }
    })); }

  /* AFC 챔피언스리그: 조별리그(4팀, 6경기) → 16강·8강·4강 2경기 합산 → 결승.
     한국 팀은 동아시아 팀과 조별리그·토너먼트를 치르고, 결승에서 서아시아 챔피언을 만나요. tier 1=엘리트, 2=투 */
  const tier=o.aclQualified|0;
  const compName = tier===1 ? "AFC챔스" : "AFC챔스2";
  const acl={qualified:tier>0,alive:tier>0,tier,name:tier===1?"AFC 챔피언스리그 엘리트":"AFC 챔피언스리그 투",group:null,ko:[],champion:false,exit:null,reached:null};
  if(acl.qualified){
    const pools = tier===1 ? K.AFC1 : K.AFC2;
    const east=K.shuffle(pools.filter(t=>t.region==="E")).map(mkExt), west=pools.filter(t=>t.region==="W").map(mkExt);
    const gOpp=east.slice(0,3), koPool=east.slice(3);
    /* 결승 상대: 서아시아 팀 중 전력이 강한 쪽이 더 자주 올라와요 */
    const strong=west.slice().sort((x,y)=>(y.att+y.def)-(x.att+x.def)).slice(0,Math.max(3,Math.ceil(west.length/3)));
    const finalOpp=strong[Math.floor(Math.random()*strong.length)];
    const gt=[{name:me.name,me:true},...gOpp.map(t=>({name:t.name}))].map(t=>Object.assign(t,{p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}));
    const seq=[[0,true],[1,false],[2,true],[0,false],[1,true],[2,false]];
    let advanced=false;
    CFG.ACL_GROUP_AFTER.forEach((after,i)=>addEv(after,()=>{
      if(!acl.alive) return;
      const [oi,h]=seq[i]; const e=myMatch({comp:compName,stage:"조별 "+(i+1)+"/6",opp:gOpp[oi],home:h,ko:false});
      upd(gt[0],e.f,e.a); upd(gt[oi+1],e.a,e.f);
      if(i===5){
        for(let x=1;x<=3;x++) for(let y=x+1;y<=3;y++){ for(let leg=0;leg<2;leg++){ const H=leg?gOpp[y-1]:gOpp[x-1], A=leg?gOpp[x-1]:gOpp[y-1];
          const [gh,ga]=aiGoals(H,A,false); upd(gt[leg?y:x],gh,ga); upd(gt[leg?x:y],ga,gh); } }
        const tab=gt.slice().sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf);
        acl.group=tab; acl.reached="조별리그";
        if(tab.indexOf(gt[0])<2){ advanced=true; acl.reached="16강"; } else { acl.alive=false; acl.exit="조별리그 탈락"; }
      }
    }));
    const stages=["16강","8강","4강"]; let tie=null;
    stages.forEach((st,si)=>{
      CFG.ACL_KO_AFTER.slice(si*2,si*2+2).forEach((after,leg)=>addEv(after,()=>{
        if(!acl.alive || !advanced) return;
        if(leg===0){ const opp=koPool.length?koPool.shift():gOpp[0]; tie={opp,home1:Math.random()<.5};
          const e=myMatch({comp:compName,stage:st+" 1차전",opp,home:tie.home1,ko:false}); tie.f=e.f; tie.a=e.a; acl.ko.push(e); }
        else { const e=myMatch({comp:compName,stage:st+" 2차전",opp:tie.opp,home:!tie.home1,ko:true,agg:{f:tie.f,a:tie.a}}); acl.ko.push(e);
          if(e.advance){ acl.reached=st==="16강"?"8강":st==="8강"?"4강":"결승"; } else { acl.alive=false; acl.exit=st+" 탈락"; } }
      }));
    });
    addEv(CFG.ACL_KO_AFTER[6],()=>{
      if(!acl.alive || !advanced) return;
      const e=myMatch({comp:compName,stage:"결승 (vs 서아시아)",opp:finalOpp,home:null,ko:true}); acl.ko.push(e);
      if(e.advance){ acl.champion=true; acl.reached="우승"; } else { acl.alive=false; acl.exit="준우승"; acl.reached="결승"; }
    });
  }

  /* ---- 리그 진행 ---- */
  let lr=0;
  const playLeague=(pairs,stage)=>{
    lr++;
    pairs.forEach(([h,a])=>{
      if(h>=N||a>=N) return;   // 홀수 팀 리그의 부전 라운드
      const H=teams[h], A=teams[a];
      if(H.me||A.me){
        const opp=H.me?A:H; const e=myMatch({comp:"리그",stage,opp,home:H.me,ko:false,round:lr});
        const f=H.me?e.f:e.a, g=H.me?e.a:e.f;
        upd(H,f,g); upd(A,g,f);
      } else aiLeague(H,A);
    });
    (events[lr]||[]).forEach(fn=>fn());
  };
  let table;
  if(div===1){
    const leg1=roundRobin(N), leg2=flip(leg1);
    const leg3=leg1.slice().reverse().map(pr=>pr.map(([a,b],i)=>i%2?[b,a]:[a,b]));
    leg1.concat(leg2,leg3).forEach(pr=>playLeague(pr,"정규"));
    const ordered=teams.map((t,i)=>i).sort((a,b)=>sortFn(teams[a],teams[b]));
    const groupA=ordered.slice(0,N/2), groupB=ordered.slice(N/2);
    groupA.forEach(i=>teams[i].grp="A"); groupB.forEach(i=>teams[i].grp="B");
    const finals=g=>roundRobin(g.length).map(pr=>pr.map(([a,b])=>[g[a],g[b]]));
    const fa5=finals(groupA), fb5=finals(groupB);
    fa5.forEach((pr,k)=>playLeague(pr.concat(fb5[k]),"파이널"+me.grp));
    table=groupA.slice().sort((a,b)=>sortFn(teams[a],teams[b])).concat(groupB.slice().sort((a,b)=>sortFn(teams[a],teams[b]))).map(i=>teams[i]);
  } else {
    const m=N%2?N+1:N; const r1=roundRobin(m);
    r1.concat(flip(r1)).forEach(pr=>playLeague(pr,"정규"));
    table=teams.slice().sort(sortFn);
  }
  const rank=table.indexOf(me)+1;
  const rankOf={}; table.forEach((t,i)=>rankOf[t.name]=i+1);

  /* ---- 승강 ---- */
  const moves={up:[],down:[]}; let promo={status:"none",text:""};
  const nm=t=>t.me?"@me":t.name;
  /* 승강 플레이오프: 내가 끼면 내 경기로, 아니면 빠르게 계산 */
  function playoff(upper,lower){   // upper: K리그1 11위, lower: K리그2 2위. 이기는 쪽이 K리그1에서 뛰어요
    if(upper.me||lower.me){
      const opp=upper.me?lower:upper; const home1=Math.random()<.5;
      const e1=myMatch({comp:"승강PO",stage:"1차전",opp,home:home1,ko:false});
      const e2=myMatch({comp:"승강PO",stage:"2차전",opp,home:!home1,ko:true,agg:{f:e1.f,a:e1.a}});
      return {winner:e2.advance?me:opp, played:true};
    }
    return {winner:aiTie(upper,lower), played:false};
  }
  if(div===1){
    const k2t=simAITable(o.k2); const last=table[N-1], elev=table[N-2];
    moves.up.push(k2t[0].name); moves.down.push(nm(last));
    const po=playoff(elev,k2t[1]);
    if(po.winner!==elev){ moves.up.push(k2t[1].name); moves.down.push(nm(elev)); }
    if(last.me) promo={status:"relegated",text:"최하위로 K리그2 강등"};
    else if(elev.me) promo = po.winner===me ? {status:"po_stay",text:"승강 플레이오프에서 승리해 K리그1 잔류"} : {status:"relegated",text:"승강 플레이오프에서 패배해 K리그2 강등"};
    else promo={status:"safe",text:"K리그1 잔류"};
  } else {
    const k1t=simAITable(o.k1); const last=k1t[k1t.length-1], elev=k1t[k1t.length-2];
    const champ=table[0], second=table[1];
    moves.up.push(nm(champ)); moves.down.push(last.name);
    const po=playoff(elev,second);
    if(po.winner===second){ moves.up.push(nm(second)); moves.down.push(elev.name); }
    if(champ.me) promo={status:"promoted",text:"K리그2 우승, K리그1 직행 승격"};
    else if(second.me) promo = po.winner===me ? {status:"po_promoted",text:"승강 플레이오프에서 승리해 K리그1 승격"} : {status:"po_failed",text:"승강 플레이오프에서 패배, K리그2 잔류"};
    else promo={status:"stay",text:"K리그2 잔류"};
  }
  const nextDiv = moves.up.includes("@me") ? 1 : moves.down.includes("@me") ? 2 : div;

  /* ---- 대회 결과 요약 ---- */
  const trophies=[];
  if(rank===1) trophies.push(div===1?"리그 우승":"K리그2 우승");
  if(fa.champion) trophies.push("FA컵 우승");
  if(acl.champion) trophies.push(acl.tier===1?"AFC챔스 우승":"AFC챔스2 우승");

  /* ---- 시상 ---- */
  const pool=[];
  roster.forEach(p=>{ const s=ps.get(p); pool.push({key:"me|"+p.uid,mine:true,name:p.name,team:me.name,short:me.name,pos:p.pos,ovr:p.ovr,g:s.lg,a:s.la,ref:p,cs:s.cs,apps:s.apps}); });
  aiStats.forEach(r=>pool.push(Object.assign({key:r.team+"|"+r.name,mine:false},r)));
  teams.slice(1).forEach(t=>{ if(t.players) t.players.forEach(p=>{ if(!aiStats.has(t.name+"|"+p.name)) pool.push({key:t.name+"|"+p.name,mine:false,name:p.name,team:t.name,short:t.short,pos:p.pos,ovr:p.ovr,g:0,a:0}); }); });
  const rk=x=>(N+1)-(rankOf[x.team]||N);
  const mvpScore=x=>x.pos==="GK"?-99:x.g*2+x.a*1.3+rk(x)*.6+(x.ovr-70)*.05+(x.apps||0)*0.02;
  const byScore=(arr,fn)=>arr.slice().sort((a,b)=>fn(b)-fn(a));
  const scorers=pool.filter(x=>x.g>0).sort((a,b)=>b.g-a.g||b.a-a.a).slice(0,10);
  const assisters=pool.filter(x=>x.a>0).sort((a,b)=>b.a-a.a||b.g-a.g).slice(0,10);
  const mvp=byScore(pool,mvpScore)[0]||null;
  const bestXI=[]; [["GK",1],["DF",4],["MF",3],["FW",3]].forEach(([g,n])=>{
    byScore(pool.filter(x=>x.pos===g),x=>x.ovr*.6+x.g*.4+x.a*.25+rk(x)*.4+(x.cs||0)*.05).slice(0,n).forEach(x=>bestXI.push(x)); });
  const champ=table[0];
  const coach={team:champ.name, name: champ.me ? (o.mgr?o.mgr.name:"내 감독") : champ.name+" 감독", mine:!!champ.me};
  const awards={scorer:scorers[0]||null, assister:assisters[0]||null, mvp, bestXI, coach, topScorers:scorers, topAssists:assisters, partial:div===2};

  /* ---- 내 팀 선수 기록 ---- */
  const stam=roster.map(p=>{ const s=ps.get(p); return {p,starter:xi.includes(p),apps:s.apps,st:stM.get(p),y:s.y,r:s.r,missed:s.missed,injOut:s.injOut,injN:s.injN,g:s.g,a:s.a,lg:s.lg,la:s.la,cs:s.cs}; })
    .sort((a,b)=>b.apps-a.apps||b.p.ovr-a.p.ovr);
  const mine={
    mvp:stam.slice().sort((a,b)=>(b.g*2+b.a*1.3+b.apps*.03)-(a.g*2+a.a*1.3+a.apps*.03))[0],
    scorer:stam.slice().sort((a,b)=>b.g-a.g||b.a-a.a)[0],
    assister:stam.slice().sort((a,b)=>b.a-a.a||b.g-a.g)[0],
    ironman:stam.slice().sort((a,b)=>b.apps-a.apps)[0]
  };
  const cardsTot={y:totY,r:totR,missed:stam.reduce((n,x)=>n+x.missed,0)};
  const injTot={n:injured.length,missed:stam.reduce((n,x)=>n+x.injOut,0),list:injured};
  const league=log.filter(e=>e.comp==="리그");
  const unbeaten=league.every(e=>e.res!=="L");
  const rating0=K.rate(xi,null,ctx);
  /* 다음 시즌 AFC 진출 등급: 1=엘리트(리그 상위권, 엘리트 우승팀), 2=투(리그 중위권, FA컵 우승팀) */
  let aclNext = 0;
  if(div===1 && rank<=CFG.ACL_QUAL_RANK) aclNext=1;
  else if(acl.champion && acl.tier===1) aclNext=1;
  else if((div===1 && rank<=CFG.AFC챔스2_QUAL_RANK) || fa.champion || acl.champion) aclNext=2;

  return {year:o.year, seasonNo:o.seasonNo, diff:o.diff, div, leagueName, N, teams, table, log, me, rank, rate:rating0,
    fa, acl, trophies, awards, mine, stam, rotations, cards:cardsTot, inj:injTot, derbies, goals:goalsAll, aclNext,
    promo, moves, nextDiv,
    flags:{unbeaten, perfect:div===1&&me.w===38, league:{w:me.w,d:me.d,l:me.l,pts:me.pts,gf:me.gf,ga:me.ga}}};
}

window.KLSeason={run};
})();

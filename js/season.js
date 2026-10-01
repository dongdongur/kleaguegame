/* K-레전드 38 시즌 엔진: 리그(12팀 38라운드) + FA컵 + ACL, 체력·카드·부상, 시상 통계. 화면과 무관한 순수 로직 */
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
 *       aclQualified:boolean, boost:{구단명:능력치 보정} }
 */
function run(o){
  const K=window.KLCore, CFG=K.CONFIG, G=K.GROUP;
  const hardDiff=o.diff==="hard";
  const ctx={form:o.form,mgr:o.mgr};
  const slots=K.FORMS[o.form];
  const xi=o.xi.slice(), bench=o.bench.filter(Boolean);
  const roster=xi.concat(bench);
  const stM=new Map(roster.map(p=>[p,100]));
  const ps=new Map(roster.map(p=>[p,{apps:0,g:0,lg:0,a:0,la:0,y:0,r:0,susp:0,inj:0,missed:0,injOut:0,injN:0,cs:0}]));
  const youth=g=>({name:"유스 선수",pos:g,ovr:CFG.YOUTH_OVR,alt:null,det:null,sq:-1,youth:true});
  const rnd=a=>a[Math.floor(Math.random()*a.length)];

  /* ---- 팀 만들기 ---- */
  const jit=()=> (Math.random()-.5)*2;
  const k1=K.TEAMS26.map(t=>{ const s=K.oppStrength(t,hardDiff,(o.boost&&o.boost[t.club])||0); const j=jit();
    return {name:t.club, short:t.short, kind:"K리그1", att:s.att+j, def:s.def+j*.5, players:s.players}; });
  const me={name:o.teamName||"레전드 FC", short:o.teamName||"내 팀", me:true, att:0, def:0, sub:o.form+(o.mgr?" · 감독 "+o.mgr.name:"")};
  const teams=[me].concat(k1);
  teams.forEach(t=>Object.assign(t,{p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}));
  const N=teams.length;
  const mkExt=t=>{ const j=jit(), b=t.base+(hardDiff?CFG.CUP_HARD:0); return {name:t.name,short:t.name,kind:t.kind,att:b+j,def:b+j*.5}; };

  const log=[]; const goalsAll={}; let matchNo=0;
  const aiStats=new Map();
  const tally=(team,s,field)=>{ const key=team.name+"|"+s.name; let r=aiStats.get(key);
    if(!r){ r={team:team.name,short:team.short,name:s.name,pos:s.pos,ovr:s.ovr,g:0,a:0}; aiStats.set(key,r); } r[field]++; };
  const derbies=[];
  let rotations=0, totY=0, totR=0, injured=[];

  const avail=p=>{ const s=ps.get(p); return !!s && s.susp<=0 && s.inj<=0; };
  const effOvr=p=>p.ovr-K.fatigue(stM.get(p));

  /* ---- 내 경기 한 판 ---- */
  function myMatch(m){
    const opp=m.opp;
    const lineup=xi.slice(); const used=new Set(); let rot=0; const outS=[], outI=[];
    /* 1) 결장(징계·부상) 중인 선발은 후보로 교체: 같은 자리 > 아무 후보 > 유스 */
    xi.forEach((p,i)=>{ const s=ps.get(p); if(s.susp<=0 && s.inj<=0) return;
      (s.inj>0?outI:outS).push(p.name); const lab=slots[i][0];
      let c=bench.filter(b=>!used.has(b) && avail(b) && K.fitsSlot(b,lab));
      if(!c.length) c=bench.filter(b=>!used.has(b) && avail(b));
      if(c.length){ c.sort((x,y)=>effOvr(y)-effOvr(x)); lineup[i]=c[0]; used.add(c[0]); } else lineup[i]=youth(G[lab]); });
    /* 2) 지친 선발은 같은 자리를 설 수 있는 후보로 교체 */
    xi.forEach((p,i)=>{ if(!avail(p) || stM.get(p)>=CFG.STAM_ROTATE) return;
      const lab=slots[i][0];
      const c=bench.filter(b=>!used.has(b) && avail(b) && stM.get(b)>stM.get(p)+10 && K.fitsSlot(b,lab));
      if(c.length){ c.sort((x,y)=>effOvr(y)-effOvr(x)); lineup[i]=c[0]; used.add(c[0]); rot++; } });
    rotations+=rot;

    /* 카드 추첨 (내 팀은 선수별, 상대는 팀 단위) */
    const ys=[], rs=[];
    lineup.forEach((p,i)=>{ if(p.youth) return; const g=G[slots[i][0]];
      if(Math.random()<CFG.CARD_R){ rs.push(p); return; }
      if(Math.random()<CFG.CARD_Y[g]){ ys.push(p); if(Math.random()<CFG.CARD_Y2) rs.push(p); } });
    const oy=K.poisson(CFG.OPP_YELLOW), orr=Math.random()<CFG.OPP_RED?1:0;

    /* 득점 기대값 */
    const cur=K.rate(lineup,stM,ctx); me.att=cur.att; me.def=cur.def;
    const pen=CFG.RED_PEN;
    const mA=cur.att-pen*rs.length, mD=cur.def-pen*rs.length, oA=opp.att-pen*orr, oD=opp.def-pen*orr;
    const ha = m.home===true?CFG.HOME_ADV : m.home===false?-CFG.HOME_ADV : 0;
    const lm=CFG.GOAL_BASE*Math.exp((mA+ha-oD)/CFG.SPREAD), lo=CFG.GOAL_BASE*Math.exp((oA-mD-ha)/CFG.SPREAD);
    let f=K.poisson(lm), a=K.poisson(lo), et=false, pk=null;
    const aggF=m.agg?m.agg.f:0, aggA=m.agg?m.agg.a:0;
    if(m.ko){
      if(f+aggF===a+aggA){ et=true; f+=K.poisson(lm*CFG.ET_FACTOR); a+=K.poisson(lo*CFG.ET_FACTOR);
        if(f+aggF===a+aggA){ const pw=.5+K.clamp((mA+mD-oA-oD)/2/60,-.15,.15); const win=Math.random()<pw;
          const ws=4+(Math.random()<.4?1:0), ls=Math.max(2,ws-1-(Math.random()<.3?1:0)); pk=win?[ws,ls]:[ls,ws]; } } }
    const res = pk ? (pk[0]>pk[1]?"W":"L") : (f>a?"W":f===a?"D":"L");
    const advance = m.ko ? ((f+aggF>a+aggA) || (f+aggF===a+aggA && !!pk && pk[0]>pk[1])) : null;

    /* 득점·도움 */
    const myP=lineup.map((p,i)=>Object.assign({},p,{g:G[slots[i][0]],ref:p}));
    const league=m.comp==="리그";
    const ms=[], as=[];
    for(let k=0;k<f;k++){ const s=K.pickScorer(myP); ms.push(s.name); goalsAll[s.name]=(goalsAll[s.name]||0)+1;
      const st=ps.get(s.ref); if(st){ st.g++; if(league) st.lg++; }
      if(Math.random()<.72){ const asst=K.pickAssist(myP,s); if(asst){ as.push(asst.name); const a2=ps.get(asst.ref); if(a2){ a2.a++; if(league) a2.la++; } } } }
    const os=[];
    for(let k=0;k<a;k++){
      if(opp.players){ const s=K.pickScorer(opp.players); os.push(s.name);
        if(league && Math.random()<.72){ tally(opp,s,"g"); if(Math.random()<.55){ const asst=K.pickAssist(opp.players,s); if(asst) tally(opp,asst,"a"); } } }
      else os.push("상대 선수"); }
    if(a===0 && lineup[0] && ps.has(lineup[0])) ps.get(lineup[0]).cs++;

    /* 사후 처리: 징계·부상 소화, 체력, 출전, 새 카드·부상 */
    const serving=roster.filter(p=>ps.get(p).susp>0 || ps.get(p).inj>0);
    const hurt=[];
    lineup.forEach((p,i)=>{ if(p.youth) return; const s=ps.get(p); const g=G[slots[i][0]];
      let pr=CFG.INJ_BASE*(1+Math.max(0,(CFG.STAM_ROTATE-stM.get(p))/40)); if(g==="GK") pr*=CFG.INJ_GK;
      if(Math.random()<pr){ let x=Math.random(), len=1; for(const [pp,mn,mx] of CFG.INJ_LEN){ if(x<pp){ len=mn+Math.floor(Math.random()*(mx-mn+1)); break; } x-=pp; }
        s.inj=len+1; s.injN++; hurt.push(p.name+"("+len+"경기)"); injured.push({name:p.name,matches:len,comp:m.comp,stage:m.stage}); } });
    const playing=new Set(lineup);
    lineup.forEach((p,i)=>{ if(!stM.has(p)) return; ps.get(p).apps++; stM.set(p,Math.max(CFG.STAM_MIN, stM.get(p)-CFG.STAM_COST[G[slots[i][0]]]+CFG.STAM_PLAY_REC)); });
    roster.forEach(p=>{ if(!playing.has(p)) stM.set(p,Math.min(100, stM.get(p)+CFG.STAM_REST)); });
    serving.forEach(p=>{ const s=ps.get(p); if(s.susp>0){ s.susp--; s.missed++; } if(s.inj>0){ s.inj--; s.injOut++; } });
    ys.forEach(p=>{ const s=ps.get(p); s.y++; totY++; if(s.y%5===0) s.susp++; });
    rs.forEach(p=>{ const s=ps.get(p); s.r++; totR++; s.susp++; });

    matchNo++;
    const entry={n:matchNo, comp:m.comp, stage:m.stage, round:m.round||null, home:m.home, opp:{name:opp.name,kind:opp.kind||"K리그1"}, f, a, et, pk, res, advance,
      ms, os, as, rot, ys:ys.map(p=>p.name), rs:rs.map(p=>p.name), oy, or:orr, outS, outI, hurt,
      derby:null};
    log.push(entry);
    return entry;
  }

  /* ---- 상대팀끼리의 경기 ---- */
  function aiGoals(H,A,derby){
    const spread=derby?CFG.DERBY_SPREAD:CFG.SPREAD, ha=derby?CFG.DERBY_HOME:CFG.HOME_ADV;
    return [K.poisson(CFG.GOAL_BASE*Math.exp((H.att+ha-A.def)/spread)), K.poisson(CFG.GOAL_BASE*Math.exp((A.att-H.def-ha)/spread))];
  }
  function aiLeague(H,A){
    const dn=K.derbyName(H.name,A.name);
    const [gh,ga]=aiGoals(H,A,!!dn);
    [[H,gh,ga],[A,ga,gh]].forEach(([T,f,g])=>{T.p++;T.gf+=f;T.ga+=g; if(f>g){T.w++;T.pts+=3;} else if(f===g){T.d++;T.pts++;} else T.l++;});
    [[H,gh],[A,ga]].forEach(([T,n])=>{ for(let k=0;k<n;k++){ if(Math.random()<.72){ const s=K.pickScorer(T.players); tally(T,s,"g");
      if(Math.random()<.55){ const asst=K.pickAssist(T.players,s); if(asst) tally(T,asst,"a"); } } } });
    if(dn) derbies.push({name:dn,home:H.name,away:A.name,hg:gh,ag:ga});
  }

  /* ---- 대회 일정 ---- */
  const events={};
  const addEv=(after,fn)=>{ (events[after]=events[after]||[]).push(fn); };

  /* FA컵: 16강은 K리그2 팀, 이후는 K리그1 팀 */
  const fa={stages:[],alive:true,champion:false,exit:null};
  { const k2=K.shuffle(K.K2).map(mkExt); const pool=K.shuffle(k1); const opps=[k2[0],pool[0],pool[1],pool[2]];
    const names=["16강","8강","4강","결승"];
    CFG.FA_AFTER.forEach((after,i)=>addEv(after,()=>{
      if(!fa.alive) return;
      const e=myMatch({comp:"FA컵",stage:names[i],opp:opps[i],home:i===3?null:Math.random()<.5,ko:true});
      fa.stages.push(e);
      if(e.advance){ if(i===3) fa.champion=true; } else { fa.alive=false; fa.exit=names[i]+" 탈락"; }
    })); }

  /* ACL: 조별리그(4팀, 6경기) → 16강·8강·4강 2경기 합산 → 결승 */
  const acl={qualified:!!o.aclQualified,alive:!!o.aclQualified,group:null,ko:[],champion:false,exit:null,reached:null};
  if(acl.qualified){
    const pool=K.shuffle(K.ACL_POOL); const gOpp=pool.slice(0,3).map(mkExt); const koPool=pool.slice(3).map(mkExt);
    const gt=[{name:me.name,me:true},...gOpp.map(t=>({name:t.name}))].map(t=>Object.assign(t,{p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}));
    const seq=[[0,true],[1,false],[2,true],[0,false],[1,true],[2,false]];
    const upd=(T,f,g)=>{T.p++;T.gf+=f;T.ga+=g; if(f>g){T.w++;T.pts+=3;} else if(f===g){T.d++;T.pts++;} else T.l++;};
    let advanced=false;
    CFG.ACL_GROUP_AFTER.forEach((after,i)=>addEv(after,()=>{
      if(!acl.alive) return;
      const [oi,h]=seq[i]; const e=myMatch({comp:"ACL",stage:"조별 "+(i+1)+"/6",opp:gOpp[oi],home:h,ko:false});
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
        if(leg===0){ const opp=koPool.shift(); tie={opp,home1:Math.random()<.5};
          const e=myMatch({comp:"ACL",stage:st+" 1차전",opp,home:tie.home1,ko:false}); tie.f=e.f; tie.a=e.a; acl.ko.push(e); }
        else { const e=myMatch({comp:"ACL",stage:st+" 2차전",opp:tie.opp,home:!tie.home1,ko:true,agg:{f:tie.f,a:tie.a}}); acl.ko.push(e);
          if(e.advance){ acl.reached=st==="16강"?"8강":st==="8강"?"4강":"결승"; } else { acl.alive=false; acl.exit=st+" 탈락"; } }
      }));
    });
    addEv(CFG.ACL_KO_AFTER[6],()=>{
      if(!acl.alive || !advanced) return;
      const e=myMatch({comp:"ACL",stage:"결승",opp:koPool.shift(),home:null,ko:true}); acl.ko.push(e);
      if(e.advance){ acl.champion=true; acl.reached="우승"; } else { acl.alive=false; acl.exit="준우승"; acl.reached="결승"; }
    });
  }

  /* ---- 리그 진행 ---- */
  let lr=0;
  const playLeague=(pairs,stage)=>{
    lr++;
    pairs.forEach(([h,a])=>{
      const H=teams[h], A=teams[a];
      if(H.me||A.me){
        const opp=H.me?A:H; const e=myMatch({comp:"리그",stage,opp,home:H.me,ko:false,round:lr});
        const dn=null; e.derby=dn;
        const f=H.me?e.f:e.a, g=H.me?e.a:e.f;
        [[H,f,g],[A,g,f]].forEach(([T,x,y])=>{T.p++;T.gf+=x;T.ga+=y; if(x>y){T.w++;T.pts+=3;} else if(x===y){T.d++;T.pts++;} else T.l++;});
      } else aiLeague(H,A);
    });
    (events[lr]||[]).forEach(fn=>fn());
  };
  const leg1=roundRobin(N), leg2=flip(leg1);
  const leg3=leg1.slice().reverse().map(pr=>pr.map(([a,b],i)=>i%2?[b,a]:[a,b]));
  leg1.concat(leg2,leg3).forEach(pr=>playLeague(pr,"정규"));
  const sortFn=(x,y)=>y.pts-x.pts||(y.gf-y.ga)-(x.gf-x.ga)||y.gf-x.gf;
  const ordered=teams.map((t,i)=>i).sort((a,b)=>sortFn(teams[a],teams[b]));
  const groupA=ordered.slice(0,N/2), groupB=ordered.slice(N/2);
  groupA.forEach(i=>teams[i].grp="A"); groupB.forEach(i=>teams[i].grp="B");
  const finals=g=>roundRobin(g.length).map(pr=>pr.map(([a,b])=>[g[a],g[b]]));
  const fa5=finals(groupA), fb5=finals(groupB);
  fa5.forEach((pr,k)=>playLeague(pr.concat(fb5[k]),"파이널"+me.grp));
  const table=groupA.slice().sort((a,b)=>sortFn(teams[a],teams[b])).concat(groupB.slice().sort((a,b)=>sortFn(teams[a],teams[b]))).map(i=>teams[i]);
  const rank=table.indexOf(me)+1;
  const rankOf={}; table.forEach((t,i)=>rankOf[t.name]=i+1);

  /* ---- 대회 결과 요약 ---- */
  const trophies=[];
  if(rank===1) trophies.push("리그 우승");
  if(fa.champion) trophies.push("FA컵 우승");
  if(acl.champion) trophies.push("ACL 우승");

  /* ---- 시상 ---- */
  const pool=[];
  roster.forEach(p=>{ const s=ps.get(p); pool.push({key:"me|"+p.uid,mine:true,name:p.name,team:me.name,short:me.name,pos:p.pos,ovr:p.ovr,g:s.lg,a:s.la,ref:p,cs:s.cs,apps:s.apps}); });
  aiStats.forEach(r=>pool.push(Object.assign({key:r.team+"|"+r.name,mine:false},r)));
  /* 득점이 한 번도 없는 상대 선수도 베스트 11 후보가 될 수 있게 */
  teams.slice(1).forEach(t=>t.players.forEach(p=>{ if(!aiStats.has(t.name+"|"+p.name)) pool.push({key:t.name+"|"+p.name,mine:false,name:p.name,team:t.name,short:t.short,pos:p.pos,ovr:p.ovr,g:0,a:0}); }));
  const rk=x=>13-(rankOf[x.team]||12);
  const mvpScore=x=>x.pos==="GK"?-99:x.g*2+x.a*1.3+rk(x)*.6+(x.ovr-70)*.05+(x.apps||0)*0.02;
  const byScore=(arr,fn)=>arr.slice().sort((a,b)=>fn(b)-fn(a));
  const scorers=pool.filter(x=>x.g>0).sort((a,b)=>b.g-a.g||b.a-a.a).slice(0,10);
  const assisters=pool.filter(x=>x.a>0).sort((a,b)=>b.a-a.a||b.g-a.g).slice(0,10);
  const mvp=byScore(pool,mvpScore)[0]||null;
  const bestXI=[]; [["GK",1],["DF",4],["MF",3],["FW",3]].forEach(([g,n])=>{
    byScore(pool.filter(x=>x.pos===g),x=>x.ovr*.6+x.g*.4+x.a*.25+rk(x)*.4+(x.cs||0)*.05).slice(0,n).forEach(x=>bestXI.push(x)); });
  const champ=table[0];
  const coach={team:champ.name, name: champ.me ? (o.mgr?o.mgr.name:"내 감독") : champ.name+" 감독", mine:!!champ.me};
  const awards={scorer:scorers[0]||null, assister:assisters[0]||null, mvp, bestXI, coach, topScorers:scorers, topAssists:assisters};

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

  /* 다음 시즌 ACL 진출권 */
  const aclNext = rank<=CFG.ACL_QUAL_RANK || fa.champion || acl.champion;

  return {year:o.year, seasonNo:o.seasonNo, diff:o.diff, N, teams, table, log, me, rank, rate:rating0,
    fa, acl, trophies, awards, mine, stam, rotations, cards:cardsTot, inj:injTot, derbies, goals:goalsAll, aclNext,
    flags:{unbeaten, perfect:me.w===38, league:{w:me.w,d:me.d,l:me.l,pts:me.pts,gf:me.gf,ga:me.ga}}};
}

window.KLSeason={run};
})();

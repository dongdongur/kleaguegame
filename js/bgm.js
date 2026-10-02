/*
 * 배경음악 (js/bgm.js) — 파일 없이 브라우저에서 직접 만들어 내는 잔잔한 음악이에요(저작권 걱정 없음).
 * 우측 하단 🎵 버튼으로 켜고 끄고, 선택은 기억해요. 처음엔 꺼져 있어요(모바일은 누른 뒤에만 소리가 나요).
 * KL_BGM.mood("calm"|"match"|"epic") 으로 분위기를 바꿀 수 있어요.
 */
(function(){
"use strict";
const KEY="kl-bgm"; let ctx=null, master=null, on=false, timer=null, step=0, mood="calm";
const M={ /* bpm, 코드(루트 반음), 음계, 음량 */
  calm:{bpm:68,chords:[[0,4,7],[9,0,4],[5,9,0],[7,11,2]],root:57,vol:.5},
  match:{bpm:96,chords:[[0,3,7],[8,0,3],[3,7,10],[10,2,5]],root:55,vol:.55},
  epic:{bpm:80,chords:[[0,4,7],[7,11,2],[9,0,4],[5,9,0]],root:53,vol:.7}
};
const hz=n=>440*Math.pow(2,(n-69)/12);
function tone(f,t,d,type,v,pan){
  const o=ctx.createOscillator(), g=ctx.createGain(); o.type=type; o.frequency.value=f;
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v,t+Math.min(.35,d*.3)); g.gain.exponentialRampToValueAtTime(.0001,t+d);
  o.connect(g); g.connect(master); o.start(t); o.stop(t+d+.05);
}
function bar(){
  const m=M[mood], spb=60/m.bpm, t=ctx.currentTime+.05, ch=m.chords[step%m.chords.length]; step++;
  /* 패드: 코드 세 음을 길게 */
  ch.forEach((n,i)=>tone(hz(m.root+n+(i?12:0)),t,spb*4.2,"sine",.045*m.vol,0));
  /* 베이스 */
  tone(hz(m.root+ch[0]-12),t,spb*3.6,"triangle",.06*m.vol,0);
  /* 아르페지오: 박마다 코드 음을 가볍게 */
  for(let i=0;i<8;i++){ const n=ch[(i*2+(step%2))%3]+12*(1+(i%3===2?1:0)); tone(hz(m.root+n),t+i*spb*.5,spb*.9,"triangle",(.03+(i%2?0:.012))*m.vol,0); }
  if(mood!=="calm") for(let i=0;i<4;i++) tone(60+i%2*20,t+i*spb,.12,"square",.006*m.vol); // 부드러운 박자
  timer=setTimeout(bar,spb*4*1000-60);
}
function start(){
  try{
    if(!ctx){ const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return; ctx=new AC(); master=ctx.createGain(); master.gain.value=0; const lp=ctx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=2400; master.connect(lp); lp.connect(ctx.destination); }
    ctx.resume(); master.gain.cancelScheduledValues(ctx.currentTime); master.gain.linearRampToValueAtTime(.8,ctx.currentTime+1.5);
    if(!timer){ step=0; bar(); }
  }catch(e){}
}
function stop(){ try{ if(!ctx) return; master.gain.cancelScheduledValues(ctx.currentTime); master.gain.linearRampToValueAtTime(0,ctx.currentTime+.6); clearTimeout(timer); timer=null; setTimeout(function(){ if(!on&&ctx) ctx.suspend(); },800); }catch(e){} }
function btn(){
  const b=document.createElement("button"); b.type="button"; b.id="klBgm"; b.setAttribute("aria-label","배경음악");
  b.style.cssText="position:fixed;right:12px;bottom:84px;z-index:90;width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(10,14,28,.78);color:#fff;font-size:20px;cursor:pointer;backdrop-filter:blur(6px);box-shadow:0 4px 14px rgba(0,0,0,.4)";
  const paint=function(){ b.textContent=on?"🎵":"🔇"; b.style.opacity=on?1:.7; };
  b.onclick=function(){ on=!on; try{ localStorage.setItem(KEY,on?"1":"0"); }catch(e){} on?start():stop(); paint(); };
  paint(); document.body.appendChild(b);
  /* 이전에 켜 두었다면 첫 터치 때 이어서 재생(브라우저 정책상 터치가 있어야 소리가 나요) */
  let want=false; try{ want=localStorage.getItem(KEY)==="1"; }catch(e){}
  if(want){ on=true; paint(); const f=function(){ document.removeEventListener("pointerdown",f); if(on) start(); }; document.addEventListener("pointerdown",f); }
}
window.KL_BGM={mood:function(k){ if(!M[k]||k===mood) return; mood=k; step=0; if(on&&timer){ clearTimeout(timer); timer=null; bar(); } },on:function(){ return on; }};
if(document.readyState!=="loading") btn(); else document.addEventListener("DOMContentLoaded",btn);
})();

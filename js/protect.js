/* 가벼운 복사 방지: 우클릭·드래그·선택·개발자 도구 단축키를 막아요.
   ⚠ 브라우저는 코드를 그대로 받아 실행하므로 완전히 막을 수는 없어요. 일반 사용자가 쉽게 베끼는 것만 어렵게 하는 정도예요.
   개발할 때는 주소 끝에 ?dev 를 붙이면 꺼져요. */
(function(){
"use strict";
if(/[?&]dev\b/.test(location.search)) return;
const stop=e=>{ e.preventDefault(); };
const field=e=>/^(INPUT|TEXTAREA|SELECT)$/.test((e.target&&e.target.tagName)||"");
document.addEventListener("contextmenu",stop);
document.addEventListener("dragstart",stop);
document.addEventListener("selectstart",e=>{ if(!field(e)) stop(e); });
document.addEventListener("copy",e=>{ if(!field(e)) stop(e); });
document.addEventListener("keydown",e=>{
  const k=(e.key||"").toLowerCase();
  if(e.key==="F12" || (e.ctrlKey&&e.shiftKey&&["i","j","c"].includes(k)) || (e.ctrlKey&&["u","s"].includes(k)) || (e.metaKey&&e.altKey&&["i","j","c","u"].includes(k))) stop(e);
});
const st=document.createElement("style");
st.textContent="body{-webkit-user-select:none;user-select:none}input,textarea,select{-webkit-user-select:text;user-select:text}img{-webkit-user-drag:none}";
document.head.appendChild(st);
})();

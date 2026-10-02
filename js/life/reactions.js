/*
 * K-라이프 시즌별 SNS·팬 반응 (js/life/reactions.js)
 * 시즌이 끝나면 그 시즌의 성적·수상·더비·부상·이적에 맞춰 기사 제목 하나와 SNS 글 4~6개가 나와요.
 * 인기가 높을수록 '좋아요'가 많아지고, 인성이 낮으면 비꼬는 글이 섞여요. (모든 계정은 가상이에요)
 */
(function(){
"use strict";
const L=window.LIFE; if(!L) return;
const {pick,ri,rnd,clamp,shuffle}=L;
/* 조사(은/는·이/가·을/를·과/와·으로/로)를 앞 글자의 받침에 맞춰 붙여요 */
const jong=s=>{ const ch=String(s).trim().slice(-1).charCodeAt(0); if(ch<0xAC00||ch>0xD7A3) return 0; return (ch-0xAC00)%28; };
const JOSA={"은":["은","는"],"는":["은","는"],"이":["이","가"],"가":["이","가"],"을":["을","를"],"를":["을","를"],"과":["과","와"],"와":["과","와"]};
const fill=(t,c)=>t.replace(/\{(\w+)\}(으로|로|은|는|이|가|을|를|과|와)?/g,(m,k,j)=>{ if(c[k]==null) return m; const v=String(c[k]); if(!j) return v; if(j==="으로"||j==="로"){ const f=jong(v); return v+((f===0||f===8)?"로":"으로"); } const p=JOSA[j]; return v+(jong(v)?p[0]:p[1]); });
const HANDLE=["@골은_발끝에서","@직관러_하늘","@축구밥_먹는중","@전술칠판_김씨","@야식과_중계","@주말엔_경기장","@킥오프_5분전","@벤치워머_응원단","@라인업_분석가","@오프사이드_벗어나","@서포터_막내","@엄마가_제일_좋아해","@축덕_밤샘러","@하이라이트_수집가","@수비는_예술이다","@패스마스터_덕후","@직관_후기러","@주말_원정러","@응원가_작곡가","@전광판_앞자리","@하프타임_치킨","@스카프_수집가","@새벽_해외축구","@기록실_덕후","@슈팅_각도_연구소","@경기후_복기러","@홈_개막전_멤버","@퇴근하고_킥오프","@유스출신_응원","@오늘의_MOM_투표"];
const likes=(S,tone)=>{ const f=1+L.fameEff(S.fame)/16; const v=Math.round(ri(12,160)*f*(tone>0?1.3:tone<0?1.1:1)); return v>=1000?(Math.round(v/100)/10)+"k":v; };

/* [조건, 어조(+1 칭찬/0 중립/-1 비판), 가중치, 문구들] */
const P=(cond,tone,w,texts,src)=>({cond,tone,w,texts,src});
const POOL=[
 /* 우승 */
 P(c=>c.leagueTitle,1,5,["{c} 우승!!! 울었다 진짜ㅠㅠ 올해 {n} 없었으면 불가능했음","리그 우승 축하해요 {n}! 올 한 해 정말 고마웠어요 🏆","우승 세리머니 보다가 눈물 났다… {c} 팬이라 행복하다"]),
 P(c=>c.cupTitle,1,3,["{cup} 우승 확정! {n} 선수 활약 미쳤다","트로피 들어 올리는 {n} 보고 소름 😭"]),
 P(c=>c.uclTitle,1,6,["챔스 우승…? 이게 현실이야? {n} 사랑해요 🏆⭐","유럽 정상에 선 {c}! 오늘 밤은 아무도 못 잔다","{n} 챔피언스리그 우승 한 줄 요약: 전설"]),
 P(c=>c.wcTitle,1,6,["월드컵 우승!!! 대한민국 만세!!!! {n} 국민 영웅이다","온 나라가 뒤집어졌다… {n} 고마워요 진짜","월드컵 트로피 든 {n} 사진 폰 배경화면 확정"]),
 P(c=>c.ballonWin,1,6,["{n} 발롱도르 수상… 한국 축구 역사를 새로 썼다","세계 최고의 선수가 우리나라에서 나왔다니 믿기지 않아요","발롱도르 {n}! 올해 이 선수를 응원한 게 자랑스럽다"]),
 /* 개인 활약 */
 P(c=>c.goldenBoot,1,4,["득점왕 {n}! {g}골 실화냐 ㅋㅋㅋ","{n} {g}골… 수비수들 오늘도 울었다","올 시즌 골 장인은 {n}, 인정?"]),
 P(c=>c.mvp,1,4,["올해의 선수 {n}, 이견 없습니다","MVP는 {n}이지 누가 와도 이건 못 이겨요"]),
 P(c=>c.bestXI,1,2,["베스트 11 {n} 포함 당연한 결과 ㅎㅎ","올해의 팀에 {n} 이름 보이니까 괜히 뿌듯하다"]),
 P(c=>c.hot&&!c.goldenBoot,1,3,["{n} 요즘 컨디션 미쳤다. 평점 {rt} 실화?","{n} 경기 볼 때마다 한 건 한다","오늘도 {n}한테 눈이 간다… 성장 속도 무섭네"]),
 P(c=>c.goals>=15&&!c.goldenBoot&&c.pos!=="GK",1,2,["{g}골이나 넣었는데 득점왕이 아니라니… 리그 수준 인정","{n} {g}골 {a}도움! 올해 몫은 충분히 했다"]),
 P(c=>c.cs>=15&&(c.pos==="GK"||c.pos==="DF"),1,3,["{n} 뒤에 서 있으면 든든하다 클린시트 {cs}번","무실점 {cs}경기… 벽이 있다 벽이"]),
 P(c=>c.assists>=10&&c.pos!=="GK",1,2,["{n}의 패스는 예술이야. {a}도움 보고 가세요","도움왕은 못 했어도 팬들한테는 이미 도움왕"]),
 P(c=>c.grow>=4,1,3,["{n} 올해 OVR +{grow} 급성장 실화냐… 내년이 기대된다","한 시즌 만에 이렇게 크다니, 훈련 얼마나 한 거야"]),
 /* 순위 */
 P(c=>c.topHalf&&!c.leagueTitle&&c.rank<=4,1,2,["{c} {rank}위! 내년엔 우승 가자","상위권 마무리 고생했어요 {c}! 팬들은 만족해요"]),
 P(c=>c.rank>=c.N-2&&!c.promoted,-1,4,["{c} 이 성적 뭐냐… 팬들 속 터진다","강등권이라니… 구단 뭐 하는 거야","{n}은 열심히 뛰었는데 팀이 못 받쳐 준다 ㅠ"]),
 P(c=>c.relegated,-1,6,["강등이라니… 믿기지 않는다. {c} 팬 눈물 마를 날이 없네","{c} 강등 확정… {n}은 어디로 가나요?","1부에서 다시 봅시다. 끝까지 응원할게요"]),
 P(c=>c.promoted,1,5,["승격!!! {c} 1부로 간다!! {n} 고마워요","2부 지옥 탈출! 올 한 해 고생했어요 모두"]),
 /* 부진·부상 */
 P(c=>c.rating>0&&c.rating<6.2&&c.apps>=10,-1,4,["{n} 요즘 폼 왜 이래… 평점 {rt}","솔직히 올해 {n} 아쉬웠다. 내년엔 다를 거라 믿는다","중요한 순간마다 실수가… 팬으로서 속상하다"]),
 P(c=>c.apps<8&&!c.injury&&c.stage==="pro",-1,3,["{n}은 올 시즌 뭐 했나요? 출전 기록이 거의 없다","벤치만 지키는 {n}… 이적설 나오겠네"]),
 P(c=>c.injury&&c.severe,0,5,["{n} 큰 부상이라니… 제발 건강하게 돌아와요 🙏","재활 잘 하고 돌아와. 우리는 기다릴게!","부상 소식에 가슴이 철렁했다. 빨리 낫길"]),
 P(c=>c.injury&&!c.severe,0,2,["잔부상이 많네 ㅠ 관리 잘하세요 {n}!"]),
 /* 더비 */
 P(c=>c.derbyW>0&&c.derbyL===0,1,6,["{d} 이겼다!!! {rv}한테 졌다는 소리 안 듣고 산다 😎","{rv}전 승리 기념으로 오늘 치킨은 {c} 팬이 쏩니다","{d}는 우리의 것! {n} 오늘 영웅"]),
 P(c=>c.derbyL>0&&c.derbyW===0,-1,6,["{d} 졌다… 일주일 동안 {rv} 팬들한테 놀림받겠네","{rv}한테 지다니 자존심이 상한다 ㅠ","{d} 패배… {n} 선수 잘못은 아닌데 마음이 무겁다"]),
 P(c=>c.derbyW>0&&c.derbyL>0,0,4,["{d} 1승 1패. 올해 {rv}와는 엎치락뒤치락이네요","더비 결과가 이렇게 극과 극이라니 심장에 안 좋다"]),
 P(c=>c.derbyG>0,1,5,["{n} {d}에서 골!! 서포터즈 난리 났다 🔥","더비에서 골 넣는 {n}, 이래서 응원한다"]),
 P(c=>c.derbyD>0&&c.derbyW===0&&c.derbyL===0,0,3,["{d} 무승부… 이겼어야 하는데 ㅠ","{rv}와 비겨서 아쉽지만 지지 않은 게 어디야"]),
 /* 이적·리그 */
 P(c=>c.newClub,0,5,["{n} {c} 입단 소식! 새 유니폼 입은 모습 기대된다","이적 소식에 팬들 반응 반반… {n} 믿고 가 봅시다","{c} 팬들 {n} 환영합니다! 잘 부탁해요"]),
 P(c=>c.rivalMove,-1,6,["{n}이 {rv}행이라니… 배신감에 밤새 잠을 못 잤다","팬을 이렇게 떠나가네요. 잊지 않겠습니다"]),
 P(c=>c.foreign&&c.stage==="pro",1,2,["해외에서 뛰는 {n} 경기 챙겨 보느라 새벽에 일어난다","한국 선수가 이 무대에서 이름을 알리는 게 뿌듯하다"]),
 P(c=>c.natTitle,1,4,["{nat} 활약 보고 소름… 국대 {n} 최고","국가대표 {n} 오늘도 믿음직했다 🇰🇷"]),
 P(c=>c.natOut,0,3,["{nat} 아쉽다… 그래도 열심히 뛴 선수들 박수 보냅니다","{n} 고생했어요. 다음 대회에서 다시 만나요"]),
 /* 유소년 */
 P(c=>c.stage!=="pro",1,5,["{n} 이번 시즌도 열심히 했네! 부모님도 흐뭇하시겠다","동네에서 {n} 모르는 사람 없음 ㅋㅋ 곧 프로 가겠다","학교 축구부 에이스 {n}, 응원합니다!"]),
 P(c=>c.stage!=="pro"&&c.rating<6.3,0,3,["{n}은 아직 크는 중. 조급해하지 말고 천천히 가자","이번 시즌은 아쉬웠지만 성장통일 거예요"]),
 /* 인성 */
 P(c=>c.char<=30,-1,5,["{n} 인성 논란 또… 실력만 믿고 저러면 안 되죠","팬 서비스가 이게 뭐냐 진짜 실망이다","축구만 잘하면 다인가요? 태도가 문제라고 봅니다"]),
 P(c=>c.char>=75,1,4,["{n} 인성까지 갖춘 선수. 이런 선수가 오래 사랑받는다","후배 챙기는 모습 보고 팬이 됐어요","기부 소식 보고 감동… 축구 실력도 인성도 최고"]),
 P(c=>c.fameHi,1,2,["{n} 광고에서 보고 반가웠다 ㅋㅋ 이제 연예인 수준","어디를 가도 {n} 얘기. 월드스타 맞네"]),
 /* 공통 중립 */
 P(c=>true,0,3,["올 시즌도 수고했어요 {n}! 내년에도 응원합니다","{n} 시즌 기록 정리해 봤는데 꽤 괜찮은 한 해였다","{c} 팬이라서 행복한 시즌이었다고 해 두자","{n} 경기 하이라이트 돌려 보는 중… 이게 낙이다"])
];
/* 출처별 계정 이름 (모두 가상) */
const SRCNAME={"학부모 커뮤니티":["축구맘_일기","주말_카풀_아빠","유소년_학부모","운동장_옆_벤치"],"유소년 지도자":["유소년_코치","클럽_감독","학교_체육교사"],"지역 기사":["지역_스포츠_뉴스","동네_신문","교육청_체육소식"],"학교 친구":["같은반_친구","축구부_동기","교실_맨뒷자리"],"커뮤니티":["익명_축덕","닉네임_없음","직관_300회","국대_골수팬","리그_스카우터"],"기사 댓글":["기사댓글_1등","베스트_댓글러","퇴근길_댓글","키보드_감독"],"외신 반응":["Global Football Daily(가상)","The Pitch Report(가상)","Euro Eleven(가상)","Asia Ball Weekly(가상)"],"중계":["중계석_캐스터","해설위원_한마디","경기장_현장","라디오_스포츠"],"인터뷰":["감독_코멘트","동료_코멘트","구단_공식","주장_인터뷰"],"상대팬":["상대팀_서포터","라이벌_팬","원정팬_목소리"]};
/* ===== 더 많은 반응 문구 (전부 새로 쓴 가상의 글) ===== */
[
 /* 커뮤니티 — 가볍고 직설적인 말투 */
 P(c=>c.hot,1,3,["{n} 이번 시즌 폼 ㄹㅇ 미쳤다. 상대 수비 입장에서는 공포 그 자체","솔직히 요즘 리그에서 제일 보기 재밌는 선수 {n}임","{n} 안 쓰는 팀이 바보 아님?"],"커뮤니티"),
 P(c=>c.derbyG>0,1,4,["{d} 골 장면 슬로우로 다시 봤는데 위치 선정이 소름. 이건 가르친다고 되는 게 아님","{rv} 팬 지인한테 연락 왔는데 말없이 이모티콘만 보냄 ㅋㅋㅋ"],"커뮤니티"),
 P(c=>c.rating>0&&c.rating<6.3&&c.apps>=10,-1,3,["이번 시즌 {n} 평점 {rt}… 연봉값은 해야지","폼 떨어진 거 {n}도 알 거임. 근데 이 정도면 로테이션 고민해야 함","기대가 컸던 만큼 실망도 크다…"],"커뮤니티"),
 P(c=>c.leagueTitle,1,4,["우승 순간 직관 갔는데 옆자리 아저씨가 처음 보는 사람이랑 껴안고 울었다","오늘만큼은 라이벌 팬들도 인정할 수밖에 없는 우승 ㅇㅇ"],"커뮤니티"),
 P(c=>c.relegated,-1,4,["이 상황이면 내년 감독부터 바꿔야 함. 선수들 탓만 하기엔 구조가 문제","강등 확정이라니… 그래도 유스 출신들은 남아 줬으면"],"커뮤니티"),
 P(c=>c.foreign,1,3,["해외 중계로 보는데 한국 선수 이름 나올 때마다 괜히 볼륨 올림","{n} 해외에서 인정받는 거 보면 자부심 생긴다"],"커뮤니티"),
 P(c=>c.char<=30,-1,4,["실력은 인정하는데 경기 밖 태도는 좀 아쉬움","팬 서비스 논란이 한두 번이 아니라서 응원하기 애매해졌다"],"커뮤니티"),
 P(c=>c.char>=75,1,3,["후배들한테 존경받는 선수라는 얘기 많이 들림. 응원할 맛 난다","경기 끝나고 어린 팬 챙기는 영상 봤는데 팬 됐다"],"커뮤니티"),
 /* 기사 댓글 */
 P(c=>c.goldenBoot,1,3,["득점왕 {g}골이면 몸값 폭등각. 구단은 빨리 재계약 서두르세요","{g}골은 우연으로 못 넣는 숫자임 ㅇㅇ"],"기사 댓글"),
 P(c=>c.pos==="GK"&&c.cs>=12,1,4,["무실점 {cs}경기면 팀 승점의 절반은 골키퍼가 벌어준 거지","골키퍼 한 명이 팀 분위기를 이렇게 바꿀 수 있구나"],"기사 댓글"),
 P(c=>c.pos==="DF"&&c.cs>=12,1,3,["수비 안정감 보면 {n}이 빠진 경기는 불안해서 못 봄","{cs}번 무실점… 라인 컨트롤이 확실히 다르다"],"기사 댓글"),
 P(c=>c.assists>=10&&c.pos==="MF",1,3,["{a}도움… 이 정도면 공격 패스는 {n}이 설계한 거나 마찬가지","중원 장악력이 다르다. 올해 도움왕 후보로도 손색없음"],"기사 댓글"),
 P(c=>c.newClub,0,4,["이적료 얘기 나오는데 {n} 보고 사는 거면 납득함","솔직히 기대 반 걱정 반. 적응 기간만 잘 넘기면 될 듯","{c} 선택 의외인데 의외로 어울릴지도"],"기사 댓글"),
 P(c=>c.injury&&c.severe,0,4,["관리 못 한 구단 책임도 있음. 선수 보호가 우선이다","시즌 아웃이라니 안타깝다. 복귀하면 꼭 박수 쳐 주자"],"기사 댓글"),
 P(c=>c.rank<=3&&c.stage==="pro"&&!c.leagueTitle,1,2,["상위권 마무리 훌륭. 내년에 한 단계만 더 올라가면 우승권","{c} 시즌 평가: 기대 이상"],"기사 댓글"),
 /* 외신 반응(한국어로 옮긴 가상의 글) */
 P(c=>c.ballonWin||c.fameHi,1,3,["해외 팬: '어디서 이런 선수가 나왔나' — {n}, 전 세계 축구팬의 화제","유럽 매체들은 {n}의 시즌을 '올해의 발견'이라 평가했다"],"외신 반응"),
 P(c=>c.uclTitle,1,5,["유럽 전역 헤드라인은 하나였다. '{c}, 유럽 정상에 오르다'","해외 전문가들은 {n}의 결승 퍼포먼스를 '시즌 최고의 장면'으로 꼽았다"],"외신 반응"),
 P(c=>c.goldenBoot&&c.foreign,1,3,["현지 언론이 {n}에게 붙인 별명이 화제다. 팬들이 따라 쓰는 중","상대 팀 감독도 '{n}은 막기 어렵다'고 인정했다"],"외신 반응"),
 P(c=>c.wcTitle,1,4,["월드컵 우승 이후 각국 언론이 {n}을 집중 조명했다","'동아시아의 영웅' 해외 팬들이 {n}에 붙인 새 별명"],"외신 반응"),
 /* 중계 */
 P(c=>c.hot,1,3,["해설: '오늘 {n} 움직임이 한 박자 빨랐습니다. 수비수가 따라가기 어렵죠'","캐스터: '{n}, 또 한 번 경기의 중심에 섭니다!'"],"중계"),
 P(c=>c.derbyW>0,1,4,["캐스터: '{d}, 승리의 환호가 경기장을 가득 채웁니다!'","해설: '이런 경기는 기술보다 간절함이 이깁니다. 오늘은 {c}가 더 간절했어요'"],"중계"),
 P(c=>c.derbyL>0,-1,3,["해설: '{rv}가 조금 더 영리했습니다. {c}는 후반에 흐름을 놓쳤어요'","캐스터: '아쉬운 {d}… 승부는 이렇게 갈렸습니다'"],"중계"),
 P(c=>c.pos==="GK"&&c.cs>=10,1,3,["해설: '골키퍼의 위치 선정이 정말 좋아요. 미리 알고 있었던 것 같아요'","캐스터: '막아냅니다! {n}, 오늘도 철벽!'"],"중계"),
 /* 감독·동료 인터뷰 */
 P(c=>c.hot||c.goldenBoot||c.mvp,1,4,["감독: '{n}은 이 팀의 기준입니다. 훈련부터 다르게 해요'","동료: '{n}이 뛰는 경기는 마음이 편해요. 믿고 줍니다'","구단 관계자: '{n}과의 재계약은 최우선 과제입니다'"],"인터뷰"),
 P(c=>c.leagueTitle,1,4,["주장: '이 우승은 {n}을 포함한 모든 선수의 것입니다'","감독: '시즌 내내 흔들리지 않은 건 선수들이 서로를 믿었기 때문입니다'"],"인터뷰"),
 P(c=>c.injury,0,3,["감독: '{n}은 서두르지 않고 완벽히 회복한 뒤 돌려보낼 겁니다'","동료: '{n} 형 빨리 와요. 라커룸이 허전해요'"],"인터뷰"),
 P(c=>c.newClub,0,3,["감독: '{n}은 우리가 찾던 퍼즐 조각입니다'","구단: '{n}과 함께 다음 단계로 나아가겠습니다'"],"인터뷰"),
 /* 상대 팬 */
 P(c=>c.hot||c.goldenBoot,-1,3,["{n} 오늘도 우리 수비 다 털어 갔다… 제발 다른 리그 가라","{n}한테 또 당했다. 올해만 몇 번째냐 진짜","상대팀 팬인데 인정할 건 인정함. {n} 잘한다 ㅠㅠ"],"상대팬"),
 P(c=>c.derbyW>0,-1,4,["{d} 졌다… 이번 주 출근길이 두렵다","{c} 팬들 오늘 신나겠네. 다음엔 우리가 이긴다"],"상대팬"),
 P(c=>c.derbyL>0,1,3,["{c}한테 이겨서 오늘 소원 없다 ㅎㅎ","{d} 승리! 이 맛에 축구 본다"],"상대팬"),
 /* 포지션 특화 */
 P(c=>c.pos==="FW"&&c.goals>=10,1,3,["{g}골 {a}도움이면 공격수로서 제 몫은 충분히 했다","박스 안에서 침착함이 다르다. 결정력 하나는 리그 최상위"],"SNS"),
 P(c=>c.pos==="MF"&&c.rt>=7,1,3,["중원에서 공 배급하는 거 보면 경기를 읽는 눈이 다르다","패스 하나로 분위기를 바꾸는 선수. 이게 진짜 미드필더"],"SNS"),
 P(c=>c.pos==="DF"&&c.rt>=7,1,3,["수비수가 이렇게 멋있을 수 있다니. 타이밍 좋은 태클 한 번에 경기장 환호","뒷공간을 지키는 위치 선정이 예술이다"],"SNS"),
 P(c=>c.pos==="GK"&&c.rt>=7,1,3,["선방 장면 모음 만들어 봤는데 하나하나 영화 같음","골키퍼가 최고의 공격수다 (오늘만큼은)"],"SNS"),
 /* 생활·경력 */
 P(c=>c.fameHi&&c.char>=60,1,3,["광고에서 보는 얼굴인데 경기도 잘하고 인성도 좋고… 사기 캐릭터 아니냐","연예인 부럽지 않은 인기인데 겸손하다는 게 포인트"],"SNS"),
 P(c=>c.age>=33,0,3,["벌써 {age}세인데 아직도 이 폼이라니. 관리가 대단하다","나이는 숫자일 뿐인가… {n}의 노익장에 박수","은퇴 이야기 나올 때마다 괜히 마음이 무겁다"],"SNS"),
 P(c=>c.age<=21&&c.stage==="pro",1,3,["{age}세에 이 정도면 앞으로 어디까지 갈지 상상이 안 된다","어린 선수가 겁 없이 뛰는 모습이 인상적. 앞날이 기대된다"],"SNS")
].forEach(p=>POOL.push(p));
const HEAD=[
 [c=>c.ballonWin,["{n}, 올해의 발롱도르! 세계 최고의 이름이 되다","'세계 최고' {n}, 발롱도르 품에 안았다"]],
 [c=>c.wcTitle,["{n}의 월드컵 — 온 나라가 환호했다","월드컵 정상 오른 {n}, 우승 주역"]],
 [c=>c.uclTitle,["{c}, 유럽 정상 등극! 중심에 {n}","{n}과 {c}의 챔피언스리그 우승 동화"]],
 [c=>c.leagueTitle,["{c} 리그 우승! 에이스 {n}","'우승 청부사' {n}, {c}에 트로피를 안겼다"]],
 [c=>c.goldenBoot,["{n} {g}골, 올 시즌 득점왕","득점왕 {n}, 발끝이 리그를 지배했다"]],
 [c=>c.derbyW>0&&c.derbyG>0,["{d}의 주인공은 {n} — 결승골로 라이벌 제압","{n}의 {d}, 서포터즈가 열광했다"]],
 [c=>c.derbyW>0,["{d} 승리! {c}가 {rv}를 눌렀다","{rv}전 승리로 자존심 지킨 {c}"]],
 [c=>c.relegated,["{c} 강등의 아픔… {n}의 내일은?","강등된 {c}, 에이스 {n}의 선택은"]],
 [c=>c.promoted,["승격 성공! {c}, 1부 무대로","{n}이 이끈 {c}의 승격 드라마"]],
 [c=>c.injury&&c.severe,["{n}, 큰 부상으로 시즌 마감… 재활 돌입","'부상 악재' {n}, 복귀 시점은?"]],
 [c=>c.grow>=4,["{n}, 한 시즌 만에 OVR +{grow} 급성장","'급성장' {n}, 다음 시즌이 더 기대된다"]],
 [c=>c.rating>0&&c.rating<6.2&&c.apps>=10,["{n}, 부진의 늪… 반등 필요","흔들린 {n}, 팬들의 시선이 쏠린다"]],
 [c=>c.newClub,["{n}, {c} 새 유니폼 입고 새 출발","{c}의 선택은 {n} — 기대와 우려 교차"]],
 [c=>c.stage!=="pro",["유망주 {n}, 올 시즌 성장 리포트","{n}의 시즌 — 어디까지 클 수 있을까"]],
 [c=>true,["{n}, {c}에서 {rank}위로 시즌 마무리","{n}의 한 시즌 — {c} {rank}위의 기록"]]
];
/* 유스·대학 시절 반응: 눈에 띄는 활약이 있을 때만, 나이에 맞는 말투로(프로식 평가·이적설은 프로 데뷔 후) */
const YB={
 mid:{band:"중학생",heads:["'{n}' 또래 압도하는 신동 등장… 지역 축구계가 들썩","중학생 {n}, 형들 사이에서도 눈에 띄는 재능"],
  posts:[["학부모 커뮤니티","{n} 경기 봤는데 중학생 맞아요? 볼 다루는 게 달라요",1],["유소년 지도자","{n}은 가르치는 맛이 나는 아이예요. 기본기를 놓치지 않고 있어요",1],["지역 기사","동네 축구교실 출신 {n}, 전국 대회에서 이름을 알렸다",1],["학부모 커뮤니티","우리 애도 {n}처럼 해 보겠다고 공만 찬다… 좋은 자극이네요",1],["유소년 지도자","아직 어리니까 칭찬보다 습관이 중요해요. 천천히 크자 {n}!",0]]},
 high:{band:"고교·유스",heads:["고교 무대 흔드는 {n}, 프로 스카우트가 지켜본다","'대박 유망주' {n}, 벌써부터 이름이 오르내린다"],
  posts:[["커뮤니티","{n} 고등학교 경기 영상 봤음. 이 나이에 저 판단력이면 프로 가서도 통하겠다",1],["지역 기사","{n}, 주말리그 득점 선두… 스카우트들이 경기장에 모였다",1],["유소년 지도자","재능은 확실한데 아직 체력이 더 붙어야 해요. 욕심내지 말고 차근차근",0],["커뮤니티","프로 구단들 영입전 벌어진다던데 어디로 갈까 {n}",1],["학교 친구","우리 학교 {n} 기사 나왔다ㅋㅋ 사인 미리 받아 놔야 함",1]]},
 univ:{band:"대학",heads:["대학 리그의 샛별 {n}, 프로행 시선 집중","{n}, 대학 무대를 평정하다 — 드래프트 상위 후보로"],
  posts:[["커뮤니티","{n} 대학 리그 경기 영상 돌더라. 프로에 바로 써도 될 듯",1],["지역 기사","대학 리그 {n}, 프로 스카우트 앞에서 인상적인 활약",1],["유소년 지도자","대학에서 단단해졌어요. 이제 프로에서 시험받을 시간이에요",1],["학교 친구","우리 학교에서 프로 간다고? {n} 형 응원합니다 🙌",1]]},
 bad:{band:"부상",heads:["{n}, 큰 부상… 아직 어린 만큼 회복에 집중","유망주 {n} 부상 소식, 지도자들 '서두르지 않겠다'"],
  posts:[["학부모 커뮤니티","{n} 부상이라니 마음이 아프네요. 잘 쉬고 돌아오길","0"],["유소년 지도자","아직 성장기라 무리하면 안 돼요. 재활이 먼저입니다",0],["학교 친구","빨리 나아서 같이 공 차자 {n}!",1]]}
};
function youthReact(S,R){
  const age=R.age||L.age(S), notable=R.rating>=7.1||(R.dOvr||0)>=4||R.goals>=14||(R.trophies||[]).length>0||!!(R.injury&&R.injury.severe)||R.rank===1;
  if(!notable||Math.random()<.2) return null;
  const k=R.injury&&R.injury.severe?"bad":S.stage==="univ"?"univ":age<=15?"mid":"high"; const b=YB[k];
  const c={n:S.p.name}; const used=new Set(); const posts=shuffle(b.posts.slice()).slice(0,ri(2,3)).map(p=>{ const tone=+p[2]; return {h:pick(SRCNAME[p[0]]||HANDLE),src:p[0],t:fill(p[1],c),tone,likes:ri(2,48)}; });
  const cha=(R.awards||[]).find(x=>/차범근/.test(x)); if(cha) b.posts.unshift(["지역 기사","{n}, "+cha+" 수상… 한국 축구의 미래라는 평가",1]);
  return {headline:cha?fill("축구 천재 {n}, "+cha+" 수상",c):fill(pick(b.heads),c),posts:posts.sort((a,b)=>b.tone-a.tone)};
}
L.reactions=function(S,R){
  if(S.stage!=="pro"||R.youth) return youthReact(S,R);
  const club=(R.club&&(R.club.short||R.club.name))||(S.club&&S.club.name)||"우리 팀"; const pro=!R.youth&&S.stage==="pro";
  const prev=[...S.history].reverse().filter(h=>!h.youth&&h.year!==R.year)[0];
  const D=R.derbies||[]; const dW=D.filter(d=>d.res==="W").length, dL=D.filter(d=>d.res==="L").length, dD=D.filter(d=>d.res==="D").length, dG=D.reduce((s,d)=>s+(d.g||0),0);
  const nat=(R.natEvents||[]).filter(e=>!e.skipped&&!e.declined); const natT=nat.find(e=>e.title), natO=nat.find(e=>!e.title);
  const trophies=R.trophies||[]; const awards=R.awards||[];
  const c={n:S.p.name,c:club,rank:R.rank||0,N:R.N||20,rt:R.rating||0,rating:R.rating||0,apps:R.apps||0,goals:R.goals||0,g:R.goals||0,a:R.assists||0,assists:R.assists||0,cs:R.cs||0,pos:S.p.pos,stage:S.stage,
    leagueTitle:R.rank===1&&!R.matches_none,
    cupTitle:trophies.some(t=>/컵|포칼|코파|쿠프|일왕배|킹스컵/.test(t)&&/우승/.test(t)), cup:(trophies.find(t=>/컵|포칼|코파|쿠프|일왕배|킹스컵/.test(t))||"컵대회").replace(/ 우승/,""),
    uclTitle:trophies.some(t=>/챔피언스리그 우승/.test(t)), wcTitle:natT&&/월드컵/.test(natT.name),
    ballonWin:awards.includes("발롱도르"), goldenBoot:awards.some(a=>/득점왕|골든부트/.test(a)&&!/공동/.test(a)), mvp:awards.some(a=>/MVP|올해의 선수/.test(a)), bestXI:awards.some(a=>/베스트 11|올해의 팀/.test(a)),
    hot:R.rating>=7.4, grow:R.dOvr||0, injury:!!R.injury, severe:!!(R.injury&&R.injury.severe), topHalf:R.rank&&R.rank<=R.N/2,
    relegated:false, promoted:false,
    derbyW:dW,derbyL:dL,derbyD:dD,derbyG:dG,d:D[0]?D[0].name:"",rv:D[0]?D[0].opp:"",
    newClub:!!(prev&&prev.clubId&&prev.clubId!==(R.club&&R.club.id)), rivalMove:false, foreign:!!(S.club&&L.isForeign(S.club.lg)),
    natTitle:!!natT, natOut:!!natO&&!natT, nat:(natT||natO||{}).short||"대표팀",
    char:L.charOf?L.charOf(S):50, fameHi:S.fame>=100, age:L.age(S)};
  /* 다음 시즌 준비 때 판정하는 강등·승격은 결과 직후에는 알 수 없어서 순위로 짐작해요 */
  if(!c.relegated&&pro&&R.rank&&R.N&&R.rank>R.N-3&&["K1","EPL","LAL","BUN","SEA","L1","J1","SPL"].includes(R.leagueKey)) c.relegated=true;
  if(!c.promoted&&pro&&R.rank&&R.rank<=2&&["K2","EPL2","LAL2","BUN2","SEA2","FR2","J2","SPL2"].includes(R.leagueKey)) c.promoted=true;
  /* 문구 뽑기: 맞는 후보 중 가중치로, 같은 계열(어조)이 몰리지 않게 */
  const cand=POOL.filter(p=>p.cond(c)); const posts=[]; const used=new Set(); let guard=0;
  const want=ri(4,6); const sorted=shuffle(cand).sort((a,b)=>(b.w*Math.random())-(a.w*Math.random()));
  for(const p of sorted){ if(posts.length>=want||guard++>40) break; const t=pick(p.texts); if(used.has(t)) continue; used.add(t); posts.push({h:p.src&&SRCNAME[p.src]?pick(SRCNAME[p.src]):pick(HANDLE),src:p.src||"SNS",t:fill(t,c),tone:p.tone,likes:likes(S,p.tone)}); }
  /* 좋은 글만/나쁜 글만 나오면 한 줄 중립 글을 섞어요 */
  const headC=HEAD.find(h=>h[0](c)); const headline=fill(pick(headC[1]),c);
  const ord=posts.sort((a,b)=>b.tone-a.tone);
  return {headline,posts:ord};
};
/* ===== 구간마다 나오는 '경기 직후 SNS' ===== */
const SEG=[
 [x=>x.hat,1,3,["해트트릭!!! {n} 오늘 미쳤다 ㅋㅋㅋㅋ 공은 둥글고 {n}은 위대하다","{n} 해트트릭 실화냐… 하이라이트 계속 돌려 보는 중","오늘 경기 MOM 이견 없음. 해트트릭 {n} 🔥"]],
 [x=>x.goalDerby,1,3,["{d}에서 {n} 골!!! 서포터즈석 폭발했다","{rv}전 골 넣은 {n} 형 오늘 치킨 쏴라 ㅋㅋ","{d} 득점 {n}… 이건 평생 회자될 장면"]],
 [x=>x.derbyW&&!x.goalDerby,1,3,["{d} 승리!! 퇴근길 발걸음이 가볍다","{rv} 팬들 오늘 조용하겠네 ㅎㅎ {c} 승리"]],
 [x=>x.derbyL,-1,3,["{d} 졌다… 월요일이 두렵다","{rv}한테 지는 건 정말 못 참겠다 ㅠㅠ","{d} 패배 후유증 오래 갈 듯"]],
 [x=>x.derbyD,0,2,["{d} 무승부… 반반 섞인 감정","{rv}전 비겼다. 이긴 것 같기도 진 것 같기도"]],
 [x=>x.mom,1,2,["오늘 {n} 평점 {rt}… 경기 지배했다","{n} 오늘 컨디션 최고. 공 잡을 때마다 기대된다"]],
 [x=>x.streakW,1,2,["{c} {w}연승 ㅋㅋㅋ 이 기세 유지하자","연승 분위기 좋다! 이번 구간 {n}이 중심에 있었다"]],
 [x=>x.streakL,-1,3,["{c} 어쩌다 이렇게… 연패라니","팬들 마음이 무겁다. 반등이 필요해요","{n}도 힘들겠지만 팬들도 힘들다 ㅠ"]],
 [x=>x.inj,0,3,["{n} 부상이라니… 괜찮은 거 맞죠? 🙏","구단 공식 발표 기다리는 중. 큰 부상 아니길","{n} 쾌유를 빕니다. 천천히 돌아와요"]],
 [x=>x.bench&&!x.inj,-1,2,["{n} 이번 구간엔 거의 못 봤다… 감독님 왜 안 쓰시나요","{n} 출전 시간이 너무 적다 ㅠ"]],
 [x=>x.cleanSheets,1,2,["무실점 {cs}경기 😎 뒷문이 단단하다","{n} 뒤에서 막아 주니까 든든하다"]]
];
L.segReactions=function(S,out){
  if(S.stage!=="pro") return null;
  if(!out||!out.recs) return null; const recs=out.recs.filter(r=>r.min>0); const D=out.recs.filter(r=>r.derby); const club=S.club&&(S.club.short||S.club.name)||"우리 팀";
  const lg=out.recs.filter(r=>r.comp==="리그"); const W=lg.filter(r=>r.res==="W").length, Lo=lg.filter(r=>r.res==="L").length;
  const x={n:S.p.name,c:club,hat:recs.some(r=>r.g>=3),goalDerby:D.some(r=>r.g>0),derbyW:D.some(r=>r.res==="W"),derbyL:D.some(r=>r.res==="L"),derbyD:D.some(r=>r.res==="D")&&!D.some(r=>r.res!=="D"),
    d:D[0]?D[0].derby:"",rv:D[0]?(S.sim&&S.sim.rival?S.sim.rival.rivalName:"라이벌"):"",mom:recs.some(r=>r.rt>=9),rt:Math.max(0,...recs.map(r=>r.rt||0)),streakW:W>=4&&Lo===0,w:W,streakL:Lo>=3&&W===0,inj:!!out.inj,bench:recs.length===0&&lg.length>=3,cs:recs.filter(r=>r.cs).length,cleanSheets:recs.filter(r=>r.cs).length>=3};
  const cand=SEG.filter(s=>s[0](x)); if(!cand.length||Math.random()>.7) return null;
  const sorted=shuffle(cand).sort((a,b)=>(b[2]*Math.random())-(a[2]*Math.random())); const posts=[]; const used=new Set();
  sorted.slice(0,3).forEach(s=>{ const t=pick(s[3]); if(used.has(t)) return; used.add(t); posts.push({h:pick(HANDLE),t:fill(t,x),tone:s[1],likes:likes(S,s[1])}); });
  return posts.length?{posts:posts.slice(0,3)}:null;
};
/* ===== 이번 구간 빅매치 미리보기 (기대감을 올려요) ===== */
L.upcoming=function(S){
  const sim=S.sim; if(!sim||sim.seg>=sim.segs.length) return []; const seg=sim.segs[sim.seg], end=sim.segEnd[sim.seg]; const out=[];
  if(sim.rival){ const rv=sim.rival; const hits=[]; for(let i=sim.r;i<end;i++){ const rd=sim.rounds[i]; if(!rd) continue; rd.forEach(([h,a])=>{ if((h===sim.myId&&a===rv.id)||(a===sim.myId&&h===rv.id)) hits.push({r:i+1,home:h===sim.myId}); }); }
    hits.forEach(h=>out.push({ic:"🔥",t:rv.name+" · "+rv.rivalName+"전 ("+h.r+"라운드, "+(h.home?"홈":"원정")+")",d:pick(["도시가 들썩이는 경기예요.","지면 한 달이 괴로워지는 경기예요.","서포터즈가 일찌감치 모여들고 있어요.","이 경기만큼은 꼭 이기고 싶어요."])})); }
  (sim.cups||[]).forEach(c=>{ if(!c.alive) return; const rd=c.rounds[c.round]; if(!rd||rd.at!==seg.id) return; const big=/결승|4강|8강|16강/.test(rd.n); out.push({ic:c.id==="ucl"?"⭐":c.id==="acl"?"🌏":c.id==="uel"?"🟠":"🏆",t:c.name+" "+rd.n,d:big?"한 번 지면 끝이에요. 긴장감이 올라가요.":"이번에도 한 걸음 더 나아가요."}); });
  (sim.callups||[]).filter(c=>c.after===seg.id&&!c.done).forEach(c=>out.push({ic:"🇰🇷",t:c.name+" 대표팀 소집 ("+(c.host||"")+")",d:"명단에 이름이 올랐어요. 소집 여부를 곧 선택해요."}));
  return out;
};
})();
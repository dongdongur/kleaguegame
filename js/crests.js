/*
 * 팀 엠블럼과 선수 얼굴 사진
 * ------------------------------------------------------------
 * 이미지 파일을 이 저장소에 두지 않고, 화면에서 K리그 공식 사이트(kleague.com)의 이미지 주소를 그대로 불러다 보여줘요.
 * 파일을 내려받아 저장하거나 우리 사이트에 올리지 않아요. 사이트 주소가 바뀌거나 막히면 자동으로 이니셜 배지/실루엣으로 바뀌어요.
 *   - 끄고 싶으면 아래 KL_CRESTS_ON / KL_FACES_ON 을 false 로 바꾸세요.
 *   - 비공식 팬 게임이라 구단·선수 이미지의 권리는 각 권리자에게 있어요. 공개 범위를 넓힐 때는 사용 허락을 확인하세요.
 */
window.KL_CRESTS_ON = true;
window.KL_FACES_ON = true;
window.KL_EMBLEM_URL = code => "https://www.kleague.com/assets/images/emblem/emblem_"+code+".png";
window.KL_FACE_URL = id => "https://d2tfp74nsbbrkr.cloudfront.net/v1/player/player_"+id+".jpg";
/* 구단 이름(여러 표기) → kleague.com 팀 코드. 현역 구단은 js/data_squads26.js 의 코드를 쓰고, 옛 이름은 아래에서 이어 줘요 */
window.KL_CLUB_CODE = Object.assign({},
  Object.fromEntries(Object.entries(window.KL_SQUADS26||{}).map(([n,c])=>[n,c.code])),
  {"울산 현대":"K01","수원 삼성":"K02","포항 아톰즈·스틸러스":"K03","포항":"K03","제주 유나이티드":"K04","제주":"K04","전북":"K05","부산 대우·아이파크":"K06","부산":"K06",
   "성남 일화":"K08","성남":"K08","안양 LG":"K09","서울":"K09","대전":"K10","대구":"K17","인천":"K18","경남":"K20","강원":"K21","광주":"K22","부천":"K26","안양":"K27","수원":"K02","울산":"K01"});

/*
 * 팀 엠블럼 이미지 연결
 * ------------------------------------------------------------
 * 구단 엠블럼은 각 구단의 상표라서 이 프로젝트에는 이미지를 넣어 두지 않았어요.
 * 직접 가지고 있는 이미지 파일을 img/crests/ 폴더에 아래 파일명으로 넣고,
 * 맨 아래 KL_CRESTS_ON 을 true 로 바꾸면 순위표·경기 목록·상대팀 패널에 엠블럼이 나와요.
 *   - 파일이 없는 팀은 자동으로 이니셜 배지로 표시돼요.
 *   - 정사각형에 가까운 PNG/SVG/WebP를 권장해요 (배경 투명이 가장 예뻐요).
 *   - 공개 배포할 때는 구단/연맹의 상표 사용 허락 여부를 먼저 확인하세요.
 * 구단 이름(왼쪽)은 데이터에 쓰인 이름 그대로예요. 새 팀을 추가했다면 한 줄 더 적으면 돼요.
 */
window.KL_CRESTS = {
  /* K리그1 · K리그2 (2026) */
  "전북 현대":"jeonbuk.png","울산 HD":"ulsan.png","FC 서울":"seoul.png","포항 스틸러스":"pohang.png","강원 FC":"gangwon.png",
  "대전 하나 시티즌":"daejeon.png","제주 SK":"jeju.png","FC 안양":"anyang.png","인천 유나이티드":"incheon.png","광주 FC":"gwangju.png",
  "부천 FC 1995":"bucheon.png","수원 삼성":"suwon.png","수원FC":"suwonfc.png","서울 이랜드":"eland.png","대구 FC":"daegu.png",
  "화성 FC":"hwaseong.png","부산 아이파크":"busan.png","성남 FC":"seongnam.png","전남 드래곤즈":"jeonnam.png","경남 FC":"gyeongnam.png",
  "충남 아산":"asan.png","안산 그리너스":"ansan.png","김포 FC":"gimpo.png","천안 시티":"cheonan.png","충북청주":"cheongju.png",
  "파주 프런티어":"paju.png","용인 FC":"yongin.png","김해 FC 2008":"gimhae.png",
  /* 레전드 드래프트에 나오는 구단 이름 (현재 구단 엠블럼을 같이 써요) */
  "울산 현대":"ulsan.png","수원 삼성":"suwon.png","포항 아톰즈·스틸러스":"pohang.png","포항 스틸러스":"pohang.png","부산 대우·아이파크":"busan.png",
  "안양 LG":"seoul.png","성남 일화":"seongnam.png","제주 유나이티드":"jeju.png","제주 SK":"jeju.png","대한민국 대표팀":"kfa.png"
};
window.KL_CRESTS_ON = false;

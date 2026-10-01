/*
 * 선수 세부 능력치 (FM 스타일, 1~100)
 * ------------------------------------------------------------
 * 형식은 제미나이도움/선수단예시.txt 와 같아요: 기술 14 · 정신 14 · 신체 8 · 골키퍼 11개 능력치(각 1~100),
 * 현재 능력(current_ability)·잠재 능력(potential_ability), 주/보조 포지션, 특성, 출생일, 국적, 신장·체중, 발, K리그 구단 이력.
 * 여기 있는 선수는 카드의 ⓘ 버튼이나 선수단 표에서 상세 능력치를 볼 수 있어요.
 *
 * ⚠ 아래 10명은 형식을 보여주는 "예시 데이터"예요 (_example:true). 실제 FM 데이터나 K리그 기록으로 검증된 값이 아니에요.
 *   실제 데이터가 준비되면 이 배열을 같은 형식으로 교체하면 돼요.
 */
window.KL_ATTRS = [
 {
  "id": "K01-001",
  "name_ko": "기성용",
  "name_en": "Ki Sung-yueng",
  "birth_date": "1989-01-24",
  "nationality": "South Korea",
  "height_cm": 189,
  "weight_kg": 81,
  "foot_left": "약함",
  "foot_right": "매우 강함",
  "positions": {
   "main": "DM",
   "sub": [
    "MC"
   ]
  },
  "current_ability": 78,
  "potential_ability": 88,
  "attributes": {
   "technical": {
    "first_touch": 84,
    "free_kicks": 86,
    "heading": 62,
    "corners": 79,
    "crossing": 76,
    "dribbling": 71,
    "long_shots": 87,
    "long_throws": 43,
    "passing": 92,
    "penalty_taking": 78,
    "tackling": 64,
    "technique": 89,
    "marking": 58,
    "finishing": 67
   },
   "mental": {
    "aggression": 71,
    "anticipation": 79,
    "bravery": 67,
    "composure": 86,
    "concentration": 78,
    "decisions": 84,
    "determination": 77,
    "flair": 78,
    "leadership": 91,
    "off_the_ball": 68,
    "positioning": 72,
    "teamwork": 83,
    "vision": 93,
    "work_rate": 71
   },
   "physical": {
    "acceleration": 57,
    "agility": 61,
    "balance": 74,
    "jumping_reach": 66,
    "natural_fitness": 72,
    "pace": 56,
    "stamina": 69,
    "strength": 78
   },
   "goalkeeping": {
    "aerial_reach": 10,
    "command_of_area": 10,
    "communication": 10,
    "eccentricity": 10,
    "handling": 10,
    "kicking": 10,
    "one_on_ones": 10,
    "reflexes": 10,
    "rushing_out": 10,
    "punching": 10,
    "throwing": 10
   }
  },
  "traits": [
   "공을 받기 위해 포지션보다 내려옴",
   "장거리 패스 시도",
   "중거리 슛 선호"
  ],
  "kleague_clubs": [
   "FC 서울"
  ],
  "_example": true
 },
 {
  "id": "K01-002",
  "name_ko": "이청용",
  "name_en": "Lee Chung-yong",
  "birth_date": "1988-07-02",
  "nationality": "South Korea",
  "height_cm": 180,
  "weight_kg": 70,
  "foot_left": "보통",
  "foot_right": "매우 강함",
  "positions": {
   "main": "RW",
   "sub": [
    "AM(C)",
    "RM"
   ]
  },
  "current_ability": 76,
  "potential_ability": 86,
  "attributes": {
   "technical": {
    "first_touch": 88,
    "free_kicks": 71,
    "heading": 55,
    "corners": 74,
    "crossing": 82,
    "dribbling": 86,
    "long_shots": 68,
    "long_throws": 38,
    "passing": 84,
    "penalty_taking": 72,
    "tackling": 59,
    "technique": 91,
    "marking": 53,
    "finishing": 69
   },
   "mental": {
    "aggression": 62,
    "anticipation": 83,
    "bravery": 68,
    "composure": 87,
    "concentration": 76,
    "decisions": 82,
    "determination": 76,
    "flair": 89,
    "leadership": 81,
    "off_the_ball": 79,
    "positioning": 66,
    "teamwork": 84,
    "vision": 86,
    "work_rate": 74
   },
   "physical": {
    "acceleration": 68,
    "agility": 77,
    "balance": 75,
    "jumping_reach": 54,
    "natural_fitness": 70,
    "pace": 66,
    "stamina": 71,
    "strength": 61
   },
   "goalkeeping": {
    "aerial_reach": 10,
    "command_of_area": 10,
    "communication": 10,
    "eccentricity": 10,
    "handling": 10,
    "kicking": 10,
    "one_on_ones": 10,
    "reflexes": 10,
    "rushing_out": 10,
    "punching": 10,
    "throwing": 10
   }
  },
  "traits": [
   "측면에서 중앙으로 파고듦",
   "테크닉을 활용한 드라이브"
  ],
  "kleague_clubs": [
   "FC 서울",
   "울산 HD FC"
  ],
  "_example": true
 },
 {
  "id": "K01-003",
  "name_ko": "세징야",
  "name_en": "Cesinha",
  "birth_date": "1989-11-29",
  "nationality": "Brazil",
  "height_cm": 177,
  "weight_kg": 74,
  "foot_left": "강함",
  "foot_right": "매우 강함",
  "positions": {
   "main": "AM(C)",
   "sub": [
    "ST",
    "LW"
   ]
  },
  "current_ability": 82,
  "potential_ability": 85,
  "attributes": {
   "technical": {
    "first_touch": 86,
    "free_kicks": 91,
    "heading": 64,
    "corners": 88,
    "crossing": 83,
    "dribbling": 93,
    "long_shots": 94,
    "long_throws": 41,
    "passing": 86,
    "penalty_taking": 87,
    "tackling": 48,
    "technique": 91,
    "marking": 42,
    "finishing": 84
   },
   "mental": {
    "aggression": 73,
    "anticipation": 82,
    "bravery": 74,
    "composure": 86,
    "concentration": 77,
    "decisions": 81,
    "determination": 88,
    "flair": 93,
    "leadership": 84,
    "off_the_ball": 86,
    "positioning": 58,
    "teamwork": 76,
    "vision": 87,
    "work_rate": 78
   },
   "physical": {
    "acceleration": 81,
    "agility": 84,
    "balance": 82,
    "jumping_reach": 63,
    "natural_fitness": 81,
    "pace": 79,
    "stamina": 80,
    "strength": 76
   },
   "goalkeeping": {
    "aerial_reach": 10,
    "command_of_area": 10,
    "communication": 10,
    "eccentricity": 10,
    "handling": 10,
    "kicking": 10,
    "one_on_ones": 10,
    "reflexes": 10,
    "rushing_out": 10,
    "punching": 10,
    "throwing": 10
   }
  },
  "traits": [
   "중거리 슛 선호",
   "중앙 돌파 선호",
   "프리킥으로 골 노림"
  ],
  "kleague_clubs": [
   "대구 FC"
  ],
  "_example": true
 },
 {
  "id": "K01-004",
  "name_ko": "데얀",
  "name_en": "Dejan Damjanović",
  "birth_date": "1981-07-27",
  "nationality": "Montenegro",
  "height_cm": 187,
  "weight_kg": 81,
  "foot_left": "강함",
  "foot_right": "매우 강함",
  "positions": {
   "main": "ST",
   "sub": []
  },
  "current_ability": 83,
  "potential_ability": 86,
  "attributes": {
   "technical": {
    "first_touch": 87,
    "free_kicks": 68,
    "heading": 82,
    "corners": 52,
    "crossing": 61,
    "dribbling": 78,
    "long_shots": 79,
    "long_throws": 35,
    "passing": 76,
    "penalty_taking": 89,
    "tackling": 39,
    "technique": 85,
    "marking": 35,
    "finishing": 96
   },
   "mental": {
    "aggression": 68,
    "anticipation": 91,
    "bravery": 78,
    "composure": 94,
    "concentration": 83,
    "decisions": 86,
    "determination": 84,
    "flair": 82,
    "leadership": 78,
    "off_the_ball": 92,
    "positioning": 89,
    "teamwork": 74,
    "vision": 77,
    "work_rate": 68
   },
   "physical": {
    "acceleration": 64,
    "agility": 68,
    "balance": 81,
    "jumping_reach": 78,
    "natural_fitness": 76,
    "pace": 63,
    "stamina": 67,
    "strength": 82
   },
   "goalkeeping": {
    "aerial_reach": 10,
    "command_of_area": 10,
    "communication": 10,
    "eccentricity": 10,
    "handling": 10,
    "kicking": 10,
    "one_on_ones": 10,
    "reflexes": 10,
    "rushing_out": 10,
    "punching": 10,
    "throwing": 10
   }
  },
  "traits": [
   "원터치 패스 플레이",
   "골키퍼를 제치고 득점",
   "오프사이드 트랩 파괴"
  ],
  "kleague_clubs": [
   "인천 유나이티드",
   "FC 서울",
   "수원 삼성",
   "대구 FC"
  ],
  "_example": true
 },
 {
  "id": "K01-005",
  "name_ko": "박주영",
  "name_en": "Park Chu-young",
  "birth_date": "1985-07-10",
  "nationality": "South Korea",
  "height_cm": 182,
  "weight_kg": 75,
  "foot_left": "강함",
  "foot_right": "매우 강함",
  "positions": {
   "main": "ST",
   "sub": [
    "AM(C)"
   ]
  },
  "current_ability": 77,
  "potential_ability": 87,
  "attributes": {
   "technical": {
    "first_touch": 88,
    "free_kicks": 84,
    "heading": 86,
    "corners": 72,
    "crossing": 68,
    "dribbling": 81,
    "long_shots": 76,
    "long_throws": 38,
    "passing": 78,
    "penalty_taking": 86,
    "tackling": 42,
    "technique": 89,
    "marking": 38,
    "finishing": 87
   },
   "mental": {
    "aggression": 64,
    "anticipation": 88,
    "bravery": 82,
    "composure": 86,
    "concentration": 74,
    "decisions": 79,
    "determination": 81,
    "flair": 88,
    "leadership": 79,
    "off_the_ball": 89,
    "positioning": 81,
    "teamwork": 82,
    "vision": 81,
    "work_rate": 73
   },
   "physical": {
    "acceleration": 71,
    "agility": 78,
    "balance": 76,
    "jumping_reach": 83,
    "natural_fitness": 71,
    "pace": 69,
    "stamina": 68,
    "strength": 74
   },
   "goalkeeping": {
    "aerial_reach": 10,
    "command_of_area": 10,
    "communication": 10,
    "eccentricity": 10,
    "handling": 10,
    "kicking": 10,
    "one_on_ones": 10,
    "reflexes": 10,
    "rushing_out": 10,
    "punching": 10,
    "throwing": 10
   }
  },
  "traits": [
   "헤더 구석으로 차 넣음",
   "감아차기 슛 선호"
  ],
  "kleague_clubs": [
   "FC 서울",
   "울산 HD FC"
  ],
  "_example": true
 },
 {
  "id": "K01-006",
  "name_ko": "이동국",
  "name_en": "Lee Dong-gook",
  "birth_date": "1979-04-29",
  "nationality": "South Korea",
  "height_cm": 187,
  "weight_kg": 83,
  "foot_left": "보통",
  "foot_right": "매우 강함",
  "positions": {
   "main": "ST",
   "sub": []
  },
  "current_ability": 81,
  "potential_ability": 86,
  "attributes": {
   "technical": {
    "first_touch": 84,
    "free_kicks": 73,
    "heading": 92,
    "corners": 42,
    "crossing": 58,
    "dribbling": 69,
    "long_shots": 83,
    "long_throws": 32,
    "passing": 76,
    "penalty_taking": 91,
    "tackling": 36,
    "technique": 86,
    "marking": 33,
    "finishing": 94
   },
   "mental": {
    "aggression": 69,
    "anticipation": 89,
    "bravery": 84,
    "composure": 92,
    "concentration": 81,
    "decisions": 84,
    "determination": 87,
    "flair": 81,
    "leadership": 86,
    "off_the_ball": 91,
    "positioning": 88,
    "teamwork": 81,
    "vision": 78,
    "work_rate": 66
   },
   "physical": {
    "acceleration": 56,
    "agility": 61,
    "balance": 87,
    "jumping_reach": 88,
    "natural_fitness": 79,
    "pace": 54,
    "stamina": 64,
    "strength": 86
   },
   "goalkeeping": {
    "aerial_reach": 10,
    "command_of_area": 10,
    "communication": 10,
    "eccentricity": 10,
    "handling": 10,
    "kicking": 10,
    "one_on_ones": 10,
    "reflexes": 10,
    "rushing_out": 10,
    "punching": 10,
    "throwing": 10
   }
  },
  "traits": [
   "발리슛 시도",
   "강력한 슛 선호",
   "등지고 딱딱 시도"
  ],
  "kleague_clubs": [
   "포항 스틸러스",
   "성남 일화",
   "전북 현대"
  ],
  "_example": true
 },
 {
  "id": "K01-008",
  "name_ko": "김병지",
  "name_en": "Kim Byung-ji",
  "birth_date": "1970-04-08",
  "nationality": "South Korea",
  "height_cm": 184,
  "weight_kg": 78,
  "foot_left": "보통",
  "foot_right": "매우 강함",
  "positions": {
   "main": "GK",
   "sub": []
  },
  "current_ability": 79,
  "potential_ability": 83,
  "attributes": {
   "technical": {
    "first_touch": 58,
    "free_kicks": 41,
    "heading": 32,
    "corners": 10,
    "crossing": 12,
    "dribbling": 62,
    "long_shots": 25,
    "long_throws": 64,
    "passing": 68,
    "penalty_taking": 71,
    "tackling": 35,
    "technique": 61,
    "marking": 20,
    "finishing": 38
   },
   "mental": {
    "aggression": 88,
    "anticipation": 82,
    "bravery": 94,
    "composure": 76,
    "concentration": 71,
    "decisions": 69,
    "determination": 92,
    "flair": 89,
    "leadership": 86,
    "off_the_ball": 35,
    "positioning": 78,
    "teamwork": 71,
    "vision": 64,
    "work_rate": 78
   },
   "physical": {
    "acceleration": 74,
    "agility": 88,
    "balance": 78,
    "jumping_reach": 84,
    "natural_fitness": 92,
    "pace": 71,
    "stamina": 76,
    "strength": 76
   },
   "goalkeeping": {
    "aerial_reach": 81,
    "command_of_area": 84,
    "communication": 88,
    "eccentricity": 98,
    "handling": 76,
    "kicking": 82,
    "one_on_ones": 87,
    "reflexes": 91,
    "rushing_out": 93,
    "punching": 81,
    "throwing": 78
   }
  },
  "traits": [
   "돌출 행동 자주 함",
   "필드 쪽으로 볼 전개 시도"
  ],
  "kleague_clubs": [
   "울산 현대",
   "포항 스틸러스",
   "FC 서울",
   "경남 FC",
   "전남 드래곤즈"
  ],
  "_example": true
 },
 {
  "id": "K01-013",
  "name_ko": "조현우",
  "name_en": "Jo Hyeon-woo",
  "birth_date": "1991-09-25",
  "nationality": "South Korea",
  "height_cm": 189,
  "weight_kg": 76,
  "foot_left": "보통",
  "foot_right": "매우 강함",
  "positions": {
   "main": "GK",
   "sub": []
  },
  "current_ability": 80,
  "potential_ability": 84,
  "attributes": {
   "technical": {
    "first_touch": 42,
    "free_kicks": 15,
    "heading": 15,
    "corners": 10,
    "crossing": 10,
    "dribbling": 31,
    "long_shots": 10,
    "long_throws": 48,
    "passing": 56,
    "penalty_taking": 22,
    "tackling": 20,
    "technique": 46,
    "marking": 15,
    "finishing": 15
   },
   "mental": {
    "aggression": 46,
    "anticipation": 81,
    "bravery": 87,
    "composure": 74,
    "concentration": 83,
    "decisions": 72,
    "determination": 82,
    "flair": 42,
    "leadership": 73,
    "off_the_ball": 20,
    "positioning": 79,
    "teamwork": 78,
    "vision": 58,
    "work_rate": 67
   },
   "physical": {
    "acceleration": 63,
    "agility": 88,
    "balance": 72,
    "jumping_reach": 82,
    "natural_fitness": 83,
    "pace": 59,
    "stamina": 68,
    "strength": 68
   },
   "goalkeeping": {
    "aerial_reach": 78,
    "command_of_area": 74,
    "communication": 73,
    "eccentricity": 36,
    "handling": 74,
    "kicking": 67,
    "one_on_ones": 89,
    "reflexes": 94,
    "rushing_out": 78,
    "punching": 69,
    "throwing": 62
   }
  },
  "traits": [
   "1대1 선방 능력 매우 뛰어남",
   "놀라운 반사신경"
  ],
  "kleague_clubs": [
   "대구 FC",
   "울산 HD FC"
  ],
  "_example": true
 },
 {
  "id": "K01-025",
  "name_ko": "린가드",
  "name_en": "Jesse Lingard",
  "birth_date": "1992-12-15",
  "nationality": "England",
  "height_cm": 175,
  "weight_kg": 65,
  "foot_left": "보통",
  "foot_right": "매우 강함",
  "positions": {
   "main": "AM(C)",
   "sub": [
    "LW",
    "RW"
   ]
  },
  "current_ability": 78,
  "potential_ability": 85,
  "attributes": {
   "technical": {
    "first_touch": 81,
    "free_kicks": 72,
    "heading": 54,
    "corners": 71,
    "crossing": 73,
    "dribbling": 79,
    "long_shots": 74,
    "long_throws": 36,
    "passing": 78,
    "penalty_taking": 76,
    "tackling": 56,
    "technique": 82,
    "marking": 52,
    "finishing": 74
   },
   "mental": {
    "aggression": 64,
    "anticipation": 82,
    "bravery": 71,
    "composure": 76,
    "concentration": 72,
    "decisions": 74,
    "determination": 76,
    "flair": 84,
    "leadership": 78,
    "off_the_ball": 86,
    "positioning": 62,
    "teamwork": 81,
    "vision": 79,
    "work_rate": 83
   },
   "physical": {
    "acceleration": 74,
    "agility": 79,
    "balance": 72,
    "jumping_reach": 58,
    "natural_fitness": 76,
    "pace": 72,
    "stamina": 78,
    "strength": 63
   },
   "goalkeeping": {
    "aerial_reach": 10,
    "command_of_area": 10,
    "communication": 10,
    "eccentricity": 10,
    "handling": 10,
    "kicking": 10,
    "one_on_ones": 10,
    "reflexes": 10,
    "rushing_out": 10,
    "punching": 10,
    "throwing": 10
   }
  },
  "traits": [
   "빈 공간으로 침투",
   "화려한 개인기 시도"
  ],
  "kleague_clubs": [
   "FC 서울"
  ],
  "_example": true
 },
 {
  "id": "K01-028",
  "name_ko": "이승우",
  "name_en": "Lee Seung-woo",
  "birth_date": "1998-01-06",
  "nationality": "South Korea",
  "height_cm": 173,
  "weight_kg": 63,
  "foot_left": "보통",
  "foot_right": "매우 강함",
  "positions": {
   "main": "LW",
   "sub": [
    "AM(C)",
    "ST"
   ]
  },
  "current_ability": 75,
  "potential_ability": 82,
  "attributes": {
   "technical": {
    "first_touch": 83,
    "free_kicks": 74,
    "heading": 48,
    "corners": 68,
    "crossing": 71,
    "dribbling": 85,
    "long_shots": 76,
    "long_throws": 32,
    "passing": 74,
    "penalty_taking": 78,
    "tackling": 41,
    "technique": 84,
    "marking": 38,
    "finishing": 79
   },
   "mental": {
    "aggression": 76,
    "anticipation": 78,
    "bravery": 73,
    "composure": 78,
    "concentration": 69,
    "decisions": 71,
    "determination": 79,
    "flair": 88,
    "leadership": 68,
    "off_the_ball": 82,
    "positioning": 54,
    "teamwork": 71,
    "vision": 76,
    "work_rate": 72
   },
   "physical": {
    "acceleration": 82,
    "agility": 86,
    "balance": 74,
    "jumping_reach": 49,
    "natural_fitness": 73,
    "pace": 78,
    "stamina": 71,
    "strength": 58
   },
   "goalkeeping": {
    "aerial_reach": 10,
    "command_of_area": 10,
    "communication": 10,
    "eccentricity": 10,
    "handling": 10,
    "kicking": 10,
    "one_on_ones": 10,
    "reflexes": 10,
    "rushing_out": 10,
    "punching": 10,
    "throwing": 10
   }
  },
  "traits": [
   "중앙으로 파고들며 슛",
   "도발적인 개인기 활용"
  ],
  "kleague_clubs": [
   "수원 FC",
   "전북 현대"
  ],
  "_example": true
 }
];

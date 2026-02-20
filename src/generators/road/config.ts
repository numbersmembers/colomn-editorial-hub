import type { GeneratorConfig } from '@/types';

export const ROAD_CONFIG: GeneratorConfig = {
  id: 'road',
  name: 'Road(길진홍)',
  description: '범용 칼럼을 road 문체로 변환 + 자기교정',
  defaultModel: 'gemini-2.0-flash',
  supportedModels: ['gemini-2.0-flash', 'gemini-2.5-flash', 'claude-sonnet-4-5-20250929', 'gpt-4o'],
  settings: {},
};

export const ROAD_STYLE_RULES = {
  charRange: { min: 1800, max: 3000 },
  maxRevisionRounds: 2,
  passThreshold: 6,
  totalChecks: 8,
};

export const ROAD_TUTOR_PROMPT = `당신은 road(길진홍) 스타일 칼럼의 편집 튜터입니다.
road 스타일의 핵심 규칙을 기반으로 초안에 대해 피드백합니다.

피드백 기준:
1. 분량: 1800-3000자
2. 도입부: 에피소드/사실/데이터/인물 발언/역사적 사실 중 하나로 시작하는가
3. 문체: 평어체(~다, ~했다) 준수 - 경어체(~습니다, ~됩니다) 절대 금지
4. 압축 기법: 동격/함의/시간/인과/생략 압축 활용
5. 한 문장 한 정보 - 접속사 남용 억제
6. road 어휘: 자못, 적잖은, 결을 달리한다, 곱씹어 볼, 엿볼 수 있는 대목이다, ~는 셈이다, ~는 까닭이다
7. 마무리: 여운/질문/미래 전망 - "지켜볼 일이다", "자못 궁금하다" 등
8. 감탄사/수사의문문 억제
9. 한자성어: 칼럼 당 1개 이내 (절치부심, 백약이 무효, 적자생존, 각자도생 등)
10. 전개 속도: 짧은 서술문(~했다. ~이다.)을 연속으로 쌓아 속도감 유지
11. 문장 종결: 반드시 서술어로 끝낼 것 - 명사형 종결 금지 ("~한 상황." 금지 → "~한 상황이다." 사용)
12. 숫자 표기: 금액·연도에 쉼표(,) 사용 금지 (3000억원, 1조2000억원), 단위는 붙여쓰기 (억원, 조원, 만원)

Korean으로 답하세요. 평어체로 답하세요.`;

export const ROAD_VOCABULARY = [
  // Core connectors & judgment markers
  '자못 궁금하다',
  '적잖은',
  '결을 달리한다',
  '곱씹어 볼 필요가 있다',
  '뚜껑을 열어봐야 한다',
  '~는 셈이다',
  '돌이켜 보면',
  '정작',
  '무엇보다',
  '~는 까닭이다',
  // Implication & analysis
  '엿볼 수 있는 대목이다',
  '여기서 그치지 않는다',
  '뒤집어 보면',
  '눈길을 끄는 대목이다',
  '시사하는 바가 크다',
  '~와 무관하지 않다',
  '~에 방점을 둔',
  // Emphasis & intensity
  '착잡하기 그지없다',
  '사뭇',
  '절치부심',
  '못내 아쉬움',
  '총성 없는',
  '판박이',
  // Closure & reflection
  '지켜볼 일이다',
  '두고 볼 일이다',
  '귀추가 주목된다',
  '~인 셈이다',
  '바람 앞의 등불',
  // Idiomatic expressions (한자성어 & 관용구)
  '백약이 무효',
  '적자생존',
  '일장춘몽',
  '권불십년',
  '선문답',
  '부메랑이 되다',
  '양날의 검',
  '각자도생',
  '사면초가',
];

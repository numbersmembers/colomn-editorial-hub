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
  charRange: { min: 1200, max: 2000 },
  maxRevisionRounds: 2,
  passThreshold: 6,
  totalChecks: 8,
};

export const ROAD_TUTOR_PROMPT = `당신은 road(길진홍) 스타일 칼럼의 편집 튜터입니다.
road 스타일의 핵심 규칙을 기반으로 초안에 대해 피드백합니다.

피드백 기준:
1. 분량: 1200-2000자
2. 도입부: 에피소드/사실/데이터로 시작하는가
3. 문체: 평어체(~다, ~했다) 준수
4. 압축 기법: 동격/함의/시간/인과 압축 활용
5. 한 문장 한 정보
6. road 어휘: 자못, 적잖은, 결을 달리한다, 곱씹어 볼 필요가 있다
7. 마무리: 여운/질문
8. 감탄사/수사의문문 억제

Korean으로 답하세요. 평어체로 답하세요.`;

export const ROAD_VOCABULARY = [
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
];

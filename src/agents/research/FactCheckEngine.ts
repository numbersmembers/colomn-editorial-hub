import { stripHtml } from '@/lib/sanitize';

import type { NewsItem } from './KoreanSearcher';
import type { KoreanSearcher } from './KoreanSearcher';

export type FactCheckResult = {
  statement: string;
  verdict: 'supported' | 'contradicted' | 'uncertain';
  confidence: string;
  analysis: string;
  sources: { title: string; link: string }[];
}

const TRUSTED_MEDIA = [
  'yna.co.kr',
  'kbs.co.kr',
  'imbc.com',
  'sbs.co.kr',
  'chosun.com',
  'joongang.co.kr',
  'donga.com',
  'hani.co.kr',
  'khan.co.kr',
  'thebell.co.kr',
  'mk.co.kr',
  'hankyung.com',
  'sedaily.com',
];

export class FactCheckEngine {
  private searcher: KoreanSearcher;

  constructor(searcher: KoreanSearcher) {
    this.searcher = searcher;
  }

  async verifyStatement(statement: string): Promise<FactCheckResult> {
    let results = await this.searcher.searchNews(`${statement} 팩트체크`, 5);
    if (results.items.length === 0) {
      results = await this.searcher.searchNews(statement, 5);
    }

    const articles = results.items;
    const trustedArticles = articles.filter(item =>
      TRUSTED_MEDIA.some(domain => item.originallink.includes(domain)),
    );
    const relevantArticles = trustedArticles.length > 0 ? trustedArticles : articles;

    const evidenceSummary = relevantArticles
      .map((a: NewsItem) => `- ${stripHtml(a.title)}: ${stripHtml(a.description)}`)
      .join('\n');

    const { createModel } = await import('@/models/factory');
    const model = createModel('gemini-2.0-flash');

    const prompt = `다음 문장의 사실 여부를 검증하라.

## 검증 대상
"${statement}"

## 관련 뉴스 기사
${evidenceSummary || '관련 기사를 찾지 못했다.'}

## 판정 기준
- supported: 기사 내용이 해당 문장을 뒷받침
- contradicted: 기사 내용이 해당 문장과 모순
- uncertain: 판단 근거 부족

## 출력 (JSON)
{
  "verdict": "supported" | "contradicted" | "uncertain",
  "confidence": "높음" | "보통" | "낮음",
  "analysis": "2~3문장으로 판정 근거 설명 (평어체)"
}`;

    let verdict: FactCheckResult['verdict'] = 'uncertain';
    let confidence = '낮음';
    let analysis = '관련 기사를 충분히 찾지 못해 판단이 어렵다.';

    try {
      const raw = await model.generate(prompt, { responseFormat: 'json' });
      const parsed = JSON.parse(raw);
      verdict = parsed.verdict || 'uncertain';
      confidence = parsed.confidence || '낮음';
      analysis = parsed.analysis || analysis;
    } catch {
      if (relevantArticles.length > 0) {
        analysis = `관련 기사 ${relevantArticles.length}건을 찾았으나 AI 분석에 실패했다. 기사를 직접 확인할 것.`;
      }
    }

    return {
      statement,
      verdict,
      confidence,
      analysis,
      sources: relevantArticles.slice(0, 5).map((a: NewsItem) => ({
        title: stripHtml(a.title),
        link: a.originallink || a.link,
      })),
    };
  }
}

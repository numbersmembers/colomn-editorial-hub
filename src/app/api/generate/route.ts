import { getGenerator } from '@/generators/registry';
import { fetchArticleContent } from '@/lib/articleFetcher';
import { searchKnowledge } from '@/lib/knowledge';

import type { GeneratorInput, StepLog } from '@/types';
import type { NewsItem } from '@/agents/research/KoreanSearcher';

export async function POST(req: Request) {
  const { generatorId, input } = await req.json() as {
    generatorId: string;
    input: GeneratorInput;
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        // Register generators
        await import('@/generators/init');
        const generator = getGenerator(generatorId);
        if (!generator) {
          sendEvent({ type: 'error', error: `Unknown generator: ${generatorId}` });
          controller.close();
          return;
        }

        // Road: style conversion only — skip article/knowledge/news processing
        let enhancedInput: GeneratorInput;

        if (generatorId === 'road') {
          enhancedInput = { ...input };
        } else {
          // Resolve article URLs to content
          let resolvedSources = input.sources;
          if (input.sources && input.sources.length > 0) {
            sendEvent({ type: 'status', message: '기사 본문 추출 중...' });
            resolvedSources = await Promise.all(
              input.sources.map(async (src) => {
                if (src.startsWith('http://') || src.startsWith('https://')) {
                  const { content } = await fetchArticleContent(src);
                  return content;
                }
                return src;
              }),
            );
          }

          // Load knowledge context
          const knowledgeQuery = input.title || input.idea;
          let knowledgeContext = '';
          try {
            knowledgeContext = await searchKnowledge(knowledgeQuery);
          } catch {
            // Knowledge search failed, continue without it
          }

          // Build enhanced research context
          let enhancedResearchContext = '';
          if (knowledgeContext) {
            enhancedResearchContext += knowledgeContext + '\n\n';
          }
          if (input.researchContext) {
            enhancedResearchContext += input.researchContext;
          }

          // Auto-search news ALWAYS (supplements both manual research and knowledge)
          sendEvent({ type: 'status', message: '관련 뉴스 자동 검색 중...' });
          try {
            const { KoreanSearcher } = await import('@/agents/research/KoreanSearcher');
            const clientId = process.env.NAVER_CLIENT_ID || '';
            const clientSecret = process.env.NAVER_CLIENT_SECRET || '';
            if (clientId && clientSecret) {
              const searcher = new KoreanSearcher(clientId, clientSecret);
              const searchResult = await searcher.searchNews(input.idea);
              if (searchResult.items && searchResult.items.length > 0) {
                const searchContext = searchResult.items
                  .slice(0, 5)
                  .map((item: NewsItem) => `- ${item.title}: ${item.description}`)
                  .join('\n');
                enhancedResearchContext += `\n\n[자동 검색 결과]\n${searchContext}`;
              }
            }
          } catch {
            // Search failed, continue without it
          }

          enhancedInput = {
            ...input,
            sources: resolvedSources,
            researchContext: enhancedResearchContext.trim() || undefined,
          };
        }

        // Progress callback for real-time streaming
        const onProgress = (steps: StepLog[]) => {
          sendEvent({ type: 'progress', steps });
        };

        const output = await generator.generate(enhancedInput, onProgress);
        sendEvent({ type: 'done', output });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        sendEvent({ type: 'error', error: `칼럼 생성 실패: ${message}` });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

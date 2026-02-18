'use server';

import { KoreanSearcher } from '@/agents/research/KoreanSearcher';
import { FactCheckEngine } from '@/agents/research/FactCheckEngine';
import { QueryRefiner } from '@/agents/research/QueryRefiner';
import { getGenerator, listGenerators } from '@/generators/registry';

import type { NewsItem } from '@/agents/research/KoreanSearcher';
import type { FactCheckResult } from '@/agents/research/FactCheckEngine';
import type { RefinedQuery } from '@/agents/research/QueryRefiner';
import type { GeneratorId, GeneratorConfig, GeneratorInput, GeneratorOutput, SearchResultCategory, DraftData, Message } from '@/types';

// Lazy initialization to avoid errors when env vars are missing
function getSearcher() {
  const clientId = process.env.NAVER_CLIENT_ID || '';
  const clientSecret = process.env.NAVER_CLIENT_SECRET || '';
  if (!clientId || !clientSecret) return null;
  return new KoreanSearcher(clientId, clientSecret);
}

function getQueryRefiner() {
  if (!process.env.GEMINI_API_KEY) return null;
  return new QueryRefiner('gemini-2.0-flash');
}

// --- Article Fetcher ---

async function fetchArticleContent(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ColumnEditorialHub/1.0)',
      },
    });
    if (!res.ok) return `[기사 로드 실패: ${url} (${res.status})]`;

    const html = await res.text();

    // Extract text from <article>, <main>, or <body>
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
      || html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
      || html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

    const rawHtml = articleMatch ? articleMatch[1] : html;

    // Strip scripts, styles, tags
    const text = rawHtml
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#\d+;/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return text.slice(0, 3000);
  } catch {
    return `[기사 로드 실패: ${url}]`;
  } finally {
    clearTimeout(timeout);
  }
}

// --- Generator Action ---

export async function generateColumnAction(
  generatorId: GeneratorId,
  input: GeneratorInput,
): Promise<{ data: GeneratorOutput } | { error: string }> {
  try {
    // Fetch article content from URLs if sources provided
    let resolvedSources = input.sources;
    if (input.sources && input.sources.length > 0) {
      resolvedSources = await Promise.all(
        input.sources.map(async (src) => {
          if (src.startsWith('http://') || src.startsWith('https://')) {
            return fetchArticleContent(src);
          }
          return src;
        }),
      );
    }

    // Ensure generators are registered
    await import('@/generators/init');
    const generator = getGenerator(generatorId);
    if (!generator) {
      return { error: `Unknown generator: ${generatorId}` };
    }
    const output = await generator.generate({ ...input, sources: resolvedSources });
    return { data: output };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { error: `칼럼 생성 실패: ${message}` };
  }
}

// --- Search Action ---

export async function searchNewsAction(
  userQuery: string,
  useRefiner: boolean = true,
): Promise<{ data: SearchResultCategory[]; queryMetadata: RefinedQuery | null } | { error: string }> {
  const searcher = getSearcher();
  if (!searcher) {
    return { error: 'Naver API Keys are missing in .env.local' };
  }

  try {
    const queryRefiner = getQueryRefiner();

    if (useRefiner && queryRefiner && userQuery.length > 5) {
      const metadata = await queryRefiner.refineQuery(userQuery);

      const clusterPromises = (metadata.clusters || []).map(
        async (group): Promise<SearchResultCategory> => {
          const result = await searcher.searchNews(group.keywords);
          return {
            label: group.label,
            keywords: group.keywords,
            type: 'cluster',
            items: (result.items || []).map((item: NewsItem) => ({
              title: item.title,
              link: item.link,
              description: item.description,
              pubDate: item.pubDate,
            })),
          };
        },
      );

      const counterPromises = (metadata.counterPerspectives || []).map(
        async (group): Promise<SearchResultCategory> => {
          const result = await searcher.searchNews(group.keywords);
          return {
            label: group.label,
            keywords: group.keywords,
            type: 'counter',
            items: (result.items || []).map((item: NewsItem) => ({
              title: item.title,
              link: item.link,
              description: item.description,
              pubDate: item.pubDate,
            })),
          };
        },
      );

      const categorizedResults = await Promise.all([...clusterPromises, ...counterPromises]);
      return { data: categorizedResults, queryMetadata: metadata };
    }

    const result = await searcher.searchNews(userQuery);
    return {
      data: [
        {
          label: '일반 검색',
          keywords: userQuery,
          type: 'general',
          items: (result.items || []).map((item: NewsItem) => ({
            title: item.title,
            link: item.link,
            description: item.description,
            pubDate: item.pubDate,
          })),
        },
      ],
      queryMetadata: null,
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { error: `검색 실패: ${message}` };
  }
}

// --- Fact Check Action ---

export async function verifyFactAction(
  statement: string,
): Promise<{ data: FactCheckResult } | { error: string }> {
  const searcher = getSearcher();
  if (!searcher) {
    return { error: 'Naver API Keys are missing in .env.local' };
  }
  try {
    const factChecker = new FactCheckEngine(searcher);
    const result = await factChecker.verifyStatement(statement);
    return { data: result };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { error: message };
  }
}

// --- Tutor Chat Action ---

export async function tutorChatAction(
  messages: Message[],
  generatorId?: GeneratorId,
  draftContext?: DraftData,
): Promise<{ data: string } | { error: string }> {
  try {
    const { createModel } = await import('@/models/factory');
    const model = createModel('gemini-2.5-flash');

    // Build system prompt based on generator
    let systemPrompt: string;
    if (generatorId) {
      await import('@/generators/init');
      const generator = getGenerator(generatorId);
      systemPrompt = generator?.getTutorSystemPrompt?.() || DEFAULT_TUTOR_SYSTEM;
    } else {
      systemPrompt = DEFAULT_TUTOR_SYSTEM;
    }

    // Add draft context if available
    if (draftContext && draftContext.body) {
      systemPrompt += `\n\n[Current Draft Context]\nTitle: ${draftContext.title}\nBody (first 500 chars): ${draftContext.body.slice(0, 500)}`;
    }

    const chatHistory = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    const fullPrompt = chatHistory.map(m => `[${m.role}]: ${m.content}`).join('\n\n');
    const response = await model.generate(fullPrompt, { system: systemPrompt });
    return { data: response };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { error: message };
  }
}

const DEFAULT_TUTOR_SYSTEM = `You are an AI Editorial Tutor specializing in analytical column writing.
Help journalists refine their column ideas through interactive, Socratic dialogue.

[Role]
- Act as a Devil's Advocate: challenge the writer's assumptions and expose blind spots
- Present counter-arguments and alternative perspectives the writer hasn't considered
- Push for deeper analysis beyond surface-level observations

[Guidelines]
- Ask probing questions: "이 주장의 반대 근거는 무엇인가?", "독자가 가장 반박할 포인트는?"
- Suggest structural improvements: lead hook, evidence gaps, logical flow issues
- Highlight when arguments are too one-sided or lack concrete evidence
- Recommend specific data points, cases, or experts that could strengthen the argument
- Point out potential taboos, factual errors, or logical fallacies

[Constraints]
- Speak in Korean
- Use plain journalistic tone (평어체, ~다/~했다). Never use honorifics (~습니다)
- Be direct and constructive, not sycophantic
- If the writer's draft exists, reference specific passages when giving feedback
- Limit each response to 2-3 focused, actionable points rather than overwhelming with feedback`;

// --- List Generators Action ---

export async function listGeneratorsAction(): Promise<{ data: GeneratorConfig[] } | { error: string }> {
  try {
    await import('@/generators/init');
    return { data: listGenerators() };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { error: message };
  }
}

// --- Road Display Data Action ---

type RoadDisplayData = {
  charRange: { min: number; max: number };
  maxRevisionRounds: number;
  passThreshold: number;
  vocabulary: string[];
}

export async function getRoadDisplayDataAction(): Promise<{ data: RoadDisplayData } | { error: string }> {
  try {
    const { ROAD_STYLE_RULES, ROAD_VOCABULARY } = await import('@/generators/road/config');
    return {
      data: {
        charRange: ROAD_STYLE_RULES.charRange,
        maxRevisionRounds: ROAD_STYLE_RULES.maxRevisionRounds,
        passThreshold: ROAD_STYLE_RULES.passThreshold,
        vocabulary: ROAD_VOCABULARY,
      },
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { error: message };
  }
}

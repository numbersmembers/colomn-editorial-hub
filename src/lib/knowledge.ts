import { readdir, readFile } from 'fs/promises';
import { join, extname, basename } from 'path';

type KnowledgeFile = {
  name: string;
  path: string;
  category: string;
  topic: string;
  date: string | null;
}

type IngestedKnowledge = {
  book_summary?: string | string[];
  core_concepts?: { name: string; description: string }[] | string[];
  key_facts?: { fact?: string; description?: string }[] | string[];
  case_studies?: { company?: string; summary?: string; description?: string }[] | string[];
  frameworks?: { name?: string; description?: string }[] | string[];
  counterarguments?: string[];
  _metadata?: { book_name?: string };
}

const KNOWLEDGE_DIR = process.env.KNOWLEDGE_DIR || 'C:/Users/user/Desktop/문병선도서관';

// Category-specific expertise hints for LLM context
const CATEGORY_HINTS: Record<string, string> = {
  '일반': '기업지배구조, 경영전략, 리더십, 컨설팅 전문 도서',
  'M&A': '인수합병, 기업가치평가, 합병시너지, 거래구조 전문 자료',
  '신용평가': '한국신용평가(KR), 나이스신용평가(NICE), 한국기업평가(KIS) 보고서 - 업종분석, 그룹분석, 재무건전성',
  '재무분석': '재무제표분석, 유동성위험, 기업가치평가, 투자분석 전문 자료',
};

async function scanDirectory(dirPath: string, category: string): Promise<KnowledgeFile[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const files: KnowledgeFile[] = [];

    for (const entry of entries) {
      if (entry.isFile() && extname(entry.name).toLowerCase() === '.pdf') {
        const name = basename(entry.name, '.pdf');
        const dateMatch = name.match(/(?:ss|rm)(\d{4})(\d{2})(\d{2})/);
        const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : null;

        // Richer topic extraction
        const topic = name
          .replace(/_OceanofPDF\.com_/g, '')
          .replace(/(?:_ss|_rm)\d{8}-\d+/g, '')
          .replace(/_/g, ' ')
          .replace(/\[.*?\]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        files.push({
          name: entry.name,
          path: join(dirPath, entry.name),
          category,
          topic,
          date,
        });
      }
    }

    return files;
  } catch {
    return [];
  }
}

async function loadIngestedKnowledge(knowledgeDir: string): Promise<IngestedKnowledge[]> {
  const jsonDir = join(knowledgeDir, 'knowledge');
  try {
    const entries = await readdir(jsonDir, { withFileTypes: true });
    const results: IngestedKnowledge[] = [];

    for (const entry of entries) {
      if (entry.isFile() && extname(entry.name) === '.json') {
        try {
          const content = await readFile(join(jsonDir, entry.name), 'utf-8');
          results.push(JSON.parse(content) as IngestedKnowledge);
        } catch {
          // Skip invalid JSON
        }
      }
    }
    return results;
  } catch {
    return [];
  }
}

function formatIngestedKnowledge(knowledgeList: IngestedKnowledge[]): string {
  if (knowledgeList.length === 0) return '';

  const parts: string[] = [];
  for (const k of knowledgeList) {
    const bookName = k._metadata?.book_name || 'unknown';
    parts.push(`[참고 도서: ${bookName}]`);

    if (k.book_summary) {
      const summary = Array.isArray(k.book_summary) ? k.book_summary.join(' ') : k.book_summary;
      parts.push(`요약: ${summary}`);
    }

    const concepts = k.core_concepts || [];
    for (const c of concepts.slice(0, 5)) {
      if (typeof c === 'object' && c !== null) {
        parts.push(`- 개념: ${c.name}: ${c.description}`);
      } else {
        parts.push(`- 개념: ${c}`);
      }
    }

    const facts = k.key_facts || [];
    for (const f of facts.slice(0, 5)) {
      if (typeof f === 'object' && f !== null) {
        parts.push(`- 팩트: ${f.fact || f.description || ''}`);
      } else {
        parts.push(`- 팩트: ${f}`);
      }
    }

    const cases = k.case_studies || [];
    for (const cs of cases.slice(0, 3)) {
      if (typeof cs === 'object' && cs !== null) {
        parts.push(`- 사례: ${cs.company || ''} - ${cs.summary || cs.description || ''}`);
      } else {
        parts.push(`- 사례: ${cs}`);
      }
    }

    const frameworks = k.frameworks || [];
    for (const fw of frameworks.slice(0, 3)) {
      if (typeof fw === 'object' && fw !== null) {
        parts.push(`- 프레임워크: ${fw.name || ''}: ${fw.description || ''}`);
      } else {
        parts.push(`- 프레임워크: ${fw}`);
      }
    }
  }

  return parts.join('\n');
}

export async function searchKnowledge(query: string): Promise<string> {
  // 1. Try loading pre-ingested JSON knowledge first (rich structured data)
  const ingested = await loadIngestedKnowledge(KNOWLEDGE_DIR);
  if (ingested.length > 0) {
    const formatted = formatIngestedKnowledge(ingested);
    if (formatted) {
      return `[Knowledge Base - 인제스트된 전문 지식]\n${formatted}`;
    }
  }

  // 2. Fallback: scan PDF filenames with enhanced context
  const categories = [
    { dir: KNOWLEDGE_DIR, name: '일반' },
    { dir: join(KNOWLEDGE_DIR, 'm&a'), name: 'M&A' },
    { dir: join(KNOWLEDGE_DIR, '신용평가보고서'), name: '신용평가' },
    { dir: join(KNOWLEDGE_DIR, '재무분석'), name: '재무분석' },
  ];

  const allFiles: KnowledgeFile[] = [];
  for (const cat of categories) {
    const files = await scanDirectory(cat.dir, cat.name);
    allFiles.push(...files);
  }

  if (allFiles.length === 0) return '';

  // Keyword matching against file topics
  const keywords = query
    .toLowerCase()
    .replace(/[.,?!'"]/g, '')
    .split(/[\s,]+/)
    .filter(k => k.length > 1);

  const scored = allFiles
    .map(file => {
      const topicLower = file.topic.toLowerCase();
      const score = keywords.reduce((acc, kw) => acc + (topicLower.includes(kw) ? 1 : 0), 0);
      return { file, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // Also include category-matched files if keyword match is weak
  const matchedCategories = new Set(scored.map(s => s.file.category));
  const categoryBoost: KnowledgeFile[] = [];
  if (scored.length < 3) {
    for (const cat of categories) {
      if (!matchedCategories.has(cat.name)) {
        const catFiles = allFiles.filter(f => f.category === cat.name);
        // Add recent files from each category (sorted by date)
        const recent = catFiles
          .filter(f => f.date)
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
          .slice(0, 1);
        categoryBoost.push(...recent);
      }
    }
  }

  const finalFiles = [...scored.map(s => s.file), ...categoryBoost].slice(0, 7);
  if (finalFiles.length === 0) return '';

  const context = finalFiles.map(file => {
    const dateStr = file.date ? ` (${file.date})` : '';
    const hint = CATEGORY_HINTS[file.category] || '';
    return `- [${file.category}] ${file.topic}${dateStr}${hint ? ` — ${hint}` : ''}`;
  }).join('\n');

  // Provide actionable instruction for the LLM
  return `[Knowledge Base - 문병선도서관 참고 자료]
다음 자료들의 관점과 프레임워크를 칼럼 분석에 활용하세요:
${context}

활용 지침:
- 기업지배구조/M&A 관련 주제라면 위 도서의 분석 프레임워크를 적용하여 논점을 깊이 있게 전개
- 신용평가 보고서가 관련되면 해당 업종/그룹의 재무 건전성 관점을 반영
- 직접 인용하지 말고, 관점과 분석 틀을 참고하여 칼럼의 깊이를 높일 것`;
}

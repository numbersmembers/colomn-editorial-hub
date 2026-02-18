import { createModel } from '@/models/factory';

type SearchGroup = {
  label: string;
  keywords: string;
}

export type RefinedQuery = {
  original: string;
  clusters: SearchGroup[];
  counterPerspectives: SearchGroup[];
}

export class QueryRefiner {
  private modelId: string;

  constructor(modelId: string = 'gemini-2.0-flash') {
    this.modelId = modelId;
  }

  async refineQuery(userPrompt: string): Promise<RefinedQuery> {
    try {
      const model = createModel(this.modelId);

      const prompt = `You are a professional column researcher and search query optimizer for Naver News.
Your task is to analyze the user's natural language question and generate a multi-dimensional search strategy.
For column writing, it is essential to explore various facets of a topic and find contrasting opinions.

Rules:
1. Extract the core topic and expand it into multiple high-value search clusters (Ontology-based expansion).
2. Generate "Counter-Perspectives" search keywords to find opposing arguments or critical views.
3. Each cluster should have a descriptive label and 1-2 concentrated search keywords.
4. Output ONLY a valid JSON object.
5. Content of labels and keywords must be in Korean.

Expected JSON Format:
{
  "original": "user question",
  "clusters": [
    { "label": "Topic Facet 1", "keywords": "keyword1 keyword2" },
    { "label": "Topic Facet 2", "keywords": "keyword3" }
  ],
  "counterPerspectives": [
    { "label": "Critical View", "keywords": "keyword4 keyword5" }
  ]
}

User: "${userPrompt}"
Output:`;

      const response = await model.generate(prompt);
      const cleanedText = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      try {
        return JSON.parse(cleanedText) as RefinedQuery;
      } catch {
        return {
          original: userPrompt,
          clusters: [{ label: '일반 검색', keywords: userPrompt.substring(0, 20) }],
          counterPerspectives: [],
        };
      }
    } catch {
      return {
        original: userPrompt,
        clusters: [{ label: '일반 검색', keywords: userPrompt }],
        counterPerspectives: [],
      };
    }
  }
}

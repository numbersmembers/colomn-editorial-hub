export type NewsItem = {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
}

export type SearchResult = {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NewsItem[];
}

export class KoreanSearcher {
  private clientId: string;
  private clientSecret: string;
  private baseUrl = 'https://openapi.naver.com/v1/search/news.json';

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  async searchNews(query: string, display: number = 10, start: number = 1, sort: string = 'sim'): Promise<SearchResult> {
    const url = `${this.baseUrl}?query=${encodeURIComponent(query)}&display=${display}&start=${start}&sort=${sort}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Naver-Client-Id': this.clientId,
        'X-Naver-Client-Secret': this.clientSecret,
      },
    });

    if (!response.ok) {
      throw new Error(`Naver API Error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<SearchResult>;
  }
}

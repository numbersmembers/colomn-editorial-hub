// Improved article content fetcher
// Ported from Python road-column's web.py with multiple selector fallbacks

const ARTICLE_SELECTORS: RegExp[] = [
  /<article[^>]*>([\s\S]*?)<\/article>/i,
  /<div[^>]*(?:id|class)\s*=\s*["'][^"']*article-body[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  /<div[^>]*(?:id|class)\s*=\s*["'][^"']*article-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  /<div[^>]*(?:id|class)\s*=\s*["'][^"']*news-body[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  /<div[^>]*(?:id|class)\s*=\s*["'][^"']*story-body[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  /<div[^>]*(?:id|class)\s*=\s*["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  /<main[^>]*>([\s\S]*?)<\/main>/i,
  /<body[^>]*>([\s\S]*?)<\/body>/i,
];

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

export async function fetchArticleContent(url: string): Promise<{ title: string; content: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (!res.ok) return { title: '', content: `[기사 로드 실패: ${url} (${res.status})]` };

    const html = await res.text();

    // Extract og:title
    const ogTitleMatch =
      html.match(/<meta\s+(?:property|name)\s*=\s*["']og:title["']\s+content\s*=\s*["']([^"']*)["']/i)
      || html.match(/<meta\s+content\s*=\s*["']([^"']*)["']\s+(?:property|name)\s*=\s*["']og:title["']/i);
    const title = ogTitleMatch ? decodeHtmlEntities(ogTitleMatch[1]) : '';

    // Try multiple selectors for article body
    let rawHtml = '';
    for (const selector of ARTICLE_SELECTORS) {
      const match = html.match(selector);
      if (match && stripHtmlToText(match[1]).length > 100) {
        rawHtml = match[1];
        break;
      }
    }

    // Fallback: collect all <p> tags
    if (!rawHtml || stripHtmlToText(rawHtml).length < 100) {
      const paragraphs = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi);
      if (paragraphs && paragraphs.length > 0) {
        rawHtml = paragraphs.join('\n');
      }
    }

    // og:description as last fallback
    if (!rawHtml || stripHtmlToText(rawHtml).length < 100) {
      const ogDescMatch =
        html.match(/<meta\s+(?:property|name)\s*=\s*["']og:description["']\s+content\s*=\s*["']([^"']*)["']/i)
        || html.match(/<meta\s+content\s*=\s*["']([^"']*)["']\s+(?:property|name)\s*=\s*["']og:description["']/i);
      if (ogDescMatch) {
        rawHtml = ogDescMatch[1];
      }
    }

    if (!rawHtml) rawHtml = html;

    const text = stripHtmlToText(rawHtml);
    const contentWithTitle = title ? `[제목] ${title}\n\n${text}` : text;
    return { title, content: contentWithTitle.slice(0, 5000) };
  } catch {
    return { title: '', content: `[기사 로드 실패: ${url}]` };
  } finally {
    clearTimeout(timeout);
  }
}

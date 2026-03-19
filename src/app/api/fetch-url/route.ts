import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Basic URL validation
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const res = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; _y-Research/1.0)',
        'Accept': 'text/html,application/xhtml+xml,text/plain',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `HTTP ${res.status}` }, { status: 502 });
    }

    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : parsedUrl.hostname;

    // Strip HTML to get readable text
    let content = html;

    // Try to extract main content area
    const mainMatch = content.match(/<(?:main|article)[^>]*>([\s\S]*?)<\/(?:main|article)>/i);
    if (mainMatch) {
      content = mainMatch[1];
    } else {
      // Remove header, footer, nav, script, style, aside
      content = content.replace(/<(?:header|footer|nav|aside|script|style|noscript|svg|iframe)[^>]*>[\s\S]*?<\/(?:header|footer|nav|aside|script|style|noscript|svg|iframe)>/gi, '');
    }

    // Strip all HTML tags
    content = content.replace(/<[^>]+>/g, ' ');
    // Decode HTML entities
    content = content
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
    // Clean up whitespace
    content = content.replace(/\s+/g, ' ').trim();
    // Truncate to reasonable length
    if (content.length > 8000) {
      content = content.slice(0, 8000) + '...';
    }

    return NextResponse.json({ title, content, url: parsedUrl.toString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

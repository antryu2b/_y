/**
 * Agent Tool Bindings — All 30 Agents
 *
 * Each agent gets real executable tools.
 * Chat route detects need → executes tool → feeds data to LLM.
 */

export interface ToolResult {
  tool: string;
  data: unknown;
  error?: string;
}

// ─── Tool Registry ───────────────────────────────────────
export const AGENT_TOOLS: Record<string, string[]> = {
  // 10F 회장실
  counsely:  ['web_search', 'fetch_url', 'company_summary'],

  // 9F 기획조정실
  tasky:     ['web_search', 'github_issues'],
  finy:      ['market_data', 'exchange_rate'],
  legaly:    ['web_search', 'fetch_url'],

  // 8F 리스크/감사
  skepty:    ['web_search', 'fact_check'],
  audity:    ['dependency_audit', 'code_stats'],

  // 7F SW개발본부
  pixely:    ['web_search', 'color_palette'],
  buildy:    ['github_issues', 'code_stats'],
  testy:     ['code_stats', 'dependency_audit'],

  // 6F 콘텐츠본부
  buzzy:     ['web_search', 'trending_topics', 'fetch_url'],
  wordy:     ['web_search', 'fetch_url'],
  edity:     ['web_search'],
  searchy:   ['web_search', 'fetch_url', 'trending_topics'],

  // 5F 마케팅본부
  growthy:   ['web_search', 'market_data'],
  logoy:     ['web_search', 'color_palette'],
  helpy:     ['web_search', 'fetch_url'],
  clicky:    ['web_search', 'trending_topics'],
  selly:     ['web_search', 'market_data'],

  // 4F ICT본부
  stacky:    ['health_check', 'dependency_audit', 'dns_lookup'],
  watchy:    ['health_check', 'dns_lookup'],
  guardy:    ['dependency_audit', 'dns_lookup', 'security_headers'],

  // 3F 인사/교육
  hiry:      ['web_search'],
  coachy:    ['web_search'],

  // 2F _y Capital
  quanty:    ['market_data', 'crypto_price', 'exchange_rate'],
  hedgy:     ['market_data', 'web_search'],
  valuey:    ['market_data', 'web_search', 'fetch_url'],
  tradey:    ['market_data', 'crypto_price'],

  // 1F 인프라
  nety:      ['health_check', 'dns_lookup'],
  cloudy:    ['health_check', 'dns_lookup'],
  datay:     ['code_stats'],
  opsy:      ['health_check', 'dependency_audit'],
};

// ─── Detection ───────────────────────────────────────────

export function hasTools(agentId: string): boolean {
  return !!(AGENT_TOOLS[agentId]?.length);
}

const TOOL_KEYWORDS: Record<string, string[]> = {
  web_search: [
    'search', 'find', 'look up', 'latest', 'recent', 'news', 'trending', 'what is', 'who is',
    'how to', 'compare', 'competitor', 'market', 'research', 'analyze', 'report on', 'about',
    '검색', '찾아', '뉴스', '최신', '최근', '트렌드', '동향', '조사', '분석', '리서치',
    '알아봐', '찾아봐', '뭐 있', '어때', '경쟁사', '시장', '비교', '에 대해',
  ],
  fetch_url: ['http://', 'https://', '.com', '.io', '.org', '.kr', 'url', '링크', '사이트'],
  market_data: [
    'stock', 'price', 'market', 'sp500', 's&p', 'nasdaq', 'dow', 'index', 'ticker',
    '주가', '시장', '주식', '지수', '코스피', '코스닥', 'etf',
  ],
  crypto_price: ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', '비트코인', '이더리움', '코인', '암호화폐'],
  exchange_rate: ['exchange', 'currency', 'usd', 'krw', 'won', '환율', '달러', '원화', 'fx'],
  health_check: ['health', 'status', 'uptime', 'ping', 'check', '상태', '헬스', '점검', '모니터링', 'alive'],
  dns_lookup: ['dns', 'domain', 'resolve', 'nameserver', '도메인', 'ip', 'whois'],
  dependency_audit: ['audit', 'vulnerability', 'dependency', 'npm', 'security', 'cve', '취약점', '감사', '보안', '의존성'],
  code_stats: ['code', 'lines', 'stats', 'coverage', 'test', '코드', '통계', '라인', '테스트', '커버리지'],
  trending_topics: ['trending', 'viral', 'hot', 'buzz', 'popular', '트렌딩', '바이럴', '인기', '화제'],
  fact_check: ['fact', 'verify', 'true', 'false', 'confirm', 'check', '팩트', '검증', '확인', '사실'],
  github_issues: ['issue', 'bug', 'pr', 'pull request', 'github', 'backlog', '이슈', '버그', '백로그'],
  company_summary: ['summary', 'overview', 'brief', 'status', 'report', '요약', '현황', '브리핑', '종합'],
  color_palette: ['color', 'palette', 'hex', 'rgb', 'design system', '컬러', '팔레트', '색상'],
  security_headers: ['header', 'cors', 'csp', 'hsts', 'x-frame', '헤더', '보안 헤더'],
};

export function needsTool(agentId: string, message: string): string | null {
  const tools = AGENT_TOOLS[agentId];
  if (!tools) return null;

  const lower = message.toLowerCase();

  // URL detection → fetch_url (highest priority)
  if (tools.includes('fetch_url') && /https?:\/\/\S+/.test(message)) {
    return 'fetch_url';
  }

  // Check each tool the agent has
  for (const tool of tools) {
    const keywords = TOOL_KEYWORDS[tool];
    if (keywords && keywords.some(kw => lower.includes(kw))) {
      return tool;
    }
  }

  // Default: if agent has web_search and message is a question, use it
  if (tools.includes('web_search') && (lower.includes('?') || lower.includes('？') || lower.endsWith('봐') || lower.endsWith('줘'))) {
    return 'web_search';
  }

  return null;
}

// ─── Execution ───────────────────────────────────────────

export async function executeTool(tool: string, query: string, baseUrl: string = ''): Promise<ToolResult> {
  try {
    switch (tool) {
      case 'web_search':      return await webSearch(query);
      case 'fetch_url':       return await fetchUrl(query, baseUrl);
      case 'market_data':     return await marketData(query);
      case 'crypto_price':    return await cryptoPrice(query);
      case 'exchange_rate':   return await exchangeRate(query);
      case 'health_check':    return await healthCheck(query);
      case 'dns_lookup':      return await dnsLookup(query);
      case 'dependency_audit': return await dependencyAudit();
      case 'code_stats':      return await codeStats();
      case 'trending_topics': return await trendingTopics(query);
      case 'fact_check':      return await factCheck(query);
      case 'github_issues':   return await githubIssues(query);
      case 'company_summary': return await companySummary();
      case 'color_palette':   return await colorPalette(query);
      case 'security_headers': return await securityHeaders(query);
      default:                return { tool, data: null, error: `Unknown tool: ${tool}` };
    }
  } catch (err) {
    return { tool, data: null, error: err instanceof Error ? err.message : 'Tool execution failed' };
  }
}

// ─── Tool Implementations ────────────────────────────────

async function webSearch(query: string): Promise<ToolResult> {
  const results: Array<{ title: string; url: string; snippet: string }> = [];

  // DuckDuckGo (no API key needed)
  try {
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(ddgUrl, {
      headers: { 'User-Agent': '_y-Agent/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if (data.Abstract) {
      results.push({ title: data.Heading || query, url: data.AbstractURL || '', snippet: data.Abstract });
    }
    for (const topic of (data.RelatedTopics || []).slice(0, 5)) {
      if (topic.Text && topic.FirstURL) {
        results.push({ title: topic.Text.slice(0, 100), url: topic.FirstURL, snippet: topic.Text });
      }
    }
  } catch { /* continue */ }

  // SearXNG (optional self-hosted)
  const searxngUrl = process.env.SEARXNG_URL;
  if (searxngUrl) {
    try {
      const res = await fetch(`${searxngUrl}/search?q=${encodeURIComponent(query)}&format=json&categories=general`, {
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json();
      for (const r of (data.results || []).slice(0, 5)) {
        results.push({ title: r.title || '', url: r.url || '', snippet: r.content || '' });
      }
    } catch { /* continue */ }
  }

  // Google Custom Search (optional)
  const gKey = process.env.GOOGLE_SEARCH_API_KEY;
  const gCx = process.env.GOOGLE_SEARCH_CX;
  if (gKey && gCx && results.length < 3) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${gKey}&cx=${gCx}&q=${encodeURIComponent(query)}&num=5`,
        { signal: AbortSignal.timeout(8000) }
      );
      const data = await res.json();
      for (const item of (data.items || [])) {
        results.push({ title: item.title, url: item.link, snippet: item.snippet || '' });
      }
    } catch { /* continue */ }
  }

  return { tool: 'web_search', data: { query, resultCount: results.length, results: results.slice(0, 8), timestamp: new Date().toISOString() } };
}

async function fetchUrl(input: string, baseUrl: string): Promise<ToolResult> {
  const urlMatch = input.match(/https?:\/\/\S+/);
  const url = urlMatch ? urlMatch[0] : input;
  try {
    const endpoint = baseUrl ? `${baseUrl}/api/fetch-url` : '/api/fetch-url';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    return { tool: 'fetch_url', data: await res.json() };
  } catch (err) {
    return { tool: 'fetch_url', data: null, error: err instanceof Error ? err.message : 'Fetch failed' };
  }
}

async function marketData(query: string): Promise<ToolResult> {
  // Yahoo Finance v8 (no key needed)
  const symbols: Record<string, string> = {
    'sp500': '%5EGSPC', 's&p': '%5EGSPC', 'sp': '%5EGSPC',
    'nasdaq': '%5EIXIC', 'dow': '%5EDJI',
    'kospi': '%5EKS11', 'kosdaq': '%5EKQ11',
    'vix': '%5EVIX', 'nikkei': '%5EN225',
    'gold': 'GC=F', 'oil': 'CL=F', 'wti': 'CL=F',
  };

  const lower = query.toLowerCase();
  let symbol = '%5EGSPC'; // default S&P500
  for (const [key, val] of Object.entries(symbols)) {
    if (lower.includes(key)) { symbol = val; break; }
  }

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`,
      { headers: { 'User-Agent': '_y-Agent/1.0' }, signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    const quotes = data?.chart?.result?.[0]?.indicators?.quote?.[0];
    if (meta) {
      return {
        tool: 'market_data',
        data: {
          symbol: meta.symbol,
          name: meta.shortName || meta.symbol,
          price: meta.regularMarketPrice,
          previousClose: meta.previousClose,
          change: meta.regularMarketPrice - meta.previousClose,
          changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose * 100).toFixed(2) + '%',
          high: meta.regularMarketDayHigh,
          low: meta.regularMarketDayLow,
          volume: meta.regularMarketVolume,
          last5Days: quotes?.close?.slice(-5)?.map((c: number) => c?.toFixed(2)),
          timestamp: new Date().toISOString(),
        },
      };
    }
    return { tool: 'market_data', data: { error: 'No data available' } };
  } catch (err) {
    return { tool: 'market_data', data: null, error: err instanceof Error ? err.message : 'Market data fetch failed' };
  }
}

async function cryptoPrice(query: string): Promise<ToolResult> {
  const lower = query.toLowerCase();
  const coin = lower.includes('eth') ? 'ethereum' : 'bitcoin';
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd,krw&include_24hr_change=true&include_market_cap=true`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();
    return { tool: 'crypto_price', data: { coin, ...data[coin], timestamp: new Date().toISOString() } };
  } catch (err) {
    return { tool: 'crypto_price', data: null, error: err instanceof Error ? err.message : 'Crypto API failed' };
  }
}

async function exchangeRate(query: string): Promise<ToolResult> {
  try {
    // Free exchange rate API
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    const rates = data.rates || {};
    return {
      tool: 'exchange_rate',
      data: {
        base: 'USD',
        KRW: rates.KRW,
        JPY: rates.JPY,
        EUR: rates.EUR,
        GBP: rates.GBP,
        CNY: rates.CNY,
        timestamp: data.time_last_update_utc || new Date().toISOString(),
      },
    };
  } catch (err) {
    return { tool: 'exchange_rate', data: null, error: err instanceof Error ? err.message : 'Exchange rate fetch failed' };
  }
}

async function healthCheck(target: string): Promise<ToolResult> {
  const urls = target.match(/https?:\/\/\S+/g) || [
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/health`,
  ];

  const checks = await Promise.all(
    urls.map(async (url) => {
      const start = Date.now();
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        return { url, status: res.status, ok: res.ok, responseTime: Date.now() - start };
      } catch (err) {
        return { url, status: 0, ok: false, responseTime: Date.now() - start, error: err instanceof Error ? err.message : 'Failed' };
      }
    })
  );

  return { tool: 'health_check', data: { checks, timestamp: new Date().toISOString() } };
}

async function dnsLookup(query: string): Promise<ToolResult> {
  const domainMatch = query.match(/(?:https?:\/\/)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const domain = domainMatch ? domainMatch[1] : query.trim();
  try {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return {
      tool: 'dns_lookup',
      data: {
        domain,
        addresses: data.Answer?.map((a: { data: string }) => a.data) || [],
        status: data.Status === 0 ? 'NOERROR' : `ERROR(${data.Status})`,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (err) {
    return { tool: 'dns_lookup', data: null, error: err instanceof Error ? err.message : 'DNS lookup failed' };
  }
}

async function dependencyAudit(): Promise<ToolResult> {
  // Returns a static advisory check — in real deployment, runs npm audit
  return {
    tool: 'dependency_audit',
    data: {
      note: 'Run `npm audit` locally for full results. This tool provides awareness only in web mode.',
      suggestion: 'Consider enabling GitHub Dependabot for automated vulnerability alerts.',
      checklist: [
        'npm audit --production',
        'Check GitHub Security tab for alerts',
        'Review package-lock.json for known CVEs',
        'Ensure HTTPS for all API endpoints',
      ],
      timestamp: new Date().toISOString(),
    },
  };
}

async function codeStats(): Promise<ToolResult> {
  // Returns guidance — actual stats require local file system access
  return {
    tool: 'code_stats',
    data: {
      note: 'Code stats require local execution. Use these commands:',
      commands: {
        lineCount: 'find src -name "*.ts" -o -name "*.tsx" | xargs wc -l',
        testCount: 'npx jest --listTests | wc -l',
        coverage: 'npx jest --coverage --silent',
        dependencies: 'cat package.json | jq ".dependencies | length"',
      },
      timestamp: new Date().toISOString(),
    },
  };
}

async function trendingTopics(query: string): Promise<ToolResult> {
  // Use DuckDuckGo + HN for trends
  const results: Array<{ title: string; url: string; source: string }> = [];

  // Hacker News top stories
  try {
    const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', { signal: AbortSignal.timeout(5000) });
    const ids = (await res.json()).slice(0, 5);
    for (const id of ids) {
      const item = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { signal: AbortSignal.timeout(3000) });
      const data = await item.json();
      if (data?.title) {
        results.push({ title: data.title, url: data.url || `https://news.ycombinator.com/item?id=${id}`, source: 'HackerNews' });
      }
    }
  } catch { /* continue */ }

  // Product Hunt (public, no key)
  try {
    const res = await fetch('https://www.producthunt.com/feed', {
      headers: { 'User-Agent': '_y-Agent/1.0', 'Accept': 'text/html' },
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const html = await res.text();
      const titles = html.match(/<title[^>]*>([^<]+)<\/title>/gi)?.slice(0, 3) || [];
      for (const t of titles) {
        const text = t.replace(/<[^>]+>/g, '').trim();
        if (text && !text.includes('Product Hunt')) {
          results.push({ title: text, url: 'https://www.producthunt.com', source: 'ProductHunt' });
        }
      }
    }
  } catch { /* continue */ }

  return { tool: 'trending_topics', data: { topics: results, timestamp: new Date().toISOString() } };
}

async function factCheck(query: string): Promise<ToolResult> {
  // Cross-reference with multiple search sources
  const searchResult = await webSearch(query);
  return {
    tool: 'fact_check',
    data: {
      query,
      method: 'Cross-reference search results from multiple sources',
      instruction: 'Compare the claim against the search results below. Look for consensus or contradictions.',
      searchResults: searchResult.data,
      timestamp: new Date().toISOString(),
    },
  };
}

async function githubIssues(query: string): Promise<ToolResult> {
  // Check GitHub API for public repo issues
  const repoMatch = query.match(/([a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)/);
  const repo = repoMatch ? repoMatch[1] : 'antryu2b/_y';
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/issues?state=open&per_page=10&sort=updated`, {
      headers: { 'User-Agent': '_y-Agent/1.0', 'Accept': 'application/vnd.github.v3+json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const issues = await res.json();
    return {
      tool: 'github_issues',
      data: {
        repo,
        openCount: issues.length,
        issues: issues.map((i: { number: number; title: string; labels: Array<{ name: string }>; created_at: string; user: { login: string } }) => ({
          number: i.number,
          title: i.title,
          labels: i.labels.map(l => l.name),
          created: i.created_at,
          author: i.user?.login,
        })),
        timestamp: new Date().toISOString(),
      },
    };
  } catch (err) {
    return { tool: 'github_issues', data: null, error: err instanceof Error ? err.message : 'GitHub API failed' };
  }
}

async function companySummary(): Promise<ToolResult> {
  // Aggregate: market data + health check + recent activity
  const [market, health] = await Promise.all([
    marketData('sp500'),
    healthCheck(''),
  ]);
  return {
    tool: 'company_summary',
    data: {
      marketSnapshot: market.data,
      systemHealth: health.data,
      generatedAt: new Date().toISOString(),
    },
  };
}

async function colorPalette(query: string): Promise<ToolResult> {
  // Generate color suggestions based on query
  const palettes: Record<string, string[]> = {
    emerald: ['#10b981', '#059669', '#047857', '#065f46', '#064e3b'],
    corporate: ['#1e293b', '#334155', '#475569', '#64748b', '#94a3b8'],
    warm: ['#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'],
    cool: ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'],
    dark: ['#0a0a0a', '#171717', '#262626', '#404040', '#525252'],
  };

  const lower = query.toLowerCase();
  let selected = palettes.emerald; // default _y brand
  for (const [key, colors] of Object.entries(palettes)) {
    if (lower.includes(key)) { selected = colors; break; }
  }

  return {
    tool: 'color_palette',
    data: { query, palette: selected, suggestion: 'Use the first color as primary, last as darkest accent.', timestamp: new Date().toISOString() },
  };
}

async function securityHeaders(query: string): Promise<ToolResult> {
  const urlMatch = query.match(/https?:\/\/\S+/);
  const url = urlMatch ? urlMatch[0] : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`;
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    const headers: Record<string, string | null> = {
      'content-security-policy': res.headers.get('content-security-policy'),
      'strict-transport-security': res.headers.get('strict-transport-security'),
      'x-frame-options': res.headers.get('x-frame-options'),
      'x-content-type-options': res.headers.get('x-content-type-options'),
      'x-xss-protection': res.headers.get('x-xss-protection'),
      'referrer-policy': res.headers.get('referrer-policy'),
      'permissions-policy': res.headers.get('permissions-policy'),
    };
    const missing = Object.entries(headers).filter(([, v]) => !v).map(([k]) => k);
    return {
      tool: 'security_headers',
      data: { url, headers, missing, score: `${Object.values(headers).filter(Boolean).length}/7`, timestamp: new Date().toISOString() },
    };
  } catch (err) {
    return { tool: 'security_headers', data: null, error: err instanceof Error ? err.message : 'Header check failed' };
  }
}

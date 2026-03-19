

import { NextRequest, NextResponse } from 'next/server';

interface DiagnosisResult {
  agent: string;
  name: string;
  analysis: string;
  score: number;
  recommendations: string[];
}

interface GitHubData {
  repo_info?: any;
  package_json?: any;
  commits?: any[];
  languages?: any;
  error?: string;
}

interface DiagnosisResponse {
  url: string;
  github_url?: string;
  title?: string;
  meta_description?: string;
  headings: { h1: string[]; h2: string[]; h3: string[] };
  links_count: number;
  images_count: number;
  load_time: number;
  github_data?: GitHubData;
  site_type: string;
  site_type_label: string;
  total_agents: number;
  agents_selected: string[];
  phase1_summary: string;
  analysis: DiagnosisResult[];
  overall_score: number;
}

// Security analysis function
async function analyzeWebSecurity(url: string): Promise<{ security_headers: any; ssl_info?: any }> {
  try {
    const response = await fetch(url, {
      method: 'HEAD', // Only get headers, no body
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    const security_headers: any = {};
    
    // Check for common security headers
    const securityHeaderNames = [
      'x-frame-options',
      'x-content-type-options', 
      'x-xss-protection',
      'strict-transport-security',
      'content-security-policy',
      'referrer-policy',
      'permissions-policy',
      'expect-ct'
    ];
    
    securityHeaderNames.forEach(headerName => {
      const value = response.headers.get(headerName);
      if (value) {
        security_headers[headerName] = value;
      }
    });
    
    // Basic SSL info (limited in edge runtime)
    let ssl_info;
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol === 'https:') {
        // We can't get detailed certificate info in edge runtime,
        // but we can check if HTTPS is working
        ssl_info = { is_https: true };
      }
    } catch (e) {
      // Ignore SSL analysis errors
    }
    
    return { security_headers, ssl_info };
    
  } catch (error) {
    console.error('Security analysis error:', error);
    return { security_headers: {} };
  }
}

// GitHub analysis function
async function analyzeGitHub(github_url: string): Promise<GitHubData> {
  try {
    // Extract owner and repo from GitHub URL
    const urlMatch = github_url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!urlMatch) {
      throw new Error('Invalid GitHub URL format');
    }
    
    const [, owner, repo] = urlMatch;
    const repoName = repo.replace(/\.git$/, ''); // Remove .git suffix if present
    
    console.log(`Analyzing GitHub repo: ${owner}/${repoName}`);
    
    const results: GitHubData = {};
    
    // Fetch repo info
    try {
      const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'y-company-analyzer'
        },
        signal: AbortSignal.timeout(5000)
      });
      
      if (repoResponse.status === 404) {
        return { error: 'private' };
      }
      if (!repoResponse.ok) {
        throw new Error(`GitHub API error: ${repoResponse.status}`);
      }
      
      results.repo_info = await repoResponse.json();
    } catch (error) {
      console.error('Failed to fetch repo info:', error);
    }
    
    // Fetch package.json
    try {
      const packageResponse = await fetch(`https://raw.githubusercontent.com/${owner}/${repoName}/main/package.json`, {
        signal: AbortSignal.timeout(5000)
      });
      
      if (packageResponse.ok) {
        results.package_json = await packageResponse.json();
      } else {
        // Try with 'master' branch
        const masterResponse = await fetch(`https://raw.githubusercontent.com/${owner}/${repoName}/master/package.json`, {
          signal: AbortSignal.timeout(5000)
        });
        if (masterResponse.ok) {
          results.package_json = await masterResponse.json();
        }
      }
    } catch (error) {
      console.error('Failed to fetch package.json:', error);
    }
    
    // Fetch recent commits
    try {
      const commitsResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/commits?per_page=5`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'y-company-analyzer'
        },
        signal: AbortSignal.timeout(5000)
      });
      
      if (commitsResponse.ok) {
        results.commits = await commitsResponse.json();
      }
    } catch (error) {
      console.error('Failed to fetch commits:', error);
    }
    
    // Fetch languages
    try {
      const languagesResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/languages`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'y-company-analyzer'
        },
        signal: AbortSignal.timeout(5000)
      });
      
      if (languagesResponse.ok) {
        results.languages = await languagesResponse.json();
      }
    } catch (error) {
      console.error('Failed to fetch languages:', error);
    }
    
    return results;
    
  } catch (error) {
    console.error('GitHub analysis error:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Site type classification (Phase 1)
function classifySiteType(data: any, githubData?: GitHubData): { type: string, label: string, summary: string } {
  const { title, meta_description, headings, links_count, images_count } = data;
  
  const textContent = `${title || ''} ${meta_description || ''} ${headings.h1?.join(' ') || ''} ${headings.h2?.join(' ') || ''}`.toLowerCase();
  
  // E-commerce detection
  if (textContent.match(/\b(shop|store|cart|product|price|buy|order|payment|checkout|ecommerce)\b/)) {
    return { 
      type: 'ecommerce', 
      label: 'E-commerce Platform',
      summary: `Detected e-commerce platform with ${links_count} navigation links and ${images_count} product images`
    };
  }
  
  // SaaS detection
  if (textContent.match(/\b(dashboard|api|platform|cloud|software|app|pricing|subscription|saas)\b/) || 
      githubData?.package_json?.dependencies?.react || githubData?.package_json?.dependencies?.vue) {
    return { 
      type: 'saas', 
      label: 'SaaS Platform',
      summary: `Detected SaaS platform with ${githubData?.languages ? `${Object.keys(githubData.languages)[0]}` : 'web'} frontend`
    };
  }
  
  // Media/Blog detection
  if (headings.h2?.length > 10 || links_count > 50 || textContent.match(/\b(article|blog|news|media|content|post)\b/)) {
    return { 
      type: 'media', 
      label: 'Media/Blog Site',
      summary: `Content-rich site with ${headings.h2?.length || 0} articles and extensive navigation`
    };
  }
  
  // Finance detection
  if (textContent.match(/\b(trading|invest|fund|portfolio|market|finance|crypto|stock)\b/)) {
    return { 
      type: 'finance', 
      label: 'Finance Platform',
      summary: `Financial platform detected with market-related content and trading features`
    };
  }
  
  // Corporate detection
  if (textContent.match(/\b(company|about|team|careers|enterprise|corporate|business)\b/)) {
    return { 
      type: 'corporate', 
      label: 'Corporate Website',
      summary: `Corporate website with ${links_count} pages and company information`
    };
  }
  
  // Default: General/Startup
  return { 
    type: 'general', 
    label: 'General/Startup',
    summary: `General website with ${links_count} links, categorized for comprehensive analysis`
  };
}

// Agent selection based on site type (Phase 2)
function selectAgents(siteType: string): string[] {
  const commonAgents = ['searchy', 'skepty', 'counsely'];
  
  switch (siteType) {
    case 'ecommerce':
      return [...commonAgents, 'selly', 'quanty', 'buzzy', 'pixely', 'logoy'];
    case 'saas':
      return [...commonAgents, 'stacky', 'buildy', 'guardy', 'testy', 'opsy'];
    case 'media':
      return [...commonAgents, 'wordy', 'buzzy', 'pixely', 'globy'];
    case 'finance':
      return [...commonAgents, 'quanty', 'tradey', 'hedgy', 'valuey', 'finy'];
    case 'corporate':
      return [...commonAgents, 'buzzy', 'hiry', 'growthy', 'evaly', 'wordy'];
    default: // general
      return [...commonAgents, 'buzzy', 'stacky', 'guardy', 'quanty'];
  }
}

// New agent analysis functions
function sellyAnalysis(data: any): DiagnosisResult {
  const { links_count, images_count, headings } = data;
  let score = 80;
  const recommendations: string[] = [];
  
  // E-commerce specific analysis
  const productPages = headings.h2?.filter((h: string) => h.toLowerCase().includes('product')).length || 0;
  
  if (productPages === 0) {
    score -= 15;
    recommendations.push("No product pages detected. Add product showcase sections");
  }
  
  if (images_count < 5) {
    score -= 20;
    recommendations.push("E-commerce needs more product images. Minimum 5+ images recommended");
  }
  
  if (links_count < 10) {
    score -= 10;
    recommendations.push("Add category navigation and product links");
  }
  
  return {
    agent: 'selly',
    name: 'Selly',
    analysis: `E-commerce analysis: ${productPages} product sections, ${images_count} images. Cart and checkout flow needs verification.`,
    score: Math.max(score, 10),
    recommendations
  };
}

function quantyAnalysis(data: any): DiagnosisResult {
  const { load_time, links_count, images_count } = data;
  let score = 80;
  const recommendations: string[] = [];
  
  // Performance metrics analysis
  const estimatedTraffic = Math.min(links_count * 100, 50000);
  
  if (load_time > 2000) {
    score -= 15;
    recommendations.push("Page load time impacts conversion. Optimize for <2s");
  }
  
  if (links_count < 20) {
    score -= 10;
    recommendations.push("Low internal linking reduces engagement metrics");
  }
  
  if (estimatedTraffic < 1000) {
    score -= 5;
    recommendations.push("Site structure suggests low organic traffic potential");
  }
  
  return {
    agent: 'quanty',
    name: 'Quanty',
    analysis: `Traffic analysis: Estimated ${estimatedTraffic.toLocaleString()} monthly visitors potential. Load time: ${(load_time/1000).toFixed(1)}s.`,
    score: Math.max(score, 10),
    recommendations
  };
}

function pixelyAnalysis(data: any): DiagnosisResult {
  const { images_count, headings } = data;
  let score = 80;
  const recommendations: string[] = [];
  
  // Design and UX analysis
  if (images_count === 0) {
    score -= 20;
    recommendations.push("No images found. Visual content essential for engagement");
  } else if (images_count < 3) {
    score -= 10;
    recommendations.push("Add more visual elements to improve user experience");
  }
  
  const headingStructure = (headings.h1?.length || 0) + (headings.h2?.length || 0);
  if (headingStructure < 3) {
    score -= 15;
    recommendations.push("Improve content hierarchy with proper heading structure");
  }
  
  if (images_count > 20) {
    score -= 5;
    recommendations.push("Too many images may slow loading. Consider image optimization");
  }
  
  return {
    agent: 'pixely',
    name: 'Pixely',
    analysis: `Design analysis: ${images_count} visual elements, ${headingStructure} heading structure. Layout hierarchy needs attention.`,
    score: Math.max(score, 10),
    recommendations
  };
}

function wordyAnalysis(data: any): DiagnosisResult {
  const { title, meta_description, headings } = data;
  let score = 80;
  const recommendations: string[] = [];
  
  // Content analysis
  const titleLength = title?.length || 0;
  const metaLength = meta_description?.length || 0;
  const totalHeadings = (headings.h1?.length || 0) + (headings.h2?.length || 0) + (headings.h3?.length || 0);
  
  if (titleLength < 30 || titleLength > 60) {
    score -= 15;
    recommendations.push("Optimize title length (30-60 characters for SEO)");
  }
  
  if (metaLength < 120 || metaLength > 160) {
    score -= 10;
    recommendations.push("Optimize meta description (120-160 characters)");
  }
  
  if (totalHeadings < 5) {
    score -= 10;
    recommendations.push("Add more content sections with proper headings");
  }
  
  return {
    agent: 'wordy',
    name: 'Wordy',
    analysis: `Content analysis: ${titleLength}-char title, ${totalHeadings} content sections. Readability and tone optimization needed.`,
    score: Math.max(score, 10),
    recommendations
  };
}

function buildyAnalysis(githubData: GitHubData): DiagnosisResult {
  let score = 80;
  const recommendations: string[] = [];
  
  if (!githubData || githubData.error) {
    return {
      agent: 'buildy',
      name: 'Buildy',
      analysis: 'No build system data available. Repository access required for analysis.',
      score: 50,
      recommendations: ['Connect GitHub repository for build analysis']
    };
  }
  
  const { package_json, languages } = githubData;
  
  if (package_json) {
    const scripts = Object.keys(package_json.scripts || {});
    const hasModernBuild = scripts.some(s => s.includes('build') || s.includes('webpack') || s.includes('vite'));
    
    if (!hasModernBuild) {
      score -= 20;
      recommendations.push("Add modern build system (Webpack/Vite/Next.js)");
    }
    
    if (!scripts.includes('test')) {
      score -= 10;
      recommendations.push("Add automated testing to build pipeline");
    }
    
    const bundleSize = Object.keys(package_json.dependencies || {}).length;
    if (bundleSize > 30) {
      score -= 15;
      recommendations.push(`${bundleSize} dependencies. Consider bundle optimization`);
    }
  }
  
  return {
    agent: 'buildy',
    name: 'Buildy',
    analysis: `Build system analysis: ${languages ? Object.keys(languages)[0] : 'Unknown'} project with ${Object.keys(package_json?.dependencies || {}).length} dependencies.`,
    score: Math.max(score, 10),
    recommendations
  };
}

function testyAnalysis(data: any, githubData?: GitHubData): DiagnosisResult {
  const { load_time, title } = data;
  let score = 80;
  const recommendations: string[] = [];
  
  // QA and testing analysis
  if (load_time > 3000) {
    score -= 15;
    recommendations.push("Performance issues detected. Load time >3s affects UX");
  }
  
  if (!title) {
    score -= 20;
    recommendations.push("Missing page title - critical accessibility issue");
  }
  
  if (githubData?.package_json) {
    const devDeps = Object.keys(githubData.package_json.devDependencies || {});
    const hasTestFramework = devDeps.some(dep => 
      dep.includes('jest') || dep.includes('test') || dep.includes('cypress')
    );
    
    if (!hasTestFramework) {
      score -= 25;
      recommendations.push("No testing framework detected. Add Jest/Cypress for quality assurance");
    }
  }
  
  return {
    agent: 'testy',
    name: 'Testy',
    analysis: `QA analysis: ${(load_time/1000).toFixed(1)}s load time, ${!title ? 'accessibility' : 'basic'} issues found. Testing coverage unknown.`,
    score: Math.max(score, 10),
    recommendations
  };
}

function opsyAnalysis(data: any): DiagnosisResult {
  const { load_time, security_headers } = data;
  let score = 80;
  const recommendations: string[] = [];
  
  // Infrastructure analysis
  if (load_time > 2000) {
    score -= 10;
    recommendations.push("Consider CDN implementation for faster global delivery");
  }
  
  const securityScore = Object.keys(security_headers || {}).length;
  if (securityScore < 3) {
    score -= 20;
    recommendations.push("Insufficient security headers. Review hosting security config");
  }
  
  if (load_time > 5000) {
    score -= 15;
    recommendations.push("Server response time critical. Consider infrastructure upgrade");
  }
  
  return {
    agent: 'opsy',
    name: 'Opsy',
    analysis: `Infrastructure analysis: ${(load_time/1000).toFixed(1)}s response time, ${securityScore} security headers. CDN status unknown.`,
    score: Math.max(score, 10),
    recommendations
  };
}

function growthyAnalysis(data: any): DiagnosisResult {
  const { title, meta_description, links_count, headings } = data;
  let score = 80;
  const recommendations: string[] = [];
  
  // Growth and SEO analysis
  const hasKeywords = title?.toLowerCase().includes('ai') || meta_description?.toLowerCase().includes('startup');
  if (!hasKeywords) {
    score -= 15;
    recommendations.push("Add growth keywords to title and meta for better discovery");
  }
  
  if (links_count < 15) {
    score -= 10;
    recommendations.push("Increase internal linking for better SEO authority");
  }
  
  const contentSections = headings.h2?.length || 0;
  if (contentSections < 3) {
    score -= 10;
    recommendations.push("Add more content sections for topic authority");
  }
  
  return {
    agent: 'growthy',
    name: 'Growthy',
    analysis: `Growth analysis: ${contentSections} content sections, ${links_count} internal links. SEO optimization potential identified.`,
    score: Math.max(score, 10),
    recommendations
  };
}

function hiryAnalysis(data: any): DiagnosisResult {
  const { headings, links_count } = data;
  let score = 80;
  const recommendations: string[] = [];
  
  // HR and team analysis
  const hasCareers = headings.h1?.some((h: string) => h.toLowerCase().includes('career')) || 
                    headings.h2?.some((h: string) => h.toLowerCase().includes('job')) || false;
  
  if (!hasCareers) {
    score -= 15;
    recommendations.push("Add careers page to attract talent and show growth");
  }
  
  const hasTeam = headings.h2?.some((h: string) => h.toLowerCase().includes('team')) || false;
  if (!hasTeam) {
    score -= 10;
    recommendations.push("Add team section to build trust and credibility");
  }
  
  if (links_count < 10) {
    score -= 5;
    recommendations.push("Expand site navigation to showcase company culture");
  }
  
  return {
    agent: 'hiry',
    name: 'Hiry',
    analysis: `HR analysis: ${hasCareers ? 'Careers page found' : 'No careers section'}, ${hasTeam ? 'team info available' : 'team section missing'}.`,
    score: Math.max(score, 10),
    recommendations
  };
}

function tradeyAnalysis(data: any): DiagnosisResult {
  const { title, meta_description, headings } = data;
  let score = 80;
  const recommendations: string[] = [];
  
  // Market and trading analysis
  const hasMarketTerms = `${title} ${meta_description}`.toLowerCase()
    .match(/\b(trade|market|invest|price|chart|portfolio)\b/);
  
  if (!hasMarketTerms) {
    score -= 20;
    recommendations.push("Add market terminology for financial platform positioning");
  }
  
  const hasDataViz = headings.h2?.some((h: string) => h.toLowerCase().includes('chart') || h.toLowerCase().includes('data'));
  if (!hasDataViz) {
    score -= 15;
    recommendations.push("Add data visualization sections for market analysis");
  }
  
  return {
    agent: 'tradey',
    name: 'Tradey',
    analysis: `Market analysis: ${hasMarketTerms ? 'Financial' : 'Non-financial'} platform, ${hasDataViz ? 'data-driven' : 'missing analytics'} approach.`,
    score: Math.max(score, 10),
    recommendations
  };
}

// Additional agents for specialized analysis
function logoyAnalysis(data: any): DiagnosisResult {
  const { images_count, title } = data;
  let score = 80;
  const recommendations: string[] = [];
  
  // Brand and logo analysis
  if (images_count === 0) {
    score -= 25;
    recommendations.push("No brand visuals found. Add logo and brand imagery");
  } else if (images_count < 2) {
    score -= 15;
    recommendations.push("Add more brand elements and visual identity");
  }
  
  const hasBrandTitle = title?.length > 0 && !title.includes('Index');
  if (!hasBrandTitle) {
    score -= 10;
    recommendations.push("Improve brand messaging in page title");
  }
  
  return {
    agent: 'logoy',
    name: 'Logoy',
    analysis: `Brand analysis: ${images_count} visual elements, ${hasBrandTitle ? 'branded' : 'generic'} messaging. Brand identity needs development.`,
    score: Math.max(score, 10),
    recommendations
  };
}

function globyAnalysis(data: any): DiagnosisResult {
  const { headings, meta_description } = data;
  let score = 80;
  const recommendations: string[] = [];
  
  // Global reach analysis
  const hasIntlContent = headings.h2?.some((h: string) => h.toLowerCase().includes('global') || h.toLowerCase().includes('international'));
  if (!hasIntlContent) {
    score -= 10;
    recommendations.push("Add international/global content sections");
  }
  
  const metaLength = meta_description?.length || 0;
  if (metaLength < 100) {
    score -= 15;
    recommendations.push("Expand meta description for better global SEO");
  }
  
  return {
    agent: 'globy',
    name: 'Globy',
    analysis: `Global reach: ${hasIntlContent ? 'International' : 'Local'} content approach, ${metaLength}-char meta description.`,
    score: Math.max(score, 10),
    recommendations
  };
}

function evalyAnalysis(data: any): DiagnosisResult {
  const { title, headings, links_count } = data;
  let score = 80;
  const recommendations: string[] = [];
  
  // Evaluation and assessment analysis
  const hasMetrics = headings.h2?.some((h: string) => h.toLowerCase().includes('result') || h.toLowerCase().includes('metric'));
  if (!hasMetrics) {
    score -= 15;
    recommendations.push("Add results/metrics sections to demonstrate value");
  }
  
  if (links_count < 8) {
    score -= 10;
    recommendations.push("Increase navigation depth for comprehensive evaluation");
  }
  
  return {
    agent: 'evaly',
    name: 'Evaly',
    analysis: `Evaluation analysis: ${hasMetrics ? 'Metrics' : 'No metrics'} present, ${links_count} evaluation touchpoints.`,
    score: Math.max(score, 10),
    recommendations
  };
}

function hedgyAnalysis(data: any): DiagnosisResult {
  const { title, meta_description, security_headers } = data;
  let score = 80;
  const recommendations: string[] = [];
  
  // Risk management analysis
  const hasRiskTerms = `${title} ${meta_description}`.toLowerCase()
    .match(/\b(risk|hedge|protect|secure|safe|insurance)\b/);
  
  if (!hasRiskTerms) {
    score -= 15;
    recommendations.push("Add risk management messaging for financial credibility");
  }
  
  const securityLevel = Object.keys(security_headers || {}).length;
  if (securityLevel < 2) {
    score -= 20;
    recommendations.push("Enhance security headers for financial platform trust");
  }
  
  return {
    agent: 'hedgy',
    name: 'Hedgy',
    analysis: `Risk analysis: ${hasRiskTerms ? 'Risk-aware' : 'Risk-neutral'} messaging, ${securityLevel} security measures.`,
    score: Math.max(score, 10),
    recommendations
  };
}

function valueyAnalysis(data: any): DiagnosisResult {
  const { title, headings, links_count } = data;
  let score = 80;
  const recommendations: string[] = [];
  
  // Value proposition analysis
  const hasValueTerms = title?.toLowerCase().match(/\b(value|benefit|advantage|solution)\b/);
  if (!hasValueTerms) {
    score -= 15;
    recommendations.push("Strengthen value proposition in main messaging");
  }
  
  const benefitSections = headings.h2?.filter((h: string) => 
    h.toLowerCase().includes('benefit') || h.toLowerCase().includes('feature')
  ).length || 0;
  
  if (benefitSections < 2) {
    score -= 10;
    recommendations.push("Add more value proposition sections");
  }
  
  return {
    agent: 'valuey',
    name: 'Valuey',
    analysis: `Value analysis: ${hasValueTerms ? 'Clear' : 'Unclear'} value prop, ${benefitSections} benefit sections highlighted.`,
    score: Math.max(score, 10),
    recommendations
  };
}

function finyAnalysis(data: any, githubData?: GitHubData): DiagnosisResult {
  const { title, headings } = data;
  let score = 80;
  const recommendations: string[] = [];
  
  // Financial technology analysis
  const hasFintech = title?.toLowerCase().match(/\b(fintech|payment|banking|finance)\b/);
  if (!hasFintech) {
    score -= 10;
    recommendations.push("Position as fintech solution for better market fit");
  }
  
  if (githubData?.languages?.JavaScript || githubData?.languages?.TypeScript) {
    score += 5; // Modern tech stack bonus
  } else {
    score -= 5;
    recommendations.push("Consider modern JS/TS stack for fintech development");
  }
  
  return {
    agent: 'finy',
    name: 'Finy',
    analysis: `Fintech analysis: ${hasFintech ? 'Finance-focused' : 'Non-finance'} positioning, ${githubData?.languages ? 'modern' : 'unknown'} tech stack.`,
    score: Math.max(score, 10),
    recommendations
  };
}

// Agent analysis functions
function searchyAnalysis(data: any): DiagnosisResult {
  const { title, meta_description, headings, links_count, images_count } = data;
  
  let score = 80;
  const recommendations: string[] = [];
  
  // SPA detection — if minimal content, likely client-rendered
  const isSPA = (!headings.h1 || headings.h1.length === 0) && links_count < 3 && images_count === 0;
  
  // SEO Analysis
  if (!title || title.length < 30) {
    score -= isSPA ? 5 : 8;
    recommendations.push("Title is too short. 30-60 characters recommended");
  }
  if (!meta_description || meta_description.length < 120) {
    score -= isSPA ? 5 : 8; 
    recommendations.push("Meta description is insufficient. 120-160 characters recommended");
  }
  if (!headings.h1 || headings.h1.length === 0) {
    score -= isSPA ? 5 : 12;
    if (isSPA) recommendations.push("H1 tag not found (may be client-rendered SPA)");
    else recommendations.push("H1 tag is missing");
  }
  if (links_count < 5) {
    score -= isSPA ? 2 : 5;
    recommendations.push("Add more internal links");
  }
  if (images_count === 0) {
    score -= isSPA ? 2 : 5;
    if (!isSPA) recommendations.push("Add images to enrich content");
  }
  
  const analysis = `Site structure analysis complete. Found ${links_count} links and ${images_count} images. ${title ? `Title: "${title}"` : 'Title missing'}`;
  
  return {
    agent: 'searchy',
    name: 'Searchy',
    analysis,
    score: Math.max(score, 10),
    recommendations
  };
}

function skeptyAnalysis(data: any): DiagnosisResult {
  const { load_time, headings, links_count, security_headers, ssl_info } = data;
  
  let score = 85;
  const recommendations: string[] = [];
  
  // Performance & Security Issues
  if (load_time > 3000) {
    score -= 20;
    recommendations.push("Loading speed is slow (over 3 seconds). Consider image optimization or CDN");
  } else if (load_time > 1500) {
    score -= 10;
    recommendations.push("Loading speed can be improved");
  }
  
  // Security headers analysis
  if (security_headers) {
    if (!security_headers['x-frame-options'] && !security_headers['content-security-policy']) {
      score -= 15;
      recommendations.push("X-Frame-Options header missing - vulnerable to clickjacking attacks");
    }
    
    if (!security_headers['strict-transport-security']) {
      score -= 10;
      recommendations.push("HSTS header missing - HTTPS enforcement recommended");
    }
    
    if (!security_headers['x-content-type-options']) {
      score -= 5;
      recommendations.push("X-Content-Type-Options header missing");
    }
  }
  
  // SSL certificate analysis
  if (ssl_info?.days_until_expiry !== undefined) {
    if (ssl_info.days_until_expiry < 30) {
      score -= 20;
      recommendations.push(`SSL certificate expiring soon (${ssl_info.days_until_expiry} days remaining)`);
    } else if (ssl_info.days_until_expiry < 90) {
      score -= 10;
      recommendations.push(`SSL certificate renewal scheduled (${ssl_info.days_until_expiry} days remaining)`);
    }
  }
  
  // Too many or too few headings
  const totalHeadings = (headings.h1?.length || 0) + (headings.h2?.length || 0) + (headings.h3?.length || 0);
  if (totalHeadings > 20) {
    score -= 10;
    recommendations.push("Too many heading tags. Negative impact on SEO");
  }
  
  // Excessive links might indicate spam
  if (links_count > 100) {
    score -= 15;
    recommendations.push("Excessive number of links. May be suspected as spam");
  }
  
  const securityFeatures = security_headers ? Object.keys(security_headers).length : 0;
  const analysis = `Security and performance risk assessment. Loading time: ${(load_time/1000).toFixed(1)}s, ${securityFeatures} security headers found. ${recommendations.length} issues identified.`;
  
  return {
    agent: 'skepty',
    name: 'Skepty', 
    analysis,
    score: Math.max(score, 10),
    recommendations
  };
}

function buzzyAnalysis(data: any): DiagnosisResult {
  const { title, meta_description, images_count, headings } = data;
  
  let score = 82;
  const recommendations: string[] = [];
  
  // Marketing perspective
  if (!title || !title.includes('AI') && !title.includes('startup') && !title.includes('investment')) {
    score -= 10;
    recommendations.push("Title lacks key keywords");
  }
  
  if (images_count < 3) {
    score -= 10;
    recommendations.push("Visual content is lacking. Unfavorable for social media sharing");
  }
  
  if (!meta_description || !meta_description.includes('AI') && !meta_description.includes('innovation')) {
    score -= 10;
    recommendations.push("Meta description is not compelling. Click-through rate improvement needed");
  }
  
  const h2Count = headings.h2?.length || 0;
  if (h2Count < 2) {
    score -= 5;
    recommendations.push("Make section structure clearer (utilize H2 tags)");
  }
  
  const analysis = `Brand message analysis from marketing perspective. Found ${images_count} visual elements and ${h2Count} structural sections.`;
  
  return {
    agent: 'buzzy', 
    name: 'Buzzy',
    analysis,
    score: Math.max(score, 10),
    recommendations
  };
}

function stackyAnalysis(githubData: GitHubData): DiagnosisResult {
  let score = 85;
  const recommendations: string[] = [];
  
  if (!githubData || githubData.error) {
    return {
      agent: 'stacky',
      name: 'Stacky',
      analysis: githubData?.error === 'private' 
        ? 'Private repositories cannot be analyzed. Please set to public or use another repository.'
        : 'Cannot load GitHub data, limiting technical stack analysis.',
      score: 50,
      recommendations: ['Check GitHub repository accessibility']
    };
  }

  const { package_json, languages, repo_info } = githubData;
  
  // 기술 스택 분석
  if (package_json) {
    const deps = Object.keys(package_json.dependencies || {});
    const devDeps = Object.keys(package_json.devDependencies || {});
    
    // 보안 취약한 패키지 체크 (예시)
    const vulnerablePackages = deps.filter(dep => 
      dep.includes('lodash') || dep.includes('moment') || dep.includes('express') && !dep.includes('@')
    );
    
    if (vulnerablePackages.length > 0) {
      score -= vulnerablePackages.length * 5;
      recommendations.push(`Vulnerable packages found: ${vulnerablePackages.slice(0,3).join(', ')}`);
    }
    
    //  dependencies, 관리
    if (deps.length > 50) {
      score -= 10;
      recommendations.push("Too many dependencies. Consider bundle size optimization");
    }
    
    // TypeScript 사용 여부
    if (!devDeps.includes('typescript') && !devDeps.includes('@types/node')) {
      score -= 15;
      recommendations.push("Consider adopting TypeScript for type safety");
    }
  }
  
  // 언어 분포 분석
  if (languages) {
    const mainLanguage = Object.keys(languages)[0];
    const languageCount = Object.keys(languages).length;
    
    if (languageCount > 5) {
      score -= 5;
      recommendations.push("Too many languages. Consider consolidating tech stack");
    }
    
    if (mainLanguage === 'JavaScript' && !languages['TypeScript']) {
      score -= 10;
      recommendations.push("JavaScript → TypeScript migration recommended");
    }
  }
  
  const techStack = languages ? Object.keys(languages).slice(0,3).join(', ') : 'Unable to analyze';
  const depCount = package_json ? Object.keys(package_json.dependencies || {}).length : 0;
  
  const analysis = `Tech stack analysis: ${techStack}. ${depCount} dependencies, ${recommendations.length} optimization points found.`;
  
  return {
    agent: 'stacky',
    name: 'Stacky',
    analysis,
    score: Math.max(score, 10),
    recommendations
  };
}

function guardyAnalysis(data: any, githubData: GitHubData): DiagnosisResult {
  let score = 85;
  const recommendations: string[] = [];
  
  // GitHub 보안 분석
  if (githubData && !githubData.error) {
    const { package_json, repo_info } = githubData;
    
    // package.json 보안 체크
    if (package_json) {
      const scripts = package_json.scripts || {};
      
      // 위험한 스크립트 체크
      Object.entries(scripts).forEach(([name, script]: [string, any]) => {
        if (typeof script === 'string' && (script.includes('rm -rf') || script.includes('sudo'))) {
          score -= 15;
          recommendations.push(`Dangerous script found: ${name}`);
        }
      });
      
      //  dependencies, 보안 체크
      const deps = Object.keys(package_json.dependencies || {});
      const outdatedPackages = deps.filter(dep => 
        dep === 'node-sass' || dep === 'bower' || dep.includes('gulp')
      );
      
      if (outdatedPackages.length > 0) {
        score -= 10;
        recommendations.push(`Outdated packages: ${outdatedPackages.join(', ')}`);
      }
    }
    
    // 레포 보안 설정
    if (repo_info) {
      if (repo_info.has_issues !== false) {
        score += 5; // 이슈 트래킹 활성화는 좋음
      }
      
      if (repo_info.default_branch !== 'main' && repo_info.default_branch !== 'master') {
        recommendations.push("Recommend renaming default branch to 'main'");
      }
    }
  }
  
  // URL 기반 보안 헤더 분석 (현재 구현에서는 헤더 정보 제한적)
  const { load_time, title } = data;
  
  if (load_time > 5000) {
    score -= 10;
    recommendations.push("Loading time exceeded - potentially vulnerable to DDoS");
  }
  
  // 기본적인 보안 체크
  if (!title || title.includes('index of') || title.includes('directory listing')) {
    score -= 20;
    recommendations.push("Directory listing exposure risk - check server config");
  }
  
  const analysis = githubData && !githubData.error 
    ? `Security check complete. GitHub security: ${score >= 80 ? 'Good' : 'Warning'}, ${recommendations.filter(r => r.includes('package') || r.includes('Vulnerable')).length} vulnerability issues found.`
    : `Website security check complete. ${recommendations.length} issues found.`;
  
  return {
    agent: 'guardy',
    name: 'Guardy',
    analysis,
    score: Math.max(score, 10),
    recommendations
  };
}

function counselyAnalysis(allAnalysis: DiagnosisResult[]): DiagnosisResult {
  const avgScore = allAnalysis.reduce((sum, a) => sum + a.score, 0) / allAnalysis.length;
  const allRecommendations = allAnalysis.flatMap(a => a.recommendations);
  
  let recommendations: string[] = [];
  if (avgScore < 60) {
    recommendations.push("Urgent improvements needed across SEO, performance, and content");
  } else if (avgScore < 75) {
    recommendations.push("Good overall, but several areas need improvement");
  } else {
    recommendations.push("Excellent website. Continued monitoring recommended");
  }
  
  // Top priority recommendations
  if (allRecommendations.includes("Title is too short. 30-60 characters recommended")) {
    recommendations.push("Priority 1: Optimize page title");
  }
  if (allRecommendations.some(r => r.includes("loading"))) {
    recommendations.push("Priority 2: Improve website performance");
  }
  
  const analysis = `Overall score: ${Math.round(avgScore)}. ${allAnalysis.length} agents found ${allRecommendations.length} issues. Status: ${avgScore >= 75 ? 'Excellent' : avgScore >= 60 ? 'Good' : 'Needs improvement'}.`;
  
  return {
    agent: 'counsely',
    name: 'Counsely', 
    analysis,
    score: Math.round(avgScore),
    recommendations: recommendations.slice(0, 3) // Limit to top 3
  };
}

export async function POST(req: NextRequest) {
  try {
    const { url, github_url } = await req.json();
    
    if (!url && !github_url) {
      return NextResponse.json({ error: 'URL or GitHub URL is required' }, { status: 400 });
    }
    
    // Validate URLs
    if (url) {
      try {
        new URL(url);
      } catch {
        return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
      }
    }
    
    if (github_url) {
      if (!github_url.includes('github.com')) {
        return NextResponse.json({ error: 'Invalid GitHub URL format' }, { status: 400 });
      }
    }
    
    console.log('Analyzing:', { url, github_url });
    const startTime = Date.now();
    
    try {
      let data: any = {
        title: undefined,
        meta_description: undefined,
        headings: { h1: [], h2: [], h3: [] },
        links_count: 0,
        images_count: 0,
        load_time: 0
      };
      
      let githubData: GitHubData | undefined;
      
      // Analyze URL if provided
      if (url) {
        try {
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            signal: AbortSignal.timeout(10000)
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const html = await response.text();
          const loadTime = Date.now() - startTime;
          
          // Parse HTML
          const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
          const title = titleMatch ? titleMatch[1].trim() : undefined;
          
          const metaDescMatch = html.match(/<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']*)["\'][^>]*>/i);
          const meta_description = metaDescMatch ? metaDescMatch[1] : undefined;
          
          // Extract headings
          const h1Matches = html.match(/<h1[^>]*>([^<]*)<\/h1>/gi) || [];
          const h2Matches = html.match(/<h2[^>]*>([^<]*)<\/h2>/gi) || [];
          const h3Matches = html.match(/<h3[^>]*>([^<]*)<\/h3>/gi) || [];
          
          const headings = {
            h1: h1Matches.map(h => h.replace(/<[^>]*>/g, '').trim()),
            h2: h2Matches.map(h => h.replace(/<[^>]*>/g, '').trim()), 
            h3: h3Matches.map(h => h.replace(/<[^>]*>/g, '').trim())
          };
          
          // Count links and images
          const links_count = (html.match(/<a[^>]*href=/gi) || []).length;
          const images_count = (html.match(/<img[^>]*src=/gi) || []).length;
          
          // Analyze security (run in parallel)
          const securityAnalysisPromise = analyzeWebSecurity(url);
          
          data = {
            title,
            meta_description,
            headings,
            links_count,
            images_count,
            load_time: loadTime
          };
          
          // Add security analysis results
          try {
            const securityResults = await securityAnalysisPromise;
            data.security_headers = securityResults.security_headers;
            data.ssl_info = securityResults.ssl_info;
          } catch (securityError) {
            console.error('Security analysis failed:', securityError);
          }
          
        } catch (urlError) {
          console.error('URL analysis error:', urlError);
          if (!github_url) {
            // If no GitHub URL as backup, return error
            throw urlError;
          }
        }
      }
      
      // Analyze GitHub if provided
      if (github_url) {
        githubData = await analyzeGitHub(github_url);
      }
      
      // PHASE 1: Site type classification
      const siteClassification = classifySiteType(data, githubData);
      
      // PHASE 2: Select agents based on site type
      const selectedAgents = selectAgents(siteClassification.type);
      
      // Run agent analysis
      const analysis: DiagnosisResult[] = [];
      
      // Run analysis for each selected agent
      for (const agentId of selectedAgents) {
        try {
          let agentResult: DiagnosisResult;
          
          switch (agentId) {
            case 'searchy':
              agentResult = searchyAnalysis(data);
              break;
            case 'skepty':
              agentResult = skeptyAnalysis(data);
              break;
            case 'buzzy':
              agentResult = buzzyAnalysis(data);
              break;
            case 'stacky':
              agentResult = stackyAnalysis(githubData!);
              break;
            case 'guardy':
              agentResult = guardyAnalysis(data, githubData!);
              break;
            case 'counsely':
              // Counsely analyzes other agents, so run at the end
              continue;
            case 'selly':
              agentResult = sellyAnalysis(data);
              break;
            case 'quanty':
              agentResult = quantyAnalysis(data);
              break;
            case 'pixely':
              agentResult = pixelyAnalysis(data);
              break;
            case 'wordy':
              agentResult = wordyAnalysis(data);
              break;
            case 'buildy':
              agentResult = buildyAnalysis(githubData!);
              break;
            case 'testy':
              agentResult = testyAnalysis(data, githubData);
              break;
            case 'opsy':
              agentResult = opsyAnalysis(data);
              break;
            case 'growthy':
              agentResult = growthyAnalysis(data);
              break;
            case 'hiry':
              agentResult = hiryAnalysis(data);
              break;
            case 'tradey':
              agentResult = tradeyAnalysis(data);
              break;
            case 'logoy':
              agentResult = logoyAnalysis(data);
              break;
            case 'globy':
              agentResult = globyAnalysis(data);
              break;
            case 'evaly':
              agentResult = evalyAnalysis(data);
              break;
            case 'hedgy':
              agentResult = hedgyAnalysis(data);
              break;
            case 'valuey':
              agentResult = valueyAnalysis(data);
              break;
            case 'finy':
              agentResult = finyAnalysis(data, githubData);
              break;
            default:
              continue;
          }
          
          analysis.push(agentResult);
        } catch (agentError) {
          console.error(`Error in ${agentId} analysis:`, agentError);
          // Continue with other agents even if one fails
        }
      }
      
      // Add Counsely analysis at the end (if it was selected)
      if (selectedAgents.includes('counsely') && analysis.length > 0) {
        analysis.push(counselyAnalysis(analysis));
      }
      
      const overall_score = analysis.length > 0 
        ? Math.round(analysis.reduce((sum, a) => sum + a.score, 0) / analysis.length)
        : 50;
      
      const result: DiagnosisResponse = {
        url: url || 'GitHub Only Analysis',
        github_url,
        title: data.title,
        meta_description: data.meta_description,
        headings: data.headings,
        links_count: data.links_count,
        images_count: data.images_count,
        load_time: data.load_time,
        github_data: githubData,
        site_type: siteClassification.type,
        site_type_label: siteClassification.label,
        total_agents: selectedAgents.length,
        agents_selected: selectedAgents,
        phase1_summary: siteClassification.summary,
        analysis,
        overall_score
      };
      
      return NextResponse.json(result);
      
    } catch (analysisError) {
      console.error('Analysis error:', analysisError);
      return NextResponse.json({ 
        error: url 
          ? `Cannot access website: ${analysisError instanceof Error ? analysisError.message : 'Unknown error'}`
          : `Analysis error: ${analysisError instanceof Error ? analysisError.message : 'Unknown error'}`
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Diagnosis error:', error);
    return NextResponse.json({ 
      error: 'Internal server error'
    }, { status: 500 });
  }
}
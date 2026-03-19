import React from 'react';

/**
 * Translate Korean report tags to English based on lang
 */
/**
 * Korean → English translation map for known seed/demo data
 * Used when lang === 'en' to display DB content in English
 */
const KO_EN_MAP: Record<string, string> = {
  // Decisions
  'GitHub Trending: 7개 고관련 AI 레포 발견': 'GitHub Trending: 7 AI-related repos discovered',
  '주간 마케팅 이메일 발송 요청': 'Weekly marketing email dispatch request',
  'EdgeAI Solutions 스타트업 Series A 투자 검토 ($15M)': 'EdgeAI Solutions Series A investment review ($15M)',
  'OpenAI GPT-5 출시 대응 전략 수립': 'OpenAI GPT-5 launch response strategy',
  '_y Holdings AI 투자 플랫폼 v2.0 개발 승인': '_y Holdings AI investment platform v2.0 development approval',
  '유럽 AI 시장 진출 전략 및 런던 오피스 설립': 'European AI market entry strategy & London office setup',
  'AI 투자 가이드북 출간 및 마케팅 캠페인': 'AI investment guidebook publication & marketing campaign',
  'NVIDIA B200 칩셋 공급 부족 대응 방안': 'NVIDIA B200 chipset supply shortage response plan',
  'AI Ethics 백서 발간 및 업계 표준 제안': 'AI Ethics whitepaper & industry standard proposal',
  // Directives
  '회사 방향성에 대한 설명과 간략한 요약본': 'Company direction overview and brief summary',
  '회사 방향성에 대한 설명을 간략한 요약본으로 보고해줘': 'Report a brief summary of the company direction',
  '[Phase 2] 에이전트 자동 분석 + 위임 등급': '[Phase 2] Agent auto-analysis + delegation levels',
  '[Phase 3] Growth Engine + 종합 요약': '[Phase 3] Growth Engine + comprehensive summary',
  'XP/레벨 자동 축적, Counsely 일일 종합 요약, 텔레그램 알림 연동': 'Auto XP/level accumulation, Counsely daily summary, Telegram integration',
  'Decision detected→analyzing 자동 전이, 위임 등급 Lv1~4, PLAYBOOK.md 파일 기반 정책, Lead+Reviewer 페어링': 'Decision auto-transition, delegation levels Lv1-4, PLAYBOOK.md policy, Lead+Reviewer pairing',
  'API 구현': 'API implementation',
  'Playbook 설계': 'Playbook design',
  // Directives (Phase 3/4)
  '[Phase 4] _y Builder 오픈소스 + 보안': '[Phase 4] _y Builder open-source + security',
  '_y Builder 패키징, PLAYBOOK.md 오픈소스, GitHub 공개, memshield/mguard 메모리 보안 적용': '_y Builder packaging, PLAYBOOK.md open-source, GitHub release, memshield/mguard memory security',
  '메모리 보안': 'Memory security',
  '패키징': 'Packaging',
  'Agent Rooms 디스코드 채널 분리': 'Agent Rooms Discord channel separation',
  '성과 데이터 분석': 'Performance data analysis',
  '일일 종합 요약': 'Daily comprehensive summary',
  '테스트 지시': 'Test directive',
  '모든 에이전트 상태 보고': 'Report all agent status',
  '시스템 점검 테스트': 'System check test',
  '전체 API 동작 확인': 'Full API operation verification',
  // Reports
  '[일일 보고] _y Holdings Daily Report': '[Daily Report] _y Holdings Daily Report',
  '_y Holdings Daily Report': '_y Holdings Daily Report',
  // Marketing
  '마케팅 이메일 발송 시작': 'Marketing email dispatch started',
};

/**
 * Translate known Korean text to English when lang === 'en'
 * Falls back to original text if no mapping found
 */
export function localizeText(text: string, lang: 'ko' | 'en' | string): string {
  if (!text || lang === 'ko') return text;
  
  // Exact match
  if (KO_EN_MAP[text]) return KO_EN_MAP[text];
  
  // Partial match — replace known Korean phrases within text
  let result = text;
  for (const [ko, en] of Object.entries(KO_EN_MAP)) {
    if (result.includes(ko)) {
      result = result.replace(ko, en);
    }
  }
  
  // Also apply report tag translations
  for (const [ko, en] of Object.entries(REPORT_TAGS)) {
    if (result.includes(ko)) {
      result = result.replace(ko, en);
    }
  }
  
  return result;
}

const REPORT_TAGS: Record<string, string> = {
  '[일일보고]': '[Daily Report]',
  '[속보]': '[Breaking]',
  '[주간보고]': '[Weekly Report]',
  '[주간]': '[Weekly]',
  '[긴급]': '[Urgent]',
  '[분석]': '[Analysis]',
  '[월간보고]': '[Monthly Report]',
  '[월간]': '[Monthly]',
  '[정기보고]': '[Regular Report]',
  '[임시보고]': '[Ad-hoc Report]',
  '[모니터링]': '[Monitoring]',
  '[리서치]': '[Research]',
  '[시장분석]': '[Market Analysis]',
  '[경쟁분석]': '[Competitor Analysis]',
  '[전략보고]': '[Strategy Report]',
  '[인사이트]': '[Insight]',
  '[요약]': '[Summary]',
  '[알림]': '[Alert]',
  '[공지]': '[Notice]',
  '[회의록]': '[Meeting Notes]',
  '[제안]': '[Proposal]',
  '[검토]': '[Review]',
  '[감사]': '[Audit]',
  '[Onboarding]': '[Onboarding]',
};

export function localizeReportTitle(title: string, lang: 'ko' | 'en' | string): string {
  if (!title) return '';
  if (lang === 'ko') return title;
  
  let result = title;
  for (const [ko, en] of Object.entries(REPORT_TAGS)) {
    result = result.replace(ko, en);
  }
  return result;
}

/**
 * Strip markdown for plain text contexts (TTS, tooltips)
 */
export function cleanMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/(?<!\w)_(.*?)_(?!\w)/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*\n?/g, '').trim())
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[\s]*[-*]\s+/gm, '• ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/^---+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Render markdown as styled JSX for rich display
 */
export function RenderMarkdown({ text }: { text: string }) {
  if (!text) return null;
  
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={i} className="h-2" />);
      return;
    }
    
    // Header lines
    const headerMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const sizes = ['text-[14px]', 'text-[13px]', 'text-[12px]'];
      elements.push(
        <p key={i} className={`${sizes[level-1] || sizes[2]} font-bold text-white/90 mt-2 mb-1`}>
          {renderInline(headerMatch[2])}
        </p>
      );
      return;
    }
    
    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      elements.push(<hr key={i} className="border-white/10 my-2" />);
      return;
    }
    
    // Bullet point
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)/);
    if (bulletMatch) {
      elements.push(
        <div key={i} className="flex gap-2 ml-1 my-0.5">
          <span className="text-amber-400/60 shrink-0 mt-0.5">•</span>
          <span className="text-gray-300 text-[12px] leading-relaxed">{renderInline(bulletMatch[1])}</span>
        </div>
      );
      return;
    }
    
    // Numbered list
    const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      elements.push(
        <div key={i} className="flex gap-2 ml-1 my-0.5">
          <span className="text-gray-500 shrink-0 text-[11px] w-4 text-right">{numMatch[1]}.</span>
          <span className="text-gray-300 text-[12px] leading-relaxed">{renderInline(numMatch[2])}</span>
        </div>
      );
      return;
    }
    
    // Regular paragraph
    elements.push(
      <p key={i} className="text-gray-300 text-[12px] leading-relaxed my-0.5">
        {renderInline(trimmed)}
      </p>
    );
  });
  
  return <>{elements}</>;
}

/** Render inline markdown: bold, italic, code, links */
function renderInline(text: string): React.ReactNode {
  // Split by bold markers
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|__(.+?)__|`(.+?)`|\[(.+?)\]\((.+?)\)/g;
  let lastIdx = 0;
  let match;
  let key = 0;
  
  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    
    if (match[1] || match[2]) {
      // Bold
      parts.push(<strong key={key++} className="text-white font-semibold">{match[1] || match[2]}</strong>);
    } else if (match[3]) {
      // Inline code
      parts.push(<code key={key++} className="px-1 py-0.5 bg-white/5 rounded text-amber-300/80 text-[11px]">{match[3]}</code>);
    } else if (match[4] && match[5]) {
      // Link
      parts.push(<span key={key++} className="text-blue-400 underline">{match[4]}</span>);
    }
    
    lastIdx = match.index + match[0].length;
  }
  
  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }
  
  return parts.length > 0 ? parts : text;
}

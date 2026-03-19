'use client';

import { useState, useEffect, useRef } from 'react';
import { BarChart3, ClipboardList, Search, Target, MessageSquare, FileText, Send, Handshake, Microscope, X, Check, CheckCircle2, XCircle, Trash2, Volume2, Square } from 'lucide-react';
import { useLang } from '@/context/LangContext';
import { useReports, Report } from '@/context/ReportContext';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useTTS } from '@/hooks/useTTS';
import { AGENT_ROSTER } from '@/data/agent-config';
import { cleanMarkdown, RenderMarkdown, localizeReportTitle, localizeText } from '@/lib/format-markdown';

/** Get localized title/content from report — prefers DB _en fields, falls back to localizeText */
function rTitle(report: Report, lang: string) {
  if (lang !== 'ko' && (report as any).title_en) return (report as any).title_en;
  return localizeText(report.title, lang);
}
function rContent(report: Report, lang: string) {
  if (lang !== 'ko' && (report as any).content_en) return (report as any).content_en;
  return localizeText(report.content, lang);
}

type Tab = 'reports' | 'research';

interface Props {
  onClose: () => void;
  initialTab?: Tab;
  filterUnread?: boolean;
}

const PRIORITY_COLORS: Record<string, { bg: string; text: string; label: { ko: string; en: string } }> = {
  high: { bg: 'bg-red-500/20', text: 'text-red-300', label: { ko: '긴급', en: 'High' } },
  medium: { bg: 'bg-amber-500/20', text: 'text-amber-300', label: { ko: '보통', en: 'Medium' } },
  low: { bg: 'bg-green-500/20', text: 'text-green-300', label: { ko: '낮음', en: 'Low' } },
};

const TYPE_EMOJI: Record<string, string> = {
  simulation: 'SIM',
  meeting: 'MTG',
  research: 'RSC',
};

// Agent ID → image filename mapping
const AGENT_IMG: Record<string, string> = { chairman: '00-andrew' };
// Initialize AGENT_IMG from AGENT_ROSTER
AGENT_ROSTER.forEach((a) => { AGENT_IMG[a.id] = `${a.number}-${a.id}`; });

export function GlassPanel({ onClose, initialTab = 'reports', filterUnread = false }: Props) {
  const { lang, text } = useLang();
  const { reports, markRead, markAllRead, unreadCount } = useReports();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [visible, setVisible] = useState(false);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const { speak, stop, speaking, supported: ttsSupported } = useTTS({ lang: lang === 'ko' ? 'ko-KR' : 'en-US' });

    
  const [hiddenReports, setHiddenReports] = useState<Set<string>>(new Set());
  const [actionedReports, setActionedReports] = useState<Record<string, { status: string; note?: string }>>({});
  const [actionMode, setActionMode] = useState<{ reportId: string; status: string } | null>(null);
  const [actionNote, setActionNote] = useState('');
  
  // Report chat states
  const [chatReports, setChatReports] = useState<Set<string>>(new Set());
  const [chatMessages, setChatMessages] = useState<Record<string, Array<{role: string; content: string}>>>({});
  const [chatInputs, setChatInputs] = useState<Record<string, string>>({});
  const [chatLoading, setChatLoading] = useState<Record<string, boolean>>({});

  const handleReportAction = async (reportId: string, status: string, note?: string) => {
    try {
      if (status === 'deleted') {
        await fetch(`/api/reports?id=${reportId}`, { method: 'DELETE' });
        setHiddenReports(prev => new Set(prev).add(reportId));
      } else {
        const body: Record<string, string> = { status, reviewed_at: new Date().toISOString() };
        if (note?.trim()) body.review_notes = note.trim();
        await fetch(`/api/reports?id=${reportId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        setActionedReports(prev => ({ ...prev, [reportId]: { status, note: note?.trim() } }));
        markRead(reportId);
      }
      setExpandedReport(null);
      setActionMode(null);
      setActionNote('');
    } catch (e) { console.error('Report action failed:', e); }
  };

  // Report chat functions
  const toggleReportChat = (reportId: string) => {
    setChatReports(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reportId)) {
        newSet.delete(reportId);
      } else {
        newSet.add(reportId);
      }
      return newSet;
    });
  };

  const sendReportQuestion = async (report: Report) => {
    const reportId = report.id;
    const question = chatInputs[reportId]?.trim();
    if (!question || chatLoading[reportId]) return;

    // Add user message
    setChatMessages(prev => ({
      ...prev,
      [reportId]: [...(prev[reportId] || []), { role: 'user', content: question }]
    }));
    
    // Clear input
    setChatInputs(prev => ({ ...prev, [reportId]: '' }));
    
    // Set loading
    setChatLoading(prev => ({ ...prev, [reportId]: true }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: report.agentId,
          message: question,
          history: chatMessages[reportId]?.slice(-4) || [], // Keep last 4 messages for context
          lang: lang,
          context: {
            title: report.title,
            content: report.content
          }
        }),
      });

      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      
      // Add agent response
      setChatMessages(prev => ({
        ...prev,
        [reportId]: [...(prev[reportId] || []), { role: 'assistant', content: data.reply }]
      }));
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => ({
        ...prev,
        [reportId]: [...(prev[reportId] || []), { role: 'assistant', content: lang === 'ko' ? '죄송합니다. 답변을 생성할 수 없습니다.' : 'Sorry, I cannot generate a response.' }]
      }));
    } finally {
      setChatLoading(prev => ({ ...prev, [reportId]: false }));
    }
  };

  // Research state
  const [researchUrl, setResearchUrl] = useState('');
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchContent, setResearchContent] = useState<{ title: string; content: string; url: string } | null>(null);
  const [researchError, setResearchError] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const displayReports = (filterUnread ? reports.filter(r => !r.read) : reports).filter(r => !hiddenReports.has(r.id));

  const handleExpandReport = (report: Report) => {
    if (expandedReport === report.id) {
      setExpandedReport(null);
    } else {
      setExpandedReport(report.id);
      if (!report.read) markRead(report.id);
    }
  };

  const fetchResearch = async () => {
    if (!researchUrl.trim()) return;
    setResearchLoading(true);
    setResearchError('');
    setResearchContent(null);

    try {
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: researchUrl.trim() }),
      });
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setResearchContent(data);
    } catch {
      setResearchError(lang === 'ko' ? '콘텐츠를 가져올 수 없습니다.' : 'Failed to fetch content.');
    } finally {
      setResearchLoading(false);
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - ts;
    if (diff < 60000) return lang === 'ko' ? '방금' : 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}${lang === 'ko' ? '분 전' : 'm ago'}`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}${lang === 'ko' ? '시간 전' : 'h ago'}`;
    return d.toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Glass Panel */}
      <div
        className={`relative w-full h-full sm:w-[96vw] sm:h-[94vh] sm:max-w-[1400px] flex flex-col overflow-hidden rounded-none sm:rounded-2xl shadow-2xl transition-all duration-300 ease-out ${
          visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
        }`}
        style={{
          background: 'rgba(6, 11, 20, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-white/60" />
            <h2 className="text-xs sm:text-sm font-bold text-white">
              {filterUnread
                ? (lang === 'ko' ? '미결재 보고서' : 'Pending Reports')
                : (lang === 'ko' ? '보고서 & 리서치' : 'Reports & Research')
              }
            </h2>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[8px] sm:text-[9px] font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition text-xs sm:text-sm"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Tabs — only show if not filtered */}
        {!filterUnread && (
          <div className="flex gap-1 px-3 sm:px-4 pt-2 sm:pt-3 shrink-0 overflow-x-auto">
            <button
              onClick={() => setTab('reports')}
              className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-medium transition whitespace-nowrap ${
                tab === 'reports'
                  ? 'bg-amber-400/15 text-amber-300 border border-amber-400/20'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <ClipboardList className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline" /> {text.reports || (lang === 'ko' ? '보고서' : 'Reports')}
              {reports.length > 0 && (
                <span className="ml-1.5 text-[8px] sm:text-[9px] opacity-60">{reports.length}</span>
              )}
            </button>
            <button
              onClick={() => setTab('research')}
              className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-medium transition whitespace-nowrap ${
                tab === 'research'
                  ? 'bg-blue-400/15 text-blue-300 border border-blue-400/20'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <Microscope className="w-3 h-3 inline" /> {text.research || (lang === 'ko' ? '리서치' : 'Research')}
            </button>
          </div>
        )}

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 sm:px-4 sm:py-3">
          {/* Reports Tab */}
          {(tab === 'reports' || filterUnread) && (
            <div className="space-y-2">
              {displayReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ClipboardList className="w-8 h-8 opacity-30" />
                  <p className="text-sm text-gray-500">
                    {filterUnread
                      ? (lang === 'ko' ? '미결재 보고서가 없습니다' : 'No pending reports')
                      : (lang === 'ko' ? '보고서가 없습니다' : 'No reports yet')
                    }
                  </p>
                  <p className="text-[10px] text-gray-600 mt-1">
                    {lang === 'ko' ? '시뮬레이션을 실행하면 보고서가 생성됩니다' : 'Run a simulation to generate reports'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Mark all read button */}
                  {unreadCount > 0 && !filterUnread && (
                    <button
                      onClick={markAllRead}
                      className="text-[10px] text-gray-500 hover:text-gray-300 transition mb-2"
                    >
                      <Check className="w-3 h-3 inline" /> {lang === 'ko' ? '모두 읽음 처리' : 'Mark all as read'}
                    </button>
                  )}

                  {displayReports.map(report => {
                    const pri = PRIORITY_COLORS[report.priority];
                    const isExpanded = expandedReport === report.id;

                    return (
                      <button
                        key={report.id}
                        onClick={() => handleExpandReport(report)}
                        className={`w-full text-left rounded-xl p-3 transition-all duration-200 ${
                          isExpanded
                            ? 'bg-white/[0.06] border border-white/10'
                            : 'bg-white/[0.02] border border-transparent hover:bg-white/[0.04] hover:border-white/5'
                        } ${!report.read ? 'ring-1 ring-amber-400/20' : ''}`}
                      >
                        {/* Report header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <img src={`/agents/${AGENT_IMG[report.agentId || ''] || '00-andrew'}.png`} alt="" className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0" onError={(e) => { (e.target as HTMLImageElement).replaceWith(Object.assign(document.createElement('span'), { className: 'text-sm', textContent: TYPE_EMOJI[report.type] || 'RPT' })); }} />
                              <Badge variant="outline" className={`text-[9px] px-1.5 py-0.5 font-medium ${pri.bg} ${pri.text} border-0`}>
                                {lang === 'ko' ? pri.label.ko : pri.label.en}
                              </Badge>
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 bg-white/5 text-gray-400 border-white/10">
                                {report.department}
                              </Badge>
                              {actionedReports[report.id]?.status === 'approved' && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3 inline text-green-400" /> {lang === 'ko' ? '결재완료' : 'Approved'}
                                </Badge>
                              )}
                              {actionedReports[report.id]?.status === 'rejected' && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 bg-red-500/20 text-red-400 border-red-500/30">
                                  <XCircle className="w-3 h-3 inline text-red-400" /> {lang === 'ko' ? '반려' : 'Rejected'}
                                </Badge>
                              )}
                              {!report.read && !actionedReports[report.id] && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              )}
                            </div>
                            {actionedReports[report.id]?.note && (
                              <p className="text-[11px] text-amber-300/70 mt-1 italic">
                                <MessageSquare className="w-3 h-3 inline" /> {actionedReports[report.id].note}
                              </p>
                            )}
                            <h3 className="text-[13px] font-semibold text-white mt-1 truncate">
                              {cleanMarkdown(rTitle(report, lang))}
                            </h3>
                            <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">
                              {cleanMarkdown(rContent(report, lang).slice(0, 120))}
                            </p>
                          </div>
                          <span className="text-[9px] text-gray-600 whitespace-nowrap shrink-0">
                            {formatTime(report.timestamp)}
                          </span>
                        </div>

                        {/* Expanded content */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-white/5 animate-fadeIn">
                            <div className="leading-relaxed">
                              <RenderMarkdown text={rContent(report, lang)} />
                            </div>
                            {report.actions && report.actions.length > 0 && (
                              <div className="mt-3">
                                <p className="text-[10px] text-amber-400/80 font-medium mb-1.5">
                                  {lang === 'ko' ? '권장 조치사항' : 'Recommended Actions'}
                                </p>
                                <ul className="space-y-1">
                                  {report.actions.map((action, i) => (
                                    <li key={i} className="flex items-start gap-2 text-[11px] text-gray-400">
                                      <span className="text-amber-400/60 shrink-0 mt-0.5">▸</span>
                                      {action}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {/* Delete button — always available */}
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(lang === 'ko' ? '이 보고서를 삭제하시겠습니까?' : 'Delete this report?')) {
                                    handleReportAction(report.id, 'deleted');
                                  }
                                }}
                                className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 text-[10px] sm:text-[11px] font-medium transition"
                              >
                                <Trash2 className="w-3 h-3 inline" /> {lang === 'ko' ? '삭제' : 'Delete'}
                              </button>
                            </div>
                            {/* Action buttons — hide for directive reports and actioned */}
                            {!actionedReports[report.id] && (report as any).report_type !== 'directive_report' && (
                              <div className="mt-3 space-y-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReportAction(report.id, 'approved');
                                    }}
                                    className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-medium transition bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 active:scale-95"
                                  >
                                    <CheckCircle2 className="w-3 h-3 inline text-green-400" /> {lang === 'ko' ? '결재' : 'Approve'}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReportAction(report.id, 'rejected');
                                    }}
                                    className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-medium transition bg-red-500/20 hover:bg-red-500/30 text-red-400 active:scale-95"
                                  >
                                    <XCircle className="w-3 h-3 inline text-red-400" /> {lang === 'ko' ? '반려' : 'Reject'}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleReportChat(report.id);
                                    }}
                                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-medium transition ${
                                      chatReports.has(report.id)
                                        ? 'bg-blue-500/40 text-blue-300 ring-1 ring-blue-400/50'
                                        : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
                                    }`}
                                  >
                                    <MessageSquare className="w-3 h-3 inline" /> {lang === 'ko' ? '질문하기' : 'Ask Question'}
                                  </button>
                                </div>

                              </div>
                            )}
                            <div className="mt-2 flex items-center gap-3 text-[9px] text-gray-600">
                              <span>{report.floor}F</span>
                              <span>•</span>
                              <span>{new Date(report.timestamp).toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US')}</span>
                              {ttsSupported && (
                                <>
                                  <span>•</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (speaking) { stop(); }
                                      else {
                                        const text = `${report.title}. ${report.content}${report.actions?.length ? '. ' + (lang === 'ko' ? '권장 조치사항: ' : 'Recommended: ') + report.actions.join('. ') : ''}`;
                                        speak(text, report.agentId || report.department);
                                      }
                                    }}
                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full transition ${
                                      speaking 
                                        ? 'bg-amber-400/20 text-amber-400' 
                                        : 'hover:bg-white/10 text-gray-500 hover:text-white'
                                    }`}
                                  >
                                    <span>{speaking ? <Square className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}</span>
                                    <span className="text-[9px]">{speaking ? (lang === 'ko' ? '중지' : 'Stop') : (lang === 'ko' ? '음성 보고' : 'Voice')}</span>
                                  </button>
                                </>
                              )}
                            </div>
                            
                            {/* Report Chat Interface */}
                            {chatReports.has(report.id) && (
                              <div className="mt-4 pt-3 border-t border-white/5 animate-fadeIn" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center gap-2 mb-3">
                                  <img 
                                    src={`/agents/${AGENT_IMG[report.agentId || ''] || '00-andrew'}.png`} 
                                    alt="" 
                                    className="w-6 h-6 rounded-full object-cover border border-white/10" 
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                                  <span className="text-[11px] text-gray-400">
                                    {lang === 'ko' ? `${report.agentId}에게 질문하기` : `Ask ${report.agentId}`}
                                  </span>
                                </div>
                                
                                {/* Chat Messages */}
                                {chatMessages[report.id] && chatMessages[report.id].length > 0 && (
                                  <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                                    {chatMessages[report.id].map((msg, i) => (
                                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {msg.role === 'assistant' && (
                                          <img 
                                            src={`/agents/${AGENT_IMG[report.agentId || ''] || '00-andrew'}.png`} 
                                            alt="" 
                                            className="w-5 h-5 rounded-full object-cover border border-white/10 mr-2 mt-1 shrink-0" 
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                          />
                                        )}
                                        <div className={`max-w-[80%] px-3 py-2 rounded-xl text-[11px] leading-relaxed ${
                                          msg.role === 'user'
                                            ? 'bg-blue-500/20 text-blue-50 rounded-br-md'
                                            : 'bg-white/5 text-gray-200 rounded-bl-md'
                                        }`}>
                                          {msg.content}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Loading indicator */}
                                {chatLoading[report.id] && (
                                  <div className="flex justify-start mb-3">
                                    <div className="flex items-center gap-2">
                                      <img 
                                        src={`/agents/${AGENT_IMG[report.agentId || ''] || '00-andrew'}.png`} 
                                        alt="" 
                                        className="w-5 h-5 rounded-full object-cover border border-white/10" 
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                      />
                                      <div className="bg-white/5 px-3 py-2 rounded-xl rounded-bl-md">
                                        <div className="flex gap-1">
                                          <div className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                          <div className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                          <div className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Chat Input */}
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={chatInputs[report.id] || ''}
                                    onChange={(e) => setChatInputs(prev => ({ ...prev, [report.id]: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        sendReportQuestion(report);
                                      }
                                    }}
                                    placeholder={lang === 'ko' ? '질문을 입력하세요...' : 'Type your question...'}
                                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white placeholder-gray-500 focus:outline-none focus:border-blue-400/40"
                                    disabled={chatLoading[report.id]}
                                  />
                                  <button
                                    onClick={() => sendReportQuestion(report)}
                                    disabled={chatLoading[report.id] || !chatInputs[report.id]?.trim()}
                                    className="px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-30 disabled:cursor-not-allowed text-blue-300 text-[11px] font-medium transition border border-blue-400/20"
                                  >
                                    <Send className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* Research Tab */}
          {tab === 'research' && !filterUnread && (
            <div className="space-y-4">
              {/* URL Input */}
              <div className="flex gap-2">
                <input
                  type="url"
                  value={researchUrl}
                  onChange={(e) => setResearchUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchResearch()}
                  placeholder={lang === 'ko' ? 'URL을 입력하세요...' : 'Enter a URL...'}
                  className="flex-1 px-3 py-2 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-400/30"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                />
                <button
                  onClick={fetchResearch}
                  disabled={!researchUrl.trim() || researchLoading}
                  className="px-3 py-2 sm:px-4 sm:py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-30 disabled:cursor-not-allowed text-blue-300 text-xs sm:text-sm font-medium transition border border-blue-400/20 shrink-0"
                >
                  {researchLoading ? '...' : <Search className="w-3 h-3 sm:w-4 sm:h-4" />}
                </button>
              </div>

              {/* Loading skeleton */}
              {researchLoading && (
                <div className="space-y-3 animate-pulse">
                  <div className="h-5 bg-white/5 rounded-lg w-2/3" />
                  <div className="h-3 bg-white/5 rounded w-full" />
                  <div className="h-3 bg-white/5 rounded w-full" />
                  <div className="h-3 bg-white/5 rounded w-5/6" />
                  <div className="h-3 bg-white/5 rounded w-full" />
                  <div className="h-3 bg-white/5 rounded w-4/6" />
                </div>
              )}

              {/* Error */}
              {researchError && (
                <div className="text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-3 border border-red-500/20">
                  {researchError}
                </div>
              )}

              {/* Research content */}
              {researchContent && (
                <div className="animate-fadeIn space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-white">{researchContent.title || 'Untitled'}</h3>
                  </div>
                  <a
                    href={researchContent.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-400/60 hover:text-blue-400 transition truncate block"
                  >
                    {researchContent.url}
                  </a>
                  <div className="text-[12px] text-gray-300 leading-relaxed whitespace-pre-line">
                    {cleanMarkdown(researchContent.content)}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!researchLoading && !researchContent && !researchError && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Microscope className="w-8 h-8 mb-3 opacity-30" />
                  <p className="text-sm text-gray-500">
                    {lang === 'ko' ? 'URL을 입력하여 웹 콘텐츠를 가져오세요' : 'Enter a URL to fetch web content'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

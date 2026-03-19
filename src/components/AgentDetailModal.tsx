'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  MessageSquare, 
  Target, 
  Clock, 
  TrendingUp, 
  User,
  Calendar,
  Activity,
  ChevronRight,
  X
} from 'lucide-react';
import { AGENT_ROSTER } from '@/data/agent-config';
import { cleanMarkdown, RenderMarkdown, localizeReportTitle, localizeText } from '@/lib/format-markdown';

interface AgentDetailModalProps {
  agentId: string | null;
  open: boolean;
  onClose: () => void;
  lang?: 'ko' | 'en';
}

interface Report {
  id: string;
  agent_id: string;
  title: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  report_type: string;
}

interface Decision {
  id: string;
  title: string;
  current_assignee: string;
  proposed_by: string;
  status: string;
  created_at: string;
  description?: string;
}

interface Conversation {
  id: string;
  agent_id: string;
  message: string;
  created_at: string;
  message_type: string;
}

const PRIORITY_COLORS: Record<string, { bg: string; text: string; label: { ko: string; en: string } }> = {
  high: { bg: 'bg-red-500/20', text: 'text-red-300', label: { ko: '긴급', en: 'High' } },
  medium: { bg: 'bg-amber-500/20', text: 'text-amber-300', label: { ko: '보통', en: 'Medium' } },
  low: { bg: 'bg-green-500/20', text: 'text-green-300', label: { ko: '낮음', en: 'Low' } },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-amber-500/20', text: 'text-amber-300' },
  approved: { bg: 'bg-green-500/20', text: 'text-green-300' },
  rejected: { bg: 'bg-red-500/20', text: 'text-red-300' },
  in_progress: { bg: 'bg-blue-500/20', text: 'text-blue-300' },
};

export function AgentDetailModal({ agentId, open, onClose, lang = 'ko' }: AgentDetailModalProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'reports' | 'decisions' | 'conversations'>('reports');

  const agent = AGENT_ROSTER.find(a => a.id === agentId);
  const ko = lang === 'ko';

  useEffect(() => {
    if (!open || !agentId) {
      setReports([]);
      setDecisions([]);
      setConversations([]);
      return;
    }

    const fetchAgentData = async () => {
      setLoading(true);
      try {
        const [reportsRes, decisionsRes, chatRes] = await Promise.all([
          fetch(`/api/reports?agent_id=${agentId}&limit=10`).then(r => r.ok ? r.json() : []),
          fetch(`/api/decisions?agent_id=${agentId}&limit=10`).then(r => r.ok ? r.json() : []),
          fetch(`/api/chat?agent_id=${agentId}&history=true&limit=10`).then(r => r.ok ? r.json() : []),
        ]);
        if (Array.isArray(reportsRes)) setReports(reportsRes);
        if (Array.isArray(decisionsRes)) setDecisions(decisionsRes);
        if (Array.isArray(chatRes)) setConversations(chatRes);
      } catch (error) {
        console.error("Failed to fetch agent data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgentData();
  }, [agentId, open]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return ko ? '방금' : 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}${ko ? '분 전' : 'm ago'}`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}${ko ? '시간 전' : 'h ago'}`;
    return date.toLocaleDateString(ko ? 'ko-KR' : 'en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, { ko: string; en: string }> = {
      pending: { ko: '대기중', en: 'Pending' },
      approved: { ko: '승인됨', en: 'Approved' },
      rejected: { ko: '반려됨', en: 'Rejected' },
      in_progress: { ko: '진행중', en: 'In Progress' },
    };
    return statusLabels[status] ? (ko ? statusLabels[status].ko : statusLabels[status].en) : status;
  };

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="w-full h-full sm:max-w-4xl sm:w-[95vw] sm:h-[90vh] p-0 border-0 shadow-2xl rounded-none sm:rounded-lg"
        style={{
          background: 'rgba(6, 11, 20, 0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
        }}
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="p-3 sm:p-6 border-b border-white/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <div className="relative">
                <img 
                  src={`/agents/${agent.number}-${agent.id}.png`}
                  alt={agent.name}
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-emerald-400/30"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const fallback = document.createElement('div');
                    fallback.className = 'w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-xl sm:text-2xl bg-emerald-500/20 border-2 border-emerald-400/30';
                    fallback.textContent = agent.emoji || '';
                    (e.target as HTMLImageElement).parentElement?.appendChild(fallback);
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-sm sm:text-xl font-bold text-white flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <span className="truncate">{agent.name}</span>
                  <Badge 
                    variant="outline" 
                    className="text-[9px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 bg-emerald-500/20 text-emerald-300 border-emerald-400/30 w-fit"
                  >
                    {agent.tier === 'C' ? (ko ? '임원' : 'C-Suite') :
                     agent.tier === 'Director' ? (ko ? '본부장' : 'Director') :
                     agent.tier === 'Manager' ? (ko ? '팀장' : 'Manager') :
                     ko ? '사원' : 'Staff'}
                  </Badge>
                </DialogTitle>
                <p className="text-xs sm:text-sm text-white/60 mt-0.5 sm:mt-1 line-clamp-2 sm:line-clamp-none">{agent.desc}</p>
              </div>
              <button
                onClick={onClose}
                className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition text-sm sm:text-lg shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[9px] sm:text-xs text-white/40 w-full sm:w-auto">
              <span className="flex items-center gap-1">
                <User className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                {agent.department}
              </span>
              <span className="flex items-center gap-1">
                <Activity className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                {agent.floor}F
              </span>
              <span className="flex items-center gap-1">
                <Target className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                {agent.llm.label}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-0.5 sm:gap-1 px-3 pt-2 sm:px-6 sm:pt-4 border-b border-white/5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />
            {ko ? '보고서' : 'Reports'}
            {reports.length > 0 && (
              <span className="ml-1 sm:ml-2 text-[9px] sm:text-xs opacity-60">{reports.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('decisions')}
            className={`px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'decisions'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Target className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />
            {ko ? '의사결정' : 'Decisions'}
            {decisions.length > 0 && (
              <span className="ml-1 sm:ml-2 text-[9px] sm:text-xs opacity-60">{decisions.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('conversations')}
            className={`px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'conversations'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />
            {ko ? '대화' : 'Conversations'}
            {conversations.length > 0 && (
              <span className="ml-1 sm:ml-2 text-[9px] sm:text-xs opacity-60">{conversations.length}</span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-3 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              {/* Reports Tab */}
              {activeTab === 'reports' && (
                <div className="space-y-4">
                  {reports.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white/40">
                        {ko ? '보고서가 없습니다' : 'No reports found'}
                      </p>
                    </div>
                  ) : (
                    reports.map((report) => {
                      const pri = PRIORITY_COLORS[report.priority] || { bg: 'bg-gray-500/20', text: 'text-gray-300', label: { ko: '일반', en: 'Normal' } };
                      return (
                        <div
                          key={report.id}
                          className="bg-white/[0.03] border border-white/10 rounded-xl p-3 sm:p-4 hover:bg-white/[0.05] transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                                <Badge 
                                  variant="outline" 
                                  className={`text-[9px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 border-0 ${pri.bg} ${pri.text}`}
                                >
                                  {ko ? pri.label.ko : pri.label.en}
                                </Badge>
                                <Badge 
                                  variant="outline" 
                                  className="text-[9px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 bg-white/5 text-gray-400 border-white/10"
                                >
                                  {report.report_type}
                                </Badge>
                              </div>
                              <h4 className="text-xs sm:text-sm font-semibold text-white mb-1.5 sm:mb-2 line-clamp-2">
                                {localizeText(cleanMarkdown(report.title), lang)}
                              </h4>
                              <div className="text-[10px] sm:text-xs text-gray-300 leading-relaxed">
                                <RenderMarkdown text={report.content.slice(0, 200) + (report.content.length > 200 ? '...' : '')} />
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 sm:gap-2 shrink-0">
                              <span className="text-[9px] sm:text-xs text-white/40 flex items-center gap-0.5 sm:gap-1">
                                <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                {formatTime(report.created_at)}
                              </span>
                              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-white/20" />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Decisions Tab */}
              {activeTab === 'decisions' && (
                <div className="space-y-4">
                  {decisions.length === 0 ? (
                    <div className="text-center py-12">
                      <Target className="w-12 h-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white/40">
                        {ko ? '제안한 의사결정이 없습니다' : 'No decisions proposed'}
                      </p>
                    </div>
                  ) : (
                    decisions.map((decision) => {
                      const statusColor = STATUS_COLORS[decision.status] || { bg: 'bg-gray-500/20', text: 'text-gray-300' };
                      return (
                        <div
                          key={decision.id}
                          className="bg-white/[0.03] border border-white/10 rounded-xl p-3 sm:p-4 hover:bg-white/[0.05] transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                                <Badge 
                                  variant="outline" 
                                  className={`text-[9px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 border-0 ${statusColor.bg} ${statusColor.text}`}
                                >
                                  {getStatusLabel(decision.status)}
                                </Badge>
                                <Badge 
                                  variant="outline" 
                                  className="text-[9px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                                >
                                  {ko ? '제안자' : 'Proposer'}
                                </Badge>
                              </div>
                              <h4 className="text-xs sm:text-sm font-semibold text-white mb-1.5 sm:mb-2 line-clamp-2">
                                {decision.title}
                              </h4>
                              {decision.description && (
                                <p className="text-[10px] sm:text-xs text-gray-300 leading-relaxed">
                                  {cleanMarkdown(decision.description.slice(0, 150) + (decision.description.length > 150 ? '...' : ''))}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1 sm:gap-2 shrink-0">
                              <span className="text-[9px] sm:text-xs text-white/40 flex items-center gap-0.5 sm:gap-1">
                                <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                {formatTime(decision.created_at)}
                              </span>
                              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-white/20" />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Conversations Tab */}
              {activeTab === 'conversations' && (
                <div className="space-y-4">
                  {conversations.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white/40">
                        {ko ? '대화 기록이 없습니다' : 'No conversations found'}
                      </p>
                    </div>
                  ) : (
                    conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className="bg-white/[0.03] border border-white/10 rounded-xl p-3 sm:p-4 hover:bg-white/[0.05] transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                              <Badge 
                                variant="outline" 
                                className="text-[9px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 bg-blue-500/20 text-blue-300 border-blue-400/30"
                              >
                                {conversation.message_type || (ko ? '메시지' : 'Message')}
                              </Badge>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                              {cleanMarkdown(conversation.message.slice(0, 200) + (conversation.message.length > 200 ? '...' : ''))}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 sm:gap-2 shrink-0">
                            <span className="text-[9px] sm:text-xs text-white/40 flex items-center gap-0.5 sm:gap-1">
                              <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              {formatTime(conversation.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
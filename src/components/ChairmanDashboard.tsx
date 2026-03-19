'use client';
import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Clock, CheckCircle2, Zap, Send, FileText, Activity, Users, UserPlus, Trash2, AlertTriangle, GitBranch, TrendingUp, Network, RefreshCw, Play, Building2, MessageSquare, BarChart3, Search, Target, ClipboardList, Circle, XCircle, Bot, ChevronUp, Star, Timer, Ticket, Volume2, Square, Loader2, ChevronDown, Check } from 'lucide-react';

import { useLang } from '@/context/LangContext';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useTTS } from '@/hooks/useTTS';
import { cleanMarkdown, RenderMarkdown, localizeReportTitle, localizeText } from '@/lib/format-markdown';
const DecisionGraph = dynamic(() => import('./DecisionGraph'), { ssr: false });
import CapitalDashboard from './CapitalDashboard';
import { AGENT_ROSTER } from '@/data/agent-config';
import UserCompanyDashboard from './UserCompanyDashboard';
import { useCompanies } from '@/hooks/useCompanies';

interface AssigneeInfo { id: string; task: string; status: string }
interface ParsedContent { description: string; assignees: AssigneeInfo[] }
interface Report {
  id: string; title: string; title_en?: string; content: string; content_en?: string; agent_id: string;
  report_type: string; status: string; created_at: string;
}
interface AgentInfo {
  status: 'working' | 'idle' | 'resting';
  lastTask: string; lastActive: string; tasksToday: number;
}
interface Decision {
  id: string; type: string; title: string; title_en?: string; description: string; description_en?: string;
  status: string; priority: string; current_assignee: string;
  participants: any; artifacts: any; trigger_agent_id: string;
  trigger_data: { title_ko?: string; title_en?: string; [key: string]: any } | null;
  analysis?: string; delegation_level?: number; review_notes?: string;
  created_at: string; updated_at: string;
  assignees?: string[] | string; // JSON array or string of agent IDs
  progress?: { total: number; completed: number; agent_results: Record<string, any> };
}
interface MonitoringData {
  server: string; responseMs: number; users: number; sessions: number;
  bids: number; newBids: number; feedback: number; tickets: number;
  checkedAt: string;
}
interface TradeStats {
  totalTrades: number; wins: number; winRate: number;
  totalPnl: number; totalDollars: number; currentContract: string; tradingDays: number;
}
interface TradeData { trades: any[]; stats: TradeStats }
interface Props { 
  open: boolean; 
  onClose: () => void;
  onOpenReports?: () => void;
  onOpenDecisions?: () => void;
  initialTab?: string | null;
}

// Build AG from AGENT_ROSTER
const AG: Record<string, { name: string; dept: string; image: string; floor: number }> = {
  chairman: { name: 'Chairman', dept: '회장실', image: '/agents/00-andrew.png', floor: 10 },
};
AGENT_ROSTER.forEach(a => {
  AG[a.id] = { name: a.name, dept: a.department, image: `/agents/${a.number}-${a.id}.png`, floor: a.floor };
});
const AgentAvatar = ({ id, size = 'sm' }: { id: string; size?: 'xs' | 'sm' | 'md' }) => {
  const s = size === 'xs' ? 'w-4 h-4' : size === 'md' ? 'w-7 h-7' : 'w-5 h-5';
  const src = AG[id]?.image || '/agents/00-andrew.png';
  const agent = AGENT_ROSTER.find(a => a.id === id);
  const fallbackEmoji = agent?.emoji || '';
  
  return (
    <img 
      src={src} 
      alt="" 
      className={`${s} rounded-full object-cover border border-white/10 inline-block`} 
      onError={(e) => { 
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        const fallbackSpan = document.createElement('span');
        fallbackSpan.className = `${s} rounded-full bg-gray-600 border border-white/10 inline-flex items-center justify-center text-xs`;
        fallbackSpan.textContent = fallbackEmoji;
        target.parentElement?.insertBefore(fallbackSpan, target.nextSibling);
      }} 
    />
  );
};

// Scheduled Operations data (initial — mirrors actual OpenClaw cron jobs)
const INITIAL_SCHEDULED_OPS = [
  { id: '1', name: 'Quanty Market Daily', agent: 'quanty', schedule: 'Weekdays 16:00', channel: '#trading', status: 'ok', hour: 16 },
  { id: '2', name: 'Product GitHub Issues', agent: 'opsy', schedule: 'Daily 10:00, 16:00', channel: '#product', status: 'ok', hour: 10 },
  { id: '3', name: 'Wordy Thread', agent: 'wordy', schedule: 'Tue/Fri 19:00', channel: '#y-tower', status: 'ok', hour: 19 },
  { id: '4', name: 'Meditation Reminder', agent: null, schedule: 'Daily 19:00', channel: '#daily-tracker', status: 'ok', hour: 19 },
  { id: '5', name: 'Service Health Check', agent: 'watchy', schedule: 'Daily 19:00, 22:00', channel: '#product', status: 'ok', hour: 19 },
  { id: '6', name: 'Buzzy X Content', agent: 'buzzy', schedule: 'Daily 20:00', channel: '#y-tower', status: 'ok', hour: 20 },
  { id: '7', name: 'X Post Draft', agent: 'buzzy', schedule: 'Daily 21:00', channel: '#_y-strategy', status: 'ok', hour: 21 },
  { id: '8', name: 'Evening Check-in', agent: null, schedule: 'Daily 21:00', channel: '#knowledge', status: 'ok', hour: 21 },
  { id: '9', name: 'Daily Tracker Review', agent: null, schedule: 'Daily 23:00', channel: '#daily-tracker', status: 'ok', hour: 23 },
  { id: '10', name: 'Daily Growth Report', agent: null, schedule: 'Daily 23:30', channel: '#knowledge', status: 'ok', hour: 23 },
  { id: '11', name: 'S&P500 Trading Reminder', agent: 'tradey', schedule: 'Weekdays 07:25', channel: '#daily-tracker', status: 'ok', hour: 7 },
  { id: '12', name: 'AI Daily Learning', agent: null, schedule: 'Daily 08:00', channel: 'Telegram', status: 'ok', hour: 8 },
  { id: '13', name: 'Morning Check-in', agent: null, schedule: 'Daily 08:00', channel: '#daily-tracker', status: 'ok', hour: 8 },
  { id: '14', name: 'AI Papers Scan', agent: 'searchy', schedule: 'Daily 08:00', channel: '#ai-papers', status: 'ok', hour: 8 },
  { id: '15', name: 'Watchy Service Monitor', agent: 'watchy', schedule: 'Daily 08:30', channel: '#y-tower', status: 'ok', hour: 8 },
  { id: '16', name: 'Daily Operations Report', agent: 'opsy', schedule: 'Daily 08:30', channel: '#product', status: 'ok', hour: 8 },
  { id: '17', name: 'Searchy News Scan', agent: 'searchy', schedule: 'Daily 09:00', channel: 'silent', status: 'ok', hour: 9 },
  { id: '18', name: 'Tradey Strategy Research', agent: 'tradey', schedule: 'Weekdays 09:00', channel: '#trading', status: 'ok', hour: 9 },
  { id: '19', name: 'GitHub Trending Scan', agent: 'searchy', schedule: 'Mon/Thu 09:00', channel: '#ai-papers', status: 'ok', hour: 9 },
  { id: '20', name: '_y Daily Operations', agent: 'opsy', schedule: 'Daily 09:30', channel: 'silent', status: 'ok', hour: 9 },
  { id: '21', name: 'Quanty Backtest', agent: 'quanty', schedule: 'Wed/Sat 15:00', channel: '#trading', status: 'ok', hour: 15 },
  { id: '22', name: 'Pixely Visual', agent: 'pixely', schedule: 'Mon/Thu 19:00', channel: '#y-tower', status: 'ok', hour: 19 },
  { id: '23', name: 'Edity Clip', agent: 'edity', schedule: 'Wed 19:00', channel: '#y-tower', status: 'ok', hour: 19 },
  { id: '24', name: 'Weekly Growth Review', agent: null, schedule: 'Mon 00:30', channel: '#knowledge', status: 'ok', hour: 0 },
  { id: '25', name: 'Weekly Newsletter', agent: 'opsy', schedule: 'Mon 09:00', channel: '#product', status: 'ok', hour: 9 },
  { id: '26', name: 'Oaktree Insights Monitor', agent: 'quanty', schedule: 'Mon 09:00', channel: '#knowledge', status: 'ok', hour: 9 },
];

const SCHEDULE_GROUPS = [
  { key: 'morning', label: 'Morning', labelKo: '오전', range: '06-12', min: 6, max: 12 },
  { key: 'afternoon', label: 'Afternoon', labelKo: '오후', range: '12-18', min: 12, max: 18 },
  { key: 'evening', label: 'Evening', labelKo: '저녁', range: '18-24', min: 18, max: 24 },
  { key: 'night', label: 'Night', labelKo: '심야', range: '00-06', min: 0, max: 6 },
];

const ALL_IDS = Object.keys(AG);

export default function ChairmanDashboard({ open, onClose, onOpenReports, onOpenDecisions, initialTab }: Props) {
  const { lang } = useLang();
  const ko = lang === 'ko';
  const [directives, setDirectives] = useState<Decision[]>([]);
  const { companies: COMPANIES, isMulti: isMultiCompany, defaultId, userCompany } = useCompanies();
  const userCompanies = COMPANIES;
  const [reports, setReports] = useState<Report[]>([]);
  const [agents, setAgents] = useState<Record<string, AgentInfo>>({});
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [monitoring, setMonitoring] = useState<MonitoringData | null>(null);
  const [monitorDetail, setMonitorDetail] = useState<{ feedback: any[]; tickets: any[] } | null>(null);
  const [showMonitor, setShowMonitor] = useState(false);
  const [tradeData, setTradeData] = useState<TradeData | null>(null);
  const [showTrades, setShowTrades] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('normal');
  const [newAssignees, setNewAssignees] = useState<{ id: string; task: string }[]>([]);
  const [assigneeSearch, setAssigneeSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [repRes, statusRes, decRes, monRes] = await Promise.all([
        fetch('/api/reports?report_type=neq.directive&report_type=neq.health_check&agent_id=neq.chairman&order=created_at.desc&limit=10'),
        fetch('/api/agent-status'),
        fetch('/api/decisions'),
        fetch('/api/reports?report_type=eq.health_check&order=created_at.desc&limit=1'),
      ]);
      
      // Fetch directives from decisions table (type = strategy and has assignees)
      const directiveRes = await fetch('/api/decisions?trigger_source=eq.directive&order=created_at.desc&limit=50');
      if (directiveRes.ok) {
        const dirs = await directiveRes.json();
        // Live progress: check chat_queue for in_progress directives
        for (const dir of dirs) {
          if (dir.status === 'in_progress' && dir.trigger_data?.assignees) {
            try {
              const qRes = await fetch('/api/chat_queue?select=agent_id,status&metadata->>directive_id=eq.${dir.id}');
              if (qRes.ok) {
                const qItems = await qRes.json();
                const completed = qItems.filter((q: { status: string }) => q.status === 'done').length;
                const errored = qItems.filter((q: { status: string }) => q.status === 'error').length;
                const finished = completed + errored; // error counts as finished (not retryable from frontend)
                const total = dir.trigger_data.assignees.length;
                const agentResults: Record<string, { status: string }> = {};
                for (const q of qItems) {
                  agentResults[q.agent_id] = { status: q.status === 'done' ? 'completed' : q.status };
                }
                const newProgress = { total, completed, agent_results: agentResults };
                dir.progress = newProgress;
                // Update progress in DB
                fetch(`/api/decisions?id=eq.${dir.id}`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ progress: newProgress }) }).catch(() => {});
                // Auto-complete: all done, OR all finished (done+error), OR 10min timeout
                const dirCreated = new Date(dir.created_at).getTime();
                const elapsed = Date.now() - dirCreated;
                const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
                const shouldComplete = (completed >= total && completed > 0) || 
                  (finished >= total && finished > 0) || 
                  (elapsed > TIMEOUT_MS && completed > 0);
                if (shouldComplete) {
                  try {
                    await fetch('/api/directive/complete', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ directiveId: dir.id }),
                    });
                    dir.status = 'completed';
                    // Auto-switch to done tab
                    setDirTab('done');
                  } catch {}
                }
              }
            } catch {}
          }
        }
        setDirectives(dirs);
      } else {
        setDirectives([]);
      }
      if (repRes.ok) setReports(await repRes.json());
      if (statusRes.ok) setAgents((await statusRes.json()).agents || {});
      if (decRes.ok) { const d = await decRes.json(); setDecisions(d.decisions || []); }
      // Fetch trade data
      try {
        const tradeRes = await fetch('/api/trades?period=month&limit=30');
        if (tradeRes.ok) setTradeData(await tradeRes.json());
      } catch {}

      if (monRes.ok) {
        const monData = await monRes.json();
        if (monData.length > 0) {
          const content = monData[0].content || '';
          // Parse key metrics from report content
          const usersMatch = content.match(/총 가입자: (\d+)명/);
          const sessionsMatch = content.match(/오늘 세션: (\d+)건/);
          const bidsMatch = content.match(/총 공고: ([\d,]+)건/);
          const newBidsMatch = content.match(/오늘 신규: (\d+)건/);
          const feedbackMatch = content.match(/총 피드백: (\d+)건/);
          const ticketsMatch = content.match(/미해결 티켓: (\d+)건/);
          const serverMatch = content.match(/메인: (\d+) \((\d+)ms/);
          // Only show monitoring bar if we got a valid server response
          if (serverMatch && serverMatch[1] === '200') {
            setMonitoring({
              server: serverMatch[1],
              responseMs: parseInt(serverMatch[2]),
              users: usersMatch ? parseInt(usersMatch[1]) : 0,
              sessions: sessionsMatch ? parseInt(sessionsMatch[1]) : 0,
              bids: bidsMatch ? parseInt(bidsMatch[1].replace(/,/g, '')) : 0,
              newBids: newBidsMatch ? parseInt(newBidsMatch[1]) : 0,
              feedback: feedbackMatch ? parseInt(feedbackMatch[1]) : 0,
              tickets: ticketsMatch ? parseInt(ticketsMatch[1]) : 0,
              checkedAt: monData[0].created_at,
            });
          }
        }
      }
    } catch { /* */ }
    setLoading(false);
  }, []);

  const [refreshing, setRefreshing] = useState(false);
  const [activeCompany, setActiveCompany] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('y-active-company');
      if (saved) {
        sessionStorage.removeItem('y-active-company');
        return saved;
      }
    }
    return defaultId;
  });

  const [showScheduled, setShowScheduled] = useState(false);
  const [scheduledOps, setScheduledOps] = useState(INITIAL_SCHEDULED_OPS);
  const removeScheduledOp = (id: string) => setScheduledOps(prev => prev.filter(op => op.id !== id));
  useEffect(() => { if (open) fetchData(); }, [open, fetchData]);

  const [expandedDecision, setExpandedDecision] = useState<string | null>(null);

  // Auto-poll when directives are in progress
  useEffect(() => {
    const hasActive = directives.some(d => d.status === 'in_progress');
    if (!hasActive || !open) return;
    const interval = setInterval(() => {
      fetchData();
    }, 10000);
    return () => clearInterval(interval);
  }, [directives, open, fetchData]);
  // No auto-refresh — manual refresh button instead
  const handleRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  // Auto-assign agents based on directive content
  const autoAssign = (title: string, desc: string): { id: string; task: string }[] => {
    const text = `${title} ${desc}`.toLowerCase();
    const agents: { id: string; task: string }[] = [];
    if (/시장|market|트렌드|trend|경쟁|compet|분석|analy|조사|research|뉴스|news/.test(text)) agents.push({ id: 'searchy', task: 'Research' });
    if (/투자|invest|매매|trad|주식|stock|s&p|자산|asset|포트폴리오|portfolio/.test(text)) agents.push({ id: 'quanty', task: 'Analysis' }, { id: 'finy', task: 'Financial review' });
    if (/리스크|risk|위험|보안|security|감사|audit/.test(text)) agents.push({ id: 'skepty', task: 'Risk assessment' }, { id: 'guardy', task: 'Security check' });
    if (/마케팅|marketing|홍보|pr|sns|콘텐츠|content|브랜드|brand/.test(text)) agents.push({ id: 'buzzy', task: 'Marketing' }, { id: 'pixely', task: 'Creative' });
    if (/개발|develop|빌드|build|코드|code|배포|deploy|ui|api|버그|bug/.test(text)) agents.push({ id: 'buildy', task: 'Development' }, { id: 'stacky', task: 'Tech stack' });
    if (/전략|strategy|계획|plan|방향|direction/.test(text)) agents.push({ id: 'counsely', task: 'Strategic summary' });
    if (/전쟁|war|지정학|geopolit|경제|econom|글로벌|global/.test(text)) agents.push({ id: 'searchy', task: 'Research' }, { id: 'quanty', task: 'Impact analysis' }, { id: 'skepty', task: 'Risk assessment' });
    if (/채용|hire|인재|talent/.test(text)) agents.push({ id: 'hiry', task: 'Recruitment' });
    if (/법률|legal|규제|regulation|컴플라이언스|compliance/.test(text)) agents.push({ id: 'legaly', task: 'Legal review' });
    // Always include counsely for synthesis if not already
    if (!agents.find(a => a.id === 'counsely')) agents.push({ id: 'counsely', task: 'Synthesis' });
    // Deduplicate
    return agents.filter((a, i, arr) => arr.findIndex(b => b.id === a.id) === i);
  };

  const handleSubmit = async () => {
    if (!newTitle.trim()) return;
    setSubmitFeedback(ko ? 'Counsely 배정 중...' : 'Counsely assigning agents...');
    // Use manual assignees if set, otherwise ask Counsely
    let finalAssignees = newAssignees;
    if (newAssignees.length === 0) {
      try {
        const assignRes = await fetch('/api/directive/assign', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle, description: newDesc }),
        });
        if (assignRes.ok) {
          const { agents } = await assignRes.json();
          finalAssignees = agents;
        }
      } catch {}
      if (finalAssignees.length === 0) finalAssignees = autoAssign(newTitle, newDesc);
    }
    const res = await fetch('/api/directives', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, description: newDesc, assignees: finalAssignees, priority: newPriority }),
    });
    if (res.ok) {
      setNewTitle(''); setNewDesc(''); setNewAssignees([]); setShowNewForm(false);
      setSubmitFeedback(ko ? '지시사항이 등록되었습니다' : 'Directive submitted successfully');
      setTimeout(() => setSubmitFeedback(null), 3000);
      fetchData();
    } else {
      setSubmitFeedback(ko ? '등록 실패' : 'Failed to submit');
      setTimeout(() => setSubmitFeedback(null), 3000);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/directives', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    fetchData();
  };

  const [advancing, setAdvancing] = useState<string | null>(null);
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [dirTab, setDirTab] = useState<'pending'|'active'|'done'>(initialTab === 'done' ? 'done' : initialTab === 'active' ? 'active' : 'pending');

  // Update tab when initialTab changes (e.g., from workflow completion)
  useEffect(() => {
    if (initialTab === 'done') {
      setDirTab('done');
      // Auto-expand the latest done directive
      setTimeout(() => {
        const latest = doneDirs[0];
        if (latest) {
          setExpandedDecision(`dir-${latest.id}`);
          loadDirectiveResponses(latest.id);
        }
      }, 300);
    }
    else if (initialTab === 'active') setDirTab('active');
  }, [initialTab]);
  const [showGraph, setShowGraph] = useState(false);
  // moved to earlier position
  const { speak, stop, speaking, supported: ttsSupported } = useTTS({ lang: ko ? 'ko-KR' : 'en-US' });
  const advanceDecision = async (id: string, status: string, currentStatus?: string) => {
    setAdvancing(id);
    try {
      if (currentStatus === 'pending') {
        // Directive: pending → approval_requested (simple status change)
        await fetch('/api/decisions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'approval_requested', changed_by: 'chairman' }) });
      } else if (currentStatus === 'detected') {
        // Full auto-advance pipeline
        await fetch('/api/decisions/advance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      } else if (currentStatus === 'discussion_needed') {
        // Actual agent meeting
        await fetch('/api/decisions/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'discuss' }) });
      } else if (currentStatus === 'decision_pending') {
        // Request chairman approval
        await fetch('/api/decisions/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'request_approval' }) });
      } else if (currentStatus === 'approval_requested') {
        // Chairman approves → execute → complete
        const note = decisionNotes[id]?.trim();
        await fetch('/api/decisions/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'approve', ...(note ? { note } : {}) }) });
      } else {
        // Fallback: simple status change
        await fetch('/api/decisions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status, changed_by: 'chairman' }) });
      }
    } finally { setAdvancing(null); }
    fetchData();
  };

  const rejectDecision = async (id: string) => {
    setAdvancing(id);
    try {
      const note = decisionNotes[id]?.trim();
      await fetch('/api/decisions/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'reject', ...(note ? { note } : {}) }) });
    } finally { setAdvancing(null); }
    fetchData();
  };

  const executeDirective = async (directiveId: string) => {
    setAdvancing(directiveId);
    try {
      const chairmanNote = decisionNotes[directiveId]?.trim();
      const res = await fetch('/api/directive/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          directiveId,
          ...(chairmanNote ? { chairmanNote } : {})
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log(`[check] Directive executed: ${data.tasksCreated} tasks created`);
        // Auto-open workflow graph to show live progress
        onClose();
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('y-navigate', { detail: { view: 'workflow' } }));
        }, 300);
      } else {
        const error = await res.json();
        console.error('Failed to execute directive:', error);
      }
    } catch (error) {
      console.error('Execute directive error:', error);
    } finally { 
      setAdvancing(null); 
    }
    fetchData();
  };

  const deleteDecision = async (id: string) => {
    setAdvancing(id);
    try {
      await fetch(`/api/decisions?id=eq.${id}`, { method: 'DELETE' });
    } finally { setAdvancing(null); }
    fetchData();
  };

  if (!open) return null;

  // Directive card for kanban - now works with Decision objects
  const [directiveResponses, setDirectiveResponses] = useState<Record<string, { agent_id: string; message: string; elapsed_ms?: number; llm_model?: string }[]>>({});
  const loadDirectiveResponses = async (directiveId: string) => {
    try {
      const qRes = await fetch('/api/chat_queue?select=id,agent_id,response,status,metadata,llm_model&metadata->>directive_id=eq.${directiveId}');
      if (qRes.ok) {
        const items = await qRes.json();
        setDirectiveResponses(prev => ({ ...prev, [directiveId]: items.map((q: any) => ({ agent_id: q.agent_id, message: q.response || '', elapsed_ms: q.metadata?.elapsed_ms, llm_model: q.llm_model })) }));
      }
    } catch {}
  };

  const DirectiveCard = ({ d, done }: { d: Decision; done?: boolean }) => {
    const rawTitle = (!ko && d.title_en) ? d.title_en : d.title;
    const prio = parsePrio(rawTitle);
    const title = localizeText(cleanTitle(rawTitle), lang);
    const isExpanded = expandedDecision === `dir-${d.id}`;
    
    // Get assignees from trigger_data.assignees or assignees array
    let assignees: string[] = [];
    if (d.trigger_data?.assignees && Array.isArray(d.trigger_data.assignees)) {
      assignees = d.trigger_data.assignees;
    } else if (d.assignees && Array.isArray(d.assignees)) {
      assignees = d.assignees;
    } else if (typeof d.assignees === 'string') {
      try {
        const parsed = JSON.parse(d.assignees);
        assignees = Array.isArray(parsed) ? parsed : [];
      } catch {}
    }

    // Progress display
    const progress = d.progress || { total: 0, completed: 0, agent_results: {} };
    const progressPercent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
    
    return (
      <div 
        className={`rounded-lg border p-2.5 cursor-pointer transition-colors ${done ? 'border-emerald-500/20 bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06]' : 'border-white/8 bg-white/[0.02] hover:bg-white/[0.04]'}`}
        onClick={() => {
          const key = `dir-${d.id}`;
          if (expandedDecision === key) { setExpandedDecision(null); }
          else { setExpandedDecision(key); loadDirectiveResponses(d.id); }
        }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          {done && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
          <span className="text-white text-[13px] font-medium flex-1 truncate">{title}</span>
          <PrioDot prio={prio} />
        </div>
        {done && !isExpanded && (
          <p className="text-emerald-400/60 text-[11px] mt-0.5">{ko ? '클릭하여 에이전트 보고서 보기' : 'Click to view agent reports'}</p>
        )}
        {d.description && (
          <p className="text-[12px] text-gray-500 mb-1.5 line-clamp-2">{localizeText(cleanMarkdown(d.description), lang)}</p>
        )}
        
        {/* Progress display for in_progress directives */}
        {d.status === 'in_progress' && progress.total > 0 && (
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] text-blue-400">{ko ? '진행률' : 'Progress'}</span>
              <span className="text-[11px] text-white font-medium">{progress.completed}/{progress.total} agents</span>
              <span className="text-[11px] text-gray-500">({progressPercent}%)</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div 
                className="bg-blue-400 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {assignees.length > 0 && (
          <div className="space-y-1 mb-1.5">
            {assignees.map(agentId => {
              const agentResult = progress.agent_results?.[agentId];
              const isCompleted = agentResult?.status === 'completed' || !!agentResult?.completed_at;
              return (
                <div key={agentId} className="flex items-center gap-1.5 bg-white/[0.03] rounded px-2 py-1">
                  <AgentAvatar id={agentId} size="xs" />
                  <span className="text-white text-[12px] font-medium">{AG[agentId]?.name}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    isCompleted ? 'bg-green-400' : 
                    agents[agentId]?.status === 'working' ? 'bg-blue-400 animate-pulse' : 
                    agents[agentId]?.status === 'idle' ? 'bg-yellow-400' : 'bg-gray-600'
                  }`} />
                  {isCompleted && <Check className="w-3 h-3 text-green-400 inline" />}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] text-gray-700">{timeAgo(d.created_at)}</span>
          <div className="flex gap-1">
            {!done && d.status === 'pending' && (
              <button 
                onClick={() => executeDirective(d.id)} 
                disabled={!!advancing}
                className="text-[12px] bg-blue-400/10 text-blue-400 px-2 py-0.5 rounded hover:bg-blue-400/20 disabled:opacity-50 flex items-center gap-1"
              >
                {advancing === d.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                {ko ? '승인 & 실행' : 'Approve & Execute'}
              </button>
            )}
            {!done && d.status === 'in_progress' && progress.completed >= progress.total && (
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  setAdvancing(d.id);
                  try {
                    await fetch('/api/directive/complete', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ directiveId: d.id }),
                    });
                  } finally { setAdvancing(null); }
                  fetchData();
                }} 
                disabled={advancing === d.id}
                className="text-[12px] bg-green-400/10 text-green-400 px-2 py-0.5 rounded hover:bg-green-400/20 disabled:opacity-50 flex items-center gap-1"
              >
                {advancing === d.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                {ko ? '완료 처리' : 'Mark Done'}
              </button>
            )}
            {done && (
              <button
                onClick={(e) => { e.stopPropagation(); if (confirm(ko ? '삭제하시겠습니까?' : 'Delete?')) deleteDecision(d.id); }}
                className="text-[12px] bg-gray-500/10 text-gray-400 px-2 py-0.5 rounded hover:bg-red-500/20 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Agent responses panel */}
        {isExpanded && (
          <div className="mt-2 pt-2 border-t border-white/5 space-y-2">
            <span className="text-[11px] text-gray-500 uppercase tracking-wider">{ko ? '에이전트 응답' : 'Agent Responses'}</span>
            {(directiveResponses[d.id] || []).length === 0 ? (
              <p className="text-[12px] text-gray-600">{ko ? '응답 없음' : 'No responses yet'}</p>
            ) : (
              (directiveResponses[d.id] || []).map((r, i) => (
                <div key={i} className="bg-black/30 rounded-lg p-2.5 border border-white/5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AgentAvatar id={r.agent_id} size="xs" />
                    <span className="text-[12px] text-amber-400 font-medium">{AG[r.agent_id]?.name || r.agent_id}</span>
                    {r.elapsed_ms && <span className="text-[10px] text-gray-600"><Timer className="w-3 h-3 inline" /> {(r.elapsed_ms / 1000).toFixed(1)}s</span>}
                    {r.llm_model && <span className="text-[10px] text-gray-700">{r.llm_model.split(':').pop()}</span>}
                  </div>
                  <div className="text-[12px] text-gray-300 whitespace-pre-wrap max-h-[60vh] sm:max-h-[400px] overflow-y-auto leading-relaxed overscroll-contain">
                    {r.message ? localizeText(cleanMarkdown(r.message.slice(0, 3000)), lang) : (ko ? '처리 중...' : 'Processing...')}
                    {r.message && r.message.length > 3000 && <span className="text-gray-600">...</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  const timeAgo = (d: string) => {
    if (!d) return '-';
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return ko ? '방금' : 'now';
    if (m < 60) return `${m}${ko ? '분' : 'm'}`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}${ko ? '시간' : 'h'}`;
    return `${Math.floor(h / 24)}${ko ? '일' : 'd'}`;
  };

  const parsePrio = (t: string) => (t.match(/^\[(URGENT|HIGH|NORMAL|LOW)\]/i)?.[1]?.toLowerCase() || 'normal');
  const cleanTitle = (t: string) => t.replace(/^\[(URGENT|HIGH|NORMAL|LOW)\]\s*/i, '');
  const prioStyle: Record<string, string> = {
    urgent: 'text-red-400', high: 'text-orange-400', normal: 'text-blue-400', low: 'text-gray-500',
  };
  const PrioDot = ({ prio }: { prio: string }) => {
    const colors: Record<string, string> = { urgent: 'text-red-500 fill-red-500', high: 'text-orange-400 fill-orange-400', normal: 'text-blue-400 fill-blue-400', low: 'text-gray-400 fill-gray-400' };
    return <Circle className={`w-2.5 h-2.5 ${colors[prio] || colors.normal}`} />;
  };

  const dbWorking = Object.entries(agents).filter(([, a]) => a.status === 'working');
  const dbIdle = Object.entries(agents).filter(([, a]) => a.status === 'idle');
  // Count unique connected agents (deduplicate across companies)
  const connectedAgentSet = new Set<string>();
  userCompanies.forEach(c => (c.agents || []).forEach((a: string) => connectedAgentSet.add(a)));
  const connectedAgentCount = Math.min(connectedAgentSet.size, 30);
  // Real data: working = agents with active chat_queue tasks, idle = connected but not working, rest = unassigned
  const working = dbWorking.length > 0 ? dbWorking : [];
  const idle = dbIdle.length > 0 ? dbIdle : [];
  const workingCount = Math.min(working.length, 30);
  const idleCount = connectedAgentCount > 0 ? Math.max(0, connectedAgentCount - workingCount) : Math.min(idle.length, 30 - workingCount);
  const restCount = Math.max(0, 30 - workingCount - idleCount);
  const totalTasks = Object.values(agents).reduce((s, a) => s + a.tasksToday, 0) + reports.length;
  
  // Filter data by active company's agents
  const activeCompanyObj = COMPANIES.find(c => c.id === activeCompany);
  const companyAgentIds = activeCompanyObj?.agents || [];
  const isUserCompany = activeCompanyObj && 'isUserCompany' in activeCompanyObj && activeCompanyObj.isUserCompany;
  
  const connectedAt = isUserCompany && activeCompanyObj && 'connectedAt' in activeCompanyObj ? activeCompanyObj.connectedAt : null;
  
  const filteredReports = !activeCompanyObj ? []
    : isUserCompany 
      ? reports.filter(r => companyAgentIds.includes(r.agent_id) && (!connectedAt || new Date(r.created_at) >= new Date(connectedAt)))
      : activeCompany === 'holdings' 
        ? reports 
        : reports.filter(r => companyAgentIds.includes(r.agent_id));
  
  const filteredDecisions = !activeCompanyObj ? []
    : isUserCompany
      ? decisions.filter(d => companyAgentIds.some(a => d.description?.toLowerCase().includes(a)) && (!connectedAt || new Date(d.created_at) >= new Date(connectedAt)))
      : activeCompany === 'holdings'
        ? decisions
        : decisions.filter(d => companyAgentIds.some(a => d.description?.toLowerCase().includes(a)));

  const pendingDirs = directives.filter(d => d.status === 'pending' || d.status === 'approval_requested');
  const activeDirs = directives.filter(d => d.status === 'in_progress' || d.status === 'executing');
  const doneDirs = directives.filter(d => d.status === 'done' || d.status === 'completed' || d.status === 'approved');
  const pendingReports = filteredReports.filter(r => r.status === 'pending');

  const filteredAg = assigneeSearch.trim()
    ? ALL_IDS.filter(id => (id.includes(assigneeSearch.toLowerCase()) || AG[id]?.name.toLowerCase().includes(assigneeSearch.toLowerCase())) && !newAssignees.find(a => a.id === id))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full h-full sm:w-[96vw] sm:h-[94vh] sm:max-w-[1400px] bg-[#080c16]/98 backdrop-blur-xl border-0 sm:border sm:border-white/10 sm:rounded-2xl overflow-hidden flex flex-col">

        {/* HEADER */}
        {/* HEADER */}
        <div className="p-4 sm:px-6 sm:py-4 border-b border-white/8 shrink-0">
          <div className="flex items-center justify-between mb-2 sm:mb-0">
            <h2 className="text-white font-bold text-base sm:text-lg"><Building2 className="w-4 h-4 inline" /> {ko ? '회장 대시보드' : 'Chairman Dashboard'}</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10"><X className="w-5 h-5 text-gray-400" /></button>
          </div>
          {/* Mobile: buttons on separate line — icon-only for space */}
          <div className="flex items-center gap-1.5 sm:hidden">
            <button onClick={() => setShowScheduled(!showScheduled)}
              className={`text-xs text-purple-400 border border-purple-400/30 p-1.5 rounded hover:bg-purple-400/10 ${showScheduled ? 'bg-purple-400/20' : ''}`}>
              <Clock className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleRefresh} disabled={refreshing}
              className="text-xs text-cyan-400 border border-cyan-400/30 p-1.5 rounded hover:bg-cyan-400/10 disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setShowNewForm(!showNewForm)}
              className="text-xs text-amber-400 border border-amber-400/30 px-2 py-1 rounded hover:bg-amber-400/10 flex items-center gap-1">
              <Plus className="w-3 h-3" /> {ko ? '지시사항' : 'Directive'}
            </button>
          </div>
          {/* Desktop: buttons inline — compact to avoid overflow */}
          <div className="hidden sm:flex items-center gap-1.5 absolute top-3 right-12">
            <button onClick={() => setShowScheduled(!showScheduled)}
              className={`text-[11px] text-purple-400 border border-purple-400/30 px-2 py-1 rounded-lg hover:bg-purple-400/10 flex items-center gap-1 ${showScheduled ? 'bg-purple-400/20' : ''}`}>
              <Clock className="w-3 h-3" />
            </button>
            <button onClick={handleRefresh} disabled={refreshing}
              className="text-[11px] text-cyan-400 border border-cyan-400/30 px-2 py-1 rounded-lg hover:bg-cyan-400/10 flex items-center gap-1 disabled:opacity-50">
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setShowNewForm(!showNewForm)}
              className="text-[11px] text-amber-400 border border-amber-400/30 px-2 py-1 rounded-lg hover:bg-amber-400/10 flex items-center gap-1">
              <Plus className="w-3 h-3" /> {ko ? '지시사항' : 'Directive'}
            </button>
          </div>
        </div>

        {/* STAT BAR — compact single line */}
        <div className="px-3 sm:px-5 py-1.5 flex items-center gap-3 border-b border-white/5 shrink-0 text-[12px]">
          <span className="text-gray-500 hidden sm:inline">{ko ? '에이전트' : 'Agents'}</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /><span className="text-green-400 font-bold">{workingCount}</span></span>
          <span className="text-gray-600">·</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400" /><span className="text-yellow-400 font-bold">{idleCount}</span></span>
          <span className="text-gray-600">·</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-600" /><span className="text-gray-500">{restCount}</span></span>
          <span className="text-gray-700 mx-1">|</span>
          <span className="text-amber-400 font-bold">{totalTasks}</span>
          <span className="text-gray-500">{ko ? '처리' : 'tasks'}</span>
          {pendingDirs.length > 0 && (
            <>
              <span className="text-gray-700 mx-1">|</span>
              <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-red-400" /><span className="text-red-400 font-bold">{pendingDirs.length}</span></span>
            </>
          )}
        </div>

        {/* COMPANY TABS — only shown when 2+ companies */}
        {isMultiCompany && (
          <div className="px-3 sm:px-5 py-1.5 border-b border-white/5 shrink-0 flex gap-1 overflow-x-auto">
            {COMPANIES.map(c => {
              const active = activeCompany === c.id;
              // Dynamic color classes (tailwind needs full strings for JIT)
              const colorMap: Record<string, string> = {
                amber: active ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30' : '',
                emerald: active ? 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/30' : '',
                cyan: active ? 'bg-cyan-400/15 text-cyan-400 border border-cyan-400/30' : '',
                blue: active ? 'bg-blue-400/15 text-blue-400 border border-blue-400/30' : '',
                pink: active ? 'bg-pink-400/15 text-pink-400 border border-pink-400/30' : '',
                orange: active ? 'bg-orange-400/15 text-orange-400 border border-orange-400/30' : '',
                violet: active ? 'bg-violet-400/15 text-violet-400 border border-violet-400/30' : '',
                slate: active ? 'bg-slate-400/15 text-slate-400 border border-slate-400/30' : '',
                teal: active ? 'bg-teal-400/15 text-teal-400 border border-teal-400/30' : '',
                purple: active ? 'bg-purple-400/15 text-purple-400 border border-purple-400/30' : '',
                yellow: active ? 'bg-yellow-400/15 text-yellow-400 border border-yellow-400/30' : '',
                rose: active ? 'bg-rose-400/15 text-rose-400 border border-rose-400/30' : '',
                indigo: active ? 'bg-indigo-400/15 text-indigo-400 border border-indigo-400/30' : '',
                green: active ? 'bg-green-400/15 text-green-400 border border-green-400/30' : '',
                fuchsia: active ? 'bg-fuchsia-400/15 text-fuchsia-400 border border-fuchsia-400/30' : '',
                gray: active ? 'bg-gray-400/15 text-gray-400 border border-gray-400/30' : '',
                zinc: active ? 'bg-zinc-400/15 text-zinc-400 border border-zinc-400/30' : '',
              };
              return (
                <button key={c.id} onClick={() => setActiveCompany(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition flex items-center gap-1.5 ${
                    active ? colorMap[c.color] || 'bg-white/10 text-white border border-white/20' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                  }`}>
                  <span>{c.icon}</span> {ko ? c.nameKo : c.name}
                </button>
              );
            })}
          </div>
        )}

        {/* MONITORING BAR */}
        {monitoring && (
          <div className="border-b border-white/5 shrink-0">
            <button
              onClick={async () => {
                if (!showMonitor && !monitorDetail) {
                  try {
                    const res = await fetch('/api/monitoring/product');
                    if (res.ok) setMonitorDetail(await res.json());
                  } catch {}
                }
                setShowMonitor(!showMonitor);
              }}
              className="w-full px-3 sm:px-5 py-1.5 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto text-[11px] sm:text-[12px]">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-gray-500 font-medium hidden sm:inline">Product Dashboard</span>
                  <span className="text-gray-500 font-medium sm:hidden">MBW</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-medium ${monitoring.server === '200' ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
                    {monitoring.server === '200' ? <CheckCircle2 className="w-3 h-3 inline text-green-400" /> : <XCircle className="w-3 h-3 inline text-red-400" />} {monitoring.responseMs}ms
                  </span>
                </div>
                <span className="text-white/20 hidden sm:inline">│</span>
                <div className="flex items-center gap-1 shrink-0">
                  <Users className="w-3 h-3 text-blue-400/60" />
                  <span className="text-gray-400">{monitoring.users}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Activity className="w-3 h-3 text-cyan-400/60" />
                  <span className="text-gray-400">{monitoring.sessions}<span className="hidden sm:inline">{ko ? '세션' : ' ses'}</span></span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <FileText className="w-3 h-3 text-amber-400/60" />
                  <span className="text-gray-400">{monitoring.bids.toLocaleString()}<span className="hidden sm:inline">{ko ? '건' : ''}</span></span>
                </div>
                {monitoring.tickets > 0 && (
                  <div className="flex items-center gap-1 shrink-0">
                    <AlertTriangle className="w-3 h-3 text-red-400/60" />
                    <span className="text-red-400">{monitoring.tickets}<span className="hidden sm:inline">{ko ? '티켓' : ' tix'}</span></span>
                  </div>
                )}
                <span className="text-white/20 hidden sm:inline">│</span>
                <span className="text-gray-600 shrink-0 hidden sm:inline">{timeAgo(monitoring.checkedAt)}</span>
                <span className="text-gray-600 ml-auto shrink-0">{showMonitor ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}</span>
              </div>
            </button>

            {/* DETAIL PANEL */}
            {showMonitor && monitorDetail && (
              <div className="px-4 sm:px-6 pb-4 pt-2 space-y-4">
                {/* Feedback */}
                <div>
                  <h4 className="text-[12px] text-gray-500 font-medium mb-1.5"><MessageSquare className="w-3 h-3 inline" /> {ko ? '피드백' : 'Feedback'} ({monitorDetail.feedback.length})</h4>
                  {monitorDetail.feedback.length === 0 ? (
                    <p className="text-[12px] text-gray-600">{ko ? '피드백 없음' : 'No feedback'}</p>
                  ) : (
                    <div className="space-y-1.5">
                      {monitorDetail.feedback.map((f: any) => (
                        <div key={f.id} className="bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[12px] flex items-center gap-0.5">{Array.from({ length: f.rating || 0 }, (_, i) => <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />)}</span>
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400">{f.category || '일반'}</span>
                            <span className="text-[11px] text-gray-600 ml-auto">{timeAgo(f.created_at)}</span>
                          </div>
                          <p className="text-[13px] text-gray-300">{f.message || '-'}</p>
                          <p className="text-[11px] text-gray-600 mt-0.5">{f.user_email}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tickets */}
                <div>
                  <h4 className="text-[12px] text-gray-500 font-medium mb-1.5 flex items-center gap-1"><Ticket className="w-3 h-3" /> {ko ? '티켓' : 'Tickets'} ({monitorDetail.tickets.length})</h4>
                  {monitorDetail.tickets.length === 0 ? (
                    <p className="text-[12px] text-gray-600">{ko ? '티켓 없음' : 'No tickets'}</p>
                  ) : (
                    <div className="space-y-1.5">
                      {monitorDetail.tickets.map((t: any) => (
                        <div key={t.id} className="bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'open' ? 'bg-red-400' : 'bg-green-400'}`} />
                            <span className="text-[13px] text-gray-300 flex-1">{t.subject}</span>
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500">{t.status}</span>
                            <span className="text-[11px] text-gray-600">{timeAgo(t.created_at)}</span>
                          </div>
                          <p className="text-[11px] text-gray-600 mt-0.5">{t.email} · {t.category} · {t.priority}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* S&P500 TRADING BAR */}
        {tradeData && tradeData.stats.totalTrades > 0 && (
          <div className="border-b border-white/5 shrink-0">
            <button
              onClick={() => setShowTrades(!showTrades)}
              className="w-full px-3 sm:px-5 py-1.5 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto text-[11px] sm:text-[12px]">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-gray-500 font-medium">S&P500</span>
                  <span className="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
                    MES <span className="hidden sm:inline">{tradeData.stats.currentContract}</span>
                  </span>
                </div>
                <span className="text-white/20 hidden sm:inline">│</span>
                <div className="flex items-center gap-1 shrink-0">
                  <TrendingUp className="w-3 h-3 text-green-400/60" />
                  <span className={`font-medium ${tradeData.stats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {tradeData.stats.totalPnl >= 0 ? '+' : ''}{tradeData.stats.totalPnl}pt
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-gray-500 hidden sm:inline">{ko ? '승률' : 'Win'}</span>
                  <span className="text-gray-400">{tradeData.stats.winRate}%</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-gray-500">{tradeData.stats.totalTrades}<span className="hidden sm:inline">{ko ? '거래' : ' trades'}</span></span>
                  <span className="text-gray-600 hidden sm:inline">/ {tradeData.stats.tradingDays}{ko ? '일' : 'd'}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`font-medium ${tradeData.stats.totalDollars >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${tradeData.stats.totalDollars >= 0 ? '+' : ''}{tradeData.stats.totalDollars}
                  </span>
                </div>
                <span className="text-gray-600 ml-auto shrink-0">{showTrades ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}</span>
              </div>
            </button>

            {showTrades && (
              <div className="px-3 sm:px-5 pb-3 pt-1">
                <h4 className="text-[12px] text-gray-500 font-medium mb-1.5"><BarChart3 className="w-3 h-3 inline" /> {ko ? '최근 거래' : 'Recent Trades'}</h4>
                <div className="space-y-1">
                  {tradeData.trades.slice(0, 10).map((t: any) => (
                    <div key={t.id} className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded px-3 py-1.5 text-[12px]">
                      <span className={`px-1.5 py-0.5 rounded font-medium ${['BUY','LONG'].includes(t.direction) ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
                        {t.direction}
                      </span>
                      <span className="text-gray-500">{t.entry_price} → {t.exit_price}</span>
                      <span className={`font-medium ml-auto ${t.pnl_points >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {t.pnl_points >= 0 ? '+' : ''}{t.pnl_points}pt (${t.pnl_dollars})
                      </span>
                      <span className="text-gray-600">{t.strategy}</span>
                      <span className="text-gray-700">{timeAgo(t.exit_time)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submit Feedback Toast */}
        {submitFeedback && (
          <div className="mx-3 sm:mx-5 mb-2 px-4 py-2.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 text-sm font-medium animate-pulse">
            {submitFeedback}
          </div>
        )}

        {/* NEW DIRECTIVE FORM */}
        {showNewForm && (
          <div className="px-3 sm:px-5 py-3 border-b border-white/5 bg-amber-400/[0.02] shrink-0">
            <div className="flex gap-2 mb-2">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder={ko ? '지시 제목' : 'Title'}
                className="flex-1 bg-black/40 text-white text-base px-4 py-2.5 rounded-lg border border-white/10 outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 transition-colors" autoFocus />
              <select value={newPriority} onChange={e => setNewPriority(e.target.value)}
                className="bg-black/40 text-white text-[17px] px-2 py-2 rounded-lg border border-white/10 outline-none">
                <option value="urgent">● Urgent</option><option value="high">● High</option><option value="normal">● Normal</option><option value="low">○ Low</option>
              </select>
            </div>
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder={ko ? '상세 내용' : 'Details'} rows={2}
              className="w-full bg-black/40 text-white text-sm px-4 py-2.5 rounded-lg border border-white/10 outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 resize-none mb-2 transition-colors" />
            {newAssignees.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {newAssignees.map(a => (
                  <span key={a.id} className="flex items-center gap-1 bg-white/5 rounded px-2 py-1 text-[17px]">
                    <AgentAvatar id={a.id} /> {AG[a.id]?.name}
                    <input value={a.task} onChange={e => setNewAssignees(newAssignees.map(x => x.id === a.id ? { ...x, task: e.target.value } : x))}
                      placeholder={ko ? '업무' : 'task'} className="bg-transparent text-amber-300 text-[16px] w-16 outline-none" />
                    <button onClick={() => setNewAssignees(newAssignees.filter(x => x.id !== a.id))} className="text-gray-600 hover:text-red-400">×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <input value={assigneeSearch} onChange={e => setAssigneeSearch(e.target.value)} placeholder={ko ? '+ 담당자 검색' : '+ Search agent'}
                  className="w-full bg-black/40 text-white text-[17px] px-3 py-1.5 rounded-lg border border-white/10 outline-none" />
                {filteredAg.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#0d1220] border border-white/10 rounded-lg max-h-24 overflow-y-auto z-10">
                    {filteredAg.slice(0, 5).map(id => (
                      <button key={id} onClick={() => { setNewAssignees([...newAssignees, { id, task: '' }]); setAssigneeSearch(''); }}
                        className="w-full flex items-center gap-2 px-3 py-1 hover:bg-white/5 text-left text-[17px]">
                        <AgentAvatar id={id} /> <span className="text-white">{AG[id].name}</span> <span className="text-gray-500">{AG[id].dept}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => { setShowNewForm(false); setNewAssignees([]); }} className="text-sm text-gray-400 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-all">{ko ? '취소' : 'Cancel'}</button>
              <button onClick={handleSubmit} disabled={!newTitle.trim()}
                className="px-5 py-2 text-sm bg-amber-400 hover:bg-amber-300 active:bg-amber-500 active:scale-95 text-black font-bold rounded-lg disabled:opacity-30 disabled:hover:bg-amber-400 flex items-center gap-1.5 transition-all duration-150 shadow-lg shadow-amber-400/20 hover:shadow-amber-400/40">
                <Send className="w-3.5 h-3.5" /> {ko ? '지시' : 'Submit'}
              </button>
            </div>
          </div>
        )}

        {/* SCHEDULED OPERATIONS PANEL */}
        {showScheduled && (() => {
          const now = new Date();
          const currentHour = now.getHours();
          const currentMin = now.getMinutes();

          // Find next operation
          const sortedByHour = [...scheduledOps].sort((a, b) => a.hour - b.hour);
          const upcoming = sortedByHour.find(op => op.hour > currentHour || (op.hour === currentHour && parseInt(op.schedule.match(/:(\d{2})/)?.[1] || '0') > currentMin));
          const nextOp = upcoming || sortedByHour[0];
          const nextHour = nextOp?.hour ?? 0;
          const nextMinStr = nextOp?.schedule.match(/:(\d{2})/)?.[1] || '00';
          const nextMin = parseInt(nextMinStr);
          let diffMin = (nextHour * 60 + nextMin) - (currentHour * 60 + currentMin);
          if (diffMin <= 0) diffMin += 24 * 60;
          const diffH = Math.floor(diffMin / 60);
          const diffM = diffMin % 60;
          const nextLabel = nextOp ? `${nextOp.name} in ${diffH}h ${diffM}m` : '';

          const channelColor = (ch: string) => {
            if (ch === 'Telegram') return 'text-blue-400';
            if (ch === 'silent') return 'text-gray-600';
            if (ch.includes('trading')) return 'text-green-400';
            if (ch.includes('product')) return 'text-cyan-400';
            if (ch.includes('y-tower')) return 'text-amber-400';
            if (ch.includes('knowledge')) return 'text-purple-400';
            if (ch.includes('ai-papers')) return 'text-pink-400';
            if (ch.includes('daily-tracker')) return 'text-orange-400';
            if (ch.includes('strategy')) return 'text-red-400';
            return 'text-gray-400';
          };

          return (
            <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-400" />
                    {ko ? '예약 작업' : 'Scheduled Operations'}
                    <span className="text-[11px] bg-purple-400/20 text-purple-300 px-2 py-0.5 rounded-full font-medium">{scheduledOps.length} {ko ? '활성' : 'active'}</span>
                  </h3>
                  {nextOp && (
                    <p className="text-[11px] sm:text-[12px] text-gray-500 mt-1">
                      {ko ? '다음' : 'Next'}: <span className="text-purple-300">{nextLabel}</span>
                    </p>
                  )}
                </div>
                <button onClick={() => setShowScheduled(false)} className="text-gray-500 hover:text-white p-1 rounded hover:bg-white/10">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {SCHEDULE_GROUPS.map(group => {
                  const ops = scheduledOps.filter(op => op.hour >= group.min && op.hour < group.max).sort((a, b) => a.hour - b.hour);
                  if (ops.length === 0) return null;
                  return (
                    <div key={group.key}>
                      <h4 className="text-[11px] sm:text-[12px] text-gray-500 font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400/50" />
                        {ko ? group.labelKo : group.label} ({group.range})
                        <span className="text-gray-600 font-normal">· {ops.length}</span>
                      </h4>
                      <div className="space-y-1">
                        {ops.map(op => (
                          <div key={op.id} className="group/op flex items-center gap-2 sm:gap-3 bg-white/[0.03] border border-white/5 rounded-lg px-2.5 sm:px-3 py-2 hover:bg-white/[0.05] transition-colors">
                            <div className="shrink-0">
                              {op.agent ? (
                                <AgentAvatar id={op.agent} size="sm" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-gray-700 border border-white/10 flex items-center justify-center">
                                  <Clock className="w-3 h-3 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white text-[12px] sm:text-[13px] font-medium truncate">{op.name}</div>
                              <div className="text-gray-500 text-[10px] sm:text-[11px]">{op.schedule}</div>
                            </div>
                            <span className={`text-[10px] sm:text-[11px] shrink-0 ${channelColor(op.channel)}`}>{op.channel}</span>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${op.status === 'ok' ? 'bg-green-400' : 'bg-red-400'}`} />
                            <button onClick={(e) => { e.stopPropagation(); removeScheduledOp(op.id); }}
                              className="shrink-0 text-gray-600 hover:text-red-400 p-0.5 rounded hover:bg-red-400/10 opacity-0 group-hover/op:opacity-100 transition-opacity"
                              title={ko ? '삭제' : 'Remove'}>
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* MAIN GRID — company-specific content */}
        {!showScheduled && <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-3">
          {activeCompany === 'capital' ? (
            <CapitalDashboard lang={lang} />
          ) : activeCompany === 'saas' ? (
            <div className="p-6 text-center text-gray-500 text-sm">Connect your SaaS product to see metrics here</div>
          ) : activeCompany.startsWith('user-') ? (
            (() => {
              const uc = COMPANIES.find(c => c.id === activeCompany);
              return uc ? <UserCompanyDashboard company={uc} lang={lang} onClose={onClose} /> : null;
            })()
          ) : loading ? <div className="text-center text-gray-500 py-10">Loading...</div> : (
            <div className="flex flex-col gap-2 sm:gap-3">

              {/* ROW 0: Decision Pipeline — compact, readable */}
              {decisions.length > 0 && (() => {
                const active = decisions.filter(d => d.status !== 'completed' && d.status !== 'rejected');
                const top5 = active; // show all (was .slice(0, 5))
                const PrioIcon = ({ p }: { p: string }) => {
                  const c: Record<string, string> = { critical: 'text-red-500 fill-red-500', high: 'text-orange-400 fill-orange-400', medium: 'text-blue-400 fill-blue-400', low: 'text-gray-400 fill-gray-400' };
                  return <Circle className={`w-2.5 h-2.5 inline ${c[p] || c.medium}`} />;
                };
                const typeLabel: Record<string, string> = {
                  market_response: ko ? '시장' : 'Market', product_development: ko ? '제품' : 'Product',
                  investment: ko ? '투자' : 'Invest', content_publish: ko ? '콘텐츠' : 'Content',
                  ops_incident: ko ? '운영' : 'Ops', hiring: ko ? '채용' : 'HR',
                  strategy: ko ? '전략' : 'Strategy', risk_alert: ko ? '리스크' : 'Risk',
                };
                const statusBadge: Record<string, { label: string; color: string }> = {
                  detected: { label: ko ? '대기' : 'Pending', color: 'bg-yellow-400/20 text-yellow-300' },
                  analyzing: { label: ko ? '대기' : 'Pending', color: 'bg-yellow-400/20 text-yellow-300' },
                  discussion_needed: { label: ko ? '대기' : 'Pending', color: 'bg-yellow-400/20 text-yellow-300' },
                  in_discussion: { label: ko ? '대기' : 'Pending', color: 'bg-yellow-400/20 text-yellow-300' },
                  decision_pending: { label: ko ? '대기' : 'Pending', color: 'bg-yellow-400/20 text-yellow-300' },
                  approval_requested: { label: ko ? '결재' : 'Approve', color: 'bg-red-400/20 text-red-300' },
                  approved: { label: ko ? '완료' : 'Done', color: 'bg-green-400/20 text-green-300' },
                  executing: { label: ko ? '완료' : 'Done', color: 'bg-green-400/20 text-green-300' },
                };
                // Simplified: all pre-approval states jump straight to approval_requested
                const nextMap: Record<string, string> = {
                  pending: 'approval_requested',
                  detected: 'approval_requested', analyzing: 'approval_requested', discussion_needed: 'approval_requested',
                  in_discussion: 'approval_requested', decision_pending: 'approval_requested',
                  approval_requested: 'approved', approved: 'completed', executing: 'completed',
                };

                // Count per stage
                // Merge statuses into 3 groups: 대기, 결재, 완료
                const pendingStatuses = ['pending', 'detected', 'analyzing', 'discussion_needed', 'in_discussion', 'decision_pending'];
                const pendingCount = active.filter(d => pendingStatuses.includes(d.status)).length;
                const approvalCount = active.filter(d => d.status === 'approval_requested').length;
                const doneCount = active.filter(d => d.status === 'approved' || d.status === 'executing').length;
                const stageCounts = [
                  { key: 'pending', label: ko ? '대기' : 'Pending', color: 'bg-yellow-400/20 text-yellow-300', count: pendingCount },
                  { key: 'approval', label: ko ? '결재' : 'Approve', color: 'bg-red-400/20 text-red-300', count: approvalCount },
                  { key: 'done', label: ko ? '완료' : 'Done', color: 'bg-green-400/20 text-green-300', count: doneCount },
                ].filter(s => s.count > 0);

                return (
                  <div className="bg-white/[0.04] rounded-2xl border border-white/8 p-4 sm:p-5 shrink-0 hover:bg-white/[0.06] transition-colors duration-300">
                    {/* Header line 1: title + graph button */}
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="text-[16px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5 text-purple-400" />
                        {ko ? '의사결정' : 'Decisions'}
                        <span className="text-purple-300 font-bold">{active.length}</span>
                      </h3>
                      <button onClick={() => setShowGraph(!showGraph)}
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors ${showGraph ? 'bg-purple-500/30 text-purple-300' : 'bg-white/5 text-gray-500 hover:text-gray-300'}`}>
                        <Network className="w-3 h-3 inline mr-0.5" />{ko ? '그래프' : 'Graph'}
                      </button>
                    </div>
                    {/* Header line 2: stage pills */}
                    <div className="flex items-center gap-1 mb-2 overflow-x-auto">
                      {stageCounts.map(s => (
                        <span key={s.key} className={`text-[11px] px-1.5 py-0.5 rounded-full ${s.color} font-medium shrink-0`}>
                          {s.label} {s.count}
                        </span>
                      ))}
                    </div>

                    {/* Decision rows — scrollable */}
                    <div className="space-y-1 max-h-[30vh] overflow-y-auto pr-1">
                      {top5.map(d => {
                        const badge = statusBadge[d.status] || { label: d.status, color: 'bg-gray-400/10 text-gray-400' };
                        const tLabel = typeLabel[d.type] || d.type;
                        // Truncate and translate-friendly title
                        const rawTitle = ko
                          ? (d.trigger_data?.title_ko || d.title)
                          : (d.title_en || d.trigger_data?.title_en || localizeText(d.title, lang));
                        // Mobile: 2-line title, Desktop: truncate at 60
                        const title = cleanMarkdown(rawTitle.length > 60 ? rawTitle.slice(0, 60) + '…' : rawTitle);
                        return (
                          <div key={d.id} className="border-b border-white/[0.04] last:border-0">
                          <div className="py-3 px-3 rounded-lg hover:bg-white/[0.05] group cursor-pointer" onClick={() => setExpandedDecision(expandedDecision === d.id ? null : d.id)}>
                            {/* Row 1: Context line — status + type + time */}
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[12px] shrink-0"><PrioIcon p={d.priority} /></span>
                              <Badge variant="outline" className={`text-[12px] px-2 py-0.5 border-0 shrink-0 font-semibold ${badge.color}`}>{badge.label}</Badge>
                              <span className="text-[12px] text-purple-300/80 font-medium">{tLabel}</span>
                              <span className="text-[12px] text-gray-500 ml-auto">{timeAgo(d.updated_at)}</span>
                            </div>
                            {/* Row 2: Title — 2 lines allowed on mobile */}
                            <p className="text-[15px] text-white font-semibold leading-snug mb-1.5 line-clamp-2 sm:line-clamp-1" title={d.analysis || ''}>{title}</p>
                            {/* Row 3: Lv + Assignee + Action */}
                            <div className="flex items-center gap-2">
                              {d.delegation_level && <Badge variant="outline" className={`text-[11px] px-1.5 py-0.5 font-medium border-0 ${d.delegation_level <= 1 ? 'bg-gray-500/20 text-gray-400' : d.delegation_level === 2 ? 'bg-blue-500/20 text-blue-300' : d.delegation_level === 3 ? 'bg-orange-500/20 text-orange-300' : 'bg-red-500/20 text-red-300'}`}>Lv{d.delegation_level}</Badge>}
                              {d.current_assignee && AG[d.current_assignee] && (
                                <span className="text-[13px] text-amber-400/90 flex items-center gap-1">
                                  <AgentAvatar id={d.current_assignee} />
                                  <span className="font-medium">{AG[d.current_assignee].name}</span>
                                </span>
                              )}
                              {d.status === 'approval_requested' ? (
                                <div className="flex flex-col gap-1.5 ml-auto w-full sm:w-auto">
                                  {/* Mobile: input first, then buttons */}
                                  <input
                                    value={decisionNotes[d.id] || ''}
                                    onChange={e => setDecisionNotes(prev => ({ ...prev, [d.id]: e.target.value }))}
                                    onClick={e => e.stopPropagation()}
                                    placeholder={ko ? '지시사항 (선택)' : 'Note (optional)'}
                                    className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] text-white placeholder-gray-500 focus:outline-none focus:border-amber-400/40 w-full sm:min-w-[160px]"
                                  />
                                  <div className="flex items-center gap-1 justify-end">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); advanceDecision(d.id, 'approved', d.status); }}
                                      disabled={advancing === d.id}
                                      className="text-[11px] sm:text-[12px] px-2 sm:px-2.5 py-1 rounded-md shrink-0 font-bold bg-green-500/20 text-green-300 hover:bg-green-500/30"
                                    >{advancing === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}</button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); rejectDecision(d.id); }}
                                      disabled={advancing === d.id}
                                      className="text-[11px] sm:text-[12px] px-2 sm:px-2.5 py-1 rounded-md shrink-0 font-bold bg-red-500/20 text-red-300 hover:bg-red-500/30"
                                    ><XCircle className="w-3 h-3" /></button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); if (confirm(ko ? '삭제하시겠습니까?' : 'Delete?')) deleteDecision(d.id); }}
                                      disabled={advancing === d.id}
                                      className="text-[11px] sm:text-[12px] px-2 sm:px-2.5 py-1 rounded-md shrink-0 font-bold bg-gray-500/20 text-gray-400 hover:bg-gray-500/30"
                                    ><Trash2 className="w-3 h-3" /></button>
                                  </div>
                                </div>
                              ) : nextMap[d.status] && d.status !== 'completed' && d.status !== 'rejected' ? (
                                <div className="flex items-center gap-1 ml-auto">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); advanceDecision(d.id, nextMap[d.status], d.status); }}
                                    disabled={advancing === d.id}
                                    className={`text-[12px] px-3 py-1 rounded-md shrink-0 font-bold transition-opacity ${advancing === d.id ? 'bg-amber-500/20 text-amber-300 animate-pulse' : 'bg-purple-500/15 text-purple-300 hover:bg-purple-500/30 opacity-60 group-hover:opacity-100'}`}
                                  >{advancing === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}</button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); if (confirm(ko ? '삭제하시겠습니까?' : 'Delete?')) deleteDecision(d.id); }}
                                    disabled={advancing === d.id}
                                    className="text-[12px] px-2.5 py-1 rounded-md shrink-0 font-bold bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 opacity-60 group-hover:opacity-100"
                                  ><Trash2 className="w-3 h-3" /></button>
                                </div>
                              ) : (d.status === 'completed' || d.status === 'rejected') ? (
                                <div className="flex items-center gap-1 ml-auto">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); if (confirm(ko ? '삭제하시겠습니까?' : 'Delete?')) deleteDecision(d.id); }}
                                    className="text-[12px] px-2.5 py-1 rounded-md shrink-0 font-bold bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 opacity-0 group-hover:opacity-100 transition-opacity"
                                  ><Trash2 className="w-3 h-3" /></button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                          {/* Expanded analysis panel */}
                          {expandedDecision === d.id && (d.analysis || d.review_notes) && (
                            <div className="px-3 pb-3 space-y-2 animate-in slide-in-from-top-1">
                              {ttsSupported && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (speaking) { stop(); }
                                    else {
                                      const agentName = AG[d.current_assignee || '']?.name || '';
                                      const text = `${d.title}. ${d.analysis || ''} ${d.review_notes || ''}`;
                                      speak(text, agentName);
                                    }
                                  }}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition ${
                                    speaking 
                                      ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30' 
                                      : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5'
                                  }`}
                                >
                                  {speaking ? <Square className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                                  {speaking ? (ko ? '중지' : 'Stop') : (ko ? '음성 브리핑' : 'Voice Brief')}
                                </button>
                              )}
                              {d.analysis && (
                                <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-2.5">
                                  <div className="flex items-center gap-1 mb-1.5">
                                    <span className="text-[16px] text-blue-300 font-bold"><AgentAvatar id={d.artifacts?.analysis_by || ''} /> {ko ? '분석' : 'Analysis'}</span>
                                    {d.delegation_level && <span className="text-[16px] text-gray-500">Lv{d.delegation_level}</span>}
                                  </div>
                                  <div className="leading-relaxed"><RenderMarkdown text={localizeText(d.analysis, lang)} /></div>
                                </div>
                              )}
                              {d.review_notes && (
                                <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5">
                                  <span className="text-[16px] text-amber-300 font-bold"><Search className="w-4 h-4 inline" /> {ko ? '검토' : 'Review'}</span>
                                  <div className="leading-relaxed mt-1.5"><RenderMarkdown text={localizeText(d.review_notes, lang)} /></div>
                                </div>
                              )}
                            </div>
                          )}
                          </div>
                        );
                      })}
                    </div>

                    {/* All items shown — scrollable */}
                  </div>
                );
              })()}

              {/* Decision Graph View */}
              {showGraph && (
                <div className="bg-white/[0.02] rounded-xl border border-white/5 p-3 shrink-0 relative">
                  <h3 className="text-[14px] text-gray-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Network className="w-3 h-3 text-purple-400" /> {ko ? '의사결정 관계 그래프' : 'Decision Knowledge Graph'}
                  </h3>
                  <DecisionGraph decisions={decisions} ko={ko} />
                </div>
              )}

              {/* ROW 1: 지시사항 칸반 보드 — 대기 → 진행 → 완료 */}
              {directives.length > 0 && (
              <div id="directive-pipeline" className="bg-white/[0.02] rounded-xl border border-white/5 p-3 shrink-0">
                <h3 className="text-[14px] text-gray-500 font-bold uppercase tracking-wider mb-3 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" /> {ko ? '지시사항 진행현황' : 'Directive Pipeline'}
                </h3>

                {/* Mobile: tabs */}
                <div className="sm:hidden">
                  <Tabs value={dirTab} onValueChange={(v) => setDirTab(v as 'pending'|'active'|'done')} className="mb-3">
                    <TabsList className="w-full bg-white/5 border border-white/5">
                      <TabsTrigger value="pending" className="flex-1 text-[13px] data-[state=active]:bg-yellow-400/15 data-[state=active]:text-yellow-400">
                        {ko ? '대기' : 'Pending'} {pendingDirs.length}
                      </TabsTrigger>
                      <TabsTrigger value="active" className="flex-1 text-[13px] data-[state=active]:bg-blue-400/15 data-[state=active]:text-blue-400">
                        {ko ? '진행중' : 'Active'} {activeDirs.length}
                      </TabsTrigger>
                      <TabsTrigger value="done" className="flex-1 text-[13px] data-[state=active]:bg-green-400/15 data-[state=active]:text-green-400">
                        {ko ? '완료' : 'Done'} {doneDirs.length}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <ScrollArea className="max-h-[40vh]"><div className="space-y-2">
                    {dirTab === 'pending' && (pendingDirs.length === 0
                      ? <p className="text-gray-700 text-[14px] text-center py-4">{ko ? '없음' : 'Empty'}</p>
                      : pendingDirs.map(d => <DirectiveCard key={d.id} d={d} />))}
                    {dirTab === 'active' && (activeDirs.length === 0
                      ? <p className="text-gray-700 text-[14px] text-center py-4">{ko ? '없음' : 'Empty'}</p>
                      : activeDirs.map(d => <DirectiveCard key={d.id} d={d} />))}
                    {dirTab === 'done' && (doneDirs.length === 0
                      ? <p className="text-gray-700 text-[14px] text-center py-4">{ko ? '없음' : 'Empty'}</p>
                      : doneDirs.map(d => <DirectiveCard key={d.id} d={d} done />))}
                  </div></ScrollArea>
                </div>

                {/* Desktop: 3 columns */}
                <div className="hidden sm:grid grid-cols-3 gap-3">
                  <div className="flex flex-col min-h-0">
                    <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-yellow-400/20">
                      <span className="w-2 h-2 rounded-full bg-yellow-400" />
                      <span className="text-yellow-400 text-[15px] font-bold">{ko ? '대기' : 'Pending'}</span>
                      <span className="text-gray-600 text-[14px]">{pendingDirs.length}</span>
                    </div>
                    <div className="space-y-2 overflow-y-auto flex-1">
                      {pendingDirs.length === 0 ? <p className="text-gray-700 text-[14px] text-center py-4">{ko ? '없음' : 'Empty'}</p> : pendingDirs.map(d => <DirectiveCard key={d.id} d={d} />)}
                    </div>
                  </div>
                  <div className="flex flex-col min-h-0">
                    <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-blue-400/20">
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                      <span className="text-blue-400 text-[15px] font-bold">{ko ? '진행중' : 'In Progress'}</span>
                      <span className="text-gray-600 text-[14px]">{activeDirs.length}</span>
                    </div>
                    <div className="space-y-2 overflow-y-auto flex-1">
                      {activeDirs.length === 0 ? <p className="text-gray-700 text-[14px] text-center py-4">{ko ? '없음' : 'Empty'}</p> : activeDirs.map(d => <DirectiveCard key={d.id} d={d} />)}
                    </div>
                  </div>
                  <div className="flex flex-col min-h-0">
                    <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-green-400/20">
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-green-400 text-[15px] font-bold">{ko ? '완료' : 'Done'}</span>
                      <span className="text-gray-600 text-[14px]">{doneDirs.length}</span>
                    </div>
                    <div className="space-y-2 overflow-y-auto flex-1">
                      {doneDirs.length === 0 ? <p className="text-gray-700 text-[14px] text-center py-4">{ko ? '없음' : 'Empty'}</p> : doneDirs.map(d => <DirectiveCard key={d.id} d={d} done />)}
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* ROW 2: 요약 카드 — 보고서 / 미결재 / 에이전트 (hide when directive response expanded on mobile) */}
              <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0 ${expandedDecision ? 'hidden sm:grid' : ''}`}>

                {/* 보고서 카드 */}
                <button 
                  onClick={() => onOpenReports?.()} 
                  className="bg-white/5 border border-white/10 backdrop-blur rounded-xl p-4 hover:bg-white/8 hover:scale-[1.02] transition-all duration-200 text-left group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="w-5 h-5 text-blue-400" />
                    <h3 className="text-[16px] text-gray-300 font-medium">{ko ? '최근 보고서' : 'Recent Reports'}</h3>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">{filteredReports.length}</div>
                  {filteredReports.length > 0 && (
                    <p className="text-[14px] text-gray-400 truncate group-hover:text-gray-300 transition-colors">
                      {localizeText(cleanMarkdown(filteredReports[0].title), lang)}
                    </p>
                  )}
                  <div className="mt-3 text-[12px] text-blue-400/70">
                    {ko ? '클릭하여 전체 보기' : 'Click to view all'}
                  </div>
                </button>

                {/* 미결재 카드 */}
                <button 
                  onClick={() => onOpenDecisions?.()} 
                  className="bg-white/5 border border-white/10 backdrop-blur rounded-xl p-4 hover:bg-white/8 hover:scale-[1.02] transition-all duration-200 text-left group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <ClipboardList className="w-5 h-5 text-orange-400" />
                    <h3 className="text-[16px] text-gray-300 font-medium">{ko ? '미결재 안건' : 'Pending Items'}</h3>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">
                    {pendingReports.length + pendingDirs.length}
                  </div>
                  {(pendingReports.length > 0 || pendingDirs.length > 0) ? (
                    <p className="text-[14px] text-gray-400 truncate group-hover:text-gray-300 transition-colors">
                      {pendingDirs.length > 0 
                        ? localizeText(cleanTitle(pendingDirs[0].title), lang)
                        : localizeText(cleanMarkdown(pendingReports[0].title), lang)
                      }
                    </p>
                  ) : (
                    <p className="text-[14px] text-green-400/60 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {ko ? '모두 처리됨' : 'All cleared'}</p>
                  )}
                  <div className="mt-3 text-[12px] text-orange-400/70">
                    {ko ? '클릭하여 처리하기' : 'Click to manage'}
                  </div>
                </button>

                {/* 에이전트 카드 */}
                <button 
                  onClick={() => onClose?.()} 
                  className="bg-white/5 border border-white/10 backdrop-blur rounded-xl p-4 hover:bg-white/8 hover:scale-[1.02] transition-all duration-200 text-left group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Users className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-[16px] text-gray-300 font-medium">{ko ? '에이전트' : 'Agents'}</h3>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">
                    {workingCount + idleCount} / 30 {ko ? '활동중' : 'active'}
                  </div>
                  {/* 에이전트 아바타 스택 */}
                  <div className="flex items-center gap-1 mb-3">
                    {[...working.slice(0, 3), ...idle.slice(0, 2)].map(([id], index) => (
                      <div key={id} className={`relative ${index > 0 ? '-ml-2' : ''}`}>
                        <AgentAvatar id={id} size="xs" />
                      </div>
                    ))}
                    {(working.length + idle.length) > 5 && (
                      <div className="relative -ml-2 w-4 h-4 rounded-full bg-gray-600 border border-white/10 flex items-center justify-center">
                        <span className="text-[8px] text-white font-bold">+{(working.length + idle.length) - 5}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 text-[12px] text-emerald-400/70">
                    {ko ? '타워뷰로 돌아가기' : 'Return to Tower View'}
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>}


      </div>
    </div>
  );
}

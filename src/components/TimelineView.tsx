'use client';

import { useState, useEffect, useMemo, ReactNode } from 'react';
import { Zap, FileText, TrendingUp, ClipboardList, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AGENT_ROSTER } from '@/data/agent-config';
import { Lang } from '@/data/i18n';
import { cleanMarkdown, localizeReportTitle, localizeText } from '@/lib/format-markdown';

interface TimelineEvent {
  id: string;
  time: string;
  type: 'decision' | 'report' | 'meeting' | 'directive' | 'trade';
  agentId: string;
  title: string;
  detail?: string;
  status?: string;
  priority?: string;
}

const TYPE_STYLE: Record<string, { icon: string; color: string; border: string }> = {
  decision: { icon: 'zap', color: 'text-amber-400', border: 'border-amber-400/30' },
  report: { icon: 'file', color: 'text-blue-400', border: 'border-blue-400/30' },
  meeting: { icon: 'users', color: 'text-purple-400', border: 'border-purple-400/30' },
  directive: { icon: 'clipboard', color: 'text-red-400', border: 'border-red-400/30' },
  trade: { icon: 'trending', color: 'text-green-400', border: 'border-green-400/30' },
};

import { Users } from 'lucide-react';

const ICON_MAP: Record<string, ReactNode> = {
  zap: <Zap className="w-3 h-3 inline" />,
  file: <FileText className="w-3 h-3 inline" />,
  users: <Users className="w-3 h-3 inline" />,
  clipboard: <ClipboardList className="w-3 h-3 inline" />,
  trending: <TrendingUp className="w-3 h-3 inline" />,
};
const renderIcon = (key: string) => ICON_MAP[key] || null;

const AG: Record<string, { image: string; name: string }> = {};
AGENT_ROSTER.forEach(a => { AG[a.id] = { image: `/agents/${a.number}-${a.id}.png`, name: a.name }; });
AG['chairman'] = { image: '/agents/00-andrew.png', name: 'Chairman' };


function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(ts: string, ko: boolean): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (d.toDateString() === today.toDateString()) return ko ? '오늘' : 'Today';
  if (d.toDateString() === yesterday.toDateString()) return ko ? '어제' : 'Yesterday';
  return d.toLocaleDateString(ko ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' });
}

interface Props {
  open: boolean;
  onClose: () => void;
  lang?: Lang;
}

export default function TimelineView({ open, onClose, lang = 'ko' }: Props) {
  const ko = lang === 'ko';
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    

    Promise.all([
      // Decisions
      fetch('/api/decisions?select=id,title,status,type,priority,current_assignee,created_at,updated_at&order=updated_at.desc&limit=50')
        .then(r => r.json()).catch(() => []),
      // Reports
      fetch('/api/reports?report_type=neq.health_check&select=id,agent_id,title,report_type,status,created_at&order=created_at.desc&limit=50')
        .then(r => r.json()).catch(() => []),
      // Meetings
      fetch('/api/meetings?select=id,topic,participants,created_at&order=created_at.desc&limit=20')
        .then(r => r.json()).catch(() => []),
      // Trades
      fetch('/api/trades?select=id,direction,pnl_points,pnl_dollars,exit_time&order=exit_time.desc&limit=20')
        .then(r => r.json()).catch(() => []),
    ]).then(([decisions, reports, meetings, trades]) => {
      const allEvents: TimelineEvent[] = [];
      // Ensure arrays (API might return error objects)
      const safeDecisions = Array.isArray(decisions) ? decisions : [];
      const safeReports = Array.isArray(reports) ? reports : [];
      const safeMeetings = Array.isArray(meetings) ? meetings : [];
      const safeTrades = Array.isArray(trades) ? trades : [];

      safeDecisions.forEach((d: any) => {
        allEvents.push({
          id: `d-${d.id}`,
          time: d.updated_at || d.created_at,
          type: 'decision',
          agentId: d.current_assignee || 'tasky',
          title: d.title,
          status: d.status,
          priority: d.priority,
        });
      });

      safeReports.forEach((r: any) => {
        if (r.report_type === 'directive') {
          allEvents.push({
            id: `dir-${r.id}`,
            time: r.created_at,
            type: 'directive',
            agentId: r.agent_id || 'chairman',
            title: r.title,
            status: r.status,
          });
        } else {
          allEvents.push({
            id: `r-${r.id}`,
            time: r.created_at,
            type: 'report',
            agentId: r.agent_id,
            title: r.title,
          });
        }
      });

      safeMeetings.forEach((m: any) => {
        allEvents.push({
          id: `m-${m.id}`,
          time: m.created_at,
          type: 'meeting',
          agentId: m.participants?.[0] || 'counsely',
          title: m.topic || 'Agent Meeting',
          detail: `${m.participants?.length || 0} participants`,
        });
      });

      safeTrades.forEach((t: any) => {
        allEvents.push({
          id: `t-${t.id}`,
          time: t.exit_time || t.created_at || new Date().toISOString(),
          type: 'trade',
          agentId: 'quanty',
          title: `${t.direction} ${t.pnl_points > 0 ? '+' : ''}${t.pnl_points?.toFixed(2)}pt ($${t.pnl_dollars?.toFixed(2)})`,
        });
      });

      allEvents.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setEvents(allEvents);
      setLoading(false);
    }).catch((err) => {
      console.error('Timeline fetch error:', err);
      setLoading(false);
    });
  }, [open]);

  // Group by date
  const grouped = useMemo(() => {
    const filtered = filter === 'all' ? events : events.filter(e => e.type === filter);
    const groups: Record<string, TimelineEvent[]> = {};
    filtered.forEach(e => {
      const date = formatDate(e.time, ko);
      if (!groups[date]) groups[date] = [];
      groups[date].push(e);
    });
    return groups;
  }, [events, filter, ko]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: events.length };
    events.forEach(e => { counts[e.type] = (counts[e.type] || 0) + 1; });
    return counts;
  }, [events]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full h-full sm:w-[96vw] sm:h-[94vh] sm:max-w-[1400px] bg-[#060a14]/98 sm:border sm:border-white/10 rounded-none sm:rounded-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 border-b border-white/5">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-base sm:text-lg"></span>
            <h2 className="text-white/90 text-xs sm:text-[15px] font-medium">{ko ? '활동 타임라인' : 'Activity Timeline'}</h2>
            <Badge variant="outline" className="text-[8px] sm:text-[10px] border-white/10 text-white/40">
              {events.length} {ko ? '건' : 'events'}
            </Badge>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-lg sm:text-xl"><X className="w-5 h-5" /></button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 border-b border-white/5 overflow-x-auto">
          {[
            { key: 'all', label: ko ? '전체' : 'All', icon: '' },
            { key: 'decision', label: ko ? '의사결정' : 'Decisions', icon: 'zap' },
            { key: 'report', label: ko ? '보고서' : 'Reports', icon: 'file' },
            { key: 'meeting', label: ko ? '회의' : 'Meetings', icon: 'users' },
            { key: 'directive', label: ko ? '지시사항' : 'Directives', icon: 'clipboard' },
            { key: 'trade', label: ko ? '트레이드' : 'Trades', icon: 'trending' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-0.5 sm:gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[9px] sm:text-[11px] font-medium transition shrink-0 ${
                filter === f.key 
                  ? 'bg-white/10 text-white border border-white/20' 
                  : 'text-white/40 hover:text-white/60 border border-transparent'
              }`}
            >
              {renderIcon(f.icon)} {f.label} {typeCounts[f.key] ? `(${typeCounts[f.key]})` : ''}
            </button>
          ))}
        </div>

        {/* Timeline content */}
        <ScrollArea className="flex-1">
          <div className="px-3 py-3 sm:px-4 sm:py-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-6 h-6 border-2 border-white/20 border-t-amber-400 rounded-full" />
              </div>
            ) : Object.entries(grouped).length === 0 ? (
              <p className="text-center text-white/30 py-20">{ko ? '이벤트가 없습니다' : 'No events found'}</p>
            ) : (
              Object.entries(grouped).map(([date, dayEvents]) => (
                <div key={date} className="mb-4 sm:mb-6">
                  {/* Date header */}
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <span className="text-xs sm:text-[13px] font-bold text-white/60">{date}</span>
                    <div className="flex-1 h-px bg-white/5" />
                    <Badge variant="outline" className="text-[8px] sm:text-[10px] border-white/10 text-white/30">
                      {dayEvents.length}
                    </Badge>
                  </div>

                  {/* Events */}
                  <div className="relative ml-2 sm:ml-4 border-l border-white/10">
                    {dayEvents.map((event, i) => {
                      const style = TYPE_STYLE[event.type] || TYPE_STYLE.report;
                      const agent = AG[event.agentId] || { image: '', name: event.agentId };
                      
                      return (
                        <div key={event.id} className="relative pl-4 sm:pl-6 pb-3 sm:pb-4 last:pb-0 group">
                          {/* Timeline dot */}
                          <div className={`absolute -left-[4px] sm:-left-[5px] top-1 sm:top-1.5 w-[8px] h-[8px] sm:w-[10px] sm:h-[10px] rounded-full border-2 ${style.border} bg-[#060a14] group-hover:scale-125 transition-transform`} />
                          
                          {/* Event card */}
                          <Card className={`bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all p-2 sm:p-3`}>
                            <div className="flex items-start gap-2 sm:gap-3">
                              {/* Agent avatar */}
                              <img src={agent.image} alt={agent.name} className="w-6 h-6 sm:w-8 sm:h-8 rounded-full shrink-0 object-cover border border-white/10" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              
                              <div className="flex-1 min-w-0">
                                {/* Top row: agent + type + time */}
                                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                                  <span className="text-[10px] sm:text-[12px] font-medium text-white/70">{agent.name}</span>
                                  <Badge variant="outline" className={`text-[7px] sm:text-[9px] px-1 py-0 sm:px-1.5 sm:py-0 border-0 ${style.color} bg-white/5`}>
                                    {renderIcon(style.icon)} {event.type}
                                  </Badge>
                                  {event.status && (
                                    <Badge variant="outline" className="text-[7px] sm:text-[9px] px-1 py-0 sm:px-1.5 sm:py-0 border-white/10 text-white/40">
                                      {event.status}
                                    </Badge>
                                  )}
                                  <span className="text-[8px] sm:text-[10px] text-white/30 ml-auto shrink-0">{formatTime(event.time)}</span>
                                </div>
                                
                                {/* Title */}
                                <p className="text-[11px] sm:text-[13px] text-white/80 leading-snug line-clamp-2">{localizeText(cleanMarkdown(event.title), lang)}</p>
                                
                                {event.detail && (
                                  <p className="text-[9px] sm:text-[11px] text-white/30 mt-0.5 sm:mt-1">{event.detail}</p>
                                )}
                              </div>
                            </div>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

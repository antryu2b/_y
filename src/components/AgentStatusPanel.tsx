'use client';
import { useState, useEffect } from 'react';
import { Activity, Coffee, Moon, X, Clock, ChevronRight } from 'lucide-react';
import { useLang } from '@/context/LangContext';
import { floors } from '@/data/floors';

interface AgentStatus {
  status: 'working' | 'idle' | 'resting';
  lastTask: string;
  lastActive: string;
  tasksToday: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

// Build agent list from floors data
const allAgents = floors.flatMap(floor =>
  floor.agents.map(a => ({
    id: a.id,
    name: a.name,
    number: a.number,
    image: a.image,
    floor: floor.level,
    department: floor.deptShort,
    role: a.role,
  }))
);

export default function AgentStatusPanel({ open, onClose }: Props) {
  const { lang } = useLang();
  const [statuses, setStatuses] = useState<Record<string, AgentStatus>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/api/agent-status')
      .then(r => r.json())
      .then(data => {
        setStatuses(data.agents || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const getStatusIcon = (s: string) => {
    switch (s) {
      case 'working': return <Activity className="w-3.5 h-3.5 text-green-400 animate-pulse" />;
      case 'idle': return <Coffee className="w-3.5 h-3.5 text-yellow-500" />;
      default: return <Moon className="w-3.5 h-3.5 text-gray-500" />;
    }
  };

  const getStatusLabel = (s: string) => {
    if (lang === 'ko') {
      switch (s) {
        case 'working': return '업무중';
        case 'idle': return '대기';
        default: return '휴식';
      }
    }
    return s;
  };

  const timeAgo = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return lang === 'ko' ? '방금' : 'just now';
    if (mins < 60) return `${mins}${lang === 'ko' ? '분 전' : 'm ago'}`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}${lang === 'ko' ? '시간 전' : 'h ago'}`;
    return `${Math.floor(hrs / 24)}${lang === 'ko' ? '일 전' : 'd ago'}`;
  };

  // Sort: working first, then idle, then resting
  const sortedAgents = [...allAgents].sort((a, b) => {
    const order = { working: 0, idle: 1, resting: 2 };
    const sa = statuses[a.id]?.status || 'resting';
    const sb = statuses[b.id]?.status || 'resting';
    return (order[sa] || 2) - (order[sb] || 2);
  });

  const working = Object.values(statuses).filter(s => s.status === 'working').length;
  const idle = Object.values(statuses).filter(s => s.status === 'idle').length;
  const resting = allAgents.length - working - idle;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:w-[480px] max-h-[85vh] bg-[#0a0e1a]/95 backdrop-blur-xl border border-white/10 rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div>
            <h2 className="text-white font-bold text-[15px]">
              {lang === 'ko' ? '에이전트 현황' : 'Agent Status'}
            </h2>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
              <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-green-400" /> {working}</span>
              <span className="flex items-center gap-1"><Coffee className="w-3 h-3 text-yellow-500" /> {idle}</span>
              <span className="flex items-center gap-1"><Moon className="w-3 h-3 text-gray-500" /> {resting}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Agent list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {loading ? (
            <div className="text-center text-gray-500 py-8 text-sm">
              {lang === 'ko' ? '로딩중...' : 'Loading...'}
            </div>
          ) : (
            sortedAgents.map(agent => {
              const s = statuses[agent.id];
              const status = s?.status || 'resting';
              return (
                <div
                  key={agent.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                    status === 'working' ? 'bg-green-500/5 border border-green-500/10' :
                    status === 'idle' ? 'bg-yellow-500/5 border border-yellow-500/5' :
                    'bg-white/[0.02] border border-transparent'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={agent.image}
                      alt={agent.name}
                      className="w-9 h-9 rounded-lg object-cover"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5">
                      {getStatusIcon(status)}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white text-[13px] font-semibold">#{agent.number}</span>
                      <span className="text-white text-[13px]">{agent.name}</span>
                      <span className="text-gray-500 text-[10px]">{agent.floor}F {agent.department}</span>
                    </div>
                    <div className="text-gray-400 text-[11px] truncate">
                      {s?.lastTask || (lang === 'ko' ? '활동 기록 없음' : 'No activity')}
                    </div>
                  </div>

                  {/* Time + tasks */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-[10px] text-gray-500 flex items-center gap-0.5 justify-end">
                      <Clock className="w-3 h-3" />
                      {s?.lastActive ? timeAgo(s.lastActive) : '-'}
                    </div>
                    {s?.tasksToday ? (
                      <div className="text-[10px] text-amber-400/70 mt-0.5">
                        {s.tasksToday}{lang === 'ko' ? '건' : ' tasks'}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

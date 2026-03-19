'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { Network, CheckCircle2, RefreshCw, Clock, ClipboardList, X } from 'lucide-react';
import { AGENT_ROSTER } from '@/data/agent-config';
import { floors as floorData } from '@/data/floors';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  Handle,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AgentDetailModal } from '@/components/AgentDetailModal';

// Agent data with positions in org flow
// 실행(왼) → 감지 → 분석 → 검증 → 종합 → 회장(오른)
const AGENT_NODES: { id: string; label: string; emoji: string; tier: string; group: string; x: number; y: number }[] = [
  // 실행 — 5명 (제일 왼쪽)
  { id: 'buildy', label: 'Buildy', emoji: 'BU', tier: 'Director', group: 'execute', x: 0, y: 0 },
  { id: 'wordy', label: 'Wordy', emoji: 'WO', tier: 'Manager', group: 'execute', x: 0, y: 190 },
  { id: 'pixely', label: 'Pixely', emoji: 'PX', tier: 'Manager', group: 'execute', x: 0, y: 380 },
  { id: 'helpy', label: 'Helpy', emoji: 'HE', tier: 'Staff', group: 'execute', x: 0, y: 570 },
  { id: 'stacky', label: 'Stacky', emoji: 'ST', tier: 'Director', group: 'execute', x: 0, y: 760 },

  // 감지 — 4명
  { id: 'searchy', label: 'Searchy', emoji: 'SE', tier: 'Manager', group: 'detect', x: 260, y: 50 },
  { id: 'watchy', label: 'Watchy', emoji: 'WA', tier: 'Manager', group: 'detect', x: 260, y: 270 },
  { id: 'tradey', label: 'Tradey', emoji: 'TR', tier: 'Manager', group: 'detect', x: 260, y: 490 },
  { id: 'opsy', label: 'Opsy', emoji: 'OP', tier: 'Director', group: 'detect', x: 260, y: 710 },
  
  // 분석 — 3명
  { id: 'tasky', label: 'Tasky', emoji: 'TA', tier: 'C-Suite', group: 'analyze', x: 530, y: 150 },
  { id: 'buzzy', label: 'Buzzy', emoji: 'BZ', tier: 'Director', group: 'analyze', x: 530, y: 380 },
  { id: 'quanty', label: 'Quanty', emoji: 'QU', tier: 'Director', group: 'analyze', x: 530, y: 610 },

  // 검증 — 2명
  { id: 'skepty', label: 'Skepty', emoji: 'SK', tier: 'Director', group: 'review', x: 780, y: 280 },
  { id: 'finy', label: 'Finy', emoji: 'FI', tier: 'C-Suite', group: 'review', x: 780, y: 480 },
  
  // 비서실장
  { id: 'counsely', label: 'Counsely', emoji: 'CO', tier: 'C-Suite', group: 'synthesis', x: 1030, y: 380 },
  
  // 회장 — 오른쪽 (최종 결정)
  { id: 'chairman', label: 'Chairman', emoji: 'CH', tier: 'Chairman', group: 'decision', x: 1280, y: 380 },
];

// Clean pyramid — each node connects to ONE direct superior only
type FlowEdge = { source: string; target: string; label?: string; animated?: boolean };
const FLOW_EDGES: FlowEdge[] = [
  // 감지 → 분석 (right to left)
  { source: 'searchy', target: 'tasky', animated: true },
  { source: 'watchy', target: 'buzzy' },
  { source: 'tradey', target: 'quanty' },
  { source: 'opsy', target: 'quanty' },
  // 분석 → 검증
  { source: 'tasky', target: 'skepty', animated: true },
  { source: 'buzzy', target: 'skepty' },
  { source: 'quanty', target: 'finy' },
  // 검증 → 종합
  { source: 'skepty', target: 'counsely', animated: true },
  { source: 'finy', target: 'counsely' },
  // 종합 → 회장
  { source: 'counsely', target: 'chairman', animated: true },
  // 피드백: 실행 → 감지
  { source: 'buildy', target: 'searchy' },
  { source: 'stacky', target: 'opsy' },
];

const TIER_COLORS: Record<string, string> = {
  'Chairman': '#f59e0b',
  'C-Suite': '#8b5cf6',
  'Director': '#3b82f6',
  'Manager': '#10b981',
  'Staff': '#6b7280',
};

const GROUP_LABELS_KO: [string, string][] = [
  ['execute', '실행'],
  ['detect', '감지'],
  ['analyze', '분석'],
  ['review', '검증'],
  ['synthesis', '종합'],
  ['decision', '회장'],
];
const GROUP_LABELS_EN: [string, string][] = [
  ['execute', 'EXECUTE'],
  ['detect', 'DETECT'],
  ['analyze', 'ANALYZE'],
  ['review', 'REVIEW'],
  ['synthesis', 'SYNTHESIS'],
  ['decision', 'CHAIRMAN'],
];

// Custom node component
function AgentNode({ data }: { data: any }) {
  const [pulse, setPulse] = useState(false);
  
  useEffect(() => {
    if (data.active) {
      const interval = setInterval(() => {
        setPulse(p => !p);
      }, 2000 + Math.random() * 2000);
      return () => clearInterval(interval);
    }
  }, [data.active]);

  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (data.onAgentClick) {
      data.onAgentClick(data.id);
    }
  };

  const handleBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onAgentClick) {
      data.onAgentClick(data.id);
    }
  };

  const ds = data.directiveStatus;
  const isDirectiveAgent = !!ds;
  const borderColor = ds === 'completed' ? '#22c55e' : ds === 'processing' ? '#f59e0b' : ds === 'pending' ? '#8b5cf6' : TIER_COLORS[data.tier] || '#6b7280';
  const glowColor = ds === 'completed' ? '#22c55e' : ds === 'processing' ? '#f59e0b' : ds === 'pending' ? '#8b5cf6' : TIER_COLORS[data.tier];

  return (
    <div className={`relative flex flex-col items-center transition-all duration-500 ${pulse ? 'scale-110' : 'scale-100'} ${ds === 'processing' ? 'animate-pulse' : ''}`}>
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-0 !w-3 !h-3" />
      
      {/* Glow ring — stronger for directive agents */}
      {(data.active || isDirectiveAgent) && (
        <div className={`absolute -inset-2 rounded-full opacity-20 ${ds === 'processing' ? 'animate-ping' : ds === 'completed' ? '' : 'animate-ping'}`}
          style={{ backgroundColor: glowColor }} />
      )}
      {ds === 'processing' && (
        <div className="absolute -inset-3 rounded-full border-2 border-amber-400/50 animate-spin" style={{ borderTopColor: 'transparent', borderRightColor: 'transparent' }} />
      )}
      
      <div 
        className="w-14 h-14 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 relative z-10 shadow-lg cursor-pointer hover:scale-105 transition-transform"
        style={{ 
          borderColor,
          boxShadow: isDirectiveAgent ? `0 0 25px ${glowColor}60` : data.active ? `0 0 20px ${TIER_COLORS[data.tier]}40` : 'none',
        }}
        onClick={handleNodeClick}
      >
        <img 
          src={data.image || `/agents/${data.id}.png`} 
          alt={data.label}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="flex items-center justify-center w-full h-full text-xl sm:text-3xl" style="background:${TIER_COLORS[data.tier] || '#6b7280'}20">${data.emoji}</span>`; }}
        />
      </div>
      <span className="text-xs sm:text-[16px] font-bold mt-1 sm:mt-1.5 text-white/90">{data.label}</span>
      <span className="text-[9px] sm:text-[13px] text-white/50">{(() => {
        if (data.desc) return data.desc.split('—')[0]?.trim();
        const tierKo: Record<string, string> = { Chairman: '회장', 'C-Suite': '임원', Director: '본부장', Manager: '팀장', Staff: '사원' };
        return data.lang === 'ko' ? (tierKo[data.tier] || data.tier) : data.tier;
      })()}</span>
      {/* Task status for directive agents */}
      {ds && (
        <div className="mt-1 max-w-[120px] sm:max-w-[160px]">
          <div className={`text-[10px] sm:text-[12px] px-2 py-1 rounded-lg text-center font-medium shadow-lg ${
            ds === 'completed' ? 'bg-green-500/30 text-green-200 border border-green-500/40' : 
            ds === 'processing' ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40 animate-pulse' : 
            'bg-purple-500/30 text-purple-200 border border-purple-500/40'
          }`}>
            {ds === 'completed' ? <><CheckCircle2 className="w-3 h-3 inline text-green-400" /> Done</> : ds === 'processing' ? <><RefreshCw className="w-3 h-3 inline animate-spin" /> Analyzing...</> : <><Clock className="w-3 h-3 inline" /> Queued</>}
          </div>
        </div>
      )}

      {/* Directive status badge */}
      {ds && (
        <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center z-20 text-[12px] shadow-lg ${
          ds === 'completed' ? 'bg-green-500' : ds === 'processing' ? 'bg-amber-500 animate-pulse' : 'bg-purple-500'
        }`}>
          {' '}
        </div>
      )}
      {!ds && data.taskCount > 0 && (
        <button
          onClick={handleBadgeClick}
          className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-400 text-white text-[11px] w-5 h-5 rounded-full flex items-center justify-center z-20 transition-colors cursor-pointer shadow-lg hover:shadow-xl hover:scale-110 transform"
          title={data.lang === 'ko' ? '클릭하여 상세 보기' : 'Click for details'}
        >
          {data.taskCount}
        </button>
      )}
      
      <Handle type="source" position={Position.Right} className="!bg-transparent !border-0 !w-3 !h-3" />
    </div>
  );
}

const nodeTypes = { agent: AgentNode };

interface Props {
  open: boolean;
  onClose: () => void;
  lang?: 'ko' | 'en';
}

export default function AgentFlowGraph({ open, onClose, lang = 'ko' }: Props) {
  const ko = lang === 'ko';
  const [decisions, setDecisions] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [directiveAgents, setDirectiveAgents] = useState<Record<string, 'pending' | 'processing' | 'completed'>>({});
  const [activeDirective, setActiveDirective] = useState<string | null>(null);
  const [agentTasks, setAgentTasks] = useState<Record<string, string>>({});

  const handleAgentClick = useCallback((agentId: string) => {
    setSelectedAgentId(agentId);
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setSelectedAgentId(null);
  }, []);

  // Fetch real data
  useEffect(() => {
    if (!open) return;
    
    Promise.all([
      fetch('/api/decisions?select=*&order=created_at.desc&limit=20', 
        ).then(r => r.json()).catch(() => []),
      fetch('/api/reports?report_type=neq.health_check&report_type=neq.directive&select=agent_id,title,created_at&order=created_at.desc&limit=20',
        ).then(r => r.json()).catch(() => []),
    ]).then(([d, r]) => {
      setDecisions(d);
      setReports(r);
    });
  }, [open]);

  // Poll directive agent status from chat_queue
  useEffect(() => {
    if (!open) return;
    
    const pollDirectiveStatus = async () => {
      try {
        // Find in_progress directives
        const dRes = await fetch("/api/decisions?status=eq.in_progress&order=created_at.desc&limit=1");
        const inProgress = await dRes.json();
        if (!inProgress?.length) {
          // Don't clear if overlay is showing (completed state)
          if (!showCompleteOverlay) { setDirectiveAgents({}); setActiveDirective(null); }
          return;
        }

        const directive = inProgress[0];
        setActiveDirective(directive.title || directive.id);

        // Get chat_queue tasks for this directive
        const qRes = await fetch('/api/chat_queue?metadata->>directive_id=eq.${directive.id}&select=agent_id,status,message');
        const tasks = await qRes.json();
        const statuses: Record<string, 'pending' | 'processing' | 'completed'> = {};
        const taskMap: Record<string, string> = {};
        (tasks || []).forEach((t: any) => {
          statuses[t.agent_id] = (t.status === 'completed' || t.status === 'done' || t.status === 'error') ? 'completed' : t.status === 'processing' ? 'processing' : 'pending';
          // Extract directive title from message
          const titleMatch = t.message?.match(/Title:\s*(.+)/);
          taskMap[t.agent_id] = titleMatch?.[1]?.trim() || directive.title || '';
        });
        setDirectiveAgents(statuses);
        setAgentTasks(taskMap);
      } catch { /* ignore */ }
    };

    pollDirectiveStatus();
    const interval = setInterval(pollDirectiveStatus, 5000);
    return () => clearInterval(interval);
  }, [open]);

  // Build active agent set from recent data
  const activeAgents = useMemo(() => {
    const set = new Set<string>();
    const dayAgo = Date.now() - 86400000;
    decisions.forEach(d => {
      if (new Date(d.created_at).getTime() > dayAgo) {
        if (d.current_assignee) set.add(d.current_assignee);
        set.add('skepty');
        set.add('counsely');
      }
    });
    reports.forEach(r => {
      if (new Date(r.created_at).getTime() > dayAgo) {
        set.add(r.agent_id);
      }
    });
    return set;
  }, [decisions, reports]);

  // Agent task counts
  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach(r => {
      counts[r.agent_id] = (counts[r.agent_id] || 0) + 1;
    });
    return counts;
  }, [reports]);

  const agentDescs: Record<string, string> = {};
  const agentRoles: Record<string, string> = {};
  const agentImages: Record<string, string> = { chairman: '/agents/00-andrew.png' };
  // Initialize from imported data
  AGENT_ROSTER.forEach((r) => { agentDescs[r.id] = r.desc || ''; agentImages[r.id] = `/agents/${r.number}-${r.id}.png`; });
  floorData.forEach((f) => f.agents?.forEach((a) => { agentRoles[a.id] = a.role || ''; }));
  agentDescs['chairman'] = '회장 — 최종 의사결정';
  agentRoles['chairman'] = 'Final Decision';

  const initialNodes: Node[] = AGENT_NODES.map(a => ({
    id: a.id,
    type: 'agent',
    position: { x: a.x, y: a.y },
    data: { 
      id: a.id,
      label: a.label, 
      emoji: a.emoji, 
      tier: a.tier,
      image: agentImages[a.id] || '',
      desc: ko ? (agentDescs[a.id] || '') : (agentRoles[a.id] || ''),
      lang,
      active: activeAgents.has(a.id),
      directiveStatus: directiveAgents[a.id] || null, taskLabel: agentTasks[a.id] || null,
      taskCount: taskCounts[a.id] || 0,
      onAgentClick: handleAgentClick,
    },
    draggable: true,
  }));

  // Feedback edges (실행→감지, dashed cyan)
  const feedbackPairs = new Set(['buildy→searchy', 'stacky→opsy']);
  const feedbackSources = new Set(['stacky', 'buildy']);
  const feedbackTargets = new Set(['opsy', 'searchy']);

  const initialEdges: Edge[] = FLOW_EDGES.map((e, i) => {
    const isActive = e.animated || activeAgents.has(e.source);
    const isFeedback = feedbackSources.has(e.source) && feedbackTargets.has(e.target);
    return {
      id: `e-${i}`,
      source: e.source,
      target: e.target,
      animated: isActive || isFeedback,
      style: { 
        stroke: isFeedback ? '#06b6d4' : (isActive ? '#f59e0b' : '#ffffff20'),
        strokeWidth: isActive ? 2 : 1.5,
        strokeDasharray: isFeedback ? '6 3' : undefined,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: isFeedback ? '#06b6d4' : (isActive ? '#f59e0b' : '#ffffff30'), width: 14, height: 14 },
    };
  });

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when data changes
  useEffect(() => {
    setNodes(AGENT_NODES.map(a => ({
      id: a.id,
      type: 'agent',
      position: { x: a.x, y: a.y },
      data: { 
        id: a.id,
        label: a.label, 
        emoji: a.emoji, 
        tier: a.tier,
        image: agentImages[a.id] || '',
        desc: ko ? (agentDescs[a.id] || '') : (agentRoles[a.id] || ''),
        lang,
        active: activeAgents.has(a.id),
        directiveStatus: directiveAgents[a.id] || null, taskLabel: agentTasks[a.id] || null,
        taskCount: taskCounts[a.id] || 0,
        onAgentClick: handleAgentClick,
      },
      draggable: true,
    })));
    setEdges(FLOW_EDGES.map((e, i) => {
      const isActive = e.animated || activeAgents.has(e.source);
      return {
        id: `e-${i}`,
        source: e.source,
        target: e.target,
        label: e.label,
        animated: isActive,
        style: { 
          stroke: isActive ? '#f59e0b' : '#ffffff30',
          strokeWidth: isActive ? 2.5 : 1.5,
        },
        labelStyle: { fill: isActive ? '#fbbf24' : '#ffffff50', fontSize: 10, fontWeight: isActive ? 600 : 400 },
        labelBgStyle: { fill: '#0a0f1a', fillOpacity: 0.9 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
        markerEnd: { type: MarkerType.ArrowClosed, color: isActive ? '#f59e0b' : '#ffffff40', width: 16, height: 16 },
      };
    }));
  }, [activeAgents, taskCounts, directiveAgents, agentTasks, handleAgentClick]);

  // Detect all agents completed
  const directiveAgentCount = Object.keys(directiveAgents).length;
  const completedCount = Object.values(directiveAgents).filter(s => s === 'completed').length;
  const allCompleted = directiveAgentCount > 0 && completedCount === directiveAgentCount;
  const [showCompleteOverlay, setShowCompleteOverlay] = useState(false);
  const [confettiParticles, setConfettiParticles] = useState<{ x: number; y: number; color: string; delay: number }[]>([]);

  useEffect(() => {
    if (allCompleted && !showCompleteOverlay) {
      // Generate confetti
      const particles = Array.from({ length: 40 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: ['#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444'][Math.floor(Math.random() * 5)],
        delay: Math.random() * 2,
      }));
      setConfettiParticles(particles);
      setTimeout(() => setShowCompleteOverlay(true), 1000);
    }
  }, [allCompleted]);

  const openDashboardDone = () => {
    onClose();
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('y-navigate', { detail: { view: 'dashboard', tab: 'done' } }));
    }, 300);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full h-full sm:w-[96vw] sm:h-[94vh] sm:max-w-[1400px] bg-[#060a14]/98 sm:border sm:border-white/10 rounded-none sm:rounded-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 border-b border-white/5">
          <div className="flex items-center gap-2 sm:gap-3">
            <Network className="w-4 h-4 sm:w-5 sm:h-5 text-white/60" />
            <h2 className="text-white/90 text-xs sm:text-[15px] font-medium flex items-center gap-2">
              {ko ? '에이전트 워크플로우' : 'Agent Workflow'}
              {activeDirective && (
                <span className="text-[10px] sm:text-[11px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full animate-pulse">
                  {activeDirective}
                </span>
              )}
            </h2>
            <span className="text-[9px] sm:text-[11px] text-white/30 hidden sm:inline">{ko ? '실시간 의사결정 흐름' : 'Real-time decision flow'}</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-lg sm:text-xl"><X className="w-5 h-5" /></button>
        </div>

        {/* Hint */}
        <div className="flex items-center px-3 py-1 sm:px-4 sm:py-1.5 border-b border-white/5">
          <span className="text-white/30 text-[8px] sm:text-[10px]">{ko ? '드래그 · 스크롤로 줌' : 'Drag nodes • Scroll to zoom'}</span>
        </div>

        {/* Flow Graph */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            proOptions={{ hideAttribution: true }}
            style={{ background: '#060a14' }}
          >
            <Background color="#ffffff08" gap={30} />
            <Controls 
              showInteractive={false}
              style={{ 
                background: '#0a0f1a', 
                borderColor: '#ffffff10', 
                borderRadius: '8px',
              }} 
            />
            <MiniMap 
              nodeColor={(node) => TIER_COLORS[(node.data as any)?.tier] || '#6b7280'}
              style={{ 
                background: '#0a0f1a', 
                borderColor: '#ffffff10',
                borderRadius: '8px',
              }}
              className="hidden sm:block"
              maskColor="#060a1490"
            />
          </ReactFlow>
        </div>

        {/* Flow stages legend */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 border-t border-white/5 overflow-x-auto">
          {(ko ? GROUP_LABELS_KO : GROUP_LABELS_EN).map(([key, label], i, arr) => (
            <span key={key} className="flex items-center gap-0.5 sm:gap-1 text-[8px] sm:text-[10px] text-white/40 shrink-0">
              {label}
              {i < arr.length - 1 && <span className="text-white/20 ml-1 sm:ml-2">→</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Confetti particles */}
      {confettiParticles.length > 0 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
          {confettiParticles.map((p, i) => (
            <div key={i} className="absolute w-2 h-2 rounded-full animate-bounce"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                backgroundColor: p.color,
                animationDelay: `${p.delay}s`,
                animationDuration: '1.5s',
                opacity: showCompleteOverlay ? 0.8 : 0,
                transition: 'opacity 0.5s',
              }} />
          ))}
        </div>
      )}

      {/* Completion overlay */}
      {showCompleteOverlay && (
        <div className="absolute inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="text-center space-y-4 animate-in fade-in zoom-in duration-500">
            <div className="text-6xl"><CheckCircle2 className="w-16 h-16 text-green-400 mx-auto" /></div>
            <h3 className="text-2xl font-bold text-white">{ko ? '분석 완료!' : 'Analysis Complete!'}</h3>
            <p className="text-gray-400 text-sm">{completedCount} {ko ? '명의 에이전트가 보고서를 제출했습니다' : 'agents have submitted their reports'}</p>
            <button onClick={openDashboardDone}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:from-emerald-400 hover:to-teal-400 transition-all shadow-lg shadow-emerald-500/30">
              {ko ? '보고서 보기' : 'View Report'}
            </button>
          </div>
        </div>
      )}

      {/* Agent Detail Modal */}
      <AgentDetailModal
        agentId={selectedAgentId}
        open={modalOpen}
        onClose={handleModalClose}
        lang={lang}
      />
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState, useMemo, memo } from 'react';
import { Network, CheckCircle2, RefreshCw, Clock, X } from 'lucide-react';
import { AGENT_ROSTER, AgentConfig } from '@/data/agent-config';
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
import { AgentDetailModal } from '@/components/AgentDetailModal';

/* ═══════════════════════════════════════════════════════
   Props
   ═══════════════════════════════════════════════════════ */

interface AgentFlowGraphProps {
  ko?: boolean;
  directiveId?: string | null;
  directiveAgents?: string[];
  showCompleteOverlay?: boolean;
  onCloseOverlay?: () => void;
  onViewReport?: () => void;
  /* backward-compat with TowerView */
  open?: boolean;
  onClose?: () => void;
  lang?: 'ko' | 'en';
}

/* ═══════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════ */

type TierKey = 'C' | 'Director' | 'Manager' | 'Staff';

const TIER_ORDER: TierKey[] = ['C', 'Director', 'Manager', 'Staff'];

const TIER_COLORS: Record<TierKey, { border: string; bg: string; label: string; glow: string }> = {
  C:        { border: '#f59e0b', bg: 'rgba(245,158,11,0.06)',  label: '#fbbf24', glow: '#f59e0b' },
  Director: { border: '#8b5cf6', bg: 'rgba(139,92,246,0.06)',  label: '#a78bfa', glow: '#8b5cf6' },
  Manager:  { border: '#3b82f6', bg: 'rgba(59,130,246,0.06)',  label: '#60a5fa', glow: '#3b82f6' },
  Staff:    { border: '#6b7280', bg: 'rgba(107,114,128,0.06)', label: '#9ca3af', glow: '#6b7280' },
};

const TIER_LABELS: Record<TierKey, { en: string; ko: string }> = {
  C:        { en: 'C-Suite',  ko: '임원' },
  Director: { en: 'Director', ko: '본부장' },
  Manager:  { en: 'Manager',  ko: '팀장' },
  Staff:    { en: 'Staff',    ko: '사원' },
};

/* Layout constants */
const NODE_W = 100;
const NODE_H = 95;
const H_GAP = 16;
const V_GAP = 12;
const GROUP_PAD_TOP = 52;
const GROUP_PAD_X = 28;
const GROUP_PAD_BOTTOM = 22;
const TIER_GAP = 90;
const MAX_PER_ROW = 8;

/* ═══════════════════════════════════════════════════════
   Layout computation
   ═══════════════════════════════════════════════════════ */

function groupByTier(agents: AgentConfig[]): Record<TierKey, AgentConfig[]> {
  const groups: Record<TierKey, AgentConfig[]> = { C: [], Director: [], Manager: [], Staff: [] };
  agents.forEach(a => {
    const tier = a.tier as TierKey;
    if (groups[tier]) groups[tier].push(a);
  });
  return groups;
}

interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
  totalWidth: number;
  totalHeight: number;
}

function computeLayout(
  agents: AgentConfig[],
  ko: boolean,
  isMobile: boolean,
  directiveStatuses: Record<string, 'pending' | 'processing' | 'completed'>,
  onAgentClick: (id: string) => void,
): LayoutResult {
  const grouped = groupByTier(agents);
  const perRow = isMobile ? 3 : MAX_PER_ROW;
  const nodeW = isMobile ? 75 : NODE_W;
  const nodeH = isMobile ? 80 : NODE_H;
  const hGap = isMobile ? 10 : H_GAP;
  const vGap = isMobile ? 8 : V_GAP;
  const padTop = isMobile ? 42 : GROUP_PAD_TOP;
  const padX = isMobile ? 18 : GROUP_PAD_X;
  const padBot = isMobile ? 16 : GROUP_PAD_BOTTOM;
  const tierGap = isMobile ? 70 : TIER_GAP;

  // Compute dimensions for each tier group
  const tierDims: Record<TierKey, { w: number; h: number; cols: number; rows: number }> = {} as any;
  let maxGroupW = 0;

  TIER_ORDER.forEach(tier => {
    const count = grouped[tier].length;
    const cols = Math.min(count, perRow);
    const rows = Math.ceil(count / perRow);
    const w = cols * (nodeW + hGap) - hGap + 2 * padX;
    const h = padTop + rows * (nodeH + vGap) - vGap + padBot;
    tierDims[tier] = { w, h, cols, rows };
    if (w > maxGroupW) maxGroupW = w;
  });

  // Center everything
  const totalWidth = maxGroupW + 100;
  const nodes: Node[] = [];
  let currentY = 40;

  TIER_ORDER.forEach(tier => {
    const { w, h, cols } = tierDims[tier];
    const groupX = (totalWidth - w) / 2;
    const colors = TIER_COLORS[tier];
    const count = grouped[tier].length;
    const label = ko
      ? `${TIER_LABELS[tier].ko} (${count})`
      : `${TIER_LABELS[tier].en} (${count})`;

    // Group node
    nodes.push({
      id: `tier-${tier}`,
      type: 'tierGroup',
      position: { x: groupX, y: currentY },
      data: {
        label,
        width: w,
        height: h,
        borderColor: colors.border,
        bgColor: colors.bg,
        labelColor: colors.label,
      },
      style: { width: w, height: h },
      draggable: false,
      selectable: false,
    });

    // Agent child nodes
    grouped[tier].forEach((agent, idx) => {
      const row = Math.floor(idx / perRow);
      const col = idx % perRow;
      const agentsInRow = Math.min(count - row * perRow, perRow);
      const rowW = agentsInRow * (nodeW + hGap) - hGap;
      const rowOffsetX = (w - 2 * padX - rowW) / 2;
      const relX = padX + rowOffsetX + col * (nodeW + hGap);
      const relY = padTop + row * (nodeH + vGap);

      nodes.push({
        id: agent.id,
        type: 'agentCircle',
        parentId: `tier-${tier}`,
        extent: 'parent' as const,
        position: { x: relX, y: relY },
        data: {
          id: agent.id,
          label: agent.name,
          emoji: agent.emoji || agent.name.slice(0, 2).toUpperCase(),
          tier,
          number: agent.number,
          directiveStatus: directiveStatuses[agent.id] || null,
          nodeW: nodeW,
          onAgentClick,
        },
        draggable: false,
      });
    });

    currentY += h + tierGap;
  });

  const totalHeight = currentY - tierGap + 40;

  // Edges between tiers (pointing upward: Staff→Manager→Director→C-Suite)
  const edges: Edge[] = [];
  for (let i = TIER_ORDER.length - 1; i > 0; i--) {
    const src = TIER_ORDER[i];
    const tgt = TIER_ORDER[i - 1];
    edges.push({
      id: `tier-edge-${src}-${tgt}`,
      source: `tier-${src}`,
      target: `tier-${tgt}`,
      sourceHandle: 'top',
      targetHandle: 'bottom',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#ffffff20', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#ffffff30', width: 18, height: 18 },
      label: ko ? '보고' : 'reports to',
      labelStyle: { fill: '#ffffff30', fontSize: 11, fontWeight: 500 },
      labelBgStyle: { fill: '#030712', fillOpacity: 0.9 },
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 4,
    });
  }

  return { nodes, edges, totalWidth, totalHeight };
}

/* ═══════════════════════════════════════════════════════
   Custom Node: Tier Group
   ═══════════════════════════════════════════════════════ */

function TierGroupNodeComponent({ data }: { data: any }) {
  return (
    <div
      style={{
        width: data.width,
        height: data.height,
        borderColor: data.borderColor,
        backgroundColor: data.bgColor,
      }}
      className="rounded-2xl border-2 relative"
    >
      <Handle type="target" position={Position.Top} id="top"
        className="!bg-transparent !border-0 !w-1 !h-1" style={{ top: -1 }} />
      <div
        className="absolute top-3 left-4 text-[13px] sm:text-sm font-bold tracking-wide"
        style={{ color: data.labelColor }}
      >
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} id="bottom"
        className="!bg-transparent !border-0 !w-1 !h-1" style={{ bottom: -1 }} />
    </div>
  );
}

const TierGroupNode = memo(TierGroupNodeComponent);

/* ═══════════════════════════════════════════════════════
   Custom Node: Agent Circle
   ═══════════════════════════════════════════════════════ */

function AgentCircleNodeComponent({ data }: { data: any }) {
  const ds = data.directiveStatus;
  const tierColors = TIER_COLORS[data.tier as TierKey] || TIER_COLORS.Staff;
  const borderColor = ds === 'completed' ? '#22c55e' : ds === 'processing' ? '#f59e0b' : ds === 'pending' ? '#8b5cf6' : tierColors.border;
  const size = data.nodeW ? Math.min(data.nodeW - 16, 64) : 56;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onAgentClick?.(data.id);
  };

  return (
    <div
      className="flex flex-col items-center cursor-pointer group"
      style={{ width: data.nodeW || NODE_W }}
      onClick={handleClick}
    >
      {/* Pulse ring for directive agents */}
      <div className="relative" style={{ width: size + 8, height: size + 8 }}>
        {ds === 'pending' && (
          <div className="absolute inset-0 rounded-full animate-ping opacity-30"
            style={{ backgroundColor: '#8b5cf6' }} />
        )}
        {ds === 'processing' && (
          <div className="absolute inset-[-4px] rounded-full border-2 border-amber-400/60 animate-spin"
            style={{ borderTopColor: 'transparent', borderRightColor: 'transparent' }} />
        )}
        {ds === 'completed' && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center z-20 shadow-lg">
            <CheckCircle2 className="w-3 h-3 text-white" />
          </div>
        )}
        <div
          className="rounded-full overflow-hidden border-2 shadow-lg group-hover:scale-110 transition-transform mx-auto"
          style={{
            width: size,
            height: size,
            borderColor,
            boxShadow: ds ? `0 0 20px ${borderColor}40` : 'none',
            margin: 4,
          }}
        >
          <img
            src={`/agents/${data.number}-${data.id}.png`}
            alt={data.label}
            className="w-full h-full object-cover"
            onError={(e) => {
              const el = e.target as HTMLImageElement;
              el.style.display = 'none';
              if (el.parentElement) {
                el.parentElement.innerHTML = `<span class="flex items-center justify-center w-full h-full text-lg" style="background:${tierColors.bg}">${data.emoji}</span>`;
              }
            }}
          />
        </div>
      </div>

      <span className="text-[11px] sm:text-[13px] font-semibold mt-1 text-white/90 text-center leading-tight">
        {data.label}
      </span>

      {/* Directive status badge */}
      {ds && (
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full mt-0.5 font-medium ${
          ds === 'completed' ? 'bg-green-500/25 text-green-300' :
          ds === 'processing' ? 'bg-amber-500/25 text-amber-300 animate-pulse' :
          'bg-purple-500/25 text-purple-300'
        }`}>
          {ds === 'completed' ? '✓' : ds === 'processing' ? '⟳' : '…'}
        </span>
      )}
    </div>
  );
}

const AgentCircleNode = memo(AgentCircleNodeComponent);

/* ═══════════════════════════════════════════════════════
   Node Types registry
   ═══════════════════════════════════════════════════════ */

const nodeTypes = {
  tierGroup: TierGroupNode,
  agentCircle: AgentCircleNode,
};

/* ═══════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════ */

export default function AgentFlowGraph({
  ko: koProp,
  directiveId,
  directiveAgents: directiveAgentList,
  showCompleteOverlay: showCompleteOverlayProp,
  onCloseOverlay,
  onViewReport,
  /* backward compat */
  open,
  onClose,
  lang,
}: AgentFlowGraphProps) {
  const ko = koProp ?? (lang === 'ko');

  /* Visibility: if `open` prop is provided, respect it */
  if (open === false) return null;

  return (
    <AgentFlowGraphInner
      ko={ko}
      directiveId={directiveId}
      directiveAgentList={directiveAgentList}
      showCompleteOverlayProp={showCompleteOverlayProp}
      onCloseOverlay={onCloseOverlay}
      onViewReport={onViewReport}
      onClose={onClose}
    />
  );
}

interface InnerProps {
  ko: boolean;
  directiveId?: string | null;
  directiveAgentList?: string[];
  showCompleteOverlayProp?: boolean;
  onCloseOverlay?: () => void;
  onViewReport?: () => void;
  onClose?: () => void;
}

function AgentFlowGraphInner({
  ko,
  directiveId: directiveIdProp,
  directiveAgentList,
  showCompleteOverlayProp,
  onCloseOverlay,
  onViewReport,
  onClose,
}: InnerProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Directive status polling
  const [directiveStatuses, setDirectiveStatuses] = useState<Record<string, 'pending' | 'processing' | 'completed'>>({});
  const [activeDirectiveName, setActiveDirectiveName] = useState<string | null>(null);
  const [showCompleteOverlay, setShowCompleteOverlay] = useState(false);
  const [confettiParticles, setConfettiParticles] = useState<{ x: number; y: number; color: string; delay: number }[]>([]);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleAgentClick = useCallback((agentId: string) => {
    setSelectedAgentId(agentId);
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setSelectedAgentId(null);
  }, []);

  // Poll directive status from chat_queue
  useEffect(() => {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    if (!SUPABASE_URL || !key) return;

    const poll = async () => {
      try {
        if (directiveIdProp) {
          // Use provided directive ID
          const qRes = await fetch(
            `${SUPABASE_URL}/rest/v1/chat_queue?metadata->>directive_id=eq.${directiveIdProp}&select=agent_id,status`,
            { headers: { apikey: key, Authorization: `Bearer ${key}` } },
          );
          const tasks = await qRes.json();
          const statuses: Record<string, 'pending' | 'processing' | 'completed'> = {};
          (tasks || []).forEach((t: any) => {
            statuses[t.agent_id] =
              t.status === 'completed' || t.status === 'done' || t.status === 'error'
                ? 'completed'
                : t.status === 'processing'
                  ? 'processing'
                  : 'pending';
          });
          setDirectiveStatuses(statuses);
          return;
        }

        // Auto-detect active directive
        const dRes = await fetch(
          `${SUPABASE_URL}/rest/v1/decisions?status=eq.in_progress&order=created_at.desc&limit=1`,
          { headers: { apikey: key, Authorization: `Bearer ${key}` } },
        );
        const inProgress = await dRes.json();
        if (!inProgress?.length) {
          if (!showCompleteOverlay) {
            setDirectiveStatuses({});
            setActiveDirectiveName(null);
          }
          return;
        }

        const directive = inProgress[0];
        setActiveDirectiveName(directive.title || directive.id);

        const qRes = await fetch(
          `${SUPABASE_URL}/rest/v1/chat_queue?metadata->>directive_id=eq.${directive.id}&select=agent_id,status`,
          { headers: { apikey: key, Authorization: `Bearer ${key}` } },
        );
        const tasks = await qRes.json();
        const statuses: Record<string, 'pending' | 'processing' | 'completed'> = {};
        (tasks || []).forEach((t: any) => {
          statuses[t.agent_id] =
            t.status === 'completed' || t.status === 'done' || t.status === 'error'
              ? 'completed'
              : t.status === 'processing'
                ? 'processing'
                : 'pending';
        });
        setDirectiveStatuses(statuses);
      } catch {
        /* ignore */
      }
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [directiveIdProp, showCompleteOverlay]);

  // Apply directiveAgentList as pending if provided
  useEffect(() => {
    if (directiveAgentList?.length) {
      setDirectiveStatuses(prev => {
        const next = { ...prev };
        directiveAgentList.forEach(id => {
          if (!next[id]) next[id] = 'pending';
        });
        return next;
      });
    }
  }, [directiveAgentList]);

  // All-completed detection
  const directiveAgentCount = Object.keys(directiveStatuses).length;
  const completedCount = Object.values(directiveStatuses).filter(s => s === 'completed').length;
  const allCompleted = directiveAgentCount > 0 && completedCount === directiveAgentCount;

  useEffect(() => {
    if (showCompleteOverlayProp !== undefined) {
      setShowCompleteOverlay(showCompleteOverlayProp);
      return;
    }
    if (allCompleted && !showCompleteOverlay) {
      const particles = Array.from({ length: 50 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: ['#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444'][Math.floor(Math.random() * 5)],
        delay: Math.random() * 2,
      }));
      setConfettiParticles(particles);
      setTimeout(() => setShowCompleteOverlay(true), 1000);
    }
  }, [allCompleted, showCompleteOverlayProp]);

  // Compute layout
  const layout = useMemo(
    () => computeLayout(AGENT_ROSTER, ko, isMobile, directiveStatuses, handleAgentClick),
    [ko, isMobile, directiveStatuses, handleAgentClick],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout.edges);

  useEffect(() => {
    setNodes(layout.nodes);
    setEdges(layout.edges);
  }, [layout, setNodes, setEdges]);

  const handleCloseOverlay = () => {
    if (onCloseOverlay) {
      onCloseOverlay();
    } else {
      setShowCompleteOverlay(false);
    }
  };

  const handleViewReport = () => {
    if (onViewReport) {
      onViewReport();
    } else if (onClose) {
      onClose();
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('y-navigate', { detail: { view: 'dashboard', tab: 'done' } }));
      }, 300);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full h-full sm:w-[96vw] sm:h-[94vh] sm:max-w-[1400px] bg-[#030712]/98 sm:border sm:border-white/10 rounded-none sm:rounded-2xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 border-b border-white/5">
          <div className="flex items-center gap-2 sm:gap-3">
            <Network className="w-4 h-4 sm:w-5 sm:h-5 text-white/60" />
            <h2 className="text-white/90 text-xs sm:text-[15px] font-medium flex items-center gap-2">
              {ko ? '조직 위계도 · 30 에이전트' : 'Organizational Hierarchy · 30 agents'}
              {activeDirectiveName && (
                <span className="text-[10px] sm:text-[11px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full animate-pulse">
                  {activeDirectiveName}
                </span>
              )}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Legend */}
            <div className="hidden sm:flex items-center gap-3 text-[10px] text-white/40">
              {TIER_ORDER.map(tier => (
                <span key={tier} className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TIER_COLORS[tier].border }} />
                  {ko ? TIER_LABELS[tier].ko : TIER_LABELS[tier].en}
                </span>
              ))}
            </div>
            {onClose && (
              <button onClick={onClose} className="text-white/40 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
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
            fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
            proOptions={{ hideAttribution: true }}
            style={{ background: '#030712' }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag
            zoomOnScroll
            minZoom={0.3}
            maxZoom={2}
          >
            <Background color="#ffffff06" gap={40} />
            <Controls
              showInteractive={false}
              style={{
                background: '#0a0f1a',
                borderColor: '#ffffff10',
                borderRadius: '8px',
              }}
            />
            <MiniMap
              nodeColor={(node) => {
                const tier = (node.data as any)?.tier as TierKey;
                if (tier && TIER_COLORS[tier]) return TIER_COLORS[tier].border;
                // Group nodes
                const id = node.id;
                if (id.startsWith('tier-')) {
                  const t = id.replace('tier-', '') as TierKey;
                  return TIER_COLORS[t]?.border || '#333';
                }
                return '#333';
              }}
              style={{
                background: '#0a0f1a',
                borderColor: '#ffffff10',
                borderRadius: '8px',
              }}
              className="hidden sm:block"
              maskColor="#03071290"
            />
          </ReactFlow>
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-center px-3 py-1.5 border-t border-white/5">
          <span className="text-white/25 text-[9px] sm:text-[10px]">
            {ko ? '에이전트를 클릭하여 상세 정보 확인 · 스크롤로 줌' : 'Click an agent for details · Scroll to zoom'}
          </span>
        </div>
      </div>

      {/* Confetti */}
      {confettiParticles.length > 0 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
          {confettiParticles.map((p, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-bounce"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                backgroundColor: p.color,
                animationDelay: `${p.delay}s`,
                animationDuration: '1.5s',
                opacity: showCompleteOverlay ? 0.8 : 0,
                transition: 'opacity 0.5s',
              }}
            />
          ))}
        </div>
      )}

      {/* Completion overlay */}
      {showCompleteOverlay && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="text-center space-y-4 animate-in fade-in zoom-in duration-500">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto" />
            <h3 className="text-2xl font-bold text-white">
              {ko ? '분석 완료!' : 'Analysis Complete!'}
            </h3>
            <p className="text-gray-400 text-sm">
              {completedCount} {ko ? '명의 에이전트가 보고서를 제출했습니다' : 'agents have submitted their reports'}
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={handleViewReport}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:from-emerald-400 hover:to-teal-400 transition-all shadow-lg shadow-emerald-500/30"
              >
                {ko ? '보고서 보기' : 'View Report'}
              </button>
              <button
                onClick={handleCloseOverlay}
                className="px-4 py-3 bg-white/10 text-white/70 rounded-xl hover:bg-white/20 transition-all"
              >
                {ko ? '닫기' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent Detail Modal */}
      <AgentDetailModal
        agentId={selectedAgentId}
        open={modalOpen}
        onClose={handleModalClose}
        lang={ko ? 'ko' : 'en'}
      />
    </div>
  );
}

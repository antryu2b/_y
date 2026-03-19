'use client';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with canvas
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface Decision {
  id: string;
  title: string;
  type: string;
  status: string;
  delegation_level?: number;
  current_assignee?: string;
  analysis?: string;
  review_notes?: string;
  trigger_data?: { title_ko?: string; title_en?: string };
  created_at: string;
}

interface GraphNode {
  id: string;
  label: string;
  type: 'decision' | 'agent' | 'type';
  color: string;
  size: number;
  data?: Decision;
}

interface GraphLink {
  source: string;
  target: string;
  label: string;
  color: string;
  width: number;
}

const TYPE_COLORS: Record<string, string> = {
  market_response: '#f59e0b',
  product_development: '#8b5cf6',
  investment: '#10b981',
  content_publish: '#ec4899',
  ops_incident: '#ef4444',
  hiring: '#06b6d4',
  strategy: '#3b82f6',
  risk_alert: '#f97316',
};

const STATUS_COLORS: Record<string, string> = {
  detected: '#6b7280',
  analyzing: '#3b82f6',
  discussion_needed: '#f59e0b',
  in_discussion: '#f97316',
  decision_pending: '#8b5cf6',
  approval_requested: '#ec4899',
  approved: '#10b981',
  rejected: '#ef4444',
  executing: '#06b6d4',
  completed: '#22c55e',
};

const AGENT_EMOJI: Record<string, string> = {
  tasky: '', finy: '', legaly: '', skepty: '', audity: '',
  pixely: '', buildy: '', testy: '', buzzy: '', wordy: '',
  edity: '', searchy: '', growthy: '', logoy: '', helpy: '',
  clicky: '', selly: '', stacky: '', watchy: '', guardy: '',
  hiry: '', evaly: '', quanty: '', tradey: '', globy: '',
  fieldy: '', hedgy: '', valuey: '', opsy: '', counsely: '',
};

export default function DecisionGraph({ decisions, ko }: { decisions: any[]; ko: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDimensions({ width: rect.width, height: Math.min(rect.width * 0.6, 400) });
  }, []);

  const graphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const agentSet = new Set<string>();
    const typeSet = new Set<string>();

    // Add decision nodes
    decisions.forEach(d => {
      const title = (ko ? d.trigger_data?.title_ko : d.trigger_data?.title_en) || d.title;
      nodes.push({
        id: d.id,
        label: title.length > 20 ? title.slice(0, 20) + '…' : title,
        type: 'decision',
        color: STATUS_COLORS[d.status] || '#6b7280',
        size: 6 + (d.delegation_level || 2) * 2,
        data: d,
      });

      // Add type node + link
      if (d.type && !typeSet.has(d.type)) {
        typeSet.add(d.type);
        nodes.push({
          id: `type-${d.type}`,
          label: d.type.replace('_', ' '),
          type: 'type',
          color: TYPE_COLORS[d.type] || '#6b7280',
          size: 14,
        });
      }
      if (d.type) {
        links.push({
          source: d.id,
          target: `type-${d.type}`,
          label: 'type',
          color: 'rgba(255,255,255,0.08)',
          width: 1,
        });
      }

      // Add agent node + link
      if (d.current_assignee && !agentSet.has(d.current_assignee)) {
        agentSet.add(d.current_assignee);
        nodes.push({
          id: `agent-${d.current_assignee}`,
          label: `${AGENT_EMOJI[d.current_assignee] || ''} ${d.current_assignee}`,
          type: 'agent',
          color: '#fbbf24',
          size: 10,
        });
      }
      if (d.current_assignee) {
        links.push({
          source: d.id,
          target: `agent-${d.current_assignee}`,
          label: 'assigned',
          color: 'rgba(251,191,36,0.15)',
          width: 1.5,
        });
      }

      // Link decisions of same type (pattern matching)
      decisions.forEach(d2 => {
        if (d.id < d2.id && d.type === d2.type) {
          links.push({
            source: d.id,
            target: d2.id,
            label: 'similar',
            color: 'rgba(139,92,246,0.12)',
            width: 0.8,
          });
        }
      });
    });

    return { nodes, links };
  }, [decisions, ko]);

  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D) => {
    const n = node as GraphNode;
    const x = node.x || 0;
    const y = node.y || 0;
    const r = n.size || 6;

    // Glow
    if (n.type === 'type' || n.type === 'agent') {
      ctx.beginPath();
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
      gradient.addColorStop(0, n.color + '40');
      gradient.addColorStop(1, 'transparent');
      ctx.arc(x, y, r * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Node circle
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = n.color;
    ctx.fill();

    if (n.type === 'decision') {
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Label
    ctx.font = `${n.type === 'type' ? 'bold 4px' : n.type === 'agent' ? '3.5px' : '2.5px'} sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(n.label, x, y + r + 2);
  }, []);

  if (decisions.length === 0) {
    return <div className="text-gray-600 text-center py-8 text-[14px]">{ko ? '데이터 없음' : 'No data'}</div>;
  }

  return (
    <div ref={containerRef} className="w-full rounded-xl overflow-hidden bg-black/30 border border-white/5">
      {/* Legend */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-white/5 flex-wrap">
        <span className="text-[11px] text-gray-500 font-bold">{ko ? '범례:' : 'Legend:'}</span>
        <span className="flex items-center gap-1 text-[10px] text-gray-400">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> {ko ? '에이전트' : 'Agent'}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-400">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> {ko ? '유형 허브' : 'Type Hub'}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> {ko ? '의사결정' : 'Decision'}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-purple-400">
          ─ {ko ? '유사 패턴' : 'Similar'}
        </span>
      </div>

      <ForceGraph2D
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        nodeCanvasObject={paintNode}
        nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
          ctx.beginPath();
          ctx.arc(node.x || 0, node.y || 0, (node as GraphNode).size + 4, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        linkColor={(link: any) => link.color}
        linkWidth={(link: any) => link.width}
        linkDirectionalParticles={1}
        linkDirectionalParticleWidth={1.5}
        linkDirectionalParticleSpeed={0.003}
        backgroundColor="transparent"
        cooldownTicks={60}
        onNodeHover={(node: any) => setHoveredNode(node as GraphNode | null)}
        enableZoomInteraction={true}
        enablePanInteraction={true}
      />

      {/* Hover tooltip */}
      {hoveredNode && hoveredNode.data && (
        <div className="absolute bottom-2 left-2 right-2 bg-[#0d1220]/95 backdrop-blur-xl border border-white/10 rounded-lg p-3 z-50">
          <p className="text-[13px] text-white font-medium truncate">{hoveredNode.label}</p>
          <p className="text-[11px] text-gray-400 mt-1">
            {hoveredNode.data.type} · Lv{hoveredNode.data.delegation_level} · {hoveredNode.data.status}
          </p>
          {hoveredNode.data.analysis && (
            <p className="text-[11px] text-gray-300 mt-1 line-clamp-2">{hoveredNode.data.analysis.slice(0, 100)}</p>
          )}
        </div>
      )}
    </div>
  );
}

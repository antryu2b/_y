'use client';

import { useState, useEffect, useRef } from 'react';
import { Floor, Agent } from '@/data/floors';
import { Lang } from '@/data/i18n';
import { FloorIcon } from '@/lib/floor-icons';
import { agentSkills } from '@/data/skills';

interface Props {
  floor: Floor;
  tileUrl: string;
  onAgentClick: (agent: Agent) => void;
  onClose: () => void;
  lang: Lang;
  onOpenPendingReports?: () => void;
  unreadReportCount?: number;
}

// Grid positions for agents across the floor space
// Floor-specific agent positions matching furniture layout
const FLOOR_POSITIONS: Record<number, { x: number; y: number }[]> = {
  // 10F 회장실: sofa area, tea corner
  10: [
    { x: 38, y: 62 },  // Chairman — on sofa
    { x: 55, y: 58 },  // Counsely — near tea corner
  ],
  // 9F 기획조정실: around conference table chairs
  9: [
    { x: 38, y: 45 },  // Tasky — head chair
    { x: 55, y: 40 },  // Finy — side chair
    { x: 55, y: 55 },  // Legaly — side chair
  ],
  // 8F 리스크/감사: desk chairs
  8: [
    { x: 35, y: 50 },  // Skepty — chair back
    { x: 65, y: 50 },  // Audity — chair back
  ],
  // 7F SW개발: desk chairs in row
  7: [
    { x: 25, y: 48 },  // Pixely — chair
    { x: 50, y: 48 },  // Buildy — chair
    { x: 75, y: 48 },  // Testy — chair
  ],
  // 6F 콘텐츠: editing station chairs
  6: [
    { x: 22, y: 48 },  // Buzzy — chair
    { x: 42, y: 48 },  // Wordy — chair
    { x: 62, y: 48 },  // Edity — chair
    { x: 78, y: 58 },  // Searchy — side chair
  ],
  // 5F 마케팅: open plan desk chairs
  5: [
    { x: 20, y: 45 },  // Growthy — chair
    { x: 38, y: 45 },  // Logoy — chair
    { x: 56, y: 45 },  // Helpy — chair
    { x: 74, y: 45 },  // Clicky — chair
    { x: 45, y: 62 },  // Selly — presentation area chair
  ],
  // 4F ICT: monitoring station chairs
  4: [
    { x: 30, y: 48 },  // Stacky — chair
    { x: 50, y: 48 },  // Watchy — chair
    { x: 70, y: 48 },  // Guardy — chair
  ],
  // 3F 인사: interview/desk chairs
  3: [
    { x: 35, y: 50 },  // Hiry — armchair
    { x: 65, y: 50 },  // Evaly — desk chair
  ],
  // 2F Capital: trading desk chairs (2 rows)
  2: [
    { x: 18, y: 42 },  // Quanty — front row chair
    { x: 36, y: 42 },  // Tradey
    { x: 54, y: 42 },  // Globy
    { x: 72, y: 42 },  // Fieldy
    { x: 36, y: 62 },  // Hedgy — back row chair
    { x: 54, y: 62 },  // Valuey
  ],
  // 1F 로비: reception desk
  1: [
    { x: 50, y: 50 },  // Opsy — reception chair
  ],
};

function getAgentPositions(floorLevel: number, count: number): { x: number; y: number }[] {
  const custom = FLOOR_POSITIONS[floorLevel];
  if (custom && custom.length >= count) return custom.slice(0, count);
  // Fallback: auto grid
  const positions: { x: number; y: number }[] = [];
  const rows = count <= 4 ? 1 : count <= 6 ? 2 : 3;
  const cols = Math.ceil(count / rows);
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const colsInRow = Math.min(cols, count - row * cols);
    positions.push({
      x: 12 + ((col + 0.5) / colsInRow) * 76,
      y: 25 + ((row + 0.5) / rows) * 55,
    });
  }
  return positions;
}

export function FloorDetail({ floor, tileUrl, onAgentClick, onClose, lang, onOpenPendingReports, unreadReportCount = 0 }: Props) {
  const [agentBobs, setAgentBobs] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);
  const [dragOffsets, setDragOffsets] = useState<Record<string, { x: number; y: number }>>({});
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);
  const wasDragged = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgBounds, setImgBounds] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  // Calculate actual image bounds within container (object-contain creates letterbox)
  const updateImgBounds = () => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;
    const cW = container.clientWidth;
    const cH = container.clientHeight;
    const nW = img.naturalWidth || 1;
    const nH = img.naturalHeight || 1;
    const scale = Math.min(cW / nW, cH / nH);
    const iW = nW * scale;
    const iH = nH * scale;
    setImgBounds({
      left: (cW - iW) / 2,
      top: (cH - iH) / 2,
      width: iW,
      height: iH,
    });
  };

  useEffect(() => {
    // Small delay for entrance animation
    const t = setTimeout(() => setReady(true), 50);
    const phases: Record<string, number> = {};
    floor.agents.forEach((a) => {
      phases[a.id] = Math.random() * Math.PI * 2;
    });
    setAgentBobs(phases);
    window.addEventListener('resize', updateImgBounds);
    return () => { clearTimeout(t); window.removeEventListener('resize', updateImgBounds); };
  }, [floor]);

  const positions = getAgentPositions(floor.level, floor.agents.length);

  return (
    <div className="h-full flex flex-col bg-[#060b14] relative overflow-hidden">
      {/* Header — pt-12 to clear the main header overlay */}
      <div className="flex items-center justify-between px-3 pt-12 pb-2 sm:px-4 sm:pt-14 sm:pb-3 bg-black/40 backdrop-blur-xl border-b border-white/10 z-10 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition text-base sm:text-lg font-bold active:scale-95"
          >
            ←
          </button>
          <FloorIcon name={floor.emoji} className="w-5 h-5 sm:w-6 sm:h-6 text-white/60" />
          <div className="min-w-0 flex-1">
            <h2 className="text-xs sm:text-sm font-bold text-white flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="truncate">{floor.label}</span>
              <span className="text-amber-400/80 font-normal text-[10px] sm:text-xs">
                {lang === 'ko' ? floor.department : floor.departmentEn}
              </span>
            </h2>
            <p className="text-[9px] sm:text-[10px] text-gray-500">
              {floor.agents.length} {lang === 'ko' ? '명 에이전트 활동 중' : 'agents active'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Pending Reports badge — 10F Chairman's Office only */}
          {floor.level === 10 && onOpenPendingReports && (
            <button
              onClick={onOpenPendingReports}
              className="relative flex items-center gap-1 px-2 py-0.5 sm:gap-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/20 transition text-[8px] sm:text-[10px] text-amber-300 font-medium"
            >
              <span className="hidden sm:inline">{lang === 'ko' ? '미결재 보고서' : 'Pending Reports'}</span>
              {unreadReportCount > 0 && (
                <span className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[7px] sm:text-[8px] font-bold animate-pulse">
                  {unreadReportCount > 9 ? '9+' : unreadReportCount}
                </span>
              )}
            </button>
          )}
          <div
            className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full animate-pulse"
            style={{ backgroundColor: floor.color, boxShadow: `0 0 8px ${floor.color}60` }}
          />
        </div>
      </div>

      {/* Floor tile background with agents */}
      <div className="flex-1 relative overflow-hidden">
        {/* Background image — bright, vivid */}
        <img
          ref={imgRef}
          src={tileUrl}
          alt={`${floor.label} interior`}
          className="absolute inset-0 w-full h-full object-cover opacity-90"
          style={{ backgroundColor: '#1a1f2e' }}
          draggable={false}
          onLoad={updateImgBounds}
        />

        {/* Light vignette only at edges */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#060b14]/60 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(6,11,20,0.4)_100%)]" />

        {/* Agent cards floating over the floor */}
        <div
          ref={containerRef}
          className={`absolute inset-0 transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`}
          onMouseMove={(e) => {
            if (!dragRef.current || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const id = dragRef.current.id;
            const dx = ((e.clientX - dragRef.current.startX) / rect.width) * 100;
            const dy = ((e.clientY - dragRef.current.startY) / rect.height) * 100;
            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragRef.current.moved = true;
            setDragOffsets(prev => ({ ...prev, [id]: { x: dx, y: dy } }));
          }}
          onMouseUp={() => {
            wasDragged.current = dragRef.current?.moved || false;
            dragRef.current = null;
          }}
          onMouseLeave={() => { dragRef.current = null; }}
          onTouchMove={(e) => {
            if (!dragRef.current || !containerRef.current) return;
            const touch = e.touches?.[0];
            if (!touch) return;
            const rect = containerRef.current.getBoundingClientRect();
            const id = dragRef.current.id;
            const dx = ((touch.clientX - dragRef.current.startX) / rect.width) * 100;
            const dy = ((touch.clientY - dragRef.current.startY) / rect.height) * 100;
            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragRef.current.moved = true;
            setDragOffsets(prev => ({ ...prev, [id]: { x: dx, y: dy } }));
          }}
          onTouchEnd={() => {
            wasDragged.current = dragRef.current?.moved || false;
            dragRef.current = null;
          }}
          onTouchCancel={() => { dragRef.current = null; }}
        >
          {floor.agents.map((agent, idx) => {
            const pos = positions[idx];
            const offset = dragOffsets[agent.id] || { x: 0, y: 0 };
            // Map percentage positions to actual image area (avoid black letterbox)
            let finalX = pos.x + offset.x;
            let finalY = pos.y + offset.y;
            if (imgBounds && containerRef.current) {
              const cW = containerRef.current.clientWidth;
              const cH = containerRef.current.clientHeight;
              // Convert: pos% of image → pos% of container
              finalX = ((imgBounds.left + (pos.x / 100) * imgBounds.width) / cW) * 100 + offset.x;
              finalY = ((imgBounds.top + (pos.y / 100) * imgBounds.height) / cH) * 100 + offset.y;
            }
            const skills = agentSkills[agent.id.replace(/^(andrew)$/, '')]?.skills?.slice(0, 3) || [];
            const statusColor =
              agent.status === 'working' ? '#22c55e' :
              agent.status === 'meeting' ? '#f59e0b' : '#6b7280';

            return (
              <div
                key={agent.id}
                className="absolute group cursor-grab active:cursor-grabbing animate-fadeInUp"
                style={{
                  left: `${finalX}%`,
                  top: `${finalY}%`,
                  transform: 'translate(-50%, -70%)',
                  animationDelay: `${idx * 80}ms`,
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  dragRef.current = { id: agent.id, startX: e.clientX, startY: e.clientY, origX: finalX, origY: finalY, moved: false };
                }}
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  dragRef.current = { id: agent.id, startX: touch.clientX, startY: touch.clientY, origX: finalX, origY: finalY, moved: false };
                }}
                onClick={() => {
                  if (wasDragged.current) { wasDragged.current = false; return; }
                  onAgentClick(agent);
                }}
              >
                {/* Floor shadow — ellipse under the agent */}
                <div
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-3 rounded-full opacity-40"
                  style={{ background: 'radial-gradient(ellipse, rgba(0,0,0,0.6), transparent)' }}
                />
                {/* Card container */}
                <div className="flex flex-col items-center gap-1 transition-transform duration-300 group-hover:scale-105 group-hover:-translate-y-1">
                  {/* Avatar card */}
                  <div className="relative">
                    <div
                      className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl overflow-hidden shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:scale-110 ring-1 ring-white/10 group-hover:ring-amber-400/30"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
                      }}
                    >
                      {agent.image ? (
                        <img src={agent.image} alt={agent.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm sm:text-lg font-bold text-amber-400/60 bg-gradient-to-br from-gray-800/80 to-gray-900/80">
                          {agent.name[0]}
                        </div>
                      )}
                    </div>

                    {/* Status dot */}
                    <div
                      className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-[#060b14]"
                      style={{
                        backgroundColor: statusColor,
                        boxShadow: `0 0 6px ${statusColor}80`,
                      }}
                    />
                  </div>

                  {/* Name tag with solid background for readability */}
                  <div className="text-center min-w-[44px] sm:min-w-[50px] px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg" style={{ background: 'rgba(10,10,20,0.85)', backdropFilter: 'blur(8px)' }}>
                    <div className="text-[8px] sm:text-[10px] font-bold text-white truncate">
                      {agent.name}
                    </div>
                    <div className="text-[7px] sm:text-[8px] text-amber-300 font-medium truncate">
                      {agent.role.includes(' / ')
                        ? (lang === 'ko' ? agent.role.split(' / ')[0] : agent.role.split(' / ')[1])
                        : agent.role}
                    </div>
                  </div>

                  {/* Skill tags on hover */}
                  {skills.length > 0 && (
                    <div className="hidden group-hover:flex flex-wrap gap-0.5 justify-center max-w-[140px] sm:max-w-[160px] animate-fadeIn">
                      {skills.map((s, i) => (
                        <span
                          key={i}
                          className="text-[6px] sm:text-[8px] px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full text-amber-200 border border-amber-400/20 whitespace-nowrap font-medium"
                          style={{ background: 'rgba(10,10,20,0.9)' }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Floor info bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-[#060b14] via-[#060b14]/80 to-transparent pointer-events-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <FloorIcon name={floor.emoji} className="w-4 h-4 sm:w-5 sm:h-5 text-white/60" />
              <span className="text-[10px] sm:text-xs text-gray-400">
                {lang === 'ko' ? floor.department : floor.departmentEn}
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Status counts */}
              {(() => {
                const working = floor.agents.filter(a => a.status === 'working').length;
                const meeting = floor.agents.filter(a => a.status === 'meeting').length;
                return (
                  <>
                    {working > 0 && (
                      <span className="flex items-center gap-0.5 sm:gap-1 text-[8px] sm:text-[10px] text-green-400/80">
                        <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-green-500" />
                        {working}
                      </span>
                    )}
                    {meeting > 0 && (
                      <span className="flex items-center gap-0.5 sm:gap-1 text-[8px] sm:text-[10px] text-amber-400/80">
                        <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-amber-500" />
                        {meeting}
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

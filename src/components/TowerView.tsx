'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLang } from '@/context/LangContext';
import { Activity, Coffee, Moon, BarChart3, FileText, Users, Zap, LayoutDashboard, ChevronLeft, Mic, Send, Building2, Settings, GitBranch, Clock, Globe } from 'lucide-react';
import AgentStatusPanel from './AgentStatusPanel';
import ChairmanDashboard from './ChairmanDashboard';
import { floors, Agent, Floor } from '@/data/floors';
import { FloorDetail } from './FloorDetail';
import { FloorIcon } from '@/lib/floor-icons';
import { AgentChat } from './AgentChat';
import { ActivityFeed } from './ActivityFeed';

import { CompanySettings } from './CompanySettings';
import { GlassPanel } from './GlassPanel';
import { AGENT_ROSTER } from '@/data/agent-config';
import { MeetingRoom } from './MeetingRoom';
import dynamic from 'next/dynamic';
const AgentFlowGraph = dynamic(() => import('./AgentFlowGraph'), { ssr: false });
import TimelineView from './TimelineView';
import { useReports } from '@/context/ReportContext';
import {
  initializeSimulation,
  simulationStep,
  seedInitialActivities,
  getActivityLog,
  getAllSimAgents,
  ActivityLogEntry,
} from '@/engine/simulation';

// Floor tile filenames mapped by level
// Dynamic 10F tile based on KST time
function getChairmanTile(): string {
  const kst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const hour = kst.getHours();
  return '/tiles/floor-10-chairman.png';
}

const FLOOR_TILES: Record<number, string> = {
  10: getChairmanTile(),
  9: '/tiles/floor-9-planning.png',
  8: '/tiles/floor-8-risk.png',
  7: '/tiles/floor-7-dev.png',
  6: '/tiles/floor-6-content.png',
  5: '/tiles/floor-5-marketing.png',
  4: '/tiles/floor-4-ict.png',
  3: '/tiles/floor-3-hr.png',
  2: '/tiles/floor-2-capital.png',
  1: '/tiles/floor-1-lobby.png',
};

// Calibrated floor positions within the tower image
// The tower structure occupies roughly 15%-85% of the image height
// Each floor zone is mapped to where it visually appears in the DNA helix tower
// Calibrated to actual tower image pixel analysis
// Building starts at ~17% (10F top) and ends at ~88% (1F bottom)
// Desktop/tablet positions (wide image)
// 10F=20 (top floor center), 2F~9F equally spaced, 1F=88
const FLOOR_POSITIONS_WIDE: Record<number, { top: number; height: number }> = {
  10: { top: 21, height: 6.3 },
  9:  { top: 27.3, height: 6.3 },
  8:  { top: 33.7, height: 6.3 },
  7:  { top: 40, height: 6.3 },
  6:  { top: 46.3, height: 6.3 },
  5:  { top: 52.7, height: 6.3 },
  4:  { top: 59, height: 6.3 },
  3:  { top: 65.3, height: 6.3 },
  2:  { top: 71.7, height: 6.3 },
  1:  { top: 78, height: 6.3 },
};

// Phone positions (portrait image, scale 1.4, origin center 35%)
// 10F=34, 9F~2F evenly from 40 to 75 (step ~5), 1F=84
const FLOOR_POSITIONS_MOBILE: Record<number, { top: number; height: number }> = {
  10: { top: 34, height: 5 },
  9:  { top: 39.5, height: 5 },
  8:  { top: 45, height: 5 },
  7:  { top: 50.5, height: 5 },
  6:  { top: 56, height: 5 },
  5:  { top: 61.5, height: 5 },
  4:  { top: 67, height: 5 },
  3:  { top: 72.5, height: 5 },
  2:  { top: 78, height: 5 },
  1:  { top: 83.5, height: 5 },
};

// Tablet positions (portrait image, no scale, object-cover)
const FLOOR_POSITIONS_TABLET: Record<number, { top: number; height: number }> = {
  10: { top: 18, height: 6 },
  9:  { top: 25, height: 7 },
  8:  { top: 32, height: 7 },
  7:  { top: 39, height: 7 },
  6:  { top: 46, height: 7 },
  5:  { top: 53, height: 7 },
  4:  { top: 60, height: 7 },
  3:  { top: 67, height: 7 },
  2:  { top: 74, height: 7 },
  1:  { top: 82, height: 7 },
};

// Selected dynamically inside component based on device type

export function TowerView() {
  const { lang, setLang, text } = useLang();
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showActivity, setShowActivity] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showGlassPanel, setShowGlassPanel] = useState(false);
  const [glassPanelUnread, setGlassPanelUnread] = useState(false);
  const [showMeeting, setShowMeeting] = useState(false);
  const [showFlow, setShowFlow] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  const [meetingFloors, setMeetingFloors] = useState<number[]>([]);
  const [inactiveFloors, setInactiveFloors] = useState<Set<number>>(new Set());
  const [inactiveFloorTooltip, setInactiveFloorTooltip] = useState<number | null>(null);
  const { addReport, unreadCount } = useReports();
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [agentSummary, setAgentSummary] = useState({ working: 0, idle: 0, resting: 30, totalTasksToday: 0 });
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [hoveredFloor, setHoveredFloor] = useState<Floor | null>(null);
  const [device, setDevice] = useState<'phone' | 'tablet' | 'desktop'>('desktop');
  const [isLandscape, setIsLandscape] = useState(false);
  const isMobile = device === 'phone';
  const isTablet = device === 'tablet';
  const towerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 1;
      const landscape = w > h;
      setIsLandscape(landscape);
      if (w < 640 && !landscape) setDevice('phone');
      else if (touch && w < 1366) setDevice('tablet');
      else if (touch && landscape && w >= 1024) setDevice('tablet'); // iPad landscape
      else if (!touch) setDevice('desktop');
      else setDevice('tablet');
    };
    check();
    window.addEventListener('resize', check);
    // matchMedia is the most reliable orientation listener on iPad
    const mql = window.matchMedia('(orientation: landscape)');
    const onMql = () => { setTimeout(check, 50); setTimeout(check, 200); };
    mql.addEventListener('change', onMql);
    return () => {
      window.removeEventListener('resize', check);
      mql.removeEventListener('change', onMql);
    };
  }, []);

  // Listen for navigation events from other components
  useEffect(() => {
    const handleNav = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.view === 'dashboard') {
        if (detail?.tab) setDashboardTab(detail.tab);
        setShowActivity(true);
      }
      else if (detail?.view === 'warroom') setShowMeeting(true);
      else if (detail?.view === 'reports') setShowGlassPanel(true);
      else if (detail?.view === 'workflow') setShowFlow(true);
      else if (detail?.view === 'timeline') setShowTimeline(true);
      else if (detail?.view === 'settings') setShowSettings(true);
      else if (detail?.view === 'floor' && detail?.floor) {
        const targetFloor = floors.find(f => f.level === detail.floor);
        if (targetFloor) {
          setSelectedFloor(targetFloor);
          if (detail?.agent) {
            const targetAgent = targetFloor.agents.find((a: Agent) => a.id === detail.agent);
            if (targetAgent) setSelectedAgent(targetAgent);
          }
        }
      }
    };
    window.addEventListener('y-navigate', handleNav);
    return () => window.removeEventListener('y-navigate', handleNav);
  }, []);

  // Compute inactive floors based on connected companies' activeAgents
  const computeInactiveFloors = useCallback(() => {
    try {
      const connectionsData = localStorage.getItem('y-company-connections');
      if (!connectionsData) {
        // No companies connected → all agents active (fresh state)
        setInactiveFloors(new Set());
        return;
      }
      const connections = JSON.parse(connectionsData);
      if (!Array.isArray(connections) || connections.length === 0) {
        setInactiveFloors(new Set());
        return;
      }

      // Check if ANY company has activeAgents defined
      const hasActiveAgents = connections.some((c: any) => Array.isArray(c.activeAgents) && c.activeAgents.length > 0);
      if (!hasActiveAgents) {
        // Companies connected but no activeAgents defined → all active (backward compat)
        setInactiveFloors(new Set());
        return;
      }

      // Merge all companies' activeAgents
      const allActiveAgents = new Set<string>();
      connections.forEach((c: any) => {
        if (Array.isArray(c.activeAgents)) {
          c.activeAgents.forEach((id: string) => allActiveAgents.add(id));
        }
      });

      // For each floor, check if ANY agent on that floor is active
      const inactive = new Set<number>();
      floors.forEach((floor) => {
        // Floor 10 (Chairman's Office) is always active
        if (floor.level === 10) return;
        
        const floorAgentIds = AGENT_ROSTER.filter(a => a.floor === floor.level).map(a => a.id);
        const hasActiveOnFloor = floorAgentIds.some(id => allActiveAgents.has(id));
        if (!hasActiveOnFloor) {
          inactive.add(floor.level);
        }
      });

      setInactiveFloors(inactive);
    } catch {
      setInactiveFloors(new Set());
    }
  }, []);

  useEffect(() => {
    computeInactiveFloors();
    // Listen for company connection updates
    const handleUpdate = () => computeInactiveFloors();
    window.addEventListener('y-company-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('y-company-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [computeInactiveFloors]);

  useEffect(() => {
    initializeSimulation();
    seedInitialActivities();
    setActivities(getActivityLog(30));
    setInitialized(true);

    // Fetch real agent status from DB
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/agent-status');
        if (res.ok) {
          const data = await res.json();
          if (data.summary) setAgentSummary(data.summary);
        }
      } catch { /* ignore */ }
    };
    fetchStatus();
    const statusInterval = setInterval(fetchStatus, 15000); // every 15 sec
    return () => clearInterval(statusInterval);
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const interval = setInterval(() => {
      const newActs = simulationStep();
      if (newActs.length > 0) {
        setActivities(getActivityLog(30));
      }
      
      // Update agent summary based on simulation
      const allAgents = getAllSimAgents();
      const working = allAgents.filter(a => a.state === 'working' || a.state === 'meeting').length;
      const idle = allAgents.filter(a => a.state === 'idle' || a.state === 'walking' || a.state === 'elevator').length;
      const resting = 30 - working - idle;
      const totalTasks = Math.floor(Math.random() * 10) + agentSummary.totalTasksToday; // Increment occasionally
      
      setAgentSummary(prev => ({
        ...(() => {
          const w = Math.min(Math.max(3, working + Math.floor(Math.random() * 3) - 1), 8);
          const i = Math.min(Math.max(2, idle + Math.floor(Math.random() * 3) - 1), 30 - w);
          return { working: w, idle: i, resting: 30 - w - i };
        })(),
        totalTasksToday: Math.random() < 0.1 ? totalTasks : prev.totalTasksToday,
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, [initialized, agentSummary.totalTasksToday]);

  // Browser back button support
  useEffect(() => {
    // Push initial state
    if (!window.history.state?.yCompany) {
      window.history.replaceState({ yCompany: true, view: 'tower' }, '');
    }

    const handlePopState = (e: PopStateEvent) => {
      const state = e.state;
      if (!state?.yCompany) {
        // User went back past our app — push them forward to tower
        window.history.pushState({ yCompany: true, view: 'tower' }, '');
        setSelectedFloor(null);
        setSelectedAgent(null);
        return;
      }
      if (state.view === 'tower') {
        setSelectedFloor(null);
        setSelectedAgent(null);
      } else if (state.view === 'floor') {
        setSelectedAgent(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleFloorClick = useCallback((floor: Floor) => {
    setSelectedFloor(floor);
    setSelectedAgent(null);
    setHoveredFloor(null);
    window.history.pushState({ yCompany: true, view: 'floor', floorLevel: floor.level }, '');
  }, []);

  const handleAgentClick = useCallback((agent: Agent) => {
    // Chairman = user themselves, no chat needed → open dashboard
    if (agent.id === 'andrew') {
      setShowActivity(true);
      return;
    }
    setSelectedAgent(agent);
    window.history.pushState({ yCompany: true, view: 'agent', agentId: agent.id }, '');
  }, []);

  const handleCloseFloor = useCallback(() => {
    setSelectedFloor(null);
    setSelectedAgent(null);
    window.history.pushState({ yCompany: true, view: 'tower' }, '');
  }, []);

  const handleCloseChat = useCallback(() => {
    setSelectedAgent(null);
    window.history.pushState({ yCompany: true, view: 'floor' }, '');
  }, []);

  return (
    <div className="h-dvh w-screen bg-[#030712] flex flex-col overflow-hidden">
      {/* Header — floating with backdrop */}
      <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 z-50" style={{ textShadow: '0 2px 6px rgba(0,0,0,1), 0 0 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.4)' }}>
        {/* Left: Logo */}
        <div className="flex items-center gap-2 shrink-0 bg-black/70 backdrop-blur-lg rounded-full px-3 py-1.5">
          <button
            onClick={() => { setSelectedFloor(null); setSelectedAgent(null); setShowMeeting(false); setShowGlassPanel(false); setShowActivity(false); }}
            className="text-base sm:text-xl font-light text-white/90 tracking-widest hover:text-white transition cursor-pointer"
          >
            <span className="font-bold text-amber-400">_y</span>
            <span className="text-white/50 ml-1 text-xs sm:text-sm hidden sm:inline">TOWER</span>
          </button>

          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-green-500/20 bg-green-500/5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400/80 text-[8px] sm:text-[9px] font-medium tracking-wider uppercase hidden sm:inline">{text.live}</span>
          </div>
        </div>
        {/* Right: Action buttons — icon-only on mobile */}
        <div className="flex items-center justify-center flex-wrap gap-1 sm:gap-1.5">
          <button
            onClick={() => { setGlassPanelUnread(false); setShowGlassPanel(true); }}
            className="relative w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 flex items-center justify-center text-[11px] font-medium tracking-wider uppercase rounded-full bg-black/70 backdrop-blur-lg border border-blue-400/20 hover:border-blue-400/40 hover:bg-blue-400/10 text-blue-300 hover:text-blue-200 transition-all duration-200"
          >
            <span className="sm:hidden"><FileText className="w-4 h-4" /></span>
            <span className="hidden sm:inline flex items-center gap-1"><FileText className="w-4 h-4" /> {text.reports || '보고서'}</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[8px] font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowMeeting(true)}
            className="relative w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 flex items-center justify-center text-[11px] font-medium tracking-wider uppercase rounded-full bg-black/70 backdrop-blur-lg border border-red-400/20 hover:border-red-400/40 hover:bg-red-400/10 text-red-300 hover:text-red-200 transition-all duration-200"
          >
            <span className="sm:hidden"><Users className="w-4 h-4" /></span>
            <span className="hidden sm:inline flex items-center gap-1"><Users className="w-4 h-4" /> {lang === 'ko' ? 'War Room' : 'War Room'}</span>
            {meetingFloors.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[8px] font-bold animate-pulse">
                !
              </span>
            )}
          </button>
          <button
            onClick={() => setShowFlow(true)}
            className="w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 flex items-center justify-center text-[11px] font-medium tracking-wider uppercase rounded-full bg-black/70 backdrop-blur-lg border border-cyan-400/20 hover:border-cyan-400/40 hover:bg-cyan-400/10 text-cyan-300 hover:text-cyan-200 transition-all duration-200"
          >
            <span className="sm:hidden"><GitBranch className="w-4 h-4" /></span>
            <span className="hidden sm:inline flex items-center gap-1"><GitBranch className="w-4 h-4" /> {lang === 'ko' ? '워크플로우' : 'Workflow'}</span>
          </button>
          <button
            onClick={() => setShowTimeline(true)}
            className="w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 flex items-center justify-center text-[11px] font-medium tracking-wider uppercase rounded-full bg-black/70 backdrop-blur-lg border border-emerald-400/20 hover:border-emerald-400/40 hover:bg-emerald-400/10 text-emerald-300 hover:text-emerald-200 transition-all duration-200"
          >
            <span className="sm:hidden"><Clock className="w-4 h-4" /></span>
            <span className="hidden sm:inline flex items-center gap-1"><Clock className="w-4 h-4" /> {lang === 'ko' ? '타임라인' : 'Timeline'}</span>
          </button>
          <button
            onClick={() => setShowActivity(!showActivity)}
            className="w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 flex items-center justify-center text-[11px] font-medium tracking-wider uppercase rounded-full bg-black/70 backdrop-blur-lg border border-white/10 hover:border-white/20 hover:bg-white/5 text-gray-200 hover:text-white transition-all duration-200"
          >
            <span className="sm:hidden"><LayoutDashboard className="w-4 h-4" /></span>
            <span className="hidden sm:inline flex items-center gap-1"><LayoutDashboard className="w-4 h-4" /> {lang === 'ko' ? '대시보드' : 'Dashboard'}</span>
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 flex items-center justify-center text-[11px] font-medium tracking-wider uppercase rounded-full bg-black/70 backdrop-blur-lg border border-amber-400/20 hover:border-amber-400/40 hover:bg-amber-400/10 text-amber-300 hover:text-amber-200 transition-all duration-200"
          >
            <span className="sm:hidden"><Settings className="w-4 h-4" /></span>
            <span className="hidden sm:inline flex items-center gap-1"><Settings className="w-4 h-4" /> {lang === 'ko' ? '회사 설정' : 'Company'}</span>
          </button>
          <button
            onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-black/70 backdrop-blur-lg border border-white/10 hover:border-white/20 hover:bg-white/5 text-gray-200 hover:text-white text-[10px] sm:text-xs transition-all duration-200"
          >
            {lang === 'ko' ? 'EN' : 'KR'}
          </button>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* ===== TOWER COLUMN ===== */}
        <div
          className={`transition-all duration-500 ease-out flex flex-col items-center relative
            ${selectedFloor ? 'hidden md:flex md:w-[30%] md:opacity-90 justify-end' : 'w-full justify-center'}
          `}
        >
          {/* Full-bleed tower background — no gaps */}
          {(() => {
            const showWide = (device === 'desktop') || (device === 'tablet' && isLandscape);
            return <img
              src={showWide ? '/tiles/y-tower-wide.png' : '/tiles/y-tower-portrait.png'}
              alt="_y Tower"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: device === 'phone' ? 'center top' : 'center 12%' }}
            />;
          })()}
          
          {/* Floor hotspot overlays — absolute to tower column (full viewport) */}
          {!selectedFloor && floors.map((floor, i) => {
            const posMap = device === 'phone' ? FLOOR_POSITIONS_MOBILE 
              : (device === 'tablet' && !isLandscape) ? FLOOR_POSITIONS_TABLET 
              : FLOOR_POSITIONS_WIDE;
            const pos = posMap[floor.level];
            if (!pos) return null;
            const isHovered = hoveredFloor?.level === floor.level;
            const isMeeting = meetingFloors.includes(floor.level);
            const isInactive = inactiveFloors.has(floor.level);
            const showInactiveTooltip = inactiveFloorTooltip === floor.level;

            return (
              <button
                key={`hotspot-${floor.level}`}
                onClick={() => {
                  if (isInactive) {
                    setInactiveFloorTooltip(showInactiveTooltip ? null : floor.level);
                  } else {
                    handleFloorClick(floor);
                  }
                }}
                onMouseEnter={() => setHoveredFloor(floor)}
                onMouseLeave={() => { setHoveredFloor(null); setInactiveFloorTooltip(null); }}
                className="absolute cursor-pointer z-20"
                style={{
                  top: `${pos.top}%`,
                  height: `${pos.height}%`,
                  left: device === 'phone' ? '5%' : '15%',
                  right: device === 'phone' ? '5%' : '15%',
                }}
              >
                {/* Inactive floor overlay */}
                {isInactive && (
                  <div className="absolute inset-0 rounded-lg bg-black/40 z-10 flex items-center justify-center" style={{ filter: 'grayscale(100%)' }}>
                    <span className="text-lg opacity-60"></span>
                  </div>
                )}

                {/* Inactive floor tooltip */}
                {isInactive && showInactiveTooltip && (
                  <div className="absolute left-1/2 -translate-x-1/2 -top-16 z-40 animate-fadeIn">
                    <div className="bg-[#0f0f19]/95 border border-white/20 rounded-xl px-4 py-2.5 text-center shadow-2xl backdrop-blur-lg whitespace-nowrap">
                      <p className="text-xs text-gray-300 mb-1.5">
                        {lang === 'ko' ? '이 팀을 활성화하시겠습니까?' : 'Activate this team?'}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInactiveFloorTooltip(null);
                          setShowSettings(true);
                        }}
                        className="px-3 py-1 bg-amber-500/20 border border-amber-400/30 rounded-md text-amber-400 text-[10px] font-medium hover:bg-amber-500/30 transition"
                      >
                        {lang === 'ko' ? '회사 설정으로 이동' : 'Go to Company Settings'}
                      </button>
                    </div>
                    <div className="w-2 h-2 bg-[#0f0f19]/95 border-b border-r border-white/20 rotate-45 mx-auto -mt-1" />
                  </div>
                )}

                {/* Hover glow border */}
                <div className={`absolute inset-0 rounded-lg transition-all duration-300 ${
                  isInactive
                    ? 'opacity-30 border border-white/5'
                    : isMeeting
                      ? 'border border-red-400/40 bg-red-400/[0.06] shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                      : isHovered
                        ? 'border-2 border-amber-400/70 bg-amber-400/20 shadow-[0_0_30px_rgba(251,191,36,0.3)]'
                        : 'border border-white/5'
                }`} />

                {/* Meeting indicator */}
                {isMeeting && (
                  <div className="absolute -top-1 -right-1 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/90 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    <span className="text-[8px] text-white font-bold">회의중</span>
                  </div>
                )}

                {/* Floor tooltip on hover */}
                {isHovered && (
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-30 pointer-events-none animate-fadeIn hidden sm:block">
                    <div className="rounded-xl px-4 py-3 min-w-[200px] shadow-2xl border border-white/20"
                      style={{ background: 'rgba(15,15,25,0.92)', backdropFilter: 'blur(20px)' }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <FloorIcon name={floor.emoji} className="w-5 h-5 text-white/60" />
                        <div>
                          <div className="text-sm font-bold text-white">{floor.label}</div>
                          <div className="text-[11px] text-amber-400 font-medium">
                            {lang === 'ko' ? floor.department : floor.departmentEn}
                          </div>
                        </div>
                      </div>
                      <div className="h-[1px] bg-white/10 mb-2" />
                      <div className="flex flex-wrap gap-1.5">
                        {floor.agents.map((a) => (
                          <span key={a.id} className="text-[10px] text-gray-200 bg-white/10 rounded-md px-1.5 py-0.5 font-medium" title={a.desc || ''}>
                            {a.name} <span className="text-gray-500">{a.desc?.split('—')[0]?.trim() || ''}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Floor label */}
                <div className={`absolute top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300 z-10
                  right-1 sm:right-auto sm:left-1/2 sm:-translate-x-1/2
                  ${isInactive ? 'opacity-30' : isHovered ? 'opacity-100' : 'opacity-75'}
                `}
                style={{ 
                  animation: `floorLabelIn 0.5s ease-out ${i * 0.06}s both`,
                  filter: isInactive ? 'grayscale(100%)' : undefined,
                }}
                >
                  <div className={`px-2 py-0.5 sm:px-2.5 rounded-full backdrop-blur-md border whitespace-nowrap transition-all ${
                    isInactive
                      ? 'bg-black/60 border-white/5'
                      : isHovered 
                        ? 'bg-amber-400/30 border-amber-400/50 shadow-lg shadow-amber-400/15' 
                        : 'bg-black/60 border-white/15'
                  }`}>
                    <span className={`text-[10px] sm:text-[13px] font-bold ${isInactive ? 'text-gray-500' : isHovered ? 'text-amber-400' : 'text-white'}`}>{floor.level}F</span>
                    <span className={`ml-0.5 text-[8px] sm:text-[10px] ${isInactive ? 'text-gray-600' : isHovered ? 'text-amber-300' : 'text-gray-300/70'}`}>{lang === 'ko' ? floor.deptShort : floor.deptShortEn}</span>
                  </div>
                </div>
              </button>
            );
          })}

          {/* Ambient glow layers */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[80%] h-[40%] rounded-full bg-amber-500/[0.02] blur-[100px]" />
            <div className="absolute bottom-[5%] left-1/2 -translate-x-1/2 w-[60%] h-[30%] rounded-full bg-blue-500/[0.02] blur-[80px]" />
          </div>

          {/* Subtle grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />

          {/* Floating particles — deterministic positions */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[5,12,20,28,35,42,48,55,62,68,74,80,86,15,25,38,52,65,78,90].map((pos, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: i % 4 === 0 ? '4px' : '2px',
                  height: i % 4 === 0 ? '4px' : '2px',
                  background: i % 3 === 0 ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.25)',
                  left: `${pos}%`,
                  bottom: `${(i * 7) % 35}%`,
                  animation: `floatUp ${7 + (i % 5) * 1.5}s ease-in-out infinite`,
                  animationDelay: `${i * 0.5}s`,
                }}
              />
            ))}
          </div>

          {/* Scanning light effect across tower */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute w-full h-[1px]" style={{
              background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.15), transparent)',
              animation: 'scanDown 10s linear infinite',
            }} />
          </div>

          {/* Tower container */}
          <div
            ref={towerRef}
            className={`relative z-10 flex w-full h-full px-2 sm:px-4 ${
              selectedFloor ? 'items-end justify-center' : 'items-center justify-center'
            }`}
          >
            {/* Tower + Labels flex row */}
            <div className={`flex ${selectedFloor ? 'items-end' : 'items-stretch'} h-full`}>
            <div
              className={`relative transition-all duration-500 flex-shrink-0 w-full ${
                selectedFloor ? 'h-full' : 'h-[88vh] sm:h-[92vh]'
              }`}
            >
              {/* Tower positioning anchor — image is in background layer */}
              <div className="relative h-full w-full">
                {/* Warm pulsing glow on tower */}
                <div className="absolute inset-0 pointer-events-none" style={{
                  background: 'radial-gradient(ellipse 35% 50% at 50% 45%, rgba(251,191,36,0.2), transparent)',
                  mixBlendMode: 'soft-light',
                  animation: 'pulseGlow 4s ease-in-out infinite',
                }} />
                {/* Diagonal light sweep */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute h-full" style={{
                    width: '60px',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
                    transform: 'skewX(-20deg)',
                    animation: 'sweepRight 6s ease-in-out infinite',
                  }} />
                </div>
              </div>

              {/* Floor hotspots moved to absolute overlay at parent level */}

              {/* Tower top label — elegant branding above crown */}
              <div className="absolute top-[2%] left-1/2 -translate-x-1/2 text-center pointer-events-none">
                <div className="text-[11px] sm:text-[13px] font-light text-amber-400/50 tracking-[0.5em] uppercase">
                  _y Holdings
                </div>
                <div className="mt-0.5 w-8 h-[1px] mx-auto bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />
              </div>
            </div>

            </div>{/* close flex row */}
          </div>

          {/* Mini floor navigation when floor detail is open */}
          {selectedFloor && (
            <div className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-30 flex-col gap-1">
              {floors.map((floor) => {
                const isActive = floor.level === selectedFloor.level;
                return (
                  <button
                    key={`nav-${floor.level}`}
                    onClick={() => handleFloorClick(floor)}
                    className={`text-[10px] px-2 py-1 rounded transition-all whitespace-nowrap text-right
                      ${isActive 
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 font-medium' 
                        : 'bg-black/40 text-gray-400 border border-white/5 hover:bg-white/10 hover:text-gray-200'
                      }`}
                  >
                    {floor.level}F {lang === 'ko' ? floor.deptShort : (floor.deptShortEn || floor.deptShort)}
                  </button>
                );
              })}
            </div>
          )}

          {/* Bottom info bar */}
          {!selectedFloor && (
            <div className="absolute bottom-0 left-0 right-0 z-10">
              <div className="bg-gradient-to-t from-[#020408] via-[#020408]/90 to-transparent pt-8 pb-3 sm:pt-16 sm:pb-5">
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => setShowActivity(true)}
                    className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[14px] text-gray-300 tracking-wider font-medium cursor-pointer hover:text-white transition-colors">
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 animate-pulse" />
                      {agentSummary.working > 0 ? agentSummary.working : '0'} {lang === 'ko' ? '업무중' : 'working'}
                    </span>
                    <span className="text-gray-700">•</span>
                    <span className="flex items-center gap-1">
                      <Coffee className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500/70" />
                      {agentSummary.idle} {lang === 'ko' ? '대기' : 'idle'}
                    </span>
                    <span className="text-gray-700">•</span>
                    <span className="flex items-center gap-1">
                      <Moon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500/50" />
                      {agentSummary.resting} {lang === 'ko' ? '휴식' : 'resting'}
                    </span>
                    <span className="text-gray-700">|</span>
                    <span className="flex items-center gap-1">
                      <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400/70" />
                      {agentSummary.totalTasksToday} {lang === 'ko' ? '건 처리' : 'tasks'}
                    </span>
                  </button>
                  <p className="text-[9px] sm:text-[11px] text-gray-500 tracking-widest uppercase pointer-events-none">
                    {lang === 'ko' ? '상태 바를 탭하여 현황 확인' : 'Tap status bar for details'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===== FLOOR DETAIL PANEL ===== */}
        {selectedFloor && (
          <div className="w-full md:w-[70%] h-full animate-slideIn">
            <FloorDetail
              floor={selectedFloor}
              tileUrl={FLOOR_TILES[selectedFloor.level]}
              onAgentClick={handleAgentClick}
              onClose={handleCloseFloor}
              lang={lang}
              onOpenPendingReports={() => { setGlassPanelUnread(true); setShowGlassPanel(true); }}
              unreadReportCount={unreadCount}
            />
          </div>
        )}

        {/* ===== AGENT STATUS PANEL ===== */}
        {/* AgentStatusPanel removed — merged into ChairmanDashboard */}

        {/* ===== AGENT CHAT PANEL ===== */}
        {selectedAgent && (
          <AgentChat
            agent={selectedAgent}
            onClose={handleCloseChat}
            lang={lang}
          />
        )}

        {/* ===== ACTIVITY FEED ===== */}
        {showActivity && (
          <ChairmanDashboard
            open={showActivity}
            onClose={() => { setShowActivity(false); setDashboardTab(null); }}
            initialTab={dashboardTab}
            onOpenReports={() => {
              setShowGlassPanel(true);
            }}
            onOpenDecisions={() => {
              // Try directive pipeline first, fall back to closing dashboard and opening reports
              setTimeout(() => {
                const el = document.getElementById('directive-pipeline');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                } else {
                  setShowActivity(false);
                  setTimeout(() => setShowGlassPanel(true), 200);
                }
              }, 100);
            }}
          />
        )}



        {/* ===== COMPANY SETTINGS ===== */}
        <CompanySettings open={showSettings} onClose={() => setShowSettings(false)} lang={lang} />

        {/* ===== GLASS PANEL (Reports / Research) ===== */}
        {showGlassPanel && (
          <GlassPanel
            onClose={() => setShowGlassPanel(false)}
            filterUnread={glassPanelUnread}
          />
        )}

        {/* ===== MEETING ROOM ===== */}
        {showMeeting && (
          <MeetingRoom
            onClose={() => setShowMeeting(false)}
            lang={lang}
            onMeetingActive={(active, floors) => {
              setMeetingFloors(active && floors ? floors : []);
            }}
            onReportSave={(report) => addReport(report)}
          />
        )}

        {showFlow && (
          <AgentFlowGraph
            open={showFlow}
            onClose={() => setShowFlow(false)}
            lang={lang}
          />
        )}

        {showTimeline && (
          <TimelineView
            open={showTimeline}
            onClose={() => setShowTimeline(false)}
            lang={lang}
          />
        )}


      </div>
    </div>
  );
}

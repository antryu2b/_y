'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Building2, BarChart3, Wrench, AlertTriangle, Coins, Rocket, Users, Lock, FileText, Briefcase, Target, Lightbulb, RefreshCw, Zap, CheckCircle2, Circle, ClipboardList, MessageSquare, Mic, UserCheck, X } from 'lucide-react';
import { Lang, t } from '@/data/i18n';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { cleanMarkdown } from '@/lib/format-markdown';
import { ReactNode } from 'react';

interface MeetingMessage {
  type: 'meeting_start' | 'typing' | 'message' | 'summarizing' | 'meeting_end';
  agentId?: string;
  agentName?: string;
  number?: string;
  floor?: string;
  role?: string;
  message?: string;
  topic?: string;
  agenda?: string;
  participants?: Array<{ id: string; name: string; floor: string; role: string; number: string }>;
  summary?: string;
  conversation?: Array<{ speaker: string; message: string }>;
}

// Scenario types and icons
const SCENARIO_ICONS: Record<string, ReactNode> = {
  market: <BarChart3 className="w-3.5 h-3.5 inline" />,
  product: <Wrench className="w-3.5 h-3.5 inline" />,
  crisis: <AlertTriangle className="w-3.5 h-3.5 inline" />,
  investment: <Coins className="w-3.5 h-3.5 inline" />,
  launch: <Rocket className="w-3.5 h-3.5 inline" />,
  hiring: <Users className="w-3.5 h-3.5 inline" />,
  security: <Lock className="w-3.5 h-3.5 inline" />,
  content: <FileText className="w-3.5 h-3.5 inline" />,
  general: <Briefcase className="w-3.5 h-3.5 inline" />,
};

const SCENARIO_TYPE_LABELS: Record<string, { ko: string; en: string }> = {
  market: { ko: '시장/경쟁', en: 'Market' },
  product: { ko: '제품/개발', en: 'Product' },
  crisis: { ko: '위기 대응', en: 'Crisis' },
  investment: { ko: '투자', en: 'Investment' },
  launch: { ko: '런칭/마케팅', en: 'Launch' },
  hiring: { ko: '채용/인사', en: 'Hiring' },
  security: { ko: '보안', en: 'Security' },
  content: { ko: '콘텐츠', en: 'Content' },
  general: { ko: '일반', en: 'General' },
};

// Simulation scenarios with agent selection
const SIMULATION_SCENARIOS = [
  {
    type: 'crisis',
    title: { ko: 'Market Crisis', en: 'Market Crisis' },
    description: { ko: '주요 경쟁사가 50% 가격 인하를 단행했습니다', en: 'A major competitor has slashed prices by 50%' },
    scenario: 'A major competitor has suddenly slashed their prices by 50% across all product lines, creating significant market pressure and customer price sensitivity.',
    agents: ['skepty', 'quanty', 'globy', 'hedgy', 'tradey', 'tasky']
  },
  {
    type: 'launch',
    title: { ko: 'Product Launch', en: 'Product Launch' },
    description: { ko: '신제품 출시 준비 및 마케팅 전략 수립', en: 'New product launch preparation and marketing strategy' },
    scenario: 'We are preparing to launch a revolutionary AI-powered analytics platform. Need comprehensive go-to-market strategy and risk mitigation plans.',
    agents: ['buzzy', 'wordy', 'selly', 'growthy', 'searchy', 'tasky']
  },
  {
    type: 'security',
    title: { ko: 'Security Breach', en: 'Security Breach' },
    description: { ko: '잠재적 보안 취약점 발견 및 대응 방안', en: 'Potential security vulnerability discovered' },
    scenario: 'Our security team has detected unusual network activity suggesting a potential data breach attempt. Immediate response required.',
    agents: ['guardy', 'stacky', 'watchy', 'audity', 'legaly']
  },
  {
    type: 'investment',
    title: { ko: 'Investment Decision', en: 'Investment Decision' },
    description: { ko: '시리즈 A 투자 유치 검토', en: 'Series A funding consideration' },
    scenario: 'Multiple VCs have shown interest in leading our Series A round. Need to evaluate terms, timing, and strategic implications.',
    agents: ['quanty', 'valuey', 'fieldy', 'hedgy', 'finy', 'skepty']
  },
  {
    type: 'hiring',
    title: { ko: 'Hiring Surge', en: 'Hiring Surge' },
    description: { ko: '급속한 조직 확장을 위한 대량 채용', en: 'Rapid organizational expansion plan' },
    scenario: 'Board has approved aggressive hiring plan to scale from 30 to 100 employees in 6 months. Need strategic hiring and retention framework.',
    agents: ['hiry', 'evaly', 'tasky', 'finy', 'legaly']
  },
  {
    type: 'market',
    title: { ko: 'Competitor Response', en: 'Competitor Response' },
    description: { ko: '경쟁사의 새로운 기능 발표에 대한 대응', en: 'Response to competitor\'s new feature announcement' },
    scenario: 'Key competitor just announced a breakthrough feature that directly challenges our core value proposition. Strategic response needed.',
    agents: ['searchy', 'quanty', 'globy', 'skepty', 'growthy', 'tasky']
  }
];

interface AgentResponse {
  agentId: string;
  agentName: string;
  floor: string;
  role: string;
  response: string;
}

interface SimulationResult {
  scenario: string;
  type: string;
  agentCount: number;
  responses: AgentResponse[];
  summary: string;
}

interface Props {
  onClose: () => void;
  lang: Lang;
  initialAgenda?: string;
  onMeetingActive?: (active: boolean, floors?: number[]) => void;
  onReportSave?: (report: any) => void;
}

export function MeetingRoom({ onClose, lang, initialAgenda, onMeetingActive, onReportSave }: Props) {
  const [agenda, setAgenda] = useState(initialAgenda || '');
  const [messages, setMessages] = useState<MeetingMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [typingAgent, setTypingAgent] = useState<string | null>(null);
  const [chairmanInput, setChairmanInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [meetingEnded, setMeetingEnded] = useState(false);
  const [summary, setSummary] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  
  // Simulation mode state
  const [mode, setMode] = useState<'meeting' | 'simulation'>('meeting');
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [visibleResponses, setVisibleResponses] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typingAgent]);

  useEffect(() => {
    if (initialAgenda && !isRunning && messages.length === 0) {
      startMeeting(initialAgenda);
    }
  }, [initialAgenda]);

  // Simulate response animation for simulation mode
  useEffect(() => {
    if (!simulationResult) return;
    if (visibleResponses < simulationResult.responses.length) {
      const timer = setTimeout(() => {
        setVisibleResponses((v) => v + 1);
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 600);
      return () => clearTimeout(timer);
    } else if (visibleResponses === simulationResult.responses.length && !showSummary) {
      const timer = setTimeout(() => {
        setShowSummary(true);
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });

        // Auto-save simulation result as a report
        if (onReportSave && simulationResult.summary) {
          const typeLabel = SCENARIO_TYPE_LABELS[simulationResult.type] || SCENARIO_TYPE_LABELS.general;
          const priority: 'high' | 'medium' | 'low' =
            simulationResult.type === 'crisis' || simulationResult.type === 'security' ? 'high' :
            simulationResult.type === 'investment' || simulationResult.type === 'market' ? 'medium' : 'low';

          onReportSave({
            title: simulationResult.scenario,
            department: lang === 'ko' ? typeLabel.ko : typeLabel.en,
            floor: 10,
            type: 'simulation',
            priority,
            summary: simulationResult.summary.slice(0, 200) + (simulationResult.summary.length > 200 ? '...' : ''),
            content: simulationResult.responses.map(r => `**${r.agentName}** (${r.floor})\n${r.response}`).join('\n\n') + '\n\n---\n\n' + simulationResult.summary,
            actions: simulationResult.summary.match(/[•\-]\s*(.+)/g)?.map(s => s.replace(/^[•\-]\s*/, '')) || undefined,
          });
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [simulationResult, visibleResponses, showSummary, onReportSave, lang]);

  const startMeeting = useCallback(async (meetingAgenda: string) => {
    if (!meetingAgenda.trim()) return;

    setIsRunning(true);
    setMessages([]);
    setMeetingEnded(false);
    setSummary('');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agenda: meetingAgenda }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error('Meeting API error');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data: MeetingMessage = JSON.parse(line.slice(6));

            if (data.type === 'meeting_start') {
              setMessages(prev => [...prev, data]);
              // Notify tower about active meeting floors
              if (data.participants && onMeetingActive) {
                const floors = [...new Set(data.participants.map(p => {
                  const f = parseInt(p.floor);
                  return isNaN(f) ? 0 : f;
                }))].filter(f => f > 0);
                onMeetingActive(true, floors);
              }
            } else if (data.type === 'typing') {
              setTypingAgent(data.agentName || null);
            } else if (data.type === 'message') {
              setTypingAgent(null);
              setMessages(prev => [...prev, data]);
            } else if (data.type === 'summarizing') {
              setTypingAgent(lang === 'ko' ? '요약 작성 중...' : 'Summarizing...');
            } else if (data.type === 'meeting_end') {
              setTypingAgent(null);
              setMeetingEnded(true);
              setSummary(data.summary || '');
              setMessages(prev => [...prev, data]);
              onMeetingActive?.(false);
            }
          } catch {}
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Meeting error:', err);
      }
    } finally {
      setIsRunning(false);
    }
  }, [onMeetingActive]);

  const runSimulation = useCallback(async (scenario: string, scenarioType?: string) => {
    if (!scenario.trim() || isRunning) return;
    
    setIsRunning(true);
    setSimulationResult(null);
    setVisibleResponses(0);
    setShowSummary(false);
    setMode('simulation');

    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: scenario.trim(), type: scenarioType, lang }),
      });

      if (!res.ok) throw new Error('Simulation failed');
      const data: SimulationResult = await res.json();
      setSimulationResult(data);
    } catch {
      setSimulationResult(null);
    } finally {
      setIsRunning(false);
    }
  }, [lang, isRunning]);

  const selectScenario = useCallback((scenarioData: typeof SIMULATION_SCENARIOS[0]) => {
    setAgenda(scenarioData.scenario);
    setSelectedScenario(scenarioData.type);
    setMode('simulation');
  }, []);

  const resetToMeeting = useCallback(() => {
    setMode('meeting');
    setSimulationResult(null);
    setVisibleResponses(0);
    setShowSummary(false);
    setSelectedScenario(null);
    setMessages([]);
    setMeetingEnded(false);
    setSummary('');
    setAgenda('');
  }, []);

  const toggleSTT = () => {
    const W = window as any;
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) { alert(lang === 'ko' ? '음성인식 미지원 브라우저' : 'Speech recognition not supported'); return; }
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    const recognition = new SR();
    recognition.lang = lang === 'ko' ? 'ko-KR' : 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognitionRef.current = recognition;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setChairmanInput(transcript);
    };
    recognition.start();
  };

  const sendChairmanMessage = async () => {
    if (!chairmanInput.trim() || !isRunning) return;

    const msg = chairmanInput.trim();
    setChairmanInput('');

    // Add chairman message to UI
    setMessages(prev => [...prev, {
      type: 'message',
      agentId: 'chairman',
      agentName: '회장',
      number: '00',
      floor: '10F',
      role: lang === 'ko' ? '의장' : 'Chairman',
      message: msg,
    }]);
  };

  const agentMessages = messages.filter(m => m.type === 'message');
  const participants = messages.find(m => m.type === 'meeting_start')?.participants || [];

  const exampleAgendas = lang === 'ko' ? [
    '경쟁사가 비슷한 AI 제품을 출시했다',
    '주요 고객이 해지 의사를 밝혔다',
    '시리즈 A 투자 유치를 검토하자',
    '신규 콘텐츠 전략을 수립하자',
  ] : [
    'A competitor launched a similar AI product',
    'A major client wants to cancel',
    'Should we pursue Series A funding?',
    'New content strategy needed',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full h-full sm:w-[96vw] sm:h-[94vh] sm:max-w-[1400px] bg-[#060b14]/98 sm:border sm:border-white/10 rounded-none sm:rounded-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 sm:px-4 sm:py-3 glass-strong flex items-center justify-between shrink-0 border-b border-white/5">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${isRunning ? 'bg-red-500 animate-pulse' : meetingEnded ? 'bg-green-500' : 'bg-gray-500'}`} />
          <h2 className="text-white font-bold text-xs sm:text-sm">
            {mode === 'simulation' 
              ? (isRunning ? (<><Zap className="w-3 h-3 inline text-yellow-400" /> {lang === 'ko' ? '시뮬레이션 실행 중' : 'Simulation Running'}</>) : simulationResult ? (<><CheckCircle2 className="w-3 h-3 inline text-green-400" /> {lang === 'ko' ? '시뮬레이션 완료' : 'Simulation Complete'}</>) : (<><Target className="w-3 h-3 inline" /> {lang === 'ko' ? '시나리오 시뮬레이션' : 'Scenario Simulation'}</>))
              : (isRunning ? (<><Circle className="w-3 h-3 inline text-red-500 fill-red-500" /> {lang === 'ko' ? '회의 진행 중' : 'Meeting in Progress'}</>) : meetingEnded ? (<><CheckCircle2 className="w-3 h-3 inline text-green-400" /> {lang === 'ko' ? '회의 종료' : 'Meeting Ended'}</>) : (<><ClipboardList className="w-3 h-3 inline" /> {lang === 'ko' ? '새 회의' : 'New Meeting'}</>))
            }
          </h2>
          {participants.length > 0 && (
            <span className="text-[9px] sm:text-[10px] text-gray-400">
              {participants.length}명 참석
            </span>
          )}
        </div>
        <button
          onClick={() => {
            abortRef.current?.abort();
            onMeetingActive?.(false);
            onClose();
          }}
          className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg glass hover:bg-white/10 text-gray-400 hover:text-white transition text-xs sm:text-sm"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Participants bar */}
      {participants.length > 0 && (
        <div className="px-3 py-2 sm:px-4 sm:py-2 flex items-center gap-1.5 sm:gap-2 overflow-x-auto shrink-0 border-b border-white/5">
          {participants.map(p => (
            <div key={p.id} className="flex items-center gap-1 sm:gap-1.5 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg glass shrink-0">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden bg-gray-800 border border-white/10">
                <img
                  src={`/agents/${p.number}-${p.id}.png`}
                  alt={p.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <span className="text-[9px] sm:text-[10px] text-gray-300">{p.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 space-y-2 sm:space-y-3">
        {/* No meeting yet */}
        {messages.length === 0 && !simulationResult && !isRunning && (
          <div className="max-w-2xl mx-auto pt-8 space-y-6">
            <div className="text-center">
              <Building2 className="w-6 h-6 text-white/40 mb-2" />
              <h3 className="text-white font-bold text-lg mb-1">
                {lang === 'ko' ? '_y Holdings War Room' : '_y Holdings War Room'}
              </h3>
              <p className="text-xs text-gray-400">
                {lang === 'ko' ? '시나리오를 선택하거나 직접 안건을 입력하세요' : 'Select a scenario preset or enter a custom agenda'}
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-1 sm:gap-2 p-1 rounded-xl bg-white/5">
              <button
                onClick={() => setMode('meeting')}
                className={`flex-1 py-1.5 px-2 sm:py-2 sm:px-3 rounded-lg text-[10px] sm:text-xs font-medium transition ${
                  mode === 'meeting'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline mr-1" />
                {lang === 'ko' ? '회의 모드' : 'Meeting Mode'}
              </button>
              <button
                onClick={() => setMode('simulation')}
                className={`flex-1 py-1.5 px-2 sm:py-2 sm:px-3 rounded-lg text-[10px] sm:text-xs font-medium transition ${
                  mode === 'simulation'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <Target className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline mr-1" />
                {lang === 'ko' ? '시뮬레이션' : 'Simulation'}
              </button>
            </div>

            {/* Scenario presets for simulation mode */}
            {mode === 'simulation' && (
              <div className="space-y-3">
                <p className="text-[10px] text-gray-600 text-center uppercase tracking-wider">
                  {lang === 'ko' ? '시나리오 프리셋' : 'Scenario Presets'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SIMULATION_SCENARIOS.map((scenario) => {
                    const typeInfo = SCENARIO_TYPE_LABELS[scenario.type] || SCENARIO_TYPE_LABELS.general;
                    return (
                      <button
                        key={scenario.type + scenario.title.en}
                        onClick={() => selectScenario(scenario)}
                        className="text-left p-2 sm:p-3 rounded-xl glass hover:bg-white/10 transition space-y-1"
                      >
                        <div className="flex items-center gap-1 sm:gap-2 mb-1">
                          <span className="text-[8px] sm:text-[9px] px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full bg-amber-400/10 text-amber-300/80 font-medium">
                            {SCENARIO_ICONS[scenario.type]} {lang === 'ko' ? typeInfo.ko : typeInfo.en}
                          </span>
                        </div>
                        <div className="text-[11px] sm:text-xs font-medium text-white">
                          {lang === 'ko' ? scenario.title.ko : scenario.title.en}
                        </div>
                        <div className="text-[9px] sm:text-[10px] text-gray-400 leading-relaxed">
                          {lang === 'ko' ? scenario.description.ko : scenario.description.en}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Input section */}
            <div className="space-y-2">
              <textarea
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                placeholder={
                  mode === 'simulation'
                    ? (lang === 'ko' ? '시나리오를 입력하거나 위의 프리셋을 선택하세요...' : 'Enter a scenario or select a preset above...')
                    : (lang === 'ko' ? '회의 안건을 입력하세요...' : 'Enter meeting agenda...')
                }
                className="w-full glass rounded-xl px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-400/30 resize-none h-16 sm:h-20"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    if (mode === 'simulation') {
                      runSimulation(agenda, selectedScenario || undefined);
                    } else {
                      startMeeting(agenda);
                    }
                  }
                }}
              />
              <button
                onClick={() => mode === 'simulation' ? runSimulation(agenda, selectedScenario || undefined) : startMeeting(agenda)}
                disabled={!agenda.trim()}
                className={`w-full py-2.5 sm:py-3 rounded-xl disabled:opacity-30 text-xs sm:text-sm font-medium transition border ${
                  mode === 'simulation'
                    ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border-blue-400/20'
                    : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-400/20'
                }`}
              >
                {mode === 'simulation'
                  ? (
                    <>
                      <Target className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                      <Zap className="w-3 h-3 inline text-yellow-400" /> {lang === 'ko' ? '시뮬레이션 실행' : 'Run Simulation'}
                    </>
                  ) : (
                    <>
                      <Users className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                      <Circle className="w-3 h-3 inline text-red-500 fill-red-500" /> {lang === 'ko' ? '회의 소집' : 'Start Meeting'}
                    </>
                  )
                }
              </button>
            </div>

            {/* Examples for meeting mode */}
            {mode === 'meeting' && (
              <div className="space-y-2">
                <p className="text-[10px] text-gray-600 text-center">
                  {lang === 'ko' ? '예시 안건' : 'Example agendas'}
                </p>
                {exampleAgendas.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => { setAgenda(ex); startMeeting(ex); }}
                    className="w-full text-left px-4 py-2.5 rounded-xl glass hover:bg-white/10 text-gray-300 text-xs transition"
                  >
                    <MessageSquare className="w-3 h-3 inline mr-1 text-gray-400" /> {ex}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Meeting messages */}
        {agentMessages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.agentId === 'chairman' ? 'justify-end' : 'justify-start'} animate-fadeInUp`}
          >
            {msg.agentId !== 'chairman' && (
              <div className="shrink-0 mr-2 sm:mr-3 flex flex-col items-center gap-0.5 sm:gap-1">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-gray-800 border border-white/10">
                  <img
                    src={`/agents/${msg.number}-${msg.agentId}.png`}
                    alt={msg.agentName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const el = e.target as HTMLImageElement;
                      el.style.display = 'none';
                    }}
                  />
                </div>
                <span className="text-[7px] sm:text-[8px] text-gray-500">#{msg.number}</span>
              </div>
            )}

            <div className={`max-w-[80%] sm:max-w-[75%] ${msg.agentId === 'chairman' ? '' : ''}`}>
              {msg.agentId !== 'chairman' && (
                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                  <span className="text-[10px] sm:text-xs font-semibold text-white">{msg.agentName}</span>
                  <span className="text-[8px] sm:text-[9px] text-gray-500">{msg.role}</span>
                  <span className="text-[8px] sm:text-[9px] px-1 py-0.5 sm:px-1.5 sm:py-0.5 rounded bg-white/5 text-gray-500">{msg.floor}</span>
                </div>
              )}
              <div
                className={`px-3 py-2 sm:px-4 sm:py-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  msg.agentId === 'chairman'
                    ? 'bg-amber-500/20 text-amber-50 border border-amber-400/20 rounded-br-md'
                    : 'glass text-gray-200 rounded-bl-md'
                }`}
              >
                {msg.agentId === 'chairman' && (
                  <div className="text-[8px] sm:text-[9px] text-amber-400/60 font-medium mb-0.5 sm:mb-1 flex items-center gap-1"><UserCheck className="w-3 h-3" /> 회장</div>
                )}
                {cleanMarkdown(msg.message || '')}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {typingAgent && mode === 'meeting' && (
          <div className="flex items-center gap-3 animate-fadeInUp">
            <div className="w-10 h-10 rounded-xl glass flex items-center justify-center">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
            <span className="text-xs text-gray-400">{typingAgent} 발언 중...</span>
          </div>
        )}

        {/* Simulation loading */}
        {isRunning && mode === 'simulation' && !simulationResult && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-fadeIn">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-blue-400/20 border-t-blue-400 animate-spin" />
              <span className="absolute inset-0 flex items-center justify-center"><Target className="w-5 h-5" /></span>
            </div>
            <div className="text-center">
              <p className="text-sm text-blue-300 font-medium">
                {lang === 'ko' ? '시뮬레이션 실행 중...' : 'Running simulation...'}
              </p>
              <p className="text-[10px] text-gray-500 mt-1 max-w-xs mx-auto">{agenda}</p>
            </div>
          </div>
        )}

        {/* Simulation Results */}
        {simulationResult && mode === 'simulation' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Scenario header */}
            <div className="glass rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                {(() => {
                  const typeInfo = SCENARIO_TYPE_LABELS[simulationResult.type] || SCENARIO_TYPE_LABELS.general;
                  return (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-400/10 text-blue-300/80 font-medium">
                      {SCENARIO_ICONS[simulationResult.type]} {lang === 'ko' ? typeInfo.ko : typeInfo.en}
                    </span>
                  );
                })()}
              </div>
              <p className="text-sm text-white font-medium">{simulationResult.scenario}</p>
              <p className="text-[10px] text-gray-500 mt-1">
                {simulationResult.agentCount} {lang === 'ko' ? '명의 에이전트가 분석했습니다' : 'agents analyzed'}
              </p>
            </div>

            {/* Agent responses */}
            <div className="space-y-3">
              {simulationResult.responses.slice(0, visibleResponses).map((r, i) => (
                <div key={i} className="flex gap-3 animate-fadeInUp" style={{ animationDelay: `${i * 100}ms` }}>
                  {/* Agent avatar */}
                  <div className="shrink-0">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-800 border border-white/10">
                      <img
                        src={`/agents/${r.agentId}.png`}
                        alt={r.agentName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </div>

                  {/* Response content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-white">{r.agentName}</span>
                      <span className="text-[9px] text-gray-500">{r.floor}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">{r.role}</span>
                    </div>
                    <div className="glass rounded-xl rounded-tl-md px-3 py-2 text-[13px] text-gray-200 leading-relaxed">
                      {cleanMarkdown(r.response)}
                    </div>
                  </div>
                </div>
              ))}

              {/* Show thinking dots while more responses coming */}
              {visibleResponses < simulationResult.responses.length && (
                <div className="flex gap-3 animate-fadeIn">
                  <div className="w-10 h-10 rounded-xl bg-gray-800/50 border border-white/5 flex items-center justify-center">
                    <div className="flex gap-1">
                      <div className="w-1 h-1 rounded-full bg-blue-400/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1 h-1 rounded-full bg-blue-400/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1 h-1 rounded-full bg-blue-400/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                  <div className="flex-1 glass rounded-xl px-3 py-3 flex items-center">
                    <span className="text-[11px] text-gray-500">
                      {simulationResult.responses[visibleResponses]?.agentName} {lang === 'ko' ? '분석 중...' : 'analyzing...'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Executive summary */}
            {showSummary && simulationResult.summary && (
              <div className="animate-fadeInUp">
                <div className="rounded-xl border border-blue-400/20 bg-blue-400/[0.05] px-4 py-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-blue-300" />
                    <h3 className="text-sm font-bold text-blue-300">
                      {lang === 'ko' ? '종합 분석 보고서' : 'Executive Summary'}
                    </h3>
                  </div>
                  <div className="text-[13px] text-gray-200 leading-relaxed whitespace-pre-line">
                    {cleanMarkdown(simulationResult.summary)}
                  </div>
                </div>

                {/* Run another */}
                <button
                  onClick={resetToMeeting}
                  className="w-full mt-3 py-2.5 rounded-xl glass hover:bg-white/10 text-gray-400 text-sm transition"
                >
                  <RefreshCw className="w-3 h-3 inline mr-1" /> {lang === 'ko' ? '새 시나리오' : 'New Scenario'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Summary */}
        {meetingEnded && summary && mode === 'meeting' && (
          <div className="mt-6 p-4 rounded-2xl glass border border-amber-400/20 animate-fadeInUp">
            <h4 className="text-amber-300 font-bold text-sm mb-2 flex items-center gap-1"><ClipboardList className="w-4 h-4" /> 회의 요약 보고서</h4>
            <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
              {cleanMarkdown(summary)}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  onMeetingActive?.(false);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-green-500/20 text-green-300 text-xs font-medium border border-green-400/20 hover:bg-green-500/30 transition"
              >
                <CheckCircle2 className="w-3 h-3 inline text-green-400" /> 결재
              </button>
              <button
                onClick={resetToMeeting}
                className="px-4 py-2 rounded-xl glass text-gray-300 text-xs hover:bg-white/10 transition"
              >
                <RefreshCw className="w-3 h-3 inline" /> {lang === 'ko' ? '새 회의' : 'New Meeting'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chairman input (during meeting) */}
      {isRunning && mode === 'meeting' && (
        <div className="px-3 py-2 sm:px-4 sm:py-3 glass-strong shrink-0 border-t border-white/5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendChairmanMessage();
            }}
            className="flex gap-1.5 sm:gap-2"
          >
            <input
              type="text"
              value={chairmanInput}
              onChange={(e) => setChairmanInput(e.target.value)}
              placeholder={isListening ? (lang === 'ko' ? '듣고 있어요...' : 'Listening...') : (lang === 'ko' ? '회장으로 발언하기...' : 'Speak as Chairman...')}
              className={`flex-1 glass rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-400/30 ${isListening ? 'ring-1 ring-red-400/50' : ''}`}
            />
            <button
              type="button"
              onClick={toggleSTT}
              className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl transition text-sm sm:text-lg ${
                isListening 
                  ? 'bg-red-500/30 text-red-300 border border-red-400/40 animate-pulse' 
                  : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10'
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              type="submit"
              disabled={!chairmanInput.trim()}
              className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-30 text-amber-300 text-xs sm:text-sm font-medium transition border border-amber-400/20"
            >
              <UserCheck className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
      </div>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { Users, Zap, Frown, GraduationCap, Link2, User, MessageSquare, Volume2, Square, Mic, ChevronDown, ChevronUp, Eye, Target, ClipboardList, Check, X } from 'lucide-react';
import { Agent, floors } from '@/data/floors';
import { Lang, t } from '@/data/i18n';
import { agentSkills } from '@/data/skills';
import { agentRelationships, Relationship } from '@/data/relationships';
import { agentPersonas } from '@/data/personas';
import { useTTS } from '@/hooks/useTTS';
import { RenderMarkdown } from '@/lib/format-markdown';

interface Props {
  agent: Agent;
  onClose: () => void;
  lang: Lang;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// MBTI mapping for agents (personality-based)
const AGENT_MBTI: Record<string, string> = {
  andrew: 'ENTJ',
  tasky: 'ENTJ', finy: 'ISTJ', legaly: 'INTJ',
  skepty: 'INTP', audity: 'ISFJ',
  pixely: 'ENFP', buildy: 'ISTP', testy: 'ISTJ',
  buzzy: 'ESFP', wordy: 'INFP', edity: 'ISTP', searchy: 'INTJ',
  growthy: 'ENTP', logoy: 'ISFP', helpy: 'ESFJ', clicky: 'INFJ', selly: 'ESTP',
  stacky: 'ISTJ', watchy: 'ISTJ', guardy: 'INTJ',
  hiry: 'ENFJ', evaly: 'ISTJ',
  quanty: 'INTJ', tradey: 'ESTP', globy: 'INFJ', fieldy: 'INTP', hedgy: 'ISFJ', valuey: 'INTJ',
  opsy: 'ESFJ',
  counsely: 'ENFJ',
};

function getAgentSuggestions(agent: Agent, lang: Lang): string[] {
  const role = agent.role.toLowerCase();
  if (lang === 'ko') {
    const base = [
      '오늘 무슨 일 하고 있어요?',
      '당신의 부서에 대해 알려주세요',
    ];
    if (role.includes('dev') || role.includes('design') || role.includes('qa')) {
      base.push('현재 진행 중인 프로젝트는?');
    } else if (role.includes('trading') || role.includes('quant') || role.includes('valuation')) {
      base.push('요즘 시장 상황은 어때요?');
    } else if (role.includes('marketing') || role.includes('growth') || role.includes('sales')) {
      base.push('최근 마케팅 성과는?');
    } else {
      base.push('다른 에이전트와 협업은 어때요?');
    }
    return base;
  }
  const base = [
    'What are you working on today?',
    'Tell me about your department',
  ];
  if (role.includes('dev') || role.includes('design') || role.includes('qa')) {
    base.push('What projects are in progress?');
  } else if (role.includes('trading') || role.includes('quant') || role.includes('valuation')) {
    base.push("How's the market looking?");
  } else if (role.includes('marketing') || role.includes('growth') || role.includes('sales')) {
    base.push('How are recent campaigns performing?');
  } else {
    base.push('How do you collaborate with others?');
  }
  return base;
}

export function AgentChat({ agent, onClose, lang }: Props) {
  const text = t[lang];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<ReturnType<typeof setTimeout> | null>(null) as { current: any };
  const [loading, setLoading] = useState(false);
  const [loadingStart, setLoadingStart] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { speak, stop, speaking, supported: ttsOk } = useTTS({ lang: lang === 'ko' ? 'ko-KR' : 'en-US' });
  const skills = agentSkills[agent.id]?.skills?.slice(0, 3) || [];
  const allSkills = agentSkills[agent.id]?.skills || [];
  const coreRole = agentSkills[agent.id]?.coreRole || '';
  const successMetrics = agentSkills[agent.id]?.successMetrics || [];
  const criticalRules = agentSkills[agent.id]?.criticalRules || [];
  const mbti = AGENT_MBTI[agent.id] || '—';
  const floorInfo = floors.find((f) => f.level === agent.floor);
  const suggestions = getAgentSuggestions(agent, lang);
  const relationships = agentRelationships[agent.id] || [];
  const [showProfile, setShowProfile] = useState(false);
  const persona = agentPersonas[agent.id] || '';
  const [directiveRequest, setDirectiveRequest] = useState<{title: string; description: string} | null>(null);
  const [creatingDirective, setCreatingDirective] = useState(false);

  const relationshipIcon: Record<string, ReactNode> = {
    alliance: <Users className="w-3 h-3 inline text-green-400" />,
    rival: <Zap className="w-3 h-3 inline text-red-400" />,
    tension: <Frown className="w-3 h-3 inline text-orange-400" />,
    mentor: <GraduationCap className="w-3 h-3 inline text-blue-400" />,
    collaborator: <Link2 className="w-3 h-3 inline text-cyan-400" />,
  };

  const relationshipColor: Record<string, string> = {
    alliance: 'bg-green-400/10 text-green-300/80 border-green-400/20',
    rival: 'bg-red-400/10 text-red-300/80 border-red-400/20',
    tension: 'bg-orange-400/10 text-orange-300/80 border-orange-400/20',
    mentor: 'bg-blue-400/10 text-blue-300/80 border-blue-400/20',
    collaborator: 'bg-purple-400/10 text-purple-300/80 border-purple-400/20',
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Elapsed timer while loading
  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - loadingStart) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, loadingStart]);

  const toggleSTT = () => {
    const W = window as any;
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) { alert('이 브라우저는 음성인식을 지원하지 않습니다.'); return; }
    
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
      setInput(transcript);
    };
    recognition.start();
  };

  const checkDirectiveEscalation = (response: string) => {
    // Look for [DIRECTIVE_REQUEST] tag in agent response
    const directiveMatch = response.match(/\[DIRECTIVE_REQUEST\]([\s\S]*?)(?:\[\/DIRECTIVE_REQUEST\]|$)/);
    if (directiveMatch) {
      const content = directiveMatch[1].trim();
      // Try to parse title and description from the content
      const titleMatch = content.match(/(?:title|제목)[:：]\s*(.+?)(?:\n|description|설명|$)/i);
      const descMatch = content.match(/(?:description|설명)[:：]\s*([\s\S]+?)$/i);
      
      const title = titleMatch?.[1]?.trim() || content.split('\n')[0] || 'New Directive';
      const description = descMatch?.[1]?.trim() || content;
      
      setDirectiveRequest({ title, description });
    }
  };

  const createDirectiveFromRequest = async () => {
    if (!directiveRequest) return;
    
    setCreatingDirective(true);
    try {
      const res = await fetch('/api/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'strategy',
          title: directiveRequest.title,
          description: directiveRequest.description,
          priority: 'medium',
          trigger_source: 'directive',
          trigger_agent_id: 'chairman',
          assignees: [agent.id], // Assign to the agent who suggested it
          status: 'pending'
        })
      });
      
      if (res.ok) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: lang === 'ko' 
            ? '정식 지시사항으로 등록되었습니다.' 
            : 'Directive has been formally registered.' 
        }]);
        setDirectiveRequest(null);
      } else {
        throw new Error('Failed to create directive');
      }
    } catch (error) {
      console.error('Create directive error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: lang === 'ko' 
          ? '지시사항 등록에 실패했습니다.' 
          : 'Failed to register directive.' 
      }]);
    } finally {
      setCreatingDirective(false);
    }
  };

  const dismissDirectiveRequest = () => {
    setDirectiveRequest(null);
  };

  const sendMessage = async (msg: string) => {
    if (!msg.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: msg.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setLoadingStart(Date.now());

    try {
      // Include connected companies as context for agent awareness
      let connectedCompanies: any[] = [];
      try {
        const raw = localStorage.getItem('y-company-connections');
        if (raw) connectedCompanies = JSON.parse(raw);
      } catch {}

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          message: msg.trim(),
          history: messages.slice(-10),
          lang,
          context: connectedCompanies.length > 0 ? {
            connectedCompanies: connectedCompanies.map(c => ({
              name: c.company_name || c.title,
              industry: c.industry,
              description: c.description,
              agents: c.agents,
              connected_at: c.connected_at,
            })),
          } : undefined,
        }),
      });

      if (!res.ok) throw new Error('API error');
      const data = await res.json();

      // 큐 기반 응답인 경우 (queueId가 있음)
      if (data.queueId) {
        await pollForResponse(data.queueId);
      } else if (data.reply) {
        // 직접 응답인 경우 (기존 방식)
        const assistantMsg: ChatMessage = { role: 'assistant', content: data.reply };
        setMessages((prev) => [...prev, assistantMsg]);
        
        // Check for directive escalation
        checkDirectiveEscalation(data.reply);
        
        setLoading(false);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Send message error:', error);
      setMessages((prev) => [...prev, { role: 'assistant', content: text.chatError }]);
      setLoading(false);
    }
  };

  const pollForResponse = async (queueId: string) => {
    const startTime = Date.now();
    const TIMEOUT = 180000; // 180초 타임아웃 (DeepSeek R1 70B는 ~200초 소요)
    const POLL_INTERVAL = 1000; // 1초 간격
    
    const poll = async (): Promise<void> => {
      try {
        if (Date.now() - startTime > TIMEOUT) {
          throw new Error('Response timeout');
        }

        const res = await fetch(`/api/chat?id=${queueId}`);
        if (!res.ok) throw new Error('Polling error');
        
        const data = await res.json();
        
        if (data.status === 'done') {
          setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
          
          // Check for directive escalation
          checkDirectiveEscalation(data.reply);
          
          setLoading(false);
        } else if (data.status === 'error') {
          throw new Error(data.error || 'Processing error');
        } else {
          // 아직 처리 중이면 1초 후 다시 폴링
          setTimeout(poll, POLL_INTERVAL);
        }
      } catch (error) {
        console.error('Polling error:', error);
        setMessages((prev) => [...prev, { 
          role: 'assistant', 
          content: error instanceof Error && error.message === 'Response timeout' 
            ? (lang === 'ko' ? '응답 시간이 초과되었습니다. 다시 시도해 주세요.' : 'Response timeout. Please try again.') 
            : text.chatError 
        }]);
        setLoading(false);
      }
    };

    poll();
  };

  const statusColor =
    agent.status === 'working' ? '#22c55e' :
    agent.status === 'meeting' ? '#f59e0b' : '#6b7280';

  const statusText =
    agent.status === 'working' ? text.working :
    agent.status === 'meeting' ? text.meeting : text.idle;

  return (
    <div className="fixed inset-0 md:inset-auto md:right-0 md:top-0 md:bottom-0 md:w-[420px] bg-[#060b14] z-50 flex flex-col animate-slideIn border-l border-white/5">
      {/* Header with agent profile */}
      <div className="px-4 pt-4 pb-3 glass-strong shrink-0">
        {/* Close + status row */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg glass hover:bg-white/10 text-gray-400 hover:text-white transition text-sm"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: statusColor, boxShadow: `0 0 6px ${statusColor}80` }}
            />
            <span className="text-[10px] text-gray-400">{statusText}</span>
          </div>
        </div>

        {/* Agent profile */}
        <div className="flex items-center gap-4">
          {/* Large avatar */}
          <div className="relative shrink-0">
            <div className="w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-gray-900 border border-white/10 shadow-lg">
              {agent.image ? (
                <img src={agent.image} alt={agent.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-amber-400/60 bg-gradient-to-br from-gray-800 to-gray-900">
                  {agent.name[0]}
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-white truncate">
              {agent.name}
              <span className="text-gray-500 font-normal text-xs ml-1.5">#{agent.number}</span>
            </h3>
            <p className="text-[11px] text-gray-400 truncate mt-0.5">
              {agent.role}
            </p>

            {/* Meta pills */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-400/10 text-amber-300/80 font-medium">
                {mbti}
              </span>
              {floorInfo && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/5 text-gray-400">
                  {floorInfo.emoji} {floorInfo.label}
                </span>
              )}
              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/5 text-gray-400">
                {agent.department}
              </span>
            </div>
          </div>
        </div>

        {/* Skill tags */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {skills.map((s, i) => (
              <span
                key={i}
                className="text-[9px] px-2 py-0.5 rounded-full glass text-gray-300"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Relationships */}
        {relationships.length > 0 && (
          <div className="mt-3 pt-2 border-t border-white/5">
            <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1.5">
              {text.relationships || '관계'}
            </p>
            <div className="flex flex-wrap gap-1">
              {relationships.map((rel: Relationship, i: number) => (
                <span
                  key={i}
                  className={`text-[9px] px-2 py-0.5 rounded-full border ${relationshipColor[rel.type] || 'bg-white/5 text-gray-400 border-white/10'}`}
                  title={lang === 'ko' ? rel.descKo : rel.descEn}
                >
                  {relationshipIcon[rel.type] || <User className="w-3 h-3 inline" />} {rel.targetId.charAt(0).toUpperCase() + rel.targetId.slice(1)}
                  <span className="opacity-60 ml-1">
                    {lang === 'ko' ? rel.descKo : rel.descEn}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* View Profile / Prompt toggle */}
        <button
          onClick={() => setShowProfile(!showProfile)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] text-gray-500 hover:text-amber-400 hover:bg-white/5 transition border-t border-white/5"
        >
          <Eye className="w-3 h-3" />
          {lang === 'ko' ? '프롬프트 & 상세 보기' : 'View Prompt & Details'}
          {showProfile ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Expanded Profile Panel */}
      {showProfile && (
        <div className="px-4 py-3 border-b border-white/5 overflow-y-auto max-h-[50vh] space-y-3 bg-black/30">
          {/* Core Role */}
          {coreRole && (
            <div>
              <p className="text-[9px] text-amber-400 uppercase tracking-wider mb-1 font-medium">
                {lang === 'ko' ? '핵심 역할' : 'Core Role'}
              </p>
              <p className="text-xs text-gray-300">{coreRole}</p>
            </div>
          )}

          {/* All Skills */}
          {allSkills.length > 0 && (
            <div>
              <p className="text-[9px] text-amber-400 uppercase tracking-wider mb-1 font-medium">
                {lang === 'ko' ? '보유 스킬' : 'Skills'}
              </p>
              <div className="flex flex-wrap gap-1">
                {allSkills.map((s, i) => (
                  <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Success Metrics */}
          {successMetrics.length > 0 && (
            <div>
              <p className="text-[9px] text-emerald-400 uppercase tracking-wider mb-1 font-medium">
                {lang === 'ko' ? '성공 기준' : 'Success Metrics'}
              </p>
              <ul className="space-y-0.5">
                {successMetrics.map((m, i) => (
                  <li key={i} className="text-[10px] text-gray-400 flex items-start gap-1.5">
                    <Check className="w-3 h-3 text-emerald-400 shrink-0 inline" /> {m}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Critical Rules */}
          {criticalRules.length > 0 && (
            <div>
              <p className="text-[9px] text-red-400 uppercase tracking-wider mb-1 font-medium">
                {lang === 'ko' ? '절대 규칙' : 'Critical Rules'}
              </p>
              <ul className="space-y-0.5">
                {criticalRules.map((r, i) => (
                  <li key={i} className="text-[10px] text-gray-400 flex items-start gap-1.5">
                    <X className="w-3 h-3 text-red-400 shrink-0 inline" /> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* System Prompt (raw persona) */}
          {persona && (
            <div>
              <p className="text-[9px] text-blue-400 uppercase tracking-wider mb-1 font-medium">
                {lang === 'ko' ? '시스템 프롬프트' : 'System Prompt'}
              </p>
              <pre className="text-[10px] text-gray-500 bg-black/40 rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed border border-white/5 max-h-[200px] overflow-y-auto">
                {persona}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-4 pt-4">
            <p className="text-xs text-gray-500 text-center">
              {text.chatWith} {agent.name}
            </p>

            {/* Suggested questions */}
            <div className="space-y-2">
              <p className="text-[10px] text-gray-600 text-center">{text.suggestedQuestions}</p>
              <div className="flex flex-col gap-1.5 stagger-children">
                {suggestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="w-full text-left px-3 py-2 text-[11px] rounded-xl glass hover:bg-white/10 text-gray-300 transition"
                  >
                    <MessageSquare className="w-3 h-3 inline mr-1" /> {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeInUp`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800 border border-white/10 shrink-0 mr-2 mt-1">
                {agent.image ? (
                  <img src={agent.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400">
                    {agent.name[0]}
                  </div>
                )}
              </div>
            )}
            <div className="max-w-[80%]">
              <div
                className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-amber-500/20 text-amber-50 rounded-br-md border border-amber-400/10'
                    : 'glass text-gray-200 rounded-bl-md'
                }`}
              >
                {msg.role === 'assistant' ? <RenderMarkdown text={msg.content} /> : msg.content}
              </div>
              {msg.role === 'assistant' && ttsOk && (
                <button
                  onClick={() => {
                    if (speaking) { stop(); }
                    else { speak(msg.content, agent.id); }
                  }}
                  className={`mt-1 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] transition ${
                    speaking 
                      ? 'bg-amber-400/20 text-amber-400' 
                      : 'text-gray-600 hover:text-gray-300 hover:bg-white/5'
                  }`}
                >
                  {speaking ? <Square className="w-3 h-3 inline" /> : <Volume2 className="w-3 h-3 inline" />} {speaking ? (lang === 'ko' ? '중지' : 'Stop') : (lang === 'ko' ? '음성' : 'Voice')}
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800 border border-white/10 shrink-0 mr-2 mt-1">
              {agent.image ? (
                <img src={agent.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400">
                  {agent.name[0]}
                </div>
              )}
            </div>
            <div className="glass px-3 py-2 rounded-2xl rounded-bl-md">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-gray-400">
                  {elapsed > 30 
                    ? (lang === 'ko' ? `깊이 분석 중... ${elapsed}초` : `Deep analysis... ${elapsed}s`)
                    : (lang === 'ko' ? '에이전트가 생각 중...' : 'Agent is thinking...')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-3 glass-strong shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? (lang === 'ko' ? '듣고 있어요...' : 'Listening...') : text.typeMessage}
            className={`flex-1 glass rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-400/30 ${isListening ? 'ring-1 ring-red-400/50' : ''}`}
            disabled={loading}
          />
          <button
            type="button"
            onClick={toggleSTT}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition text-lg ${
              isListening 
                ? 'bg-red-500/30 text-red-300 border border-red-400/40 animate-pulse' 
                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10'
            }`}
          >
<Mic className="w-4 h-4" />
          </button>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-30 text-amber-300 text-sm font-medium transition border border-amber-400/20"
          >
            {text.send}
          </button>
        </form>

        {/* Directive Request Alert */}
        {directiveRequest && (
          <div className="mt-3 p-3 rounded-xl border border-amber-400/30 bg-amber-400/5">
            <div className="flex items-start gap-3">
              <div className="text-amber-400 mt-0.5">
                <Target className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h4 className="text-amber-300 text-sm font-medium mb-1">
                  {lang === 'ko' ? '지시사항 등록 제안' : 'Directive Registration Proposal'}
                </h4>
                <p className="text-gray-300 text-sm mb-1">
                  <strong>{lang === 'ko' ? '제목:' : 'Title:'}</strong> {directiveRequest.title}
                </p>
                <p className="text-gray-400 text-xs mb-3 line-clamp-2">
                  {directiveRequest.description}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={createDirectiveFromRequest}
                    disabled={creatingDirective}
                    className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-50 text-amber-300 border border-amber-400/20 flex items-center gap-1"
                  >
                    {creatingDirective ? (
                      <>
                        <div className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin" />
                        {lang === 'ko' ? '등록 중...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <ClipboardList className="w-3 h-3" />
                        {lang === 'ko' ? '정식 등록' : 'Create Directive'}
                      </>
                    )}
                  </button>
                  <button
                    onClick={dismissDirectiveRequest}
                    className="text-xs px-3 py-1.5 rounded-lg hover:bg-white/5 text-gray-400 border border-gray-600"
                  >
                    {lang === 'ko' ? '무시' : 'Dismiss'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

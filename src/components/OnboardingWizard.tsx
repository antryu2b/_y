'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLang } from '@/context/LangContext';
import { AGENT_ROSTER, AgentConfig } from '@/data/agent-config';
import { floors } from '@/data/floors';
import {
  Sparkles, ChevronRight, Server, Cpu, Copy, Check, Database, HardDrive,
  Building2, Users, ArrowRight, RotateCcw, Rocket,
  CircleCheck, CircleDot, AlertCircle, Zap, Star,
  Cloud, KeyRound, Loader2,
} from 'lucide-react';
import Image from 'next/image';

/* ── Industry types ── */
const INDUSTRIES = [
  { value: 'tech', label: 'Technology', labelKo: '기술' },
  { value: 'ecommerce', label: 'E-Commerce', labelKo: '전자상거래' },
  { value: 'saas', label: 'SaaS', labelKo: 'SaaS' },
  { value: 'finance', label: 'Finance', labelKo: '금융' },
  { value: 'healthcare', label: 'Healthcare', labelKo: '헬스케어' },
  { value: 'education', label: 'Education', labelKo: '교육' },
  { value: 'media', label: 'Media & Entertainment', labelKo: '미디어' },
  { value: 'manufacturing', label: 'Manufacturing', labelKo: '제조업' },
  { value: 'import_export', label: 'Import / Export', labelKo: '수출입' },
  { value: 'retail', label: 'Retail', labelKo: '소매' },
  { value: 'construction', label: 'Construction', labelKo: '건설' },
  { value: 'consulting', label: 'Consulting', labelKo: '컨설팅' },
  { value: 'food_beverage', label: 'Food & Beverage', labelKo: '식음료' },
  { value: 'logistics', label: 'Logistics', labelKo: '물류' },
] as const;

/* ── Recommended agents by industry ── */
const INDUSTRY_AGENTS: Record<string, string[]> = {
  tech: ['buildy', 'testy', 'stacky', 'guardy', 'searchy', 'growthy'],
  ecommerce: ['selly', 'clicky', 'growthy', 'searchy', 'buzzy', 'logoy'],
  saas: ['buildy', 'growthy', 'helpy', 'stacky', 'clicky', 'opsy'],
  finance: ['quanty', 'tradey', 'finy', 'skepty', 'audity', 'hedgy'],
  healthcare: ['legaly', 'guardy', 'hiry', 'evaly', 'searchy', 'wordy'],
  education: ['wordy', 'helpy', 'buzzy', 'pixely', 'searchy', 'edity'],
  media: ['buzzy', 'wordy', 'edity', 'pixely', 'searchy', 'growthy'],
  manufacturing: ['opsy', 'stacky', 'finy', 'legaly', 'hiry', 'evaly'],
  import_export: ['globy', 'legaly', 'finy', 'selly', 'tradey', 'fieldy'],
  retail: ['selly', 'clicky', 'growthy', 'buzzy', 'helpy', 'logoy'],
  construction: ['finy', 'legaly', 'opsy', 'hiry', 'stacky', 'evaly'],
  consulting: ['counsely', 'searchy', 'wordy', 'evaly', 'growthy', 'skepty'],
  food_beverage: ['selly', 'buzzy', 'logoy', 'growthy', 'clicky', 'helpy'],
  logistics: ['opsy', 'stacky', 'globy', 'fieldy', 'finy', 'watchy'],
};

/* ── Profile badge ── */
const PROFILE_BADGES: Record<string, { label: string; color: string; ram: string }> = {
  SMALL:   { label: 'SMALL',   color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',   ram: '8 GB' },
  MEDIUM:  { label: 'MEDIUM',  color: 'bg-green-500/20 text-green-300 border-green-500/30',  ram: '16 GB' },
  LARGE:   { label: 'LARGE',   color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', ram: '32 GB' },
  'X-LARGE': { label: 'X-LARGE', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',  ram: '64 GB+' },
};

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { lang } = useLang();
  const ko = lang === 'ko';

  /* ── State ── */
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [animating, setAnimating] = useState(false);

  // Step 2: LLM
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'found' | 'not-found'>('checking');
  const [profileData, setProfileData] = useState<{ profile: string | null; ram?: number | null }>({ profile: null });
  const [copiedSetup, setCopiedSetup] = useState(false);
  const [llmProvider, setLlmProvider] = useState<'ollama' | 'openai' | 'anthropic' | 'google'>('ollama');
  const [apiKey, setApiKey] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');

  // Counsely assignment animation
  const [counselyPhase, setCounsely] = useState<'idle' | 'analyzing' | 'assigning' | 'done'>('idle');
  const [counselyMessages, setCounselyMessages] = useState<string[]>([]);

  // Step 2: Database
  const [dbProvider, setDbProvider] = useState<'sqlite' | 'postgres' | 'supabase'>('sqlite');
  const [dbUrl, setDbUrl] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');

  // Step 3: Company
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());

  /* ── Step navigation ── */
  const goTo = useCallback((target: number) => {
    if (animating) return;
    setDirection(target > step ? 'forward' : 'back');
    setAnimating(true);
    setTimeout(() => {
      setStep(target);
      setAnimating(false);
    }, 200);
  }, [step, animating]);

  /* ── Step 2: Detect Ollama + profile ── */
  useEffect(() => {
    if (step !== 2) return;
    // Ping Ollama
    fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(3000) })
      .then(r => r.json())
      .then(data => {
        const models = (data.models || []).map((m: { name: string }) => m.name);
        setOllamaModels(models);
        setOllamaStatus('found');
      })
      .catch(() => setOllamaStatus('not-found'));

    // Fetch profile
    fetch('/api/setup-status')
      .then(r => r.json())
      .then(data => {
        setProfileData(data);
        if (data.provider && data.provider !== 'ollama' && data.provider !== 'mixed') {
          setLlmProvider(data.provider);
        }
      })
      .catch(() => {});
  }, [step]);

  /* ── Step 3: Pre-select recommended agents when industry changes ── */
  useEffect(() => {
    if (industry) {
      const recommended = INDUSTRY_AGENTS[industry] || [];
      // Always include core agents
      const core = ['tasky', 'counsely', 'skepty'];
      setSelectedAgents(new Set([...core, ...recommended]));
    }
  }, [industry]);

  /* ── Toggle agent ── */
  const toggleAgent = (id: string) => {
    setSelectedAgents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── Complete onboarding ── */
  const handleComplete = async () => {
    const companyData = {
      company_name: companyName || '_y Demo Company',
      industry: industry || 'tech',
      description: description || 'Demo company',
      agents: Array.from(selectedAgents),
      connected_at: new Date().toISOString(),
    };

    // Save to localStorage
    const existing = JSON.parse(localStorage.getItem('y-company-connections') || '[]');
    existing.push(companyData);
    localStorage.setItem('y-company-connections', JSON.stringify(existing));
    localStorage.setItem('y-company-connection', JSON.stringify(companyData));
    localStorage.setItem('y-setup-complete', 'true');
    sessionStorage.setItem('y-tower-entered', '1');

    // Save to DB
    try {
      await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyData),
      });
    } catch (e) {
      console.error('Failed to save company to DB:', e);
    }

    onComplete();
  };

  /* ── Validate cloud API key ── */
  const validateApiKey = async () => {
    if (!apiKey.trim()) return;
    setApiKeyStatus('validating');
    try {
      let testUrl = '';
      let testOpts: RequestInit = {};
      if (llmProvider === 'openai') {
        testUrl = 'https://api.openai.com/v1/models';
        testOpts = { headers: { 'Authorization': `Bearer ${apiKey}` } };
      } else if (llmProvider === 'anthropic') {
        testUrl = 'https://api.anthropic.com/v1/messages';
        testOpts = {
          method: 'POST',
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] }),
        };
      } else if (llmProvider === 'google') {
        testUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      }
      const resp = await fetch(testUrl, testOpts);
      setApiKeyStatus(resp.ok || resp.status === 201 ? 'valid' : 'invalid');
    } catch {
      setApiKeyStatus('invalid');
    }
  };

  /* ── Copy helper ── */
  const copySetupCmd = () => {
    navigator.clipboard.writeText('npm run setup');
    setCopiedSetup(true);
    setTimeout(() => setCopiedSetup(false), 2000);
  };

  /* ── Profile badge ── */
  const profileKey = (profileData.profile || '').toUpperCase();
  const badge = PROFILE_BADGES[profileKey];

  /* ── Active floors count ── */
  const activeFloors = new Set(AGENT_ROSTER.filter(a => selectedAgents.has(a.id)).map(a => a.floor)).size;

  /* ── Step indicator ── */
  const stepLabels = ko
    ? ['시작', 'LLM', '회사', '완료']
    : ['Welcome', 'LLM', 'Company', 'Ready'];

  return (
    <div className="fixed inset-0 z-50 bg-[#060a14] overflow-y-auto">
      {/* Background grid animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          animation: 'gridMove 20s linear infinite',
        }} />
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-emerald-500/10"
            style={{
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${8 + Math.random() * 12}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Step indicator */}
      {step > 1 && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
                i + 1 === step
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : i + 1 < step
                  ? 'bg-white/5 text-white/50 border border-white/10'
                  : 'bg-white/5 text-white/20 border border-white/5'
              }`}>
                {i + 1 < step ? <CircleCheck className="w-3 h-3" /> : <CircleDot className="w-3 h-3" />}
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < 3 && <div className={`w-6 h-px ${i + 1 < step ? 'bg-emerald-500/30' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>
      )}

      {/* Main content area */}
      <div className={`relative z-10 w-full max-w-2xl mx-auto px-4 py-16 sm:py-8 min-h-full transition-all duration-200 ${
        animating ? (direction === 'forward' ? 'opacity-0 translate-x-8' : 'opacity-0 -translate-x-8') : 'opacity-100 translate-x-0'
      }`}>

        {/* ═══ STEP 1: Welcome ═══ */}
        {step === 1 && (
          <div className="text-center">
            <div className="mb-8">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-2">
                <span className="text-amber-400" style={{ textShadow: '0 0 40px rgba(245,158,11,0.3)' }}>_y</span>
                {' '}Holdings
              </h1>
              <div className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-amber-500/50 to-transparent my-6" />
              <p className="text-lg sm:text-xl text-gray-300 leading-relaxed">
                {ko
                  ? '30명의 AI 에이전트. 10개 층. 당신의 회사를 분석합니다.'
                  : '30 AI agents. 10 floors. Your company, analyzed.'}
              </p>
            </div>

            {/* Agent preview row */}
            <div className="flex flex-wrap justify-center gap-1 mb-10 max-w-sm mx-auto">
              {AGENT_ROSTER.slice(0, 12).map((agent) => (
                <div key={agent.id} className="w-7 h-7 rounded-full overflow-hidden border border-white/10 opacity-60 hover:opacity-100 transition-opacity">
                  <Image
                    src={`/agents/${agent.number}-${agent.id}.png`}
                    alt={agent.name}
                    width={28}
                    height={28}
                    className="object-cover"
                  />
                </div>
              ))}
              <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 text-[10px]">+18</div>
            </div>

            <button
              onClick={() => goTo(2)}
              className="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-xl text-lg transition-all duration-200 hover:scale-105 inline-flex items-center gap-3 shadow-lg shadow-amber-900/20"
            >
              {ko ? '시작하기' : 'Get Started'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ═══ STEP 2: LLM Configuration ═══ */}
        {step === 2 && (
          <div>
            <div className="text-center mb-8">
              <div className="relative w-16 h-16 mx-auto mb-3">
                <img src="/agents/30-counsely.png" alt="Counsely" className="w-16 h-16 rounded-full border-2 border-emerald-500/40 shadow-lg shadow-emerald-900/20" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                  <Cpu className="w-3 h-3 text-white" />
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                Counsely
              </h2>
              <p className="text-sm text-emerald-400 font-medium mb-1">
                {ko ? '참모실장 · Chief of Staff' : 'Chief of Staff · 10F Chairman Office'}
              </p>
              <p className="text-gray-400 text-sm">
                {ko ? '"제가 환경을 분석하고 최적의 LLM을 배정하겠습니다."' : '"I will analyze your environment and assign optimal LLMs."'}
              </p>
            </div>

            {/* Provider selector cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {([
                { key: 'ollama' as const, label: 'Ollama', icon: Server, desc: ko ? '로컬 무료' : 'Local, free' },
                { key: 'openai' as const, label: 'OpenAI', icon: Zap, desc: 'GPT-4o' },
                { key: 'anthropic' as const, label: 'Anthropic', icon: Sparkles, desc: 'Claude' },
                { key: 'google' as const, label: 'Google', icon: Cloud, desc: 'Gemini' },
              ]).map(({ key, label, icon: Icon, desc }) => (
                <button
                  key={key}
                  onClick={() => { setLlmProvider(key); setApiKey(''); setApiKeyStatus('idle'); }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 ${
                    llmProvider === key
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-white shadow-lg shadow-emerald-900/10'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${llmProvider === key ? 'text-emerald-400' : ''}`} />
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-[10px] text-gray-500">{desc}</span>
                </button>
              ))}
            </div>

            {/* Provider-specific content */}
            {llmProvider === 'ollama' ? (
              <>
                {/* Ollama status */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Server className="w-5 h-5 text-gray-400" />
                    <span className="text-white font-medium">Ollama</span>
                    {ollamaStatus === 'checking' && (
                      <span className="text-xs text-gray-500 animate-pulse">{ko ? '확인 중...' : 'Checking...'}</span>
                    )}
                    {ollamaStatus === 'found' && (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <CircleCheck className="w-3.5 h-3.5" />
                        {ko ? '연결됨' : 'Connected'}
                      </span>
                    )}
                    {ollamaStatus === 'not-found' && (
                      <span className="flex items-center gap-1 text-xs text-yellow-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {ko ? '감지되지 않음' : 'Not detected'}
                      </span>
                    )}
                  </div>

                  {ollamaStatus === 'found' && ollamaModels.length > 0 && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {ollamaModels.map(model => (
                        <div key={model} className="flex items-center gap-2 text-sm text-gray-300 py-1 px-2 rounded bg-white/5">
                          <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span className="font-mono text-xs">{model}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {ollamaStatus === 'not-found' && (
                    <p className="text-sm text-gray-500">
                      {ko
                        ? 'Ollama가 실행 중이지 않습니다. 데모 모드로 계속할 수 있습니다.'
                        : 'Ollama is not running. You can continue in demo mode.'}
                    </p>
                  )}
                </div>

                {/* Profile status */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-medium flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      {ko ? 'LLM 프로필' : 'LLM Profile'}
                    </span>
                    {badge && (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badge.color}`}>
                        {badge.label} ({badge.ram})
                      </span>
                    )}
                  </div>

                  {profileData.profile ? (
                    <p className="text-sm text-gray-400">
                      {ko
                        ? `프로필 "${profileData.profile}" 감지됨. 에이전트 모델이 자동 할당됩니다.`
                        : `Profile "${profileData.profile}" detected. Agent models will be auto-assigned.`}
                    </p>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-500 mb-3">
                        {ko
                          ? '프로필이 없습니다. 터미널에서 설정하세요:'
                          : 'No profile found. Run setup in your terminal:'}
                      </p>
                      <button
                        onClick={copySetupCmd}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-mono text-gray-300 transition-colors"
                      >
                        <span>npm run setup</span>
                        {copiedSetup ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Cloud provider: API key input */
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <KeyRound className="w-5 h-5 text-gray-400" />
                  <span className="text-white font-medium">
                    {llmProvider === 'openai' ? 'OpenAI' : llmProvider === 'anthropic' ? 'Anthropic' : 'Google'} API Key
                  </span>
                  {apiKeyStatus === 'valid' && (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <CircleCheck className="w-3.5 h-3.5" />
                      {ko ? '연결됨!' : 'Connected!'}
                    </span>
                  )}
                  {apiKeyStatus === 'invalid' && (
                    <span className="flex items-center gap-1 text-xs text-red-400">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {ko ? '유효하지 않음' : 'Invalid key'}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => { setApiKey(e.target.value); setApiKeyStatus('idle'); }}
                    placeholder={ko ? 'API 키를 입력하세요...' : 'Enter your API key...'}
                    className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors font-mono text-sm"
                  />
                  <button
                    onClick={validateApiKey}
                    disabled={!apiKey.trim() || apiKeyStatus === 'validating'}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                  >
                    {apiKeyStatus === 'validating' ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />{ko ? '확인 중' : 'Checking'}</>
                    ) : (
                      ko ? '확인' : 'Validate'
                    )}
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-3">
                  {ko
                    ? 'API 키는 로컬 .env 파일에만 저장됩니다. 서버로 전송되지 않습니다.'
                    : 'Your API key is stored locally in .env only. Never sent to our servers.'}
                </p>
              </div>
            )}

            {/* Counsely Agent Assignment Preview */}
            {(llmProvider === 'ollama' ? ollamaStatus === 'found' : apiKeyStatus === 'valid') && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 mb-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500/0 via-emerald-500/50 to-emerald-500/0" />
                <div className="flex items-center gap-3 mb-3">
                  <img src="/agents/30-counsely.png" alt="" className="w-8 h-8 rounded-full border border-emerald-500/30" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div>
                    <span className="text-emerald-400 font-medium text-sm">
                      {ko ? 'Counsely 배정 완료' : 'Counsely Assignment Complete'}
                    </span>
                    <p className="text-gray-500 text-[11px]">
                      {ko ? '30명 에이전트에 최적 LLM을 배정했습니다' : 'Optimal LLMs assigned to all 30 agents'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-white/5 rounded-lg p-2">
                    <span className="text-gray-500">{ko ? '분석팀 (10명)' : 'Analysis Team (10)'}</span>
                    <p className="text-white font-mono mt-0.5">
                      {llmProvider === 'ollama'
                        ? (profileData.profile === 'LARGE' ? 'qwen2.5:32b' : profileData.profile === 'MEDIUM' ? 'qwen2.5:14b' : 'qwen2.5:7b')
                        : llmProvider === 'openai' ? 'gpt-4o'
                        : llmProvider === 'anthropic' ? 'claude-sonnet'
                        : 'gemini-flash'}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <span className="text-gray-500">{ko ? '유틸리티팀 (20명)' : 'Utility Team (20)'}</span>
                    <p className="text-white font-mono mt-0.5">
                      {llmProvider === 'ollama'
                        ? (profileData.profile === 'LARGE' ? 'qwen2.5:14b' : 'qwen2.5:7b')
                        : llmProvider === 'openai' ? 'gpt-4o-mini'
                        : llmProvider === 'anthropic' ? 'claude-sonnet'
                        : 'gemini-flash'}
                    </p>
                  </div>
                </div>
                <p className="text-gray-600 text-[10px] mt-2 italic">
                  {ko ? '* 배정은 llm-profile.json에서 수정 가능합니다' : '* Assignments can be customized in llm-profile.json'}
                </p>
              </div>
            )}

            {/* Database provider selection */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Database className="w-5 h-5 text-emerald-400" />
                <span className="text-white font-medium">{ko ? '데이터베이스' : 'Database'}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {([
                  { key: 'sqlite' as const, label: 'SQLite', icon: HardDrive, desc: ko ? '로컬 파일, 설정 불필요' : 'Local file, zero setup', badge: ko ? '추천' : 'Recommended' },
                  { key: 'postgres' as const, label: 'PostgreSQL', icon: Database, desc: ko ? '프로덕션 준비' : 'Production-ready', badge: null },
                  { key: 'supabase' as const, label: 'Supabase', icon: Cloud, desc: ko ? '클라우드 PostgreSQL' : 'Cloud PostgreSQL', badge: null },
                ]).map(({ key, label, icon: Icon, desc, badge: badgeText }) => (
                  <button
                    key={key}
                    onClick={() => setDbProvider(key)}
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 ${
                      dbProvider === key
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-white shadow-lg shadow-emerald-900/10'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300'
                    }`}
                  >
                    {badgeText && (
                      <span className="absolute -top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/20 text-green-300 border border-green-500/30">
                        {badgeText}
                      </span>
                    )}
                    <Icon className={`w-6 h-6 ${dbProvider === key ? 'text-emerald-400' : ''}`} />
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-[10px] text-gray-500">{desc}</span>
                  </button>
                ))}
              </div>

              {/* SQLite info */}
              {dbProvider === 'sqlite' && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-medium text-sm">SQLite</span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold border bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                      {ko ? '자동 설정' : 'Auto-configured'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mb-2">
                    {ko ? '모든 데이터가 로컬에 저장됩니다' : 'All data stays local on your machine'}
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-mono text-gray-500 bg-white/5 px-2 py-1 rounded">data/y-company.db</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {['conversations', 'reports', 'decisions', 'agent_memory', 'chat_queue', 'meetings', 'schedules', 'directives', 'connected_companies'].map(table => (
                      <span key={table} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-gray-500 border border-white/5">
                        {table}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-green-400">
                    <CircleCheck className="w-3.5 h-3.5" />
                    {ko ? '준비 완료 — 첫 실행 시 테이블 자동 생성' : 'Ready — tables auto-created on first run'}
                  </div>
                </div>
              )}

              {/* PostgreSQL config */}
              {dbProvider === 'postgres' && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <Database className="w-5 h-5 text-gray-400" />
                    <span className="text-white font-medium text-sm">PostgreSQL</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">DATABASE_URL</label>
                      <input
                        type="text"
                        value={dbUrl}
                        onChange={(e) => setDbUrl(e.target.value)}
                        placeholder="postgresql://user:password@localhost:5432/y_company"
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors font-mono text-xs"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (dbUrl && dbUrl.startsWith('postgresql://')) {
                          alert(ko ? '연결 형식이 유효합니다. .env에 저장하세요.' : 'URL format is valid. Save it to your .env file.');
                        } else {
                          alert(ko ? 'postgresql://로 시작하는 URL을 입력하세요' : 'Enter a valid postgresql:// URL');
                        }
                      }}
                      className="px-4 py-2 bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      {ko ? '연결 테스트' : 'Test Connection'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    {ko ? 'sql/postgres-schema.sql로 테이블을 생성하세요' : 'Create tables with: psql $DATABASE_URL < sql/postgres-schema.sql'}
                  </p>
                </div>
              )}

              {/* Supabase config */}
              {dbProvider === 'supabase' && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <Cloud className="w-5 h-5 text-gray-400" />
                    <span className="text-white font-medium text-sm">Supabase</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">SUPABASE_URL</label>
                      <input
                        type="text"
                        value={supabaseUrl}
                        onChange={(e) => setSupabaseUrl(e.target.value)}
                        placeholder="https://your-project.supabase.co"
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">SUPABASE_SERVICE_KEY</label>
                      <input
                        type="password"
                        value={supabaseKey}
                        onChange={(e) => setSupabaseKey(e.target.value)}
                        placeholder="your-service-role-key"
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors font-mono text-xs"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (supabaseUrl && supabaseUrl.includes('.supabase.co') && supabaseKey) {
                          alert(ko ? '연결 형식이 유효합니다. .env에 저장하세요.' : 'Credentials format looks valid. Save them to your .env file.');
                        } else {
                          alert(ko ? 'Supabase URL과 Service Key를 모두 입력하세요' : 'Enter both Supabase URL and Service Key');
                        }
                      }}
                      className="px-4 py-2 bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      {ko ? '연결 테스트' : 'Test Connection'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    {ko ? 'Supabase SQL Editor에서 sql/postgres-schema.sql을 실행하세요' : 'Run sql/postgres-schema.sql in Supabase SQL Editor'}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => goTo(3)}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                {ko ? '데모로 건너뛰기' : 'Skip for demo'}
              </button>
              <button
                onClick={() => goTo(3)}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl inline-flex items-center gap-2 transition-all duration-200 hover:scale-105"
              >
                {ko ? '계속' : 'Continue'}
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: Your Company ═══ */}
        {step === 3 && (
          <div>
            <div className="text-center mb-6">
              <Building2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                {ko ? '회사 정보' : 'Your Company'}
              </h2>
              <p className="text-gray-400 text-sm">
                {ko ? '분석할 회사를 설정하세요' : 'Set up the company to analyze'}
              </p>
            </div>

            <div className="space-y-4 mb-6">
              {/* Company name */}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">{ko ? '회사명' : 'Company Name'}</label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={ko ? '예: Acme Corp' : 'e.g. Acme Corp'}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
                />
              </div>

              {/* Industry */}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">{ko ? '업종' : 'Industry'}</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors appearance-none"
                  style={{ backgroundImage: 'none' }}
                >
                  <option value="" className="bg-[#0a0f1a]">{ko ? '-- 선택 --' : '-- Select --'}</option>
                  {INDUSTRIES.map(ind => (
                    <option key={ind.value} value={ind.value} className="bg-[#0a0f1a]">
                      {ko ? ind.labelKo : ind.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">{ko ? '설명' : 'Description'}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={ko ? '회사에 대해 간단히 설명해주세요...' : 'Brief description of your company...'}
                  rows={2}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors resize-none"
                />
              </div>
            </div>

            {/* Agent selection grid */}
            {industry && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    {ko ? '에이전트 선택' : 'Select Agents'}
                    <span className="text-xs text-gray-500">({selectedAgents.size}/{AGENT_ROSTER.length})</span>
                  </h3>
                  {INDUSTRY_AGENTS[industry] && (
                    <span className="text-xs text-emerald-400/70 flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {ko ? 'AI 추천' : 'AI recommended'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-52 overflow-y-auto pr-1">
                  {AGENT_ROSTER.map(agent => {
                    const isSelected = selectedAgents.has(agent.id);
                    const isRecommended = (INDUSTRY_AGENTS[industry] || []).includes(agent.id);
                    return (
                      <button
                        key={agent.id}
                        onClick={() => toggleAgent(agent.id)}
                        className={`relative flex flex-col items-center gap-1 p-2 rounded-lg border transition-all duration-150 ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                            : 'bg-white/5 border-white/5 text-gray-500 hover:border-white/20 hover:text-gray-300'
                        }`}
                      >
                        {isRecommended && (
                          <Star className="absolute top-1 right-1 w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                        )}
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 border border-white/10">
                          <Image
                            src={`/agents/${agent.number}-${agent.id}.png`}
                            alt={agent.name}
                            width={32}
                            height={32}
                            className="object-cover"
                          />
                        </div>
                        <span className="text-[10px] font-medium truncate w-full text-center">{agent.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  // Skip — set defaults and go to step 4
                  if (!companyName) setCompanyName('Demo Company');
                  if (!industry) setIndustry('tech');
                  if (selectedAgents.size === 0) {
                    setSelectedAgents(new Set(AGENT_ROSTER.map(a => a.id)));
                  }
                  goTo(4);
                }}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                {ko ? '건너뛰기 — 나중에 연결할게요' : "Skip — I'll connect later"}
              </button>
              <button
                onClick={() => goTo(4)}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl inline-flex items-center gap-2 transition-all duration-200 hover:scale-105"
              >
                {ko ? '계속' : 'Continue'}
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 4: Ready! ═══ */}
        {step === 4 && (
          <div className="text-center">
            {/* Confetti CSS animation */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(40)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-sm"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: '-10px',
                    backgroundColor: [
                      '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
                      '#ef4444', '#ec4899', '#14b8a6', '#f97316',
                    ][i % 8],
                    animation: `confettiFall ${2 + Math.random() * 3}s ease-in forwards`,
                    animationDelay: `${Math.random() * 2}s`,
                    transform: `rotate(${Math.random() * 360}deg)`,
                  }}
                />
              ))}
            </div>

            <div className="mb-8">
              <Rocket className="w-14 h-14 text-amber-400 mx-auto mb-4" style={{ animation: 'rocketBounce 2s ease-in-out infinite' }} />
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
                {ko ? '_y 타워가 준비되었습니다!' : 'Your _y Tower is Ready!'}
              </h2>
              <div className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent my-6" />
            </div>

            {/* Summary */}
            <div className="inline-flex flex-col sm:flex-row gap-4 sm:gap-8 mb-10">
              <div className="flex items-center gap-2 text-gray-300">
                <Users className="w-5 h-5 text-emerald-400" />
                <span className="text-lg font-medium">{selectedAgents.size}</span>
                <span className="text-gray-500">{ko ? '에이전트 선택됨' : 'agents selected'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Building2 className="w-5 h-5 text-amber-400" />
                <span className="text-lg font-medium">{activeFloors}</span>
                <span className="text-gray-500">{ko ? '개 층 활성' : 'floors active'}</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <button
                onClick={handleComplete}
                className="px-10 py-4 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-xl text-lg transition-all duration-200 hover:scale-105 inline-flex items-center gap-3 shadow-lg shadow-amber-900/20"
              >
                {ko ? '타워 입장' : 'Enter Tower'}
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => {
                  localStorage.removeItem('y-setup-complete');
                  localStorage.removeItem('y-company-connection');
                  localStorage.removeItem('y-company-connections');
                  setStep(1);
                  setCompanyName('');
                  setIndustry('');
                  setDescription('');
                  setSelectedAgents(new Set());
                }}
                className="text-xs text-gray-600 hover:text-gray-400 transition-colors inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                {ko ? '설정 초기화' : 'Reset setup'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CSS animations */}
      <style jsx global>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(60px, 60px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.3; }
          50% { transform: translateY(-30px) scale(1.5); opacity: 0.6; }
        }
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes rocketBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}

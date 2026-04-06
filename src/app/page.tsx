'use client';

import { Component, ReactNode, useState, useEffect } from 'react';
import { LangProvider } from '@/context/LangContext';
import { ReportProvider } from '@/context/ReportContext';
import { TowerView } from '@/components/TowerView';
import { useLang } from '@/context/LangContext';
import { Zap, ArrowDown, Building2, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#060b14] flex items-center justify-center">
          <div className="text-center">
            <p className="text-white text-lg mb-4">Something went wrong</p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
              className="px-4 py-2 bg-amber-500 text-black rounded-lg font-bold"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function HomeContent() {
  const { lang, setLang } = useLang();
  const [showTower, setShowTower] = useState(false);
  const [connectedCompany, setConnectedCompany] = useState<any>(null);

  // Check for existing connection on mount
  useEffect(() => {
    try {
      // Check new format first
      const connectionsData = localStorage.getItem('y-company-connections');
      if (connectionsData) {
        const parsed = JSON.parse(connectionsData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setConnectedCompany(parsed[0]); // Show first company for hero state
          // Auto-open tower only within same browser session
          if (sessionStorage.getItem('y-tower-entered')) {
            setShowTower(true);
          }
          return;
        }
      }

      // Fallback to old format for migration
      const connectionData = localStorage.getItem('y-company-connection');
      if (connectionData) {
        const parsed = JSON.parse(connectionData);
        setConnectedCompany(parsed);
        // Auto-open tower only within same browser session
        if (sessionStorage.getItem('y-tower-entered')) {
          setShowTower(true);
        }
      }
    } catch (error) {
      console.error('Error loading connection data:', error);
    }
  }, []);

  if (showTower) {
    return <TowerView />;
  }

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col overflow-hidden relative">
      {/* Background Tower Image */}
      <div className="absolute inset-0 opacity-20">
        <img
          src="/tiles/y-tower-wide.png"
          alt="_y Tower Background"
          className="w-full h-full object-cover"
          style={{ objectPosition: 'center 12%' }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { sessionStorage.setItem('y-tower-entered', '1'); setShowTower(true); }}
            className="text-xl font-light text-white/90 tracking-widest hover:text-white transition cursor-pointer"
          >
            <span className="font-bold text-amber-400">_y</span>
            <span className="text-white/50 ml-1 text-sm">TOWER</span>
          </button>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-green-500/20 bg-green-500/5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400/80 text-xs font-medium tracking-wider uppercase">LIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-black/70 backdrop-blur-lg border border-white/10 hover:border-white/20 hover:bg-white/5 text-gray-200 hover:text-white text-xs transition-all duration-200"
          >
            {lang === 'ko' ? 'EN' : 'KR'}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 sm:px-8">
        {/* Hero Content */}
        <div className="text-center mb-10 sm:mb-16">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-4 sm:mb-6 tracking-tight leading-tight">
            {lang === 'ko' ? (
              <>자는 동안에도 돌아가는<br />당신의 AI 회사</>
            ) : (
              <>Your AI Company<br />That Never Sleeps</>
            )}
          </h1>
          <p className="text-sm sm:text-lg text-gray-400/80 mb-6 sm:mb-8 font-light max-w-2xl mx-auto">
            {lang === 'ko'
              ? '30명의 AI 에이전트가 24시간 회사를 운영합니다. 설정은 5분, 실행은 영원히.'
              : '30 AI agents running your company 24/7. Setup in 5 minutes. Runs forever.'}
          </p>
          
          {/* Live Counter */}
          <div className="flex items-center justify-center gap-2 mb-10 sm:mb-14">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 text-xs sm:text-sm font-medium">
                {lang === 'ko' ? '현재 운영 중' : 'Live now'}
              </span>
            </div>
            <span className="text-white/60 text-xs sm:text-sm">
              {lang === 'ko' ? '지금 바로 시작하세요' : 'Join them'}
            </span>
          </div>

          {/* Agent Avatars Grid */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10 sm:mb-16 max-w-lg mx-auto">
            {[
              'searchy', 'skepty', 'buzzy', 'stacky', 'guardy', 'counsely',
              'selly', 'quanty', 'pixely', 'wordy', 'buildy', 'testy',
              'opsy', 'growthy', 'hiry', 'tradey', 'logoy', 'globy'
            ].map((agent, i) => (
              <div 
                key={agent} 
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-white/10 border border-white/20 opacity-60 hover:opacity-100 hover:scale-110 hover:border-amber-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-amber-400/10"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <Image 
                  src={`/agents/${agent}.png`} 
                  alt={agent} 
                  width={40}
                  height={40}
                  className="object-cover" 
                />
              </div>
            ))}
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 text-xs font-medium">
              +12
            </div>
          </div>

          {/* CTA Button */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => { sessionStorage.setItem('y-tower-entered', '1'); setShowTower(true); }}
              className="group px-8 py-4 sm:px-10 sm:py-5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-2xl text-base sm:text-lg transition-all duration-300 hover:scale-105 flex items-center gap-3 shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-400/30"
            >
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:rotate-12" />
              {lang === 'ko' ? '지금 시작하기' : 'Start Now'}
            </button>
            <p className="text-xs sm:text-sm text-gray-500">
              {lang === 'ko' ? '카드 등록 불필요. 바로 시작.' : 'No credit card. Just start.'}
            </p>
          </div>
        </div>


      </div>
    </div>
  );
}

export default function Home() {
  return (
    <ErrorBoundary>
      <LangProvider>
        <ReportProvider>
          <HomeContent />
        </ReportProvider>
      </LangProvider>
    </ErrorBoundary>
  );
}

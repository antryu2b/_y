'use client';

import { useState, useEffect } from 'react';
import { Building2, Users, Activity, FileText, MessageSquare, TrendingUp, Clock, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Company } from '@/lib/company-registry';
import Image from 'next/image';

interface Report {
  id: string;
  title: string;
  content: string;
  agent_id: string;
  report_type: string;
  status: string;
  created_at: string;
}

interface Props {
  company: Company;
  lang: 'ko' | 'en';
  onClose?: () => void;
}

const AGENT_META: Record<string, { label: string; labelKo: string }> = {
  counsely: { label: 'Strategic Advisory', labelKo: '전략 자문' },
  skepty: { label: 'Risk Assessment', labelKo: '리스크 평가' },
  opsy: { label: 'Operations', labelKo: '운영 관리' },
  quanty: { label: 'Data Analytics', labelKo: '데이터 분석' },
  selly: { label: 'Sales', labelKo: '영업 관리' },
  buzzy: { label: 'Marketing', labelKo: '마케팅' },
  searchy: { label: 'SEO & Research', labelKo: 'SEO/리서치' },
  stacky: { label: 'Tech Stack', labelKo: '기술 스택' },
  guardy: { label: 'Security', labelKo: '보안' },
  buildy: { label: 'Development', labelKo: '개발' },
  testy: { label: 'QA Testing', labelKo: 'QA 테스트' },
  pixely: { label: 'Design', labelKo: '디자인' },
  wordy: { label: 'Content', labelKo: '콘텐츠' },
  growthy: { label: 'Growth', labelKo: '그로스' },
  logoy: { label: 'Branding', labelKo: '브랜딩' },
  globy: { label: 'Global', labelKo: '글로벌' },
  hiry: { label: 'HR', labelKo: '인사' },
  watchy: { label: 'Monitoring', labelKo: '모니터링' },
  tradey: { label: 'Trading', labelKo: '트레이딩' },
  hedgy: { label: 'Risk Mgmt', labelKo: '리스크 관리' },
  valuey: { label: 'Valuation', labelKo: '기업가치' },
  finy: { label: 'Finance', labelKo: '재무' },
  evaly: { label: 'Evaluation', labelKo: '평가' },
};

const AGENT_FLOOR: Record<string, number> = {
  counsely: 10, tasky: 9, finy: 9, legaly: 9, skepty: 8, audity: 8,
  pixely: 7, buildy: 7, testy: 7, buzzy: 6, wordy: 6, edity: 6, searchy: 6,
  growthy: 5, logoy: 5, helpy: 5, clicky: 5, selly: 5,
  stacky: 4, watchy: 4, guardy: 4, hiry: 3, evaly: 3,
  quanty: 2, tradey: 2, globy: 2, fieldy: 2, hedgy: 2, valuey: 2, opsy: 1,
};

export default function UserCompanyDashboard({ company, lang, onClose }: Props) {
  const ko = lang === 'ko';
  const [reports, setReports] = useState<Report[]>([]);
  const [chatAgent, setChatAgent] = useState<string | null>(null);

  // Load reports for this company's agents
  useEffect(() => {
    const loadReports = async () => {
                  
      try {
        // Get reports from company's agents, only after connection date
        const agentFilter = company.agents.map(a => `agent_id.eq.${a}`).join(',');
        const dateFilter = company.connectedAt ? `&created_at=gte.${company.connectedAt}` : '';
        const res = await fetch(
          '/api/reports?or=(${agentFilter})${dateFilter}&order=created_at.desc&limit=10'
        );
        if (res.ok) setReports(await res.json());
      } catch { /* */ }
    };
    loadReports();
  }, [company.agents]);

  const connectedDays = company.connectedAt
    ? Math.floor((Date.now() - new Date(company.connectedAt).getTime()) / 86400000)
    : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Company Header */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{company.icon}</span>
              <h2 className="text-xl font-bold text-white">{company.name}</h2>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                {ko ? '포트폴리오 회사' : 'Portfolio Company'}
              </Badge>
            </div>
            <p className="text-gray-400 text-sm">{ko ? company.descriptionKo : company.description}</p>
            {company.industry && (
              <div className="flex gap-2 mt-2">
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                  {company.industry}
                </Badge>
                {company.mode === 'manual' && (
                  <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">
                    Manual Setup
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-amber-400">{company.agents.length}</div>
            <div className="text-xs text-gray-500">{ko ? '배치 에이전트' : 'Agents'}</div>
            <div className="text-xs text-gray-600 mt-1">
              <Clock className="w-3 h-3 inline mr-1" />
              {connectedDays === 0 ? (ko ? '오늘 연결' : 'Connected today') : `D+${connectedDays}`}
            </div>
          </div>
        </div>
      </div>

      {/* Agent Grid */}
      <div>
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-400" />
          {ko ? '배치된 에이전트' : 'Deployed Agents'}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {company.agents.map(agentId => {
            const meta = AGENT_META[agentId];
            const isActive = chatAgent === agentId;
            return (
              <button
                key={agentId}
                onClick={() => setChatAgent(isActive ? null : agentId)}
                className={`bg-white/5 border rounded-xl p-3 flex items-center gap-3 transition hover:bg-white/10 ${
                  isActive ? 'border-amber-400/50 bg-amber-400/5' : 'border-white/10'
                }`}
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 shrink-0">
                  <Image src={`/agents/${agentId}.png`} alt={agentId} width={40} height={40} className="object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
                <div className="text-left min-w-0">
                  <div className="text-white text-sm font-medium capitalize">{agentId}</div>
                  <div className="text-gray-500 text-xs truncate">
                    {meta ? (ko ? meta.labelKo : meta.label) : 'Agent'}
                  </div>
                </div>
                <Activity className="w-3 h-3 text-emerald-400 ml-auto shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigate to Tower for Agent Chat */}
      {chatAgent && (
        <div className="bg-white/5 border border-amber-400/20 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-amber-400" />
            <span className="text-white font-medium capitalize">{chatAgent}</span>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            {ko 
              ? `${chatAgent}와 대화하려면 타워에서 직접 만나세요!`
              : `Visit ${chatAgent} in the Tower for a full conversation!`}
          </p>
          <button
            onClick={() => {
              const agentFloor = AGENT_FLOOR[chatAgent] || 1;
              onClose?.();
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('y-navigate', { 
                  detail: { view: 'floor', floor: agentFloor, agent: chatAgent } 
                }));
              }, 200);
            }}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm rounded-xl transition-all duration-200 inline-flex items-center gap-2"
          >
            <Building2 className="w-4 h-4" />
            {ko ? '타워에서 대화하기' : 'Chat in Tower'}
          </button>
        </div>
      )}

      {/* Reports from Company Agents */}
      <div>
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          {ko ? '에이전트 리포트' : 'Agent Reports'}
          {reports.length > 0 && (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
              {reports.length}
            </Badge>
          )}
        </h3>
        {reports.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
            <Zap className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {ko ? '에이전트가 분석 중입니다. 첫 리포트가 곧 도착합니다.' : 'Agents are analyzing. First reports arriving soon.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(r => (
              <div key={r.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-white/10">
                      <Image src={`/agents/${r.agent_id}.png`} alt={r.agent_id} width={24} height={24} className="object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                    <span className="text-white font-medium text-sm capitalize">{r.agent_id}</span>
                    <Badge className={`text-xs ${
                      r.report_type === 'onboarding' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                      r.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                      'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}>
                      {r.report_type === 'onboarding' ? 'Onboarding' : r.status}
                    </Badge>
                  </div>
                  <span className="text-gray-600 text-xs">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h4 className="text-white text-sm font-medium mb-1">{r.title}</h4>
                <p className="text-gray-400 text-xs whitespace-pre-wrap line-clamp-4">{r.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

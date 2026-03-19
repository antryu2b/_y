'use client';

import React from 'react';
import { AGENT_ROSTER, AgentConfig } from '@/data/agent-config';
import { AgentAvatar } from './AgentAvatar';
import { CheckCircle, Rocket } from 'lucide-react';

interface AgentSelectionGridProps {
  recommendedAgentIds: string[];
  selectedAgentIds: string[];
  onToggle: (agentId: string) => void;
  onConfirm: () => void;
  lang: 'ko' | 'en';
  loading?: boolean;
}

export function AgentSelectionGrid({
  recommendedAgentIds,
  selectedAgentIds,
  onToggle,
  onConfirm,
  lang,
  loading = false,
}: AgentSelectionGridProps) {
  const ko = lang === 'ko';
  const selectedCount = selectedAgentIds.length;
  const totalCount = AGENT_ROSTER.length;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-white font-semibold text-base">
            {ko ? '에이전트 선택' : 'Select Agents'}
          </h4>
          <p className="text-gray-400 text-xs mt-0.5">
            {ko
              ? 'AI가 추천한 에이전트가 기본 선택되어 있습니다. 자유롭게 변경하세요.'
              : 'AI-recommended agents are pre-selected. Feel free to adjust.'}
          </p>
        </div>
        <div className="text-sm font-medium px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
          <span className="text-emerald-400">{selectedCount}</span>
          <span className="text-gray-500">/{totalCount}</span>
          <span className="text-gray-500 ml-1 text-xs">
            {ko ? '선택됨' : 'selected'}
          </span>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {AGENT_ROSTER.map((agent: AgentConfig) => {
          const isSelected = selectedAgentIds.includes(agent.id);
          const isRecommended = recommendedAgentIds.includes(agent.id);

          return (
            <button
              key={agent.id}
              onClick={() => onToggle(agent.id)}
              className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all duration-200 cursor-pointer group ${
                isSelected
                  ? 'border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/15'
                  : 'opacity-40 border-white/5 bg-white/[0.02] hover:opacity-60 hover:border-white/10'
              }`}
            >
              {/* Recommended badge */}
              {isRecommended && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center z-10">
                  <span className="text-[8px] text-black font-bold">AI</span>
                </div>
              )}

              {/* Check overlay */}
              {isSelected && (
                <div className="absolute top-1 left-1 z-10">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              )}

              <AgentAvatar agentId={agent.id} name={agent.name} size={36} />
              <div className="text-center min-w-0 w-full">
                <div className={`text-[11px] font-medium truncate ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                  {agent.name}
                </div>
                <div className="text-[9px] text-gray-500 truncate">
                  {agent.department}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={() => {
            // Select all
            AGENT_ROSTER.forEach(a => {
              if (!selectedAgentIds.includes(a.id)) onToggle(a.id);
            });
          }}
          className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition"
        >
          {ko ? '전체 선택' : 'Select All'}
        </button>
        <button
          onClick={() => {
            // Reset to recommended
            // First deselect all, then select recommended
            selectedAgentIds.forEach(id => {
              if (!recommendedAgentIds.includes(id)) onToggle(id);
            });
            recommendedAgentIds.forEach(id => {
              if (!selectedAgentIds.includes(id)) onToggle(id);
            });
          }}
          className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition"
        >
          {ko ? 'AI 추천으로 초기화' : 'Reset to AI Picks'}
        </button>
      </div>

      {/* Confirm Button */}
      <button
        onClick={onConfirm}
        disabled={selectedCount === 0 || loading}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2"
      >
        <Rocket className="w-4 h-4" />
        {ko
          ? `${selectedCount}명 에이전트 배치 확정`
          : `Confirm & Deploy ${selectedCount} Agents`}
      </button>
    </div>
  );
}

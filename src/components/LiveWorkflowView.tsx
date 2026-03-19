'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Zap, Play, CheckCircle2, Loader2, AlertCircle, X } from 'lucide-react';

export interface WorkflowStep {
  step: number;
  agent: string;
  action: string;
  status: 'running' | 'done' | 'error';
  timestamp: string;
  data?: any;
}

const AGENT_INFO: Record<string, { emoji: string; name: string; color: string }> = {
  opsy:     { emoji: '', name: 'Opsy',     color: 'text-cyan-400' },
  searchy:  { emoji: '', name: 'Searchy',  color: 'text-blue-400' },
  buzzy:    { emoji: '', name: 'Buzzy',    color: 'text-amber-400' },
  counsely: { emoji: '', name: 'Counsely', color: 'text-purple-400' },
  tasky:    { emoji: '', name: 'Tasky',    color: 'text-green-400' },
};

interface Props {
  open: boolean;
  onClose: () => void;
  autoRun?: boolean;
  lang?: 'ko' | 'en';
}

export default function LiveWorkflowView({ open, onClose, autoRun = false, lang = 'ko' }: Props) {
  const ko = lang === 'ko';
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [pipelineStatus, setPipelineStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new steps arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps]);

  // Elapsed time ticker
  useEffect(() => {
    if (pipelineStatus !== 'running' || !startTime) return;
    const iv = setInterval(() => setElapsed(Date.now() - startTime), 100);
    return () => clearInterval(iv);
  }, [pipelineStatus, startTime]);

  const runPipeline = useCallback(async () => {
    if (pipelineStatus === 'running') return;

    setSteps([]);
    setPipelineStatus('running');
    setStartTime(Date.now());
    setElapsed(0);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/marketing/weekly-digest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        setPipelineStatus('failed');
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setPipelineStatus('failed');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;
            try {
              const event = JSON.parse(jsonStr) as WorkflowStep | { status: string; result?: any };

              if ('step' in event) {
                setSteps(prev => {
                  const existing = prev.findIndex(s => s.step === event.step);
                  if (existing >= 0) {
                    const updated = [...prev];
                    updated[existing] = event;
                    return updated;
                  }
                  return [...prev, event];
                });
              }

              if ('status' in event && (event.status === 'completed' || event.status === 'failed')) {
                setPipelineStatus(event.status as 'completed' | 'failed');
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      }

      // If stream ended without explicit status, mark completed
      setPipelineStatus(prev => prev === 'running' ? 'completed' : prev);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setPipelineStatus('failed');
      }
    }
  }, [pipelineStatus]);

  // Auto-run on mount if requested
  useEffect(() => {
    if (open && autoRun && pipelineStatus === 'idle') {
      runPipeline();
    }
  }, [open, autoRun, pipelineStatus, runPipeline]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  if (!open) return null;

  const totalSteps = 5;
  const doneSteps = steps.filter(s => s.status === 'done').length;
  const progress = totalSteps > 0 ? (doneSteps / totalSteps) * 100 : 0;

  const formatElapsed = (ms: number) => {
    const secs = Math.floor(ms / 1000);
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return mins > 0 ? `${mins}m ${rem}s` : `${rem}.${Math.floor((ms % 1000) / 100)}s`;
  };

  const getStepDuration = (step: WorkflowStep, idx: number) => {
    if (step.status === 'running') {
      return formatElapsed(Date.now() - new Date(step.timestamp).getTime());
    }
    if (step.status === 'done' && steps[idx + 1]) {
      return formatElapsed(
        new Date(steps[idx + 1].timestamp).getTime() - new Date(step.timestamp).getTime()
      );
    }
    return '';
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-[100vw] h-[100vh] sm:w-[600px] sm:h-auto sm:max-h-[90vh] bg-[#060a14]/98 sm:border sm:border-white/10 sm:rounded-2xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <span className="text-lg"></span>
            <h2 className="text-white/90 text-[15px] font-medium">{ko ? '라이브 파이프라인' : 'Live Pipeline'}</h2>
            <Badge
              variant="outline"
              className={`text-[10px] border-0 px-2 py-0.5 font-semibold ${
                pipelineStatus === 'running' ? 'bg-emerald-400/20 text-emerald-300' :
                pipelineStatus === 'completed' ? 'bg-green-400/20 text-green-300' :
                pipelineStatus === 'failed' ? 'bg-red-400/20 text-red-300' :
                'bg-white/5 text-white/40'
              }`}
            >
              {pipelineStatus === 'running' ? (ko ? '실행 중' : 'Running') :
               pipelineStatus === 'completed' ? (ko ? '완료' : 'Done') :
               pipelineStatus === 'failed' ? (ko ? '오류' : 'Error') : (ko ? '대기' : 'Ready')}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {pipelineStatus === 'running' && (
              <span className="text-[12px] text-white/40 font-mono">{formatElapsed(elapsed)}</span>
            )}
            <button onClick={onClose} className="text-white/40 hover:text-white text-xl p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-5 py-3 border-b border-white/5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-white/40">
              {ko ? '마케팅 주간 다이제스트' : 'Weekly Marketing Digest'}
            </span>
            <span className="text-[11px] text-white/40 font-mono">
              {doneSteps}/{totalSteps}
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                pipelineStatus === 'failed' ? 'bg-red-500' :
                pipelineStatus === 'completed' ? 'bg-emerald-500' :
                'bg-emerald-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps timeline */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
          {pipelineStatus === 'idle' ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Play className="w-7 h-7 text-emerald-400" />
              </div>
              <p className="text-white/50 text-[13px] text-center">
                {ko ? <>파이프라인을 실행하면 에이전트들의<br />작업 과정을 실시간으로 볼 수 있습니다</> : <>Run the pipeline to watch agents<br />work in real-time</>}
              </p>
              <button
                onClick={runPipeline}
                className="px-5 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[13px] font-bold hover:bg-emerald-500/30 transition flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                {ko ? '파이프라인 실행' : 'Run Pipeline'}
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {steps.map((step, idx) => {
                const agent = AGENT_INFO[step.agent] || { emoji: '', name: step.agent, color: 'text-gray-400' };
                const isRunning = step.status === 'running';
                const isDone = step.status === 'done';
                const isError = step.status === 'error';

                return (
                  <div
                    key={step.step}
                    className={`relative pl-8 pb-4 ${idx < steps.length - 1 ? 'border-l border-white/10 ml-3' : 'ml-3'}`}
                  >
                    {/* Timeline node */}
                    <div className={`absolute -left-[9px] top-0.5 w-[18px] h-[18px] rounded-full flex items-center justify-center ${
                      isRunning ? 'bg-emerald-500/20 border-2 border-emerald-400' :
                      isDone ? 'bg-emerald-500/30 border-2 border-emerald-500' :
                      isError ? 'bg-red-500/20 border-2 border-red-400' :
                      'bg-white/5 border-2 border-white/20'
                    }`}>
                      {isRunning && <Loader2 className="w-2.5 h-2.5 text-emerald-400 animate-spin" />}
                      {isDone && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />}
                      {isError && <AlertCircle className="w-2.5 h-2.5 text-red-400" />}
                    </div>

                    {/* Step content */}
                    <div className={`rounded-xl px-4 py-3 transition-all ${
                      isRunning ? 'bg-emerald-500/5 border border-emerald-500/20' :
                      isDone ? 'bg-white/[0.02] border border-white/5' :
                      isError ? 'bg-red-500/5 border border-red-500/20' :
                      'bg-white/[0.02] border border-white/5'
                    }`}>
                      {/* Agent row */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{agent.emoji}</span>
                        <span className={`text-[13px] font-bold ${agent.color}`}>{agent.name}</span>
                        <span className="text-[10px] text-white/20 ml-auto">Step {step.step}</span>
                      </div>

                      {/* Action */}
                      <p className={`text-[13px] leading-relaxed ${
                        isRunning ? 'text-white/80' : isDone ? 'text-white/60' : 'text-red-300/80'
                      }`}>
                        {step.action}
                        {isRunning && (
                          <span className="inline-flex ml-1">
                            <span className="animate-pulse">.</span>
                            <span className="animate-pulse" style={{ animationDelay: '200ms' }}>.</span>
                            <span className="animate-pulse" style={{ animationDelay: '400ms' }}>.</span>
                          </span>
                        )}
                      </p>

                      {/* Data / result */}
                      {isDone && step.data && (
                        <p className="text-[11px] text-emerald-400/70 mt-1 font-mono">
                          {typeof step.data === 'string' ? step.data : JSON.stringify(step.data)}
                        </p>
                      )}
                      {isError && step.data && (
                        <p className="text-[11px] text-red-400/70 mt-1">
                          {typeof step.data === 'string' ? step.data : JSON.stringify(step.data)}
                        </p>
                      )}

                      {/* Duration */}
                      {(isRunning || isDone) && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-white/20 font-mono">
                            {getStepDuration(step, idx)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Running indicator at the end */}
              {pipelineStatus === 'running' && steps.length > 0 && steps[steps.length - 1]?.status === 'done' && (
                <div className="relative pl-8 ml-3">
                  <div className="absolute -left-[5px] top-2 w-[10px] h-[10px] rounded-full bg-emerald-400/30 animate-pulse" />
                  <p className="text-[12px] text-white/30 py-2">다음 단계 준비 중...</p>
                </div>
              )}
            </div>
          )}

          {/* Completion summary */}
          {pipelineStatus === 'completed' && (
            <div className="mt-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-4 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-emerald-300 text-[14px] font-bold">파이프라인 완료</p>
              <p className="text-white/40 text-[12px] mt-1">
                총 소요시간: {formatElapsed(elapsed)}
              </p>
            </div>
          )}

          {pipelineStatus === 'failed' && (
            <div className="mt-4 rounded-xl bg-red-500/5 border border-red-500/15 p-4 text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-300 text-[14px] font-bold">파이프라인 오류</p>
              <button
                onClick={() => { setPipelineStatus('idle'); setSteps([]); }}
                className="mt-2 px-4 py-1.5 rounded-lg bg-white/5 text-white/60 text-[12px] hover:bg-white/10"
              >
                재시도
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {pipelineStatus !== 'idle' && pipelineStatus !== 'running' && (
          <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
            <button
              onClick={() => { setPipelineStatus('idle'); setSteps([]); }}
              className="text-[12px] text-white/40 hover:text-white/60"
            >
              초기화
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-white/5 text-white/60 text-[12px] hover:bg-white/10"
            >
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

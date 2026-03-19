'use client';
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, BarChart3, Target, RefreshCw } from 'lucide-react';
import { cleanMarkdown } from '@/lib/format-markdown';

interface Trade {
  id: string;
  contract: string;
  direction: string;
  entry_price: number;
  exit_price: number;
  pnl_points: number;
  pnl_dollars: number;
  entry_time: string;
  exit_time: string;
  strategy: string;
  notes: string;
}

export default function CapitalDashboard({ lang }: { lang: string }) {
  const ko = lang === 'ko';
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrades = async () => {
    try {
      const res = await fetch('/api/trades?limit=20', { headers: { 'x-api-key': 'y-trades-2026' } });
      if (res.ok) { const data = await res.json(); setTrades(data.trades || []); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchTrades(); }, []);

  const totalPnlPt = trades.reduce((s, t) => s + (t.pnl_points || 0), 0);
  const totalPnlDol = trades.reduce((s, t) => s + (t.pnl_dollars || 0), 0);
  const wins = trades.filter(t => t.pnl_points > 0).length;
  const losses = trades.filter(t => t.pnl_points < 0).length;
  const winRate = trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-bold text-emerald-400 flex items-center gap-2">
           {ko ? '_y 캐피탈 — S&P500 트레이딩' : '_y Capital — S&P500 Trading'}
        </h3>
        <button onClick={() => { setRefreshing(true); fetchTrades(); }}
          className="text-[12px] text-cyan-400 border border-cyan-400/30 px-2 py-1 rounded-lg hover:bg-cyan-400/10 flex items-center gap-1">
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/[0.03] rounded-xl border border-white/5 p-3 text-center">
          <p className="text-[10px] text-gray-500 uppercase">{ko ? '총 거래' : 'Total Trades'}</p>
          <p className="text-[22px] font-bold text-white">{trades.length}</p>
        </div>
        <div className="bg-white/[0.03] rounded-xl border border-white/5 p-3 text-center">
          <p className="text-[10px] text-gray-500 uppercase">{ko ? '승률' : 'Win Rate'}</p>
          <p className={`text-[22px] font-bold ${winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>{winRate}%</p>
          <p className="text-[10px] text-gray-600">{wins}W {losses}L</p>
        </div>
        <div className="bg-white/[0.03] rounded-xl border border-white/5 p-3 text-center">
          <p className="text-[10px] text-gray-500 uppercase">{ko ? '총 손익' : 'Total PnL'}</p>
          <p className={`text-[22px] font-bold ${totalPnlPt >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalPnlPt >= 0 ? '+' : ''}{totalPnlPt.toFixed(2)}pt
          </p>
          <p className="text-[10px] text-gray-600">${totalPnlDol.toFixed(0)}</p>
        </div>
        <div className="bg-white/[0.03] rounded-xl border border-white/5 p-3 text-center">
          <p className="text-[10px] text-gray-500 uppercase">{ko ? '전략' : 'Strategy'}</p>
          <p className="text-[14px] font-bold text-amber-400">BB_ATR</p>
        </div>
      </div>

      {/* Trade History */}
      <div className="bg-white/[0.02] rounded-xl border border-white/5 p-3">
        <h4 className="text-[13px] text-gray-400 font-bold uppercase mb-2 flex items-center gap-1">
          <Activity className="w-3 h-3" /> {ko ? '최근 거래' : 'Recent Trades'}
        </h4>
        {loading ? (
          <p className="text-[12px] text-gray-600 text-center py-4">Loading...</p>
        ) : trades.length === 0 ? (
          <p className="text-[12px] text-gray-600 text-center py-4">{ko ? '거래 없음' : 'No trades'}</p>
        ) : (
          <div className="space-y-1 max-h-[40vh] overflow-y-auto">
            {trades.map(t => (
              <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] text-[12px]">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.direction === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {t.direction}
                </span>
                <span className="text-gray-400 flex-1 truncate">
                  {t.entry_price?.toFixed(2)} → {t.exit_price?.toFixed(2)}
                </span>
                <span className={`font-bold ${(t.pnl_points || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {(t.pnl_points || 0) >= 0 ? '+' : ''}{(t.pnl_points || 0).toFixed(2)}pt
                </span>
                <span className="text-gray-600 text-[10px]">
                  {t.exit_time ? new Date(t.exit_time).toLocaleDateString(ko ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' }) : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agent Status */}
      <div className="bg-white/[0.02] rounded-xl border border-white/5 p-3">
        <h4 className="text-[13px] text-gray-400 font-bold uppercase mb-2 flex items-center gap-1">
          <Target className="w-3 h-3" /> {ko ? '담당 에이전트' : 'Assigned Agents'}
        </h4>
        <div className="flex gap-3">
          {['Tradey', 'Quanty'].map(name => (
            <div key={name} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
              <span className="text-[14px]"></span>
              <span className="text-[13px] text-white font-medium">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

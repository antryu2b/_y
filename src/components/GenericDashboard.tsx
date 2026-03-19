'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Activity, Database, Globe, Server,
  CheckCircle2, AlertTriangle, XCircle, HelpCircle,
  BarChart3, Target, Loader2,
} from 'lucide-react';
import type { Company } from '@/lib/company-registry';
import { getConnector, getAllConnectors, type ConnectorHealth, type ConnectorMetrics, type ConnectorData } from '@/lib/connector-interface';

// ── Types ──

interface DataSourceConfig {
  type: string;
  table?: string;
  endpoint?: string;
  url?: string;
}

interface SubsidiaryConfig extends Company {
  data_sources?: DataSourceConfig[];
}

interface ConnectorState {
  id: string;
  name: string;
  health: ConnectorHealth | null;
  metrics: ConnectorMetrics | null;
  data: ConnectorData | null;
  loading: boolean;
  error: string | null;
}

// ── i18n ──

const labels = {
  ko: {
    noDataSources: '데이터 소스가 설정되지 않았습니다',
    configureHint: 'company.yml에 data_sources를 추가하세요',
    healthStatus: '연결 상태',
    healthy: '정상',
    degraded: '불안정',
    down: '중단',
    unknown: '미확인',
    kpiMetrics: 'KPI 메트릭',
    dataPreview: '데이터 미리보기',
    assignedAgents: '담당 에이전트',
    noData: '데이터 없음',
    loading: '로딩 중...',
    responseTime: '응답시간',
    lastCheck: '마지막 확인',
    records: '레코드',
    connectors: '커넥터',
    refreshAll: '전체 새로고침',
  },
  en: {
    noDataSources: 'No data sources configured',
    configureHint: 'Add data_sources to company.yml',
    healthStatus: 'Health Status',
    healthy: 'Healthy',
    degraded: 'Degraded',
    down: 'Down',
    unknown: 'Unknown',
    kpiMetrics: 'KPI Metrics',
    dataPreview: 'Data Preview',
    assignedAgents: 'Assigned Agents',
    noData: 'No data',
    loading: 'Loading...',
    responseTime: 'Response Time',
    lastCheck: 'Last Check',
    records: 'Records',
    connectors: 'Connectors',
    refreshAll: 'Refresh All',
  },
} as const;

// ── Helpers ──

const statusIcon = (status: string) => {
  switch (status) {
    case 'healthy': return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    case 'degraded': return <AlertTriangle className="w-5 h-5 text-amber-400" />;
    case 'down': return <XCircle className="w-5 h-5 text-red-400" />;
    default: return <HelpCircle className="w-5 h-5 text-gray-500" />;
  }
};

const statusColor = (status: string) => {
  switch (status) {
    case 'healthy': return 'text-emerald-400';
    case 'degraded': return 'text-amber-400';
    case 'down': return 'text-red-400';
    default: return 'text-gray-500';
  }
};

const typeIcon = (type: string) => {
  switch (type) {
    case 'supabase':
    case 'external_supabase':
    case 'database': return <Database className="w-3.5 h-3.5" />;
    case 'rest_api': return <Globe className="w-3.5 h-3.5" />;
    case 'mcp_server': return <Server className="w-3.5 h-3.5" />;
    default: return <Activity className="w-3.5 h-3.5" />;
  }
};

function connectorIdFromSource(subsidiaryId: string, ds: DataSourceConfig, idx: number): string {
  return `${subsidiaryId}-${ds.type}-${ds.table || ds.endpoint || idx}`;
}

// ── Component ──

export default function GenericDashboard({
  subsidiary,
  lang = 'ko',
}: {
  subsidiary: SubsidiaryConfig;
  lang?: string;
}) {
  const t = labels[lang === 'ko' ? 'ko' : 'en'];
  const dataSources = subsidiary.data_sources || [];
  const [connectorStates, setConnectorStates] = useState<ConnectorState[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const buildConnectorId = useCallback(
    (ds: DataSourceConfig, idx: number) => connectorIdFromSource(subsidiary.id, ds, idx),
    [subsidiary.id],
  );

  // Fetch all connector data
  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    const states: ConnectorState[] = [];

    for (let i = 0; i < dataSources.length; i++) {
      const ds = dataSources[i];
      const id = buildConnectorId(ds, i);
      const connector = getConnector(id);
      const state: ConnectorState = {
        id,
        name: ds.table || ds.endpoint || ds.type,
        health: null,
        metrics: null,
        data: null,
        loading: true,
        error: null,
      };

      if (connector) {
        try {
          const [health, metrics, data] = await Promise.allSettled([
            connector.healthCheck(),
            connector.getMetrics(),
            connector.fetchData(),
          ]);
          state.health = health.status === 'fulfilled' ? health.value : null;
          state.metrics = metrics.status === 'fulfilled' ? metrics.value : null;
          state.data = data.status === 'fulfilled' ? data.value : null;
        } catch (err) {
          state.error = err instanceof Error ? err.message : 'Unknown error';
        }
      } else {
        // No registered connector — try direct fetch via endpoint
        if (ds.endpoint) {
          try {
            const res = await fetch(ds.endpoint);
            if (res.ok) {
              const json = await res.json();
              const items = Array.isArray(json) ? json : json.items || json.trades || json.results || [json];
              state.data = { items, total: items.length, lastUpdated: new Date().toISOString() };
              state.health = { status: 'healthy', lastCheck: new Date().toISOString() };
            } else {
              state.health = { status: 'degraded', lastCheck: new Date().toISOString(), message: `HTTP ${res.status}` };
            }
          } catch {
            state.health = { status: 'down', lastCheck: new Date().toISOString(), message: 'Connection failed' };
          }
        } else {
          state.health = { status: 'unknown', lastCheck: new Date().toISOString(), message: 'No connector registered' };
        }
      }

      state.loading = false;
      states.push(state);
    }

    setConnectorStates(states);
    setRefreshing(false);
  }, [dataSources, buildConnectorId]);

  useEffect(() => {
    if (dataSources.length > 0) fetchAll();
  }, [dataSources.length, fetchAll]);

  // ── Empty state ──
  if (dataSources.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-bold text-emerald-400 flex items-center gap-2">
            {subsidiary.icon} {lang === 'ko' ? subsidiary.nameKo : subsidiary.name}
          </h3>
        </div>
        <div className="bg-white/[0.02] rounded-xl border border-white/5 p-8 text-center">
          <Database className="w-8 h-8 text-gray-600 mx-auto mb-3" />
          <p className="text-[14px] text-gray-400">{t.noDataSources}</p>
          <p className="text-[12px] text-gray-600 mt-1">{t.configureHint}</p>
        </div>
      </div>
    );
  }

  // ── Main dashboard ──
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-bold text-emerald-400 flex items-center gap-2">
          {subsidiary.icon} {lang === 'ko' ? subsidiary.nameKo : subsidiary.name}
        </h3>
        <button
          onClick={fetchAll}
          className="text-[12px] text-cyan-400 border border-cyan-400/30 px-2 py-1 rounded-lg hover:bg-cyan-400/10 flex items-center gap-1"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Health Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Overall connectors count */}
        <div className="bg-white/[0.03] rounded-xl border border-white/5 p-3 text-center">
          <p className="text-[10px] text-gray-500 uppercase">{t.connectors}</p>
          <p className="text-[22px] font-bold text-white">{dataSources.length}</p>
        </div>

        {/* Health summary */}
        {connectorStates.slice(0, 3).map((cs) => (
          <div key={cs.id} className="bg-white/[0.03] rounded-xl border border-white/5 p-3 text-center">
            <p className="text-[10px] text-gray-500 uppercase truncate">{cs.name}</p>
            {cs.loading ? (
              <Loader2 className="w-5 h-5 text-gray-500 mx-auto mt-1 animate-spin" />
            ) : (
              <div className="flex items-center justify-center gap-1 mt-1">
                {statusIcon(cs.health?.status || 'unknown')}
                <span className={`text-[14px] font-bold ${statusColor(cs.health?.status || 'unknown')}`}>
                  {t[cs.health?.status as keyof typeof t] || cs.health?.status || t.unknown}
                </span>
              </div>
            )}
            {cs.health?.responseTime && (
              <p className="text-[10px] text-gray-600">{cs.health.responseTime}ms</p>
            )}
          </div>
        ))}
      </div>

      {/* KPI Metrics */}
      {connectorStates.some(cs => cs.metrics && Object.keys(cs.metrics).length > 0) && (
        <div className="bg-white/[0.02] rounded-xl border border-white/5 p-3">
          <h4 className="text-[13px] text-gray-400 font-bold uppercase mb-2 flex items-center gap-1">
            <BarChart3 className="w-3 h-3" /> {t.kpiMetrics}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {connectorStates.map(cs =>
              cs.metrics
                ? Object.entries(cs.metrics)
                    .filter(([key]) => key !== 'status' && key !== 'type')
                    .map(([key, val]) => (
                      <div key={`${cs.id}-${key}`} className="bg-white/[0.03] rounded-lg px-3 py-2">
                        <p className="text-[10px] text-gray-500 uppercase truncate">{key.replace(/_/g, ' ')}</p>
                        <p className="text-[16px] font-bold text-white truncate">
                          {typeof val === 'number' ? val.toLocaleString() : String(val)}
                        </p>
                      </div>
                    ))
                : null
            )}
          </div>
        </div>
      )}

      {/* Data Preview */}
      {connectorStates.map((cs) => {
        if (!cs.data || cs.data.items.length === 0) return null;
        const items = cs.data.items.slice(0, 10);
        const columns = items.length > 0 ? Object.keys(items[0] as Record<string, unknown>).slice(0, 6) : [];

        return (
          <div key={cs.id} className="bg-white/[0.02] rounded-xl border border-white/5 p-3">
            <h4 className="text-[13px] text-gray-400 font-bold uppercase mb-2 flex items-center gap-1">
              {typeIcon(cs.name)} {cs.name} — {cs.data.total} {t.records}
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-white/5">
                    {columns.map(col => (
                      <th key={col} className="text-left py-1 px-2 text-gray-500 font-medium uppercase">
                        {col.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => {
                    const row = item as Record<string, unknown>;
                    return (
                      <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.03]">
                        {columns.map(col => (
                          <td key={col} className="py-1.5 px-2 text-gray-300 truncate max-w-[150px]">
                            {row[col] == null ? '—' : String(row[col])}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* No data fallback */}
      {connectorStates.every(cs => !cs.data || cs.data.items.length === 0) && !refreshing && (
        <div className="bg-white/[0.02] rounded-xl border border-white/5 p-3">
          <h4 className="text-[13px] text-gray-400 font-bold uppercase mb-2 flex items-center gap-1">
            <Activity className="w-3 h-3" /> {t.dataPreview}
          </h4>
          <p className="text-[12px] text-gray-600 text-center py-4">{t.noData}</p>
        </div>
      )}

      {/* Assigned Agents */}
      <div className="bg-white/[0.02] rounded-xl border border-white/5 p-3">
        <h4 className="text-[13px] text-gray-400 font-bold uppercase mb-2 flex items-center gap-1">
          <Target className="w-3 h-3" /> {t.assignedAgents}
        </h4>
        <div className="flex flex-wrap gap-3">
          {subsidiary.agents.map(name => (
            <div key={name} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
              <span className="text-[14px]"></span>
              <span className="text-[13px] text-white font-medium capitalize">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

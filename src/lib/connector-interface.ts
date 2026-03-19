/**
 * _y Builder — Connector Interface Standard
 * 
 * Standardized interface for plugging external data sources
 * into the _y agent ecosystem. Each connector provides:
 * - Health check (is the service running?)
 * - Data fetch (what's the current state?)
 * - Metrics (KPIs for dashboard)
 * 
 * Connectors are defined in company.yml under subsidiaries.data_sources
 * and auto-wired to assigned agents.
 */

// ── Core Connector Interface ──

export interface ConnectorConfig {
  id: string;                    // unique connector id
  type: ConnectorType;
  name: string;                  // display name
  endpoint: string;              // API URL or MCP server address
  authType: 'none' | 'api_key' | 'bearer' | 'oauth';
  authKey?: string;              // env var name (never raw key)
  refreshInterval?: number;      // seconds between polls (default: 300)
  assignedAgent: string;         // which agent manages this connector
  subsidiary: string;            // which company owns this
}

export type ConnectorType = 
  | 'supabase'          // Supabase REST API
  | 'rest_api'          // Generic REST API
  | 'mcp_server'        // MCP protocol server
  | 'webhook'           // Incoming webhook
  | 'database'          // Direct DB connection
  | 'scraper';          // Web scraper

// ── Connector Response Standard ──

export interface ConnectorHealth {
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  responseTime?: number;         // ms
  lastCheck: string;             // ISO timestamp
  message?: string;
}

export interface ConnectorMetrics {
  [key: string]: number | string;  // flexible KPIs
  // e.g., { bidCount: 21000, activeUsers: 10, revenue: '$0' }
}

export interface ConnectorData<T = unknown> {
  items: T[];
  total: number;
  lastUpdated: string;
}

// ── Abstract Connector Class ──

export abstract class BaseConnector {
  constructor(public config: ConnectorConfig) {}

  abstract healthCheck(): Promise<ConnectorHealth>;
  abstract fetchData(params?: Record<string, string>): Promise<ConnectorData>;
  abstract getMetrics(): Promise<ConnectorMetrics>;

  get id() { return this.config.id; }
  get name() { return this.config.name; }
  get agent() { return this.config.assignedAgent; }
}

// ── Built-in Connectors ──

export class SupabaseConnector extends BaseConnector {
  async healthCheck(): Promise<ConnectorHealth> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.config.endpoint}?select=count&limit=1`, {
        headers: { 'apikey': this.config.authKey || '' },
      });
      return {
        status: res.ok ? 'healthy' : 'degraded',
        responseTime: Date.now() - start,
        lastCheck: new Date().toISOString(),
      };
    } catch {
      return { status: 'down', lastCheck: new Date().toISOString(), message: 'Connection failed' };
    }
  }

  async fetchData(params?: Record<string, string>): Promise<ConnectorData> {
    const query = params ? '&' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`${this.config.endpoint}?select=*&limit=50${query}`, {
      headers: { 'apikey': this.config.authKey || '' },
    });
    const items = res.ok ? await res.json() : [];
    return { items, total: items.length, lastUpdated: new Date().toISOString() };
  }

  async getMetrics(): Promise<ConnectorMetrics> {
    return { status: 'connected', type: 'supabase' };
  }
}

export class RestAPIConnector extends BaseConnector {
  async healthCheck(): Promise<ConnectorHealth> {
    const start = Date.now();
    try {
      const res = await fetch(this.config.endpoint, {
        headers: this.config.authKey ? { 'Authorization': `Bearer ${this.config.authKey}` } : {},
      });
      return {
        status: res.ok ? 'healthy' : 'degraded',
        responseTime: Date.now() - start,
        lastCheck: new Date().toISOString(),
      };
    } catch {
      return { status: 'down', lastCheck: new Date().toISOString() };
    }
  }

  async fetchData(): Promise<ConnectorData> {
    const res = await fetch(this.config.endpoint, {
      headers: this.config.authKey ? { 'Authorization': `Bearer ${this.config.authKey}` } : {},
    });
    const data = res.ok ? await res.json() : {};
    const items = Array.isArray(data) ? data : data.items || data.results || [data];
    return { items, total: items.length, lastUpdated: new Date().toISOString() };
  }

  async getMetrics(): Promise<ConnectorMetrics> {
    return { status: 'connected', type: 'rest_api' };
  }
}

// ── Connector Factory ──

export function createConnector(config: ConnectorConfig): BaseConnector {
  switch (config.type) {
    case 'supabase': return new SupabaseConnector(config);
    case 'rest_api': return new RestAPIConnector(config);
    case 'mcp_server': return new RestAPIConnector(config); // MCP uses HTTP too
    default: return new RestAPIConnector(config);
  }
}

// ── Registry ──

const connectors = new Map<string, BaseConnector>();

export function registerConnector(config: ConnectorConfig) {
  connectors.set(config.id, createConnector(config));
}

export function getConnector(id: string) {
  return connectors.get(id);
}

export function getAllConnectors() {
  return Array.from(connectors.values());
}

// ── Auto-wiring from company.yml config ──

export interface DataSourceYaml {
  type: string;
  table?: string;
  endpoint?: string;
  url?: string;
}

export interface SubsidiaryYaml {
  id: string;
  name: string;
  agents?: string[];
  data_sources?: DataSourceYaml[];
}

/**
 * Auto-register connectors from company.yml subsidiary data_sources.
 * Call once at app init. Safe to call multiple times (idempotent).
 */
export function initConnectorsFromConfig(subsidiaries: SubsidiaryYaml[]) {
  for (const sub of subsidiaries) {
    if (!sub.data_sources) continue;
    sub.data_sources.forEach((ds, idx) => {
      const connectorId = `${sub.id}-${ds.type}-${ds.table || ds.endpoint || idx}`;

      // Skip if already registered
      if (connectors.has(connectorId)) return;

      // Map type string to ConnectorType
      let connectorType: ConnectorType;
      switch (ds.type) {
        case 'supabase':
        case 'external_supabase':
          connectorType = 'supabase';
          break;
        case 'rest_api':
          connectorType = 'rest_api';
          break;
        case 'mcp_server':
          connectorType = 'mcp_server';
          break;
        case 'webhook':
          connectorType = 'webhook';
          break;
        case 'database':
          connectorType = 'database';
          break;
        case 'scraper':
          connectorType = 'scraper';
          break;
        default:
          connectorType = 'rest_api';
      }

      // Build endpoint URL
      let endpoint = ds.endpoint || '';
      if (ds.type === 'supabase' && ds.table) {
        // For supabase type with table, build the REST endpoint
        const baseUrl = ds.url || '';
        endpoint = `${baseUrl}/rest/v1/${ds.table}`;
      } else if (ds.type === 'external_supabase' && ds.url) {
        endpoint = ds.endpoint || `${ds.url}/rest/v1/`;
      }

      const config: ConnectorConfig = {
        id: connectorId,
        type: connectorType,
        name: ds.table || ds.endpoint || `${sub.id}-${ds.type}`,
        endpoint,
        authType: 'none',
        assignedAgent: sub.agents?.[0] || 'unassigned',
        subsidiary: sub.id,
      };

      registerConnector(config);
    });
  }
}

/**
 * Company Configuration Loader
 * 
 * Reads company.yml and provides typed access to company config.
 * This is the bridge between YAML config and TypeScript code.
 * 
 * Usage:
 *   import { loadCompany } from '@/lib/company-loader';
 *   const company = loadCompany();
 *   company.agents → all agents
 *   company.departments → all departments
 *   company.getAgent('searchy') → agent config
 *   company.getLLM('searchy') → LLM config
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Inline YAML parser (avoid external dep for edge runtime)
function parseYaml(text: string): any {
  // Use js-yaml if available, otherwise basic parse
  try {
    const jsYaml = require('js-yaml');
    return jsYaml.load(text);
  } catch {
    // Fallback: JSON (if someone uses JSON instead of YAML)
    return JSON.parse(text);
  }
}

export interface CompanyConfig {
  company: {
    name: string;
    mission: string;
    chairman: string;
    language: string;
    theme: string;
  };
  llms: Record<string, {
    type: string;
    model: string;
    label: string;
  }>;
  departments: Array<{
    id: string;
    name_ko: string;
    name_en: string;
    floor: number;
    short_ko: string;
    short_en: string;
  }>;
  agents: Array<{
    id: string;
    number: string;
    name: string;
    tier: string;
    department: string;
    reportTo: string;
    llm: string;
    role: string;
    mbti?: string;
    skills?: string[];
  }>;
  subsidiaries?: Array<{
    id: string;
    name: string;
    name_ko: string;
    icon: string;
    color: string;
    description: string;
    description_ko: string;
    departments: string[];
    agents: string[];
    floors: number[];
    data_sources?: Array<{
      type: string;
      table?: string;
      url?: string;
      endpoint?: string;
    }>;
    dashboard: string;
  }>;
  pipelines: {
    types: string[];
    delegation_levels: Record<number, { name: string; needs_meeting: boolean }>;
  };
}

let _cache: CompanyConfig | null = null;

export function loadCompanyConfig(): CompanyConfig {
  if (_cache) return _cache;
  
  const configPath = join(process.cwd(), 'company.yml');
  const text = readFileSync(configPath, 'utf-8');
  _cache = parseYaml(text) as CompanyConfig;
  return _cache;
}

// ── Helper functions ──

export function getCompanyAgents() {
  const config = loadCompanyConfig();
  return config.agents;
}

export function getCompanyAgent(id: string) {
  return getCompanyAgents().find(a => a.id === id);
}

export function getCompanyDepartments() {
  const config = loadCompanyConfig();
  return config.departments;
}

export function getAgentLLMFromConfig(agentId: string) {
  const config = loadCompanyConfig();
  const agent = config.agents.find(a => a.id === agentId);
  if (!agent) return config.llms['gemini_flash']; // default
  return config.llms[agent.llm] || config.llms['gemini_flash'];
}

export function getAgentsByDepartment(deptId: string) {
  return getCompanyAgents().filter(a => a.department === deptId);
}

export function getAgentsByFloor(floor: number) {
  const config = loadCompanyConfig();
  const dept = config.departments.find(d => d.floor === floor);
  if (!dept) return [];
  return config.agents.filter(a => a.department === dept.id);
}

export function getFloorCount() {
  return loadCompanyConfig().departments.length;
}

// ── Subsidiary helpers ──

export function getSubsidiaries() {
  return loadCompanyConfig().subsidiaries || [];
}

export function isMultiCompanyConfig() {
  return getSubsidiaries().length > 1;
}

export function getSubsidiary(id: string) {
  return getSubsidiaries().find(s => s.id === id);
}

export function getSubsidiaryByAgent(agentId: string) {
  return getSubsidiaries().find(s => s.agents.includes(agentId));
}

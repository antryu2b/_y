import { AGENT_ROSTER } from '@/data/agent-config';
import path from 'path';
import fs from 'fs';

export type LLMProviderType = 'ollama' | 'openai' | 'anthropic' | 'google';

export interface AgentLLMConfig {
  provider: LLMProviderType;
  model: string;
}

interface LLMProfileData {
  provider?: string;
  profile?: string;
  ram?: string;
  models?: { role: string; model: string }[];
  agentModels?: Record<string, string>;
  agents?: Record<string, { provider: string; model: string }>;
  generatedAt?: string;
}

let _profileCache: LLMProfileData | null = null;
let _profileLoaded = false;

function loadProfile(): LLMProfileData | null {
  if (_profileLoaded) return _profileCache;
  _profileLoaded = true;
  try {
    const profilePath = path.join(process.cwd(), 'data', 'llm-profile.json');
    if (fs.existsSync(profilePath)) {
      _profileCache = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
    }
  } catch {}
  return _profileCache;
}

// Analysis agents get stronger models for cloud providers
const ANALYSIS_AGENTS = new Set([
  'counsely', 'tasky', 'finy', 'legaly', 'skepty', 'audity',
  'quanty', 'hedgy', 'valuey', 'growthy',
]);

// Default models per cloud provider
const CLOUD_DEFAULTS: Record<string, { analysis: string; utility: string }> = {
  openai:    { analysis: 'gpt-4o', utility: 'gpt-4o-mini' },
  anthropic: { analysis: 'claude-sonnet-4-20250514', utility: 'claude-sonnet-4-20250514' },
  google:    { analysis: 'gemini-2.0-flash', utility: 'gemini-2.0-flash' },
};

/** Get the actual LLM provider + model for an agent (profile override > config default) */
export function getAgentLLM(agentId: string): AgentLLMConfig {
  const profile = loadProfile();

  if (profile) {
    const provider = profile.provider || 'ollama';

    // Check per-agent override in "agents" field (new format)
    if (profile.agents && profile.agents[agentId]) {
      const agentCfg = profile.agents[agentId];
      return {
        provider: agentCfg.provider as LLMProviderType,
        model: agentCfg.model,
      };
    }

    // Cloud provider defaults
    if (provider in CLOUD_DEFAULTS) {
      const defaults = CLOUD_DEFAULTS[provider];
      return {
        provider: provider as LLMProviderType,
        model: ANALYSIS_AGENTS.has(agentId) ? defaults.analysis : defaults.utility,
      };
    }

    // Mixed provider: must have per-agent config, fall back to ollama
    if (provider === 'mixed') {
      // No agent-specific config found for mixed, use ollama fallback
      // (shouldn't normally happen if setup was done correctly)
    }

    // Ollama: use agentModels (legacy format) or profile-based mapping
    if (profile.agentModels && profile.agentModels[agentId]) {
      return { provider: 'ollama', model: profile.agentModels[agentId] };
    }
  }

  // Final fallback: use agent-config.ts defaults
  const agent = AGENT_ROSTER.find(a => a.id === agentId);
  if (agent?.llm) {
    // Map legacy 'gemini' type to 'google'
    const legacyType = agent.llm.type;
    const mappedProvider: LLMProviderType =
      legacyType === 'gemini' ? 'google' : (legacyType as LLMProviderType);
    return { provider: mappedProvider, model: agent.llm.model };
  }

  return { provider: 'ollama', model: 'qwen2.5:7b' };
}

/** Get profile info (for display) */
export function getProfileInfo(): LLMProfileData | null {
  try {
    const profilePath = path.join(process.cwd(), 'data', 'llm-profile.json');
    if (fs.existsSync(profilePath)) {
      return JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
    }
  } catch {}
  return null;
}

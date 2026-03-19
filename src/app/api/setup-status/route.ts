import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { isDemoMode } from '../../../lib/demo-data';

export async function GET() {
  // Demo mode: return completed setup
  if (isDemoMode()) {
    return NextResponse.json({
      profile: 'DEMO',
      provider: 'mixed',
      models: {
        counsely: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
        skepty: { provider: 'openai', model: 'gpt-4o' },
        searchy: { provider: 'google', model: 'gemini-2.0-flash' },
        buildy: { provider: 'ollama', model: 'qwen3:32b' },
      },
      ram: '64GB',
    });
  }

  try {
    const profilePath = path.join(process.cwd(), 'data', 'llm-profile.json');
    if (fs.existsSync(profilePath)) {
      const raw = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
      return NextResponse.json({
        profile: raw.name || raw.profile || 'custom',
        provider: raw.provider || 'ollama',
        models: raw.agentModels || raw.agents || {},
        ram: raw.ram || os.totalmem() / (1024 ** 3) + 'GB',
        raw,
      });
    }
    return NextResponse.json({ profile: null, provider: 'ollama' });
  } catch (error) {
    return NextResponse.json({ profile: null, provider: 'ollama', error: 'Failed to read profile' });
  }
}

import { execSync } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// ─── Hardware Detection ───
interface SystemInfo {
  platform: string;
  arch: string;
  cpuModel: string;
  cpuCores: number;
  totalRAM: number;  // GB
  gpu: string;
}

function detectHardware(): SystemInfo {
  const totalRAM = Math.round(os.totalmem() / (1024 ** 3));
  const cpus = os.cpus();
  let gpu = 'Unknown';

  try {
    if (process.platform === 'darwin') {
      const spInfo = execSync('system_profiler SPDisplaysDataType 2>/dev/null', { encoding: 'utf-8' });
      const gpuMatch = spInfo.match(/Chipset Model:\s*(.+)/i) || spInfo.match(/Chip:\s*(.+)/i);
      gpu = gpuMatch ? gpuMatch[1].trim() : `Apple Silicon (${totalRAM}GB unified)`;
    } else if (process.platform === 'linux') {
      try {
        gpu = execSync('nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null', { encoding: 'utf-8' }).trim();
      } catch {
        try {
          gpu = execSync('lspci | grep -i vga 2>/dev/null', { encoding: 'utf-8' }).trim();
        } catch { gpu = 'Integrated'; }
      }
    }
  } catch { gpu = 'Unknown'; }

  return {
    platform: process.platform,
    arch: process.arch,
    cpuModel: cpus[0]?.model || 'Unknown',
    cpuCores: cpus.length,
    totalRAM,
    gpu,
  };
}

// ─── LLM Profiles (Ollama) ───
interface LLMProfile {
  name: string;
  minRAM: number;
  models: { role: string; model: string; size: string; agents: string[] }[];
  totalDownload: string;
}

const PROFILES: Record<string, LLMProfile> = {
  small: {
    name: 'SMALL',
    minRAM: 8,
    models: [
      { role: 'All agents', model: 'qwen2.5:7b', size: '4.4GB', agents: ['all'] },
    ],
    totalDownload: '~4GB',
  },
  medium: {
    name: 'MEDIUM',
    minRAM: 16,
    models: [
      { role: 'Strategy & Analysis', model: 'qwen3:14b', size: '8.7GB', agents: ['counsely','tasky','finy','legaly','skepty','audity','quanty','hedgy'] },
      { role: 'Research & Creative', model: 'gemma3:12b', size: '7.3GB', agents: ['searchy','buzzy','wordy','pixely','edity','logoy','growthy','helpy','clicky','selly','globy','fieldy'] },
      { role: 'Dev & Ops', model: 'qwen2.5:7b', size: '4.4GB', agents: ['buildy','stacky','testy','watchy','opsy','guardy','hiry','evaly','tradey','valuey'] },
    ],
    totalDownload: '~20GB',
  },
  large: {
    name: 'LARGE',
    minRAM: 32,
    models: [
      { role: 'Strategy (C-Suite)', model: 'qwen3:32b', size: '20GB', agents: ['counsely','tasky'] },
      { role: 'Analysis & Risk', model: 'gemma3:27b', size: '17GB', agents: ['finy','legaly','skepty','audity','quanty','hedgy','valuey','tradey'] },
      { role: 'Research & Creative', model: 'qwen3:14b', size: '8.7GB', agents: ['searchy','buzzy','wordy','pixely','edity','logoy','growthy','helpy','clicky','selly','globy','fieldy'] },
      { role: 'Dev & Ops', model: 'qwen2.5:14b', size: '9GB', agents: ['buildy','stacky','testy','watchy','opsy','guardy','hiry','evaly'] },
    ],
    totalDownload: '~55GB',
  },
  xlarge: {
    name: 'X-LARGE',
    minRAM: 64,
    models: [
      { role: 'Strategy (C-Suite)', model: 'qwen3:32b', size: '20GB', agents: ['counsely','tasky'] },
      { role: 'Analysis & Risk', model: 'llama3.3:70b', size: '42GB', agents: ['skepty','audity','quanty','hedgy'] },
      { role: 'Finance & Legal', model: 'gemma3:27b', size: '17GB', agents: ['finy','legaly','valuey','tradey'] },
      { role: 'Research & Creative', model: 'qwen3:14b', size: '8.7GB', agents: ['searchy','buzzy','wordy','pixely','edity','logoy','growthy','helpy','clicky','selly','globy','fieldy'] },
      { role: 'Dev & Ops', model: 'qwen2.5:14b', size: '9GB', agents: ['buildy','stacky','testy','watchy','opsy','guardy','hiry','evaly'] },
    ],
    totalDownload: '~97GB',
  },
};

function recommendProfile(ram: number): string {
  if (ram >= 64) return 'xlarge';
  if (ram >= 32) return 'large';
  if (ram >= 16) return 'medium';
  return 'small';
}

// ─── Cloud Provider Config ───
interface CloudProviderInfo {
  name: string;
  envKey: string;
  testUrl: string;
  defaultModel: string;
  buildTestBody: (apiKey: string) => { url: string; headers: Record<string, string>; body: string };
}

const CLOUD_PROVIDERS: Record<string, CloudProviderInfo> = {
  openai: {
    name: 'OpenAI',
    envKey: 'OPENAI_API_KEY',
    testUrl: 'https://api.openai.com/v1/models',
    defaultModel: 'gpt-4o',
    buildTestBody: (apiKey: string) => ({
      url: 'https://api.openai.com/v1/models',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: '',
    }),
  },
  anthropic: {
    name: 'Anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    testUrl: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-sonnet-4-20250514',
    buildTestBody: (apiKey: string) => ({
      url: 'https://api.anthropic.com/v1/messages',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    }),
  },
  google: {
    name: 'Google',
    envKey: 'GOOGLE_API_KEY',
    testUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    defaultModel: 'gemini-2.0-flash',
    buildTestBody: (apiKey: string) => ({
      url: `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      headers: {},
      body: '',
    }),
  },
};

// ─── Ollama Check ───
function checkOllama(): boolean {
  try {
    execSync('ollama --version 2>/dev/null', { encoding: 'utf-8' });
    return true;
  } catch { return false; }
}

function getInstalledModels(): string[] {
  try {
    const output = execSync('ollama list 2>/dev/null', { encoding: 'utf-8' });
    return output.split('\n').slice(1).map(l => l.split(/\s+/)[0]).filter(Boolean);
  } catch { return []; }
}

// ─── Agent Config Generator ───
function generateOllamaConfig(profile: LLMProfile): void {
  const agentToModel: Record<string, string> = {};

  for (const group of profile.models) {
    for (const agentId of group.agents) {
      if (agentId === 'all') {
        const allAgents = ['counsely','tasky','finy','legaly','skepty','audity',
          'pixely','buildy','testy','buzzy','wordy','edity','searchy',
          'growthy','logoy','helpy','clicky','selly','stacky','watchy',
          'guardy','hiry','evaly','quanty','tradey','globy','fieldy',
          'hedgy','valuey','opsy'];
        allAgents.forEach(a => agentToModel[a] = group.model);
      } else {
        agentToModel[agentId] = group.model;
      }
    }
  }

  const profilePath = path.join(process.cwd(), 'data', 'llm-profile.json');
  fs.mkdirSync(path.dirname(profilePath), { recursive: true });
  fs.writeFileSync(profilePath, JSON.stringify({
    provider: 'ollama',
    profile: profile.name,
    ram: `${Math.round(os.totalmem() / (1024 ** 3))}GB`,
    generatedAt: new Date().toISOString(),
    agentModels: agentToModel,
    models: profile.models.map(m => ({ role: m.role, model: m.model })),
    agents: {},
  }, null, 2));

  console.log(`\n  \x1b[32m\u2705 Profile saved to data/llm-profile.json\x1b[0m`);
}

function generateCloudConfig(providerKey: string): void {
  const profilePath = path.join(process.cwd(), 'data', 'llm-profile.json');
  fs.mkdirSync(path.dirname(profilePath), { recursive: true });

  const analysisAgents = ['counsely','tasky','finy','legaly','skepty','audity','quanty','hedgy','valuey','growthy'];
  const utilityAgents = ['pixely','buildy','testy','buzzy','wordy','edity','searchy',
    'logoy','helpy','clicky','selly','stacky','watchy','guardy','hiry','evaly','tradey','globy','fieldy','opsy'];

  const defaults: Record<string, { analysis: string; utility: string }> = {
    openai: { analysis: 'gpt-4o', utility: 'gpt-4o-mini' },
    anthropic: { analysis: 'claude-sonnet-4-20250514', utility: 'claude-sonnet-4-20250514' },
    google: { analysis: 'gemini-2.0-flash', utility: 'gemini-2.0-flash' },
  };

  const d = defaults[providerKey];
  const agents: Record<string, { provider: string; model: string }> = {};
  for (const a of analysisAgents) agents[a] = { provider: providerKey, model: d.analysis };
  for (const a of utilityAgents) agents[a] = { provider: providerKey, model: d.utility };

  fs.writeFileSync(profilePath, JSON.stringify({
    provider: providerKey,
    profile: 'CLOUD',
    generatedAt: new Date().toISOString(),
    agents,
  }, null, 2));

  console.log(`\n  \x1b[32m\u2705 Cloud profile saved to data/llm-profile.json\x1b[0m`);
}

function generateMixedConfig(assignments: Record<string, { provider: string; model: string }>): void {
  const profilePath = path.join(process.cwd(), 'data', 'llm-profile.json');
  fs.mkdirSync(path.dirname(profilePath), { recursive: true });

  fs.writeFileSync(profilePath, JSON.stringify({
    provider: 'mixed',
    profile: 'MIXED',
    generatedAt: new Date().toISOString(),
    agents: assignments,
  }, null, 2));

  console.log(`\n  \x1b[32m\u2705 Mixed profile saved to data/llm-profile.json\x1b[0m`);
}

// ─── .env Helper ───
function updateEnvFile(key: string, value: string): void {
  const envPath = path.join(process.cwd(), '.env');
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf-8');
  }

  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content += `\n${key}=${value}`;
  }
  fs.writeFileSync(envPath, content.trim() + '\n');
}

// ─── API Key Validation ───
async function validateApiKey(providerKey: string, apiKey: string): Promise<boolean> {
  const provider = CLOUD_PROVIDERS[providerKey];
  if (!provider) return false;

  try {
    const test = provider.buildTestBody(apiKey);
    const opts: RequestInit = {
      method: test.body ? 'POST' : 'GET',
      headers: test.headers,
    };
    if (test.body) opts.body = test.body;

    const response = await fetch(test.url, opts);
    // For OpenAI and Google, a 200 on the models list means valid key
    // For Anthropic, even a 200 on the test message means valid
    return response.ok || response.status === 201;
  } catch {
    return false;
  }
}

// ─── Model Pull ───
async function pullModels(profile: LLMProfile): Promise<void> {
  const installed = getInstalledModels();
  const needed = [...new Set(profile.models.map(m => m.model))];
  const toPull = needed.filter(m => !installed.some(i => i.startsWith(m.split(':')[0])));

  if (toPull.length === 0) {
    console.log('\n  \x1b[32m\u2705 All models already installed!\x1b[0m');
    return;
  }

  console.log(`\n  \ud83d\udce5 Pulling ${toPull.length} model(s)...\n`);
  for (const model of toPull) {
    console.log(`  \u23f3 Pulling ${model}...`);
    try {
      execSync(`ollama pull ${model}`, { stdio: 'inherit' });
      console.log(`  \x1b[32m\u2705 ${model} done\x1b[0m`);
    } catch (e) {
      console.log(`  \x1b[31m\u274c Failed to pull ${model}\x1b[0m`);
    }
  }
}

// ─── Mixed Provider Setup ───
const ROLE_GROUPS = {
  'Analysis (C-Suite, Risk, Finance)': ['counsely','tasky','finy','legaly','skepty','audity','quanty','hedgy','valuey'],
  'Verification (QA, Security, Audit)': ['testy','guardy','evaly','watchy'],
  'Execution (Dev, Ops, Marketing)': ['buildy','stacky','opsy','growthy','buzzy','selly','clicky','hiry','tradey'],
  'Support (Content, Research, Design)': ['wordy','edity','pixely','searchy','logoy','helpy','globy','fieldy'],
};

const PROVIDER_DEFAULTS: Record<string, string> = {
  ollama: 'qwen3:32b',
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
  google: 'gemini-2.0-flash',
};

// ── DB Provider Selection ──
async function setupDatabase(ask: (q: string) => Promise<string>): Promise<void> {
  console.log('
  [1m? Choose your database:[0m
');
  console.log('    1. SQLite  (local file, zero setup) [recommended for getting started]');
  console.log('    2. PostgreSQL (production-ready, requires connection string)');
  console.log('    3. Supabase (cloud PostgreSQL with extras, free tier available)
');

  const dbChoice = (await ask('  Your choice [1]: ')).trim() || '1';

  const dbMap: Record<string, string> = { '1': 'sqlite', '2': 'postgres', '3': 'supabase' };
  const selectedDb = dbMap[dbChoice] || 'sqlite';

  updateEnvFile('DB_PROVIDER', selectedDb);

  if (selectedDb === 'sqlite') {
    console.log('
  [32m✅ SQLite selected — zero configuration needed[0m');
    const dataDir = path.join(process.cwd(), 'data');
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('  [32m✅ SQLite database ready (data/y-company.db)[0m');
    return;
  }

  if (selectedDb === 'postgres') {
    const dbUrl = (await ask('  Enter PostgreSQL connection URL: ')).trim();
    if (!dbUrl) {
      console.log('  [33m⚠️  No URL provided. Falling back to SQLite.[0m');
      updateEnvFile('DB_PROVIDER', 'sqlite');
      return;
    }
    updateEnvFile('DATABASE_URL', dbUrl);
    console.log('  [90mTesting connection...[0m');
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Pool } = require('pg');
      const pool = new Pool({ connectionString: dbUrl, connectionTimeoutMillis: 5000 });
      await pool.query('SELECT 1');
      console.log('  [32m✅ PostgreSQL connection successful![0m');
      console.log('  [90mCreating tables...[0m');
      const schemaPath = path.join(process.cwd(), 'sql', 'postgres-schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        await pool.query(schema);
        console.log('  [32m✅ Tables created successfully[0m');
      } else {
        console.log('  [33m⚠️  Schema file not found at sql/postgres-schema.sql[0m');
      }
      await pool.end();
    } catch (e) {
      console.log('  [33m⚠️  Connection test failed: ' + (e as Error).message + '[0m');
      console.log('  [90mSaved config anyway — fix the connection and restart.[0m');
    }
    return;
  }

  if (selectedDb === 'supabase') {
    const supaUrl = (await ask('  Enter Supabase URL: ')).trim();
    const supaKey = (await ask('  Enter Supabase Service Role Key: ')).trim();
    if (!supaUrl || !supaKey) {
      console.log('  [33m⚠️  Missing Supabase credentials. Falling back to SQLite.[0m');
      updateEnvFile('DB_PROVIDER', 'sqlite');
      return;
    }
    updateEnvFile('SUPABASE_URL', supaUrl);
    updateEnvFile('SUPABASE_SERVICE_KEY', supaKey);
    console.log('  [32m✅ Supabase credentials saved[0m');
    console.log('  [90mNote: Create tables using sql/postgres-schema.sql in Supabase SQL Editor[0m');
  }
}

// ─── Main ───
async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string): Promise<string> => new Promise(r => rl.question(q, r));

  console.log('\n  \x1b[1m\ud83c\udfe2 _y Holdings \u2014 Setup Wizard\x1b[0m\n');
  console.log('  \x1b[90m"30 agents. 10 floors. Your machine."\x1b[0m\n');

  // \u2500\u2500 Step 0: Provider Selection \u2500\u2500
  console.log('  \x1b[1m? Choose your LLM provider:\x1b[0m\n');
  console.log('    1. Ollama  (local, free, requires 8GB+ RAM)');
  console.log('    2. OpenAI  (GPT-4o, requires API key)');
  console.log('    3. Anthropic (Claude, requires API key)');
  console.log('    4. Google  (Gemini, requires API key)');
  console.log('    5. Mixed   (different providers per role)\n');

  const providerChoice = (await ask('  Your choice [1]: ')).trim() || '1';

  const providerMap: Record<string, string> = {
    '1': 'ollama', '2': 'openai', '3': 'anthropic', '4': 'google', '5': 'mixed',
  };
  const selectedProvider = providerMap[providerChoice] || 'ollama';

  console.log(`\n  \x1b[1m\u2192 Selected: ${selectedProvider.toUpperCase()}\x1b[0m\n`);

  // Save provider to .env
  updateEnvFile('LLM_PROVIDER', selectedProvider);

  // \u2500\u2500 Cloud Provider Flow \u2500\u2500
  if (selectedProvider === 'openai' || selectedProvider === 'anthropic' || selectedProvider === 'google') {
    const provider = CLOUD_PROVIDERS[selectedProvider];
    const apiKey = (await ask(`  Enter your ${provider.name} API key: `)).trim();

    if (!apiKey) {
      console.log('  \x1b[31m\u274c No API key provided. Exiting.\x1b[0m\n');
      rl.close();
      process.exit(1);
    }

    console.log('  \x1b[90mValidating API key...\x1b[0m');
    const valid = await validateApiKey(selectedProvider, apiKey);

    if (valid) {
      console.log('  \x1b[32m\u2705 API key valid!\x1b[0m');
      updateEnvFile(provider.envKey, apiKey);
      generateCloudConfig(selectedProvider);
    } else {
      console.log('  \x1b[33m\u26a0\ufe0f  Could not validate API key. Saving anyway.\x1b[0m');
      updateEnvFile(provider.envKey, apiKey);
      generateCloudConfig(selectedProvider);
    }

    // Init DB
    console.log('\n  \ud83d\udce6 Initializing database...');
    const dataDir = path.join(process.cwd(), 'data');
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('  \x1b[32m\u2705 SQLite database ready\x1b[0m');

    console.log('\n  \x1b[1m\ud83c\udf89 Setup complete!\x1b[0m');
    console.log(`\n  Provider: ${selectedProvider.toUpperCase()} | Model: ${provider.defaultModel} | Agents: 30\n`);
    rl.close();
    return;
  }

  // \u2500\u2500 Mixed Provider Flow \u2500\u2500
  if (selectedProvider === 'mixed') {
    console.log('  \x1b[1mAssign providers to role groups:\x1b[0m\n');
    console.log('  Available providers: ollama, openai, anthropic, google\n');

    const assignments: Record<string, { provider: string; model: string }> = {};
    const groups = Object.entries(ROLE_GROUPS);

    for (const [groupName, agents] of groups) {
      const choice = (await ask(`  ${groupName}: `)).trim().toLowerCase() || 'ollama';
      const prov = ['ollama', 'openai', 'anthropic', 'google'].includes(choice) ? choice : 'ollama';
      const model = PROVIDER_DEFAULTS[prov] || 'qwen2.5:7b';

      for (const agentId of agents) {
        assignments[agentId] = { provider: prov, model };
      }

      console.log(`    \x1b[32m\u2192 ${prov}/${model}\x1b[0m`);
    }

    // Collect needed API keys
    const neededProviders = new Set(Object.values(assignments).map(a => a.provider));
    for (const prov of neededProviders) {
      if (prov !== 'ollama' && CLOUD_PROVIDERS[prov]) {
        const info = CLOUD_PROVIDERS[prov];
        const apiKey = (await ask(`\n  Enter ${info.name} API key: `)).trim();
        if (apiKey) {
          updateEnvFile(info.envKey, apiKey);
          console.log(`  \x1b[32m\u2705 ${info.name} key saved\x1b[0m`);
        }
      }
    }

    generateMixedConfig(assignments);

    // Check if Ollama needed
    if (neededProviders.has('ollama')) {
      if (!checkOllama()) {
        console.log('\n  \x1b[33m\u26a0\ufe0f  Ollama not found. Install from https://ollama.ai for local models.\x1b[0m');
      }
    }

    console.log('\n  \ud83d\udce6 Initializing database...');
    const dataDir = path.join(process.cwd(), 'data');
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('  \x1b[32m\u2705 SQLite database ready\x1b[0m');

    console.log('\n  \x1b[1m\ud83c\udf89 Setup complete!\x1b[0m');
    console.log(`\n  Provider: MIXED | Agents: 30\n`);
    rl.close();
    return;
  }

  // \u2500\u2500 Ollama Flow (existing) \u2500\u2500

  // 1. Hardware detection
  console.log('  \ud83d\udd0d Detecting hardware...');
  const hw = detectHardware();
  console.log(`     CPU: ${hw.cpuModel} (${hw.cpuCores}-core)`);
  console.log(`     RAM: ${hw.totalRAM}GB`);
  console.log(`     GPU: ${hw.gpu}`);
  console.log(`     OS:  ${hw.platform} ${hw.arch}`);

  // 2. Ollama check
  console.log('\n  \ud83d\udd0d Checking Ollama...');
  if (!checkOllama()) {
    console.log('  \x1b[31m\u274c Ollama not found!\x1b[0m');
    console.log('  Install from: https://ollama.ai');
    console.log('  Then run this setup again.\n');
    rl.close();
    process.exit(1);
  }
  const installed = getInstalledModels();
  console.log(`     Ollama: \u2705 (${installed.length} model(s) installed)`);

  // 3. Recommend profile
  const recommended = recommendProfile(hw.totalRAM);
  const profile = PROFILES[recommended];

  console.log(`\n  \ud83d\udcca \x1b[1mRecommended: ${profile.name} profile\x1b[0m (${hw.totalRAM}GB RAM)\n`);
  console.log('  \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510');
  console.log('  \u2502 Role                 \u2502 Model            \u2502 Size   \u2502');
  console.log('  \u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524');
  for (const m of profile.models) {
    const role = m.role.padEnd(20);
    const model = m.model.padEnd(16);
    const size = m.size.padEnd(6);
    console.log(`  \u2502 ${role} \u2502 ${model} \u2502 ${size} \u2502`);
  }
  console.log('  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518');
  console.log(`\n  Total download: ${profile.totalDownload}`);

  // 4. User choice
  console.log('\n  Options:');
  console.log('  [Y] Apply this profile');
  console.log('  [S] Small  \u2014 qwen2.5:7b only (~4GB)');
  console.log('  [M] Medium \u2014 qwen3:14b + gemma3:12b (~20GB)');
  console.log('  [L] Large  \u2014 qwen3:32b + gemma3:27b (~55GB)');
  console.log('  [X] X-Large \u2014 + llama3.3:70b (~97GB)');
  console.log('  [Q] Quit\n');

  const choice = (await ask('  Your choice [Y]: ')).trim().toLowerCase() || 'y';

  let selectedProfile: LLMProfile;
  switch (choice) {
    case 'y': selectedProfile = profile; break;
    case 's': selectedProfile = PROFILES.small; break;
    case 'm': selectedProfile = PROFILES.medium; break;
    case 'l': selectedProfile = PROFILES.large; break;
    case 'x': selectedProfile = PROFILES.xlarge; break;
    case 'q': console.log('\n  Bye!\n'); rl.close(); return;
    default: selectedProfile = profile;
  }

  console.log(`\n  \x1b[1m\u2192 Applying ${selectedProfile.name} profile\x1b[0m`);

  // 5. Generate config
  generateOllamaConfig(selectedProfile);

  // 6. Pull models
  const doPull = (await ask('\n  Pull missing models now? [Y/n]: ')).trim().toLowerCase();
  if (doPull !== 'n') {
    await pullModels(selectedProfile);
  }

  // 7. Init SQLite
  console.log('\n  \ud83d\udce6 Initializing database...');
  const dataDir = path.join(process.cwd(), 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('  \x1b[32m\u2705 SQLite database ready (data/y-company.db)\x1b[0m');

  console.log('\n  \x1b[1m\ud83c\udf89 Setup complete!\x1b[0m');
  console.log('\n  Next steps:');
  console.log('    1. npm run dev');
  console.log('    2. Open http://localhost:3000');
  console.log('    3. Connect your company URL');
  console.log(`\n  Profile: ${selectedProfile.name} | Models: ${selectedProfile.models.length} | Agents: 30\n`);

  rl.close();
}

main().catch(console.error);

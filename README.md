# _y — A Visual Layer for AI Agent Orchestration

[![CI](https://github.com/antryu2b/_y/actions/workflows/ci.yml/badge.svg)](https://github.com/antryu2b/_y/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-407_passing-brightgreen.svg)](./__tests__)
[![Agents](https://img.shields.io/badge/agents-30-purple.svg)](./src/data/agent-config.ts)

> See what your AI agents are actually doing.
>
> Independent analysis. Visual tracking. Structured synthesis. Local-first.

![Visual AI Agent Orchestration Dashboard — _y](./docs/demo.gif)

## What is this?

_y is a visual orchestration layer for AI agents. Most multi-agent frameworks run in a terminal — logs scroll, JSON outputs, you have no idea what's happening between agents.

_y makes agent work **visible**. See who's analyzing what, how reports flow between functions, where agents disagree, and which LLM provider catches what the others miss. Configure agents for your business functions — marketing, engineering, risk, finance — and watch them work independently before a synthesis agent combines everything.

Run locally with **Ollama** (free), or use cloud LLMs (OpenAI, Anthropic, Google). Mix different providers per function for broader coverage.

## What You Get

Connect your business URL and _y's agents go to work:

### 📊 Strategic Reports
Each department analyzes your business independently:

```
┌─────────────────────────────────────────────────────────┐
│ REPORT: Market Positioning Analysis                     │
│ Agent: Searchy (5F Marketing)                           │
│ Model: gemini-2.0-flash                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Finding: Target site ranks #47 for primary keyword      │
│ "AI automation" — competitors hold positions #3-#12.    │
│                                                         │
│ Recommendation: Focus on long-tail keywords             │
│ "AI company builder" and "local LLM agents" where       │
│ competition is 10x lower.                               │
│                                                         │
│ Risk: Skepty (8F Risk) flags keyword cannibalization    │
│ between blog and product pages.                         │
│                                                         │
│ Status: PENDING REVIEW → Chairman Dashboard             │
└─────────────────────────────────────────────────────────┘
```

### 🏛️ Decision Pipeline
Reports flow through a structured chain — not a chatbot:

```
URL Input → Agent Analysis (independent, parallel)
         → Cross-Department Review
         → Skepty Challenge (independent oversight)
         → Counsely Synthesis (Chief of Staff)
         → Chairman Decision (you)
```

### 🔄 What the agents actually do

| Agent | Department | Example Output |
|-------|-----------|----------------|
| **Searchy** | Marketing | SEO audit, competitor keyword gaps |
| **Buildy** | Engineering | Tech stack analysis, performance bottlenecks |
| **Finy** | Capital | Revenue model assessment, unit economics |
| **Skepty** | Risk | Flags blind spots in other agents' reports |
| **Buzzy** | Content | Content strategy, social media positioning |
| **Counsely** | Chairman Office | Synthesizes all reports into executive brief |

> **Key:** No agent sees another's analysis until review phase. This prevents groupthink — the Byzantine Principle in practice.



## Quick Start

```bash
# 1. Clone
git clone https://github.com/antryu2b/_y.git
cd _y

# 2. Install
npm install

# 3. Setup (auto-detects your hardware, recommends models)
npm run setup

# 4. Start
npm run dev

# 5. Start the chat worker (in another terminal)
npm run chat-worker
```

Open [http://localhost:3000](http://localhost:3000) and connect your company.

## Hardware-Aware Setup

The setup wizard detects your RAM/GPU and recommends the optimal model profile:

| Profile | RAM | Models | Download |
|---------|-----|--------|----------|
| SMALL | 8GB | qwen2.5:7b | ~4GB |
| MEDIUM | 16GB | qwen3:14b + gemma3:12b | ~20GB |
| LARGE | 32GB | qwen3:32b + gemma3:27b | ~55GB |
| X-LARGE | 64GB+ | + llama3.3:70b | ~97GB |

The setup automatically pulls Ollama models and generates a `llm-profile.json` for optimal agent-model matching.

## LLM Providers

Choose your AI backend during setup:

| Provider | Models | Cost | Requirements |
|----------|--------|------|-------------|
| **Ollama** (default) | Qwen3, Gemma3, Llama3, ExaOne | Free | 8GB+ RAM, Ollama installed |
| **OpenAI** | GPT-4o, GPT-4o-mini | Pay per token | API key |
| **Anthropic** | Claude Sonnet, Claude Opus | Pay per token | API key |
| **Google** | Gemini Flash, Gemini Pro | Free tier available | API key |
| **Mixed** ⭐ | Any combination above | Varies | Multiple keys |

**Mixed mode** is where _y shines — assign different providers to different departments:

```env
# .env
LLM_PROVIDER=mixed
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AI...
```

```json
// llm-profile.json (auto-generated by setup)
{
  "provider": "mixed",
  "agents": {
    "counsely": { "provider": "anthropic", "model": "claude-sonnet-4-20250514" },
    "skepty": { "provider": "openai", "model": "gpt-4o" },
    "searchy": { "provider": "google", "model": "gemini-2.0-flash" },
    "buildy": { "provider": "ollama", "model": "qwen3:32b" }
  }
}
```

Byzantine Principle in action: analysis (Gemini) → challenge (GPT-4o) → synthesis (Claude). Different companies, different architectures, different blind spots.

## Database

_y supports three database backends:

### SQLite (Default)
Zero configuration. Data stored locally in `data/y-company.db`.

```bash
# No setup needed — tables auto-created on first run
```

### PostgreSQL
For production deployments with multiple users.

```bash
# Set in .env:
DB_PROVIDER=postgres
DATABASE_URL=postgresql://user:password@localhost:5432/y_company

# Create tables:
psql $DATABASE_URL < sql/postgres-schema.sql
```

### Supabase
Cloud PostgreSQL with authentication and realtime features.

```bash
# Set in .env:
DB_PROVIDER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Create tables in Supabase SQL Editor:
# Copy contents of sql/postgres-schema.sql
```

### Storage Location (SQLite)
```
data/y-company.db
```

### Tables (auto-created)
| Table | Purpose |
|-------|---------|
| `conversations` | Agent chat history |
| `reports` | Agent-generated reports |
| `decisions` | Decision pipeline items |
| `agent_memory` | Agent knowledge & memories |
| `chat_queue` | LLM request queue (worker processes these) |
| `meetings` | War Room meeting records |
| `schedules` | Scheduled operations |
| `directives` | Chairman directives |
| `trades` | Trading records |
| `connected_companies` | Connected subsidiary companies |

### Backup
```bash
cp data/y-company.db data/y-company-backup.db
```

### Reset
```bash
rm data/y-company.db
# Tables will be re-created on next start
```

## The Philosophy

> **"No Consensus, Just Counsel"**

Most multi-agent frameworks let AI agents vote and reach consensus. We don\'t. Based on research into the [Byzantine Generals Problem in LLM agents](https://arxiv.org/abs/2311.04838), democratic consensus among AI agents is structurally unreliable.

Instead: Each agent analyzes independently → They discuss in meetings → Counsely synthesizes → **You decide.** The human stays in the loop.

30 agents, zero consensus — by design.

## Features

- **🏢 10-Floor Virtual Tower** — Each floor houses a different department
- **🔍 Company Analysis** — Connect your URL, agents analyze your business
- **⚔️ War Room** — Run meetings with your AI team on any topic
- **📊 Chairman Dashboard** — Issue directives, approve decisions, view reports
- **📡 Directive Pipeline** — Chairman → Counsely assigns agents → execution → report
- **🌍 Bilingual** — English / Korean toggle

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│  Next.js App    │     │  Chat Worker    │
│  (Frontend +    │     │  (Background    │
│   API Routes)   │     │   LLM Caller)   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └────────┬───────────┘
                │
         ┌──────┴──────┐     ┌─────────────────┐
         │  SQLite DB   │     │  LLM Provider   │
         │  (Local)     │     │  Ollama/OpenAI/ │
         └─────────────┘     │  Anthropic/    │
                              │  Google         │
                              └─────────────────┘
```

Local or cloud. Your choice.

## Corporate Hierarchy

Unlike flat agent frameworks, _y agents have ranks and reporting lines — just like a real company:

```
Chairman (You)
├── Counsely — Chief of Staff (synthesis, final briefing)
├── Tasky — Planning Director
│   ├── Finy (Finance) · Legaly (Legal)
│   ├── Buzzy → Wordy, Edity, Searchy (Content)
│   ├── Growthy → Logoy, Helpy, Clicky, Selly (Marketing)
│   ├── Stacky → Watchy, Guardy (ICT)
│   ├── Hiry → Evaly (HR)
│   ├── Buildy → Pixely, Testy (Engineering)
│   └── Opsy (Operations)
├── Skepty — Risk Director (independent challenge)
├── Audity — Audit (independent review)
└── Quanty — Capital Director
    └── Tradey, Globy, Fieldy, Hedgy, Valuey
```

**Key design:** Risk (Skepty) and Audit (Audity) report directly to the Chairman — never to the departments they review. Just like a real corporate governance structure.

## The 30 Agents

| Floor | Department | Agents | Default LLM |
|-------|-----------|--------|-------------|
| 10F | Chairman\'s Office | Counsely (Chief of Staff) | Largest available |
| 9F | Planning | Tasky, Finy, Legaly | Strategy model |
| 8F | Risk & Audit | Skepty, Audity | Analysis model |
| 7F | Engineering | Pixely, Buildy, Testy | Dev model |
| 6F | Content | Buzzy, Wordy, Edity, Searchy | Research model |
| 5F | Marketing | Growthy, Logoy, Helpy, Clicky, Selly | Research model |
| 4F | ICT | Stacky, Watchy, Guardy | Dev model |
| 3F | HR | Hiry, Evaly | Analysis model |
| 2F | Capital | Quanty, Tradey, Globy, Fieldy, Hedgy, Valuey | Analysis model |
| 1F | Operations | Opsy | Dev model |

**Byzantine Principle**: Agents on the same issue with analysis ↔ check ↔ synthesis roles use different LLM architectures to avoid correlated failures.

## Adding Custom Agents

```typescript
// src/data/agent-config.ts
{
  id: \'datay\',
  number: \'31\',
  name: \'Datay\',
  tier: \'Manager\',
  floor: 4,
  department: \'ICT Division\',
  reportTo: \'stacky\',
  llm: LLM_MODELS.qwen3_32b,
  role: \'analyst\',
  desc: \'Data Engineering\',
  emoji: \'\'
}

// Add photo: public/agents/datay.png
// Add persona: src/data/personas.ts
```

## Directive Pipeline

The core execution engine:

1. **Chairman issues directive** (Dashboard)
2. **Counsely assigns agents** (Ollama AI selection)
3. **Agents execute** (chat_queue → worker → Ollama)
4. **Report generated** (auto-compiled from all responses)

```
POST /api/directives        → Create directive
POST /api/directive/assign   → AI agent assignment
POST /api/directive/execute  → Queue agent tasks
POST /api/directive/complete → Compile report
GET  /api/directive/status   → Poll progress
```

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS, shadcn/ui
- **Database**: SQLite (better-sqlite3) — zero config
- **AI**: Ollama (local) / OpenAI / Anthropic / Google — your choice
- **Icons**: Lucide React

## Prerequisites

- Node.js 18+
- **Option A (Local):** [Ollama](https://ollama.ai) installed + 8GB+ RAM
- **Option B (Cloud):** API key from OpenAI, Anthropic, or Google

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Structure

| Category | Path | What it covers |
|----------|------|----------------|
| **Validation** | `__tests__/validation/` | No hardcoded keys, required files, dead imports |
| **Unit** | `__tests__/unit/` | Personas, LLM config, company registry |
| **Integration** | `__tests__/integration/` | Directive flow, API routes, data consistency |
| **Data** | `__tests__/data/` | Agent roster (30), floors (10), company config |


## License

MIT — see [LICENSE](./LICENSE)

## FAQ

### What is visual AI orchestration?
Visual AI orchestration lets you see what multiple AI agents are doing in real-time — who's analyzing what, where they disagree, and how their work combines into a final output. _y provides this as an open-source dashboard for multi-agent workflows.

### How is _y different from CrewAI or AutoGen?
CrewAI and AutoGen are agent frameworks — you wire agents together in code. _y is a visual orchestration layer: agents are organized by business function, work independently without seeing each other's output, and you watch the entire flow from analysis to synthesis in a UI. Different LLM providers per function means different blind spots get covered.

### Can I run AI agents locally for free?
Yes. _y works with Ollama on laptops with 8GB RAM or more. The setup wizard detects your hardware and picks appropriate models automatically. No API keys needed for local mode.

### What LLMs does _y support?
Ollama (Qwen, Gemma, Llama), OpenAI (GPT-4o), Anthropic (Claude), and Google (Gemini). You can mix different providers per function — for example, risk analysis on GPT-4o while operations run on local Qwen.

### Why independent analysis instead of agent consensus?
LLM-based agents anchor to whoever speaks first, and similar training data produces similar blind spots. Independent analysis with structured synthesis gives broader coverage and lets you spot where individual models fail.

### What can I use _y for?
Business analysis (SEO, risk, market positioning), strategic planning, content strategy, technical audits. Connect your business URL and agents produce independent reports that get synthesized into an executive brief.

## Keywords

`visual ai orchestration` · `multi-agent framework` · `ai agent dashboard` · `local llm orchestration` · `ollama multi-agent` · `ai workflow visualization` · `independent agent analysis` · `multi-llm routing` · `agent observability` · `ai company builder` · `crewai alternative` · `autogen alternative` · `local-first ai` · `agent hierarchy`

## Links

- 🐦 [Twitter/X](https://x.com/_yholdings)
- 🌐 [Live Demo (Cloud version)](https://y-company-oss.vercel.app)

---

*Visual AI agent orchestration — independent analysis, structured synthesis, local-first. Built for builders who want to see what their agents are doing.*

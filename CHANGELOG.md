# Changelog

## v1.0.0 (2026-03-18)

### 🏢 Core
- 30 AI agents across 10 organizational floors
- Interactive tower visualization with floor navigation
- Agent personas in Korean + English (bilingual toggle)
- `company.yml` configuration for custom AI companies

### 📋 Directive Pipeline
- Chairman → Counsely AI auto-assigns agents → parallel execution → consolidated report
- Real-time workflow graph with agent status (queued/analyzing/done)
- Status flow: Pending → Approval → Executing → Completed
- Cinematic execution view with confetti on completion

### 🏭 Multi-Company Support
- Connect companies by URL scan or manual input
- 12 industry types with tailored agent recommendations
- Subsidiary management (Holdings → connected companies)
- Company-scoped reports and decisions

### 🤖 LLM Integration
- 8 different LLM models across 30 agents
- Byzantine fault tolerance (diverse models per analysis group)
- Hardware-aware setup wizard (`npm run setup`)
- Ollama for local/free, zero API keys required

### 📊 Dashboard
- Chairman's dashboard with real-time agent status
- Scheduled operations panel
- Report timeline with bilingual content
- Decision pipeline with approve/reject/delete

### 🧪 Testing
- 16 test suites, 407 tests
- Code quality validation (key scanning, dead imports)
- Unit tests (personas, LLM config)
- Integration tests (directive flow, data consistency)

### 📄 Open Source
- AGPL v3 license
- Zero API keys required (Ollama)
- SQLite for zero-setup persistence
- `.env.example` with documented variables
- Comprehensive README with architecture diagrams

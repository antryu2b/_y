# Contributing to _y

Thanks for your interest in contributing! Here's how to get started.

## Quick Start

1. Fork the repo
2. Clone your fork
3. Install dependencies: `npm install`
4. Copy `.env.example` to `.env` and configure
5. Run `npm run setup` to detect hardware and configure LLMs
6. Run `npm run dev`

## Before Submitting a PR

```bash
# Make sure everything passes
npm test          # All tests must pass
npm run build     # Build must succeed
```

## Code Style

- TypeScript strict mode
- Tailwind CSS for styling (dark theme)
- Lucide icons only (no emoji in rendered UI)
- English as default language; Korean inside `lang === 'ko'` conditionals
- Agent photos via `AgentAvatar` component

## Test Structure

- `__tests__/validation/` — Code quality checks
- `__tests__/unit/` — Individual functions
- `__tests__/integration/` — Cross-module consistency
- `__tests__/data/` — Data integrity

Add tests for new features. Run `npm test` before pushing.

## Commit Messages

Use conventional format:
- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `test:` tests
- `refactor:` code restructure

## Architecture

- 30 AI agents across 10 floors
- Directive pipeline: Chairman → Counsely assigns → agents execute → report
- Byzantine principle: agents analyzing the same issue must use different LLMs
- `company.yml` for custom configurations
- SQLite for zero-setup local persistence
- Ollama for free local LLM inference

## Questions?

Open an issue or join our [Discord](https://discord.com/invite/clawd).

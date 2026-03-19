# _y Holdings — Multi-Company Architecture

## Overview
_y Tower = Holdings 본사. 공통 기능 + 계열사 플러그앤플레이.

## Companies

### _y Holdings (공통 플랫폼)
- Decision Pipeline
- 결재/보고/지시사항 시스템
- 에이전트 프레임워크 (30명)
- 타워 UI / 시뮬레이션
- 회의실 / 타임라인

### _y Capital (S&P500 트레이딩)
- **담당**: Tradey, Quanty
- **데이터**: trades 테이블 (y-company Supabase)
- **대시보드**: 트레이딩 현황, PnL, 전략 리서치
- **크론**: quanty-market-daily, tradey-strategy-research, quanty-backtest-weekly
- **API**: /api/trades

### _y SaaS (MyBidWise)
- **담당**: Watchy
- **데이터**: 외부 Supabase (ksdbrovnwphwqonexsus)
- **대시보드**: 서비스 모니터링, 유저 통계, 매출
- **크론**: watchy-mybidwise-daily
- **API**: /api/monitoring/mybidwise

---

## Interface Standard

```typescript
// src/lib/company-registry.ts

interface Company {
  id: string;              // 'holdings' | 'capital' | 'saas'
  name: string;            // '_y Holdings' | '_y Capital' | '_y SaaS'
  nameKo: string;          // '_y 홀딩스' | '_y 캐피탈' | '_y SaaS'
  icon: string;            // '🏢' | '📈' | '🏗️'
  color: string;           // tailwind accent color
  agents: string[];        // assigned agent IDs
  floors?: number[];       // tower floor assignments
  dashboardComponent: string;  // component name
  description: string;
  descriptionKo: string;
}
```

## Dashboard Layout
- 대시보드 상단: Holdings / Capital / SaaS 탭
- Holdings 탭: 기존 대시보드 (의사결정, 지시사항, 에이전트 현황)
- Capital 탭: 트레이딩 대시보드 (PnL, 포지션, 전략)
- SaaS 탭: MyBidWise 모니터링 (서버 상태, 유저, 매출)

## Agent Mapping
- Holdings 공통: Counsely, Tasky, Skepty, Audity + 나머지
- Capital 파견: Tradey, Quanty
- SaaS 파견: Watchy
- Media 공통: Buzzy, Wordy, Pixely, Edity
- Tech 공통: Buildy, Stacky, Testy, Guardy

## Data Isolation
- Holdings: aguxpfhmtzwgwxtwosek.supabase.co (decisions, reports, directives, agent_memory)
- Capital: same Supabase, trades table
- SaaS: external ksdbrovnwphwqonexsus.supabase.co

## PnP for External Users
1. Fork/clone repo
2. Edit `company.yml` — 자기 회사 정의
3. Set up Supabase / data source
4. Deploy to Vercel
5. 자기만의 AI 회사 완성

## Implementation Phases
### Phase 1 (Now)
- [ ] Company registry (company-registry.ts)
- [ ] Dashboard tab navigation (Holdings / Capital / SaaS)
- [ ] CapitalDashboard component (trade data from existing API)
- [ ] SaaSDashboard component (monitoring data from existing API)
- [ ] Move existing monitoring bars into company dashboards

### Phase 2
- [ ] Company-specific agent assignment
- [ ] Per-company report filtering
- [ ] Per-company decision filtering
- [ ] company.yml multi-company support

### Phase 3
- [ ] External user onboarding flow
- [ ] Template generator CLI
- [ ] Documentation for PnP setup

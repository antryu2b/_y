# _y Holdings — Decision Engine Architecture

## 개요

에이전트가 단발성 업무를 하고 대기하는 구조에서,
**자동으로 업무가 흘러가고, 의사결정이 이루어지고, 조직이 성장하는 구조**로 전환.

3개 핵심 엔진 + 1개 파이프라인으로 구성.

---

## 1. Decision Pipeline (의사결정 파이프라인)

### 상태 전이

```
DETECTED → ANALYZING → DISCUSSION_NEEDED → IN_DISCUSSION → 
DECISION_PENDING → APPROVAL_REQUESTED → APPROVED/REJECTED → 
EXECUTING → COMPLETED
```

### Decision 객체

```typescript
interface Decision {
  id: string;
  type: DecisionType;
  title: string;
  description: string;
  status: DecisionStatus;
  priority: 'critical' | 'high' | 'medium' | 'low';
  
  // 트리거
  trigger: {
    source: 'auto' | 'manual' | 'scheduled';
    agent_id?: string;        // 누가 감지했나
    event_type?: string;      // news, alert, report, metric
    raw_data?: any;           // 원본 데이터
  };
  
  // 참여자
  participants: {
    analyzer: string[];       // 분석 담당
    discussants: string[];    // 논의 참여자
    reviewer: string;         // Skepty (리스크 검증)
    synthesizer: string;      // Counsely (종합)
    approver: string;         // Chairman (최종)
    executors: string[];      // 실행 담당
  };
  
  // 결과물
  artifacts: {
    analysis?: string;        // 분석 결과
    discussion_log?: string;  // 논의 내용
    risk_review?: string;     // 리스크 검토
    recommendation?: string;  // Counsely 추천안
    decision?: string;        // 최종 결정
    execution_result?: string; // 실행 결과
  };
  
  // 타임라인
  created_at: string;
  updated_at: string;
  deadline?: string;
  history: StatusChange[];    // 상태 변경 이력
}
```

### 의사결정 유형 (DecisionType)

| Type | 트리거 | 분석 | 논의 | 검증 | 실행 |
|------|--------|------|------|------|------|
| `market_response` | Searchy/Quanty 감지 | Quanty+Globy | Tradey+Hedgy+Skepty | Skepty | Tradey/Quanty |
| `product_development` | Tasky 기획/버그 | Buildy+Stacky | Pixely+Testy+Tasky | Skepty+Testy | Buildy+Pixely |
| `investment` | Quanty 시그널 | Quanty+Valuey | Tradey+Hedgy+Fieldy | Skepty+Hedgy | Tradey |
| `content_publish` | Buzzy 기획/트렌드 | Wordy+Searchy | Buzzy+Growthy+Edity | Skepty | Wordy+Edity |
| `ops_incident` | Watchy 알림 | Stacky+Guardy | Watchy+Stacky | Guardy | Stacky+Guardy |
| `hiring` | Hiry 제안 | Hiry+Evaly | Hiry+Tasky | Skepty | Hiry |
| `strategy` | Chairman 지시 | Tasky+Finy | 전체 관련부서 | Skepty+Audity | Tasky |
| `risk_alert` | Skepty 경고 | Skepty+관련자 | 긴급소집 | Audity | 해당부서 |

### 자동 흐름 규칙

```
DETECTED:
  → 업무 특성 분석 (Task Router)
  → 분석 담당자 자동 배정
  → status = ANALYZING

ANALYZING:
  → 분석 완료 시
  → 논의 필요 여부 자동 판단 (복잡도/영향도 기준)
  → 단순: DECISION_PENDING으로 스킵
  → 복잡: DISCUSSION_NEEDED

DISCUSSION_NEEDED:
  → 관련 부서 자동 소집 (DecisionType 기반)
  → Meeting API 자동 호출
  → status = IN_DISCUSSION

IN_DISCUSSION:
  → 모든 참여자 의견 수집 완료
  → Skepty 리스크 리뷰 자동 트리거
  → status = DECISION_PENDING

DECISION_PENDING:
  → Counsely가 종합 + 추천안 작성
  → 회장에게 알림 (텔레그램/대시보드)
  → status = APPROVAL_REQUESTED

APPROVED:
  → 실행 담당자 자동 배정 (역량 기반)
  → status = EXECUTING

COMPLETED:
  → 결과 보고서 자동 생성
  → 참여 에이전트 역량 업데이트
  → 관련 지식 DB 저장
```

---

## 2. Task Router (자동 배정 엔진)

### 배정 알고리즘

```typescript
function assignAgent(task: Task): string {
  // 1. 업무 특성 분석
  const taskFeatures = analyzeTask(task);
  // → domain: 'investment', subtype: 'market_analysis', complexity: 'high'
  
  // 2. 후보 에이전트 필터링
  const candidates = getAgentsByDomain(taskFeatures.domain);
  // → [quanty, tradey, globy, valuey]
  
  // 3. 역량 점수 계산
  const scored = candidates.map(agent => ({
    agent,
    score: calculateScore(agent, taskFeatures)
  }));
  
  // 4. 가용성 확인
  const available = scored.filter(s => !isAgentBusy(s.agent));
  
  // 5. 최적 배정
  return available.sort((a, b) => b.score - a.score)[0].agent;
}

function calculateScore(agent: string, task: TaskFeatures): number {
  const skills = getAgentSkills(agent);  // DB 조회
  const relevantSkill = skills[task.subtype];
  
  return (
    (relevantSkill?.level || 0) * 0.4 +        // 역량 레벨 (40%)
    (relevantSkill?.success_rate || 0.5) * 0.3 + // 성공률 (30%)
    (relevantSkill?.tasks_done || 0) * 0.01 * 0.2 + // 경험치 (20%)
    (getSimilarTaskScore(agent, task)) * 0.1     // 유사 업무 이력 (10%)
  );
}
```

### 업무 특성 분석

```typescript
function analyzeTask(task: Task): TaskFeatures {
  // Gemini Flash로 분류 (thinkingBudget: 0)
  const prompt = `
    업무: ${task.title}
    내용: ${task.description}
    
    다음을 JSON으로 분류:
    - domain: investment|development|content|marketing|operations|hr|strategy|risk
    - subtype: (세부 유형)
    - complexity: low|medium|high|critical
    - required_skills: string[]
    - estimated_hours: number
    - needs_discussion: boolean
    - related_departments: string[]
  `;
  return callGemini(prompt);
}
```

---

## 3. Growth Engine (역량 성장 엔진)

### 에이전트 역량 스키마

```typescript
interface AgentCapability {
  agent_id: string;
  skills: Record<string, SkillProfile>;
  total_tasks: number;
  avg_quality: number;        // 0-1
  growth_rate: number;        // 최근 30일 성장률
  specializations: string[];  // 자동 감지된 전문 분야
  updated_at: string;
}

interface SkillProfile {
  level: number;              // 1-10
  xp: number;                 // 경험치 (누적)
  tasks_done: number;
  success_rate: number;       // 0-1
  avg_quality: number;        // 0-1 (결과물 품질)
  last_task_at: string;
  streak: number;             // 연속 성공 횟수
  notable_results: string[];  // 우수 결과물 참조
}
```

### 레벨업 공식

```typescript
function updateSkill(agent: string, skill: string, result: TaskResult) {
  const profile = getSkillProfile(agent, skill);
  
  // 경험치 계산
  const baseXP = COMPLEXITY_XP[result.complexity]; // low:10, med:25, high:50, critical:100
  const qualityBonus = result.quality * 0.5;        // 품질 보너스
  const streakBonus = profile.streak >= 3 ? 1.2 : 1.0; // 연속 성공 보너스
  const xpGain = Math.round(baseXP * (1 + qualityBonus) * streakBonus);
  
  // 레벨 계산 (로그 스케일)
  profile.xp += xpGain;
  profile.level = Math.min(10, Math.floor(Math.log2(profile.xp / 50) + 1));
  
  // 성공률 갱신 (최근 20건 가중 평균)
  profile.success_rate = updateMovingAverage(profile, result.success);
  
  // 전문 분야 자동 감지
  if (profile.level >= 5 && profile.success_rate >= 0.85) {
    addSpecialization(agent, skill);
  }
  
  // DB 저장
  saveSkillProfile(agent, skill, profile);
}
```

### 레벨 기준

| Level | XP 필요 | 의미 | 자동 배정 가중치 |
|-------|---------|------|------------------|
| 1 | 0 | 초보 | 0.1 |
| 2 | 100 | 기초 | 0.2 |
| 3 | 200 | 보통 | 0.3 |
| 4 | 400 | 숙련 | 0.5 |
| 5 | 800 | 전문가 | 0.7 (전문분야 태그) |
| 6 | 1600 | 고급 | 0.8 |
| 7 | 3200 | 마스터 | 0.9 |
| 8 | 6400 | 시니어 | 0.95 |
| 9 | 12800 | 리더급 | 0.98 |
| 10 | 25600 | 최고 전문가 | 1.0 |

---

## 4. Supabase 스키마 변경

### 새 테이블: `decisions`

```sql
CREATE TABLE decisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,                    -- market_response, product_development, etc.
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'detected',
  priority TEXT NOT NULL DEFAULT 'medium',
  trigger_source TEXT,                   -- auto, manual, scheduled
  trigger_agent_id TEXT,                 -- 감지한 에이전트
  trigger_data JSONB,                    -- 원본 데이터
  participants JSONB,                    -- {analyzer:[], discussants:[], ...}
  artifacts JSONB,                       -- {analysis:'', discussion_log:'', ...}
  current_assignee TEXT,                 -- 현재 담당자
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 새 테이블: `decision_history`

```sql
CREATE TABLE decision_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  decision_id UUID REFERENCES decisions(id),
  from_status TEXT,
  to_status TEXT,
  changed_by TEXT,                       -- agent_id or 'chairman'
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 새 테이블: `agent_skills`

```sql
CREATE TABLE agent_skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  tasks_done INTEGER DEFAULT 0,
  success_rate NUMERIC(3,2) DEFAULT 0.50,
  avg_quality NUMERIC(3,2) DEFAULT 0.50,
  streak INTEGER DEFAULT 0,
  notable_results JSONB DEFAULT '[]',
  last_task_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, skill_name)
);
```

### 기존 테이블 활용

- `reports` → 의사결정 결과물 저장 (report_type = 'decision_artifact')
- `meetings` → 논의 단계 자동 생성
- `agent_memory` → 과거 이력 검색용
- `conversations` → 에이전트 간 대화 이력

---

## 5. API 엔드포인트

```
POST   /api/decisions              — 새 의사결정 생성 (자동/수동)
GET    /api/decisions              — 목록 조회 (상태별 필터)
PATCH  /api/decisions/[id]         — 상태 전이
POST   /api/decisions/[id]/advance — 다음 단계로 자동 진행

GET    /api/agent-skills           — 에이전트 역량 조회
GET    /api/agent-skills/[id]      — 개별 에이전트 역량 상세

POST   /api/task-router            — 업무 자동 배정 요청
```

---

## 6. 대시보드 UI 추가

### Decision Board (메인)

```
┌─────────────────────────────────────────────────┐
│ 📋 의사결정 현황                                   │
│                                                   │
│ [감지 2] → [분석중 1] → [논의 0] → [판단대기 1]     │
│                                                   │
│ 🔴 CRITICAL: S&P500 급락 대응 (Quanty 분석중)       │
│ 🟡 HIGH: 뉴스레터 콘텐츠 기획 (논의 필요)            │
│ 🟢 MEDIUM: SEO 키워드 업데이트 (판단대기)            │
└─────────────────────────────────────────────────┘
```

### Agent Growth Panel

```
┌─────────────────────────────────────────┐
│ 📈 에이전트 성장                          │
│                                         │
│ Quanty  ████████░░ Lv.8 투자분석          │
│ Buildy  ██████░░░░ Lv.6 프론트엔드        │
│ Searchy █████░░░░░ Lv.5 뉴스수집 ⭐전문가  │
│ Wordy   ████░░░░░░ Lv.4 콘텐츠작성        │
└─────────────────────────────────────────┘
```

---

## 7. 구현 순서

### Phase 1: 기반 (1-2일)
- [ ] Supabase 테이블 생성 (decisions, decision_history, agent_skills)
- [ ] Decision API CRUD
- [ ] 기본 상태 전이 로직

### Phase 2: 자동화 (2-3일)
- [ ] Task Router (업무 분석 + 자동 배정)
- [ ] 상태 전이 자동 트리거
- [ ] Searchy/Watchy/Quanty → Decision 자동 생성 연결

### Phase 3: 성장 (1-2일)
- [ ] Growth Engine (역량 업데이트)
- [ ] 에이전트 역량 프로필 초기화
- [ ] 업무 완료 → 자동 역량 갱신

### Phase 4: UI (1-2일)
- [ ] Decision Board (대시보드 추가)
- [ ] Agent Growth Panel
- [ ] 타임라인 뷰 (의사결정 히스토리)

### Phase 5: 고도화 (지속)
- [ ] 유사 업무 이력 매칭 (시맨틱 검색)
- [ ] 에이전트 간 자동 핸드오프
- [ ] 병렬 의사결정 처리
- [ ] 긴급도 기반 우선순위 재조정

---

## 8. _y Builder 유료 가치

이 Decision Engine이 _y Builder의 **핵심 유료 컴포넌트**:

| 무료 (오픈소스) | 유료 (_y Builder) |
|----------------|------------------|
| 빈 Decision 스키마 | 의사결정 유형별 프로세스 정의 |
| 기본 상태 전이 | 자동 트리거 + 자동 배정 로직 |
| 빈 역량 테이블 | 30 에이전트 초기 역량 프로필 |
| 기본 Task Router | 업무 분석 AI 프롬프트 + 가중치 |
| 빈 Growth Engine | 레벨업 공식 + XP 밸런싱 |

> **"30 agents, zero consensus, self-growing — by design"**

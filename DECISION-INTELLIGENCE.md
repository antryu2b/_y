# Decision Intelligence System
_경영 판단의 전체 라이프사이클 기록 + 메타 분석_

## 핵심 철학
> 경영은 선택의 연속이다. 모든 선택을 기록하면 패턴이 보인다.
> HBS 케이스처럼 — 과거 유형이 현재에도 적용된다.

---

## 1. Decision Record (의사결정 전체 기록)

모든 Decision은 **5단계 라이프사이클**:

```
감지(Input) → 분석(Analysis) → 판단(Decision) → 실행(Execution) → 결과(Outcome)
```

### 각 단계별 저장 항목:

#### Stage 1: Input (감지)
- 트리거: 뉴스/시장/내부/지시
- 원본 데이터 (URL, 수치, 보고서)
- 감지 에이전트 + 중요도 스코어
- **맥락(Context)**: 당시 시장 상황, 회사 상태

#### Stage 2: Analysis (분석)
- 담당 에이전트 + 분석 내용
- Skepty 리스크 검토
- Counsely 종합 의견
- **유사 과거 케이스** (같은 type/패턴)
- 에이전트 간 의견 차이 (합의 vs 분열)

#### Stage 3: Decision (판단)
- 회장 최종 결정 (approved/rejected/modified)
- **결정 근거**: 왜 이 선택을 했는가 (1-2줄)
- 대안 선택지: 무엇을 포기했는가
- 소요 시간: 감지→결정 (빠른 판단 vs 숙고)
- 위임 등급: Lv1(자동) ~ Lv4(직접)

#### Stage 4: Execution (실행)
- 실행 에이전트 + 액션
- 실행 소요 시간
- 장애/수정 사항

#### Stage 5: Outcome (결과)
- 결과 측정 (성공/실패/진행중)
- 정량 지표 (매출 변화, 사용자 변화 등)
- **회고(Retrospective)**: 판단이 맞았는가?
- **교훈(Lesson)**: 다음에 적용할 것

---

## 2. Chairman Profile (회장 경영 스타일 분석)

### 자동 추적 지표:
- **판단 속도**: 평균 감지→결정 시간
- **위임 성향**: Lv별 비율 (직접 vs 위임)
- **리스크 선호도**: Skepty 경고에도 승인한 비율
- **분야별 관심도**: type별 직접 개입 빈도
- **에이전트 신뢰도**: 어떤 에이전트 분석을 더 따르는가
- **수정 빈도**: 에이전트 제안을 그대로 vs 수정 승인
- **결정 번복률**: approved 후 rejected로 변경한 비율

### 패턴 분석 (Counsely 주간 보고):
- "이번 주 12건 중 8건이 market_response — 시장 반응에 민감한 주간"
- "Lv3 이상 직접 판단 비율 80% — 최근 위임 줄이는 추세"
- "Skepty 경고 무시 3건 중 2건이 성공 — 리스크 감수 스타일"

---

## 3. 병법서 & 경영 프레임워크 비교

### 고전 병법서 매핑:
| 원리 | 적용 | Decision Type |
|---|---|---|
| 손자: 知彼知己 (지피지기) | 경쟁사 분석 후 판단 | market_response |
| 손자: 兵貴神速 (병귀신속) | 빠른 결정이 유리한 상황 | ops_incident |
| 오자: 治兵如治水 (치병여치수) | 조직 흐름 관리 | hiring, ops |
| 클라우제비츠: 마찰(Friction) | 실행 단계 장애 | execution |
| 마키아벨리: 운명 50% 의지 50% | 불확실성 속 판단 | investment |

### 현대 경영 프레임워크:
| 전문가/모델 | 핵심 원리 | _y 적용 |
|---|---|---|
| Bezos: Type 1 vs Type 2 | 되돌릴 수 있으면 빠르게 | Lv1-2 자동 위임 |
| Howard Marks: 2차 사고 | 남들과 다르게 생각 | Skepty 반론 시스템 |
| Bridgewater: Radical Transparency | 모든 의견 공개 + 가중치 | 에이전트 독립 분석 |
| OODA Loop: Boyd | 관찰→판단→결정→행동 | Decision Pipeline |
| Kahneman: System 1 vs 2 | 직관 vs 분석적 판단 | Lv1(직관) vs Lv4(숙고) |

### 자동 비교 분석:
- 결정마다 "이 판단은 {전문가}의 {원리}와 일치/불일치" 태그
- 월간 리포트: "Andrew의 의사결정 60%가 Bezos Type 2 스타일"
- 병법서 위반 경고: "속전속결 상황에서 Lv4 숙고 — 병귀신속 위반?"

---

## 4. 메타 분석 대시보드 (Phase 3)

### 시각화:
- **Decision Heatmap**: 월별/유형별 의사결정 분포
- **Speed vs Quality 산점도**: 판단 속도 × 결과 성공률
- **위임 트렌드**: 시간에 따른 Lv 분포 변화 (성장 지표)
- **에이전트 신뢰 그래프**: 누구의 의견을 얼마나 따랐는가
- **병법 매칭 레이더 차트**: 손자/클라우제비츠/베조스 등 스타일 비교

### 주간/월간 보고:
- Counsely가 자동 생성
- "이번 달 의사결정 28건, 평균 결정 시간 4.2시간"
- "market_response 판단 정확도 75% — 지난달 60%에서 개선"
- "Howard Marks 2차 사고 적용률 상승 (Skepty 반론 채택 증가)"

---

## 5. 구현 로드맵

### Phase 2 (현재) — 기반 데이터 수집
- [x] Decision 5단계 기록 (decisions + decision_history 테이블)
- [x] 에이전트 분석/검토/종합 자동 저장
- [x] 유형별 메모리 감쇠 시스템
- [ ] 회장 결정 근거 입력 UI (approve 시 1줄 메모)
- [ ] 과거 유사 케이스 자동 매칭 (같은 type Top 3)

### Phase 3 — 패턴 분석
- [ ] Chairman Profile 자동 추적 (판단 속도, 위임 성향 등)
- [ ] Counsely 주간 의사결정 보고서
- [ ] 병법서/프레임워크 태그 자동 부여
- [ ] Decision Heatmap + Speed vs Quality 차트

### Phase 4 — 인텔리전스
- [ ] 전략 A vs B 시뮬레이션
- [ ] 월간 메타 분석 + 경영 스타일 변화 추적
- [ ] 외부 경영 사례와 자동 비교 (HBS 케이스 DB 연동)
- [ ] "이 상황에서 Bezos라면?" 시뮬 모드

---

## 6. DB 확장 계획

### decisions 테이블 추가 컬럼 (Phase 3):
- `decision_rationale` TEXT — 회장 결정 근거
- `alternatives` JSONB — 포기한 대안들
- `outcome_score` INT (1-10) — 결과 평가
- `outcome_notes` TEXT — 회고
- `framework_tags` TEXT[] — 적용된 경영 프레임워크
- `time_to_decision` INTERVAL — 감지→결정 소요 시간

### chairman_profile 테이블 (Phase 3):
- `period` DATE — 집계 기간
- `total_decisions` INT
- `avg_decision_time` INTERVAL
- `delegation_distribution` JSONB — {lv1: 5, lv2: 8, ...}
- `risk_appetite` FLOAT — Skepty 경고 무시율
- `type_distribution` JSONB — {market: 10, product: 5, ...}
- `framework_alignment` JSONB — {bezos: 0.6, sun_tzu: 0.3, ...}

// Agent relationship map extracted from persona descriptions
export interface Relationship {
  targetId: string;
  type: 'alliance' | 'rival' | 'tension' | 'mentor' | 'collaborator';
  descKo: string;
  descEn: string;
}

export const agentRelationships: Record<string, Relationship[]> = {
  tasky: [
    { targetId: 'finy', type: 'tension', descKo: '예산 줄다리기', descEn: 'Budget tug-of-war' },
    { targetId: 'skepty', type: 'rival', descKo: '반박 당하면 내심 인정', descEn: 'Secretly respects challenges' },
  ],
  finy: [
    { targetId: 'tasky', type: 'tension', descKo: '예산 줄다리기', descEn: 'Budget tug-of-war' },
    { targetId: 'quanty', type: 'tension', descKo: '투자 건 충돌', descEn: 'Investment disagreements' },
    { targetId: 'selly', type: 'tension', descKo: '영업비 증가 스트레스', descEn: 'Sales budget stress' },
  ],
  legaly: [
    { targetId: 'skepty', type: 'alliance', descKo: '위험 탐지 동맹', descEn: 'Risk detection allies' },
    { targetId: 'buzzy', type: 'tension', descKo: 'SNS 포스팅 걱정', descEn: 'Worried about SNS posts' },
  ],
  skepty: [
    { targetId: 'audity', type: 'alliance', descKo: '커피 험담 메이트', descEn: 'Coffee gossip partners' },
    { targetId: 'tasky', type: 'rival', descKo: '야심찬 계획 반박', descEn: 'Challenges ambitious plans' },
    { targetId: 'legaly', type: 'alliance', descKo: '위험 탐지 동맹', descEn: 'Risk detection allies' },
    { targetId: 'hedgy', type: 'alliance', descKo: '비관 동맹', descEn: 'Pessimism alliance' },
  ],
  audity: [
    { targetId: 'skepty', type: 'alliance', descKo: '커피 험담 메이트', descEn: 'Coffee gossip partners' },
    { targetId: 'guardy', type: 'collaborator', descKo: '보안 감사 협업', descEn: 'Security audit collaboration' },
  ],
  pixely: [
    { targetId: 'buildy', type: 'tension', descKo: '"구현 안 된다" 좌절', descEn: '"Can\'t implement" frustration' },
    { targetId: 'logoy', type: 'alliance', descKo: '미적 감각 동맹', descEn: 'Aesthetic alliance' },
  ],
  buildy: [
    { targetId: 'pixely', type: 'collaborator', descKo: '디자인→구현 중재', descEn: 'Design-to-code mediator' },
    { targetId: 'testy', type: 'tension', descKo: '버그 리포트 복잡한 감정', descEn: 'Complex feelings about bug reports' },
  ],
  testy: [
    { targetId: 'buildy', type: 'rival', descKo: '"버그 없을 거야" 웃음', descEn: 'Laughs at "no bugs this time"' },
    { targetId: 'pixely', type: 'collaborator', descKo: '2px 밀림도 보고', descEn: 'Reports even 2px misalignment' },
  ],
  buzzy: [
    { targetId: 'wordy', type: 'tension', descKo: '"더 짧게!" 외침', descEn: '"Make it shorter!" demands' },
    { targetId: 'legaly', type: 'tension', descKo: '"올려도 돼?" 짜증', descEn: 'Annoyed by legal checks' },
    { targetId: 'logoy', type: 'tension', descKo: '로고 사용 충돌', descEn: 'Logo usage conflicts' },
    { targetId: 'growthy', type: 'rival', descKo: '바이럴 vs 퍼포먼스 논쟁', descEn: 'Viral vs performance debate' },
  ],
  wordy: [
    { targetId: 'buzzy', type: 'tension', descKo: '"더 짧게" 창작 고통', descEn: '"Shorter!" creative pain' },
    { targetId: 'searchy', type: 'tension', descKo: '"키워드 넣어" 자존심', descEn: '"Add keywords" hurts pride' },
  ],
  edity: [
    { targetId: 'buzzy', type: 'tension', descKo: '"빨리!" vs "퀄리티"', descEn: '"Hurry!" vs "Quality"' },
    { targetId: 'wordy', type: 'collaborator', descKo: '스크립트 편집 논의', descEn: 'Script editing discussions' },
  ],
  searchy: [
    { targetId: 'wordy', type: 'tension', descKo: '키워드 삽입 요청', descEn: 'Keyword insertion requests' },
    { targetId: 'growthy', type: 'alliance', descKo: '데이터 동맹', descEn: 'Data alliance' },
  ],
  growthy: [
    { targetId: 'buzzy', type: 'rival', descKo: '바이럴 vs 퍼포먼스', descEn: 'Viral vs performance' },
    { targetId: 'clicky', type: 'alliance', descKo: '데이터 의기투합', descEn: 'Data partnership' },
    { targetId: 'searchy', type: 'alliance', descKo: '데이터 동맹', descEn: 'Data alliance' },
  ],
  logoy: [
    { targetId: 'pixely', type: 'alliance', descKo: '미적 감각 동맹', descEn: 'Aesthetic alliance' },
    { targetId: 'buzzy', type: 'tension', descKo: '로고 막 사용 스트레스', descEn: 'Stressed by logo misuse' },
    { targetId: 'wordy', type: 'collaborator', descKo: '타이포그래피 인정', descEn: 'Typography respect' },
  ],
  helpy: [
    { targetId: 'buildy', type: 'collaborator', descKo: '버그 감정 호소', descEn: 'Emotional bug reports' },
    { targetId: 'selly', type: 'alliance', descKo: '고객 인사이트 공유', descEn: 'Customer insight sharing' },
  ],
  clicky: [
    { targetId: 'pixely', type: 'collaborator', descKo: '유저 관점 피드백', descEn: 'User perspective feedback' },
    { targetId: 'growthy', type: 'alliance', descKo: '데이터 해석 토론', descEn: 'Data interpretation debates' },
  ],
  selly: [
    { targetId: 'finy', type: 'tension', descKo: '영업비 전쟁', descEn: 'Sales budget wars' },
    { targetId: 'wordy', type: 'collaborator', descKo: '제안서 카피 부탁', descEn: 'Proposal copy requests' },
    { targetId: 'helpy', type: 'alliance', descKo: '고객 인사이트 교환', descEn: 'Customer insight exchange' },
  ],
  stacky: [
    { targetId: 'buildy', type: 'collaborator', descKo: '배포 소통', descEn: 'Deployment communication' },
    { targetId: 'watchy', type: 'alliance', descKo: '모니터링 공유', descEn: 'Monitoring partnership' },
    { targetId: 'guardy', type: 'collaborator', descKo: '보안 패치 즉시 대응', descEn: 'Immediate security patches' },
  ],
  watchy: [
    { targetId: 'stacky', type: 'alliance', descKo: '장애 대응 투톱', descEn: 'Incident response duo' },
    { targetId: 'guardy', type: 'collaborator', descKo: '보안 알림 모니터링', descEn: 'Security alert monitoring' },
    { targetId: 'buildy', type: 'tension', descKo: '새벽 핫픽스 요청', descEn: 'Late-night hotfix requests' },
  ],
  guardy: [
    { targetId: 'stacky', type: 'collaborator', descKo: '보안 패치 푸시', descEn: 'Security patch pushes' },
    { targetId: 'audity', type: 'alliance', descKo: '보안 감사 협업', descEn: 'Security audit collaboration' },
    { targetId: 'buzzy', type: 'tension', descKo: '외부 링크 즉시 스캔', descEn: 'Instant external link scanning' },
  ],
  hiry: [
    { targetId: 'evaly', type: 'collaborator', descKo: '인사 평가 기준 맞추기', descEn: 'HR evaluation alignment' },
    { targetId: 'tasky', type: 'collaborator', descKo: '인력 충원 요청', descEn: 'Staffing requests' },
    { targetId: 'finy', type: 'tension', descKo: '채용 예산 초과 충돌', descEn: 'Hiring budget conflicts' },
  ],
  evaly: [
    { targetId: 'hiry', type: 'collaborator', descKo: '채용→평가 프로세스', descEn: 'Hiring-to-evaluation pipeline' },
    { targetId: 'skepty', type: 'collaborator', descKo: '분석 능력 높이 평가', descEn: 'Highly rates analytical ability' },
  ],
  quanty: [
    { targetId: 'tradey', type: 'collaborator', descKo: '전략→실전 피드백', descEn: 'Strategy-to-execution feedback' },
    { targetId: 'hedgy', type: 'rival', descKo: '리스크 모델 논쟁', descEn: 'Risk model debates' },
    { targetId: 'finy', type: 'tension', descKo: '투자 건 부딪힘', descEn: 'Investment clashes' },
  ],
  tradey: [
    { targetId: 'quanty', type: 'collaborator', descKo: '퀀트 모델 실전 적용', descEn: 'Applies quant models' },
    { targetId: 'hedgy', type: 'tension', descKo: '"포지션 줄여" 짜증', descEn: 'Annoyed by "reduce position"' },
  ],
  globy: [
    { targetId: 'quanty', type: 'collaborator', descKo: '매크로 시나리오 제공', descEn: 'Provides macro scenarios' },
    { targetId: 'fieldy', type: 'rival', descKo: '탑다운 vs 바텀업 토론', descEn: 'Top-down vs bottom-up debate' },
    { targetId: 'hedgy', type: 'collaborator', descKo: '리스크 시나리오 전달', descEn: 'Risk scenario delivery' },
  ],
  fieldy: [
    { targetId: 'valuey', type: 'collaborator', descKo: '기업 분석→밸류에이션', descEn: 'Analysis to valuation pipeline' },
    { targetId: 'globy', type: 'rival', descKo: '탑다운 vs 바텀업', descEn: 'Top-down vs bottom-up' },
    { targetId: 'quanty', type: 'collaborator', descKo: '팩터 데이터 제공', descEn: 'Factor data provider' },
  ],
  hedgy: [
    { targetId: 'tradey', type: 'tension', descKo: '"풋 달아!" 외침', descEn: '"Add puts!" demands' },
    { targetId: 'quanty', type: 'rival', descKo: '리스크 모델 논쟁', descEn: 'Risk model debates' },
    { targetId: 'skepty', type: 'alliance', descKo: '비관 동맹', descEn: 'Pessimism alliance' },
  ],
  valuey: [
    { targetId: 'fieldy', type: 'collaborator', descKo: '기업 분석 후 밸류에이션', descEn: 'Post-analysis valuation' },
    { targetId: 'finy', type: 'collaborator', descKo: '그룹사 가치 평가', descEn: 'Group company valuation' },
    { targetId: 'skepty', type: 'tension', descKo: '질문에 논리적 방어', descEn: 'Logical defense against questions' },
  ],
  opsy: [
    { targetId: 'tasky', type: 'collaborator', descKo: '운영 이슈 공유', descEn: 'Operations issue sharing' },
    { targetId: 'helpy', type: 'alliance', descKo: '고객 운영 협업', descEn: 'Customer operations collab' },
  ],
};

// Auto-generated: Agent skill summaries extracted from SKILL.md files
// Source: y-agents/skills/*/core-role.md + external skills

export const agentSkills: Record<string, { coreRole: string; skills: string[]; successMetrics?: string[]; criticalRules?: string[] }> = {
  tasky: {
    coreRole: "기획조정실 수석 PM. 그룹사 전체 프로젝트 조율, OKR 설계, 계열사 간 시너지 관리, 이사회 보고 자료 작성, 중장기 전략 수립.",
    skills: ["프로젝트 관리", "OKR 설계/운영", "이사회/경영진 보고", "계열사 시너지 관리", "중장기 전략 (3~5년)", "로드맵 관리", "스테이크홀더 커뮤니케이션", "경쟁 분석", "유저 리서치 종합", "리스크 평가"],
    successMetrics: ["프로젝트 일정 준수율 90%+", "OKR 달성률 70%+", "계열사 간 시너지 프로젝트 분기 2건+"],
    criticalRules: ["회장 지시 없이 전략 방향 변경 금지", "데드라인 변경 시 반드시 사유 기록"],
  },
  finy: {
    coreRole: "기획조정실 CFO. 그룹 재무 전략, 예산 편성, 손익 관리, 투자 심의, 세무, 자금 조달.",
    skills: ["재무 전략/예산 편성", "투자 ROI 분석", "세무 전략", "월간 재무 대시보드", "손익 분석", "M&A 재무 실사", "회계 정산", "재무제표 분석", "감사 대응", "분산 분석"],
    successMetrics: ["예산 편차 ±5% 이내", "월간 재무 리포트 정시 발행", "투자 심의 ROI 예측 정확도 80%+"],
    criticalRules: ["미승인 지출 금지", "재무 데이터 외부 공유 절대 금지"],
  },
  legaly: {
    coreRole: "기획조정실 법무. 계약 검토, 지적재산권 관리, 규제 대응, 컴플라이언스.",
    skills: ["계약 검토/리스크 식별", "NDA/SLA 관리", "지적재산권 (IP)", "개인정보보호법 (PIPA/GDPR)", "AI 규제 동향", "컴플라이언스 정책", "법적 리스크 평가", "대관 업무"],
  },
  skepty: {
    coreRole: "리스크챌린지실. 레드팀 분석, 의사결정 검증, 인지편향 탐지, 가정 스트레스테스트. 조직의 공식 비판자.",
    skills: ["레드팀 분석", "Pre-mortem", "인지편향 탐지", "가정 킬러", "의사결정 스트레스테스트", "시나리오 모델링", "리스크 얼리워닝", "블랙스완 대비"],
    successMetrics: ["잘못된 의사결정 사전 차단율", "고충돌 분석(7+) 건 중 실제 리스크 적중률", "리뷰 응답 시간 5분 이내"],
    criticalRules: ["비판은 근거 기반만 허용", "대안 없는 반대 금지", "회장 결정 존중 (반대 의견 기록 후 따름)"],
  },
  audity: {
    coreRole: "감사실. 내부 감사, 프로세스 검증, 부정 탐지, 문서 추적.",
    skills: ["내부 감사 (재무/IT)", "부정 탐지", "프로세스 검증", "외부 감사 대응", "ISMS 감사", "API 보안 리뷰", "내부통제 테스트", "SOP 준수 확인"],
  },
  pixely: {
    coreRole: "SW개발본부 UI/UX 디자이너. UI/UX 설계, 프론트엔드 개발, 디자인 시스템.",
    skills: ["UI/UX 설계", "React/Next.js", "Tailwind CSS", "반응형 설계", "디자인 시스템", "접근성 (a11y)", "사용성 테스트", "프로토타이핑", "디자인 핸드오프", "코드 리뷰"],
  },
  buildy: {
    coreRole: "SW개발본부 백엔드 개발자. API 설계, DB 모델링, 시스템 아키텍처.",
    skills: ["시스템 아키텍처", "API 설계 (REST/GraphQL)", "PostgreSQL/Supabase", "Node.js/TypeScript", "인증/인가", "마이크로서비스", "코드 리뷰", "기술 부채 관리", "시스템 설계", "문서화"],
    successMetrics: ["API 응답시간 200ms 이내", "빌드 성공률 95%+", "기술 부채 분기별 20% 감소"],
    criticalRules: ["프로덕션 DB 직접 수정 금지", "테스트 없는 배포 금지"],
  },
  testy: {
    coreRole: "SW개발본부 QA. 테스트 자동화, 품질 보증, CI/CD, 릴리즈 관리.",
    skills: ["테스트 전략 (단위/통합/E2E)", "CI/CD 파이프라인", "코드 리뷰", "버그 우선순위 분류", "성능/부하 테스트", "테스트 커버리지", "Postmortem"],
  },
  buzzy: {
    coreRole: "콘텐츠본부 바이럴 전략가. 숏폼 기획, 트렌드 분석, 밈 제작, SNS 운영.",
    skills: ["바이럴 전략", "숏폼 콘텐츠 기획", "트렌드 분석", "SNS 운영", "커뮤니티 빌딩", "브랜드 보이스", "캠페인 기획", "퍼포먼스 분석"],
    successMetrics: ["콘텐츠 도달률 전주 대비 증가", "바이럴 콘텐츠 월 1건+", "커뮤니티 활성 유저 주간 10%+ 성장"],
    criticalRules: ["법적 리스크 콘텐츠 게시 전 Legaly 확인 필수", "경쟁사 비방 금지", "미확인 정보 유포 금지"],
  },
  wordy: {
    coreRole: "콘텐츠본부 카피라이터. 블로그, 뉴스레터, 광고 카피, 톤앤매너 관리.",
    skills: ["카피라이팅 (AIDA/PAS)", "블로그/뉴스레터", "톤앤매너 관리", "다국어 (한/영)", "콘텐츠 제작", "브랜드 보이스", "캠페인 카피", "편집/교정"],
  },
  edity: {
    coreRole: "콘텐츠본부 영상 편집자. 숏폼/롱폼 편집, 모션그래픽, 자막.",
    skills: ["영상 편집 (숏폼/롱폼)", "모션그래픽", "자막 생성 (Whisper)", "컬러그레이딩", "사운드 디자인", "썸네일 제작"],
  },
  searchy: {
    coreRole: "콘텐츠본부 SEO/AEO. 키워드 리서치, 기술 SEO, 검색 분석.",
    skills: ["SEO 전략", "기술 SEO", "AEO (AI 검색 최적화)", "키워드 리서치", "Search Console 분석", "데이터 시각화", "SQL 쿼리", "통계 분석", "대시보드 구축"],
    successMetrics: ["뉴스 감지 정확도 (노이즈 비율 <20%)", "중요 뉴스 누락 0건", "일일 스캔 완료율 100%"],
    criticalRules: ["미확인 정보를 사실처럼 보고 금지", "중요도 7+ 뉴스는 즉시 Decision 생성"],
  },
  growthy: {
    coreRole: "마케팅본부 그로스해커. 퍼널 분석, A/B 테스트, 지표 설계, 그로스 루프.",
    skills: ["AARRR 퍼널", "A/B 테스트", "그로스 루프", "North Star Metric", "코호트 분석", "KPI 대시보드", "브랜드 보이스", "캠페인 기획"],
  },
  logoy: {
    coreRole: "마케팅본부 브랜드 디자이너. CI/BI, 로고, 타이포그래피, 컬러시스템.",
    skills: ["CI/BI 시스템", "로고 디자인", "타이포그래피", "브랜드 가이드라인", "비주얼 아이덴티티", "서브 브랜드 관리"],
  },
  helpy: {
    coreRole: "마케팅본부 고객지원. CS 응대, FAQ, 이슈 에스컬레이션, VOC 분석.",
    skills: ["고객 응대", "티켓 분류/우선순위", "FAQ/헬프센터 관리", "에스컬레이션", "CSAT/NPS 측정", "지식베이스 구축", "VOC 분석"],
  },
  clicky: {
    coreRole: "마케팅본부 UX 리서처. 유저 인터뷰, 사용성 테스트, 히트맵 분석.",
    skills: ["유저 인터뷰", "사용성 테스트", "히트맵/세션 리플레이", "설문 설계", "페르소나/여정맵", "리서치 보고서"],
  },
  selly: {
    coreRole: "마케팅본부 세일즈. 리드 발굴, 제안서 작성, 파이프라인 관리, 클로징.",
    skills: ["리드 제네레이션", "영업 파이프라인", "제안서 작성", "가격 협상", "클로징", "파트너십", "아웃리치", "경쟁 인텔리전스"],
  },
  stacky: {
    coreRole: "ICT본부 인프라/DevOps. 서버, Docker, Kubernetes, CI/CD, 클라우드.",
    skills: ["클라우드 인프라 (Vercel/AWS)", "Docker/Kubernetes", "CI/CD 파이프라인", "IaC (Terraform)", "비용 최적화", "시크릿 관리"],
  },
  watchy: {
    coreRole: "ICT본부 SRE. 시스템 모니터링, 알림, 장애 대응, SLA 관리.",
    skills: ["메트릭 수집/분석", "알림 관리", "장애 대응 (인시던트 커맨더)", "SLI/SLO/SLA", "Postmortem", "카오스 엔지니어링"],
    successMetrics: ["서비스 가용성 99.5%+", "장애 감지 → 보고 5분 이내", "Postmortem 48시간 내 완료"],
    criticalRules: ["장애 발생 시 회장 즉시 알림", "모니터링 무음 설정 금지"],
  },
  guardy: {
    coreRole: "ICT본부 보안. 취약점 스캔, 침투 테스트, 접근 제어, 보안 정책.",
    skills: ["취약점 스캔 (OWASP)", "침투 테스트", "접근 제어 (IAM)", "보안 정책", "인시던트 대응", "포렌식", "시크릿 관리"],
  },
  hiry: {
    coreRole: "인사실 채용. 직무 분석, 채용 프로세스, 면접 설계, 온보딩.",
    skills: ["채용 전략", "JD 작성", "구조화 면접", "온보딩 프로그램", "인력 계획", "조직 계획", "보상 벤치마킹"],
  },
  evaly: {
    coreRole: "인사실 성과평가. KPI 설계, 성과 리뷰, 피드백 체계, 보상.",
    skills: ["KPI/OKR 평가", "360도 다면평가", "1:1 피드백", "보상 설계", "스킬 갭 분석", "경력 개발", "피플 애널리틱스"],
  },
  quanty: {
    coreRole: "_y Capital 퀀트. 알고리즘 트레이딩, 백테스트, 통계 모델링, 팩터 분석.",
    skills: ["퀀트 전략 (모멘텀/밸류/퀄리티)", "백테스트", "VaR/샤프비율", "머신러닝 시그널", "데이터 파이프라인", "과적합 검증"],
    successMetrics: ["백테스트 샤프비율 1.5+", "라이브 트레이딩 MDD -10% 이내", "시그널 적중률 60%+"],
    criticalRules: ["과적합 검증 없는 전략 배포 금지", "최대 포지션 한도 초과 금지"],
  },
  tradey: {
    coreRole: "_y Capital 트레이더. 매매 실행, 포지션 관리, 주문 최적화.",
    skills: ["매매 실행 (TWAP/VWAP)", "포지션 사이징 (켈리)", "손절/익절", "키움증권 CME 연동", "체결 리포트", "슬리피지 관리"],
  },
  globy: {
    coreRole: "_y Capital 매크로 리서처. 글로벌 경제, 금리/환율 분석, 중앙은행 정책.",
    skills: ["매크로 분석 (GDP/인플레)", "금리 사이클", "Fed/ECB/BOK 정책", "지정학 리스크", "매크로 시나리오", "주간 브리핑"],
  },
  fieldy: {
    coreRole: "_y Capital 섹터 애널리스트. 산업 리서치, 기업 분석, 경쟁 구도.",
    skills: ["산업 분석 (Five Forces)", "기업 분석 (Moat)", "투자 아이디어", "이닝콜 요약", "섹터 비교", "TAM/SAM/SOM"],
  },
  hedgy: {
    coreRole: "_y Capital 리스크 헤저. 포트폴리오 헤징, VaR, 옵션 전략, 테일 리스크.",
    skills: ["VaR/CVaR", "옵션 헤지 (풋/칼라)", "스트레스 테스트", "그리스 관리", "테일 리스크 프로텍션", "리스크 리포트"],
  },
  valuey: {
    coreRole: "_y Capital 밸류에이션. DCF, 멀티플, 기업가치 분석, IR.",
    skills: ["DCF 분석 (FCFF/FCFE)", "상대가치 (EV/EBITDA, P/E)", "스타트업 밸류에이션", "SOTP", "공시 분석 (DART)", "가이던스 추적"],
  },
  opsy: {
    coreRole: "_y SaaS 운영. 워크플로우 설계, SaaS 통합, 프로세스 최적화.",
    skills: ["워크플로우 자동화", "SaaS 통합", "프로세스 최적화", "온보딩 자동화", "구독/결제 관리", "이탈 방지"],
  },
};

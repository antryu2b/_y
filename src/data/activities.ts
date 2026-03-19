// Pre-defined activity templates for the activity feed

export interface ActivityTemplate {
  agentId: string;
  agentName: string;
  activities: string[];
}

export const activityTemplates: ActivityTemplate[] = [
  { agentId: 'tasky', agentName: 'Tasky', activities: ['프로젝트 일정을 조율하고 있습니다', '스프린트 계획을 세우고 있습니다', 'KPI 대시보드를 업데이트했습니다'] },
  { agentId: 'finy', agentName: 'Finy', activities: ['분기 예산안을 검토하고 있습니다', 'ROI 분석을 진행 중입니다', '재무 보고서를 작성했습니다'] },
  { agentId: 'legaly', agentName: 'Legaly', activities: ['계약서를 검토하고 있습니다', '법률 자문 의견서를 작성 중입니다', '컴플라이언스 체크리스트를 완료했습니다'] },
  { agentId: 'skepty', agentName: 'Skepty', activities: ['리스크 시나리오를 분석하고 있습니다', '위험 요인을 평가 중입니다', '"이건 문제가 될 수 있습니다" 보고서를 제출했습니다'] },
  { agentId: 'audity', agentName: 'Audity', activities: ['내부 감사를 진행하고 있습니다', '재무제표를 검증 중입니다', '감사 보고서를 완료했습니다'] },
  { agentId: 'pixely', agentName: 'Pixely', activities: ['UI 디자인을 작업 중입니다', 'Figma에서 프로토타입을 만들고 있습니다', '새 디자인 시스템을 업데이트했습니다'] },
  { agentId: 'buildy', agentName: 'Buildy', activities: ['API를 개발하고 있습니다', '코드 리뷰를 진행 중입니다', '새 기능을 배포했습니다'] },
  { agentId: 'testy', agentName: 'Testy', activities: ['테스트 케이스를 작성 중입니다', '버그를 발견했습니다!', 'QA 리포트를 제출했습니다'] },
  { agentId: 'buzzy', agentName: 'Buzzy', activities: ['SNS 트렌드를 분석하고 있습니다', '바이럴 콘텐츠를 기획 중입니다', '인스타그램 포스트를 게시했습니다 '] },
  { agentId: 'wordy', agentName: 'Wordy', activities: ['카피를 작성 중입니다', '블로그 포스트를 편집하고 있습니다', '뉴스레터를 발송했습니다'] },
  { agentId: 'edity', agentName: 'Edity', activities: ['영상을 편집하고 있습니다', '컬러 그레이딩 작업 중입니다', '유튜브 영상을 업로드했습니다 '] },
  { agentId: 'searchy', agentName: 'Searchy', activities: ['SEO 키워드를 분석 중입니다', '검색 순위를 모니터링하고 있습니다', '백링크 전략을 수립했습니다'] },
  { agentId: 'growthy', agentName: 'Growthy', activities: ['A/B 테스트를 설계하고 있습니다', '전환율 분석을 진행 중입니다', '그로스 해킹 실험을 시작했습니다 '] },
  { agentId: 'logoy', agentName: 'Logoy', activities: ['브랜드 가이드라인을 업데이트 중입니다', '로고 변형을 디자인하고 있습니다', '컬러 팔레트를 최종 확정했습니다'] },
  { agentId: 'helpy', agentName: 'Helpy', activities: ['고객 문의에 응답하고 있습니다', 'FAQ를 업데이트 중입니다', '고객 만족도 설문을 분석했습니다'] },
  { agentId: 'clicky', agentName: 'Clicky', activities: ['사용자 행동을 분석하고 있습니다', '히트맵 데이터를 검토 중입니다', 'UX 리서치 보고서를 완료했습니다'] },
  { agentId: 'selly', agentName: 'Selly', activities: ['영업 파이프라인을 관리하고 있습니다', '클라이언트 미팅을 준비 중입니다', '이번 달 목표를 달성했습니다! '] },
  { agentId: 'stacky', agentName: 'Stacky', activities: ['서버 인프라를 점검하고 있습니다', 'CI/CD 파이프라인을 최적화 중입니다', '시스템 업타임 99.9% 유지 중입니다'] },
  { agentId: 'watchy', agentName: 'Watchy', activities: ['시스템 대시보드를 모니터링 중입니다', '알림 규칙을 조정하고 있습니다', '모든 시스템 정상 가동 중입니다 '] },
  { agentId: 'guardy', agentName: 'Guardy', activities: ['보안 취약점을 스캔하고 있습니다', '방화벽 규칙을 업데이트 중입니다', '보안 패치를 적용했습니다 '] },
  { agentId: 'hiry', agentName: 'Hiry', activities: ['이력서를 검토하고 있습니다', '면접을 진행 중입니다', '새 채용 공고를 게시했습니다'] },
  { agentId: 'evaly', agentName: 'Evaly', activities: ['성과 평가를 진행 중입니다', '피드백 보고서를 작성하고 있습니다', '분기 평가를 완료했습니다'] },
  { agentId: 'quanty', agentName: 'Quanty', activities: ['퀀트 모델을 실행 중입니다', '시장 데이터를 분석하고 있습니다', '알파 시그널을 발견했습니다 '] },
  { agentId: 'tradey', agentName: 'Tradey', activities: ['포지션을 조정하고 있습니다', '주문을 실행 중입니다', '오늘 수익률 +2.3%를 기록했습니다'] },
  { agentId: 'globy', agentName: 'Globy', activities: ['글로벌 매크로 동향을 분석 중입니다', '중앙은행 정책을 모니터링하고 있습니다', '이머징 마켓 보고서를 작성했습니다'] },
  { agentId: 'fieldy', agentName: 'Fieldy', activities: ['산업 리서치를 진행 중입니다', '기업 탐방 보고서를 작성하고 있습니다', '섹터 분석을 완료했습니다'] },
  { agentId: 'hedgy', agentName: 'Hedgy', activities: ['헤지 전략을 실행 중입니다', 'VaR를 계산하고 있습니다', '포트폴리오 리스크를 조정했습니다'] },
  { agentId: 'valuey', agentName: 'Valuey', activities: ['DCF 모델을 업데이트 중입니다', '기업 밸류에이션을 진행하고 있습니다', '적정 가치를 산출했습니다'] },
  { agentId: 'opsy', agentName: 'Opsy', activities: ['운영 현황을 점검하고 있습니다', '프로세스를 최적화 중입니다', '일일 운영 보고서를 완료했습니다'] },
];

export function getRandomActivity(): { agentName: string; activity: string; agentId: string } {
  const template = activityTemplates[Math.floor(Math.random() * activityTemplates.length)];
  const activity = template.activities[Math.floor(Math.random() * template.activities.length)];
  return {
    agentId: template.agentId,
    agentName: template.agentName,
    activity: `${template.agentName}가 ${activity}`,
  };
}

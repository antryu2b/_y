// Daily schedule generator for agents

export interface ScheduleItem {
  time: string; // "09:00"
  activity: string;
  location: string; // "desk" | "meeting" | "elevator" | "lobby" | "break"
  duration: number; // minutes
}

export interface DailyPlan {
  schedule: ScheduleItem[];
  currentActivity: string;
  currentLocation: string;
}

// Activity templates by department type
const workActivities: Record<string, string[]> = {
  '회장실': ['전략 회의 검토', '투자 보고서 분석', '부서장 면담 준비', '글로벌 시장 동향 파악'],
  '기획조정실': ['프로젝트 일정 조율', '예산안 검토', '법률 자문 준비', '분기 보고서 작성'],
  '리스크챌린지실': ['리스크 시나리오 분석', '감사 보고서 작성', '컴플라이언스 검토', '내부 통제 점검'],
  '감사실': ['감사 보고서 작성', '재무제표 검토', '내부감사 수행', '규정 준수 확인'],
  'SW개발본부': ['코드 리뷰 진행', 'UI 디자인 작업', '버그 수정', '스프린트 계획', '배포 준비'],
  '콘텐츠본부': ['콘텐츠 기획', '영상 편집', 'SNS 포스팅', 'SEO 최적화', '카피라이팅'],
  '마케팅본부': ['캠페인 분석', '광고 성과 리뷰', '고객 피드백 정리', '브랜드 가이드 업데이트', '영업 전략 수립'],
  'ICT본부': ['서버 모니터링', '보안 패치 적용', '인프라 점검', '네트워크 최적화'],
  '인사실': ['면접 진행', '인사 평가 정리', '교육 프로그램 기획', '채용 공고 검토'],
  '_y Capital': ['포트폴리오 리밸런싱', '시장 분석', '트레이딩 전략 수립', '리서치 노트 작성', '밸류에이션 모델 업데이트'],
  '_y SaaS': ['운영 보고서 작성', '고객 온보딩 지원', '서비스 현황 점검'],
};

const meetingTypes = [
  '팀 미팅', '전략 회의', '프로젝트 리뷰', '브레인스토밍', '1:1 미팅', '부서간 협의',
];

const breakActivities = [
  '커피 브레이크', '점심 식사', '스트레칭', '동료와 잡담',
];

export function generateDailyPlan(agentId: string, department: string): DailyPlan {
  const schedule: ScheduleItem[] = [];
  const deptActivities = workActivities[department] || workActivities['기획조정실'];
  
  // Seed based on agent id + day for consistency within a day
  const daySeed = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  const hash = simpleHash(agentId + daySeed);
  
  // Morning arrival (8:30-9:30)
  const arrivalMinute = 30 + (hash % 60);
  schedule.push({
    time: `08:${String(arrivalMinute).padStart(2, '0')}`,
    activity: '출근',
    location: 'elevator',
    duration: 5,
  });
  
  // Morning work block
  schedule.push({
    time: '09:00',
    activity: pickRandom(deptActivities, hash, 0),
    location: 'desk',
    duration: 60 + (hash % 30),
  });
  
  // Morning meeting
  schedule.push({
    time: '10:30',
    activity: pickRandom(meetingTypes, hash, 1),
    location: 'meeting',
    duration: 30 + (hash % 30),
  });
  
  // Back to work
  schedule.push({
    time: '11:30',
    activity: pickRandom(deptActivities, hash, 2),
    location: 'desk',
    duration: 60,
  });
  
  // Lunch
  schedule.push({
    time: '12:30',
    activity: '점심 식사',
    location: 'lobby',
    duration: 60,
  });
  
  // Afternoon work
  schedule.push({
    time: '13:30',
    activity: pickRandom(deptActivities, hash, 3),
    location: 'desk',
    duration: 90,
  });
  
  // Afternoon meeting or break
  schedule.push({
    time: '15:00',
    activity: hash % 2 === 0 ? pickRandom(meetingTypes, hash, 4) : pickRandom(breakActivities, hash, 4),
    location: hash % 2 === 0 ? 'meeting' : 'lobby',
    duration: 30,
  });
  
  // Late afternoon work
  schedule.push({
    time: '15:30',
    activity: pickRandom(deptActivities, hash, 5),
    location: 'desk',
    duration: 90,
  });
  
  // Evening wrap up
  schedule.push({
    time: '17:30',
    activity: '업무 정리',
    location: 'desk',
    duration: 30,
  });
  
  schedule.push({
    time: '18:00',
    activity: '퇴근',
    location: 'elevator',
    duration: 10,
  });

  return {
    schedule,
    currentActivity: schedule[0].activity,
    currentLocation: schedule[0].location,
  };
}

export function getCurrentScheduleItem(plan: DailyPlan): ScheduleItem {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  let current = plan.schedule[0];
  for (const item of plan.schedule) {
    const [h, m] = item.time.split(':').map(Number);
    const itemMinutes = h * 60 + m;
    if (currentMinutes >= itemMinutes) {
      current = item;
    }
  }
  return current;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function pickRandom(arr: string[], seed: number, offset: number): string {
  return arr[(seed + offset * 7) % arr.length];
}

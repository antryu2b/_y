export interface Agent {
  id: string;
  number: string;
  name: string;
  image: string;
  department: string;
  floor: number;
  role: string;
  desc?: string;
  status: 'working' | 'meeting' | 'idle';
}

export interface Floor {
  level: number;
  label: string;
  emoji: string; // Lucide icon name
  department: string;
  departmentEn: string;
  deptShort: string;
  deptShortEn: string;
  color: string;
  agents: Agent[];
}

import { AGENT_ROSTER } from './agent-config';
const descMap: Record<string, string> = {};
AGENT_ROSTER.forEach(a => { descMap[a.id] = a.desc; });

const makeAgent = (
  num: string,
  name: string,
  dept: string,
  floor: number,
  role: string
): Agent => ({
  id: name.toLowerCase(),
  number: num,
  name,
  image: `/agents/${num}-${name.toLowerCase()}.png`,
  department: dept,
  floor,
  role,
  desc: descMap[name.toLowerCase()] || '',
  status: 'working',
});

export const floors: Floor[] = [
  {
    level: 10,
    label: '10F',
    emoji: 'crown',
    department: "Chairman's Office",
    departmentEn: "Chairman's Office",
    deptShort: 'Chairman',
    deptShortEn: 'Chairman',
    color: '#FFD700',
    agents: [
      {
        id: 'andrew',
        number: '00',
        name: 'Chairman',
        image: '/agents/00-andrew.png',
        department: "Chairman's Office",
        floor: 10,
        role: 'Chairman',
        status: 'working',
      },
      {
        id: 'counsely',
        number: '30',
        name: 'Counsely',
        image: '/agents/30-counsely.png',
        department: "Chairman's Office",
        floor: 10,
        role: 'Chief of Staff',
        status: 'working',
      },
    ],
  },
  {
    level: 9,
    label: '9F',
    emoji: 'clipboard-list',
    department: 'Planning & Coordination',
    departmentEn: 'Planning & Coordination',
    deptShort: 'Planning',
    deptShortEn: 'Planning',
    color: '#4A90D9',
    agents: [
      makeAgent('01', 'Tasky', 'Planning & Coordination', 9, 'Task Management'),
      makeAgent('02', 'Finy', 'Planning & Coordination', 9, 'Financial Planning'),
      makeAgent('03', 'Legaly', 'Planning & Coordination', 9, 'Legal Affairs'),
    ],
  },
  {
    level: 8,
    label: '8F',
    emoji: 'shield-alert',
    department: 'Risk Challenge / Audit',
    departmentEn: 'Risk Challenge / Audit',
    deptShort: 'Risk',
    deptShortEn: 'Risk',
    color: '#E74C3C',
    agents: [
      makeAgent('04', 'Skepty', 'Risk Challenge', 8, 'Risk Analysis'),
      makeAgent('05', 'Audity', 'Audit', 8, 'Auditing'),
    ],
  },
  {
    level: 7,
    label: '7F',
    emoji: 'code',
    department: 'Software Development',
    departmentEn: 'Software Development',
    deptShort: 'Dev',
    deptShortEn: 'Dev',
    color: '#2ECC71',
    agents: [
      makeAgent('06', 'Pixely', 'Software Development', 7, 'UI/UX Design'),
      makeAgent('07', 'Buildy', 'Software Development', 7, 'Full-stack Dev'),
      makeAgent('08', 'Testy', 'Software Development', 7, 'QA & Testing'),
    ],
  },
  {
    level: 6,
    label: '6F',
    emoji: 'film',
    department: 'Content Division',
    departmentEn: 'Content Division',
    deptShort: 'Content',
    deptShortEn: 'Content',
    color: '#9B59B6',
    agents: [
      makeAgent('09', 'Buzzy', 'Content Division', 6, 'Social Media'),
      makeAgent('10', 'Wordy', 'Content Division', 6, 'Copywriting'),
      makeAgent('11', 'Edity', 'Content Division', 6, 'Video Editing'),
      makeAgent('12', 'Searchy', 'Content Division', 6, 'SEO & Research'),
    ],
  },
  {
    level: 5,
    label: '5F',
    emoji: 'trending-up',
    department: 'Marketing Division',
    departmentEn: 'Marketing Division',
    deptShort: 'Mktg',
    deptShortEn: 'Mktg',
    color: '#E67E22',
    agents: [
      makeAgent('13', 'Growthy', 'Marketing Division', 5, 'Growth Hacking'),
      makeAgent('14', 'Logoy', 'Marketing Division', 5, 'Brand Design'),
      makeAgent('15', 'Helpy', 'Marketing Division', 5, 'Customer Support'),
      makeAgent('16', 'Clicky', 'Marketing Division', 5, 'Ad Management'),
      makeAgent('17', 'Selly', 'Marketing Division', 5, 'Sales Strategy'),
    ],
  },
  {
    level: 4,
    label: '4F',
    emoji: 'server',
    department: 'ICT Division',
    departmentEn: 'ICT Division',
    deptShort: 'ICT',
    deptShortEn: 'ICT',
    color: '#1ABC9C',
    agents: [
      makeAgent('18', 'Stacky', 'ICT Division', 4, 'Infrastructure'),
      makeAgent('19', 'Watchy', 'ICT Division', 4, 'Monitoring'),
      makeAgent('20', 'Guardy', 'ICT Division', 4, 'Security'),
    ],
  },
  {
    level: 3,
    label: '3F',
    emoji: 'users',
    department: 'Human Resources',
    departmentEn: 'Human Resources',
    deptShort: 'BizOps',
    deptShortEn: 'BizOps',
    color: '#F39C12',
    agents: [
      makeAgent('21', 'Hiry', 'Human Resources', 3, 'Operations Support'),
      makeAgent('22', 'Evaly', 'Human Resources', 3, 'Data Analytics'),
    ],
  },
  {
    level: 2,
    label: '2F',
    emoji: 'coins',
    department: '_y Capital',
    departmentEn: '_y Capital',
    deptShort: 'Capital',
    deptShortEn: 'Capital',
    color: '#00D4AA',
    agents: [
      makeAgent('23', 'Quanty', '_y Capital', 2, 'Quantitative Analysis'),
      makeAgent('24', 'Tradey', '_y Capital', 2, 'Trading'),
      makeAgent('25', 'Globy', '_y Capital', 2, 'Global Markets'),
      makeAgent('26', 'Fieldy', '_y Capital', 2, 'Field Research'),
      makeAgent('27', 'Hedgy', '_y Capital', 2, 'Hedge Strategy'),
      makeAgent('28', 'Valuey', '_y Capital', 2, 'Valuation'),
    ],
  },
  {
    level: 1,
    label: '1F',
    emoji: 'cloud',
    department: '_y SaaS / Lobby',
    departmentEn: '_y SaaS / Lobby',
    deptShort: 'SaaS',
    deptShortEn: 'SaaS',
    color: '#3498DB',
    agents: [
      makeAgent('29', 'Opsy', '_y SaaS', 1, 'Operations'),
    ],
  },
];

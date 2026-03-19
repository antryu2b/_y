// Smallville-style simulation engine (client-side)

import { floors, Agent } from '@/data/floors';
import { generateDailyPlan, getCurrentScheduleItem, DailyPlan } from './planner';

export interface SimAgent {
  agent: Agent;
  plan: DailyPlan;
  position: { x: number; z: number }; // position within floor
  targetPosition: { x: number; z: number };
  currentFloor: number; // may differ from home floor (elevator, lobby)
  state: 'working' | 'meeting' | 'walking' | 'elevator' | 'idle' | 'chatting';
  lastActivity: string;
  lastActivityTime: number;
  chattingWith: string | null;
}

export interface ActivityLogEntry {
  timestamp: number;
  agentId: string;
  agentName: string;
  floor: number;
  activity: string;
  type: 'action' | 'chat' | 'movement' | 'reflection';
}

// All agents with their simulation state
const simAgents: Map<string, SimAgent> = new Map();
const activityLog: ActivityLogEntry[] = [];

// Floor layout positions
const DESK_POSITIONS: Record<number, { x: number; z: number }[]> = {
  10: [{ x: -4, z: 0 }],
  9: [{ x: -6, z: -2 }, { x: -2, z: -2 }, { x: 2, z: -2 }],
  8: [{ x: -4, z: -2 }, { x: 2, z: -2 }],
  7: [{ x: -6, z: -2 }, { x: -2, z: -2 }, { x: 2, z: -2 }],
  6: [{ x: -6, z: -2 }, { x: -3, z: -2 }, { x: 0, z: -2 }, { x: 3, z: -2 }],
  5: [{ x: -7, z: -2 }, { x: -4, z: -2 }, { x: -1, z: -2 }, { x: 2, z: -2 }, { x: 5, z: -2 }],
  4: [{ x: -5, z: -2 }, { x: -1, z: -2 }, { x: 3, z: -2 }],
  3: [{ x: -4, z: -2 }, { x: 1, z: -2 }],
  2: [{ x: -7, z: -2 }, { x: -4, z: -2 }, { x: -1, z: -2 }, { x: 2, z: -2 }, { x: 5, z: -2 }, { x: 8, z: -2 }],
  1: [{ x: -2, z: -2 }],
};

const MEETING_POSITION = { x: 5, z: 2 };
const ELEVATOR_POSITION = { x: 9, z: 0 };

export function initializeSimulation(): void {
  for (const floor of floors) {
    const deskPositions = DESK_POSITIONS[floor.level] || [{ x: 0, z: 0 }];
    floor.agents.forEach((agent, idx) => {
      const deskPos = deskPositions[idx % deskPositions.length];
      const plan = generateDailyPlan(agent.id, agent.department);
      simAgents.set(agent.id, {
        agent,
        plan,
        position: { ...deskPos },
        targetPosition: { ...deskPos },
        currentFloor: floor.level,
        state: 'working',
        lastActivity: '업무 시작',
        lastActivityTime: Date.now(),
        chattingWith: null,
      });
    });
  }
}

export function getSimAgent(agentId: string): SimAgent | undefined {
  return simAgents.get(agentId);
}

export function getAllSimAgents(): SimAgent[] {
  return Array.from(simAgents.values());
}

export function getActivityLog(count: number = 20): ActivityLogEntry[] {
  return activityLog.slice(-count);
}

export function simulationStep(): ActivityLogEntry[] {
  const newActivities: ActivityLogEntry[] = [];

  for (const [id, sim] of simAgents) {
    // Update current schedule
    const currentItem = getCurrentScheduleItem(sim.plan);
    const prevActivity = sim.lastActivity;

    // Determine target position based on schedule
    const homeFloor = sim.agent.floor;
    const deskPositions = DESK_POSITIONS[homeFloor] || [{ x: 0, z: 0 }];
    const agentIndex = floors.find(f => f.level === homeFloor)?.agents.findIndex(a => a.id === id) || 0;
    const deskPos = deskPositions[agentIndex % deskPositions.length];

    switch (currentItem.location) {
      case 'desk':
        sim.targetPosition = { ...deskPos };
        sim.currentFloor = homeFloor;
        sim.state = 'working';
        break;
      case 'meeting':
        sim.targetPosition = { ...MEETING_POSITION };
        sim.currentFloor = homeFloor;
        sim.state = 'meeting';
        break;
      case 'elevator':
        sim.targetPosition = { ...ELEVATOR_POSITION };
        sim.state = 'elevator';
        break;
      case 'lobby':
        sim.targetPosition = { x: 0, z: 0 };
        sim.currentFloor = 1;
        sim.state = 'walking';
        break;
      default:
        sim.targetPosition = { ...deskPos };
        sim.state = 'working';
    }

    // Add random micro-movements
    if (sim.state === 'working' && Math.random() < 0.1) {
      sim.targetPosition = {
        x: deskPos.x + (Math.random() - 0.5) * 2,
        z: deskPos.z + (Math.random() - 0.5) * 1,
      };
    }

    // Lerp position toward target
    sim.position.x += (sim.targetPosition.x - sim.position.x) * 0.1;
    sim.position.z += (sim.targetPosition.z - sim.position.z) * 0.1;

    // Log activity change
    if (currentItem.activity !== prevActivity) {
      sim.lastActivity = currentItem.activity;
      sim.lastActivityTime = Date.now();

      const entry: ActivityLogEntry = {
        timestamp: Date.now(),
        agentId: id,
        agentName: sim.agent.name,
        floor: sim.currentFloor,
        activity: getAgentActivity(id),
        type: 'action',
      };
      newActivities.push(entry);
      activityLog.push(entry);
    }

    // Random agent-to-agent interaction
    if (Math.random() < 0.02) {
      const sameFloorAgents = Array.from(simAgents.values()).filter(
        s => s.currentFloor === sim.currentFloor && s.agent.id !== id
      );
      if (sameFloorAgents.length > 0) {
        const other = sameFloorAgents[Math.floor(Math.random() * sameFloorAgents.length)];
        const chatEntry: ActivityLogEntry = {
          timestamp: Date.now(),
          agentId: id,
          agentName: sim.agent.name,
          floor: sim.currentFloor,
          activity: `${other.agent.name}와(과) 대화 중`,
          type: 'chat',
        };
        newActivities.push(chatEntry);
        activityLog.push(chatEntry);
        sim.chattingWith = other.agent.id;
        setTimeout(() => { sim.chattingWith = null; }, 10000);
      }
    }
  }

  // Trim activity log
  if (activityLog.length > 200) {
    activityLog.splice(0, activityLog.length - 200);
  }

  return newActivities;
}

// Agent-specific activities based on their roles
const AGENT_ACTIVITIES: Record<string, string[]> = {
  searchy: ['Scanning latest news feeds...', 'Analyzing keyword trends...', 'Monitoring search rankings...'],
  skepty: ['Reviewing risk assessments...', 'Auditing security protocols...', 'Checking compliance alerts...'],
  buzzy: ['Preparing content strategy...', 'Scheduling social media posts...', 'Analyzing campaign metrics...'],
  stacky: ['Running code quality checks...', 'Monitoring deployment status...', 'Updating infrastructure...'],
  guardy: ['Scanning for vulnerabilities...', 'Reviewing access logs...', 'Updating security patches...'],
  counsely: ['Synthesizing daily briefing...', 'Preparing strategic analysis...', 'Coordinating department reports...'],
  quanty: ['Analyzing market indicators...', 'Running trading algorithms...', 'Backtesting strategies...'],
  buildy: ['Deploying new features...', 'Code review in progress...', 'Architecture planning...'],
  watchy: ['Monitoring system health...', 'Checking server metrics...', 'Alert management...'],
  opsy: ['Managing SaaS operations...', 'Customer support tasks...', 'Service optimization...'],
};

export function getAgentActivity(agentId: string): string {
  const activities = AGENT_ACTIVITIES[agentId] || [
    'Processing data...', 'Analyzing information...', 'Preparing reports...',
  ];
  return activities[Math.floor(Math.random() * activities.length)];
}

// Auto-generate some initial activities
export function seedInitialActivities(): void {
  const agents = getAllSimAgents();
  
  for (const sim of agents.slice(0, 10)) {
    const activity = getAgentActivity(sim.agent.id);
    activityLog.push({
      timestamp: Date.now() - Math.floor(Math.random() * 600000),
      agentId: sim.agent.id,
      agentName: sim.agent.name,
      floor: sim.currentFloor,
      activity,
      type: 'action',
    });
  }
  activityLog.sort((a, b) => a.timestamp - b.timestamp);
}

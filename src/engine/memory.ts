// Smallville-style Memory Stream

export interface MemoryEntry {
  timestamp: number;
  description: string;
  importance: number; // 1-10
  type: 'observation' | 'action' | 'conversation' | 'reflection';
}

export interface AgentMemory {
  id: string;
  name: string;
  observations: MemoryEntry[];
  reflections: string[];
  relationships: Record<string, number>; // agentId → affinity (-10 to 10)
}

const memoryStore: Map<string, AgentMemory> = new Map();

export function getMemory(agentId: string, agentName: string): AgentMemory {
  if (!memoryStore.has(agentId)) {
    memoryStore.set(agentId, {
      id: agentId,
      name: agentName,
      observations: [],
      reflections: [],
      relationships: {},
    });
  }
  return memoryStore.get(agentId)!;
}

export function addObservation(
  agentId: string,
  agentName: string,
  description: string,
  importance: number,
  type: MemoryEntry['type'] = 'observation'
): void {
  const mem = getMemory(agentId, agentName);
  mem.observations.push({
    timestamp: Date.now(),
    description,
    importance: Math.min(10, Math.max(1, importance)),
    type,
  });
  // Keep last 100 observations
  if (mem.observations.length > 100) {
    mem.observations = mem.observations.slice(-100);
  }
}

export function getRecentMemories(agentId: string, agentName: string, count: number = 10): MemoryEntry[] {
  const mem = getMemory(agentId, agentName);
  return mem.observations.slice(-count);
}

export function addReflection(agentId: string, agentName: string, reflection: string): void {
  const mem = getMemory(agentId, agentName);
  mem.reflections.push(reflection);
  if (mem.reflections.length > 20) {
    mem.reflections = mem.reflections.slice(-20);
  }
}

export function getMemorySnapshot(agentId: string, agentName: string) {
  const mem = getMemory(agentId, agentName);
  return {
    recentObservations: mem.observations.slice(-15),
    reflections: mem.reflections.slice(-5),
    relationships: mem.relationships,
  };
}

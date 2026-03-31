/**
 * Autoresearch Loop — Karpathy-inspired self-improvement
 *
 * Flow:
 * 1. Agent generates response
 * 2. Grade against qualityChecklist (Yes/No per item)
 * 3. If score < 95%, tweak ONE thing and regenerate
 * 4. Re-grade → keep if better, rollback if worse
 * 5. Stop at 95%+ or 3 consecutive no-improvement rounds
 *
 * The real value = changelog (what worked, what didn't)
 */

import { agentSkills } from '@/data/skills';

export interface GradeResult {
  score: number;        // 0-100
  passed: string[];     // items that passed
  failed: string[];     // items that failed
  total: number;
}

export interface AutoresearchRound {
  round: number;
  score: number;
  change: string;       // what was tweaked
  improved: boolean;
}

export interface AutoresearchResult {
  finalResponse: string;
  finalScore: number;
  rounds: AutoresearchRound[];
  changelog: string[];  // the real gold
  totalRounds: number;
}

/**
 * Check if an agent has a quality checklist
 */
export function hasChecklist(agentId: string): boolean {
  return !!(agentSkills[agentId]?.qualityChecklist?.length);
}

/**
 * Get the checklist for an agent
 */
export function getChecklist(agentId: string): string[] {
  return agentSkills[agentId]?.qualityChecklist || [];
}

/**
 * Build a grading prompt that asks the LLM to grade a response
 */
export function buildGradePrompt(agentId: string, originalQuery: string, response: string): string {
  const checklist = getChecklist(agentId);
  if (!checklist.length) return '';

  return `You are a quality grader. Grade the following response against the checklist.

## Original Question
${originalQuery}

## Response to Grade
${response}

## Quality Checklist
${checklist.map((item, i) => `${i + 1}. ${item}`).join('\n')}

## Instructions
For each checklist item, answer YES or NO.
Then identify the SINGLE most impactful failed item to fix.

Respond in this exact JSON format:
{
  "grades": [${checklist.map((_, i) => `{"item": ${i + 1}, "pass": true/false}`).join(', ')}],
  "weakest": "The single most impactful item to improve",
  "suggestion": "Specific, actionable suggestion to fix the weakest item"
}`;
}

/**
 * Build a refinement prompt that asks the LLM to improve one thing
 */
export function buildRefinePrompt(
  agentId: string,
  originalQuery: string,
  previousResponse: string,
  weakest: string,
  suggestion: string
): string {
  return `You previously answered a question but your response could be improved.

## Original Question
${originalQuery}

## Your Previous Response
${previousResponse}

## What to Improve
Weakness: ${weakest}
Suggestion: ${suggestion}

## Instructions
Rewrite your response, fixing ONLY the identified weakness. Keep everything else the same.
Do not mention that you're improving or refining. Just give the better response directly.`;
}

/**
 * Parse grade response from LLM
 */
export function parseGradeResponse(response: string, checklistLength: number): GradeResult {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { score: 50, passed: [], failed: ['Could not parse grade'], total: checklistLength };
    }

    const data = JSON.parse(jsonMatch[0]);
    const grades = data.grades || [];
    const passed: string[] = [];
    const failed: string[] = [];

    for (const grade of grades) {
      if (grade.pass) {
        passed.push(`Item ${grade.item}`);
      } else {
        failed.push(`Item ${grade.item}`);
      }
    }

    const score = Math.round((passed.length / checklistLength) * 100);
    return { score, passed, failed, total: checklistLength };
  } catch {
    return { score: 50, passed: [], failed: ['Parse error'], total: checklistLength };
  }
}

/**
 * Determine if autoresearch should run for this request
 * Only runs for substantive queries, not casual chat
 */
export function shouldAutoResearch(agentId: string, message: string): boolean {
  if (!hasChecklist(agentId)) return false;

  // Skip for very short messages (casual chat)
  if (message.length < 15) return false;

  // Skip for greetings
  const greetings = ['안녕', 'hi', 'hello', '뭐해', 'ㅋㅋ', 'ㅎㅎ', 'ㅇㅇ', '오키', 'ok', '감사', 'thanks'];
  const lower = message.toLowerCase();
  if (greetings.some(g => lower === g || lower.startsWith(g + ' '))) return false;

  // Run for questions, analysis requests, report requests
  const triggers = [
    '분석', '보고', '리포트', '검토', '전략', '계획', '설계', '평가', '조사', '리서치',
    'analyze', 'report', 'review', 'strategy', 'plan', 'design', 'evaluate', 'research',
    '어떻게', '왜', '비교', '추천', '제안', '방법', '문제',
    '?', '？',
  ];

  return triggers.some(t => lower.includes(t));
}

/**
 * Format changelog for display/storage
 */
export function formatChangelog(rounds: AutoresearchRound[]): string {
  if (!rounds.length) return 'No refinement needed.';

  return rounds.map(r => {
    const icon = r.improved ? '✅' : '❌';
    return `${icon} Round ${r.round} (${r.score}%): ${r.change}`;
  }).join('\n');
}

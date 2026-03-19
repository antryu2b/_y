import { isDemoMode, DEMO_AGENT_STATUS } from '../../../lib/demo-data';

export async function GET() {
  if (isDemoMode()) return Response.json(DEMO_AGENT_STATUS);
  return Response.json([]);
}

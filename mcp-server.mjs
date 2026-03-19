#!/usr/bin/env node
/**
 * _y Holdings MCP Server (official SDK, ESM)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_BASE = 'https://y-company-sigma.vercel.app/api/mcp';

const server = new McpServer({
  name: '_y Holdings',
  version: '1.0.0'
});

server.tool('list_agents', 'List all 30 AI agents in _y Holdings', {}, async () => {
  return makeResponse(await callAPI('list_agents'));
});

server.tool('agent_status', 'Get real-time activity status of all agents', {}, async () => {
  return makeResponse(await callAPI('agent_status'));
});

server.tool('decisions', 'Get recent decisions from the Decision Pipeline', { limit: z.number().optional() }, async ({ limit }) => {
  return makeResponse(await callAPI('decisions', { limit }));
});

server.tool('reports', 'Get recent agent reports', { limit: z.number().optional(), agent_id: z.string().optional() }, async ({ limit, agent_id }) => {
  return makeResponse(await callAPI('reports', { limit, agent_id }));
});

server.tool('trades', 'Get S&P500 MES futures trading data', { limit: z.number().optional() }, async ({ limit }) => {
  return makeResponse(await callAPI('trades', { limit }));
});

server.tool('company_info', 'Get _y Holdings company structure and mission', {}, async () => {
  return makeResponse(await callAPI('company_info'));
});

function makeResponse(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

async function callAPI(tool, params = {}) {
  const q = new URLSearchParams({ tool });
  if (params.limit) q.set('limit', String(params.limit));
  if (params.agent_id) q.set('agent_id', params.agent_id);
  const res = await fetch(`${API_BASE}?${q}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write('_y Holdings MCP Server running\n');

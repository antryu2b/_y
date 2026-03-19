#!/usr/bin/env node
const https = require('https');
const API = 'https://y-company-sigma.vercel.app/api/mcp';
const TOOLS = [
  {name:'list_agents',description:'List all 30 AI agents',inputSchema:{type:'object',properties:{}}},
  {name:'agent_status',description:'Get agent activity status',inputSchema:{type:'object',properties:{}}},
  {name:'decisions',description:'Get decisions',inputSchema:{type:'object',properties:{limit:{type:'number'}}}},
  {name:'reports',description:'Get agent reports',inputSchema:{type:'object',properties:{limit:{type:'number'},agent_id:{type:'string'}}}},
  {name:'trades',description:'Get S&P500 trading data',inputSchema:{type:'object',properties:{limit:{type:'number'}}}},
  {name:'company_info',description:'Get company info',inputSchema:{type:'object',properties:{}}}
];
let buf = '';
function send(o) {
  const j = JSON.stringify(o);
  process.stdout.write('Content-Length: ' + Buffer.byteLength(j) + '\r\n\r\n' + j);
}
function get(u) {
  return new Promise((resolve, reject) => {
    const p = new URL(u);
    https.get({hostname:p.hostname, path:p.pathname+p.search}, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({raw:d}); } });
    }).on('error', reject);
  });
}
async function handle(m) {
  const {id, method, params} = m;
  if (method === 'initialize') {
    send({jsonrpc:'2.0', id, result:{protocolVersion:(params&&params.protocolVersion)||'2024-11-05', capabilities:{tools:{}}, serverInfo:{name:'_y Holdings',version:'1.0.0'}}});
  } else if (method === 'notifications/initialized') {
  } else if (method === 'tools/list') {
    send({jsonrpc:'2.0', id, result:{tools:TOOLS}});
  } else if (method === 'tools/call') {
    try {
      const {name, arguments:a={}} = params;
      let q = '?tool=' + name;
      if (a.limit) q += '&limit=' + a.limit;
      if (a.agent_id) q += '&agent_id=' + a.agent_id;
      const d = await get(API + q);
      send({jsonrpc:'2.0', id, result:{content:[{type:'text', text:JSON.stringify(d,null,2)}]}});
    } catch(e) {
      send({jsonrpc:'2.0', id, result:{content:[{type:'text', text:'Error: '+e.message}], isError:true}});
    }
  } else if (id !== undefined) {
    send({jsonrpc:'2.0', id, error:{code:-32601, message:'Unknown'}});
  }
}
function tryParse() {
  let sep = buf.indexOf('\r\n\r\n');
  let gap = 4;
  if (sep === -1) { sep = buf.indexOf('\n\n'); gap = 2; }
  if (sep === -1) return;
  const hdr = buf.slice(0, sep);
  const mt = hdr.match(/Content-Length:\s*(\d+)/i);
  if (!mt) { buf = buf.slice(sep + gap); tryParse(); return; }
  const len = parseInt(mt[1]);
  const start = sep + gap;
  if (buf.length < start + len) return;
  const body = buf.slice(start, start + len);
  buf = buf.slice(start + len);
  try { handle(JSON.parse(body)); } catch(e) { process.stderr.write('Parse error: ' + e.message + '\n'); }
  tryParse();
}
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { buf += c; tryParse(); });
process.stdin.resume();
setInterval(() => {}, 60000);
process.stderr.write('_y Holdings MCP Server started\n');

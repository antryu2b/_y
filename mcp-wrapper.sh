#!/bin/bash
LOG="/tmp/mcp-y-holdings-debug.log"
echo "=== $(date) ===" >> "$LOG"
echo "PWD: $(pwd)" >> "$LOG"
echo "PATH: $PATH" >> "$LOG"
echo "NODE: $(which node 2>&1)" >> "$LOG"
echo "NODE_VER: $(node --version 2>&1)" >> "$LOG"
echo "ARGS: $@" >> "$LOG"
echo "Starting server..." >> "$LOG"

exec /opt/homebrew/bin/node /Users/andrew/.openclaw/workspace/y-company/mcp-server.js 2>> "$LOG"

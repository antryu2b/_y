#!/bin/bash
# Generate isometric agent sprites for all remaining agents (01-03 already done)
GEMINI_API_KEY="AIzaSyDe6yPupT5RzsOMyU-UNc_AdUfOmgJA7us"
SCRIPT="/opt/homebrew/lib/node_modules/openclaw/skills/nano-banana-pro/scripts/generate_image.py"
OUT="/Users/andrew/.openclaw/workspace/y-company/public/agents-iso"

mkdir -p "$OUT"

# Agent definitions: number|name|description
AGENTS=(
  "04|skepty|red armored robot with warning symbols, analyzing risk charts on multiple screens, skeptical pose with arms crossed"
  "05|audity|white armored robot with magnifying glass, reviewing audit documents and spreadsheets, meticulous and precise"
  "06|pixely|purple armored robot with stylus pen, designing UI mockups on drawing tablet, creative workspace with color palettes"
  "07|buildy|green armored robot typing on keyboard, multiple code editors on screens, coffee mug nearby, focused coding"
  "08|testy|yellow-green armored robot running test suites on monitor, bug tracking board behind, clipboard in hand"
  "09|buzzy|orange armored robot managing social media dashboards, phone in one hand, trending charts on screen"
  "10|wordy|teal armored robot writing on paper, surrounded by notebooks and pens, dictionary on desk"
  "11|edity|dark purple armored robot editing video timeline on wide monitor, film reels and camera nearby"
  "12|searchy|navy blue armored robot with magnifying glass, search engine results on screen, data graphs"
  "13|growthy|bright orange armored robot analyzing growth charts, upward arrows on whiteboard, energetic pose"
  "14|logoy|pink armored robot designing logos on screen, color wheel and design tools on desk"
  "15|helpy|light blue armored robot with headset, customer support chat on screen, friendly wave"
  "16|clicky|red-orange armored robot managing ad campaigns on screen, click metrics dashboard"
  "17|selly|gold armored robot on phone call, sales pipeline on screen, confident stance"
  "18|stacky|dark green armored robot managing server racks, terminal with code on screen, network cables"
  "19|watchy|cyan armored robot monitoring dashboards with alerts, multiple screens showing graphs and logs"
  "20|guardy|black armored robot with shield emblem, security firewall interface on screen, vigilant pose"
  "21|hiry|warm orange armored robot reviewing resumes on screen, interview notes on desk"
  "22|evaly|bronze armored robot with evaluation forms and charts, performance metrics on whiteboard"
  "23|quanty|silver-blue armored robot with mathematical formulas on screens, quantitative models and data"
  "24|tradey|dark gold armored robot watching stock tickers and candlestick charts, fast-paced trading desk"
  "25|globy|royal blue armored robot with world map on screen, global market data, globe on desk"
  "26|fieldy|olive green armored robot with binoculars, field research notes and photos on desk"
  "27|hedgy|charcoal armored robot analyzing hedge fund strategies, complex derivatives charts on screen"
  "28|valuey|deep blue armored robot with financial statements, DCF models on screen, calculator"
  "29|opsy|steel gray armored robot managing operations dashboard, workflow diagrams, efficiency metrics"
)

BASE_PROMPT="Isometric pixel art style robot character at office desk, SimCity 2000 game art style, humanoid robot with _y marking on helmet visor"

for agent in "${AGENTS[@]}"; do
  IFS='|' read -r num name desc <<< "$agent"
  OUTFILE="$OUT/${num}-${name}-iso.png"
  
  if [ -f "$OUTFILE" ]; then
    echo "SKIP: $OUTFILE exists"
    continue
  fi
  
  echo "Generating $num-$name..."
  GEMINI_API_KEY="$GEMINI_API_KEY" uv run "$SCRIPT" \
    --prompt "$BASE_PROMPT, number $num on shoulder, $desc, warm office lighting, TRANSPARENT BACKGROUND, game sprite asset, full body visible" \
    --filename "$OUTFILE" \
    --resolution 2K 2>&1 | tail -1
  
  # Rate limit: small delay between calls
  sleep 2
done

echo "DONE: All agents generated"

#!/bin/bash
set -e

echo "🏗️  Setting up _y Holdings..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ required (you have v$NODE_VERSION)"
    exit 1
fi

echo "✅ Node.js $(node -v) found"
echo ""

# Install
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Check Ollama
if command -v ollama &> /dev/null; then
    echo "✅ Ollama found - you can use local models"
    if ! pgrep -x ollama > /dev/null; then
        echo "   ⚠️  Ollama not running - start with: ollama serve"
    fi
else
    echo "ℹ️  Ollama not found (optional)"
fi
echo ""

# .env
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'EOF'
DB_PATH=./data/y-company.db
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
CHAT_QUEUE_MODE=false
EOF
    echo "✅ .env created (SQLite mode, no API keys needed)"
else
    echo "✅ .env exists"
fi
echo ""

# DB
echo "🗄️  Initializing database..."
mkdir -p data
echo "   (database will auto-init on first run)"
echo "✅ Database ready"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✨ Setup complete!"
echo ""
echo "Start your AI company:"
echo "  npm run dev"
echo ""
echo "Then open: http://localhost:3000"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Install Ollama for free local LLMs: curl -fsSL https://ollama.ai/install.sh | sh"
echo "  2. Pull a model: ollama pull qwen2.5:7b"
echo "  3. Or add cloud API keys to .env (OpenAI, Anthropic, Gemini)"
echo ""

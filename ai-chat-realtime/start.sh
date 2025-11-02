#!/bin/bash

echo "🚀 AI Chat Realtime Startup Script"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp .env.example .env
    echo "📝 Please edit .env and add your API keys, then run this script again."
    exit 1
fi

# Check for at least one API key
API_KEYS_FOUND=0
if grep -q "^OPENAI_API_KEY=.*[^=]" .env; then
    echo "✅ OpenAI API key found"
    API_KEYS_FOUND=1
fi
if grep -q "^ANTHROPIC_API_KEY=.*[^=]" .env; then
    echo "✅ Anthropic API key found"
    API_KEYS_FOUND=1
fi
if grep -q "^GROK_API_KEY=.*[^=]" .env; then
    echo "✅ Grok API key found"
    API_KEYS_FOUND=1
fi

if [ $API_KEYS_FOUND -eq 0 ]; then
    echo "⚠️  No API keys found in .env file. Please add at least one API key."
    echo "📝 Edit .env and add your API keys, then run this script again."
    exit 1
fi

echo ""
echo "Choose startup mode:"
echo "1) Development with live reloading (recommended for development)"
echo "2) Production build (nginx + optimized)"
echo "3) Debug mode (simple setup for troubleshooting)"

read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo "🔄 Starting development mode with live reloading..."
        echo "   - Server: Live reload on file changes"
        echo "   - Client: Vite dev server with HMR"
        echo "   - URLs: http://localhost:3000 (client), http://localhost:3001 (server)"
        echo ""
        docker compose -f docker-compose.dev.yml down --volumes
        docker compose -f docker-compose.dev.yml up --build
        ;;
    2)
        echo "🏭 Starting production mode..."
        echo "   - Server: Optimized build"
        echo "   - Client: Nginx serving built files"
        echo "   - URLs: http://localhost:3000 (client), http://localhost:3001 (server)"
        echo ""
        docker compose -f docker-compose.prod.yml down --volumes
        docker compose -f docker-compose.prod.yml up --build
        ;;
    3)
        echo "🧪 Starting debug mode..."
        echo "   - Server: Standard build"
        echo "   - Client: Simple serve setup"
        echo "   - URLs: http://localhost:3000 (client), http://localhost:3001 (server)"
        echo ""
        docker compose -f docker-compose.debug.yml down --volumes
        docker compose -f docker-compose.debug.yml up --build
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

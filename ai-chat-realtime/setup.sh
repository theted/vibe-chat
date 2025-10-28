#!/bin/bash
set -euo pipefail

echo "🚀 Setting up AI Chat Realtime..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION_RAW=$(node -v)
NODE_VERSION="${NODE_VERSION_RAW#v}"
IFS='.' read -r NODE_MAJOR NODE_MINOR NODE_PATCH <<< "${NODE_VERSION}"

if [ "${NODE_MAJOR:-0}" -lt 18 ]; then
    echo "❌ Node.js 18 or higher is required. Detected version: ${NODE_VERSION_RAW}"
    exit 1
fi

echo "✅ Node.js version detected: ${NODE_VERSION_RAW}"

# Check if Docker Compose is available
DOCKER_AVAILABLE=false
DOCKER_COMPOSE_COMMAND=()

if command -v docker &> /dev/null; then
    echo "✅ Docker version: $(docker -v)"
    if docker compose version > /dev/null 2>&1; then
        DOCKER_COMPOSE_COMMAND=(docker compose)
        DOCKER_AVAILABLE=true
        COMPOSE_VERSION=$(docker compose version | head -n 1)
        echo "✅ Docker Compose plugin detected: ${COMPOSE_VERSION}"
    fi
else
    echo "⚠️  Docker not found. Manual setup will be required."
fi

if [ "${DOCKER_AVAILABLE}" = false ] && command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_COMMAND=(docker-compose)
    DOCKER_AVAILABLE=true
    echo "✅ docker-compose version: $(docker-compose --version)"
fi

if [ "${DOCKER_AVAILABLE}" = false ]; then
    echo "⚠️  Docker Compose command not found. Manual setup will be required."
fi

# Copy environment file
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file and add your AI API keys before continuing."
    echo "   At least one API key is required for the system to work."
else
    echo "✅ .env file already exists"
fi

# Choose setup method
echo ""
echo "Choose setup method:"
echo "1) Docker Compose (recommended)"
echo "2) Manual setup"
echo "3) Just install dependencies"

read -rp "Enter choice (1-3): " choice

case $choice in
    1)
        if [ "${DOCKER_AVAILABLE}" = true ]; then
            echo "🐳 Starting with Docker Compose..."
            "${DOCKER_COMPOSE_COMMAND[@]}" up --build
        else
            echo "❌ Docker not available. Please choose option 2."
            exit 1
        fi
        ;;
    2)
        echo "📦 Installing dependencies manually..."
        
        # Install core dependencies
        echo "Installing ai-chat-core dependencies..."
        cd packages/ai-chat-core || exit 1
        npm install
        cd ../.. || exit 1
        
        # Install server dependencies
        echo "Installing server dependencies..."
        cd packages/server || exit 1
        npm install
        cd ../.. || exit 1
        
        # Install client dependencies
        echo "Installing client dependencies..."
        cd packages/client || exit 1
        npm install
        cd ../.. || exit 1
        
        echo "✅ Dependencies installed!"
        echo ""
        echo "To start the application:"
        echo "1. Terminal 1: cd packages/server && npm run dev"
        echo "2. Terminal 2: cd packages/client && npm run dev"
        echo "3. Open http://localhost:3000"
        ;;
    3)
        echo "📦 Installing dependencies only..."
        
        cd packages/ai-chat-core || exit 1
        npm install
        cd ../.. || exit 1
        cd packages/server || exit 1
        npm install
        cd ../.. || exit 1
        cd packages/client || exit 1
        npm install
        cd ../.. || exit 1
        
        echo "✅ All dependencies installed!"
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📚 Documentation:"
echo "   - README.md for full instructions"
echo "   - .env file for API key configuration"
echo ""
echo "🔧 Quick commands:"
echo "   - Development: docker-compose up"
echo "   - Production: docker-compose -f docker-compose.prod.yml up"
echo "   - Health check: curl http://localhost:3001/health"
echo ""
echo "Need help? Check the README.md file!"

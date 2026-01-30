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
            FORCE_INTERNAL_REDIS="${FORCE_INTERNAL_REDIS:-false}"
            FORCE_INTERNAL_CHROMA="${FORCE_INTERNAL_CHROMA:-false}"
            START_INTERNAL_REDIS="true"
            START_INTERNAL_CHROMA="true"
            EXTERNAL_REDIS_CONTAINER=""
            EXTERNAL_CHROMA_TARGET=""
            OUR_INTERNAL_REDIS_CONTAINERS=("ai-chat-redis" "ai-chat-redis-dev" "ai-chat-redis-prod" "ai-chat-redis-debug")
            OUR_INTERNAL_CHROMA_CONTAINERS=("ai-chat-chroma" "ai-chat-chroma-dev" "ai-chat-chroma-prod" "ai-chat-chroma-debug")

            detect_external_redis() {
                if [ "$FORCE_INTERNAL_REDIS" = "true" ]; then
                    return
                fi

                if command -v docker >/dev/null 2>&1; then
                    mapfile -t REDIS_CONTAINERS_RAW < <(docker ps --format '{{.Names}}|{{.Ports}}' || true)
                    for entry in "${REDIS_CONTAINERS_RAW[@]}"; do
                        IFS='|' read -r container ports <<< "$entry"
                        if [ -z "$container" ] || [ -z "$ports" ]; then
                            continue
                        fi
                        if [[ " ${OUR_INTERNAL_REDIS_CONTAINERS[*]} " =~ " ${container} " ]]; then
                            continue
                        fi
                        if [[ "$ports" == *":6379->"* ]]; then
                            START_INTERNAL_REDIS="false"
                            EXTERNAL_REDIS_CONTAINER="$container"
                            return
                        fi
                    done
                fi

                if [ "$START_INTERNAL_REDIS" = "true" ] && command -v lsof >/dev/null 2>&1; then
                    if lsof -iTCP:6379 -sTCP:LISTEN >/dev/null 2>&1; then
                        START_INTERNAL_REDIS="false"
                        EXTERNAL_REDIS_CONTAINER="host:6379"
                    fi
                fi
            }

            detect_external_chroma() {
                if [ "$FORCE_INTERNAL_CHROMA" = "true" ]; then
                    return
                fi

                if command -v docker >/dev/null 2>&1; then
                    mapfile -t CHROMA_CONTAINERS_RAW < <(docker ps --format '{{.Names}}|{{.Ports}}' || true)
                    for entry in "${CHROMA_CONTAINERS_RAW[@]}"; do
                        IFS='|' read -r container ports <<< "$entry"
                        if [ -z "$container" ] || [ -z "$ports" ]; then
                            continue
                        fi
                        if [[ " ${OUR_INTERNAL_CHROMA_CONTAINERS[*]} " =~ " ${container} " ]]; then
                            continue
                        fi
                        if [[ "$ports" == *":8000->"* ]]; then
                            START_INTERNAL_CHROMA="false"
                            EXTERNAL_CHROMA_TARGET="$container"
                            return
                        fi
                    done
                fi

                if [ "$START_INTERNAL_CHROMA" = "true" ] && command -v lsof >/dev/null 2>&1; then
                    if lsof -iTCP:8000 -sTCP:LISTEN >/dev/null 2>&1; then
                        START_INTERNAL_CHROMA="false"
                        EXTERNAL_CHROMA_TARGET="host:8000"
                    fi
                fi
            }

            detect_external_redis
            detect_external_chroma

            if [ "$FORCE_INTERNAL_REDIS" = "true" ]; then
                echo "ℹ️  FORCE_INTERNAL_REDIS=true — internal Redis will start even if another container is detected."
            elif [ "$START_INTERNAL_REDIS" = "false" ]; then
                if [ "$EXTERNAL_REDIS_CONTAINER" = "host:6379" ]; then
                    echo "ℹ️  Port 6379 is already in use on the host."
                    echo "   Skipping the bundled Redis service. Ensure REDIS_URL points to the external instance."
                else
                    echo "ℹ️  Detected existing Redis container \"${EXTERNAL_REDIS_CONTAINER}\" publishing port 6379."
                    echo "   Skipping the bundled Redis service. Ensure REDIS_URL points to the external instance."
                fi
            fi

            if [ "$FORCE_INTERNAL_CHROMA" = "true" ]; then
                echo "ℹ️  FORCE_INTERNAL_CHROMA=true — internal Chroma will start even if another container is detected."
            elif [ "$START_INTERNAL_CHROMA" = "false" ]; then
                if [ "$EXTERNAL_CHROMA_TARGET" = "host:8000" ]; then
                    echo "ℹ️  Port 8000 is already in use on the host."
                    echo "   Skipping the bundled Chroma vector store. Ensure CHROMA_URL points to the external instance."
                else
                    echo "ℹ️  Detected existing Chroma-compatible container \"${EXTERNAL_CHROMA_TARGET}\" publishing port 8000."
                    echo "   Skipping the bundled Chroma vector store. Ensure CHROMA_URL points to the external instance."
                fi
            fi

            if [ "$START_INTERNAL_REDIS" = "false" ] && [ -z "${REDIS_URL:-}" ]; then
                export REDIS_URL="redis://host.docker.internal:6379"
                echo "ℹ️  Defaulting REDIS_URL to ${REDIS_URL} so containers reach the external Redis."
            fi
            if [ "$START_INTERNAL_CHROMA" = "false" ] && [ -z "${CHROMA_URL:-}" ]; then
                export CHROMA_URL="http://host.docker.internal:8000"
                echo "ℹ️  Defaulting CHROMA_URL to ${CHROMA_URL} so containers reach the external Chroma instance."
            fi

            ACTIVE_PROFILES=()
            if [ "$START_INTERNAL_REDIS" = "true" ]; then
                ACTIVE_PROFILES+=("internal-redis")
            fi
            if [ "$START_INTERNAL_CHROMA" = "true" ]; then
                ACTIVE_PROFILES+=("internal-chroma")
            fi

            COMPOSE_PROFILE_ARGS=()
            for profile in "${ACTIVE_PROFILES[@]}"; do
                COMPOSE_PROFILE_ARGS+=(--profile "$profile")
            done

            "${DOCKER_COMPOSE_COMMAND[@]}" "${COMPOSE_PROFILE_ARGS[@]}" up --build
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
        
        # Install MCP assistant dependencies
        echo "Installing MCP assistant dependencies..."
        cd packages/mcp-assistant || exit 1
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
        cd packages/mcp-assistant || exit 1
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
echo "   - Development: docker compose --profile internal-redis --profile internal-chroma up"
echo "   - Production: docker compose --profile internal-redis --profile internal-chroma -f docker-compose.prod.yml up"
echo "   - Health check: curl http://localhost:3001/health"
echo ""
echo "Need help? Check the README.md file!"

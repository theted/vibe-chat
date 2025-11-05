#!/bin/bash

echo "🚀 Vibe Chat Startup Script"
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

FORCE_INTERNAL_REDIS=${FORCE_INTERNAL_REDIS:-false}
START_INTERNAL_REDIS=true
EXTERNAL_REDIS_CONTAINER=""
OUR_INTERNAL_REDIS_CONTAINERS=("ai-chat-redis" "ai-chat-redis-dev" "ai-chat-redis-prod" "ai-chat-redis-debug")

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
                START_INTERNAL_REDIS=false
                EXTERNAL_REDIS_CONTAINER=$container
                return
            fi
        done
    fi

    if [ "$START_INTERNAL_REDIS" = "true" ] && command -v lsof >/dev/null 2>&1; then
        if lsof -iTCP:6379 -sTCP:LISTEN >/dev/null 2>&1; then
            START_INTERNAL_REDIS=false
            EXTERNAL_REDIS_CONTAINER="host:6379"
        fi
    fi
}

detect_external_redis

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

if [ "$START_INTERNAL_REDIS" = "false" ] && [ -z "${REDIS_URL:-}" ]; then
    export REDIS_URL="redis://host.docker.internal:6379"
    echo "ℹ️  Defaulting REDIS_URL to ${REDIS_URL} so containers reach the external Redis."
fi

compose_with_optional_profile() {
    local compose_file=$1
    shift

    if [ "$START_INTERNAL_REDIS" = "true" ]; then
        docker compose --profile internal-redis -f "$compose_file" "$@"
    else
        docker compose -f "$compose_file" "$@"
    fi
}

case $choice in
    1)
        echo "🔄 Starting development mode with live reloading..."
        echo "   - Server: Live reload on file changes"
        echo "   - Client: Vite dev server with HMR"
        echo "   - URLs: http://localhost:3000 (client), http://localhost:3001 (server)"
        echo ""
        compose_with_optional_profile docker-compose.dev.yml down --volumes
        compose_with_optional_profile docker-compose.dev.yml up --build
        ;;
    2)
        echo "🏭 Starting production mode..."
        echo "   - Server: Optimized build"
        echo "   - Client: Nginx serving built files"
        echo "   - URLs: http://localhost:3000 (client), http://localhost:3001 (server)"
        echo ""
        compose_with_optional_profile docker-compose.prod.yml down --volumes
        compose_with_optional_profile docker-compose.prod.yml up --build
        ;;
    3)
        echo "🧪 Starting debug mode..."
        echo "   - Server: Standard build"
        echo "   - Client: Simple serve setup"
        echo "   - URLs: http://localhost:3000 (client), http://localhost:3001 (server)"
        echo ""
        compose_with_optional_profile docker-compose.debug.yml down --volumes
        compose_with_optional_profile docker-compose.debug.yml up --build
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

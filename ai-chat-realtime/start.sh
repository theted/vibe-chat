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
FORCE_INTERNAL_CHROMA=${FORCE_INTERNAL_CHROMA:-false}
START_INTERNAL_REDIS=true
START_INTERNAL_CHROMA=true
EXTERNAL_REDIS_CONTAINER=""
EXTERNAL_CHROMA_TARGET=""
OUR_INTERNAL_REDIS_CONTAINERS=("ai-chat-redis" "ai-chat-redis-dev" "ai-chat-redis-prod" "ai-chat-redis-debug")
OUR_INTERNAL_CHROMA_CONTAINERS=("ai-chat-chroma" "ai-chat-chroma-dev" "ai-chat-chroma-prod" "ai-chat-chroma-debug")

detect_external_redis() {
    if [ "$FORCE_INTERNAL_REDIS" = "true" ]; then
        return
    fi

    if command -v docker >/dev/null 2>&1; then
        # Use while read loop for better shell compatibility (mapfile not available in all shells)
        while IFS='|' read -r container ports; do
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
        done < <(docker ps --format '{{.Names}}|{{.Ports}}' 2>/dev/null || true)
    fi

    if [ "$START_INTERNAL_REDIS" = "true" ] && command -v lsof >/dev/null 2>&1; then
        if lsof -iTCP:6379 -sTCP:LISTEN >/dev/null 2>&1; then
            START_INTERNAL_REDIS=false
            EXTERNAL_REDIS_CONTAINER="host:6379"
        fi
    fi
}

detect_external_chroma() {
    if [ "$FORCE_INTERNAL_CHROMA" = "true" ]; then
        return
    fi

    if command -v docker >/dev/null 2>&1; then
        # Use while read loop for better shell compatibility (mapfile not available in all shells)
        while IFS='|' read -r container ports; do
            if [ -z "$container" ] || [ -z "$ports" ]; then
                continue
            fi
            if [[ " ${OUR_INTERNAL_CHROMA_CONTAINERS[*]} " =~ " ${container} " ]]; then
                continue
            fi
            if [[ "$ports" == *":8000->"* ]]; then
                START_INTERNAL_CHROMA=false
                EXTERNAL_CHROMA_TARGET=$container
                return
            fi
        done < <(docker ps --format '{{.Names}}|{{.Ports}}' 2>/dev/null || true)
    fi

    if [ "$START_INTERNAL_CHROMA" = "true" ] && command -v lsof >/dev/null 2>&1; then
        if lsof -iTCP:8000 -sTCP:LISTEN >/dev/null 2>&1; then
            START_INTERNAL_CHROMA=false
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

compose_with_profiles() {
    local compose_file=$1
    shift

    local compose_args=(docker compose)
    for profile in "${ACTIVE_PROFILES[@]}"; do
        compose_args+=("--profile" "$profile")
    done
    compose_args+=("-f" "$compose_file")
    compose_args+=("$@")
    "${compose_args[@]}"
}

case $choice in
    1)
        echo "🔄 Starting development mode with live reloading..."
        echo "   - Server: Live reload on file changes"
        echo "   - Client: Vite dev server with HMR"
        echo "   - URLs: http://localhost:3000 (client), http://localhost:3001 (server)"
        echo ""
        compose_with_profiles docker-compose.dev.yml down --volumes
        compose_with_profiles docker-compose.dev.yml up --build
        ;;
    2)
        echo "🏭 Starting production mode..."
        echo "   - Server: Optimized build"
        echo "   - Client: Nginx serving built files"
        echo "   - URLs: http://localhost:3000 (client), http://localhost:3001 (server)"
        echo ""
        compose_with_profiles docker-compose.prod.yml down --volumes
        compose_with_profiles docker-compose.prod.yml up --build
        ;;
    3)
        echo "🧪 Starting debug mode..."
        echo "   - Server: Standard build"
        echo "   - Client: Simple serve setup"
        echo "   - URLs: http://localhost:3000 (client), http://localhost:3001 (server)"
        echo ""
        compose_with_profiles docker-compose.debug.yml down --volumes
        compose_with_profiles docker-compose.debug.yml up --build
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

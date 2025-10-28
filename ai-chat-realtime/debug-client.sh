#!/bin/bash

echo "🔍 Debugging AI Chat Client Build Issues..."
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Please run this script from the ai-chat-realtime root directory"
    exit 1
fi

echo "📁 Checking client files..."
if [ ! -f "packages/client/package.json" ]; then
    echo "❌ packages/client/package.json not found"
    exit 1
else
    echo "✅ package.json found"
fi

if [ ! -f "packages/client/vite.config.js" ]; then
    echo "❌ packages/client/vite.config.js not found"
    exit 1
else
    echo "✅ vite.config.js found"
fi

if [ ! -f "packages/client/index.html" ]; then
    echo "❌ packages/client/index.html not found"
    exit 1
else
    echo "✅ index.html found"
fi

if [ ! -d "packages/client/src" ]; then
    echo "❌ packages/client/src directory not found"
    exit 1
else
    echo "✅ src directory found"
fi

echo ""
echo "🧪 Testing local build..."
cd packages/client

echo "📦 Installing dependencies..."
if npm install; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "🏗️  Building application..."
if npm run build; then
    echo "✅ Build completed successfully"
    if [ -d "dist" ]; then
        echo "✅ dist directory created"
        echo "📁 Build output files:"
        ls -la dist/
    else
        echo "❌ dist directory not found after build"
        exit 1
    fi
else
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "🐳 Testing Docker build..."
cd ../../

echo "🔨 Building with simple Dockerfile..."
if docker build -f packages/client/Dockerfile.simple -t ai-chat-client-test .; then
    echo "✅ Docker build successful with simple Dockerfile"
    
    echo "🧪 Testing container startup..."
    docker run --rm -d --name ai-chat-client-test-run -p 3002:3000 ai-chat-client-test
    
    sleep 5
    
    if curl -f http://localhost:3002 >/dev/null 2>&1; then
        echo "✅ Container is serving content successfully"
    else
        echo "⚠️  Container started but not serving content properly"
        echo "📋 Container logs:"
        docker logs ai-chat-client-test-run
    fi
    
    docker stop ai-chat-client-test-run
    docker rmi ai-chat-client-test
    
else
    echo "❌ Docker build failed with simple Dockerfile"
    exit 1
fi

echo ""
echo "✅ Debug complete! Try running:"
echo "   docker-compose -f docker-compose.debug.yml up --build"
echo ""
echo "If that works, then try the main compose file:"
echo "   docker-compose up --build"
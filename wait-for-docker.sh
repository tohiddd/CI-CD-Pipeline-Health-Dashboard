#!/bin/bash

echo "🐳 Waiting for Docker to be installed and running..."
echo "📁 Download location: ~/Downloads/DockerDesktop.dmg"
echo "🔧 Install Docker Desktop from Applications folder"
echo ""

# Function to check if Docker is ready
check_docker() {
    if command -v docker &> /dev/null; then
        if docker info &> /dev/null; then
            return 0
        else
            return 1
        fi
    else
        return 1
    fi
}

# Wait for Docker to be available
counter=0
max_wait=300  # 5 minutes max wait

while ! check_docker; do
    if [ $counter -eq 0 ]; then
        echo "⏳ Docker not ready yet..."
        echo "Please install Docker Desktop and start it"
        echo ""
    fi
    
    counter=$((counter + 5))
    if [ $counter -gt $max_wait ]; then
        echo "❌ Timed out waiting for Docker"
        echo "Please install Docker Desktop manually and run: make start"
        exit 1
    fi
    
    sleep 5
done

echo "✅ Docker is ready!"
echo "🚀 Building CI/CD Dashboard now..."
echo ""

# Once Docker is ready, start building
make start

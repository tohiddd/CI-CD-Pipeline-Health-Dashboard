#!/bin/bash

echo "🔄 Updating GitHub Token and Restarting Backend..."

# Check if token is provided
if [ "$1" = "" ]; then
    echo "❌ Usage: ./update-token.sh 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"
    echo "📝 Example: ./update-token.sh ghp_xxxxxxxxxxxxxxxxxxxx"
    exit 1
fi

TOKEN=$1

# Validate token format
if [[ ! $TOKEN =~ ^(ghp_|github_pat_) ]]; then
    echo "❌ Invalid token format. GitHub tokens should start with 'ghp_' or 'github_pat_'"
    exit 1
fi

echo "✅ Updating .env file with new token..."
sed -i '' "s/GITHUB_TOKEN=.*/GITHUB_TOKEN=$TOKEN/" .env

echo "🔄 Restarting backend service..."
docker-compose -f docker-compose.minimal.yml restart backend

echo "⏳ Waiting for backend to restart..."
sleep 5

echo "🔍 Testing backend health..."
curl -s http://localhost:3001/health | python3 -m json.tool

echo ""
echo "✅ Backend updated! Your dashboard is ready to monitor repositories!"
echo "🌐 Open: http://localhost:3000"
echo "➕ Click the + button to add your first repository!"

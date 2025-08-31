#!/bin/bash

echo "🧪 Slack Webhook Testing"
echo "======================="

# Check if backend is running
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo "❌ Backend not running. Please run 'make start' first."
    exit 1
fi

# Check Slack configuration status
SLACK_STATUS=$(curl -s http://localhost:3001/health | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['services']['slack'])" 2>/dev/null)

echo "📊 Service Status:"
echo "=================="
echo "Slack Webhook: $SLACK_STATUS"

if [ "$SLACK_STATUS" = "configured" ]; then
    echo "✅ Slack webhook is configured"
else
    echo "❌ Slack webhook not configured"
    echo "Run ./setup-slack.sh to configure Slack webhooks"
    exit 1
fi

echo ""
echo "📝 Current Configuration:"
if grep -q "SLACK_WEBHOOK_URL=" .env && ! grep -q "SLACK_WEBHOOK_URL=$" .env; then
    echo "✅ SLACK_WEBHOOK_URL is set in .env"
    WEBHOOK_URL=$(grep "SLACK_WEBHOOK_URL=" .env | cut -d'=' -f2)
    echo "📡 Webhook: ${WEBHOOK_URL:0:50}..."
else
    echo "❌ SLACK_WEBHOOK_URL not found or empty in .env"
    exit 1
fi

echo ""
echo "🧪 Testing Slack Integration..."
echo "==============================="

# Send test message
echo "📤 Sending test message to Slack..."
RESPONSE=$(curl -s -X GET "http://localhost:3001/api/slack/test")
STATUS=$(echo $RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('status', 'error'))" 2>/dev/null)

if [ "$STATUS" = "success" ]; then
    echo "✅ SUCCESS! Test message sent to Slack."
    echo ""
    echo "🔍 Response details:"
    echo $RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(f'Message: {data.get(\"message\", \"N/A\")}'); print(f'Time: {data.get(\"timestamp\", \"N/A\")}')" 2>/dev/null
    echo ""
    echo "👀 Check your Slack channel for the test message!"
else
    echo "❌ FAILED to send test message"
    echo ""
    echo "🔍 Error details:"
    echo $RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(f'Error: {data.get(\"error\", \"Unknown error\")}'); print(f'Message: {data.get(\"message\", \"N/A\")}')" 2>/dev/null
    echo ""
    echo "🛠️  Troubleshooting:"
    echo "• Verify your webhook URL is correct"
    echo "• Check Slack app permissions"
    echo "• Ensure the webhook is active in Slack"
fi

echo ""
echo "📋 Slack Alert Features:"
echo "========================"
echo "✨ Rich formatted notifications with:"
echo "  🎨 Color-coded status indicators"
echo "  📊 Repository, branch, and commit details"
echo "  🔗 Direct links to GitHub Actions and Dashboard"
echo "  ⏰ Timestamp and duration information"
echo "  🎯 Action buttons for quick access"
echo ""
echo "🔥 Alerts triggered on:"
echo "  • GitHub Actions pipeline failures"
echo "  • Jenkins build failures (if configured)"
echo "  • Real-time notifications (no polling delay)"
echo ""
echo "📊 Dashboard: http://localhost:3000"
echo "🔧 API Health: http://localhost:3001/health"

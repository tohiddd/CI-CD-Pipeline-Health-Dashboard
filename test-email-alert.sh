#!/bin/bash

echo "🧪 Testing Email Alert System"
echo "============================="

# Check if backend is running
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo "❌ Backend not running. Please run 'make start' first."
    exit 1
fi

echo "📧 Current Email Configuration:"
echo "==============================="
grep "SMTP_" .env | grep -v "#"
echo ""

echo "🔍 Checking email service status..."
EMAIL_STATUS=$(curl -s http://localhost:3001/health | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['services']['email'])" 2>/dev/null)
echo "Email Service: $EMAIL_STATUS"

if [ "$EMAIL_STATUS" = "configured" ]; then
    echo "✅ Email service is configured"
else
    echo "❌ Email service not configured"
    exit 1
fi

echo ""
echo "🔍 Checking recent email connection attempts..."
docker logs cicd-backend --tail 15 | grep -E "(Email|SMTP)" | tail -5

echo ""
echo "📨 To test email alerts manually:"
echo "1. Trigger a pipeline failure in one of your repositories"
echo "2. Check the email inbox configured in backend/server.js"
echo "3. Look for subject: '🚨 Pipeline Failure Alert - [repository-name]'"

echo ""
echo "🎯 Next Steps:"
echo "- If you see authentication errors above, choose a different email provider"
echo "- Gmail, Yahoo, or Mailtrap are good alternatives"
echo "- Update .env with new settings and run 'make restart'"

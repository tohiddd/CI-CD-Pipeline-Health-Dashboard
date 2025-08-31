#!/bin/bash

echo "✅ Verifying Outlook Email Configuration"
echo "======================================="

# Check if dashboard is running
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo "❌ Dashboard not running. Run 'make start' first."
    exit 1
fi

# Check email service status
EMAIL_STATUS=$(curl -s http://localhost:3001/health | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
echo "📧 Email Service Status: $EMAIL_STATUS"

if [ "$EMAIL_STATUS" = "configured" ]; then
    echo "✅ Email service is properly configured!"
else
    echo "❌ Email service not configured properly"
fi

# Show current configuration
echo ""
echo "📋 Current Email Settings:"
echo "========================="
grep "SMTP_" .env | grep -v "#"

# Check backend logs for email connection
echo ""
echo "🔍 Recent Email Connection Status:"
echo "=================================="
docker logs cicd-backend 2>/dev/null | grep -E "(Email|SMTP)" | tail -3 | grep -E "(✅|❌|ready|error)"

echo ""
echo "👥 Alert Recipients:"
grep -A1 "defaultRecipients" backend/server.js | grep "@"

echo ""
echo "🧪 To test email alerts:"
echo "1. Trigger a pipeline failure in one of your repositories"
echo "2. Check your Outlook inbox for failure notifications"
echo "3. Emails will have subject: '🚨 Pipeline Failure Alert - [repo-name]'"

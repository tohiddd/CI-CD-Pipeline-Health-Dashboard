#!/bin/bash

echo "🧪 Testing Email Configuration..."
echo "================================="

# Check if backend is running
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo "❌ Backend not running. Please run 'make start' first."
    exit 1
fi

# Check email configuration status
echo "🔍 Checking email service status..."
EMAIL_STATUS=$(curl -s http://localhost:3001/health | grep -o '"email":"[^"]*"' | cut -d'"' -f4)

if [ "$EMAIL_STATUS" = "configured" ]; then
    echo "✅ Email service is configured"
else
    echo "❌ Email service not configured"
    exit 1
fi

# Check backend logs for email errors
echo ""
echo "🔍 Checking recent email connection logs..."
docker logs cicd-backend --tail 20 | grep -E "(Email|SMTP|✅|❌)" | tail -3

echo ""
echo "📧 Current SMTP settings:"
grep -A4 "SMTP_" .env | grep -v "#"

echo ""
echo "👥 Alert recipients configured:"
grep -A2 "defaultRecipients" backend/server.js | grep -E "gmail|email"

echo ""
echo "🧪 To test email alerts:"
echo "1. Fix Gmail App Password if needed"
echo "2. Run 'make restart'"
echo "3. Trigger a pipeline failure to test alerts"

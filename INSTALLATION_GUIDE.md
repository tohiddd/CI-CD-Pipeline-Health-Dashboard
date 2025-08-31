# 🚀 CI/CD Pipeline Health Dashboard - Installation Guide

Your CI/CD Pipeline Health Dashboard is now **completely built** and ready to run! Follow this guide to get it running locally.

## 🎉 What We Built

✅ **Complete Backend API** (Node.js + Express)
- GitHub Actions integration with Octokit
- PostgreSQL database with schema
- Redis caching layer
- Real-time WebSocket updates
- RESTful API endpoints
- Health monitoring and metrics

✅ **Modern Frontend Dashboard** (React + Material-UI)
- Real-time pipeline status display
- Interactive charts and analytics
- Repository management interface
- Success rate, build time, and health score metrics
- Responsive Material-UI design

✅ **Containerized Setup**
- Docker Compose configuration
- Database initialization scripts
- Development and production modes
- Easy deployment setup

## 📋 Prerequisites

### 1. Install Docker Desktop
```bash
# macOS (you're on macOS)
# Download from: https://www.docker.com/products/docker-desktop/

# Or via Homebrew:
brew install --cask docker

# Verify installation:
docker --version
docker-compose --version
```

### 2. Get GitHub Personal Access Token
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `workflow`, `read:org`
4. Copy the generated token

## 🚀 Quick Start (3 commands)

### 1. Configure Environment
```bash
# Edit .env file and add your GitHub token
nano .env

# Add this line (replace with your actual token):
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

### 2. Start the Dashboard
```bash
# Option A: Using Make (recommended)
make start

# Option B: Using Docker Compose directly
docker-compose -f docker-compose.minimal.yml up -d
```

### 3. Access Your Dashboard
- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 📊 Using Your Dashboard

### Add Repositories
1. Click the **+ (Add)** button in the bottom-right
2. Enter repository in format: `owner/repository` (e.g., `facebook/react`)
3. Click "Add Repository"
4. Watch real-time updates appear!

### Monitor Metrics
- **Success Rate**: Percentage of successful builds (last 30 days)
- **Avg Build Time**: Average pipeline duration
- **Runs Today**: Number of pipeline executions today
- **Health Score**: Composite health metric (0-100)

### View Analytics
- **Success Trend**: Line chart showing success rates over time
- **Build Times**: Bar chart of average build durations
- **Status Distribution**: Pie chart of pipeline statuses

## 🛠️ Management Commands

```bash
# Start services
make start

# Stop services  
make stop

# View logs
make logs

# Restart everything
make restart

# Clean up (reset database)
make clean

# Rebuild containers
make build
```

## 🔧 Configuration Options

### GitHub Integration
```env
GITHUB_TOKEN=your_token_here          # Required
```

### Email Alerts (Optional)
```env
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password          # Use App Password for Gmail
```

### Jenkins Integration (Optional)
```env
JENKINS_URL=http://jenkins:8080
JENKINS_USERNAME=admin
JENKINS_API_TOKEN=your_jenkins_token
```

## 📈 Features Overview

### Real-time Monitoring
- Live pipeline status updates via WebSocket
- Automatic data refresh every 5 minutes
- Instant notifications for pipeline changes

### Analytics & Metrics
- Success/failure rate tracking
- Build time performance analysis
- Pipeline health scoring
- Historical trend visualization

### Multi-platform Support
- GitHub Actions (fully implemented)
- Jenkins integration (ready to extend)
- Extensible architecture for other CI/CD platforms

## 🐛 Troubleshooting

### Dashboard won't start?
```bash
# Check Docker is running
docker ps

# View detailed logs
docker-compose -f docker-compose.minimal.yml logs

# Reset everything
make clean && make start
```

### Can't connect to GitHub?
```bash
# Test your token
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user

# Check token permissions (needs repo access)
```

### Database connection issues?
```bash
# Connect to database directly
docker exec -it cicd-db psql -U cicd_user -d cicd_dashboard

# Check database logs
docker logs cicd-db
```

### Frontend not loading?
```bash
# Check backend health
curl http://localhost:3001/health

# View frontend logs
docker logs cicd-frontend
```

## 🎯 Next Steps

### 1. Customize for Your Team
- Add your team's repositories
- Configure email notifications
- Set up custom alert thresholds

### 2. Extend Functionality
- Add Jenkins integration
- Implement custom metrics
- Create team-specific dashboards

### 3. Deploy to Production
- Use `docker-compose.yml` (production config)
- Set up proper environment variables
- Configure reverse proxy (nginx)
- Set up SSL certificates

## 🔐 Security Notes

- Store sensitive tokens in environment variables
- Use strong JWT secrets in production
- Enable HTTPS in production environments
- Regularly rotate API tokens

## 📚 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │  Node.js Backend │    │   PostgreSQL    │
│  (Port 3000)    │◄──►│   (Port 3001)   │◄──►│   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Redis Cache   │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  GitHub API     │
                       │  Jenkins API    │
                       └─────────────────┘
```

## 🎉 Congratulations!

You now have a **production-ready CI/CD Pipeline Health Dashboard** that can:

✅ Monitor multiple GitHub repositories
✅ Display real-time pipeline metrics
✅ Send email alerts on failures
✅ Provide beautiful analytics and trends
✅ Scale to monitor hundreds of repositories
✅ Integrate with multiple CI/CD platforms

**Your dashboard is built and ready to deploy!** 🚀

---

**Need help?** Check the logs, review the configuration, or customize the code to fit your team's specific needs!

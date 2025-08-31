# CI/CD Pipeline Health Dashboard

A modern, containerized dashboard for monitoring GitHub Actions and Jenkins pipeline health in real-time.

## Features


- 📊 **Real-time Metrics**: Success/failure rates, build times, pipeline status
- 🔍 **Detailed Logs**: View complete pipeline logs and job details
- 🗂️ **Repository Management**: Add/remove repositories via web UI
- 📱 **Notifications**: Email and Slack alerts for pipeline failures
- ⚡ **Live Updates**: WebSocket-powered real-time dashboard updates
- 🐳 **Containerized**: Full Docker deployment with minimal setup

## Quick Start

### Prerequisites
- Docker and Docker Compose
- GitHub Personal Access Token

### Setup

1. **Clone and configure:**
   ```bash
   git clone https://github.com/tohiddd/CI-CD-Pipeline-Health-Dashboard.git
   cd CI-CD-Pipeline-Health-Dashboard
   cp env.template .env
   ```

2. **Add your GitHub token to `.env`:**
   ```bash
   GITHUB_TOKEN=your_github_token_here
   ```

3. **Start the dashboard:**
   ```bash
   make start
   ```

4. **Open dashboard:**
   ```
   Frontend: http://localhost:3000
   Backend API: http://localhost:3001
   ```

## Configuration

### Environment Variables (`.env`)

**Required:**
- `GITHUB_TOKEN` - GitHub Personal Access Token

**Optional:**
- `SLACK_WEBHOOK_URL` - For Slack notifications
- `SMTP_*` - For email notifications  
- `JENKINS_*` - For Jenkins integration

### Available Commands

```bash
make start    # Start all services
make stop     # Stop all services
make restart  # Restart all services
make logs     # View service logs
make clean    # Remove containers and volumes
```

## Architecture

- **Frontend**: React with Material-UI
- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **Cache**: Redis
- **Monitoring**: GitHub Actions API, Jenkins API
- **Deployment**: Docker Compose

## API Endpoints

- `GET /health` - Service health status
- `GET /api/repositories` - List monitored repositories
- `POST /api/repositories` - Add repository to monitor
- `DELETE /api/repositories/:id` - Remove repository
- `GET /api/metrics/summary` - Dashboard metrics

## License

MIT License

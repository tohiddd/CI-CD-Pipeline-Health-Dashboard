# Deployment Guide - CI/CD Pipeline Health Dashboard

## 📋 Overview
This document provides step-by-step instructions for containerizing and deploying the CI/CD Pipeline Health Dashboard using Docker. The containerization approach ensures consistent deployment across different environments.

---

## 🐳 Containerization Architecture

### Why Docker?
- **Consistency:** Same environment everywhere (development, staging, production)
- **Isolation:** Each service runs independently without conflicts
- **Scalability:** Easy to scale individual components
- **Portability:** Runs on any system with Docker installed

### Container Structure
```
┌─────────────────────────────────────────────────────────┐
│                    Docker Host                          │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────┐│
│  │  Frontend   │ │   Backend   │ │  Database   │ │Cache││
│  │   React     │ │   Node.js   │ │ PostgreSQL  │ │Redis││
│  │ Port: 3000  │ │ Port: 3001  │ │ Port: 5432  │ │6379 ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────┘│
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Prerequisites

### System Requirements
- **Operating System:** Windows 10+, macOS 10.14+, or Linux
- **RAM:** Minimum 4GB, Recommended 8GB
- **Disk Space:** 2GB free space
- **Docker:** Version 20.10+ with Docker Compose

### Install Docker

#### For macOS:
```bash
# Download Docker Desktop from:
# https://docs.docker.com/desktop/mac/install/

# Or using Homebrew (if available):
brew install --cask docker
```

#### For Windows:
```bash
# Download Docker Desktop from:
# https://docs.docker.com/desktop/windows/install/
```

#### For Linux (Ubuntu/Debian):
```bash
# Update package index
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose
```

### Verify Installation
```bash
# Check Docker version
docker --version
# Expected: Docker version 20.10+ 

# Check Docker Compose version
docker-compose --version
# Expected: Docker Compose version 1.29+

# Test Docker installation
docker run hello-world
# Should download and run successfully
```

---

## 📦 Container Configuration

### 1. Frontend Container (React App)

#### Dockerfile: `frontend/Dockerfile`
```dockerfile
# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory inside container
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the React app
RUN npm run build

# Use Nginx to serve the built app
FROM nginx:alpine
COPY --from=0 /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 3000
EXPOSE 3000

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
```

#### Nginx Configuration: `frontend/nginx.conf`
```nginx
server {
    listen 3000;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. Backend Container (Node.js API)

#### Dockerfile: `backend/Dockerfile`
```dockerfile
# Use official Node.js runtime
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install app dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Expose port 3001
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["node", "server.js"]
```

### 3. Database Setup (PostgreSQL)
Uses official PostgreSQL Docker image with initialization script.

### 4. Cache Setup (Redis)
Uses official Redis Docker image with persistence enabled.

---

## 🐳 Docker Compose Configuration

### Complete Stack: `docker-compose.minimal.yml`
```yaml
version: '3.8'

services:
  # Frontend Service
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: cicd-frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:3001
      - REACT_APP_WS_URL=http://localhost:3001
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - cicd-net

  # Backend Service  
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: cicd-backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DATABASE_URL=postgresql://cicd_user:cicd_pass@db:5432/cicd_dashboard
      - REDIS_URL=redis://redis:6379
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
      - SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}
    depends_on:
      - db
      - redis
    restart: unless-stopped
    networks:
      - cicd-net

  # Database Service
  db:
    image: postgres:15-alpine
    container_name: cicd-db
    environment:
      POSTGRES_DB: cicd_dashboard
      POSTGRES_USER: cicd_user
      POSTGRES_PASSWORD: cicd_pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped
    networks:
      - cicd-net

  # Cache Service
  redis:
    image: redis:7-alpine
    container_name: cicd-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes
    networks:
      - cicd-net

# Persistent storage volumes
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

# Network for inter-service communication
networks:
  cicd-net:
    driver: bridge
```

---

## 🚀 Step-by-Step Deployment

### Step 1: Prepare the Environment

#### Clone the Repository
```bash
# Clone the project
git clone https://github.com/tohiddd/CI-CD-Pipeline-Health-Dashboard.git
cd CI-CD-Pipeline-Health-Dashboard

# Verify project structure
ls -la
# Should see: backend/, frontend/, database/, docker-compose.minimal.yml, etc.
```

#### Configure Environment Variables
```bash
# Copy environment template
cp env.template .env

# Edit the .env file
nano .env  # or use any text editor

# Required configuration:
GITHUB_TOKEN=your_github_personal_access_token
SMTP_HOST=smtp.gmail.com    # Optional: for email alerts
SMTP_PORT=587               # Optional: for email alerts
SMTP_USER=your-email@gmail.com  # Optional
SMTP_PASS=your-app-password     # Optional
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL  # Optional
```

### Step 2: Build the Containers

#### Build All Services
```bash
# Build all containers (first time setup)
docker-compose -f docker-compose.minimal.yml build

# Expected output:
# Building frontend...
# Building backend...
# Successfully built and tagged containers
```

#### Alternative: Use Makefile (Simplified)
```bash
# If Makefile is available
make build

# This runs the same Docker Compose build command
```

### Step 3: Start the Application

#### Start All Services
```bash
# Start in background (detached mode)
docker-compose -f docker-compose.minimal.yml up -d

# Or using Makefile
make start

# Expected output:
# Creating network "cicd-net"
# Creating cicd-redis ... done
# Creating cicd-db ... done  
# Creating cicd-backend ... done
# Creating cicd-frontend ... done
```

#### Verify Services Are Running
```bash
# Check container status
docker ps

# Expected output:
# CONTAINER ID   IMAGE                    STATUS
# abc123         cicd-frontend           Up 2 minutes
# def456         cicd-backend            Up 2 minutes  
# ghi789         postgres:15-alpine      Up 2 minutes
# jkl012         redis:7-alpine          Up 2 minutes
```

### Step 4: Initialize the Database

#### Database Auto-Initialization
The database initializes automatically using `database/init.sql`:

```sql
-- Creates necessary tables
CREATE TABLE repositories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pipeline_runs (
    id SERIAL PRIMARY KEY,
    repository_id INTEGER REFERENCES repositories(id),
    run_id VARCHAR(100) NOT NULL,
    status VARCHAR(50),
    conclusion VARCHAR(50),
    duration INTEGER,
    commit_sha VARCHAR(100),
    commit_message TEXT,
    author_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    repository_id INTEGER REFERENCES repositories(id),
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    recipients TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Manual Database Check (Optional)
```bash
# Connect to database container
docker exec -it cicd-db psql -U cicd_user -d cicd_dashboard

# List tables
\dt

# Expected output:
# repositories | pipeline_runs | alerts

# Exit database
\q
```

### Step 5: Access the Application

#### Frontend Dashboard
```bash
# Open in browser
open http://localhost:3000

# Or manually navigate to:
# http://localhost:3000
```

#### Backend API
```bash
# Test API health
curl http://localhost:3001/health

# Expected response:
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "redis": "connected", 
    "github": "configured",
    "email": "configured",
    "slack": "configured"
  }
}
```

---

## 🔧 Container Management

### Useful Docker Commands

#### View Logs
```bash
# All services
make logs

# Or specific service
docker logs cicd-backend
docker logs cicd-frontend  
docker logs cicd-db
docker logs cicd-redis
```

#### Stop Services
```bash
# Stop all services
make stop

# Or using Docker Compose
docker-compose -f docker-compose.minimal.yml down
```

#### Restart Services
```bash
# Restart all services
make restart

# Or restart specific service
docker-compose -f docker-compose.minimal.yml restart backend
```

#### Update Configuration
```bash
# If you change .env file, restart backend
docker-compose -f docker-compose.minimal.yml restart backend

# If you change frontend code, rebuild and restart
docker-compose -f docker-compose.minimal.yml build frontend
docker-compose -f docker-compose.minimal.yml restart frontend
```

### Clean Restart (Reset Everything)
```bash
# Stop and remove all containers and volumes
make clean

# Or manually
docker-compose -f docker-compose.minimal.yml down -v
docker-compose -f docker-compose.minimal.yml up -d
```

---

## 🛠️ Troubleshooting

### Common Issues and Solutions

#### Issue 1: Port Already in Use
```bash
# Error: "Port 3000 is already allocated"

# Solution 1: Find and kill process
lsof -ti:3000 | xargs kill -9

# Solution 2: Change port in docker-compose.yml
ports:
  - "3001:3000"  # Changed from 3000:3000
```

#### Issue 2: Database Connection Failed
```bash
# Error: "could not connect to server"

# Check database container
docker logs cicd-db

# Restart database
docker-compose -f docker-compose.minimal.yml restart db

# Wait for initialization (30 seconds)
sleep 30
```

#### Issue 3: GitHub API Authentication Failed
```bash
# Error: "Bad credentials"

# Check token in .env file
cat .env | grep GITHUB_TOKEN

# Update token and restart backend
nano .env
docker-compose -f docker-compose.minimal.yml restart backend
```

### 🔧 GitHub Token Update Script

For easy token updates, you can use this automated script instead of manual editing:

#### Create update-token.sh
```bash
#!/bin/bash

# 🔧 GitHub Token Update Script for CI/CD Dashboard
# Usage: ./update-token.sh YOUR_NEW_TOKEN

echo "🔧 Updating GitHub Token for CI/CD Dashboard"
echo "============================================="

if [ -z "$1" ]; then
    echo "❌ Error: Please provide your new GitHub token"
    echo ""
    echo "Usage: ./update-token.sh YOUR_NEW_TOKEN"
    echo ""
    echo "📝 To get a new token:"
    echo "1. Go to: https://github.com/settings/tokens"
    echo "2. Click 'Generate new token (classic)'"
    echo "3. Select 'repo' scope"
    echo "4. Copy the token and use it here"
    exit 1
fi

NEW_TOKEN=$1

# Validate token format
if [[ $NEW_TOKEN == ghp_* ]] || [[ $NEW_TOKEN == github_pat_* ]]; then
    echo "✅ Token format looks correct"
else
    echo "⚠️  Warning: Token should start with 'ghp_' or 'github_pat_'"
    read -p "Continue anyway? (y/N): " confirm
    if [[ $confirm != [yY] ]]; then
        exit 1
    fi
fi

# Update .env file
echo "📝 Updating .env file..."
if [ -f ".env" ]; then
    # Create backup
    cp .env .env.backup
    echo "💾 Created backup: .env.backup"
    
    # Update token
    sed -i.tmp "s/GITHUB_TOKEN=.*/GITHUB_TOKEN=$NEW_TOKEN/" .env
    rm -f .env.tmp
    
    echo "✅ Updated GITHUB_TOKEN in .env"
else
    echo "❌ .env file not found!"
    exit 1
fi

# Test the new token
echo "🧪 Testing new token..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: token $NEW_TOKEN" https://api.github.com/user)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Token is valid!"
else
    echo "❌ Token test failed (HTTP $HTTP_CODE)"
    echo "Please check your token and try again"
    exit 1
fi

# Restart backend
echo "🔄 Restarting dashboard backend..."
if command -v make &> /dev/null; then
    make restart
    echo "✅ Dashboard restarted successfully!"
else
    echo "📝 Manual restart needed:"
    echo "   docker-compose -f docker-compose.minimal.yml down"
    echo "   docker-compose -f docker-compose.minimal.yml up -d"
fi

echo ""
echo "🎉 GitHub token updated successfully!"
echo "📊 Try adding repositories again at: http://localhost:3000"
echo ""
echo "🔍 If you still have issues, check backend logs:"
echo "   make logs"
```

#### Usage:
```bash
# Make script executable
chmod +x update-token.sh

# Update your token
./update-token.sh your_new_github_token_here

# Script will automatically:
# ✅ Validate token format
# ✅ Test token with GitHub API  
# ✅ Update .env file safely (with backup)
# ✅ Restart backend service
# ✅ Confirm everything works
```

#### Issue 4: Frontend Can't Connect to Backend
```bash
# Error: "Failed to fetch"

# Check network connectivity
docker exec cicd-frontend curl http://backend:3001/health

# Check environment variables
docker exec cicd-frontend env | grep REACT_APP
```

#### Issue 5: Container Build Failed
```bash
# Error: "Build failed"

# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose -f docker-compose.minimal.yml build --no-cache

# Check disk space
df -h
```

---

## 📊 Monitoring and Health Checks

### Built-in Health Checks

#### Backend Health Check
```bash
# Automatic health check every 30 seconds
# Endpoint: GET /health

curl http://localhost:3001/health
```

#### Container Health Status
```bash
# Check container health
docker ps --format "table {{.Names}}\t{{.Status}}"

# Expected output:
# cicd-frontend   Up 1 hour (healthy)
# cicd-backend    Up 1 hour (healthy)
# cicd-db         Up 1 hour
# cicd-redis      Up 1 hour
```

### Resource Usage Monitoring
```bash
# Monitor resource usage
docker stats

# Expected output shows CPU, memory, network I/O for each container
```

---

## 🚀 Production Deployment Considerations

### Security Hardening

#### Environment Variables
```bash
# Use Docker secrets instead of .env for production
docker secret create github_token /path/to/token/file
```

#### Network Security
```bash
# Use custom networks with restricted access
networks:
  frontend-net:
    driver: bridge
    internal: false
  backend-net:
    driver: bridge
    internal: true
```

#### Container Security
```bash
# Run containers as non-root user (already implemented)
# Use minimal base images (alpine variants)
# Regular security updates
```

### Scaling Configuration

#### Horizontal Scaling
```yaml
# Scale backend service
backend:
  deploy:
    replicas: 3
    resources:
      limits:
        memory: 512M
        cpus: '0.5'
```

#### Load Balancing
```yaml
# Add nginx load balancer
load_balancer:
  image: nginx:alpine
  ports:
    - "80:80"
  depends_on:
    - backend
```

### Backup Strategy

#### Database Backup
```bash
# Automated backup script
#!/bin/bash
docker exec cicd-db pg_dump -U cicd_user cicd_dashboard > backup_$(date +%Y%m%d).sql
```

#### Volume Backup
```bash
# Backup persistent volumes
docker run --rm -v cicd_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/db_backup.tar.gz /data
```

---

## 📋 Quick Reference

### Essential Commands
```bash
# Start dashboard
make start

# Stop dashboard  
make stop

# View logs
make logs

# Restart everything
make restart

# Clean reset
make clean

# Update GitHub token
./update-github-token.sh YOUR_NEW_TOKEN
```

### Important URLs
- **Dashboard:** http://localhost:3000
- **API:** http://localhost:3001
- **Health Check:** http://localhost:3001/health
- **Database:** localhost:5432 (user: cicd_user)
- **Redis:** localhost:6379

### File Structure
```
CI-CD-Pipeline-Health-Dashboard/
├── docker-compose.minimal.yml    # Container orchestration
├── .env                         # Environment configuration
├── Makefile                     # Easy commands
├── backend/
│   ├── Dockerfile              # Backend container config
│   └── server.js               # Application code
├── frontend/
│   ├── Dockerfile              # Frontend container config
│   └── nginx.conf              # Web server config
└── database/
    └── init.sql                # Database schema
```

---

## ✅ Deployment Success Checklist

- [ ] Docker and Docker Compose installed
- [ ] Repository cloned and .env configured  
- [ ] All containers built successfully
- [ ] All services running (docker ps shows 4 containers)
- [ ] Database initialized with tables
- [ ] Frontend accessible at http://localhost:3000
- [ ] Backend health check passes
- [ ] GitHub token configured and validated
- [ ] Can add and monitor repositories
- [ ] Real-time updates working
- [ ] Logs accessible and readable

**🎉 Congratulations! Your CI/CD Pipeline Health Dashboard is now containerized and running successfully!**

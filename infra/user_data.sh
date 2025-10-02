#!/bin/bash
# User Data Script for CI/CD Pipeline Health Dashboard
# This script sets up Docker and deploys the containerized application

# Update system packages
yum update -y

# Install Docker
yum install -y docker
systemctl start docker
systemctl enable docker

# Add ec2-user to docker group
usermod -a -G docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install additional utilities
yum install -y git curl wget htop

# Create application directory
mkdir -p /opt/cicd-dashboard
cd /opt/cicd-dashboard

# Create docker-compose.yml for production deployment
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: cicd-dashboard-redis
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - cicd-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend API
  backend:
    image: ${docker_image_backend}
    container_name: cicd-dashboard-backend
    environment:
      NODE_ENV: production
      PORT: ${backend_port}
      DATABASE_URL: ${database_url}
      REDIS_URL: redis://redis:6379
      GITHUB_TOKEN: ${github_token}
      JENKINS_URL: ${jenkins_url}
      JENKINS_USERNAME: ${jenkins_username}
      JENKINS_API_TOKEN: ${jenkins_api_token}
      SMTP_HOST: ${smtp_host}
      SMTP_PORT: ${smtp_port}
      SMTP_USER: ${smtp_user}
      SMTP_PASS: ${smtp_pass}
      JWT_SECRET: ${jwt_secret}
    ports:
      - "${backend_port}:${backend_port}"
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - cicd-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:${backend_port}/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend Application
  frontend:
    image: ${docker_image_frontend}
    container_name: cicd-dashboard-frontend
    environment:
      REACT_APP_API_URL: http://localhost:${backend_port}
      REACT_APP_WS_URL: ws://localhost:${backend_port}
    ports:
      - "${frontend_port}:${frontend_port}"
      - "80:${frontend_port}"
    depends_on:
      - backend
    networks:
      - cicd-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:${frontend_port}"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  cicd-network:
    driver: bridge

volumes:
  redis_data:
    driver: local
EOF

# Create environment file
cat > .env << 'EOF'
# Production Environment Variables
NODE_ENV=production
DATABASE_URL=${database_url}
REDIS_URL=redis://redis:6379
GITHUB_TOKEN=${github_token}
JENKINS_URL=${jenkins_url}
JENKINS_USERNAME=${jenkins_username}
JENKINS_API_TOKEN=${jenkins_api_token}
SMTP_HOST=${smtp_host}
SMTP_PORT=${smtp_port}
SMTP_USER=${smtp_user}
SMTP_PASS=${smtp_pass}
JWT_SECRET=${jwt_secret}
EOF

# Set proper permissions
chmod 600 .env
chown ec2-user:ec2-user .env
chown -R ec2-user:ec2-user /opt/cicd-dashboard

# Pull Docker images
docker pull ${docker_image_backend}
docker pull ${docker_image_frontend}
docker pull redis:7-alpine

# Start the application
docker-compose up -d

# Create systemd service for auto-start
cat > /etc/systemd/system/cicd-dashboard.service << 'EOF'
[Unit]
Description=CI/CD Dashboard Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/cicd-dashboard
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Enable the service
systemctl enable cicd-dashboard.service

# Create log rotation for Docker logs
cat > /etc/logrotate.d/docker-containers << 'EOF'
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=1M
    missingok
    delaycompress
    copytruncate
}
EOF

# Install CloudWatch agent (optional)
yum install -y amazon-cloudwatch-agent

# Create a simple health check script
cat > /opt/cicd-dashboard/health-check.sh << 'EOF'
#!/bin/bash
# Health check script for CI/CD Dashboard

echo "=== CI/CD Dashboard Health Check ==="
echo "Date: $(date)"
echo

# Check if containers are running
echo "Docker containers status:"
docker-compose ps

echo
echo "Application endpoints:"
echo "Frontend: http://localhost:${frontend_port}"
echo "Backend: http://localhost:${backend_port}"
echo "Backend Health: http://localhost:${backend_port}/health"

echo
echo "Testing endpoints:"
curl -s -o /dev/null -w "Frontend Status: %{http_code}\n" http://localhost:${frontend_port}
curl -s -o /dev/null -w "Backend Status: %{http_code}\n" http://localhost:${backend_port}/health

echo
echo "System resources:"
df -h /
free -h
EOF

chmod +x /opt/cicd-dashboard/health-check.sh

# Create a cron job for health checks (optional)
echo "*/5 * * * * /opt/cicd-dashboard/health-check.sh >> /var/log/cicd-dashboard-health.log 2>&1" | crontab -u ec2-user -

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 30

# Final health check
cd /opt/cicd-dashboard
./health-check.sh

# Log completion
echo "CI/CD Dashboard deployment completed at $(date)" >> /var/log/user-data.log

# Signal completion to CloudFormation (if needed)
# /opt/aws/bin/cfn-signal -e $? --stack ${AWS::StackName} --resource AutoScalingGroup --region ${AWS::Region}

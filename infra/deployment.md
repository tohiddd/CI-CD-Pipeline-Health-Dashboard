# CI/CD Pipeline Health Dashboard - Terraform Deployment Guide

This guide provides step-by-step instructions for deploying the CI/CD Pipeline Health Dashboard to AWS using Terraform.

## Prerequisites

### Required Software
- **Terraform** (>= 1.0): [Download and install](https://www.terraform.io/downloads.html)
- **AWS CLI** (>= 2.0): [Installation guide](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
- **Docker Hub Account**: For hosting your application images

### AWS Requirements
- AWS Account with appropriate permissions
- AWS CLI configured with credentials
- EC2 Key Pair created in your target region

### Required AWS Permissions
Your AWS user/role needs the following permissions:
- EC2 (full access)
- VPC (full access)
- RDS (full access)
- Application Load Balancer (full access)
- IAM (limited - for service roles)

## Pre-Deployment Steps

### 1. Prepare Docker Images

First, build and push your application images to Docker Hub:

```bash
# Navigate to your project root
cd /path/to/CI-CD-Pipeline-Health-Dashboard

# Build and push backend image
cd backend
docker build -t your-dockerhub-username/cicd-dashboard-backend:latest .
docker push your-dockerhub-username/cicd-dashboard-backend:latest

# Build and push frontend image
cd ../frontend
docker build -t your-dockerhub-username/cicd-dashboard-frontend:latest .
docker push your-dockerhub-username/cicd-dashboard-frontend:latest
```

### 2. Create AWS Key Pair

Create an EC2 Key Pair in your target AWS region:

```bash
# Using AWS CLI
aws ec2 create-key-pair --key-name cicd-dashboard-key --query 'KeyMaterial' --output text > ~/.ssh/cicd-dashboard-key.pem
chmod 400 ~/.ssh/cicd-dashboard-key.pem

# Or create through AWS Console: EC2 > Key Pairs > Create Key Pair
```

### 3. Configure AWS CLI

Ensure your AWS CLI is configured:

```bash
aws configure
# Enter your Access Key ID, Secret Access Key, Region, and Output format
```

## Deployment Instructions

### Step 1: Navigate to Infrastructure Directory

```bash
cd /path/to/CI-CD-Pipeline-Health-Dashboard/infra
```

### Step 2: Create Terraform Variables File

Create a `terraform.tfvars` file with your specific values:

```bash
cat > terraform.tfvars << 'EOF'
# AWS Configuration
aws_region = "us-east-1"

# Project Configuration
project_name = "cicd-dashboard"
environment = "production"

# EC2 Configuration
instance_type = "t3.medium"
key_pair_name = "cicd-dashboard-key"

# Database Configuration
create_database = true
db_engine = "postgres"
db_engine_version = "15.4"
db_instance_class = "db.t3.micro"
db_name = "cicd_dashboard"
db_username = "cicd_user"
db_password = "YourSecurePassword123!"

# Docker Images (replace with your Docker Hub username)
docker_image_backend = "your-dockerhub-username/cicd-dashboard-backend:latest"
docker_image_frontend = "your-dockerhub-username/cicd-dashboard-frontend:latest"

# Application Configuration
github_token = "your-github-token"
jenkins_url = "https://your-jenkins.example.com"
jenkins_username = "your-jenkins-user"
jenkins_api_token = "your-jenkins-api-token"
jwt_secret = "your-super-secret-jwt-key-change-this"

# SMTP Configuration (optional)
smtp_host = "smtp.gmail.com"
smtp_port = 587
smtp_user = "your-email@gmail.com"
smtp_pass = "your-app-password"

# Security Configuration
allowed_ssh_cidr = ["YOUR.IP.ADDRESS.HERE/32"]  # Replace with your IP
allowed_http_cidr = ["0.0.0.0/0"]

# Tags
tags = {
  Project = "CI/CD Dashboard"
  Environment = "production"
  Owner = "your-name"
}
EOF
```

**Important Security Notes:**
- Replace `YOUR.IP.ADDRESS.HERE` with your actual public IP address
- Use strong passwords for database and JWT secret
- Consider using AWS Secrets Manager for sensitive values in production

### Step 3: Initialize Terraform

```bash
terraform init
```

This command will:
- Download required provider plugins
- Initialize the backend
- Prepare the working directory

### Step 4: Plan the Deployment

```bash
terraform plan
```

Review the planned changes carefully. This will show you:
- All resources that will be created
- Estimated costs
- Any potential issues

### Step 5: Apply the Configuration

```bash
terraform apply
```

When prompted, type `yes` to confirm the deployment.

The deployment process will take approximately 10-15 minutes and will create:
- VPC with public and private subnets
- Internet Gateway and Route Tables
- Security Groups
- RDS PostgreSQL database
- EC2 instance with Docker
- Application Load Balancer
- All necessary networking components

### Step 6: Verify Deployment

After successful deployment, Terraform will output important information:

```bash
# Example output
application_url = "http://cicd-dashboard-alb-123456789.us-east-1.elb.amazonaws.com"
instance_public_ip = "54.123.456.789"
ssh_connection_command = "ssh -i ~/.ssh/cicd-dashboard-key.pem ec2-user@54.123.456.789"
database_endpoint = "cicd-dashboard-database.abc123.us-east-1.rds.amazonaws.com:5432"
```

## Post-Deployment Verification

### 1. Check Application Status

Visit the application URL provided in the Terraform output:
```bash
curl http://your-load-balancer-dns-name
```

### 2. SSH into the Instance

```bash
ssh -i ~/.ssh/cicd-dashboard-key.pem ec2-user@YOUR_INSTANCE_IP
```

### 3. Check Docker Containers

```bash
# On the EC2 instance
cd /opt/cicd-dashboard
docker-compose ps
./health-check.sh
```

### 4. View Application Logs

```bash
# Backend logs
docker-compose logs backend

# Frontend logs
docker-compose logs frontend

# All logs
docker-compose logs
```

## Configuration Updates

### Updating Application Images

To deploy new versions of your application:

```bash
# Build and push new images
docker build -t your-dockerhub-username/cicd-dashboard-backend:v2.0 .
docker push your-dockerhub-username/cicd-dashboard-backend:v2.0

# Update terraform.tfvars with new image tags
# Then apply changes
terraform apply
```

### Scaling the Infrastructure

To change instance types or add resources:

```bash
# Edit terraform.tfvars
instance_type = "t3.large"

# Apply changes
terraform apply
```

## Monitoring and Maintenance

### CloudWatch Logs

The deployment automatically configures CloudWatch logging for:
- Application containers
- System logs
- Health check results

### Health Checks

The system includes automated health checks:
- Load balancer health checks
- Container health checks
- Cron-based system health monitoring

### Backup Strategy

The RDS database is configured with:
- 7-day backup retention
- Automated daily backups
- Point-in-time recovery

## Troubleshooting

### Common Issues

1. **Application not accessible**
   ```bash
   # Check security groups
   aws ec2 describe-security-groups --group-ids sg-xxxxxxxxx
   
   # Check instance status
   aws ec2 describe-instances --instance-ids i-xxxxxxxxx
   ```

2. **Database connection issues**
   ```bash
   # Check RDS status
   aws rds describe-db-instances --db-instance-identifier cicd-dashboard-database
   
   # Test connection from EC2
   ssh -i ~/.ssh/cicd-dashboard-key.pem ec2-user@YOUR_INSTANCE_IP
   docker exec -it cicd-dashboard-backend psql $DATABASE_URL
   ```

3. **Docker containers not starting**
   ```bash
   # SSH into instance and check
   cd /opt/cicd-dashboard
   docker-compose logs
   docker-compose ps
   ```

### Log Locations

- User data execution: `/var/log/cloud-init-output.log`
- Application health: `/var/log/cicd-dashboard-health.log`
- Docker logs: `/var/lib/docker/containers/`

## Security Considerations

### Production Hardening

1. **Network Security**
   - Restrict SSH access to specific IP addresses
   - Use VPN or bastion host for administrative access
   - Enable VPC Flow Logs

2. **Database Security**
   - Enable encryption at rest
   - Use IAM database authentication
   - Regular security updates

3. **Application Security**
   - Use HTTPS with SSL certificates
   - Implement proper authentication
   - Regular security scanning

### SSL/TLS Configuration

To add HTTPS support:

1. Request SSL certificate from AWS Certificate Manager
2. Update ALB listener to use HTTPS
3. Redirect HTTP to HTTPS

## Cost Optimization

### Resource Costs (Estimated Monthly)

- EC2 t3.medium: ~$30
- RDS db.t3.micro: ~$15
- Application Load Balancer: ~$20
- Data transfer: ~$5-10
- **Total: ~$70-75/month**

### Cost Reduction Tips

1. Use Reserved Instances for long-term deployments
2. Schedule non-production environments to stop during off-hours
3. Use Spot Instances for development environments
4. Monitor and optimize data transfer costs

## Cleanup Instructions

### Complete Infrastructure Destruction

**⚠️ WARNING: This will permanently delete all resources and data!**

```bash
# Navigate to infra directory
cd /path/to/CI-CD-Pipeline-Health-Dashboard/infra

# Destroy all resources
terraform destroy

# Confirm by typing 'yes' when prompted
```

### Selective Resource Cleanup

To remove only specific resources:

```bash
# Remove only the database
terraform destroy -target=aws_db_instance.postgres

# Remove only the EC2 instance
terraform destroy -target=aws_instance.app_server
```

### Manual Cleanup (if needed)

If Terraform destroy fails, manually delete resources in this order:

1. EC2 instances
2. Load balancers
3. RDS instances
4. Security groups
5. Subnets
6. VPC

## Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly**
   - Review CloudWatch metrics
   - Check application logs
   - Verify backup completion

2. **Monthly**
   - Update Docker images
   - Review security groups
   - Analyze cost reports

3. **Quarterly**
   - Update Terraform providers
   - Review and update security policies
   - Performance optimization review

### Getting Help

1. Check the troubleshooting section above
2. Review AWS CloudWatch logs
3. Consult AWS documentation
4. Contact your system administrator

---

## Next Steps

After successful deployment:

1. Configure your CI/CD integrations (GitHub, Jenkins)
2. Set up monitoring and alerting
3. Configure backup and disaster recovery
4. Implement security best practices
5. Set up development and staging environments

For questions or issues, please refer to the project documentation or contact the development team.

# CI/CD Pipeline Health Dashboard - Infrastructure

This directory contains Terraform configuration files for deploying the CI/CD Pipeline Health Dashboard to AWS.

## 📁 Directory Structure

```
infra/
├── main.tf                    # Main Terraform configuration
├── variables.tf               # Input variables definition
├── outputs.tf                 # Output values definition
├── user_data.sh              # EC2 instance setup script
├── terraform.tfvars.example  # Example variables file
├── deployment.md             # Detailed deployment guide
├── prompts.md               # AI interaction log
└── README.md                # This file
```

## 🚀 Quick Start

1. **Copy the example variables file:**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit `terraform.tfvars` with your values:**
   - AWS region and credentials
   - EC2 key pair name
   - Docker Hub images
   - Database credentials
   - Application configuration

3. **Initialize and deploy:**
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

## 📋 Prerequisites

- Terraform >= 1.0
- AWS CLI configured
- AWS EC2 Key Pair
- Docker images pushed to Docker Hub

## 🏗️ Infrastructure Components

### Core Resources
- **VPC** with public and private subnets
- **EC2 instance** for application hosting
- **RDS PostgreSQL** database (optional)
- **Application Load Balancer** for high availability
- **Security Groups** for network security

### Networking
- Internet Gateway for public access
- Route tables for traffic routing
- Multi-AZ setup for database

### Security
- Encrypted RDS storage
- Security groups with least privilege
- Configurable SSH access restrictions

## 🔧 Configuration

### Required Variables
- `key_pair_name`: Your AWS EC2 key pair
- `db_password`: Database password
- `docker_image_backend`: Backend Docker image
- `docker_image_frontend`: Frontend Docker image

### Optional Variables
- `aws_region`: AWS region (default: us-east-1)
- `instance_type`: EC2 instance type (default: t3.medium)
- `create_database`: Whether to create RDS (default: true)

## 📊 Outputs

After deployment, you'll get:
- Application URL (via Load Balancer)
- Direct instance IP
- SSH connection command
- Database endpoint
- Health check URLs

## 💰 Estimated Costs

Monthly costs (us-east-1):
- EC2 t3.medium: ~$30
- RDS db.t3.micro: ~$15
- Application Load Balancer: ~$20
- **Total: ~$65-75/month**

## 🔍 Monitoring

The deployment includes:
- CloudWatch logging
- Container health checks
- Automated system monitoring
- Log rotation

## 🛡️ Security Features

- Database in private subnet
- Encrypted storage
- Security groups with minimal access
- Environment variable protection

## 🧹 Cleanup

To destroy all resources:
```bash
terraform destroy
```

**⚠️ Warning:** This will permanently delete all data!

## 📚 Documentation

- **[deployment.md](deployment.md)**: Complete deployment guide
- **[prompts.md](prompts.md)**: AI interaction log
- **Terraform files**: Inline documentation

## 🆘 Troubleshooting

Common issues and solutions:

1. **Permission errors**: Check AWS credentials and permissions
2. **Key pair not found**: Ensure key pair exists in target region
3. **Docker images not found**: Verify images are pushed to Docker Hub
4. **Database connection issues**: Check security group rules

## 🤝 Support

For detailed instructions, see [deployment.md](deployment.md).

For issues:
1. Check CloudWatch logs
2. SSH into instance and check Docker logs
3. Review security group configurations
4. Verify environment variables

---

**Note**: This infrastructure is designed for production use with security best practices. Always review and customize security settings for your specific requirements.

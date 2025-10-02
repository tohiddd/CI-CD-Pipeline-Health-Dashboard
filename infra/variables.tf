# Terraform Variables for CI/CD Pipeline Health Dashboard
# This file defines all input variables for the infrastructure deployment

# AWS Region Configuration
variable "aws_region" {
  description = "AWS region for deploying resources"
  type        = string
  default     = "us-east-1"
}

# Project Configuration
variable "project_name" {
  description = "Name of the project (used for resource naming)"
  type        = string
  default     = "cicd-dashboard"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

# EC2 Instance Configuration
variable "instance_type" {
  description = "EC2 instance type for the application server"
  type        = string
  default     = "t3.medium"
}

variable "key_pair_name" {
  description = "Name of the AWS key pair for SSH access"
  type        = string
}

# Database Configuration
variable "create_database" {
  description = "Whether to create a managed RDS database"
  type        = bool
  default     = true
}

variable "db_engine" {
  description = "Database engine (postgres, mysql)"
  type        = string
  default     = "postgres"
  validation {
    condition     = contains(["postgres", "mysql"], var.db_engine)
    error_message = "Database engine must be either 'postgres' or 'mysql'."
  }
}

variable "db_engine_version" {
  description = "Database engine version"
  type        = string
  default     = "15.4"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "Name of the database to create"
  type        = string
  default     = "cicd_dashboard"
}

variable "db_username" {
  description = "Master username for the database"
  type        = string
  default     = "cicd_user"
}

variable "db_password" {
  description = "Master password for the database"
  type        = string
  sensitive   = true
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS instance (GB)"
  type        = number
  default     = 20
}

# Docker Configuration
variable "docker_image_backend" {
  description = "Docker image for the backend application"
  type        = string
  default     = "your-dockerhub-username/cicd-dashboard-backend:latest"
}

variable "docker_image_frontend" {
  description = "Docker image for the frontend application"
  type        = string
  default     = "your-dockerhub-username/cicd-dashboard-frontend:latest"
}

# Application Configuration
variable "backend_port" {
  description = "Port for the backend application"
  type        = number
  default     = 3001
}

variable "frontend_port" {
  description = "Port for the frontend application"
  type        = number
  default     = 3000
}

# Environment Variables for Application
variable "github_token" {
  description = "GitHub token for API access"
  type        = string
  sensitive   = true
  default     = ""
}

variable "jenkins_url" {
  description = "Jenkins URL for integration"
  type        = string
  default     = ""
}

variable "jenkins_username" {
  description = "Jenkins username"
  type        = string
  default     = ""
}

variable "jenkins_api_token" {
  description = "Jenkins API token"
  type        = string
  sensitive   = true
  default     = ""
}

variable "jwt_secret" {
  description = "JWT secret for authentication"
  type        = string
  sensitive   = true
  default     = "change-this-in-production"
}

# SMTP Configuration
variable "smtp_host" {
  description = "SMTP host for email notifications"
  type        = string
  default     = ""
}

variable "smtp_port" {
  description = "SMTP port"
  type        = number
  default     = 587
}

variable "smtp_user" {
  description = "SMTP username"
  type        = string
  default     = ""
}

variable "smtp_pass" {
  description = "SMTP password"
  type        = string
  sensitive   = true
  default     = ""
}

# Networking Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for public subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "private_subnet_cidr" {
  description = "CIDR block for private subnet"
  type        = string
  default     = "10.0.2.0/24"
}

# Security Configuration
variable "allowed_ssh_cidr" {
  description = "CIDR blocks allowed for SSH access"
  type        = list(string)
  default     = ["0.0.0.0/0"] # Change this to your IP for better security
}

variable "allowed_http_cidr" {
  description = "CIDR blocks allowed for HTTP access"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# Tags
variable "tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "CI/CD Dashboard"
    Environment = "dev"
    ManagedBy   = "Terraform"
  }
}

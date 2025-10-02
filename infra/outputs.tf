# Terraform Outputs for CI/CD Pipeline Health Dashboard
# This file defines all output values that will be displayed after deployment

# VPC Information
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

# Subnet Information
output "public_subnet_id" {
  description = "ID of the public subnet"
  value       = aws_subnet.public.id
}

output "private_subnet_id" {
  description = "ID of the private subnet"
  value       = aws_subnet.private.id
}

# EC2 Instance Information
output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.app_server.id
}

output "instance_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_instance.app_server.public_ip
}

output "instance_private_ip" {
  description = "Private IP address of the EC2 instance"
  value       = aws_instance.app_server.private_ip
}

# Application URLs
output "application_url" {
  description = "URL to access the CI/CD Dashboard application"
  value       = "http://${aws_instance.app_server.public_ip}"
}

output "application_frontend_url" {
  description = "Direct URL to the frontend application"
  value       = "http://${aws_instance.app_server.public_ip}:${var.frontend_port}"
}

output "application_backend_url" {
  description = "Direct URL to the backend API"
  value       = "http://${aws_instance.app_server.public_ip}:${var.backend_port}"
}

# SSH Connection Information
output "ssh_connection_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i ~/.ssh/${var.key_pair_name}.pem ec2-user@${aws_instance.app_server.public_ip}"
}

# Database Information (conditional)
output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = var.create_database ? aws_db_instance.postgres[0].endpoint : "Database not created"
}

output "database_port" {
  description = "RDS instance port"
  value       = var.create_database ? aws_db_instance.postgres[0].port : "Database not created"
}

output "database_name" {
  description = "Database name"
  value       = var.create_database ? aws_db_instance.postgres[0].db_name : "Database not created"
}

# Security Group Information
output "app_security_group_id" {
  description = "ID of the application security group"
  value       = aws_security_group.app_sg.id
}

output "db_security_group_id" {
  description = "ID of the database security group"
  value       = var.create_database ? aws_security_group.db_sg[0].id : "Database not created"
}

# Load Balancer Information (if using ALB)
output "load_balancer_dns" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.app_lb.dns_name
}

output "load_balancer_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.app_lb.zone_id
}

output "load_balancer_url" {
  description = "URL to access the application via Load Balancer"
  value       = "http://${aws_lb.app_lb.dns_name}"
}

# Deployment Information
output "deployment_region" {
  description = "AWS region where resources are deployed"
  value       = var.aws_region
}

output "deployment_environment" {
  description = "Environment name"
  value       = var.environment
}

# Resource Tags
output "common_tags" {
  description = "Common tags applied to all resources"
  value       = local.common_tags
}

# Docker Images Used
output "backend_docker_image" {
  description = "Docker image used for backend"
  value       = var.docker_image_backend
}

output "frontend_docker_image" {
  description = "Docker image used for frontend"
  value       = var.docker_image_frontend
}

# Health Check URLs
output "backend_health_check_url" {
  description = "Backend health check endpoint"
  value       = "http://${aws_instance.app_server.public_ip}:${var.backend_port}/health"
}

output "frontend_health_check_url" {
  description = "Frontend health check endpoint"
  value       = "http://${aws_instance.app_server.public_ip}:${var.frontend_port}"
}

# Summary Information
output "deployment_summary" {
  description = "Summary of the deployed infrastructure"
  value = {
    application_url   = "http://${aws_lb.app_lb.dns_name}"
    direct_ip_access  = "http://${aws_instance.app_server.public_ip}"
    ssh_access        = "ssh -i ~/.ssh/${var.key_pair_name}.pem ec2-user@${aws_instance.app_server.public_ip}"
    database_endpoint = var.create_database ? aws_db_instance.postgres[0].endpoint : "No database created"
    region            = var.aws_region
    environment       = var.environment
  }
}

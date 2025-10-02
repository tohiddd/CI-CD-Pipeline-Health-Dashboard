# Main Terraform Configuration for CI/CD Pipeline Health Dashboard
# This file contains all the AWS infrastructure resources needed to deploy the application

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Configure the AWS Provider
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

# Local values for consistent resource naming and tagging
locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = merge(var.tags, {
    Name        = local.name_prefix
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  })
}

# Data source to get the latest Amazon Linux 2 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Data source to get available AZs
data "aws_availability_zones" "available" {
  state = "available"
}

# Create VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-vpc"
  })
}

# Create Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-igw"
  })
}

# Create public subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-public-subnet"
    Type = "Public"
  })
}

# Create private subnet for database
resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidr
  availability_zone = data.aws_availability_zones.available.names[1]

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-private-subnet"
    Type = "Private"
  })
}

# Create additional private subnet for RDS (required for DB subnet group)
resource "aws_subnet" "private_secondary" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.3.0/24"
  availability_zone = data.aws_availability_zones.available.names[2]

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-private-subnet-secondary"
    Type = "Private"
  })
}

# Create route table for public subnet
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-public-rt"
  })
}

# Associate public subnet with route table
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Create security group for the application server
resource "aws_security_group" "app_sg" {
  name_prefix = "${local.name_prefix}-app-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for CI/CD Dashboard application server"

  # SSH access
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidr
  }

  # HTTP access for load balancer
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = var.allowed_http_cidr
  }

  # HTTPS access
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = var.allowed_http_cidr
  }

  # Backend application port
  ingress {
    description = "Backend API"
    from_port   = var.backend_port
    to_port     = var.backend_port
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # Frontend application port
  ingress {
    description = "Frontend App"
    from_port   = var.frontend_port
    to_port     = var.frontend_port
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # Redis port
  ingress {
    description = "Redis"
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # All outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-app-sg"
  })
}

# Create security group for RDS database (conditional)
resource "aws_security_group" "db_sg" {
  count = var.create_database ? 1 : 0

  name_prefix = "${local.name_prefix}-db-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for RDS database"

  # PostgreSQL access from application server
  ingress {
    description     = "PostgreSQL"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
  }

  # All outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-db-sg"
  })
}

# Create DB subnet group for RDS (conditional)
resource "aws_db_subnet_group" "main" {
  count = var.create_database ? 1 : 0

  name       = "${local.name_prefix}-db-subnet-group"
  subnet_ids = [aws_subnet.private.id, aws_subnet.private_secondary.id]

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-db-subnet-group"
  })
}

# Create RDS instance (conditional)
resource "aws_db_instance" "postgres" {
  count = var.create_database ? 1 : 0

  identifier = "${local.name_prefix}-database"

  # Database configuration
  engine         = var.db_engine
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class

  # Storage configuration
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_allocated_storage * 2
  storage_type          = "gp2"
  storage_encrypted     = true

  # Database credentials
  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  # Network configuration
  vpc_security_group_ids = [aws_security_group.db_sg[0].id]
  db_subnet_group_name   = aws_db_subnet_group.main[0].name
  publicly_accessible    = false

  # Backup configuration
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  # Monitoring and logging
  monitoring_interval             = 60
  enabled_cloudwatch_logs_exports = ["postgresql"]

  # Deletion protection
  deletion_protection = false
  skip_final_snapshot = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-database"
  })
}

# User data script for EC2 instance
locals {
  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    docker_image_backend  = var.docker_image_backend
    docker_image_frontend = var.docker_image_frontend
    backend_port          = var.backend_port
    frontend_port         = var.frontend_port
    database_url          = var.create_database ? "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.postgres[0].endpoint}/${var.db_name}" : ""
    github_token          = var.github_token
    jenkins_url           = var.jenkins_url
    jenkins_username      = var.jenkins_username
    jenkins_api_token     = var.jenkins_api_token
    jwt_secret            = var.jwt_secret
    smtp_host             = var.smtp_host
    smtp_port             = var.smtp_port
    smtp_user             = var.smtp_user
    smtp_pass             = var.smtp_pass
  }))
}

# Create EC2 instance
resource "aws_instance" "app_server" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  key_name               = var.key_pair_name
  vpc_security_group_ids = [aws_security_group.app_sg.id]
  subnet_id              = aws_subnet.public.id

  user_data = local.user_data

  root_block_device {
    volume_type = "gp3"
    volume_size = 30
    encrypted   = true
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-app-server"
  })
}

# Create Application Load Balancer
resource "aws_lb" "app_lb" {
  name               = "${local.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [aws_subnet.public.id, aws_subnet.private_secondary.id]

  enable_deletion_protection = false

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-alb"
  })
}

# Security group for ALB
resource "aws_security_group" "alb_sg" {
  name_prefix = "${local.name_prefix}-alb-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for Application Load Balancer"

  # HTTP access
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = var.allowed_http_cidr
  }

  # HTTPS access
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = var.allowed_http_cidr
  }

  # All outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-alb-sg"
  })
}

# Target group for the application
resource "aws_lb_target_group" "app_tg" {
  name     = "${local.name_prefix}-tg"
  port     = var.frontend_port
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/"
    matcher             = "200"
    port                = "traffic-port"
    protocol            = "HTTP"
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-tg"
  })
}

# Attach EC2 instance to target group
resource "aws_lb_target_group_attachment" "app_tg_attachment" {
  target_group_arn = aws_lb_target_group.app_tg.arn
  target_id        = aws_instance.app_server.id
  port             = var.frontend_port
}

# ALB listener
resource "aws_lb_listener" "app_listener" {
  load_balancer_arn = aws_lb.app_lb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app_tg.arn
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-listener"
  })
}

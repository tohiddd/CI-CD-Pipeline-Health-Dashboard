# CI/CD Pipeline Health Dashboard - Makefile

.PHONY: help setup start stop restart logs clean build

# Default target
help:
	@echo "🚀 CI/CD Pipeline Health Dashboard"
	@echo ""
	@echo "Available commands:"
	@echo "  make setup    - Initial project setup"
	@echo "  make start    - Start all services"
	@echo "  make stop     - Stop all services"
	@echo "  make restart  - Restart all services"
	@echo "  make logs     - View logs"
	@echo "  make clean    - Clean up containers and volumes"
	@echo "  make build    - Rebuild containers"

# Initial setup
setup:
	@echo "🔧 Running initial setup..."
	./setup.sh

# Start services
start:
	@echo "🚀 Starting CI/CD Dashboard..."
	docker-compose -f docker-compose.minimal.yml up -d
	@echo "✅ Dashboard started!"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend: http://localhost:3001"

# Stop services
stop:
	@echo "🛑 Stopping CI/CD Dashboard..."
	docker-compose -f docker-compose.minimal.yml down

# Restart services
restart: stop start

# View logs
logs:
	docker-compose -f docker-compose.minimal.yml logs -f

# Clean up everything
clean:
	@echo "🧹 Cleaning up containers and volumes..."
	docker-compose -f docker-compose.minimal.yml down -v
	docker system prune -f

# Rebuild containers
build:
	@echo "🔨 Rebuilding containers..."
	docker-compose -f docker-compose.minimal.yml build --no-cache
	docker-compose -f docker-compose.minimal.yml up -d

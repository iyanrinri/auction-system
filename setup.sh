#!/bin/bash

# NestJS Auction System - Setup Script
# This script helps set up the Docker environment for the auction system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_message() {
    echo -e "${2:-$GREEN}$1${NC}"
}

print_error() {
    echo -e "${RED}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}$1${NC}"
}

print_info() {
    echo -e "${BLUE}$1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_info "🔍 Checking prerequisites..."
    
    local missing_deps=()
    
    if ! command_exists docker; then
        missing_deps+=("Docker")
    fi
    
    if ! command_exists docker-compose; then
        missing_deps+=("Docker Compose")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        print_error "❌ Missing required dependencies:"
        for dep in "${missing_deps[@]}"; do
            print_error "  - $dep"
        done
        print_info "Please install the missing dependencies and try again."
        print_info "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    print_message "✅ All prerequisites satisfied"
}

# Check if ports are available
check_ports() {
    print_info "🔍 Checking port availability..."
    
    local ports=(3000 5433 5673 15673 6379 5050)
    local busy_ports=()
    
    for port in "${ports[@]}"; do
        if lsof -i :$port >/dev/null 2>&1; then
            busy_ports+=($port)
        fi
    done
    
    if [ ${#busy_ports[@]} -gt 0 ]; then
        print_warning "⚠️  The following ports are already in use:"
        for port in "${busy_ports[@]}"; do
            print_warning "  - Port $port"
            lsof -i :$port | head -2
        done
        echo
        print_warning "This might cause conflicts. Continue anyway? (y/N)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            print_info "Aborting setup. Please free up the ports and try again."
            exit 1
        fi
    else
        print_message "✅ All required ports are available"
    fi
}

# Setup environment file
setup_environment() {
    print_info "📝 Setting up environment configuration..."
    
    if [ ! -f .env ]; then
        if [ -f .env.docker ]; then
            cp .env.docker .env
            print_message "✅ Environment file created from .env.docker"
        else
            print_error "❌ .env.docker template not found"
            exit 1
        fi
    else
        print_warning "⚠️  .env file already exists. Overwrite? (y/N)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            cp .env.docker .env
            print_message "✅ Environment file updated"
        else
            print_info "Using existing .env file"
        fi
    fi
}

# Build and start services
start_services() {
    print_info "🚀 Building and starting Docker services..."
    
    print_info "This may take a few minutes on first run..."
    
    if docker-compose up --build -d; then
        print_message "✅ Services started successfully"
    else
        print_error "❌ Failed to start services"
        print_info "Check the logs with: npm run docker:logs"
        exit 1
    fi
}

# Wait for services to be healthy
wait_for_services() {
    print_info "⏳ Waiting for services to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        local healthy_count=0
        
        # Check PostgreSQL
        if docker-compose exec -T postgres pg_isready -U auction_user -d auction_system >/dev/null 2>&1; then
            ((healthy_count++))
        fi
        
        # Check RabbitMQ
        if docker-compose exec -T rabbitmq rabbitmq-diagnostics check_running >/dev/null 2>&1; then
            ((healthy_count++))
        fi
        
        # Check Redis
        if docker-compose exec -T redis redis-cli ping >/dev/null 2>&1; then
            ((healthy_count++))
        fi
        
        # Check App (simple HTTP check)
        if curl -s http://localhost:3000/health >/dev/null 2>&1; then
            ((healthy_count++))
        fi
        
        if [ $healthy_count -eq 4 ]; then
            print_message "✅ All services are healthy"
            return 0
        fi
        
        printf "⏳ Waiting for services... (%d/%d)\r" $attempt $max_attempts
        sleep 2
        ((attempt++))
    done
    
    print_warning "⚠️  Some services may not be ready yet. Check status with: npm run docker:logs"
    return 1
}

# Show service information
show_service_info() {
    print_info "📋 Service Information:"
    echo
    print_message "🌐 Application URLs:" "$BLUE"
    echo "  • API:              http://localhost:3000"
    echo "  • Swagger Docs:     http://localhost:3000/api/docs"
    echo "  • RabbitMQ UI:      http://localhost:15673 (auction_user/auction_password)"
    echo "  • pgAdmin:          http://localhost:5050 (admin@auction.com/admin123)"
    echo
    print_message "🔌 Database Connections:" "$BLUE"
    echo "  • PostgreSQL:       localhost:5433"
    echo "  • RabbitMQ:         localhost:5673"
    echo "  • Redis:            localhost:6379"
    echo
    print_message "📊 Management Commands:" "$BLUE"
    echo "  • View logs:        npm run docker:logs"
    echo "  • Stop services:    npm run docker:down"
    echo "  • Restart:          npm run docker:up"
    echo "  • Full reset:       npm run docker:down:volumes && npm run docker:up:build"
    echo
}

# Test API endpoints
test_endpoints() {
    print_info "🧪 Testing API endpoints..."
    
    # Test health endpoint
    if curl -s http://localhost:3000/health >/dev/null 2>&1; then
        print_message "✅ Health endpoint responding"
    else
        print_warning "⚠️  Health endpoint not responding"
    fi
    
    # Test Swagger docs
    if curl -s http://localhost:3000/api/docs >/dev/null 2>&1; then
        print_message "✅ Swagger documentation available"
    else
        print_warning "⚠️  Swagger documentation not available"
    fi
}

# Main setup function
main() {
    echo
    print_message "🎯 NestJS Auction System - Docker Setup" "$BLUE"
    print_message "=========================================" "$BLUE"
    echo
    
    check_prerequisites
    echo
    
    check_ports
    echo
    
    setup_environment
    echo
    
    start_services
    echo
    
    wait_for_services
    echo
    
    test_endpoints
    echo
    
    show_service_info
    
    print_message "🎉 Setup completed successfully!" "$GREEN"
    print_info "You can now access your auction system at http://localhost:3000/api/docs"
    echo
}

# Handle script arguments
case "${1:-setup}" in
    "setup"|"")
        main
        ;;
    "check")
        check_prerequisites
        check_ports
        ;;
    "start")
        start_services
        wait_for_services
        show_service_info
        ;;
    "test")
        test_endpoints
        ;;
    "info")
        show_service_info
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo
        echo "Commands:"
        echo "  setup (default)  Full setup process"
        echo "  check           Check prerequisites and ports"
        echo "  start           Start services only"
        echo "  test            Test endpoints"
        echo "  info            Show service information"
        echo "  help            Show this help"
        ;;
    *)
        print_error "Unknown command: $1"
        print_info "Use '$0 help' for available commands"
        exit 1
        ;;
esac
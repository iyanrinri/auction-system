# NestJS Auction System

A complete auction system built with NestJS, TypeORM, PostgreSQL, RabbitMQ, and Docker.

## 🚀 Features

### Core Features
- **User Authentication**: JWT-based authentication with role-based access control
- **Auction Management**: Create, manage, and participate in auctions
- **Real-time Bidding**: Live bidding with WebSocket support
- **Payment Integration**: Secure payment processing
- **Notifications**: Email and in-app notifications via RabbitMQ
- **Watchlist**: Save and track favorite auctions

### Technical Features
- **Microservices Ready**: Message queue integration with RabbitMQ
- **Caching**: Redis integration for performance optimization
- **API Documentation**: Swagger/OpenAPI documentation
- **Docker Support**: Complete containerization with multi-stage builds
- **Database Migrations**: TypeORM migrations for schema management
- **Testing**: Unit and e2e testing setup

## Tech Stack

- **Framework**: NestJS 11.x
- **Language**: TypeScript
- **Database**: PostgreSQL with TypeORM
- **Message Broker**: RabbitMQ
- **Cache**: Redis
- **Authentication**: JWT with Passport
- **Documentation**: Swagger/OpenAPI
- **Containerization**: Docker & Docker Compose
- **Package Manager**: pnpm

## Prerequisites

- Node.js (v18+)
- Docker & Docker Compose
- pnpm (recommended) or npm

## Quick Start

```bash
# Clone repository
git clone <repository-url>
cd nestjs-auction-system

# Copy environment file
cp .env.docker .env

# Start all services
npm run docker:up:build

# Access application
open http://localhost:3000/api/docs
```


## Services

| Service | Port (Default) | Environment Variable | Description |
|---------|----------------|---------------------|-------------|
| API | 3000 | `APP_HOST_PORT` | NestJS Application |
| PostgreSQL | 5433 | `DB_HOST_PORT` | Primary Database |
| RabbitMQ | 5673 | `RABBITMQ_HOST_PORT` | Message Broker |
| RabbitMQ Management | 15673 | `RABBITMQ_MANAGEMENT_PORT` | RabbitMQ UI |
| Redis | 6379 | `REDIS_HOST_PORT` | Cache Store |
| pgAdmin | 5050 | `PGADMIN_HOST_PORT` | Database UI |

## Environment Configuration

### Port Configuration

All ports can be customized via environment variables. The system uses default values if not specified:

```env
# Host Ports Configuration (external access)
APP_HOST_PORT=3000
DB_HOST_PORT=5433
RABBITMQ_HOST_PORT=5673
RABBITMQ_MANAGEMENT_PORT=15673
REDIS_HOST_PORT=6379
PGADMIN_HOST_PORT=5050
```

### Complete Environment Variables

```env
# Application
NODE_ENV=development
PORT=3000

# Host Ports Configuration (external access)
APP_HOST_PORT=3000
DB_HOST_PORT=5433
RABBITMQ_HOST_PORT=5673
RABBITMQ_MANAGEMENT_PORT=15673
REDIS_HOST_PORT=6379
PGADMIN_HOST_PORT=5050

# Database Configuration
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=auction_user
DB_PASSWORD=auction_password
DB_NAME=auction_system

# RabbitMQ Configuration
RABBITMQ_USERNAME=auction_user
RABBITMQ_PASSWORD=auction_password
RABBITMQ_VHOST=auction_vhost
RABBITMQ_URL=amqp://auction_user:auction_password@localhost:5673/auction_vhost

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# pgAdmin Configuration
PGADMIN_EMAIL=admin@auction.com
PGADMIN_PASSWORD=admin123
```

### Docker Environment

The Docker Compose configuration automatically reads from your `.env` file with sensible defaults. You can:

1. **Copy the example**: `cp .env.example .env`
2. **Customize ports**: Modify port variables to avoid conflicts
3. **Override credentials**: Change usernames and passwords as needed
4. **Environment-specific configs**: Create `.env.development`, `.env.production` files

## API Documentation

Interactive API documentation is available at:
- **Development**: http://localhost:3000/api/docs (or custom port via `APP_HOST_PORT`)
- **Swagger JSON**: http://localhost:3000/api/docs-json

## Database Schema

### Core Entities

- **Users**: User accounts with authentication
- **Categories**: Auction item categories
- **Items**: Auction items with details
- **Auctions**: Auction listings with bidding rules
- **Bids**: User bids on auctions
- **Payments**: Payment transactions
- **Watchlists**: User's saved auctions
- **Notifications**: System notifications

### Relationships

```
Users (1:n) Auctions
Users (1:n) Bids
Users (1:n) Payments
Users (1:n) Watchlists
Users (1:n) Notifications

Categories (1:n) Items
Items (1:1) Auctions
Auctions (1:n) Bids
Auctions (1:n) Watchlists

Auctions (1:n) Payments
Users (1:n) Payments
```

## Project Structure

```
src/
├── auth/                 # Authentication module
│   ├── controllers/      # Auth controllers
│   ├── dto/             # Data transfer objects
│   ├── guards/          # Auth guards
│   └── strategies/      # Passport strategies
├── database/            # Database configuration
│   ├── entities/        # TypeORM entities
│   └── migrations/      # Database migrations
├── users/               # User management
├── auctions/            # Auction management
├── bids/                # Bidding system
├── payments/            # Payment processing
├── notifications/       # Notification system
└── common/              # Shared utilities
    ├── decorators/      # Custom decorators
    ├── filters/         # Exception filters
    ├── guards/          # Custom guards
    └── interceptors/    # Response interceptors
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## Deployment

### Docker Production

```bash
# Build production image
npm run docker:build:prod

# Start production stack
npm run docker:prod:up:detach

# Monitor logs
npm run docker:logs
```

### Manual Deployment

```bash
# Build application
npm run build

# Run production server
npm run start:prod
```

## 🔄 Database Operations

### Migrations

```bash
# Generate migration
npm run migration:generate -- --name=CreateAuctionTable

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert
```

### Seeding

```bash
# Seed database (Docker)
npm run docker:seed

# Seed database (Local)
npm run seed
```

## Message Queue

### RabbitMQ Queues

- `auction.notifications` - User notifications
- `auction.emails` - Email processing
- `auction.bids` - Bid processing
- `auction.payments` - Payment processing

### Event Patterns


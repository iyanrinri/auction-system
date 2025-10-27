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

## 🛠️ Tech Stack

- **Framework**: NestJS 11.x
- **Language**: TypeScript
- **Database**: PostgreSQL with TypeORM
- **Message Broker**: RabbitMQ
- **Cache**: Redis
- **Authentication**: JWT with Passport
- **Documentation**: Swagger/OpenAPI
- **Containerization**: Docker & Docker Compose
- **Package Manager**: pnpm

## 📋 Prerequisites

- Node.js (v18+)
- Docker & Docker Compose
- pnpm (recommended) or npm

## 🚀 Quick Start

### Option 1: Docker (Recommended)

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

### Option 2: Local Development

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env

# Start PostgreSQL and RabbitMQ (using Docker)
docker-compose -f docker-compose.deps.yml up -d

# Run migrations
npm run migration:run

# Start development server
npm run start:dev
```

## 📦 Services

| Service | Port | Description |
|---------|------|-------------|
| API | 3000 | NestJS Application |
| PostgreSQL | 5432 | Primary Database |
| RabbitMQ | 5672/15672 | Message Broker |
| Redis | 6379 | Cache Store |
| pgAdmin | 5050 | Database UI |

## 📚 API Documentation

Interactive API documentation is available at:
- **Development**: http://localhost:3000/api/docs
- **Swagger JSON**: http://localhost:3000/api/docs-json

### Authentication

The API uses JWT Bearer token authentication. Register a user and use the login endpoint to get a token.

```bash
# Register new user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","firstName":"John","lastName":"Doe"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Use token in subsequent requests
curl -X GET http://localhost:3000/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🗄️ Database Schema

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

## 🔧 Configuration

### Environment Variables

```env
# Application
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=auction_user
DB_PASSWORD=auction_password
DB_NAME=auction_system

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# RabbitMQ
RABBITMQ_URL=amqp://auction_user:auction_password@localhost:5672/auction_vhost

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

## 🏗️ Project Structure

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

## 🧪 Testing

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

## 🚀 Deployment

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

## 📨 Message Queue

### RabbitMQ Queues

- `auction.notifications` - User notifications
- `auction.emails` - Email processing
- `auction.bids` - Bid processing
- `auction.payments` - Payment processing

### Event Patterns

```typescript
// Publishing events
await this.rabbitmqService.publish('auction.events', 'bid.placed', {
  auctionId: auction.id,
  userId: user.id,
  bidAmount: bid.amount
});

// Consuming events
@EventPattern('bid.placed')
async handleBidPlaced(data: BidPlacedEvent) {
  // Process bid notification
}
```

## 🎯 Roadmap

### Phase 1 (Current)
- [x] User authentication
- [x] Basic auction management
- [x] Bidding system
- [x] Docker setup

### Phase 2
- [ ] Real-time bidding with WebSockets
- [ ] Email notifications
- [ ] Payment integration
- [ ] Image upload for items

### Phase 3
- [ ] Advanced search and filtering
- [ ] Auction categories management
- [ ] Admin dashboard
- [ ] Mobile API optimization

### Phase 4
- [ ] Multi-language support
- [ ] Advanced analytics
- [ ] Third-party integrations
- [ ] Performance optimizations

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Update documentation
- Follow commit message conventions
- Ensure Docker builds pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For questions and support:

- Open an issue on GitHub
- Check the documentation
- Review existing issues

## 🙏 Acknowledgments

- NestJS team for the amazing framework
- TypeORM for excellent database integration
- RabbitMQ for reliable messaging
- Docker for containerization made easy

---

**Happy coding! 🎯**

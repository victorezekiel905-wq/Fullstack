# SynergySwift Backend API

Enterprise-grade Multi-Tenant School Management System built with NestJS.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 16+
- Redis 7+
- RabbitMQ 3+

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Run database migrations
npm run migration:run

# Start development server
npm run start:dev
```

The API will be available at `http://localhost:3000`  
API Documentation: `http://localhost:3000/api/docs`

## 🏗️ Architecture

### Multi-Tenancy Model
- **Schema-per-Tenant**: Each school gets isolated PostgreSQL schema
- **Tenant Resolution**: Via subdomain, custom domain, or HTTP header
- **Row Level Security**: Fail-safe data isolation

### Core Modules
```
src/
├── modules/
│   ├── auth/              # Authentication & JWT
│   ├── tenants/           # Tenant management
│   ├── users/             # User CRUD & RBAC
│   ├── students/          # Student management
│   ├── academic/          # Sessions, terms, classes
│   ├── results/           # Grading & result computation
│   ├── finance/           # Fees & payments
│   ├── communication/     # WhatsApp, Email, SMS
│   ├── dashboard/         # Widgets & analytics
│   └── r-admin/           # Super admin panel
├── common/                # Shared utilities
└── config/                # Configuration files
```

## 📡 API Endpoints

### Authentication
```http
POST   /api/v1/auth/register-tenant    # Register new school
POST   /api/v1/auth/login               # User login
POST   /api/v1/auth/refresh             # Refresh token
POST   /api/v1/auth/logout              # Logout
```

### Students
```http
GET    /api/v1/students                 # List students
POST   /api/v1/students                 # Create student
GET    /api/v1/students/:id             # Get student details
PATCH  /api/v1/students/:id             # Update student
DELETE /api/v1/students/:id             # Delete student
POST   /api/v1/students/bulk-import     # Bulk import (CSV)
```

### Results
```http
POST   /api/v1/results/scores/bulk      # Enter scores (bulk)
POST   /api/v1/results/process           # Trigger result computation
GET    /api/v1/results/broadsheet        # View broadsheet
POST   /api/v1/results/publish           # Publish results
GET    /api/v1/results/report-card/:id   # Generate report card PDF
```

### Finance
```http
GET    /api/v1/finance/invoices          # List invoices
POST   /api/v1/finance/invoices/generate # Generate invoices
POST   /api/v1/finance/payments          # Record payment
GET    /api/v1/finance/defaulters        # Get fee defaulters
```

### Communication
```http
POST   /api/v1/communications/send-result    # Send result (WhatsApp/Email)
POST   /api/v1/communications/send-bulk      # Bulk messaging
GET    /api/v1/communications/notifications  # Notification history
```

Full API documentation: `/api/docs` (Swagger UI)

## 🔐 Environment Variables

```bash
# Application
NODE_ENV=production
APP_PORT=3000

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=synergyswift
DATABASE_PASSWORD=secure_password
DATABASE_NAME=synergyswift

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# WhatsApp API
WHATSAPP_API_KEY=your-key

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_USER=noreply@synergyswift.ng
SMTP_PASSWORD=your-password
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 🐳 Docker Deployment

```bash
# Build image
docker build -t synergyswift-backend .

# Run with docker-compose
docker-compose up -d
```

## 📊 Database Migrations

```bash
# Generate migration
npm run migration:generate -- -n MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

## 🛠️ Development

### Code Structure
```typescript
// Module structure
@Module({
  imports: [],      // Dependencies
  controllers: [],  // HTTP endpoints
  providers: [],    // Services, repositories
  exports: [],      // Exported for other modules
})
```

### Creating a New Module
```bash
nest g module modules/moduleName
nest g controller modules/moduleName
nest g service modules/moduleName
```

### Tenant Context Access
```typescript
@Injectable()
export class SomeService {
  async someMethod(@Req() request: Request) {
    const tenantId = request['tenantId'];
    const schemaName = request['schemaName'];
    
    // Your logic here
  }
}
```

## 📈 Performance

### Optimization Strategies
- **Connection Pooling**: Max 100 database connections
- **Redis Caching**: 1-hour TTL for computed results
- **Query Optimization**: Indexed columns, eager/lazy loading
- **Async Processing**: BullMQ for heavy computations
- **CDN**: Static assets served via Cloudflare

### Monitoring
- **Logs**: Winston with daily rotation
- **Metrics**: Prometheus + Grafana
- **APM**: Sentry for error tracking
- **Health Check**: `/health` endpoint

## 🔒 Security

### Best Practices Implemented
✅ Helmet.js (HTTP headers security)  
✅ Rate limiting (100 req/min per user)  
✅ CORS configuration  
✅ SQL injection prevention (parameterized queries)  
✅ XSS protection (class-validator)  
✅ JWT expiration (24h access, 7d refresh)  
✅ Password hashing (bcrypt, 10 rounds)  
✅ Row Level Security (PostgreSQL)  

### Security Checklist
- [ ] Change default JWT_SECRET
- [ ] Enable DATABASE_SSL in production
- [ ] Set up firewall rules (allow only necessary ports)
- [ ] Enable AWS VPC for database
- [ ] Implement IP whitelisting for R-Admin
- [ ] Regular security audits
- [ ] Dependency updates (npm audit)

## 🚀 Production Deployment

### AWS ECS Deployment
1. Build Docker image
2. Push to ECR
3. Update ECS task definition
4. Deploy to ECS cluster

### Environment Setup
- **Load Balancer**: AWS ALB (SSL termination)
- **Database**: RDS PostgreSQL (Multi-AZ)
- **Cache**: ElastiCache Redis (cluster mode)
- **Storage**: S3 or Cloudflare R2
- **Queue**: RabbitMQ on ECS or AWS MQ

### Scaling Configuration
```yaml
Auto Scaling:
  Min Capacity: 2 tasks
  Max Capacity: 20 tasks
  Target CPU: 70%
  Scale Out: +1 task when >70% for 2 min
  Scale In: -1 task when <50% for 5 min
```

## 📝 License

Copyright © 2026 SynergySwift Technologies Ltd. All rights reserved.

## 🤝 Support

- **Email**: developers@synergyswift.ng
- **Documentation**: https://docs.synergyswift.ng
- **Status**: https://status.synergyswift.ng

---

**Built with ❤️ by SynergySwift Team**

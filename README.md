<<<<<<< HEAD
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
=======
# 🚀 SynergySwift Backend v3.0 - Enterprise Edition

## ✅ RENDER FREE TIER READY | ENTERPRISE HARDENED | ZERO MANUAL STEPS

---

## 🎯 WHAT IS THIS?

A **production-grade NestJS backend** for school management that is:

- ✅ **100% Render Free Tier Compatible** - Optimized for 512MB RAM
- ✅ **Enterprise-Ready** - Security, audit logging, rate limiting
- ✅ **Auto-Deploying** - Push to main = automatic deployment
- ✅ **Zero Configuration** - Auto-migrations, health checks built-in
- ✅ **Communication Enabled** - Email, SMS, WhatsApp ready

---

## 📦 FEATURES

### 🔒 Security & Compliance
- Helmet security headers
- CORS protection
- Rate limiting (100 req/min)
- JWT authentication with refresh tokens
- Bcrypt password hashing
- Input validation (class-validator)
- Audit logging for all actions
- SQL injection protection

### 🏗️ Architecture
- Clean layered architecture (Controller → Service → Repository)
- Dependency injection
- No circular dependencies
- Transaction-safe operations
- Idempotent APIs
- Correlation ID tracking

### 📊 Database
- PostgreSQL with TypeORM
- Auto-migrations on deployment
- Connection pooling (max 10)
- SSL support for production
- Proper indexing

### 📡 Communication Services
- **Email**: SMTP with Handlebars templates
- **SMS**: Twilio integration
- **WhatsApp**: Twilio & Business API
- **Multi-channel notifications**
- Message logging

### 🔍 Observability
- Health checks (`/health`, `/ready`, `/live`)
- Structured JSON logging
- Error tracking with stack traces
- Request/response interceptors
- Memory and database monitoring

### 🚀 CI/CD
- GitHub Actions pipeline
- Automated linting and testing
- Docker build verification
- Auto-deploy to Render

---

## 🎬 QUICK START

### Prerequisites
- GitHub account
- Render account (free)
- 15 minutes

### Deployment (3 Commands)

```bash
# 1. Clone/Extract this repository
cd synergyswift-fullstack

# 2. Push to your GitHub
git init
git add .
git commit -m "Enterprise backend - Render ready"
git remote add origin https://github.com/YOUR_USERNAME/synergyswift-backend.git
git push -u origin main

# 3. Deploy on Render
# Go to https://dashboard.render.com
# Click "New +" → "Web Service" → Connect GitHub repo
# Follow RENDER_DEPLOYMENT.md
```

**That's it!** Your backend will be live in ~10 minutes.

---

## 📚 DOCUMENTATION

- **[RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)** - Complete deployment guide
- **[ENTERPRISE_CHECKLIST.md](./ENTERPRISE_CHECKLIST.md)** - 100+ items verified
- **[.env.production.example](./.env.production.example)** - Environment template

### API Documentation
Once deployed, access Swagger UI at:
```
https://your-app.onrender.com/api/docs
```

---

## 🔧 ENVIRONMENT VARIABLES

### Required
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=<min-32-chars>
```

### Optional (Communication)
```env
# Email
FEATURE_EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SMS (Twilio)
FEATURE_SMS_ENABLED=true
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890

# WhatsApp (Twilio)
FEATURE_WHATSAPP_ENABLED=true
WHATSAPP_PROVIDER=twilio
TWILIO_WHATSAPP_NUMBER=+14155238886
```

---

## 🏗️ ARCHITECTURE

```
backend/
├── src/
│   ├── common/              # Shared utilities
│   │   ├── config/          # Environment validation
│   │   ├── filters/         # Exception filters
│   │   ├── interceptors/    # Request/response interceptors
│   │   ├── middleware/      # Logging, tenant, etc.
│   │   ├── health/          # Health check endpoints
│   │   └── entities/        # Audit log entity
│   ├── config/              # Database configuration
│   │   ├── data-source.ts   # TypeORM data source
│   │   └── database.config.ts
│   ├── modules/             # Feature modules
│   │   ├── auth/            # Authentication & authorization
│   │   ├── users/           # User management
│   │   ├── tenants/         # Multi-tenancy
│   │   ├── students/        # Student management
│   │   ├── teachers/        # Teacher management
│   │   ├── results/         # Academic results
│   │   └── communication/   # Email, SMS, WhatsApp
│   ├── main.ts              # Application bootstrap
│   └── app.module.ts        # Root module
├── Dockerfile               # Multi-stage production build
├── package.json             # Dependencies (Render-optimized)
└── render.yaml              # Render blueprint
```

---

## 🧪 TESTING

```bash
# Run tests
npm test

# Run linting
npm run lint

# Build
npm run build
```

---

## 🔍 HEALTH CHECKS

### Endpoints
- `GET /health` - Overall health (DB, memory)
- `GET /ready` - Readiness check (DB connectivity)
- `GET /live` - Liveness check (app uptime)

### Example Response
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "memory_heap": { "status": "up" },
    "memory_rss": { "status": "up" }
>>>>>>> d778a5b3934d46b85783877a525f77a2d11421e4
  }
}
```

<<<<<<< HEAD
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
=======
---

## 💰 COST

**Free Tier**: $0/month
- Backend: Free
- Database: 1GB free (90-day expiration)
- SSL: Included
- Auto-deploy: Included

**Limitations**:
- 512 MB RAM
- Sleeps after 15 min inactivity
- Cold start: 30-60 seconds

**Production Upgrade**: $7/month each
- No cold starts
- 512 MB → 2 GB RAM
- Persistent database (10GB)

---

## 🐛 TROUBLESHOOTING

### Build Fails
- Check `Dockerfile` path in Render settings
- Verify environment variables are set
- Check build logs for errors

### Health Check Fails
- Ensure `DATABASE_URL` uses **Internal** URL
- Verify `JWT_SECRET` is ≥32 characters
- Check application logs

### Cold Start Slow
- Expected: 30-60 seconds after sleep
- Solution: Use UptimeRobot to ping every 14 minutes

---

## 🔄 CI/CD WORKFLOW

```mermaid
graph LR
    A[Push to main] --> B[GitHub Actions]
    B --> C[Lint & Test]
    C --> D[Build]
    D --> E[Docker Test]
    E --> F[Render Auto-Deploy]
    F --> G[Health Check]
    G --> H[Live! 🎉]
```

---

## 🎯 WHAT'S INCLUDED

### ✅ Security
- [x] Helmet headers
- [x] CORS protection
- [x] Rate limiting
- [x] JWT auth
- [x] Password hashing
- [x] Input validation
- [x] Audit logging

### ✅ Render Compatibility
- [x] 0.0.0.0 binding
- [x] Dynamic PORT
- [x] Fast startup (<30s)
- [x] Cold start ready
- [x] Auto-migrations
- [x] Health checks
- [x] Memory optimized

### ✅ Enterprise Features
- [x] Multi-tenancy
- [x] Audit trails
- [x] Communication suite
- [x] Transaction safety
- [x] Error handling
- [x] Correlation IDs
- [x] API documentation

---

## 📞 SUPPORT

- **Issues**: GitHub Issues
- **Health**: `GET /health`
- **Docs**: `GET /api/docs`

---

## 📄 LICENSE

UNLICENSED - Private use only

---

## 🎉 READY TO DEPLOY?

**See**: [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)

**Total Time**: 15 minutes  
**Cost**: $0/month (free tier)  
**Difficulty**: Easy  
**Result**: Production-grade backend ✅

---

**Version**: 3.0 Enterprise  
**Status**: ✅ Production Ready  
**Last Updated**: 2026-02-04  
**Render Compatible**: ✅ Free Tier Optimized

---

**🚀 DEPLOY NOW!**
>>>>>>> d778a5b3934d46b85783877a525f77a2d11421e4

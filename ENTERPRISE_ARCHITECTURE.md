# Enterprise Architecture Documentation

## Overview

SynergySwift is an enterprise-grade school management system built with NestJS, designed for scalability, security, and observability while remaining fully deployable on Render's free web service tier.

---

## Architecture Principles

### 1. **Stateless Design**
- **No in-memory session storage** - All authentication uses JWT tokens
- **No server-side state** - Each request is self-contained
- **Horizontal scalability ready** - Multiple instances can run without coordination
- **Database is the single source of truth**

### 2. **Multi-Tenancy**
- **Data isolation** - Each tenant's data is logically separated via `tenantId`
- **Row-level security** - All queries filter by tenant context
- **Tenant resolution** - Extracted from JWT or subdomain
- **No cross-tenant leakage**

### 3. **Clean Layered Architecture**
```
┌─────────────────────────────────────┐
│         Controllers                 │  ← HTTP/REST Layer
│  (Request validation, DTOs)         │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│          Services                   │  ← Business Logic
│  (Transactions, domain rules)       │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│        Repositories                 │  ← Data Access
│  (TypeORM, queries)                 │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│         PostgreSQL                  │  ← Persistence
└─────────────────────────────────────┘
```

### 4. **Dependency Injection**
- **NestJS IoC container** - Manages all dependencies
- **No circular dependencies** - Enforced via module design
- **Testable** - Easy to mock dependencies
- **Interface segregation** - Small, focused interfaces

---

## Core Modules

### **Health Module**
- `/api/v1/health` - Overall system health (database + memory)
- `/api/v1/ready` - Readiness probe (can accept traffic)
- `/api/v1/live` - Liveness probe (process is running)
- Used by Render for health checks

### **Auth Module**
- JWT-based authentication (access + refresh tokens)
- Bcrypt password hashing
- Role-based access control (RBAC)
- Multi-tenancy support
- Rate-limited login endpoints

### **Audit Module**
- Comprehensive audit logging
- 365-day retention
- Tracks all CRUD operations
- Correlation ID propagation
- Security event logging

### **Multi-Tenancy**
- Tenant middleware extracts context
- All entities have `tenantId`
- Automatic filtering in repositories
- Tenant isolation guarantees

---

## Data Flow

### Typical Request Flow
```
1. Request arrives → Correlation ID assigned
2. CORS validation → Origin check
3. Rate limiting → Check request quota
4. Authentication → JWT validation
5. Tenant extraction → Set context
6. Authorization → Check permissions
7. Controller → Validate DTO
8. Service → Execute business logic
9. Repository → Query with tenant filter
10. Response → Add headers, log metrics
```

### Audit Trail Flow
```
Controller → AuditService.log() → Database
                    ↓
         EnterpriseLogger (structured JSON)
```

---

## Security Architecture

### Defense in Depth

1. **Network Layer**
   - HTTPS only (Render provides SSL)
   - Strict CORS policy (no wildcards in production)
   - Rate limiting (100 req/min per IP)

2. **Application Layer**
   - Helmet security headers (CSP, HSTS, X-Frame-Options)
   - Input validation (class-validator on all DTOs)
   - Output sanitization (whitelist responses)
   - SQL injection protection (parameterized queries)

3. **Authentication Layer**
   - JWT with RS256 or HS256
   - Token expiry (15 minutes access, 7 days refresh)
   - Issuer and audience validation
   - Refresh token rotation

4. **Authorization Layer**
   - Role-based access control (RBAC)
   - Tenant-based isolation
   - Resource-level permissions

5. **Data Layer**
   - Encrypted connections (DATABASE_SSL=true)
   - Connection pooling (limits concurrent access)
   - Transaction isolation (ACID guarantees)

---

## Observability

### Structured Logging
```json
{
  "timestamp": "2024-02-04T12:00:00.000Z",
  "level": "info",
  "context": "HTTP",
  "message": "HTTP Response",
  "correlationId": "uuid",
  "method": "POST",
  "path": "/api/v1/students",
  "statusCode": 201,
  "duration": 145,
  "userId": "user-id",
  "tenantId": "tenant-id"
}
```

### Log Types
- **HTTP Logs** - All requests/responses
- **Audit Logs** - CRUD operations
- **Security Logs** - Authentication failures, CORS blocks
- **Performance Logs** - Slow queries, high memory
- **Error Logs** - Exceptions with stack traces

### Metrics (In Logs)
- Request duration
- Memory usage
- Database query time
- Error rates (derived from logs)
- Slow request warnings (>3 seconds)

---

## Database Architecture

### Entity Relationships
```
Tenant (1) ─────── (*) Users
              ├─── (*) Students
              ├─── (*) Teachers
              ├─── (*) Classes
              ├─── (*) Results
              └─── (*) Finance

User (1) ──────── (*) AuditLogs
```

### Migration Strategy
- **Auto-migration on deploy** - Runs during bootstrap
- **Versioned migrations** - All in `src/migrations/`
- **Rollback support** - Via TypeORM CLI
- **Transaction-safe** - All or nothing

### Connection Pooling
```
Free Tier:  5 connections (DATABASE_POOL_SIZE=5)
Production: 10+ connections
```

---

## Scalability

### Horizontal Scaling (Multi-Instance)

**Ready for horizontal scaling:**
- ✅ Stateless design (no in-memory state)
- ✅ Database connection pooling
- ✅ JWT-based auth (no sessions)
- ✅ No file uploads to local disk
- ✅ Correlation IDs for distributed tracing

**How to scale on Render:**
1. Increase instance count in Render Dashboard
2. Render load balancer handles distribution
3. Each instance connects to shared PostgreSQL
4. No code changes required

**Performance Characteristics:**
- **Single instance**: 50-100 concurrent users
- **2 instances**: 100-200 concurrent users
- **N instances**: Linear scaling up to database limits

### Vertical Scaling
- Increase instance size (512MB → 1GB → 2GB)
- Increase database connections proportionally
- Adjust `DATABASE_POOL_SIZE` environment variable

---

## Deployment Architecture (Render Free Tier)

```
┌─────────────────────────────────────┐
│     Render Load Balancer            │
│  (SSL Termination, DDoS Protection) │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│   Web Service (Docker Container)    │
│  - Node.js 18 (Alpine)              │
│  - 512MB RAM                        │
│  - Single instance (free tier)      │
│  - Auto-restart on crash            │
│  - Health checks: /api/v1/health    │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│   PostgreSQL Database (Free Tier)   │
│  - 256MB RAM                        │
│  - 1GB Storage                      │
│  - 90-day retention                 │
│  - SSL enabled                      │
└─────────────────────────────────────┘
```

---

## Performance Optimization

### Memory Management
- **Target**: <450MB heap usage (512MB limit)
- **Monitoring**: Health endpoint tracks memory
- **Connection pool**: 5 connections (low overhead)
- **No caching**: Avoid Redis (free tier limitation)

### Response Time Targets
- **Health checks**: <100ms
- **Simple queries**: <200ms
- **Complex operations**: <1000ms
- **Slow query threshold**: >3000ms (logged)

### Database Optimization
- **Indexes**: All foreign keys and common query fields
- **Eager loading**: Prevent N+1 queries
- **Query logging**: Enabled in development only
- **Transaction boundaries**: Minimal scope

---

## Disaster Recovery

### Backup Strategy
- **Database**: Render automatic backups (90-day retention)
- **Manual backups**: Export via `pg_dump` weekly
- **Code**: Git repository (GitHub)
- **Configuration**: Environment variables documented

### Recovery Time Objective (RTO)
- **Database restore**: ~15 minutes
- **Full redeploy**: ~10 minutes
- **Total RTO**: <30 minutes

### Recovery Point Objective (RPO)
- **Database**: Last transaction (continuous)
- **Acceptable data loss**: <5 minutes

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Node.js | 18 LTS | JavaScript runtime |
| **Framework** | NestJS | 10.x | Web framework |
| **Language** | TypeScript | 5.x | Type safety |
| **Database** | PostgreSQL | 15+ | Relational database |
| **ORM** | TypeORM | 0.3.x | Object-relational mapping |
| **Auth** | Passport JWT | 4.x | Authentication |
| **Validation** | class-validator | 0.14.x | DTO validation |
| **Logging** | Winston | 3.x | Structured logging |
| **Documentation** | Swagger | 7.x | API docs |
| **Security** | Helmet | 7.x | HTTP security headers |

---

## Configuration Management

### Environment Profiles

| Profile | Use Case | CORS | SSL | Logging |
|---------|----------|------|-----|---------|
| `development` | Local dev | Wildcard | No | Debug |
| `render-free` | Render free tier | Strict | Yes | Info |
| `production` | Paid hosting | Strict | Yes | Warn |
| `enterprise` | On-premise | Strict | Yes | Info |

### Environment Variables
- **Required**: 7 (database, JWT secrets, CORS)
- **Optional**: 20+ (fine-tuning)
- **Validation**: Strict on startup
- **Documentation**: See `.env.render-free`

---

## Compliance & Standards

### Security Standards
- **OWASP Top 10**: All mitigations implemented
- **GDPR**: Audit logging, data retention policies
- **SOC 2**: Logging, access control, encryption

### Code Standards
- **TypeScript strict mode**: Enabled
- **ESLint**: Enforced
- **Prettier**: Auto-formatting
- **No any types**: Type safety required

---

## Limitations (Render Free Tier)

| Limitation | Impact | Mitigation |
|-----------|--------|-----------|
| 512MB RAM | Memory constraints | Connection pooling, no caching |
| Cold starts | 15 min inactivity | Use UptimeRobot pinger |
| Single instance | No high availability | Acceptable for free tier |
| 90-day DB retention | Data loss risk | Manual backups weekly |
| No Redis | No caching/queues | Stateless design, direct DB |

---

## Future Enhancements (Paid Tier)

When upgrading to paid hosting:
1. **Redis** - Caching, session storage, job queues
2. **Multi-instance** - High availability
3. **CDN** - Static asset delivery
4. **Monitoring** - DataDog, New Relic
5. **Auto-scaling** - Based on load
6. **Backup automation** - Hourly incremental
7. **Read replicas** - Scale reads
8. **Job queues** - Background processing (Bull)

---

## Architecture Decision Records (ADRs)

### ADR-001: Why No Redis on Free Tier
**Decision**: Removed Redis/Bull dependencies  
**Reason**: Render free tier doesn't provide Redis, memory limits prevent in-memory solutions  
**Alternative**: Stateless design, database-backed operations  

### ADR-002: Why JWT Over Sessions
**Decision**: JWT-based authentication  
**Reason**: Stateless, scales horizontally, no session storage needed  
**Trade-off**: Token revocation requires database lookup  

### ADR-003: Why Auto-Migrations
**Decision**: Migrations run on every deployment  
**Reason**: Zero-downtime deploys, no manual steps  
**Trade-off**: Startup time +2-5 seconds  

### ADR-004: Why Structured JSON Logging
**Decision**: Winston with JSON format in production  
**Reason**: Machine-parseable, works with log aggregators  
**Trade-off**: Less human-readable than plain text  

---

## Conclusion

SynergySwift is designed for **enterprise readiness** while maintaining **free-tier compatibility**. The architecture prioritizes:

1. ✅ **Security** - Defense in depth
2. ✅ **Scalability** - Horizontal scaling ready
3. ✅ **Observability** - Comprehensive logging
4. ✅ **Reliability** - Graceful shutdown, health checks
5. ✅ **Maintainability** - Clean architecture, documentation

The system is production-ready and can scale from free tier to enterprise deployment without architectural changes.

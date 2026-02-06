# Scaling Strategy Documentation

## Overview

SynergySwift is designed for horizontal and vertical scaling while maintaining free-tier compatibility. This document outlines scaling approaches from free tier to enterprise deployment.

---

## Current State (Render Free Tier)

### Resources
- **CPU**: Shared (free tier)
- **Memory**: 512MB RAM
- **Instances**: 1 (single instance)
- **Database**: PostgreSQL 256MB, 1GB storage
- **Network**: 100GB/month bandwidth

### Performance Baseline
- **Concurrent Users**: 50-100
- **Requests/Second**: 10-20
- **Response Time**: <500ms (P95)
- **Uptime**: 99%+ (with cold start consideration)

---

## Horizontal Scaling (Multi-Instance)

### Ready for Horizontal Scaling

✅ **Stateless Design**
- No in-memory sessions
- JWT-based authentication
- No file uploads to local disk
- No shared memory state

✅ **Database Connection Pooling**
- Each instance has independent pool
- Total connections = instances × pool_size
- Adjust `DATABASE_POOL_SIZE` proportionally

✅ **Request Independence**
- Each request is self-contained
- Correlation IDs for tracing
- No request dependency across instances

### Scaling Steps (Render)

1. **Upgrade to Paid Tier**
   - Go to Render Dashboard
   - Select service → Settings
   - Change plan (Starter: $7/mo, Standard: $25/mo)

2. **Increase Instance Count**
   - Settings → Scaling
   - Set instance count: 2, 3, 4...
   - Render load balancer handles distribution

3. **Adjust Database Connections**
   ```bash
   # Example: 3 instances, 5 connections each = 15 total
   DATABASE_POOL_SIZE=5
   ```

4. **Monitor Performance**
   - Check `/api/v1/health` for each instance
   - Monitor database connection usage
   - Review response times

### Load Balancing (Render Automatic)
- **Algorithm**: Round-robin
- **Health Checks**: `/api/v1/health` (30s interval)
- **Failover**: Automatic (unhealthy instances removed)
- **Session Affinity**: Not needed (stateless)

### Scaling Capacity

| Instances | Concurrent Users | Requests/Second | Monthly Cost |
|-----------|-----------------|-----------------|--------------|
| 1 (free) | 50-100 | 10-20 | $0 |
| 2 | 100-200 | 20-40 | $14 |
| 3 | 150-300 | 30-60 | $21 |
| 5 | 250-500 | 50-100 | $35 |
| 10 | 500-1000 | 100-200 | $70 |

---

## Vertical Scaling (Larger Instances)

### Instance Sizes (Render)

| Plan | RAM | CPU | Price/mo |
|------|-----|-----|----------|
| Free | 512MB | 0.1 | $0 |
| Starter | 512MB | 0.5 | $7 |
| Standard | 2GB | 1.0 | $25 |
| Pro | 4GB | 2.0 | $85 |
| Pro Plus | 8GB | 4.0 | $175 |

### When to Scale Vertically
- High memory usage (>90% consistently)
- CPU bottlenecks (processing-heavy operations)
- Large data processing requirements
- Complex queries with joins

### Configuration Changes
```bash
# Larger instance = more connections
DATABASE_POOL_SIZE=20  # For 2GB+ RAM

# More concurrent requests
MAX_CONCURRENT_REQUESTS=200

# Larger request payloads
MAX_REQUEST_SIZE=50mb
```

---

## Database Scaling

### Connection Pool Tuning

#### Free Tier (256MB DB)
```bash
DATABASE_POOL_SIZE=5
DATABASE_CONNECTION_TIMEOUT=5000
DATABASE_IDLE_TIMEOUT=30000
```

#### Production (1GB+ DB)
```bash
DATABASE_POOL_SIZE=20
DATABASE_CONNECTION_TIMEOUT=10000
DATABASE_IDLE_TIMEOUT=60000
```

### Read Replicas (Render Pro)
- **Cost**: Additional database cost
- **Use Case**: Read-heavy workloads
- **Setup**: Automatic with Render
- **Routing**: Manual in code (write to primary, read from replica)

```typescript
// Example: Read replica routing
const connection = req.method === 'GET'
  ? readReplicaDataSource
  : primaryDataSource;
```

### Database Sharding (Enterprise)
Not needed until >10,000 concurrent users. Use tenant-based sharding:
- Shard key: `tenantId`
- Each shard: Independent PostgreSQL instance
- Routing: Application-level based on tenant

---

## Caching Strategy

### Current (Free Tier)
- **No Redis**: Not available on free tier
- **No in-memory cache**: Exceeds 512MB limit
- **Database only**: All data from PostgreSQL

### Future (Paid Tier)
- **Redis Cache**: $10-25/month (Render Redis or external)
- **Cache Strategy**: Cache-aside pattern
- **Cache Keys**: User sessions, frequently accessed data
- **TTL**: 5-15 minutes

```typescript
// Example: Redis caching (future)
const cached = await redis.get(`student:${id}`);
if (cached) return JSON.parse(cached);

const student = await this.studentRepository.findOne(id);
await redis.set(`student:${id}`, JSON.stringify(student), 'EX', 300);
return student;
```

---

## CDN & Static Assets

### Current
- **No CDN**: Static assets served from backend
- **Compression**: Enabled (gzip)

### Future (Recommended)
- **CDN**: Cloudflare (free tier) or AWS CloudFront
- **Assets**: Move to CDN (images, CSS, JS)
- **API**: Keep on Render
- **Benefit**: Reduced bandwidth, faster load times

---

## Autoscaling

### Render Autoscaling (Standard+)
- **Trigger**: CPU, memory, request rate
- **Min Instances**: 1
- **Max Instances**: 10 (or custom)
- **Scale-up**: When CPU >80% for 5 minutes
- **Scale-down**: When CPU <20% for 10 minutes

### Configuration
```yaml
# render.yaml
autoscaling:
  minInstances: 2
  maxInstances: 10
  targetCPUPercent: 70
  targetMemoryPercent: 80
```

---

## Performance Optimization

### Code-Level
1. **Query Optimization**
   - Use indexes on foreign keys
   - Eager load relationships (avoid N+1)
   - Limit result sets

2. **Response Compression**
   - Gzip enabled (already configured)
   - Reduces bandwidth by 60-80%

3. **Connection Pooling**
   - Reuse database connections
   - Avoid connection per request

### Database-Level
1. **Indexes**
   ```sql
   CREATE INDEX idx_students_tenant ON students(tenant_id);
   CREATE INDEX idx_results_student ON results(student_id);
   ```

2. **Query Analysis**
   ```sql
   EXPLAIN ANALYZE SELECT * FROM students WHERE tenant_id = '...';
   ```

3. **Vacuum & Analyze**
   - Run weekly: `VACUUM ANALYZE;`
   - Keeps statistics up-to-date

---

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Response Time**
   - Target: P95 <500ms
   - Alert: P95 >1000ms

2. **Error Rate**
   - Target: <0.1%
   - Alert: >1%

3. **Memory Usage**
   - Target: <80%
   - Alert: >90%

4. **Database Connections**
   - Target: <80% of pool
   - Alert: Pool exhaustion

5. **Request Rate**
   - Target: <80% capacity
   - Alert: Approaching limit

### Alerting (Future)
- **Tool**: UptimeRobot (free), PagerDuty (paid)
- **Channels**: Email, Slack, SMS
- **Escalation**: On-call rotation

---

## Disaster Recovery & High Availability

### Current (Free Tier)
- **Uptime**: 99%+ (with cold starts)
- **Backup**: Render automatic (90-day retention)
- **Recovery**: Redeploy from Git

### Production (Paid Tier)
- **Multi-Region**: Deploy to multiple regions
- **Failover**: DNS-based or load balancer
- **Backup**: Daily automated backups
- **RTO**: <15 minutes
- **RPO**: <5 minutes

---

## Scaling Roadmap

### Phase 1: Free Tier (Current)
- [x] Single instance
- [x] 512MB RAM
- [x] PostgreSQL 256MB
- [x] 50-100 concurrent users

### Phase 2: Paid Single Instance
- [ ] Upgrade to Starter ($7/mo)
- [ ] 512MB RAM, dedicated CPU
- [ ] 100-150 concurrent users
- [ ] No cold starts

### Phase 3: Horizontal Scaling
- [ ] 2-3 instances ($14-21/mo)
- [ ] Load balancing
- [ ] 200-300 concurrent users
- [ ] Higher availability

### Phase 4: Enterprise
- [ ] 5-10 instances
- [ ] Redis caching
- [ ] Read replicas
- [ ] CDN integration
- [ ] 500-1000+ concurrent users
- [ ] Multi-region deployment

---

## Cost Optimization

### Current Costs (Free Tier)
- **Web Service**: $0
- **Database**: $0
- **Total**: **$0/month**

### Optimized Production Costs
- **Web Service**: 2 instances × $7 = $14
- **Database**: Standard $7
- **Redis** (optional): $10
- **Total**: **$21-31/month**

### Enterprise Costs (1000+ users)
- **Web Service**: 5 instances × $25 = $125
- **Database**: Pro $15
- **Redis**: $25
- **CDN**: $0-10
- **Monitoring**: $0-25
- **Total**: **$165-200/month**

---

## Scaling Checklist

### Before Scaling
- [ ] Monitor current performance
- [ ] Identify bottlenecks (CPU, memory, database)
- [ ] Review logs for errors
- [ ] Optimize queries
- [ ] Update environment variables
- [ ] Test with load testing tools

### During Scaling
- [ ] Increase instance count OR size
- [ ] Adjust `DATABASE_POOL_SIZE`
- [ ] Monitor health endpoints
- [ ] Watch for errors
- [ ] Check response times

### After Scaling
- [ ] Verify performance improvement
- [ ] Review cost vs benefit
- [ ] Update documentation
- [ ] Set up alerts

---

## Load Testing

### Tools
- **Artillery**: `npm install -g artillery`
- **k6**: `brew install k6`
- **Apache Bench**: Built-in on Mac/Linux

### Example Test
```bash
# Artillery test
artillery quick --count 100 --num 10 https://your-app.onrender.com/api/v1/health

# k6 test
k6 run --vus 50 --duration 30s load-test.js
```

### Metrics to Capture
- Requests per second
- Response time (P50, P95, P99)
- Error rate
- Concurrent connections

---

## Conclusion

SynergySwift scales from **free tier to enterprise** with:

1. ✅ **Horizontal scaling ready** - Stateless, multi-instance capable
2. ✅ **Vertical scaling ready** - Configurable for larger instances
3. ✅ **Database scaling** - Connection pooling, read replicas
4. ✅ **Cost-effective** - Linear scaling costs
5. ✅ **Zero code changes** - Environment-based configuration

**Scaling Path**: Free → Paid Single → Multi-Instance → Enterprise

# Observability Documentation

## Overview

SynergySwift implements comprehensive observability through structured logging, correlation tracing, and performance monitoring—all designed to work with Render's free tier stdout-based logging without requiring paid observability tools.

---

## Observability Pillars

### 1. **Logs** (Structured JSON)
- Request/response logging
- Error tracking with stack traces
- Audit trail
- Security events
- Performance metrics

### 2. **Traces** (Correlation IDs)
- Request flow tracking
- Distributed tracing ready
- Cross-service correlation

### 3. **Metrics** (Embedded in Logs)
- Request duration
- Memory usage
- Database query performance
- Error rates
- Health status

---

## Structured Logging

### Log Format (Production)

All logs are output as **structured JSON** to stdout, making them machine-parseable and compatible with log aggregation tools:

```json
{
  "timestamp": "2024-02-04T12:34:56.789Z",
  "level": "info",
  "context": "HTTP",
  "message": "HTTP Response",
  "type": "http_response",
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "method": "POST",
  "path": "/api/v1/students",
  "statusCode": 201,
  "duration": 145,
  "userId": "user-123",
  "tenantId": "tenant-456",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

### Log Levels

| Level | Use Case | Production Default |
|-------|----------|-------------------|
| `error` | Exceptions, failures | ✅ Always logged |
| `warn` | Degraded performance, security warnings | ✅ Always logged |
| `info` | Business events, HTTP requests | ✅ Default |
| `debug` | Detailed debugging info | ❌ Disabled |

**Configuration:**
```bash
LOG_LEVEL=info  # error | warn | info | debug
LOG_SQL_QUERIES=false  # Enable in development only
```

### Log Types

#### 1. HTTP Request Logs
```json
{
  "type": "http_request",
  "message": "Incoming POST /api/v1/students",
  "method": "POST",
  "path": "/api/v1/students",
  "correlationId": "uuid",
  "ip": "192.168.1.100",
  "userAgent": "...",
  "userId": "user-123",
  "tenantId": "tenant-456"
}
```

#### 2. HTTP Response Logs
```json
{
  "type": "http_response",
  "message": "Completed POST /api/v1/students",
  "statusCode": 201,
  "duration": 145,
  "correlationId": "uuid"
}
```

#### 3. Audit Logs
```json
{
  "type": "audit",
  "message": "AUDIT: UPDATE_STUDENT_RECORD",
  "action": "UPDATE_STUDENT_RECORD",
  "entityType": "Student",
  "entityId": "student-123",
  "changes": {
    "grade": { "old": "B", "new": "A" }
  },
  "userId": "teacher-456",
  "correlationId": "uuid"
}
```

#### 4. Security Logs
```json
{
  "type": "security",
  "message": "SECURITY: CORS Blocked",
  "event": "CORS_BLOCKED",
  "origin": "https://malicious-site.com",
  "allowedOrigins": "https://app.example.com",
  "ip": "192.168.1.100"
}
```

#### 5. Performance Logs
```json
{
  "type": "performance",
  "message": "PERFORMANCE: Slow request detected",
  "operation": "POST /api/v1/students",
  "duration": 3245,
  "threshold": 3000,
  "correlationId": "uuid"
}
```

#### 6. Database Logs
```json
{
  "type": "database",
  "message": "DATABASE: Query executed",
  "query": "SELECT * FROM students WHERE...",
  "duration": 42,
  "correlationId": "uuid"
}
```

#### 7. Error Logs
```json
{
  "level": "error",
  "message": "Request failed: POST /api/v1/students",
  "errorMessage": "Validation failed",
  "errorName": "BadRequestException",
  "trace": "Error: Validation failed\n    at ...",
  "correlationId": "uuid"
}
```

---

## Correlation IDs

### Purpose
- **Track requests** across multiple services/components
- **Debug distributed systems**
- **Link related log entries**
- **Support troubleshooting**

### Implementation

Every request is assigned a unique correlation ID:

```typescript
// Incoming Request
const correlationId = 
  request.headers['x-correlation-id'] ||  // From client
  request.headers['x-request-id'] ||      // Alternative header
  uuidv4();                                // Generate new

// Attach to request
request.correlationId = correlationId;

// Add to response headers
response.setHeader('X-Correlation-ID', correlationId);

// Include in all logs
logger.log('Processing request', { correlationId });
```

### Client Usage

Clients can provide correlation IDs for end-to-end tracing:

```bash
curl -H "X-Correlation-ID: my-request-123" \
     https://api.example.com/api/v1/students
```

### Log Aggregation

Search logs by correlation ID to see full request flow:

```bash
# Render Logs Dashboard
# Filter: correlationId=a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

---

## Performance Monitoring

### Request Duration Tracking

All HTTP requests are timed:

```typescript
const startTime = Date.now();
// ... process request
const duration = Date.now() - startTime;

logger.logResponse({
  statusCode: response.statusCode,
  duration,
  correlationId
});
```

### Slow Request Detection

Requests exceeding 3 seconds trigger warnings:

```typescript
if (duration > 3000) {
  logger.warn(`Slow request detected: ${method} ${url}`, {
    duration,
    correlationId
  });
}
```

### Performance Thresholds

| Threshold | Action | Log Level |
|-----------|--------|-----------|
| <1000ms | Normal | debug |
| 1000-3000ms | Acceptable | info |
| 3000-5000ms | Slow | warn |
| >5000ms | Critical | error |

### Database Query Performance

```typescript
logger.logDatabase(
  'SELECT * FROM students WHERE tenantId = $1',
  duration,
  { correlationId }
);
```

---

## Memory Monitoring

### Health Endpoint Metrics

The `/api/v1/health` endpoint includes memory checks:

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up", "latency": 12 },
    "memory_heap": {
      "status": "up",
      "allocated": 420,
      "limit": 450
    },
    "memory_rss": {
      "status": "up",
      "allocated": 480,
      "limit": 512
    }
  }
}
```

### Memory Thresholds (Free Tier)

- **Heap**: <450 MB (512 MB limit)
- **RSS**: <480 MB (512 MB limit)
- **Warning**: Logged if >90% utilized

```typescript
const memUsage = process.memoryUsage();
const heapUsedMB = memUsage.heapUsed / 1024 / 1024;

if (heapUsedMB > 450) {
  logger.warn('High memory usage', {
    heapUsed: heapUsedMB,
    limit: 512
  });
}
```

---

## Error Tracking

### Error Log Structure

```json
{
  "level": "error",
  "timestamp": "2024-02-04T12:00:00.000Z",
  "context": "StudentService",
  "message": "Failed to create student",
  "errorName": "QueryFailedError",
  "errorMessage": "duplicate key value violates unique constraint",
  "trace": "QueryFailedError: duplicate key...\n    at ...",
  "correlationId": "uuid",
  "userId": "user-123",
  "tenantId": "tenant-456"
}
```

### Error Categories

1. **Validation Errors** (400)
   - Client input errors
   - Logged at `warn` level
   - No stack traces

2. **Authentication Errors** (401)
   - Invalid credentials
   - Logged at `warn` level
   - Security events tracked

3. **Authorization Errors** (403)
   - Permission denied
   - Logged at `warn` level
   - Audit trail created

4. **Not Found Errors** (404)
   - Resource not found
   - Logged at `info` level

5. **Server Errors** (500)
   - Unhandled exceptions
   - Logged at `error` level
   - Full stack traces included

### Error Rate Calculation

Count errors in logs:

```bash
# Daily error rate
grep '"level":"error"' logs.json | wc -l
```

---

## Log Aggregation & Analysis

### Render Log Viewer

Render provides a built-in log viewer:
1. Go to Render Dashboard
2. Select your service
3. Click **Logs** tab
4. Filter by:
   - Time range
   - Log level
   - Search text
   - Correlation ID

### Exporting Logs

Download logs for local analysis:
```bash
# Render CLI
render logs --service=synergyswift-backend --tail=1000 > logs.json
```

### Third-Party Tools (Optional, Free Tiers)

For advanced analysis, export logs to:

| Tool | Free Tier | Features |
|------|-----------|----------|
| **Logtail** | 1GB/month | Search, alerts, dashboards |
| **Papertrail** | 50MB/month | Real-time tail, search |
| **Logz.io** | 1GB/day for 3 days | ELK stack, AI insights |
| **Grafana Cloud** | 50GB logs | Visualization, alerts |

**Setup:**
1. Create account (free tier)
2. Get HTTP endpoint
3. Stream Render logs via webhook (Render Pro required) or export manually

---

## Dashboards & Alerts

### Key Metrics to Monitor

#### 1. Request Rate
```sql
-- Count requests per minute
SELECT 
  DATE_TRUNC('minute', timestamp) AS minute,
  COUNT(*) AS requests
FROM logs
WHERE type = 'http_response'
GROUP BY minute
ORDER BY minute DESC;
```

#### 2. Error Rate
```sql
-- Error percentage
SELECT 
  COUNT(CASE WHEN level = 'error' THEN 1 END) * 100.0 / COUNT(*) AS error_rate
FROM logs
WHERE timestamp > NOW() - INTERVAL '1 hour';
```

#### 3. Average Response Time
```sql
-- P50, P95, P99 latencies
SELECT 
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration) AS p50,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration) AS p95,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration) AS p99
FROM logs
WHERE type = 'http_response'
  AND timestamp > NOW() - INTERVAL '1 hour';
```

#### 4. Slow Queries
```sql
-- Top 10 slowest requests
SELECT 
  path,
  method,
  AVG(duration) AS avg_duration,
  COUNT(*) AS count
FROM logs
WHERE type = 'http_response'
  AND duration > 1000
GROUP BY path, method
ORDER BY avg_duration DESC
LIMIT 10;
```

### Alert Conditions

Set up alerts for:

1. **Error Rate Spike**
   - Condition: >5% errors in 5 minutes
   - Action: Email admin

2. **Slow Responses**
   - Condition: P95 latency >3 seconds
   - Action: Investigate

3. **Memory Pressure**
   - Condition: Heap >90% for 5 minutes
   - Action: Scale or optimize

4. **Database Issues**
   - Condition: Connection failures
   - Action: Check database health

5. **Security Events**
   - Condition: Failed logins >10 in 1 minute
   - Action: Review IP, consider blocking

---

## Troubleshooting Workflows

### Scenario 1: User Reports Slow Page Load

1. **Get Correlation ID** from user (in response headers)
2. **Search Logs**:
   ```bash
   grep "correlationId":"<id>" logs.json
   ```
3. **Analyze Timeline**:
   - HTTP request received
   - Database queries executed
   - Response sent
4. **Identify Bottleneck**:
   - Slow database query?
   - External API call?
   - Large response payload?

### Scenario 2: Sudden Error Rate Increase

1. **Check Error Logs**:
   ```bash
   grep '"level":"error"' logs.json | tail -20
   ```
2. **Identify Pattern**:
   - Same error message?
   - Specific endpoint?
   - Specific tenant?
3. **Check Recent Changes**:
   - Recent deployment?
   - Database migration?
   - Configuration change?

### Scenario 3: Memory Leak Suspected

1. **Check Memory Trends**:
   ```bash
   grep '"type":"http_response"' logs.json | \
     jq '.memory_heap' | \
     sort -n
   ```
2. **Analyze Growth**:
   - Gradual increase?
   - Spike after specific operation?
3. **Review Recent Code**:
   - New caching?
   - Large data loads?
   - Event listeners not cleaned up?

---

## Log Retention

### Render Free Tier
- **Retention**: 7 days in Render dashboard
- **Export**: Download before expiry

### Long-Term Storage (Optional)
- **Export Schedule**: Weekly via Render CLI
- **Storage**: S3, Google Cloud Storage (free tiers)
- **Retention**: 90-365 days (compliance requirements)

```bash
# Weekly export script
#!/bin/bash
DATE=$(date +%Y-%m-%d)
render logs --service=synergyswift-backend --tail=100000 > logs-$DATE.json
gzip logs-$DATE.json
# Upload to S3/GCS
```

---

## Best Practices

### DO's ✅
- ✅ **Include correlation IDs** in all logs
- ✅ **Use structured JSON** in production
- ✅ **Sanitize sensitive data** (passwords, tokens)
- ✅ **Log at appropriate levels** (avoid debug spam)
- ✅ **Include context** (user, tenant, IP)
- ✅ **Monitor error rates** regularly
- ✅ **Set up alerts** for critical metrics

### DON'Ts ❌
- ❌ **Log sensitive data** (passwords, credit cards)
- ❌ **Log excessively** (degrades performance)
- ❌ **Ignore warnings** (investigate proactively)
- ❌ **Use debug level in production** (too verbose)
- ❌ **Skip correlation IDs** (impossible to trace)

---

## Example Log Queries

### Find all logs for a specific user
```bash
jq 'select(.userId == "user-123")' logs.json
```

### Count requests by endpoint
```bash
jq -r 'select(.type == "http_response") | .path' logs.json | \
  sort | uniq -c | sort -rn
```

### Calculate average response time
```bash
jq -s 'map(select(.type == "http_response") | .duration) | add/length' logs.json
```

### Find all errors in last hour
```bash
jq 'select(.level == "error" and .timestamp > "2024-02-04T11:00:00Z")' logs.json
```

### Security events
```bash
jq 'select(.type == "security")' logs.json
```

---

## Observability Roadmap

### Current State (Free Tier)
- ✅ Structured JSON logging
- ✅ Correlation IDs
- ✅ Performance metrics in logs
- ✅ Manual log analysis
- ✅ Render log viewer

### Future Enhancements (Paid Tier)
- 🚀 **Real-time metrics** (Prometheus + Grafana)
- 🚀 **Distributed tracing** (OpenTelemetry + Jaeger)
- 🚀 **Automated alerts** (PagerDuty, Opsgenie)
- 🚀 **Log aggregation** (Datadog, New Relic)
- 🚀 **APM** (Application Performance Monitoring)

---

## Conclusion

SynergySwift provides **enterprise-grade observability** within free-tier constraints:

1. ✅ **Comprehensive logging** - All events captured
2. ✅ **Correlation tracing** - Request flows tracked
3. ✅ **Performance monitoring** - Metrics embedded in logs
4. ✅ **Error tracking** - Full stack traces
5. ✅ **Security auditing** - Compliance-ready
6. ✅ **Zero-cost** - No paid tools required
7. ✅ **Scalable** - Ready for log aggregation tools

**Observability Maturity**: Production-ready, enterprise-suitable.

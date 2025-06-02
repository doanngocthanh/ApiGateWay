# API Proxy System Documentation

## Overview

The API Proxy system allows authenticated API key holders to route their requests through your API management service to configured backend services. This provides centralized authentication, rate limiting, logging, and monitoring for multiple backend APIs.

## How It Works

1. **Client sends request** with API key to your proxy endpoint
2. **API key validation** and quota checking
3. **Route matching** to find appropriate backend service
4. **Request transformation** and forwarding to backend
5. **Response processing** and return to client
6. **Logging and monitoring** of the entire flow

## Database Schema

### Core Tables

#### `proxy_destinations`
Stores backend service configurations:
- Connection details (URL, authentication)
- Health check settings
- Request/response transformation rules
- Rate limiting for backend services

#### `api_key_proxy_mappings`
Maps API keys to proxy destinations with routing rules:
- Path patterns for routing (`/api/v1/*`, `/users/*`)
- Allowed HTTP methods
- Custom headers and transformations
- Priority for route matching

#### `proxy_logs`
Detailed logging of all proxy requests:
- Request/response details
- Performance metrics
- Error tracking
- Client information

## Setup Instructions

### 1. Database Migration

Run the proxy schema migration:

```bash
psql -h localhost -U postgres -d api_management -f migrations/proxy_schema.sql
```

### 2. Environment Configuration

Add to your `.env` file:

```env
# Proxy Health Check Settings
PROXY_HEALTH_CHECK_ENABLED=true
PROXY_HEALTH_CHECK_CLEANUP_DAYS=30

# Proxy Request Settings
PROXY_DEFAULT_TIMEOUT=30000
PROXY_MAX_RETRIES=3
```

### 3. Start the Service

The proxy health check service starts automatically when the app starts:

```bash
npm run dev
```

## API Usage Examples

### Admin: Create Proxy Destination

```bash
curl -X POST http://localhost:3000/api/proxy/admin/destinations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -d '{
    "name": "JSONPlaceholder API",
    "description": "Test API for demos",
    "base_url": "https://jsonplaceholder.typicode.com",
    "health_check_url": "https://jsonplaceholder.typicode.com/posts/1",
    "health_check_interval_seconds": 300,
    "auth_type": "none",
    "timeout_ms": 10000,
    "max_retries": 2
  }'
```

### User: Create Proxy Mapping

```bash
curl -X POST http://localhost:3000/api/proxy/mappings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -d '{
    "api_key_id": 1,
    "proxy_destination_id": 1,
    "path_pattern": "/posts/*",
    "allowed_methods": "GET,POST",
    "priority": 100
  }'
```

### Client: Use Proxy

```bash
# Option 1: Using /proxy/ prefix
curl -X GET http://localhost:3000/proxy/posts/1 \
  -H "X-API-Key: YOUR_API_KEY"

# Option 2: Using /api/proxy-request/ prefix  
curl -X GET http://localhost:3000/api/proxy-request/posts/1 \
  -H "X-API-Key: YOUR_API_KEY"
```

## Proxy Routing Rules

### Path Pattern Matching

- `*` - Matches all paths
- `/api/v1/*` - Matches paths starting with `/api/v1/`
- `/users/*` - Matches paths starting with `/users/`
- `/posts/*/comments` - Matches specific pattern

### Priority Resolution

When multiple mappings match a request:
1. **Priority** (lower number = higher priority)
2. **Specificity** (longer patterns matched first)
3. **Creation order** (newer mappings preferred)

### Method Filtering

Specify allowed HTTP methods as comma-separated values:
- `GET` - Only GET requests
- `GET,POST` - GET and POST requests
- `GET,POST,PUT,DELETE` - All common methods

## Authentication Types

### Backend Service Authentication

#### None
```json
{
  "auth_type": "none"
}
```

#### Bearer Token
```json
{
  "auth_type": "bearer",
  "auth_token": "your-bearer-token"
}
```

#### API Key Header
```json
{
  "auth_type": "api_key",
  "auth_header_name": "X-API-Key",
  "auth_token": "your-api-key"
}
```

#### Basic Authentication
```json
{
  "auth_type": "basic",
  "auth_username": "username",
  "auth_password": "password"
}
```

## Request/Response Transformation

### Path Transformation

```json
{
  "strip_path_prefix": "/api/v1",
  "add_path_prefix": "/external-api"
}
```

- Input: `/api/v1/users/123`
- Output: `/external-api/users/123`

### Custom Headers

```json
{
  "custom_headers": {
    "X-Client-Version": "1.0",
    "X-Source": "api-gateway"
  }
}
```

### Response Transformation

```json
{
  "transform_response": {
    "exclude_fields": ["internal_id", "secret"],
    "field_mapping": {
      "id": "user_id",
      "name": "full_name"
    }
  }
}
```

## Health Monitoring

### Health Check Configuration

```json
{
  "health_check_url": "https://api.example.com/health",
  "health_check_interval_seconds": 300
}
```

### Health Status Monitoring

- **Healthy**: Status code < 400
- **Unhealthy**: Status code >= 500 or network error
- **Degraded**: Status code 4xx (client errors)

### Health Check Dashboard

```bash
curl -X GET http://localhost:3000/api/admin/proxy/health \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```

## Analytics and Monitoring

### Proxy Analytics

```bash
curl -X GET http://localhost:3000/api/proxy/analytics?days=7 \
  -H "Authorization: Bearer YOUR_USER_JWT"
```

Returns:
- Daily request counts
- Success/error rates
- Average response times
- Top destinations
- Error breakdown

### Admin Analytics

```bash
curl -X GET http://localhost:3000/api/admin/analytics/usage?days=30 \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```

## Error Handling

### Common Error Responses

#### No Proxy Destination
```json
{
  "error": "No proxy destination configured for this path",
  "path": "/invalid/path",
  "method": "GET"
}
```

#### Backend Unhealthy
```json
{
  "error": "Backend service temporarily unavailable"
}
```

#### Bad Gateway
```json
{
  "error": "Bad Gateway",
  "message": "Failed to proxy request to backend service"
}
```

### Retry Logic

- **Automatic retries** for network errors and 5xx responses
- **Exponential backoff** with configurable max retries
- **Circuit breaker** pattern for unhealthy services

## Performance Considerations

### Caching
- API key validation results cached in Redis
- Health check status cached to avoid database queries
- Route resolution optimized with proper indexing

### Rate Limiting
- User quota applied before proxy
- Backend rate limiting per destination
- Global rate limiting for infrastructure protection

### Monitoring
- Response time tracking
- Error rate monitoring
- Health check automation
- Log retention management

## Security Features

### Authentication Flow
1. Validate API key
2. Check user subscription and quotas
3. Apply rate limiting
4. Strip sensitive headers
5. Add backend authentication
6. Log request details

### Header Security
- Remove hop-by-hop headers
- Strip internal API keys
- Add backend authentication headers
- Remove sensitive response headers

## Deployment Checklist

- [ ] Database migration applied
- [ ] Environment variables configured
- [ ] Proxy destinations created
- [ ] API key mappings configured
- [ ] Health checks enabled
- [ ] Monitoring dashboard accessible
- [ ] Error alerting configured
- [ ] Log retention configured

## Troubleshooting

### Common Issues

1. **Proxy not routing**: Check API key mapping and path patterns
2. **Authentication failures**: Verify backend auth configuration
3. **Health check failures**: Check backend service and network connectivity
4. **Performance issues**: Review timeout settings and retry logic

### Debug Mode

Enable debug logging:
```env
DEBUG=proxy:*
NODE_ENV=development
```

### Health Check Logs

Monitor health check service:
```bash
# View health check logs
docker logs -f api-management-app | grep "Health check"

# Manual health check
curl -X POST http://localhost:3000/api/proxy/admin/destinations/1/health-check \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```
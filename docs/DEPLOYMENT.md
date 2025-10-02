# Deployment Guide

This guide covers the deployment of the WhatsApp Chat Application to production and staging environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Monitoring Setup](#monitoring-setup)
7. [Database Management](#database-management)
8. [SSL Configuration](#ssl-configuration)
9. [Backup and Recovery](#backup-and-recovery)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL 15+
- Redis 7+
- SSL certificates for production
- Domain name configured with DNS

## Environment Setup

### 1. Copy Environment Files

```bash
# Production environment
cp .env.production.example .env.production

# Staging environment
cp .env.production.example .env.staging
```

### 2. Configure Environment Variables

Edit `.env.production` and `.env.staging` with your actual values:

- Database credentials
- JWT secrets (use strong, unique keys)
- AWS credentials and S3 bucket names
- Firebase FCM server key
- SMS provider API key
- Domain names and URLs

### 3. Generate SSL Certificates

For production, obtain SSL certificates from Let's Encrypt or your certificate provider:

```bash
# Using certbot for Let's Encrypt
sudo certbot certonly --standalone -d your-domain.com -d api.your-domain.com

# Copy certificates to nginx directory
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
```

## Docker Deployment

### Production Deployment

1. **Build and deploy:**
   ```bash
   npm run docker:prod
   ```

2. **Run database migrations:**
   ```bash
   docker-compose -f docker-compose.prod.yml exec backend npm run migrate
   ```

3. **Seed initial data (optional):**
   ```bash
   docker-compose -f docker-compose.prod.yml exec backend npm run seed
   ```

### Staging Deployment

```bash
npm run docker:staging
```

### Manual Deployment Script

```bash
# Deploy to production
npm run deploy:production

# Deploy to staging
npm run deploy:staging
```

## Kubernetes Deployment

### 1. Create Namespace

```bash
kubectl apply -f kubernetes/namespace.yaml
```

### 2. Create Secrets

```bash
# Database secret
kubectl create secret generic database-secret \
  --from-literal=url="postgresql://user:password@postgres:5432/chatapp" \
  -n chatapp-production

# JWT secrets
kubectl create secret generic jwt-secret \
  --from-literal=secret="your-jwt-secret" \
  --from-literal=refresh-secret="your-jwt-refresh-secret" \
  -n chatapp-production

# AWS secrets
kubectl create secret generic aws-secret \
  --from-literal=access-key-id="your-access-key" \
  --from-literal=secret-access-key="your-secret-key" \
  -n chatapp-production

# Other secrets...
```

### 3. Create ConfigMaps

```bash
kubectl create configmap app-config \
  --from-literal=s3-bucket="your-s3-bucket" \
  -n chatapp-production
```

### 4. Deploy Applications

```bash
kubectl apply -f kubernetes/backend-deployment.yaml
kubectl apply -f kubernetes/web-deployment.yaml
kubectl apply -f kubernetes/ingress.yaml
```

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci-cd.yml`) automatically:

1. **On Pull Requests:**
   - Runs tests and linting
   - Performs security scans
   - Builds Docker images

2. **On Push to `develop`:**
   - Deploys to staging environment

3. **On Push to `main`:**
   - Deploys to production environment
   - Runs database migrations
   - Performs health checks

### Required GitHub Secrets

Set these secrets in your GitHub repository:

```
POSTGRES_PASSWORD
REDIS_PASSWORD
JWT_SECRET
JWT_REFRESH_SECRET
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
S3_BUCKET
FCM_SERVER_KEY
SMS_API_KEY
PRODUCTION_HOST
PRODUCTION_USER
PRODUCTION_SSH_KEY
STAGING_HOST
STAGING_USER
STAGING_SSH_KEY
SLACK_WEBHOOK
SNYK_TOKEN
```

## Monitoring Setup

### 1. Start Monitoring Stack

```bash
npm run monitoring:setup
```

This will start:
- Prometheus (metrics collection)
- Grafana (visualization)
- Elasticsearch (log storage)
- Kibana (log analysis)
- AlertManager (alerting)

### 2. Access Monitoring Tools

- **Prometheus:** http://localhost:9090
- **Grafana:** http://localhost:3001 (admin/admin)
- **Kibana:** http://localhost:5601
- **AlertManager:** http://localhost:9093

### 3. Configure Alerts

Edit `monitoring/alertmanager/alertmanager.yml` to configure:
- Email notifications
- Slack webhooks
- PagerDuty integration

## Database Management

### Migrations

```bash
# Run migrations in production
docker-compose -f docker-compose.prod.yml exec backend npm run migrate

# Run migrations in Kubernetes
kubectl exec -it deployment/backend -n chatapp-production -- npm run migrate
```

### Backups

Automated backups are created during deployment. Manual backup:

```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U chatapp chatapp > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U chatapp chatapp < backup_file.sql
```

### Performance Optimization

Apply production database optimizations:

```bash
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U chatapp chatapp < packages/backend/database/production-config.sql
```

## SSL Configuration

### Nginx SSL Setup

1. **Place certificates in `nginx/ssl/`:**
   - `cert.pem` (certificate chain)
   - `key.pem` (private key)

2. **Update nginx configuration:**
   - Edit `nginx/nginx.conf`
   - Configure SSL settings
   - Set up redirects

3. **Test SSL configuration:**
   ```bash
   # Test nginx config
   docker-compose -f docker-compose.prod.yml exec nginx nginx -t
   
   # Reload nginx
   docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
   ```

### Certificate Renewal

Set up automatic certificate renewal:

```bash
# Add to crontab
0 12 * * * /usr/bin/certbot renew --quiet && docker-compose -f /path/to/docker-compose.prod.yml exec nginx nginx -s reload
```

## Backup and Recovery

### Automated Backups

The deployment script automatically creates backups before updates:
- Database dumps
- Media files (if stored locally)
- Configuration files

### Recovery Process

1. **Stop services:**
   ```bash
   docker-compose -f docker-compose.prod.yml down
   ```

2. **Restore database:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d postgres
   docker-compose -f docker-compose.prod.yml exec -T postgres psql -U chatapp chatapp < backup_file.sql
   ```

3. **Restore media files:**
   ```bash
   cp -r backup_media/* ./uploads/
   ```

4. **Start services:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

## Troubleshooting

### Common Issues

1. **Service won't start:**
   ```bash
   # Check logs
   docker-compose -f docker-compose.prod.yml logs service_name
   
   # Check health
   curl http://localhost/health
   ```

2. **Database connection issues:**
   ```bash
   # Test database connection
   docker-compose -f docker-compose.prod.yml exec backend npm run db:stats
   ```

3. **High memory usage:**
   ```bash
   # Check container stats
   docker stats
   
   # Scale services
   docker-compose -f docker-compose.prod.yml up -d --scale backend=3
   ```

4. **SSL certificate issues:**
   ```bash
   # Check certificate validity
   openssl x509 -in nginx/ssl/cert.pem -text -noout
   
   # Test SSL connection
   openssl s_client -connect your-domain.com:443
   ```

### Performance Tuning

1. **Database optimization:**
   - Run `ANALYZE` regularly
   - Monitor slow queries
   - Adjust connection pool settings

2. **Redis optimization:**
   - Monitor memory usage
   - Configure appropriate eviction policies
   - Use Redis clustering for high load

3. **Application optimization:**
   - Monitor response times
   - Scale horizontally with load balancer
   - Implement caching strategies

### Monitoring and Alerts

1. **Check system metrics:**
   - CPU and memory usage
   - Disk space
   - Network I/O

2. **Application metrics:**
   - Response times
   - Error rates
   - Active connections

3. **Set up alerts for:**
   - Service downtime
   - High error rates
   - Resource exhaustion
   - Certificate expiration

## Security Considerations

1. **Network security:**
   - Use firewalls
   - Restrict database access
   - Enable SSL/TLS everywhere

2. **Application security:**
   - Regular security updates
   - Input validation
   - Rate limiting
   - CORS configuration

3. **Data security:**
   - Encrypt sensitive data
   - Regular backups
   - Access logging
   - Compliance requirements

## Scaling

### Horizontal Scaling

1. **Add more backend instances:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --scale backend=3
   ```

2. **Use Kubernetes HPA:**
   - CPU-based scaling
   - Memory-based scaling
   - Custom metrics scaling

3. **Database scaling:**
   - Read replicas
   - Connection pooling
   - Query optimization

### Load Testing

```bash
# Install artillery
npm install -g artillery

# Run load tests
artillery run load-test.yml
```

For more detailed information, refer to the individual configuration files and monitoring dashboards.
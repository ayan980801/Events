# Deployment Guide

This guide covers deploying the AI Chatbot application to production environments.

## Deployment Options

### 1. Docker Containers (Recommended)

#### Prerequisites
- Docker & Docker Compose
- Domain name with SSL certificate
- Cloud database instances (PostgreSQL & MongoDB)

#### Steps

1. **Build Production Images**
```bash
# Build backend
cd backend
docker build -f Dockerfile.prod -t ai-chatbot-backend .

# Build frontend for web (optional)
cd mobile-app
flutter build web
docker build -f Dockerfile.web -t ai-chatbot-frontend .
```

2. **Deploy with Docker Compose**
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  backend:
    image: ai-chatbot-backend
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - MONGODB_URL=${MONGODB_URL}
      - JWT_SECRET=${JWT_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    ports:
      - "3000:3000"
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.prod.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    ports:
      - "80:80"
      - "443:443"
    restart: unless-stopped
```

### 2. Cloud Deployment (AWS)

#### Using AWS ECS with Fargate

1. **Create ECR Repositories**
```bash
aws ecr create-repository --repository-name ai-chatbot-backend
```

2. **Push Images to ECR**
```bash
# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_URI

# Tag and push
docker tag ai-chatbot-backend:latest $ECR_URI/ai-chatbot-backend:latest
docker push $ECR_URI/ai-chatbot-backend:latest
```

3. **Create ECS Service**
```json
{
  "family": "ai-chatbot-backend",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "$ECR_URI/ai-chatbot-backend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/ai-chatbot-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### 3. Kubernetes Deployment

#### Prerequisites
- Kubernetes cluster
- kubectl configured
- Helm 3.x

#### Steps

1. **Create Namespace**
```bash
kubectl create namespace ai-chatbot
```

2. **Deploy with Helm**
```yaml
# values.yaml
backend:
  image: ai-chatbot-backend:latest
  replicas: 3
  resources:
    requests:
      memory: "512Mi"
      cpu: "250m"
    limits:
      memory: "1Gi"
      cpu: "500m"

database:
  postgresql:
    enabled: true
    auth:
      database: chatbot_db
      username: chatbot_user
  mongodb:
    enabled: true
    auth:
      database: chatbot_history
      username: chatbot_user

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: api.your-domain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: api-tls
      hosts:
        - api.your-domain.com
```

3. **Deploy**
```bash
helm install ai-chatbot ./helm-chart -f values.yaml -n ai-chatbot
```

## Mobile App Deployment

### iOS App Store

1. **Build iOS App**
```bash
cd mobile-app
flutter build ios --release
```

2. **Archive in Xcode**
- Open `ios/Runner.xcworkspace`
- Product → Archive
- Upload to App Store Connect

3. **App Store Connect Configuration**
- Configure metadata, screenshots
- Submit for review

### Google Play Store

1. **Build Android App Bundle**
```bash
cd mobile-app
flutter build appbundle --release
```

2. **Sign the Bundle**
```bash
# Create keystore (first time only)
keytool -genkey -v -keystore android-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias release

# Sign the bundle
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore android-release-key.jks app-release.aab release
```

3. **Upload to Play Console**
- Create release in Play Console
- Upload signed bundle
- Submit for review

## Environment Configuration

### Production Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@production-db:5432/chatbot_db
MONGODB_URL=mongodb://user:password@production-mongo:27017/chatbot_history

# Security
JWT_SECRET=your-super-secure-jwt-secret-256-bits
NODE_ENV=production

# AI Providers
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
MISTRAL_API_KEY=your-mistral-key

# External Services
REDIS_URL=redis://production-redis:6379
SMTP_HOST=smtp.your-email-provider.com
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=error
```

### SSL/TLS Configuration

#### Nginx SSL Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name api.your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Database Setup

### PostgreSQL Production

1. **Create Database**
```sql
CREATE DATABASE chatbot_db;
CREATE USER chatbot_user WITH PASSWORD 'secure-password';
GRANT ALL PRIVILEGES ON DATABASE chatbot_db TO chatbot_user;
```

2. **Run Migrations**
```bash
cd backend
npm run db:migrate
```

### MongoDB Production

1. **Create Database and User**
```javascript
use chatbot_history;
db.createUser({
  user: "chatbot_user",
  pwd: "secure-password",
  roles: [{ role: "readWrite", db: "chatbot_history" }]
});
```

## Monitoring and Logging

### Application Monitoring

1. **Sentry Integration** (Already configured)
```bash
# Set Sentry DSN
SENTRY_DSN=your-sentry-dsn
```

2. **Health Checks**
```bash
# Backend health check
curl https://api.your-domain.com/api/v1/

# Database health checks included in Docker Compose
```

### Log Management

1. **Centralized Logging**
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

2. **Log Monitoring with ELK Stack**
```yaml
elasticsearch:
  image: elasticsearch:7.14.0
  environment:
    - discovery.type=single-node
    
logstash:
  image: logstash:7.14.0
  volumes:
    - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    
kibana:
  image: kibana:7.14.0
  environment:
    - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
```

## Performance Optimization

### Backend Optimization

1. **Enable Clustering**
```javascript
// main.ts
import cluster from 'cluster';
import os from 'os';

if (cluster.isMaster) {
  const numWorkers = os.cpus().length;
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }
} else {
  // Start the application
  bootstrap();
}
```

2. **Database Connection Pooling**
```typescript
// app.module.ts
TypeOrmModule.forRoot({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  extra: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000
  }
})
```

### CDN Configuration

1. **CloudFront for Static Assets**
```json
{
  "Origins": [
    {
      "DomainName": "your-domain.com",
      "Id": "backend-origin",
      "CustomOriginConfig": {
        "HTTPPort": 443,
        "OriginProtocolPolicy": "https-only"
      }
    }
  ],
  "DefaultCacheBehavior": {
    "TargetOriginId": "backend-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "Compress": true,
    "CachePolicyId": "optimized-caching"
  }
}
```

## Backup and Recovery

### Database Backups

1. **PostgreSQL Backup**
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > /backups/chatbot_db_$DATE.sql
aws s3 cp /backups/chatbot_db_$DATE.sql s3://your-backup-bucket/postgres/
```

2. **MongoDB Backup**
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="$MONGODB_URL" --out /backups/mongodb_$DATE
tar -czf /backups/mongodb_$DATE.tar.gz /backups/mongodb_$DATE
aws s3 cp /backups/mongodb_$DATE.tar.gz s3://your-backup-bucket/mongodb/
```

## Security Checklist

- [ ] SSL/TLS certificates installed and configured
- [ ] Environment variables secured (no hardcoded secrets)
- [ ] Database access restricted to application only
- [ ] API rate limiting enabled
- [ ] Input validation and sanitization
- [ ] CORS properly configured
- [ ] Security headers configured (Helmet.js)
- [ ] Regular security updates applied
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery procedures tested

## Rollback Procedures

### Application Rollback

1. **Docker Deployment**
```bash
# Rollback to previous image
docker service update --image ai-chatbot-backend:previous-tag backend-service
```

2. **Kubernetes Deployment**
```bash
# Rollback deployment
kubectl rollout undo deployment/ai-chatbot-backend -n ai-chatbot
```

### Database Rollback

1. **Create Migration Down Scripts**
```bash
# Rollback last migration
npm run db:rollback
```

2. **Restore from Backup**
```bash
# PostgreSQL restore
pg_restore -d chatbot_db /backups/chatbot_db_backup.sql

# MongoDB restore
mongorestore --uri="$MONGODB_URL" /backups/mongodb_backup/
```

## Post-Deployment Verification

1. **Health Checks**
```bash
curl https://api.your-domain.com/api/v1/
curl https://api.your-domain.com/api/v1/version
```

2. **Functionality Tests**
```bash
# Run E2E tests against production
npm run test:e2e:prod
```

3. **Performance Tests**
```bash
# Load testing with Artillery
artillery run load-test.yml
```

4. **Mobile App Testing**
- Test authentication flow
- Test chat functionality
- Verify push notifications
- Test offline capabilities

For additional support or issues, please refer to our [troubleshooting guide](TROUBLESHOOTING.md) or contact the development team.
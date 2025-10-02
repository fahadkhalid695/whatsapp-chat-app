# WhatsApp Chat Application

A production-ready, full-stack chat application similar to WhatsApp, built with React, React Native, and Node.js. Features real-time messaging, media sharing, group chats, and comprehensive security measures.

## 🚀 Features

- **Real-time messaging** with Socket.io
- **Media sharing** (images, videos, documents)
- **Group conversations** with admin controls
- **End-to-end message encryption**
- **Offline message sync**
- **Push notifications**
- **Contact management**
- **Message search and filtering**
- **Responsive web and mobile apps**
- **Production-ready deployment**

## 📁 Project Structure

```
whatsapp-chat-app/
├── packages/
│   ├── backend/          # Node.js API server with Socket.io
│   ├── web/             # React web application
│   └── mobile/          # React Native mobile app
├── docs/                # Documentation
│   ├── DEPLOYMENT.md    # Production deployment guide
│   └── TESTING.md       # Testing documentation
├── monitoring/          # Monitoring and logging stack
├── kubernetes/          # Kubernetes deployment manifests
├── nginx/              # Load balancer configuration
├── scripts/            # Deployment and utility scripts
├── .github/workflows/  # CI/CD pipeline
├── docker-compose.yml  # Local development environment
├── docker-compose.prod.yml  # Production environment
└── package.json        # Monorepo configuration
```

## 🛠️ Prerequisites

### Development
- Node.js 18+
- npm 9+
- Docker and Docker Compose
- React Native CLI (for mobile development)

### Production
- Docker and Docker Compose
- PostgreSQL 15+
- Redis 7+
- SSL certificates
- Domain name with DNS configuration

## 🚀 Quick Start

### Development Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd whatsapp-chat-app
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   cp packages/backend/.env.example packages/backend/.env
   cp packages/web/.env.example packages/web/.env
   ```

3. **Start development environment with Docker:**
   ```bash
   npm run docker:up
   ```

4. **Or start services individually:**
   ```bash
   # Start all services
   npm run dev

   # Or start individual services
   npm run dev:backend
   npm run dev:web
   npm run dev:mobile
   ```

### Production Deployment

1. **Configure production environment:**
   ```bash
   cp .env.production.example .env.production
   # Edit .env.production with your actual values
   ```

2. **Deploy to production:**
   ```bash
   npm run deploy:production
   ```

3. **Set up monitoring:**
   ```bash
   npm run monitoring:setup
   ```

For detailed deployment instructions, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## 🏗️ Architecture

### Backend (Node.js + Express + Socket.io)
- **Port:** 3000 (production), 3001 (development)
- **Database:** PostgreSQL with optimized indexing
- **Cache:** Redis for sessions and real-time data
- **Real-time:** Socket.io with Redis adapter
- **Security:** JWT authentication, rate limiting, encryption
- **Media:** AWS S3 integration with image processing
- **Notifications:** Firebase FCM and SMS integration

### Web (React + TypeScript + Vite)
- **Port:** 8080 (production), 3000 (development)
- **Framework:** React 18 with TypeScript
- **Build tool:** Vite with optimized production builds
- **State management:** Zustand
- **Real-time:** Socket.io client
- **UI:** Responsive design with performance optimizations

### Mobile (React Native + TypeScript)
- **Framework:** React Native 0.72+
- **Navigation:** React Navigation v6
- **State management:** Zustand
- **Real-time:** Socket.io client
- **Performance:** Virtualized lists, image caching, lazy loading

## 📜 Available Scripts

### Development
- `npm run dev` - Start all services in development mode
- `npm run dev:backend` - Start backend server only
- `npm run dev:web` - Start web application only
- `npm run dev:mobile` - Start mobile development server
- `npm run build` - Build all packages for production
- `npm run test` - Run all tests
- `npm run test:all` - Run comprehensive test suite
- `npm run lint` - Lint all packages
- `npm run format` - Format code with Prettier

### Docker Commands
- `npm run docker:up` - Start development environment
- `npm run docker:down` - Stop development environment
- `npm run docker:logs` - View container logs
- `npm run docker:prod` - Start production environment
- `npm run docker:staging` - Start staging environment
- `npm run docker:monitoring` - Start monitoring stack

### Deployment
- `npm run deploy:production` - Deploy to production
- `npm run deploy:staging` - Deploy to staging
- `npm run monitoring:setup` - Set up monitoring infrastructure

### Database
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with test data
- `npm run db:reset` - Reset database

## 🔧 Configuration

### Environment Variables

#### Development
- `.env` - Root environment variables
- `packages/backend/.env` - Backend configuration
- `packages/web/.env` - Web application configuration

#### Production
- `.env.production` - Production environment variables
- See `.env.production.example` for all required variables

### Key Configuration Areas
- **Database:** PostgreSQL connection and optimization settings
- **Redis:** Cache and session configuration
- **JWT:** Authentication secrets and expiration
- **AWS:** S3 bucket and credentials for media storage
- **Firebase:** FCM server key for push notifications
- **SMS:** Provider API key for verification
- **SSL:** Certificate paths for HTTPS
- **Monitoring:** Grafana, Prometheus, and alerting configuration

## 🔒 Security Features

- **End-to-end message encryption**
- **JWT-based authentication with refresh tokens**
- **Rate limiting and DDoS protection**
- **Input validation and sanitization**
- **SQL injection prevention**
- **XSS protection**
- **CORS configuration**
- **Security headers**
- **Audit logging**

## 📊 Monitoring & Observability

### Metrics Collection
- **Prometheus** - Application and system metrics
- **Grafana** - Visualization and dashboards
- **Node Exporter** - System metrics
- **Redis Exporter** - Cache metrics
- **PostgreSQL Exporter** - Database metrics

### Logging
- **ELK Stack** - Elasticsearch, Logstash, Kibana
- **Structured logging** with Winston
- **Log aggregation** from all services
- **Error tracking** and alerting

### Alerting
- **AlertManager** - Intelligent alert routing
- **Multi-channel notifications** - Email, Slack, PagerDuty
- **Health checks** - Application and infrastructure
- **Performance monitoring** - Response times, error rates

## 🚀 Production Features

### High Availability
- **Load balancing** with Nginx
- **Auto-scaling** with Kubernetes HPA
- **Health checks** and graceful shutdowns
- **Zero-downtime deployments**
- **Database connection pooling**

### Performance Optimization
- **Redis caching** for frequently accessed data
- **Database indexing** for optimal query performance
- **CDN integration** for static assets
- **Image optimization** and compression
- **Lazy loading** and virtualization

### DevOps & CI/CD
- **GitHub Actions** pipeline
- **Automated testing** - Unit, integration, E2E
- **Security scanning** with Snyk
- **Docker containerization**
- **Kubernetes deployment**
- **Infrastructure as Code**

## 🧪 Testing

The application includes comprehensive testing:

- **Unit tests** - Individual component testing
- **Integration tests** - API and database testing
- **End-to-end tests** - Complete user workflows
- **Performance tests** - Load and stress testing
- **Security tests** - Authentication and authorization

Run tests with:
```bash
npm run test:all
```

For detailed testing information, see [docs/TESTING.md](docs/TESTING.md).

## 📚 Documentation

- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment instructions
- [Testing Guide](docs/TESTING.md) - Testing strategies and implementation
- [API Documentation](packages/backend/src/services/README.md) - Backend API reference

## 🤝 Contributing

1. **Code Style:** Follow ESLint and Prettier configurations
2. **Testing:** Write tests for new features and bug fixes
3. **Documentation:** Update relevant documentation
4. **Commits:** Use conventional commit messages
5. **Security:** Follow security best practices
6. **Performance:** Consider performance implications

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run the full test suite
5. Submit a pull request

## 🚀 Deployment Environments

### Development
- **URL:** http://localhost:3000
- **Database:** Local PostgreSQL
- **Cache:** Local Redis
- **Monitoring:** Basic logging

### Staging
- **URL:** https://staging.your-domain.com
- **Database:** Staging PostgreSQL
- **Cache:** Staging Redis
- **Monitoring:** Full monitoring stack

### Production
- **URL:** https://your-domain.com
- **Database:** Production PostgreSQL with replicas
- **Cache:** Production Redis cluster
- **Monitoring:** Full observability stack
- **Scaling:** Auto-scaling enabled
- **Backup:** Automated daily backups

## 🔗 Access URLs

### Development
- **Web App:** http://localhost:3000
- **API:** http://localhost:3001
- **Database:** localhost:5432

### Production Monitoring
- **Grafana:** https://monitoring.your-domain.com:3001
- **Prometheus:** https://monitoring.your-domain.com:9090
- **Kibana:** https://monitoring.your-domain.com:5601
- **AlertManager:** https://monitoring.your-domain.com:9093

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `docs/` directory
- Review the troubleshooting section in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
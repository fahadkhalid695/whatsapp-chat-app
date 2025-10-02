# Backend Startup Guide

## Quick Start (Minimal Mode)

The backend has been configured to start without external dependencies for development.

### 1. Start the Minimal Backend

```bash
cd packages/backend
npm run dev:minimal
```

This will start the backend on `http://localhost:3001` with:
- ✅ Authentication endpoints
- ✅ Health check endpoint  
- ✅ Mock SMS service
- ✅ Basic error handling
- ❌ Database (optional)
- ❌ Redis (optional)
- ❌ Socket.io (optional)

### 2. Test the Backend

In another terminal:

```bash
cd packages/backend
node test-auth.js
```

### 3. Start the Web App

```bash
cd packages/web
npm run dev
```

The web app should now connect to the backend and display the login page.

## Full Mode (With All Services)

### Prerequisites

1. **PostgreSQL Database**
   ```bash
   # Using Docker
   docker run -d \
     --name whatsapp-postgres \
     -e POSTGRES_DB=whatsapp_chat \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=postgres \
     -p 5432:5432 \
     postgres:15-alpine
   ```

2. **Redis Cache**
   ```bash
   # Using Docker
   docker run -d \
     --name whatsapp-redis \
     -p 6379:6379 \
     redis:7-alpine
   ```

3. **Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

### Start Full Backend

```bash
cd packages/backend
npm run dev
```

## Troubleshooting

### Backend Won't Start

1. **Check if port 3001 is available:**
   ```bash
   lsof -i :3001
   # Kill any process using the port
   ```

2. **Check logs for errors:**
   - Look for import/export errors
   - Check if all dependencies are installed
   - Verify TypeScript compilation

3. **Try minimal mode first:**
   ```bash
   npm run dev:minimal
   ```

### Web App Shows Blank Page

1. **Check if backend is running:**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Check browser console for errors**

3. **Verify API endpoints:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/verify-phone \
     -H "Content-Type: application/json" \
     -d '{"phoneNumber": "+1234567890"}'
   ```

### CORS Issues

If you see CORS errors, make sure:
- Backend is running on port 3001
- Web app is running on port 3000
- CORS is configured correctly in backend config

## API Endpoints

### Authentication

- `POST /api/auth/verify-phone` - Send verification code
- `POST /api/auth/verify-code` - Verify code and login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Health Check

- `GET /health` - Server health status
- `GET /api/test` - Simple test endpoint (minimal mode only)

## Development Tips

1. **Use minimal mode for frontend development**
2. **Add database/Redis when testing real-time features**
3. **Check logs for detailed error information**
4. **Use the test script to verify endpoints**

## Next Steps

Once the basic setup is working:

1. Set up database and run migrations
2. Configure Redis for real-time features
3. Set up Firebase for push notifications
4. Configure SMS service for production
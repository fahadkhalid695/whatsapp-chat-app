# Getting Started with WhatsApp Chat App

This guide will help you set up and run the WhatsApp Chat Application on your local machine.

## 🚀 Quick Start (5 minutes)

### 1. Prerequisites
- **Node.js 18+** - [Download here](https://nodejs.org/)
- **npm 9+** - Comes with Node.js
- **Docker & Docker Compose** - [Download here](https://www.docker.com/get-started)

### 2. One-Command Setup
```bash
git clone <your-repo-url>
cd whatsapp-chat-app
./scripts/complete-setup.sh
```

This script will:
- ✅ Check all prerequisites
- ✅ Install all dependencies
- ✅ Set up environment files
- ✅ Build all applications
- ✅ Test the setup

### 3. Start the Application

**Option A: With Database (Full Features)**
```bash
# Terminal 1: Start database services
./scripts/start-dev.sh

# Terminal 2: Start backend
./scripts/start-backend.sh

# Terminal 3: Start web app
./scripts/start-web.sh
```

**Option B: Without Database (Basic Features)**
```bash
# Terminal 1: Start backend
./scripts/start-backend.sh

# Terminal 2: Start web app
./scripts/start-web.sh
```

### 4. Access the Application
- **Web App**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 🎯 What You'll See

### Login Page
The app starts with a phone number login page. Since this is a demo:
- Enter any phone number (e.g., +1234567890)
- The verification will work in mock mode
- You can set up your profile and start chatting

### Features Available
- ✅ **Real-time messaging** (if backend is running)
- ✅ **User authentication** (mock mode)
- ✅ **Responsive design** (works on mobile and desktop)
- ✅ **Material-UI interface** (WhatsApp-like design)
- ⚠️ **Database features** (only if database is running)
- ⚠️ **Push notifications** (requires Firebase setup)

## 🔧 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
./scripts/kill-ports.sh
```

**Backend Won't Start**
```bash
./scripts/test-backend-quick.sh
```

**Dependencies Issues**
```bash
npm install
cd packages/backend && npm install
cd ../web && npm install
cd ../mobile && npm install
```

**Database Connection Issues**
```bash
docker-compose down
docker-compose up -d
```

### Expected Warnings
These warnings are normal when running without full database setup:
- ⚠️ Database connection failed
- ⚠️ Redis connection failed
- ⚠️ Firebase configuration not found
- ⚠️ Notification processors will not be started

## 📱 Mobile Development

To work on the React Native mobile app:

```bash
# Install React Native CLI
npm install -g @react-native-community/cli

# For Android
cd packages/mobile
npx react-native run-android

# For iOS (macOS only)
cd packages/mobile
npx react-native run-ios
```

## 🏗️ Development Workflow

### File Structure
```
whatsapp-chat-app/
├── packages/
│   ├── backend/     # Node.js API server
│   ├── web/         # React web app
│   └── mobile/      # React Native app
├── scripts/         # Utility scripts
├── docs/           # Documentation
└── monitoring/     # Production monitoring
```

### Making Changes

**Backend Changes**
- Edit files in `packages/backend/src/`
- Server auto-restarts with `npm run dev`
- API available at http://localhost:3001

**Web Changes**
- Edit files in `packages/web/src/`
- Hot reload available with `npm run dev`
- App available at http://localhost:3000

**Mobile Changes**
- Edit files in `packages/mobile/src/`
- Use React Native development tools

### Testing
```bash
# Run all tests
npm run test

# Test specific package
cd packages/backend && npm test
cd packages/web && npm test
cd packages/mobile && npm test
```

## 🚀 Production Deployment

For production deployment, see:
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - Complete production guide
- [docs/TESTING.md](docs/TESTING.md) - Testing strategies

### Quick Production Setup
```bash
# Build for production
npm run build

# Deploy with Docker
npm run docker:prod

# Set up monitoring
npm run monitoring:setup
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm run test`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📚 Additional Resources

- **API Documentation**: Check `packages/backend/src/routes/` for API endpoints
- **Component Library**: See `packages/web/src/components/` for UI components
- **Database Schema**: Check `packages/backend/database/migrations/`
- **Production Setup**: See `docs/DEPLOYMENT.md`

## 🆘 Getting Help

If you encounter issues:

1. **Check the logs** - Look for error messages in the terminal
2. **Test individual components** - Use the test scripts
3. **Check prerequisites** - Ensure Node.js, Docker are properly installed
4. **Clear ports** - Use `./scripts/kill-ports.sh`
5. **Fresh install** - Delete `node_modules` and run `npm install`

## 🎉 Success!

If you see the login page at http://localhost:3000 and the backend health check returns "healthy" at http://localhost:3001/health, you're all set!

The application is now ready for development and testing. Enjoy building your WhatsApp-like chat application! 🚀
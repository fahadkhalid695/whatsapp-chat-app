# WhatsApp Chat Application

A full-stack chat application similar to WhatsApp, built with React, React Native, and Node.js.

## Project Structure

```
whatsapp-chat-app/
├── packages/
│   ├── backend/          # Node.js API server
│   ├── web/             # React web application
│   └── mobile/          # React Native mobile app
├── docker-compose.yml   # Local development environment
└── package.json         # Monorepo configuration
```

## Prerequisites

- Node.js 18+
- npm 9+
- Docker and Docker Compose (for local development)
- React Native CLI (for mobile development)

## Quick Start

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

## Development

### Backend (Node.js + Express + Socket.io)
- **Port:** 3001
- **Database:** PostgreSQL
- **Cache:** Redis
- **Real-time:** Socket.io

### Web (React + TypeScript + Vite)
- **Port:** 3000
- **Framework:** React 18
- **Build tool:** Vite
- **UI Library:** Material-UI

### Mobile (React Native + TypeScript)
- **Framework:** React Native 0.72
- **Navigation:** React Navigation
- **UI Library:** React Native Elements

## Available Scripts

### Root Level
- `npm run dev` - Start all services
- `npm run build` - Build all packages
- `npm run test` - Run tests for all packages
- `npm run lint` - Lint all packages
- `npm run format` - Format code with Prettier

### Docker Commands
- `npm run docker:up` - Start development environment
- `npm run docker:down` - Stop development environment
- `npm run docker:logs` - View logs

## Environment Variables

See `.env.example` files in each package for required environment variables.

## Contributing

1. Follow the established code style (ESLint + Prettier)
2. Write tests for new features
3. Update documentation as needed
4. Use conventional commit messages

## License

MIT
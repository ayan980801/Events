# AI Chatbot Application

AI Chatbot is a full-stack mobile application with NestJS backend API and Flutter mobile frontend, supporting multiple AI providers (OpenAI, Anthropic, Mistral) with real-time chat functionality.

**ALWAYS reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Working Effectively

### Bootstrap and Build Process
**NEVER CANCEL builds or long-running commands. All build times are under 3 minutes.**

1. **Environment Setup** (30 seconds):
   ```bash
   # Copy environment configuration
   cp .env.example .env
   ```

2. **Start Database Services** (60 seconds):
   ```bash
   # Start PostgreSQL, MongoDB, and Redis
   docker compose up -d postgres mongodb redis
   # Wait for services to be healthy
   docker compose ps
   ```

3. **Backend Development Setup** (20 seconds total):
   ```bash
   cd backend
   # Install dependencies (takes ~15 seconds)
   npm install
   # Copy environment file to backend directory
   cp ../.env .
   ```

4. **Backend Build and Test** (15 seconds total):
   ```bash
   cd backend
   # Build backend (takes ~8 seconds) - NEVER CANCEL, timeout: 3 minutes
   npm run build
   # Run unit tests (takes ~5 seconds) - NEVER CANCEL, timeout: 2 minutes  
   npm run test
   ```

5. **Frontend Setup** (Flutter required):
   ```bash
   # Install Flutter 3.16.9 if not available
   cd /tmp
   wget -q https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.16.9-stable.tar.xz
   tar xf flutter_linux_3.16.9-stable.tar.xz
   export PATH="$PATH:/tmp/flutter/bin"
   
   # Setup mobile app
   cd mobile-app
   # Create missing asset directories
   mkdir -p assets/images assets/animations assets/icons assets/fonts
   # Install dependencies (takes ~7 seconds) - NEVER CANCEL, timeout: 3 minutes
   flutter pub get
   ```

### Development Servers

1. **Backend API Server**:
   ```bash
   cd backend
   # Start development server with hot reload
   npm run start:dev
   # API available at: http://localhost:3000
   # Swagger docs: http://localhost:3000/api/docs
   ```

2. **Flutter App Development**:
   ```bash
   cd mobile-app
   export PATH="$PATH:/tmp/flutter/bin"
   # For web development (Chrome required)
   flutter run -d chrome --web-port 8080
   # For Android emulator/device
   flutter run
   ```

## Known Issues and Workarounds

### MongoDB Authentication Issue
- **Problem**: E2E tests and backend startup may fail with MongoDB authentication errors
- **Status**: PostgreSQL works perfectly, MongoDB has credential mismatch with docker-compose setup
- **Workaround**: Development works fine with PostgreSQL only
- **Fix needed**: Update MongoDB credentials in docker-compose.yml or .env file

### ESLint Configuration
- **Problem**: `npm run lint` fails with "@nestjs" config not found
- **Solution**: Already fixed - removed non-existent @nestjs ESLint config
- **Status**: Linting works with warnings about unused variables

### Flutter Assets
- **Problem**: Missing asset directories and font files cause build failures
- **Solution**: Create empty asset directories as shown in setup
- **Status**: Basic builds work, fonts disabled in pubspec.yaml

### Test Issues
- **Backend**: Unit tests pass, E2E tests fail due to MongoDB auth and missing AuthService dependency
- **Frontend**: Widget tests fail due to missing ProviderScope setup
- **Workaround**: Use manual API testing with demo script

## Validation and Testing

### Manual Backend API Testing
```bash
# Test API functionality with demo script
cd scripts
chmod +x demo.sh
./demo.sh
```

### Code Quality Checks
```bash
# Backend linting (has some unused variable warnings - safe to ignore)
cd backend
npm run lint

# Flutter analysis (has unused import warnings - safe to ignore) 
cd mobile-app
export PATH="$PATH:/tmp/flutter/bin"
flutter analyze
```

### Build Validation
```bash
# Verify backend builds successfully
cd backend && npm run build

# Verify frontend can be analyzed  
cd mobile-app && flutter analyze
```

## Key Commands and Timings

### Backend Commands (all under 30 seconds)
- `npm install` - Install dependencies (15 seconds)
- `npm run build` - Build application (8 seconds) 
- `npm run test` - Run unit tests (5 seconds)
- `npm run start:dev` - Start development server
- `npm run lint` - Run ESLint (has warnings, safe to ignore)

### Frontend Commands  
- `flutter pub get` - Install dependencies (7 seconds)
- `flutter analyze` - Static analysis (10 seconds)
- `flutter run -d chrome` - Web development server
- `flutter test` - Run tests (currently fails due to setup issue)

### Docker Commands
- `docker compose up -d` - Start all services (60 seconds)
- `docker compose ps` - Check service status
- `docker compose logs [service]` - View logs

## Project Structure Overview

```
├── backend/                 # NestJS API server
│   ├── src/
│   │   ├── auth/           # JWT authentication  
│   │   ├── users/          # User management
│   │   ├── chat/           # Chat conversations
│   │   └── ai-providers/   # OpenAI, Anthropic, Mistral integrations
│   ├── package.json        # Node.js dependencies
│   └── .env               # Environment variables (copy from root)
├── mobile-app/            # Flutter mobile application
│   ├── lib/
│   │   ├── core/          # App configuration and routing
│   │   ├── features/      # Feature modules (auth, chat, settings)
│   │   └── shared/        # Shared widgets and services
│   └── pubspec.yaml       # Flutter dependencies
├── .env.example           # Environment template
├── docker-compose.yml     # Development services
└── scripts/demo.sh        # API testing script
```

## Environment Variables

Required variables in `.env` file:
```bash
# Database connections (PostgreSQL works, MongoDB has auth issues)
DATABASE_URL=postgresql://chatbot_user:chatbot_password@localhost:5432/chatbot_db
MONGODB_URL=mongodb://chatbot_user:chatbot_password@localhost:27017/chatbot_history

# JWT secret
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# AI API keys (optional for development)
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key  
MISTRAL_API_KEY=your-mistral-api-key
```

## CI/CD Pipeline Reference

The `.github/workflows/ci-cd.yml` pipeline:
- ✅ Backend: npm install, lint, test, build (all working)
- ✅ Frontend: flutter pub get, analyze, build APK
- ⚠️ E2E tests: Disabled due to MongoDB auth issues
- ✅ Security: Trivy vulnerability scanning
- ✅ Docker: Builds and pushes images on main branch

Always run `npm run lint` before committing to match CI requirements (ignore unused variable warnings).

## Common Development Tasks

### Making Backend Changes
1. Ensure databases are running: `docker compose ps`
2. Start backend: `cd backend && npm run start:dev`
3. Test changes manually: `scripts/demo.sh`
4. Validate build: `npm run build`
5. Check linting: `npm run lint` (ignore warnings)

### Making Frontend Changes  
1. Ensure Flutter is in PATH: `export PATH="$PATH:/tmp/flutter/bin"`
2. Verify dependencies: `flutter pub get`
3. Run analysis: `flutter analyze` (ignore unused import warnings)
4. Start development: `flutter run -d chrome --web-port 8080`

### API Testing
- Use `scripts/demo.sh` for comprehensive API testing
- Access Swagger docs at http://localhost:3000/api/docs
- PostgreSQL database works reliably for all operations
- Chat functionality works with mock AI responses (add real API keys for actual AI integration)

## Performance Notes
- Backend builds are very fast (~8 seconds), no need for long timeouts
- Flutter dependency resolution is quick (~7 seconds)
- PostgreSQL startup is reliable (~30 seconds)
- Overall development environment bootstrap takes under 2 minutes

## Troubleshooting Quick Reference

1. **Build failures**: Ensure `.env` file exists in both root and `backend/` directories
2. **Database connection**: Use `docker compose ps` to verify services are healthy  
3. **Flutter issues**: Create asset directories and ensure Flutter is in PATH
4. **API testing**: Use demo script rather than E2E tests for validation
5. **Linting errors**: Unused variable warnings are safe to ignore
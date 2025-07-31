# Development Setup Guide

## Prerequisites

Ensure you have the following installed on your development machine:

- **Node.js 18+**: Download from [nodejs.org](https://nodejs.org/)
- **Flutter 3.16+**: Follow installation guide at [flutter.dev](https://flutter.dev/docs/get-started/install)
- **Docker & Docker Compose**: Download from [docker.com](https://www.docker.com/get-started)
- **Git**: Download from [git-scm.com](https://git-scm.com/downloads)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/ayan980801/Events.git
cd Events
```

### 2. Environment Configuration

Copy the environment template and configure your API keys:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
- `OPENAI_API_KEY`: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
- `ANTHROPIC_API_KEY`: Get from [Anthropic Console](https://console.anthropic.com/)
- `MISTRAL_API_KEY`: Get from [Mistral AI Platform](https://console.mistral.ai/)

### 3. Start Development Environment

```bash
# Start all services with Docker Compose
docker-compose up -d

# Wait for databases to be ready (about 30 seconds)
# Check status with:
docker-compose ps
```

### 4. Backend Development

```bash
cd backend

# Install dependencies
npm install

# Start development server
npm run start:dev

# The API will be available at http://localhost:3000
# API Documentation: http://localhost:3000/api/docs
```

### 5. Frontend Development

```bash
cd mobile-app

# Get dependencies
flutter pub get

# Run on emulator/device
flutter run

# Or for web development
flutter run -d chrome --web-port 8080
```

## Project Structure

```
├── mobile-app/                 # Flutter mobile application
│   ├── lib/
│   │   ├── core/              # Core functionality (config, theme, routing)
│   │   ├── features/          # Feature modules (auth, chat, settings)
│   │   └── shared/            # Shared widgets and services
│   └── test/                  # Unit and widget tests
├── backend/                   # NestJS backend API
│   ├── src/
│   │   ├── auth/              # Authentication module
│   │   ├── chat/              # Chat and conversation management
│   │   ├── users/             # User management
│   │   ├── ai-providers/      # AI model integrations
│   │   └── common/            # Shared utilities
│   └── test/                  # Backend tests
├── infrastructure/            # Infrastructure configuration
├── .github/workflows/         # CI/CD pipelines
└── docs/                      # Documentation
```

## Development Workflow

### Running Tests

```bash
# Backend tests
cd backend
npm test                 # Unit tests
npm run test:e2e        # End-to-end tests
npm run test:cov        # Coverage report

# Frontend tests
cd mobile-app
flutter test            # Unit tests
flutter drive --target=test_driver/app.dart  # Integration tests
```

### Code Quality

```bash
# Backend linting and formatting
cd backend
npm run lint            # ESLint
npm run format         # Prettier

# Frontend analysis
cd mobile-app
flutter analyze        # Dart analyzer
```

### Database Management

```bash
# View database logs
docker-compose logs postgres
docker-compose logs mongodb

# Connect to PostgreSQL
docker-compose exec postgres psql -U chatbot_user -d chatbot_db

# Connect to MongoDB
docker-compose exec mongodb mongosh -u chatbot_user -p chatbot_password chatbot_history
```

## Available Scripts

### Backend

- `npm run start` - Start production server
- `npm run start:dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Frontend

- `flutter run` - Start development app
- `flutter build apk` - Build Android APK
- `flutter build ios` - Build iOS app
- `flutter test` - Run unit tests
- `flutter analyze` - Run static analysis

## API Documentation

The backend API includes comprehensive Swagger documentation available at:
- **Development**: http://localhost:3000/api/docs
- **Production**: https://your-domain.com/api/docs

Key endpoints:
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/chat/conversations` - Get user conversations
- `POST /api/v1/chat/conversations/{id}/messages` - Send message

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `MONGODB_URL` | MongoDB connection string | Yes | - |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `OPENAI_API_KEY` | OpenAI API key | No | - |
| `ANTHROPIC_API_KEY` | Anthropic API key | No | - |
| `MISTRAL_API_KEY` | Mistral AI API key | No | - |
| `NODE_ENV` | Environment mode | No | development |
| `PORT` | Server port | No | 3000 |

## Troubleshooting

### Common Issues

**Database Connection Errors**
```bash
# Reset database containers
docker-compose down -v
docker-compose up -d postgres mongodb
```

**Flutter Build Issues**
```bash
# Clean and rebuild
flutter clean
flutter pub get
flutter pub upgrade
```

**Node.js Version Issues**
```bash
# Use Node Version Manager
nvm install 18
nvm use 18
```

### Getting Help

1. Check the [FAQ](docs/FAQ.md)
2. Search existing [GitHub Issues](https://github.com/ayan980801/Events/issues)
3. Create a new issue with detailed information
4. Join our [Discord Community](link-to-discord) for real-time help

## Contributing

Please read our [Contributing Guidelines](docs/CONTRIBUTING.md) before submitting pull requests.

### Development Guidelines

1. Follow the established code style and conventions
2. Write tests for new features
3. Update documentation for API changes
4. Use conventional commit messages
5. Ensure CI/CD pipeline passes

## Next Steps

After setting up the development environment:

1. **Explore the API** - Visit the Swagger documentation
2. **Run the mobile app** - Test on an emulator or device
3. **Add your AI API keys** - Configure the AI providers you want to use
4. **Customize the UI** - Modify the Flutter app to match your design
5. **Deploy to staging** - Use the provided CI/CD pipeline

For production deployment instructions, see [Deployment Guide](docs/DEPLOYMENT.md).
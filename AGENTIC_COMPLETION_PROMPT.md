# AI Agent Autonomous Application Completion Prompt

## System Context
You are an expert full-stack developer tasked with completing an AI Chatbot application that consists of:
- **Backend**: NestJS API with TypeScript, supporting multiple AI providers (OpenAI, Anthropic Claude, Mistral)
- **Mobile App**: Flutter application with Riverpod state management
- **Infrastructure**: Docker containers for PostgreSQL, MongoDB, and Redis
- **Current State**: Architecture is in place but core implementations are missing

## Critical Instructions
1. **ITERATE UNTIL COMPLETE**: Do not stop until every task is successfully completed
2. **VERIFY EACH STEP**: After each implementation, verify it works before moving to the next
3. **HANDLE ALL ERRORS**: If something fails, debug and fix it immediately
4. **PRODUCTION QUALITY**: Every implementation must be production-ready, not a prototype
5. **SECURITY FIRST**: Never commit secrets, always use environment variables
6. **TEST EVERYTHING**: Write tests for every feature you implement

## Working Directory
`C:\Users\MohammedKhan\Documents\Events`

## Phase 1: Environment Setup (Tasks 1-5)

### Task 1: Install Backend Dependencies
```bash
cd backend
npm install
```
- **Verification**: Check that node_modules folder is created and no errors occurred
- **If npm install fails**: Try `npm install --force` or fix package.json conflicts

### Task 2: Fix Security Vulnerabilities
```bash
cd backend
npm audit fix
npm audit fix --force  # Only if critical vulnerabilities remain
```
- **Success Criteria**: npm audit shows 0 vulnerabilities or only low-severity ones

### Task 3: Configure Environment Variables
1. Copy .env.example to .env in root directory
2. Update these critical values:
   - `JWT_SECRET`: Generate secure random string (32+ characters)
   - `DATABASE_PASSWORD`: Generate secure password
   - `OPENAI_API_KEY`: Must be valid (check if provided)
   - `ANTHROPIC_API_KEY`: Must be valid (check if provided)
   - `MISTRAL_API_KEY`: Must be valid (check if provided)
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: For OAuth
   - `APPLE_CLIENT_ID` and `APPLE_CLIENT_SECRET`: For OAuth

### Task 4: Start Docker Containers
```bash
docker-compose up -d postgres mongodb redis
```
- **Verification**: `docker ps` shows all three containers running
- **If fails**: Check Docker is running, ports aren't in use

### Task 5: Initialize Database
```bash
cd backend
npm run db:create
```
- **Verification**: Connect to PostgreSQL and verify tables exist

## Phase 2: Backend Core Implementation (Tasks 6-23)

### Task 6: Implement Google OAuth
**File**: `backend/src/auth/auth.service.ts`
```typescript
async verifyGoogleToken(token: string): Promise<any> {
  const client = new OAuth2Client(this.configService.get('GOOGLE_CLIENT_ID'));
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: this.configService.get('GOOGLE_CLIENT_ID'),
    });
    const payload = ticket.getPayload();
    return {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      sub: payload.sub,
    };
  } catch (error) {
    throw new UnauthorizedException('Invalid Google token');
  }
}
```

### Task 7: Implement Apple OAuth
**File**: `backend/src/auth/auth.service.ts`
```typescript
async verifyAppleToken(token: string): Promise<any> {
  // Implement Apple Sign-In verification
  // Use apple-signin-auth library
  const appleSignin = require('apple-signin-auth');
  try {
    const clientId = this.configService.get('APPLE_CLIENT_ID');
    const appleData = await appleSignin.verifyIdToken(token, {
      audience: clientId,
      ignoreExpiration: false,
    });
    return {
      email: appleData.email,
      sub: appleData.sub,
    };
  } catch (error) {
    throw new UnauthorizedException('Invalid Apple token');
  }
}
```

### Task 8: Complete OpenAI Integration
**File**: `backend/src/ai-providers/ai-providers.service.ts`
- Implement streaming responses
- Add proper error handling
- Implement token counting
- Add retry logic with exponential backoff

### Task 9: Implement Claude Integration
**File**: `backend/src/ai-providers/ai-providers.service.ts`
```typescript
private async handleClaudeRequest(message: string, context?: any) {
  const anthropic = new Anthropic({
    apiKey: this.configService.get('ANTHROPIC_API_KEY'),
  });
  
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      messages: [{ role: 'user', content: message }],
      stream: true,
    });
    
    // Handle streaming response
    for await (const chunk of response) {
      yield chunk.delta?.text || '';
    }
  } catch (error) {
    this.logger.error('Claude API error:', error);
    throw new InternalServerErrorException('Claude API request failed');
  }
}
```

### Task 10: Implement Mistral Integration
**File**: `backend/src/ai-providers/ai-providers.service.ts`
```typescript
private async handleMistralRequest(message: string, context?: any) {
  const mistral = new MistralClient(this.configService.get('MISTRAL_API_KEY'));
  
  try {
    const response = await mistral.chat({
      model: 'mistral-large-latest',
      messages: [{ role: 'user', content: message }],
      stream: true,
    });
    
    // Handle streaming response
    for await (const chunk of response) {
      yield chunk.choices[0]?.delta?.content || '';
    }
  } catch (error) {
    this.logger.error('Mistral API error:', error);
    throw new InternalServerErrorException('Mistral API request failed');
  }
}
```

### Task 11: Add Comprehensive Error Handling
1. Create custom exception filters in `backend/src/common/filters/`
2. Implement global exception handler
3. Add request validation pipes
4. Create structured error responses
5. Add logging for all errors

### Task 12: Implement WebSocket Authentication
**File**: `backend/src/chat/chat.gateway.ts`
```typescript
@WebSocketGateway({
  cors: { origin: '*', credentials: true },
})
export class ChatGateway implements OnGatewayConnection {
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      const user = await this.authService.verifyToken(token);
      client.data.user = user;
      client.join(`user:${user.id}`);
    } catch (error) {
      client.disconnect();
    }
  }
}
```

### Task 13: Create File Upload Endpoint
**File**: Create `backend/src/upload/upload.controller.ts`
```typescript
@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  @Post('file')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname));
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Invalid file type'), false);
      }
    },
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    return {
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      url: `/uploads/${file.filename}`,
    };
  }
}
```

### Task 14-15: User Preferences & Subscription Management
Create new modules for user preferences and subscriptions with full CRUD operations.

### Task 16: Database Performance Optimization
```sql
-- Add indexes to PostgreSQL
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_users_email ON users(email);
```

### Task 17: Connection Pooling
Configure connection pooling in TypeORM and MongoDB configurations.

### Task 18: Rate Limiting Tests
Write comprehensive tests for rate limiting in `backend/test/rate-limiting.e2e-spec.ts`

### Task 19-20: Security Fixes
Update `docker-compose.yml` to use environment variables for all secrets.

### Task 21-23: Backend Validation
1. Run ESLint and fix all errors
2. Start backend server and ensure it runs
3. Test all endpoints via Swagger UI at http://localhost:3000/api

## Phase 3: Mobile App Implementation (Tasks 24-39)

### Task 24: Google Sign-In Implementation
**File**: `mobile-app/lib/features/auth/presentation/pages/login_page.dart`
```dart
Future<void> _handleGoogleSignIn() async {
  try {
    final GoogleSignIn googleSignIn = GoogleSignIn(
      scopes: ['email', 'profile'],
    );
    final GoogleSignInAccount? account = await googleSignIn.signIn();
    if (account != null) {
      final GoogleSignInAuthentication auth = await account.authentication;
      await ref.read(authProvider.notifier).loginWithGoogle(auth.idToken!);
    }
  } catch (error) {
    _showError('Google sign-in failed: $error');
  }
}
```

### Task 25: Apple Sign-In Implementation
**File**: `mobile-app/lib/features/auth/presentation/pages/login_page.dart`
```dart
Future<void> _handleAppleSignIn() async {
  try {
    final credential = await SignInWithApple.getAppleIDCredential(
      scopes: [
        AppleIDAuthorizationScopes.email,
        AppleIDAuthorizationScopes.fullName,
      ],
    );
    await ref.read(authProvider.notifier).loginWithApple(credential.identityToken!);
  } catch (error) {
    _showError('Apple sign-in failed: $error');
  }
}
```

### Task 26: Replace Mock API Calls
**File**: `mobile-app/lib/features/chat/data/chat_repository.dart`
- Replace all `Future.delayed` mock calls with actual Dio HTTP requests
- Point to real backend endpoints
- Implement proper error handling

### Task 27: Authentication Logic
**File**: `mobile-app/lib/features/auth/presentation/providers/auth_provider.dart`
- Implement JWT token storage using flutter_secure_storage
- Add token refresh logic
- Implement auto-login on app start

### Task 28: Environment-Based Configuration
**File**: `mobile-app/lib/core/config/app_config.dart`
```dart
class AppConfig {
  static String get apiUrl {
    const String env = String.fromEnvironment('ENV', defaultValue: 'dev');
    switch (env) {
      case 'prod':
        return 'https://api.yourchatbot.com';
      case 'staging':
        return 'https://staging-api.yourchatbot.com';
      default:
        return 'http://localhost:3000';
    }
  }
}
```

### Task 29-30: Error Handling & Offline Support
Implement comprehensive error handling and offline caching using Hive.

### Task 31: Chat History Pagination
Implement infinite scroll with pagination for chat messages.

### Task 32-35: Settings Page Features
Replace all placeholder dialogs with working implementations.

### Task 36: Push Notifications
Implement Firebase Cloud Messaging for push notifications.

### Task 37-39: Mobile App Testing
1. Run Flutter analyzer and fix issues
2. Test on iOS simulator
3. Test on Android emulator

## Phase 4: Testing (Tasks 40-47)

### Write Comprehensive Tests
Create unit tests for:
- Authentication service (JWT, OAuth)
- Chat service (message handling, WebSocket)
- AI providers (OpenAI, Claude, Mistral)
- All API endpoints
- Mobile app authentication flow
- Mobile app chat functionality

**Test Coverage Target**: Minimum 80%

## Phase 5: Documentation & DevOps (Tasks 48-57)

### Task 48: API Documentation
Generate comprehensive API documentation using Swagger.

### Task 49: Developer Setup Guide
Create detailed README with:
- Prerequisites
- Installation steps
- Configuration guide
- Troubleshooting section

### Task 50: Production Deployment Guide
Document:
- Server requirements
- Deployment steps
- Monitoring setup
- Backup procedures

### Task 51: CI/CD Pipeline
Create GitHub Actions workflow for:
- Automated testing
- Code quality checks
- Automated deployment

### Task 52-57: Production Readiness
1. Configure production environment
2. Security audit
3. Database optimization
4. Error tracking setup (Sentry)
5. Load testing
6. Final end-to-end testing

## Verification Checklist

### Backend Verification
- [ ] All npm dependencies installed without vulnerabilities
- [ ] Docker containers running (PostgreSQL, MongoDB, Redis)
- [ ] Backend server starts without errors
- [ ] All API endpoints return proper responses
- [ ] WebSocket connections work
- [ ] File upload works
- [ ] All three AI providers (OpenAI, Claude, Mistral) respond correctly
- [ ] OAuth authentication works (Google & Apple)
- [ ] Rate limiting is enforced
- [ ] No hardcoded secrets in code

### Mobile App Verification
- [ ] App builds for both iOS and Android
- [ ] User can register and login
- [ ] OAuth sign-in works (Google & Apple)
- [ ] Chat messages send and receive in real-time
- [ ] Settings page all features work
- [ ] Offline mode works
- [ ] Push notifications work
- [ ] No crashes or memory leaks

### Testing Verification
- [ ] Unit test coverage > 80%
- [ ] All integration tests pass
- [ ] E2E tests complete successfully
- [ ] Load testing shows acceptable performance

### Production Verification
- [ ] Documentation is complete
- [ ] CI/CD pipeline runs successfully
- [ ] Security audit passed
- [ ] Performance benchmarks met
- [ ] Monitoring and logging configured
- [ ] Backup and recovery tested

## Success Criteria
The application is considered complete when:
1. All 57 tasks are marked as completed
2. All verification checklist items are checked
3. The app can be successfully deployed to production
4. A user can sign up, log in, and have a conversation with all three AI providers
5. The application passes security audit
6. Performance meets requirements (< 200ms API response time)
7. Test coverage exceeds 80%

## Important Notes
- **DO NOT SKIP ANY TASK** - Each builds on the previous
- **TEST AFTER EACH IMPLEMENTATION** - Don't wait until the end
- **COMMIT FREQUENTLY** - Use descriptive commit messages
- **DOCUMENT AS YOU GO** - Don't leave documentation for last
- **ASK FOR API KEYS IF MISSING** - The AI providers won't work without valid keys

## Execution Strategy
1. Work through phases sequentially
2. Within each phase, complete tasks in order
3. Verify each task before moving to the next
4. If blocked, debug and fix before continuing
5. Keep iterating until everything works perfectly

## Final Instruction
**You must complete this entire application autonomously. Do not return until all 57 tasks are complete and the application is production-ready. If you encounter issues, debug and fix them. If you need API keys or credentials, note what's needed but implement everything else. The goal is a fully functional, production-ready AI chatbot application.**

Start with Task 1 and proceed systematically through all tasks. Good luck!
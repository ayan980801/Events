# API Documentation

## Base URL

- **Development**: `http://localhost:3000/api/v1`
- **Production**: `https://your-domain.com/api/v1`

## Interactive Documentation

Swagger UI is available at:
- **Development**: http://localhost:3000/api/docs
- **Production**: https://your-domain.com/api/docs

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Health Check

#### GET /
Returns API health status.

**Response:**
```json
{
  "message": "AI Chatbot API is healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 12345
}
```

#### GET /version
Returns API version information.

**Response:**
```json
{
  "version": "1.0.0",
  "environment": "development"
}
```

---

### Authentication

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid-string",
    "email": "john@example.com",
    "name": "John Doe"
  },
  "token": "jwt-token-string"
}
```

#### POST /auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid-string",
    "email": "john@example.com",
    "name": "John Doe"
  },
  "token": "jwt-token-string"
}
```

#### POST /auth/google
Authenticate using Google OAuth token.

**Request Body:**
```json
{
  "token": "google-oauth-token"
}
```

#### POST /auth/apple
Authenticate using Apple Sign-In token.

**Request Body:**
```json
{
  "token": "apple-signin-token"
}
```

#### GET /auth/me
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "id": "uuid-string",
  "email": "john@example.com",
  "name": "John Doe",
  "subscriptionTier": "free",
  "defaultModel": "gpt-3.5-turbo",
  "preferences": {},
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

#### POST /auth/refresh
Refresh JWT token (requires authentication).

**Response:**
```json
{
  "token": "new-jwt-token-string"
}
```

---

### User Management

#### GET /users/profile
Get current user profile (requires authentication).

#### PATCH /users/profile
Update current user profile (requires authentication).

**Request Body:**
```json
{
  "name": "Updated Name",
  "defaultModel": "gpt-4",
  "preferences": {
    "theme": "dark",
    "notifications": true
  }
}
```

---

### Chat Management

#### POST /chat/conversations
Create a new conversation (requires authentication).

**Request Body:**
```json
{
  "title": "My New Conversation",
  "aiModel": "gpt-4"
}
```

**Response:**
```json
{
  "_id": "conversation-id",
  "userId": "user-id",
  "title": "My New Conversation",
  "aiModel": "gpt-4",
  "metadata": {},
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

#### GET /chat/conversations
Get all user conversations (requires authentication).

**Response:**
```json
[
  {
    "_id": "conversation-id",
    "userId": "user-id",
    "title": "Conversation Title",
    "aiModel": "gpt-4",
    "lastMessageAt": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
]
```

#### GET /chat/conversations/:id
Get specific conversation details (requires authentication).

#### GET /chat/conversations/:id/messages
Get all messages in a conversation (requires authentication).

**Response:**
```json
[
  {
    "_id": "message-id",
    "conversationId": "conversation-id",
    "userId": "user-id",
    "role": "user",
    "content": "Hello, how are you?",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "_id": "message-id-2",
    "conversationId": "conversation-id",
    "userId": "user-id",
    "role": "assistant",
    "content": "Hello! I'm doing well, thank you for asking. How can I help you today?",
    "aiModel": "gpt-4",
    "createdAt": "2024-01-15T10:30:05.000Z"
  }
]
```

#### POST /chat/conversations/:id/messages
Send a message in a conversation (requires authentication).

**Request Body:**
```json
{
  "content": "What is the weather like today?"
}
```

**Response:**
```json
{
  "userMessage": {
    "_id": "user-message-id",
    "conversationId": "conversation-id",
    "userId": "user-id",
    "role": "user",
    "content": "What is the weather like today?",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "aiResponse": {
    "_id": "ai-message-id",
    "conversationId": "conversation-id",
    "userId": "user-id",
    "role": "assistant",
    "content": "I don't have access to real-time weather data...",
    "aiModel": "gpt-4",
    "createdAt": "2024-01-15T10:30:05.000Z"
  }
}
```

#### DELETE /chat/conversations/:id
Delete a conversation (soft delete - requires authentication).

**Response:**
```json
{
  "message": "Conversation deleted successfully"
}
```

---

## WebSocket Events

The application supports real-time communication via WebSocket connections at `/socket.io`.

### Connection

Connect to the WebSocket server:
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events

#### Join Conversation
```javascript
socket.emit('joinConversation', {
  conversationId: 'conversation-id'
});
```

#### Leave Conversation
```javascript
socket.emit('leaveConversation', {
  conversationId: 'conversation-id'
});
```

#### Typing Indicator
```javascript
socket.emit('typing', {
  conversationId: 'conversation-id',
  isTyping: true
});
```

#### Listen for New Messages
```javascript
socket.on('newMessage', (message) => {
  console.log('New message:', message);
});
```

#### Listen for Typing Indicators
```javascript
socket.on('userTyping', ({ userId, isTyping }) => {
  console.log(`User ${userId} is ${isTyping ? 'typing' : 'not typing'}`);
});
```

---

## Error Responses

All endpoints may return the following error formats:

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "error": "Not Found"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

---

## Rate Limiting

The API implements rate limiting:
- **Limit**: 100 requests per minute per IP
- **Headers**: Rate limit information is included in response headers:
  - `X-RateLimit-Limit`: Request limit per window
  - `X-RateLimit-Remaining`: Requests remaining in current window
  - `X-RateLimit-Reset`: Time when the rate limit resets

When rate limit is exceeded:
```json
{
  "statusCode": 429,
  "message": "Too Many Requests",
  "error": "ThrottlerException"
}
```

---

## AI Models

Supported AI models:
- `gpt-4`: OpenAI GPT-4 (premium)
- `gpt-3.5-turbo`: OpenAI GPT-3.5 Turbo (default)
- `claude-3-sonnet`: Anthropic Claude 3 Sonnet
- `claude-3-haiku`: Anthropic Claude 3 Haiku
- `mistral-7b-instruct`: Mistral 7B Instruct
- `mistral-medium`: Mistral Medium

Model availability depends on configured API keys and user subscription tier.

---

## Pagination

List endpoints support pagination via query parameters:

```
GET /chat/conversations?page=1&limit=20&sort=createdAt&order=desc
```

**Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sort`: Sort field (default: createdAt)
- `order`: Sort order - `asc` or `desc` (default: desc)

**Response includes pagination metadata:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```
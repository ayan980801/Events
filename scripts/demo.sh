#!/bin/bash

# AI Chatbot Demo Script
# This script demonstrates the key features of the AI Chatbot application

set -e

echo "🤖 AI Chatbot Application Demo"
echo "================================"
echo ""

# Check if required tools are installed
command -v curl >/dev/null 2>&1 || { echo "❌ curl is required but not installed. Aborting." >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "❌ jq is required but not installed. Aborting." >&2; exit 1; }

# Configuration
API_BASE_URL="http://localhost:3000/api/v1"
DEMO_EMAIL="demo@example.com"
DEMO_PASSWORD="demo123456"
DEMO_NAME="Demo User"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_step() {
    echo -e "${BLUE}📍 $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

wait_for_input() {
    echo ""
    echo -e "${YELLOW}Press Enter to continue...${NC}"
    read
}

# Function to make API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local auth_header=$4
    
    local curl_cmd="curl -s -X $method"
    
    if [ ! -z "$auth_header" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $auth_header'"
    fi
    
    curl_cmd="$curl_cmd -H 'Content-Type: application/json'"
    
    if [ ! -z "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    curl_cmd="$curl_cmd $API_BASE_URL$endpoint"
    
    eval $curl_cmd
}

# Check if API is running
log_step "Checking if API is running..."
if ! curl -s "$API_BASE_URL/" > /dev/null; then
    log_error "API is not running at $API_BASE_URL"
    echo "Please start the backend server first:"
    echo "  cd backend && npm run start:dev"
    exit 1
fi
log_success "API is running!"

# Step 1: Health Check
log_step "1. Health Check"
echo "Checking API health..."
health_response=$(api_call "GET" "/")
echo "$health_response" | jq '.'
log_success "API is healthy!"
wait_for_input

# Step 2: User Registration
log_step "2. User Registration"
echo "Registering demo user..."
register_data="{\"name\":\"$DEMO_NAME\",\"email\":\"$DEMO_EMAIL\",\"password\":\"$DEMO_PASSWORD\"}"
register_response=$(api_call "POST" "/auth/register" "$register_data")

if echo "$register_response" | jq -e '.token' > /dev/null; then
    AUTH_TOKEN=$(echo "$register_response" | jq -r '.token')
    USER_ID=$(echo "$register_response" | jq -r '.user.id')
    log_success "User registered successfully!"
    echo "User ID: $USER_ID"
    echo "Token: ${AUTH_TOKEN:0:20}..."
else
    log_info "User already exists, trying login..."
    login_data="{\"email\":\"$DEMO_EMAIL\",\"password\":\"$DEMO_PASSWORD\"}"
    login_response=$(api_call "POST" "/auth/login" "$login_data")
    AUTH_TOKEN=$(echo "$login_response" | jq -r '.token')
    USER_ID=$(echo "$login_response" | jq -r '.user.id')
    log_success "User logged in successfully!"
fi
wait_for_input

# Step 3: Create Conversation
log_step "3. Creating a Conversation"
echo "Creating a new conversation..."
conv_data="{\"title\":\"Demo Conversation\",\"aiModel\":\"gpt-3.5-turbo\"}"
conv_response=$(api_call "POST" "/chat/conversations" "$conv_data" "$AUTH_TOKEN")
CONVERSATION_ID=$(echo "$conv_response" | jq -r '._id')
log_success "Conversation created!"
echo "Conversation ID: $CONVERSATION_ID"
echo "$conv_response" | jq '.'
wait_for_input

# Step 4: Send Messages
log_step "4. Sending Messages"
echo "Sending a message to the AI..."
message_data="{\"content\":\"Hello! Can you explain what artificial intelligence is in simple terms?\"}"
message_response=$(api_call "POST" "/chat/conversations/$CONVERSATION_ID/messages" "$message_data" "$AUTH_TOKEN")
log_success "Message sent and AI responded!"
echo ""
echo "User Message:"
echo "$message_response" | jq -r '.userMessage.content'
echo ""
echo "AI Response:"
echo "$message_response" | jq -r '.aiResponse.content'
wait_for_input

# Step 5: Send Follow-up Message
log_step "5. Follow-up Message"
echo "Sending a follow-up message..."
followup_data="{\"content\":\"Can you give me a practical example of AI in everyday life?\"}"
followup_response=$(api_call "POST" "/chat/conversations/$CONVERSATION_ID/messages" "$followup_data" "$AUTH_TOKEN")
echo ""
echo "User Message:"
echo "$followup_response" | jq -r '.userMessage.content'
echo ""
echo "AI Response:"
echo "$followup_response" | jq -r '.aiResponse.content'
wait_for_input

# Step 6: Get Conversation History
log_step "6. Retrieving Conversation History"
echo "Getting full conversation history..."
history_response=$(api_call "GET" "/chat/conversations/$CONVERSATION_ID/messages" "" "$AUTH_TOKEN")
echo ""
echo "Conversation History:"
echo "$history_response" | jq '.[] | {role: .role, content: .content, timestamp: .createdAt}'
wait_for_input

# Step 7: List All Conversations
log_step "7. Listing All Conversations"
echo "Getting all user conversations..."
conversations_response=$(api_call "GET" "/chat/conversations" "" "$AUTH_TOKEN")
echo ""
echo "User Conversations:"
echo "$conversations_response" | jq '.[] | {id: ._id, title: .title, model: .aiModel, lastMessage: .lastMessageAt}'
wait_for_input

# Step 8: User Profile
log_step "8. User Profile Management"
echo "Getting user profile..."
profile_response=$(api_call "GET" "/users/profile" "" "$AUTH_TOKEN")
echo ""
echo "User Profile:"
echo "$profile_response" | jq '.'
wait_for_input

# Step 9: Update Profile
log_step "9. Updating User Preferences"
echo "Updating user preferences..."
update_data="{\"defaultModel\":\"gpt-4\",\"preferences\":{\"theme\":\"dark\",\"notifications\":true}}"
update_response=$(api_call "PATCH" "/users/profile" "$update_data" "$AUTH_TOKEN")
echo ""
echo "Updated Profile:"
echo "$update_response" | jq '.'
wait_for_input

# Step 10: Create Another Conversation with Different Model
log_step "10. Testing Different AI Model"
echo "Creating conversation with GPT-4..."
gpt4_conv_data="{\"title\":\"GPT-4 Demo\",\"aiModel\":\"gpt-4\"}"
gpt4_conv_response=$(api_call "POST" "/chat/conversations" "$gpt4_conv_data" "$AUTH_TOKEN")
GPT4_CONVERSATION_ID=$(echo "$gpt4_conv_response" | jq -r '._id')

echo "Sending message to GPT-4..."
gpt4_message_data="{\"content\":\"Write a haiku about programming.\"}"
gpt4_message_response=$(api_call "POST" "/chat/conversations/$GPT4_CONVERSATION_ID/messages" "$gpt4_message_data" "$AUTH_TOKEN")
echo ""
echo "GPT-4 Response:"
echo "$gpt4_message_response" | jq -r '.aiResponse.content'
wait_for_input

# Step 11: Performance Metrics
log_step "11. API Performance Check"
echo "Testing API response times..."
start_time=$(date +%s%N)
api_call "GET" "/" > /dev/null
end_time=$(date +%s%N)
response_time=$(( (end_time - start_time) / 1000000 ))
echo "Health check response time: ${response_time}ms"

start_time=$(date +%s%N)
api_call "GET" "/chat/conversations" "" "$AUTH_TOKEN" > /dev/null
end_time=$(date +%s%N)
response_time=$(( (end_time - start_time) / 1000000 ))
echo "Conversations list response time: ${response_time}ms"
wait_for_input

# Final Summary
echo ""
echo "🎉 Demo Complete!"
echo "================="
echo ""
log_success "Successfully demonstrated:"
echo "  ✅ User registration and authentication"
echo "  ✅ JWT token management"
echo "  ✅ Conversation creation and management"
echo "  ✅ AI message generation (mock responses)"
echo "  ✅ Multiple AI model support"
echo "  ✅ User profile management"
echo "  ✅ API performance and reliability"
echo ""
log_info "Key Features Showcased:"
echo "  🔐 Secure authentication with JWT"
echo "  💬 Real-time chat functionality"
echo "  🤖 Multiple AI model integration"
echo "  📱 RESTful API design"
echo "  🔄 Conversation history management"
echo "  ⚙️  User preferences and settings"
echo ""
log_info "Next Steps:"
echo "  1. Open the mobile app to see the UI"
echo "  2. Try the API documentation at http://localhost:3000/api/docs"
echo "  3. Test with real AI API keys for actual responses"
echo "  4. Explore WebSocket functionality for real-time features"
echo ""
echo "For more information, check out:"
echo "  📚 API Documentation: docs/API.md"
echo "  🚀 Development Guide: docs/DEVELOPMENT.md"
echo "  📦 Deployment Guide: docs/DEPLOYMENT.md"
echo ""

# Cleanup option
echo ""
log_info "Clean up demo data? (y/N)"
read -r cleanup_choice
if [[ $cleanup_choice =~ ^[Yy]$ ]]; then
    echo "Cleaning up demo conversations..."
    api_call "DELETE" "/chat/conversations/$CONVERSATION_ID" "" "$AUTH_TOKEN" > /dev/null
    api_call "DELETE" "/chat/conversations/$GPT4_CONVERSATION_ID" "" "$AUTH_TOKEN" > /dev/null
    log_success "Demo data cleaned up!"
fi

echo ""
echo "Thank you for trying the AI Chatbot Demo! 🚀"
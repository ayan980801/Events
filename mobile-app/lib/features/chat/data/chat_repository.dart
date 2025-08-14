import 'package:dio/dio.dart';
import 'package:web_socket_channel/io.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../domain/entities/conversation.dart';
import '../domain/entities/message.dart';
import '../../auth/data/auth_repository.dart';

class ChatRepository {
  final Dio _dio;
  final AuthRepository _authRepository;
  WebSocketChannel? _webSocketChannel;

  ChatRepository({
    required Dio dio,
    required AuthRepository authRepository,
  }) : _dio = dio,
       _authRepository = authRepository;

  /// Create a new conversation
  Future<Conversation> createConversation({
    required String title,
    String? aiModel,
  }) async {
    try {
      final token = await _authRepository.getStoredToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }

      final response = await _dio.post(
        '/chat/conversations',
        data: {
          'title': title,
          'aiModel': aiModel ?? 'gpt-3.5-turbo',
        },
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      return Conversation.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Get all user conversations
  Future<List<Conversation>> getConversations() async {
    try {
      final token = await _authRepository.getStoredToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }

      final response = await _dio.get(
        '/chat/conversations',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      final List<dynamic> conversationsJson = response.data as List<dynamic>;
      return conversationsJson
          .map((json) => Conversation.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Get a specific conversation
  Future<Conversation> getConversation(String conversationId) async {
    try {
      final token = await _authRepository.getStoredToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }

      final response = await _dio.get(
        '/chat/conversations/$conversationId',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      return Conversation.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Get messages for a conversation
  Future<List<Message>> getMessages(String conversationId) async {
    try {
      final token = await _authRepository.getStoredToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }

      final response = await _dio.get(
        '/chat/conversations/$conversationId/messages',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      final List<dynamic> messagesJson = response.data as List<dynamic>;
      return messagesJson
          .map((json) => Message.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Send a message in a conversation
  Future<SendMessageResult> sendMessage({
    required String conversationId,
    required String content,
  }) async {
    try {
      final token = await _authRepository.getStoredToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }

      final response = await _dio.post(
        '/chat/conversations/$conversationId/messages',
        data: {
          'content': content,
        },
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      final data = response.data as Map<String, dynamic>;
      return SendMessageResult(
        userMessage: Message.fromJson(data['userMessage'] as Map<String, dynamic>),
        aiResponse: Message.fromJson(data['aiResponse'] as Map<String, dynamic>),
      );
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Delete a conversation
  Future<void> deleteConversation(String conversationId) async {
    try {
      final token = await _authRepository.getStoredToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }

      await _dio.delete(
        '/chat/conversations/$conversationId',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Get available AI models
  Future<List<String>> getAvailableModels() async {
    try {
      final token = await _authRepository.getStoredToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }

      final response = await _dio.get(
        '/ai-providers/models',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      final List<dynamic> models = response.data as List<dynamic>;
      return models.cast<String>();
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Connect to WebSocket for real-time updates
  Future<WebSocketChannel> connectWebSocket() async {
    try {
      final token = await _authRepository.getStoredToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }

      // Extract base URL from Dio instance
      final baseUrl = _dio.options.baseUrl.replaceFirst('http', 'ws');
      final wsUrl = '$baseUrl/chat/ws?token=$token';

      _webSocketChannel = IOWebSocketChannel.connect(wsUrl);
      return _webSocketChannel!;
    } catch (e) {
      throw Exception('Failed to connect to WebSocket: $e');
    }
  }

  /// Disconnect WebSocket
  void disconnectWebSocket() {
    _webSocketChannel?.sink.close();
    _webSocketChannel = null;
  }

  /// Send typing indicator
  Future<void> sendTypingIndicator({
    required String conversationId,
    required bool isTyping,
  }) async {
    if (_webSocketChannel != null) {
      _webSocketChannel!.sink.add({
        'type': 'typing',
        'conversationId': conversationId,
        'isTyping': isTyping,
      });
    }
  }

  /// Update conversation title
  Future<Conversation> updateConversationTitle({
    required String conversationId,
    required String title,
  }) async {
    try {
      final token = await _authRepository.getStoredToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }

      final response = await _dio.patch(
        '/chat/conversations/$conversationId',
        data: {
          'title': title,
        },
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      return Conversation.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Search messages in conversations
  Future<List<Message>> searchMessages({
    required String query,
    String? conversationId,
    int? limit,
  }) async {
    try {
      final token = await _authRepository.getStoredToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }

      final queryParams = <String, dynamic>{
        'q': query,
        if (conversationId != null) 'conversationId': conversationId,
        if (limit != null) 'limit': limit,
      };

      final response = await _dio.get(
        '/chat/search',
        queryParameters: queryParams,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      final List<dynamic> messagesJson = response.data as List<dynamic>;
      return messagesJson
          .map((json) => Message.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Handle Dio errors and convert them to meaningful exceptions
  Exception _handleDioError(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return Exception('Connection timeout. Please check your internet connection.');
      
      case DioExceptionType.badResponse:
        final statusCode = e.response?.statusCode;
        final message = e.response?.data?['message'] ?? 'An error occurred';
        
        switch (statusCode) {
          case 400:
            return Exception('Bad request: $message');
          case 401:
            return Exception('Authentication failed: $message');
          case 403:
            return Exception('Access denied: $message');
          case 404:
            return Exception('Resource not found: $message');
          case 429:
            return Exception('Too many requests. Please try again later.');
          case 500:
            return Exception('Server error. Please try again later.');
          default:
            return Exception('Request failed: $message');
        }
      
      case DioExceptionType.cancel:
        return Exception('Request was cancelled');
      
      case DioExceptionType.connectionError:
        return Exception('Network error. Please check your internet connection.');
      
      default:
        return Exception('An unexpected error occurred: ${e.message}');
    }
  }

  void dispose() {
    disconnectWebSocket();
  }
}

/// Result of sending a message
class SendMessageResult {
  final Message userMessage;
  final Message aiResponse;

  const SendMessageResult({
    required this.userMessage,
    required this.aiResponse,
  });
}
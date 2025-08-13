import 'package:dio/dio.dart';
import '../models/chat_models.dart';

class ChatService {
  final Dio _dio;

  ChatService(this._dio);

  Future<List<Conversation>> getConversations() async {
    try {
      final response = await _dio.get('/chat/conversations');
      final List<dynamic> data = response.data;
      return data.map((json) => Conversation.fromJson(json)).toList();
    } on DioException catch (e) {
      throw ChatException(_handleError(e));
    }
  }

  Future<Conversation> createConversation({
    required String title,
    String? model,
  }) async {
    try {
      final response = await _dio.post(
        '/chat/conversations',
        data: {
          'title': title,
          if (model != null) 'model': model,
        },
      );
      return Conversation.fromJson(response.data);
    } on DioException catch (e) {
      throw ChatException(_handleError(e));
    }
  }

  Future<List<ChatMessage>> getConversationMessages(String conversationId) async {
    try {
      final response = await _dio.get('/chat/conversations/$conversationId/messages');
      final List<dynamic> data = response.data;
      return data.map((json) => ChatMessage.fromJson(json)).toList();
    } on DioException catch (e) {
      throw ChatException(_handleError(e));
    }
  }

  Future<ChatMessage> sendMessage({
    required String conversationId,
    required String content,
    required String model,
  }) async {
    try {
      final response = await _dio.post(
        '/chat/conversations/$conversationId/messages',
        data: SendMessageRequest(
          content: content,
          model: model,
        ).toJson(),
      );
      return ChatMessage.fromJson(response.data['message']);
    } on DioException catch (e) {
      throw ChatException(_handleError(e));
    }
  }

  Future<void> deleteConversation(String conversationId) async {
    try {
      await _dio.delete('/chat/conversations/$conversationId');
    } on DioException catch (e) {
      throw ChatException(_handleError(e));
    }
  }

  Future<List<String>> getAvailableModels() async {
    try {
      final response = await _dio.get('/ai-providers/models');
      final List<dynamic> data = response.data;
      return data.map((model) => model.toString()).toList();
    } on DioException catch (e) {
      throw ChatException(_handleError(e));
    }
  }

  String _handleError(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return 'Connection timeout. Please check your internet connection.';
      case DioExceptionType.badResponse:
        final statusCode = e.response?.statusCode;
        if (statusCode == 401) {
          return 'Authentication required. Please log in again.';
        } else if (statusCode == 403) {
          return 'Access denied.';
        } else if (statusCode == 404) {
          return 'Conversation not found.';
        } else if (statusCode == 500) {
          return 'Server error. Please try again later.';
        }
        return 'Request failed. Please try again.';
      case DioExceptionType.cancel:
        return 'Request was cancelled.';
      case DioExceptionType.connectionError:
        return 'No internet connection.';
      default:
        return 'An unexpected error occurred.';
    }
  }
}

class ChatException implements Exception {
  final String message;
  ChatException(this.message);

  @override
  String toString() => 'ChatException: $message';
}
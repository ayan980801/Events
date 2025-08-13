import 'package:json_annotation/json_annotation.dart';

part 'chat_models.g.dart';

@JsonSerializable()
class ChatMessage {
  final String id;
  final String content;
  final String role; // 'user', 'assistant', 'system'
  final DateTime timestamp;
  final String? model;
  final String conversationId;

  const ChatMessage({
    required this.id,
    required this.content,
    required this.role,
    required this.timestamp,
    this.model,
    required this.conversationId,
  });

  bool get isUser => role == 'user';
  bool get isAssistant => role == 'assistant';

  factory ChatMessage.fromJson(Map<String, dynamic> json) => _$ChatMessageFromJson(json);
  
  Map<String, dynamic> toJson() => _$ChatMessageToJson(this);

  ChatMessage copyWith({
    String? id,
    String? content,
    String? role,
    DateTime? timestamp,
    String? model,
    String? conversationId,
  }) {
    return ChatMessage(
      id: id ?? this.id,
      content: content ?? this.content,
      role: role ?? this.role,
      timestamp: timestamp ?? this.timestamp,
      model: model ?? this.model,
      conversationId: conversationId ?? this.conversationId,
    );
  }
}

@JsonSerializable()
class Conversation {
  final String id;
  final String title;
  final String userId;
  final String? model;
  final DateTime createdAt;
  final DateTime updatedAt;
  final ChatMessage? lastMessage;

  const Conversation({
    required this.id,
    required this.title,
    required this.userId,
    this.model,
    required this.createdAt,
    required this.updatedAt,
    this.lastMessage,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) => _$ConversationFromJson(json);
  
  Map<String, dynamic> toJson() => _$ConversationToJson(this);
}

@JsonSerializable()
class SendMessageRequest {
  final String content;
  final String model;

  const SendMessageRequest({
    required this.content,
    required this.model,
  });

  factory SendMessageRequest.fromJson(Map<String, dynamic> json) => _$SendMessageRequestFromJson(json);
  
  Map<String, dynamic> toJson() => _$SendMessageRequestToJson(this);
}

@JsonSerializable()
class SendMessageResponse {
  final ChatMessage message;

  const SendMessageResponse({
    required this.message,
  });

  factory SendMessageResponse.fromJson(Map<String, dynamic> json) => _$SendMessageResponseFromJson(json);
  
  Map<String, dynamic> toJson() => _$SendMessageResponseToJson(this);
}
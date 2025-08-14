enum MessageRole {
  user,
  assistant,
  system,
}

class Message {
  final String id;
  final String conversationId;
  final String userId;
  final MessageRole role;
  final String content;
  final String? aiModel;
  final String? aiProvider;
  final int? tokensUsed;
  final String? error;
  final Map<String, dynamic>? metadata;
  final DateTime createdAt;

  const Message({
    required this.id,
    required this.conversationId,
    required this.userId,
    required this.role,
    required this.content,
    this.aiModel,
    this.aiProvider,
    this.tokensUsed,
    this.error,
    this.metadata,
    required this.createdAt,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['_id'] ?? json['id'] as String,
      conversationId: json['conversationId'] as String,
      userId: json['userId'] as String,
      role: MessageRole.values.firstWhere(
        (e) => e.name == json['role'],
        orElse: () => MessageRole.user,
      ),
      content: json['content'] as String,
      aiModel: json['aiModel'] as String?,
      aiProvider: json['aiProvider'] as String?,
      tokensUsed: json['tokensUsed'] as int?,
      error: json['error'] as String?,
      metadata: json['metadata'] as Map<String, dynamic>?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'conversationId': conversationId,
      'userId': userId,
      'role': role.name,
      'content': content,
      'aiModel': aiModel,
      'aiProvider': aiProvider,
      'tokensUsed': tokensUsed,
      'error': error,
      'metadata': metadata,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  Message copyWith({
    String? id,
    String? conversationId,
    String? userId,
    MessageRole? role,
    String? content,
    String? aiModel,
    String? aiProvider,
    int? tokensUsed,
    String? error,
    Map<String, dynamic>? metadata,
    DateTime? createdAt,
  }) {
    return Message(
      id: id ?? this.id,
      conversationId: conversationId ?? this.conversationId,
      userId: userId ?? this.userId,
      role: role ?? this.role,
      content: content ?? this.content,
      aiModel: aiModel ?? this.aiModel,
      aiProvider: aiProvider ?? this.aiProvider,
      tokensUsed: tokensUsed ?? this.tokensUsed,
      error: error ?? this.error,
      metadata: metadata ?? this.metadata,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  bool get isFromUser => role == MessageRole.user;
  bool get isFromAssistant => role == MessageRole.assistant;
  bool get hasError => error != null && error!.isNotEmpty;
}

class Conversation {
  final String id;
  final String userId;
  final String title;
  final String aiModel;
  final double temperature;
  final int maxTokens;
  final String? systemPrompt;
  final Map<String, dynamic>? metadata;
  final bool isActive;
  final DateTime? lastMessageAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Conversation({
    required this.id,
    required this.userId,
    required this.title,
    required this.aiModel,
    required this.temperature,
    required this.maxTokens,
    this.systemPrompt,
    this.metadata,
    required this.isActive,
    this.lastMessageAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) {
    return Conversation(
      id: json['_id'] ?? json['id'] as String,
      userId: json['userId'] as String,
      title: json['title'] as String,
      aiModel: json['aiModel'] as String,
      temperature: (json['temperature'] as num?)?.toDouble() ?? 0.7,
      maxTokens: json['maxTokens'] as int? ?? 1000,
      systemPrompt: json['systemPrompt'] as String?,
      metadata: json['metadata'] as Map<String, dynamic>?,
      isActive: json['isActive'] as bool? ?? true,
      lastMessageAt: json['lastMessageAt'] != null
          ? DateTime.parse(json['lastMessageAt'] as String)
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'title': title,
      'aiModel': aiModel,
      'temperature': temperature,
      'maxTokens': maxTokens,
      'systemPrompt': systemPrompt,
      'metadata': metadata,
      'isActive': isActive,
      'lastMessageAt': lastMessageAt?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  Conversation copyWith({
    String? id,
    String? userId,
    String? title,
    String? aiModel,
    double? temperature,
    int? maxTokens,
    String? systemPrompt,
    Map<String, dynamic>? metadata,
    bool? isActive,
    DateTime? lastMessageAt,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Conversation(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      title: title ?? this.title,
      aiModel: aiModel ?? this.aiModel,
      temperature: temperature ?? this.temperature,
      maxTokens: maxTokens ?? this.maxTokens,
      systemPrompt: systemPrompt ?? this.systemPrompt,
      metadata: metadata ?? this.metadata,
      isActive: isActive ?? this.isActive,
      lastMessageAt: lastMessageAt ?? this.lastMessageAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  bool get hasMessages => lastMessageAt != null;
  String get displayTitle => title.isEmpty ? 'New Conversation' : title;
}

class CreateConversationRequest {
  final String title;
  final String? aiModel;
  final double? temperature;
  final int? maxTokens;
  final String? systemPrompt;

  const CreateConversationRequest({
    required this.title,
    this.aiModel,
    this.temperature,
    this.maxTokens,
    this.systemPrompt,
  });

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      if (aiModel != null) 'aiModel': aiModel,
      if (temperature != null) 'temperature': temperature,
      if (maxTokens != null) 'maxTokens': maxTokens,
      if (systemPrompt != null) 'systemPrompt': systemPrompt,
    };
  }
}

class SendMessageRequest {
  final String content;

  const SendMessageRequest({required this.content});

  Map<String, dynamic> toJson() {
    return {'content': content};
  }
}

class MessageResponse {
  final Message userMessage;
  final Message aiResponse;

  const MessageResponse({
    required this.userMessage,
    required this.aiResponse,
  });

  factory MessageResponse.fromJson(Map<String, dynamic> json) {
    return MessageResponse(
      userMessage: Message.fromJson(json['userMessage'] as Map<String, dynamic>),
      aiResponse: Message.fromJson(json['aiResponse'] as Map<String, dynamic>),
    );
  }
}

class AIProvider {
  final String provider;
  final List<String> models;
  final bool available;

  const AIProvider({
    required this.provider,
    required this.models,
    required this.available,
  });

  factory AIProvider.fromJson(Map<String, dynamic> json) {
    return AIProvider(
      provider: json['provider'] as String,
      models: List<String>.from(json['models'] as List),
      available: json['available'] as bool,
    );
  }
}
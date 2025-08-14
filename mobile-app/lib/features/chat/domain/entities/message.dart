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
  final DateTime createdAt;
  final bool isError;
  final Map<String, dynamic>? metadata;

  const Message({
    required this.id,
    required this.conversationId,
    required this.userId,
    required this.role,
    required this.content,
    this.aiModel,
    required this.createdAt,
    this.isError = false,
    this.metadata,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['_id'] as String? ?? json['id'] as String,
      conversationId: json['conversationId'] as String,
      userId: json['userId'] as String,
      role: _parseMessageRole(json['role'] as String),
      content: json['content'] as String,
      aiModel: json['aiModel'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      isError: json['isError'] as bool? ?? false,
      metadata: json['metadata'] as Map<String, dynamic>?,
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
      'createdAt': createdAt.toIso8601String(),
      'isError': isError,
      'metadata': metadata,
    };
  }

  static MessageRole _parseMessageRole(String role) {
    switch (role.toLowerCase()) {
      case 'user':
        return MessageRole.user;
      case 'assistant':
        return MessageRole.assistant;
      case 'system':
        return MessageRole.system;
      default:
        return MessageRole.user;
    }
  }

  Message copyWith({
    String? id,
    String? conversationId,
    String? userId,
    MessageRole? role,
    String? content,
    String? aiModel,
    DateTime? createdAt,
    bool? isError,
    Map<String, dynamic>? metadata,
  }) {
    return Message(
      id: id ?? this.id,
      conversationId: conversationId ?? this.conversationId,
      userId: userId ?? this.userId,
      role: role ?? this.role,
      content: content ?? this.content,
      aiModel: aiModel ?? this.aiModel,
      createdAt: createdAt ?? this.createdAt,
      isError: isError ?? this.isError,
      metadata: metadata ?? this.metadata,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Message && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() {
    return 'Message(id: $id, role: $role, content: ${content.substring(0, content.length > 50 ? 50 : content.length)}...)';
  }

  /// Check if this is a user message
  bool get isUser => role == MessageRole.user;

  /// Check if this is an assistant message
  bool get isAssistant => role == MessageRole.assistant;

  /// Check if this is a system message
  bool get isSystem => role == MessageRole.system;

  /// Get formatted timestamp
  String get formattedTime {
    final now = DateTime.now();
    final difference = now.difference(createdAt);
    
    if (difference.inDays > 0) {
      return '${createdAt.day}/${createdAt.month}/${createdAt.year}';
    } else if (difference.inHours > 0) {
      return '${createdAt.hour.toString().padLeft(2, '0')}:${createdAt.minute.toString().padLeft(2, '0')}';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }

  /// Get word count
  int get wordCount => content.split(' ').where((word) => word.isNotEmpty).length;

  /// Get character count
  int get characterCount => content.length;

  /// Check if message is long (more than 500 characters)
  bool get isLongMessage => content.length > 500;

  /// Get preview of content (first 100 characters)
  String get preview {
    if (content.length <= 100) return content;
    return '${content.substring(0, 97)}...';
  }

  /// Create a local message (before sending to server)
  static Message createLocal({
    required String conversationId,
    required String userId,
    required MessageRole role,
    required String content,
    String? aiModel,
  }) {
    return Message(
      id: 'local_${DateTime.now().millisecondsSinceEpoch}',
      conversationId: conversationId,
      userId: userId,
      role: role,
      content: content,
      aiModel: aiModel,
      createdAt: DateTime.now(),
      isError: false,
    );
  }

  /// Create an error message
  static Message createError({
    required String conversationId,
    required String userId,
    required String error,
  }) {
    return Message(
      id: 'error_${DateTime.now().millisecondsSinceEpoch}',
      conversationId: conversationId,
      userId: userId,
      role: MessageRole.assistant,
      content: 'Sorry, I encountered an error: $error',
      createdAt: DateTime.now(),
      isError: true,
    );
  }
}
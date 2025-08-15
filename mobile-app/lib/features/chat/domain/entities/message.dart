enum MessageRole {
  user,
  assistant,
  system,
}

class Message {
  final String id;
  final String content;
  final MessageRole role;
  final DateTime timestamp;
  final String? conversationId;
  final bool isError;

  const Message({
    required this.id,
    required this.content,
    required this.role,
    required this.timestamp,
    this.conversationId,
    this.isError = false,
  });

  // Convenience getters
  bool get isUser => role == MessageRole.user;
  bool get isAssistant => role == MessageRole.assistant;
  String get userMessage => isUser ? content : '';
  String? get aiResponse => isAssistant ? content : null;
  
  String get formattedTime {
    final now = DateTime.now();
    final diff = now.difference(timestamp);
    
    if (diff.inMinutes < 1) {
      return 'just now';
    } else if (diff.inHours < 1) {
      return '${diff.inMinutes}m ago';
    } else if (diff.inDays < 1) {
      return '${diff.inHours}h ago';
    } else {
      return '${diff.inDays}d ago';
    }
  }

  // Factory constructors
  factory Message.createLocal({
    required String content,
    required MessageRole role,
    String? conversationId,
  }) {
    return Message(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      content: content,
      role: role,
      timestamp: DateTime.now(),
      conversationId: conversationId,
    );
  }

  factory Message.createError({
    required String content,
    String? conversationId,
  }) {
    return Message(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      content: content,
      role: MessageRole.assistant,
      timestamp: DateTime.now(),
      conversationId: conversationId,
      isError: true,
    );
  }

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['id'] as String,
      content: json['content'] as String,
      role: MessageRole.values.firstWhere(
        (role) => role.name == json['role'],
        orElse: () => MessageRole.user,
      ),
      timestamp: DateTime.parse(json['timestamp'] as String),
      conversationId: json['conversationId'] as String?,
      isError: json['isError'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'content': content,
      'role': role.name,
      'timestamp': timestamp.toIso8601String(),
      'conversationId': conversationId,
      'isError': isError,
    };
  }
}

class Conversation {
  final String id;
  final String userId;
  final String title;
  final String? aiModel;
  final bool isActive;
  final DateTime createdAt;
  final DateTime? lastMessageAt;

  const Conversation({
    required this.id,
    required this.userId,
    required this.title,
    this.aiModel,
    required this.isActive,
    required this.createdAt,
    this.lastMessageAt,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) {
    return Conversation(
      id: json['_id'] as String? ?? json['id'] as String,
      userId: json['userId'] as String,
      title: json['title'] as String,
      aiModel: json['aiModel'] as String?,
      isActive: json['isActive'] as bool? ?? true,
      createdAt: DateTime.parse(json['createdAt'] as String),
      lastMessageAt: json['lastMessageAt'] != null 
          ? DateTime.parse(json['lastMessageAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'title': title,
      'aiModel': aiModel,
      'isActive': isActive,
      'createdAt': createdAt.toIso8601String(),
      'lastMessageAt': lastMessageAt?.toIso8601String(),
    };
  }

  Conversation copyWith({
    String? id,
    String? userId,
    String? title,
    String? aiModel,
    bool? isActive,
    DateTime? createdAt,
    DateTime? lastMessageAt,
  }) {
    return Conversation(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      title: title ?? this.title,
      aiModel: aiModel ?? this.aiModel,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
      lastMessageAt: lastMessageAt ?? this.lastMessageAt,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Conversation && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() {
    return 'Conversation(id: $id, title: $title, aiModel: $aiModel)';
  }

  /// Get formatted last activity time
  String get formattedLastActivity {
    if (lastMessageAt == null) return 'No messages';
    
    final now = DateTime.now();
    final difference = now.difference(lastMessageAt!);
    
    if (difference.inDays > 30) {
      return '${difference.inDays ~/ 30}mo ago';
    } else if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }

  /// Get display name for AI model
  String get aiModelDisplayName {
    switch (aiModel) {
      case 'gpt-4':
        return 'GPT-4';
      case 'gpt-3.5-turbo':
        return 'GPT-3.5';
      case 'claude-3-sonnet':
        return 'Claude 3 Sonnet';
      case 'claude-3-haiku':
        return 'Claude 3 Haiku';
      case 'mistral-7b-instruct':
        return 'Mistral 7B';
      case 'mistral-medium':
        return 'Mistral Medium';
      default:
        return aiModel ?? 'GPT-3.5';
    }
  }
}
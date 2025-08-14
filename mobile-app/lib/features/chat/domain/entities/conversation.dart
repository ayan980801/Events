class Conversation {
  final String id;
  final String? title;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? aiModel;

  const Conversation({
    required this.id,
    this.title,
    required this.createdAt,
    required this.updatedAt,
    this.aiModel,
  });

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
      default:
        return 'AI Assistant';
    }
  }

  factory Conversation.fromJson(Map<String, dynamic> json) {
    return Conversation(
      id: json['id'] as String,
      title: json['title'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      aiModel: json['aiModel'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'aiModel': aiModel,
    };
  }
}

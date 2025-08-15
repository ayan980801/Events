import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../domain/entities/conversation.dart';
import '../domain/entities/message.dart';

abstract class ChatRepository {
  Future<List<Conversation>> getConversations();
  Future<Conversation> createConversation({String? title});
  Future<List<Message>> getMessages(String conversationId);
  Future<Message> sendMessage({
    required String conversationId,
    required String content,
  });
  Future<void> deleteConversation(String conversationId);
  Future<Conversation> updateConversationTitle(String conversationId, String title);
}

class ChatRepositoryImpl implements ChatRepository {
  @override
  Future<List<Conversation>> getConversations() async {
    // TODO: Implement API call
    await Future.delayed(const Duration(milliseconds: 500));
    return [
      Conversation(
        id: '1',
        title: 'Sample Conversation',
        createdAt: DateTime.now().subtract(const Duration(hours: 1)),
        updatedAt: DateTime.now(),
        aiModel: 'gpt-3.5-turbo',
      ),
    ];
  }

  @override
  Future<Conversation> createConversation({String? title}) async {
    // TODO: Implement API call
    await Future.delayed(const Duration(milliseconds: 300));
    return Conversation(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: title ?? 'New Conversation',
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
      aiModel: 'gpt-3.5-turbo',
    );
  }

  @override
  Future<List<Message>> getMessages(String conversationId) async {
    // TODO: Implement API call
    await Future.delayed(const Duration(milliseconds: 300));
    return [
      Message(
        id: '1',
        content: 'Hello! How can I help you today?',
        role: MessageRole.assistant,
        timestamp: DateTime.now().subtract(const Duration(minutes: 5)),
        conversationId: conversationId,
      ),
    ];
  }

  @override
  Future<Message> sendMessage({
    required String conversationId,
    required String content,
  }) async {
    // TODO: Implement API call
    await Future.delayed(const Duration(milliseconds: 500));
    return Message(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      content: 'This is a mock response to: $content',
      role: MessageRole.assistant,
      timestamp: DateTime.now(),
      conversationId: conversationId,
    );
  }

  @override
  Future<void> deleteConversation(String conversationId) async {
    // TODO: Implement API call
    await Future.delayed(const Duration(milliseconds: 300));
  }

  @override
  Future<Conversation> updateConversationTitle(String conversationId, String title) async {
    // TODO: Implement API call
    await Future.delayed(const Duration(milliseconds: 300));
    return Conversation(
      id: conversationId,
      title: title,
      createdAt: DateTime.now().subtract(const Duration(hours: 1)),
      updatedAt: DateTime.now(),
      aiModel: 'gpt-3.5-turbo',
    );
  }
}

final chatRepositoryProvider = Provider<ChatRepository>((ref) {
  return ChatRepositoryImpl();
});

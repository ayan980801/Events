import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../../shared/models/chat_models.dart';
import '../../../shared/services/chat_service.dart';
import '../../../shared/providers/providers.dart';

// Chat state
class ChatState {
  final List<Conversation> conversations;
  final Conversation? currentConversation;
  final List<ChatMessage> currentMessages;
  final bool isLoading;
  final bool isSending;
  final String? error;
  final String selectedModel;

  const ChatState({
    this.conversations = const [],
    this.currentConversation,
    this.currentMessages = const [],
    this.isLoading = false,
    this.isSending = false,
    this.error,
    this.selectedModel = 'gpt-3.5-turbo',
  });

  ChatState copyWith({
    List<Conversation>? conversations,
    Conversation? currentConversation,
    List<ChatMessage>? currentMessages,
    bool? isLoading,
    bool? isSending,
    String? error,
    String? selectedModel,
  }) {
    return ChatState(
      conversations: conversations ?? this.conversations,
      currentConversation: currentConversation ?? this.currentConversation,
      currentMessages: currentMessages ?? this.currentMessages,
      isLoading: isLoading ?? this.isLoading,
      isSending: isSending ?? this.isSending,
      error: error,
      selectedModel: selectedModel ?? this.selectedModel,
    );
  }
}

// Chat notifier
class ChatNotifier extends StateNotifier<ChatState> {
  final ChatService _chatService;
  final Uuid _uuid = const Uuid();

  ChatNotifier(this._chatService) : super(const ChatState());

  Future<void> loadConversations() async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final conversations = await _chatService.getConversations();
      state = state.copyWith(
        conversations: conversations,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> createNewConversation({String? title}) async {
    try {
      final conversation = await _chatService.createConversation(
        title: title ?? 'New Chat',
        model: state.selectedModel,
      );
      
      state = state.copyWith(
        conversations: [conversation, ...state.conversations],
        currentConversation: conversation,
        currentMessages: [],
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> loadConversation(String conversationId) async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      // Find conversation
      final conversation = state.conversations
          .where((c) => c.id == conversationId)
          .firstOrNull;
      
      if (conversation == null) {
        throw Exception('Conversation not found');
      }

      // Load messages
      final messages = await _chatService.getConversationMessages(conversationId);
      
      state = state.copyWith(
        currentConversation: conversation,
        currentMessages: messages,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> sendMessage(String content) async {
    if (content.trim().isEmpty || state.isSending) return;

    // Create or use current conversation
    if (state.currentConversation == null) {
      await createNewConversation(title: _generateTitle(content));
    }

    if (state.currentConversation == null) {
      state = state.copyWith(error: 'Failed to create conversation');
      return;
    }

    state = state.copyWith(isSending: true, error: null);

    // Add user message immediately
    final userMessage = ChatMessage(
      id: _uuid.v4(),
      content: content,
      role: 'user',
      timestamp: DateTime.now(),
      conversationId: state.currentConversation!.id,
    );

    state = state.copyWith(
      currentMessages: [...state.currentMessages, userMessage],
    );

    try {
      // Send message to backend
      final assistantMessage = await _chatService.sendMessage(
        conversationId: state.currentConversation!.id,
        content: content,
        model: state.selectedModel,
      );

      // Add assistant response
      state = state.copyWith(
        currentMessages: [...state.currentMessages, assistantMessage],
        isSending: false,
      );

      // Refresh conversations list to update last message
      await loadConversations();
    } catch (e) {
      // Remove user message on error
      final messages = state.currentMessages
          .where((m) => m.id != userMessage.id)
          .toList();
      
      state = state.copyWith(
        currentMessages: messages,
        isSending: false,
        error: e.toString(),
      );
    }
  }

  Future<void> deleteConversation(String conversationId) async {
    try {
      await _chatService.deleteConversation(conversationId);
      
      // Remove from local state
      final updatedConversations = state.conversations
          .where((c) => c.id != conversationId)
          .toList();
      
      // Clear current conversation if it was deleted
      Conversation? currentConversation = state.currentConversation;
      List<ChatMessage> currentMessages = state.currentMessages;
      
      if (state.currentConversation?.id == conversationId) {
        currentConversation = null;
        currentMessages = [];
      }
      
      state = state.copyWith(
        conversations: updatedConversations,
        currentConversation: currentConversation,
        currentMessages: currentMessages,
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  void setSelectedModel(String model) {
    state = state.copyWith(selectedModel: model);
  }

  void clearCurrentConversation() {
    state = state.copyWith(
      currentConversation: null,
      currentMessages: [],
    );
  }

  void clearError() {
    state = state.copyWith(error: null);
  }

  String _generateTitle(String content) {
    // Generate a title from the first message
    final words = content.split(' ');
    if (words.length <= 3) {
      return content;
    }
    return '${words.take(3).join(' ')}...';
  }
}

// Available models state
class AvailableModelsNotifier extends StateNotifier<List<String>> {
  final ChatService _chatService;

  AvailableModelsNotifier(this._chatService) : super([]) {
    _loadModels();
  }

  Future<void> _loadModels() async {
    try {
      final models = await _chatService.getAvailableModels();
      state = models;
    } catch (e) {
      // Use default models if API call fails
      state = [
        'gpt-4',
        'gpt-3.5-turbo',
        'claude-3-sonnet',
        'claude-3-haiku',
        'mistral-7b-instruct',
        'mistral-medium',
      ];
    }
  }

  Future<void> refresh() async {
    await _loadModels();
  }
}

// Providers
final chatNotifierProvider = StateNotifierProvider<ChatNotifier, ChatState>((ref) {
  final chatService = ref.watch(chatServiceProvider);
  return ChatNotifier(chatService);
});

final availableModelsProvider = StateNotifierProvider<AvailableModelsNotifier, List<String>>((ref) {
  final chatService = ref.watch(chatServiceProvider);
  return AvailableModelsNotifier(chatService);
});

// Convenience providers
final conversationsProvider = Provider<List<Conversation>>((ref) {
  return ref.watch(chatNotifierProvider).conversations;
});

final currentConversationProvider = Provider<Conversation?>((ref) {
  return ref.watch(chatNotifierProvider).currentConversation;
});

final currentMessagesProvider = Provider<List<ChatMessage>>((ref) {
  return ref.watch(chatNotifierProvider).currentMessages;
});

final selectedModelProvider = Provider<String>((ref) {
  return ref.watch(chatNotifierProvider).selectedModel;
});
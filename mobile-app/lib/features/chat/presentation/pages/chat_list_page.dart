import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/chat_provider.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../shared/models/chat_models.dart';

class ChatListPage extends ConsumerStatefulWidget {
  const ChatListPage({super.key});

  @override
  ConsumerState<ChatListPage> createState() => _ChatListPageState();
}

class _ChatListPageState extends ConsumerState<ChatListPage> {
  @override
  void initState() {
    super.initState();
    // Load conversations when page loads
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(chatNotifierProvider.notifier).loadConversations();
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(userProvider);
    final chatState = ref.watch(chatNotifierProvider);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Chatbot'),
        actions: [
          if (user != null) ...[
            PopupMenuButton(
              icon: CircleAvatar(
                radius: 16,
                backgroundColor: Theme.of(context).colorScheme.secondary,
                child: Text(
                  user.name.substring(0, 1).toUpperCase(),
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
              itemBuilder: (context) => [
                PopupMenuItem(
                  child: ListTile(
                    leading: const Icon(Icons.person),
                    title: Text(user.name),
                    subtitle: Text(user.email),
                  ),
                ),
                const PopupMenuDivider(),
                PopupMenuItem(
                  onTap: () => ref.read(authNotifierProvider.notifier).signOut(),
                  child: const ListTile(
                    leading: Icon(Icons.logout),
                    title: Text('Sign Out'),
                  ),
                ),
              ],
            ),
          ],
          IconButton(
            onPressed: () => context.push('/chat/new'),
            icon: const Icon(Icons.add),
            tooltip: 'New Chat',
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(chatNotifierProvider.notifier).loadConversations(),
        child: _ChatListContent(
          conversations: chatState.conversations,
          isLoading: chatState.isLoading,
          error: chatState.error,
        ),
      ),
    );
  }
}

class _ChatListContent extends StatelessWidget {
  final List<Conversation> conversations;
  final bool isLoading;
  final String? error;

  const _ChatListContent({
    required this.conversations,
    required this.isLoading,
    this.error,
  });

  @override
  Widget build(BuildContext context) {
    if (error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: 16),
            Text(
              'Error loading conversations',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              error!,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.error,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => context.push('/chat/new'),
              child: const Text('Start New Chat'),
            ),
          ],
        ),
      );
    }

    if (isLoading && conversations.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (conversations.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.chat_bubble_outline,
              size: 64,
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
            ),
            const SizedBox(height: 16),
            Text(
              'No conversations yet',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Start a new chat to begin',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => context.push('/chat/new'),
              icon: const Icon(Icons.add),
              label: const Text('Start New Chat'),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: conversations.length,
      itemBuilder: (context, index) {
        final conversation = conversations[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            contentPadding: const EdgeInsets.all(16),
            leading: CircleAvatar(
              backgroundColor: Theme.of(context).colorScheme.primary,
              child: Text(
                conversation.model?.substring(0, 1).toUpperCase() ?? 'AI',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            title: Text(
              conversation.title,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 4),
                Text(
                  conversation.lastMessage?.content ?? 'No messages yet',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    if (conversation.model != null) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          _getModelDisplayName(conversation.model!),
                          style: TextStyle(
                            fontSize: 12,
                            color: Theme.of(context).colorScheme.primary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                    const Spacer(),
                    Text(
                      _formatTimestamp(conversation.updatedAt),
                      style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            onTap: () => context.push('/chat/conversation/${conversation.id}'),
            trailing: PopupMenuButton(
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: 'delete',
                  child: ListTile(
                    leading: Icon(Icons.delete, color: Colors.red),
                    title: Text('Delete'),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              ],
              onSelected: (value) {
                if (value == 'delete') {
                  _showDeleteDialog(context, conversation);
                }
              },
            ),
          ),
        );
      },
    );
  }

  void _showDeleteDialog(BuildContext context, Conversation conversation) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return Consumer(
          builder: (context, ref, child) {
            return AlertDialog(
              title: const Text('Delete Conversation'),
              content: Text('Are you sure you want to delete "${conversation.title}"?'),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Cancel'),
                ),
                TextButton(
                  onPressed: () {
                    Navigator.of(context).pop();
                    ref.read(chatNotifierProvider.notifier).deleteConversation(conversation.id);
                  },
                  style: TextButton.styleFrom(foregroundColor: Colors.red),
                  child: const Text('Delete'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  String _formatTimestamp(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);
    
    if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }

  String _getModelDisplayName(String model) {
    switch (model.toLowerCase()) {
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
        return model;
    }
  }
}
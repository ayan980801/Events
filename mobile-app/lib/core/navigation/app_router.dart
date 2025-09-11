import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/pages/login_page.dart';
// Prefer new chat page path if present; shim re-exports ChatPage
import '../../features/chat/presentation/pages/chat_page_new.dart';
import '../../features/chat/presentation/pages/chat_list_page.dart';
import '../../features/settings/presentation/pages/settings_page.dart';
import '../../features/workflows/presentation/pages/workflow_list_page.dart';
import '../../features/workflows/presentation/pages/workflow_execution_page.dart';
import '../../shared/widgets/main_navigation.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/workflows',
    routes: [
      // Authentication routes
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginPage(),
      ),
      
      // Main app shell with bottom navigation
      ShellRoute(
        builder: (context, state, child) => MainNavigation(child: child),
        routes: [
          // Chat routes
          GoRoute(
            path: '/chat',
            name: 'chat-list',
            builder: (context, state) => const ChatListPage(),
            routes: [
              GoRoute(
                path: 'conversation/:conversationId',
                name: 'chat-conversation',
                builder: (context, state) => ChatPage(
                  conversationId: state.pathParameters['conversationId']!,
                ),
              ),
              GoRoute(
                path: 'new',
                name: 'new-chat',
                builder: (context, state) => const ChatPage(),
              ),
            ],
          ),
          
          // Workflows routes
          GoRoute(
            path: '/workflows',
            name: 'workflows',
            builder: (context, state) => const WorkflowListPage(),
            routes: [
              GoRoute(
                path: '/execution',
                name: 'workflow-execution',
                builder: (context, state) => const WorkflowExecutionPage(),
              ),
            ],
          ),
          
          // Settings routes
          GoRoute(
            path: '/settings',
            name: 'settings',
            builder: (context, state) => const SettingsPage(),
          ),
        ],
      ),
    ],
  );
});
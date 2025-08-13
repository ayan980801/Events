import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter/material.dart';

import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/chat/presentation/pages/chat_page.dart';
import '../../features/chat/presentation/pages/chat_list_page.dart';
import '../../features/settings/presentation/pages/settings_page.dart';
import '../../shared/widgets/main_navigation.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authNotifierProvider);
  
  return GoRouter(
    initialLocation: '/chat',
    redirect: (context, state) {
      final isLoginRoute = state.location == '/login';
      final isAuthenticated = authState.isAuthenticated;
      
      // If not authenticated and not on login page, redirect to login
      if (!isAuthenticated && !isLoginRoute) {
        return '/login';
      }
      
      // If authenticated and on login page, redirect to chat
      if (isAuthenticated && isLoginRoute) {
        return '/chat';
      }
      
      // No redirect needed
      return null;
    },
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
                path: '/conversation/:conversationId',
                name: 'chat-conversation',
                builder: (context, state) => ChatPage(
                  conversationId: state.pathParameters['conversationId']!,
                ),
              ),
              GoRoute(
                path: '/new',
                name: 'new-chat',
                builder: (context, state) => const ChatPage(),
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
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';

class LoginPage extends ConsumerWidget {
  const LoginPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    
    // Listen to auth state changes and navigate on success
    ref.listen<AuthState>(authProvider, (previous, next) {
      if (next.user != null) {
        context.go('/chat');
      } else if (next.error != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.error!),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    });

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Logo and title
              const Icon(
                Icons.smart_toy_outlined,
                size: 80,
                color: Color(0xFF6366F1),
              ),
              const SizedBox(height: 24),
              const Text(
                'AI Chatbot',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Chat with multiple AI models',
                style: TextStyle(
                  fontSize: 16,
                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 48),
              
              // Login buttons
              ElevatedButton.icon(
                onPressed: authState.isLoading ? null : () => _signInWithGoogle(ref),
                icon: authState.isLoading 
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.login),
                label: Text(authState.isLoading ? 'Signing in...' : 'Sign in with Google'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: authState.isLoading ? null : () => _signInWithApple(ref),
                icon: const Icon(Icons.apple),
                label: const Text('Sign in with Apple'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
              const SizedBox(height: 32),
              
              // Demo mode
              TextButton(
                onPressed: authState.isLoading ? null : () => _continueAsGuest(context),
                child: Text(
                  'Continue as guest',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
                  ),
                ),
              ),
              
              if (authState.error != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.errorContainer,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    authState.error!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onErrorContainer,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
  
  void _signInWithGoogle(WidgetRef ref) {
    ref.read(authProvider.notifier).loginWithGoogle();
  }
  
  void _signInWithApple(WidgetRef ref) {
    ref.read(authProvider.notifier).loginWithApple();
  }
  
  void _continueAsGuest(BuildContext context) {
    context.go('/chat');
  }
}
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import '../../../../shared/services/auth_service.dart';

class LoginPage extends StatelessWidget {
  const LoginPage({super.key});

  @override
  Widget build(BuildContext context) {
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
                onPressed: () => _signInWithGoogle(context),
                icon: const Icon(Icons.login),
                label: const Text('Sign in with Google'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: () => _signInWithApple(context),
                icon: const Icon(Icons.apple),
                label: const Text('Sign in with Apple'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
              const SizedBox(height: 32),
              
              // Demo mode
              TextButton(
                onPressed: () => _continueAsGuest(context),
                child: Text(
                  'Continue as guest',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
  
  void _signInWithGoogle(BuildContext context) {
    final googleSignIn = GoogleSignIn(scopes: ['email']);
    googleSignIn.signIn().then((account) async {
      if (account == null) return;
      final auth = await account.authentication;
      final idToken = auth.idToken;
      if (idToken == null) return;

      final service = AuthService();
      await service.signInWithGoogle(idToken);
      _navigateToChat(context);
    });
  }

  void _signInWithApple(BuildContext context) {
    SignInWithApple.getAppleIDCredential(scopes: [AppleIDAuthorizationScopes.email]).then((credential) async {
      final token = credential.identityToken;
      if (token == null) return;
      final service = AuthService();
      await service.signInWithApple(token);
      _navigateToChat(context);
    });
  }
  
  void _continueAsGuest(BuildContext context) {
    _navigateToChat(context);
  }
  
  void _navigateToChat(BuildContext context) {
    context.go('/chat');
  }
}
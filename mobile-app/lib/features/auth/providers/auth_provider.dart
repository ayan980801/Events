import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import '../../../shared/models/user_model.dart';
import '../../../shared/services/auth_service.dart';
import '../../../shared/providers/providers.dart';

// Auth state
class AuthState {
  final UserModel? user;
  final String? token;
  final bool isLoading;
  final String? error;

  const AuthState({
    this.user,
    this.token,
    this.isLoading = false,
    this.error,
  });

  bool get isAuthenticated => user != null && token != null;

  AuthState copyWith({
    UserModel? user,
    String? token,
    bool? isLoading,
    String? error,
  }) {
    return AuthState(
      user: user ?? this.user,
      token: token ?? this.token,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

// Auth notifier
class AuthNotifier extends StateNotifier<AuthState> {
  final AuthService _authService;
  final FlutterSecureStorage _storage;
  final GoogleSignIn _googleSignIn;

  AuthNotifier(
    this._authService,
    this._storage,
    this._googleSignIn,
  ) : super(const AuthState()) {
    _initializeAuth();
  }

  Future<void> _initializeAuth() async {
    state = state.copyWith(isLoading: true);
    
    try {
      // Try to get stored token
      final token = await _storage.read(key: 'auth_token');
      if (token != null) {
        // Try to refresh token and get user info
        try {
          final authResponse = await _authService.refreshToken();
          await _storage.write(key: 'auth_token', value: authResponse.token);
          state = state.copyWith(
            user: authResponse.user,
            token: authResponse.token,
            isLoading: false,
          );
          return;
        } catch (e) {
          // Token refresh failed, clear stored token
          await _storage.delete(key: 'auth_token');
        }
      }
      
      state = state.copyWith(isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to initialize authentication',
      );
    }
  }

  Future<void> signInWithGoogle() async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      // Google Sign In
      final googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        state = state.copyWith(isLoading: false);
        return; // User cancelled
      }

      final googleAuth = await googleUser.authentication;
      final idToken = googleAuth.idToken;
      
      if (idToken == null) {
        throw Exception('Failed to get Google ID token');
      }

      // Authenticate with backend
      final authResponse = await _authService.loginWithGoogle(idToken);
      
      // Store token
      await _storage.write(key: 'auth_token', value: authResponse.token);
      
      state = state.copyWith(
        user: authResponse.user,
        token: authResponse.token,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      // Sign out from Google if backend auth failed
      await _googleSignIn.signOut();
    }
  }

  Future<void> signInWithApple() async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      // Apple Sign In
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );

      final idToken = credential.identityToken;
      if (idToken == null) {
        throw Exception('Failed to get Apple ID token');
      }

      // Authenticate with backend
      final authResponse = await _authService.loginWithApple(idToken);
      
      // Store token
      await _storage.write(key: 'auth_token', value: authResponse.token);
      
      state = state.copyWith(
        user: authResponse.user,
        token: authResponse.token,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> signOut() async {
    state = state.copyWith(isLoading: true);
    
    try {
      // Sign out from backend
      await _authService.logout();
      
      // Sign out from Google
      await _googleSignIn.signOut();
      
      // Clear stored token
      await _storage.delete(key: 'auth_token');
      
      state = const AuthState();
    } catch (e) {
      // Continue with logout even if API call fails
      await _storage.delete(key: 'auth_token');
      state = const AuthState();
    }
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}

// Providers
final authNotifierProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final authService = ref.watch(authServiceProvider);
  final storage = ref.watch(secureStorageProvider);
  final googleSignIn = ref.watch(googleSignInProvider);
  
  return AuthNotifier(authService, storage, googleSignIn);
});

// Convenience providers
final userProvider = Provider<UserModel?>((ref) {
  return ref.watch(authNotifierProvider).user;
});

final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(authNotifierProvider).isAuthenticated;
});
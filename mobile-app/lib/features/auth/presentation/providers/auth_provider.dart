import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/auth_repository.dart';
import '../domain/entities/user.dart';
import '../domain/entities/auth_result.dart';

// Auth state
class AuthState {
  final User? user;
  final bool isLoading;
  final String? error;
  final bool isAuthenticated;

  const AuthState({
    this.user,
    this.isLoading = false,
    this.error,
    this.isAuthenticated = false,
  });

  AuthState copyWith({
    User? user,
    bool? isLoading,
    String? error,
    bool? isAuthenticated,
  }) {
    return AuthState(
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
    );
  }
}

// Auth provider
class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _authRepository;

  AuthNotifier(this._authRepository) : super(const AuthState()) {
    _checkAuthStatus();
  }

  /// Check if user is authenticated on app start
  Future<void> _checkAuthStatus() async {
    state = state.copyWith(isLoading: true);
    
    try {
      final isAuthenticated = await _authRepository.isAuthenticated();
      if (isAuthenticated) {
        final user = await _authRepository.getStoredUser();
        state = state.copyWith(
          user: user,
          isAuthenticated: true,
          isLoading: false,
        );
      } else {
        state = state.copyWith(
          isAuthenticated: false,
          isLoading: false,
        );
      }
    } catch (e) {
      state = state.copyWith(
        error: e.toString(),
        isAuthenticated: false,
        isLoading: false,
      );
    }
  }

  /// Register a new user
  Future<void> register({
    required String name,
    required String email,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final authResult = await _authRepository.register(
        name: name,
        email: email,
        password: password,
      );
      
      state = state.copyWith(
        user: authResult.user,
        isAuthenticated: true,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        error: e.toString(),
        isLoading: false,
      );
      rethrow;
    }
  }

  /// Login with email and password
  Future<void> login({
    required String email,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final authResult = await _authRepository.login(
        email: email,
        password: password,
      );
      
      state = state.copyWith(
        user: authResult.user,
        isAuthenticated: true,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        error: e.toString(),
        isLoading: false,
      );
      rethrow;
    }
  }

  /// Login with Google
  Future<void> loginWithGoogle() async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final authResult = await _authRepository.loginWithGoogle();
      
      state = state.copyWith(
        user: authResult.user,
        isAuthenticated: true,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        error: e.toString(),
        isLoading: false,
      );
      rethrow;
    }
  }

  /// Login with Apple
  Future<void> loginWithApple() async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final authResult = await _authRepository.loginWithApple();
      
      state = state.copyWith(
        user: authResult.user,
        isAuthenticated: true,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        error: e.toString(),
        isLoading: false,
      );
      rethrow;
    }
  }

  /// Refresh authentication token
  Future<void> refreshToken() async {
    try {
      final authResult = await _authRepository.refreshToken();
      
      state = state.copyWith(
        user: authResult.user,
        isAuthenticated: true,
      );
    } catch (e) {
      // If refresh fails, logout user
      await logout();
      rethrow;
    }
  }

  /// Update user profile
  Future<void> updateProfile({
    String? name,
    String? defaultModel,
    Map<String, dynamic>? preferences,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final updatedUser = await _authRepository.updateProfile(
        name: name,
        defaultModel: defaultModel,
        preferences: preferences,
      );
      
      state = state.copyWith(
        user: updatedUser,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        error: e.toString(),
        isLoading: false,
      );
      rethrow;
    }
  }

  /// Logout user
  Future<void> logout() async {
    state = state.copyWith(isLoading: true);
    
    try {
      await _authRepository.logout();
      
      state = const AuthState(
        isAuthenticated: false,
        isLoading: false,
      );
    } catch (e) {
      // Even if logout fails, clear local state
      state = const AuthState(
        isAuthenticated: false,
        isLoading: false,
      );
    }
  }

  /// Clear any error messages
  void clearError() {
    state = state.copyWith(error: null);
  }

  /// Manually set user (useful for testing or special cases)
  void setUser(User user) {
    state = state.copyWith(
      user: user,
      isAuthenticated: true,
    );
  }
}

// Provider for AuthRepository
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  throw UnimplementedError('AuthRepository provider not implemented');
});

// Provider for AuthNotifier
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final authRepository = ref.watch(authRepositoryProvider);
  return AuthNotifier(authRepository);
});

// Helper providers for specific auth state properties
final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isAuthenticated;
});

final currentUserProvider = Provider<User?>((ref) {
  return ref.watch(authProvider).user;
});

final authLoadingProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isLoading;
});

final authErrorProvider = Provider<String?>((ref) {
  return ref.watch(authProvider).error;
});
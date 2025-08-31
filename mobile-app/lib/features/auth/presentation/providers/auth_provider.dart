import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import '../../../../core/services/api_client.dart';

class User {
  final String id;
  final String email;
  final String? name;
  final String? avatar;

  const User({
    required this.id,
    required this.email,
    this.name,
    this.avatar,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String?,
      avatar: json['avatar'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'avatar': avatar,
    };
  }
}

class AuthState {
  final User? user;
  final bool isLoading;
  final String? error;

  const AuthState({
    this.user,
    this.isLoading = false,
    this.error,
  });

  AuthState copyWith({
    User? user,
    bool? isLoading,
    String? error,
  }) {
    return AuthState(
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState()) {
    _checkAuthStatus();
  }

  final ApiClient _apiClient = ApiClient();

  Future<void> _checkAuthStatus() async {
    final token = await ApiClient.getToken();
    if (token != null) {
      try {
        final userResponse = await _apiClient.getUserProfile();
        final user = User.fromJson(userResponse);
        state = state.copyWith(user: user);
      } catch (e) {
        // Token might be invalid
        await ApiClient.clearToken();
      }
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final response = await _apiClient.login(email: email, password: password);
      final user = User.fromJson(response['user']);
      final token = response['token'] as String;
      
      await ApiClient.saveToken(token);
      state = state.copyWith(user: user, isLoading: false);
    } catch (e) {
      state = state.copyWith(error: e.toString(), isLoading: false);
    }
  }

  Future<void> register(String email, String password, String name) async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final response = await _apiClient.register(
        email: email,
        password: password,
        name: name,
      );
      final user = User.fromJson(response['user']);
      final token = response['token'] as String;
      
      await ApiClient.saveToken(token);
      state = state.copyWith(user: user, isLoading: false);
    } catch (e) {
      state = state.copyWith(error: e.toString(), isLoading: false);
    }
  }

  Future<void> loginWithGoogle() async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final GoogleSignIn googleSignIn = GoogleSignIn(
        scopes: ['email', 'profile'],
      );
      
      final GoogleSignInAccount? account = await googleSignIn.signIn();
      if (account == null) {
        state = state.copyWith(isLoading: false);
        return;
      }
      
      final GoogleSignInAuthentication auth = await account.authentication;
      if (auth.idToken == null) {
        throw Exception('Failed to get Google ID token');
      }
      
      final response = await _apiClient.googleAuth(auth.idToken!);
      final user = User.fromJson(response['user']);
      final token = response['token'] as String;
      
      await ApiClient.saveToken(token);
      state = state.copyWith(user: user, isLoading: false);
    } catch (e) {
      state = state.copyWith(error: e.toString(), isLoading: false);
    }
  }

  Future<void> loginWithApple() async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );
      
      if (credential.identityToken == null) {
        throw Exception('Failed to get Apple ID token');
      }
      
      final response = await _apiClient.appleAuth(credential.identityToken!);
      final user = User.fromJson(response['user']);
      final token = response['token'] as String;
      
      await ApiClient.saveToken(token);
      state = state.copyWith(user: user, isLoading: false);
    } catch (e) {
      state = state.copyWith(error: e.toString(), isLoading: false);
    }
  }

  Future<void> logout() async {
    await ApiClient.clearToken();
    state = const AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});

final currentUserProvider = Provider<User?>((ref) {
  return ref.watch(authProvider).user;
});

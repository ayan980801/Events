import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

import '../models/user.dart';
import 'api_service.dart';

class AuthService {
  final ApiService _apiService;
  final GoogleSignIn _googleSignIn;

  AuthService(this._apiService)
      : _googleSignIn = GoogleSignIn(
          scopes: ['email', 'profile'],
        );

  // Email/Password Authentication
  Future<AuthResponse> login(LoginRequest request) async {
    final response = await _apiService.post('/auth/login', data: request.toJson());
    return AuthResponse.fromJson(response.data as Map<String, dynamic>);
  }

  Future<AuthResponse> register(RegisterRequest request) async {
    final response = await _apiService.post('/auth/register', data: request.toJson());
    return AuthResponse.fromJson(response.data as Map<String, dynamic>);
  }

  // OAuth Authentication
  Future<AuthResponse> signInWithGoogle() async {
    try {
      // Sign out any existing user first to force account selection
      await _googleSignIn.signOut();
      
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        throw Exception('Google sign-in was cancelled');
      }

      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      final String? accessToken = googleAuth.accessToken;

      if (accessToken == null) {
        throw Exception('Failed to get Google access token');
      }

      // Send token to backend for verification
      final response = await _apiService.post(
        '/auth/google',
        data: OAuthRequest(token: accessToken).toJson(),
      );

      return AuthResponse.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      // Clean up on error
      await _googleSignIn.signOut();
      rethrow;
    }
  }

  Future<AuthResponse> signInWithApple() async {
    try {
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
        webAuthenticationOptions: WebAuthenticationOptions(
          clientId: 'your.app.bundle.id',
          redirectUri: Uri.parse('https://your-app.com/auth/apple/callback'),
        ),
      );

      if (credential.identityToken == null) {
        throw Exception('Failed to get Apple identity token');
      }

      // Send token to backend for verification
      final response = await _apiService.post(
        '/auth/apple',
        data: OAuthRequest(token: credential.identityToken!).toJson(),
      );

      return AuthResponse.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      rethrow;
    }
  }

  // Token Management
  Future<void> saveAuthData(AuthResponse authResponse) async {
    await _apiService.setToken(authResponse.token);
    // You could also save user data to local storage here
  }

  Future<User?> getCurrentUser() async {
    try {
      final response = await _apiService.get('/auth/me');
      return User.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  Future<String?> refreshToken() async {
    try {
      final response = await _apiService.post('/auth/refresh');
      final newToken = response.data['token'] as String;
      await _apiService.setToken(newToken);
      return newToken;
    } catch (e) {
      return null;
    }
  }

  Future<void> logout() async {
    // Clear local auth data
    await _apiService.clearToken();
    
    // Sign out from OAuth providers
    try {
      await _googleSignIn.signOut();
    } catch (e) {
      // Ignore errors during Google sign out
    }
    
    // You could also call a logout endpoint here if needed
    // await _apiService.post('/auth/logout');
  }

  Future<bool> isLoggedIn() async {
    final token = await _apiService.getToken();
    return token != null && token.isNotEmpty;
  }

  // Password Reset
  Future<void> requestPasswordReset(String email) async {
    await _apiService.post(
      '/auth/forgot-password',
      data: {'email': email},
    );
  }

  Future<void> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    await _apiService.post(
      '/auth/reset-password',
      data: {
        'token': token,
        'password': newPassword,
      },
    );
  }

  // Account Management
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _apiService.post(
      '/auth/change-password',
      data: {
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      },
    );
  }

  Future<void> updateProfile({
    String? name,
    String? email,
  }) async {
    final data = <String, dynamic>{};
    if (name != null) data['name'] = name;
    if (email != null) data['email'] = email;

    await _apiService.put('/auth/profile', data: data);
  }

  Future<void> deleteAccount() async {
    await _apiService.delete('/auth/account');
    await logout();
  }

  // Utility Methods
  Future<bool> verifyEmail(String token) async {
    try {
      await _apiService.post(
        '/auth/verify-email',
        data: {'token': token},
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<void> resendEmailVerification() async {
    await _apiService.post('/auth/resend-verification');
  }

  // Check if specific OAuth providers are available
  Future<bool> isGoogleSignInAvailable() async {
    try {
      return await _googleSignIn.isSignedIn();
    } catch (e) {
      return false;
    }
  }

  bool get isAppleSignInAvailable => SignInWithApple.isAvailable();

  void dispose() {
    // Clean up resources if needed
  }
}
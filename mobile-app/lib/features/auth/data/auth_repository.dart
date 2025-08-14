import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import '../domain/entities/user.dart';
import '../domain/entities/auth_result.dart';

class AuthRepository {
  final Dio _dio;
  final FlutterSecureStorage _secureStorage;
  final GoogleSignIn _googleSignIn;

  static const String _tokenKey = 'auth_token';
  static const String _userKey = 'user_data';

  AuthRepository({
    required Dio dio,
    required FlutterSecureStorage secureStorage,
    required GoogleSignIn googleSignIn,
  }) : _dio = dio,
       _secureStorage = secureStorage,
       _googleSignIn = googleSignIn;

  /// Register a new user with email and password
  Future<AuthResult> register({
    required String name,
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dio.post('/auth/register', data: {
        'name': name,
        'email': email,
        'password': password,
      });

      final authResult = AuthResult.fromJson(response.data);
      await _saveAuthData(authResult);
      return authResult;
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Login with email and password
  Future<AuthResult> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });

      final authResult = AuthResult.fromJson(response.data);
      await _saveAuthData(authResult);
      return authResult;
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Login with Google
  Future<AuthResult> loginWithGoogle() async {
    try {
      // Sign in with Google
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        throw Exception('Google sign in was cancelled');
      }

      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      
      // Send Google token to backend
      final response = await _dio.post('/auth/google', data: {
        'token': 'google_${googleAuth.accessToken}', // Mock token format
      });

      final authResult = AuthResult.fromJson(response.data);
      await _saveAuthData(authResult);
      return authResult;
    } on DioException catch (e) {
      throw _handleDioError(e);
    } catch (e) {
      throw Exception('Google sign in failed: $e');
    }
  }

  /// Login with Apple
  Future<AuthResult> loginWithApple() async {
    try {
      // Sign in with Apple
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );

      // Send Apple token to backend
      final response = await _dio.post('/auth/apple', data: {
        'token': 'apple_${credential.identityToken}', // Mock token format
      });

      final authResult = AuthResult.fromJson(response.data);
      await _saveAuthData(authResult);
      return authResult;
    } on DioException catch (e) {
      throw _handleDioError(e);
    } catch (e) {
      throw Exception('Apple sign in failed: $e');
    }
  }

  /// Refresh authentication token
  Future<AuthResult> refreshToken() async {
    try {
      final token = await getStoredToken();
      if (token == null) {
        throw Exception('No stored token found');
      }

      final response = await _dio.post(
        '/auth/refresh',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      final authResult = AuthResult.fromJson(response.data);
      await _saveAuthData(authResult);
      return authResult;
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Get current user profile
  Future<User> getUserProfile() async {
    try {
      final token = await getStoredToken();
      if (token == null) {
        throw Exception('No stored token found');
      }

      final response = await _dio.get(
        '/auth/me',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      return User.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Update user profile
  Future<User> updateProfile({
    String? name,
    String? defaultModel,
    Map<String, dynamic>? preferences,
  }) async {
    try {
      final token = await getStoredToken();
      if (token == null) {
        throw Exception('No stored token found');
      }

      final data = <String, dynamic>{};
      if (name != null) data['name'] = name;
      if (defaultModel != null) data['defaultModel'] = defaultModel;
      if (preferences != null) data['preferences'] = preferences;

      final response = await _dio.patch(
        '/users/profile',
        data: data,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      final user = User.fromJson(response.data);
      await _saveUser(user);
      return user;
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Logout user
  Future<void> logout() async {
    try {
      await _googleSignIn.signOut();
    } catch (e) {
      // Ignore Google sign out errors
    }
    
    await _clearAuthData();
  }

  /// Check if user is authenticated
  Future<bool> isAuthenticated() async {
    final token = await getStoredToken();
    return token != null;
  }

  /// Get stored authentication token
  Future<String?> getStoredToken() async {
    return await _secureStorage.read(key: _tokenKey);
  }

  /// Get stored user data
  Future<User?> getStoredUser() async {
    try {
      final userJson = await _secureStorage.read(key: _userKey);
      if (userJson == null) return null;
      
      final userMap = Map<String, dynamic>.from(
        (userJson as Map).cast<String, dynamic>(),
      );
      return User.fromJson(userMap);
    } catch (e) {
      return null;
    }
  }

  /// Save authentication data to secure storage
  Future<void> _saveAuthData(AuthResult authResult) async {
    await _secureStorage.write(key: _tokenKey, value: authResult.token);
    await _saveUser(authResult.user);
  }

  /// Save user data to secure storage
  Future<void> _saveUser(User user) async {
    await _secureStorage.write(key: _userKey, value: user.toJson().toString());
  }

  /// Clear authentication data from secure storage
  Future<void> _clearAuthData() async {
    await _secureStorage.delete(key: _tokenKey);
    await _secureStorage.delete(key: _userKey);
  }

  /// Handle Dio errors and convert them to meaningful exceptions
  Exception _handleDioError(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return Exception('Connection timeout. Please check your internet connection.');
      
      case DioExceptionType.badResponse:
        final statusCode = e.response?.statusCode;
        final message = e.response?.data?['message'] ?? 'An error occurred';
        
        switch (statusCode) {
          case 400:
            return Exception('Bad request: $message');
          case 401:
            return Exception('Authentication failed: $message');
          case 403:
            return Exception('Access denied: $message');
          case 404:
            return Exception('Resource not found: $message');
          case 409:
            return Exception('Conflict: $message');
          case 429:
            return Exception('Too many requests. Please try again later.');
          case 500:
            return Exception('Server error. Please try again later.');
          default:
            return Exception('Request failed: $message');
        }
      
      case DioExceptionType.cancel:
        return Exception('Request was cancelled');
      
      case DioExceptionType.connectionError:
        return Exception('Network error. Please check your internet connection.');
      
      default:
        return Exception('An unexpected error occurred: ${e.message}');
    }
  }
}
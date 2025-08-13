import 'package:dio/dio.dart';
import '../models/user_model.dart';

class AuthService {
  final Dio _dio;

  AuthService(this._dio);

  Future<AuthResponse> loginWithGoogle(String idToken) async {
    try {
      final response = await _dio.post(
        '/auth/google',
        data: {'token': idToken},
      );
      
      return AuthResponse.fromJson(response.data);
    } on DioException catch (e) {
      throw AuthException(_handleError(e));
    }
  }

  Future<AuthResponse> loginWithApple(String idToken) async {
    try {
      final response = await _dio.post(
        '/auth/apple',
        data: {'token': idToken},
      );
      
      return AuthResponse.fromJson(response.data);
    } on DioException catch (e) {
      throw AuthException(_handleError(e));
    }
  }

  Future<AuthResponse> refreshToken() async {
    try {
      final response = await _dio.post('/auth/refresh');
      return AuthResponse.fromJson(response.data);
    } on DioException catch (e) {
      throw AuthException(_handleError(e));
    }
  }

  Future<void> logout() async {
    try {
      await _dio.post('/auth/logout');
    } on DioException catch (e) {
      // Continue with logout even if API call fails
      print('Logout API call failed: ${_handleError(e)}');
    }
  }

  String _handleError(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return 'Connection timeout. Please check your internet connection.';
      case DioExceptionType.badResponse:
        final statusCode = e.response?.statusCode;
        if (statusCode == 401) {
          return 'Invalid credentials. Please try again.';
        } else if (statusCode == 403) {
          return 'Access denied.';
        } else if (statusCode == 500) {
          return 'Server error. Please try again later.';
        }
        return 'Authentication failed. Please try again.';
      case DioExceptionType.cancel:
        return 'Request was cancelled.';
      case DioExceptionType.connectionError:
        return 'No internet connection.';
      default:
        return 'An unexpected error occurred.';
    }
  }
}

class AuthException implements Exception {
  final String message;
  AuthException(this.message);

  @override
  String toString() => 'AuthException: $message';
}
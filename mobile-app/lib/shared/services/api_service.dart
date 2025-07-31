import 'dart:convert';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../core/config/app_config.dart';

class ApiService {
  late final Dio _dio;
  static const _storage = FlutterSecureStorage();
  static const String _tokenKey = 'auth_token';

  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: AppConfig.apiUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    _setupInterceptors();
  }

  void _setupInterceptors() {
    // Request interceptor to add auth token
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          // Handle token expiration
          if (error.response?.statusCode == 401) {
            await clearToken();
            // You could trigger a navigation to login here
          }
          handler.next(error);
        },
      ),
    );

    // Logging interceptor for debug mode
    if (AppConfig.isDebug) {
      _dio.interceptors.add(
        LogInterceptor(
          requestBody: true,
          responseBody: true,
          requestHeader: true,
          responseHeader: false,
          error: true,
        ),
      );
    }
  }

  // Token management
  Future<String?> getToken() async {
    try {
      return await _storage.read(key: _tokenKey);
    } catch (e) {
      return null;
    }
  }

  Future<void> setToken(String token) async {
    await _storage.write(key: _tokenKey, value: token);
  }

  Future<void> clearToken() async {
    await _storage.delete(key: _tokenKey);
  }

  // Generic request methods
  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await _dio.get<T>(
        path,
        queryParameters: queryParameters,
        options: options,
      );
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await _dio.post<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<Response<T>> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await _dio.put<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<Response<T>> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await _dio.delete<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  // File upload
  Future<Response<T>> uploadFile<T>(
    String path,
    String filePath, {
    String fieldName = 'file',
    Map<String, dynamic>? additionalData,
    ProgressCallback? onSendProgress,
  }) async {
    try {
      final formData = FormData.fromMap({
        fieldName: await MultipartFile.fromFile(filePath),
        ...?additionalData,
      });

      return await _dio.post<T>(
        path,
        data: formData,
        options: Options(
          headers: {'Content-Type': 'multipart/form-data'},
        ),
        onSendProgress: onSendProgress,
      );
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  ApiException _handleDioError(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return ApiException(
          'Connection timeout. Please check your internet connection.',
          type: ApiExceptionType.timeout,
        );

      case DioExceptionType.badResponse:
        final statusCode = error.response?.statusCode ?? 0;
        final message = _extractErrorMessage(error.response?.data) ??
            'Request failed with status $statusCode';

        switch (statusCode) {
          case 400:
            return ApiException(message, type: ApiExceptionType.badRequest);
          case 401:
            return ApiException(
              'Authentication failed. Please log in again.',
              type: ApiExceptionType.unauthorized,
            );
          case 403:
            return ApiException(
              'Access denied. You don\'t have permission to perform this action.',
              type: ApiExceptionType.forbidden,
            );
          case 404:
            return ApiException(
              'Resource not found.',
              type: ApiExceptionType.notFound,
            );
          case 422:
            return ApiException(message, type: ApiExceptionType.validation);
          case 429:
            return ApiException(
              'Too many requests. Please try again later.',
              type: ApiExceptionType.rateLimit,
            );
          case 500:
            return ApiException(
              'Server error. Please try again later.',
              type: ApiExceptionType.serverError,
            );
          default:
            return ApiException(message, type: ApiExceptionType.unknown);
        }

      case DioExceptionType.cancel:
        return ApiException(
          'Request was cancelled.',
          type: ApiExceptionType.cancelled,
        );

      case DioExceptionType.unknown:
        if (error.error is SocketException) {
          return ApiException(
            'No internet connection. Please check your network.',
            type: ApiExceptionType.network,
          );
        }
        return ApiException(
          error.message ?? 'An unexpected error occurred.',
          type: ApiExceptionType.unknown,
        );

      default:
        return ApiException(
          'An unexpected error occurred.',
          type: ApiExceptionType.unknown,
        );
    }
  }

  String? _extractErrorMessage(dynamic data) {
    if (data == null) return null;

    if (data is Map<String, dynamic>) {
      // Try different common error message keys
      final possibleKeys = ['message', 'error', 'detail', 'reason'];
      for (final key in possibleKeys) {
        if (data.containsKey(key) && data[key] is String) {
          return data[key] as String;
        }
      }

      // Handle validation errors
      if (data.containsKey('errors') && data['errors'] is List) {
        final errors = data['errors'] as List;
        if (errors.isNotEmpty && errors.first is Map) {
          final firstError = errors.first as Map;
          if (firstError.containsKey('message')) {
            return firstError['message'] as String;
          }
        }
      }
    }

    if (data is String) {
      try {
        final parsed = jsonDecode(data) as Map<String, dynamic>;
        return _extractErrorMessage(parsed);
      } catch (_) {
        return data;
      }
    }

    return null;
  }

  void dispose() {
    _dio.close();
  }
}

enum ApiExceptionType {
  network,
  timeout,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  validation,
  rateLimit,
  serverError,
  cancelled,
  unknown,
}

class ApiException implements Exception {
  final String message;
  final ApiExceptionType type;
  final int? statusCode;
  final dynamic data;

  const ApiException(
    this.message, {
    required this.type,
    this.statusCode,
    this.data,
  });

  @override
  String toString() => 'ApiException: $message';

  bool get isNetworkError => type == ApiExceptionType.network;
  bool get isAuthError => 
      type == ApiExceptionType.unauthorized || type == ApiExceptionType.forbidden;
  bool get isValidationError => type == ApiExceptionType.validation;
  bool get isServerError => type == ApiExceptionType.serverError;
}
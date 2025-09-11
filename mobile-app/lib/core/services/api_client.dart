import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/api_config.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;
  
  ApiClient._internal();
  
  late Dio _dio;
  static const FlutterSecureStorage _storage = FlutterSecureStorage();
  
  void initialize() {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));
    
    // Add interceptor for automatic token inclusion
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await getToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          // Token expired, try to refresh or logout
          await clearToken();
          // Could implement token refresh here
        }
        handler.next(error);
      },
    ));
    
    // Add logging in debug mode
    _dio.interceptors.add(LogInterceptor(
      requestBody: true,
      responseBody: true,
      requestHeader: true,
      responseHeader: false,
    ));
  }
  
  Dio get dio => _dio;
  
  // Token management
  static Future<void> saveToken(String token) async {
    await _storage.write(key: 'auth_token', value: token);
  }
  
  static Future<String?> getToken() async {
    return await _storage.read(key: 'auth_token');
  }
  
  static Future<void> clearToken() async {
    await _storage.delete(key: 'auth_token');
  }
  
  // Auth methods
  Future<Map<String, dynamic>> register({
    required String email,
    required String password,
    required String name,
  }) async {
    final response = await _dio.post(
      ApiConfig.authRegister,
      data: {
        'email': email,
        'password': password,
        'name': name,
      },
    );
    return response.data;
  }
  
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final response = await _dio.post(
      ApiConfig.authLogin,
      data: {
        'email': email,
        'password': password,
      },
    );
    return response.data;
  }
  
  Future<Map<String, dynamic>> googleAuth(String idToken) async {
    final response = await _dio.post(
      ApiConfig.authGoogle,
      data: {
        'token': idToken,
      },
    );
    return response.data;
  }
  
  Future<Map<String, dynamic>> appleAuth(String idToken) async {
    final response = await _dio.post(
      ApiConfig.authApple,
      data: {
        'token': idToken,
      },
    );
    return response.data;
  }
  
  Future<Map<String, dynamic>> getCurrentUser() async {
    final response = await _dio.get(ApiConfig.authMe);
    return response.data;
  }
  
  Future<Map<String, dynamic>> getUserProfile() async {
    final response = await _dio.get(ApiConfig.userProfile);
    return response.data;
  }
  
  Future<List<dynamic>> getAIModels() async {
    final response = await _dio.get(ApiConfig.aiProvidersModels);
    return response.data;
  }
  
  Future<Map<String, dynamic>> getAIProvidersStatus() async {
    final response = await _dio.get(ApiConfig.aiProvidersStatus);
    return response.data;
  }
}
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../core/config/app_config.dart';

class AuthService {
  final Dio _dio = Dio();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  Future<void> signInWithGoogle(String idToken) async {
    final response = await _dio.post(
      '${AppConfig.apiUrl}/auth/google',
      data: {'token': idToken},
    );
    final token = response.data['token'] as String?;
    if (token != null) {
      await _storage.write(key: 'auth_token', value: token);
    }
  }

  Future<void> signInWithApple(String idToken) async {
    final response = await _dio.post(
      '${AppConfig.apiUrl}/auth/apple',
      data: {'token': idToken},
    );
    final token = response.data['token'] as String?;
    if (token != null) {
      await _storage.write(key: 'auth_token', value: token);
    }
  }

  Future<void> signOut() async {
    await _storage.delete(key: 'auth_token');
  }

  Future<String?> getToken() => _storage.read(key: 'auth_token');
}

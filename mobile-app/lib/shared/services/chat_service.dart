import 'package:dio/dio.dart';
import '../../core/config/app_config.dart';
import 'auth_service.dart';

class ChatService {
  final Dio _dio = Dio();
  final AuthService _auth = AuthService();

  Future<List<Map<String, dynamic>>> getMessages(String conversationId) async {
    final token = await _auth.getToken();
    final response = await _dio.get(
      '${AppConfig.apiUrl}/chat/conversations/$conversationId/messages',
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    return (response.data as List).cast<Map<String, dynamic>>();
  }
}

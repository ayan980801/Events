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
    if (response.data is List) {
      // Ensure each item is a Map<String, dynamic>
      return (response.data as List)
          .where((item) => item is Map<String, dynamic>)
          .map<Map<String, dynamic>>((item) => item as Map<String, dynamic>)
          .toList();
    } else {
      // Optionally, you could throw an exception or handle this case differently
      return <Map<String, dynamic>>[];
    }
}

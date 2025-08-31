class ApiConfig {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );
  
  static const String apiVersion = '/api/v1';
  
  static String get apiBaseUrl => '$baseUrl$apiVersion';
  
  // Endpoints
  static const String authRegister = '/auth/register';
  static const String authLogin = '/auth/login';
  static const String authGoogle = '/auth/google';
  static const String authApple = '/auth/apple';
  static const String authMe = '/auth/me';
  static const String authRefresh = '/auth/refresh';
  
  static const String userProfile = '/users/profile';
  
  static const String chatConversations = '/chat/conversations';
  static const String aiProvidersModels = '/ai-providers/models';
  static const String aiProvidersStatus = '/ai-providers/providers/status';
}
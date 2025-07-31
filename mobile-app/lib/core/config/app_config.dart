import 'package:shared_preferences/shared_preferences.dart';

class AppConfig {
  static late SharedPreferences _prefs;
  
  static const String _baseUrlKey = 'base_url';
  static const String _apiVersionKey = 'api_version';
  static const String _defaultModelKey = 'default_model';
  
  // Default values
  static const String defaultBaseUrl = 'http://localhost:3000';
  static const String defaultApiVersion = 'v1';
  static const String defaultModel = 'gpt-3.5-turbo';
  
  static Future<void> initialize() async {
    _prefs = await SharedPreferences.getInstance();
  }
  
  static String get baseUrl => _prefs.getString(_baseUrlKey) ?? defaultBaseUrl;
  static String get apiVersion => _prefs.getString(_apiVersionKey) ?? defaultApiVersion;
  static String get defaultAIModel => _prefs.getString(_defaultModelKey) ?? defaultModel;
  
  static String get apiUrl => '$baseUrl/api/$apiVersion';
  
  static Future<void> setBaseUrl(String url) async {
    await _prefs.setString(_baseUrlKey, url);
  }
  
  static Future<void> setDefaultModel(String model) async {
    await _prefs.setString(_defaultModelKey, model);
  }
  
  // Environment-specific configurations
  static bool get isDebug {
    bool inDebugMode = false;
    assert(inDebugMode = true);
    return inDebugMode;
  }
  
  static bool get isProduction => !isDebug;
}
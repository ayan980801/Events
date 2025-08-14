import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/material.dart';

class AppConfig {
  static late SharedPreferences _prefs;
  static late Dio _dio;
  static late FlutterSecureStorage _secureStorage;
  static late GoogleSignIn _googleSignIn;

  // Configuration keys
  static const String _baseUrlKey = 'base_url';
  static const String _apiVersionKey = 'api_version';
  static const String _defaultModelKey = 'default_model';
  static const String _themeKey = 'theme_mode';
  static const String _languageKey = 'language';
  
  // Default values
  static const String defaultBaseUrl = 'http://localhost:3000';
  static const String defaultApiVersion = 'v1';
  static const String defaultModel = 'gpt-3.5-turbo';
  static const String wsUrl = 'ws://localhost:3001';
  
  // App Configuration
  static const String appName = 'AI Chatbot';
  static const String appVersion = '1.0.0';
  static const String supportEmail = 'support@example.com';

  // Storage Keys
  static const String authTokenKey = 'auth_token';
  static const String userDataKey = 'user_data';

  static SharedPreferences get prefs => _prefs;
  static Dio get dio => _dio;
  static FlutterSecureStorage get secureStorage => _secureStorage;
  static GoogleSignIn get googleSignIn => _googleSignIn;
  
  static Future<void> initialize() async {
    // Initialize SharedPreferences
    _prefs = await SharedPreferences.getInstance();
    
    // Initialize Secure Storage
    _secureStorage = const FlutterSecureStorage(
      aOptions: AndroidOptions(
        encryptedSharedPreferences: true,
      ),
      iOptions: IOSOptions(
        accessibility: KeychainAccessibility.first_unlock_this_device,
      ),
    );

    // Initialize Dio
    _dio = Dio(BaseOptions(
      baseUrl: apiUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      sendTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    // Add request/response interceptors
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          if (isDebug) {
            print('REQUEST: ${options.method} ${options.path}');
          }
          handler.next(options);
        },
        onResponse: (response, handler) {
          if (isDebug) {
            print('RESPONSE: ${response.statusCode} ${response.requestOptions.path}');
          }
          handler.next(response);
        },
        onError: (error, handler) {
          if (isDebug) {
            print('ERROR: ${error.response?.statusCode} ${error.requestOptions.path}');
            print('ERROR MESSAGE: ${error.message}');
          }
          handler.next(error);
        },
      ),
    );

    // Initialize Google Sign In
    _googleSignIn = GoogleSignIn(
      scopes: [
        'email',
        'profile',
      ],
    );

    if (isDebug) {
      print('✅ App configuration initialized');
    }
  }
  
  static String get baseUrl => _prefs.getString(_baseUrlKey) ?? defaultBaseUrl;
  static String get apiVersion => _prefs.getString(_apiVersionKey) ?? defaultApiVersion;
  static String get defaultAIModel => _prefs.getString(_defaultModelKey) ?? defaultModel;
  
  static String get apiUrl => '$baseUrl/api/$apiVersion';
  
  static Future<void> setBaseUrl(String url) async {
    await _prefs.setString(_baseUrlKey, url);
    // Update Dio base URL
    _dio.options.baseUrl = '$url/api/$apiVersion';
  }
  
  static Future<void> setDefaultModel(String model) async {
    await _prefs.setString(_defaultModelKey, model);
  }

  // Theme methods
  static ThemeMode getThemeMode() {
    final themeString = _prefs.getString(_themeKey) ?? 'system';
    switch (themeString) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }

  static Future<void> setThemeMode(ThemeMode mode) async {
    await _prefs.setString(_themeKey, mode.name);
  }

  // Language methods
  static String getLanguage() {
    return _prefs.getString(_languageKey) ?? 'en';
  }

  static Future<void> setLanguage(String language) async {
    await _prefs.setString(_languageKey, language);
  }
  
  // Environment-specific configurations
  static bool get isDebug {
    bool inDebugMode = false;
    assert(inDebugMode = true);
    return inDebugMode;
  }
  
  static bool get isProduction => !isDebug;

  // App info
  static Map<String, dynamic> getAppInfo() {
    return {
      'name': appName,
      'version': appVersion,
      'supportEmail': supportEmail,
      'baseUrl': baseUrl,
      'apiUrl': apiUrl,
    };
  }

  // Debug methods
  static Future<void> clearAllData() async {
    await _prefs.clear();
    await _secureStorage.deleteAll();
    if (isDebug) {
      print('🗑️ All app data cleared');
    }
  }

  static Future<Map<String, dynamic>> getDebugInfo() async {
    final allSecureKeys = await _secureStorage.readAll();
    
    return {
      'appInfo': getAppInfo(),
      'preferences': _prefs.getKeys().map((key) => {
        key: _prefs.get(key),
      }).fold<Map<String, dynamic>>({}, (map, element) => {...map, ...element}),
      'secureStorageKeys': allSecureKeys.keys.toList(),
      'themeMode': getThemeMode().name,
      'language': getLanguage(),
    };
  }
}
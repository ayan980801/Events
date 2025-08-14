class User {
  final String id;
  final String email;
  final String name;
  final String? provider;
  final String? subscriptionTier;
  final DateTime? subscriptionExpiresAt;
  final String defaultModel;
  final Map<String, dynamic>? preferences;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  const User({
    required this.id,
    required this.email,
    required this.name,
    this.provider,
    this.subscriptionTier,
    this.subscriptionExpiresAt,
    required this.defaultModel,
    this.preferences,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String,
      provider: json['provider'] as String?,
      subscriptionTier: json['subscriptionTier'] as String?,
      subscriptionExpiresAt: json['subscriptionExpiresAt'] != null 
          ? DateTime.parse(json['subscriptionExpiresAt'] as String)
          : null,
      defaultModel: json['defaultModel'] as String? ?? 'gpt-3.5-turbo',
      preferences: json['preferences'] as Map<String, dynamic>?,
      isActive: json['isActive'] as bool? ?? true,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'provider': provider,
      'subscriptionTier': subscriptionTier,
      'subscriptionExpiresAt': subscriptionExpiresAt?.toIso8601String(),
      'defaultModel': defaultModel,
      'preferences': preferences,
      'isActive': isActive,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  User copyWith({
    String? id,
    String? email,
    String? name,
    String? provider,
    String? subscriptionTier,
    DateTime? subscriptionExpiresAt,
    String? defaultModel,
    Map<String, dynamic>? preferences,
    bool? isActive,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      name: name ?? this.name,
      provider: provider ?? this.provider,
      subscriptionTier: subscriptionTier ?? this.subscriptionTier,
      subscriptionExpiresAt: subscriptionExpiresAt ?? this.subscriptionExpiresAt,
      defaultModel: defaultModel ?? this.defaultModel,
      preferences: preferences ?? this.preferences,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is User &&
           other.id == id &&
           other.email == email &&
           other.name == name;
  }

  @override
  int get hashCode => id.hashCode ^ email.hashCode ^ name.hashCode;

  @override
  String toString() {
    return 'User(id: $id, email: $email, name: $name, defaultModel: $defaultModel)';
  }

  /// Check if user has premium subscription
  bool get isPremium => subscriptionTier == 'premium' || subscriptionTier == 'enterprise';
  
  /// Check if user has enterprise subscription
  bool get isEnterprise => subscriptionTier == 'enterprise';
  
  /// Check if subscription is active
  bool get isSubscriptionActive {
    if (subscriptionTier == 'free') return true;
    if (subscriptionExpiresAt == null) return false;
    return subscriptionExpiresAt!.isAfter(DateTime.now());
  }
  
  /// Get user's theme preference
  String get themePreference => preferences?['theme'] as String? ?? 'system';
  
  /// Get user's notification preference
  bool get notificationsEnabled => preferences?['notifications'] as bool? ?? true;
  
  /// Get user's preferred language
  String get languagePreference => preferences?['language'] as String? ?? 'en';
}
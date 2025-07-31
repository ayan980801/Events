class User {
  final String id;
  final String email;
  final String name;
  final String provider;
  final String? profilePicture;
  final String subscriptionTier;
  final DateTime createdAt;
  final DateTime? lastLogin;

  const User({
    required this.id,
    required this.email,
    required this.name,
    required this.provider,
    this.profilePicture,
    required this.subscriptionTier,
    required this.createdAt,
    this.lastLogin,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String,
      provider: json['provider'] as String,
      profilePicture: json['profilePicture'] as String?,
      subscriptionTier: json['subscriptionTier'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      lastLogin: json['lastLogin'] != null 
          ? DateTime.parse(json['lastLogin'] as String) 
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'provider': provider,
      'profilePicture': profilePicture,
      'subscriptionTier': subscriptionTier,
      'createdAt': createdAt.toIso8601String(),
      'lastLogin': lastLogin?.toIso8601String(),
    };
  }

  User copyWith({
    String? id,
    String? email,
    String? name,
    String? provider,
    String? profilePicture,
    String? subscriptionTier,
    DateTime? createdAt,
    DateTime? lastLogin,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      name: name ?? this.name,
      provider: provider ?? this.provider,
      profilePicture: profilePicture ?? this.profilePicture,
      subscriptionTier: subscriptionTier ?? this.subscriptionTier,
      createdAt: createdAt ?? this.createdAt,
      lastLogin: lastLogin ?? this.lastLogin,
    );
  }

  bool get isPremium => subscriptionTier != 'free';
  bool get isEnterprise => subscriptionTier == 'enterprise';
}

class AuthResponse {
  final User user;
  final String token;
  final String? message;

  const AuthResponse({
    required this.user,
    required this.token,
    this.message,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      user: User.fromJson(json['user'] as Map<String, dynamic>),
      token: json['token'] as String,
      message: json['message'] as String?,
    );
  }
}

class LoginRequest {
  final String email;
  final String password;

  const LoginRequest({
    required this.email,
    required this.password,
  });

  Map<String, dynamic> toJson() {
    return {
      'email': email,
      'password': password,
    };
  }
}

class RegisterRequest {
  final String email;
  final String password;
  final String name;

  const RegisterRequest({
    required this.email,
    required this.password,
    required this.name,
  });

  Map<String, dynamic> toJson() {
    return {
      'email': email,
      'password': password,
      'name': name,
    };
  }
}

class OAuthRequest {
  final String token;

  const OAuthRequest({required this.token});

  Map<String, dynamic> toJson() {
    return {'token': token};
  }
}
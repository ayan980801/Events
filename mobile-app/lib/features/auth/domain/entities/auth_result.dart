import 'user.dart';

class AuthResult {
  final User user;
  final String token;

  const AuthResult({
    required this.user,
    required this.token,
  });

  factory AuthResult.fromJson(Map<String, dynamic> json) {
    return AuthResult(
      user: User.fromJson(json['user'] as Map<String, dynamic>),
      token: json['token'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user': user.toJson(),
      'token': token,
    };
  }

  AuthResult copyWith({
    User? user,
    String? token,
  }) {
    return AuthResult(
      user: user ?? this.user,
      token: token ?? this.token,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is AuthResult &&
           other.user == user &&
           other.token == token;
  }

  @override
  int get hashCode => user.hashCode ^ token.hashCode;

  @override
  String toString() {
    return 'AuthResult(user: $user, token: ${token.substring(0, 10)}...)';
  }
}
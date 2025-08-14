import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_chatbot_mobile/main.dart';

void main() {
  testWidgets('App starts and loads correctly', (WidgetTester tester) async {
    // Build our app with ProviderScope and trigger a frame.
    await tester.pumpWidget(
      const ProviderScope(
        child: AIChatbotApp(),
      ),
    );

    // Verify that the app starts without crashing
    expect(find.byType(AIChatbotApp), findsOneWidget);
  });
}
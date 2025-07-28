import 'package:flutter_test/flutter_test.dart';
import 'package:ai_chatbot_mobile/main.dart';

void main() {
  testWidgets('App starts and loads correctly', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const AIChatbotApp());

    // Verify that the app starts without crashing
    expect(find.byType(AIChatbotApp), findsOneWidget);
  });
}
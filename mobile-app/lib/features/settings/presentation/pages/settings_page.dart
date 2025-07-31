import 'package:flutter/material.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // AI Models Section
          _buildSectionHeader('AI Models'),
          Card(
            child: Column(
              children: [
                _buildSettingsTile(
                  icon: Icons.smart_toy,
                  title: 'Default AI Model',
                  subtitle: 'GPT-4',
                  onTap: () => _showModelSelector(context),
                ),
                const Divider(height: 1),
                _buildSettingsTile(
                  icon: Icons.tune,
                  title: 'Model Parameters',
                  subtitle: 'Temperature, max tokens, etc.',
                  onTap: () => _showModelParameters(context),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Account Section
          _buildSectionHeader('Account'),
          Card(
            child: Column(
              children: [
                _buildSettingsTile(
                  icon: Icons.person,
                  title: 'Profile',
                  subtitle: 'Manage your account',
                  onTap: () => _showProfile(context),
                ),
                const Divider(height: 1),
                _buildSettingsTile(
                  icon: Icons.subscriptions,
                  title: 'Subscription',
                  subtitle: 'Free Plan',
                  onTap: () => _showSubscription(context),
                ),
                const Divider(height: 1),
                _buildSettingsTile(
                  icon: Icons.payment,
                  title: 'Billing',
                  subtitle: 'Manage payments',
                  onTap: () => _showBilling(context),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 24),
          
          // App Settings Section
          _buildSectionHeader('App Settings'),
          Card(
            child: Column(
              children: [
                _buildSettingsTile(
                  icon: Icons.palette,
                  title: 'Theme',
                  subtitle: 'System default',
                  onTap: () => _showThemeSelector(context),
                ),
                const Divider(height: 1),
                _buildSettingsTile(
                  icon: Icons.notifications,
                  title: 'Notifications',
                  subtitle: 'Push notifications',
                  onTap: () => _showNotificationSettings(context),
                ),
                const Divider(height: 1),
                _buildSettingsTile(
                  icon: Icons.language,
                  title: 'Language',
                  subtitle: 'English',
                  onTap: () => _showLanguageSelector(context),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Data & Privacy Section
          _buildSectionHeader('Data & Privacy'),
          Card(
            child: Column(
              children: [
                _buildSettingsTile(
                  icon: Icons.cloud_sync,
                  title: 'Sync Settings',
                  subtitle: 'Cloud synchronization',
                  onTap: () => _showSyncSettings(context),
                ),
                const Divider(height: 1),
                _buildSettingsTile(
                  icon: Icons.history,
                  title: 'Chat History',
                  subtitle: 'Manage conversation data',
                  onTap: () => _showHistorySettings(context),
                ),
                const Divider(height: 1),
                _buildSettingsTile(
                  icon: Icons.security,
                  title: 'Privacy & Security',
                  subtitle: 'Data protection settings',
                  onTap: () => _showPrivacySettings(context),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 24),
          
          // About Section
          _buildSectionHeader('About'),
          Card(
            child: Column(
              children: [
                _buildSettingsTile(
                  icon: Icons.info,
                  title: 'About',
                  subtitle: 'Version 1.0.0',
                  onTap: () => _showAbout(context),
                ),
                const Divider(height: 1),
                _buildSettingsTile(
                  icon: Icons.help,
                  title: 'Help & Support',
                  subtitle: 'Get help and contact us',
                  onTap: () => _showHelp(context),
                ),
                const Divider(height: 1),
                _buildSettingsTile(
                  icon: Icons.privacy_tip,
                  title: 'Privacy Policy',
                  subtitle: 'Read our privacy policy',
                  onTap: () => _showPrivacyPolicy(context),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 32),
          
          // Sign Out Button
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => _signOut(context),
              icon: const Icon(Icons.logout),
              label: const Text('Sign Out'),
              style: OutlinedButton.styleFrom(
                foregroundColor: Theme.of(context).colorScheme.error,
                side: BorderSide(color: Theme.of(context).colorScheme.error),
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
          ),
          
          const SizedBox(height: 32),
        ],
      ),
    );
  }
  
  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
  
  Widget _buildSettingsTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Icon(icon),
      title: Text(title),
      subtitle: Text(subtitle),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }
  
  void _showModelSelector(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Select Default AI Model'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildModelOption('GPT-4', 'Most capable, slower', true),
            _buildModelOption('GPT-3.5 Turbo', 'Fast and efficient', false),
            _buildModelOption('Claude 3', 'Anthropic\'s latest model', false),
            _buildModelOption('Mistral 7B', 'Open source model', false),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }
  
  Widget _buildModelOption(String name, String description, bool isSelected) {
    return RadioListTile<String>(
      title: Text(name),
      subtitle: Text(description),
      value: name,
      groupValue: isSelected ? name : null,
      onChanged: (value) {},
    );
  }
  
  void _showModelParameters(BuildContext context) {
    _showPlaceholderDialog(context, 'Model Parameters', 'Configure temperature, max tokens, and other model parameters.');
  }
  
  void _showProfile(BuildContext context) {
    _showPlaceholderDialog(context, 'Profile', 'Manage your user profile and account information.');
  }
  
  void _showSubscription(BuildContext context) {
    _showPlaceholderDialog(context, 'Subscription', 'Upgrade to premium for unlimited access and advanced features.');
  }
  
  void _showBilling(BuildContext context) {
    _showPlaceholderDialog(context, 'Billing', 'View billing history and manage payment methods.');
  }
  
  void _showThemeSelector(BuildContext context) {
    _showPlaceholderDialog(context, 'Theme', 'Choose between light, dark, or system theme.');
  }
  
  void _showNotificationSettings(BuildContext context) {
    _showPlaceholderDialog(context, 'Notifications', 'Configure push notifications and alerts.');
  }
  
  void _showLanguageSelector(BuildContext context) {
    _showPlaceholderDialog(context, 'Language', 'Select your preferred language.');
  }
  
  void _showSyncSettings(BuildContext context) {
    _showPlaceholderDialog(context, 'Sync Settings', 'Manage cloud synchronization settings.');
  }
  
  void _showHistorySettings(BuildContext context) {
    _showPlaceholderDialog(context, 'Chat History', 'Manage how long chat history is stored.');
  }
  
  void _showPrivacySettings(BuildContext context) {
    _showPlaceholderDialog(context, 'Privacy & Security', 'Configure data protection and security settings.');
  }
  
  void _showAbout(BuildContext context) {
    _showPlaceholderDialog(context, 'About', 'AI Chatbot v1.0.0\nBuilt with Flutter and powered by multiple AI models.');
  }
  
  void _showHelp(BuildContext context) {
    _showPlaceholderDialog(context, 'Help & Support', 'Get help, report issues, or contact our support team.');
  }
  
  void _showPrivacyPolicy(BuildContext context) {
    _showPlaceholderDialog(context, 'Privacy Policy', 'Read our comprehensive privacy policy.');
  }
  
  void _showPlaceholderDialog(BuildContext context, String title, String content) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(content),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
  
  void _signOut(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              // TODO: Implement sign out logic
            },
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }
}